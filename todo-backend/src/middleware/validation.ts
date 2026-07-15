import { body, param, query } from "express-validator";
import {
  MAX_TITLE_LENGTH,
  MAX_NAME_LENGTH,
  periodWeekRegex,
  periodMonthRegex,
} from "../constants/validation.js";
import {
  requiredTitle,
  optionalTitle,
  optionalOrder,
  optionalTarget,
  targetSubTasksExclusive,
  itemsArrayValidators,
  subTasksValidators,
  counterConsistency,
  daysOfWeekValidators,
  daysOfMonthValidators,
  datesOfYearValidators,
  validatePeriodFormat,
} from "./validators/builders.js";

export const validateLogin = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const validateRegister = [
  body("code").trim().notEmpty().withMessage("Invite code is required"),
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Username can only contain letters, numbers, and underscores"
    ),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const validateResetPassword = [
  body("code").trim().notEmpty().withMessage("Reset code is required"),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const validateDateParam = [
  param("date")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be YYYY-MM-DD"),
];

export const validateDefaultItemBody = [
  requiredTitle(),
  optionalOrder(),
  optionalTarget(),
  targetSubTasksExclusive(),
  ...subTasksValidators(),
];

export const validatePatchDayBody = [
  ...itemsArrayValidators({ withSubTasks: true, subTaskCompleted: true }),
  body("reflection")
    .optional()
    .isString()
    .withMessage("reflection must be a string")
    .isLength({ max: 500 })
    .withMessage("reflection is too long"),
  // null is allowed so the client can clear a previously set mood/energy.
  body("mood")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 5 })
    .withMessage("mood must be an integer between 1 and 5"),
  body("energy")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 5 })
    .withMessage("energy must be an integer between 1 and 5"),
  body("gratitude")
    .optional()
    .isString()
    .withMessage("gratitude must be a string")
    .isLength({ max: 280 })
    .withMessage("gratitude is too long"),
];

export const validatePatchFreetimeTodoBody = itemsArrayValidators({
  withSubTasks: true,
  subTaskCompleted: true,
});

export const validatePatchDefaultBody = [
  optionalTitle(),
  optionalOrder(),
  optionalTarget(),
  targetSubTasksExclusive(),
  ...subTasksValidators(),
];

export const validateMongoIdParam = [
  param("id").isMongoId().withMessage("Invalid ID format"),
];

export const validateGetGoalsQuery = [
  query("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
  query("period")
    .notEmpty()
    .withMessage("period is required")
    .custom(validatePeriodFormat((req) => req.query?.type)),
];

export const validatePostGoalBody = [
  body("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
  body("period")
    .notEmpty()
    .withMessage("period is required")
    .custom(validatePeriodFormat((req) => req.body?.type)),
  ...itemsArrayValidators(),
];

export const validatePatchGoalBody = itemsArrayValidators();

export const validateGoalItemIndexParam = [
  param("idx")
    .isInt({ min: 0 })
    .withMessage("idx must be a non-negative integer"),
];

export const validateGetRecurringTemplatesQuery = [
  query("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
];

export const validatePostRecurringTemplateBody = [
  body("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
  requiredTitle(),
  optionalOrder(),
  optionalTarget(),
  targetSubTasksExclusive(),
  ...daysOfWeekValidators(),
  ...daysOfMonthValidators(),
  ...datesOfYearValidators(),
  ...subTasksValidators(),
];

export const validateRecurringTemplateTypeParam = [
  param("type")
    .isIn(["week", "month", "year"])
    .withMessage("type must be week, month or year"),
];

export const validatePatchRecurringTemplateItemBody = [
  optionalTitle(),
  optionalTarget(),
  targetSubTasksExclusive(),
  ...daysOfWeekValidators(),
  ...daysOfMonthValidators(),
  ...datesOfYearValidators(),
  ...subTasksValidators(),
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
  query("fromMonth")
    .optional()
    .matches(periodMonthRegex)
    .withMessage("fromMonth must be YYYY-MM"),
  query("toMonth")
    .optional()
    .matches(periodMonthRegex)
    .withMessage("toMonth must be YYYY-MM"),
];

export const validateReviewDraftQuery = [
  query("type")
    .isIn(["week", "month"])
    .withMessage("type must be week or month"),
  query("period").notEmpty().trim().withMessage("period is required"),
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

export const validatePatchDateTemplateBody = [
  body("items")
    .isArray()
    .withMessage("items must be an array")
    .bail()
    .custom(counterConsistency),
  body("items.*.title")
    .trim()
    .notEmpty()
    .withMessage("Item title is required")
    .isLength({ max: MAX_TITLE_LENGTH })
    .withMessage(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`),
  body("items.*.order")
    .isInt({ min: 0 })
    .withMessage("Item order must be a non-negative integer"),
  body("items.*.target")
    .optional()
    .isInt({ min: 2, max: 999 })
    .withMessage("target must be an integer between 2 and 999"),
  body("items.*.subTasks")
    .optional()
    .isArray()
    .withMessage("subTasks must be an array"),
  body("items.*.subTasks.*.title").optional().trim().isString(),
  body("items.*.subTasks.*.target")
    .optional()
    .isInt({ min: 2, max: 999 })
    .withMessage("target must be an integer between 2 and 999"),
];

export const validatePersonNoteBody = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: MAX_NAME_LENGTH })
    .withMessage(`Name cannot exceed ${MAX_NAME_LENGTH} characters`),
  body("notes")
    .optional()
    .isArray()
    .withMessage("notes must be an array"),
  body("notes.*").optional().trim().isString(),
  body("category")
    .optional()
    .isIn(["person", "object"])
    .withMessage("category must be 'person' or 'object'"),
  optionalOrder(),
];

export const validatePatchPersonNoteBody = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ max: MAX_NAME_LENGTH })
    .withMessage(`Name cannot exceed ${MAX_NAME_LENGTH} characters`),
  body("notes")
    .optional()
    .isArray()
    .withMessage("notes must be an array"),
  body("notes.*").optional().trim().isString(),
  optionalOrder(),
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
