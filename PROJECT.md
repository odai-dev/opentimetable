# Project: OpenTimetable University & Faculty Scheduling Studio

## Architecture
OpenTimetable is a Next.js (App Router, React 19, TypeScript) client application with an interactive desktop-like UI (RibbonToolbar, ViewNavigator, TimetableGrid, BottomCardDeck) and Rust WASM solver.
The University & Faculty Scheduling Studio transforms OpenTimetable into a higher education scheduling studio supporting university departments, academic levels, lecture halls, specialized laboratories, faculty members with academic titles, and Dean-approved print exports.

Backward compatibility is strictly preserved for all serialization and database schemas (`schoolName`, `grade`, `classId`, `teacherId`, `roomId`, `lessonId`, `periodsPerDay`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Centralized University Localization | English & Arabic terminology overhaul in `i18n.ts` (Lectures, University, Halls & Labs, Groups, Levels, Faculty, Dean, Advisor) | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Dynamic Lecture Period Formatting | Dynamic generation of `Lecture X` / `المحاضرة X` in `page.tsx` cascading to grid and exports | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Data Model Backward Compatibility | Strict preservation of `schoolName`, `grade`, `classId` in types and serializers | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Startup Welcome Modal Overhaul | University tagline, "Explore Sample University (Demo)", university setup entry point | M2 | ORIGINAL_REQUEST §R2 |
| 5 | University Basic Data Modal | University Specification tab, Level/Year for groups, lecture schedule configuration, Hall & Lab management | M2 | ORIGINAL_REQUEST §R2 |
| 6 | University Setup Wizard | 5-step wizard with faculties, academic levels, lecture halls, specialized labs | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Ribbon Toolbar University Controls | Updated navigation labels, "Automated Hall & Lab Allocation", faculty master views | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Timetable Grid University Views | Hall & lab views, faculty views, group views, lecture headers | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Bottom Card Deck & TimeOff Modal | Faculty availability matrix, group/batch filters, lecture bank | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Feasibility & Advisor Modals | University-wide feasibility checks, faculty workload verification, hall/lab capacity analysis | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Print Preview Studio University Alignment | Dean approval block ("Approved by Dean" / "اعتماد عميد الكلية"), Academic Affairs, Master University Timetable | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Printable Individual Timetable Sheet | University branding, Level/Year, Academic Advisor, Dean Approval, Lecture Hall/Lab, faculty titles | M3 | ORIGINAL_REQUEST §R3 |
| 13 | 6-Day University Cycle Support | Support Saturday-Thursday 6-day cycles in print studio and fallback generators | M3 | ORIGINAL_REQUEST §R3 |
| 14 | University Matrix CSV & iCal Export | CSV matrix and recurring iCal sync reflecting university courses, faculty, and halls | M3 | ORIGINAL_REQUEST §R3 |
| 15 | University Sample Dataset | Comprehensive higher education sample dataset (Cybersecurity, Dentistry, Multimedia & Graphics, Medical Laboratory, L1-L5, specialized labs, faculty titles) | M4 | ORIGINAL_REQUEST §R4 |
| 16 | Quality Verification & Zero School Terms | Zero remaining school-specific terms in UI, `npm run build` 0 errors, `run_all_tests.sh` 100% pass | M5 | ORIGINAL_REQUEST Acceptance |
| 17 | Atomic Conventional Git Commits | Clean git history with conventional commits per milestone | M5 | ORIGINAL_REQUEST §R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Higher Education Localization & Core Constants | `apps/web/src/lib/i18n.ts`, `apps/web/src/app/page.tsx` | none | IN_PROGRESS |
| M2 | University-Centric Modals & UI Controls | `StartupWelcomeModal`, `BasicDataModal`, `SetupWizardModal`, `RibbonToolbar`, `TimetableGrid`, `BottomCardDeck`, `TimeOffModal`, `TestTimetableModal`, `AdvisorModal`, etc. | M1 | PLANNED |
| M3 | Individual & Master Print/Export Studio | `PrintPreviewModal.tsx`, `IndividualTimetableSheet.tsx`, `page.tsx` (CSV/iCal) | M1 | PLANNED |
| M4 | University Sample Dataset | `apps/web/src/lib/sample-data.ts` | M1 | PLANNED |
| M5 | Final Hardening, Verification & Atomic Commits | Full test suites, zero school terms audit, build verification, git history | M1, M2, M3, M4 | PLANNED |

## Code Layout
- `apps/web/src/lib/i18n.ts`: Central bilingual dictionary (EN & AR) for higher education terminology.
- `apps/web/src/app/page.tsx`: Main studio page, dynamic period formatting, CSV matrix export, iCal export.
- `apps/web/src/components/`:
  - `StartupWelcomeModal.tsx`: University welcome & demo launcher.
  - `BasicDataModal.tsx`: University specification & master data manager.
  - `SetupWizardModal.tsx`: University setup wizard.
  - `RibbonToolbar.tsx`: Ribbon navigation & operations.
  - `TimetableGrid.tsx`: Main timetable matrix canvas.
  - `BottomCardDeck.tsx`: Unplaced lecture cards tray.
  - `TimeOffModal.tsx`: Faculty availability matrix.
  - `TestTimetableModal.tsx`: Feasibility testing.
  - `AdvisorModal.tsx`: Diagnostic constraint advisor.
  - `PrintPreviewModal.tsx`: Print studio container with Dean approval.
  - `IndividualTimetableSheet.tsx`: Printable sheet for faculty & groups.
- `apps/web/src/lib/sample-data.ts`: Comprehensive higher education sample dataset.
- `tests/`: Automated test suite (`run_all_tests.sh`, `test_print_export.mjs`, Tiers 1-4).
