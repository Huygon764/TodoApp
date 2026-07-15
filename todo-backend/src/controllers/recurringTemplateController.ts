import type { Request, Response } from "express";
import { RecurringTemplate } from "../models/index.js";
import {
  catchAsync,
  sendSuccess,
  notFound,
  getOrCreate,
  removeAndReorder,
  normalizeUniqueSortedInts,
  normalizeDatesOfYear,
  normalizeSubTaskTitles,
  normalizeTargetField,
} from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { IRecurringTemplateItem } from "../types/index.js";

/**
 * GET /api/recurring-templates?type=week|month|year
 * Returns template for type. Creates with empty items if not found.
 */
export const getRecurringTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const type = req.query.type as "week" | "month" | "year";

    const template = await getOrCreate(RecurringTemplate, { userId, type }, { items: [] });

    sendSuccess(res, 200, { template });
  }
);

/**
 * POST /api/recurring-templates
 * Body: { type, title, order? }
 * Adds one item to the template.
 */
export const addRecurringTemplateItem = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { type, title, order, target, daysOfWeek, daysOfMonth, datesOfYear, subTasks } = req.body as {
      type: "week" | "month" | "year";
      title: string;
      order?: number;
      target?: number;
      daysOfWeek?: number[];
      daysOfMonth?: number[];
      datesOfYear?: { month: number; day: number }[];
      subTasks?: { title: string }[];
    };

    const template = await getOrCreate(RecurringTemplate, { userId, type }, { items: [] });

    const count = template.items.length;
    const newOrder = typeof order === "number" ? order : count;

    const itemBase: IRecurringTemplateItem = {
      title: title.trim(),
      order: newOrder,
    };

    const normalizedDaysOfWeek =
      type === "week" ? normalizeUniqueSortedInts(daysOfWeek, 1, 7) : undefined;
    const normalizedDaysOfMonth =
      type === "month" ? normalizeUniqueSortedInts(daysOfMonth, 1, 31) : undefined;
    const normalizedDatesOfYear =
      type === "year" ? normalizeDatesOfYear(datesOfYear) : undefined;

    if (normalizedDaysOfWeek) {
      itemBase.daysOfWeek = normalizedDaysOfWeek;
    }
    if (normalizedDaysOfMonth) {
      itemBase.daysOfMonth = normalizedDaysOfMonth;
    }
    if (normalizedDatesOfYear) {
      itemBase.datesOfYear = normalizedDatesOfYear;
    }
    const normalizedTarget = normalizeTargetField(target);
    if (normalizedTarget) itemBase.target = normalizedTarget;
    const normalizedSubTasks = normalizeSubTaskTitles(subTasks);
    if (normalizedSubTasks) itemBase.subTasks = normalizedSubTasks;

    template.items.push(itemBase);
    template.items.sort((a, b) => a.order - b.order);
    template.items.forEach((item, i) => {
      item.order = i;
    });
    await template.save();

    sendSuccess(res, 201, { template });
  }
);

/**
 * PATCH /api/recurring-templates/:type/items/:idx
 * Body: { title?, daysOfWeek?, daysOfMonth?, datesOfYear? }
 */
export const patchRecurringTemplateItem = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { type, idx } = req.params;
    const index = parseInt(idx!, 10);
    const { title, target, daysOfWeek, daysOfMonth, datesOfYear, subTasks } = req.body as {
      title?: string;
      target?: number;
      daysOfWeek?: number[];
      daysOfMonth?: number[];
      datesOfYear?: { month: number; day: number }[];
      subTasks?: { title: string }[];
    };

    const template = await RecurringTemplate.findOne({
      userId,
      type: type as "week" | "month" | "year",
    });
    if (!template) {
      throw notFound(MESSAGES.RECURRING_TEMPLATE.NOT_FOUND);
    }

    if (index < 0 || index >= template.items.length) {
      throw notFound(MESSAGES.RECURRING_TEMPLATE.NOT_FOUND);
    }

    const item = template.items[index]!;

    if (typeof title === "string") {
      item.title = title.trim();
    }

    if ("target" in req.body) {
      item.target = normalizeTargetField(target);
    }

    const normalizedDaysOfWeek =
      type === "week" && "daysOfWeek" in req.body
        ? normalizeUniqueSortedInts(daysOfWeek, 1, 7)
        : undefined;
    const normalizedDaysOfMonth =
      type === "month" && "daysOfMonth" in req.body
        ? normalizeUniqueSortedInts(daysOfMonth, 1, 31)
        : undefined;
    const normalizedDatesOfYear =
      type === "year" && "datesOfYear" in req.body
        ? normalizeDatesOfYear(datesOfYear)
        : undefined;

    if ("daysOfWeek" in req.body) {
      item.daysOfWeek = normalizedDaysOfWeek;
    }
    if ("daysOfMonth" in req.body) {
      item.daysOfMonth = normalizedDaysOfMonth;
    }
    if ("datesOfYear" in req.body) {
      item.datesOfYear = normalizedDatesOfYear;
    }
    if (Array.isArray(subTasks)) {
      item.subTasks = normalizeSubTaskTitles(subTasks);
    }
    await template.save();

    sendSuccess(res, 200, { template });
  }
);

/**
 * DELETE /api/recurring-templates/:type/items/:idx
 */
export const deleteRecurringTemplateItem = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { type, idx } = req.params;
    const index = parseInt(idx!, 10);

    const template = await RecurringTemplate.findOne({
      userId,
      type: type as "week" | "month" | "year",
    });
    if (!template) {
      throw notFound(MESSAGES.RECURRING_TEMPLATE.NOT_FOUND);
    }

    if (index < 0 || index >= template.items.length) {
      throw notFound(MESSAGES.RECURRING_TEMPLATE.NOT_FOUND);
    }

    removeAndReorder(template.items, index);
    await template.save();

    sendSuccess(res, 200, { template });
  }
);
