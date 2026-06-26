# SSP Server (Express + MongoDB)

REST API backend for SSP authentication and data storage.

## Data Model Note

Module submission statuses are stored inside each student document in
`module_submissions`.

Each embedded item keeps:

- module identity (`module`, `module_id`, `module_name`)
- module owner (`module_owner`)
- status (`yes`, `no`, `extension`, `not_set`)
- mark metadata (`marked_by`, `marked_at`)
- audit timestamps (`created_at`, `updated_at`)

The legacy `Submission` collection is only kept temporarily for maintenance
scripts, and is not used by live API reads/writes.

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

## Legacy Cleanup

After confirming embedded `module_submissions` contains expected data for all
students, remove old documents from the legacy `Submission` collection.

1. Dry-run verification (no delete):

```bash
npm run cleanup:legacy-submissions
```

2. Delete only when checks pass:

```bash
npm run cleanup:legacy-submissions -- --apply
```

3. Optional forced delete if you intentionally want to bypass check failures:

```bash
npm run cleanup:legacy-submissions -- --apply --force
```
