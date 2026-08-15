document.addEventListener("DOMContentLoaded", async function () {
  const searchInput = document.getElementById("events-search");
  const categorySelect = document.getElementById("events-category");
  const dateInput = document.getElementById("events-date");
  const statusSelect = document.getElementById("events-status");
  let allEvents = [];

  try {
    const response = await fetch("/api/events");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Unable to load events.");
    }

    allEvents = payload.events || [];
    (payload.categories || []).forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.append(option);
    });

    [searchInput, categorySelect, dateInput, statusSelect].forEach(control => {
      control.addEventListener(control === searchInput ? "input" : "change", renderEvents);
    });
    renderEvents();
  } catch (error) {
    document.getElementById("events-grid").innerHTML =
      `<p>${escapeEventListingText(error.message)}</p>`;
  }

  function renderEvents() {
    const container = document.getElementById("events-grid");
    const emptyState = document.getElementById("events-empty");
    const searchTerm = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const date = dateInput.value;
    const status = statusSelect.value;
    const events = allEvents.filter(event => {
      const searchable = [
        event.title,
        event.location,
        event.description,
        event.organizerName
      ].join(" ").toLowerCase();

      return (!searchTerm || searchable.includes(searchTerm))
        && (!category || event.category === category)
        && (!date || event.eventDate === date)
        && (!status || event.status === status);
    });

    container.innerHTML = events.map(event => `
      <article class="event-card">
        <div class="event-card-heading">
          <p class="event-category">${escapeEventListingText(event.category)}</p>
          <span class="event-status-badge status-${statusClass(event.status)}">
            ${escapeEventListingText(event.status)}
          </span>
        </div>
        <h2>${escapeEventListingText(event.title)}</h2>
        <p>${formatEventListingDate(event.eventDate)} · ${formatEventListingTime(event.startTime)}</p>
        <p>${escapeEventListingText(event.location)}</p>
        <p>Organized by ${escapeEventListingText(event.organizerName || "Smart Campus")}</p>
        <a href="event-details.html?id=${event.eventId}" class="event-card-link">View Details</a>
      </article>
    `).join("");

    emptyState.hidden = events.length > 0;
  }
});

function statusClass(status) {
  return String(status).toLowerCase().replaceAll(" ", "-");
}

function formatEventListingDate(dateString) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatEventListingTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function escapeEventListingText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
