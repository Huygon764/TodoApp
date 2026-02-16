import type { RequestHandler } from "express";
import { validationResult } from "express-validator";
import { sendError } from "../utils/responseHelper.js";
import { MESSAGES } from "../constants/index.js";

export const validateRequest: RequestHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    return sendError(res, 400, MESSAGES.COMMON.VALIDATION_ERROR, errorMessages);
  }
  next();
};
