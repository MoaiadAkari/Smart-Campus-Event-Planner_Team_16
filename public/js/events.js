document.addEventListener("DOMContentLoaded", async function () {
    const searchInput = document.getElementById("events-search");
    const categorySelect = document.getElementById("events-category");
    const statusSelect = document.getElementById("events-status");

    let allEvents = [];

    try {
        const response = await fetch("/api/events");

        if (!response.ok) {
            throw new Error("Failed to load events");
        }

        allEvents = await response.json();

        const categories = [
            ...new Set(allEvents.map(event => event.category))
        ].sort();

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

    } catch (error) {
        console.error(error);

        document.getElementById("events-grid").innerHTML =
            "<p>Unable to load events.</p>";
    }


    function renderEvents() {
        const container = document.getElementById("events-grid");
        const emptyState = document.getElementById("events-empty");

        const searchTerm =
            searchInput.value.trim().toLowerCase();

        const category = categorySelect.value;
        const status = statusSelect.value;

        const events = allEvents
            .filter(event => {

                const matchesSearch =
                    String(event.title).toLowerCase().includes(searchTerm) ||
                    String(event.location).toLowerCase().includes(searchTerm) ||
                    String(event.description || "").toLowerCase().includes(searchTerm);

                const matchesCategory =
                    !category || event.category === category;

                const matchesStatus =
                    !status || event.event_status === status;

                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesStatus
                );
            })
            .sort((firstEvent, secondEvent) =>
                firstEvent.event_date.localeCompare(secondEvent.event_date)
            );


        container.innerHTML = events.map(event => `
            <article class="event-card">

                <div class="event-card-heading">

                    <p class="event-category">
                        ${escapeEventListingText(event.category)}
                    </p>

                    <span class="event-status-badge status-${event.event_status.toLowerCase()}">
                        ${escapeEventListingText(event.event_status)}
                    </span>

                </div>

                <h2>
                    ${escapeEventListingText(event.title)}
                </h2>

                <p>
                    ${formatEventListingDate(event.event_date)}
                    ·
                    ${formatEventListingTime(event.start_time)}
                </p>

                <p>
                    ${escapeEventListingText(event.location)}
                </p>

                <a
                    href="event-details.html?id=${event.event_id}"
                    class="event-card-link"
                >
                    View Details
                </a>

            </article>
        `).join("");

        emptyState.hidden = events.length > 0;
    }
});


function formatEventListingDate(dateString) {
    return new Intl.DateTimeFormat("en-CA", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(new Date(`${dateString}T00:00:00`));
}


function formatEventListingTime(timeString) {
    const [hours, minutes] = timeString
        .split(":")
        .map(Number);

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