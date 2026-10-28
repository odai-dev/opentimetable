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

echo "==> Running Milestone 3 Modal & CRUD Parity Verification Suite..."
node --test tests/test_modal_crud_parity.mjs

echo "==> Running Milestone 4 Canvas & Card Deck Precision Verification Suite..."
node --test tests/test_canvas_card_deck_precision.mjs

echo "=========================================================="
echo "         ALL OPENTIMETABLE TESTS PASSED (100%)            "
echo "=========================================================="
