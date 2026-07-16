import express from "express";
import rateLimit from "express-rate-limit";
import {
  confirmPasswordReset,
  login,
  logout,
  refreshToken,
  requestPasswordReset,
  getMe,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", authLimiter, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/password-reset/request", authLimiter, requestPasswordReset);
router.post("/password-reset/confirm", authLimiter, confirmPasswordReset);
router.get("/me", authenticate, getMe);

export default router;
