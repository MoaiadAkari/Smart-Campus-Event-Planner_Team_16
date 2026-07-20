/* ============================================================
   auth.js — frontend validation for login & register pages
   SOEN 287 · Deliverable 1 (data is hard-coded; no backend yet)
   ============================================================ */

// ---- Hard-coded demo accounts (replaced by the database in Deliverable 2) ----
const DEMO_USERS = [
  { fullName: "Sam Student", email: "student@demo.com", password: "student123", role: "student" },
  { fullName: "Alex Admin",  email: "admin@demo.com",   password: "admin1234",  role: "admin" }
];

const MIN_PASSWORD_LENGTH = 8;

// Simple email pattern: something@something.something
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- small helpers ---------- */

// Show an error under a field and mark it red
function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(fieldId + "-error");
  if (field) field.classList.toggle("invalid", Boolean(message));
  if (errorEl) errorEl.textContent = message || "";
}

// Show a banner above the form ("error" or "success")
function showBanner(message, type) {
  const banner = document.getElementById("form-banner");
  if (!banner) return;
  banner.textContent = message;
  banner.className = "form-banner " + type;
}

function clearBanner() {
  const banner = document.getElementById("form-banner");
  if (banner) banner.className = "form-banner";
}

/* ---------- login page ---------- */

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault(); // stop the browser from submitting — we validate first
    clearBanner();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    let valid = true;

    // Required + format checks
    if (!email) {
      setFieldError("email", "Email is required.");
      valid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setFieldError("email", "Please enter a valid email address.");
      valid = false;
    } else {
      setFieldError("email", "");
    }

    if (!password) {
      setFieldError("password", "Password is required.");
      valid = false;
    } else {
      setFieldError("password", "");
    }

    if (!valid) return;

    // Check against hard-coded users (Deliverable 2: replaced by a server check)
    const user = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      showBanner("Invalid email or password. Try student@demo.com / student123.", "error");
      return;
    }

    // Remember who is logged in for the other pages
    sessionStorage.setItem("currentUser", JSON.stringify({
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }));

    // Send students and admins to their own dashboards
    window.location.href =
      user.role === "admin" ? "admin-dashboard.html" : "student-dashboard.html";
  });
}

/* ---------- register page ---------- */

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();
    clearBanner();

    const fullName = document.getElementById("full-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const role = document.getElementById("role").value;
    let valid = true;

    if (!fullName) {
      setFieldError("full-name", "Full name is required.");
      valid = false;
    } else {
      setFieldError("full-name", "");
    }

    if (!email) {
      setFieldError("email", "Email is required.");
      valid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setFieldError("email", "Please enter a valid email address.");
      valid = false;
    } else if (DEMO_USERS.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      // Duplicate-email prevention (spec §7.1)
      setFieldError("email", "An account with this email already exists.");
      valid = false;
    } else {
      setFieldError("email", "");
    }

    if (!password) {
      setFieldError("password", "Password is required.");
      valid = false;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError("password", `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      valid = false;
    } else {
      setFieldError("password", "");
    }

    if (!confirmPassword) {
      setFieldError("confirm-password", "Please confirm your password.");
      valid = false;
    } else if (confirmPassword !== password) {
      setFieldError("confirm-password", "Passwords do not match.");
      valid = false;
    } else {
      setFieldError("confirm-password", "");
    }

    if (!role) {
      setFieldError("role", "Please select a role.");
      valid = false;
    } else {
      setFieldError("role", "");
    }

    if (!valid) return;

    // Deliverable 1: no database, so we just simulate success.
    // Deliverable 2: POST this data to the Node.js backend instead.
    showBanner("Account created! Redirecting to login…", "success");
    setTimeout(() => (window.location.href = "login.html"), 1500);
  });
}
