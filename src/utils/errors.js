export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = error.status || (error.type === 'entity.parse.failed' ? 400 : 500);
  const message = status === 500 ? 'Internal server error' : error.message;
  if (status === 500) console.error(error);
  res.status(status).json({ success: false, message });
}

export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}