# AGENTS.md — Thesis Management System UI

> **Quick reference for AI agents** to understand this codebase at a glance.

---

## 1. Tech Stack

| Layer       | Technology                                                  |
| ----------- | ----------------------------------------------------------- |
| Framework   | **React 19** (JSX, functional components, hooks)            |
| Build tool  | **Vite 7** (`@vitejs/plugin-react`)                         |
| Routing     | **React Router DOM 7** (`BrowserRouter`, nested `<Routes>`) |
| UI library  | **Ant Design 6** (primary) + **Bootstrap 5** (CSS only)     |
| HTTP client | **Axios** (global Bearer-token interceptor)                 |
| Linting     | **ESLint 9** (flat config, `react-hooks` + `react-refresh`) |
| Language    | **JavaScript** (ES modules, no TypeScript)                  |

---

## 2. Project Structure

```
thesis-management-system-ui/
├── index.html              ← Vite entry HTML (mounts #root)
├── package.json
├── vite.config.js           ← Vite config (chỉ plugin react, không alias)
├── eslint.config.js         ← ESLint flat config
├── public/
│   └── vite.svg
└── src/
    ├── main.jsx             ← App bootstrap (StrictMode, CSS imports)
    ├── App.jsx              ← Root component: BrowserRouter + Routes
    ├── App.css              ← (trống — chưa dùng)
    ├── index.css            ← (trống — chưa dùng)
    │
    ├── component/           ← **Tất cả UI page-level components**
    │   ├── LoginComponent.jsx
    │   ├── AdminImportStudents.jsx
    │   ├── StudentList.jsx
    │   ├── EditStudentModal.jsx
    │   ├── AdminSemester.jsx
    │   ├── SemesterForm.jsx
    │   └── UnassignedStudentList.jsx
    │
    ├── layout/              ← **Layout wrappers (dùng <Outlet />)**
    │   ├── MainLayout.jsx        ← Header + Content + Footer (toàn app)
    │   ├── AdminLayout.jsx       ← Sider menu + Content (nested /admin/*)
    │   └── LecturerLayout.jsx    ← Header + Content + Footer (nested /lecturer/*)
    │
    ├── service/             ← **API service modules (Axios)**
    │   ├── AuthService.js        ← Login, token/role helpers, localStorage
    │   ├── StudentService.js     ← CRUD + import + assign students
    │   ├── SemesterService.js    ← CRUD + status update semesters
    │   └── LecturerService.js    ← Get all lecturers + Axios interceptor
    │
    ├── styles/              ← **Component-scoped CSS**
    │   ├── StudentList.css
    │   └── AdminSemester.css
    │
    └── assets/
        └── react.svg
```

---

## 3. Routing Map

```
/                                → LoginComponent        (public)
/admin                           → AdminLayout (Sider menu)
  /admin/students                → StudentList
  /admin/import                  → AdminImportStudents
  /admin/semesters               → AdminSemester
/lecturer                        → LecturerLayout
  /lecturer/unassigned-students  → UnassignedStudentList
```

- Tất cả routes đều nằm trong `MainLayout` (Header + Footer chung).
- Sau login, redirect theo role: `ROLE_ADMIN` → `/admin/students`, `ROLE_LECTURER` → `/lecturer/unassigned-students`.
- **Chưa có route guard / ProtectedRoute** — chỉ redirect phía client, chưa chặn truy cập trực tiếp.

---

## 4. API Backend

| Base URL                                        | Prefix        | Dùng bởi             |
| ----------------------------------------------- | ------------- | -------------------- |
| `http://localhost:8080/api/auth`                 | Auth          | `AuthService.js`     |
| `http://localhost:8080/api/admin/students`       | Admin Student | `StudentService.js`  |
| `http://localhost:8080/api/admin/semesters`      | Admin Semester| `SemesterService.js` |
| `http://localhost:8080/api/admin/lecturers`      | Admin Lecturer| `LecturerService.js` |
| `http://localhost:8080/api/lecturer/students`    | Lecturer      | `StudentService.js`  |

### Auth Flow
1. POST `/api/auth/login` → nhận `{ token, user }`.
2. `saveAuth()` lưu `token`, `roles`, `user` vào **localStorage**.
3. **Axios interceptor** ở `LecturerService.js` tự gắn `Authorization: Bearer <token>` cho mọi request.
4. `clearAuth()` xóa localStorage khi logout.

---

## 5. Code Conventions

### 5.1 Naming

| Loại              | Convention                    | Ví dụ                           |
| ----------------- | ----------------------------- | -------------------------------- |
| Component file    | **PascalCase**.jsx            | `StudentList.jsx`                |
| Service file      | **PascalCase**.js             | `StudentService.js`              |
| CSS file          | **PascalCase**.css            | `StudentList.css`                |
| Component name    | PascalCase (arrow / function) | `const StudentList = () => {}`   |
| Service function  | camelCase (export named)      | `export const getAllStudents`     |
| State variable    | camelCase                     | `students`, `showModal`          |
| API constant      | UPPER_SNAKE_CASE              | `ADMIN_API_BASE`, `TOKEN_KEY`    |

