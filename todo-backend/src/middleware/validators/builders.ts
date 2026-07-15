import { body, type ValidationChain, type CustomValidator } from "express-validator";
import {
  MAX_TITLE_LENGTH,
  MIN_DAY_OF_WEEK,
  MAX_DAY_OF_WEEK,
  MIN_DAY_OF_MONTH,
  MAX_DAY_OF_MONTH,
  MIN_MONTH,
  MAX_MONTH,
  periodWeekRegex,
  periodMonthRegex,
  periodYearRegex,
} from "../../constants/validation.js";

export const requiredTitle = (): ValidationChain =>
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: MAX_TITLE_LENGTH })
    .withMessage(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);

export const optionalTitle = (): ValidationChain =>
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: MAX_TITLE_LENGTH })
    .withMessage(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);

export const optionalOrder = (path = "order"): ValidationChain =>
  body(path)
    .optional()
    .isInt({ min: 0 })
    .withMessage(`${path} must be a non-negative integer`);

/** Counter target: optional integer 2..999 (below 2 is not a counter). */
export const optionalTarget = (path = "target"): ValidationChain =>
  body(path)
    .optional()
    .isInt({ min: 2, max: 999 })
    .withMessage(`${path} must be an integer between 2 and 999`);

/**
 * Cross-field counter rules for an items array: an item cannot have both a
 * `target` and sub-tasks, and any `count` must stay within 0..target. Applied
 * to the whole `items` value so it can inspect item + sub-task shape together.
 */
export const counterConsistency: CustomValidator = (items) => {
  if (!Array.isArray(items)) return true;
  const checkCount = (holder: { target?: unknown; count?: unknown }, label: string) => {
    if (typeof holder.count !== "number") return;
    if (typeof holder.target !== "number") {
      // A lone count of 0 is harmless noise (e.g. legacy data); ignore it.
      // Any positive count without a target is a real inconsistency.
      if (holder.count === 0) return;
      throw new Error(`${label} count requires a target`);
    }
    if (holder.count < 0 || holder.count > holder.target) {
      throw new Error(`${label} count must be between 0 and target`);
    }
  };
  for (const item of items) {
    if (item == null || typeof item !== "object") continue;
    const hasTarget = typeof item.target === "number";
    const hasSubTasks = Array.isArray(item.subTasks) && item.subTasks.length > 0;
    if (hasTarget && hasSubTasks) {
      throw new Error("An item cannot have both a target and sub-tasks");
    }
    checkCount(item, "item");
    if (Array.isArray(item.subTasks)) {
      for (const subTask of item.subTasks) {
        if (subTask != null && typeof subTask === "object") {
          checkCount(subTask, "sub-task");
        }
      }
    }
  }
  return true;
};

/**
 * Validators for an array of todo items where each item may have
 * title/completed/order, plus subtasks with title and (optionally) completed.
 */
export const itemsArrayValidators = (
  options: { withSubTasks?: boolean; subTaskCompleted?: boolean } = {},
): ValidationChain[] => {
  const chains: ValidationChain[] = [
    body("items")
      .optional()
      .isArray()
      .withMessage("items must be an array")
      .bail()
      .custom(counterConsistency),
    body("items.*.title").optional().trim().isString(),
    body("items.*.completed").optional().isBoolean(),
    body("items.*.order").optional().isInt({ min: 0 }),
    body("items.*.target")
      .optional()
      .isInt({ min: 2, max: 999 })
      .withMessage("target must be an integer between 2 and 999"),
    body("items.*.count").optional().isInt({ min: 0 }),
  ];
  if (options.withSubTasks) {
    chains.push(
      body("items.*.subTasks")
        .optional()
        .isArray()
        .withMessage("subTasks must be an array"),
      body("items.*.subTasks.*.title").optional().trim().isString(),
      body("items.*.subTasks.*.target")
        .optional()
        .isInt({ min: 2, max: 999 })
        .withMessage("target must be an integer between 2 and 999"),
    );
    if (options.subTaskCompleted) {
      chains.push(
        body("items.*.subTasks.*.completed").optional().isBoolean(),
        body("items.*.subTasks.*.count").optional().isInt({ min: 0 }),
      );
    }
  }
  return chains;
};

/**
 * Validators for a top-level subTasks array (title-only by default).
 */
export const subTasksValidators = (path = "subTasks"): ValidationChain[] => [
  body(path).optional().isArray().withMessage("subTasks must be an array"),
  body(`${path}.*.title`).optional().trim().isString(),
  body(`${path}.*.target`)
    .optional()
    .isInt({ min: 2, max: 999 })
    .withMessage("target must be an integer between 2 and 999"),
];

/**
 * Reject a single-item create/patch body that sets both `target` and a
 * non-empty `subTasks` array (they are mutually exclusive).
 */
export const targetSubTasksExclusive = (): ValidationChain =>
  body("target").custom((value, { req }) => {
    const subTasks = (req.body as { subTasks?: unknown })?.subTasks;
    const hasTarget = value !== undefined && value !== null;
    const hasSubTasks = Array.isArray(subTasks) && subTasks.length > 0;
    if (hasTarget && hasSubTasks) {
      throw new Error("An item cannot have both a target and sub-tasks");
    }
    return true;
  });

export const daysOfWeekValidators = (): ValidationChain[] => [
  body("daysOfWeek").optional().isArray().withMessage("daysOfWeek must be an array"),
  body("daysOfWeek.*")
    .optional()
    .isInt({ min: MIN_DAY_OF_WEEK, max: MAX_DAY_OF_WEEK })
    .withMessage(
      `daysOfWeek values must be between ${MIN_DAY_OF_WEEK} and ${MAX_DAY_OF_WEEK}`,
    ),
];

export const daysOfMonthValidators = (): ValidationChain[] => [
  body("daysOfMonth")
    .optional()
    .isArray()
    .withMessage("daysOfMonth must be an array"),
  body("daysOfMonth.*")
    .optional()
    .isInt({ min: MIN_DAY_OF_MONTH, max: MAX_DAY_OF_MONTH })
    .withMessage(
      `daysOfMonth values must be between ${MIN_DAY_OF_MONTH} and ${MAX_DAY_OF_MONTH}`,
    ),
];

export const datesOfYearValidators = (): ValidationChain[] => [
  body("datesOfYear")
    .optional()
    .isArray()
    .withMessage("datesOfYear must be an array"),
  body("datesOfYear.*.month")
    .optional()
    .isInt({ min: MIN_MONTH, max: MAX_MONTH })
    .withMessage(`datesOfYear.month must be between ${MIN_MONTH} and ${MAX_MONTH}`),
  body("datesOfYear.*.day")
    .optional()
    .isInt({ min: MIN_DAY_OF_MONTH, max: MAX_DAY_OF_MONTH })
    .withMessage(
      `datesOfYear.day must be between ${MIN_DAY_OF_MONTH} and ${MAX_DAY_OF_MONTH}`,
    ),
];

/**
 * Period custom validator usable both for body and query.
 * `getType` selects where to read the matching `type` value from.
 */
export const validatePeriodFormat = (
  getType: (req: { body?: { type?: string }; query?: { type?: string } }) =>
    | string
    | undefined,
): CustomValidator => {
  return (value, { req }) => {
    const type = getType(req as { body?: { type?: string }; query?: { type?: string } });
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
  };
};
