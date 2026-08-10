const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const bcrypt = require("bcrypt");
const { app } = require("../app");

class MemoryDatabase {
  constructor() {
    this.users = [];
    this.nextUserId = 1;
  }

  prepare(sql) {
    return {
      get: (...parameters) => this.get(sql, ...parameters),
      run: (...parameters) => this.run(sql, ...parameters)
    };
  }

  get(sql, ...parameters) {
    const statement = sql.replace(/\s+/g, " ").trim();

    if (statement.includes("email = ? COLLATE NOCASE AND user_id <> ?")) {
      const [email, excludedUserId] = parameters;
      return this.users.find(user => (
        user.email.toLowerCase() === String(email).toLowerCase()
        && user.user_id !== Number(excludedUserId)
      ));
    }

    if (statement.includes("email = ? COLLATE NOCASE")) {
      const [email] = parameters;
      return this.users.find(user => user.email.toLowerCase() === String(email).toLowerCase());
    }

    if (statement.includes("WHERE user_id = ?")) {
      const [userId] = parameters;
      return this.users.find(user => user.user_id === Number(userId));
    }

    throw new Error(`Unsupported get statement: ${statement}`);
  }

  run(sql, ...parameters) {
    const statement = sql.replace(/\s+/g, " ").trim();

    if (statement.startsWith("INSERT INTO users")) {
      const [fullName, email, passwordHash, role, securityQuestion, securityAnswerHash] = parameters;
      const user = {
        user_id: this.nextUserId,
        full_name: fullName,
        email,
        password_hash: passwordHash,
        role,
        security_question: securityQuestion,
        security_answer_hash: securityAnswerHash,
        created_at: new Date().toISOString()
      };

      this.nextUserId += 1;
      this.users.push(user);
      return { lastInsertRowid: user.user_id, changes: 1 };
    }

    if (statement.startsWith("UPDATE users SET full_name")) {
      const [fullName, email, userId] = parameters;
      const user = this.users.find(account => account.user_id === Number(userId));

      if (!user) {
        return { changes: 0 };
      }

      user.full_name = fullName;
      user.email = email;
      return { changes: 1 };
    }

    if (statement.startsWith("UPDATE users SET password_hash")) {
      const [passwordHash, userId] = parameters;
      const user = this.users.find(account => account.user_id === Number(userId));

      if (!user) {
        return { changes: 0 };
      }

      user.password_hash = passwordHash;
      return { changes: 1 };
    }

    throw new Error(`Unsupported run statement: ${statement}`);
  }

  async seedUser(user) {
    const passwordHash = await bcrypt.hash(user.password, 4);
    const securityAnswerHash = await bcrypt.hash(user.securityAnswer.toLowerCase(), 4);

    return this.run(
      "INSERT INTO users",
      user.fullName,
      user.email,
      passwordHash,
      user.role,
      user.securityQuestion,
      securityAnswerHash
    );
  }
}

let server;
let baseUrl;
let database;

function getCookie(response) {
  return response.headers.get("set-cookie")?.split(";")[0] || "";
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return { response, body };
}

