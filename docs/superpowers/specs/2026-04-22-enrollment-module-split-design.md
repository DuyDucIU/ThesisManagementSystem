# Enrollment Module Split — Design Spec

**Date:** 2026-04-22
**Status:** Approved (brainstorm complete, ready for implementation plan)
**Scope:** Refactor — tách domain "per-semester enrollment" ra khỏi Student module thành module độc lập. Rename Prisma model, table, cột, enum, endpoint, và frontend page cho nhất quán.

---

## 1. Context

Sau khi hoàn thành Student Management feature, codebase bộc lộ vấn đề thiết kế: `Student` module đang gánh hai concern khác nhau.

- **Global student directory** — thông tin cá nhân, độc lập semester: tạo/sửa/xóa student, activate account.
- **Per-semester enrollment** — ghi nhận việc một student tham gia làm thesis trong một kỳ cụ thể: import roster, track status `AVAILABLE/ASSIGNED/COMPLETED/FAILED`.

Bảng bridge `SemesterStudent` đã tồn tại ở layer DB (vì cần ràng buộc `UNIQUE(student_id, semester_id)` và cho phép student fail một kỳ rồi enroll kỳ khác), nhưng ở application layer nó chỉ là implementation detail của Student service. Hậu quả:

- `POST /students/import` thực chất tạo enrollment record, tên endpoint gây hiểu lầm.
- `GET /students?semesterId=X` vừa global vừa scoped — endpoint "lai".
- `StudentListPage` ở frontend conditional render cột status khi filter semester — trang đa mục đích.
- Type `StudentItem` có field optional `semesterStudent` — xuất hiện lúc có, không lúc không.

## 2. Goal

Tách Enrollment thành module first-class song song với Student, với boundary rõ ràng:

- `StudentModule` — chỉ quản lý global student records, không biết gì về semester.
- `EnrollmentModule` (mới) — quản lý enrollment records và flows bắt đầu từ enrollment (import, list per-semester).

Đồng thời rename `SemesterStudent` → `Enrollment` ở cả 3 layer (Prisma model, DB table, cột foreign key) để code và DB nhất quán.

## 3. Non-Goals (Scope C — explicitly out)

Các feature sau KHÔNG thuộc scope đợt này, dành cho iteration sau:

- `PATCH /enrollments/:id` — admin đổi status enrollment thủ công
- `DELETE /enrollments/:id` — admin remove student khỏi kỳ
- Student detail page hiển thị lịch sử enrollment qua nhiều kỳ
- Bulk actions trên enrollment list
- Cross-semester queries (`GET /enrollments` không filter semester)
- Lịch sử audit / changelog enrollment

## 4. Architecture

### 4.1 Backend module layout

```
backend/src/
├── student/                         # Global student directory
│   ├── student.module.ts
│   ├── student.controller.ts        # /students — CRUD only
│   ├── student.service.ts           # CRUD only
│   └── dto/
│       ├── create-student.dto.ts
│       ├── update-student.dto.ts
│       └── query-student.dto.ts     # không còn field semesterId
│
└── enrollment/                      # NEW — per-semester operations
    ├── enrollment.module.ts
    ├── enrollment.controller.ts     # /enrollments — list + import
    ├── enrollment.service.ts
    └── dto/
        ├── query-enrollment.dto.ts
        └── import-enrollment.dto.ts
```

### 4.2 Dependency direction

```
StudentModule     EnrollmentModule
     ↓                  ↓
     └──── PrismaModule ────┘   (shared)
```

- Không có dependency cross-module giữa Student và Enrollment.
- `EnrollmentService` được phép đọc/ghi bảng `students` qua Prisma (khi import tạo student mới). Prisma là shared infrastructure, không phải biên nghiệp vụ.
- `StudentService` không được đụng bảng `enrollments`.

### 4.3 Frontend module layout

```
frontend/src/features/
├── student/
│   ├── api.ts                       # trimmed: bỏ import types, bỏ semesterId filter
│   ├── components/
│   │   ├── StudentListPage.tsx      # trimmed: bỏ semester filter, bỏ cột status
│   │   ├── StudentCreateModal.tsx
│   │   └── StudentEditModal.tsx
│   └── store/studentStore.ts
│
└── enrollment/                      # NEW
    ├── api.ts
    ├── components/
    │   ├── EnrollmentListPage.tsx
    │   └── EnrollmentImportPage.tsx # moved from student/, rename + enhance
    └── store/enrollmentStore.ts
```

