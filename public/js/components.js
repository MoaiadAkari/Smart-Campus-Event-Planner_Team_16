async function loadComponent(elementId, filePath) {
  const container = document.getElementById(elementId);

  if (!container) {
    return false;
  }

  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      return false;
    }

    container.innerHTML = await response.text();
    return true;
  } catch {
    return false;
  }
}

function getCurrentUser() {
  const savedUser = sessionStorage.getItem("currentUser");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    sessionStorage.removeItem("currentUser");
    return null;
  }
}

async function synchronizeCurrentUser() {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin"
    });

    if (response.status === 401) {
      sessionStorage.removeItem("currentUser");
      sessionStorage.removeItem("currentUserId");
      return null;
    }

    if (!response.ok) {
      return getCurrentUser();
    }

    const payload = await response.json();
    sessionStorage.setItem("currentUser", JSON.stringify(payload.user));
    return payload.user;
  } catch {
    return getCurrentUser();
  }
}

function configureHeader(currentUser) {
  const eventsLink = document.getElementById("events-link");
  const dashboardLink = document.getElementById("dashboard-link");
  const profileItem = document.getElementById("profile-item");
  const profileLink = document.getElementById("profile-link");
  const logoutLink = document.getElementById("logout-link");

  if (!eventsLink || !dashboardLink || !profileItem || !profileLink || !logoutLink) {
    return;
  }

  profileItem.hidden = true;

  if (!currentUser) {
    eventsLink.textContent = "Events";
    eventsLink.href = "events.html";
    dashboardLink.href = "login.html";
    logoutLink.textContent = "Log In";
    logoutLink.href = "login.html";
    highlightCurrentPage();
    return;
  }

  if (currentUser.role === "student") {
    eventsLink.textContent = "Events";
    eventsLink.href = "events.html";
    dashboardLink.href = "student-dashboard.html";
    profileItem.hidden = false;
    profileLink.href = "student-profile.html";
  } else if (currentUser.role === "admin" || currentUser.role === "organizer") {
    eventsLink.textContent = "Manage Events";
    eventsLink.href = "manage-events.html";
    dashboardLink.href = "admin-dashboard.html";
  } else {
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return;
  }

  logoutLink.textContent = "Log Out";
  logoutLink.href = "login.html";
  logoutLink.addEventListener("click", handleLogout);
  highlightCurrentPage();
}

async function handleLogout(event) {
  event.preventDefault();

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });
  } finally {
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("currentUserId");
    window.location.href = "login.html";
  }
}

function highlightCurrentPage() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav-links a").forEach(link => {
    const linkPage = link.getAttribute("href").split("?")[0];
    link.classList.toggle("active", linkPage === currentPage);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const headerLoaded = await loadComponent("header-container", "components/header.html");
  const currentUser = await synchronizeCurrentUser();

  if (headerLoaded) {
    configureHeader(currentUser);
  }

  await loadComponent("footer-container", "components/footer.html");
});
