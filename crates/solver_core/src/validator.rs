use std::collections::HashMap;
use crate::bitmask::*;
use crate::models::*;

pub struct ValidationResult {
    pub is_valid: bool,
    pub hard_conflicts: u32,
    pub violations: Vec<ViolationDetail>,
}

pub fn validate_timetable(req: &TimetableRequest, response: &TimetableResponse) -> ValidationResult {
    let mut violations = Vec::new();
    let mut hard_conflicts = 0u32;

    let days = req.resolved_days();
    let periods_per_day = req.resolved_periods_per_day();
    let default_max_consecutive = req.config.max_consecutive_periods.unwrap_or(4);

    let teacher_map: HashMap<&str, &Teacher> = req.teachers.iter().map(|t| (t.id.as_str(), t)).collect();
    let room_map: HashMap<&str, &Room> = req.rooms.iter().map(|r| (r.id.as_str(), r)).collect();
    let class_map: HashMap<&str, &ClassGroup> = req.classes.iter().map(|c| (c.id.as_str(), c)).collect();
    let lesson_map: HashMap<&str, &Lesson> = req.lessons.iter().map(|l| (l.id.as_str(), l)).collect();

    // Map lesson assignments
    let mut placement_by_lesson: HashMap<&str, &LessonAssignment> = HashMap::new();
    for p in &response.placements {
        placement_by_lesson.insert(&p.lesson_id, p);
    }

    // 1. Check all lessons assigned
    for lesson in &req.lessons {
        if !placement_by_lesson.contains_key(lesson.id.as_str()) {
            hard_conflicts += 1;
            violations.push(ViolationDetail {
                constraint_type: "UnassignedLesson".to_string(),
                severity: "HARD".to_string(),
                description: format!("Lesson {} is not assigned to any timeslot", lesson.id),
                affected_lessons: vec![lesson.id.clone()],
            });
        }
    }

    // 2. Resource schedules
    let mut teacher_slots: HashMap<&str, Vec<(u8, u8, &str)>> = HashMap::new(); // (slot, dur, lesson_id)
    let mut class_slots: HashMap<&str, Vec<(u8, u8, &str)>> = HashMap::new();
    let mut room_slots: HashMap<&str, Vec<(u8, u8, &str)>> = HashMap::new();

    for p in &response.placements {
        if let Some(lesson) = lesson_map.get(p.lesson_id.as_str()) {
            let dur = p.duration.max(1);

            // Check day boundary
            if crosses_day_boundary(p.slot, dur, periods_per_day) {
                hard_conflicts += 1;
                violations.push(ViolationDetail {
                    constraint_type: "DayBoundaryCrossing".to_string(),
                    severity: "HARD".to_string(),
                    description: format!(
                        "Lesson {} at slot {} with duration {} crosses day boundary",
                        lesson.id, p.slot, dur
                    ),
                    affected_lessons: vec![lesson.id.clone()],
                });
            }

            // Check pinned status
            if lesson.is_pinned {
                if let Some(ps) = lesson.pinned_slot {
                    if p.slot != ps {
                        hard_conflicts += 1;
                        violations.push(ViolationDetail {
                            constraint_type: "PinnedSlotViolation".to_string(),
                            severity: "HARD".to_string(),
                            description: format!(
                                "Lesson {} is pinned to slot {}, but placed at {}",
                                lesson.id, ps, p.slot
                            ),
                            affected_lessons: vec![lesson.id.clone()],
                        });
                    }
                }
                if let Some(ref pr) = lesson.pinned_room_id {
                    if &p.room_id != pr {
                        hard_conflicts += 1;
                        violations.push(ViolationDetail {
                            constraint_type: "PinnedRoomViolation".to_string(),
                            severity: "HARD".to_string(),
                            description: format!(
                                "Lesson {} is pinned to room {}, but placed in {}",
                                lesson.id, pr, p.room_id
                            ),
                            affected_lessons: vec![lesson.id.clone()],
                        });
                    }
                }
            }

            // Check room capacity & features
            if let Some(room) = room_map.get(p.room_id.as_str()) {
                if let Some(cap) = room.capacity {
                    if let Some(sc) = lesson.student_count {
                        if sc > cap {
                            hard_conflicts += 1;
                            violations.push(ViolationDetail {
                                constraint_type: "RoomCapacity".to_string(),
                                severity: "HARD".to_string(),
                                description: format!(
                                    "Room {} capacity {} is less than lesson {} student count {}",
                                    room.id, cap, lesson.id, sc
                                ),
                                affected_lessons: vec![lesson.id.clone()],
                            });
                        }
                    }
                }

                for req_f in &lesson.required_features {
                    if !room.has_feature_or_type(req_f) {
                        hard_conflicts += 1;
                        violations.push(ViolationDetail {
                            constraint_type: "RoomFeatureMismatch".to_string(),
                            severity: "HARD".to_string(),
                            description: format!(
                                "Room {} lacks required feature '{}' for lesson {}",
                                room.id, req_f, lesson.id
                            ),
                            affected_lessons: vec![lesson.id.clone()],
                        });
                    }
                }
            }

            // Check teacher availability
            if let Some(teacher) = teacher_map.get(lesson.teacher_id.as_str()) {
                let mask = slot_mask(p.slot, dur);
                let unavail_mask = build_unavailability_mask(&teacher.unavailable_slots);
                if (mask & unavail_mask) != 0 {
                    hard_conflicts += 1;
                    violations.push(ViolationDetail {
                        constraint_type: "TeacherUnavailable".to_string(),
                        severity: "HARD".to_string(),
                        description: format!(
                            "Teacher {} is unavailable at assigned slot {}",
                            teacher.id, p.slot
                        ),
                        affected_lessons: vec![lesson.id.clone()],
                    });
                }
            }

            // Check class availability
            if let Some(class) = class_map.get(lesson.class_id.as_str()) {
                let mask = slot_mask(p.slot, dur);
                let unavail_mask = build_unavailability_mask(&class.unavailable_slots);
                if (mask & unavail_mask) != 0 {
                    hard_conflicts += 1;
                    violations.push(ViolationDetail {
                        constraint_type: "ClassUnavailable".to_string(),
                        severity: "HARD".to_string(),
                        description: format!(
                            "Class {} is unavailable at assigned slot {}",
                            class.id, p.slot
                        ),
                        affected_lessons: vec![lesson.id.clone()],
                    });
                }
            }

            teacher_slots.entry(lesson.teacher_id.as_str()).or_default().push((p.slot, dur, lesson.id.as_str()));
            class_slots.entry(lesson.class_id.as_str()).or_default().push((p.slot, dur, lesson.id.as_str()));
            room_slots.entry(p.room_id.as_str()).or_default().push((p.slot, dur, lesson.id.as_str()));
        }
    }

    // Helper to detect overlaps in a list of (slot, dur, lesson_id)
    let check_overlaps = |items: &[(u8, u8, &str)], constraint_type: &str, entity_name: &str, conflicts: &mut u32, viols: &mut Vec<ViolationDetail>| {
        for i in 0..items.len() {
            for j in (i + 1)..items.len() {
                let (s1, d1, l1) = items[i];
                let (s2, d2, l2) = items[j];
                let m1 = slot_mask(s1, d1);
                let m2 = slot_mask(s2, d2);
                if (m1 & m2) != 0 {
                    *conflicts += 1;
                    viols.push(ViolationDetail {
                        constraint_type: constraint_type.to_string(),
                        severity: "HARD".to_string(),
                        description: format!(
                            "Double booking on {} between lessons {} (slot {}) and {} (slot {})",
                            entity_name, l1, s1, l2, s2
                        ),
                        affected_lessons: vec![l1.to_string(), l2.to_string()],
                    });
                }
            }
        }
    };

    // 3. Check Teacher Double Bookings
    for (teacher_id, slots) in &teacher_slots {
        check_overlaps(slots, "TeacherDoubleBooking", teacher_id, &mut hard_conflicts, &mut violations);
    }

    // 4. Check Class Double Bookings
    for (class_id, slots) in &class_slots {
        check_overlaps(slots, "ClassDoubleBooking", class_id, &mut hard_conflicts, &mut violations);
    }

    // 5. Check Room Double Bookings
    for (room_id, slots) in &room_slots {
        check_overlaps(slots, "RoomDoubleBooking", room_id, &mut hard_conflicts, &mut violations);
    }

    // 6. Check Teacher Max Consecutive Periods
    for (teacher_id, slots) in &teacher_slots {
        let max_allowed = teacher_map.get(teacher_id)
            .and_then(|t| t.max_consecutive_periods)
            .unwrap_or(default_max_consecutive);

        let mut sched_mask = 0u64;
        for &(s, d, _) in slots {
            sched_mask |= slot_mask(s, d);
        }

        for d in 0..days {
            let day_bits = extract_day_bits(sched_mask, d, periods_per_day);
            let consec = max_consecutive_ones(day_bits);
            if consec > max_allowed {
                hard_conflicts += (consec - max_allowed) as u32;
                violations.push(ViolationDetail {
                    constraint_type: "MaxConsecutivePeriodsExceeded".to_string(),
                    severity: "HARD".to_string(),
                    description: format!(
                        "Teacher {} has {} consecutive periods on day {}, exceeding max limit {}",
                        teacher_id, consec, d, max_allowed
                    ),
                    affected_lessons: Vec::new(),
                });
            }
        }
    }

    ValidationResult {
        is_valid: hard_conflicts == 0,
        hard_conflicts,
        violations,
    }
}
