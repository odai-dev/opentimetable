use std::collections::HashMap;
use std::time::{Duration, Instant};
use rand::rngs::StdRng;
use rand::SeedableRng;

use crate::constructive::constructive_greedy_stage;
use crate::feasibility::feasibility_tabu_search_stage;
use crate::optimizer::lahc_soft_optimization_stage;
use crate::models::*;
use crate::state::SolverState;
use crate::validator::validate_timetable;

pub struct TimetableSolver;

impl TimetableSolver {
    pub fn solve(req: &TimetableRequest) -> TimetableResponse {
        let start_time = Instant::now();
        let timeout_ms = req.config.timeout_ms.unwrap_or(2000);
        let budget_ms = timeout_ms.saturating_sub(60).max(100);
        let timeout_instant = start_time + Duration::from_millis(budget_ms);

        // Stage 0: Aggregate Feasibility Checks
        let total_slots = req.total_slots();

        // Check class capacity bounds
        let mut class_durations: HashMap<&str, u32> = HashMap::new();
        let mut teacher_durations: HashMap<&str, u32> = HashMap::new();

        for l in &req.lessons {
            *class_durations.entry(l.class_id.as_str()).or_default() += l.duration.max(1) as u32;
            *teacher_durations.entry(l.teacher_id.as_str()).or_default() += l.duration.max(1) as u32;
        }

        for (c_id, total_dur) in class_durations {
            if total_dur > total_slots as u32 {
                return TimetableResponse {
                    request_id: req.id.clone(),
                    status: SolutionStatus::Infeasible,
                    hard_conflicts: total_dur.saturating_sub(total_slots as u32),
                    soft_penalty: 0,
                    solve_duration_ms: start_time.elapsed().as_millis() as u64,
                    iterations: 0,
                    placements: Vec::new(),
                    violations: vec![ViolationDetail {
                        constraint_type: "ClassHoursExceedTotalSlots".to_string(),
                        severity: "HARD".to_string(),
                        description: format!(
                            "Class {} requires {} hours, but timetable only has {} total slots",
                            c_id, total_dur, total_slots
                        ),
                        affected_lessons: Vec::new(),
                    }],
                };
            }
        }

        for (t_id, total_dur) in teacher_durations {
            if total_dur > total_slots as u32 {
                return TimetableResponse {
                    request_id: req.id.clone(),
                    status: SolutionStatus::Infeasible,
                    hard_conflicts: total_dur.saturating_sub(total_slots as u32),
                    soft_penalty: 0,
                    solve_duration_ms: start_time.elapsed().as_millis() as u64,
                    iterations: 0,
                    placements: Vec::new(),
                    violations: vec![ViolationDetail {
                        constraint_type: "TeacherHoursExceedTotalSlots".to_string(),
                        severity: "HARD".to_string(),
                        description: format!(
                            "Teacher {} is assigned {} hours, exceeding available slots {}",
                            t_id, total_dur, total_slots
                        ),
                        affected_lessons: Vec::new(),
                    }],
                };
            }
        }

        let seed = req.config.random_seed.unwrap_or(42);
        let mut rng = StdRng::seed_from_u64(seed);

        let mut state = SolverState::new(req);

        // Stage 1: MRV Constructive Greedy Placement (~5-15 ms)
        constructive_greedy_stage(&mut state);

        // Stage 2: Feasibility Search (Tabu Search + Kempe Chains) (~50-250 ms)
        let is_feasible = feasibility_tabu_search_stage(&mut state, timeout_instant, &mut rng);

        // Stage 3: LAHC Soft Optimization (Remaining budget up to timeout)
        let mut total_iterations = 0u64;
        if is_feasible && Instant::now() < timeout_instant {
            total_iterations = lahc_soft_optimization_stage(
                &mut state,
                timeout_instant,
                &mut rng,
                req.config.max_iterations,
            );
        }

        let elapsed = start_time.elapsed();
        let elapsed_ms = elapsed.as_millis() as u64;

        // Build output placements
        let periods_per_day = req.resolved_periods_per_day();
        let mut placements = Vec::with_capacity(state.lessons.len());

        for (l_idx, assign) in state.assignments.iter().enumerate() {
            if let Some((slot, room_idx)) = *assign {
                let lesson = &state.lessons[l_idx];
                let room_id = if room_idx < state.rooms.len() {
                    state.rooms[room_idx].id.clone()
                } else {
                    "R_DEFAULT".to_string()
                };

                let day = slot / periods_per_day;
                let period = slot % periods_per_day;

                placements.push(LessonAssignment {
                    lesson_id: lesson.id.clone(),
                    slot,
                    day_index: day,
                    period_index: period,
                    duration: lesson.duration,
                    room_id,
                });
            }
        }

        // Validate final state with independent validator
        let temp_response = TimetableResponse {
            request_id: req.id.clone(),
            status: SolutionStatus::Feasible,
            hard_conflicts: state.hard_conflicts,
            soft_penalty: state.soft_score,
            solve_duration_ms: elapsed_ms,
            iterations: total_iterations,
            placements,
            violations: Vec::new(),
        };

        let val_result = validate_timetable(req, &temp_response);

        let status = if val_result.hard_conflicts == 0 {
            if state.soft_score == 0 {
                SolutionStatus::Optimal
            } else {
                SolutionStatus::Feasible
            }
        } else if elapsed_ms >= timeout_ms {
            SolutionStatus::Timeout
        } else {
            SolutionStatus::Infeasible
        };

        TimetableResponse {
            request_id: req.id.clone(),
            status,
            hard_conflicts: val_result.hard_conflicts,
            soft_penalty: state.soft_score,
            solve_duration_ms: elapsed_ms,
            iterations: total_iterations,
            placements: temp_response.placements,
            violations: val_result.violations,
        }
    }
}
