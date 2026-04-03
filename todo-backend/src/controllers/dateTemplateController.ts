import type { Request, Response } from "express";
import { DateTemplate } from "../models/index.js";
import { catchAsync, sendSuccess, getOrCreate } from "../utils/index.js";
import type { IDateTemplateItem } from "../types/index.js";

/**
 * GET /api/date-templates/:date
 * Returns template for the given date. Creates with empty items if not found.
 */
export const getDateTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const date = req.params.date as string;

    const dateTemplate = await getOrCreate(DateTemplate, { userId, date }, { items: [] });

    sendSuccess(res, 200, { dateTemplate });
  }
);

/**
 * PATCH /api/date-templates/:date
 * Body: { items: IDateTemplateItem[] }
 * Replaces items and normalizes order.
 */
export const patchDateTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const date = req.params.date as string;
    const rawItems = req.body.items as IDateTemplateItem[];

    const dateTemplate = await getOrCreate(DateTemplate, { userId, date }, { items: [] });

    const items = rawItems.map((item, i) => {
      const base: { title: string; order: number; subTasks?: { title: string }[] } = {
        title: (item.title ?? "").trim(),
        order: i,
      };
      if (Array.isArray(item.subTasks)) {
        const cleaned = item.subTasks
          .map((st) => ({ title: (st.title ?? "").trim() }))
          .filter((st) => st.title);
        if (cleaned.length > 0) base.subTasks = cleaned;
      }
      return base;
    }).filter((item) => item.title.length > 0);

    dateTemplate.items = items;
    await dateTemplate.save();

    sendSuccess(res, 200, { dateTemplate });
  }
);
