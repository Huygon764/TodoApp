import type { Request, Response } from "express";
import { catchAsync, sendSuccess } from "../utils/index.js";
import { runPomodoro } from "../services/pomodoroService.js";
import {
  startPomodoro,
  pausePomodoro,
  resumePomodoro,
  stopPomodoro,
  setPomodoroSettings,
} from "../services/pomodoroLogic.js";

export const getPomodoro = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await runPomodoro(req.user!.userId, req.userDoc?.timezone));
});

export const startPomodoroTimer = catchAsync(async (req: Request, res: Response) => {
  const state = await runPomodoro(req.user!.userId, req.userDoc?.timezone, (p, now) =>
    startPomodoro(p, now),
  );
  sendSuccess(res, 200, state);
});

export const pausePomodoroTimer = catchAsync(async (req: Request, res: Response) => {
  const state = await runPomodoro(req.user!.userId, req.userDoc?.timezone, (p, now) =>
    pausePomodoro(p, now),
  );
  sendSuccess(res, 200, state);
});

export const resumePomodoroTimer = catchAsync(async (req: Request, res: Response) => {
  const state = await runPomodoro(req.user!.userId, req.userDoc?.timezone, (p, now) =>
    resumePomodoro(p, now),
  );
  sendSuccess(res, 200, state);
});

export const stopPomodoroTimer = catchAsync(async (req: Request, res: Response) => {
  const state = await runPomodoro(req.user!.userId, req.userDoc?.timezone, (p) =>
    stopPomodoro(p),
  );
  sendSuccess(res, 200, state);
});

export const putPomodoroSettings = catchAsync(async (req: Request, res: Response) => {
  const { workMin, restMin } = req.body as { workMin: number; restMin: number };
  const state = await runPomodoro(req.user!.userId, req.userDoc?.timezone, (p) =>
    setPomodoroSettings(p, workMin, restMin),
  );
  sendSuccess(res, 200, state);
});
