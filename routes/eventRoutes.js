const express = require("express");
const router = express.Router();

const db = require("../database/database");


// GET all events
router.get("/", (req, res) => {
    try {
        const { category, location, date, organizer } = req.query;

        let query = `
            SELECT
                events.*,
                users.full_name AS organizer_name,
                COUNT(registrations.registration_id) AS registration_count
            FROM events
            LEFT JOIN users
                ON events.organizer_id = users.user_id
            LEFT JOIN registrations
                ON events.event_id = registrations.event_id
                AND registrations.registration_status = 'Registered'
            WHERE 1 = 1
        `;

        const params = [];

        if (category) {
            query += " AND events.category = ?";
            params.push(category);
        }

        if (location) {
            query += " AND events.location = ?";
            params.push(location);
        }

        if (date) {
            query += " AND events.event_date = ?";
            params.push(date);
        }

        if (organizer) {
            query += " AND users.full_name = ?";
            params.push(organizer);
        }

        query += `
            GROUP BY events.event_id
            ORDER BY events.event_date ASC, events.start_time ASC
        `;

        const events = db.prepare(query).all(...params);

        res.json(events);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not retrieve events."
        });
    }
});


// GET one event by ID
router.get("/:id", (req, res) => {
    try {
        const eventId = req.params.id;

        const event = db.prepare(`
            SELECT
                events.*,
                users.full_name AS organizer_name,
                COUNT(registrations.registration_id) AS registration_count
            FROM events
            LEFT JOIN users
                ON events.organizer_id = users.user_id
            LEFT JOIN registrations
                ON events.event_id = registrations.event_id
                AND registrations.registration_status = 'Registered'
            WHERE events.event_id = ?
            GROUP BY events.event_id
        `).get(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        res.json(event);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not retrieve event."
        });
    }
});


module.exports = router;