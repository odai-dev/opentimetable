# Project: OpenTimetable Print & Preview Studio and Enhanced Export Subsystem

## Architecture
OpenTimetable is a Next.js (App Router, React 19, TypeScript) client application with an interactive desktop-like UI (RibbonToolbar, ViewNavigator, TimetableGrid, BottomCardDeck) and Rust WASM solver.
The Print & Export Subsystem enhances user workflows by introducing:
1. `PrintPreviewModal.tsx`: An interactive visual print studio modal hosting mockups, zoom, pagination, document modes, and print settings.
2. `IndividualTimetableSheet.tsx`: Dedicated printable timetable layout (1 page per teacher or class) with 5 days × periods, entity workload quota, bell times, and signature blocks in English LTR and Arabic RTL.
3. `globals.css` (@media print): Print stylesheet hiding all background UI chrome, ribbons, card decks, and modal overlays, enforcing `page-break-after: always` between individual entities, and enabling dynamic table scaling on the master wall timetable.
4. Enhanced Export Subsystem (`page.tsx`):
   - Formatted matrix CSV/Excel with UTF-8 BOM (`\uFEFF`) where days and periods form column headers and entities form rows.
   - iCalendar (`.ics`) export supporting weekly recurrence (`RRULE:FREQ=WEEKLY`) for selected teacher/class or all entities.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Studio Modal Launcher | Clicking "Print Preview" or "Export PDF" in RibbonToolbar (Quick Access + Main/File) opens Print Studio modal | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Authentic Sheet Preview | Real-time visual page mockup with zoom controls and pagination (`<< Page X of Y >>`) | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Document Modes | 4 modes: Batch All Classes, Batch All Teachers, Selected Entity Only, Master Wall Timetable | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Page Setup Controls | Paper size (A4, A3, Letter), Orientation (Landscape, Portrait), Color Modes (Full Color, Ink-Saver, B&W) | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Header & Signature Options | School name, academic year, "Prepared By", "Approved by Principal" toggles & inputs | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Scoped Print Execution | "Print / Save as PDF" button executing `window.print()` scoped strictly to previewed sheets | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Dedicated Individual Sheet Layout | Grid structure with cycle days across columns and periods (with bell times) across rows | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Entity Quota & Header Block | Header displays teacher name, specialty, weekly teaching quota in hours; or class name, grade, homeroom teacher | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Individual Cell Formatting | Subject name, teacher/class, room number, group/division tag | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Bottom Signature & Approval Block | Formal signature block with "Prepared By" and "Approved by Principal" | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Full Bilingual Support | Native Arabic RTL and English LTR layouts respecting application language setting | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Chrome Hiding in Print Media | Hide ribbons, navigators, card decks, status bars, and modal overlays (`display: none !important`) | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Multi-Page Batch Page Breaks | Clean page breaks between entities using CSS `break-after: page; page-break-after: always;` | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Master Wall Print Scaling | Eliminate horizontal table clipping on A4/A3 landscape via dynamic min-width scaling / print rules | M3 | ORIGINAL_REQUEST §R3 |
| 15 | Repeating Table Headers | Maintain `thead { display: table-header-group; }` on multi-page master prints | M3 | ORIGINAL_REQUEST §R3 |
| 16 | Formatted Matrix Spreadsheet Export | Matrix structure with days & periods as columns and entities as rows, with UTF-8 BOM (`\uFEFF`) and Arabic text | M4 | ORIGINAL_REQUEST §R4 |
| 17 | Recurring Calendar Sync (.ics) | Weekly recurrence rules (`RRULE:FREQ=WEEKLY`) for selected teacher/class or all entities | M4 | ORIGINAL_REQUEST §R4 |
| 18 | E2E Acceptance & Build Verification | Full test suite pass + `npm run build` zero-error pass + conventional git commits | M5 | ORIGINAL_REQUEST Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Print & Preview Studio Modal | `apps/web/src/components/PrintPreviewModal.tsx`, `apps/web/src/app/page.tsx` | none | PLANNED |
| M2 | Dedicated Individual Timetable Sheet | `apps/web/src/components/IndividualTimetableSheet.tsx` | none | PLANNED |
| M3 | High-Fidelity Print Stylesheet | `apps/web/src/app/globals.css`, `apps/web/src/components/TimetableGrid.tsx` | M1, M2 | PLANNED |
| M4 | Formatted Matrix CSV & Recurring iCal | `apps/web/src/app/page.tsx` | none | PLANNED |
| M5 | Final E2E Test Suite & Hardening | Full project validation, build test, adversarial testing, git commits | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### PrintPreviewModal Props
```typescript
export type PrintDocumentMode = 'batch_classes' | 'batch_teachers' | 'selected_entity' | 'master_wall';
export type PaperSize = 'A4' | 'A3' | 'Letter';
export type PageOrientation = 'landscape' | 'portrait';
export type ColorMode = 'color' | 'ink_saver' | 'black_white';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  viewMode: ViewMode;
  selectedEntityId: string;
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  subjects: Subject[];
  lessons: Lesson[];
  placements: Placement[];
  teacherMap: Map<string, Teacher>;
  classMap: Map<string, ClassGroup>;
  roomMap: Map<string, Room>;
  subjectMap: Map<string, Subject>;
  lessonMap: Map<string, Lesson>;
  cycleDays: number;
  periodsPerDay: number;
  customDays?: string[];
  customPeriods?: string[];
  bellSchedule?: string[];
  schoolName: string;
  academicYear: string;
  cardLayout?: CardLayoutConfig;
}
```

### IndividualTimetableSheet Props
```typescript
export interface IndividualTimetableSheetProps {
  lang: 'en' | 'ar';
  entityType: 'teacher' | 'class';
  entityId: string;
  entityName: string;
  entitySubtitle?: string; // e.g. Speciality or Grade
  quotaHours?: number;     // e.g. Weekly hours
  homeroomTeacherName?: string;
  schoolName: string;
  academicYear: string;
  daysList: string[];
  periodsList: string[];
  bellSchedule?: string[];
  placements: Placement[];
  lessons: Lesson[];
  subjects: Subject[];
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  teacherMap: Map<string, Teacher>;
  classMap: Map<string, ClassGroup>;
  roomMap: Map<string, Room>;
  subjectMap: Map<string, Subject>;
  lessonMap: Map<string, Lesson>;
  colorMode: ColorMode;
  showSignatures?: boolean;
  preparedBy?: string;
  approvedBy?: string;
  isPrintOnly?: boolean;
}
```

## Code Layout
- `apps/web/src/components/PrintPreviewModal.tsx`: Visual studio modal container, controls, and preview mockup.
- `apps/web/src/components/IndividualTimetableSheet.tsx`: Pure printable sheet component for teacher or class.
- `apps/web/src/app/globals.css`: Dedicated `@media print` rules, `@page` setup, `.print:hidden`, `.print-sheet`, `.print-page-break`.
- `apps/web/src/app/page.tsx`: Modal state wiring (`isPrintPreviewOpen`), updated `handleExportCsv` matrix generator, updated `handleExportIcal` with `RRULE:FREQ=WEEKLY`.
- `tests/e2e_print_export.test.ts` / `tests/run_e2e_tests.sh`: Opaque-box automated test suite.
