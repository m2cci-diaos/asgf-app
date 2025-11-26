import React, { useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { WebinairesStyles } from '../components/PageStyles'

export default function InscriptionWebinaireSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const { inscriptionData } = location.state || {}

  useEffect(() => {
    window.scrollTo(0, 0)
    
    // Si pas de données, rediriger vers les webinaires
    if (!inscriptionData) {
      setTimeout(() => {
        navigate('/webinaires', { replace: true })
      }, 2000)
    }
  }, [inscriptionData, navigate])

  if (!inscriptionData) {
    return (
      <>
        <WebinairesStyles />
        <section className="webinaires-section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
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
              <p style={{ fontSize: '1.2rem', color: '#666' }}>Redirection vers les webinaires...</p>
            </div>
          </div>
        </section>
      </>
    )
  }

  const formattedDate = inscriptionData.date 
    ? new Date(inscriptionData.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : ''

  return (
    <>
      <WebinairesStyles />
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
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          color: white;
          box-shadow: 0 10px 30px rgba(102,126,234,0.3);
          animation: scaleIn 0.5s ease-out;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .success-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #2d2d2d;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .success-message {
          font-size: 1.2rem;
          color: #666;
          margin-bottom: 2rem;
          line-height: 1.6;
        }
        .info-box {
          background: #f8f9fa;
          border-radius: 15px;
          padding: 2rem;
          margin: 2rem 0;
          text-align: left;
        }
        .info-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e9ecef;
        }
        .info-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .info-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .info-content {
          flex: 1;
        }
        .info-label {
          font-size: 0.85rem;
          color: #999;
          margin-bottom: 0.25rem;
        }
        .info-value {
          font-size: 1rem;
          font-weight: 600;
          color: #2d2d2d;
        }
        .next-steps {
          background: #e7f3ff;
          border-left: 4px solid #667eea;
          border-radius: 10px;
          padding: 1.5rem;
          margin: 2rem 0;
          text-align: left;
        }
        .next-steps-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 1rem;
        }
        .next-steps-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .next-steps-list li {
          padding: 0.5rem 0;
          padding-left: 1.5rem;
          position: relative;
          color: #666;
        }
        .next-steps-list li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #667eea;
          font-weight: bold;
        }
        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 2rem;
        }
        .btn-primary {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102,126,234,0.4);
        }
        .btn-secondary {
          padding: 0.75rem 2rem;
          background: white;
          color: #667eea;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          border: 2px solid #667eea;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-secondary:hover {
          background: #f0f7ff;
        }
      `}</style>
      <section className="success-page">
        <div className="success-container">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <h1 className="success-title">Inscription confirmée !</h1>
            <p className="success-message">
              Merci <strong>{inscriptionData.prenom} {inscriptionData.nom}</strong> ! Votre inscription au webinaire a été enregistrée avec succès.
            </p>

            <div className="info-box">
              <div className="info-item">
                <div className="info-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 7l-7 5 7 5V7z"></path>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                </div>
                <div className="info-content">
                  <div className="info-label">Webinaire</div>
                  <div className="info-value">{inscriptionData.webinaire}</div>
                </div>
              </div>
              {formattedDate && (
                <div className="info-item">
                  <div className="info-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div className="info-content">
                    <div className="info-label">Date</div>
                    <div className="info-value">{formattedDate}</div>
                  </div>
                </div>
              )}
              {inscriptionData.heure && (
                <div className="info-item">
                  <div className="info-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="info-content">
                    <div className="info-label">Heure</div>
                    <div className="info-value">{inscriptionData.heure.substring(0, 5)}</div>
                  </div>
                </div>
              )}
              <div className="info-item">
                <div className="info-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <div className="info-content">
                  <div className="info-label">Email de confirmation</div>
                  <div className="info-value">{inscriptionData.email}</div>
                </div>
              </div>
            </div>

            <div className="next-steps">
              <h3 className="next-steps-title">Prochaines étapes</h3>
              <ul className="next-steps-list">
                <li>Vous recevrez un email de confirmation dans les prochaines minutes</li>
                <li>Un rappel vous sera envoyé 24h avant le webinaire</li>
                <li>Un lien de connexion au webinaire vous sera envoyé avant l'événement</li>
                <li>Assurez-vous d'avoir une connexion internet stable le jour J</li>
                <li>Testez votre équipement audio/vidéo avant le début</li>
                <li>En cas de problème, contactez-nous à l'adresse indiquée dans l'email</li>
              </ul>
            </div>

            <div className="action-buttons">
              <Link to="/webinaires" className="btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z"></path>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                Voir les autres webinaires
              </Link>
              <Link to="/" className="btn-secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

