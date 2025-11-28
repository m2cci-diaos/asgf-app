import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

function Home() {
  const location = useLocation()
  const [contactForm, setContactForm] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  })
  const [contactStatus, setContactStatus] = useState({ type: '', message: '' })
  const [contactLoading, setContactLoading] = useState(false)

  useEffect(() => {
    // Gérer le scroll vers une section si une ancre est présente dans l'URL
    if (location.hash) {
      const sectionId = location.hash.substring(1) // Enlever le #
      
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
      setTimeout(scrollToElement, 500)
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(scrollToElement)
        })
      })
    } else {
      // Sinon, scroll vers le haut
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
  }, [location.hash, location.pathname])

  useEffect(() => {
    // Intersection Observer pour les animations fade-in
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, observerOptions)

    document.querySelectorAll('.fade-in').forEach(el => {
      observer.observe(el)
    })

    // Animation des stats
    const animateStats = () => {
      const stats = document.querySelectorAll('#stats .mission-card h3')
      stats.forEach(stat => {
        const target = parseInt(stat.textContent.replace(/[^0-9]/g, ''))
        if (target && !stat.dataset.animated) {
          stat.dataset.animated = 'true'
          let current = 0
          const increment = target / 50
          const timer = setInterval(() => {
            current += increment
            if (current >= target) {
              stat.textContent = stat.textContent.replace(/[0-9]+/, target)
              clearInterval(timer)
            } else {
              stat.textContent = stat.textContent.replace(/[0-9]+/, Math.floor(current))
            }
          }, 30)
        }
      })
    }

    // Observer pour les stats
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateStats()
        }
      })
    }, observerOptions)

    const statsSection = document.getElementById('stats')
    if (statsSection) {
      statsObserver.observe(statsSection)
    }

    return () => {
      observer.disconnect()
      statsObserver.disconnect()
    }
  }, [])

  const scrollToSection = (e, sectionId) => {
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

  const handleContactChange = (event) => {
    const { name, value } = event.target
    setContactForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleContactSubmit = async (event) => {
    event.preventDefault()
    setContactStatus({ type: '', message: '' })

    if (!contactForm.email.includes('@')) {
      setContactStatus({ type: 'error', message: 'Merci de saisir un email valide.' })
      return
    }

    setContactLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/contact/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: contactForm.fullName.trim(),
          email: contactForm.email.trim(),
          subject: contactForm.subject.trim(),
          message: contactForm.message.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.message || "Impossible d'envoyer le message pour le moment.")
      }

      setContactStatus({
        type: 'success',
        message: 'Merci ! Votre message a bien été envoyé. Nous revenons vers vous rapidement.',
      })
      setContactForm({
        fullName: '',
        email: '',
        subject: '',
        message: '',
      })
    } catch (error) {
      setContactStatus({
        type: 'error',
        message:
          error.message ||
          "Une erreur est survenue lors de l'envoi du message. Merci de réessayer plus tard.",
      })
    } finally {
      setContactLoading(false)
    }
  }

  return (
    <>
      {/* Hero Section */}
      <section id="accueil" className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Association des Géomaticiens Sénégalais de France</h1>
            <p style={{fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem'}}>ENSEMBLE, CARTOGRAPHIONS DEMAIN</p>
            <p>Unir les géomaticiens pour bâtir les territoires de demain</p>
            <p style={{marginTop: '1rem', fontStyle: 'italic'}}>Innovation géospatiale et coopération internationale</p>
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem'}}>
              <a href="#apropos" className="cta-button" onClick={(e) => scrollToSection(e, 'apropos')}>Découvrir notre mission</a>
              <Link to="/adhesion" className="cta-button" style={{background: 'var(--accent-color)', color: 'var(--dark-color)'}}>
                <i className="fas fa-user-plus"></i> Nous rejoindre
              </Link>
              <a href="/assets/documents/plaquette_asgf.pdf" className="cta-button" download style={{background: 'transparent', border: '2px solid white'}}>
                <i className="fas fa-download"></i> Télécharger la plaquette
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="apropos" className="about">
        <div className="container">
          <h2 className="section-title fade-in">À Propos du ASGF</h2>
          <div className="about-content">
            <div className="about-text fade-in">
              <p><strong>Ensemble.</strong> C'est le mot qui résume notre raison d'être, notre force et notre engagement.</p>
              <p>L'Association des Géomaticiens Sénégalais de France (ASGF) est née d'une conviction simple : la géomatique est un levier puissant pour comprendre, planifier et transformer nos territoires.</p>
              <p>Notre ambition est claire : rassembler la diaspora sénégalaise autour d'un projet collectif, où les compétences techniques rencontrent la volonté d'agir pour le développement durable du Sénégal.</p>
              <p>Chaque membre de notre réseau, qu'il soit étudiant, professionnel ou enseignant, participe à construire cette dynamique d'innovation, de solidarité et de partage du savoir.</p>
              <p style={{marginTop: '1.5rem', fontStyle: 'italic', color: 'var(--primary-color)'}}>"Unir les géomaticiens pour bâtir les territoires de demain."</p>
            </div>
            <div className="about-image fade-in">
              <i className="fas fa-map-marked-alt"></i>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" style={{background: 'var(--gradient)', color: 'white', padding: '60px 0'}}>
        <div className="container">
          <h2 className="section-title fade-in" style={{color: 'white'}}>Votre Association en Chiffres</h2>
          <div className="missions-grid" style={{marginTop: '3rem'}}>
            <div className="mission-card fade-in" style={{background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: 'none'}}>
              <i className="fas fa-users" style={{color: 'white', fontSize: '3.5rem'}}></i>
              <h3 style={{color: 'white', fontSize: '2.5rem', margin: '1rem 0'}}>+50</h3>
              <p style={{color: 'rgba(255,255,255,0.9)'}}>Membres et sympathisants en France et au Sénégal</p>
            </div>
            <div className="mission-card fade-in" style={{background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: 'none'}}>
              <i className="fas fa-sitemap" style={{color: 'white', fontSize: '3.5rem'}}></i>
              <h3 style={{color: 'white', fontSize: '2.5rem', margin: '1rem 0'}}>6</h3>
              <p style={{color: 'rgba(255,255,255,0.9)'}}>Pôles actifs</p>
            </div>
            <div className="mission-card fade-in" style={{background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: 'none'}}>
              <i className="fas fa-project-diagram" style={{color: 'white', fontSize: '3.5rem'}}></i>
              <h3 style={{color: 'white', fontSize: '2.5rem', margin: '1rem 0'}}>4</h3>
              <p style={{color: 'rgba(255,255,255,0.9)'}}>Projets SIG innovants en développement</p>
            </div>
            <div className="mission-card fade-in" style={{background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: 'none'}}>
              <i className="fas fa-chalkboard-teacher" style={{color: 'white', fontSize: '3.5rem'}}></i>
              <h3 style={{color: 'white', fontSize: '2.5rem', margin: '1rem 0'}}>3</h3>
              <p style={{color: 'rgba(255,255,255,0.9)'}}>Formations et webinaires</p>
            </div>
            <div className="mission-card fade-in" style={{background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: 'none'}}>
              <i className="fas fa-handshake" style={{color: 'white', fontSize: '3.5rem'}}></i>
              <h3 style={{color: 'white', fontSize: '2.5rem', margin: '1rem 0'}}>3</h3>
              <p style={{color: 'rgba(255,255,255,0.9)'}}>Partenariats institutionnels en cours</p>
            </div>
            <div className="mission-card fade-in" style={{background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: 'none'}}>
              <i className="fas fa-heart" style={{color: 'white', fontSize: '3.5rem'}}></i>
              <h3 style={{color: 'white', fontSize: '2.5rem', margin: '1rem 0'}}>100%</h3>
              <p style={{color: 'rgba(255,255,255,0.9)'}}>D'engagement bénévole au service de la géomatique</p>
            </div>
          </div>
        </div>
      </section>

      {/* Missions Section */}
      <section id="missions">
        <div className="container">
          <h2 className="section-title fade-in">Nos 5 Engagements pour la Géomatique</h2>
          <div className="missions-grid">
            <div className="mission-card fade-in">
              <i className="fas fa-graduation-cap"></i>
              <h3>Partager le savoir et former les générations futures</h3>
              <p>Nous organisons régulièrement des webinaires, ateliers et formations pratiques pour renforcer les compétences techniques des membres et des étudiants. Chaque activité vise à démocratiser la géomatique et à en faire un outil accessible à tous au service du développement durable.</p>
            </div>
            <div className="mission-card fade-in">
              <i className="fas fa-rocket"></i>
              <h3>Soutenir l'innovation et les projets SIG</h3>
              <p>Le pôle "Innovations et Projets SIG" pilote plusieurs initiatives concrètes : observatoires thématiques, dashboards interactifs, bases de données open data et géoportails. L'objectif : faire de la donnée géospatiale un levier de décision au service des territoires sénégalais.</p>
            </div>
            <div className="mission-card fade-in">
              <i className="fas fa-globe-africa"></i>
              <h3>Promouvoir la coopération entre la France et le Sénégal</h3>
              <p>L'ASGF s'appuie sur la force de sa diaspora pour tisser des ponts entre les géomaticiens des deux pays. Nous travaillons main dans la main avec les universités, les associations locales et les institutions publiques pour développer une géomatique collaborative et solidaire.</p>
            </div>
            <div className="mission-card fade-in">
              <i className="fas fa-handshake"></i>
              <h3>Renforcer les partenariats et la visibilité des géomaticiens</h3>
              <p>Nous collaborons avec des acteurs tels que GéoSénégal, les universités et les entreprises du secteur. Ces alliances permettent de valoriser les compétences sénégalaises, d'accéder à de nouvelles ressources et de créer un réseau professionnel dynamique et reconnu.</p>
            </div>
            <div className="mission-card fade-in">
              <i className="fas fa-users"></i>
              <h3>Encourager l'inclusion, la jeunesse et le leadership</h3>
              <p>L'ASGF promeut la participation active des jeunes et des femmes dans la géomatique. Nous croyons en une communauté ouverte, bienveillante et solidaire où chacun peut apprendre, partager et évoluer dans un esprit d'excellence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section id="activites" className="activities">
        <div className="container">
          <h2 className="section-title fade-in">Nos Activités</h2>
          <div className="activities-grid">
            <div className="activity-card fade-in">
              <div className="activity-header">
                <i className="fas fa-chalkboard-teacher"></i>
                <h3>Formations & Ateliers</h3>
              </div>
              <div className="activity-content">
                <p>Organisation de formations pratiques sur les logiciels SIG, la télédétection, la cartographie numérique et les nouvelles technologies géospatiales.</p>
              </div>
            </div>
            <div className="activity-card fade-in">
              <div className="activity-header">
                <i className="fas fa-microphone"></i>
                <h3>Conférences & Séminaires</h3>
              </div>
              <div className="activity-content">
                <p>Invitation d'experts pour des conférences sur les enjeux de la géomatique en Afrique et les opportunités professionnelles.</p>
              </div>
            </div>
            <div className="activity-card fade-in">
              <div className="activity-header">
                <i className="fas fa-project-diagram"></i>
                <h3>Projets Collaboratifs</h3>
              </div>
              <div className="activity-content">
                <p>Développement de projets géomatiques pour résoudre des problématiques concrètes au Sénégal et en Afrique.</p>
              </div>
            </div>
            <div className="activity-card fade-in">
              <div className="activity-header">
                <i className="fas fa-calendar-alt"></i>
                <h3>Événements Culturels</h3>
              </div>
              <div className="activity-content">
                <p>Organisation d'événements culturels pour maintenir le lien avec nos racines sénégalaises tout en célébrant la diversité.</p>
              </div>
            </div>
            <div className="activity-card fade-in">
              <div className="activity-header">
                <i className="fas fa-briefcase"></i>
                <h3>Insertion Professionnelle</h3>
              </div>
              <div className="activity-content">
                <p>Accompagnement dans la recherche de stages, d'emplois et création d'un réseau professionnel dans le secteur géomatique.</p>
              </div>
            </div>
            <div className="activity-card fade-in">
              <div className="activity-header">
                <i className="fas fa-book-open"></i>
                <h3>Publications & Recherche</h3>
              </div>
              <div className="activity-content">
                <p>Encouragement de la recherche scientifique et publication d'articles sur les applications de la géomatique en Afrique.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnerships Section */}
      <section id="partenariats">
        <div className="container">
          <h2 className="section-title fade-in">Nos Partenariats</h2>
          <div className="partners-grid">
            <div className="partner-card fade-in">
              <i className="fas fa-university"></i>
              <h3>Universités Sénégalaises et Françaises</h3>
              <p>Partenariats avec les universités sénégalaises comme celle de <a href="https://www.ussein.sn/master-geomatique/" target="_blank" rel="noopener noreferrer">Elhadj Ibrahima Niass</a> proposant des formations en géomatique pour faciliter la collaboration et l'intégration de nos membres.</p>
            </div>
            <div className="partner-card fade-in">
              <i className="fas fa-building"></i>
              <h3>Entreprises Géomatiques</h3>
              <p>Collaboration avec les entreprises du secteur pour offrir des opportunités de stages et d'emplois à nos membres.</p>
            </div>
            <div className="partner-card fade-in">
              <i className="fas fa-flag"></i>
              <h3>Institutions Sénégalaises</h3>
              <p>Liens étroits avec les institutions sénégalaises <a href="https://anat.sn/" target="_blank" rel="noopener noreferrer">ANAT</a> et <a href="https://www.geosenegal.gouv.sn/" target="_blank" rel="noopener noreferrer">GeoSenegal</a> pour faciliter le transfert de compétences et les projets de développement.</p>
            </div>
            <div className="partner-card fade-in">
              <i className="fas fa-globe"></i>
              <h3>Organisations Internationales</h3>
              <p>Partenariats avec les ONG et organisations internationales travaillant sur les questions de développement en Afrique.</p>
            </div>
            <div className="partner-card fade-in">
              <i className="fas fa-users-cog"></i>
              <h3>Associations Étudiantes</h3>
              <p>Collaboration avec d'autres associations d'étudiants africains en France pour mutualiser nos ressources.</p>
            </div>
            <div className="partner-card fade-in">
              <i className="fas fa-laptop-code"></i>
              <h3>Entreprises Tech</h3>
              <p>Partenariats avec les entreprises technologiques spécialisées dans les solutions géospatiales innovantes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="container">
          <h2 className="section-title fade-in" style={{color: 'white'}}>Contactez-nous</h2>
          <div className="contact-content">
            <form className="contact-form fade-in" onSubmit={handleContactSubmit}>
              <h3>Envoyez-nous un message</h3>
              <div className="form-group">
                <label htmlFor="contact-nom">Nom complet</label>
                <input
                  type="text"
                  id="contact-nom"
                  name="fullName"
                  value={contactForm.fullName}
                  onChange={handleContactChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-email">Email</label>
                <input
                  type="email"
                  id="contact-email"
                  name="email"
                  value={contactForm.email}
                  onChange={handleContactChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-sujet">Sujet</label>
                <input
                  type="text"
                  id="contact-sujet"
                  name="subject"
                  value={contactForm.subject}
                  onChange={handleContactChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows="5"
                  value={contactForm.message}
                  onChange={handleContactChange}
                  required
                ></textarea>
              </div>
              {contactStatus.message && (
                <p
                  style={{
                    marginBottom: '1rem',
                    color: contactStatus.type === 'success' ? '#6ee7b7' : '#fecaca',
                    fontWeight: 500,
                  }}
                  aria-live="polite"
                >
                  {contactStatus.message}
                </p>
              )}
              <button type="submit" className="submit-btn" disabled={contactLoading}>
                {contactLoading ? 'Envoi en cours...' : 'Envoyer le message'}
              </button>
            </form>
            <div className="contact-info fade-in">
              <h3>Informations de contact</h3>
              <div className="contact-item">
                <i className="fas fa-envelope"></i>
                <span>association.geomaticiens.sf@gmail.com</span>
              </div>
              <div className="contact-item">
                <i className="fas fa-phone"></i>
                <span>+33 (0)6 62 08 16 21 / +33 (0)6 52 45 47 85</span>
              </div>
              <div className="contact-item">
                <i className="fas fa-map-marker-alt"></i>
                <span>France</span>
              </div>
              <div className="contact-item">
                <i className="fas fa-clock"></i>
                <span>Disponible 7j/7</span>
              </div>
              <h4 style={{marginTop: '2rem', marginBottom: '1rem'}}>Suivez-nous</h4>
              <div className="social-links">
                <a href="#" title="Facebook"><i className="fab fa-facebook"></i></a>
                <a href="#" title="Twitter"><i className="fab fa-twitter"></i></a>
                <a href="https://www.linkedin.com/company/association-des-s%C3%A9n%C3%A9galais-g%C3%A9omaticiens-de-france-agsf/?viewAsMember=true" title="LinkedIn" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin"></i></a>
                <a href="#" title="Instagram"><i className="fab fa-instagram"></i></a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
