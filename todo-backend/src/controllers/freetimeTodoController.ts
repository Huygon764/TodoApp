import type { Request, Response } from "express";
import { FreetimeTodo } from "../models/index.js";
import { catchAsync, sendSuccess, getOrCreate } from "../utils/index.js";
import type { IFreetimeTodoItem } from "../types/index.js";
import { normalizeItems } from "../utils/normalizeItem.js";

/**
 * GET /api/freetime-todo
 * Returns freetime todo list for current user. Creates empty doc if not exists.
 */
export const getFreetimeTodo = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const freetimeTodo = await getOrCreate(FreetimeTodo, { userId }, { items: [] });

    sendSuccess(res, 200, { freetimeTodo });
  }
);

/**
 * PATCH /api/freetime-todo
 * Body: { items: IFreetimeTodoItem[] }
 * Replaces entire freetime list for current user.
 */
export const patchFreetimeTodo = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const items = (req.body.items ?? []) as IFreetimeTodoItem[];

    const freetimeTodo = await getOrCreate(FreetimeTodo, { userId }, { items: [] });

    freetimeTodo.items = normalizeItems(items);

    await freetimeTodo.save();

    sendSuccess(res, 200, { freetimeTodo });
  }
);

