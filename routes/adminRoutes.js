/*
    Admin routes

    Statistics and attendance marking. Every route here requires an
    authenticated admin or organizer.
*/

const express = require("express");
const adminController = require("../controllers/adminController");
const {
  requireAuthenticated,
  requireRole
} = require("../middleware/auth");

const router = express.Router();

const requireOrganizer = [
  requireAuthenticated,
  requireRole("admin", "organizer")
];

router.get("/admin/statistics", requireOrganizer, adminController.getStatistics);
router.get("/admin/dashboard", requireOrganizer, adminController.getDashboard);
router.patch(
  "/admin/registrations/:registrationId/attendance",
  requireOrganizer,
  adminController.markAttendance
);

module.exports = router;
