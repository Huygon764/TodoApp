import type { Request, Response } from "express";
import { DefaultItem } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";

export const getDefaultList = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const items = await DefaultItem.find({ userId }).sort({ order: 1 });
  sendSuccess(res, 200, { items });
});

export const createDefaultItem = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { title, order, subTasks } = req.body as {
      title: string;
      order?: number;
      subTasks?: { title: string }[];
    };

    const count = await DefaultItem.countDocuments({ userId });
    const item = await DefaultItem.create({
      userId,
      title: title.trim(),
      order: typeof order === "number" ? order : count,
      subTasks: Array.isArray(subTasks)
        ? subTasks.map((st) => ({ title: (st.title ?? "").trim() })).filter((st) => st.title)
        : undefined,
    });
    sendSuccess(res, 201, { item });
  }
);

export const patchDefaultItem = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { title, order, subTasks } = req.body as {
      title?: string;
      order?: number;
      subTasks?: { title: string }[];
    };

    const item = await DefaultItem.findOne({ _id: id, userId });
    if (!item) {
      throw notFound(MESSAGES.DEFAULT.NOT_FOUND);
    }

    if (title !== undefined) item.title = title.trim();
    if (typeof order === "number") item.order = order;
    if (Array.isArray(subTasks)) {
      const cleaned = subTasks
        .map((st) => ({ title: (st.title ?? "").trim() }))
        .filter((st) => st.title);
      item.subTasks = cleaned.length > 0 ? cleaned : undefined;
    }
    await item.save();

    sendSuccess(res, 200, { item });
  }
);

export const deleteDefaultItem = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const item = await DefaultItem.findOneAndDelete({ _id: id, userId });
    if (!item) {
      throw notFound(MESSAGES.DEFAULT.NOT_FOUND);
    }
    sendSuccess(res, 200, undefined, "Đã xóa");
  }
);
