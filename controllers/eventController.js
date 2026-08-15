/*
    Event controller

    Handles event listing and the organizer/admin management actions:
    create, edit, delete, and status changes (cancel / disable / enable).

    Every rule is enforced here on the server. The browser also checks
    some of them for a better experience, but these checks are the ones
    that actually protect the data.
*/

const Event = require("../models/Event");
const Registration = require("../models/Registration");

const CATEGORIES = [
  "Academic",
  "Career",
  "Club Activity",
  "Sports",
  "Cultural",
  "Volunteering",
  "Social",
  "Guest Lecture",
  "Networking",
  "Other"
];

const STATUSES = ["Open", "Full", "Cancelled", "Completed", "Disabled"];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const MAX_CAPACITY = 10000;


function getDatabase(req) {
  const db = req.app.locals.db;

  if (!db) {
    const error = new Error("The database connection is not available.");
    error.status = 503;
    throw error;
  }

  return db;
}


function isAdmin(user) {
  return user.role === "admin" || user.role === "organizer";
}


/*
    Today's date as YYYY-MM-DD, used to reject events in the past.
*/
function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}


/* --------------------------------------------------
   Server-side validation
-------------------------------------------------- */

/*
    Checks every event field and returns a fields object describing
    what is wrong. An empty object means the event is valid.

    allowPastDate is used when editing an existing event, so an
    organizer can still correct the title of an event that already
    happened without being blocked by the past-date rule.
*/
function validateEvent(body, { allowPastDate = false } = {}) {
  const fields = {};

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const category = String(body.category || "").trim();
  const eventDate = String(body.eventDate || "").trim();
  const startTime = String(body.startTime || "").trim();
  const endTime = String(body.endTime || "").trim();
  const location = String(body.location || "").trim();
  const capacityRaw = body.capacity;

  if (title.length < 3) {
    fields.title = "Event title must be at least 3 characters.";
  } else if (title.length > 120) {
    fields.title = "Event title must be 120 characters or fewer.";
  }

  if (description.length > 1000) {
    fields.description = "Description must be 1000 characters or fewer.";
  }

  if (!CATEGORIES.includes(category)) {
    fields.category = "Please choose a valid category.";
  }

  if (!DATE_PATTERN.test(eventDate) || Number.isNaN(Date.parse(eventDate))) {
    fields.eventDate = "Please enter a valid date.";
  } else if (!allowPastDate && eventDate < today()) {
    fields.eventDate = "Event date cannot be in the past.";
  }

  if (!TIME_PATTERN.test(startTime)) {
    fields.startTime = "Please enter a valid start time.";
  }

  if (!TIME_PATTERN.test(endTime)) {
    fields.endTime = "Please enter a valid end time.";
  }

  // Only compare times when both are well formed
  if (!fields.startTime && !fields.endTime && endTime <= startTime) {
    fields.endTime = "End time must be after the start time.";
  }

  if (location.length < 2) {
    fields.location = "Please enter the event location.";
  }

  const capacity = Number(capacityRaw);

  if (!Number.isInteger(capacity) || capacity < 1) {
    fields.capacity = "Capacity must be a whole number of at least 1.";
  } else if (capacity > MAX_CAPACITY) {
    fields.capacity = `Capacity must be ${MAX_CAPACITY} or fewer.`;
  }

  return {
    fields,
    values: {
      title,
      description,
      category,
      eventDate,
      startTime,
      endTime,
      location,
      capacity
    }
  };
}


/* --------------------------------------------------
   Read endpoints
-------------------------------------------------- */

