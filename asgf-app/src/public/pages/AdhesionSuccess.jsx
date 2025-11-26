import React, { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AdhesionStyles } from '../components/PageStyles'

function AdhesionSuccess() {
  const location = useLocation()
  const memberData = location.state?.memberData || {}
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    // Si la page est accédée directement sans state, rediriger vers l'adhésion
    if (!location.state?.memberData) {
      setTimeout(() => {
        navigate('/adhesion', { replace: true })
      }, 2000)
    } else {
      // Ajouter la classe visible pour l'animation fade-in
      const fadeElements = document.querySelectorAll('.fade-in')
      fadeElements.forEach((el) => {
        setTimeout(() => {
          el.classList.add('visible')
        }, 100)
      })
    }
  }, [location.state, navigate])

  // Si pas de données, afficher un message de chargement/redirection
  if (!location.state?.memberData) {
    return (
      <>
        <AdhesionStyles />
        <section className="adhesion-section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#0066CC' }}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <p style={{ fontSize: '1.2rem', color: '#666' }}>Redirection vers le formulaire d'adhésion...</p>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <AdhesionStyles />
      <section className="adhesion-section" style={{ minHeight: '100vh', padding: '120px 0 80px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div className="adhesion-container fade-in" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', background: 'white', padding: '3rem', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #0066CC, #0052A3)', 
              color: 'white', 
              padding: '3rem 2rem', 
              borderRadius: '20px',
              marginBottom: '2rem'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'white' }}>
                Merci {memberData.prenom || ''} {memberData.nom || ''} !
              </h1>
              <p style={{ fontSize: '1.2rem', opacity: 0.95 }}>
                Votre demande d'adhésion a été enregistrée avec succès
              </p>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '2.5rem', 
              borderRadius: '15px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ color: '#0066CC', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
                <i className="fas fa-envelope" style={{ marginRight: '0.5rem' }}></i>
                Prochaines étapes
              </h2>
              
              <div style={{ textAlign: 'left', lineHeight: '1.8' }}>
                <div style={{ 
                  marginBottom: '1.5rem', 
                  padding: '1.5rem', 
                  background: '#f8f9fa', 
                  borderRadius: '10px',
                  borderLeft: '4px solid #0066CC'
                }}>
                  <h3 style={{ color: '#0066CC', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                    <i className="fas fa-bell" style={{ marginRight: '0.5rem' }}></i>
                    Email de confirmation
                  </h3>
                  <p style={{ color: '#666', margin: 0 }}>
                    Vous allez recevoir un <strong>email de notification</strong> dans quelques instants confirmant la réception de votre demande d'adhésion.
                  </p>
                </div>

                <div style={{ 
                  marginBottom: '1.5rem', 
                  padding: '1.5rem', 
                  background: '#f8f9fa', 
                  borderRadius: '10px',
                  borderLeft: '4px solid #F4A261'
                }}>
                  <h3 style={{ color: '#F4A261', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                    <i className="fas fa-check-double" style={{ marginRight: '0.5rem' }}></i>
                    Validation de votre adhésion
                  </h3>
                  <p style={{ color: '#666', margin: 0 }}>
                    Une fois votre demande <strong>validée par le bureau exécutif</strong>, vous recevrez un <strong>email de validation</strong> avec votre numéro de membre et les prochaines étapes.
                  </p>
                </div>

                <div style={{ 
                  padding: '1.5rem', 
                  background: '#e8f4f8', 
                  borderRadius: '10px',
                  borderLeft: '4px solid #0066CC'
                }}>
                  <h3 style={{ color: '#0066CC', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                    <i className="fas fa-clock" style={{ marginRight: '0.5rem' }}></i>
                    Délai de traitement
                  </h3>
                  <p style={{ color: '#666', margin: 0 }}>
                    Le traitement de votre demande peut prendre quelques jours. Nous vous contacterons dès que possible.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              marginTop: '2rem'
            }}>
              <Link 
                to="/" 
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '50px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 10px 25px rgba(0, 102, 204, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <i className="fas fa-home"></i> Retour à l'accueil
              </Link>
              <Link 
                to="/formation" 
                style={{
                  padding: '1rem 2rem',
                  background: 'white',
                  color: '#0066CC',
                  textDecoration: 'none',
                  borderRadius: '50px',
                  fontWeight: '600',
                  border: '2px solid #0066CC',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#0066CC'
                  e.target.style.color = 'white'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white'
                  e.target.style.color = '#0066CC'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                <i className="fas fa-graduation-cap"></i> Découvrir nos formations
              </Link>
            </div>

            <div style={{ 
              marginTop: '3rem', 
              padding: '1.5rem', 
              background: '#f8f9fa', 
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: '#666'
            }}>
              <p style={{ margin: 0 }}>
                <i className="fas fa-info-circle" style={{ marginRight: '0.5rem', color: '#0066CC' }}></i>
                Si vous avez des questions, n'hésitez pas à nous contacter à{' '}
                <a href="mailto:association.geomaticiens.sf@gmail.com" style={{ color: '#0066CC', textDecoration: 'none' }}>
                  association.geomaticiens.sf@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default AdhesionSuccess

