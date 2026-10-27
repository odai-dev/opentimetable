use std::collections::HashMap;
use crate::time::Instant;
use rand::Rng;
use crate::bitmask::*;
use crate::state::SolverState;

pub fn feasibility_tabu_search_stage(
    state: &mut SolverState,
    timeout_instant: Instant,
    rng: &mut impl Rng,
) -> bool {
    let mut current_hard = state.recompute_hard_conflicts();
    if current_hard == 0 {
        return true;
    }

    let mut best_hard = current_hard;
    let mut best_assignments = state.assignments.clone();

    // Tabu list: (lesson_idx, slot) -> tabu_until_iteration
    let mut tabu_list: HashMap<(usize, u8), u64> = HashMap::new();
    let tabu_tenure = 9u64;

    let mut iteration = 0u64;
    let mut stagnation_count = 0u32;

    while current_hard > 0 {
        if iteration % 256 == 0 && Instant::now() >= timeout_instant {
            break;
        }

        iteration += 1;

        // 1. Identify conflicting lessons
        let mut conflicting_lessons = Vec::new();
        for (l_idx, assign) in state.assignments.iter().enumerate() {
            if let Some((slot, room_idx)) = *assign {
                let lesson = &state.lessons[l_idx];
                let dur = lesson.duration;
                let t_idx = lesson.teacher_idx;
                let c_idx = lesson.class_idx;

                let mut is_conflicted = false;
                for p in slot..(slot + dur) {
                    let pu = p as usize;
                    if pu < state.total_slots as usize {
                        if state.teacher_slot_usage[t_idx][pu] > 1 {
                            is_conflicted = true;
                            break;
                        }
                        if state.class_slot_usage[c_idx][pu] > 1 {
                            is_conflicted = true;
                            break;
                        }
                        if room_idx < state.rooms.len() && state.room_slot_usage[room_idx][pu] > 1 {
                            is_conflicted = true;
                            break;
                        }
                    }
                }

                // Check teacher consecutive violation
                if !is_conflicted {
                    let day = slot / state.periods_per_day;
                    let day_bits = extract_day_bits(state.teacher_masks[t_idx], day, state.periods_per_day);
                    let consec = max_consecutive_ones(day_bits);
                    let max_allowed = state.teachers[t_idx].max_consecutive_periods
                        .unwrap_or(state.max_consecutive_periods);
                    if consec > max_allowed {
                        is_conflicted = true;
                    }
                }

                if is_conflicted && !lesson.is_pinned {
                    conflicting_lessons.push(l_idx);
                }
            }
        }

        if conflicting_lessons.is_empty() {
            // Recompute to be absolutely certain
            current_hard = state.recompute_hard_conflicts();
            if current_hard == 0 {
                return true;
            }
            // If somehow hard > 0 but no unpinned lessons flagged, break
            break;
        }

        // Stagnation escape / guided perturbation
        if stagnation_count >= 150 {
            stagnation_count = 0;
            // Randomly perturb 3 conflicting lessons
            for _ in 0..3 {
                let pick = conflicting_lessons[rng.gen_range(0..conflicting_lessons.len())];
                let lesson = &state.lessons[pick];
                if !lesson.candidate_slots.is_empty() && !lesson.candidate_rooms.is_empty() {
                    let rand_s = lesson.candidate_slots[rng.gen_range(0..lesson.candidate_slots.len())];
                    let rand_r = lesson.candidate_rooms[rng.gen_range(0..lesson.candidate_rooms.len())];
                    state.unassign(pick);
                    state.assign(pick, rand_s, rand_r);
                }
            }
            current_hard = state.recompute_hard_conflicts();
            continue;
        }

        // 2. Select a subset of conflicting lessons to evaluate neighborhood
        let sample_size = conflicting_lessons.len().min(8);
        let mut best_move: Option<(usize, u8, usize)> = None; // (lesson_idx, new_slot, new_room)
        let mut best_move_hard = u32::MAX;
        let mut best_is_tabu = false;

        // Shuffle / sample conflicting lessons
        for _ in 0..sample_size {
            let l_idx = conflicting_lessons[rng.gen_range(0..conflicting_lessons.len())];
            let (old_slot, old_room) = state.assignments[l_idx].unwrap();
            let t_idx = state.lessons[l_idx].teacher_idx;
            let c_idx = state.lessons[l_idx].class_idx;
            let candidate_slots = state.lessons[l_idx].candidate_slots.clone();
            let candidate_rooms = state.lessons[l_idx].candidate_rooms.clone();

            // A. Test Kempe Chain interchange: swap with a conflicting lesson
            // Search for lessons in other slots of same class or teacher to swap
            for other_l_idx in 0..state.lessons.len() {
                if other_l_idx == l_idx || state.lessons[other_l_idx].is_pinned {
                    continue;
                }
                let other_c = state.lessons[other_l_idx].class_idx;
                let other_t = state.lessons[other_l_idx].teacher_idx;
                if other_c == c_idx || other_t == t_idx {
                    if let Some((other_slot, other_room)) = state.assignments[other_l_idx] {
                        if other_slot != old_slot
                            && candidate_slots.contains(&other_slot)
                            && state.lessons[other_l_idx].candidate_slots.contains(&old_slot)
                        {
                            // Test atomic swap
                            state.unassign(l_idx);
                            state.unassign(other_l_idx);
                            state.assign(l_idx, other_slot, old_room);
                            state.assign(other_l_idx, old_slot, other_room);

                            let test_hard = state.recompute_hard_conflicts();
                            let is_tabu = tabu_list.get(&(l_idx, other_slot)).copied().unwrap_or(0) > iteration;

                            if test_hard < best_move_hard && (!is_tabu || test_hard < best_hard) {
                                best_move_hard = test_hard;
                                best_move = Some((l_idx, other_slot, old_room));
                                best_is_tabu = is_tabu;
                            }

                            // Revert
                            state.unassign(l_idx);
                            state.unassign(other_l_idx);
                            state.assign(l_idx, old_slot, old_room);
                            state.assign(other_l_idx, other_slot, other_room);

                            if best_move_hard == 0 {
                                break;
                            }
                        }
                    }
                }
            }

            if best_move_hard == 0 {
                break;
            }

            // B. Test Relocation Moves
            state.unassign(l_idx);

            // Sample up to 15 slots and 3 rooms
            let slots_to_check = candidate_slots.len().min(15);
            for _ in 0..slots_to_check {
                let new_slot = candidate_slots[rng.gen_range(0..candidate_slots.len())];
                if new_slot == old_slot {
                    continue;
                }

                let rooms_to_check = candidate_rooms.len().min(3);
                for _ in 0..rooms_to_check {
                    let new_room = candidate_rooms[rng.gen_range(0..candidate_rooms.len())];

                    state.assign(l_idx, new_slot, new_room);
                    let test_hard = state.recompute_hard_conflicts();
                    state.unassign(l_idx);

                    let is_tabu = tabu_list.get(&(l_idx, new_slot)).copied().unwrap_or(0) > iteration;

                    if test_hard < best_move_hard && (!is_tabu || test_hard < best_hard) {
                        best_move_hard = test_hard;
                        best_move = Some((l_idx, new_slot, new_room));
                        best_is_tabu = is_tabu;
                    }

                    if best_move_hard == 0 {
                        break;
                    }
                }

                if best_move_hard == 0 {
                    break;
                }
            }

            // Re-assign original
            state.assign(l_idx, old_slot, old_room);

            if best_move_hard == 0 {
                break;
            }
        }

        // 3. Apply best move
        if let Some((l_idx, new_slot, new_room)) = best_move {
            let (old_slot, _old_room) = state.assignments[l_idx].unwrap();
            state.unassign(l_idx);
            state.assign(l_idx, new_slot, new_room);
            current_hard = state.recompute_hard_conflicts();

            // Set tabu: moving back to old_slot is tabu
            if !best_is_tabu {
                tabu_list.insert((l_idx, old_slot), iteration + tabu_tenure);
            }

            if current_hard < best_hard {
                best_hard = current_hard;
                best_assignments = state.assignments.clone();
                stagnation_count = 0;
            } else {
                stagnation_count += 1;
            }
        } else {
            stagnation_count += 5;
        }
    }

    if current_hard > 0 && best_hard < current_hard {
        // Restore best state found
        for (l_idx, assign) in best_assignments.into_iter().enumerate() {
            state.unassign(l_idx);
            if let Some((s, r)) = assign {
                state.assign(l_idx, s, r);
            }
        }
        current_hard = state.recompute_hard_conflicts();
    }

    current_hard == 0
}
