use std::collections::HashMap;
use crate::bitmask::*;
use crate::models::*;

#[derive(Debug, Clone)]
pub struct LessonData {
    pub id: String,
    pub teacher_idx: usize,
    pub class_idx: usize,
    pub subject_idx: usize,
    pub duration: u8,
    pub required_features: Vec<String>,
    pub student_count: u16,
    pub is_pinned: bool,
    pub pinned_slot: Option<u8>,
    pub pinned_room_idx: Option<usize>,
    pub initial_slot: Option<u8>,
    pub initial_room_idx: Option<usize>,
    pub is_retained: bool,
    pub candidate_slots: Vec<u8>,
    pub candidate_rooms: Vec<usize>,
}

#[derive(Debug, Clone)]
pub struct SolverState {
    pub days: u8,
    pub periods_per_day: u8,
    pub total_slots: u8,
    pub max_consecutive_periods: u8,

    pub teachers: Vec<Teacher>,
    pub classes: Vec<ClassGroup>,
    pub rooms: Vec<Room>,
    pub subjects: Vec<Subject>,
    pub lessons: Vec<LessonData>,

    pub teacher_id_to_idx: HashMap<String, usize>,
    pub class_id_to_idx: HashMap<String, usize>,
    pub room_id_to_idx: HashMap<String, usize>,
    pub subject_id_to_idx: HashMap<String, usize>,

    // Dynamic state
    pub assignments: Vec<Option<(u8, usize)>>, // [lesson_idx] -> (slot, room_idx)
    pub teacher_slot_usage: Vec<Vec<u8>>,      // [teacher_idx][slot]
    pub class_slot_usage: Vec<Vec<u8>>,        // [class_idx][slot]
    pub room_slot_usage: Vec<Vec<u8>>,         // [room_idx][slot]

    pub teacher_masks: Vec<u64>,               // [teacher_idx]
    pub class_masks: Vec<u64>,                 // [class_idx]
    pub room_masks: Vec<u64>,                  // [room_idx]

    pub teacher_unavail_masks: Vec<u64>,
    pub class_unavail_masks: Vec<u64>,
    pub room_unavail_masks: Vec<u64>,
    pub teacher_undesirable_masks: Vec<u64>,

    // Class subject day count: [class_idx][subject_idx][day]
    pub class_subject_day_usage: Vec<Vec<Vec<u8>>>,

    // Trackers
    pub hard_conflicts: u32,
    pub soft_score: u64,

    // Weights
    pub gap_weight: u32,
    pub distribution_weight: u32,
    pub preference_weight: u32,
    pub room_change_weight: u32,
}

