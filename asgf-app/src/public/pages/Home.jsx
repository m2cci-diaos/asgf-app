import React, { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Composant StatCard avec animation de compteur
function StatCard({ stat }) {
  const [displayedValue, setDisplayedValue] = useState(0)
  const cardRef = useRef(null)
  const animatedRef = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animatedRef.current) {
            animatedRef.current = true
            let current = 0
            const increment = stat.value / 50
            const timer = setInterval(() => {
              current += increment
              if (current >= stat.value) {
                setDisplayedValue(stat.value)
                clearInterval(timer)
              } else {
                setDisplayedValue(Math.floor(current))
              }
            }, 30)
          }
        })
      },
      { threshold: 0.3 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current)
      }
    }
  }, [stat.value])

  return (
    <div className="stat-card" ref={cardRef}>
      <div className="stat-card__icon">
        <i className={`fas ${stat.icon}`}></i>
      </div>
      <div className="stat-card__value">
        {displayedValue}{stat.suffix}
      </div>
      <p className="stat-card__label">{stat.label}</p>
    </div>
  )
}

function Home() {
  const location = useLocation()
  // State pour l'onglet actif - toujours initialisé à 'apropos' par défaut
  const [activeTab, setActiveTab] = useState('apropos')
  const [contactForm, setContactForm] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  })
  const [contactStatus, setContactStatus] = useState({ type: '', message: '' })
  const [contactLoading, setContactLoading] = useState(false)

  // Effet pour gérer le hash de l'URL et l'onglet actif
  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.substring(1)
      if (['apropos', 'missions', 'activites', 'partenariats'].includes(sectionId)) {
        setActiveTab(sectionId)
      }
    } else if (location.pathname === '/') {
      // Si on est sur la page d'accueil sans hash, s'assurer qu'un onglet est actif
      setActiveTab(prev => prev || 'apropos')
    }
  }, [location.hash, location.pathname])

  // Effet séparé pour le scroll
  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.substring(1)
      
      if (['apropos', 'missions', 'activites', 'partenariats'].includes(sectionId)) {
        // Scroll vers la section accueil-content d'abord
        setTimeout(() => {
          const accueilElement = document.getElementById('accueil-content')
          if (accueilElement) {
            accueilElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
            setTimeout(() => {
              const currentScroll = window.pageYOffset || document.documentElement.scrollTop
              window.scrollTo({ top: currentScroll - 90, behavior: 'smooth' })
            }, 100)
          }
        }, 100)
      }
      
      // S'assurer que le scroll est activé
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow-y')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow-y')
      document.body.style.overflowY = 'auto'
      document.documentElement.style.overflowY = 'auto'
      
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
      
      // Plusieurs tentatives pour s'assurer que le scroll fonctionne
      setTimeout(scrollToElement, 100)
      setTimeout(scrollToElement, 300)
      setTimeout(scrollToElement, 500)
      setTimeout(scrollToElement, 700)
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(scrollToElement)
        })
      })
    } else {
      // Sinon, scroll vers le haut seulement si on vient d'arriver sur la page
      if (location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
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

    return () => {
      observer.disconnect()
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
              <a 
                href="#accueil-content" 
                className="cta-button" 
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab('missions')
                  setTimeout(() => {
                    const accueilElement = document.getElementById('accueil-content')
                    if (accueilElement) {
                      accueilElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      setTimeout(() => {
                        const currentScroll = window.pageYOffset || document.documentElement.scrollTop
                        window.scrollTo({ top: currentScroll - 90, behavior: 'smooth' })
                      }, 100)
                    }
                  }, 100)
                }}
              >
                Découvrir notre mission
              </a>
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

      {/* Section Accueil avec onglets */}
      <section id="accueil-content" className="accueil-tabs-section" style={{
        background: 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)',
        padding: '40px 0 30px 0'
      }}>
        <div className="container">
          <h2 className="section-title" style={{
            textAlign: 'center', 
            marginBottom: '1.5rem', 
            marginTop: '0',
            fontSize: '2.5rem', 
            fontWeight: 800,
            color: '#000000',
            display: 'block',
            visibility: 'visible',
            opacity: 1,
            textShadow: 'none',
            letterSpacing: '0.02em'
          }}>
            Découvrez l'ASGF
          </h2>
          
          <section className="section-tabs">
            {/* Header avec onglets premium */}
            <div className="section-tabs__header">
              {[
                { id: 'apropos', label: 'À Propos', icon: 'fa-info-circle' },
                { id: 'missions', label: 'Missions', icon: 'fa-bullseye' },
                { id: 'activites', label: 'Activités', icon: 'fa-calendar-check' },
                { id: 'partenariats', label: 'Partenariats', icon: 'fa-handshake' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={`fas ${tab.icon}`}></i>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu des onglets */}
            <div className="section-tabs__content">
              {/* Onglet À Propos */}
              {activeTab === 'apropos' && (
                <div id="apropos" className="tab-panel">
                  <div className="tab-layout">
                    <div className="tab-layout__text">
                      <p><strong>Ensemble.</strong> C'est le mot qui résume notre raison d'être, notre force et notre engagement.</p>
                      <p>L'Association des Géomaticiens Sénégalais de France (ASGF) est née d'une conviction simple : la géomatique est un levier puissant pour comprendre, planifier et transformer nos territoires.</p>
                      <p>Notre ambition est claire : rassembler la diaspora sénégalaise autour d'un projet collectif, où les compétences techniques rencontrent la volonté d'agir pour le développement durable du Sénégal.</p>
                      <p>Chaque membre de notre réseau, qu'il soit étudiant, professionnel ou enseignant, participe à construire cette dynamique d'innovation, de solidarité et de partage du savoir.</p>
                      <p className="about-slogan">
                        <span className="about-slogan__quote">«</span>
                        <span className="about-slogan__text">
                          Unir les géomaticiens pour bâtir les territoires de demain.
                        </span>
                        <span className="about-slogan__quote">»</span>
                      </p>
                    </div>
                    <div className="tab-layout__illustration">
                      <img
                        src="/assets/images/img_SN_FR.png"
                        alt="Carte Sénégal - France"
                        className="about-image"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Missions */}
              {activeTab === 'missions' && (
                <div id="missions" className="tab-panel">
                  <div className="cards-grid">
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-graduation-cap"></i>
                      </div>
                      <h3 className="card-feature__title">Partager le savoir et former les générations futures</h3>
                      <p className="card-feature__text">Nous organisons régulièrement des webinaires, ateliers et formations pratiques pour renforcer les compétences techniques des membres et des étudiants. Chaque activité vise à démocratiser la géomatique et à en faire un outil accessible à tous au service du développement durable.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-rocket"></i>
                      </div>
                      <h3 className="card-feature__title">Soutenir l'innovation et les projets SIG</h3>
                      <p className="card-feature__text">Le pôle "Innovations et Projets SIG" pilote plusieurs initiatives concrètes : observatoires thématiques, dashboards interactifs, bases de données open data et géoportails. L'objectif : faire de la donnée géospatiale un levier de décision au service des territoires sénégalais.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-globe-africa"></i>
                      </div>
                      <h3 className="card-feature__title">Promouvoir la coopération entre la France et le Sénégal</h3>
                      <p className="card-feature__text">L'ASGF s'appuie sur la force de sa diaspora pour tisser des ponts entre les géomaticiens des deux pays. Nous travaillons main dans la main avec les universités, les associations locales et les institutions publiques pour développer une géomatique collaborative et solidaire.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-handshake"></i>
                      </div>
                      <h3 className="card-feature__title">Renforcer les partenariats et la visibilité des géomaticiens</h3>
                      <p className="card-feature__text">Nous collaborons avec des acteurs tels que GéoSénégal, les universités et les entreprises du secteur. Ces alliances permettent de valoriser les compétences sénégalaises, d'accéder à de nouvelles ressources et de créer un réseau professionnel dynamique et reconnu.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-users"></i>
                      </div>
                      <h3 className="card-feature__title">Encourager l'inclusion, la jeunesse et le leadership</h3>
                      <p className="card-feature__text">L'ASGF promeut la participation active des jeunes et des femmes dans la géomatique. Nous croyons en une communauté ouverte, bienveillante et solidaire où chacun peut apprendre, partager et évoluer dans un esprit d'excellence.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Activités */}
              {activeTab === 'activites' && (
                <div id="activites" className="tab-panel">
                  <div className="cards-grid">
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-chalkboard-teacher"></i>
                      </div>
                      <h3 className="card-feature__title">Formations & Ateliers</h3>
                      <p className="card-feature__text">Organisation de formations pratiques sur les logiciels SIG, la télédétection, la cartographie numérique et les nouvelles technologies géospatiales.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-microphone"></i>
                      </div>
                      <h3 className="card-feature__title">Conférences & Séminaires</h3>
                      <p className="card-feature__text">Invitation d'experts pour des conférences sur les enjeux de la géomatique en Afrique et les opportunités professionnelles.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-project-diagram"></i>
                      </div>
                      <h3 className="card-feature__title">Projets Collaboratifs</h3>
                      <p className="card-feature__text">Développement de projets géomatiques pour résoudre des problématiques concrètes au Sénégal et en Afrique.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-calendar-alt"></i>
                      </div>
                      <h3 className="card-feature__title">Événements Culturels</h3>
                      <p className="card-feature__text">Organisation d'événements culturels pour maintenir le lien avec nos racines sénégalaises tout en célébrant la diversité.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-briefcase"></i>
                      </div>
                      <h3 className="card-feature__title">Insertion Professionnelle</h3>
                      <p className="card-feature__text">Accompagnement dans la recherche de stages, d'emplois et création d'un réseau professionnel dans le secteur géomatique.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-book-open"></i>
                      </div>
                      <h3 className="card-feature__title">Publications & Recherche</h3>
                      <p className="card-feature__text">Encouragement de la recherche scientifique et publication d'articles sur les applications de la géomatique en Afrique.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Partenariats */}
              {activeTab === 'partenariats' && (
                <div id="partenariats" className="tab-panel">
                  <div className="cards-grid">
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-university"></i>
                      </div>
                      <h3 className="card-feature__title">Universités Sénégalaises et Françaises</h3>
                      <p className="card-feature__text">Partenariats avec les universités sénégalaises comme celle de <a href="https://www.ussein.sn/master-geomatique/" target="_blank" rel="noopener noreferrer">Elhadj Ibrahima Niass</a> proposant des formations en géomatique pour faciliter la collaboration et l'intégration de nos membres.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-building"></i>
                      </div>
                      <h3 className="card-feature__title">Entreprises Géomatiques</h3>
                      <p className="card-feature__text">Collaboration avec les entreprises du secteur pour offrir des opportunités de stages et d'emplois à nos membres.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-flag"></i>
                      </div>
                      <h3 className="card-feature__title">Institutions Sénégalaises</h3>
                      <p className="card-feature__text">Liens étroits avec les institutions sénégalaises <a href="https://anat.sn/" target="_blank" rel="noopener noreferrer">ANAT</a> et <a href="https://www.geosenegal.gouv.sn/" target="_blank" rel="noopener noreferrer">GeoSenegal</a> pour faciliter le transfert de compétences et les projets de développement.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-globe"></i>
                      </div>
                      <h3 className="card-feature__title">Organisations Internationales</h3>
                      <p className="card-feature__text">Partenariats avec les ONG et organisations internationales travaillant sur les questions de développement en Afrique.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-users-cog"></i>
                      </div>
                      <h3 className="card-feature__title">Associations Étudiantes</h3>
                      <p className="card-feature__text">Collaboration avec d'autres associations d'étudiants africains en France pour mutualiser nos ressources.</p>
                    </div>
                    <div className="card-feature">
                      <div className="card-feature__icon">
                        <i className="fas fa-laptop-code"></i>
                      </div>
                      <h3 className="card-feature__title">Entreprises Tech</h3>
                      <p className="card-feature__text">Partenariats avec les entreprises technologiques spécialisées dans les solutions géospatiales innovantes.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="stats-section">
        <div className="stats-grid">
          <h2 className="section-title" style={{color: 'white', gridColumn: '1 / -1', marginBottom: '1.5rem', marginTop: '0'}}>Votre Association en Chiffres</h2>
          {[
            { value: 50, suffix: '+', label: 'Membres et sympathisants en France et au Sénégal', icon: 'fa-users' },
            { value: 6, suffix: '', label: 'Pôles actifs', icon: 'fa-sitemap' },
            { value: 4, suffix: '', label: 'Projets SIG innovants en développement', icon: 'fa-project-diagram' },
            { value: 3, suffix: '', label: 'Formations et webinaires', icon: 'fa-chalkboard-teacher' },
            { value: 3, suffix: '', label: 'Partenariats institutionnels en cours', icon: 'fa-handshake' },
            { value: 100, suffix: '%', label: "D'engagement bénévole au service de la géomatique", icon: 'fa-heart' },
          ].map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
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
              <div className="contact-socials">
                <h4 className="contact-socials__title">Suivez-nous</h4>
                <div className="contact-socials__icons">
                  <a href="#" className="social-icon" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a href="#" className="social-icon" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <i className="fab fa-twitter"></i>
                  </a>
                  <a href="https://www.linkedin.com/company/association-des-s%C3%A9n%C3%A9galais-g%C3%A9omaticiens-de-france-agsf/?viewAsMember=true" className="social-icon" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <i className="fab fa-linkedin-in"></i>
                  </a>
                  <a href="#" className="social-icon" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="#" className="social-icon" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <i className="fab fa-youtube"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
