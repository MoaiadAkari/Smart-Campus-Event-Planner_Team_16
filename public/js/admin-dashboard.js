/*
    Admin Dashboard
    Mock frontend data for Deliverable 1.

    The mockAdminEvents, mockStudents, and mockAdminRegistrations
    arrays are temporary and will be replaced by database data
    in Deliverable 2.
*/

let currentAdmin = null;

document.addEventListener("DOMContentLoaded", function () {
    const sessionUser = JSON.parse(
        sessionStorage.getItem("currentUser")
    );

    // No logged-in user
    if (!sessionUser) {
        window.location.href = "login.html";
        return;
    }

    // Prevent students from accessing the admin dashboard
    if (
        sessionUser.role !== "admin" &&
        sessionUser.role !== "organizer"
    ) {
        window.location.href = "student-dashboard.html";
        return;
    }

    currentAdmin = sessionUser;

    initializeAdminDashboard();
});


/* --------------------------------------------------
   Date helper (same approach as the student dashboard)
-------------------------------------------------- */

function getDateFromToday(numberOfDays) {
    const date = new Date();

    date.setDate(date.getDate() + numberOfDays);

    return date.toISOString().split("T")[0];
}


/* --------------------------------------------------
   Temporary mock data
-------------------------------------------------- */

const mockAdminEvents = [
    {
        eventId: 1,
        title: "Resume and Interview Workshop",
        category: "Career",
        eventDate: getDateFromToday(2),
        startTime: "13:00",
        location: "Hall Building, Room H-535",
        capacity: 40,
        status: "Open"
    },

    {
        eventId: 2,
        title: "Introduction to Web Development",
        category: "Academic",
        eventDate: getDateFromToday(5),
        startTime: "10:00",
        location: "EV Building, Room EV-2.260",
        capacity: 35,
        status: "Open"
    },

    {
        eventId: 3,
        title: "Campus Networking Evening",
        category: "Networking",
        eventDate: getDateFromToday(-10),
        startTime: "17:00",
        location: "John Molson Building",
        capacity: 100,
        status: "Completed"
    },

    {
        eventId: 7,
        title: "Community Volunteering Day",
        category: "Volunteering",
        eventDate: getDateFromToday(12),
        startTime: "09:00",
        location: "Concordia Greenhouse",
        capacity: 4,
        status: "Full"
    }
];


const mockStudents = [
    { id: 1, fullName: "Sam Student", email: "student@demo.com" },
    { id: 3, fullName: "Maya Chen", email: "maya.chen@demo.com" },
    { id: 4, fullName: "Omar Haddad", email: "omar.haddad@demo.com" },
    { id: 5, fullName: "Julia Tremblay", email: "julia.tremblay@demo.com" },
    { id: 6, fullName: "Daniel Roy", email: "daniel.roy@demo.com" },
    { id: 7, fullName: "Aisha Karim", email: "aisha.karim@demo.com" }
];


let mockAdminRegistrations = [
    // Resume workshop (upcoming)
    { registrationId: 1, userId: 1, eventId: 1, registrationDate: getDateFromToday(-5), status: "Registered", attended: false },
    { registrationId: 2, userId: 3, eventId: 1, registrationDate: getDateFromToday(-4), status: "Registered", attended: false },
    { registrationId: 3, userId: 4, eventId: 1, registrationDate: getDateFromToday(-3), status: "Cancelled", attended: false },

    // Web development workshop (upcoming)
    { registrationId: 4, userId: 1, eventId: 2, registrationDate: getDateFromToday(-4), status: "Registered", attended: false },
    { registrationId: 5, userId: 5, eventId: 2, registrationDate: getDateFromToday(-2), status: "Registered", attended: false },

    // Networking evening (completed → attendance can be marked)
    { registrationId: 6, userId: 1, eventId: 3, registrationDate: getDateFromToday(-20), status: "Attended", attended: true },
    { registrationId: 7, userId: 3, eventId: 3, registrationDate: getDateFromToday(-18), status: "Attended", attended: true },
    { registrationId: 8, userId: 5, eventId: 3, registrationDate: getDateFromToday(-16), status: "Missed", attended: false },
    { registrationId: 9, userId: 6, eventId: 3, registrationDate: getDateFromToday(-15), status: "Registered", attended: false },

    // Volunteering day (full: 4 of 4 seats)
    { registrationId: 10, userId: 3, eventId: 7, registrationDate: getDateFromToday(-5), status: "Registered", attended: false },
    { registrationId: 11, userId: 4, eventId: 7, registrationDate: getDateFromToday(-4), status: "Registered", attended: false },
    { registrationId: 12, userId: 6, eventId: 7, registrationDate: getDateFromToday(-3), status: "Registered", attended: false },
    { registrationId: 13, userId: 7, eventId: 7, registrationDate: getDateFromToday(-2), status: "Registered", attended: false }
];


