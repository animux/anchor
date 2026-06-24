# SSP Server (Express + MongoDB)

REST API backend for SSP authentication and data storage.

## Requirements

- Node.js 20+
- MongoDB instance

## Setup

1. Copy `.env.example` to `.env`.
2. Set values:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - optional: `PORT`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`
3. Install deps:

```bash
npm install
```

4. Run in development:

```bash
npm run dev
```

5. Run in production mode:

```bash
npm start
```

## API

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/students`
- `GET /api/students/groups`
- `POST /api/students/upsert`
- `POST /api/students/complete`
- `GET /api/submissions/modules`
- `POST /api/submissions/modules`
- `DELETE /api/submissions/modules/:moduleId`
- `GET /api/submissions/students`
- `GET /api/submissions/summary`
- `PUT /api/submissions/students/:studentId/modules/:moduleId`
