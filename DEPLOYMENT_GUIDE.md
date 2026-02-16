# Todo App – VPS Deployment Guide

Deploy Todo app lên VPS (cùng VPS với app khác, chạy port **3000**).

## Prerequisites

- VPS Ubuntu (22.04/24.04 LTS)
- Docker + Docker Compose đã cài trên VPS
- MongoDB Atlas: dùng **cùng cluster** với app khác, database tên `todo-app` (trong connection string: `.../todo-app`)
- GitHub repo: push code Todo app vào repo riêng

## Step 1: Chuẩn bị VPS

Trên VPS:

```bash
# Tạo thư mục
sudo mkdir -p /var/www/todo-app
cd /var/www/todo-app

# Clone repo (thay bằng URL repo của bạn)
git clone git@github.com:<your-username>/todo-app.git .
# hoặc nếu repo nằm trong monorepo, copy todo-app vào đây
```

## Step 2: Cấu hình env

```bash
cp .env.example .env
nano .env
```

Điền:

- `MONGODB_URI`: connection string Atlas, **đổi tên database cuối cùng thành `todo-app`** (ví dụ `...@cluster.xxx.mongodb.net/todo-app`)
- `JWT_SECRET`: chuỗi bí mật bất kỳ (dùng cho httpOnly cookie)
- `FRONTEND_URL`: production URL (ví dụ `http://<VPS_IP>:3000` hoặc `https://todo.yourdomain.com` nếu có subdomain)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`: bot Telegram (admin dùng `/register`, `/remove`, `/list`)
- `TELEGRAM_WEBHOOK_DOMAIN`: (tuỳ chọn) nếu dùng webhook, ví dụ `https://todo.yourdomain.com`

Lưu file.

## Step 3: Mở port 3000

```bash
# Nếu dùng ufw
sudo ufw allow 3000
sudo ufw reload
```

## Step 4: Deploy bằng Docker (sau khi CI đã build & push image)

Sau khi GitHub Actions build và push image lên GHCR:

Trên VPS (một lần, set biến image):

```bash
cd /var/www/todo-app

# Thay <your-github-username> bằng username GitHub của repo
export IMAGE=ghcr.io/<your-github-username>/todo-app:latest

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Hoặc thêm vào `.env` trên VPS:

```
IMAGE=ghcr.io/<your-github-username>/todo-app:latest
```

Rồi chạy:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Step 5: Deploy thủ công (build tại VPS, không dùng CI)

Nếu chưa dùng CI, build và chạy trực tiếp trên VPS:

```bash
cd /var/www/todo-app
docker compose -f docker-compose.prod.yml up -d --build
```

(Khi đó không cần set `IMAGE`; compose sẽ build từ Dockerfile.)

## Kiểm tra

```bash
curl http://localhost:3000/api/health
```

Từ máy ngoài: `http://<VPS_IP>:3000`

## GitHub Actions (CI/CD)

Repo cần cấu hình Secrets:

- `VPS_HOST`: IP VPS
- `VPS_USER`: user SSH (ví dụ `root`)
- `VPS_SSH_KEY`: private key SSH
- `TELEGRAM_BOT_TOKEN`: token bot Telegram (để gửi thông báo deploy)
- `TELEGRAM_CHAT_ID`: chat ID nhận thông báo

Push lên nhánh `master` sẽ chạy: test & typecheck → build Docker image → push GHCR → SSH vào VPS, pull và `docker compose up -d` → gửi Telegram.

Lần đầu deploy: đảm bảo trên VPS đã có `/var/www/todo-app` với file `docker-compose.prod.yml` và `.env` (clone repo hoặc copy tay). Workflow chỉ chạy `cd /var/www/todo-app` rồi pull & up.

## Lệnh thường dùng

| Lệnh | Mô tả |
|------|--------|
| `docker compose -f docker-compose.prod.yml logs -f` | Xem logs |
| `docker compose -f docker-compose.prod.yml restart` | Restart |
| `docker compose -f docker-compose.prod.yml down` | Dừng |
| `docker compose -f docker-compose.prod.yml ps` | Trạng thái |

## Tạo user (không có đăng ký trên web)

User được tạo qua Telegram bot (chỉ admin):

- Trong Telegram: gửi `/register <username> <password>` (username 3–30 ký tự, password ≥ 6).
- Sau đó user đăng nhập trên web bằng username/password.
