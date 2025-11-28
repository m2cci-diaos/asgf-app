import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { clearAdminSession, getStoredAdmin } from '../utils/auth'

export default function AdminProtectedLayout() {
  const [admin, setAdmin] = useState(() => getStoredAdmin())
  const location = useLocation()

  useEffect(() => {
    if (!admin) {
      setAdmin(getStoredAdmin())
    }
  }, [admin])

  const handleLogout = useCallback(() => {
    clearAdminSession()
    setAdmin(null)
  }, [])

  if (!admin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return (
    <AdminLayout>
      <Outlet context={{ admin, onLogout: handleLogout }} />
    </AdminLayout>
  )
}








