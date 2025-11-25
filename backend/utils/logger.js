// backend/utils/logger.js

export function logInfo(message, data = {}) {
  console.log(`ℹ️  [INFO] ${message}`, Object.keys(data).length > 0 ? data : '')
}

export function logError(message, error = {}) {
  console.error(`❌ [ERROR] ${message}`, error)
}

export function logWarning(message, data = {}) {
  console.warn(`⚠️  [WARN] ${message}`, Object.keys(data).length > 0 ? data : '')
}

export function logSuccess(message, data = {}) {
  console.log(`✅ [SUCCESS] ${message}`, Object.keys(data).length > 0 ? data : '')
}
