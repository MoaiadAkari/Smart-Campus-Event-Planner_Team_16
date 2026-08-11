/*
    Admin event management — Deliverable 2

    Drives three pages:
      create-event.html   create a new event
      edit-event.html     edit an existing event (?id=…)
      manage-events.html  list, cancel, disable, enable, delete

    All data comes from the API and every rule is enforced on the
    server. The browser checks are a first pass for a faster response;
    whatever the server replies with always wins, and its field errors
    are shown under the matching inputs.

    Endpoints used:
      GET    /api/events/manage            events this user manages
      GET    /api/events/:id               one event
      POST   /api/events                   create
      PUT    /api/events/:id               update
      PATCH  /api/events/:id/status        cancel / disable / enable
      DELETE /api/events/:id               delete
*/

// Fallback list; replaced by the categories the server sends back
let EVENT_CATEGORIES = [
  "Academic",
  "Career",
  "Club Activity",
  "Cultural",
  "Guest Lecture",
  "Networking",
  "Social",
  "Sports",
  "Volunteering",
  "Other"
];

let managedEvents = [];


document.addEventListener("DOMContentLoaded", async function () {
  const currentUser = await synchronizeCurrentUser();

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  if (currentUser.role !== "admin" && currentUser.role !== "organizer") {
    window.location.href = "student-dashboard.html";
    return;
  }

  const eventForm = document.getElementById("event-form");
  const eventsTableBody = document.getElementById("events-table-body");

  if (eventForm) {
    await initializeEventForm(eventForm, currentUser);
  }

  if (eventsTableBody) {
    await initializeManageEvents();
  }
});


/* --------------------------------------------------
   API helper
-------------------------------------------------- */

async function callEventApi(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (response.status === 401) {
    window.location.href = "login.html";
    return { ok: false, status: 401, body: null };
  }

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { ok: response.ok, status: response.status, body };
}


/* --------------------------------------------------
   Category dropdown
-------------------------------------------------- */

function populateCategoryOptions(selectedCategory) {
  const categorySelect = document.getElementById("category");

  if (!categorySelect) {
    return;
  }

  // Keep the placeholder option, replace the rest
  const placeholder = categorySelect.querySelector('option[value=""]');
  categorySelect.innerHTML = "";

  if (placeholder) {
    categorySelect.append(placeholder);
  }

  EVENT_CATEGORIES.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  });

  if (selectedCategory) {
    categorySelect.value = selectedCategory;
  }
}


/* --------------------------------------------------
   Create / edit form
-------------------------------------------------- */

