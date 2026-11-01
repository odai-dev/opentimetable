use crate::time::Instant;
use rand::Rng;
use crate::bitmask::*;
use crate::state::SolverState;

pub fn lahc_soft_optimization_stage(
    state: &mut SolverState,
    timeout_instant: Instant,
    rng: &mut impl Rng,
    max_iterations_opt: Option<u64>,
) -> u64 {
    let mut current_soft = state.recompute_soft_score();
    let mut best_soft = current_soft;
    let mut best_assignments = state.assignments.clone();

    let k_history = 1000usize;
    let mut history = vec![current_soft; k_history];
    let mut history_idx = 0usize;

    let num_lessons = state.lessons.len();
    if num_lessons == 0 {
        return 0;
    }

    let mut iterations = 0u64;
    let max_iter = max_iterations_opt.unwrap_or(u64::MAX);

    while iterations < max_iter {
        if iterations % 1024 == 0 && Instant::now() >= timeout_instant {
            break;
        }

        iterations += 1;

        let l_idx = rng.gen_range(0..num_lessons);
        if state.lessons[l_idx].is_pinned {
            continue;
        }

        let (old_slot, old_room) = match state.assignments[l_idx] {
            Some(a) => a,
            None => continue,
        };

        // Move type choice: 70% relocate, 30% class-swap
        let move_type = rng.gen_range(0..10);

        if move_type < 7 {
            // Relocate to another valid slot/room
            if state.lessons[l_idx].candidate_slots.is_empty() || state.lessons[l_idx].candidate_rooms.is_empty() {
                continue;
            }

            let new_slot = {
                let cs = &state.lessons[l_idx].candidate_slots;
                cs[rng.gen_range(0..cs.len())]
            };
            let new_room = {
                let cr = &state.lessons[l_idx].candidate_rooms;
                cr[rng.gen_range(0..cr.len())]
            };

            if new_slot == old_slot && new_room == old_room {
                continue;
            }

            let dur = state.lessons[l_idx].duration;
            let t_idx = state.lessons[l_idx].teacher_idx;
            let c_idx = state.lessons[l_idx].class_idx;

            // Invariant check: strictly zero hard conflicts
            state.unassign(l_idx);

            let mask = slot_mask(new_slot, dur);
            // Ultra-fast clash check via bitmask:
            let is_free = state.is_free_at(t_idx, c_idx, new_room, mask);
            if !is_free {
                // VETO: causes double-booking!
                state.assign(l_idx, old_slot, old_room);
                continue;
            }

            // Check max consecutive
            let day = new_slot / state.periods_per_day;
            let day_bits = extract_day_bits(state.teacher_masks[t_idx] | mask, day, state.periods_per_day);
            let consec = max_consecutive_ones(day_bits);
            let max_allowed = state.teachers[t_idx].max_consecutive_periods
                .unwrap_or(state.max_consecutive_periods);
            if consec > max_allowed {
                // VETO: exceeds consecutive hours!
                state.assign(l_idx, old_slot, old_room);
                continue;
            }

            // Apply move and evaluate soft score
            state.assign(l_idx, new_slot, new_room);
            let mut candidate_soft = state.recompute_soft_score();
            if state.lessons[l_idx].is_retained {
                candidate_soft += 100;
            }

            if candidate_soft <= current_soft || candidate_soft <= history[history_idx] {
                // Accept move
                current_soft = candidate_soft;
                if current_soft < best_soft {
                    best_soft = current_soft;
                    best_assignments = state.assignments.clone();
                }
            } else {
                // Reject move and revert
                state.unassign(l_idx);
                state.assign(l_idx, old_slot, old_room);
                state.recompute_soft_score();
            }
        } else {
            // Class swap: swap slots of two lessons in the same class
            let c_idx = state.lessons[l_idx].class_idx;
            let mut same_class_lessons = Vec::new();
            for (idx, other) in state.lessons.iter().enumerate() {
                if other.class_idx == c_idx && idx != l_idx && !other.is_pinned {
                    same_class_lessons.push(idx);
                }
            }

            if same_class_lessons.is_empty() {
                continue;
            }

            let other_l_idx = same_class_lessons[rng.gen_range(0..same_class_lessons.len())];
            let (other_slot, other_room) = match state.assignments[other_l_idx] {
                Some(a) => a,
                None => continue,
            };

            if old_slot == other_slot {
                continue;
            }

            if !state.lessons[l_idx].candidate_slots.contains(&other_slot)
                || !state.lessons[other_l_idx].candidate_slots.contains(&old_slot)
            {
                continue;
            }

            // Test swap
            state.unassign(l_idx);
            state.unassign(other_l_idx);

            state.assign(l_idx, other_slot, old_room);
            state.assign(other_l_idx, old_slot, other_room);

            let hard = state.recompute_hard_conflicts();
            if hard > 0 {
                // VETO
                state.unassign(l_idx);
                state.unassign(other_l_idx);
                state.assign(l_idx, old_slot, old_room);
                state.assign(other_l_idx, other_slot, other_room);
                state.recompute_hard_conflicts();
                continue;
            }

            let mut candidate_soft = state.recompute_soft_score();
            if state.lessons[l_idx].is_retained {
                candidate_soft += 100;
            }
            if state.lessons[other_l_idx].is_retained {
                candidate_soft += 100;
            }

            if candidate_soft <= current_soft || candidate_soft <= history[history_idx] {
                current_soft = candidate_soft;
                if current_soft < best_soft {
                    best_soft = current_soft;
                    best_assignments = state.assignments.clone();
                }
            } else {
                // Reject and revert
                state.unassign(l_idx);
                state.unassign(other_l_idx);
                state.assign(l_idx, old_slot, old_room);
                state.assign(other_l_idx, other_slot, other_room);
                state.recompute_soft_score();
            }
        }

        history[history_idx] = current_soft;
        history_idx = (history_idx + 1) % k_history;
    }

    // Restore best soft state
    for (l_idx, assign) in best_assignments.into_iter().enumerate() {
        state.unassign(l_idx);
        if let Some((s, r)) = assign {
            state.assign(l_idx, s, r);
        }
    }

    state.recompute_hard_conflicts();
    state.recompute_soft_score();
    best_soft
}
