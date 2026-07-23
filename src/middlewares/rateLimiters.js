import rateLimit from 'express-rate-limit';

function rateLimitHandler(_req, res) {
  res.setHeader('Retry-After', '900');
  return res.status(429).json({
    success: false,
    message: 'Demasiadas solicitudes. Intente más tarde.',
    errorCode: 'RATE_LIMITED',
    errors: []
  });
}

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.setHeader('Retry-After', '900');
    return res.status(429).json({
      success: false,
      message: 'Demasiados intentos de inicio de sesión. Intente más tarde.',
      errorCode: 'RATE_LIMITED',
      errors: []
    });
  }
});

export const exportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});
