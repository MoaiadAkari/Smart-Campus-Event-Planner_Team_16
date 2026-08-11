const PROFILE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let originalProfile = null;

document.addEventListener("DOMContentLoaded", initializeProfile);

async function profileRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || "The request could not be completed.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function initializeProfile() {
  const form = document.getElementById("profile-form");
  const cancelButton = document.getElementById("cancel-profile-changes");

  try {
    const payload = await profileRequest("/api/profile");
    originalProfile = payload.user;
    displayProfile(payload.user);
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "login.html";
      return;
    }

    if (error.status === 403) {
      window.location.href = "admin-dashboard.html";
      return;
    }

    showProfileMessage(error.message, "error");
  }

  form.addEventListener("submit", saveProfile);
  cancelButton.addEventListener("click", cancelProfileChanges);
}

function displayProfile(user) {
  document.getElementById("profile-full-name").value = user.fullName || "";
  document.getElementById("profile-email").value = user.email || "";
  document.getElementById("profile-role").value = capitalizeRole(user.role);
}

async function saveProfile(event) {
  event.preventDefault();
  clearProfileErrors();
  showProfileMessage("");

  const fullName = document.getElementById("profile-full-name").value.trim();
  const email = document.getElementById("profile-email").value.trim().toLowerCase();
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  let valid = true;

  if (fullName.length < 2) {
    setProfileFieldError("profile-full-name", "Please enter your full name.");
    valid = false;
  }

  if (!PROFILE_EMAIL_REGEX.test(email)) {
    setProfileFieldError("profile-email", "Please enter a valid email address.");
    valid = false;
  }

  if (!valid) {
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Saving...";

  try {
    const payload = await profileRequest("/api/profile", {
      method: "PUT",
      body: JSON.stringify({ fullName, email })
    });

    originalProfile = payload.user;
    sessionStorage.setItem("currentUser", JSON.stringify(payload.user));
    displayProfile(payload.user);
    showProfileMessage(payload.message, "success");
  } catch (error) {
    const fields = error.payload?.fields || {};

    if (fields.fullName) {
      setProfileFieldError("profile-full-name", fields.fullName);
    }

    if (fields.email) {
      setProfileFieldError("profile-email", fields.email);
    }

    showProfileMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Save Changes";
  }
}

function cancelProfileChanges() {
  if (originalProfile) {
    displayProfile(originalProfile);
  }

  clearProfileErrors();
  showProfileMessage("");
}

function setProfileFieldError(fieldId, message) {
  document.getElementById(fieldId)?.classList.add("invalid");
  const errorElement = document.getElementById(`${fieldId}-error`);

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearProfileErrors() {
  document.querySelectorAll("#profile-form .invalid").forEach(field => {
    field.classList.remove("invalid");
  });
  document.querySelectorAll("#profile-form .field-error").forEach(errorElement => {
    errorElement.textContent = "";
  });
}

function showProfileMessage(message, type = "") {
  const messageElement = document.getElementById("profile-message");
  messageElement.textContent = message;
  messageElement.className = type ? `profile-message profile-message-${type}` : "profile-message";
}

function capitalizeRole(role) {
  return role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : "";
}
