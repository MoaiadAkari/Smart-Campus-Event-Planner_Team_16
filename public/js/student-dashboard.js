/*
    Student Dashboard
    Mock frontend data for Deliverable 1.

    The mockEvents and mockRegistrations arrays will later be moved
    into separate shared JavaScript files.
*/
let currentStudent = null;

document.addEventListener("DOMContentLoaded", function () {
    const sessionUser = JSON.parse(
        sessionStorage.getItem("currentUser")
    );

    // No logged-in user
    if (!sessionUser) {
        window.location.href = "login.html";
        return;
    }

    // Prevent admins from accessing the student dashboard
    if (sessionUser.role !== "student") {
        window.location.href = "admin-dashboard.html";
        return;
    }

    // Find the logged-in student inside users.js
    currentStudent = USERS.find(
        user => user.id === sessionUser.id
    );

    if (!currentStudent) {
        sessionStorage.removeItem("currentUser");
        window.location.href = "login.html";
        return;
    }

    initializeDashboard();
});

function displayStudentInformation(student) {
  const studentName = document.getElementById("student-name");
  const studentEmail = document.getElementById("student-email");

  if (studentName) {
    studentName.textContent = student.fullName;
  }

  if (studentEmail) {
    studentEmail.textContent = student.email;
  }
}


/* --------------------------------------------------
   Date helper

   This creates dates relative to today so the dashboard
   continues showing upcoming and previous events.
-------------------------------------------------- */

function getDateFromToday(numberOfDays) {
    const date = new Date();

    date.setDate(date.getDate() + numberOfDays);

    return date.toISOString().split("T")[0];
}


/* --------------------------------------------------
   Temporary shared event data
-------------------------------------------------- */

const mockEvents = getStoredEvents();


/* --------------------------------------------------
   Temporary registration data
-------------------------------------------------- */

let mockRegistrations = [
    {
        registrationId: 1,
        userId: 1,
        eventId: 1,
        registrationDate: getDateFromToday(-5),
        status: "Registered",
        attended: false
    },

    {
        registrationId: 2,
        userId: 1,
        eventId: 2,
        registrationDate: getDateFromToday(-4),
        status: "Registered",
        attended: false
    },

    {
        registrationId: 3,
        userId: 1,
        eventId: 3,
        registrationDate: getDateFromToday(-20),
        status: "Attended",
        attended: true
    },

    {
        registrationId: 4,
        userId: 1,
        eventId: 4,
        registrationDate: getDateFromToday(-7),
        status: "Cancelled",
        attended: false
    }
];


/* --------------------------------------------------
   DOM references
-------------------------------------------------- */

const studentGreeting =
    document.querySelector("#student-greeting");

const summaryCardsContainer =
    document.querySelector("#summary-cards");

const participationPercentage =
    document.querySelector("#participation-percentage");

const participationMessage =
    document.querySelector("#participation-message");

const participationProgress =
    document.querySelector("#participation-progress");

const progressContainer =
    document.querySelector(".progress-container");

const categoryBreakdown =
    document.querySelector("#category-breakdown");

const upcomingEventsList =
    document.querySelector("#upcoming-events-list");

const upcomingEmptyMessage =
    document.querySelector("#upcoming-empty-message");

const suggestedEventsList =
    document.querySelector("#suggested-events-list");

const suggestedEmptyMessage =
    document.querySelector("#suggested-empty-message");


/* --------------------------------------------------
   General helper functions
-------------------------------------------------- */

function getEventDateTime(event) {
    return new Date(
        `${event.eventDate}T${event.startTime}:00`
    );
}


function isUpcomingEvent(event) {
    return getEventDateTime(event) > new Date();
}


function formatEventDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    return new Intl.DateTimeFormat("en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}


function formatTime(timeString) {
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


function getStatusClass(status) {
    return `status-${status
        .toLowerCase()
        .replaceAll(" ", "-")}`;
}


function findEventById(eventId) {
    return mockEvents.find(
        event => event.eventId === eventId
    );
}


function getStudentRegistrations() {
    return mockRegistrations.filter(
        registration =>
            registration.userId === currentStudent.id
    );
}


function studentIsRegisteredForEvent(eventId) {
    return mockRegistrations.some(
        registration =>
            registration.userId === currentStudent.id &&
            registration.eventId === eventId &&
            registration.status !== "Cancelled"
    );
}


/* --------------------------------------------------
   Greeting
-------------------------------------------------- */

function displayStudentGreeting() {
    studentGreeting.textContent =
        `Welcome back, ${currentStudent.fullName}!`;
}


/* --------------------------------------------------
   Dashboard statistics
-------------------------------------------------- */

function calculateDashboardStatistics() {
    const studentRegistrations =
        getStudentRegistrations();

    const activeRegistrations =
        studentRegistrations.filter(
            registration =>
                registration.status === "Registered" ||
                registration.status === "Attended"
        );

    const upcomingRegistrations =
        studentRegistrations.filter(registration => {
            if (registration.status !== "Registered") {
                return false;
            }

            const event =
                findEventById(registration.eventId);

            return (
                event &&
                isUpcomingEvent(event) &&
                event.status !== "Cancelled" &&
                event.status !== "Disabled"
            );
        });

    const attendedRegistrations =
        studentRegistrations.filter(
            registration =>
                registration.status === "Attended" ||
                registration.attended === true
        );

    const cancelledRegistrations =
        studentRegistrations.filter(
            registration =>
                registration.status === "Cancelled"
        );

    return {
        totalRegistered: activeRegistrations.length,
        upcoming: upcomingRegistrations.length,
        attended: attendedRegistrations.length,
        cancelled: cancelledRegistrations.length
    };
}


/* --------------------------------------------------
   Summary cards
-------------------------------------------------- */

function displaySummaryCards() {
    const statistics =
        calculateDashboardStatistics();

    const summaryCards = [
        {
            title: "Total Registered Events",
            value: statistics.totalRegistered,
            icon: "🎟️"
        },
        {
            title: "Upcoming Events",
            value: statistics.upcoming,
            icon: "📅"
        },
        {
            title: "Events Attended",
            value: statistics.attended,
            icon: "✅"
        },
        {
            title: "Cancelled Registrations",
            value: statistics.cancelled,
            icon: "❌"
        }
    ];

    summaryCardsContainer.innerHTML =
        summaryCards
            .map(createSummaryCard)
            .join("");
}


function createSummaryCard(card) {
    return `
        <article class="summary-card">
            <div
                class="summary-icon"
                aria-hidden="true"
            >
                ${card.icon}
            </div>

            <div class="summary-content">
                <p>${card.title}</p>

                <h2 class="summary-number">
                    ${card.value}
                </h2>
            </div>
        </article>
    `;
}


/* --------------------------------------------------
   Participation summary
-------------------------------------------------- */

function displayParticipationSummary() {
    const statistics =
        calculateDashboardStatistics();

    const totalRegistered =
        statistics.totalRegistered;

    const attended =
        statistics.attended;

    const percentage =
        totalRegistered === 0
            ? 0
            : Math.round(
                (attended / totalRegistered) * 100
            );

    participationPercentage.textContent =
        `${percentage}%`;

    participationProgress.style.width =
        `${percentage}%`;

    progressContainer.setAttribute(
        "aria-valuenow",
        percentage
    );

    participationMessage.textContent =
        totalRegistered === 0
            ? "Register for an event to begin tracking your participation."
            : `You have attended ${attended} of your ${totalRegistered} registered events.`;

    displayCategoryBreakdown();
}


function displayCategoryBreakdown() {
    const categoryTotals = {};

    const activeRegistrations =
        getStudentRegistrations().filter(
            registration =>
                registration.status === "Registered" ||
                registration.status === "Attended"
        );

    activeRegistrations.forEach(registration => {
        const event =
            findEventById(registration.eventId);

        if (!event) {
            return;
        }

        const category = event.category;

        categoryTotals[category] =
            (categoryTotals[category] || 0) + 1;
    });

    const categories =
        Object.entries(categoryTotals);

    if (categories.length === 0) {
        categoryBreakdown.innerHTML = `
            <span class="category-item">
                No category information available
            </span>
        `;

        return;
    }

    categoryBreakdown.innerHTML =
        categories
            .map(([category, total]) => {
                return `
                    <span class="category-item">
                        ${category}

                        <strong>${total}</strong>
                    </span>
                `;
            })
            .join("");
}


/* --------------------------------------------------
   Upcoming event preview
-------------------------------------------------- */

function getUpcomingRegisteredEvents() {
    return getStudentRegistrations()
        .filter(
            registration =>
                registration.status === "Registered"
        )
        .map(registration =>
            findEventById(registration.eventId)
        )
        .filter(event => {
            return (
                event &&
                isUpcomingEvent(event) &&
                event.status !== "Cancelled" &&
                event.status !== "Disabled"
            );
        })
        .sort(
            (eventA, eventB) =>
                getEventDateTime(eventA) -
                getEventDateTime(eventB)
        )
        .slice(0, 3);
}


function displayUpcomingEvents() {
    const upcomingEvents =
        getUpcomingRegisteredEvents();

    if (upcomingEvents.length === 0) {
        upcomingEventsList.innerHTML = "";
        upcomingEmptyMessage.classList.remove("hidden");
        return;
    }

    upcomingEmptyMessage.classList.add("hidden");

    upcomingEventsList.innerHTML =
        upcomingEvents
            .map(event =>
                createEventCard(event, "upcoming")
            )
            .join("");
}


/* --------------------------------------------------
   Suggested event preview
-------------------------------------------------- */

function getSuggestedEvents() {
    return mockEvents
        .filter(event => {
            return (
                isUpcomingEvent(event) &&
                event.status !== "Cancelled" &&
                event.status !== "Disabled" &&
                event.status !== "Completed" &&
                !studentIsRegisteredForEvent(event.eventId)
            );
        })
        .sort(
            (eventA, eventB) =>
                getEventDateTime(eventA) -
                getEventDateTime(eventB)
        )
        .slice(0, 3);
}


function displaySuggestedEvents() {
    const suggestedEvents =
        getSuggestedEvents();

    if (suggestedEvents.length === 0) {
        suggestedEventsList.innerHTML = "";
        suggestedEmptyMessage.classList.remove("hidden");
        return;
    }

    suggestedEmptyMessage.classList.add("hidden");

    suggestedEventsList.innerHTML =
        suggestedEvents
            .map(event =>
                createEventCard(event, "suggested")
            )
            .join("");
}


/* --------------------------------------------------
   Event card template
-------------------------------------------------- */

function createEventCard(event, eventType) {
    const isSuggested =
        eventType === "suggested";

    const registrationDisabled =
        event.status !== "Open";

    let actionButtons = `
        <a
            href="event-details.html?id=${event.eventId}"
            class="dashboard-button card-secondary-button"
        >
            View Details
        </a>
    `;

    if (isSuggested) {
        actionButtons += `
            <button
                type="button"
                class="dashboard-button card-primary-button"
                data-action="register"
                data-event-id="${event.eventId}"
                ${registrationDisabled ? "disabled" : ""}
            >
                ${
                    registrationDisabled
                        ? event.status
                        : "Register"
                }
            </button>
        `;
    }

    return `
        <article class="event-card">
            <div class="event-card-top">
                <span class="event-category">
                    ${event.category}
                </span>

                <span
                    class="
                        event-status
                        ${getStatusClass(event.status)}
                    "
                >
                    ${event.status}
                </span>
            </div>

            <h3>${event.title}</h3>

            <div class="event-information">
                <p>
                    <span
                        class="event-information-icon"
                        aria-hidden="true"
                    >
                        📅
                    </span>

                    <span>
                        ${formatEventDate(event.eventDate)}
                    </span>
                </p>

                <p>
                    <span
                        class="event-information-icon"
                        aria-hidden="true"
                    >
                        🕐
                    </span>

                    <span>
                        ${formatTime(event.startTime)}
                        –
                        ${formatTime(event.endTime)}
                    </span>
                </p>

                <p>
                    <span
                        class="event-information-icon"
                        aria-hidden="true"
                    >
                        📍
                    </span>

                    <span>${event.location}</span>
                </p>
            </div>

            <div class="event-actions">
                ${actionButtons}
            </div>
        </article>
    `;
}


/* --------------------------------------------------
   Temporary registration interaction
-------------------------------------------------- */

function registerForEvent(eventId) {
    const event =
        findEventById(eventId);

    if (!event) {
        window.alert("The selected event could not be found.");
        return;
    }

    if (event.status !== "Open") {
        window.alert(
            "Registration is not available for this event."
        );

        return;
    }

    if (studentIsRegisteredForEvent(eventId)) {
        window.alert(
            "You are already registered for this event."
        );

        return;
    }

    const newRegistration = {
        registrationId: mockRegistrations.length + 1,
        userId: currentStudent.id,
        eventId: eventId,
        registrationDate: new Date().toISOString().split("T")[0],
        status: "Registered",
        attended: false
    };

    mockRegistrations.push(newRegistration);

    window.alert(
        `You have registered for "${event.title}".`
    );

    refreshDashboard();
}


/* --------------------------------------------------
   Event listeners
-------------------------------------------------- */

suggestedEventsList.addEventListener(
    "click",
    function (event) {
        const registerButton =
            event.target.closest(
                '[data-action="register"]'
            );

        if (!registerButton) {
            return;
        }

        const eventId =
            Number(registerButton.dataset.eventId);

        registerForEvent(eventId);
    }
);


/* --------------------------------------------------
   Render dashboard
-------------------------------------------------- */

function refreshDashboard() {
    displaySummaryCards();
    displayParticipationSummary();
    displayUpcomingEvents();
    displaySuggestedEvents();
}


function initializeDashboard() {
    displayStudentGreeting();
    refreshDashboard();
}
