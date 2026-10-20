import { Request, Response, NextFunction } from 'express';

// A custom error class so we can attach an HTTP status code to any error.
// Example: throw new AppError('Station not found', 404);
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Express doesn't automatically catch errors thrown inside async functions.
// This wrapper catches them for us and forwards them to the error handler,
// so every controller doesn't need its own try/catch block.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

// Runs when no route matches the request at all.
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Runs whenever asyncHandler catches an error, or next(error) is called.
// This is the ONE place that decides what error response the client sees,
// so we never leak raw database errors or stack traces to the client.
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err.message);

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Internal server error';

  res.status(statusCode).json({
    status: 'error',
    message,
  });
};
