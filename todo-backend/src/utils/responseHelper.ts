import type { Response } from "express";
import type { ApiResponse } from "../types/api.types.js";

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  data?: T,
  message?: string
): Response => {
  const response: ApiResponse<T> = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: string[]
): Response => {
  const response: ApiResponse = { success: false, message };
  if (errors?.length) response.errors = errors;
  return res.status(statusCode).json(response);
};
