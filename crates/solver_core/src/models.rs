use serde::{Deserialize, Serialize};

fn default_request_id() -> String {
    "req_1".to_string()
}

fn default_title() -> String {
    "OpenTimetable Schedule".to_string()
}

fn default_duration() -> u8 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimetableRequest {
    #[serde(default = "default_request_id")]
    pub id: String,
    #[serde(default = "default_title")]
    pub title: String,
    #[serde(default, alias = "days")]
    pub days_count: Option<u8>,
    #[serde(default, alias = "periods_per_day", alias = "periodsPerDay")]
    pub periods_per_day: Option<u8>,
    #[serde(default)]
    pub teachers: Vec<Teacher>,
    #[serde(default)]
    pub classes: Vec<ClassGroup>,
    #[serde(default)]
    pub rooms: Vec<Room>,
    #[serde(default)]
    pub subjects: Vec<Subject>,
    #[serde(default)]
    pub lessons: Vec<Lesson>,
    #[serde(default)]
    pub config: SolverConfig,
}

impl TimetableRequest {
    pub fn resolved_days(&self) -> u8 {
        self.days_count
            .or(self.config.days)
            .unwrap_or(5)
            .max(1)
    }

    pub fn resolved_periods_per_day(&self) -> u8 {
        self.periods_per_day
            .or(self.config.periods_per_day)
            .unwrap_or(7)
            .max(1)
    }

    pub fn total_slots(&self) -> u8 {
        self.resolved_days().saturating_mul(self.resolved_periods_per_day())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Teacher {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default, alias = "unavailable_slots")]
    pub unavailable_slots: Vec<u8>,
    #[serde(default, alias = "max_consecutive_periods")]
    pub max_consecutive_periods: Option<u8>,
    #[serde(default, alias = "max_daily_periods", alias = "maxDailyHours")]
    pub max_daily_periods: Option<u8>,
    #[serde(default, alias = "preferred_slots")]
    pub preferred_slots: Vec<u8>,
    #[serde(default, alias = "undesirable_slots")]
    pub undesirable_slots: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassGroup {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default, alias = "unavailable_slots")]
    pub unavailable_slots: Vec<u8>,
    #[serde(default, alias = "student_count")]
    pub student_count: Option<u16>,
    #[serde(default, alias = "home_room_id", alias = "homeRoomId", alias = "homeroom_id", alias = "homeroomId")]
    pub home_room_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Room {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub capacity: Option<u16>,
    #[serde(default, alias = "room_type")]
    pub room_type: Option<String>,
    #[serde(default)]
    pub features: Vec<String>,
    #[serde(default, alias = "unavailable_slots")]
    pub unavailable_slots: Vec<u8>,
}

impl Room {
    pub fn has_feature_or_type(&self, req: &str) -> bool {
        if let Some(ref rt) = self.room_type {
            if rt.eq_ignore_ascii_case(req) {
                return true;
            }
        }
        self.features.iter().any(|f| f.eq_ignore_ascii_case(req))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subject {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default, alias = "max_daily_periods")]
    pub max_daily_periods: Option<u8>,
    #[serde(default, alias = "required_room_type")]
    pub required_room_type: Option<String>,
    #[serde(default, alias = "required_features")]
    pub required_features: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Lesson {
    pub id: String,
    #[serde(alias = "subject_id")]
    pub subject_id: String,
    #[serde(alias = "teacher_id")]
    pub teacher_id: String,
    #[serde(alias = "class_id")]
    pub class_id: String,
    #[serde(default, alias = "room_id")]
    pub room_id: Option<String>,
    #[serde(default = "default_duration")]
    pub duration: u8,
    #[serde(default, alias = "required_features")]
    pub required_features: Vec<String>,
    #[serde(default, alias = "student_count")]
    pub student_count: Option<u16>,
    #[serde(default, alias = "is_locked", alias = "is_pinned", alias = "isPinned", alias = "isLocked")]
    pub is_pinned: bool,
    #[serde(default, alias = "pinned_slot", alias = "pinnedSlot")]
    pub pinned_slot: Option<u8>,
    #[serde(default, alias = "pinned_room_id", alias = "pinnedRoomId")]
    pub pinned_room_id: Option<String>,
    #[serde(default, alias = "initial_slot", alias = "initialSlot")]
    pub initial_slot: Option<u8>,
    #[serde(default, alias = "initial_room_id", alias = "initialRoomId")]
    pub initial_room_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "UPPERCASE")]
