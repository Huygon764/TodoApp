import { body, param } from "express-validator";

export const validateLogin = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const validateDateParam = [
  param("date")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be YYYY-MM-DD"),
];

export const validateDefaultItemBody = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 500 })
    .withMessage("Title cannot exceed 500 characters"),
  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a non-negative integer"),
];

export const validatePatchDayBody = [
  body("items")
    .optional()
    .isArray()
    .withMessage("items must be an array"),
  body("items.*.title").optional().trim().isString(),
  body("items.*.completed").optional().isBoolean(),
  body("items.*.order").optional().isInt({ min: 0 }),
];

export const validatePatchDefaultBody = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 500 })
    .withMessage("Title cannot exceed 500 characters"),
  body("order").optional().isInt({ min: 0 }),
];

export const validateMongoIdParam = [
  param("id").isMongoId().withMessage("Invalid ID format"),
];
