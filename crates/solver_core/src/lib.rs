pub mod bitmask;
pub mod models;
pub mod state;
pub mod constructive;
pub mod feasibility;
pub mod optimizer;
pub mod solver;
pub mod validator;
pub mod synthetic;
pub mod time;

pub use models::*;
pub use solver::TimetableSolver;
pub use validator::{validate_timetable, ValidationResult};
pub use synthetic::generate_benchmark_request;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_request() -> TimetableRequest {
        TimetableRequest {
            id: "test_basic".to_string(),
            title: "Basic Test".to_string(),
            days_count: Some(5),
            periods_per_day: Some(7),
            teachers: vec![
                Teacher {
                    id: "T1".to_string(),
                    name: "Alice".to_string(),
                    unavailable_slots: vec![0], // unavailable on Monday period 0
                    max_consecutive_periods: Some(4),
                    max_daily_periods: Some(6),
                    preferred_slots: Vec::new(),
                    undesirable_slots: Vec::new(),
                },
                Teacher {
                    id: "T2".to_string(),
                    name: "Bob".to_string(),
                    unavailable_slots: Vec::new(),
                    max_consecutive_periods: Some(4),
                    max_daily_periods: Some(6),
                    preferred_slots: Vec::new(),
                    undesirable_slots: Vec::new(),
                },
            ],
            classes: vec![
                ClassGroup {
                    id: "C1".to_string(),
                    name: "Grade 10A".to_string(),
                    unavailable_slots: Vec::new(),
                    student_count: Some(25),
                },
                ClassGroup {
                    id: "C2".to_string(),
                    name: "Grade 10B".to_string(),
                    unavailable_slots: Vec::new(),
                    student_count: Some(30),
                },
            ],
            rooms: vec![
                Room {
                    id: "R1".to_string(),
                    name: "Room 101".to_string(),
                    capacity: Some(28),
                    room_type: Some("STANDARD".to_string()),
                    features: vec!["STANDARD".to_string()],
                    unavailable_slots: Vec::new(),
                },
                Room {
                    id: "R2".to_string(),
                    name: "Lab 201".to_string(),
                    capacity: Some(35),
                    room_type: Some("SCIENCE_LAB".to_string()),
                    features: vec!["SCIENCE_LAB".to_string()],
                    unavailable_slots: Vec::new(),
                },
            ],
            subjects: vec![
                Subject {
                    id: "MATH".to_string(),
                    name: "Math".to_string(),
                    max_daily_periods: Some(2),
                    required_room_type: None,
                    required_features: Vec::new(),
                },
                Subject {
                    id: "SCI".to_string(),
                    name: "Science Lab".to_string(),
                    max_daily_periods: Some(2),
                    required_room_type: Some("SCIENCE_LAB".to_string()),
                    required_features: vec!["SCIENCE_LAB".to_string()],
                },
            ],
            lessons: vec![
                Lesson {
                    id: "L1".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_id: "T1".to_string(),
                    class_id: "C1".to_string(),
                    room_id: None,
                    duration: 1,
                    required_features: Vec::new(),
                    student_count: Some(25),
                    is_pinned: false,
                    pinned_slot: None,
                    pinned_room_id: None,
                },
                Lesson {
                    id: "L2".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_id: "T1".to_string(),
                    class_id: "C2".to_string(),
                    room_id: None,
                    duration: 1,
                    required_features: Vec::new(),
                    student_count: Some(30), // Must go to R2 because R1 capacity is 28!
                    is_pinned: false,
                    pinned_slot: None,
                    pinned_room_id: None,
                },
                Lesson {
                    id: "L3".to_string(),
                    subject_id: "SCI".to_string(),
                    teacher_id: "T2".to_string(),
                    class_id: "C1".to_string(),
                    room_id: None,
                    duration: 2, // Double period lab!
                    required_features: vec!["SCIENCE_LAB".to_string()],
                    student_count: Some(25),
                    is_pinned: false,
                    pinned_slot: None,
                    pinned_room_id: None,
                },
            ],
            config: SolverConfig {
                timeout_ms: Some(1000),
                ..Default::default()
            },
        }
    }

    #[test]
    fn test_hard_no_teacher_clash() {
        let req = create_test_request();
        let resp = TimetableSolver::solve(&req);
        assert_eq!(resp.hard_conflicts, 0);

        // Verify T1 is not double-booked
        let l1 = resp.placements.iter().find(|p| p.lesson_id == "L1").unwrap();
        let l2 = resp.placements.iter().find(|p| p.lesson_id == "L2").unwrap();
        assert_ne!(l1.slot, l2.slot);
    }

    #[test]
    fn test_hard_room_capacity() {
        let req = create_test_request();
        let resp = TimetableSolver::solve(&req);
        assert_eq!(resp.hard_conflicts, 0);

        // L2 student count is 30, R1 capacity is 28, R2 capacity is 35
        let l2 = resp.placements.iter().find(|p| p.lesson_id == "L2").unwrap();
        assert_eq!(l2.room_id, "R2");
    }

    #[test]
    fn test_hard_room_features() {
        let req = create_test_request();
        let resp = TimetableSolver::solve(&req);
        assert_eq!(resp.hard_conflicts, 0);

        // L3 requires SCIENCE_LAB, must be placed in R2
        let l3 = resp.placements.iter().find(|p| p.lesson_id == "L3").unwrap();
        assert_eq!(l3.room_id, "R2");
    }

    #[test]
    fn test_hard_teacher_unavailability() {
        let req = create_test_request();
        let resp = TimetableSolver::solve(&req);
        assert_eq!(resp.hard_conflicts, 0);

        // T1 is unavailable at slot 0, so L1 and L2 must not be at slot 0
        let l1 = resp.placements.iter().find(|p| p.lesson_id == "L1").unwrap();
        let l2 = resp.placements.iter().find(|p| p.lesson_id == "L2").unwrap();
        assert_ne!(l1.slot, 0);
        assert_ne!(l2.slot, 0);
    }

    #[test]
    fn test_hard_pinned_lessons() {
        let mut req = create_test_request();
        req.lessons[0].is_pinned = true;
        req.lessons[0].pinned_slot = Some(15);
        req.lessons[0].pinned_room_id = Some("R1".to_string());

        let resp = TimetableSolver::solve(&req);
        assert_eq!(resp.hard_conflicts, 0);

        let l1 = resp.placements.iter().find(|p| p.lesson_id == "L1").unwrap();
        assert_eq!(l1.slot, 15);
        assert_eq!(l1.room_id, "R1");
    }

    #[test]
    fn test_infeasibility_detection() {
        let mut req = create_test_request();
        // Force class C1 to require 40 periods when total slots is 35
        for i in 0..40 {
            req.lessons.push(Lesson {
                id: format!("OVER_{}", i),
                subject_id: "MATH".to_string(),
                teacher_id: "T2".to_string(),
                class_id: "C1".to_string(),
                room_id: None,
                duration: 1,
                required_features: Vec::new(),
                student_count: Some(20),
                is_pinned: false,
                pinned_slot: None,
                pinned_room_id: None,
            });
        }

        let resp = TimetableSolver::solve(&req);
        assert_eq!(resp.status, SolutionStatus::Infeasible);
        assert!(!resp.violations.is_empty());
    }

    #[test]
    fn test_synthetic_500_solver_speed_and_feasibility() {
        let req = generate_benchmark_request(500, 12345);
        assert_eq!(req.lessons.len(), 500);

        let resp = TimetableSolver::solve(&req);
        assert_eq!(resp.hard_conflicts, 0, "Hard conflicts must be 0! Violations: {:?}", resp.violations);
        assert!(resp.solve_duration_ms < 2000, "Solving 500 lessons must take < 2000ms, took {}ms", resp.solve_duration_ms);
        assert_eq!(resp.placements.len(), 500);
    }
}