/* --------------------------------------------------
   Data helper functions
-------------------------------------------------- */

function findStudentById(userId) {
    return mockStudents.find(
        student => student.id === userId
    );
}


// A registration counts toward capacity unless it was cancelled
function getActiveRegistrations(eventId) {
    return mockAdminRegistrations.filter(
        registration =>
            registration.eventId === eventId &&
            registration.status !== "Cancelled"
    );
}


function getAllRegistrationsForEvent(eventId) {
    return mockAdminRegistrations.filter(
        registration => registration.eventId === eventId
    );
}


// Percentage of seats filled (server-side in Deliverable 2)
function getCapacityPercentage(event) {
    const registered =
        getActiveRegistrations(event.eventId).length;

    if (event.capacity === 0) {
        return 0;
    }

    return Math.round((registered / event.capacity) * 100);
}


// Attendance rate = attended / active registrations
function getAttendanceRate(eventId) {
    const activeRegistrations =
        getActiveRegistrations(eventId);

    if (activeRegistrations.length === 0) {
        return 0;
    }

    const attendedCount =
        activeRegistrations.filter(
            registration => registration.attended
        ).length;

    return Math.round(
        (attendedCount / activeRegistrations.length) * 100
    );
}


/* --------------------------------------------------
   Category statistics
-------------------------------------------------- */

function getRegistrationsByCategory() {
    const categoryTotals = {};

    mockAdminRegistrations.forEach(registration => {
        if (registration.status === "Cancelled") {
            return;
        }

        const event = mockAdminEvents.find(
            event => event.eventId === registration.eventId
        );

        if (!event) {
            return;
        }

        categoryTotals[event.category] =
            (categoryTotals[event.category] || 0) + 1;
    });

    return categoryTotals;
}


function getMostPopularCategory() {
    const categoryTotals = getRegistrationsByCategory();

    let popularCategory = null;
    let highestCount = 0;

    Object.entries(categoryTotals).forEach(
        ([category, count]) => {
            if (count > highestCount) {
                popularCategory = category;
                highestCount = count;
            }
        }
    );

    return popularCategory;
}


/* --------------------------------------------------
   Summary cards
-------------------------------------------------- */

