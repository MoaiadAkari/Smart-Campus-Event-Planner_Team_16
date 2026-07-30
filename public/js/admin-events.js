const EVENT_CATEGORIES = [
  "Academic",
  "Career",
  "Club Activity",
  "Guest Lecture",
  "Networking",
  "Sports",
  "Volunteering"
];

document.addEventListener("DOMContentLoaded", function () {
  const currentUser = getAdminSession();

  if (!currentUser) {
    return;
  }

  populateCategoryOptions();

  const eventForm = document.getElementById("event-form");
  const eventsTableBody = document.getElementById("events-table-body");

  if (eventForm) {
    initializeEventForm(eventForm, currentUser);
  }

  if (eventsTableBody) {
    initializeManageEvents();
  }
});

function getAdminSession() {
  const savedUser = sessionStorage.getItem("currentUser");

  if (!savedUser) {
    window.location.href = "login.html";
    return null;
  }

  try {
    const currentUser = JSON.parse(savedUser);

    if (currentUser.role !== "admin" && currentUser.role !== "organizer") {
      window.location.href = "student-dashboard.html";
      return null;
    }

    return currentUser;
  } catch {
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return null;
  }
}

function populateCategoryOptions() {
  const categorySelect = document.getElementById("category");

  if (!categorySelect) {
    return;
  }

  EVENT_CATEGORIES.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  });
}

