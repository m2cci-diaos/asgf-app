const ADMIN_INFO_KEY = 'asgf_admin_info'
const ADMIN_TOKEN_KEY = 'asgf_admin_token'
const ADMIN_LAST_ACTIVITY_KEY = 'asgf_admin_last_activity'
const ADMIN_MODULE_KEY = 'asgf_admin_active_module'
const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes en millisecondes

export function getStoredToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function getStoredAdmin() {
  const storedAdmin = localStorage.getItem(ADMIN_INFO_KEY)
  const token = getStoredToken()

  if (!storedAdmin || !token) {
    clearAdminSession()
    return null
  }

  // Vérifier l'inactivité (15 minutes)
  const lastActivity = localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY)
  if (lastActivity) {
    const lastActivityTime = parseInt(lastActivity, 10)
    const now = Date.now()
    const timeSinceActivity = now - lastActivityTime

    if (timeSinceActivity > INACTIVITY_TIMEOUT) {
      console.log('Session expirée par inactivité')
      clearAdminSession()
      return null
    }
  }

  try {
    return JSON.parse(storedAdmin)
  } catch (error) {
    console.error('Erreur lors du parsing admin stocké', error)
    clearAdminSession()
    return null
  }
}

export function updateLastActivity() {
  localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, Date.now().toString())
}

export function persistAdminSession(payload) {
  const token = payload?.token
  const admin = payload?.admin

  if (!token || !admin) {
    throw new Error('Token et données admin requis pour créer une session')
  }

  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin))
  updateLastActivity() // Initialiser l'activité

  return admin
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_INFO_KEY)
  localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY)
  localStorage.removeItem(ADMIN_MODULE_KEY)
}

export function getStoredActiveModule() {
  if (typeof window === 'undefined') return 'dashboard'
  return localStorage.getItem(ADMIN_MODULE_KEY) || 'dashboard'
}

export function setStoredActiveModule(module) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ADMIN_MODULE_KEY, module)
}













