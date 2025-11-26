import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminLogin from './AdminLogin'
import { persistAdminSession } from '../utils/auth'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = location.state?.from?.pathname || '/admin'

  const handleLoginSuccess = useCallback(
    (payload) => {
      try {
        persistAdminSession(payload)
        navigate(redirectPath, { replace: true })
      } catch (error) {
        console.error('Erreur lors de la création de la session admin', error)
        alert('Impossible de créer la session admin. Merci de réessayer.')
      }
    },
    [navigate, redirectPath],
  )

  return <AdminLogin onLoginSuccess={handleLoginSuccess} />
}