function initializeEventForm(form, currentUser) {
  const eventId = new URLSearchParams(window.location.search).get("id");
  const pageTitle = document.getElementById("event-form-title");
  const submitButton = document.getElementById("event-submit");
  let eventToEdit = null;

  document.getElementById("event-date").min = new Date().toISOString().split("T")[0];

  if (eventId) {
    eventToEdit = getStoredEventById(eventId);

    if (!eventToEdit) {
      showAdminFeedback("The selected event could not be found.", "error");
      form.hidden = true;
      return;
    }

    if (pageTitle) {
      pageTitle.textContent = "Edit Event";
    }

    submitButton.textContent = "Save Changes";
    form.dataset.originalDate = eventToEdit.eventDate;
    fillEventForm(eventToEdit);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const eventData = readEventForm();

    if (!validateEventForm(eventData)) {
      return;
    }

    const events = getStoredEvents();

    if (eventToEdit) {
      const eventIndex = events.findIndex(item => item.eventId === eventToEdit.eventId);
      events[eventIndex] = {
        ...eventToEdit,
        ...eventData
      };
      saveStoredEvents(events);
      showAdminFeedback("Event changes saved successfully.", "success");
    } else {
      events.push({
        eventId: getNextEventId(events),
        ...eventData,
        status: "Open",
        organizerId: currentUser.id,
        createdOn: new Date().toISOString().split("T")[0]
      });
      saveStoredEvents(events);
      form.reset();
      showAdminFeedback("Event created successfully.", "success");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  form.addEventListener("input", function (event) {
    if (event.target.matches("input, select, textarea")) {
      setEventFieldError(event.target.id, "");
    }
  });
}

function fillEventForm(event) {
  document.getElementById("title").value = event.title;
  document.getElementById("description").value = event.description;
  document.getElementById("category").value = event.category;
  document.getElementById("event-date").value = event.eventDate;
  document.getElementById("start-time").value = event.startTime;
  document.getElementById("end-time").value = event.endTime;
  document.getElementById("location").value = event.location;
  document.getElementById("capacity").value = event.capacity;
}

function readEventForm() {
  return {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    category: document.getElementById("category").value,
    eventDate: document.getElementById("event-date").value,
    startTime: document.getElementById("start-time").value,
    endTime: document.getElementById("end-time").value,
    location: document.getElementById("location").value.trim(),
    capacity: Number(document.getElementById("capacity").value)
  };
}

function validateEventForm(eventData) {
  let valid = true;
  const today = new Date().toISOString().split("T")[0];

  valid = requireEventField("title", eventData.title, "Event title is required.") && valid;
  valid = requireEventField("description", eventData.description, "Description is required.") && valid;
  valid = requireEventField("category", eventData.category, "Please select a category.") && valid;
  valid = requireEventField("event-date", eventData.eventDate, "Event date is required.") && valid;
  valid = requireEventField("start-time", eventData.startTime, "Start time is required.") && valid;
  valid = requireEventField("end-time", eventData.endTime, "End time is required.") && valid;
  valid = requireEventField("location", eventData.location, "Location is required.") && valid;

  const originalDate = document.getElementById("event-form").dataset.originalDate;

  if (
    eventData.eventDate &&
    eventData.eventDate < today &&
    eventData.eventDate !== originalDate
  ) {
    setEventFieldError("event-date", "Event date cannot be in the past.");
    valid = false;
  }

  if (eventData.startTime && eventData.endTime && eventData.endTime <= eventData.startTime) {
    setEventFieldError("end-time", "End time must be after the start time.");
    valid = false;
  }

  if (!Number.isInteger(eventData.capacity) || eventData.capacity < 1 || eventData.capacity > 10000) {
    setEventFieldError("capacity", "Capacity must be a whole number between 1 and 10,000.");
    valid = false;
  } else {
    setEventFieldError("capacity", "");
  }

  if (!valid) {
    showAdminFeedback("Please correct the highlighted fields.", "error");
    document.querySelector(".invalid")?.focus();
  } else {
    showAdminFeedback("", "");
  }

  return valid;
}

function requireEventField(fieldId, value, message) {
  if (!value) {
    setEventFieldError(fieldId, message);
    return false;
  }

  setEventFieldError(fieldId, "");
  return true;
}

function setEventFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}-error`);

  field?.classList.toggle("invalid", Boolean(message));

  if (error) {
    error.textContent = message;
  }
}

function showAdminFeedback(message, type) {
  const feedback = document.getElementById("admin-feedback");

  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.className = type ? `admin-feedback ${type}` : "admin-feedback";
}

function initializeManageEvents() {
  const searchInput = document.getElementById("event-search");
  const statusFilter = document.getElementById("status-filter");

  renderManagedEvents();

  searchInput.addEventListener("input", renderManagedEvents);
  statusFilter.addEventListener("change", renderManagedEvents);

  document.getElementById("events-table-body").addEventListener("click", function (event) {
    const actionButton = event.target.closest("[data-event-action]");

    if (!actionButton) {
      return;
    }

    handleEventAction(
      actionButton.dataset.eventAction,
      Number(actionButton.dataset.eventId)
    );
  });
}

function renderManagedEvents() {
  const tableBody = document.getElementById("events-table-body");
  const emptyState = document.getElementById("events-empty-state");
  const searchTerm = document.getElementById("event-search").value.trim().toLowerCase();
  const selectedStatus = document.getElementById("status-filter").value;
  const events = getStoredEvents()
    .filter(event => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm) ||
        event.category.toLowerCase().includes(searchTerm) ||
        event.location.toLowerCase().includes(searchTerm);
      const matchesStatus = !selectedStatus || event.status === selectedStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((firstEvent, secondEvent) => firstEvent.eventDate.localeCompare(secondEvent.eventDate));

  tableBody.innerHTML = events.map(createManagedEventRow).join("");
  emptyState.hidden = events.length > 0;
}

function createManagedEventRow(event) {
  const isCancelled = event.status === "Cancelled";
  const formattedDate = new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${event.eventDate}T00:00:00`));

  return `
    <tr>
      <td class="event-title-cell">
        <strong>${escapeEventText(event.title)}</strong>
        <span>${escapeEventText(event.category)}</span>
      </td>
      <td>${formattedDate}<br>${formatEventTime(event.startTime)}</td>
      <td>${escapeEventText(event.location)}</td>
      <td>${event.capacity}</td>
      <td><span class="status-badge status-${event.status.toLowerCase()}">${event.status}</span></td>
      <td>
        <div class="admin-event-actions">
          <a class="admin-action-button secondary" href="edit-event.html?id=${event.eventId}">Edit</a>
          <button class="admin-action-button secondary" type="button" data-event-action="toggle" data-event-id="${event.eventId}">
            ${isCancelled ? "Reopen" : "Cancel"}
          </button>
          <button class="admin-action-button danger" type="button" data-event-action="delete" data-event-id="${event.eventId}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function handleEventAction(action, eventId) {
  const events = getStoredEvents();
  const eventIndex = events.findIndex(event => event.eventId === eventId);

  if (eventIndex === -1) {
    return;
  }

  const selectedEvent = events[eventIndex];

  if (action === "toggle") {
    const nextStatus = selectedEvent.status === "Cancelled" ? "Open" : "Cancelled";
    const actionName = nextStatus === "Cancelled" ? "cancel" : "reopen";

    if (!window.confirm(`Are you sure you want to ${actionName} "${selectedEvent.title}"?`)) {
      return;
    }

    selectedEvent.status = nextStatus;
    saveStoredEvents(events);
    showAdminFeedback(`Event ${nextStatus === "Cancelled" ? "cancelled" : "reopened"} successfully.`, "success");
  }

  if (action === "delete") {
    if (!window.confirm(`Delete "${selectedEvent.title}"? This action cannot be undone.`)) {
      return;
    }

    events.splice(eventIndex, 1);
    saveStoredEvents(events);
    showAdminFeedback("Event deleted successfully.", "success");
  }

  renderManagedEvents();
}

function formatEventTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function escapeEventText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