impl SolverState {
    pub fn new(req: &TimetableRequest) -> Self {
        let days = req.resolved_days();
        let periods_per_day = req.resolved_periods_per_day();
        let total_slots = req.total_slots().min(64);
        let max_consecutive = req.config.max_consecutive_periods.unwrap_or(4);

        let mut teacher_id_to_idx = HashMap::new();
        for (i, t) in req.teachers.iter().enumerate() {
            teacher_id_to_idx.insert(t.id.clone(), i);
        }

        let mut class_id_to_idx = HashMap::new();
        for (i, c) in req.classes.iter().enumerate() {
            class_id_to_idx.insert(c.id.clone(), i);
        }

        let mut room_id_to_idx = HashMap::new();
        for (i, r) in req.rooms.iter().enumerate() {
            room_id_to_idx.insert(r.id.clone(), i);
        }

        let mut subject_id_to_idx = HashMap::new();
        for (i, s) in req.subjects.iter().enumerate() {
            subject_id_to_idx.insert(s.id.clone(), i);
        }

        let num_teachers = req.teachers.len();
        let num_classes = req.classes.len();
        let num_rooms = req.rooms.len();
        let num_subjects = req.subjects.len();

        let mut teacher_unavail_masks = Vec::with_capacity(num_teachers);
        let mut teacher_undesirable_masks = Vec::with_capacity(num_teachers);
        for t in &req.teachers {
            teacher_unavail_masks.push(build_unavailability_mask(&t.unavailable_slots));
            teacher_undesirable_masks.push(build_unavailability_mask(&t.undesirable_slots));
        }

        let mut class_unavail_masks = Vec::with_capacity(num_classes);
        for c in &req.classes {
            class_unavail_masks.push(build_unavailability_mask(&c.unavailable_slots));
        }

        let mut room_unavail_masks = Vec::with_capacity(num_rooms);
        for r in &req.rooms {
            room_unavail_masks.push(build_unavailability_mask(&r.unavailable_slots));
        }

        let mut lessons_data = Vec::with_capacity(req.lessons.len());
        for l in &req.lessons {
            let teacher_idx = *teacher_id_to_idx.get(&l.teacher_id).unwrap_or(&0);
            let class_idx = *class_id_to_idx.get(&l.class_id).unwrap_or(&0);
            let subject_idx = *subject_id_to_idx.get(&l.subject_id).unwrap_or(&0);

            let pinned_room_idx = l.pinned_room_id.as_ref()
                .or(l.room_id.as_ref())
                .and_then(|rid| room_id_to_idx.get(rid).copied());

            let dur = l.duration.max(1);

            // Precompute valid candidate slots
            let mut candidate_slots = Vec::new();
            if l.is_pinned && l.pinned_slot.is_some() {
                let ps = l.pinned_slot.unwrap();
                if ps + dur <= total_slots && !crosses_day_boundary(ps, dur, periods_per_day) {
                    candidate_slots.push(ps);
                }
            } else {
                for s in 0..total_slots {
                    if s + dur > total_slots {
                        continue;
                    }
                    if crosses_day_boundary(s, dur, periods_per_day) {
                        continue;
                    }
                    let m = slot_mask(s, dur);
                    if (teacher_unavail_masks.get(teacher_idx).copied().unwrap_or(0) & m) != 0 {
                        continue;
                    }
                    if (class_unavail_masks.get(class_idx).copied().unwrap_or(0) & m) != 0 {
                        continue;
                    }
                    candidate_slots.push(s);
                }
            }

            // Precompute candidate rooms
            let req_features: Vec<String> = if !l.required_features.is_empty() {
                l.required_features.clone()
            } else if let Some(subj) = req.subjects.get(subject_idx) {
                subj.required_features.clone()
            } else {
                l.required_features.clone()
            };

            let mut candidate_rooms = Vec::new();
            if let Some(pr_idx) = pinned_room_idx {
                candidate_rooms.push(pr_idx);
            } else {
                let student_count = l.student_count.unwrap_or(0);

                for (r_idx, r) in req.rooms.iter().enumerate() {
                    if let Some(cap) = r.capacity {
                        if student_count > cap {
                            continue;
                        }
                    }
                    let mut feat_ok = true;
                    for req_f in &req_features {
                        if !r.has_feature_or_type(req_f) {
                            feat_ok = false;
                            break;
                        }
                    }
                    if feat_ok {
                        candidate_rooms.push(r_idx);
                    }
                }
                // Fallback: if no room satisfies feature, allow any room to prevent dead-ends
                if candidate_rooms.is_empty() {
                    for r_idx in 0..num_rooms {
                        candidate_rooms.push(r_idx);
                    }
                }
            }

            let initial_room_idx = l.initial_room_id.as_ref()
                .and_then(|rid| room_id_to_idx.get(rid).copied())
                .or(pinned_room_idx);

            lessons_data.push(LessonData {
                id: l.id.clone(),
                teacher_idx,
                class_idx,
                subject_idx,
                duration: dur,
                required_features: req_features,
                student_count: l.student_count.unwrap_or(0),
                is_pinned: l.is_pinned,
                pinned_slot: l.pinned_slot,
                pinned_room_idx,
                initial_slot: l.initial_slot,
                initial_room_idx,
                is_retained: false,
                candidate_slots,
                candidate_rooms,
            });
        }

        let num_lessons = lessons_data.len();
        let slots_usize = total_slots as usize;

        let teacher_slot_usage = vec![vec![0u8; slots_usize]; num_teachers];
        let class_slot_usage = vec![vec![0u8; slots_usize]; num_classes];
        let room_slot_usage = vec![vec![0u8; slots_usize]; num_rooms];

        let class_subject_day_usage = vec![vec![vec![0u8; days as usize]; num_subjects]; num_classes];

        Self {
            days,
            periods_per_day,
            total_slots,
            max_consecutive_periods: max_consecutive,

            teachers: req.teachers.clone(),
            classes: req.classes.clone(),
            rooms: req.rooms.clone(),
            subjects: req.subjects.clone(),
            lessons: lessons_data,

            teacher_id_to_idx,
            class_id_to_idx,
            room_id_to_idx,
            subject_id_to_idx,

            assignments: vec![None; num_lessons],
            teacher_slot_usage,
            class_slot_usage,
            room_slot_usage,

            teacher_masks: vec![0u64; num_teachers],
            class_masks: vec![0u64; num_classes],
            room_masks: vec![0u64; num_rooms],

            teacher_unavail_masks,
            class_unavail_masks,
            room_unavail_masks,
            teacher_undesirable_masks,

            class_subject_day_usage,

            hard_conflicts: num_lessons as u32, // initially all unassigned
            soft_score: 0,

            gap_weight: req.config.gap_weight.unwrap_or(20),
            distribution_weight: req.config.distribution_weight.unwrap_or(15),
            preference_weight: req.config.preference_weight.unwrap_or(10),
            room_change_weight: req.config.room_change_weight.unwrap_or(5),
        }
    }

