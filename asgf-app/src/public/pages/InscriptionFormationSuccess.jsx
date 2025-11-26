import React, { useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { FormationStyles } from '../components/PageStyles'

export default function InscriptionFormationSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const { inscriptionData } = location.state || {}

  useEffect(() => {
    window.scrollTo(0, 0)
    
    // Si pas de données, rediriger vers les formations
    if (!inscriptionData) {
      setTimeout(() => {
        navigate('/formation', { replace: true })
      }, 2000)
    }
  }, [inscriptionData, navigate])

  if (!inscriptionData) {
    return (
      <>
        <FormationStyles />
        <section className="formations-section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
          <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                margin: '0 auto 1rem',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <p style={{ fontSize: '1.2rem', color: '#666' }}>Redirection vers les formations...</p>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <FormationStyles />
      <style>{`
        .success-page {
          min-height: calc(100vh - 90px);
          padding: 40px 0 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          overflow: hidden;
        }
        .success-page::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
          opacity: 0.3;
        }
        .success-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 20px;
          position: relative;
          z-index: 1;
        }
        .success-card {
          background: white;
          border-radius: 20px;
          padding: 4rem 3rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .success-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }
        .success-icon {
          width: 120px;
          height: 120px;
          margin: 0 auto 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
          animation: scaleIn 0.5s ease-out;
        }
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .success-title {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        .success-subtitle {
          font-size: 1.3rem;
          color: #666;
          margin-bottom: 3rem;
          line-height: 1.6;
        }
        .info-section {
          background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%);
          border-radius: 15px;
          padding: 2.5rem;
          margin-bottom: 2rem;
          text-align: left;
        }
        .info-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          border-left: 4px solid #667eea;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .info-card:last-child {
          margin-bottom: 0;
        }
        .info-card h3 {
          color: #667eea;
          font-size: 1.2rem;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .info-card p {
          color: #666;
          line-height: 1.8;
          margin: 0;
        }
        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 3rem;
        }
        .btn-primary {
          padding: 1rem 2.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
        }
        .btn-secondary {
          padding: 1rem 2.5rem;
          background: white;
          color: #667eea;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1.1rem;
          border: 2px solid #667eea;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
        }
        .btn-secondary:hover {
          background: #667eea;
          color: white;
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        }
        .contact-info {
          margin-top: 3rem;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 12px;
          font-size: 0.95rem;
          color: #666;
        }
        .contact-info a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }
        .contact-info a:hover {
          text-decoration: underline;
        }
        @media (max-width: 768px) {
          .success-card {
            padding: 3rem 2rem;
          }
          .success-title {
            font-size: 2rem;
          }
          .success-subtitle {
            font-size: 1.1rem;
          }
          .action-buttons {
            flex-direction: column;
          }
          .btn-primary,
          .btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      
      <section className="success-page">
        <div className="success-container">
          <div className="success-card">
            {/* Icône de succès animée */}
            <div className="success-icon">
              ✓
            </div>

            {/* Titre */}
            <h1 className="success-title">
              Félicitations {inscriptionData.prenom} {inscriptionData.nom} !
            </h1>
            
            <p className="success-subtitle">
              Votre inscription à la formation a été enregistrée avec succès
            </p>

            {/* Informations sur la formation */}
            <div className="info-section">
              <div style={{
                textAlign: 'center',
                marginBottom: '2rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid #e0e0e0'
              }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  color: '#333',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}>
                  <span>📚</span> {inscriptionData.formation}
                </h2>
              </div>

              {/* Prochaines étapes */}
              <div className="info-card">
                <h3>
                  <span>📧</span> Email de confirmation
                </h3>
                <p>
                  Vous allez recevoir un <strong>email de confirmation</strong> à l'adresse{' '}
                  <strong style={{ color: '#667eea' }}>{inscriptionData.email}</strong> dans quelques instants 
                  avec tous les détails de votre inscription.
                </p>
              </div>

              {/* Information importante */}
              <div className="info-card" style={{ borderLeftColor: '#f59e0b' }}>
                <h3 style={{ color: '#f59e0b' }}>
                  <span>⏳</span> Prochaines étapes
                </h3>
                <p>
                  Votre inscription est en attente de <strong>confirmation</strong>. Notre équipe vous contactera 
                  prochainement pour finaliser votre inscription et vous donner toutes les informations nécessaires 
                  (modalités de paiement, horaires, accès à la plateforme, etc.).
                </p>
              </div>

              {/* Timeline */}
              <div className="info-card" style={{ borderLeftColor: '#10b981' }}>
                <h3 style={{ color: '#10b981' }}>
                  <span>📋</span> Ce qui va se passer
                </h3>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '1rem', 
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #e0e0e0'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#667eea',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>1</div>
                    <div>
                      <strong style={{ color: '#333', display: 'block', marginBottom: '0.25rem' }}>
                        Email de confirmation
                      </strong>
                      <span style={{ color: '#666' }}>
                        Vous recevrez un email dans les prochaines minutes
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '1rem',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #e0e0e0'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#667eea',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>2</div>
                    <div>
                      <strong style={{ color: '#333', display: 'block', marginBottom: '0.25rem' }}>
                        Validation par l'équipe
                      </strong>
                      <span style={{ color: '#666' }}>
                        Notre équipe examinera votre inscription (sous 24-48h)
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#667eea',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>3</div>
                    <div>
                      <strong style={{ color: '#333', display: 'block', marginBottom: '0.25rem' }}>
                        Finalisation
                      </strong>
                      <span style={{ color: '#666' }}>
                        Vous recevrez les informations de paiement et d'accès
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="action-buttons">
              <Link to="/formation" className="btn-primary">
                <span>📚</span> Voir les autres formations
              </Link>
              <Link to="/" className="btn-secondary">
                <span>🏠</span> Retour à l'accueil
              </Link>
            </div>

            {/* Contact */}
            <div className="contact-info">
              <p style={{ margin: 0 }}>
                <span style={{ marginRight: '0.5rem' }}>💬</span>
                Des questions ? Contactez-nous à{' '}
                <a href="mailto:association.geomaticiens.sf@gmail.com">
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
