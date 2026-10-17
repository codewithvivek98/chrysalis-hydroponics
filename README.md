# Hydroponics Centre of Excellence

Public-facing website and MERN foundation for Chrysalis' Hydroponics Centre of Excellence.

## Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Node.js, Express 5, TypeScript via `tsx`
- Database: MongoDB through Mongoose
- API: JSON REST endpoints under `/api`

## Structure

```text
app/                 Existing public Next.js website
components/          Shared UI components
lib/api.ts           Public frontend API configuration
server/src/
  config/             Environment and MongoDB connection modules
  app.ts              Express middleware and routes
  server.ts           HTTP server and graceful shutdown
.env.example         Frontend public API configuration example
server/.env.example  Backend configuration example
```

## Prerequisites

- Node.js 20 or newer
- pnpm 12 or compatible
- MongoDB locally, or a MongoDB Atlas connection string for database health checks

Install dependencies with:

```bash
pnpm install
```

## Configuration

Copy `.env.example` to `.env.local` for the frontend if the API is not on its default URL. The only browser-visible setting is:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Copy `server/.env.example` to `server/.env` and configure:

```bash
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/hydroponics_coe
CLIENT_ORIGIN=http://localhost:3000
```

`MONGODB_URI` is server-only and is never imported by the frontend. For Atlas, replace it with the connection string from the Atlas Connect dialog and keep credentials out of Git.

For the development seed command, use a separate local/test database whose database name is one of `hydroponics_coe_dev`, `hydroponics_coe_test`, `development`, or `test`. Never use a production, live, or shared database for test users.

## Development test accounts

The explicit `pnpm seed:dev-users` command creates four idempotent, active accounts in the configured development database. It refuses to run with `NODE_ENV=production`, without `MONGODB_URI`, or against an unrecognised/production-looking database name. Existing accounts are left unchanged, including their passwords.

```bash
# server/.env (local only)
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/hydroponics_coe_dev

pnpm seed:dev-users
```

Development-only credentials:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin.test@example.com` | `DevOnly-SuperAdmin-2026!x7` |
| Admin | `admin.test@example.com` | `DevOnly-Admin-2026!q8` |
| Faculty | `faculty.test@example.com` | `DevOnly-Faculty-2026!r9` |
| Member | `member.test@example.com` | `DevOnly-Member-2026!s0` |

Sign in at `/login`, then sign out before switching accounts. Super Admin should be used to verify audit-log access; Admin should verify admin-only features; Faculty and Member should be checked against their existing policy. To remove these accounts from a local test database, delete documents by these four normalized emails in the `users` collection; do not run deletion commands against production.

## Development

Run both applications together:

```bash
pnpm dev
```

Or run them separately:

```bash
pnpm dev:frontend  # http://localhost:3000
pnpm dev:server    # http://localhost:4000
```

The existing public site remains at `http://localhost:3000`. The backend exposes:

- `GET http://localhost:4000/api/health`
- `GET http://localhost:4000/api/health/db`

The database endpoint returns HTTP 200 only when Mongoose is connected, and HTTP 503 when MongoDB is not configured or unavailable.

## Troubleshooting

- **Port already in use:** change `PORT` in `server/.env`, then update `NEXT_PUBLIC_API_BASE_URL` if needed.
- **MongoDB unavailable:** start the local MongoDB service or verify the Atlas URI, network access list, and database user. The API can still start without a database in development.
- **CORS error:** set `CLIENT_ORIGIN` to the exact frontend origin, including its port.
- **Missing environment values:** ensure the files are named `.env.local` for the frontend and `.env` inside `server/` for the backend.

This step intentionally does not implement authentication, role portals, attendance, inventory, projects, content management, or audit logging.
