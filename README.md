# Smart-Campus-Event-Planner_Team_16
A full-stack Smart Campus Event Planner developed for SOEN 287, allowing students to discover and register for campus events while organizers manage events, attendance, capacity, and participation statistics.

## Setup

1. Install Node.js 22 or newer.
2. Run `npm install` in the project folder.
3. Run `npm start` to initialize the SQLite database and start the server.
4. Open `http://127.0.0.1:3000`.

Use `npm run dev` for automatic server restarts during development.

## Demo accounts

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

## Testing

- Run `npm test` for the isolated authentication and authorization suite.
- Run `npm run test:integration` for the real SQLite integration flow.

The work plan: https://docs.google.com/spreadsheets/d/1iGbghXb6hh-XUMfnkQxp64GOOs0mxYgm-KnBJFTFt34/edit?usp=sharing