pub enum SolveMode {
    #[default]
    New,
    Improve,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolverConfig {
    #[serde(default, alias = "solve_mode", alias = "solveMode")]
    pub solve_mode: Option<SolveMode>,
    #[serde(default)]
    pub days: Option<u8>,
    #[serde(default, alias = "periods_per_day", alias = "periodsPerDay")]
    pub periods_per_day: Option<u8>,
    #[serde(default, alias = "max_consecutive_periods", alias = "maxConsecutivePeriods")]
    pub max_consecutive_periods: Option<u8>,
    #[serde(default, alias = "timeout_ms", alias = "timeoutMs")]
    pub timeout_ms: Option<u64>,
    #[serde(default, alias = "max_iterations", alias = "maxIterations")]
    pub max_iterations: Option<u64>,
    #[serde(default, alias = "random_seed", alias = "randomSeed")]
    pub random_seed: Option<u64>,
    #[serde(default, alias = "gap_weight", alias = "gapWeight")]
    pub gap_weight: Option<u32>,
    #[serde(default, alias = "distribution_weight", alias = "distributionWeight")]
    pub distribution_weight: Option<u32>,
    #[serde(default, alias = "preference_weight", alias = "preferenceWeight")]
    pub preference_weight: Option<u32>,
    #[serde(default, alias = "room_change_weight", alias = "roomChangeWeight")]
    pub room_change_weight: Option<u32>,
}

impl Default for SolverConfig {
    fn default() -> Self {
        Self {
            solve_mode: Some(SolveMode::New),
            days: Some(5),
            periods_per_day: Some(7),
            max_consecutive_periods: Some(4),
            timeout_ms: Some(2000),
            max_iterations: None,
            random_seed: None,
            gap_weight: Some(20),
            distribution_weight: Some(15),
            preference_weight: Some(10),
            room_change_weight: Some(5),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum SolutionStatus {
    Optimal,
    Feasible,
    Timeout,
    Infeasible,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LessonAssignment {
    #[serde(alias = "lesson_id")]
    pub lesson_id: String,
    pub slot: u8,
    #[serde(alias = "day_index", alias = "day")]
    pub day_index: u8,
    #[serde(alias = "period_index", alias = "period")]
    pub period_index: u8,
    #[serde(default = "default_duration")]
    pub duration: u8,
    #[serde(alias = "room_id")]
    pub room_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViolationDetail {
    #[serde(alias = "constraint_type")]
    pub constraint_type: String,
    pub severity: String,
    pub description: String,
    #[serde(default, alias = "affected_lessons")]
    pub affected_lessons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimetableResponse {
    #[serde(default, alias = "request_id")]
    pub request_id: String,
    pub status: SolutionStatus,
    #[serde(alias = "hard_conflicts_count", alias = "hardConflicts")]
    pub hard_conflicts: u32,
    #[serde(alias = "soft_score", alias = "softPenalty")]
    pub soft_penalty: u64,
    #[serde(alias = "elapsed_ms", alias = "solveDurationMs")]
    pub solve_duration_ms: u64,
    #[serde(default)]
    pub iterations: u64,
    #[serde(alias = "assignments")]
    pub placements: Vec<LessonAssignment>,
    #[serde(default)]
    pub violations: Vec<ViolationDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomAllocationResult {
    pub success: bool,
    #[serde(default, alias = "unallocated_lessons", alias = "unallocatedLessons")]
    pub unallocated_lessons: Vec<String>,
    #[serde(default)]
    pub assignments: Vec<LessonAssignment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RoomAllocationRequest {
    #[serde(default)]
    pub request: Option<TimetableRequest>,
    #[serde(default)]
    pub lessons: Vec<Lesson>,
    #[serde(default)]
    pub teachers: Vec<Teacher>,
    #[serde(default)]
    pub classes: Vec<ClassGroup>,
    #[serde(default)]
    pub rooms: Vec<Room>,
    #[serde(default)]
    pub subjects: Vec<Subject>,
    #[serde(default)]
    pub config: Option<SolverConfig>,
    #[serde(default)]
    pub placements: Vec<LessonAssignment>,
}
