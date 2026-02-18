# Todo App

A daily todo list app with default list, recurring templates, week/month/year goals, self-reviews, and AI-powered review analysis. Includes calendar date picker, progress tracking, and i18n (EN/VI).

<img width="843" height="800" alt="image" src="https://github.com/user-attachments/assets/7d702f52-460e-4800-8e63-decb9c177b43" />

## Features

- **Day todo** – Daily list with default items; items from recurring templates auto-merge on Monday and on the 1st of the month.
- **Default list** – Template items copied into each new day when you first open it.
- **Recurring templates** – Week/month templates whose items are merged into the day todo on week start (Monday) and month start.
- **Goals** – Week, month, and year goals with period-based CRUD and optional templates.
- **Reviews** – Week/month self-reviews with history; filter by period or month range.
- **AI analysis** – Gemini integration to analyze review content (optional; requires `GEMINI_API_KEY`).
- **Calendar** – Popover date picker for quick navigation.
- **i18n** – English and Vietnamese.

## Tech Stack

- **Backend:** Node.js 22, Express, TypeScript, MongoDB, JWT (httpOnly cookie)
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS 4, Framer Motion, React Query, i18next

## Prerequisites

- Node.js 22+
- Yarn
- MongoDB (Atlas or local)

## Quick Start

### 1. Clone repository

```bash
git clone git@github.com:Huygon764/TodoApp.git
cd TodoApp
```

### 2. Install dependencies

```bash
# Backend
cd todo-backend
yarn install

# Frontend
cd ../todo-frontend
yarn install
```

### 3. Setup environment variables

**Backend** (`todo-backend/.env`). See `todo-backend/.env.example` for a full list.

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/todo-app
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=30d
FRONTEND_URL=http://localhost:5173
BCRYPT_ROUNDS=12

# Optional: Telegram bot (admin /register, /remove, /list)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_WEBHOOK_DOMAIN=

# Optional: Gemini AI for review analysis
GEMINI_API_KEY=
```

### 4. Run development servers

```bash
# Terminal 1 - Backend
cd todo-backend
yarn dev

# Terminal 2 - Frontend
cd todo-frontend
yarn dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:5173