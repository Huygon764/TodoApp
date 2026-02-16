---
name: Todo app same VPS
overview: "App todo repo riêng, cùng VPS port 3000: Node + MongoDB + React + Tailwind; auth JWT httpOnly, đăng ký qua Telegram bot; list theo ngày + default template; React Query + route constants; UI nhiều animation; CI/CD theo mẫu shooting-star."
todos: []
isProject: false
---

# Plan: Todo app (repo riêng, cùng VPS) – React + Node + MongoDB

## Tổng quan

- **Repo:** **Riêng** (không nằm trong Shooting-star-diary). Lý do: frontend khác stack (React vs Vue), CI/CD và image độc lập, deploy path khác (/var/www/todo-app, port 3000), tránh coupling. Cấu trúc repo: `todo-backend/`, `todo-frontend/`, Dockerfile (multi-stage), `docker-compose.prod.yml`, `.github/workflows/deploy.yml`.
- **Deploy:** Cùng VPS, app todo chạy port **3000** (ví dụ `http://<VPS_IP>:3000`).
- **DB:** Cùng MongoDB Atlas cluster, database mới (ví dụ `todo-app`).

---

## 1. Backend (Node.js + Express + MongoDB)

**Cấu trúc tham khảo app hiện tại:** `config/`, `models/`, `routes/`, `controllers/`, `middleware/`, `utils/`, `services/`.

**Models:**

- **User:** `username`, `password` (hash bcrypt), `displayName`, `isActive`, `lastLogin`, `createdAt`. **Không có API register trên web** – user được tạo qua Telegram bot (xem mục Telegram).
- **DefaultItem:** template todo. `userId`, `title`, `order`, `createdAt`. Một user một list default.
- **DayTodo:** list theo ngày. `userId`, `date` (YYYY-MM-DD, unique với userId), `items`: array of `{ title, completed, order }`, `createdAt`, `updatedAt`.

**Auth:**

- JWT lưu trong **httpOnly cookie** (không trả token trong body, không dùng localStorage).
  - **Login:** POST /api/auth/login (username + password) → validate → tạo JWT → set cookie `token` httpOnly, secure (production), sameSite (Lax hoặc Strict).
  - Các API cần auth: middleware đọc token từ cookie, verify JWT.
  - **Logout:** POST /api/auth/logout → set cookie maxAge=0 (xóa cookie).

**Đăng ký / quản lý user qua Telegram Bot (giống [telegramBot.ts](backend/src/services/telegramBot.ts) của shooting-star):**

- Dùng Telegraf, webhook hoặc polling. Chỉ **admin** (chatId trùng `TELEGRAM_CHAT_ID`) được dùng lệnh.
- **Lệnh:**
  - `/start`, `/help`: Hướng dẫn.
  - `/register <username> <password>`: Tạo user mới (validate username 3–30 ký tự, chỉ a-zA-Z0-9_; password >= 6). Nếu đã tồn tại username → báo lỗi.
  - `/remove <username>`: Xóa user (soft delete hoặc hard tùy bạn).
  - `/list`: Liệt kê users (username, lastLogin…).
