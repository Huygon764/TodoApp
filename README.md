# Todo App

A daily todo list application with default templates, progress tracking, and beautiful UI.

<img width="843" height="800" alt="image" src="https://github.com/user-attachments/assets/7d702f52-460e-4800-8e63-decb9c177b43" />

## Tech Stack

- **Backend:** Node.js 22, Express, TypeScript, MongoDB, JWT Auth
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS 4, Framer Motion, React Query

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

**Backend** (`todo-backend/.env`):

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/todo-app
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ADMIN_IDS=123456789
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

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## Available Scripts

| Directory | Command | Description |
|-----------|---------|-------------|
| `todo-backend` | `yarn dev` | Start dev server with hot reload |
| `todo-backend` | `yarn build` | Build for production |
| `todo-backend` | `yarn typecheck` | Run TypeScript check |
| `todo-frontend` | `yarn dev` | Start Vite dev server |
| `todo-frontend` | `yarn build` | Build for production |
| `todo-frontend` | `yarn typecheck` | Run TypeScript check |

## Project Structure

```
TodoApp/
├── todo-backend/       # Express API server
│   ├── src/
│   │   ├── config/     # Environment config
│   │   ├── models/     # MongoDB models
│   │   ├── routes/     # API routes
│   │   ├── controllers/
│   │   └── middleware/
│   └── package.json
├── todo-frontend/      # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── types/
│   └── package.json
├── Dockerfile
├── docker-compose.prod.yml
└── README.md
```
