import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateDefaultItemBody,
  validatePatchDefaultBody,
  validateMongoIdParam,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getDefaultList,
  createDefaultItem,
  patchDefaultItem,
  deleteDefaultItem,
} from "../controllers/defaultController.js";

const router = Router();

router.use(authenticate);

router.get("/", getDefaultList);
router.post("/", validateDefaultItemBody, validateRequest, createDefaultItem);
router.patch(
  "/:id",
  validateMongoIdParam,
  validatePatchDefaultBody,
  validateRequest,
  patchDefaultItem
);
router.delete("/:id", validateMongoIdParam, validateRequest, deleteDefaultItem);

export default router;
