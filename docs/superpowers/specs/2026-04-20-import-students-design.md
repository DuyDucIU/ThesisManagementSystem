# Import Students Feature — Design Spec

**Date:** 2026-04-20  
**Branch:** `feature/import-students`  
**Status:** Approved

---

## Overview

Admins can upload an Excel file exported from the university system to bulk-import students into the currently active semester. The feature follows a two-phase flow: **parse** (validate only, no DB writes) then **import** (write to DB).

---

## Context

- `Student` records can exist before having a `User` account (userId is optional). Excel import creates `Student` records and enrolls them into the active semester via `SemesterStudent`.
- Only one semester can be `ACTIVE` at a time. The import always targets the active semester — no semester selector needed.
- A student who failed a previous semester is already in `students` but gets a new `SemesterStudent` row for the new semester. This is valid and expected.

---

## Excel File Format

University export columns (only first 4 used, rest ignored):

| Column | Maps To |
|--------|---------|
| Last Name | `fullName` (prefix) |
| First Name | `fullName` (suffix) — combined as `{Last Name} {First Name}` |
| Username | `email` = `{username}@student.hcmiu.edu.vn` |
| StudentID | `studentId` |

Example row: `VO GIA | KIET | ititwe22055 | ITITWE22055`
→ `fullName = "VO GIA KIET"`, `email = "ititwe22055@student.hcmiu.edu.vn"`, `studentId = "ITITWE22055"`

---

## API Contract

### Endpoint

```
POST /students/import?action=parse
POST /students/import?action=import
```

- **Auth:** `ADMIN` role only
- **Content-Type:** `multipart/form-data`
- **File field name:** `file`
- **Accepted formats:** `.xlsx`, `.xls`
- **Excel library:** `xlsx` (SheetJS)

### Parse Response (`action=parse`)

```json
{
  "total": 50,
  "valid": 44,
  "alreadyEnrolled": 3,
  "invalid": 3,
  "errors": [
    { "row": 5, "reason": "Missing studentId" },
    { "row": 12, "reason": "Missing firstName" },
    { "row": 23, "reason": "Duplicate studentId within file" }
  ],
  "alreadyEnrolledDetails": [
    { "row": 8, "studentId": "ITITWE22055", "reason": "Already enrolled in active semester" }
  ]
}
```

### Import Response (`action=import`)

```json
{
  "imported": 44,
  "skipped": 5,
  "skippedDetails": [
    { "row": 5, "studentId": null, "reason": "Missing studentId" },
    { "row": 8, "studentId": "ITITWE22055", "reason": "Already enrolled in active semester" }
  ]
}
```

### Error Responses

| Code | Condition |
|------|-----------|
| `400` | No active semester exists |
| `400` | File missing or wrong format (not `.xlsx`/`.xls`) |
| `400` | File has no data rows |

---

## Backend Logic

### Validation (shared between parse and import)

Per row, validate:
1. `Last Name` is present and non-empty
2. `First Name` is present and non-empty
3. `Username` is present and non-empty
4. `StudentID` is present and non-empty
5. No duplicate `studentId` within the uploaded file itself

### Parse Phase (`action=parse`)

1. Check an `ACTIVE` semester exists — return `400` if not
2. Parse all rows from columns 1–4
3. Run validation on each row (data checks + in-file duplicate check)
4. For each valid row, check if `SemesterStudent` exists for `{ studentId, activeSemester.id }` — flag as `alreadyEnrolled` if so
5. Return full summary: `total`, `valid`, `alreadyEnrolled`, `invalid`, with per-row details for errors and already-enrolled rows
6. **No DB writes** — parse is read-only

### Import Phase (`action=import`)

1. Check an `ACTIVE` semester exists — return `400` if not
2. Parse all rows from columns 1–4
3. Run validation — skip invalid rows (counted in response)
4. For each valid row:
   - Upsert `Student` by `studentId` (create if not exists, skip update if exists)
   - Check if `SemesterStudent` exists for `{ student.id, activeSemester.id }`
   - If exists → skip, add to `skippedDetails`
   - If not exists → create `SemesterStudent` with status `AVAILABLE`
5. Return `{ imported, skipped, skippedDetails }`

### Module Structure

```
backend/src/student/
├── student.module.ts
├── student.controller.ts
├── student.controller.spec.ts
├── student.service.ts
├── student.service.spec.ts
└── dto/
    └── import-student.dto.ts    # response shape types
```

---

## Frontend Design

### Route

`/admin/students/import` — standalone page, linked from admin sidebar.

### Module Structure

```
frontend/src/features/student/
├── api.ts
└── components/
    └── StudentImportPage.tsx
```

### Page States

**State 1 — Upload**
- File drop zone / file picker (`.xlsx`, `.xls` only)
- "Parse File" button (disabled until file selected)
- Inline error shown if "Parse File" clicked without file: *"Please select a file before parsing."*

**State 2 — Parse Results**
- Summary bar: `Total: N | Valid: N | Already Enrolled: N | Invalid: N`
- If `alreadyEnrolled > 0`: info table showing row number + studentId for already-enrolled rows
- If `invalid > 0`: error table showing row number + reason
- If `valid === 0`: message *"All records are invalid or already enrolled. Please fix the file and re-upload."* — no Confirm button
- If `valid > 0`: "Confirm Import" button
  - If `invalid > 0` or `alreadyEnrolled > 0`: clicking shows confirmation alert — *"N records will be skipped (N invalid, N already enrolled). Only N valid records will be imported. Continue?"*
  - If all rows are valid: proceeds directly
- "Choose Different File" button → resets to State 1 (clears parse result)

**State 3 — Import Results**
- Summary: `Imported: N | Skipped: N`
- If skipped > 0: table showing row number + studentId (if available) + reason for each skipped row (both invalid and already-enrolled)
- "Import Another File" button → resets to State 1

### API Client (`api.ts`)

```typescript
importStudents(file: File, action: 'parse' | 'import')
  → POST /students/import?action={action}
  → multipart/form-data with file field
```

---

## Duplicate Handling Summary

| Scenario | Parse | Import |
|----------|-------|--------|
| Invalid row data | Counted in `invalid`, shown in `errors` | Skipped, shown in `skippedDetails` with reason |
| Duplicate `studentId` within file | Counted in `invalid`, shown in `errors` | Skipped, shown in `skippedDetails` with reason |
| Student exists in DB, not enrolled this semester | Counted in `valid` | Student upserted (no change), new `SemesterStudent` created |
| Student already enrolled in active semester | Counted in `alreadyEnrolled`, shown in `alreadyEnrolledDetails` | Skipped, shown in `skippedDetails` with reason |

---

## No Schema Changes

The existing `Student` and `SemesterStudent` models support this feature without modification. `Student.userId` is already optional (students imported before account activation).
