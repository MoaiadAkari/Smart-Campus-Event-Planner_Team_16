const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { app } = require("../app");
const db = require("../database/database");

const originalEmail = "integration.test@live.concordia.ca";
const updatedEmail = "integration.updated@live.concordia.ca";

function removeTestUser() {
  db.prepare("DELETE FROM users WHERE email IN (?, ?) COLLATE NOCASE").run(
    originalEmail,
    updatedEmail
  );
}

function getCookie(response) {
  return response.headers.get("set-cookie")?.split(";")[0] || "";
}

async function run() {
  removeTestUser();

  const server = await new Promise((resolve, reject) => {
    const listeningServer = app.listen(0, "127.0.0.1", error => {
      if (error) {
        reject(error);
        return;
      }

      resolve(listeningServer);
    });
    listeningServer.once("error", reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

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

  try {
    const registration = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Integration Student",
        email: originalEmail,
        password: "CampusPass123",
        confirmPassword: "CampusPass123",
        securityQuestion: "What city were you born in?",
        securityAnswer: "Toronto",
        role: "admin"
      })
    });
    assert.equal(registration.response.status, 201);
    assert.equal(registration.body.user.role, "student");

    const storedUser = db.prepare(
      "SELECT password_hash, security_answer_hash FROM users WHERE email = ? COLLATE NOCASE"
    ).get(originalEmail);
    assert.equal(await bcrypt.compare("CampusPass123", storedUser.password_hash), true);
    assert.equal(await bcrypt.compare("toronto", storedUser.security_answer_hash), true);

    const login = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: originalEmail, password: "CampusPass123" })
    });
    assert.equal(login.response.status, 200);
    const studentCookie = getCookie(login.response);

    const profile = await request("/api/profile", {
      headers: { Cookie: studentCookie }
    });
    assert.equal(profile.response.status, 200);
    assert.equal(profile.body.user.email, originalEmail);

    const profileUpdate = await request("/api/profile", {
      method: "PUT",
      headers: { Cookie: studentCookie },
      body: JSON.stringify({
        fullName: "Integration Updated",
        email: updatedEmail
      })
    });
    assert.equal(profileUpdate.response.status, 200);
    assert.equal(profileUpdate.body.user.email, updatedEmail);

    const recovery = await request("/api/auth/recovery/verify", {
      method: "POST",
      body: JSON.stringify({
        email: updatedEmail,
        securityQuestion: "What city were you born in?",
        securityAnswer: "TORONTO"
      })
    });
    assert.equal(recovery.response.status, 200);
    const recoveryCookie = getCookie(recovery.response);

    const reset = await request("/api/auth/recovery/reset", {
      method: "POST",
      headers: { Cookie: recoveryCookie },
      body: JSON.stringify({
        password: "UpdatedPass123",
        confirmPassword: "UpdatedPass123"
      })
    });
    assert.equal(reset.response.status, 200);

    const updatedLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: updatedEmail, password: "UpdatedPass123" })
    });
    assert.equal(updatedLogin.response.status, 200);

    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@demo.com", password: "admin1234" })
    });
    assert.equal(adminLogin.response.status, 200);
    assert.equal(adminLogin.body.user.role, "admin");
    const adminCookie = getCookie(adminLogin.response);

    const adminPage = await request("/admin-dashboard.html", {
      headers: { Cookie: adminCookie }
    });
    const studentProfileApi = await request("/api/profile", {
      headers: { Cookie: adminCookie }
    });
    assert.equal(adminPage.response.status, 200);
    assert.equal(studentProfileApi.response.status, 403);

    console.log("Real SQLite authentication integration passed.");
  } finally {
    removeTestUser();
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
