/*
    Admin controller

    Attendance marking and the statistics shown on the admin dashboard.

    Every number here is calculated from the database with SQL, never
    sent up from the browser, which is what the spec requires for
    capacity and participation figures.
*/

const Event = require("../models/Event");
const Registration = require("../models/Registration");

const ATTENDANCE_STATUSES = ["Attended", "Missed", "Registered"];


function getDatabase(req) {
  const db = req.app.locals.db;

  if (!db) {
    const error = new Error("The database connection is not available.");
    error.status = 503;
    throw error;
  }

  return db;
}


/* --------------------------------------------------
   Attendance
-------------------------------------------------- */

/*
    Marks one student as Attended or Missed for an event.

    Rules enforced here:
      - the registration must exist
      - the signed-in user must manage that event
      - a cancelled registration cannot be marked
*/
async function markAttendance(req, res) {
  const db = getDatabase(req);
  const registrationId = Number(req.params.registrationId);

  if (!Number.isInteger(registrationId)) {
    return res.status(400).json({ message: "Invalid registration id." });
  }

  const status = String(req.body.status || "").trim();

  if (!ATTENDANCE_STATUSES.includes(status)) {
    return res.status(400).json({
      message: "Attendance must be Attended, Missed, or Registered.",
      fields: { status: "Unknown attendance status." }
    });
  }

  const registration = await Registration.findById(db, registrationId);

  if (!registration) {
    return res.status(404).json({ message: "Registration not found." });
  }

  const event = await Event.findById(db, registration.eventId);

  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  const user = req.session.user;

  if (user.role !== "admin" && event.organizerId !== user.id) {
    return res.status(403).json({
      message: "You can only manage registrations for events that you organize."
    });
  }

  if (registration.status === "Cancelled") {
    return res.status(409).json({
      message: "This registration was cancelled and cannot be marked."
    });
  }

  const updated = await Registration.updateStatus(db, registrationId, status);

  // Return the refreshed event so the dashboard can update its figures
  const refreshedEvent = await Event.findById(db, registration.eventId);

  return res.json({
    message: status === "Attended"
      ? "Student marked as attended."
      : status === "Missed"
        ? "Student marked as absent."
        : "Attendance cleared.",
    registration: updated,
    event: refreshedEvent
  });
}


/* --------------------------------------------------
   Statistics
-------------------------------------------------- */

/*
    Everything the admin dashboard needs, in one request:

      totals            — events, registrations, events at capacity, attended
      categoryTotals    — registrations per category, highest first
      popularCategory   — the category with the most registrations
      events            — each event with its own counts and percentages
*/
async function getStatistics(req, res) {
  const db = getDatabase(req);
  const user = req.session.user;

  // Admins see the whole system; organizers see only their own events
  const events = user.role === "admin"
    ? await Event.findAll(db)
    : await Event.findByOrganizer(db, user.id);

  const categoryTotals = await Registration.countByCategory(db);

  /*
      For an organizer, the system-wide totals would be misleading,
      so registrations are summed from their own events instead.
  */
  const totalRegistrations = user.role === "admin"
    ? await Registration.countActive(db)
    : events.reduce((sum, event) => sum + event.registeredCount, 0);

  const totalAttended = user.role === "admin"
    ? await Registration.countAttended(db)
    : events.reduce((sum, event) => sum + event.attendedCount, 0);

  const eventsAtCapacity = events.filter(
    event => event.capacity > 0 && event.registeredCount >= event.capacity
  ).length;

  const cancelledEvents = events.filter(
    event => event.status === "Cancelled"
  ).length;

  const upcomingEvents = events.filter(
    event => event.eventDate >= todayString() &&
      event.status !== "Cancelled" &&
      event.status !== "Disabled"
  ).length;

  // Overall attendance rate across every counted registration
  const attendanceRate = totalRegistrations > 0
    ? Math.round((totalAttended / totalRegistrations) * 100)
    : 0;

  return res.json({
    totals: {
      totalEvents: events.length,
      totalRegistrations,
      totalAttended,
      eventsAtCapacity,
      cancelledEvents,
      upcomingEvents,
      attendanceRate
    },
    categoryTotals,
    popularCategory: categoryTotals.length > 0
      ? categoryTotals[0].category
      : null,
    events
  });
}


/*
    Every event together with its registration list, so the dashboard
    can draw its per-event panels from a single request instead of one
    request per event.
*/
async function getDashboard(req, res) {
  const db = getDatabase(req);
  const user = req.session.user;

  const events = user.role === "admin"
    ? await Event.findAll(db)
    : await Event.findByOrganizer(db, user.id);

  const eventsWithRegistrations = [];

  for (const event of events) {
    const registrations = await Registration.findByEvent(db, event.eventId);

    eventsWithRegistrations.push({ ...event, registrations });
  }

  return res.json({ events: eventsWithRegistrations });
}


function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}


module.exports = {
  ATTENDANCE_STATUSES,
  markAttendance,
  getStatistics,
  getDashboard
};
