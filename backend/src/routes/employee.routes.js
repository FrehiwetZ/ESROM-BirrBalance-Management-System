import express from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { ROLES } from "../config/constants.js";
import {
  getProfile,
  getBalance,
  getOrders,
  getNotifications,
  markNotificationRead,
  generateQR,
  createOnlineOrder,
  createFeedback,
  listCafes,
  listAvailableMenu,
} from "../controllers/employee.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(requireRole(ROLES.EMPLOYEE));

router.get("/profile", getProfile);
router.get("/balance", getBalance);
router.get("/cafes", listCafes);
router.get("/menu", listAvailableMenu);
router.get("/orders", getOrders);
router.post("/orders", createOnlineOrder);
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
router.post("/generate-qr", generateQR);
router.post("/feedback", createFeedback);

export default router;
