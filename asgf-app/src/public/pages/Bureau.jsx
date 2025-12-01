import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BureauStyles } from '../components/PageStyles'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

function Bureau() {
  const [direction, setDirection] = useState([])
  const [poles, setPoles] = useState([])
  const [autres, setAutres] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBureau = async () => {
      try {
        const res = await fetch(`${API_URL}/api/bureau`)
        if (!res.ok) throw new Error('Erreur chargement bureau')
        const data = await res.json()
        setDirection(data.direction || [])
        setPoles(data.pole || [])
        setAutres(data.autre || [])
      } catch (err) {
        console.error('Erreur chargement bureau', err)
        // En cas d'erreur, on laisse les tableaux vides
        setDirection([])
        setPoles([])
        setAutres([])
      } finally {
        setLoading(false)
      }
    }

    fetchBureau()
  }, [])

  useEffect(() => {
    // Scroll vers le haut de la page au chargement - méthode très agressive
    const scrollToTop = () => {
      window.scrollTo(0, 0)
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
        document.documentElement.scrollLeft = 0
      }
      if (document.body) {
        document.body.scrollTop = 0
        document.body.scrollLeft = 0
      }
      
      // Forcer le scroll de tous les éléments scrollables
      const scrollableElements = document.querySelectorAll('html, body, main')
      scrollableElements.forEach(el => {
        if (el) {
          el.scrollTop = 0
          el.scrollLeft = 0
        }
      })
    }

    // Scroll immédiat
    scrollToTop()

    // Scroll après le rendu (triple RAF pour être sûr)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToTop)
      })
    })

    // Scroll après plusieurs délais
    const timeouts = []
    timeouts.push(setTimeout(scrollToTop, 0))
    timeouts.push(setTimeout(scrollToTop, 10))
    timeouts.push(setTimeout(scrollToTop, 50))
    timeouts.push(setTimeout(scrollToTop, 100))
    timeouts.push(setTimeout(scrollToTop, 200))
    timeouts.push(setTimeout(scrollToTop, 300))

    // Intersection Observer pour les animations
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

    // Animation séquentielle des cartes
    const cards = document.querySelectorAll('.member-card')
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('visible')
      }, index * 100)
    })

    return () => {
      observer.disconnect()
      timeouts.forEach(id => clearTimeout(id))
    }
  }, [direction, poles, autres]) // Re-exécuter quand les données changent

  const MemberCard = ({ member, isPresident = false }) => {
    const handleImageError = (e) => {
      e.target.style.display = 'none'
      if (e.target.nextElementSibling) {
        e.target.nextElementSibling.style.display = 'flex'
      }
    }

    const displayName = member.nom_affichage || `${member.nom.toUpperCase()} ${member.prenom}`
    const photoUrl = member.photo_url || null

    return (
      <div className={`member-card fade-in ${isPresident || member.highlight ? 'president-card' : ''}`}>
        {(isPresident || member.highlight) && (
          <div className="president-badge">
            <i className="fas fa-crown"></i> {member.role_long}
          </div>
        )}
        <div className="member-photo">
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={displayName} 
              onError={handleImageError}
            />
          ) : (
            <div className="photo-placeholder" style={{display: 'flex'}}>
              <i className="fas fa-user"></i>
            </div>
          )}
        </div>
        <h3 className="member-name">{displayName}</h3>
        <div className="member-role">{member.role_long}</div>
        {member.pole_nom && (
          <div className="member-pole" style={{fontSize: '0.9rem', color: '#64748b', marginTop: '0.25rem'}}>
            {member.pole_nom}
          </div>
        )}
        <div className="member-contact">
          {member.email && (
            <a href={`mailto:${member.email}`} className="contact-link email" title="Email">
              <i className="fas fa-envelope"></i>
            </a>
          )}
          {member.linkedin_url && (
            <a 
              href={member.linkedin_url.startsWith('http') ? member.linkedin_url : `https://${member.linkedin_url}`} 
              className="contact-link linkedin" 
              title="LinkedIn" 
              target="_blank" 
              rel="noopener noreferrer">
              <i className="fab fa-linkedin-in"></i>
            </a>
          )}
          {member.phone && (
            <a href={`tel:${member.phone}`} className="contact-link phone" title="Téléphone">
              <i className="fas fa-phone"></i>
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <BureauStyles />
      <section className="bureau-section">
      <div className="container">
        <div className="section-intro fade-in">
          <h1><i className="fas fa-users"></i> Notre Bureau Exécutif</h1>
          <div className="subtitle">UNE ÉQUIPE ENGAGÉE POUR PROMOUVOIR LA GÉOMATIQUE ENTRE LE SÉNÉGAL ET LA FRANCE</div>
          <p>Découvrez les membres passionnés qui dirigent le ASGF et œuvrent chaque jour pour développer l'excellence géomatique africaine.</p>
        </div>

        {loading ? (
          <div style={{textAlign: 'center', padding: '3rem'}}>
            <div className="spinner" style={{margin: '0 auto'}}></div>
            <p>Chargement des membres du bureau...</p>
          </div>
        ) : (
          <>
            {direction.length > 0 && (
              <div className="team-category">
                <div className="category-header fade-in">
                  <h2><i className="fas fa-crown"></i> Équipe de Direction</h2>
                  <p>Les leaders qui guident notre vision et nos actions</p>
                </div>
                <div className="bureau-grid">
                  {direction.map((member) => (
                    <MemberCard 
                      key={member.id} 
                      member={member} 
                      isPresident={member.highlight || member.role_court === 'PRESIDENT'}
                    />
                  ))}
                </div>
              </div>
            )}

            {poles.length > 0 && (
              <div className="team-category">
                <div className="category-header fade-in">
                  <h2><i className="fas fa-bullhorn"></i> Responsables de pôles</h2>
                  <p>Une équipe qui cartographie l'avenir ensemble</p>
                </div>
                <div className="bureau-grid">
                  {poles.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </div>
            )}

            {autres.length > 0 && (
              <div className="team-category">
                <div className="category-header fade-in">
                  <h2><i className="fas fa-users"></i> Autres membres</h2>
                  <p>Membres actifs de l'équipe</p>
                </div>
                <div className="bureau-grid">
                  {autres.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="section-intro fade-in" style={{marginTop: '4rem', background: 'white', padding: '3rem', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)'}}>
          <h2 style={{color: 'var(--primary-color)', marginBottom: '1rem'}}>
            <i className="fas fa-hands-helping"></i> Rejoignez Notre Équipe
          </h2>
          <p style={{marginBottom: '2rem'}}>
            Vous êtes passionné(e) par la géomatique et souhaitez contribuer au développement de l'ASGF ? 
            Nous recherchons régulièrement des membres motivés pour renforcer notre équipe.
          </p>
          <Link to="/adhesion" className="cta-button">
            <i className="fas fa-user-plus"></i> Devenir Membre
          </Link>
        </div>
      </div>
    </section>
    </>
  )
}

export default Bureau