function displayAdminSummaryCards() {
    const container =
        document.getElementById("admin-summary-cards");

    const totalEvents = mockAdminEvents.length;

    const totalRegistrations =
        mockAdminRegistrations.filter(
            registration =>
                registration.status !== "Cancelled"
        ).length;

    const fullEvents =
        mockAdminEvents.filter(
            event =>
                getActiveRegistrations(event.eventId).length >=
                event.capacity
        ).length;

    const attendedTotal =
        mockAdminRegistrations.filter(
            registration => registration.attended
        ).length;

    const summaryCards = [
        {
            title: "Total Events",
            value: totalEvents,
            icon: "📋"
        },
        {
            title: "Total Registrations",
            value: totalRegistrations,
            icon: "🎟️"
        },
        {
            title: "Events at Capacity",
            value: fullEvents,
            icon: "🚫"
        },
        {
            title: "Students Attended",
            value: attendedTotal,
            icon: "✅"
        }
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
   Category statistics panel
-------------------------------------------------- */

function displayCategoryStatistics() {
    const container =
        document.getElementById("category-statistics");

    const popularBadge =
        document.getElementById("popular-category");

    const categoryTotals = getRegistrationsByCategory();
    const entries = Object.entries(categoryTotals);

    const popularCategory = getMostPopularCategory();

    popularBadge.textContent = popularCategory
        ? `Most popular: ${popularCategory}`
        : "No registrations yet";

    if (entries.length === 0) {
        container.innerHTML =
            "<p>No registrations to display.</p>";
        return;
    }

    const highestCount = Math.max(
        ...entries.map(([, count]) => count)
    );

    container.innerHTML = entries
        .sort(
            (entryA, entryB) => entryB[1] - entryA[1]
        )
        .map(([category, count]) => {
            const barWidth = Math.round(
                (count / highestCount) * 100
            );

            const isPopular =
                category === popularCategory;

            return `
                <div class="category-row ${isPopular ? "category-row-popular" : ""}">
                    <span class="category-name">
                        ${category}
                    </span>

                    <div class="category-bar-track">
                        <div
                            class="category-bar"
                            style="width: ${barWidth}%"
                        ></div>
                    </div>

                    <span class="category-count">
                        ${count}
                    </span>
                </div>
            `;
        })
        .join("");
}


/* --------------------------------------------------
   Per-event panels
-------------------------------------------------- */

function createRegistrationRow(registration) {
    const student =
        findStudentById(registration.userId);

    if (!student) {
        return "";
    }

    const isCancelled =
        registration.status === "Cancelled";

    const attendanceLabel = registration.attended
        ? "Attended"
        : registration.status === "Missed"
            ? "Absent"
            : "Not marked";

    const attendanceClass = registration.attended
        ? "attendance-attended"
        : registration.status === "Missed"
            ? "attendance-absent"
            : "attendance-unmarked";

    // Cancelled registrations cannot be marked
    const actionButtons = isCancelled
        ? "—"
        : `
            <button
                type="button"
                class="attendance-button mark-attended"
                data-action="attended"
                data-registration-id="${registration.registrationId}"
                ${registration.attended ? "disabled" : ""}
            >
                Attended
            </button>

            <button
                type="button"
                class="attendance-button mark-absent"
                data-action="absent"
                data-registration-id="${registration.registrationId}"
                ${registration.status === "Missed" ? "disabled" : ""}
            >
                Absent
            </button>
        `;

    return `
        <tr class="${isCancelled ? "row-cancelled" : ""}">
            <td>${student.fullName}</td>
            <td>${student.email}</td>
            <td>${registration.registrationDate}</td>

            <td>
                <span class="event-status ${getRegistrationStatusClass(registration.status)}">
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


function getRegistrationStatusClass(status) {
    return `status-${status.toLowerCase()}`;
}


function createEventPanel(event) {
    const allRegistrations =
        getAllRegistrationsForEvent(event.eventId);

    const activeCount =
        getActiveRegistrations(event.eventId).length;

    const capacityPercentage =
        getCapacityPercentage(event);

    const attendanceRate =
        getAttendanceRate(event.eventId);

    const tableRows = allRegistrations
        .map(createRegistrationRow)
        .join("");

    const table = allRegistrations.length === 0
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
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;

    return `
        <article class="dashboard-panel event-admin-panel">
            <div class="panel-heading">
                <div>
                    <p class="panel-label">${event.category}</p>
                    <h2>${event.title}</h2>

                    <p class="panel-note">
                        ${event.eventDate} · ${event.location}
                    </p>
                </div>

                <span class="event-status status-${event.status.toLowerCase()}">
                    ${event.status}
                </span>
            </div>

            <div class="event-metrics">
                <div class="event-metric">
                    <span class="metric-value">
                        ${activeCount} / ${event.capacity}
                    </span>
                    <span class="metric-label">Registered</span>
                </div>

                <div class="event-metric">
                    <span class="metric-value">
                        ${capacityPercentage}%
                    </span>
                    <span class="metric-label">Seats Filled</span>
                </div>

                <div class="event-metric">
                    <span class="metric-value">
                        ${attendanceRate}%
                    </span>
                    <span class="metric-label">Attendance Rate</span>
                </div>
            </div>

            <div
                class="progress-container"
                role="progressbar"
                aria-label="Seats filled"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="${capacityPercentage}"
            >
                <div
                    class="progress-bar"
                    style="width: ${Math.min(capacityPercentage, 100)}%"
                ></div>
            </div>

            ${table}
        </article>
    `;
}


function displayEventPanels() {
    const container =
        document.getElementById("event-panels");

    container.innerHTML = mockAdminEvents
        .map(createEventPanel)
        .join("");
}


/* --------------------------------------------------
   Attendance marking
-------------------------------------------------- */

function markAttendance(registrationId, action) {
    const registration =
        mockAdminRegistrations.find(
            registration =>
                registration.registrationId === registrationId
        );

    if (!registration) {
        return;
    }

    if (registration.status === "Cancelled") {
        return;
    }

    if (action === "attended") {
        registration.status = "Attended";
        registration.attended = true;
    } else if (action === "absent") {
        registration.status = "Missed";
        registration.attended = false;
    }

    refreshAdminDashboard();
}


document.addEventListener("click", function (event) {
    const button = event.target.closest(
        ".attendance-button"
    );

    if (!button) {
        return;
    }

    markAttendance(
        Number(button.dataset.registrationId),
        button.dataset.action
    );
});


/* --------------------------------------------------
   Render dashboard
-------------------------------------------------- */

function displayAdminGreeting() {
    const greeting =
        document.getElementById("admin-greeting");

    greeting.textContent =
        `Welcome back, ${currentAdmin.fullName}!`;
}


function refreshAdminDashboard() {
    displayAdminSummaryCards();
    displayCategoryStatistics();
    displayEventPanels();
}


function initializeAdminDashboard() {
    displayAdminGreeting();
    refreshAdminDashboard();
}
