import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validatePersonNoteBody,
  validatePatchPersonNoteBody,
  validateMongoIdParam,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getPersonNotes,
  createPersonNote,
  patchPersonNote,
  deletePersonNote,
} from "../controllers/personNoteController.js";

const router = Router();

router.use(authenticate);

router.get("/", getPersonNotes);
router.post("/", validatePersonNoteBody, validateRequest, createPersonNote);
router.patch(
  "/:id",
  validateMongoIdParam,
  validatePatchPersonNoteBody,
  validateRequest,
  patchPersonNote
);
router.delete("/:id", validateMongoIdParam, validateRequest, deletePersonNote);

export default router;
