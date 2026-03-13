# AGENTS.md — Thesis Management System

> **Mục đích:** Tài liệu dành cho AI Agent đọc hiểu nhanh codebase. Cập nhật file này khi thêm module/entity/package mới.

---

## 1. Tổng Quan Project

| Thuộc tính | Giá trị |
|---|---|
| **Framework** | Spring Boot 4.0.2 |
| **Java** | 25 |
| **Group ID** | `iu.duyduc` |
| **Artifact** | `thesis-management-system` |
| **Database** | MySQL 8+ (`thesis_management`) |
| **Migration** | Flyway |
| **Build Tool** | Maven (wrapper có sẵn: `mvnw` / `mvnw.cmd`) |
| **Port** | Mặc định 8080 |

### Tech Stack & Dependencies chính

| Dependency | Mục đích |
|---|---|
| `spring-boot-starter-data-jpa` | ORM với Hibernate |
| `spring-boot-starter-security` | Authentication & Authorization |
| `spring-boot-starter-validation` | Bean Validation |
| `spring-boot-starter-webmvc` | REST API |
| `flyway-mysql` | Database migration |
| `jjwt (0.13.0)` | JWT token (HMAC-SHA256) |
| `nimbus-jose-jwt (10.7)` | JWT hỗ trợ |
| `mapstruct (1.6.3)` | Entity ↔ DTO mapping |
| `lombok` | Boilerplate reduction |
| `apache-poi-ooxml (5.5.1)` | Đọc file Excel (import students) |
| `mysql-connector-j` | MySQL JDBC driver |

---

## 2. Kiến Trúc Thư Mục

```
src/
├── main/
│   ├── java/iu/duyduc/thesis_management_system/
│   │   ├── ThesisManagementSystemApplication.java   ← Entry point
│   │   ├── config/              ← Cấu hình Spring beans
│   │   │   ├── CorsConfig.java        (CORS cho localhost:5173)
│   │   │   └── SecurityConfig.java    (SecurityFilterChain)
│   │   ├── controller/          ← REST Controllers (nhận request)
│   │   │   ├── admin/
│   │   │   │   ├── AdminStudentController.java    /api/admin/students
│   │   │   │   ├── AdminLecturerController.java   /api/admin/lecturers
│   │   │   │   └── AdminSemesterController.java   /api/admin/semesters
│   │   │   ├── auth/
│   │   │   │   └── AuthController.java            /api/auth/login
│   │   │   └── lecturer/
│   │   │       └── LecturerController.java        /api/lecturer/students
│   │   ├── dto/                 ← Data Transfer Objects
│   │   │   ├── request/   (LoginRequest, StudentRequest, AssignStudentRequest, SemesterRequest)
│   │   │   └── response/  (AuthResponse, StudentResponse, StudentImportResponse,
│   │   │                   StudentImportItemResponse, LecturerResponse,
│   │   │                   SemesterResponse, UserResponse)
│   │   ├── entity/              ← JPA Entities (mapping tới DB tables)
│   │   │   ├── User.java            → bảng `users`
│   │   │   ├── Role.java            → bảng `roles`
│   │   │   ├── Student.java         → bảng `students`
│   │   │   ├── Semester.java        → bảng `semester`
│   │   │   ├── StudentStatus.java   → enum (VALID, INVALID)
│   │   │   └── SemesterStatus.java  → enum (UPCOMING, ACTIVE, CLOSED)
│   │   ├── exception/           ← Exception handling
│   │   │   ├── GlobalExceptionHandler.java  (@RestControllerAdvice)
│   │   │   ├── ApiException.java            (RuntimeException chung)
│   │   │   ├── ResourceNotFoundException.java
│   │   │   ├── JwtAuthenticationException.java
│   │   │   └── ErrorResponse.java           (Response body cho errors)
│   │   ├── mapper/              ← MapStruct mappers (Entity ↔ DTO)
│   │   │   ├── StudentMapper.java
│   │   │   ├── LecturerMapper.java
│   │   │   └── SemesterMapper.java
│   │   ├── repository/          ← Spring Data JPA Repositories
│   │   │   ├── StudentRepo.java     (custom queries: findAllStudentIds, findByManagedByIsNullAndStatus...)
│   │   │   ├── UserRepo.java        (findByUsername)
│   │   │   └── SemesterRepo.java    (existsByCodeAndIdNot, existsByStatus)
│   │   ├── security/            ← JWT & Spring Security
│   │   │   ├── JwtUtils.java                 (generate/validate/parse JWT)
│   │   │   ├── JwtAuthenticationFilter.java  (OncePerRequestFilter)
│   │   │   ├── CustomUserDetailService.java  (load user từ DB)
│   │   │   ├── UserPrincipal.java            (implements UserDetails, có userId)
│   │   │   ├── SecurityUtils.java            (PasswordEncoder + AuthenticationManager beans)
│   │   │   └── CustomAuthenticationEntryPoint.java (xử lý 401)
│   │   └── service/             ← Business logic
│   │       ├── AuthService.java / impl/AuthServiceImpl.java
│   │       ├── StudentService.java / impl/StudentServiceImpl.java
│   │       ├── LecturerService.java / impl/LecturerServiceImpl.java
│   │       └── SemesterService.java / impl/SemesterServiceImpl.java
│   └── resources/
│       ├── application.properties           ← Config chính (DB, JWT, Flyway, JPA)
│       ├── db/migration/                    ← Flyway SQL migrations
│       │   ├── V1__init_schema.sql          (roles, users, users_roles, students + seed data)
│       │   ├── V2__add_student_import_status.sql  (thêm status + invalid_reason vào students)
│       │   ├── V3__remove_unique_studentId.sql    (bỏ unique constraint trên student_id)
│       │   └── V4__add_semester_table.sql         (tạo bảng semester)
│       ├── static/
│       └── templates/
└── test/
    └── java/iu/duyduc/thesis_management_system/
        └── ThesisManagementSystemApplicationTests.java  ← Context load test duy nhất
```