### 4.4 Routes

```
/admin/students              → StudentListPage
/admin/enrollments           → EnrollmentListPage (default: active semester)
/admin/enrollments/import    → EnrollmentImportPage
```

Menu "Enrollments" đứng cạnh "Students" trong `AppLayout`.

## 5. API Contract

All endpoints `@Roles(Role.ADMIN)`.

### 5.1 Student endpoints (after refactor)

#### `GET /students` — List global students

Query params: `search`, `hasAccount`, `page`, `limit`. **Field `semesterId` bị xóa.**

Response `200`:
```json
{
  "data": [
    { "id": 10, "studentId": "ITITIU20001", "fullName": "Nguyen Van A",
      "email": "nva@student.hcmiu.edu.vn", "hasAccount": true }
  ],
  "total": 150, "page": 1, "limit": 20
}
```

#### `POST /students` — Create
Request: `{ studentId, fullName, email }`. Response `201` (student object) / `400` (validation / duplicate).

#### `PATCH /students/:id` — Update
Request: `{ fullName?, email?, studentId? }` (≥1 field). Response `200` / `400` / `404`.

#### `DELETE /students/:id` — Delete
Response: `204` / `404` / `409` (student có thesis đang active).

#### `POST /students/import` — **REMOVED** (moved to `POST /enrollments/import`)

### 5.2 Enrollment endpoints (new)

#### `GET /enrollments` — List enrollments

Query params:

| Name | Type | Required | Default |
|------|------|----------|---------|
| `semesterId` | int | no | Active semester; 400 if none |
| `status` | EnrollmentStatus | no | — |
| `search` | string | no | Matches student's fullName / studentId / email |
| `page` | int | no | 1 |
| `limit` | int | no | 20 |

Response `200`:
```json
{
  "data": [
    {
      "enrollmentId": 42,
      "status": "ASSIGNED",
      "student": {
        "id": 10, "studentId": "ITITIU20001", "fullName": "Nguyen Van A",
        "email": "nva@student.hcmiu.edu.vn", "hasAccount": true
      }
    }
  ],
  "total": 30, "page": 1, "limit": 20,
  "semester": { "id": 3, "code": "2025-HK1", "name": "Học kỳ 1 2025-2026" }
}
```

Errors:
- `400` — `{ "message": "No active semester — please specify semesterId" }` nếu thiếu param và không có ACTIVE.
- `404` — semester không tồn tại.

#### `POST /enrollments/import?action=parse` — Preview import

Request: `multipart/form-data`, field `file` (`.xlsx` / `.xls`, max 5MB).
Query: `action=parse`, optional `semesterId`.

Response `200`:
```json
{
  "semester": { "id": 3, "code": "2025-HK1", "name": "..." },
  "total": 50, "valid": 45, "alreadyEnrolled": 3, "invalid": 2,
  "errors": [ { "row": 5, "reason": "Missing studentId" } ],
  "alreadyEnrolledDetails": [
    { "row": 7, "studentId": "ITITIU20001",
      "reason": "Already enrolled in target semester" }
  ]
}
```

Errors: `400` (no file / wrong ext / empty / target CLOSED / no active), `404` (semester không tồn tại).

#### `POST /enrollments/import?action=import` — Execute import

Request giống `parse`.

Response `200`:
```json
{
  "semester": { "id": 3, "code": "2025-HK1", "name": "..." },
  "imported": 45, "skipped": 5,
  "skippedDetails": [
    { "row": 5, "studentId": null, "reason": "Missing studentId" },
    { "row": 7, "studentId": "ITITIU20001",
      "reason": "Already enrolled in target semester" }
  ]
}
```

### 5.3 Error shape
NestJS default: `{ statusCode, message, error }`. Không đổi.

### 5.4 Breaking changes summary

| Endpoint | Change |
|----------|--------|
| `GET /students?semesterId=X` | Filter removed — switch to `/enrollments?semesterId=X` |
| `POST /students/import` | Deleted — switch to `POST /enrollments/import` |
| `GET /enrollments` | New endpoint, nested student shape, `semester` envelope field |