    pub fn init_improve_mode(&mut self) {
        // Clear any previous assignments
        for l_idx in 0..self.lessons.len() {
            if self.assignments[l_idx].is_some() {
                self.unassign(l_idx);
            }
            self.lessons[l_idx].is_retained = false;
        }

        // 1. Pinned/locked lessons (is_pinned == true) are assigned to (pinned_slot, pinned_room_idx)
        for l_idx in 0..self.lessons.len() {
            if self.lessons[l_idx].is_pinned {
                if let Some(slot) = self.lessons[l_idx].pinned_slot {
                    let dur = self.lessons[l_idx].duration;
                    if slot + dur <= self.total_slots && !crosses_day_boundary(slot, dur, self.periods_per_day) {
                        let room_idx = self.lessons[l_idx].pinned_room_idx.unwrap_or(0);
                        self.assign(l_idx, slot, room_idx);
                        self.lessons[l_idx].is_retained = true;
                    }
                }
            }
        }

        // 2. Unpinned lessons with initial_slot that produce 0 hard conflicts with already anchored assignments
        //    and pass time-off masks are assigned and flagged as retained.
        for l_idx in 0..self.lessons.len() {
            if !self.lessons[l_idx].is_pinned {
                if let Some(slot) = self.lessons[l_idx].initial_slot {
                    let dur = self.lessons[l_idx].duration;
                    if slot + dur <= self.total_slots && !crosses_day_boundary(slot, dur, self.periods_per_day) {
                        let t_idx = self.lessons[l_idx].teacher_idx;
                        let c_idx = self.lessons[l_idx].class_idx;
                        let room_idx = self.lessons[l_idx].initial_room_idx
                            .unwrap_or_else(|| self.lessons[l_idx].candidate_rooms.first().copied().unwrap_or(0));
                        let mask = slot_mask(slot, dur);

                        // Time-off masks
                        let t_avail = (self.teacher_unavail_masks.get(t_idx).copied().unwrap_or(0) & mask) == 0;
                        let c_avail = (self.class_unavail_masks.get(c_idx).copied().unwrap_or(0) & mask) == 0;
                        let r_avail = if room_idx < self.rooms.len() {
                            (self.room_unavail_masks.get(room_idx).copied().unwrap_or(0) & mask) == 0
                        } else {
                            true
                        };

                        // Resource double-booking with already anchored assignments
                        let is_free = self.is_free_at(t_idx, c_idx, room_idx, mask);

                        // Capacity & features check
                        let mut room_ok = true;
                        if room_idx < self.rooms.len() {
                            let room = &self.rooms[room_idx];
                            if let Some(cap) = room.capacity {
                                if self.lessons[l_idx].student_count > cap {
                                    room_ok = false;
                                }
                            }
                            for req_f in &self.lessons[l_idx].required_features {
                                if !room.has_feature_or_type(req_f) {
                                    room_ok = false;
                                    break;
                                }
                            }
                        }

                        // Max consecutive periods check for teacher
                        let mut consec_ok = true;
                        let max_allowed = self.teachers[t_idx].max_consecutive_periods
                            .unwrap_or(self.max_consecutive_periods);
                        let day = slot / self.periods_per_day;
                        let hypothetical_t_mask = self.teacher_masks[t_idx] | mask;
                        let day_bits = extract_day_bits(hypothetical_t_mask, day, self.periods_per_day);
                        let consec = max_consecutive_ones(day_bits);
                        if consec > max_allowed {
                            consec_ok = false;
                        }

                        if t_avail && c_avail && r_avail && is_free && room_ok && consec_ok {
                            self.assign(l_idx, slot, room_idx);
                            self.lessons[l_idx].is_retained = true;
                        } else {
                            self.assignments[l_idx] = None;
                            self.lessons[l_idx].is_retained = false;
                        }
                    } else {
                        self.assignments[l_idx] = None;
                        self.lessons[l_idx].is_retained = false;
                    }
                } else {
                    // 3. Lessons with clashes or no initial placement remain unassigned
                    self.assignments[l_idx] = None;
                    self.lessons[l_idx].is_retained = false;
                }
            }
        }

        self.recompute_hard_conflicts();
        self.recompute_soft_score();
    }

