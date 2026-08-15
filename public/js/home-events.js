document.addEventListener("DOMContentLoaded", async function () {
  const container = document.getElementById("home-event-grid");

  if (!container) {
    return;
  }

  try {
    const response = await fetch("/api/events");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Unable to load events.");
    }

    const upcomingEvents = (payload.events || [])
      .filter(event =>
        new Date(`${event.eventDate}T${event.startTime}:00`) > new Date()
        && !["Cancelled", "Disabled", "Completed"].includes(event.status)
      )
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

    if (upcomingEvents.length === 0) {
      container.innerHTML = "<p>No upcoming events are available.</p>";
    }
  } catch (error) {
    container.innerHTML = `<p>${escapeHomeText(error.message)}</p>`;
  }
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