before(async () => {
  database = new MemoryDatabase();
  await database.seedUser({
    fullName: "Test Admin",
    email: "admin@concordia.ca",
    password: "AdminPass123",
    role: "admin",
    securityQuestion: "What city were you born in?",
    securityAnswer: "Montreal"
  });
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
  if (!server?.listening) {
    return;
  }

  server.closeAllConnections();
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

test("authentication, recovery, profile and role access", async t => {
  let studentCookie;
  let recoveryCookie;
  let adminCookie;

  await t.test("health endpoint is available", async () => {
    const result = await request("/api/health");
    assert.equal(result.response.status, 200);
    assert.equal(result.body.message, "Server is healthy");
  });

  await t.test("protected student page redirects guests", async () => {
    const result = await request("/student-profile.html");
    assert.equal(result.response.status, 302);
    assert.equal(result.response.headers.get("location"), "/login.html");
  });

  await t.test("registration validates input", async () => {
    const result = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "A",
        email: "invalid",
        password: "short",
        confirmPassword: "different",
        securityQuestion: "Unknown question",
        securityAnswer: ""
      })
    });

    assert.equal(result.response.status, 400);
    assert.equal(Object.keys(result.body.fields).length, 6);
  });

  await t.test("student registers with hashed credentials", async () => {
    const result = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Alice Student",
        email: "alice@live.concordia.ca",
        password: "CampusPass123",
        confirmPassword: "CampusPass123",
        securityQuestion: "What city were you born in?",
        securityAnswer: "Toronto",
        role: "admin"
      })
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body.user.role, "student");
    const storedUser = database.users.find(user => user.email === "alice@live.concordia.ca");
    assert.notEqual(storedUser.password_hash, "CampusPass123");
    assert.notEqual(storedUser.security_answer_hash, "Toronto");
    assert.equal(await bcrypt.compare("CampusPass123", storedUser.password_hash), true);
    assert.equal(await bcrypt.compare("toronto", storedUser.security_answer_hash), true);
  });

  await t.test("duplicate email is rejected", async () => {
    const result = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Alice Again",
        email: "ALICE@live.concordia.ca",
        password: "CampusPass456",
        confirmPassword: "CampusPass456",
        securityQuestion: "What city were you born in?",
        securityAnswer: "Toronto"
      })
    });

    assert.equal(result.response.status, 409);
  });

  await t.test("invalid login is rejected", async () => {
    const result = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "alice@live.concordia.ca",
        password: "WrongPassword"
      })
    });

    assert.equal(result.response.status, 401);
    assert.equal(result.body.message, "Invalid email or password.");
  });

  await t.test("student login creates a session", async () => {
    const result = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "alice@live.concordia.ca",
        password: "CampusPass123"
      })
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.user.role, "student");
    studentCookie = getCookie(result.response);
    assert.match(studentCookie, /^smartCampus\.sid=/);
  });

  await t.test("session and student profile use the logged-in user", async () => {
    const sessionResult = await request("/api/auth/session", {
      headers: { Cookie: studentCookie }
    });
    const profileResult = await request("/api/profile", {
      headers: { Cookie: studentCookie }
    });

    assert.equal(sessionResult.response.status, 200);
    assert.equal(profileResult.response.status, 200);
    assert.equal(profileResult.body.user.email, "alice@live.concordia.ca");
  });

  await t.test("student can update only their profile", async () => {
    const result = await request("/api/profile", {
      method: "PUT",
      headers: { Cookie: studentCookie },
      body: JSON.stringify({
        fullName: "Alice Updated",
        email: "alice.updated@live.concordia.ca"
      })
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.user.fullName, "Alice Updated");
    assert.equal(result.body.user.email, "alice.updated@live.concordia.ca");
  });

  await t.test("student cannot open admin pages", async () => {
    const result = await request("/admin-dashboard.html", {
      headers: { Cookie: studentCookie }
    });

    assert.equal(result.response.status, 302);
    assert.equal(result.response.headers.get("location"), "/student-dashboard.html");
  });

  await t.test("logout destroys the student session", async () => {
    const logoutResult = await request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: studentCookie }
    });
    const sessionResult = await request("/api/auth/session", {
      headers: { Cookie: studentCookie }
    });

    assert.equal(logoutResult.response.status, 204);
    assert.equal(sessionResult.response.status, 401);
  });

  await t.test("incorrect recovery answer is rejected", async () => {
    const result = await request("/api/auth/recovery/verify", {
      method: "POST",
      body: JSON.stringify({
        email: "alice.updated@live.concordia.ca",
        securityQuestion: "What city were you born in?",
        securityAnswer: "Montreal"
      })
    });

    assert.equal(result.response.status, 400);
  });

  await t.test("security answer authorizes one password reset", async () => {
    const verifyResult = await request("/api/auth/recovery/verify", {
      method: "POST",
      body: JSON.stringify({
        email: "alice.updated@live.concordia.ca",
        securityQuestion: "What city were you born in?",
        securityAnswer: "TORONTO"
      })
    });

    assert.equal(verifyResult.response.status, 200);
    recoveryCookie = getCookie(verifyResult.response);

    const pageResult = await request("/reset-password.html", {
      headers: { Cookie: recoveryCookie }
    });
    assert.equal(pageResult.response.status, 200);

    const resetResult = await request("/api/auth/recovery/reset", {
      method: "POST",
      headers: { Cookie: recoveryCookie },
      body: JSON.stringify({
        password: "NewCampusPass123",
        confirmPassword: "NewCampusPass123"
      })
    });
    assert.equal(resetResult.response.status, 200);

    const repeatedReset = await request("/api/auth/recovery/reset", {
      method: "POST",
      headers: { Cookie: recoveryCookie },
      body: JSON.stringify({
        password: "AnotherPass123",
        confirmPassword: "AnotherPass123"
      })
    });
    assert.equal(repeatedReset.response.status, 401);
  });

  await t.test("new password replaces the previous password", async () => {
    const oldPasswordResult = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "alice.updated@live.concordia.ca",
        password: "CampusPass123"
      })
    });
    const newPasswordResult = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "alice.updated@live.concordia.ca",
        password: "NewCampusPass123"
      })
    });

    assert.equal(oldPasswordResult.response.status, 401);
    assert.equal(newPasswordResult.response.status, 200);
  });

  await t.test("admin session is separated from student access", async () => {
    const loginResult = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@concordia.ca",
        password: "AdminPass123"
      })
    });

    adminCookie = getCookie(loginResult.response);
    const adminPage = await request("/admin-dashboard.html", {
      headers: { Cookie: adminCookie }
    });
    const studentPage = await request("/student-profile.html", {
      headers: { Cookie: adminCookie }
    });
    const studentProfileApi = await request("/api/profile", {
      headers: { Cookie: adminCookie }
    });

    assert.equal(loginResult.response.status, 200);
    assert.equal(loginResult.body.user.role, "admin");
    assert.equal(adminPage.response.status, 200);
    assert.equal(studentPage.response.status, 302);
    assert.equal(studentPage.response.headers.get("location"), "/admin-dashboard.html");
    assert.equal(studentProfileApi.response.status, 403);
  });

  await t.test("unknown API route returns JSON 404", async () => {
    const result = await request("/api/unknown");
    assert.equal(result.response.status, 404);
    assert.equal(result.body.message, "API endpoint not found.");
  });
});
