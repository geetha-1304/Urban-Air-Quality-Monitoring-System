import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extends Express's Request type so TypeScript knows req.user can exist
// after this middleware runs.
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Checks for a valid "Authorization: Bearer <token>" header.
// If valid, attaches the decoded user info to req.user and calls next().
// If missing/invalid, stops the request with a 401.
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'No token provided. Include "Authorization: Bearer <token>"',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { id: number; username: string; role: string };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' });
  }
  if (authReq.user.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Administrator access required' });
  }
  next();
};
