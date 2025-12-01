import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Footer.css'

function Footer() {
  const currentYear = new Date().getFullYear()
  const location = useLocation()
  const navigate = useNavigate()

  const scrollToSection = (e, sectionId) => {
    e.preventDefault()
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`)
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
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__col footer__brand">
          <div className="footer__brand-header">
            <img 
              src="/assets/images/Logo_ASGF_Original.png" 
              alt="ASGF Logo" 
              className="footer__logo"
            />
            <div>
              <h3 className="footer__brand-name">ASGF</h3>
              <p className="footer__tagline">Association des Géomaticiens Sénégalais de France</p>
            </div>
          </div>
          <p>Unir les géomaticiens pour bâtir les territoires de demain</p>
          <div className="footer__socials">
            <a 
              href="https://www.linkedin.com/company/association-des-s%C3%A9n%C3%A9galais-g%C3%A9omaticiens-de-france-agsf/?viewAsMember=true" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer__social-btn"
              aria-label="LinkedIn"
            >
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a 
              href="#" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer__social-btn"
              aria-label="Facebook"
            >
              <i className="fab fa-facebook-f"></i>
            </a>
            <a 
              href="#" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer__social-btn"
              aria-label="Twitter"
            >
              <i className="fab fa-twitter"></i>
            </a>
            <a 
              href="#" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer__social-btn"
              aria-label="WhatsApp"
            >
              <i className="fab fa-whatsapp"></i>
            </a>
            <a 
              href="#" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer__social-btn"
              aria-label="YouTube"
            >
              <i className="fab fa-youtube"></i>
            </a>
          </div>
        </div>

        <div className="footer__col footer__links">
          <h4 className="footer__title">Liens rapides</h4>
          <ul className="footer__nav">
            <li>
              <Link to="/" className="footer__link" onClick={(e) => scrollToSection(e, 'accueil')}>
                <i className="fas fa-home"></i> Accueil
              </Link>
            </li>
            <li>
              <Link to="/bureau" className="footer__link">
                <i className="fas fa-users"></i> Bureau
              </Link>
            </li>
            <li>
              <Link to="/formation" className="footer__link">
                <i className="fas fa-graduation-cap"></i> Formations
              </Link>
            </li>
            <li>
              <Link to="/webinaires" className="footer__link">
                <i className="fas fa-video"></i> Webinaires
              </Link>
            </li>
            <li>
              <Link to="/adhesion" className="footer__link">
                <i className="fas fa-user-plus"></i> Adhésion
              </Link>
            </li>
            <li>
              <Link to="/" className="footer__link" onClick={(e) => scrollToSection(e, 'contact')}>
                <i className="fas fa-envelope"></i> Contact
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer__col footer__contact">
          <h4 className="footer__title">Contact</h4>
          <ul className="footer__contact-list">
            <li>
              <a href="mailto:association.geomaticiens.sf@gmail.com" className="footer__link">
                <i className="fas fa-envelope"></i> association.geomaticiens.sf@gmail.com
              </a>
            </li>
            <li>
              <a href="tel:+33662081621" className="footer__link">
                <i className="fas fa-phone"></i> +33 (0)6 62 08 16 21
              </a>
            </li>
            <li>
              <span className="footer__link" style={{cursor: 'default'}}>
                <i className="fas fa-map-marker-alt"></i> France
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <p>&copy; {currentYear} Association des Géomaticiens Sénégalais de France. Tous droits réservés.</p>
      </div>
    </footer>
  )
}

export default Footer
