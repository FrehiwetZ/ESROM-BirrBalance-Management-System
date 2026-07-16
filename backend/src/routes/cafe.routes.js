import express from "express";
import {
  addMenuItem,
  cafeAnalytics,
  cafeOperationalReport,
  editMenuItem,
  listCafeOrders,
  listMenuItems,
  markMenuItemAvailability,
  removeMenuItem,
} from "../controllers/cafe.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { uploadMenuImage } from "../middleware/upload.middleware.js";
import { ROLES } from "../config/constants.js";

const router = express.Router();

router.use(authenticate, requireRole(ROLES.CAFE_MANAGER));

router.get("/menu", listMenuItems);
router.post("/menu", uploadMenuImage.single("image"), addMenuItem);
router.patch("/menu/:id", uploadMenuImage.single("image"), editMenuItem);
router.delete("/menu/:id", removeMenuItem);
router.patch("/menu/:id/availability", markMenuItemAvailability);

router.get("/orders", listCafeOrders);
router.get("/analytics", cafeAnalytics);
router.get("/reports/operational", cafeOperationalReport);

export default router;
