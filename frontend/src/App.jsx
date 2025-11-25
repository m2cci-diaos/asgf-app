// src/App.jsx
import { useEffect, useState } from 'react'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  const [admin, setAdmin] = useState(null)

  // Au chargement, on regarde si un admin est déjà stocké
  useEffect(() => {
    const storedAdmin = localStorage.getItem('asgf_admin_info')
    const storedToken = localStorage.getItem('asgf_admin_token')

    console.log('Chargement initial - Admin:', !!storedAdmin, 'Token:', !!storedToken)

    if (storedAdmin) {
      try {
        const parsed = JSON.parse(storedAdmin)
        // Vérifier que le token existe aussi
        if (storedToken) {
          console.log('✅ Admin et token trouvés, restauration de la session')
          setAdmin(parsed)
        } else {
          console.warn('⚠️ Admin trouvé mais token manquant, nettoyage')
          localStorage.removeItem('asgf_admin_info')
          setAdmin(null)
        }
      } catch (e) {
        console.error('Erreur de parsing admin depuis localStorage', e)
        localStorage.removeItem('asgf_admin_info')
        localStorage.removeItem('asgf_admin_token')
      }
    } else if (storedToken) {
      // Token orphelin, on le supprime
      console.warn('⚠️ Token trouvé sans admin, nettoyage')
      localStorage.removeItem('asgf_admin_token')
    }
  }, [])

  // Appelé après un login réussi
  const handleLoginSuccess = (payload) => {
    // payload devrait être { token, admin } après extraction dans loginAdminApi
    console.log('handleLoginSuccess - payload complet:', payload)
    
    // Extraction du token et admin
    const token = payload?.token
    const adminData = payload?.admin

    console.log('Token extrait:', token ? token.substring(0, 20) + '...' : 'MANQUANT')
    console.log('Admin extrait:', adminData ? 'PRÉSENT' : 'MANQUANT')

    if (!adminData) {
      console.error('handleLoginSuccess - Admin manquant dans payload:', payload)
      alert('Erreur: Données admin manquantes. Veuillez réessayer.')
      return
    }

    if (!token) {
      console.error('handleLoginSuccess - Token manquant dans payload:', payload)
      alert('Erreur: Token manquant. Veuillez réessayer.')
      return
    }

    // On stocke l'admin et le token pour les prochaines requêtes
    try {
      localStorage.setItem('asgf_admin_info', JSON.stringify(adminData))
      localStorage.setItem('asgf_admin_token', token)
      
      // Vérification que le stockage a fonctionné
      const storedToken = localStorage.getItem('asgf_admin_token')
      if (!storedToken) {
        console.error('Échec du stockage du token dans localStorage')
        alert('Erreur lors du stockage du token. Veuillez réessayer.')
        return
      }
      
      console.log('✅ Token stocké avec succès:', storedToken.substring(0, 20) + '...')
      console.log('✅ Admin stocké avec succès')
    } catch (e) {
      console.error('Erreur lors du stockage dans localStorage:', e)
      alert('Erreur lors du stockage des données. Veuillez réessayer.')
      return
    }

    setAdmin(adminData)
  }

  const handleLogout = () => {
    localStorage.removeItem('asgf_admin_info')
    localStorage.removeItem('asgf_admin_token')
    setAdmin(null)
  }

  // Wrapper pour garantir 100% hauteur
  return (
    <div className="w-full h-screen overflow-hidden">
      {!admin ? (
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      ) : (
        <AdminDashboard admin={admin} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
