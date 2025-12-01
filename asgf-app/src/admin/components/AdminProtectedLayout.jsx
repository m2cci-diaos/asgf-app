import { useCallback, useEffect, useState, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { clearAdminSession, getStoredAdmin, updateLastActivity } from '../utils/auth'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes

export default function AdminProtectedLayout() {
  const [admin, setAdmin] = useState(() => getStoredAdmin())
  const [isChecking, setIsChecking] = useState(true)
  const location = useLocation()
  const inactivityTimerRef = useRef(null)
  const activityCheckIntervalRef = useRef(null)

  // Vérifier l'activité et déconnecter si inactif
  useEffect(() => {
    if (!admin) {
      setIsChecking(false)
      return
    }

    // Mettre à jour l'activité sur les événements utilisateur
    const updateActivity = () => {
      updateLastActivity()
    }

    // Événements qui indiquent une activité
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // Vérifier périodiquement l'inactivité (toutes les minutes)
    activityCheckIntervalRef.current = setInterval(() => {
      const lastActivity = localStorage.getItem('asgf_admin_last_activity')
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity, 10)
        const now = Date.now()
        const timeSinceActivity = now - lastActivityTime

        if (timeSinceActivity > INACTIVITY_TIMEOUT) {
          console.log('Déconnexion automatique après 15 minutes d\'inactivité')
          clearAdminSession()
          setAdmin(null)
          // Rediriger vers la page de login
          window.location.href = '/admin/login?timeout=true'
        }
      }
    }, 60000) // Vérifier toutes les minutes

    // Initialiser l'activité
    updateLastActivity()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current)
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [admin])

  useEffect(() => {
    // Vérifier l'admin au chargement
    const checkAdmin = async () => {
      setIsChecking(true)
      const storedAdmin = getStoredAdmin()
      if (storedAdmin) {
        setAdmin(storedAdmin)
      } else {
        setAdmin(null)
      }
      setIsChecking(false)
    }
    checkAdmin()
  }, [])

  const handleLogout = useCallback(() => {
    clearAdminSession()
    setAdmin(null)
  }, [])

  // Afficher un loading pendant la vérification
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div className="spinner" style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255,255,255,0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ fontSize: '18px', fontWeight: 500 }}>Chargement...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return (
    <AdminLayout>
      <Outlet context={{ admin, onLogout: handleLogout }} />
    </AdminLayout>
  )
}













