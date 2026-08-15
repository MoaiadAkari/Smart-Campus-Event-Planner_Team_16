# Smart Campus Event Planner - Team 16

A full-stack SOEN 287 web application for discovering campus events, managing student registrations, tracking attendance, and viewing participation statistics.

## Requirements

- Node.js 22 or newer
- npm
- A modern web browser

SQLite is included through the project dependencies. No separate database server is required.

## Installation and startup

From the project folder:

```bash
npm install
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

`npm start` initializes `database/campus.db` before starting Express. The generated database is intentionally ignored by Git. To restore the original demonstration data, stop the server, delete `database/campus.db`, and run `npm start` again.

Use `npm run dev` for automatic server restarts during development.

## Demonstration accounts

### Student

- Email: `student@demo.com`
- Password: `student123`
- Security question: `What city were you born in?`
- Security answer: `Montreal`

### Admin

- Email: `admin@demo.com`
- Password: `admin1234`
- Security question: `What was the name of your first school?`
- Security answer: `Concordia`

## Implemented features

- Registration, login, logout, profile updates, and security-question password recovery
- bcrypt password and recovery-answer hashing
- Session authentication and student/admin role protection
- SQLite persistence for users, events, and registrations
- Public event browsing, details, organizer information, search, and filters
- Student registration with server-side capacity, date, status, and duplicate checks
- Personal registration list, upcoming/past filters, and ownership-protected cancellation
- Database-driven student dashboard summaries and event suggestions
- Admin event creation, editing, status management, and deletion
- Admin registration lists, attendance marking, capacity calculations, and statistics
- Responsive student and admin interfaces
- JSON 404 responses and centralized server error handling

## Testing

Run the complete automated suite:

```bash
npm test
```

Run the real SQLite authentication integration check:

```bash
npm run test:integration
```

The automated suite covers authentication, recovery, profile ownership, role access, event filters, student registration ownership, duplicate/full/past/cancelled rules, cancellation, admin event CRUD, attendance, capacity, and statistics.

## Project structure

- `views/`: HTML pages
- `public/`: shared CSS, components, and frontend JavaScript
- `routes/`: Express route definitions
- `controllers/`: validation and request logic
- `models/`: database queries and domain operations
- `middleware/`: authentication and role guards
- `database/`: schema, connection, and initializer
- `tests/`: automated and real-database integration tests
- `docs/`: installation, user, feature, and contribution documentation

## Documentation

- `docs/Installation and User Guide.pdf`
- `docs/Deliverable 2 Features.pdf`
- `docs/Team Contributions.pdf`

The team work plan is available in `docs/SOEN 287_Plan - Sheet1.pdf` and in the shared [Google Sheet](https://docs.google.com/spreadsheets/d/1iGbghXb6hh-XUMfnkQxp64GOOs0mxYgm-KnBJFTFt34/edit?usp=sharing).
