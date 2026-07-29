/* ============================================================
   auth.js — frontend validation for login & register pages
   SOEN 287 · Deliverable 1 (data is hard-coded; no backend yet)
   ============================================================ */

// ---- Hard-coded demo accounts (replaced by the database in Deliverable 2) ----
// -+-+-++-+-+-+-+-+-+-+-+-+-+-+- this part was removed by moaiad and replaced with the new users.js file +-+-+-+-+-+-+-+-+-+-+-+--++-+-+-+

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
  if (!banner) return;
  banner.textContent = "";
  banner.className = "form-banner";
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
    const user = USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      showBanner("Invalid email or password. Try student@demo.com / student123.", "error");
      return;
    }

    // Remember who is logged in for the other pages
    sessionStorage.setItem("currentUser", JSON.stringify({
      id: user.id,
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
    } else if (USERS.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
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

/* ---------- forgot password page ---------- */

const forgotPasswordForm = document.getElementById("forgot-password-form");
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", function (event) {
    event.preventDefault();
    clearBanner();

    const emailField = document.getElementById("email");
    const submitButton = document.getElementById("forgot-submit");
    const demoResetLink = document.getElementById("demo-reset-link");
    const email = emailField.value.trim();

    if (!email) {
      setFieldError("email", "Email is required.");
      emailField.focus();
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setFieldError("email", "Please enter a valid email address.");
      emailField.focus();
      return;
    }

    setFieldError("email", "");

    // Deliverable 1 only simulates sending the reset email.
    // The generic message avoids revealing whether an account exists.
    showBanner(
      "If an account exists for this email, password reset instructions have been sent.",
      "success"
    );

    submitButton.disabled = true;
    submitButton.textContent = "Instructions Sent";
    demoResetLink.hidden = false;
    demoResetLink.focus();
  });
}

/* ---------- reset password page ---------- */

const resetPasswordForm = document.getElementById("reset-password-form");
if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", function (event) {
    event.preventDefault();
    clearBanner();

    const passwordField = document.getElementById("new-password");
    const confirmPasswordField = document.getElementById("confirm-password");
    const submitButton = document.getElementById("reset-submit");
    const password = passwordField.value;
    const confirmPassword = confirmPasswordField.value;
    let valid = true;

    if (!password) {
      setFieldError("new-password", "New password is required.");
      valid = false;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(
        "new-password",
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      valid = false;
    } else {
      setFieldError("new-password", "");
    }

    if (!confirmPassword) {
      setFieldError("confirm-password", "Please confirm your new password.");
      valid = false;
    } else if (confirmPassword !== password) {
      setFieldError("confirm-password", "Passwords do not match.");
      valid = false;
    } else {
      setFieldError("confirm-password", "");
    }

    if (!valid) return;

    // Deliverable 1 only simulates a successful password update.
    // Deliverable 2 will validate a reset token and update the password server-side.
    showBanner("Password updated! Redirecting to login…", "success");

    submitButton.disabled = true;
    submitButton.textContent = "Password Updated";
    passwordField.disabled = true;
    confirmPasswordField.disabled = true;

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  });
}
