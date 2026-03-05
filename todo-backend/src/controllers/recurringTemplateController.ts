import type { Request, Response } from "express";
import { RecurringTemplate } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { IRecurringTemplateItem } from "../types/index.js";

function normalizeUniqueSortedInts(
  values: unknown,
  min: number,
  max: number
): number[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const cleaned = Array.from(
    new Set(
      values
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n >= min && n <= max)
    )
  ).sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeDatesOfYear(
  values: unknown
): IRecurringTemplateItem["datesOfYear"] | undefined {
  if (!Array.isArray(values)) return undefined;
  const uniqueKey = (m: number, d: number) => `${m}-${d}`;
  const seen = new Set<string>();
  const cleaned: { month: number; day: number }[] = [];
  for (const v of values) {
    const month = Number((v as any)?.month);
    const day = Number((v as any)?.day);
    if (
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12 &&
      Number.isInteger(day) &&
      day >= 1 &&
      day <= 31
    ) {
      const key = uniqueKey(month, day);
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push({ month, day });
      }
    }
  }
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * GET /api/recurring-templates?type=week|month|year
 * Returns template for type. Creates with empty items if not found.
 */
export const getRecurringTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const type = req.query.type as "week" | "month" | "year";

    let template = await RecurringTemplate.findOne({ userId, type });

    if (!template) {
      template = await RecurringTemplate.create({
        userId,
        type,
        items: [],
      });
    }

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
    const { type, title, order, daysOfWeek, daysOfMonth, datesOfYear, subTasks } = req.body as {
      type: "week" | "month" | "year";
      title: string;
      order?: number;
      daysOfWeek?: number[];
      daysOfMonth?: number[];
      datesOfYear?: { month: number; day: number }[];
      subTasks?: { title: string }[];
    };

    let template = await RecurringTemplate.findOne({ userId, type });

    if (!template) {
      template = await RecurringTemplate.create({
        userId,
        type,
        items: [],
      });
    }

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
    if (Array.isArray(subTasks)) {
      const cleaned = subTasks
        .map((st) => ({ title: (st.title ?? "").trim() }))
        .filter((st) => st.title);
      if (cleaned.length > 0) itemBase.subTasks = cleaned;
    }

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
    const { title, daysOfWeek, daysOfMonth, datesOfYear, subTasks } = req.body as {
      title?: string;
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
      const cleaned = subTasks
        .map((st) => ({ title: (st.title ?? "").trim() }))
        .filter((st) => st.title);
      item.subTasks = cleaned.length > 0 ? cleaned : undefined;
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

    template.items.splice(index, 1);
    template.items.forEach((item, i) => {
      item.order = i;
    });
    await template.save();

    sendSuccess(res, 200, { template });
  }
);
