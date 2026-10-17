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