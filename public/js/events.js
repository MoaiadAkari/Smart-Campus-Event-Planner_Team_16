document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("events-search");
  const categorySelect = document.getElementById("events-category");
  const statusSelect = document.getElementById("events-status");
  const categories = [...new Set(getStoredEvents().map(event => event.category))].sort();

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  });

  searchInput.addEventListener("input", renderEvents);
  categorySelect.addEventListener("change", renderEvents);
  statusSelect.addEventListener("change", renderEvents);
  renderEvents();
});

function renderEvents() {
  const container = document.getElementById("events-grid");
  const emptyState = document.getElementById("events-empty");
  const searchTerm = document.getElementById("events-search").value.trim().toLowerCase();
  const category = document.getElementById("events-category").value;
  const status = document.getElementById("events-status").value;
  const events = getStoredEvents()
    .filter(event => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm) ||
        event.location.toLowerCase().includes(searchTerm) ||
        event.description.toLowerCase().includes(searchTerm);
      const matchesCategory = !category || event.category === category;
      const matchesStatus = !status || event.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((firstEvent, secondEvent) => firstEvent.eventDate.localeCompare(secondEvent.eventDate));

  container.innerHTML = events.map(event => `
    <article class="event-card">
      <div class="event-card-heading">
        <p class="event-category">${escapeEventListingText(event.category)}</p>
        <span class="event-status-badge status-${event.status.toLowerCase()}">${event.status}</span>
      </div>
      <h2>${escapeEventListingText(event.title)}</h2>
      <p>${formatEventListingDate(event.eventDate)} · ${formatEventListingTime(event.startTime)}</p>
      <p>${escapeEventListingText(event.location)}</p>
      <a href="event-details.html?id=${event.eventId}" class="event-card-link">View Details</a>
    </article>
  `).join("");

  emptyState.hidden = events.length > 0;
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
