const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}-error`);

  field?.classList.toggle("invalid", Boolean(message));

  if (errorElement) {
    errorElement.textContent = message || "";
  }
}

function showBanner(message, type = "") {
  const banner = document.getElementById("form-banner");

  if (!banner) {
    return;
  }

  banner.textContent = message;
  banner.className = type ? `form-banner ${type}` : "form-banner";
}

function clearBanner() {
  showBanner("");
}

function setButtonLoading(button, loading, loadingText) {
  if (!button) {
    return;
  }

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : {};

  if (!response.ok) {
    const error = new Error(payload.message || "The request could not be completed.");
    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  return payload;
}

function showServerErrors(error, fieldMap = {}) {
  const fields = error.payload?.fields || {};

  Object.entries(fields).forEach(([name, message]) => {
    setFieldError(fieldMap[name] || name, message);
  });

  showBanner(error.message || "The request could not be completed.", "error");
}

const loginForm = document.getElementById("login-form");

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearBanner();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitButton = loginForm.querySelector('button[type="submit"]');
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

    if (!password) {
      setFieldError("password", "Password is required.");
      valid = false;
    } else {
      setFieldError("password", "");
    }

    if (!valid) {
      return;
    }

    setButtonLoading(submitButton, true, "Logging In...");

    try {
      const payload = await requestJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      sessionStorage.setItem("currentUser", JSON.stringify(payload.user));
      window.location.href = payload.user.role === "admin" || payload.user.role === "organizer"
        ? "admin-dashboard.html"
        : "student-dashboard.html";
    } catch (error) {
      showServerErrors(error);
      setButtonLoading(submitButton, false);
    }
  });
}

const registerForm = document.getElementById("register-form");

if (registerForm) {
  registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearBanner();

    const fullName = document.getElementById("full-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const securityQuestion = document.getElementById("security-question").value;
    const securityAnswer = document.getElementById("security-answer").value.trim();
    const submitButton = registerForm.querySelector('button[type="submit"]');
    let valid = true;

    if (fullName.length < 2) {
      setFieldError("full-name", "Please enter your full name.");
      valid = false;
    } else {
      setFieldError("full-name", "");
    }

    if (!EMAIL_REGEX.test(email)) {
      setFieldError("email", "Please enter a valid email address.");
      valid = false;
    } else {
      setFieldError("email", "");
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError("password", `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      valid = false;
    } else {
      setFieldError("password", "");
    }

    if (confirmPassword !== password) {
      setFieldError("confirm-password", "Passwords do not match.");
      valid = false;
    } else {
      setFieldError("confirm-password", "");
    }

    if (!securityQuestion) {
      setFieldError("security-question", "Please select a security question.");
      valid = false;
    } else {
      setFieldError("security-question", "");
    }

    if (securityAnswer.length < 2) {
      setFieldError("security-answer", "Please enter your security answer.");
      valid = false;
    } else {
      setFieldError("security-answer", "");
    }

    if (!valid) {
      return;
    }

    setButtonLoading(submitButton, true, "Creating Account...");

    try {
      await requestJson("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email,
          password,
          confirmPassword,
          securityQuestion,
          securityAnswer
        })
      });

      showBanner("Account created! Redirecting to login...", "success");
      registerForm.reset();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    } catch (error) {
      showServerErrors(error, {
        fullName: "full-name",
        confirmPassword: "confirm-password",
        securityQuestion: "security-question",
        securityAnswer: "security-answer"
      });
      setButtonLoading(submitButton, false);
    }
  });
}

const forgotPasswordForm = document.getElementById("forgot-password-form");

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearBanner();

    const email = document.getElementById("email").value.trim();
    const securityQuestion = document.getElementById("security-question").value;
    const securityAnswer = document.getElementById("security-answer").value.trim();
    const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
    let valid = true;

    if (!EMAIL_REGEX.test(email)) {
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

    if (!valid) {
      return;
    }

    setButtonLoading(submitButton, true, "Verifying...");

    try {
      await requestJson("/api/auth/recovery/verify", {
        method: "POST",
        body: JSON.stringify({ email, securityQuestion, securityAnswer })
      });

      showBanner("Account verified. Opening the password form...", "success");
      setTimeout(() => {
        window.location.href = "reset-password.html";
      }, 700);
    } catch (error) {
      showServerErrors(error);
      setButtonLoading(submitButton, false);
    }
  });
}

const resetPasswordForm = document.getElementById("reset-password-form");

if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearBanner();

    const passwordField = document.getElementById("new-password");
    const confirmPasswordField = document.getElementById("confirm-password");
    const submitButton = document.getElementById("reset-submit");
    const password = passwordField.value;
    const confirmPassword = confirmPasswordField.value;
    let valid = true;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError("new-password", `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      valid = false;
    } else {
      setFieldError("new-password", "");
    }

    if (confirmPassword !== password) {
      setFieldError("confirm-password", "Passwords do not match.");
      valid = false;
    } else {
      setFieldError("confirm-password", "");
    }

    if (!valid) {
      return;
    }

    setButtonLoading(submitButton, true, "Updating Password...");

    try {
      await requestJson("/api/auth/recovery/reset", {
        method: "POST",
        body: JSON.stringify({ password, confirmPassword })
      });

      showBanner("Password updated! Redirecting to login...", "success");
      passwordField.disabled = true;
      confirmPasswordField.disabled = true;
      submitButton.textContent = "Password Updated";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    } catch (error) {
      showServerErrors(error, {
        password: "new-password",
        confirmPassword: "confirm-password"
      });
      setButtonLoading(submitButton, false);
    }
  });
}
