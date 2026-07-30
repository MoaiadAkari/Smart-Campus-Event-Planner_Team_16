document.addEventListener("DOMContentLoaded", function () {
  const eventId = new URLSearchParams(window.location.search).get("id");
  const event = getStoredEventById(eventId);
  const detailsCard = document.getElementById("event-details-card");
  const notFound = document.getElementById("event-not-found");

  if (!event) {
    detailsCard.hidden = true;
    notFound.hidden = false;
    return;
  }

  document.title = `${event.title} | Smart Campus Event Planner`;
  document.getElementById("event-category").textContent = event.category;
  document.getElementById("event-title").textContent = event.title;
  document.getElementById("event-organizer").textContent = "Organized by Smart Campus";
  document.getElementById("event-date").textContent = formatDetailsDate(event.eventDate);
  document.getElementById("event-time").textContent =
    `${formatDetailsTime(event.startTime)} – ${formatDetailsTime(event.endTime)}`;
  document.getElementById("event-location").textContent = event.location;
  document.getElementById("event-capacity").textContent = `${event.capacity} seats`;
  document.getElementById("event-description").textContent = event.description;

  const statusBadge = document.getElementById("event-status");
  statusBadge.textContent = event.status;
  statusBadge.classList.add(`status-${event.status.toLowerCase()}`);

  configureRegistrationButton(event);
});

function configureRegistrationButton(event) {
  const button = document.getElementById("register-button");
  const helpText = document.getElementById("registration-help");
  const message = document.getElementById("registration-message");
  const savedUser = sessionStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;

  if (event.status !== "Open") {
    button.disabled = true;
    button.textContent = event.status === "Full" ? "Event Full" : "Registration Closed";
    helpText.textContent = "Registration is not currently available.";
    return;
  }

  if (!currentUser || currentUser.role !== "student") {
    button.textContent = "Log In to Register";
    button.addEventListener("click", function () {
      window.location.href = "login.html";
    });
    return;
  }

  const registrations = getSavedStudentRegistrations();
  const alreadyRegistered = registrations.some(
    registration =>
      registration.userId === currentUser.id &&
      registration.eventId === event.eventId
  );

  if (alreadyRegistered) {
    button.disabled = true;
    button.textContent = "Registered";
    message.textContent = "You are registered for this event.";
    return;
  }

  button.addEventListener("click", function () {
    registrations.push({
      userId: currentUser.id,
      eventId: event.eventId,
      registeredOn: new Date().toISOString().split("T")[0]
    });
    localStorage.setItem("studentEventRegistrations", JSON.stringify(registrations));
    button.disabled = true;
    button.textContent = "Registered";
    message.textContent = "Registration completed successfully.";
  });
}

function getSavedStudentRegistrations() {
  try {
    return JSON.parse(localStorage.getItem("studentEventRegistrations") || "[]");
  } catch {
    localStorage.setItem("studentEventRegistrations", "[]");
    return [];
  }
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
