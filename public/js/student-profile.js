"use strict";

const USER_DATABASE =
  typeof USERS !== "undefined"
    ? USERS
    : typeof users !== "undefined"
      ? users
      : typeof MOCK_USERS !== "undefined"
        ? MOCK_USERS
        : typeof DEMO_USERS !== "undefined"
          ? DEMO_USERS
          : [];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let currentUser = null;
let originalUserInformation = null;
let currentSessionKey = null;

document.addEventListener("DOMContentLoaded", initializeProfilePage);


/* =========================================================
   INITIALIZE THE PAGE
   ========================================================= */

function initializeProfilePage() {
  currentUser = getLoggedInUser();

  if (!currentUser) {
    console.error("No logged-in user was found.");
    window.location.href = "login.html";
    return;
  }

  /*
    Prevent an admin from accessing the student profile page.
  */
  if (currentUser.role !== "student") {
    window.location.href = "admin-dashboard.html";
    return;
  }

  originalUserInformation = {
    fullName: currentUser.fullName,
    email: currentUser.email,
    role: currentUser.role
  };

  displayUserInformation(currentUser);

  const profileForm = document.getElementById("profile-form");
  const cancelButton = document.getElementById(
    "cancel-profile-changes"
  );

  profileForm.addEventListener("submit", handleProfileSubmit);
  cancelButton.addEventListener("click", cancelProfileChanges);
}


/* =========================================================
   GET USER FROM users.js
   ========================================================= */

function getLoggedInUser() {
  const storedUser = getStoredSessionUser();
  const currentUserId = sessionStorage.getItem("currentUserId");

  /*
    First try finding the user using their ID.
  */
  if (currentUserId) {
    const userById = USER_DATABASE.find(user => {
      return String(user.id) === String(currentUserId);
    });

    if (userById) {
      return userById;
    }
  }

  /*
    If no ID is available, use the email from sessionStorage.
  */
  if (storedUser?.email) {
    const userByEmail = USER_DATABASE.find(user => {
      return (
        user.email.toLowerCase() ===
        storedUser.email.toLowerCase()
      );
    });

    if (userByEmail) {
      return userByEmail;
    }
  }

  return storedUser;
}


/* =========================================================
   READ SESSION STORAGE
   ========================================================= */

function getStoredSessionUser() {
  /*
    The code checks several possible names because your login
    file may use one of these keys.
  */
  const possibleKeys = [
    "currentUser",
    "loggedInUser",
    "user"
  ];

  for (const key of possibleKeys) {
    const storedValue = sessionStorage.getItem(key);

    if (!storedValue) {
      continue;
    }

    try {
      const parsedUser = JSON.parse(storedValue);

      currentSessionKey = key;

      return parsedUser;
    } catch (error) {
      console.error(
        `The session value stored under "${key}" is invalid.`,
        error
      );
    }
  }

  return null;
}


/* =========================================================
   DISPLAY USER INFORMATION
   ========================================================= */

function displayUserInformation(user) {
  document.getElementById("profile-full-name").value =
    user.fullName || "";

  document.getElementById("profile-email").value =
    user.email || "";

  document.getElementById("profile-role").value =
    capitalizeFirstLetter(user.role || "");
}


/* =========================================================
   SAVE PROFILE CHANGES
   ========================================================= */

