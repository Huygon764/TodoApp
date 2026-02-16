import { Router } from "express";
import { validateLogin } from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authenticate } from "../middleware/auth.js";
import { login, logout, me } from "../controllers/authController.js";

const router = Router();

router.post("/login", validateLogin, validateRequest, login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
