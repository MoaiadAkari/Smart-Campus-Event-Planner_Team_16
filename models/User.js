function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.user_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  };
}

async function findByEmail(db, email) {
  return db.prepare(
    `SELECT user_id, full_name, email, password_hash, role, security_question,
            security_answer_hash, created_at
       FROM users
      WHERE email = ? COLLATE NOCASE`
  ).get(email);
}

async function findById(db, userId) {
  const row = db.prepare(
    `SELECT user_id, full_name, email, role, created_at
       FROM users
      WHERE user_id = ?`
  ).get(userId);

  return mapUser(row);
}

async function emailExists(db, email, excludedUserId = null) {
  const row = excludedUserId === null
    ? db.prepare(
      "SELECT user_id FROM users WHERE email = ? COLLATE NOCASE"
    ).get(email)
    : db.prepare(
      "SELECT user_id FROM users WHERE email = ? COLLATE NOCASE AND user_id <> ?"
    ).get(email, excludedUserId);

  return Boolean(row);
}

async function create(db, user) {
  const result = db.prepare(
    `INSERT INTO users
      (full_name, email, password_hash, role, security_question, security_answer_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).run(
    user.fullName,
    user.email,
    user.passwordHash,
    user.role,
    user.securityQuestion,
    user.securityAnswerHash
  );

  return findById(db, result.lastInsertRowid);
}

async function updateProfile(db, userId, profile) {
  db.prepare(
    "UPDATE users SET full_name = ?, email = ? WHERE user_id = ?"
  ).run(
    profile.fullName,
    profile.email,
    userId
  );

  return findById(db, userId);
}

async function updatePassword(db, userId, passwordHash) {
  const result = db.prepare(
    "UPDATE users SET password_hash = ? WHERE user_id = ?"
  ).run(
    passwordHash,
    userId
  );

  return result.changes > 0;
}

module.exports = {
  mapUser,
  findByEmail,
  findById,
  emailExists,
  create,
  updateProfile,
  updatePassword
};
