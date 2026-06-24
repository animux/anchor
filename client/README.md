# SSP Client (Next.js)

This app is the frontend for SSP and now uses the Express + MongoDB API server in `../server`.

## Environment

Set these values in `.env.local`:

```bash
API_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_API_SERVER_URL=http://localhost:4000
```

## Run

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

## Notes

- Authentication is handled with HTTP-only cookies set by Next.js server actions.
- Dashboard data calls use internal Next API routes and are forwarded to the backend REST API.