function handleProfileSubmit(event) {
  event.preventDefault();

  clearErrors();
  showProfileMessage("", "");

  const fullNameInput = document.getElementById(
    "profile-full-name"
  );

  const emailInput = document.getElementById(
    "profile-email"
  );

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();

  let formIsValid = true;

  if (fullName.length < 2) {
    setFieldError(
      "profile-full-name",
      "Please enter your full name."
    );

    formIsValid = false;
  }

  if (!EMAIL_REGEX.test(email)) {
    setFieldError(
      "profile-email",
      "Please enter a valid email address."
    );

    formIsValid = false;
  } else if (emailBelongsToAnotherUser(email)) {
    setFieldError(
      "profile-email",
      "Another account already uses this email address."
    );

    formIsValid = false;
  }

  if (!formIsValid) {
    return;
  }

  const updatedUser = updateMockUser({
    fullName,
    email
  });

  if (!updatedUser) {
    showProfileMessage(
      "Your profile could not be updated.",
      "error"
    );

    return;
  }

  currentUser = updatedUser;

  originalUserInformation = {
    fullName: updatedUser.fullName,
    email: updatedUser.email,
    role: updatedUser.role
  };

  updateSessionStorage(updatedUser);
  displayUserInformation(updatedUser);

  showProfileMessage(
    "Your profile was updated successfully.",
    "success"
  );
}


/* =========================================================
   TEMPORARY MOCK DATABASE UPDATE
   ========================================================= */

function updateMockUser(changes) {
  if (!currentUser) {
    return null;
  }

  /*
    This changes the user object that came from users.js.

    It does not permanently rewrite the users.js file.
    The backend database will handle permanent updates later.
  */
  currentUser.fullName = changes.fullName;
  currentUser.email = changes.email;

  return currentUser;
}


/* =========================================================
   DUPLICATE EMAIL CHECK
   ========================================================= */

function emailBelongsToAnotherUser(email) {
  return USER_DATABASE.some(user => {
    const sameEmail =
      user.email.toLowerCase() === email.toLowerCase();

    let sameUser = false;

    if (currentUser.id !== undefined && user.id !== undefined) {
      sameUser =
        String(user.id) === String(currentUser.id);
    } else {
      sameUser = user === currentUser;
    }

    return sameEmail && !sameUser;
  });
}


/* =========================================================
   UPDATE SESSION STORAGE
   ========================================================= */

function updateSessionStorage(updatedUser) {
  /*
    Keep the session synchronized so the header and other
    pages receive the updated name and email.
  */
  if (currentSessionKey) {
    sessionStorage.setItem(
      currentSessionKey,
      JSON.stringify(updatedUser)
    );
  } else {
    currentSessionKey = "currentUser";

    sessionStorage.setItem(
      currentSessionKey,
      JSON.stringify(updatedUser)
    );
  }

  if (updatedUser.id !== undefined) {
    sessionStorage.setItem(
      "currentUserId",
      updatedUser.id
    );
  }
}


/* =========================================================
   CANCEL CHANGES
   ========================================================= */

function cancelProfileChanges() {
  if (!originalUserInformation) {
    return;
  }

  document.getElementById("profile-full-name").value =
    originalUserInformation.fullName;

  document.getElementById("profile-email").value =
    originalUserInformation.email;

  document.getElementById("profile-role").value =
    capitalizeFirstLetter(originalUserInformation.role);

  clearErrors();
  showProfileMessage("", "");
}


/* =========================================================
   VALIDATION HELPERS
   ========================================================= */

function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);

  const errorElement = document.getElementById(
    `${fieldId}-error`
  );

  if (field) {
    field.classList.add("invalid");
  }

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearErrors() {
  const invalidFields = document.querySelectorAll(
    "#profile-form .invalid"
  );

  const errorElements = document.querySelectorAll(
    "#profile-form .field-error"
  );

  invalidFields.forEach(field => {
    field.classList.remove("invalid");
  });

  errorElements.forEach(errorElement => {
    errorElement.textContent = "";
  });
}


/* =========================================================
   SUCCESS AND ERROR MESSAGE
   ========================================================= */

function showProfileMessage(message, type) {
  const messageElement = document.getElementById(
    "profile-message"
  );

  messageElement.textContent = message;
  messageElement.className = "profile-message";

  if (type === "success") {
    messageElement.classList.add(
      "profile-message-success"
    );
  }

  if (type === "error") {
    messageElement.classList.add(
      "profile-message-error"
    );
  }
}


/* =========================================================
   FORMATTING HELPER
   ========================================================= */

function capitalizeFirstLetter(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}