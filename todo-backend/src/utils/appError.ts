export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const badRequest = (message: string): AppError =>
  new AppError(400, message);

export const unauthorized = (message: string = "Unauthorized"): AppError =>
  new AppError(401, message);

export const forbidden = (message: string = "Forbidden"): AppError =>
  new AppError(403, message);

export const notFound = (message: string = "Not found"): AppError =>
  new AppError(404, message);

export const internal = (message: string = "Internal server error"): AppError =>
  new AppError(500, message);
