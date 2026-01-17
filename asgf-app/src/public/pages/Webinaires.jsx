import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { WebinairesStyles } from '../components/PageStyles'
import { supabaseWebinaire } from '../config/supabase.config'

function Webinaires() {
  const [webinaires, setWebinaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all') // 'all', 'upcoming', 'past'

  // Charger les webinaires depuis la base de données
  useEffect(() => {
    const fetchWebinaires = async () => {
      try {
        setLoading(true)
        setError(null)

        // Récupérer les webinaires actifs avec leurs présentateurs
        const { data: webinairesDataRaw, error: webinairesError } = await supabaseWebinaire
          .from('webinaires')
          .select('*')
          .eq('is_active', true)
          .order('date_webinaire', { ascending: true })
        
        if (webinairesError) {
          throw webinairesError
        }
        
        // Récupérer les présentateurs pour chaque webinaire
        const webinaireIds = (webinairesDataRaw || []).map(w => w.id)
        let presentateursMap = new Map() // Map: webinaire_id -> [presentateurs]
        
        if (webinaireIds.length > 0) {
          const { data: presentateursData, error: presentateursError } = await supabaseWebinaire
            .from('presentateurs')
            .select('*')
            .in('webinaire_id', webinaireIds)
            .order('created_at', { ascending: true })
          
          if (!presentateursError && presentateursData) {
            presentateursData.forEach(presentateur => {
              if (!presentateursMap.has(presentateur.webinaire_id)) {
                presentateursMap.set(presentateur.webinaire_id, [])
              }
              presentateursMap.get(presentateur.webinaire_id).push(presentateur)
            })
          }
        }
        
        // Associer les présentateurs aux webinaires
        const webinairesData = (webinairesDataRaw || []).map(webinaire => {
          const presentateurs = presentateursMap.get(webinaire.id) || []
          return {
            ...webinaire,
            presentateurs
          }
        })

        setWebinaires(webinairesData)
      } catch (err) {
        console.error('❌ Erreur lors du chargement des webinaires:', err)
        setError(err.message || 'Erreur lors du chargement des webinaires')
      } finally {
        setLoading(false)
      }
    }

    fetchWebinaires()
  }, [])

  useEffect(() => {
    // Scroll vers le haut de la page au chargement
    const scrollToTop = () => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    scrollToTop()
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTop)
    })
    setTimeout(scrollToTop, 0)
    setTimeout(scrollToTop, 10)
  }, [])

  // Filtrer les webinaires selon le filtre actif
  const filteredWebinaires = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    if (activeFilter === 'upcoming') {
      return webinaires.filter(w => {
        const webinaireDate = new Date(w.date_webinaire)
        webinaireDate.setHours(0, 0, 0, 0)
        return webinaireDate >= now
      })
    } else if (activeFilter === 'past') {
      return webinaires.filter(w => {
        const webinaireDate = new Date(w.date_webinaire)
        webinaireDate.setHours(0, 0, 0, 0)
        return webinaireDate < now
      })
    }
    return webinaires
  }, [webinaires, activeFilter])

  useEffect(() => {
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

    setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach(el => {
      observer.observe(el)
        // Forcer la visibilité si l'élément est déjà visible
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('visible')
        }
    })
    }, 100)

    return () => observer.disconnect()
  }, [activeFilter, filteredWebinaires])

  const WebinaireCard = ({ webinaire }) => {
    const webinaireDate = new Date(webinaire.date_webinaire)
    const isUpcoming = webinaireDate >= new Date()
    const formattedDate = webinaireDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const formattedTime = webinaire.heure_debut ? 
      webinaire.heure_debut.substring(0, 5) : ''

    return (
      <div 
        className="webinaire-card fade-in visible" 
        style={{
          background: 'white',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
          border: '1px solid #e9ecef'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)'
          e.currentTarget.style.boxShadow = '0 15px 50px rgba(0,0,0,0.15)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)'
        }}
      >
        {/* Image ou placeholder */}
        <div style={{
          width: '100%',
          height: '200px',
          background: (webinaire.image_url && !webinaire.image_url.startsWith('file://')) 
            ? `url(${webinaire.image_url}) center/cover`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {(!webinaire.image_url || webinaire.image_url.startsWith('file://')) && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          )}
          {isUpcoming && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: '#28a745',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(40,167,69,0.3)'
            }}>
              À venir
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Thème */}
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

          {/* Titre */}
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#2d2d2d',
            marginBottom: '0.75rem',
            lineHeight: '1.3'
          }}>
            {webinaire.titre}
          </h3>

          {/* Résumé */}
          {webinaire.resume && (
            <p style={{
              color: '#666',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              marginBottom: '1.5rem'
            }}>
              {webinaire.resume}
            </p>
          )}

          {/* Date et heure */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span style={{ fontWeight: '600', color: '#2d2d2d' }}>{formattedDate}</span>
            </div>
            {formattedTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span style={{ fontWeight: '600', color: '#2d2d2d' }}>{formattedTime}</span>
              </div>
            )}
            {webinaire.mode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z"></path>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <span style={{ fontSize: '0.9rem', color: '#666' }}>{webinaire.mode}</span>
              </div>
            )}
          </div>

          {/* Présentateurs */}
          {webinaire.presentateurs && webinaire.presentateurs.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                fontSize: '0.85rem',
                color: '#666',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                👨‍🏫 Présentateurs
              </div>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}>
                {webinaire.presentateurs.map((presentateur) => (
                  <div
                    key={presentateur.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: '#e7f3ff',
                      borderRadius: '10px',
                      border: '1px solid #b3d9ff'
                    }}
                  >
                    {(presentateur.photo_url && !presentateur.photo_url.startsWith('file://')) ? (
                      <img
                        src={presentateur.photo_url}
                        alt={`${presentateur.prenom} ${presentateur.nom}`}
                        style={{
                          width: '35px',
                          height: '35px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #0066CC'
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
                        width: '35px',
                        height: '35px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}
                    >
                      {(presentateur.prenom?.[0] || '').toUpperCase()}{(presentateur.nom?.[0] || '').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2d2d2d' }}>
                        {presentateur.prenom} {presentateur.nom}
                      </div>
                      {presentateur.linkedin && (
                        <a
                          href={presentateur.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.75rem',
                            color: '#0066CC',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <Link
              to={`/webinaire/inscription/${webinaire.slug || webinaire.id}`}
              state={{
                webinaireId: webinaire.id,
                webinaireSlug: webinaire.slug
              }}
              style={{
                flex: 1,
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(102,126,234,0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 20px rgba(102,126,234,0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              S'inscrire
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <WebinairesStyles />
      <section className="webinaires-section">
      <div className="container">
          <div className="webinaires-header fade-in" style={{
            textAlign: 'center',
            marginBottom: '3rem',
            padding: '2rem 0'
          }}>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              Webinaires
            </h1>
            <p style={{
              fontSize: '1.2rem',
              color: '#666',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Découvrez nos webinaires sur la géomatique, animés par des experts passionnés
            </p>
          </div>

          {/* Filtres */}
          <div className="filter-tabs fade-in" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '3rem',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'all', label: 'Tous', icon: 'fa-list' },
              { id: 'upcoming', label: 'À venir', icon: 'fa-calendar-check' },
              { id: 'past', label: 'Passés', icon: 'fa-history' }
            ].map(filter => (
              <button
                key={filter.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveFilter(filter.id)
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: activeFilter === filter.id
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'white',
                  color: activeFilter === filter.id ? 'white' : '#666',
                  borderRadius: '25px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'all 0.3s ease',
                  boxShadow: activeFilter === filter.id
                    ? '0 5px 20px rgba(102,126,234,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (activeFilter !== filter.id) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFilter !== filter.id) {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                  }
                }}
              >
                {filter.icon === 'fa-video' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 7l-7 5 7 5V7z"></path>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                )}
                {filter.icon === 'fa-calendar-alt' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                )}
                {filter.icon === 'fa-history' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                )}
                {filter.label}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '4rem',
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
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
              <p style={{ fontSize: '1.2rem', color: '#666' }}>Chargement des webinaires...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              background: '#fff3cd',
              borderRadius: '10px',
              margin: '2rem 0',
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem', color: '#856404' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 style={{ color: '#856404', marginBottom: '0.5rem' }}>Erreur de chargement</h3>
              <p style={{ color: '#856404' }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Webinaires Grid */}
          {!loading && !error && filteredWebinaires.length > 0 && (
            <div className="webinaires-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem'
            }}>
              {filteredWebinaires.map(webinaire => (
                <WebinaireCard key={webinaire.id} webinaire={webinaire} />
              ))}
        </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredWebinaires.length === 0 && (
            <div className="empty-state fade-in" style={{
              textAlign: 'center',
              padding: '4rem',
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#ccc' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <line x1="10" y1="14" x2="14" y2="18"></line>
                  <line x1="14" y1="14" x2="10" y2="18"></line>
                </svg>
          </div>
              <h3 style={{
                fontSize: '1.5rem',
                color: '#666',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                {activeFilter === 'upcoming' 
                  ? 'Aucun webinaire à venir'
                  : activeFilter === 'past'
                  ? 'Aucun webinaire passé'
                  : 'Aucun webinaire programmé pour le moment'}
              </h3>
              <p style={{
                color: '#999',
                fontSize: '1rem'
              }}>
                {activeFilter === 'upcoming'
                  ? 'Les prochains webinaires seront annoncés prochainement.'
                  : 'Restez connectés pour découvrir nos prochains événements !'}
              </p>
        </div>
          )}
      </div>
    </section>
    </>
  )
}

export default Webinaires
