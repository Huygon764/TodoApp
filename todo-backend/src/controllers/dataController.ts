import type { Request, Response } from "express";
import { catchAsync, sendSuccess, badRequest } from "../utils/index.js";
import {
  buildExport,
  applyImport,
  validateImportPayload,
  type ExportDoc,
} from "../services/dataTransfer.js";

export const exportData = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dump = await buildExport(userId);
  sendSuccess(res, 200, dump);
});

export const importData = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const check = validateImportPayload(req.body);
  if (!check.ok) throw badRequest(check.error);
  const counts = await applyImport(userId, req.body as ExportDoc);
  sendSuccess(res, 200, { imported: counts });
});
