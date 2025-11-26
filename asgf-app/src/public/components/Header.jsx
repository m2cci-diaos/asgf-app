import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Fermer le menu quand on change de page
    setMenuOpen(false)
    document.body.style.overflow = ''
  }, [location])

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
    document.body.style.overflow = menuOpen ? '' : 'hidden'
  }

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.includes(path)) return true
    return false
  }

  const scrollToSection = (e, sectionId) => {
    e.preventDefault()
    
    // Si on n'est pas sur la page d'accueil, naviguer d'abord
    if (location.pathname !== '/') {
      // Naviguer vers l'accueil avec React Router
      navigate(`/#${sectionId}`, { replace: false })
      
      // Attendre que la navigation soit complète puis scroll
      setTimeout(() => {
        const scrollToElement = () => {
          const element = document.getElementById(sectionId)
          if (element) {
            const headerOffset = 80
            const elementPosition = element.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            })
          }
        }
        
        // Plusieurs tentatives pour s'assurer que le scroll fonctionne
        setTimeout(scrollToElement, 100)
        setTimeout(scrollToElement, 200)
        setTimeout(scrollToElement, 300)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(scrollToElement)
          })
        })
      }, 50)
      
      setMenuOpen(false)
      return
    }
    
    // Si on est déjà sur l'accueil, scroll vers la section
    const scrollToElement = () => {
      const element = document.getElementById(sectionId)
      if (element) {
        const headerOffset = 80
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }
    
    // Attendre un peu pour s'assurer que le DOM est prêt
    setTimeout(scrollToElement, 100)
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToElement)
    })
    
    setMenuOpen(false)
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
            <Link to="/" onClick={(e) => scrollToSection(e, 'apropos')}>À Propos</Link>
          </li>
          <li>
            <Link to="/" onClick={(e) => scrollToSection(e, 'missions')}>Missions</Link>
          </li>
          <li>
            <Link to="/" onClick={(e) => scrollToSection(e, 'activites')}>Activités</Link>
          </li>
          <li>
            <Link to="/" onClick={(e) => scrollToSection(e, 'partenariats')}>Partenariats</Link>
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

