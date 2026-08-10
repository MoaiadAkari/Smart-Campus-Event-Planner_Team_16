const bcrypt = require("bcrypt");
const User = require("../models/User");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const SECURITY_QUESTIONS = new Set([
  "What city were you born in?",
  "What was the name of your first school?"
]);

function getDatabase(req) {
  const db = req.app.locals.db;

  if (!db) {
    const error = new Error("The database connection is not available.");
    error.status = 503;
    throw error;
  }

  return db;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateRegistration(body) {
  const fields = {};
  const fullName = String(body.fullName || "").trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");
  const securityQuestion = String(body.securityQuestion || "");
  const securityAnswer = String(body.securityAnswer || "").trim();

  if (fullName.length < 2) {
    fields.fullName = "Please enter your full name.";
  }

  if (!EMAIL_REGEX.test(email)) {
    fields.email = "Please enter a valid email address.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    fields.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password !== confirmPassword) {
    fields.confirmPassword = "Passwords do not match.";
  }

  if (!SECURITY_QUESTIONS.has(securityQuestion)) {
    fields.securityQuestion = "Please select a valid security question.";
  }

  if (securityAnswer.length < 2) {
    fields.securityAnswer = "Please enter your security answer.";
  }

  return {
    fields,
    values: { fullName, email, password, securityQuestion, securityAnswer }
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => error ? reject(error) : resolve());
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save(error => error ? reject(error) : resolve());
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy(error => error ? reject(error) : resolve());
  });
}

async function register(req, res) {
  const db = getDatabase(req);
  const validation = validateRegistration(req.body);

  if (Object.keys(validation.fields).length > 0) {
    return res.status(400).json({
      message: "Please correct the highlighted fields.",
      fields: validation.fields
    });
  }

  const { fullName, email, password, securityQuestion, securityAnswer } = validation.values;

  if (await User.emailExists(db, email)) {
    return res.status(409).json({
      message: "An account with this email already exists.",
      fields: { email: "An account with this email already exists." }
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const securityAnswerHash = await bcrypt.hash(securityAnswer.toLowerCase(), 12);

  try {
    const user = await User.create(db, {
      fullName,
      email,
      passwordHash,
      role: "student",
      securityQuestion,
      securityAnswerHash
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user
    });
  } catch (error) {
    if (String(error.code || "").includes("CONSTRAINT")) {
      return res.status(409).json({
        message: "An account with this email already exists.",
        fields: { email: "An account with this email already exists." }
      });
    }

    throw error;
  }
}

async function login(req, res) {
  const db = getDatabase(req);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const fields = {};

  if (!EMAIL_REGEX.test(email)) {
    fields.email = "Please enter a valid email address.";
  }

  if (!password) {
    fields.password = "Password is required.";
  }

  if (Object.keys(fields).length > 0) {
    return res.status(400).json({
      message: "Please correct the highlighted fields.",
      fields
    });
  }

  const account = await User.findByEmail(db, email);
  const passwordMatches = account
    ? await bcrypt.compare(password, account.password_hash)
    : false;

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const user = User.mapUser(account);
  await regenerateSession(req);
  req.session.user = user;
  await saveSession(req);

  return res.json({ message: "Login successful.", user });
}

async function logout(req, res) {
  if (req.session) {
    await destroySession(req);
  }

  res.clearCookie("smartCampus.sid");
  return res.status(204).end();
}

function getSession(req, res) {
  if (!req.session?.user) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({ authenticated: true, user: req.session.user });
}

async function getProfile(req, res) {
  const user = await User.findById(getDatabase(req), req.session.user.id);

  if (!user) {
    return res.status(404).json({ message: "Account not found." });
  }

  return res.json({ user });
}

async function updateProfile(req, res) {
  const db = getDatabase(req);
  const fullName = String(req.body.fullName || "").trim();
  const email = normalizeEmail(req.body.email);
  const fields = {};

  if (fullName.length < 2) {
    fields.fullName = "Please enter your full name.";
  }

  if (!EMAIL_REGEX.test(email)) {
    fields.email = "Please enter a valid email address.";
  } else if (await User.emailExists(db, email, req.session.user.id)) {
    fields.email = "Another account already uses this email address.";
  }

  if (Object.keys(fields).length > 0) {
    return res.status(400).json({
      message: "Please correct the highlighted fields.",
      fields
    });
  }

  const user = await User.updateProfile(db, req.session.user.id, { fullName, email });
  req.session.user = user;
  await saveSession(req);

  return res.json({ message: "Profile updated successfully.", user });
}

async function verifyRecovery(req, res) {
  const db = getDatabase(req);
  const email = normalizeEmail(req.body.email);
  const securityQuestion = String(req.body.securityQuestion || "");
  const securityAnswer = String(req.body.securityAnswer || "").trim().toLowerCase();

  if (!EMAIL_REGEX.test(email) || !SECURITY_QUESTIONS.has(securityQuestion) || !securityAnswer) {
    return res.status(400).json({ message: "The email, question, or answer is incorrect." });
  }

  const account = await User.findByEmail(db, email);
  const answerMatches = account
    && account.security_question === securityQuestion
    && account.security_answer_hash
    ? await bcrypt.compare(securityAnswer, account.security_answer_hash)
    : false;

  if (!answerMatches) {
    return res.status(400).json({ message: "The email, question, or answer is incorrect." });
  }

  req.session.passwordResetUserId = account.user_id;
  await saveSession(req);

  return res.json({ message: "Account verified." });
}

async function resetPassword(req, res) {
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");
  const fields = {};

  if (password.length < MIN_PASSWORD_LENGTH) {
    fields.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password !== confirmPassword) {
    fields.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(fields).length > 0) {
    return res.status(400).json({
      message: "Please correct the highlighted fields.",
      fields
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await User.updatePassword(
    getDatabase(req),
    req.session.passwordResetUserId,
    passwordHash
  );

  if (!updated) {
    return res.status(404).json({ message: "Account not found." });
  }

  delete req.session.passwordResetUserId;
  await saveSession(req);

  return res.json({ message: "Password updated successfully." });
}

module.exports = {
  register,
  login,
  logout,
  getSession,
  getProfile,
  updateProfile,
  verifyRecovery,
  resetPassword
};
