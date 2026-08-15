document.addEventListener("DOMContentLoaded", async function () {
  const eventId = Number(new URLSearchParams(window.location.search).get("id"));
  const detailsCard = document.getElementById("event-details-card");
  const notFound = document.getElementById("event-not-found");

  if (!Number.isInteger(eventId) || eventId < 1) {
    detailsCard.hidden = true;
    notFound.hidden = false;
    return;
  }

  try {
    const response = await fetch(`/api/events/${eventId}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Event not found.");
    }

    const event = payload.event;
    document.title = `${event.title} | Smart Campus Event Planner`;
    document.getElementById("event-category").textContent = event.category;
    document.getElementById("event-title").textContent = event.title;
    document.getElementById("event-organizer").textContent =
      `Organized by ${event.organizerName || "Smart Campus"}`;
    document.getElementById("event-date").textContent = formatDetailsDate(event.eventDate);
    document.getElementById("event-time").textContent =
      `${formatDetailsTime(event.startTime)} – ${formatDetailsTime(event.endTime)}`;
    document.getElementById("event-location").textContent = event.location;
    document.getElementById("event-capacity").textContent =
      `${event.registeredCount}/${event.capacity} registered · ${event.seatsRemaining} seats remaining`;
    document.getElementById("event-description").textContent =
      event.description || "No description available.";

    const statusBadge = document.getElementById("event-status");
    statusBadge.textContent = event.status;
    statusBadge.classList.add(`status-${String(event.status).toLowerCase()}`);
    await configureRegistrationButton(event);
  } catch {
    detailsCard.hidden = true;
    notFound.hidden = false;
  }
});

async function configureRegistrationButton(event) {
  const button = document.getElementById("register-button");
  const helpText = document.getElementById("registration-help");
  const message = document.getElementById("registration-message");
  const currentUser = await synchronizeCurrentUser();

  if (!["Open"].includes(event.status)) {
    button.disabled = true;
    button.textContent = event.status === "Full" ? "Event Full" : "Registration Closed";
    helpText.textContent = "Registration is not currently available.";
    return;
  }

  if (!currentUser) {
    button.textContent = "Log In to Register";
    button.addEventListener("click", () => {
      window.location.href = "login.html";
    });
    return;
  }

  if (currentUser.role !== "student") {
    button.disabled = true;
    button.textContent = "Students Only";
    helpText.textContent = "Only student accounts can register for events.";
    return;
  }

  try {
    const response = await fetch("/api/registrations", { credentials: "same-origin" });
    const payload = await response.json();
    const existing = (payload.registrations || []).find(registration =>
      registration.eventId === event.eventId && registration.status !== "Cancelled"
    );

    if (existing) {
      button.disabled = true;
      button.textContent = existing.status === "Registered" ? "Registered" : existing.status;
      message.textContent = "You already have a registration record for this event.";
      return;
    }
  } catch {
    message.textContent = "Unable to check your registration status.";
  }

  button.addEventListener("click", async function () {
    button.disabled = true;
    message.textContent = "Processing registration...";

    try {
      const response = await fetch(`/api/events/${event.eventId}/registrations`, {
        method: "POST",
        credentials: "same-origin"
      });
      const payload = await response.json();

      if (!response.ok) {
        button.disabled = false;
        message.textContent = payload.message || "Registration could not be completed.";
        return;
      }

      button.textContent = "Registered";
      message.textContent = payload.message;
      document.getElementById("event-capacity").textContent =
        `${payload.event.registeredCount}/${payload.event.capacity} registered · `
        + `${payload.event.seatsRemaining} seats remaining`;
    } catch {
      button.disabled = false;
      message.textContent = "Registration could not be completed.";
    }
  });
}

function formatDetailsDate(dateString) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatDetailsTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
