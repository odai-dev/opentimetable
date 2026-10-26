#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "          OpenTimetable Full Quality Test Runner          "
echo "=========================================================="

echo "==> Running Rust Solver Core Tests & Benchmarks..."
cargo test -p opentimetable-solver-core -- --nocapture

echo "==> Running Native Rust Solver 500+ Lesson Release Benchmark..."
cargo run --release -p opentimetable-solver-cli -- --benchmark-500

echo "==> Running E2E Test Matrix (Tiers 1-4: 277 Tests)..."
node --test tests/tier1_features/*.test.mjs tests/tier2_boundaries/*.test.mjs tests/tier3_pairwise/*.test.mjs tests/tier4_scenarios/*.test.mjs

echo "=========================================================="
echo "         ALL OPENTIMETABLE TESTS PASSED (100%)            "
echo "=========================================================="