    #[inline(always)]
    pub fn is_free_at(&self, teacher_idx: usize, class_idx: usize, room_idx: usize, mask: u64) -> bool {
        let t_mask = self.teacher_masks[teacher_idx];
        let c_mask = self.class_masks[class_idx];
        let r_mask = self.room_masks[room_idx];
        ((t_mask | c_mask | r_mask) & mask) == 0
    }

    pub fn assign(&mut self, lesson_idx: usize, slot: u8, room_idx: usize) {
        let dur = self.lessons[lesson_idx].duration;
        let t_idx = self.lessons[lesson_idx].teacher_idx;
        let c_idx = self.lessons[lesson_idx].class_idx;
        let s_idx = self.lessons[lesson_idx].subject_idx;
        let mask = slot_mask(slot, dur);
        let day = slot / self.periods_per_day;

        self.assignments[lesson_idx] = Some((slot, room_idx));

        for p in slot..(slot + dur) {
            let pu = p as usize;
            if pu < self.total_slots as usize {
                self.teacher_slot_usage[t_idx][pu] += 1;
                self.class_slot_usage[c_idx][pu] += 1;
                if room_idx < self.rooms.len() {
                    self.room_slot_usage[room_idx][pu] += 1;
                }
            }
        }

        self.teacher_masks[t_idx] |= mask;
        self.class_masks[c_idx] |= mask;
        if room_idx < self.rooms.len() {
            self.room_masks[room_idx] |= mask;
        }

        if (day as usize) < self.class_subject_day_usage[c_idx][s_idx].len() {
            self.class_subject_day_usage[c_idx][s_idx][day as usize] += 1;
        }
    }

    pub fn unassign(&mut self, lesson_idx: usize) {
        if let Some((slot, room_idx)) = self.assignments[lesson_idx].take() {
            let dur = self.lessons[lesson_idx].duration;
            let t_idx = self.lessons[lesson_idx].teacher_idx;
            let c_idx = self.lessons[lesson_idx].class_idx;
            let s_idx = self.lessons[lesson_idx].subject_idx;
            let day = slot / self.periods_per_day;

            for p in slot..(slot + dur) {
                let pu = p as usize;
                if pu < self.total_slots as usize {
                    self.teacher_slot_usage[t_idx][pu] = self.teacher_slot_usage[t_idx][pu].saturating_sub(1);
                    self.class_slot_usage[c_idx][pu] = self.class_slot_usage[c_idx][pu].saturating_sub(1);
                    if room_idx < self.rooms.len() {
                        self.room_slot_usage[room_idx][pu] = self.room_slot_usage[room_idx][pu].saturating_sub(1);
                    }
                }
            }

            // Rebuild masks from slot usage
            let mut new_t_mask = 0u64;
            for (p, &cnt) in self.teacher_slot_usage[t_idx].iter().enumerate() {
                if cnt > 0 {
                    new_t_mask |= 1u64 << p;
                }
            }
            self.teacher_masks[t_idx] = new_t_mask;

            let mut new_c_mask = 0u64;
            for (p, &cnt) in self.class_slot_usage[c_idx].iter().enumerate() {
                if cnt > 0 {
                    new_c_mask |= 1u64 << p;
                }
            }
            self.class_masks[c_idx] = new_c_mask;

            if room_idx < self.rooms.len() {
                let mut new_r_mask = 0u64;
                for (p, &cnt) in self.room_slot_usage[room_idx].iter().enumerate() {
                    if cnt > 0 {
                        new_r_mask |= 1u64 << p;
                    }
                }
                self.room_masks[room_idx] = new_r_mask;
            }

            if (day as usize) < self.class_subject_day_usage[c_idx][s_idx].len() {
                self.class_subject_day_usage[c_idx][s_idx][day as usize] =
                    self.class_subject_day_usage[c_idx][s_idx][day as usize].saturating_sub(1);
            }
        }
    }

