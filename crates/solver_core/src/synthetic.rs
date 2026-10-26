use crate::models::*;

pub fn generate_benchmark_request(num_lessons: usize, seed: u64) -> TimetableRequest {
    let days = 5u8;
    let periods_per_day = 7u8;

    let num_classes = 25;
    let num_teachers = 45;
    let num_rooms = 33;

    let mut teachers = Vec::with_capacity(num_teachers);
    for t in 0..num_teachers {
        // Teacher 0..5 have part-time day off (e.g. Day 4 = slots 28..34)
        let unavail = if t < 6 {
            let off_day = (t as u8) % days;
            (0..periods_per_day).map(|p| off_day * periods_per_day + p).collect()
        } else {
            Vec::new()
        };

        teachers.push(Teacher {
            id: format!("T_{:02}", t + 1),
            name: format!("Teacher {:02}", t + 1),
            unavailable_slots: unavail,
            max_consecutive_periods: Some(4),
            max_daily_periods: Some(6),
            preferred_slots: Vec::new(),
            undesirable_slots: vec![0, 6, 7, 13, 14, 20], // early morning or late slots
        });
    }

    let mut classes = Vec::with_capacity(num_classes);
    for c in 0..num_classes {
        classes.push(ClassGroup {
            id: format!("C_{:02}", c + 1),
            name: format!("Class {:02}", c + 1),
            unavailable_slots: Vec::new(),
            student_count: Some(28),
        });
    }

    let mut rooms = Vec::with_capacity(num_rooms);
    for r in 0..num_rooms {
        let (room_type, features) = match r {
            0..=19 => (Some("STANDARD".to_string()), vec!["STANDARD".to_string()]),
            20..=24 => (Some("SCIENCE_LAB".to_string()), vec!["SCIENCE_LAB".to_string(), "LAB".to_string()]),
            25..=28 => (Some("COMP_LAB".to_string()), vec!["COMP_LAB".to_string(), "LAB".to_string()]),
            _ => (Some("GYM".to_string()), vec!["GYM".to_string()]),
        };

        rooms.push(Room {
            id: format!("R_{:02}", r + 1),
            name: format!("Room {:02}", r + 1),
            capacity: Some(35),
            room_type,
            features,
            unavailable_slots: Vec::new(),
        });
    }

    let subjects = vec![
        Subject {
            id: "MATH".to_string(),
            name: "Mathematics".to_string(),
            max_daily_periods: Some(2),
            required_room_type: None,
            required_features: Vec::new(),
        },
        Subject {
            id: "ENG".to_string(),
            name: "English".to_string(),
            max_daily_periods: Some(2),
            required_room_type: None,
            required_features: Vec::new(),
        },
        Subject {
            id: "SCI_LAB".to_string(),
            name: "Science Laboratory".to_string(),
            max_daily_periods: Some(2),
            required_room_type: Some("SCIENCE_LAB".to_string()),
            required_features: vec!["SCIENCE_LAB".to_string()],
        },
        Subject {
            id: "CS_LAB".to_string(),
            name: "Computer Science".to_string(),
            max_daily_periods: Some(2),
            required_room_type: Some("COMP_LAB".to_string()),
            required_features: vec!["COMP_LAB".to_string()],
        },
        Subject {
            id: "PE".to_string(),
            name: "Physical Education".to_string(),
            max_daily_periods: Some(2),
            required_room_type: Some("GYM".to_string()),
            required_features: vec!["GYM".to_string()],
        },
        Subject {
            id: "HIST".to_string(),
            name: "History".to_string(),
            max_daily_periods: Some(1),
            required_room_type: None,
            required_features: Vec::new(),
        },
        Subject {
            id: "GEO".to_string(),
            name: "Geography".to_string(),
            max_daily_periods: Some(1),
            required_room_type: None,
            required_features: Vec::new(),
        },
        Subject {
            id: "BIO".to_string(),
            name: "Biology".to_string(),
            max_daily_periods: Some(1),
            required_room_type: None,
            required_features: Vec::new(),
        },
    ];

    let curriculum = [
        "MATH", "ENG", "SCI_LAB", "HIST",
        "MATH", "ENG", "CS_LAB", "GEO",
        "MATH", "ENG", "PE", "BIO",
        "MATH", "ENG", "HIST", "BIO",
        "HIST", "GEO", "GEO", "BIO",
    ];

    let mut lessons = Vec::with_capacity(num_lessons);

    for i in 0..num_lessons {
        let class_idx = i % num_classes;
        let k = i / num_classes;
        let subj_code = curriculum[(k + class_idx) % curriculum.len()];
        let subj = subjects.iter().find(|s| s.id == subj_code).unwrap();

        // Assign teacher from the subject's department pool
        let teacher_idx = match subj_code {
            "MATH" => class_idx % 7,
            "ENG" => 7 + (class_idx % 7),
            "SCI_LAB" => 14 + (class_idx % 5),
            "CS_LAB" => 19 + (class_idx % 5),
            "PE" => 24 + (class_idx % 5),
            "HIST" => 29 + (class_idx % 5),
            "GEO" => 34 + (class_idx % 5),
            _ => 39 + (class_idx % 6),
        } % num_teachers;

        let is_double = subj.id == "SCI_LAB" || subj.id == "CS_LAB" || subj.id == "PE";
        let duration = if is_double { 2 } else { 1 };

        lessons.push(Lesson {
            id: format!("L_{:04}", i + 1),
            subject_id: subj.id.clone(),
            teacher_id: teachers[teacher_idx].id.clone(),
            class_id: classes[class_idx].id.clone(),
            room_id: None,
            duration,
            required_features: subj.required_features.clone(),
            student_count: Some(28),
            is_pinned: false,
            pinned_slot: None,
            pinned_room_id: None,
        });
    }

    TimetableRequest {
        id: "benchmark_500_request".to_string(),
        title: "OpenTimetable 500+ Lesson Benchmark Schedule".to_string(),
        days_count: Some(days),
        periods_per_day: Some(periods_per_day),
        teachers,
        classes,
        rooms,
        subjects,
        lessons,
        config: SolverConfig {
            days: Some(days),
            periods_per_day: Some(periods_per_day),
            max_consecutive_periods: Some(4),
            timeout_ms: Some(2000),
            max_iterations: None,
            random_seed: Some(seed),
            gap_weight: Some(20),
            distribution_weight: Some(15),
            preference_weight: Some(10),
            room_change_weight: Some(5),
        },
    }
}
