import type { Request, Response } from "express";
import { catchAsync, sendSuccess } from "../utils/index.js";
import { runStay } from "../services/stayService.js";
import {
  startDay,
  pauseDay,
  resumeDay,
  changeLevel,
  type StayLevel,
  type StayPauseReason,
} from "../services/stayLogic.js";

export const getStay = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await runStay(req.user!.userId, req.userDoc?.timezone));
});

export const startStay = catchAsync(async (req: Request, res: Response) => {
  const state = await runStay(req.user!.userId, req.userDoc?.timezone, (day, now) =>
    startDay(day, now),
  );
  sendSuccess(res, 200, state);
});

export const pauseStay = catchAsync(async (req: Request, res: Response) => {
  const reason = req.body.reason as StayPauseReason;
  const state = await runStay(req.user!.userId, req.userDoc?.timezone, (day, now) =>
    pauseDay(day, reason, now),
  );
  sendSuccess(res, 200, state);
});

export const resumeStay = catchAsync(async (req: Request, res: Response) => {
  const state = await runStay(req.user!.userId, req.userDoc?.timezone, (day, now) =>
    resumeDay(day, now),
  );
  sendSuccess(res, 200, state);
});

export const setStayLevel = catchAsync(async (req: Request, res: Response) => {
  const level = req.body.level as StayLevel;
  const state = await runStay(req.user!.userId, req.userDoc?.timezone, (day, now) =>
    changeLevel(day, level, now),
  );
  sendSuccess(res, 200, state);
});
