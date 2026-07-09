import express from "express";
import {
  createNotificationForUser,
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from "../controllers/notification.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = express.Router();

router.use(authenticate);

router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);
router.post("/", requireRole(ROLES.COMPANY_MANAGER, ROLES.CAFE_MANAGER), createNotificationForUser);

export default router;
