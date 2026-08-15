const express = require("express");
const registrationController = require("../controllers/registrationController");
const { requireAuthenticated, requireRole } = require("../middleware/auth");

const router = express.Router();
const requireStudent = [requireAuthenticated, requireRole("student")];

router.get("/registrations", requireStudent, registrationController.listMine);
router.post(
  "/events/:eventId/registrations",
  requireStudent,
  registrationController.register
);
router.patch(
  "/registrations/:registrationId/cancel",
  requireStudent,
  registrationController.cancel
);
router.get("/student/dashboard", requireStudent, registrationController.getDashboard);

module.exports = router;
