/*
    Event routes

    Public reads are open to everyone; every management action requires
    an authenticated admin or organizer. The guards run before the
    controller, so an unauthorised request never reaches the database.
*/

const express = require("express");
const eventController = require("../controllers/eventController");
const {
  requireAuthenticated,
  requireRole
} = require("../middleware/auth");

const router = express.Router();

const requireOrganizer = [
  requireAuthenticated,
  requireRole("admin", "organizer")
];

// Public
router.get("/events", eventController.listEvents);

// Management list — must come before /events/:eventId so "manage"
// is not read as an event id
router.get("/events/manage", requireOrganizer, eventController.listManagedEvents);

router.get("/events/:eventId", eventController.getEvent);

// Management actions
router.post("/events", requireOrganizer, eventController.createEvent);
router.put("/events/:eventId", requireOrganizer, eventController.updateEvent);
router.delete("/events/:eventId", requireOrganizer, eventController.deleteEvent);
router.patch("/events/:eventId/status", requireOrganizer, eventController.changeStatus);
router.get(
  "/events/:eventId/registrations",
  requireOrganizer,
  eventController.listEventRegistrations
);

module.exports = router;
