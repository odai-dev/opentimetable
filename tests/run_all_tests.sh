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

echo "==> Running Client-Side .roz Parser Verification Suite..."
node --test tests/test_roz_parser.mjs

echo "==> Running Roz Round-Trip & Lossless Persistence Verification Suite (M2 Remediation)..."
node --test tests/test_roz_roundtrip_persistence.mjs

echo "==> Running Roz Parser & Serializer Adversarial Fuzzing Suite (M2 Remediation Challenger)..."
node --test tests/test_m2_remed_challenger_adversarial.mjs

echo "==> Running Milestone 3 Modal & CRUD Parity Verification Suite..."
node --test tests/test_modal_crud_parity.mjs

echo "==> Running Milestone 3 Scheduling Workflows, Locking, Split/Merge & SIS Suite..."
node --test tests/test_m3_scheduling_workflows.mjs

echo "==> Running Milestone 4 Canvas & Card Deck Precision Verification Suite..."
node --test tests/test_canvas_card_deck_precision.mjs

echo "==> Running Milestone 4 Constraint Validation, Feasibility Diagnostics & Solver Suite..."
node --test tests/test_m4_solver_feasibility.mjs

echo "==> Running Milestone 5 Multi-View Schedule Grids & Localization Verification Suite..."
node --test tests/test_m5_multiview_localization.mjs

echo "==> Running Milestone 6 Modal CRUD, Ribbon & Deck Parity Suite (Gap Closure)..."
node --test tests/test_m6_modals_ribbon_parity.mjs

echo "==> Running Dynamic Scaling & Multi-Period Boundaries Adversarial Suite..."
node --test tests/test_dynamic_scaling_adversarial.mjs

echo "==> Running Dataset Loading & Sample Switching Resilience Suite (R1)..."
node --test tests/test_dataset_switching_resilience.mjs

echo "==> Running Persistence & Dual Storage Adversarial Suite..."
node --test tests/test_persistence_autosave_adversarial.mjs

echo "==> Running Dynamic Dimensions Scaling Challenger Suite..."
node --test tests/test_m1_dynamic_dimensions_challenger.mjs

echo "==> Running Parity, Conflict & aSc XML Export Suite (M2)..."
node --test tests/test_m2_features.mjs

echo "==> Running University aSc Timetable Print & Solver Parity Suite (18 Periods, u128 Bitmasks)..."
node --test tests/test_university_asc_print_parity.mjs

echo "==> Running Ar-Rasheed Smart University (Sana'a) Sample Dataset Verification Suite..."
node --test tests/test_arrasheed_sample.mjs

echo "==> Running University Structure & Configuration Parity Suite..."
node --test tests/test_university_structure_config.mjs

echo "=========================================================="
echo "         ALL OPENTIMETABLE TESTS PASSED (100%)            "
echo "=========================================================="