- Khi có webhook: mount route `/webhook/telegram` trước body parser (giống shooting-star server.ts). Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_DOMAIN` (nếu dùng webhook).

**API (không có register):**


| Method | Path             | Auth | Mô tả                                                            |
| ------ | ---------------- | ---- | ---------------------------------------------------------------- |
| POST   | /api/auth/login  | No   | Đăng nhập (set httpOnly cookie)                                  |
| POST   | /api/auth/logout | Yes  | Xóa cookie                                                       |
| GET    | /api/auth/me     | Yes  | Trả về user hiện tại                                             |
| GET    | /api/days/:date  | Yes  | List todo ngày `date`; nếu chưa có thì tạo từ default rồi trả về |
| PATCH  | /api/days/:date  | Yes  | Cập nhật items ngày (reorder, toggle completed, add, delete)     |
| GET    | /api/default     | Yes  | List default (template)                                          |
| POST   | /api/default     | Yes  | Thêm item vào default                                            |
| PATCH  | /api/default/:id | Yes  | Sửa/xóa item default                                             |


**Logic “copy default sang ngày”:** GET /api/days/:date: nếu chưa có `DayTodo` cho `userId + date` → tạo mới bằng cách copy toàn bộ DefaultItem của user sang items (completed: false), lưu rồi trả về.

Backend: CORS cho origin frontend, `credentials: true`.

---

## 2. Frontend (React + Tailwind)

**Công cụ:** Vite + React, Tailwind CSS, React Router, **React Query (TanStack Query)**. **Routes:** dùng **CONSTANT** (file constants, ví dụ `ROUTES.LOGIN`, `ROUTES.HOME`), không hardcode string path trong component.

**Auth:**

- Chỉ có **Login** trên web (không có form Register). Register qua Telegram.
- Login → backend set httpOnly cookie; mọi request sau dùng `credentials: 'include'`.
- Route bảo vệ: gọi GET /api/auth/me; 401 → redirect về trang login (dùng constant route).
- Logout: gọi POST /api/auth/logout rồi redirect login.

**Trang / UI:**

- **Login:** Một trang duy nhất (username + password). Có thể thêm dòng chữ “Đăng ký tài khoản qua Telegram” + link hoặc @bot.
- **Trang chính (sau khi đăng nhập):**
  - **Mặc định hiển thị ngày hôm nay.** Có thể chọn ngày bằng **date picker** và nút **Prev / Next** (qua ngày trước/sau).
  - List todo của ngày đang chọn: thêm vào ngày này / thêm vào list mặc định; mỗi item: checkbox, title, xóa (và có thể sửa title).
  - Section “List mặc định”: xem/sửa/xóa items default (template copy sang ngày mới).

**Animation / UI “hoa mĩ”:**

- Dùng thư viện animation (ví dụ **Framer Motion**): transition khi chuyển trang, list item xuất hiện (stagger), hover/click feedback, loading states. Mục tiêu: nhiều animation, giao diện đẹp mắt, không “cứng”.
- Có thể thêm: skeleton loading, toast khi thao tác thành công/lỗi, micro-interaction trên checkbox và nút.

**Chức năng todo thông thường:** Thêm, xóa, đánh dấu hoàn thành, (tuỳ chọn) sửa title, đổi thứ tự.

---

## 3. Docker & Deploy (cùng VPS, port 3000)

- **Một service “todo-app”:** Express vừa serve API vừa serve static build React (multi-stage Dockerfile: build frontend → copy vào image Node chạy server).
- **Compose:** `docker-compose.prod.yml` (trong repo todo): build context root repo, map `3000:3000`, env_file (MONGODB_URI với db `todo-app`, JWT_SECRET, Telegram env…).
- **VPS:** Clone repo todo vào ví dụ `/var/www/todo-app`, mở port 3000 (`ufw allow 3000`), chạy `docker compose -f docker-compose.prod.yml up -d`. Truy cập `http://<VPS_IP>:3000`.

---

## 4. CI/CD (theo [deploy.yml](.github/workflows/deploy.yml) của repo hiện tại)

- **Trigger:** Push `master` (hoặc `main`) và workflow_dispatch.
- **Job 1 – Test & Lint:** Checkout, setup Node (ví dụ 22), cache yarn. Install deps `todo-backend` và `todo-frontend`, chạy typecheck cho cả hai (yarn typecheck hoặc tsc --noEmit).
- **Job 2 – Build & Push:** Sau test, login GHCR, build **một** image todo-app (Dockerfile ở root hoặc path chỉ định), tag type=sha + latest, push lên ghcr.io (ví dụ `ghcr.io/<owner>/todo-app`).
- **Job 3 – Deploy:** SSH vào VPS (secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY), cd `/var/www/todo-app`, docker login, pull image mới, `docker compose -f docker-compose.prod.yml up -d`, prune, health check (ví dụ `curl -f http://localhost:3000/api/health`).
- **Job 4 – Notify:** Thành công / thất bại gửi Telegram (dùng TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID), nội dung tương tự shooting-star (repo name, branch, actor, link commit hoặc link Actions).

Repo todo cần secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (có thể dùng chung với bot diary hoặc bot riêng).

---

## 5. Thứ tự làm (gợi ý)

1. **Repo:** Tạo repo mới, cấu trúc `todo-backend/`, `todo-frontend/`.
2. **Backend:** Config, env, mongoose, models User/DefaultItem/DayTodo, Telegram bot (register/remove/list), auth middleware (JWT từ cookie), routes auth (login, logout, me) + days + default, logic copy default sang ngày.
3. **Frontend:** Vite + React + Tailwind + React Query, file constants routes (và API paths nếu muốn), chỉ màn login, route bảo vệ, trang chính (default hôm nay, date picker + prev/next), list ngày + list default, Framer Motion (và animation) cho đẹp.
4. **Docker:** Dockerfile multi-stage, docker-compose.prod.yml, .env.example; DEPLOYMENT_GUIDE (hoặc README) cho VPS port 3000.
5. **CI/CD:** .github/workflows/deploy.yml theo 4 bước trên, cấu hình secrets.

---

## 6. Lưu ý

- **Cookie dev:** CORS + sameSite cho localhost (frontend và backend khác port) để cookie gửi đúng.
- **Security:** Production cookie `secure: true`; khi có domain có thể bật HTTPS (subdomain).
- **Route constants:** Ví dụ `src/constants/routes.ts`: `export const ROUTES = { LOGIN: '/login', HOME: '/' } as const;` và dùng `ROUTES.LOGIN` trong Router, Link, redirect.

