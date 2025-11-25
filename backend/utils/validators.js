// backend/utils/validators.js

// Validation simple pour email
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validation simple pour UUID
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Validation pour créer un admin
export function validateCreateAdmin(data) {
  const errors = []

  if (!data.numero_membre || typeof data.numero_membre !== 'string') {
    errors.push({ field: 'numero_membre', message: 'Numéro membre requis' })
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Email valide requis' })
  }

  if (!data.password || typeof data.password !== 'string' || data.password.length < 8) {
    errors.push({ field: 'password', message: 'Mot de passe requis (min 8 caractères)' })
  }

  if (data.role_global && !['master', 'admin', 'moderator'].includes(data.role_global)) {
    errors.push({ field: 'role_global', message: 'Rôle invalide' })
  }

  if (data.modules && !Array.isArray(data.modules)) {
    errors.push({ field: 'modules', message: 'Modules doit être un tableau' })
  }

  return { isValid: errors.length === 0, errors }
}

// Validation pour mettre à jour un admin
export function validateUpdateAdmin(data) {
  const errors = []

  if (data.email !== undefined && !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Email invalide' })
  }

  if (data.role_global && !['master', 'admin', 'moderator'].includes(data.role_global)) {
    errors.push({ field: 'role_global', message: 'Rôle invalide' })
  }

  return { isValid: errors.length === 0, errors }
}

// Validation pour mettre à jour les modules
export function validateUpdateModules(data) {
  const errors = []

  if (!data.modules || !Array.isArray(data.modules)) {
    errors.push({ field: 'modules', message: 'Modules doit être un tableau' })
  }

  return { isValid: errors.length === 0, errors }
}

// Validation pour les paramètres ID
export function validateId(id) {
  if (!id || !isValidUUID(id)) {
    return { isValid: false, errors: [{ field: 'id', message: 'ID invalide (UUID requis)' }] }
  }
  return { isValid: true, errors: [] }
}

// Validation pour pagination
export function validatePagination(query) {
  const page = parseInt(query.page) || 1
  const limit = parseInt(query.limit) || 20

  if (page < 1) {
    return { isValid: false, errors: [{ field: 'page', message: 'Page doit être >= 1' }] }
  }

  if (limit < 1 || limit > 100) {
    return { isValid: false, errors: [{ field: 'limit', message: 'Limit doit être entre 1 et 100' }] }
  }

  return { isValid: true, errors: [], data: { page, limit, search: query.search } }
}
