import type { Request, Response } from "express";
import { GoalTemplate } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";

/**
 * GET /api/goals/templates?type=week|month|year
 * Returns template for type. Creates with empty items if not found.
 */
export const getGoalTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const type = req.query.type as "week" | "month" | "year";

    let template = await GoalTemplate.findOne({ userId, type });

    if (!template) {
      template = await GoalTemplate.create({
        userId,
        type,
        items: [],
      });
    }

    sendSuccess(res, 200, { template });
  }
);

/**
 * POST /api/goals/templates
 * Body: { type, title, order? }
 * Adds one item to the template.
 */
export const addGoalTemplateItem = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { type, title, order } = req.body as {
      type: "week" | "month" | "year";
      title: string;
      order?: number;
    };

    let template = await GoalTemplate.findOne({ userId, type });

    if (!template) {
      template = await GoalTemplate.create({
        userId,
        type,
        items: [],
      });
    }

    const count = template.items.length;
    const newOrder = typeof order === "number" ? order : count;
    template.items.push({
      title: title.trim(),
      order: newOrder,
    });
    template.items.sort((a, b) => a.order - b.order);
    template.items.forEach((item, i) => {
      item.order = i;
    });
    await template.save();

    sendSuccess(res, 201, { template });
  }
);

/**
 * DELETE /api/goals/templates/:type/items/:idx
 */
export const deleteGoalTemplateItem = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { type, idx } = req.params;
    const index = parseInt(idx!, 10);

    const template = await GoalTemplate.findOne({
      userId,
      type: type as "week" | "month" | "year",
    });
    if (!template) {
      throw notFound(MESSAGES.GOAL_TEMPLATE.NOT_FOUND);
    }

    if (index < 0 || index >= template.items.length) {
      throw notFound(MESSAGES.GOAL_TEMPLATE.NOT_FOUND);
    }

    template.items.splice(index, 1);
    template.items.forEach((item, i) => {
      item.order = i;
    });
    await template.save();

    sendSuccess(res, 200, { template });
  }
);