---

## 3. API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/auth/login` | Đăng nhập, trả JWT token |

### Admin — Students (`/api/admin/students`)
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/admin/students` | Danh sách tất cả students |
| POST | `/api/admin/students` | Tạo student mới |
| POST | `/api/admin/students/import` | Import students từ file Excel |
| PATCH | `/api/admin/students/{id}` | Cập nhật student |
| DELETE | `/api/admin/students/{id}` | Xóa student |

### Admin — Lecturers (`/api/admin/lecturers`)
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/admin/lecturers` | Danh sách tất cả lecturers |

### Admin — Semesters (`/api/admin/semesters`)
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/admin/semesters` | Danh sách tất cả semesters |
| POST | `/api/admin/semesters` | Tạo semester mới |
| PATCH | `/api/admin/semesters/{semesterId}` | Cập nhật semester |
| DELETE | `/api/admin/semesters/{semesterId}` | Xóa semester |
| PATCH | `/api/admin/semesters/{semesterId}/status` | Cập nhật trạng thái semester |

### Lecturer (`/api/lecturer/students`)
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/lecturer/students/unassigned` | Danh sách students chưa được assign |
| POST | `/api/lecturer/students/assign` | Assign students cho lecturer (cần `ROLE_LECTURER`) |

---

## 4. Database Schema

### Quan hệ giữa các bảng

```
roles (ROLE_ADMIN, ROLE_LECTURER)
  └── users_roles (many-to-many) ── users
                                       └── students.managed_by (one-to-many)
semester (standalone table)
```

### Seed data (V1 migration)
- User `admin` / password `admin` → roles: `ROLE_ADMIN` + `ROLE_LECTURER`
- User `testlecturer` / password `testlecturer` → role: `ROLE_LECTURER`
- Passwords are BCrypt-hashed

---

## 5. Code Convention & Style Guide

### 5.1. Naming Convention

| Thành phần | Quy tắc | Ví dụ |
|---|---|---|
| **Package** | lowercase, underscore | `iu.duyduc.thesis_management_system` |
| **Class** | PascalCase | `StudentServiceImpl`, `AdminStudentController` |
| **Interface** | PascalCase, không prefix `I` | `StudentService`, `StudentRepo` |
| **Method** | camelCase | `getAllStudents()`, `importStudentFromFile()` |
| **Field/Variable** | camelCase | `studentId`, `fullName`, `managedBy` |
| **Constant/Enum** | UPPER_SNAKE_CASE | `VALID`, `INVALID`, `UPCOMING` |
| **DB Table** | snake_case, số nhiều | `users`, `students`, `users_roles` |
| **DB Column** | snake_case | `full_name`, `managed_by`, `student_id` |
| **REST Endpoint** | lowercase, kebab-style, số nhiều | `/api/admin/students`, `/api/auth/login` |
| **DTO** | Suffix `Request`/`Response` | `LoginRequest`, `StudentResponse` |
| **Mapper** | Suffix `Mapper` | `StudentMapper` |
| **Repository** | Suffix `Repo` | `StudentRepo`, `UserRepo` |
| **Service Impl** | Suffix `ServiceImpl` | `StudentServiceImpl` |

### 5.2. Architectural Patterns

1. **Layered Architecture:** Controller → Service (interface) → ServiceImpl → Repository → Entity
2. **DTO Pattern:** Không trả entity trực tiếp ra ngoài. Dùng Request DTO để nhận, Response DTO để trả.
3. **MapStruct Mapping:** Dùng MapStruct interfaces với `@Mapper(componentModel = "spring")` cho entity ↔ DTO mapping.
4. **Dependency Injection:** Constructor injection qua Lombok `@AllArgsConstructor` (controller + service). Không dùng `@Autowired`.
5. **Builder Pattern:** Entities dùng `@Builder` trên constructor (không phải class-level). DTOs dùng `@Builder` class-level.
6. **Lombok Annotations:**
   - **Entity:** `@Getter`, `@Setter`, `@NoArgsConstructor` + `@Builder` trên constructor
   - **DTO:** `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`
   - **Controller/Service:** `@AllArgsConstructor`

