/*
    Event model

    All SQL for the events table lives here. Controllers call these
    functions instead of writing queries themselves, which keeps the
    database details in one place.

    Registration counts are calculated with SQL COUNT so capacity is
    always derived from the database, never from the browser.
*/

const ACTIVE_REGISTRATION_STATUSES = ["Registered", "Attended", "Missed"];


/*
    Converts a database row (snake_case) into the shape the frontend
    uses (camelCase). Every function returns mapped objects so the
    rest of the application never sees column names.
*/
function mapEvent(row) {
  if (!row) {
    return null;
  }

  const capacity = Number(row.capacity);
  const registeredCount = Number(row.registered_count || 0);
  const attendedCount = Number(row.attended_count || 0);

  return {
    eventId: row.event_id,
    title: row.title,
    description: row.description,
    category: row.category,
    eventDate: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    capacity,
    status: row.event_status,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name || null,

    // Derived on the server (spec: capacity calculations are server-side)
    registeredCount,
    attendedCount,
    seatsRemaining: Math.max(capacity - registeredCount, 0),
    capacityPercentage: capacity > 0
      ? Math.round((registeredCount / capacity) * 100)
      : 0,
    attendanceRate: registeredCount > 0
      ? Math.round((attendedCount / registeredCount) * 100)
      : 0
  };
}


/*
    Shared SELECT used by every read. The two sub-queries attach the
    live registration and attendance counts to each event row.
*/
const SELECT_EVENT = `
  SELECT e.event_id,
         e.title,
         e.description,
         e.category,
         e.event_date,
         e.start_time,
         e.end_time,
         e.location,
         e.capacity,
         e.event_status,
         e.organizer_id,
         u.full_name AS organizer_name,
         (SELECT COUNT(*)
            FROM registrations r
           WHERE r.event_id = e.event_id
             AND r.registration_status IN ('Registered', 'Attended', 'Missed')
         ) AS registered_count,
         (SELECT COUNT(*)
            FROM registrations r
           WHERE r.event_id = e.event_id
             AND r.registration_status = 'Attended'
         ) AS attended_count
    FROM events e
    LEFT JOIN users u ON u.user_id = e.organizer_id
`;


async function findAll(db) {
  const rows = db.prepare(
    `${SELECT_EVENT} ORDER BY e.event_date ASC, e.start_time ASC`
  ).all();

  return rows.map(mapEvent);
}


async function findById(db, eventId) {
  const row = db.prepare(
    `${SELECT_EVENT} WHERE e.event_id = ?`
  ).get(eventId);

  return mapEvent(row);
}


/*
    Events belonging to one organizer. The spec says organizers may
    only manage the events they created, unless they are a global admin.
*/
async function findByOrganizer(db, organizerId) {
  const rows = db.prepare(
    `${SELECT_EVENT}
      WHERE e.organizer_id = ?
      ORDER BY e.event_date ASC, e.start_time ASC`
  ).all(organizerId);

  return rows.map(mapEvent);
}


async function create(db, event) {
  const result = db.prepare(
    `INSERT INTO events
       (title, description, category, event_date, start_time, end_time,
        location, capacity, event_status, organizer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    event.title,
    event.description,
    event.category,
    event.eventDate,
    event.startTime,
    event.endTime,
    event.location,
    event.capacity,
    event.status,
    event.organizerId
  );

  return findById(db, result.lastInsertRowid);
}


async function update(db, eventId, event) {
  db.prepare(
    `UPDATE events
        SET title = ?,
            description = ?,
            category = ?,
            event_date = ?,
            start_time = ?,
            end_time = ?,
            location = ?,
            capacity = ?
      WHERE event_id = ?`
  ).run(
    event.title,
    event.description,
    event.category,
    event.eventDate,
    event.startTime,
    event.endTime,
    event.location,
    event.capacity,
    eventId
  );

  return findById(db, eventId);
}


async function updateStatus(db, eventId, status) {
  const result = db.prepare(
    "UPDATE events SET event_status = ? WHERE event_id = ?"
  ).run(status, eventId);

  if (result.changes === 0) {
    return null;
  }

  return findById(db, eventId);
}


async function remove(db, eventId) {
  const result = db.prepare(
    "DELETE FROM events WHERE event_id = ?"
  ).run(eventId);

  return result.changes > 0;
}


/*
    Number of registrations that occupy a seat. Cancelled registrations
    are excluded so cancelling frees the seat again.
*/
async function countRegistrations(db, eventId) {
  const row = db.prepare(
    `SELECT COUNT(*) AS total
       FROM registrations
      WHERE event_id = ?
        AND registration_status IN ('Registered', 'Attended', 'Missed')`
  ).get(eventId);

  return Number(row.total || 0);
}


module.exports = {
  ACTIVE_REGISTRATION_STATUSES,
  mapEvent,
  findAll,
  findById,
  findByOrganizer,
  create,
  update,
  updateStatus,
  remove,
  countRegistrations
};
