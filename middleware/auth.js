function requireAuthenticated(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  next();
}

function requireRole(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }

    next();
  };
}

function requirePageRole(...roles) {
  return function pageRoleMiddleware(req, res, next) {
    const user = req.session?.user;

    if (!user) {
      return res.redirect("/login.html");
    }

    if (!roles.includes(user.role)) {
      const destination = user.role === "admin" || user.role === "organizer"
        ? "/admin-dashboard.html"
        : "/student-dashboard.html";
      return res.redirect(destination);
    }

    next();
  };
}

function requirePasswordReset(req, res, next) {
  if (!req.session?.passwordResetUserId) {
    return res.status(401).json({ message: "Verify your account before resetting the password." });
  }

  next();
}

function requirePasswordResetPage(req, res, next) {
  if (!req.session?.passwordResetUserId) {
    return res.redirect("/forgot-password.html");
  }

  next();
}

module.exports = {
  requireAuthenticated,
  requireRole,
  requirePageRole,
  requirePasswordReset,
  requirePasswordResetPage
};
