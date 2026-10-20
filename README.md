# Inquiry Manager

A small web app for staff to record customer inquiries, find them later, and move them through a simple lifecycle (New, In Progress, Resolved).

**Stack:** React (Vite) · Node.js + Express · PostgreSQL

## Prerequisites

- Node.js 20 or newer
- PostgreSQL 13 or newer (uses `gen_random_uuid()`)

## Setup

### 1. Create the database

```
psql -U postgres -c "CREATE DATABASE inquiry_app;"
```

### 2. Backend

```
cd backend
npm install
```

Create `backend/.env` (see `backend/.env.example`):

```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/inquiry_app
JWT_SECRET=any-long-random-string
PORT=4000
```

If your password contains special characters (`@`, `#`, `/`), URL-encode them (`@` becomes `%40`).

Then create the tables, add the test accounts, and start the API:

```
npm run migrate
npm run seed
npm run dev
```

The API runs on http://localhost:4000.

### 3. Frontend (in a second terminal)

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` requests to the backend.

## Test accounts

All use the password `Password123!`

| Email | Role | Can see |
|---|---|---|
| staff1@example.com | staff | Only their own inquiries |
| staff2@example.com | staff | Only their own inquiries |
| admin@example.com | admin | All inquiries |

## Running the tests

```
cd backend && npm test
cd frontend && npm test
```

Backend tests use the real database from `.env` (run `npm run migrate` and `npm run seed` first). They create rows named `TEST_...` and delete them afterwards.

## API overview

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/login | Sign in (sets an httpOnly cookie) |
| POST | /api/auth/logout | Sign out |
| GET | /api/auth/me | Current user |
| GET | /api/inquiries?q=&status= | List (search and filter) |
| POST | /api/inquiries | Create |
| GET | /api/inquiries/:id | Detail, history, allowed next statuses |
| PATCH | /api/inquiries/:id/status | Change status (needs current `version`) |

Errors always return JSON: `{ "error": "message" }`, plus `fields` for validation errors and `code` for status conflicts.

## Project structure

```
backend/   migrations/  src/{db,middleware,routes,services}  tests/
frontend/  src/{api,components,hooks,pages}
DECISIONS.md   design choices and trade-offs
```