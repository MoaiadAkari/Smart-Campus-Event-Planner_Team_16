/*
    Admin Dashboard — Deliverable 2

    Every figure on this page comes from the database through the API.
    Nothing is calculated in the browser: capacity percentages,
    attendance rates and category totals are all computed server-side,
    which is what the project specification requires.

    Endpoints used:
      GET   /api/admin/statistics                     summary + per-event figures
      GET   /api/events/:id/registrations              students registered
      PATCH /api/admin/registrations/:id/attendance    mark attended / absent
*/

let currentAdmin = null;
let dashboardData = null;

document.addEventListener("DOMContentLoaded", async function () {
    // Ask the server who is signed in rather than trusting the browser
    const sessionUser = await synchronizeCurrentUser();

    if (!sessionUser) {
        window.location.href = "login.html";
        return;
    }

    if (sessionUser.role !== "admin" && sessionUser.role !== "organizer") {
        window.location.href = "student-dashboard.html";
        return;
    }

    currentAdmin = sessionUser;

    displayAdminGreeting();
    await loadDashboard();
});


/* --------------------------------------------------
   API helper
-------------------------------------------------- */

/*
    Wraps fetch so every call sends the session cookie and returns
    the parsed body along with the status.
*/
async function callApi(path, options = {}) {
    const response = await fetch(path, {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        ...options
    });

    // The session expired while the page was open
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
   Loading
-------------------------------------------------- */

async function loadDashboard() {
    const result = await callApi("/api/admin/statistics");

    if (!result.ok) {
        showDashboardError(
            result.body?.message || "Unable to load dashboard data."
        );
        return;
    }

    dashboardData = result.body;

    displayAdminSummaryCards();
    displayCategoryStatistics();
    await displayEventPanels();
}


function showDashboardError(message) {
    const container = document.getElementById("event-panels");

    if (container) {
        container.innerHTML = `
            <article class="dashboard-panel">
                <p class="panel-note">${escapeAdminText(message)}</p>
            </article>
        `;
    }
}


/* --------------------------------------------------
   Greeting
-------------------------------------------------- */

function displayAdminGreeting() {
    const greeting = document.getElementById("admin-greeting");

    if (greeting) {
        greeting.textContent = `Welcome back, ${currentAdmin.fullName}!`;
    }
}


/* --------------------------------------------------
   Summary cards
-------------------------------------------------- */

function displayAdminSummaryCards() {
    const container = document.getElementById("admin-summary-cards");
    const totals = dashboardData.totals;

    const summaryCards = [
        { title: "Total Events", value: totals.totalEvents, icon: "📋" },
        { title: "Total Registrations", value: totals.totalRegistrations, icon: "🎟️" },
        { title: "Events at Capacity", value: totals.eventsAtCapacity, icon: "🚫" },
        { title: "Students Attended", value: totals.totalAttended, icon: "✅" }
    ];

    container.innerHTML = summaryCards
        .map(card => `
            <article class="summary-card">
                <div class="summary-icon" aria-hidden="true">
                    ${card.icon}
                </div>

                <div class="summary-content">
                    <p>${card.title}</p>

                    <h2 class="summary-number">
                        ${card.value}
                    </h2>
                </div>
            </article>
        `)
        .join("");
}


/* --------------------------------------------------
   Registrations by category
-------------------------------------------------- */

function displayCategoryStatistics() {
    const container = document.getElementById("category-statistics");
    const popularBadge = document.getElementById("popular-category");

    const categoryTotals = dashboardData.categoryTotals || [];
    const popularCategory = dashboardData.popularCategory;

    popularBadge.textContent = popularCategory
        ? `Most popular: ${popularCategory}`
        : "No registrations yet";

    if (categoryTotals.length === 0) {
        container.innerHTML =
            "<p class='panel-note'>No registrations to display.</p>";
        return;
    }

    // The API sorts highest first, so the first row is the largest
    const highestCount = categoryTotals[0].count;

    container.innerHTML = categoryTotals
        .map(entry => {
            const barWidth = highestCount > 0
                ? Math.round((entry.count / highestCount) * 100)
                : 0;

            const isPopular = entry.category === popularCategory;

            return `
                <div class="category-row ${isPopular ? "category-row-popular" : ""}">
                    <span class="category-name">
                        ${escapeAdminText(entry.category)}
                    </span>

                    <div class="category-bar-track">
                        <div class="category-bar" style="width: ${barWidth}%"></div>
                    </div>

                    <span class="category-count">${entry.count}</span>
                </div>
            `;
        })
        .join("");
}


/* --------------------------------------------------
   Per-event panels
-------------------------------------------------- */

async function displayEventPanels() {
    const container = document.getElementById("event-panels");
    const events = dashboardData.events || [];

    if (events.length === 0) {
        container.innerHTML = `
            <article class="dashboard-panel">
                <p class="panel-note">
                    No events yet. Use Create Event to add the first one.
                </p>
            </article>
        `;
        return;
    }

    // Fetch every event's registrant list in parallel
    const registrationLists = await Promise.all(
        events.map(event =>
            callApi(`/api/events/${event.eventId}/registrations`)
        )
    );

    container.innerHTML = events
        .map((event, index) => {
            const result = registrationLists[index];
            const registrations = result.ok ? result.body.registrations : [];

            return createEventPanel(event, registrations);
        })
        .join("");
}


function createEventPanel(event, registrations) {
    const table = registrations.length === 0
        ? "<p class='panel-note'>No students registered for this event.</p>"
        : `
            <div class="table-wrapper">
                <table class="registrations-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Registered On</th>
                            <th>Status</th>
                            <th>Attendance</th>
                            <th>Mark Attendance</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${registrations.map(createRegistrationRow).join("")}
                    </tbody>
                </table>
            </div>
        `;

    return `
        <article class="dashboard-panel event-admin-panel">
            <div class="panel-heading">
                <div>
                    <p class="panel-label">${escapeAdminText(event.category)}</p>
                    <h2>${escapeAdminText(event.title)}</h2>

                    <p class="panel-note">
                        ${formatAdminDate(event.eventDate)}
                        · ${escapeAdminText(event.location)}
                    </p>
                </div>

                <span class="event-status status-${event.status.toLowerCase()}">
                    ${event.status}
                </span>
            </div>

            <div class="event-metrics">
                <div class="event-metric">
                    <span class="metric-value">
                        ${event.registeredCount} / ${event.capacity}
                    </span>
                    <span class="metric-label">Registered</span>
                </div>

                <div class="event-metric">
                    <span class="metric-value">${event.capacityPercentage}%</span>
                    <span class="metric-label">Seats Filled</span>
                </div>

                <div class="event-metric">
                    <span class="metric-value">${event.attendanceRate}%</span>
                    <span class="metric-label">Attendance Rate</span>
                </div>
            </div>

            <div
                class="progress-container"
                role="progressbar"
                aria-label="Seats filled"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="${event.capacityPercentage}"
            >
                <div
                    class="progress-bar"
                    style="width: ${Math.min(event.capacityPercentage, 100)}%"
                ></div>
            </div>

            ${table}
        </article>
    `;
}


function createRegistrationRow(registration) {
    const isCancelled = registration.status === "Cancelled";

    const attendanceLabel = registration.status === "Attended"
        ? "Attended"
        : registration.status === "Missed"
            ? "Absent"
            : "Not marked";

    const attendanceClass = registration.status === "Attended"
        ? "attendance-attended"
        : registration.status === "Missed"
            ? "attendance-absent"
            : "attendance-unmarked";

    // Cancelled registrations cannot be marked (the server refuses too)
    const actionButtons = isCancelled
        ? "—"
        : `
            <button
                type="button"
                class="attendance-button mark-attended"
                data-action="Attended"
                data-registration-id="${registration.registrationId}"
                ${registration.status === "Attended" ? "disabled" : ""}
            >
                Attended
            </button>

            <button
                type="button"
                class="attendance-button mark-absent"
                data-action="Missed"
                data-registration-id="${registration.registrationId}"
                ${registration.status === "Missed" ? "disabled" : ""}
            >
                Absent
            </button>
        `;

    return `
        <tr class="${isCancelled ? "row-cancelled" : ""}">
            <td>${escapeAdminText(registration.studentName)}</td>
            <td>${escapeAdminText(registration.studentEmail)}</td>
            <td>${formatAdminDate(registration.registrationDate)}</td>

            <td>
                <span class="event-status status-${registration.status.toLowerCase()}">
                    ${registration.status}
                </span>
            </td>

            <td>
                <span class="attendance-label ${attendanceClass}">
                    ${attendanceLabel}
                </span>
            </td>

            <td class="attendance-actions">
                ${actionButtons}
            </td>
        </tr>
    `;
}


/* --------------------------------------------------
   Attendance marking
-------------------------------------------------- */

document.addEventListener("click", async function (event) {
    const button = event.target.closest(".attendance-button");

    if (!button) {
        return;
    }

    // Prevent a second click while the request is in flight
    button.disabled = true;

    const result = await callApi(
        `/api/admin/registrations/${button.dataset.registrationId}/attendance`,
        {
            method: "PATCH",
            body: JSON.stringify({ status: button.dataset.action })
        }
    );

    if (!result.ok) {
        button.disabled = false;
        window.alert(result.body?.message || "Unable to update attendance.");
        return;
    }

    // Reload so every figure reflects the change
    await loadDashboard();
});


/* --------------------------------------------------
   Formatting helpers
-------------------------------------------------- */

function formatAdminDate(value) {
    if (!value) {
        return "—";
    }

    // Registration dates are timestamps; event dates are YYYY-MM-DD
    const date = value.includes(" ") || value.includes("T")
        ? new Date(value.replace(" ", "T"))
        : new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}


function escapeAdminText(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
