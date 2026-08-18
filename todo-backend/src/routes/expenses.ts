import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateExpenseQuery,
  validateCreateExpenseBody,
  validatePatchExpenseBody,
  validateMongoIdParam,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getExpenses,
  getExpenseSummary,
  addExpense,
  patchExpense,
  removeExpense,
} from "../controllers/expenseController.js";

const router = Router();

router.use(authenticate);

router.get("/", validateExpenseQuery, validateRequest, getExpenses);
router.get("/summary", validateExpenseQuery, validateRequest, getExpenseSummary);
router.post("/", validateCreateExpenseBody, validateRequest, addExpense);
router.put("/:id", validateMongoIdParam, validatePatchExpenseBody, validateRequest, patchExpense);
router.delete("/:id", validateMongoIdParam, validateRequest, removeExpense);

export default router;