    pub fn recompute_hard_conflicts(&mut self) -> u32 {
        let mut conflicts = 0u32;

        // 1. Unassigned lessons
        for a in &self.assignments {
            if a.is_none() {
                conflicts += 1;
            }
        }

        // 2. Resource double bookings
        for usage in &self.teacher_slot_usage {
            for &cnt in usage {
                if cnt > 1 {
                    conflicts += (cnt - 1) as u32;
                }
            }
        }

        for usage in &self.class_slot_usage {
            for &cnt in usage {
                if cnt > 1 {
                    conflicts += (cnt - 1) as u32;
                }
            }
        }

        for usage in &self.room_slot_usage {
            for &cnt in usage {
                if cnt > 1 {
                    conflicts += (cnt - 1) as u32;
                }
            }
        }

        // 3. Max consecutive periods for teachers
        for (t_idx, &mask) in self.teacher_masks.iter().enumerate() {
            let max_allowed = self.teachers[t_idx].max_consecutive_periods
                .unwrap_or(self.max_consecutive_periods);
            for d in 0..self.days {
                let day_bits = extract_day_bits(mask, d, self.periods_per_day);
                let consec = max_consecutive_ones(day_bits);
                if consec > max_allowed {
                    conflicts += (consec - max_allowed) as u32;
                }
            }
        }

        // 4. Room capacity & feature violations
        for (l_idx, assign) in self.assignments.iter().enumerate() {
            if let Some((_slot, room_idx)) = *assign {
                let lesson = &self.lessons[l_idx];
                if room_idx < self.rooms.len() {
                    let room = &self.rooms[room_idx];
                    if let Some(cap) = room.capacity {
                        if lesson.student_count > cap {
                            conflicts += 1;
                        }
                    }
                    for req_f in &lesson.required_features {
                        if !room.has_feature_or_type(req_f) {
                            conflicts += 1;
                        }
                    }
                }
            }
        }

        self.hard_conflicts = conflicts;
        conflicts
    }

    pub fn recompute_soft_score(&mut self) -> u64 {
        let mut score = 0u64;

        // 1. Teacher gaps (squared)
        for &mask in &self.teacher_masks {
            for d in 0..self.days {
                let day_bits = extract_day_bits(mask, d, self.periods_per_day);
                let gaps = count_day_gaps(day_bits);
                score += (gaps as u64) * (gaps as u64) * (self.gap_weight as u64);
            }
        }

        // 2. Subject distribution (avoiding multiple lessons of same subject on same day)
        for class_subjs in &self.class_subject_day_usage {
            for day_counts in class_subjs {
                for &cnt in day_counts {
                    if cnt > 1 {
                        score += ((cnt - 1) as u64) * (self.distribution_weight as u64);
                    }
                }
            }
        }

        // 3. Teacher undesirable slots
        for (t_idx, &mask) in self.teacher_masks.iter().enumerate() {
            let undesir = self.teacher_undesirable_masks[t_idx];
            let hits = (mask & undesir).count_ones();
            score += (hits as u64) * (self.preference_weight as u64);
        }

        self.soft_score = score;
        score
    }
}
