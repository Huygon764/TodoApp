import { body, param, query } from "express-validator";

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

// Week: YYYY-W01..W53, Month: YYYY-MM, Year: YYYY
const periodWeekRegex = /^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/;
const periodMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const periodYearRegex = /^\d{4}$/;

export const validateGetGoalsQuery = [
  query("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
  query("period")
    .notEmpty()
    .withMessage("period is required")
    .custom((value, { req }) => {
      const type = req.query?.type as string;
      if (type === "week" && !periodWeekRegex.test(value)) {
        throw new Error("period for week must be YYYY-Wnn (e.g. 2024-W03)");
      }
      if (type === "month" && !periodMonthRegex.test(value)) {
        throw new Error("period for month must be YYYY-MM (e.g. 2024-01)");
      }
      if (type === "year" && !periodYearRegex.test(value)) {
        throw new Error("period for year must be YYYY (e.g. 2024)");
      }
      return true;
    }),
];

export const validatePostGoalBody = [
  body("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
  body("period")
    .notEmpty()
    .withMessage("period is required")
    .custom((value, { req }) => {
      const type = req.body?.type;
      if (type === "week" && !periodWeekRegex.test(value)) {
        throw new Error("period for week must be YYYY-Wnn (e.g. 2024-W03)");
      }
      if (type === "month" && !periodMonthRegex.test(value)) {
        throw new Error("period for month must be YYYY-MM (e.g. 2024-01)");
      }
      if (type === "year" && !periodYearRegex.test(value)) {
        throw new Error("period for year must be YYYY (e.g. 2024)");
      }
      return true;
    }),
  body("items")
    .optional()
    .isArray()
    .withMessage("items must be an array"),
  body("items.*.title").optional().trim().isString(),
  body("items.*.completed").optional().isBoolean(),
  body("items.*.order").optional().isInt({ min: 0 }),
];

export const validatePatchGoalBody = [
  body("items")
    .optional()
    .isArray()
    .withMessage("items must be an array"),
  body("items.*.title").optional().trim().isString(),
  body("items.*.completed").optional().isBoolean(),
  body("items.*.order").optional().isInt({ min: 0 }),
];

export const validateGoalItemIndexParam = [
  param("idx")
    .isInt({ min: 0 })
    .withMessage("idx must be a non-negative integer"),
];

export const validateGetGoalTemplatesQuery = [
  query("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
];

export const validatePostGoalTemplateBody = [
  body("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 500 })
    .withMessage("Title cannot exceed 500 characters"),
  body("order").optional().isInt({ min: 0 }),
];

export const validateGoalTemplateTypeParam = [
  param("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
];

export const validateGetReviewsQuery = [
  query("type").optional().isIn(["week", "month"]),
  query("period").optional().trim().isString(),
  query("month")
    .optional()
    .matches(periodMonthRegex)
    .withMessage("month must be YYYY-MM"),
  query("from")
    .optional()
    .matches(periodWeekRegex)
    .withMessage("from must be YYYY-Wnn"),
  query("to")
    .optional()
    .matches(periodWeekRegex)
    .withMessage("to must be YYYY-Wnn"),
];

export const validatePostReviewBody = [
  body("type")
    .isIn(["week", "month"])
    .withMessage("type must be week or month"),
  body("period").notEmpty().trim().withMessage("period is required"),
  body("goodThings")
    .optional()
    .isArray()
    .withMessage("goodThings must be an array"),
  body("goodThings.*").optional().trim().isString(),
  body("badThings")
    .optional()
    .isArray()
    .withMessage("badThings must be an array"),
  body("badThings.*").optional().trim().isString(),
  body("notes").optional().trim().isString(),
];

export const validateAnalyzeReviewsBody = [
  body("reviewIds")
    .optional()
    .isArray()
    .withMessage("reviewIds must be an array"),
  body("reviewIds.*").optional().isString(),
  body("from").optional().trim().isString(),
  body("to").optional().trim().isString(),
];

export const validatePatchReviewBody = [
  body("goodThings")
    .optional()
    .isArray()
    .withMessage("goodThings must be an array"),
  body("goodThings.*").optional().trim().isString(),
  body("badThings")
    .optional()
    .isArray()
    .withMessage("badThings must be an array"),
  body("badThings.*").optional().trim().isString(),
  body("notes").optional().trim().isString(),
];
