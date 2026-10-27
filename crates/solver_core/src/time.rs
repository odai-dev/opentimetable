#[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
pub use std::time::{Duration, Instant};

#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
pub use web_time::{Duration, Instant};
