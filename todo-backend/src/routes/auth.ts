import { Router } from "express";
import { validateLogin, validateRegister } from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authenticate } from "../middleware/auth.js";
import { createRateLimit } from "../middleware/rateLimit.js";
import {
  login,
  logout,
  me,
  register,
  checkInvite,
} from "../controllers/authController.js";

const router = Router();

const registerLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
});
const checkInviteLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
});

router.post("/login", validateLogin, validateRequest, login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);
router.get("/register/check", checkInviteLimiter, checkInvite);
router.post(
  "/register",
  registerLimiter,
  validateRegister,
  validateRequest,
  register
);

export default router;