async function initializeEventForm(form, currentUser) {
  const eventId = new URLSearchParams(window.location.search).get("id");
  const pageTitle = document.getElementById("event-form-title");
  const submitButton = document.getElementById("event-submit");
  let eventToEdit = null;

  // Stop the date picker offering past dates on a new event
  if (!eventId) {
    document.getElementById("event-date").min =
      new Date().toISOString().split("T")[0];
  }

  if (eventId) {
    const result = await callEventApi(`/api/events/${eventId}`);

    if (!result.ok) {
      showAdminFeedback(
        result.body?.message || "The selected event could not be found.",
        "error"
      );
      form.hidden = true;
      return;
    }

    eventToEdit = result.body.event;

    if (pageTitle) {
      pageTitle.textContent = "Edit Event";
    }

    submitButton.textContent = "Save Changes";
    populateCategoryOptions(eventToEdit.category);
    fillEventForm(eventToEdit);
  } else {
    populateCategoryOptions();
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const eventData = readEventForm();

    // Browser-side pass first, for immediate feedback
    if (!validateEventForm(eventData, Boolean(eventToEdit))) {
      return;
    }

    submitButton.disabled = true;

    const result = eventToEdit
      ? await callEventApi(`/api/events/${eventToEdit.eventId}`, {
        method: "PUT",
        body: JSON.stringify(eventData)
      })
      : await callEventApi("/api/events", {
        method: "POST",
        body: JSON.stringify(eventData)
      });

    submitButton.disabled = false;

    if (!result.ok) {
      // Show the server's per-field messages under the right inputs
      const fields = result.body?.fields || {};

      Object.entries(fields).forEach(([field, message]) => {
        setEventFieldError(toFieldId(field), message);
      });

      showAdminFeedback(
        result.body?.message || "The event could not be saved.",
        "error"
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (eventToEdit) {
      showAdminFeedback("Event changes saved successfully.", "success");
    } else {
      form.reset();
      populateCategoryOptions();
      showAdminFeedback("Event created successfully.", "success");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Clear a field's error as soon as the user edits it
  form.addEventListener("input", function (event) {
    if (event.target.matches("input, select, textarea")) {
      setEventFieldError(event.target.id, "");
    }
  });
}


/*
    The server names fields in camelCase (eventDate); the inputs use
    hyphens (event-date). This converts between them.
*/
function toFieldId(fieldName) {
  return fieldName.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}


function fillEventForm(event) {
  document.getElementById("title").value = event.title;
  document.getElementById("description").value = event.description || "";
  document.getElementById("category").value = event.category;
  document.getElementById("event-date").value = event.eventDate;
  document.getElementById("start-time").value = event.startTime;
  document.getElementById("end-time").value = event.endTime;
  document.getElementById("capacity").value = event.capacity;
  document.getElementById("location").value = event.location;
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


/*
    First-pass validation in the browser. The server repeats all of
    this — these checks only make the form feel responsive.
*/
function validateEventForm(eventData, isEditing) {
  let valid = true;

  valid = requireEventField("title", eventData.title, "Event title is required.") && valid;
  valid = requireEventField("category", eventData.category, "Please choose a category.") && valid;
  valid = requireEventField("event-date", eventData.eventDate, "Event date is required.") && valid;
  valid = requireEventField("start-time", eventData.startTime, "Start time is required.") && valid;
  valid = requireEventField("end-time", eventData.endTime, "End time is required.") && valid;
  valid = requireEventField("location", eventData.location, "Event location is required.") && valid;

  // A new event may not be scheduled in the past
  if (!isEditing && eventData.eventDate) {
    const todayString = new Date().toISOString().split("T")[0];

    if (eventData.eventDate < todayString) {
      setEventFieldError("event-date", "Event date cannot be in the past.");
      valid = false;
    }
  }

  if (eventData.startTime && eventData.endTime && eventData.endTime <= eventData.startTime) {
    setEventFieldError("end-time", "End time must be after the start time.");
    valid = false;
  }

  if (!Number.isInteger(eventData.capacity) || eventData.capacity < 1) {
    setEventFieldError("capacity", "Capacity must be a whole number of at least 1.");
    valid = false;
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
  const errorElement = document.getElementById(`${fieldId}-error`);

  if (field) {
    field.classList.toggle("invalid", Boolean(message));
  }

  if (errorElement) {
    errorElement.textContent = message || "";
  }
}


function showAdminFeedback(message, type) {
  const feedback = document.getElementById("admin-feedback");

  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.className = `admin-feedback ${type}`;
  feedback.hidden = false;
}


/* --------------------------------------------------
   Manage events page
-------------------------------------------------- */

async function initializeManageEvents() {
  document.getElementById("event-search")
    .addEventListener("input", renderManagedEvents);

  document.getElementById("status-filter")
    .addEventListener("change", renderManagedEvents);

  document.getElementById("events-table-body")
    .addEventListener("click", async function (event) {
      const actionButton = event.target.closest("[data-event-action]");

      if (!actionButton) {
        return;
      }

      await handleEventAction(
        actionButton.dataset.eventAction,
        Number(actionButton.dataset.eventId)
      );
    });

  await loadManagedEvents();
}


async function loadManagedEvents() {
  const result = await callEventApi("/api/events/manage");

  if (!result.ok) {
    showAdminFeedback(
      result.body?.message || "Unable to load your events.",
      "error"
    );
    return;
  }

  managedEvents = result.body.events || [];

  if (Array.isArray(result.body.categories)) {
    EVENT_CATEGORIES = result.body.categories;
  }

  renderManagedEvents();
}


function renderManagedEvents() {
  const tableBody = document.getElementById("events-table-body");
  const emptyState = document.getElementById("events-empty-state");
  const searchTerm = document.getElementById("event-search").value.trim().toLowerCase();
  const selectedStatus = document.getElementById("status-filter").value;

  const events = managedEvents
    .filter(event => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm) ||
        event.category.toLowerCase().includes(searchTerm) ||
        event.location.toLowerCase().includes(searchTerm);

      const matchesStatus = !selectedStatus || event.status === selectedStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((firstEvent, secondEvent) =>
      firstEvent.eventDate.localeCompare(secondEvent.eventDate)
    );

  tableBody.innerHTML = events.map(createManagedEventRow).join("");
  emptyState.hidden = events.length > 0;
}


function createManagedEventRow(event) {
  const isCancelled = event.status === "Cancelled";
  const isDisabled = event.status === "Disabled";

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
      <td>${event.registeredCount} / ${event.capacity}</td>
      <td><span class="status-badge status-${event.status.toLowerCase()}">${event.status}</span></td>
      <td>
        <div class="admin-event-actions">
          <a class="admin-action-button secondary" href="edit-event.html?id=${event.eventId}">Edit</a>

          <button class="admin-action-button secondary" type="button"
                  data-event-action="toggle" data-event-id="${event.eventId}">
            ${isCancelled ? "Reopen" : "Cancel"}
          </button>

          <button class="admin-action-button secondary" type="button"
                  data-event-action="disable" data-event-id="${event.eventId}">
            ${isDisabled ? "Enable" : "Disable"}
          </button>

          <button class="admin-action-button danger" type="button"
                  data-event-action="delete" data-event-id="${event.eventId}">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `;
}


async function handleEventAction(action, eventId) {
  const selectedEvent = managedEvents.find(event => event.eventId === eventId);

  if (!selectedEvent) {
    return;
  }

  if (action === "toggle" || action === "disable") {
    const nextStatus = action === "toggle"
      ? (selectedEvent.status === "Cancelled" ? "Open" : "Cancelled")
      : (selectedEvent.status === "Disabled" ? "Open" : "Disabled");

    const actionName = {
      Cancelled: "cancel",
      Disabled: "disable",
      Open: "reopen"
    }[nextStatus];

    if (!window.confirm(`Are you sure you want to ${actionName} "${selectedEvent.title}"?`)) {
      return;
    }

    const result = await callEventApi(`/api/events/${eventId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus })
    });

    if (!result.ok) {
      showAdminFeedback(
        result.body?.message || "The event status could not be changed.",
        "error"
      );
      return;
    }

    // The server decides the final status (Open may become Full)
    showAdminFeedback(result.body.message, "success");
  }

  if (action === "delete") {
    if (!window.confirm(`Delete "${selectedEvent.title}"? This action cannot be undone.`)) {
      return;
    }

    const result = await callEventApi(`/api/events/${eventId}`, {
      method: "DELETE"
    });

    if (!result.ok) {
      showAdminFeedback(
        result.body?.message || "The event could not be deleted.",
        "error"
      );
      return;
    }

    showAdminFeedback("Event deleted successfully.", "success");
  }

  await loadManagedEvents();
}


/* --------------------------------------------------
   Formatting helpers
-------------------------------------------------- */

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
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