## 6. Schema Changes

### 6.1 Prisma diff

#### Enum
```diff
- enum SemesterStudentStatus {
+ enum EnrollmentStatus {
    AVAILABLE ASSIGNED COMPLETED FAILED
  }
```

#### Model `SemesterStudent` → `Enrollment`
```diff
- model SemesterStudent {
+ model Enrollment {
    id         Int              @id @default(autoincrement())
    studentId  Int              @map("student_id")
    semesterId Int              @map("semester_id")
-   status     SemesterStudentStatus @default(AVAILABLE)
+   status     EnrollmentStatus @default(AVAILABLE)
    student  Student  @relation(fields: [studentId], references: [id])
    semester Semester @relation(fields: [semesterId], references: [id])
    thesis Thesis?
    @@unique([studentId, semesterId])
-   @@map("semester_students")
+   @@map("enrollments")
  }
```

#### `Student.semesterStudents` → `Student.enrollments`
```diff
- semesterStudents SemesterStudent[]
+ enrollments Enrollment[]
```

#### `Semester.semesterStudents` → `Semester.enrollments`
```diff
- semesterStudents SemesterStudent[]
+ enrollments Enrollment[]
```

#### `Thesis.semesterStudentId` → `Thesis.enrollmentId`
```diff
- semesterStudentId Int @unique @map("semester_student_id")
+ enrollmentId      Int @unique @map("enrollment_id")
- semesterStudent SemesterStudent @relation(fields: [semesterStudentId], references: [id])
+ enrollment      Enrollment      @relation(fields: [enrollmentId], references: [id])
```

### 6.2 Migration SQL (expected)

File: `prisma/migrations/<timestamp>_rename_semester_student_to_enrollment/migration.sql`

```sql
ALTER TABLE `theses` DROP FOREIGN KEY `theses_semester_student_id_fkey`;
ALTER TABLE `theses` RENAME COLUMN `semester_student_id` TO `enrollment_id`;
ALTER TABLE `semester_students` RENAME TO `enrollments`;
ALTER TABLE `theses`
  ADD CONSTRAINT `theses_enrollment_id_fkey`
  FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `enrollments`
  RENAME INDEX `semester_students_student_id_semester_id_key`
  TO `enrollments_student_id_semester_id_key`;
ALTER TABLE `theses`
  RENAME INDEX `theses_semester_student_id_key`
  TO `theses_enrollment_id_key`;
```

**Procedure:**
1. Edit `schema.prisma`.
2. `npx prisma migrate dev --create-only --name rename_semester_student_to_enrollment`.
3. Inspect generated SQL — if Prisma produced `DROP + CREATE` instead of `RENAME`, replace manually with SQL above.
4. `npx prisma migrate dev` to apply.

Enum rename (`SemesterStudentStatus` → `EnrollmentStatus`) chỉ thay TypeScript binding — MySQL lưu enum inline trên cột `status`, không cần SQL migration.

### 6.3 Code cập nhật sau `prisma generate`

Compile error sẽ bắt hầu hết references. Expected locations:
- `backend/src/student/student.service.ts` — `prisma.semesterStudent` → `prisma.enrollment` (lines 116, 182, 241, 289 hiện tại); relation `semesterStudents` → `enrollments` (line 226); relation `semesterStudent` trong where clause thesis → `enrollment` (line 279).
- `backend/src/student/student.service.spec.ts` — mocks.
- Grep toàn codebase `semesterStudent|SemesterStudent` sau refactor để đảm bảo không sót.

## 7. Backend Logic Details

### 7.1 `resolveTargetSemester` helper (shared)

`EnrollmentService` có private helper dùng cho cả `parseImport` và `importEnrollments`:

