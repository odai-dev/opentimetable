# E2E Test Infra: OpenTimetable Print & Export Subsystem

## Test Philosophy
- Opaque-box, requirement-driven. Derived from ORIGINAL_REQUEST.md.
- Verification covers:
  1. Print & Preview Studio Modal behavior and state controls (R1).
  2. Individual Timetable Sheet rendering, bilingual RTL/LTR, quota and bell schedule (R2).
  3. High-fidelity print stylesheet `@media print`, page breaks, and wall timetable scaling (R3).
  4. Matrix CSV export with UTF-8 BOM (`\uFEFF`) and recurring iCalendar (`RRULE:FREQ=WEEKLY`) export (R4).
  5. Build integrity (`npm run build` in `apps/web`) with zero errors.

## Feature Inventory & Test Mapping
| # | Feature | Source (Requirement) | Tier 1 (Isolated) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Scenario) |
|---|---------|---------------------|:-----------------:|:-----------------:|:---------------------:|:-----------------:|
| 1 | Studio Modal Launcher | ORIGINAL_REQUEST §R1 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 2 | Sheet Preview Mockup | ORIGINAL_REQUEST §R1 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 3 | Document Mode Selector | ORIGINAL_REQUEST §R1 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 4 | Page Setup Controls | ORIGINAL_REQUEST §R1 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 5 | Header & Signature Options | ORIGINAL_REQUEST §R1 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 6 | Scoped Print Execution | ORIGINAL_REQUEST §R1 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 7 | Dedicated Individual Sheet Grid | ORIGINAL_REQUEST §R2 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 8 | Entity Quota & Header Details | ORIGINAL_REQUEST §R2 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 9 | Individual Cell Formatting | ORIGINAL_REQUEST §R2 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 10 | Signature & Approval Block | ORIGINAL_REQUEST §R2 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 11 | Bilingual RTL/LTR Support | ORIGINAL_REQUEST §R2 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 12 | Chrome Hiding in @media print | ORIGINAL_REQUEST §R3 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 13 | Multi-Page Page Breaks | ORIGINAL_REQUEST §R3 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 14 | Master Wall Print Scaling | ORIGINAL_REQUEST §R3 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 15 | Repeating Table Headers | ORIGINAL_REQUEST §R3 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 16 | Formatted Matrix CSV Export | ORIGINAL_REQUEST §R4 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| 17 | Recurring Calendar Sync (iCal) | ORIGINAL_REQUEST §R4 | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |

## Test Architecture
- Test Suite Location: `tests/e2e_print_export.test.ts` or standalone Node/TypeScript runner script `tests/run_e2e_tests.sh`.
- Test Harness: Evaluates exported outputs (CSV, iCal), static DOM generation logic, CSS print rules syntax, and TypeScript types.
- Verification Semantics: All automated test suites must exit with status code 0.
- `apps/web`: `npm run build` must complete with 0 errors.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Saudi School Weekly Schedule (5 days, 12 periods, Arabic RTL) | F1, F3, F7, F8, F11, F13 | High |
| 2 | High School Faculty Printout Distribution (Batch all teachers with quota) | F2, F3, F4, F8, F10, F12, F13 | High |
| 3 | Classroom Door Schedules (Batch all classes with homeroom & room tags) | F3, F7, F9, F13, F14 | Medium |
| 4 | Semester Matrix Spreadsheet Export for Administration | F16, F11 | Medium |
| 5 | Full Academic Term Calendar Sync for Teacher with RRULE | F17, F8 | Medium |

## Coverage Thresholds
- Tier 1: ≥85 tests across features (5 per feature × 17 features)
- Tier 2: ≥85 boundary tests
- Tier 3: ≥17 cross-feature interaction tests
- Tier 4: ≥5 realistic full-scale application scenarios
