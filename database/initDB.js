const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./database');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

db.exec(schema);

const userColumns = new Set(
  db.prepare('PRAGMA table_info(users)').all().map(column => column.name)
);

if (!userColumns.has('security_question')) {
  db.exec('ALTER TABLE users ADD COLUMN security_question TEXT');
}

if (!userColumns.has('security_answer_hash')) {
  db.exec('ALTER TABLE users ADD COLUMN security_answer_hash TEXT');
}

if (!userColumns.has('created_at')) {
  db.exec('ALTER TABLE users ADD COLUMN created_at DATETIME');
}

db.exec(`
  UPDATE users
     SET created_at = CURRENT_TIMESTAMP
   WHERE created_at IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase
  ON users(email COLLATE NOCASE);
`);

const defaultUsers = [
  {
    fullName: 'Sam Student',
    email: 'student@demo.com',
    password: 'student123',
    role: 'student',
    securityQuestion: 'What city were you born in?',
    securityAnswer: 'Montreal'
  },
  {
    fullName: 'Alex Admin',
    email: 'admin@demo.com',
    password: 'admin1234',
    role: 'admin',
    securityQuestion: 'What was the name of your first school?',
    securityAnswer: 'Concordia'
  }
];

const findUser = db.prepare('SELECT user_id FROM users WHERE email = ? COLLATE NOCASE');
const insertUser = db.prepare(`
  INSERT INTO users
    (full_name, email, password_hash, role, security_question, security_answer_hash, created_at)
  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

for (const user of defaultUsers) {
  if (!findUser.get(user.email)) {
    insertUser.run(
      user.fullName,
      user.email,
      bcrypt.hashSync(user.password, 12),
      user.role,
      user.securityQuestion,
      bcrypt.hashSync(user.securityAnswer.toLowerCase(), 12)
    );
  }
}

/*
  Demo events and registrations.

  Only inserted when the events table is empty, so running this script
  again never duplicates data or overwrites anyone's work.
*/

function dateFromToday(numberOfDays) {
  const date = new Date();
  date.setDate(date.getDate() + numberOfDays);
  return date.toISOString().split('T')[0];
}

const eventCount = db.prepare('SELECT COUNT(*) AS total FROM events').get();

if (eventCount.total === 0) {
  const adminRow = db
    .prepare("SELECT user_id FROM users WHERE email = 'admin@demo.com' COLLATE NOCASE")
    .get();

  if (adminRow) {
    const extraStudents = [
      { fullName: 'Maya Chen', email: 'maya.chen@demo.com' },
      { fullName: 'Omar Haddad', email: 'omar.haddad@demo.com' },
      { fullName: 'Julia Tremblay', email: 'julia.tremblay@demo.com' },
      { fullName: 'Daniel Roy', email: 'daniel.roy@demo.com' }
    ];

    for (const student of extraStudents) {
      if (!findUser.get(student.email)) {
        insertUser.run(
          student.fullName,
          student.email,
          bcrypt.hashSync('student123', 12),
          'student',
          'What city were you born in?',
          bcrypt.hashSync('montreal', 12)
        );
      }
    }

    const insertEvent = db.prepare(`
      INSERT INTO events
        (title, description, category, event_date, start_time, end_time,
         location, capacity, event_status, organizer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const demoEvents = [
      ['Resume and Interview Workshop',
       'Learn how to improve your resume and prepare for interviews.',
       'Career', dateFromToday(7), '13:00', '15:00',
       'Hall Building, Room H-535', 40, 'Open'],
      ['Introduction to Web Development',
       'A beginner-friendly workshop about HTML, CSS, and JavaScript.',
       'Academic', dateFromToday(10), '10:00', '12:00',
       'EV Building, Room EV-2.260', 35, 'Open'],
      ['Campus Networking Evening',
       'Meet students, alumni, and campus organization representatives.',
       'Networking', dateFromToday(-10), '17:00', '19:00',
       'John Molson Building', 100, 'Completed'],
      ['Student Club Fair',
       'Discover student clubs and learn how to become involved on campus.',
       'Club Activity', dateFromToday(4), '12:00', '16:00',
       'Hall Building Atrium', 150, 'Open'],
      ['Community Volunteering Day',
       'Volunteer with other students to support a local community project.',
       'Volunteering', dateFromToday(14), '09:00', '14:00',
       'Concordia Greenhouse', 4, 'Full']
    ];

    for (const event of demoEvents) {
      insertEvent.run(...event, adminRow.user_id);
    }

    /*
      A few registrations so the dashboard has attendance and capacity
      figures to display straight away.
    */
    const students = db
      .prepare("SELECT user_id, email FROM users WHERE role = 'student' ORDER BY user_id")
      .all();

    const events = db
      .prepare('SELECT event_id, title FROM events ORDER BY event_id')
      .all();

    const insertRegistration = db.prepare(`
      INSERT OR IGNORE INTO registrations
        (user_id, event_id, registration_date, registration_status)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
    `);

    const findEvent = title => events.find(row => row.title === title);
    const findStudent = email => students.find(row => row.email === email);

    const demoRegistrations = [
      ['student@demo.com', 'Resume and Interview Workshop', 'Registered'],
      ['maya.chen@demo.com', 'Resume and Interview Workshop', 'Registered'],
      ['omar.haddad@demo.com', 'Resume and Interview Workshop', 'Cancelled'],

      ['student@demo.com', 'Introduction to Web Development', 'Registered'],
      ['julia.tremblay@demo.com', 'Introduction to Web Development', 'Registered'],

      // A completed event, so attendance can be demonstrated
      ['student@demo.com', 'Campus Networking Evening', 'Attended'],
      ['maya.chen@demo.com', 'Campus Networking Evening', 'Attended'],
      ['julia.tremblay@demo.com', 'Campus Networking Evening', 'Missed'],
      ['daniel.roy@demo.com', 'Campus Networking Evening', 'Registered'],

      // Fills the 4-seat event exactly, so it shows 100% capacity
      ['maya.chen@demo.com', 'Community Volunteering Day', 'Registered'],
      ['omar.haddad@demo.com', 'Community Volunteering Day', 'Registered'],
      ['daniel.roy@demo.com', 'Community Volunteering Day', 'Registered'],
      ['julia.tremblay@demo.com', 'Community Volunteering Day', 'Registered']
    ];

    for (const [email, title, status] of demoRegistrations) {
      const student = findStudent(email);
      const event = findEvent(title);

      if (student && event) {
        insertRegistration.run(student.user_id, event.event_id, status);
      }
    }

    console.log('Demo events and registrations seeded.');
  }
}

console.log('Database initialized successfully.');
