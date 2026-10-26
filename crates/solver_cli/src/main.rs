use clap::Parser;
use opentimetable_solver_core::{
    generate_benchmark_request, models::*, TimetableSolver,
};
use std::fs;
use std::path::PathBuf;
use std::process;

#[derive(Parser, Debug)]
#[command(name = "opentimetable-solver-cli")]
#[command(about = "High-performance timetable constraint satisfaction solver CLI", long_about = None)]
struct Cli {
    /// Path to input TimetableRequest JSON file
    #[arg(short, long)]
    input: Option<PathBuf>,

    /// Path to output TimetableResponse JSON file
    #[arg(short, long)]
    output: Option<PathBuf>,

    /// Timeout limit in milliseconds
    #[arg(long, default_value_t = 2000)]
    timeout_ms: u64,

    /// Run synthetic 500+ lesson benchmark test
    #[arg(long)]
    benchmark_500: bool,

    /// Random seed for deterministic solving
    #[arg(long, default_value_t = 42)]
    seed: u64,
}

fn main() {
    let cli = Cli::parse();

    let mut request = if cli.benchmark_500 {
        println!("==> Generating synthetic 500+ lesson benchmark instance...");
        generate_benchmark_request(500, cli.seed)
    } else if let Some(ref input_path) = cli.input {
        let content = match fs::read_to_string(input_path) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Error reading input file {:?}: {}", input_path, e);
                process::exit(1);
            }
        };
        match serde_json::from_str::<TimetableRequest>(&content) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("Error parsing JSON from {:?}: {}", input_path, e);
                process::exit(1);
            }
        }
    } else {
        eprintln!("Error: Either --input <FILE> or --benchmark-500 must be specified.");
        process::exit(1);
    };

    // Override timeout and seed if provided
    request.config.timeout_ms = Some(cli.timeout_ms);
    request.config.random_seed = Some(cli.seed);

    println!(
        "==> Starting Timetable Solver on schedule '{}' ({} lessons, {} teachers, {} classes, {} rooms)...",
        request.title,
        request.lessons.len(),
        request.teachers.len(),
        request.classes.len(),
        request.rooms.len()
    );

    let response = TimetableSolver::solve(&request);

    println!("\n========================================================");
    println!("                   SOLVER RESULTS                       ");
    println!("========================================================");
    println!(" Status:          {:?}", response.status);
    println!(" Hard Conflicts:  {}", response.hard_conflicts);
    println!(" Soft Penalty:    {}", response.soft_penalty);
    println!(" Solve Time:      {} ms", response.solve_duration_ms);
    println!(" Placements:      {}/{}", response.placements.len(), request.lessons.len());
    println!(" Iterations:      {}", response.iterations);
    println!("========================================================");

    if !response.violations.is_empty() {
        println!("\nViolations ({}):", response.violations.len());
        for v in response.violations.iter().take(10) {
            println!(" - [{}] {}: {}", v.severity, v.constraint_type, v.description);
        }
    }

    if let Some(ref output_path) = cli.output {
        let json = serde_json::to_string_pretty(&response).expect("Failed to serialize response");
        if let Err(e) = fs::write(output_path, json) {
            eprintln!("Error writing output file {:?}: {}", output_path, e);
            process::exit(1);
        }
        println!("\nOutput saved to {:?}", output_path);
    }

    if response.hard_conflicts > 0 {
        eprintln!("\nFAILURE: Solver finished with {} hard conflicts!", response.hard_conflicts);
        process::exit(1);
    } else {
        println!("\nSUCCESS: Timetable solved with 0 hard conflicts in {} ms!", response.solve_duration_ms);
    }
}
