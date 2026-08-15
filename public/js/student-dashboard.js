let dashboardData = null;

document.addEventListener("DOMContentLoaded", async function () {
  const user = await synchronizeCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (user.role !== "student") {
    window.location.href = "admin-dashboard.html";
    return;
  }

  document.getElementById("student-greeting").textContent = `Welcome back, ${user.fullName}!`;
  document.getElementById("suggested-events-list").addEventListener("click", async function (event) {
    const button = event.target.closest('[data-action="register"]');

    if (!button) {
      return;
    }

    button.disabled = true;
    const response = await fetch(`/api/events/${button.dataset.eventId}/registrations`, {
      method: "POST",
      credentials: "same-origin"
    });
    const payload = await response.json();

    if (!response.ok) {
      button.disabled = false;
      window.alert(payload.message || "Registration could not be completed.");
      return;
    }

    await loadDashboard();
  });

  await loadDashboard();
});

async function loadDashboard() {
  const response = await fetch("/api/student/dashboard", { credentials: "same-origin" });

  if (response.status === 401 || response.status === 403) {
    window.location.href = "login.html";
    return;
  }

  const payload = await response.json();

  if (!response.ok) {
    document.getElementById("summary-cards").innerHTML =
      `<article class="summary-card"><p>${escapeDashboardText(payload.message || "Unable to load dashboard.")}</p></article>`;
    return;
  }

  dashboardData = payload;
  renderDashboard();
}

function renderDashboard() {
  const statistics = dashboardData.statistics;
  const summaryCards = [
    { title: "Total Registered Events", value: statistics.totalRegistered, icon: "🎟️" },
    { title: "Upcoming Events", value: statistics.upcoming, icon: "📅" },
    { title: "Events Attended", value: statistics.attended, icon: "✅" },
    { title: "Cancelled Registrations", value: statistics.cancelled, icon: "❌" }
  ];

  document.getElementById("summary-cards").innerHTML = summaryCards.map(card => `
    <article class="summary-card">
      <div class="summary-icon" aria-hidden="true">${card.icon}</div>
      <div class="summary-content"><p>${card.title}</p><h2 class="summary-number">${card.value}</h2></div>
    </article>
  `).join("");

  document.getElementById("participation-percentage").textContent =
    `${statistics.participationRate}%`;
  document.getElementById("participation-progress").style.width =
    `${statistics.participationRate}%`;
  document.querySelector(".progress-container").setAttribute(
    "aria-valuenow",
    statistics.participationRate
  );
  document.getElementById("participation-message").textContent =
    statistics.totalRegistered === 0
      ? "Register for an event to begin tracking your participation."
      : `You have attended ${statistics.attended} of your ${statistics.totalRegistered} registered events.`;

  const categoryBreakdown = document.getElementById("category-breakdown");
  categoryBreakdown.innerHTML = dashboardData.categoryTotals.length > 0
    ? dashboardData.categoryTotals.map(item => `
        <span class="category-item">${escapeDashboardText(item.category)} <strong>${item.count}</strong></span>
      `).join("")
    : '<span class="category-item">No category information available</span>';

  renderEventList(
    "upcoming-events-list",
    "upcoming-empty-message",
    dashboardData.upcomingEvents,
    false
  );
  renderEventList(
    "suggested-events-list",
    "suggested-empty-message",
    dashboardData.suggestedEvents,
    true
  );
}

function renderEventList(containerId, emptyId, events, suggested) {
  const container = document.getElementById(containerId);
  const empty = document.getElementById(emptyId);
  container.innerHTML = events.map(event => createDashboardEventCard(event, suggested)).join("");
  empty.classList.toggle("hidden", events.length > 0);
}

function createDashboardEventCard(event, suggested) {
  return `
    <article class="event-card">
      <div class="event-card-top">
        <span class="event-category">${escapeDashboardText(event.category)}</span>
        <span class="event-status status-${statusDashboardClass(event.status)}">
          ${escapeDashboardText(event.status)}
        </span>
      </div>
      <h3>${escapeDashboardText(event.title)}</h3>
      <div class="event-information">
        <p><span class="event-information-icon" aria-hidden="true">📅</span>
          <span>${formatDashboardDate(event.eventDate)}</span></p>
        <p><span class="event-information-icon" aria-hidden="true">🕐</span>
          <span>${formatDashboardTime(event.startTime)} – ${formatDashboardTime(event.endTime)}</span></p>
        <p><span class="event-information-icon" aria-hidden="true">📍</span>
          <span>${escapeDashboardText(event.location)}</span></p>
      </div>
      <div class="event-actions">
        <a href="event-details.html?id=${event.eventId}"
           class="dashboard-button card-secondary-button">View Details</a>
        ${suggested ? `
          <button type="button" class="dashboard-button card-primary-button"
                  data-action="register" data-event-id="${event.eventId}">
            Register
          </button>
        ` : ""}
      </div>
    </article>
  `;
}

function statusDashboardClass(status) {
  return String(status).toLowerCase().replaceAll(" ", "-");
}

function formatDashboardDate(dateString) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatDashboardTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function escapeDashboardText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
