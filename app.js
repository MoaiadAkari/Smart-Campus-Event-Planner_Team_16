const express = require("express");
const path = require("path");
const session = require("express-session");
const db = require("./database/database");
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const adminRoutes = require("./routes/adminRoutes");
const {
  requirePageRole,
  requirePasswordResetPage
} = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

app.locals.db = db;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: "smartCampus.sid",
  secret: process.env.SESSION_SECRET || "smart-campus-development-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use("/public", express.static(path.join(__dirname, "public")));

const studentPages = [
  "/student-dashboard.html",
  "/student-profile.html",
  "/my-registrations.html"
];
const adminPages = [
  "/admin-dashboard.html",
  "/create-event.html",
  "/edit-event.html",
  "/manage-events.html"
];

app.get(studentPages, requirePageRole("student"));
app.get(adminPages, requirePageRole("admin", "organizer"));
app.get("/reset-password.html", requirePasswordResetPage);
app.use(express.static(path.join(__dirname, "views")));
app.use("/api", authRoutes);
app.use("/api", eventRoutes);
app.use("/api", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({ message: "Server is healthy" });
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API endpoint not found." });
  }

  return res.status(404).send("Page not found.");
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number(error.status) || 500;
  const message = status >= 500 ? "An unexpected server error occurred." : error.message;
  return res.status(status).json({ message });
});

function startServer() {
  return app.listen(PORT, HOST, error => {
    if (error) {
      throw error;
    }

    console.log(`Server is running on http://${HOST}:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
