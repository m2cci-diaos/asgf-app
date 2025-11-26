const ADMIN_INFO_KEY = 'asgf_admin_info'
const ADMIN_TOKEN_KEY = 'asgf_admin_token'

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

  try {
    return JSON.parse(storedAdmin)
  } catch (error) {
    console.error('Erreur lors du parsing admin stocké', error)
    clearAdminSession()
    return null
  }
}

export function persistAdminSession(payload) {
  const token = payload?.token
  const admin = payload?.admin

  if (!token || !admin) {
    throw new Error('Token et données admin requis pour créer une session')
  }

  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin))

  return admin
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_INFO_KEY)
}





