import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const PROJETS = [
  {
    id: 'mobilite-intelligente',
    titre: 'Mobilité intelligente au Sénégal',
    description: 'Développement de solutions innovantes pour améliorer la mobilité urbaine et interurbaine au Sénégal grâce aux technologies géomatiques et à l\'intelligence artificielle.',
    icon: '🚗',
    color: '#667eea',
  },
  {
    id: 'dashboard-energie',
    titre: 'Dashboard Énergie (Pétrole et gaz)',
    description: 'Création d\'un tableau de bord interactif pour le suivi et l\'analyse des données énergétiques (pétrole et gaz) au Sénégal.',
    icon: '⚡',
    color: '#f59e0b',
  },
]

function Projets() {
  const [selectedProjet, setSelectedProjet] = useState(null)
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    numero_membre: '',
    statut_pro: '',
    motivation: '',
    competences: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleProjetClick = (projet) => {
    setSelectedProjet(projet)
    setError('')
    setSuccess(false)
    setFormData({
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      numero_membre: '',
      statut_pro: '',
      motivation: '',
      competences: '',
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!formData.prenom.trim() || !formData.nom.trim() || !formData.email.trim() || !formData.statut_pro.trim()) {
      setError('Veuillez remplir tous les champs obligatoires (prénom, nom, email, statut professionnel)')
      setLoading(false)
      return
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Veuillez entrer une adresse email valide')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/public/projets/inscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projet_id: selectedProjet.id,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const error = new Error(data.message || 'Erreur lors de l\'inscription')
        // Si l'erreur indique que l'utilisateur n'est pas membre, ajouter un flag
        if (data.message && data.message.includes('pas encore membre')) {
          error.notMember = true
        }
        throw error
      }

      setSuccess(true)
      setFormData({
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        numero_membre: '',
        motivation: '',
        competences: '',
      })
    } catch (err) {
      console.error('Erreur inscription projet:', err)
      // Si l'erreur indique que l'utilisateur n'est pas membre, afficher un message spécial
      if (err.notMember || (err.message && err.message.includes('pas encore membre'))) {
        setError('NOT_MEMBER') // Flag spécial pour afficher le message avec lien
      } else {
        setError(err.message || 'Une erreur est survenue. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Nos Projets</h1>
          <p className="page-subtitle">
            Découvrez les projets de l'ASGF et participez à leur développement
          </p>
        </div>

        <div className="projets-section">
          <div className="coming-soon-banner">
            <div className="coming-soon-content">
              <h2>🚀 Coming Soon</h2>
              <p>
                La section complète de gestion des projets est en cours de développement.
                En attendant, vous pouvez vous inscrire pour participer aux projets ci-dessous.
              </p>
              <div className="members-only-notice">
                <strong>⚠️ Important :</strong> Ces projets sont réservés exclusivement aux membres officiels de l'ASGF.
                Vous devez être membre approuvé pour pouvoir vous inscrire. Si vous n'êtes pas encore membre, <Link to="/adhesion" style={{ color: 'white', textDecoration: 'underline' }}>rejoignez-nous</Link> !
              </div>
            </div>
          </div>

          <div className="projets-grid">
            {PROJETS.map((projet) => (
              <div key={projet.id} className="projet-card">
                <div className="projet-card__header" style={{ background: `linear-gradient(135deg, ${projet.color} 0%, ${projet.color}dd 100%)` }}>
                  <div className="projet-card__icon">{projet.icon}</div>
                  <h3 className="projet-card__title">{projet.titre}</h3>
                </div>
                <div className="projet-card__body">
                  <p className="projet-card__description">{projet.description}</p>
                  <button
                    className="projet-card__button"
                    onClick={() => handleProjetClick(projet)}
                    style={{ '--projet-color': projet.color }}
                  >
                    S'inscrire au projet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal d'inscription */}
        {selectedProjet && (
          <div className="modal-overlay" onClick={() => setSelectedProjet(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Inscription au projet : {selectedProjet.titre}</h2>
                <button className="modal-close" onClick={() => setSelectedProjet(null)}>
                  ×
                </button>
              </div>

              {success ? (
                <div className="modal-success">
                  <div className="success-icon">✓</div>
                  <h3>Inscription envoyée avec succès !</h3>
                  <p>
                    Votre demande d'inscription a été enregistrée. Nous vous contacterons prochainement.
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setSelectedProjet(null)
                      setSuccess(false)
                    }}
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <form className="projet-inscription-form" onSubmit={handleSubmit}>
                  {error && (
                    <div className="form-error">
                      <span>⚠️</span>
                      {error === 'NOT_MEMBER' ? (
                        <div>
                          <p style={{ marginBottom: '1rem' }}>
                            Vous n'êtes pas encore membre de l'ASGF. Ces projets sont réservés exclusivement aux membres officiels de l'association.
                          </p>
                          <Link 
                            to="/adhesion" 
                            className="btn-primary"
                            style={{ 
                              display: 'inline-block', 
                              textDecoration: 'none',
                              marginTop: '0.5rem'
                            }}
                            onClick={() => setSelectedProjet(null)}
                          >
                            Devenir membre de l'ASGF
                          </Link>
                        </div>
                      ) : (
                        <span>{error}</span>
                      )}
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="prenom">
                        Prénom <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="prenom"
                        name="prenom"
                        value={formData.prenom}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="nom">
                        Nom <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="nom"
                        name="nom"
                        value={formData.nom}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email">
                        Email <span className="required">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="telephone">Téléphone</label>
                      <input
                        type="tel"
                        id="telephone"
                        name="telephone"
                        value={formData.telephone}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="numero_membre">
                      Numéro de membre ASGF (optionnel)
                    </label>
                    <input
                      type="text"
                      id="numero_membre"
                      name="numero_membre"
                      value={formData.numero_membre}
                      onChange={handleInputChange}
                      placeholder="Ex: ASGF-2025-001 (sera rempli automatiquement si vous êtes membre)"
                      disabled={loading}
                    />
                    <p className="form-hint">
                      ⚠️ Ces projets sont réservés exclusivement aux membres officiels de l'ASGF.
                      Votre adhésion doit être approuvée pour pouvoir vous inscrire. Si vous n'êtes pas encore membre, vous serez redirigé vers la page d'adhésion.
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="statut_pro">
                      Statut professionnel <span className="required">*</span>
                    </label>
                    <select
                      id="statut_pro"
                      name="statut_pro"
                      value={formData.statut_pro}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    >
                      <option value="">Sélectionnez votre statut</option>
                      <option value="Étudiant">Étudiant</option>
                      <option value="Professionnel">Professionnel</option>
                      <option value="Chercheur">Chercheur</option>
                      <option value="Enseignant">Enseignant</option>
                      <option value="Entrepreneur">Entrepreneur</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="motivation">
                      Motivation <span className="required">*</span>
                    </label>
                    <textarea
                      id="motivation"
                      name="motivation"
                      value={formData.motivation}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Pourquoi souhaitez-vous participer à ce projet ?"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="competences">Compétences</label>
                    <textarea
                      id="competences"
                      name="competences"
                      value={formData.competences}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Quelles compétences pouvez-vous apporter à ce projet ?"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedProjet(null)}
                      disabled={loading}
                    >
                      Annuler
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Envoi en cours...' : 'Envoyer l\'inscription'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .page-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .page-subtitle {
          font-size: 1.25rem;
          color: #64748b;
        }

        .projets-section {
          margin-top: 2rem;
        }

        .coming-soon-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 3rem;
          text-align: center;
        }

        .coming-soon-content h2 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .coming-soon-content p {
          font-size: 1.1rem;
          opacity: 0.95;
        }

        .projets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .projet-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .projet-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }

        .projet-card__header {
          padding: 2rem;
          color: white;
          text-align: center;
        }

        .projet-card__icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .projet-card__title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
        }

        .projet-card__body {
          padding: 1.5rem;
        }

        .projet-card__description {
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .projet-card__button {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: var(--projet-color, #667eea);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .projet-card__button:hover {
          opacity: 0.9;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #1e293b;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 2rem;
          color: #64748b;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #1e293b;
        }

        .projet-inscription-form {
          padding: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #1e293b;
        }

        .required {
          color: #ef4444;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input:disabled,
        .form-group textarea:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }

        .form-error {
          background: #fee2e2;
          color: #dc2626;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #e2e8f0;
          color: #475569;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #cbd5e1;
        }

        .modal-success {
          padding: 2rem;
          text-align: center;
        }

        .success-icon {
          width: 64px;
          height: 64px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto 1rem;
        }

        .modal-success h3 {
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .modal-success p {
          color: #64748b;
          margin-bottom: 1.5rem;
        }

        .form-hint {
          font-size: 0.875rem;
          color: #f59e0b;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fef3c7;
          border-radius: 6px;
          border-left: 3px solid #f59e0b;
        }

        .members-only-notice {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .members-only-notice strong {
          display: block;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .projets-grid {
            grid-template-columns: 1fr;
          }

          .page-title {
            font-size: 2rem;
          }
        }
      `}</style>
    </>
  )
}

export default Projets

