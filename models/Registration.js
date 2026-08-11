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
    eventCategory: row.category || null
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
            e.event_date,
            e.category
       FROM registrations r
       JOIN events e ON e.event_id = r.event_id
      WHERE r.user_id = ?
      ORDER BY e.event_date ASC`
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
  countActive,
  countAttended,
  countByCategory
};
