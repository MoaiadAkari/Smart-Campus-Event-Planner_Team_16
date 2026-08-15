/*
    Registration model

    All SQL for the registrations table. Attendance is stored inside
    registration_status, which the schema already allows:

      Registered — signed up, attendance not yet marked
      Attended   — marked present by an organizer
      Missed     — marked absent by an organizer
      Cancelled  — the student cancelled; the seat is freed

    The schema has UNIQUE (user_id, event_id), so a student physically
    cannot hold two rows for the same event.
*/

const ACTIVE_STATUSES = ["Registered", "Attended", "Missed"];


function mapRegistration(row) {
  if (!row) {
    return null;
  }

  return {
    registrationId: row.registration_id,
    userId: row.user_id,
    eventId: row.event_id,
    registrationDate: row.registration_date,
    status: row.registration_status,
    attended: row.registration_status === "Attended",

    // Present when the query joins the users table
    studentName: row.full_name || null,
    studentEmail: row.email || null,

    // Present when the query joins the events table
    eventTitle: row.title || null,
    eventDate: row.event_date || null,
    eventCategory: row.category || null,
    eventDescription: row.description || null,
    eventStartTime: row.start_time || null,
    eventEndTime: row.end_time || null,
    eventLocation: row.location || null,
    eventCapacity: Number(row.capacity || 0),
    eventStatus: row.event_status || null,
    organizerName: row.organizer_name || null
  };
}


/*
    Every registration for one event, including the student's details,
    so the admin can see who signed up.
*/
async function findByEvent(db, eventId) {
  const rows = db.prepare(
    `SELECT r.registration_id,
            r.user_id,
            r.event_id,
            r.registration_date,
            r.registration_status,
            u.full_name,
            u.email
       FROM registrations r
       JOIN users u ON u.user_id = r.user_id
      WHERE r.event_id = ?
      ORDER BY u.full_name ASC`
  ).all(eventId);

  return rows.map(mapRegistration);
}


/*
    Every registration for one student, with event details attached.
    Used by the student's My Registrations page.
*/
async function findByUser(db, userId) {
  const rows = db.prepare(
    `SELECT r.registration_id,
            r.user_id,
            r.event_id,
            r.registration_date,
            r.registration_status,
            e.title,
            e.description,
            e.event_date,
            e.start_time,
            e.end_time,
            e.location,
            e.capacity,
            e.event_status,
            e.category,
            u.full_name AS organizer_name
       FROM registrations r
       JOIN events e ON e.event_id = r.event_id
       LEFT JOIN users u ON u.user_id = e.organizer_id
      WHERE r.user_id = ?
      ORDER BY e.event_date ASC, e.start_time ASC`
  ).all(userId);

  return rows.map(mapRegistration);
}


async function findById(db, registrationId) {
  const row = db.prepare(
    `SELECT registration_id, user_id, event_id, registration_date, registration_status
       FROM registrations
      WHERE registration_id = ?`
  ).get(registrationId);

  return mapRegistration(row);
}


async function updateStatus(db, registrationId, status) {
  const result = db.prepare(
    "UPDATE registrations SET registration_status = ? WHERE registration_id = ?"
  ).run(status, registrationId);

  if (result.changes === 0) {
    return null;
  }

  return findById(db, registrationId);
}

function registerForEvent(db, userId, eventId, today) {
  return db.transaction(() => {
    const event = db.prepare(
      `SELECT event_id, capacity, event_date, event_status
         FROM events
        WHERE event_id = ?`
    ).get(eventId);

    if (!event) {
      return { error: "not_found" };
    }

    const existing = db.prepare(
      `SELECT registration_id, registration_status
         FROM registrations
        WHERE user_id = ? AND event_id = ?`
    ).get(userId, eventId);

    if (existing && existing.registration_status !== "Cancelled") {
      return { error: "duplicate" };
    }

    if (event.event_status !== "Open") {
      return { error: event.event_status === "Full" ? "full" : "closed" };
    }

    if (event.event_date < today) {
      return { error: "past" };
    }

    const count = db.prepare(
      `SELECT COUNT(*) AS total
         FROM registrations
        WHERE event_id = ?
          AND registration_status IN ('Registered', 'Attended', 'Missed')`
    ).get(eventId).total;

    if (Number(count) >= Number(event.capacity)) {
      return { error: "full" };
    }

    let registrationId;

    if (existing) {
      db.prepare(
        `UPDATE registrations
            SET registration_status = 'Registered',
                registration_date = CURRENT_TIMESTAMP
          WHERE registration_id = ?`
      ).run(existing.registration_id);
      registrationId = existing.registration_id;
    } else {
      const result = db.prepare(
        `INSERT INTO registrations
           (user_id, event_id, registration_date, registration_status)
         VALUES (?, ?, CURRENT_TIMESTAMP, 'Registered')`
      ).run(userId, eventId);
      registrationId = Number(result.lastInsertRowid);
    }

    if (Number(count) + 1 >= Number(event.capacity)) {
      db.prepare(
        "UPDATE events SET event_status = 'Full' WHERE event_id = ?"
      ).run(eventId);
    }

    return { registrationId };
  })();
}

function cancelForUser(db, registrationId, userId) {
  return db.transaction(() => {
    const registration = db.prepare(
      `SELECT r.registration_id,
              r.event_id,
              r.registration_status,
              e.event_status
         FROM registrations r
         JOIN events e ON e.event_id = r.event_id
        WHERE r.registration_id = ? AND r.user_id = ?`
    ).get(registrationId, userId);

    if (!registration) {
      return { error: "not_found" };
    }

    if (registration.registration_status === "Cancelled") {
      return { error: "cancelled" };
    }

    if (registration.registration_status !== "Registered") {
      return { error: "attendance_recorded" };
    }

    db.prepare(
      "UPDATE registrations SET registration_status = 'Cancelled' WHERE registration_id = ?"
    ).run(registrationId);

    if (registration.event_status === "Full") {
      db.prepare(
        "UPDATE events SET event_status = 'Open' WHERE event_id = ?"
      ).run(registration.event_id);
    }

    return { eventId: registration.event_id };
  })();
}


/* --------------------------------------------------
   Statistics used by the admin dashboard
-------------------------------------------------- */

/*
    Total registrations that still occupy a seat across all events.
*/
async function countActive(db) {
  const row = db.prepare(
    `SELECT COUNT(*) AS total
       FROM registrations
      WHERE registration_status IN ('Registered', 'Attended', 'Missed')`
  ).get();

  return Number(row.total || 0);
}


async function countAttended(db) {
  const row = db.prepare(
    `SELECT COUNT(*) AS total
       FROM registrations
      WHERE registration_status = 'Attended'`
  ).get();

  return Number(row.total || 0);
}


/*
    Registrations grouped by event category, highest first.
    The first row is therefore the most popular category.
*/
async function countByCategory(db) {
  const rows = db.prepare(
    `SELECT e.category AS category,
            COUNT(*) AS total
       FROM registrations r
       JOIN events e ON e.event_id = r.event_id
      WHERE r.registration_status IN ('Registered', 'Attended', 'Missed')
      GROUP BY e.category
      ORDER BY total DESC, e.category ASC`
  ).all();

  return rows.map(row => ({
    category: row.category,
    count: Number(row.total)
  }));
}


module.exports = {
  ACTIVE_STATUSES,
  mapRegistration,
  findByEvent,
  findByUser,
  findById,
  updateStatus,
  registerForEvent,
  cancelForUser,
  countActive,
  countAttended,
  countByCategory
};