```typescript
private async resolveTargetSemester(semesterId?: number) {
  if (semesterId != null) {
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    })
    if (!semester) throw new NotFoundException(`Semester #${semesterId} not found`)
    if (semester.status === SemesterStatus.CLOSED) {
      throw new BadRequestException('Cannot import into a closed semester')
    }
    return semester
  }
  const active = await this.prisma.semester.findFirst({
    where: { status: SemesterStatus.ACTIVE },
  })
  if (!active) {
    throw new BadRequestException('No active semester — please specify semesterId')
  }
  return active
}
```

`GET /enrollments` cũng dùng cùng helper (chia sẻ fallback-to-active logic) với modification: không reject CLOSED (đọc kỳ đã đóng là hợp lệ).

### 7.2 `EnrollmentService.findAll`

Logic tương đương `student.service.ts:findAll` với `semesterId` filter, nhưng:
- Query `prisma.enrollment.findMany` (không phải `prisma.student`)
- Include `student` relation để build nested response
- Thêm `semester` top-level trong response
- Support `status` filter mới

### 7.3 `EnrollmentService.parseImport` / `importEnrollments`

Port nguyên logic từ `student.service.ts:parseImport` và `importStudents`, với:
- Gọi `resolveTargetSemester(dto.semesterId)` thay vì hardcode active
- Thay `activeSemester.id` bằng `targetSemester.id` ở mọi chỗ
- Thêm `semester` vào response object
- Error message "Already enrolled in active semester" → "Already enrolled in target semester"

### 7.4 `StudentService` changes

- Bỏ hoàn toàn `parseImport` và `importStudents`.
- Bỏ `semesterId` branch trong `findAll`.
- Bỏ `enrollmentMap` logic, bỏ nested `semesterStudent` trong response.
- `remove` vẫn check thesis qua `enrollment` relation (đổi path `semesterStudent` → `enrollment`).

## 8. Frontend Details

### 8.1 `frontend/src/features/enrollment/api.ts`

Export: `EnrollmentStatus`, `SemesterSummary`, `EnrollmentStudent`, `EnrollmentItem`, `EnrollmentQuery`, `PaginatedEnrollmentResult`, `ParseImportResult`, `ImportEnrollmentsResult`, `ParseRowError`, `AlreadyEnrolledDetail`, `SkippedDetail`, `enrollmentApi`.

Methods:
- `list(params)` → `GET /enrollments`
- `parseImport(file, semesterId?)` → `POST /enrollments/import?action=parse&semesterId=...`
- `importEnrollments(file, semesterId?)` → `POST /enrollments/import?action=import&semesterId=...`

`extractErrorMessage` re-exported từ `student/api.ts`.

### 8.2 `enrollmentStore`

Zustand store giống pattern `studentStore`:

```typescript
interface EnrollmentState {
  enrollments: EnrollmentItem[]
  total: number
  page: number
  currentSemester: SemesterSummary | null
  loading: boolean
  error: string | null
  fetchAll: (query?: EnrollmentQuery) => Promise<void>
}
```

### 8.3 `EnrollmentListPage`

Layout:
- Header: "Enrollments" + button "Import"
- Filters: semester dropdown (default active, labeled `(active)`), status dropdown, search input
- Table columns: Student ID | Full Name | Email | Has Account | Status
- Pagination
- Không có action column (scope C)

Semester dropdown lấy từ semester API, hiển thị tất cả semester (kể cả CLOSED), label kỳ ACTIVE là `code (active)`.

### 8.4 `EnrollmentImportPage`

Thêm vào so với `StudentImportPage` cũ:
- Dropdown chọn target semester ở đầu page (default ACTIVE, label `(active)`)
- Dropdown chỉ list semester `INACTIVE` + `ACTIVE` (loại CLOSED)
- Preview header: "Importing into: **2025-HK1** — Học kỳ 1 2025-2026"

Giữ nguyên: file picker, preview table với counts + error table, confirm button.

### 8.5 `StudentListPage` trim

- Bỏ state `semesterIdFilter`, bỏ semester dropdown
- Bỏ cột "Status" conditional
- Bỏ `semesterId` từ query
- Giữ: search, hasAccount filter, create/edit/delete actions

### 8.6 Routes

```diff
  { path: '/admin/students', element: <StudentListPage /> },
