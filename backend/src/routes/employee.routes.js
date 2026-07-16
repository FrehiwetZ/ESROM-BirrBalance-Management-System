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
} from "../controllers/employee.controller.js";
import { listPublicMenuItems } from "../controllers/cafe.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(requireRole(ROLES.EMPLOYEE));

router.get("/profile", getProfile);
router.get("/balance", getBalance);
router.get("/orders", getOrders);
router.get("/cafes/:cafeId/menu", listPublicMenuItems);
router.post("/orders", createOnlineOrder);
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
router.post("/generate-qr", generateQR);
router.post("/feedback", createFeedback);


export default router;
