import type { Request, Response } from "express";
import { catchAsync, sendSuccess } from "../utils/index.js";
import { runTimer } from "../services/timerService.js";
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  addTimer,
  stopTimer,
  dismissTimer,
} from "../services/timerLogic.js";

export const getTimer = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await runTimer(req.user!.userId));
});

export const startTimerRun = catchAsync(async (req: Request, res: Response) => {
  const { lengthMs, label } = req.body as { lengthMs: number; label?: string };
  const state = await runTimer(req.user!.userId, (t, now) =>
    startTimer(t, now, lengthMs, label),
  );
  sendSuccess(res, 200, state);
});

export const pauseTimerRun = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await runTimer(req.user!.userId, (t, now) => pauseTimer(t, now)));
});

export const resumeTimerRun = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await runTimer(req.user!.userId, (t, now) => resumeTimer(t, now)));
});

export const addTimerTime = catchAsync(async (req: Request, res: Response) => {
  const { ms } = req.body as { ms: number };
  sendSuccess(res, 200, await runTimer(req.user!.userId, (t, now) => addTimer(t, now, ms)));
});

export const stopTimerRun = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await runTimer(req.user!.userId, (t) => stopTimer(t)));
});

export const dismissTimerRun = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await runTimer(req.user!.userId, (t) => dismissTimer(t)));
});
