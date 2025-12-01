import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom'
import { WebinairesStyles } from '../components/PageStyles'
import { supabaseWebinaire } from '../config/supabase.config'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Styles pour le spinner CSS
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

function InscriptionWebinaire() {
  const navigate = useNavigate()
  const location = useLocation()
  const { webinaireSlug: webinaireSlugParam } = useParams()
  const webinaireSlug = location.state?.webinaireSlug || webinaireSlugParam
  const webinaireId = location.state?.webinaireId
  
  const [webinaire, setWebinaire] = useState(null)
  const [presentateurs, setPresentateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    pays: 'France',
    whatsapp: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Charger les informations du webinaire
  useEffect(() => {
    let isMounted = true

    const fetchWebinaire = async () => {
      try {
        if (!isMounted) return
        setLoading(true)

        // Récupérer le webinaire par slug ou ID
        let query = supabaseWebinaire
          .from('webinaires')
          .select('*')
          .eq('is_active', true)
        
        // Utiliser le slug si disponible, sinon l'ID
        if (webinaireSlug) {
          query = query.eq('slug', webinaireSlug)
        } else if (webinaireId) {
          query = query.eq('id', webinaireId)
        } else {
          throw new Error('Aucun identifiant de webinaire fourni')
        }
        
        const { data: webinaireData, error: webinaireError } = await query.single()

        if (!isMounted) return

        if (webinaireError) {
          throw new Error(webinaireError.message || 'Erreur lors du chargement du webinaire')
        }

        if (!webinaireData) {
          throw new Error('Webinaire introuvable ou inactive')
        }

        setWebinaire(webinaireData)

        // Récupérer les présentateurs pour ce webinaire
        const { data: presentateursData, error: presentateursError } = await supabaseWebinaire
          .from('presentateurs')
          .select('*')
          .eq('webinaire_id', webinaireData.id)
          .order('created_at', { ascending: true })

        if (!isMounted) return

        if (presentateursError) {
          console.warn('Erreur lors de la récupération des présentateurs:', presentateursError)
        } else {
          setPresentateurs(presentateursData || [])
        }
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Erreur lors du chargement du webinaire')
        setLoading(false)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (webinaireSlug || webinaireId) {
      fetchWebinaire()
    } else {
      setError('Aucun webinaire spécifié')
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [webinaireSlug, webinaireId, navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' })
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const dataToInsert = {
        prenom: formData.prenom.trim(),
        nom: formData.nom.trim(),
        email: formData.email.trim(),
        pays: formData.pays || 'France',
        whatsapp: formData.whatsapp.trim() || null,
        webinaire_id: webinaire.id,
        statut: 'pending',
        source: 'site web'
      }

      // Utiliser l'API backend publique pour créer l'inscription (envoie automatiquement un email)
      const response = await fetch(`${API_URL}/api/public/webinaire/inscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToInsert),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.message && result.message.includes('déjà inscrit')) {
          alert('Cet email est déjà inscrit à ce webinaire. Veuillez utiliser un autre email ou contacter l\'ASGF.')
        } else {
          alert(`Erreur d'enregistrement : ${result.message || 'Erreur inconnue'}`)
        }
        return
      }

      // Rediriger vers la page de succès
      navigate('/webinaire/inscription/success', {
        state: {
          inscriptionData: {
            prenom: formData.prenom,
            nom: formData.nom,
            email: formData.email,
            webinaire: webinaire?.titre,
            date: webinaire?.date_webinaire,
            heure: webinaire?.heure_debut
          }
        },
        replace: true
      })
    } catch (err) {
      console.error('Erreur fatale lors de l\'envoi:', err)
      alert('Une erreur inattendue est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <WebinairesStyles />
        <style>{spinnerStyle}</style>
        <section className="webinaires-section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                margin: '0 auto 1rem',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #667eea',
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
        <WebinairesStyles />
        <style>{spinnerStyle}</style>
        <section className="webinaires-section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
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
                      background: '#667eea',
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
                    onClick={() => navigate('/webinaires')} 
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: '#667eea',
                      border: '2px solid #667eea',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Retour aux webinaires
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    )
  }

  if (!webinaire) {
    if (!loading) {
      return (
        <>
          <WebinairesStyles />
          <style>{spinnerStyle}</style>
          <section className="webinaires-section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
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
                    📹
                  </div>
                  <h2 style={{ color: '#666', marginBottom: '1rem' }}>Webinaire introuvable</h2>
                  <p style={{ color: '#666', marginBottom: '2rem' }}>
                    Le webinaire demandé n'existe pas ou n'est plus disponible.
                  </p>
                  <button 
                    onClick={() => navigate('/webinaires')} 
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Retour aux webinaires
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

  const webinaireDate = new Date(webinaire.date_webinaire)
  const formattedDate = webinaireDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const formattedTime = webinaire.heure_debut ? webinaire.heure_debut.substring(0, 5) : ''

  return (
    <>
      <WebinairesStyles />
      <style>{spinnerStyle}</style>
      <section className="webinaires-section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
        <div className="container">
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
            {/* En-tête avec info webinaire */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                display: 'inline-block',
                padding: '0.4rem 0.8rem',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                borderRadius: '15px',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                {webinaire.theme || 'Webinaire'}
              </div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#2d2d2d',
                marginBottom: '1rem',
                lineHeight: '1.3'
              }}>
                {webinaire.titre}
              </h1>
              {webinaire.resume && (
                <p style={{
                  color: '#666',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem'
                }}>
                  {webinaire.resume}
                </p>
              )}
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap',
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span style={{ fontWeight: '600', color: '#2d2d2d' }}>{formattedDate}</span>
                </div>
                {formattedTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span style={{ fontWeight: '600', color: '#2d2d2d' }}>{formattedTime}</span>
                  </div>
                )}
                {webinaire.mode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 7l-7 5 7 5V7z"></path>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>{webinaire.mode}</span>
                  </div>
                )}
              </div>

              {/* Présentateurs avec bio */}
              {presentateurs.length > 0 && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e9ecef' }}>
                  <div style={{
                    fontSize: '1rem',
                    color: '#2d2d2d',
                    marginBottom: '1rem',
                    fontWeight: '700'
                  }}>
                    👨‍🏫 Présentateurs
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {presentateurs.map((presentateur) => (
                      <div
                        key={presentateur.id}
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          padding: '1rem',
                          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                          borderRadius: '15px',
                          border: '1px solid #dee2e6',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateX(5px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateX(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {/* Photo */}
                        {(presentateur.photo_url && !presentateur.photo_url.startsWith('file://')) ? (
                          <img
                            src={presentateur.photo_url}
                            alt={`${presentateur.prenom} ${presentateur.nom}`}
                            style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '3px solid #667eea',
                              flexShrink: 0
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none'
                              const fallback = e.target.nextElementSibling
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          style={{
                            display: (presentateur.photo_url && !presentateur.photo_url.startsWith('file://')) ? 'none' : 'flex',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1.8rem',
                            flexShrink: 0
                          }}
                        >
                          {(presentateur.prenom?.[0] || '').toUpperCase()}{(presentateur.nom?.[0] || '').toUpperCase()}
                        </div>
                        
                        {/* Informations */}
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '1.1rem', 
                            fontWeight: '700', 
                            color: '#2d2d2d',
                            marginBottom: '0.5rem'
                          }}>
                            {presentateur.prenom} {presentateur.nom}
                          </div>
                          {presentateur.bio && (
                            <p style={{
                              fontSize: '0.9rem',
                              color: '#666',
                              lineHeight: '1.6',
                              marginBottom: '0.5rem'
                            }}>
                              {presentateur.bio}
                            </p>
                          )}
                          {presentateur.linkedin && (
                            <a
                              href={presentateur.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.85rem',
                                color: '#667eea',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: '600'
                              }}
                              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                              </svg>
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Formulaire d'inscription */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '2.5rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#2d2d2d',
                marginBottom: '0.5rem'
              }}>
                Formulaire d'inscription
              </h2>
              <p style={{
                color: '#666',
                marginBottom: '2rem',
                fontSize: '0.95rem'
              }}>
                Remplissez le formulaire ci-dessous pour vous inscrire à ce webinaire.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#2d2d2d',
                      fontSize: '0.9rem'
                    }}>
                      Prénom <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `2px solid ${errors.prenom ? '#dc3545' : '#ddd'}`,
                        borderRadius: '8px',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = errors.prenom ? '#dc3545' : '#ddd'}
                    />
                    {errors.prenom && (
                      <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.prenom}</p>
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#2d2d2d',
                      fontSize: '0.9rem'
                    }}>
                      Nom <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `2px solid ${errors.nom ? '#dc3545' : '#ddd'}`,
                        borderRadius: '8px',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = errors.nom ? '#dc3545' : '#ddd'}
                    />
                    {errors.nom && (
                      <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.nom}</p>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#2d2d2d',
                    fontSize: '0.9rem'
                  }}>
                    Email <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `2px solid ${errors.email ? '#dc3545' : '#ddd'}`,
                      borderRadius: '8px',
                      fontSize: '1rem',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = errors.email ? '#dc3545' : '#ddd'}
                  />
                  {errors.email && (
                    <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.email}</p>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#2d2d2d',
                      fontSize: '0.9rem'
                    }}>
                      Pays
                    </label>
                    <input
                      type="text"
                      name="pays"
                      value={formData.pays}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#2d2d2d',
                      fontSize: '0.9rem'
                    }}>
                      WhatsApp (optionnel)
                    </label>
                    <input
                      type="text"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      placeholder="+33 6 12 34 56 78"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    />
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  marginTop: '2rem',
                  paddingTop: '2rem',
                  borderTop: '1px solid #e9ecef'
                }}>
                  <Link
                    to="/webinaires"
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: '#667eea',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      border: '2px solid #667eea',
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#f0f7ff'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'white'
                    }}
                  >
                    Annuler
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '0.75rem 2rem',
                      background: isSubmitting ? '#ccc' : 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: isSubmitting ? 'none' : '0 4px 15px rgba(102,126,234,0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.target.style.transform = 'translateY(-2px)'
                        e.target.style.boxShadow = '0 6px 20px rgba(102,126,234,0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) {
                        e.target.style.transform = 'translateY(0)'
                        e.target.style.boxShadow = '0 4px 15px rgba(102,126,234,0.3)'
                      }
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid white',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }}></div>
                        Inscription en cours...
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="8.5" cy="7" r="4"></circle>
                          <line x1="20" y1="8" x2="20" y2="14"></line>
                          <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        S'inscrire au webinaire
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default InscriptionWebinaire