- { path: '/admin/students/import', element: <StudentImportPage /> },
+ { path: '/admin/enrollments', element: <EnrollmentListPage /> },
+ { path: '/admin/enrollments/import', element: <EnrollmentImportPage /> },
```

## 9. Edge Cases

| Scenario | Expected |
|----------|----------|
| `GET /enrollments` không semesterId + không ACTIVE | 400 "No active semester" |
| `GET /enrollments?semesterId=999` không tồn tại | 404 |
| Import target CLOSED | 400 "Cannot import into a closed semester" |
| Import target không tồn tại | 404 |
| Import row: student đã có + đã enrolled | Skip, "Already enrolled in target semester" |
| Import row: student đã có + chưa enrolled | Tạo enrollment, không update student |
| Import row: student chưa có | Upsert student + tạo enrollment |
| Import row: studentId duplicate trong file | First wins, subsequent → "Duplicate studentId within file" |
| Import row: thiếu field | Skip, "Missing <field>" |
| `DELETE /students/:id` có active thesis | 409 |
| `DELETE /students/:id` có enrollment không thesis | Cascade delete enrollments rồi delete student |
| `PATCH /students/:id` duplicate studentId/email | 400 (existing `handleStudentP2002`) |

## 10. Validation

`QueryEnrollmentDto`:
- `semesterId` optional int ≥1
- `status` optional enum
- `search` optional string
- `page` optional int ≥1
- `limit` optional int ≥1 ≤100

Import query: `action ∈ {parse, import}`, `semesterId` optional int.

File: ext `.xlsx`/`.xls`, max 5MB, ≥1 data row, 4 columns `lastName|firstName|username|studentId`.

## 11. Test Plan

### 11.1 Backend unit (Jest)

**`EnrollmentService.findAll`:**
- Filter by semesterId
- Default active when semesterId omitted
- 400 when no active + no param
- 404 when semesterId invalid
- Apply status filter
- Apply search filter
- Pagination

**`EnrollmentService.parseImport`:**
- Count valid/alreadyEnrolled/invalid
- Duplicate studentId in file
- Missing fields
- Already-enrolled detection
- Use active when omitted
- Use specified when provided
- 400 when CLOSED

**`EnrollmentService.importEnrollments`:**
- Create student for new
- Skip existing student (no update)
- Create enrollment
- Skip already-enrolled
- Correct counts
- 400 when CLOSED

**`StudentService` (post-trim):**
- Existing tests pass (minus `semesterId` filter)
- `remove` with active thesis → 409 via new `enrollment` relation path

### 11.2 Backend E2E (user, Postman)

1. Student CRUD happy path
2. Student delete with thesis → 409
3. `GET /enrollments` no param → active semester + `semester` envelope
4. `GET /enrollments?semesterId=X` specific
5. `GET /enrollments?semesterId=999` → 404
6. Import no param → active
7. Import INACTIVE semester → success
8. Import CLOSED → 400
9. Import parse → counts + errors
10. Import execute → records inserted, idempotent on retry

### 11.3 Frontend E2E (Playwright + manual)

1. `/admin/students` — global list, no status column
2. Student CRUD on UI
3. `/admin/enrollments` — default active semester view
4. Switch semester → list refreshes
5. Status + search filters
6. `/admin/enrollments/import` — semester dropdown default active, file upload, preview, confirm
7. Import into CLOSED → UI shows error clearly

## 12. Rollout Order

Mỗi step commit riêng để rollback dễ:

1. **Schema + migration** — edit `schema.prisma`, generate migration, apply (backend compile errors expected)
2. **StudentService update** — fix references để backend compile lại, tests pass
3. **Enrollment module new** — add module + service + controller + DTO + tests
4. **Student module cleanup** — remove import methods + endpoint, remove `semesterId` filter
5. **Frontend enrollment feature** — add folder + api + store + pages + routes + menu
6. **Frontend student cleanup** — trim api + store + list page

## 13. Documentation Updates

Sau khi implement:
- `.claude/docs/backend.md` — add Enrollment module
- `.claude/docs/database.md` — update table `enrollments`
- `.claude/docs/api.md` — add `/enrollments`, remove `/students/import`
- `CLAUDE.md` — update module list if applicable

## 14. Risks

| Risk | Mitigation |
|------|------------|
| Prisma migrate generates DROP+CREATE instead of RENAME (data loss) | `--create-only` flag, inspect SQL, edit manually if needed |
| Missed references to `semesterStudent` | TypeScript compile errors after `prisma generate` catch most; final grep pass |
| Test spec using old prisma mock | Updated as part of Step 2 |
| Frontend reads legacy `semesterStudent` field | Type removal forces compile error in TypeScript |
