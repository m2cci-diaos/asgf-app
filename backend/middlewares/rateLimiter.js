// backend/middlewares/rateLimiter.js

// Simple rate limiter en mémoire (pour production, utiliser redis)
const requestCounts = new Map()

export function rateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress
    const now = Date.now()

    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs })
      return next()
    }

    const record = requestCounts.get(key)

    if (now > record.resetTime) {
      record.count = 1
      record.resetTime = now + windowMs
      return next()
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Trop de requêtes. Veuillez réessayer plus tard.',
      })
    }

    record.count++
    next()
  }
}

// Rate limiter strict pour les routes sensibles (login, etc.)
export function strictRateLimiter() {
  return rateLimiter(5, 15 * 60 * 1000) // 5 requêtes par 15 minutes
}
