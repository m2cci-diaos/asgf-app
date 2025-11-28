import { ROLE_TYPES, ALL_MODULES, MODULE_DROITS } from '../config/constants.js'

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

const VALID_ROLE_TYPES = Object.values(ROLE_TYPES)
const VALID_MODULE_DROITS = Object.values(MODULE_DROITS)

const isValidDateValue = (value) => {
  if (!value) return true
  const ts = Date.parse(value)
  return !Number.isNaN(ts)
}

const validateModulesPayload = (modules = []) => {
  if (!Array.isArray(modules)) {
    return { isValid: false, errors: [{ field: 'modules', message: 'Modules doit être un tableau' }] }
  }

  const errors = []
  modules.forEach((entry, index) => {
    const moduleName = typeof entry === 'string' ? entry : entry?.module
    if (!moduleName || !ALL_MODULES.includes(moduleName)) {
      errors.push({ field: `modules[${index}]`, message: 'Module invalide' })
    }

    const droitValue = typeof entry === 'string' ? MODULE_DROITS.FULL : entry?.droit || MODULE_DROITS.FULL
    if (!VALID_MODULE_DROITS.includes(droitValue)) {
      errors.push({ field: `modules[${index}].droit`, message: 'Droit invalide' })
    }

    if (entry?.scope_ids && !Array.isArray(entry.scope_ids)) {
      errors.push({ field: `modules[${index}].scope_ids`, message: 'scope_ids doit être un tableau UUID' })
    }
  })

  return { isValid: errors.length === 0, errors }
}

const validateScopeArray = (scope, field = 'super_scope') => {
  if (scope === undefined) return { isValid: true, errors: [] }
  if (!Array.isArray(scope)) {
    return { isValid: false, errors: [{ field, message: 'Doit être un tableau' }] }
  }

  const invalid = scope.filter((moduleName) => !ALL_MODULES.includes(moduleName))
  if (invalid.length > 0) {
    return { isValid: false, errors: [{ field, message: 'Contient des modules invalides' }] }
  }

  return { isValid: true, errors: [] }
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

  if (!data.role_type || !VALID_ROLE_TYPES.includes(data.role_type)) {
    errors.push({ field: 'role_type', message: 'Type de rôle invalide' })
  }

  if (data.membre_id && !isValidUUID(data.membre_id)) {
    errors.push({ field: 'membre_id', message: 'membre_id doit être un UUID' })
  }

  if (data.super_scope !== undefined) {
    const scopeValidation = validateScopeArray(data.super_scope)
    errors.push(...scopeValidation.errors)
  }

  if (data.modules) {
    const modulesValidation = validateModulesPayload(data.modules)
    errors.push(...modulesValidation.errors)
  }

  return { isValid: errors.length === 0, errors }
}

// Validation pour mettre à jour un admin
export function validateUpdateAdmin(data) {
  const errors = []

  if (data.email !== undefined && !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Email invalide' })
  }

  if (data.role_type && !VALID_ROLE_TYPES.includes(data.role_type)) {
    errors.push({ field: 'role_type', message: 'Type de rôle invalide' })
  }

  if (data.membre_id !== undefined && data.membre_id !== null && !isValidUUID(data.membre_id)) {
    errors.push({ field: 'membre_id', message: 'membre_id doit être un UUID' })
  }

  if (data.super_scope !== undefined) {
    const scopeValidation = validateScopeArray(data.super_scope)
    errors.push(...scopeValidation.errors)
  }

  if (data.disabled_until !== undefined && !isValidDateValue(data.disabled_until)) {
    errors.push({ field: 'disabled_until', message: 'Date invalide' })
  }

  if (data.modules) {
    const modulesValidation = validateModulesPayload(data.modules)
    errors.push(...modulesValidation.errors)
  }

  if (data.password && (typeof data.password !== 'string' || data.password.length < 8)) {
    errors.push({ field: 'password', message: 'Mot de passe invalide (min 8 caractères)' })
  }

  return { isValid: errors.length === 0, errors }
}

// Validation pour mettre à jour les modules
export function validateUpdateModules(data) {
  if (!data.modules) {
    return { isValid: false, errors: [{ field: 'modules', message: 'Modules requis' }] }
  }
  return validateModulesPayload(data.modules)
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

  if (limit < 1 || limit > 500) {
    return { isValid: false, errors: [{ field: 'limit', message: 'Limit doit être entre 1 et 500' }] }
  }

  return { isValid: true, errors: [], data: { page, limit, search: query.search } }
}
