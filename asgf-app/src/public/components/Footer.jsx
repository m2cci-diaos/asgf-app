import React from 'react'
import { Link, useLocation } from 'react-router-dom'

function Footer() {
  const currentYear = new Date().getFullYear()
  const location = useLocation()

  const scrollToSection = (e, sectionId) => {
    if (location.pathname !== '/') {
      // Si on n'est pas sur la page d'accueil, naviguer vers l'accueil avec l'ancre
      e.preventDefault()
      window.location.href = `/#${sectionId}`
      return
    }
    e.preventDefault()
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

  return (
    <footer>
      <div className="container">
        <div className="footer-content">
          <div className="footer-section footer-brand">
            <div className="footer-logo">
              <img 
                src="/assets/images/Logo_officiel_ASGF-removebg-preview.png" 
                alt="ASGF Logo" 
                className="footer-logo-img"
              />
              <div className="footer-brand-text">
                <h3>ASGF</h3>
                <p className="footer-tagline">Association des Géomaticiens Sénégalais de France</p>
              </div>
            </div>
            <p className="footer-mission">Unir les géomaticiens pour bâtir les territoires de demain</p>
            <div className="footer-social">
              <a 
                href="https://www.linkedin.com/company/association-des-s%C3%A9n%C3%A9galais-g%C3%A9omaticiens-de-france-agsf/?viewAsMember=true" 
                aria-label="LinkedIn" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link linkedin"
              >
                <i className="fab fa-linkedin-in"></i>
              </a>
              <a 
                href="#" 
                aria-label="Facebook" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link facebook"
              >
                <i className="fab fa-facebook-f"></i>
              </a>
              <a 
                href="#" 
                aria-label="Twitter" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link twitter"
              >
                <i className="fab fa-twitter"></i>
              </a>
              <a 
                href="#" 
                aria-label="WhatsApp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link whatsapp"
              >
                <i className="fab fa-whatsapp"></i>
              </a>
              <a 
                href="#" 
                aria-label="YouTube" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link youtube"
              >
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h4>Liens rapides</h4>
            <ul className="footer-links">
              <li>
                <Link to="/" onClick={(e) => scrollToSection(e, 'accueil')}>
                  <i className="fas fa-home"></i> Accueil
                </Link>
              </li>
              <li>
                <Link to="/" onClick={(e) => scrollToSection(e, 'apropos')}>
                  <i className="fas fa-info-circle"></i> À Propos
                </Link>
              </li>
              <li>
                <Link to="/" onClick={(e) => scrollToSection(e, 'missions')}>
                  <i className="fas fa-bullseye"></i> Missions
                </Link>
              </li>
              <li>
                <Link to="/" onClick={(e) => scrollToSection(e, 'activites')}>
                  <i className="fas fa-calendar-alt"></i> Activités
                </Link>
              </li>
              <li>
                <Link to="/bureau">
                  <i className="fas fa-users"></i> Bureau
                </Link>
              </li>
              <li>
                <Link to="/formation">
                  <i className="fas fa-graduation-cap"></i> Formations
                </Link>
              </li>
              <li>
                <Link to="/adhesion">
                  <i className="fas fa-user-plus"></i> Adhésion
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contact</h4>
            <div className="footer-contact">
              <div className="contact-item">
                <i className="fas fa-envelope"></i>
                <a href="mailto:association.geomaticiens.sf@gmail.com">
                  association.geomaticiens.sf@gmail.com
                </a>
              </div>
              <div className="contact-item">
                <i className="fas fa-phone"></i>
                <a href="tel:+33662081621">+33 (0)6 62 08 16 21</a>
              </div>
              <div className="contact-item">
                <i className="fas fa-map-marker-alt"></i>
                <span>France</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>&copy; {currentYear} Association des Géomaticiens Sénégalais de France. Tous droits réservés.</p>
            <p className="footer-heart">Conçu avec <span className="heart">❤️</span> pour promouvoir l'excellence géomatique africaine</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
