import {
  getPrevWeekPeriod,
  getNextWeekPeriod,
  getPrevMonthPeriod,
  getNextMonthPeriod,
  getPrevYearPeriod,
  getNextYearPeriod,
} from "./datePeriod";

export type PeriodType = "week" | "month" | "year";

export function stepPeriod(
  type: PeriodType,
  period: string,
  direction: "prev" | "next",
): string {
  if (type === "week") {
    return direction === "prev"
      ? getPrevWeekPeriod(period)
      : getNextWeekPeriod(period);
  }
  if (type === "month") {
    return direction === "prev"
      ? getPrevMonthPeriod(period)
      : getNextMonthPeriod(period);
  }
  return direction === "prev"
    ? getPrevYearPeriod(period)
    : getNextYearPeriod(period);
}
