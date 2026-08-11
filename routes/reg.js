const express = require("express");
const router = express.Router();

const db = require("../database/database");
console.log("REGISTRATION ROUTES LOADED");

// REGISTER a student for an event
router.post("/", (req, res) => {
    try {
        const userId = Number(req.body.userId);
        const eventId = Number(req.body.eventId);

        if (!userId || !eventId) {
            return res.status(400).json({
                message: "User ID and event ID are required."
            });
        }

        const event = db.prepare(`
            SELECT *
            FROM events
            WHERE event_id = ?
        `).get(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        // Event must be open
        if (event.event_status !== "Open") {
            return res.status(400).json({
                message: "Registration is not available for this event."
            });
        }

        // Event must not be in the past
        const today = new Date().toISOString().split("T")[0];

        if (event.event_date < today) {
            return res.status(400).json({
                message: "You cannot register for a past event."
            });
        }

        // Count active registrations
        const registrationCount = db.prepare(`
            SELECT COUNT(*) AS total
            FROM registrations
            WHERE event_id = ?
            AND registration_status = 'Registered'
        `).get(eventId).total;

        if (registrationCount >= event.capacity) {
            return res.status(400).json({
                message: "This event is full."
            });
        }

        // Check if this student already has a registration record
        const existingRegistration = db.prepare(`
            SELECT *
            FROM registrations
            WHERE user_id = ?
            AND event_id = ?
        `).get(userId, eventId);

        if (existingRegistration) {

            if (existingRegistration.registration_status === "Registered") {
                return res.status(409).json({
                    message: "You are already registered for this event."
                });
            }

            // Allow re-registration after cancellation
            db.prepare(`
                UPDATE registrations
                SET registration_status = 'Registered',
                    registration_date = CURRENT_TIMESTAMP
                WHERE registration_id = ?
            `).run(existingRegistration.registration_id);

        } else {

            db.prepare(`
                INSERT INTO registrations
                    (user_id, event_id, registration_status)
                VALUES (?, ?, 'Registered')
            `).run(userId, eventId);
        }

        // If the last available seat was taken, mark event full
        if (registrationCount + 1 >= event.capacity) {
            db.prepare(`
                UPDATE events
                SET event_status = 'Full'
                WHERE event_id = ?
            `).run(eventId);
        }

        res.status(201).json({
            message: "Registration completed successfully."
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not complete registration."
        });
    }
});


// GET registrations for one student
router.get("/user/:userId", (req, res) => {
    try {
        const userId = Number(req.params.userId);

        const registrations = db.prepare(`
            SELECT
                registrations.registration_id,
                registrations.registration_date,
                registrations.registration_status,

                events.event_id,
                events.title,
                events.description,
                events.category,
                events.event_date,
                events.start_time,
                events.end_time,
                events.location,
                events.capacity,
                events.event_status

            FROM registrations

            INNER JOIN events
                ON registrations.event_id = events.event_id

            WHERE registrations.user_id = ?

            ORDER BY events.event_date ASC,
                     events.start_time ASC
        `).all(userId);

        res.json(registrations);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not retrieve registrations."
        });
    }
});


// CANCEL a student's registration
router.patch("/:registrationId/cancel", (req, res) => {
    try {
        const registrationId = Number(req.params.registrationId);
        const userId = Number(req.body.userId);

        const registration = db.prepare(`
            SELECT *
            FROM registrations
            WHERE registration_id = ?
            AND user_id = ?
        `).get(registrationId, userId);

        if (!registration) {
            return res.status(404).json({
                message: "Registration not found."
            });
        }

        if (registration.registration_status === "Cancelled") {
            return res.status(400).json({
                message: "Registration is already cancelled."
            });
        }

        db.prepare(`
            UPDATE registrations
            SET registration_status = 'Cancelled'
            WHERE registration_id = ?
        `).run(registrationId);

        // Reopen a Full event because one seat is available again
        db.prepare(`
            UPDATE events
            SET event_status = 'Open'
            WHERE event_id = ?
            AND event_status = 'Full'
        `).run(registration.event_id);

        res.json({
            message: "Registration cancelled successfully."
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not cancel registration."
        });
    }
});


module.exports = router;