/*
    All events. Available to everyone, including logged-out visitors,
    because the events list is a public page.
*/
async function listEvents(req, res) {
  const db = getDatabase(req);
  const allEvents = await Event.findAll(db);
  const search = String(req.query.search || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim();
  const date = String(req.query.date || "").trim();
  const location = String(req.query.location || "").trim().toLowerCase();
  const organizer = String(req.query.organizer || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim();
  const events = allEvents.filter(event => {
    const searchable = [
      event.title,
      event.description,
      event.location,
      event.organizerName
    ].join(" ").toLowerCase();

    return (!search || searchable.includes(search))
      && (!category || event.category === category)
      && (!date || event.eventDate === date)
      && (!location || event.location.toLowerCase().includes(location))
      && (!organizer || String(event.organizerName || "").toLowerCase().includes(organizer))
      && (!status || event.status === status);
  });

  return res.json({ events, categories: CATEGORIES });
}


async function getEvent(req, res) {
  const db = getDatabase(req);
  const event = await Event.findById(db, Number(req.params.eventId));

  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  return res.json({ event });
}


/*
    Events the signed-in organizer manages. A global admin sees all
    events; anyone else sees only their own.
*/
async function listManagedEvents(req, res) {
  const db = getDatabase(req);
  const user = req.session.user;

  const events = user.role === "admin"
    ? await Event.findAll(db)
    : await Event.findByOrganizer(db, user.id);

  return res.json({ events, categories: CATEGORIES });
}


/* --------------------------------------------------
   Create / update / delete
-------------------------------------------------- */

async function createEvent(req, res) {
  const db = getDatabase(req);
  const validation = validateEvent(req.body);

  if (Object.keys(validation.fields).length > 0) {
    return res.status(400).json({
      message: "Please correct the highlighted fields.",
      fields: validation.fields
    });
  }

  const event = await Event.create(db, {
    ...validation.values,
    status: "Open",
    organizerId: req.session.user.id
  });

  return res.status(201).json({
    message: "Event created successfully.",
    event
  });
}


/*
    Loads an event and confirms the signed-in user is allowed to
    manage it. Returns null after sending a response when not.
*/
async function loadManageableEvent(req, res) {
  const db = getDatabase(req);
  const eventId = Number(req.params.eventId);

  if (!Number.isInteger(eventId)) {
    res.status(400).json({ message: "Invalid event id." });
    return null;
  }

  const event = await Event.findById(db, eventId);

  if (!event) {
    res.status(404).json({ message: "Event not found." });
    return null;
  }

  const user = req.session.user;

  // Organizers may only touch their own events; admins may touch any
  if (user.role !== "admin" && event.organizerId !== user.id) {
    res.status(403).json({
      message: "You can only manage events that you organize."
    });
    return null;
  }

  return event;
}


async function updateEvent(req, res) {
  const db = getDatabase(req);
  const existing = await loadManageableEvent(req, res);

  if (!existing) {
    return undefined;
  }

  const validation = validateEvent(req.body, { allowPastDate: true });

  if (Object.keys(validation.fields).length > 0) {
    return res.status(400).json({
      message: "Please correct the highlighted fields.",
      fields: validation.fields
    });
  }

  // Capacity may not drop below the number of students already registered
  const registeredCount = await Event.countRegistrations(db, existing.eventId);

  if (validation.values.capacity < registeredCount) {
    return res.status(400).json({
      message: "Please correct the highlighted fields.",
      fields: {
        capacity: `Capacity cannot be lower than the ${registeredCount} students already registered.`
      }
    });
  }

  const event = await Event.update(db, existing.eventId, validation.values);

  return res.json({
    message: "Event updated successfully.",
    event
  });
}


async function deleteEvent(req, res) {
  const db = getDatabase(req);
  const existing = await loadManageableEvent(req, res);

  if (!existing) {
    return undefined;
  }

  await Event.remove(db, existing.eventId);

  return res.json({ message: "Event deleted successfully." });
}


/*
    Cancel, disable, enable, or complete an event.

    Enabling recalculates whether the event should be Open or Full
    based on the current registration count, so an event never comes
    back as Open when it is already at capacity.
*/
async function changeStatus(req, res) {
  const db = getDatabase(req);
  const existing = await loadManageableEvent(req, res);

  if (!existing) {
    return undefined;
  }

  const requested = String(req.body.status || "").trim();

  if (!STATUSES.includes(requested)) {
    return res.status(400).json({
      message: "Please choose a valid event status.",
      fields: { status: "Unknown event status." }
    });
  }

  let nextStatus = requested;

  if (requested === "Open") {
    const registeredCount = await Event.countRegistrations(db, existing.eventId);
    nextStatus = registeredCount >= existing.capacity ? "Full" : "Open";
  }

  const event = await Event.updateStatus(db, existing.eventId, nextStatus);

  return res.json({
    message: `Event status changed to ${nextStatus}.`,
    event
  });
}


/* --------------------------------------------------
   Registrations for one event (admin view)
-------------------------------------------------- */

async function listEventRegistrations(req, res) {
  const db = getDatabase(req);
  const event = await loadManageableEvent(req, res);

  if (!event) {
    return undefined;
  }

  const registrations = await Registration.findByEvent(db, event.eventId);

  return res.json({ event, registrations });
}


module.exports = {
  CATEGORIES,
  STATUSES,
  validateEvent,
  isAdmin,
  listEvents,
  getEvent,
  listManagedEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  changeStatus,
  listEventRegistrations
};
