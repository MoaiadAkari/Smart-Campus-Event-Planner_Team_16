let registrations = [];
let activeFilter = "all";

document.addEventListener("DOMContentLoaded", async function () {
  const requestedFilter = new URLSearchParams(window.location.search).get("filter");

  if (["all", "upcoming", "past"].includes(requestedFilter)) {
    activeFilter = requestedFilter;
  }

  const user = await synchronizeCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (user.role !== "student") {
    window.location.href = "admin-dashboard.html";
    return;
  }

  document.querySelectorAll(".filter-button").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === activeFilter);
    button.addEventListener("click", function () {
      activeFilter = button.dataset.filter;
      document.querySelectorAll(".filter-button").forEach(item => {
        item.classList.toggle("active", item === button);
      });
      renderRegistrations();
    });
  });

  document.getElementById("registrations-grid").addEventListener("click", async function (event) {
    const button = event.target.closest(".cancel-registration-btn");

    if (!button) {
      return;
    }

    const registration = registrations.find(item =>
      item.registrationId === Number(button.dataset.registrationId)
    );

    if (!registration || !window.confirm(`Cancel your registration for "${registration.eventTitle}"?`)) {
      return;
    }

    button.disabled = true;
    const response = await fetch(`/api/registrations/${registration.registrationId}/cancel`, {
      method: "PATCH",
      credentials: "same-origin"
    });
    const payload = await response.json();

    if (!response.ok) {
      button.disabled = false;
      window.alert(payload.message || "Unable to cancel this registration.");
      return;
    }

    await loadRegistrations();
  });

  await loadRegistrations();
});

async function loadRegistrations() {
  const response = await fetch("/api/registrations", { credentials: "same-origin" });

  if (response.status === 401 || response.status === 403) {
    window.location.href = "login.html";
    return;
  }

  const payload = await response.json();

  if (!response.ok) {
    document.getElementById("registrations-summary").textContent =
      payload.message || "Unable to load registrations.";
    return;
  }

  registrations = payload.registrations || [];
  renderRegistrations();
}

function isPastRegistration(registration) {
  return new Date(`${registration.eventDate}T${registration.eventStartTime}:00`) < new Date();
}

function getRegistrationState(registration) {
  if (registration.status === "Cancelled") {
    return { label: "Cancelled", css: "status-cancelled", past: false };
  }

  if (registration.status === "Attended") {
    return { label: "Attended", css: "status-completed", past: true };
  }

  if (registration.status === "Missed") {
    return { label: "Missed", css: "status-completed", past: true };
  }

  if (registration.eventStatus === "Cancelled") {
    return { label: "Event Cancelled", css: "status-cancelled", past: false };
  }

  if (registration.eventStatus === "Completed" || isPastRegistration(registration)) {
    return { label: "Completed", css: "status-completed", past: true };
  }

  return { label: "Registered", css: "status-open", past: false };
}

function renderRegistrations() {
  const grid = document.getElementById("registrations-grid");
  const emptyState = document.getElementById("registrations-empty");
  const summary = document.getElementById("registrations-summary");
  const rows = registrations.map(registration => ({
    registration,
    state: getRegistrationState(registration)
  }));
  const upcomingCount = rows.filter(row =>
    !row.state.past && row.registration.status === "Registered"
  ).length;

  summary.textContent = rows.length === 0
    ? "Your registered campus events appear here."
    : `You have ${rows.length} registration${rows.length === 1 ? "" : "s"}, ${upcomingCount} upcoming.`;

  const visibleRows = rows.filter(row => {
    if (activeFilter === "upcoming") {
      return !row.state.past && row.registration.status === "Registered";
    }

    if (activeFilter === "past") {
      return row.state.past;
    }

    return true;
  });

  grid.innerHTML = visibleRows.map(createRegistrationCard).join("");
  emptyState.hidden = visibleRows.length > 0;
}

function createRegistrationCard(row) {
  const registration = row.registration;
  const canCancel = registration.status === "Registered"
    && !row.state.past
    && !["Cancelled", "Disabled", "Completed"].includes(registration.eventStatus);

  return `
    <article class="event-card registration-card">
      <div class="event-card-heading">
        <p class="event-category">${escapeRegistrationText(registration.eventCategory)}</p>
        <span class="event-status-badge ${row.state.css}">${row.state.label}</span>
      </div>
      <h2>${escapeRegistrationText(registration.eventTitle)}</h2>
      <p>${formatRegistrationDate(registration.eventDate)} · ${formatRegistrationTime(registration.eventStartTime)}</p>
      <p>${escapeRegistrationText(registration.eventLocation)}</p>
      <p class="registered-on">Registered on ${formatRegistrationDate(registration.registrationDate)}</p>
      <div class="registration-card-actions">
        <a href="event-details.html?id=${registration.eventId}" class="event-card-link">View Details</a>
        ${canCancel ? `
          <button type="button" class="cancel-registration-btn"
                  data-registration-id="${registration.registrationId}">
            Cancel Registration
          </button>
        ` : ""}
      </div>
    </article>
  `;
}

function formatRegistrationDate(dateString) {
  if (!dateString) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${String(dateString).slice(0, 10)}T00:00:00`));
}

function formatRegistrationTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function escapeRegistrationText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