### 5.3. Controller Convention
- Annotation: `@RestController`, `@RequestMapping("/api/...")`
- Trả `ResponseEntity<T>` (không trả raw object)
- CRUD methods: GET (list), POST (create), PATCH (partial update), DELETE
- Partial update dùng `@PatchMapping`, KHÔNG dùng `@PutMapping`

### 5.4. Service Convention
- Interface + Implementation pattern (`XxxService` + `XxxServiceImpl`)
- `@Transactional` cho các method thay đổi data (create/update/delete)
- Business validation trong Service layer, KHÔNG ở Controller

### 5.5. Repository Convention
- Extends `JpaRepository<Entity, Long>`
- Tên interface: suffix `Repo` (không phải `Repository`)
- Custom queries dùng method name convention hoặc `@Query`

### 5.6. Exception Handling
- `GlobalExceptionHandler` (`@RestControllerAdvice`) xử lý exceptions chung
- `ApiException` — lỗi business logic (400)
- `ResourceNotFoundException` — không tìm thấy entity (404)
- `JwtAuthenticationException` — lỗi JWT (401)
- Error response trả `ErrorResponse` với: `timestamp`, `status`, `error`, `message`, `path`

---

## 6. Quy Tắc Quan Trọng

### 6.1. Security (Trạng thái hiện tại)
> ⚠️ **JWT filter và `@PreAuthorize` trên admin controllers đang bị COMMENT OUT.** Hiện tại tất cả endpoints đều `permitAll()`. Chỉ `/api/lecturer/students/assign` có `@PreAuthorize("hasRole('LECTURER')")` hoạt động.

- JWT config: `jwt.secret` và `jwt.expiration` trong `application.properties`
- Password encoding: BCrypt
- CORS: chỉ cho phép `http://localhost:5173`

### 6.2. Flyway Migration Rules
- Đặt file tại: `src/main/resources/db/migration/`
- Naming: `V{number}__{description}.sql` (2 dấu gạch dưới)
- `spring.jpa.hibernate.ddl-auto=validate` → Hibernate chỉ validate, KHÔNG tự tạo/sửa schema
- **KHÔNG BAO GIỜ** sửa migration đã chạy. Luôn tạo migration mới.

### 6.3. Business Rules
1. **Student Import (Excel):**
   - Cột 0: `studentId`, Cột 1: `fullName`
   - Bỏ qua header row (row 0)
   - Validation: empty ID, empty name, duplicate trong file, đã tồn tại trong DB
   - Students INVALID vẫn được lưu vào DB (với `status=INVALID` và `invalidReason`)
2. **Semester:**
   - `startDate` phải trước `endDate`
   - Chỉ được có **MỘT** semester với status `ACTIVE` tại một thời điểm
   - Không thể xóa semester đang `ACTIVE`
   - Semester mới tạo luôn có status `UPCOMING`
3. **Student Assignment:**
   - Chỉ students có `status=VALID` và `managedBy=NULL` mới hiển thị trong danh sách unassigned
   - Assign student = set `managedBy` cho lecturer

### 6.4. Testing
- Hiện tại chỉ có 1 test: `ThesisManagementSystemApplicationTests.contextLoads()` — smoke test kiểm tra Spring context load thành công
- Test framework: JUnit 5 + Spring Boot Test
- **Khi thêm tính năng mới, cần viết test tương ứng**

---

## 7. Build & Run Commands

```bash
# Build project (bỏ qua tests)
./mvnw clean package -DskipTests

# Build project (chạy tests)
./mvnw clean package

# Chạy tests
./mvnw test

# Chạy application
./mvnw spring-boot:run

# Compile only (nhanh, kiểm tra syntax)
./mvnw compile

# Windows: dùng mvnw.cmd thay cho ./mvnw
mvnw.cmd clean package -DskipTests
mvnw.cmd spring-boot:run
mvnw.cmd test
```

### Prerequisites
1. **Java 25** (hoặc tương thích)
2. **MySQL** đang chạy tại `localhost:3306`
3. Database `thesis_management` phải được tạo trước
4. Credentials: `root` / `1611` (hoặc sửa trong `application.properties`)

---

## 8. Khi Thêm Tính Năng Mới — Checklist

1. [ ] Tạo Flyway migration nếu cần thay đổi DB schema (`V{n+1}__mô_tả.sql`)
2. [ ] Tạo/sửa Entity trong `entity/`
3. [ ] Tạo DTO request/response trong `dto/request/` và `dto/response/`
4. [ ] Tạo/cập nhật MapStruct mapper trong `mapper/`
5. [ ] Tạo/sửa Repository trong `repository/`
6. [ ] Tạo Service interface + ServiceImpl trong `service/` và `service/impl/`
7. [ ] Tạo Controller endpoint trong `controller/` (phân loại theo role: admin/auth/lecturer)
8. [ ] Thêm exception handling nếu cần (custom exception + handler trong `GlobalExceptionHandler`)
9. [ ] Viết test cases
10. [ ] Chạy `mvnw.cmd compile` để kiểm tra build
