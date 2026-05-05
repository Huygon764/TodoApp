export const MAX_TITLE_LENGTH = 500;
export const MAX_NAME_LENGTH = 200;
export const MIN_DAY_OF_WEEK = 1;
export const MAX_DAY_OF_WEEK = 7;
export const MIN_DAY_OF_MONTH = 1;
export const MAX_DAY_OF_MONTH = 31;
export const MIN_MONTH = 1;
export const MAX_MONTH = 12;

// Week: YYYY-W01..W53, Month: YYYY-MM, Year: YYYY
export const periodWeekRegex = /^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/;
export const periodMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
export const periodYearRegex = /^\d{4}$/;
