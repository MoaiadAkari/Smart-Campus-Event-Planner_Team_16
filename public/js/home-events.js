document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("home-event-grid");

  if (!container) {
    return;
  }

  const upcomingEvents = getStoredEvents()
    .filter(event => {
      const eventDateTime = new Date(`${event.eventDate}T${event.startTime}:00`);
      return eventDateTime > new Date() && event.status !== "Cancelled";
    })
    .sort((firstEvent, secondEvent) => firstEvent.eventDate.localeCompare(secondEvent.eventDate))
    .slice(0, 3);

  container.innerHTML = upcomingEvents.map(event => `
    <article class="home-event-card">
      <p class="event-category">${escapeHomeText(event.category)}</p>
      <h3>${escapeHomeText(event.title)}</h3>
      <p>${formatHomeDate(event.eventDate)}</p>
      <p>${escapeHomeText(event.location)}</p>
      <a href="event-details.html?id=${event.eventId}">View Details</a>
    </article>
  `).join("");
});

function formatHomeDate(dateString) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

function escapeHomeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
