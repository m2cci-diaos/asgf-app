import React, { useState, useEffect } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Fermer le menu au changement de page
  useEffect(() => {
    setMenuOpen(false)
    // Réactiver le scroll
    document.body.style.removeProperty('overflow')
    document.body.style.removeProperty('overflow-y')
    document.documentElement.style.removeProperty('overflow')
    document.documentElement.style.removeProperty('overflow-y')
    document.body.style.overflowY = 'auto'
    document.documentElement.style.overflowY = 'auto'
  }, [location])

  const toggleMenu = () => {
    const newMenuState = !menuOpen
    setMenuOpen(newMenuState)
    if (newMenuState && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden'
      document.body.style.overflowY = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.overflowY = 'hidden'
    } else {
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow-y')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow-y')
    }
  }

  const scrollToSection = (e, sectionId) => {
    e.preventDefault()
    setMenuOpen(false)
    
    // Réactiver le scroll
    document.body.style.removeProperty('overflow')
    document.body.style.removeProperty('overflow-y')
    document.documentElement.style.removeProperty('overflow')
    document.documentElement.style.removeProperty('overflow-y')
    document.body.style.overflowY = 'auto'
    document.documentElement.style.overflowY = 'auto'
    
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`, { replace: false })
      setTimeout(() => {
        const element = document.getElementById(sectionId)
        if (element) {
          const headerOffset = 80
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          setTimeout(() => {
            window.scrollBy(0, -headerOffset)
          }, 100)
        }
      }, 200)
      return
    }
    
    const element = document.getElementById(sectionId)
    if (element) {
      const headerOffset = 80
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => {
        window.scrollBy(0, -headerOffset)
      }, 100)
    }
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        {/* Zone 1 : Logo */}
        <div className="navbar__brand">
          <Link to="/">
            <img 
              src="/assets/images/Logo_ASGF_Original.png" 
              alt="ASGF Logo" 
              className="navbar__logo"
            />
            <span className="navbar__brand-name">ASGF</span>
          </Link>
        </div>
        
        {/* Zone 2 : Liens centrés */}
        <nav className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
          <NavLink 
            to="/" 
            className={({ isActive }) => `navbar__link ${isActive && location.hash === '' ? 'navbar__link--active' : ''}`}
            onClick={(e) => scrollToSection(e, 'accueil')}
          >
            Accueil
          </NavLink>
          <NavLink 
            to="/bureau" 
            className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
          >
            Bureau
          </NavLink>
          <NavLink 
            to="/formation" 
            className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
          >
            Formations
          </NavLink>
          <NavLink 
            to="/webinaires" 
            className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
          >
            Webinaires
          </NavLink>
          <NavLink 
            to="/adhesion" 
            className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
          >
            Adhésion
          </NavLink>
          <NavLink 
            to="/projets" 
            className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
          >
            Projets
          </NavLink>
          <NavLink 
            to="/" 
            className="navbar__link"
            onClick={(e) => scrollToSection(e, 'contact')}
          >
            Contact
          </NavLink>
          {/* Bouton admin dans le menu mobile */}
          <Link 
            to="/admin" 
            className="navbar__admin-btn navbar__admin-btn--mobile"
            onClick={() => setMenuOpen(false)}
          >
            🔒 Admin
          </Link>
        </nav>
        
        {/* Zone 3 : Bouton admin desktop */}
        <Link 
          to="/admin" 
          className="navbar__admin-btn navbar__admin-btn--desktop"
        >
          🔒 Admin
        </Link>
        
        <button 
          className="navbar__toggle" 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      </div>
    </header>
  )
}

export default Navbar

