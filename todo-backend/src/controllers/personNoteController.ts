import type { Request, Response } from "express";
import { PersonNote } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";

export const getPersonNotes = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const items = await PersonNote.find({ userId }).sort({ order: 1 });
    sendSuccess(res, 200, { items });
  }
);

export const createPersonNote = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { name, notes, order } = req.body as {
      name: string;
      notes?: string[];
      order?: number;
    };

    const count = await PersonNote.countDocuments({ userId });
    const item = await PersonNote.create({
      userId,
      name: name.trim(),
      notes: Array.isArray(notes)
        ? notes.map((n) => n.trim()).filter((n) => n.length > 0)
        : [],
      order: typeof order === "number" ? order : count,
    });
    sendSuccess(res, 201, { item });
  }
);

export const patchPersonNote = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { name, notes, order } = req.body as {
      name?: string;
      notes?: string[];
      order?: number;
    };

    const item = await PersonNote.findOne({ _id: id, userId });
    if (!item) {
      throw notFound(MESSAGES.PERSON_NOTE.NOT_FOUND);
    }

    if (name !== undefined) item.name = name.trim();
    if (Array.isArray(notes)) {
      item.notes = notes.map((n) => n.trim()).filter((n) => n.length > 0);
    }
    if (typeof order === "number") item.order = order;
    await item.save();

    sendSuccess(res, 200, { item });
  }
);

export const deletePersonNote = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const item = await PersonNote.findOneAndDelete({ _id: id, userId });
    if (!item) {
      throw notFound(MESSAGES.PERSON_NOTE.NOT_FOUND);
    }
    sendSuccess(res, 200, undefined, "Đã xóa");
  }
);
