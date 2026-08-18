import type { Request, Response } from "express";
import { catchAsync, sendSuccess } from "../utils/index.js";
import {
  listExpenses,
  summarizeExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../services/expenseService.js";

export const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const from = req.query.from as string;
  const to = req.query.to as string;
  const expenses = await listExpenses(userId, from, to);
  sendSuccess(res, 200, { expenses });
});

export const getExpenseSummary = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const from = req.query.from as string;
  const to = req.query.to as string;
  const summary = await summarizeExpenses(userId, from, to);
  sendSuccess(res, 200, summary);
});

export const addExpense = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { date, amount, description } = req.body;
  const expense = await createExpense(userId, { date, amount, description });
  sendSuccess(res, 201, { expense });
});

export const patchExpense = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const expense = await updateExpense(userId, id, req.body);
  if (!expense) return sendSuccess(res, 404, undefined, "Not found");
  sendSuccess(res, 200, { expense });
});

export const removeExpense = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const deleted = await deleteExpense(userId, id);
  if (!deleted) return sendSuccess(res, 404, undefined, "Not found");
  sendSuccess(res, 200);
});
