use crate::bitmask::*;
use crate::state::SolverState;

pub fn constructive_greedy_stage(state: &mut SolverState) {
    let mut order: Vec<usize> = (0..state.lessons.len()).collect();

    // Sort by MRV:
    // 1. Pinned first
    // 2. Double periods (duration 2)
    // 3. Fewer candidate rooms (specialized facilities: labs, gym)
    // 4. Fewer candidate slots
    // 5. Larger student count
    order.sort_by(|&a, &b| {
        let la = &state.lessons[a];
        let lb = &state.lessons[b];

        let pinned_cmp = lb.is_pinned.cmp(&la.is_pinned);
        if pinned_cmp != std::cmp::Ordering::Equal {
            return pinned_cmp;
        }

        let dur_cmp = lb.duration.cmp(&la.duration);
        if dur_cmp != std::cmp::Ordering::Equal {
            return dur_cmp;
        }

        let rooms_cmp = la.candidate_rooms.len().cmp(&lb.candidate_rooms.len());
        if rooms_cmp != std::cmp::Ordering::Equal {
            return rooms_cmp;
        }

        let slots_cmp = la.candidate_slots.len().cmp(&lb.candidate_slots.len());
        if slots_cmp != std::cmp::Ordering::Equal {
            return slots_cmp;
        }

        lb.student_count.cmp(&la.student_count)
    });

    for lesson_idx in order {
        if state.assignments[lesson_idx].is_some() {
            continue;
        }

        let lesson = &state.lessons[lesson_idx];
        let dur = lesson.duration;
        let t_idx = lesson.teacher_idx;
        let c_idx = lesson.class_idx;
        let s_idx = lesson.subject_idx;

        let mut best_slot = 0u8;
        let mut best_room = 0usize;
        let mut best_penalty = u64::MAX;

        for &slot in &lesson.candidate_slots {
            let mask = slot_mask(slot, dur);
            let day = slot / state.periods_per_day;

            for &room_idx in &lesson.candidate_rooms {
                let mut penalty = 0u64;

                // 1. Clash checks
                let mut clashes = 0u32;
                for p in slot..(slot + dur) {
                    let pu = p as usize;
                    if state.teacher_slot_usage[t_idx][pu] > 0 {
                        clashes += 1;
                    }
                    if state.class_slot_usage[c_idx][pu] > 0 {
                        clashes += 1;
                    }
                    if state.room_slot_usage[room_idx][pu] > 0 {
                        clashes += 1;
                    }
                }

                if clashes > 0 {
                    penalty += (clashes as u64) * 100_000;
                }

                // 2. Max consecutive teacher periods check
                let hypothetical_t_mask = state.teacher_masks[t_idx] | mask;
                let day_bits = extract_day_bits(hypothetical_t_mask, day, state.periods_per_day);
                let consec = max_consecutive_ones(day_bits);
                let max_allowed = state.teachers[t_idx].max_consecutive_periods
                    .unwrap_or(state.max_consecutive_periods);
                if consec > max_allowed {
                    penalty += ((consec - max_allowed) as u64) * 50_000;
                }

                // 3. Soft: Subject dispersion (avoiding multiple lessons on same day)
                let day_count = state.class_subject_day_usage[c_idx][s_idx][day as usize];
                if day_count > 0 {
                    penalty += (day_count as u64) * (state.distribution_weight as u64) * 10;
                }

                // 4. Soft: Teacher gaps
                let gaps = count_day_gaps(day_bits);
                penalty += (gaps as u64) * (gaps as u64) * (state.gap_weight as u64);

                // 5. Soft: Teacher undesirable slots
                if (state.teacher_undesirable_masks[t_idx] & mask) != 0 {
                    penalty += state.preference_weight as u64;
                }

                if penalty < best_penalty {
                    best_penalty = penalty;
                    best_slot = slot;
                    best_room = room_idx;
                    if penalty == 0 {
                        break;
                    }
                }
            }

            if best_penalty == 0 {
                break;
            }
        }

        // Assign to best candidate (or first valid if none found)
        if best_penalty < u64::MAX {
            state.assign(lesson_idx, best_slot, best_room);
        } else if !lesson.candidate_slots.is_empty() && !lesson.candidate_rooms.is_empty() {
            state.assign(lesson_idx, lesson.candidate_slots[0], lesson.candidate_rooms[0]);
        } else {
            // Absolute fallback
            let fallback_room = if !state.rooms.is_empty() { 0 } else { 0 };
            state.assign(lesson_idx, 0, fallback_room);
        }
    }

    state.recompute_hard_conflicts();
    state.recompute_soft_score();
}
