Chrysalis Hydroponics Centre of Excellence
A web platform for managing the Chrysalis Hydroponics Centre of Excellence, including user access, faculty approvals, attendance, inventory, projects, notices, reports, and audit logging.
Features
- Role-based access: Super Admin, Admin, Faculty, and Member roles.
- Account registration and approvals: Member registration and faculty approval workflow.
- User management: Disable and re-enable eligible accounts, or permanently delete eligible accounts.
- Role-based permissions: Super Admin can manage Admin, Faculty, and Member accounts. Admin can manage Faculty and Member accounts, but cannot manage Super Admin accounts.
- Audit logging: Record important administrative and account-management actions.
- Centre operations: Designed to support attendance, inventory, projects, notices, reports, and website content management.
- Statistics: Dashboard statistics are calculated from application data.
Availability of individual modules depends on the current implementation in the repository. Connect a development database and test database-dependent workflows before relying on them.

Technology Stack
- Next.js
- React
- Express.js
- TypeScript
- MongoDB
- Mongoose
- npm
Requirements
- Node.js (use a version compatible with the project's package.json and lockfile)
- npm
- A MongoDB database for database-backed features
Project Setup
1. Clone the repository
Replace <repository-url> with your GitHub repository URL.
git clone <repository-url>
cd hydroponics-centre-website-development
2. Install dependencies
Install dependencies in the project root:
npm install
If the backend has a separate package.json and its dependencies are not installed by the root setup, install them separately:
cd server
npm install
cd ..
Follow the repository's existing scripts and package-lock files if the project uses a different workspace arrangement.
3. Configure environment variables
Create local environment files from the example files provided by the repository. For example, on Windows PowerShell:
Copy-Item .env.example .env
If the backend has a separate example file, create its local environment file too:
Copy-Item server/.env.example server/.env
Only run a copy command for an example file that actually exists. Open the example file(s) and fill in the required local values.
Security
- Never commit .env, .env.local, production environment files, database credentials, session secrets, or API keys.
- Commit example files with placeholder values only.
- Use a separate development database for testing.
- Do not use real accounts for destructive-operation tests.
4. Start the development servers
From the project root, use the scripts defined in package.json:
npm run dev
If the root script does not start both the frontend and backend, open two terminals and run the relevant dev script in each project directory. Check the actual package.json files for the exact available commands.
The previously configured local development URLs are:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
These URLs apply only if the local configuration still uses those ports.
Authentication and Account Management
The application supports these roles:
Role	Account-management permissions
Super Admin	Manage Admin, Faculty, and Member accounts
Admin	Manage Faculty and Member accounts; cannot manage Super Admin accounts
Faculty	No account-management permissions
Member	No account-management permissions


<<<<<<< HEAD
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
npm install
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
=======
Eligible accounts may be disabled, re-enabled, or permanently deleted, subject to backend authorization and safety checks.
- Disable: Keeps the user document in MongoDB and blocks access while disabled.
- Enable: Restores an eligible disabled account.
- Delete permanently: Removes the user document from MongoDB. This action is irreversible.
- The currently logged-in account is excluded from its own User Management list.
- Self-management and last-active-Super-Admin safeguards should remain enforced on the backend.
- Audit history and unrelated attendance, project, inventory, and research records should be preserved.
Tests and Build
Run the scripts available in the root package.json. The following commands were reported to pass in a prior implementation check, but should be rerun after pulling or changing code:
npm test
npm exec -- tsc --noEmit
npm run build
If a command is not defined in the current project setup, inspect package.json and use the configured equivalent.
Database-dependent behavior requires a working development MongoDB connection and suitable test accounts. Do not treat database workflows as verified merely because TypeScript checks or a production build pass.
Security Notes
- Keep real environment files out of Git.
- Use strong, unique session secrets in local and production environments.
- Restrict MongoDB network access and use a database user with only the required permissions.
- Use HTTPS in production.
- Verify that disabled and deleted users cannot continue using existing sessions.
- Test role permissions with disposable accounts before production use.
- Back up production data and test recovery procedures before deployment.
Development Guidelines
- Preserve the existing project structure and authentication flow.
- Make incremental changes rather than rebuilding unrelated modules.
- Do not commit secrets, local database dumps, or production data.
- Verify tests and database-backed operations before describing them as working.
Status
This README describes the intended project structure and workflows. Check the current source code, package.json scripts, and environment example files for the definitive setup details.
>>>>>>> 17d62b3 (Add project README)
