use wasm_bindgen::prelude::*;
use opentimetable_solver_core::{
    generate_benchmark_request, models::*, state::SolverState,
    constructive::constructive_greedy_stage,
    feasibility::feasibility_tabu_search_stage,
    optimizer::lahc_soft_optimization_stage,
    validator::validate_timetable,
    TimetableSolver,
};
use rand::rngs::StdRng;
use rand::SeedableRng;
use opentimetable_solver_core::time::{Duration, Instant};

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn solve_timetable(request_json: &str) -> Result<String, JsValue> {
    let req: TimetableRequest = serde_json::from_str(request_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid JSON request: {}", e)))?;

    let response = TimetableSolver::solve(&req);

    serde_json::to_string(&response)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize response: {}", e)))
}

#[wasm_bindgen]
pub fn solve_timetable_js(val: JsValue) -> Result<JsValue, JsValue> {
    let req: TimetableRequest = serde_wasm_bindgen::from_value(val)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse request: {}", e)))?;

    let response = TimetableSolver::solve(&req);

    serde_wasm_bindgen::to_value(&response)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize response: {}", e)))
}

#[wasm_bindgen]
pub fn get_benchmark_500_request(seed: Option<u64>) -> Result<String, JsValue> {
    let req = generate_benchmark_request(500, seed.unwrap_or(42));
    serde_json::to_string(&req)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize benchmark request: {}", e)))
}

#[wasm_bindgen]
pub struct WasmSolverSession {
    state: SolverState,
    req: TimetableRequest,
    start_time: Instant,
    iteration: u64,
    rng: StdRng,
    is_feasible: bool,
}

#[wasm_bindgen]
impl WasmSolverSession {
    #[wasm_bindgen(constructor)]
    pub fn new(request_json: &str) -> Result<WasmSolverSession, JsValue> {
        let req: TimetableRequest = serde_json::from_str(request_json)
            .map_err(|e| JsValue::from_str(&format!("Invalid JSON request: {}", e)))?;

        let seed = req.config.random_seed.unwrap_or(42);
        let rng = StdRng::seed_from_u64(seed);
        let mut state = SolverState::new(&req);

        // Run initial Stage 1 constructive greedy placement immediately
        constructive_greedy_stage(&mut state);

        let initial_hard = state.recompute_hard_conflicts();

        Ok(WasmSolverSession {
            state,
            req,
            start_time: Instant::now(),
            iteration: 0,
            rng,
            is_feasible: initial_hard == 0,
        })
    }

    pub fn step(&mut self, iterations: u32) -> Result<String, JsValue> {
        let timeout = Instant::now() + Duration::from_millis(50);

        if !self.is_feasible {
            self.is_feasible = feasibility_tabu_search_stage(&mut self.state, timeout, &mut self.rng);
            self.iteration += iterations as u64;
        } else {
            lahc_soft_optimization_stage(
                &mut self.state,
                timeout,
                &mut self.rng,
                Some(iterations as u64),
            );
            self.iteration += iterations as u64;
        }

        let elapsed_ms = self.start_time.elapsed().as_millis() as u64;
        let progress = serde_json::json!({
            "type": "PROGRESS",
            "iteration": self.iteration,
            "hardConflicts": self.state.hard_conflicts,
            "softPenalty": self.state.soft_score,
            "isFeasible": self.is_feasible,
            "elapsedMs": elapsed_ms,
        });

        serde_json::to_string(&progress)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize progress: {}", e)))
    }

    pub fn get_solution(&self) -> Result<String, JsValue> {
        let elapsed_ms = self.start_time.elapsed().as_millis() as u64;
        let periods_per_day = self.req.resolved_periods_per_day();
        let mut placements = Vec::with_capacity(self.state.lessons.len());

        for (l_idx, assign) in self.state.assignments.iter().enumerate() {
            if let Some((slot, room_idx)) = *assign {
                let lesson = &self.state.lessons[l_idx];
                let room_id = if room_idx < self.state.rooms.len() {
                    self.state.rooms[room_idx].id.clone()
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

        let temp_response = TimetableResponse {
            request_id: self.req.id.clone(),
            status: if self.state.hard_conflicts == 0 {
                SolutionStatus::Feasible
            } else {
                SolutionStatus::Timeout
            },
            hard_conflicts: self.state.hard_conflicts,
            soft_penalty: self.state.soft_score,
            solve_duration_ms: elapsed_ms,
            iterations: self.iteration,
            placements,
            violations: Vec::new(),
        };

        let val_result = validate_timetable(&self.req, &temp_response);

        let final_response = TimetableResponse {
            request_id: self.req.id.clone(),
            status: if val_result.hard_conflicts == 0 {
                SolutionStatus::Optimal
            } else {
                SolutionStatus::Timeout
            },
            hard_conflicts: val_result.hard_conflicts,
            soft_penalty: self.state.soft_score,
            solve_duration_ms: elapsed_ms,
            iterations: self.iteration,
            placements: temp_response.placements,
            violations: val_result.violations,
        };

        serde_json::to_string(&final_response)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize solution: {}", e)))
    }
}
