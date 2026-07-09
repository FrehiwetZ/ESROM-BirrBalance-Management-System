import express from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { ROLES } from "../config/constants.js";
import {
  scanQR,
  createOfflineOrder,
} from "../controllers/waiter.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(requireRole(ROLES.WAITER));

router.post("/scan", scanQR);
router.post("/order", createOfflineOrder);

export default router;
