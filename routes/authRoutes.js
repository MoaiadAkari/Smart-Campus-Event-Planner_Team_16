const express = require("express");
const authController = require("../controllers/authController");
const {
  requireAuthenticated,
  requireRole,
  requirePasswordReset
} = require("../middleware/auth");

const router = express.Router();

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/logout", authController.logout);
router.get("/auth/session", authController.getSession);
router.post("/auth/recovery/verify", authController.verifyRecovery);
router.post("/auth/recovery/reset", requirePasswordReset, authController.resetPassword);
router.get(
  "/profile",
  requireAuthenticated,
  requireRole("student"),
  authController.getProfile
);
router.put(
  "/profile",
  requireAuthenticated,
  requireRole("student"),
  authController.updateProfile
);

module.exports = router;
