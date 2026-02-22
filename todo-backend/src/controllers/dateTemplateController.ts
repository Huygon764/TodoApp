import type { Request, Response } from "express";
import { DateTemplate } from "../models/index.js";
import { catchAsync, sendSuccess } from "../utils/index.js";
import type { IDateTemplateItem } from "../types/index.js";

/**
 * GET /api/date-templates/:date
 * Returns template for the given date. Creates with empty items if not found.
 */
export const getDateTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const date = req.params.date as string;

    let dateTemplate = await DateTemplate.findOne({ userId, date });

    if (!dateTemplate) {
      dateTemplate = await DateTemplate.create({
        userId,
        date,
        items: [],
      });
    }

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

    let dateTemplate = await DateTemplate.findOne({ userId, date });

    if (!dateTemplate) {
      dateTemplate = await DateTemplate.create({
        userId,
        date,
        items: [],
      });
    }

    const items = rawItems.map((item, i) => ({
      title: (item.title ?? "").trim(),
      order: i,
    })).filter((item) => item.title.length > 0);

    dateTemplate.items = items;
    await dateTemplate.save();

    sendSuccess(res, 200, { dateTemplate });
  }
);
