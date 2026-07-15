import type { Request, Response } from "express";
import { Habit } from "../models/index.js";
import { catchAsync, sendSuccess, notFound, badRequest } from "../utils/index.js";
import {
  getTodayPanel,
  listHabits,
  toggleToday,
  getStats,
} from "../services/habitService.js";

export const getHabitsToday = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const panel = await getTodayPanel(userId, req.userDoc?.timezone);
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

  try {
    const result = await toggleToday(userId, id!, req.userDoc?.timezone);
    sendSuccess(res, 200, result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      throw notFound("Habit not found");
    }
    if (err instanceof Error && err.message === "NOT_SCHEDULED") {
      throw badRequest("Habit is not scheduled today");
    }
    throw err;
  }
});

export const getHabitStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const daysRaw = Number(req.query.days ?? 90);
  const days = Math.min(365, Math.max(7, Number.isFinite(daysRaw) ? daysRaw : 90));
  const stats = await getStats(userId, days, req.userDoc?.timezone);
  sendSuccess(res, 200, stats);
});
