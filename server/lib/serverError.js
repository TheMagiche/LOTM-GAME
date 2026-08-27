export class AppError extends Error {
  constructor(message, { statusCode = 500, label = 'Server', publicMessage } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.label = label;
    if (publicMessage) this.publicMessage = publicMessage;
  }
}

export function serverError(res, err, label = 'Server') {
  const statusCode = err.statusCode || 500;
  // 5xx messages are masked by default so internal failures don't leak paths or
  // stack details. `publicMessage` is an explicit per-error opt-out for failures
  // whose text is the whole point (e.g. local toolchain setup diagnostics the
  // user has to act on).
  const message = statusCode >= 500
    ? (err.publicMessage || 'Internal server error')
    : err.message;
  console[statusCode >= 500 ? 'error' : 'warn'](`[${label}] ${statusCode}: ${err.message}`);
  res.status(statusCode).json({ error: message });
}