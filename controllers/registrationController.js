const Event = require("../models/Event");
const Registration = require("../models/Registration");

function getDatabase(req) {
  const db = req.app.locals.db;

  if (!db) {
    const error = new Error("The database connection is not available.");
    error.status = 503;
    throw error;
  }

  return db;
}

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function listMine(req, res) {
  const registrations = await Registration.findByUser(
    getDatabase(req),
    req.session.user.id
  );
  return res.json({ registrations });
}

async function register(req, res) {
  const db = getDatabase(req);
  const eventId = Number(req.params.eventId);

  if (!Number.isInteger(eventId) || eventId < 1) {
    return res.status(400).json({ message: "Invalid event id." });
  }

  const result = Registration.registerForEvent(
    db,
    req.session.user.id,
    eventId,
    todayString()
  );

  const responses = {
    not_found: [404, "Event not found."],
    duplicate: [409, "You are already registered for this event."],
    full: [409, "This event is full."],
    closed: [409, "Registration is not available for this event."],
    past: [409, "You cannot register for a past event."]
  };

  if (result.error) {
    const [status, message] = responses[result.error];
    return res.status(status).json({ message });
  }

  const registration = await Registration.findById(db, result.registrationId);
  const event = await Event.findById(db, eventId);
  return res.status(201).json({
    message: "Registration completed successfully.",
    registration,
    event
  });
}

async function cancel(req, res) {
  const db = getDatabase(req);
  const registrationId = Number(req.params.registrationId);

  if (!Number.isInteger(registrationId) || registrationId < 1) {
    return res.status(400).json({ message: "Invalid registration id." });
  }

  const result = Registration.cancelForUser(
    db,
    registrationId,
    req.session.user.id
  );

  const responses = {
    not_found: [404, "Registration not found."],
    cancelled: [409, "This registration is already cancelled."],
    attendance_recorded: [409, "Attendance has already been recorded for this registration."]
  };

  if (result.error) {
    const [status, message] = responses[result.error];
    return res.status(status).json({ message });
  }

  const registration = await Registration.findById(db, registrationId);
  const event = await Event.findById(db, result.eventId);
  return res.json({
    message: "Registration cancelled successfully.",
    registration,
    event
  });
}

async function getDashboard(req, res) {
  const db = getDatabase(req);
  const registrations = await Registration.findByUser(db, req.session.user.id);
  const events = await Event.findAll(db);
  const today = todayString();
  const activeStatuses = new Set(["Registered", "Attended", "Missed"]);
  const active = registrations.filter(item => activeStatuses.has(item.status));
  const upcoming = registrations.filter(item =>
    item.status === "Registered"
    && item.eventDate >= today
    && !["Cancelled", "Completed", "Disabled"].includes(item.eventStatus)
  );
  const attended = registrations.filter(item => item.status === "Attended");
  const cancelled = registrations.filter(item => item.status === "Cancelled");
  const registeredEventIds = new Set(active.map(item => item.eventId));
  const suggestedEvents = events
    .filter(event =>
      event.eventDate >= today
      && event.status === "Open"
      && !registeredEventIds.has(event.eventId)
    )
    .slice(0, 3);
  const categoryMap = new Map();

  active.forEach(item => {
    categoryMap.set(item.eventCategory, (categoryMap.get(item.eventCategory) || 0) + 1);
  });

  return res.json({
    student: req.session.user,
    statistics: {
      totalRegistered: active.length,
      upcoming: upcoming.length,
      attended: attended.length,
      cancelled: cancelled.length,
      participationRate: active.length > 0
        ? Math.round((attended.length / active.length) * 100)
        : 0
    },
    categoryTotals: Array.from(categoryMap, ([category, count]) => ({ category, count })),
    upcomingEvents: upcoming.slice(0, 3).map(item => ({
      eventId: item.eventId,
      title: item.eventTitle,
      category: item.eventCategory,
      eventDate: item.eventDate,
      startTime: item.eventStartTime,
      endTime: item.eventEndTime,
      location: item.eventLocation,
      status: item.eventStatus
    })),
    suggestedEvents
  });
}

module.exports = {
  listMine,
  register,
  cancel,
  getDashboard
};
