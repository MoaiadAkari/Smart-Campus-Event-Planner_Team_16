const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { after, before, test } = require("node:test");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const { app } = require("../app");

let server;
let baseUrl;
let database;
let openEventId;
let cancelledEventId;
let pastEventId;

function dateFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function createClient() {
  let cookie = "";

  return async function request(pathname, options = {}) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      redirect: "manual",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.headers || {})
      }
    });
    const setCookie = response.headers.get("set-cookie");

    if (setCookie) {
      cookie = setCookie.split(";")[0];
    }

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    return { response, body };
  };
}

function insertUser(fullName, email, password, role) {
  return Number(database.prepare(
    `INSERT INTO users
       (full_name, email, password_hash, role, security_question, security_answer_hash)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    fullName,
    email,
    bcrypt.hashSync(password, 4),
    role,
    "What city were you born in?",
    bcrypt.hashSync("montreal", 4)
  ).lastInsertRowid);
}

function insertEvent(title, date, status, capacity = 10) {
  return Number(database.prepare(
    `INSERT INTO events
       (title, description, category, event_date, start_time, end_time,
        location, capacity, event_status, organizer_id)
     VALUES (?, ?, ?, ?, '10:00', '12:00', ?, ?, ?, ?)`
  ).run(
    title,
    `${title} description`,
    "Career",
    date,
    "Test Campus",
    capacity,
    status,
    1
  ).lastInsertRowid);
}

before(async () => {
  database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  database.exec(fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8"));
  insertUser("Test Admin", "admin@test.ca", "AdminPass123", "admin");
  insertUser("Student One", "one@test.ca", "StudentPass123", "student");
  insertUser("Student Two", "two@test.ca", "StudentPass123", "student");
  openEventId = insertEvent("One Seat Workshop", dateFromToday(5), "Open", 1);
  cancelledEventId = insertEvent("Cancelled Workshop", dateFromToday(6), "Cancelled");
  pastEventId = insertEvent("Past Workshop", dateFromToday(-2), "Open");
  app.locals.db = database;
  server = await new Promise((resolve, reject) => {
    const listeningServer = app.listen(0, "127.0.0.1", error => {
      if (error) {
        reject(error);
        return;
      }
      resolve(listeningServer);
    });
    listeningServer.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
  database.close();
});

test("student registrations and admin event management", async t => {
  const guest = createClient();
  const studentOne = createClient();
  const studentTwo = createClient();
  const admin = createClient();
  let registrationId;
  let createdEventId;

  await t.test("public events come from the database and support filters", async () => {
    const result = await guest(`/api/events?category=Career&date=${dateFromToday(5)}&organizer=Test`);
    assert.equal(result.response.status, 200);
    assert.equal(result.body.events.length, 1);
    assert.equal(result.body.events[0].title, "One Seat Workshop");
  });

  await t.test("guests cannot register", async () => {
    const result = await guest(`/api/events/${openEventId}/registrations`, { method: "POST" });
    assert.equal(result.response.status, 401);
  });

  await t.test("student login creates an authorized registration session", async () => {
    const result = await studentOne("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "one@test.ca", password: "StudentPass123" })
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.user.role, "student");
  });

  await t.test("student registers and the server marks a full event", async () => {
    const result = await studentOne(`/api/events/${openEventId}/registrations`, { method: "POST" });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.event.status, "Full");
    assert.equal(result.body.event.registeredCount, 1);
    registrationId = result.body.registration.registrationId;
  });

  await t.test("duplicate registrations are rejected", async () => {
    const result = await studentOne(`/api/events/${openEventId}/registrations`, { method: "POST" });
    assert.equal(result.response.status, 409);
    assert.match(result.body.message, /already registered/i);
  });

  await t.test("student sees only their database registrations and dashboard", async () => {
    const registrationsResult = await studentOne("/api/registrations");
    const dashboardResult = await studentOne("/api/student/dashboard");
    assert.equal(registrationsResult.response.status, 200);
    assert.equal(registrationsResult.body.registrations.length, 1);
    assert.equal(dashboardResult.response.status, 200);
    assert.equal(dashboardResult.body.statistics.totalRegistered, 1);
  });

  await t.test("students cannot create events", async () => {
    const result = await studentOne("/api/events", {
      method: "POST",
      body: JSON.stringify({})
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("another student cannot take a full seat or cancel another record", async () => {
    await studentTwo("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "two@test.ca", password: "StudentPass123" })
    });
    const fullResult = await studentTwo(`/api/events/${openEventId}/registrations`, { method: "POST" });
    const cancelResult = await studentTwo(`/api/registrations/${registrationId}/cancel`, { method: "PATCH" });
    assert.equal(fullResult.response.status, 409);
    assert.match(fullResult.body.message, /full/i);
    assert.equal(cancelResult.response.status, 404);
  });

  await t.test("cancelled and past events reject registration", async () => {
    const cancelledResult = await studentOne(`/api/events/${cancelledEventId}/registrations`, { method: "POST" });
    const pastResult = await studentOne(`/api/events/${pastEventId}/registrations`, { method: "POST" });
    assert.equal(cancelledResult.response.status, 409);
    assert.equal(pastResult.response.status, 409);
  });

  await t.test("a student can cancel only their active registration", async () => {
    const result = await studentOne(`/api/registrations/${registrationId}/cancel`, { method: "PATCH" });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.registration.status, "Cancelled");
    assert.equal(result.body.event.status, "Open");
  });

  await t.test("the freed seat can be registered by another student", async () => {
    const result = await studentTwo(`/api/events/${openEventId}/registrations`, { method: "POST" });
    assert.equal(result.response.status, 201);
    registrationId = result.body.registration.registrationId;
  });

  await t.test("admin login and server validation protect event creation", async () => {
    const loginResult = await admin("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@test.ca", password: "AdminPass123" })
    });
    const invalidResult = await admin("/api/events", {
      method: "POST",
      body: JSON.stringify({
        title: "Invalid Event",
        description: "",
        category: "Career",
        eventDate: dateFromToday(-1),
        startTime: "12:00",
        endTime: "11:00",
        location: "Campus",
        capacity: 0
      })
    });
    assert.equal(loginResult.response.status, 200);
    assert.equal(invalidResult.response.status, 400);
    assert.ok(invalidResult.body.fields.eventDate);
    assert.ok(invalidResult.body.fields.endTime);
    assert.ok(invalidResult.body.fields.capacity);
  });

  await t.test("admin creates, edits and manages a database event", async () => {
    const createResult = await admin("/api/events", {
      method: "POST",
      body: JSON.stringify({
        title: "Submission Workshop",
        description: "Final project preparation",
        category: "Academic",
        eventDate: dateFromToday(8),
        startTime: "13:00",
        endTime: "14:00",
        location: "Library",
        capacity: 25
      })
    });
    assert.equal(createResult.response.status, 201);
    createdEventId = createResult.body.event.eventId;

    const updateResult = await admin(`/api/events/${createdEventId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: "Updated Submission Workshop",
        description: "Final project preparation",
        category: "Academic",
        eventDate: dateFromToday(8),
        startTime: "13:00",
        endTime: "15:00",
        location: "Library Room 2",
        capacity: 30
      })
    });
    const manageResult = await admin("/api/events/manage");
    assert.equal(updateResult.response.status, 200);
    assert.equal(updateResult.body.event.title, "Updated Submission Workshop");
    assert.ok(manageResult.body.events.some(event => event.eventId === createdEventId));
  });

  await t.test("admin views students and records attendance", async () => {
    const listResult = await admin(`/api/events/${openEventId}/registrations`);
    assert.equal(listResult.response.status, 200);
    assert.equal(listResult.body.registrations.length, 2);

    const attendanceResult = await admin(`/api/admin/registrations/${registrationId}/attendance`, {
      method: "PATCH",
      body: JSON.stringify({ status: "Attended" })
    });
    assert.equal(attendanceResult.response.status, 200);
    assert.equal(attendanceResult.body.registration.status, "Attended");
  });

  await t.test("admin statistics are calculated from database records", async () => {
    const result = await admin("/api/admin/statistics");
    assert.equal(result.response.status, 200);
    assert.ok(result.body.totals.totalEvents >= 4);
    assert.equal(result.body.totals.totalAttended, 1);
    assert.equal(result.body.popularCategory, "Career");
  });

  await t.test("admin changes event status and deletes the event", async () => {
    const statusResult = await admin(`/api/events/${createdEventId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "Cancelled" })
    });
    assert.equal(statusResult.response.status, 200);
    assert.equal(statusResult.body.event.status, "Cancelled");

    const deleteResult = await admin(`/api/events/${createdEventId}`, { method: "DELETE" });
    assert.equal(deleteResult.response.status, 200);
    const getResult = await admin(`/api/events/${createdEventId}`);
    assert.equal(getResult.response.status, 404);
  });
});
