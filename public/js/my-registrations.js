/*
    My Registrations page

    Reads the shared "studentEventRegistrations" store written by
    event-details.js, joins it with the shared events data from
    mock-events.js, and lets the student cancel their own
    registrations (spec: students may edit/delete only their own
    registration records).

    Deliverable 2 will replace the browser storage with backend calls.
*/

let currentStudentUser = null;
let activeFilter = "all";

document.addEventListener("DOMContentLoaded", function () {
    const savedUser = sessionStorage.getItem("currentUser");
    const sessionUser = savedUser ? JSON.parse(savedUser) : null;

    // This page is for logged-in students only
    if (!sessionUser) {
        window.location.href = "login.html";
        return;
    }

    if (sessionUser.role !== "student") {
        window.location.href = "admin-dashboard.html";
        return;
    }

    currentStudentUser = sessionUser;

    setUpFilterButtons();
    renderRegistrations();
});


/* --------------------------------------------------
   Shared registration store helpers
-------------------------------------------------- */

function getSavedRegistrations() {
    try {
        return JSON.parse(
            localStorage.getItem("studentEventRegistrations") || "[]"
        );
    } catch {
        localStorage.setItem("studentEventRegistrations", "[]");
        return [];
    }
}


function saveRegistrations(registrations) {
    localStorage.setItem(
        "studentEventRegistrations",
        JSON.stringify(registrations)
    );
}


// Only the logged-in student's own records (spec §3.1)
function getMyRegistrations() {
    return getSavedRegistrations().filter(
        registration =>
            registration.userId === currentStudentUser.id
    );
}


/* --------------------------------------------------
   Derived registration information
-------------------------------------------------- */

function isPastEvent(event) {
    return (
        new Date(`${event.eventDate}T${event.startTime}:00`) <
        new Date()
    );
}


/*
    Derives what the student should see as the state of
    their registration from the event's current state.
*/
function getRegistrationState(event) {
    if (event.status === "Cancelled") {
        return { label: "Event Cancelled", css: "status-cancelled", past: false };
    }

    if (event.status === "Completed" || isPastEvent(event)) {
        return { label: "Completed", css: "status-completed", past: true };
    }

    return { label: "Registered", css: "status-open", past: false };
}


/* --------------------------------------------------
   Rendering
-------------------------------------------------- */

function renderRegistrations() {
    const grid =
        document.getElementById("registrations-grid");

    const emptyState =
        document.getElementById("registrations-empty");

    const summary =
        document.getElementById("registrations-summary");

    // Join each registration with its event
    const rows = getMyRegistrations()
        .map(registration => {
            const event = getStoredEvents().find(
                event =>
                    event.eventId === registration.eventId
            );

            if (!event) {
                return null;
            }

            return {
                registration: registration,
                event: event,
                state: getRegistrationState(event)
            };
        })
        .filter(row => row !== null)
        .sort((rowA, rowB) =>
            rowA.event.eventDate.localeCompare(
                rowB.event.eventDate
            )
        );

    const upcomingCount =
        rows.filter(row => !row.state.past).length;

    summary.textContent =
        rows.length === 0
            ? "Your registered campus events appear here."
            : `You have ${rows.length} registration${rows.length === 1 ? "" : "s"}, ` +
              `${upcomingCount} upcoming.`;

    // Apply the active filter
    const visibleRows = rows.filter(row => {
        if (activeFilter === "upcoming") {
            return !row.state.past;
        }

        if (activeFilter === "past") {
            return row.state.past;
        }

        return true;
    });

    grid.innerHTML = visibleRows
        .map(createRegistrationCard)
        .join("");

    emptyState.hidden = visibleRows.length > 0;
}


function createRegistrationCard(row) {
    const event = row.event;
    const registration = row.registration;
    const state = row.state;

    // Cancelling only makes sense for future, non-cancelled events
    const canCancel =
        !state.past &&
        event.status !== "Cancelled";

    return `
        <article class="event-card registration-card">
            <div class="event-card-heading">
                <p class="event-category">
                    ${escapeRegistrationText(event.category)}
                </p>

                <span class="event-status-badge ${state.css}">
                    ${state.label}
                </span>
            </div>

            <h2>${escapeRegistrationText(event.title)}</h2>

            <p>
                ${formatRegistrationDate(event.eventDate)}
                · ${formatRegistrationTime(event.startTime)}
            </p>

            <p>${escapeRegistrationText(event.location)}</p>

            <p class="registered-on">
                Registered on
                ${formatRegistrationDate(registration.registeredOn)}
            </p>

            <div class="registration-card-actions">
                <a
                    href="event-details.html?id=${event.eventId}"
                    class="event-card-link"
                >
                    View Details
                </a>

                ${canCancel ? `
                    <button
                        type="button"
                        class="cancel-registration-btn"
                        data-event-id="${event.eventId}"
                    >
                        Cancel Registration
                    </button>
                ` : ""}
            </div>
        </article>
    `;
}


/* --------------------------------------------------
   Cancel registration
-------------------------------------------------- */

document.addEventListener("click", function (event) {
    const cancelButton = event.target.closest(
        ".cancel-registration-btn"
    );

    if (!cancelButton) {
        return;
    }

    cancelRegistration(
        Number(cancelButton.dataset.eventId)
    );
});


function cancelRegistration(eventId) {
    const eventInfo = getStoredEvents().find(
        event => event.eventId === eventId
    );

    const confirmed = window.confirm(
        `Cancel your registration for "${eventInfo ? eventInfo.title : "this event"}"?`
    );

    if (!confirmed) {
        return;
    }

    /*
        Keep every other student's records; remove only the
        current student's record for this event.
    */
    const remaining = getSavedRegistrations().filter(
        registration =>
            !(
                registration.userId === currentStudentUser.id &&
                registration.eventId === eventId
            )
    );

    saveRegistrations(remaining);
    renderRegistrations();
}


/* --------------------------------------------------
   Filter buttons
-------------------------------------------------- */

function setUpFilterButtons() {
    const buttons =
        document.querySelectorAll(".filter-button");

    buttons.forEach(button => {
        button.addEventListener("click", function () {
            activeFilter = button.dataset.filter;

            buttons.forEach(otherButton =>
                otherButton.classList.toggle(
                    "active",
                    otherButton === button
                )
            );

            renderRegistrations();
        });
    });
}


/* --------------------------------------------------
   Formatting helpers
-------------------------------------------------- */

function formatRegistrationDate(dateString) {
    if (!dateString) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-CA", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(new Date(`${dateString}T00:00:00`));
}


function formatRegistrationTime(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return new Intl.DateTimeFormat("en-CA", {
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}


function escapeRegistrationText(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
