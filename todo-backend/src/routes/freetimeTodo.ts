import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validatePatchFreetimeTodoBody } from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getFreetimeTodo,
  patchFreetimeTodo,
} from "../controllers/freetimeTodoController.js";

const router = Router();

router.use(authenticate);

router.get("/", getFreetimeTodo);

router.patch(
  "/",
  validatePatchFreetimeTodoBody,
  validateRequest,
  patchFreetimeTodo
);

export default router;

