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

    const passwordOverrides = JSON.parse(
      localStorage.getItem("passwordOverrides") || "{}"
    );

    const user = USERS.find((candidate) => {
      const savedPassword = passwordOverrides[candidate.id] || candidate.password;
      return (
        candidate.email.toLowerCase() === email.toLowerCase() &&
        savedPassword === password
      );
    });

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

const forgotPasswordForm = document.getElementById("forgot-password-form");
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", function (event) {
    event.preventDefault();
    clearBanner();

    const email = document.getElementById("email").value.trim();
    const securityQuestion = document.getElementById("security-question").value;
    const securityAnswer = document.getElementById("security-answer").value.trim();
    let valid = true;

    if (!email) {
      setFieldError("email", "Email is required.");
      valid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setFieldError("email", "Please enter a valid email address.");
      valid = false;
    } else {
      setFieldError("email", "");
    }

    if (!securityQuestion) {
      setFieldError("security-question", "Please select your security question.");
      valid = false;
    } else {
      setFieldError("security-question", "");
    }

    if (!securityAnswer) {
      setFieldError("security-answer", "Security answer is required.");
      valid = false;
    } else {
      setFieldError("security-answer", "");
    }

    if (!valid) return;

    const user = USERS.find(
      candidate =>
        candidate.email.toLowerCase() === email.toLowerCase() &&
        candidate.securityQuestion === securityQuestion &&
        candidate.securityAnswer.toLowerCase() === securityAnswer.toLowerCase()
    );

    if (!user) {
      showBanner("The email, question, or answer is incorrect.", "error");
      return;
    }

    sessionStorage.setItem("passwordResetUserId", String(user.id));
    showBanner("Account verified. Opening the password form…", "success");
    setTimeout(() => {
      window.location.href = "reset-password.html";
    }, 800);
  });
}

const resetPasswordForm = document.getElementById("reset-password-form");
if (resetPasswordForm) {
  const passwordResetUserId = sessionStorage.getItem("passwordResetUserId");

  if (!passwordResetUserId) {
    window.location.href = "forgot-password.html";
  }

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

    const passwordOverrides = JSON.parse(
      localStorage.getItem("passwordOverrides") || "{}"
    );

    passwordOverrides[passwordResetUserId] = password;
    localStorage.setItem("passwordOverrides", JSON.stringify(passwordOverrides));

    showBanner("Password updated! Redirecting to login…", "success");

    submitButton.disabled = true;
    submitButton.textContent = "Password Updated";
    passwordField.disabled = true;
    confirmPasswordField.disabled = true;
    sessionStorage.removeItem("passwordResetUserId");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  });
}
