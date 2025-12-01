import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../public/components/Navbar'
import Footer from '../public/components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import '../public/styles/variables.css'
import '../public/styles/style.css'
import '../public/styles/responsive.css'

export default function PublicLayout() {
  // S'assurer que le scroll est toujours activé dans le layout
  useEffect(() => {
    const enableScroll = () => {
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow-y')
      document.body.style.removeProperty('overflow-x')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow-y')
      document.documentElement.style.removeProperty('overflow-x')
      document.body.style.overflowY = 'auto'
      document.documentElement.style.overflowY = 'auto'
    }
    
    // Réactiver le scroll au montage du layout
    enableScroll()
    
    // Réactiver périodiquement pour être sûr (toutes les secondes)
    const interval = setInterval(enableScroll, 1000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main className="public-content" style={{ paddingTop: '0' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}











