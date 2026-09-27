import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';

export const authenticate = (req, res, next) => {
  const token = req.cookies?.authToken;
  if (!token) return next(new AppError(401, 'Authentication required'));

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: claims.sub, role: claims.role };
    return next();
  } catch {
    return next(new AppError(401, 'Invalid or expired token'));
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError(401, 'Authentication required'));
  if (!roles.includes(req.user.role)) return next(new AppError(403, 'Forbidden'));
  return next();
};