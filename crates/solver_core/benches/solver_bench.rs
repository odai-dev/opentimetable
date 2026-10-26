use criterion::{criterion_group, criterion_main, Criterion};
use opentimetable_solver_core::{generate_benchmark_request, TimetableSolver};

fn benchmark_500_lessons(c: &mut Criterion) {
    let mut group = c.benchmark_group("solver_500_lessons");
    group.sample_size(10);
    group.measurement_time(std::time::Duration::from_secs(10));

    let request = generate_benchmark_request(500, 42);

    group.bench_function("solve_500_lessons", |b| {
        b.iter(|| {
            let resp = TimetableSolver::solve(&request);
            assert_eq!(resp.hard_conflicts, 0);
        });
    });

    group.finish();
}

criterion_group!(benches, benchmark_500_lessons);
criterion_main!(benches);
