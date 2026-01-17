import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom'
import { FormationStyles } from '../components/PageStyles'
import { supabaseFormation } from '../config/supabase.config'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wooyxkfdzehvedvivhhd.supabase.co'
const PUBLIC_FORMATION_INSCRIPTION_URL = `${SUPABASE_URL}/functions/v1/public-formation-inscription`

// Styles pour le spinner CSS
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

function InscriptionFormation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { formationSlug: formationSlugParam } = useParams()
  const formationSlug = location.state?.formationSlug || formationSlugParam
  const formationId = location.state?.formationId
  
  const [formation, setFormation] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    adresse: '',
    ville: '',
    pays: 'France',
    whatsapp: '',
    niveau: '',
    niveau_etude: '',
    session_id: null
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Charger les informations de la formation
  useEffect(() => {
    let isMounted = true

    const fetchFormation = async () => {
      try {
        if (!isMounted) return
        setLoading(true)

        // Récupérer la formation par slug ou ID
        let query = supabaseFormation
          .from('formations')
          .select(`
            *,
            formateurs (
              id,
              nom,
              prenom,
              email,
              photo_url,
              bio
            )
          `)
          .eq('is_active', true)
        
        // Utiliser le slug si disponible, sinon l'ID
        if (formationSlug) {
          query = query.eq('slug', formationSlug)
        } else if (formationId) {
          query = query.eq('id', formationId)
        } else {
          throw new Error('Aucun identifiant de formation fourni')
        }
        
        const { data: formationData, error: formationError } = await query.single()

        if (!isMounted) return

        if (formationError) {
          throw new Error(formationError.message || 'Erreur lors du chargement de la formation')
        }

        if (!formationData) {
          throw new Error('Formation introuvable ou inactive')
        }

        setFormation(formationData)

        // Vérifier si les inscriptions sont fermées et afficher l'alerte
        if (formationData.inscriptions_ouvertes === false) {
          setTimeout(() => {
            alert("Les inscriptions à cette formation sont clôturées.\n\nJe vous invite à rejoindre l'ASGF via l'onglet Adhésion pour bénéficier des formations gratuites et être informé en priorité des prochaines sessions.\n\nhttps://association-asgf.fr/adhesion")
          }, 500)
        }

        // Récupérer les sessions ouvertes pour cette formation
        const { data: sessionsData, error: sessionsError } = await supabaseFormation
          .from('sessions')
          .select('*')
          .eq('formation_id', formationData.id)
          .eq('statut', 'ouverte')
          .order('date_debut', { ascending: true })

        if (!isMounted) return

        if (sessionsError) {
          console.warn('Erreur lors de la récupération des sessions:', sessionsError)
        } else {
          setSessions(sessionsData || [])
          // Sélectionner automatiquement la première session si disponible
          if (sessionsData && sessionsData.length > 0) {
            setFormData(prev => ({ ...prev, session_id: sessionsData[0].id }))
          }
        }
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Erreur lors du chargement de la formation')
        setLoading(false)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (formationSlug || formationId) {
      fetchFormation()
    } else {
      setError('Aucune formation spécifiée')
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [formationSlug, formationId, navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' })
    }
    if (submitError) {
      setSubmitError('')
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est requis'
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis'
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide'
    }
    if (!formData.niveau) newErrors.niveau = 'Le niveau est requis'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Vérifier si les inscriptions sont ouvertes
    if (formation && formation.inscriptions_ouvertes === false) {
      alert("Les inscriptions à cette formation sont clôturées.\n\nJe vous invite à rejoindre l'ASGF via l'onglet Adhésion pour bénéficier des formations gratuites et être informé en priorité des prochaines sessions.\n\nhttps://association-asgf.fr/adhesion")
      return
    }
    
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const dataToInsert = {
        prenom: formData.prenom.trim(),
        nom: formData.nom.trim(),
        email: formData.email.trim(),
        adresse: formData.adresse.trim() || null,
        ville: formData.ville.trim() || null,
        pays: formData.pays || 'France',
        whatsapp: formData.whatsapp.trim() || null,
        niveau: formData.niveau,
        niveau_etude: formData.niveau_etude.trim() || null,
        formation_id: formation.id,
        session_id: formData.session_id || null,
        status: 'pending',
        paiement_status: 'non payé',
        source: 'site web'
      }

      const response = await fetch(PUBLIC_FORMATION_INSCRIPTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToInsert),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.message || "Impossible d'enregistrer votre inscription")
      }

      // Rediriger vers la page de succès
      navigate('/formation/inscription/success', {
        state: {
          inscriptionData: {
            prenom: formData.prenom,
            nom: formData.nom,
            email: formData.email,
            formation: formation?.titre
          }
        },
        replace: true
      })
    } catch (err) {
      console.error('Erreur lors de l\'inscription formation:', err)
      setSubmitError(
        err.message ||
          "Une erreur inattendue est survenue lors de l'inscription. Veuillez réessayer ou nous contacter."
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <FormationStyles />
        <style>{spinnerStyle}</style>
        <section className="formations-section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                margin: '0 auto 1rem',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #0066CC',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ fontSize: '1.2rem', color: '#666' }}>Chargement...</p>
            </div>
          </div>
        </section>
      </>
    )
  }

  if (error) {
    return (
      <>
        <FormationStyles />
        <style>{spinnerStyle}</style>
        <section className="formations-section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
          <div className="container">
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem', 
                background: 'white', 
                borderRadius: '20px', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#dc3545' }}>
                  ⚠️
                </div>
                <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Erreur de chargement</h2>
                <p style={{ color: '#666', marginBottom: '2rem' }}>{error}</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button 
                    onClick={() => window.location.reload()} 
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#0066CC',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Réessayer
                  </button>
                  <button 
                    onClick={() => navigate('/formation')} 
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: '#0066CC',
                      border: '2px solid #0066CC',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Retour aux formations
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    )
  }

  if (!formation) {
    if (!loading) {
      return (
        <>
          <FormationStyles />
          <style>{spinnerStyle}</style>
          <section className="formations-section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
            <div className="container">
              <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem', 
                  background: 'white', 
                  borderRadius: '20px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#999' }}>
                    📋
                  </div>
                  <h2 style={{ color: '#666', marginBottom: '1rem' }}>Formation introuvable</h2>
                  <p style={{ color: '#666', marginBottom: '2rem' }}>
                    La formation demandée n'existe pas ou n'est plus disponible.
                  </p>
                  <button 
                    onClick={() => navigate('/formation')} 
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#0066CC',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Retour aux formations
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )
    }
    return null
  }

  return (
    <>
      <FormationStyles />
      <style>{spinnerStyle}</style>
      <style>{`
        .inscription-page {
          min-height: calc(100vh - 90px);
          padding: 40px 0 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          overflow: hidden;
        }
        .inscription-page::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
          opacity: 0.3;
        }
        .inscription-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 20px;
          position: relative;
          z-index: 1;
        }
        .inscription-header {
          background: white;
          border-radius: 20px;
          padding: 3rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          position: relative;
          overflow: hidden;
        }
        .inscription-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }
        .inscription-form-card {
          background: white;
          border-radius: 20px;
          padding: 3rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .form-section-modern {
          margin-bottom: 2.5rem;
        }
        .form-section-modern h3 {
          color: #667eea;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 3px solid #f0f0f0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .form-section-modern h3 i {
          font-size: 1.3rem;
        }
        .form-group-modern {
          margin-bottom: 1.5rem;
        }
        .form-group-modern label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #333;
          font-size: 0.95rem;
        }
        .form-group-modern .required {
          color: #e74c3c;
        }
        .form-group-modern input,
        .form-group-modern select {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: #fafafa;
          color: #111827;
        }
        .form-group-modern input:focus,
        .form-group-modern select:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }
        .form-group-modern input.error,
        .form-group-modern select.error {
          border-color: #e74c3c;
        }
        .error-message-modern {
          color: #e74c3c;
          font-size: 0.85rem;
          margin-top: 0.5rem;
          display: block;
        }
        .form-row-modern {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 768px) {
          .form-row-modern {
            grid-template-columns: 1fr;
          }
          .inscription-header,
          .inscription-form-card {
            padding: 2rem 1.5rem;
          }
        }
        .submit-btn-modern {
          width: 100%;
          padding: 1.25rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }
        .submit-btn-modern:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
        }
        .submit-btn-modern:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .info-card {
          background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%);
          border-radius: 15px;
          padding: 2rem;
          margin-bottom: 2rem;
          border-left: 5px solid #667eea;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
        }
        .back-link:hover {
          color: #764ba2;
          transform: translateX(-5px);
        }
      `}</style>
      
      <section className="inscription-page">
        {submitError && (
          <div
            style={{
              position: 'fixed',
              top: '90px',
              right: '20px',
              maxWidth: '380px',
              padding: '0.9rem 1.1rem',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.95)',
              color: '#fee2e2',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              zIndex: 9999,
            }}
          >
            <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</div>
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: '0.25rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                Impossible de finaliser votre inscription
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{submitError}</p>
            </div>
          </div>
        )}
        <div className="inscription-container">
          {/* En-tête */}
          <div className="inscription-header">
            <Link to="/formation" className="back-link">
              <span>←</span> Retour aux formations
            </Link>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                marginBottom: '1.5rem',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
              }}>
                <span style={{ fontSize: '2.5rem' }}>📚</span>
              </div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                marginBottom: '0.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: '700'
              }}>
                Inscription à la formation
              </h1>
              <h2 style={{ 
                fontSize: '1.75rem', 
                color: '#333',
                marginBottom: '1rem',
                fontWeight: '600'
              }}>
                {formation.titre}
              </h2>
              {formation.resume && (
                <p style={{ 
                  color: '#666', 
                  lineHeight: '1.8',
                  fontSize: '1.1rem',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}>
                  {formation.resume}
                </p>
              )}
            </div>

            {/* Informations sur la formation */}
            {(formation.duree_heures || formation.mode || formation.prix) && (
              <div className="info-card">
                <h4 style={{ 
                  color: '#667eea', 
                  marginBottom: '1rem', 
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>ℹ️</span> Informations pratiques
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {formation.duree_heures && (
                    <div>
                      <strong style={{ color: '#666', display: 'block', marginBottom: '0.25rem' }}>Durée</strong>
                      <span style={{ color: '#333', fontSize: '1.1rem' }}>{formation.duree_heures} heures</span>
                    </div>
                  )}
                  {formation.mode && (
                    <div>
                      <strong style={{ color: '#666', display: 'block', marginBottom: '0.25rem' }}>Mode</strong>
                      <span style={{ color: '#333', fontSize: '1.1rem' }}>{formation.mode}</span>
                    </div>
                  )}
                  {formation.prix && (
                    <div>
                      <strong style={{ color: '#666', display: 'block', marginBottom: '0.25rem' }}>Prix</strong>
                      <span style={{ color: '#667eea', fontSize: '1.3rem', fontWeight: '700' }}>{formation.prix} €</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Formulaire */}
          <div className="inscription-form-card">
            <form onSubmit={handleSubmit}>
              {/* Informations personnelles */}
              <div className="form-section-modern">
                <h3>
                  <span>👤</span> Informations personnelles
                </h3>
                
                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label htmlFor="prenom">
                      Prénom <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="prenom"
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleChange}
                      required
                      className={errors.prenom ? 'error' : ''}
                      placeholder="Votre prénom"
                    />
                    {errors.prenom && <span className="error-message-modern">{errors.prenom}</span>}
                  </div>

                  <div className="form-group-modern">
                    <label htmlFor="nom">
                      Nom <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="nom"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      required
                      className={errors.nom ? 'error' : ''}
                      placeholder="Votre nom"
                    />
                    {errors.nom && <span className="error-message-modern">{errors.nom}</span>}
                  </div>
                </div>

                <div className="form-group-modern">
                  <label htmlFor="email">
                    Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={errors.email ? 'error' : ''}
                    placeholder="votre.email@exemple.com"
                  />
                  {errors.email && <span className="error-message-modern">{errors.email}</span>}
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label htmlFor="whatsapp">WhatsApp (optionnel)</label>
                    <input
                      type="tel"
                      id="whatsapp"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>

                  <div className="form-group-modern">
                    <label htmlFor="pays">Pays</label>
                    <select
                      id="pays"
                      name="pays"
                      value={formData.pays}
                      onChange={handleChange}
                    >
                      <option value="France">France</option>
                      <option value="Sénégal">Sénégal</option>
                      <option value="Autres">Autres</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label htmlFor="ville">Ville (optionnel)</label>
                    <input
                      type="text"
                      id="ville"
                      name="ville"
                      value={formData.ville}
                      onChange={handleChange}
                      placeholder="Votre ville"
                    />
                  </div>

                  <div className="form-group-modern">
                    <label htmlFor="adresse">Adresse (optionnel)</label>
                    <input
                      type="text"
                      id="adresse"
                      name="adresse"
                      value={formData.adresse}
                      onChange={handleChange}
                      placeholder="Votre adresse"
                    />
                  </div>
                </div>
              </div>

              {/* Niveau et formation */}
              <div className="form-section-modern">
                <h3>
                  <span>🎓</span> Niveau et formation
                </h3>
                
                <div className="form-group-modern">
                  <label htmlFor="niveau">
                    Votre niveau <span className="required">*</span>
                  </label>
                  <select
                    id="niveau"
                    name="niveau"
                    value={formData.niveau}
                    onChange={handleChange}
                    required
                    className={errors.niveau ? 'error' : ''}
                  >
                    <option value="">Sélectionnez votre niveau</option>
                    <option value="Débutant">Débutant</option>
                    <option value="Intermédiaire">Intermédiaire</option>
                  </select>
                  {errors.niveau && <span className="error-message-modern">{errors.niveau}</span>}
                </div>

                <div className="form-group-modern">
                  <label htmlFor="niveau_etude">Niveau d'études (optionnel)</label>
                  <select
                    id="niveau_etude"
                    name="niveau_etude"
                    value={formData.niveau_etude}
                    onChange={handleChange}
                  >
                    <option value="">Sélectionnez votre niveau d'études</option>
                    <option value="Bac">Bac</option>
                    <option value="Bac+2">Bac+2</option>
                    <option value="Bac+3">Bac+3</option>
                    <option value="Bac+4">Bac+4</option>
                    <option value="Bac+5">Bac+5</option>
                    <option value="Bac+6">Bac+6 et plus</option>
                  </select>
                </div>

                {sessions.length > 0 && (
                  <div className="form-group-modern">
                    <label htmlFor="session_id">Session (optionnel)</label>
                    <select
                      id="session_id"
                      name="session_id"
                      value={formData.session_id || ''}
                      onChange={handleChange}
                    >
                      <option value="">Sélectionnez une session</option>
                      {sessions.map(session => (
                        <option key={session.id} value={session.id}>
                          {new Date(session.date_debut).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                          {session.date_fin && ` - ${new Date(session.date_fin).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}`}
                          {session.capacite_max && ` (${session.capacite_max} places max)`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="submit-btn-modern" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span style={{ 
                      display: 'inline-block',
                      width: '20px', 
                      height: '20px', 
                      border: '3px solid #ffffff',
                      borderTop: '3px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}></span>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <span>✓</span> Confirmer mon inscription
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

export default InscriptionFormation
