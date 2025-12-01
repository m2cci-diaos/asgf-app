import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // S'assurer que le scroll est activé au chargement et que le menu est fermé
  useEffect(() => {
    setMenuOpen(false)
    // Forcer la réinitialisation du scroll - utiliser setTimeout pour s'assurer que c'est après le rendu
    setTimeout(() => {
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow-y')
      document.body.style.removeProperty('overflow-x')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow-y')
      // Forcer explicitement le scroll activé
      document.body.style.overflowY = 'auto'
      document.documentElement.style.overflowY = 'auto'
    }, 0)
  }, [])

  useEffect(() => {
    // Fermer le menu quand on change de page
    setMenuOpen(false)
    
    // S'assurer que le scroll est toujours activé quand on change de page
    // Utiliser plusieurs tentatives pour être sûr que ça fonctionne
    const enableScroll = () => {
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow-y')
      document.body.style.removeProperty('overflow-x')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow-y')
      document.documentElement.style.removeProperty('overflow-x')
      // Forcer explicitement le scroll activé
      document.body.style.overflowY = 'auto'
      document.documentElement.style.overflowY = 'auto'
    }
    
    // Réactiver immédiatement
    enableScroll()
    
    // Réactiver après plusieurs frames pour être sûr
    setTimeout(enableScroll, 0)
    setTimeout(enableScroll, 50)
    setTimeout(enableScroll, 100)
    setTimeout(enableScroll, 200)
    
    requestAnimationFrame(() => {
      enableScroll()
      requestAnimationFrame(() => {
        enableScroll()
      })
    })
  }, [location])

  const toggleMenu = () => {
    const newMenuState = !menuOpen
    setMenuOpen(newMenuState)
    // Bloquer le scroll uniquement quand le menu mobile est ouvert
    // newMenuState = true signifie menu ouvert, donc on bloque le scroll
    if (newMenuState && window.innerWidth < 768) {
      // Bloquer le scroll uniquement sur mobile (écran < 768px) quand le menu est ouvert
      document.body.style.overflow = 'hidden'
      document.body.style.overflowY = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.overflowY = 'hidden'
    } else {
      // Réactiver le scroll (menu fermé ou desktop)
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow-y')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow-y')
    }
  }

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.includes(path)) return true
    return false
  }

  const scrollToSection = (e, sectionId) => {
    e.preventDefault()
    
    // Fermer le menu mobile
    setMenuOpen(false)
    
    // S'assurer que le scroll est activé
    document.body.style.removeProperty('overflow')
    document.body.style.removeProperty('overflow-y')
    document.documentElement.style.removeProperty('overflow')
    document.documentElement.style.removeProperty('overflow-y')
    document.body.style.overflowY = 'auto'
    document.documentElement.style.overflowY = 'auto'
    
    // Si on n'est pas sur la page d'accueil, naviguer d'abord
    if (location.pathname !== '/') {
      // Naviguer vers l'accueil avec React Router
      navigate(`/#${sectionId}`, { replace: false })
      
      // Attendre que la navigation soit complète puis scroll
      const attemptScroll = () => {
        const element = document.getElementById(sectionId)
        if (element) {
          const headerOffset = 90
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset
          
          // Utiliser scrollIntoView qui est plus fiable
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
          
          // Ajuster pour le header fixed
          setTimeout(() => {
            window.scrollBy(0, -headerOffset)
          }, 100)
        } else {
          // Si l'élément n'est pas trouvé, réessayer
          setTimeout(attemptScroll, 100)
        }
      }
      
      // Plusieurs tentatives pour s'assurer que le scroll fonctionne
      setTimeout(attemptScroll, 200)
      setTimeout(attemptScroll, 400)
      setTimeout(attemptScroll, 600)
      
      return
    }
    
    // Si on est déjà sur l'accueil, scroll vers la section
    const scrollToElement = () => {
      const element = document.getElementById(sectionId)
      if (element) {
        const headerOffset = 90
        
        // Utiliser scrollIntoView qui est plus fiable
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
        
        // Ajuster pour le header fixed après le scroll
        setTimeout(() => {
          const currentScroll = window.pageYOffset || document.documentElement.scrollTop
          window.scrollTo({
            top: currentScroll - headerOffset,
            behavior: 'smooth'
          })
        }, 100)
      } else {
        console.warn(`Section avec l'ID "${sectionId}" non trouvée`)
      }
    }
    
    // Attendre un peu pour s'assurer que le DOM est prêt
    setTimeout(scrollToElement, 50)
    setTimeout(scrollToElement, 150)
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToElement)
    })
  }

  useEffect(() => {
    // Header background on scroll
    let headerRaf = null
    const handleScroll = () => {
      if (headerRaf) return
      headerRaf = requestAnimationFrame(() => {
        const header = document.querySelector('header')
        if (header) {
          if (window.scrollY > 100) {
            header.style.background = 'rgba(0, 102, 204, 0.95)'
            header.style.backdropFilter = 'blur(10px)'
          } else {
            header.style.background = 'linear-gradient(135deg, #0066CC, #0052A3)'
            header.style.backdropFilter = 'none'
          }
        }
        headerRaf = null
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header>
      <nav className="container">
        <Link to="/" className="logo">
          <img src="/assets/images/Logo_officiel_ASGF-removebg-preview.png" alt="ASGF Logo" style={{height: '50px', width: 'auto'}} />
          <span style={{marginLeft: '10px', color: 'white', textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'}}>ASGF</span>
        </Link>
        <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>
          <li>
            <Link to="/" onClick={(e) => scrollToSection(e, 'accueil')}>Accueil</Link>
          </li>
          <li>
            <Link to="/bureau" className={isActive('/bureau') ? 'active' : ''}>Bureau</Link>
          </li>
          <li>
            <Link to="/formation" className={isActive('/formation') ? 'active' : ''}>Nos formations</Link>
          </li>
          <li>
            <Link to="/webinaires" className={isActive('/webinaires') ? 'active' : ''}>Webinaires</Link>
          </li>
          <li>
            <Link to="/adhesion" className={isActive('/adhesion') ? 'active' : ''}>Adhésion</Link>
          </li>
          
          <li>
            <Link to="/" onClick={(e) => scrollToSection(e, 'contact')}>Contact</Link>
          </li>
        </ul>
        <button className="mobile-menu" onClick={toggleMenu}>
          <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      </nav>
    </header>
  )
}

export default Header