### 5.2 Component Pattern

- **Functional components only** (arrow function hoặc function declaration).
- **State**: `useState` cho local state. Không có global state manager (Redux, Zustand, Context).
- **Side effects**: `useEffect` chạy khi mount (dependency `[]`).
- **UI Framework**: Dùng **Ant Design** components (`Table`, `Form`, `Modal`, `Card`, `Button`, `Space`, `Tag`, `Alert`, `Upload`, `DatePicker`, `Select`, `Dropdown`, `Popconfirm`, `Tooltip`, `Input`, `Typography`, `Layout`, `Menu`).
- **Styling**: Inline `style={{}}` cho layout nhanh + CSS file riêng trong `src/styles/` cho phần phức tạp (table row highlighting, hover effects).

### 5.3 Service Pattern

- Mỗi service file export **named functions** (không default export).
- Hàm service là **async functions** gọi `axios.get/post/patch/delete`.
- Trả về `response.data` (đã unwrap).
- Base URL khai báo bằng `const` ở đầu file.
- Error handling: một số hàm `try/catch` rồi `throw new Error(...)`, một số để component tự catch.

### 5.4 Modal / Form Pattern

- Modal dùng cho Create + Edit (cùng 1 component, truyền prop `student` / `semester`).
- Nếu prop entity là `null` → chế độ **Create**; nếu có giá trị → chế độ **Edit**.
- Modal footer custom: Delete (left, có `Popconfirm`) + Cancel/Save (right).
- Dùng `Form.useForm()` + `form.validateFields()` trước khi submit.

### 5.5 List Page Pattern

- Mỗi trang list có: **Title**, **Action buttons** (Add, Refresh), **Search input**, **Table**, **Modal**.
- Data fetch: `useEffect(() => fetchData(), [])`.
- Client-side search filter qua `Array.filter()`.
- Table pagination: `{ pageSize: 10 }` hoặc `{ pageSize: 8 }`.

---

## 6. Important Rules & Gotchas

### ⚠️ Axios Interceptor là global
- `LecturerService.js` đăng ký `axios.interceptors.request.use(...)` ở **top-level module scope**.
- Vì chỉ import 1 Axios instance global, interceptor này **ảnh hưởng tất cả requests** trong app (kể cả login).
- Nếu thêm service mới, **KHÔNG cần** đăng ký interceptor lại.

### ⚠️ Không có Route Protection
- Chưa có `ProtectedRoute` component. User có thể truy cập `/admin/*` hay `/lecturer/*` trực tiếp mà không bị chặn.
- Cần xây thêm nếu muốn bảo mật frontend.

### ⚠️ Roles lưu ở localStorage
- Role check (`isAdmin()`, `isLecturer()`) dựa vào localStorage → có thể bị bypass phía client.
- Bảo mật thật sự phải ở backend (token validation).

### ⚠️ Không có test
- Project **chưa có unit test hay integration test** nào.
- Không có testing framework nào được cài (không jest, vitest, react-testing-library).

### ⚠️ dayjs dependency ẩn
- `SemesterForm.jsx` import `dayjs` nhưng nó **không có trong package.json** — nó là peer dependency của `antd`.

---

## 7. Build & Run Commands

```bash
# Cài dependencies
npm install

# Chạy dev server (mặc định http://localhost:5173)
npm run dev

# Build production
npm run build

# Preview bản build
npm run preview

# Lint toàn bộ project
npm run lint
```

### Yêu cầu Backend
- Backend Spring Boot chạy tại `http://localhost:8080`.
- Phải start backend trước khi test chức năng (login, CRUD).

---

## 8. Hướng dẫn cho Agent khi sửa code

1. **Thêm trang mới**:
   - Tạo component trong `src/component/`.
   - Tạo service function trong `src/service/` (hoặc file mới).
   - Thêm `<Route>` vào `App.jsx` trong đúng layout block (`/admin` hoặc `/lecturer`).
   - Nếu cần menu item → sửa `AdminLayout.jsx` hoặc `LecturerLayout.jsx`.

2. **Thêm API mới**:
   - Tạo/sửa file trong `src/service/`.
   - Không cần thêm interceptor — đã có global interceptor gắn token.
   - Base URL hardcode ở đầu file.

3. **Styling**:
   - Ưu tiên dùng Ant Design components và inline style.
   - CSS phức tạp (hover, row highlighting) → tạo file trong `src/styles/`.
   - Không dùng CSS Modules hay Tailwind.

4. **Form/Modal CRUD**:
   - Follow pattern `EditStudentModal.jsx` / `SemesterForm.jsx`.
   - Props: `{ open, entity, onCancel, onSuccess }`.
   - Dùng `Form.useForm()`, `form.setFieldsValue()`, `form.validateFields()`.
