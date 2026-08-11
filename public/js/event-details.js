document.addEventListener("DOMContentLoaded", async function () {
    const eventId = new URLSearchParams(window.location.search).get("id");

    const detailsCard = document.getElementById("event-details-card");
    const notFound = document.getElementById("event-not-found");

    if (!eventId) {
        detailsCard.hidden = true;
        notFound.hidden = false;
        return;
    }

    try {
        const response = await fetch(`/api/events/${eventId}`);

        if (response.status === 404) {
            detailsCard.hidden = true;
            notFound.hidden = false;
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load event.");
        }

        const event = await response.json();

        document.title = `${event.title} | Smart Campus Event Planner`;

        document.getElementById("event-category").textContent =
            event.category;

        document.getElementById("event-title").textContent =
            event.title;

        document.getElementById("event-organizer").textContent =
            event.organizer_name
                ? `Organized by ${event.organizer_name}`
                : "Organizer unavailable";

        document.getElementById("event-date").textContent =
            formatDetailsDate(event.event_date);

        document.getElementById("event-time").textContent =
            `${formatDetailsTime(event.start_time)} – ${formatDetailsTime(event.end_time)}`;

        document.getElementById("event-location").textContent =
            event.location;

        document.getElementById("event-capacity").textContent =
            `${event.registration_count}/${event.capacity} registered`;

        document.getElementById("event-description").textContent =
            event.description || "No description available.";

        const statusBadge = document.getElementById("event-status");

        statusBadge.textContent = event.event_status;

        statusBadge.classList.add(
            `status-${event.event_status.toLowerCase()}`
        );

        await configureRegistrationButton(event);

    } catch (error) {
        console.error(error);

        detailsCard.hidden = true;
        notFound.hidden = false;
    }
});


async function configureRegistrationButton(event) {
    const button = document.getElementById("register-button");
    const helpText = document.getElementById("registration-help");
    const message = document.getElementById("registration-message");

    const savedUser = sessionStorage.getItem("currentUser");

    const currentUser = savedUser
        ? JSON.parse(savedUser)
        : null;

    if (event.event_status !== "Open") {
        button.disabled = true;

        button.textContent =
            event.event_status === "Full"
                ? "Event Full"
                : "Registration Closed";

        helpText.textContent =
            "Registration is not currently available.";

        return;
    }

    if (!currentUser || currentUser.role !== "student") {
        button.textContent = "Log In to Register";

        button.addEventListener("click", function () {
            window.location.href = "login.html";
        });

        return;
    }

    const userId = currentUser.user_id || currentUser.id;

    try {
        const response = await fetch(
            `/api/registrations/user/${userId}`
        );

        if (response.ok) {
            const registrations = await response.json();

            const existingRegistration = registrations.find(
                registration =>
                    Number(registration.event_id) ===
                        Number(event.event_id) &&
                    registration.registration_status === "Registered"
            );

            if (existingRegistration) {
                button.disabled = true;
                button.textContent = "Registered";

                message.textContent =
                    "You are already registered for this event.";

                return;
            }
        }
    } catch (error) {
        console.error(error);
    }

    button.addEventListener("click", async function () {
        button.disabled = true;

        message.textContent = "Processing registration...";

        try {
            const response = await fetch("/api/registrations", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    userId: userId,
                    eventId: event.event_id
                })
            });

            const result = await response.json();

            if (!response.ok) {
                button.disabled = false;
                message.textContent = result.message;
                return;
            }

            button.textContent = "Registered";

            message.textContent =
                "Registration completed successfully.";

        } catch (error) {
            console.error(error);

            button.disabled = false;

            message.textContent =
                "Could not complete registration.";
        }
    });
}


function formatDetailsDate(dateString) {
    return new Intl.DateTimeFormat("en-CA", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(
        new Date(`${dateString}T00:00:00`)
    );
}


function formatDetailsTime(timeString) {
    const [hours, minutes] =
        timeString.split(":").map(Number);

    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return new Intl.DateTimeFormat("en-CA", {
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}