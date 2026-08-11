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

console.log('Database initialized successfully.');
