import type { Request, Response } from "express";
import { Habit } from "../models/index.js";
import { catchAsync, sendSuccess, notFound, badRequest } from "../utils/index.js";
import {
  getTodayPanel,
  listHabits,
  toggleDone,
  toggleSkip,
  skipDay,
  unskipDay,
  getStats,
} from "../services/habitService.js";

function mapHabitError(err: unknown): never {
  if (err instanceof Error && err.message === "NOT_FOUND") {
    throw notFound("Habit not found");
  }
  if (err instanceof Error && err.message === "NOT_SCHEDULED") {
    throw badRequest("Habit is not scheduled on that date");
  }
  if (err instanceof Error && err.message === "DATE_NOT_ALLOWED") {
    throw badRequest("Date must be today or yesterday");
  }
  throw err;
}

export const getHabitsToday = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  const panel = await getTodayPanel(userId, req.userDoc?.timezone, date);
  sendSuccess(res, 200, panel);
});

export const getHabits = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const habits = await listHabits(userId);
  sendSuccess(res, 200, { habits });
});

export const createHabit = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name, daysOfWeek } = req.body as {
    name: string;
    daysOfWeek?: number[];
  };

  const count = await Habit.countDocuments({ userId, archivedAt: null });
  const habit = await Habit.create({
    userId,
    name: name.trim(),
    ...(Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? { daysOfWeek } : {}),
    order: count,
  });
  sendSuccess(res, 201, { habit });
});

export const patchHabit = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { name, daysOfWeek, order } = req.body as {
    name?: string;
    daysOfWeek?: number[];
    order?: number;
  };

  const habit = await Habit.findOne({ _id: id, userId, archivedAt: null });
  if (!habit) throw notFound("Habit not found");

  if (typeof name === "string") habit.name = name.trim();
  if (Array.isArray(daysOfWeek)) habit.daysOfWeek = daysOfWeek;
  if (typeof order === "number") habit.order = order;
  await habit.save();

  sendSuccess(res, 200, { habit });
});

export const archiveHabit = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const habit = await Habit.findOne({ _id: id, userId, archivedAt: null });
  if (!habit) throw notFound("Habit not found");

  habit.archivedAt = new Date();
  await habit.save();
  sendSuccess(res, 200, undefined, "Habit archived");
});

export const toggleHabit = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const date = typeof req.body?.date === "string" ? req.body.date : undefined;
  try {
    const result = await toggleDone(userId, id!, req.userDoc?.timezone, date);
    sendSuccess(res, 200, result);
  } catch (err) {
    mapHabitError(err);
  }
});

export const skipHabit = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const date = typeof req.body?.date === "string" ? req.body.date : undefined;
  try {
    const result = await toggleSkip(userId, id!, req.userDoc?.timezone, date);
    sendSuccess(res, 200, result);
  } catch (err) {
    mapHabitError(err);
  }
});

export const skipHabitsDay = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const date = typeof req.body?.date === "string" ? req.body.date : undefined;
  try {
    const result = await skipDay(userId, req.userDoc?.timezone, date);
    sendSuccess(res, 200, result);
  } catch (err) {
    mapHabitError(err);
  }
});

export const unskipHabitsDay = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const date = typeof req.body?.date === "string" ? req.body.date : undefined;
  try {
    const result = await unskipDay(userId, req.userDoc?.timezone, date);
    sendSuccess(res, 200, result);
  } catch (err) {
    mapHabitError(err);
  }
});

export const getHabitStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const daysRaw = Number(req.query.days ?? 90);
  const days = Math.min(365, Math.max(7, Number.isFinite(daysRaw) ? daysRaw : 90));
  const stats = await getStats(userId, days, req.userDoc?.timezone);
  sendSuccess(res, 200, stats);
});
