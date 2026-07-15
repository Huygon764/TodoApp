import { Router } from "express";
import {
  validateLogin,
  validateRegister,
  validateResetPassword,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authenticate } from "../middleware/auth.js";
import { createRateLimit } from "../middleware/rateLimit.js";
import {
  login,
  googleLogin,
  logout,
  me,
  register,
  checkInvite,
  checkReset,
  resetPassword,
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
// Blunt password brute-forcing and Google-token spam.
const loginLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});

router.post("/login", loginLimiter, validateLogin, validateRequest, login);
router.post("/google", loginLimiter, googleLogin);
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
router.get("/reset/check", checkInviteLimiter, checkReset);
router.post(
  "/reset",
  registerLimiter,
  validateResetPassword,
  validateRequest,
  resetPassword
);

export default router;
