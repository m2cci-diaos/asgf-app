import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BureauStyles } from '../components/PageStyles'

function Bureau() {
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
  }, [])

  const members = {
    direction: [
      {
        name: 'DIAO Serigne Omar',
        role: 'Président',
        image: '/assets/images/membres/diao-serigne-omar-removebg.png',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://www.linkedin.com/in/serigne-omar-diao-045117172/',
        phone: '+33 6 52 45 47 85',
        isPresident: true
      },
      {
        name: 'TAMBADOU Alhassane',
        role: 'Vice-Président',
        image: '/assets/images/membres/tambadou-alhassane.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://www.linkedin.com/in/alhassane-tambadou-a3232b25a/',
        phone: '+33 6 62 08 16 21'
      },
      {
        name: 'NDIAYE Oumar',
        role: 'Membre du Bureau Exécutif',
        image: '/assets/images/membres/ndiaye-oumar-removebg.png',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'www.linkedin.com/in/alhassane-tambadou-a3232b25a/',
        phone: '+33 6 62 08 16 21'
      },
      {
        name: 'GAKOU Moustapha',
        role: 'Secrétaire Général',
        image: '/assets/images/membres/gakou-moustapha.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/gaikou-moustapha'
      },
      {
        name: 'NIASSE Mame Khady',
        role: 'Trésorière',
        image: '/assets/images/membres/niasse-mama-sady.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/niasse-mama-sady'
      }
    ],
    poles: [
      {
        name: 'BA Poullo',
        role: 'Responsable pôle formation',
        image: '/assets/images/membres/ba-poullo.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/ba-poullo'
      },
      {
        name: 'Sène Abdou',
        role: 'Co-responsable pôle formation',
        image: '/assets/images/membres/sene-abdou.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/sene-abdou'
      },
      {
        name: 'FALL Amadou',
        role: 'Communications et réseaux',
        image: '/assets/images/membres/fall-amadou.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/fall-amadou'
      },
      {
        name: 'FALL Khadim R.',
        role: 'Communications et réseaux',
        image: '/assets/images/membres/fall-khadim.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/fall-khadim'
      },
      {
        name: 'GUEYE M. Lamine',
        role: 'Responsable - Partenariats et Relations extérieurs',
        image: '/assets/images/membres/lamine-gueye-removebg.png',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/gueye-lamine'
      },
      {
        name: 'SECK Adji Bousso',
        role: 'Responsable - Recrutement et accompagnements',
        image: '/assets/images/membres/seck-adji-bousso.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/seck-adji-bousso'
      },
      {
        name: 'DEMBA Boubacar',
        role: 'Responsable Innovations et Projets SIG',
        image: '/assets/images/membres/demba-boubacar.jpeg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/demba-boubacar'
      },
      {
        name: 'Mbaye A. Bamba',
        role: 'Partenariats et Relations extérieurs au Sénégal',
        image: '/assets/images/membres/mbaye-bamba.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/mbaye-bamba'
      },
      {
        name: 'Diallo Cheikh Oumar',
        role: 'Responsable - pôle Webinaires & Publications',
        image: '/assets/images/membres/diallo-cheikh-oumar.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://linkedin.com/in/diallo-cheikh-oumar'
      },
      {
        name: 'DIOUF Astou',
        role: 'Adjointe - Secrétaire Générale',
        image: '/assets/images/membres/diouf-astou.jpg',
        email: 'association.geomaticiens.sf@gmail.com',
        linkedin: 'https://www.linkedin.com/in/astou-diouf-86467a280/'
      }
    ]
  }

  const MemberCard = ({ member, isPresident = false }) => {
    const handleImageError = (e) => {
      e.target.style.display = 'none'
      if (e.target.nextElementSibling) {
        e.target.nextElementSibling.style.display = 'flex'
      }
    }

    return (
      <div className={`member-card fade-in ${isPresident ? 'president-card' : ''}`}>
        {isPresident && (
          <div className="president-badge">
            <i className="fas fa-crown"></i> Président
          </div>
        )}
        <div className="member-photo">
          <img 
            src={member.image} 
            alt={member.name} 
            onError={handleImageError}
          />
          <div className="photo-placeholder" style={{display: 'none'}}>
            <i className="fas fa-user"></i>
          </div>
        </div>
        <h3 className="member-name">{member.name}</h3>
        <div className="member-role">{member.role}</div>
        <div className="member-contact">
          {member.email && (
            <a href={`mailto:${member.email}`} className="contact-link email" title="Email">
              <i className="fas fa-envelope"></i>
            </a>
          )}
          {member.linkedin && (
            <a href={member.linkedin.startsWith('http') ? member.linkedin : `https://${member.linkedin}`} 
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

        <div className="team-category">
          <div className="category-header fade-in">
            <h2><i className="fas fa-crown"></i> Équipe de Direction</h2>
            <p>Les leaders qui guident notre vision et nos actions</p>
          </div>
          <div className="bureau-grid">
            {members.direction.map((member, index) => (
              <MemberCard 
                key={index} 
                member={member} 
                isPresident={index === 0}
              />
            ))}
          </div>
        </div>

        <div className="team-category">
          <div className="category-header fade-in">
            <h2><i className="fas fa-bullhorn"></i> Responsables de pôles</h2>
            <p>Une équipe qui cartographie l'avenir ensemble</p>
          </div>
          <div className="bureau-grid">
            {members.poles.map((member, index) => (
              <MemberCard key={index} member={member} />
            ))}
          </div>
        </div>

        <div className="section-intro fade-in" style={{marginTop: '4rem', background: 'white', padding: '3rem', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)'}}>
          <h2 style={{color: 'var(--primary-color)', marginBottom: '1rem'}}>
            <i className="fas fa-hands-helping"></i> Rejoignez Notre Équipe
          </h2>
          <p style={{marginBottom: '2rem'}}>
            Vous êtes passionné(e) par la géomatique et souhaitez contribuer au développement de l'ASGF ? 
            Nous recherchons régulièrement des membres motivés pour renforcer notre équipe. Cliquez sur le lien suivant{' '}
            <a href="https://script.google.com/macros/s/AKfycbyzFRPUDYyDTtkMqvp4QTMgmabj3pNoupQlI2ixCvimCq0gLcvfjaxVKoea6W6V3rzl-A/exec" 
               title="S'inscrire" 
               target="_blank" 
               rel="noopener noreferrer">pour vous inscrire</a>
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
