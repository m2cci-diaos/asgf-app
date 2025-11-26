import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FormationStyles } from '../components/PageStyles'
import { supabaseFormation } from '../config/supabase.config'

function Formation() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [formations, setFormations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sessions, setSessions] = useState([])

  // Fonction pour mapper le niveau de la base vers le format d'affichage
  const mapNiveauToBadges = (niveau) => {
    if (!niveau) return { level: 'Non spécifié', levelBadges: 0 }
    
    const niveauLower = niveau.toLowerCase()
    if (niveauLower.includes('débutant') && niveauLower.includes('intermédiaire')) {
      return { level: 'Débutant/Intermédiaire', levelBadges: 2 }
    } else if (niveauLower.includes('intermédiaire') && niveauLower.includes('avancé')) {
      return { level: 'Intermédiaire/Avancé', levelBadges: 3 }
    } else if (niveauLower.includes('débutant')) {
      return { level: 'Débutant', levelBadges: 1 }
    } else if (niveauLower.includes('intermédiaire')) {
      return { level: 'Intermédiaire', levelBadges: 2 }
    } else if (niveauLower.includes('avancé')) {
      return { level: 'Avancé', levelBadges: 3 }
    }
    return { level: niveau, levelBadges: 2 }
  }

  // Fonction pour normaliser la catégorie vers les filtres existants
  const normalizeCategory = (categorie) => {
    const catLower = categorie?.toLowerCase() || ''
    if (catLower.includes('sig') || catLower.includes('qgis') || catLower.includes('postgis') || catLower.includes('database')) {
      return 'sig'
    }
    if (catLower.includes('télédétection') || catLower.includes('teledetection') || catLower.includes('satellite') || catLower.includes('drone') || catLower.includes('photogrammétrie')) {
      return 'teledetection'
    }
    if (catLower.includes('python') || catLower.includes('programmation')) {
      return 'programmation'
    }
    if (catLower.includes('cartographie') || catLower.includes('web') || catLower.includes('mapbox') || catLower.includes('leaflet')) {
      return 'cartographie'
    }
    return 'autre'
  }

  // Fonction pour mapper la catégorie vers une icône
  const getCategoryIcon = (categorie) => {
    const catLower = categorie?.toLowerCase() || ''
    if (catLower.includes('sig') || catLower.includes('qgis')) return 'fa-map'
    if (catLower.includes('télédétection') || catLower.includes('teledetection') || catLower.includes('satellite')) return 'fa-satellite'
    if (catLower.includes('python') || catLower.includes('programmation')) return 'fab fa-python'
    if (catLower.includes('cartographie') || catLower.includes('web')) return 'fa-globe'
    if (catLower.includes('postgis') || catLower.includes('database')) return 'fa-database'
    if (catLower.includes('drone') || catLower.includes('photogrammétrie')) return 'fa-drone'
    return 'fa-graduation-cap' // Icône par défaut
  }

  // Charger les formations depuis la base de données
  useEffect(() => {
    const fetchFormations = async () => {
      try {
        setLoading(true)
        setError(null)

        // Récupérer les formations actives avec leurs formateurs (relation many-to-many)
        const { data: formationsDataRaw, error: formationsError } = await supabaseFormation
          .from('formations')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        
        if (formationsError) {
          throw formationsError
        }
        
        // Récupérer toutes les associations formation-formateur
        const formationIds = (formationsDataRaw || []).map(f => f.id)
        let associationsMap = new Map() // Map: formation_id -> [formateurs]
        
        if (formationIds.length > 0) {
          // Essayer d'abord avec la relation Supabase imbriquée
          const { data: associationsData, error: associationsError } = await supabaseFormation
            .from('formation_formateurs')
            .select(`
              formation_id,
              formateur_id,
              role,
              ordre,
              formateurs (
                id,
                nom,
                prenom,
                email,
                photo_url,
                bio
              )
            `)
            .in('formation_id', formationIds)
            .order('ordre', { ascending: true })
          
          if (associationsError) {
            console.warn('⚠️ Erreur lors de la récupération des associations avec relation imbriquée:', associationsError)
            console.log('🔄 Tentative de récupération manuelle des associations...')
            
            // Fallback : récupérer les associations et les formateurs séparément
            const { data: associationsOnly, error: assocOnlyError } = await supabaseFormation
              .from('formation_formateurs')
              .select('formation_id, formateur_id, role, ordre')
              .in('formation_id', formationIds)
              .order('ordre', { ascending: true })
            
            if (!assocOnlyError && associationsOnly && associationsOnly.length > 0) {
              // Récupérer tous les formateurs uniques
              const formateurIds = [...new Set(associationsOnly.map(a => a.formateur_id).filter(Boolean))]
              
              if (formateurIds.length > 0) {
                const { data: formateursData, error: formateursError } = await supabaseFormation
                  .from('formateurs')
                  .select('id, nom, prenom, email, photo_url, bio')
                  .in('id', formateurIds)
                
                if (!formateursError && formateursData) {
                  const formateursMap = new Map(formateursData.map(f => [f.id, f]))
                  
                  // Associer les formateurs aux formations
                  associationsOnly.forEach(assoc => {
                    const formateur = formateursMap.get(assoc.formateur_id)
                    if (formateur && assoc.formation_id) {
                      if (!associationsMap.has(assoc.formation_id)) {
                        associationsMap.set(assoc.formation_id, [])
                      }
                      associationsMap.get(assoc.formation_id).push(formateur)
                    }
                  })
                  
                  console.log('✅ Associations récupérées manuellement:', associationsOnly.length)
                  console.log('✅ Formateurs récupérés:', formateursData.length)
                } else {
                  console.error('❌ Erreur lors de la récupération des formateurs:', formateursError)
                }
              }
            } else {
              console.warn('⚠️ Aucune association trouvée ou erreur:', assocOnlyError)
              
              // Dernier fallback : utiliser formateur_id direct (ancien système)
              const formateurIds = [...new Set((formationsDataRaw || [])
                .map(f => f.formateur_id)
                .filter(Boolean))]
              
              if (formateurIds.length > 0) {
                const { data: formateursData } = await supabaseFormation
                  .from('formateurs')
                  .select('id, nom, prenom, email, photo_url, bio')
                  .in('id', formateurIds)
                
                if (formateursData) {
                  const formateursMap = new Map(formateursData.map(f => [f.id, f]))
                  formationsDataRaw.forEach(formation => {
                    if (formation.formateur_id) {
                      const formateur = formateursMap.get(formation.formateur_id)
                      if (formateur) {
                        if (!associationsMap.has(formation.id)) {
                          associationsMap.set(formation.id, [])
                        }
                        associationsMap.get(formation.id).push(formateur)
                      }
                    }
                  })
                  console.log('✅ Formateurs récupérés via formateur_id (fallback):', formateursData.length)
                }
              }
            }
          } else if (associationsData) {
            // Organiser les associations par formation_id (relation Supabase fonctionne)
            associationsData.forEach(assoc => {
              if (assoc.formateurs && assoc.formation_id) {
                if (!associationsMap.has(assoc.formation_id)) {
                  associationsMap.set(assoc.formation_id, [])
                }
                associationsMap.get(assoc.formation_id).push(assoc.formateurs)
              }
            })
            console.log('✅ Associations récupérées via relation Supabase:', associationsData.length)
          } else {
            console.warn('⚠️ Aucune donnée d\'association retournée')
          }
        }
        
        // Associer les formateurs aux formations (prendre le premier comme formateur principal pour l'affichage)
        const formationsData = (formationsDataRaw || []).map(formation => {
          const formateurs = associationsMap.get(formation.id) || []
          return {
            ...formation,
            formateurs: formateurs.length > 0 ? formateurs[0] : null, // Formateur principal pour l'affichage
            formateurs_list: formateurs // Tous les formateurs pour référence future
          }
        })

        console.log('📊 Formations brutes:', formationsData)
        console.log('👤 Formateurs dans les formations:', formationsData?.map(f => ({
          titre: f.titre,
          formateur_id: f.formateur_id,
          formateurs: f.formateurs,
          formateurs_type: Array.isArray(f.formateurs) ? 'array' : typeof f.formateurs,
          formateurs_length: Array.isArray(f.formateurs) ? f.formateurs.length : 'N/A'
        })))
        
        // Log détaillé pour la première formation
        if (formationsData && formationsData.length > 0) {
          console.log('🔬 Détail première formation:', {
            titre: formationsData[0].titre,
            formateur_id: formationsData[0].formateur_id,
            formateurs_raw: formationsData[0].formateurs,
            formateurs_is_array: Array.isArray(formationsData[0].formateurs),
            formateurs_is_object: typeof formationsData[0].formateurs === 'object' && formationsData[0].formateurs !== null,
            formateurs_keys: formationsData[0].formateurs ? Object.keys(formationsData[0].formateurs) : null
          })
        }

        // Récupérer les sessions pour chaque formation
        const { data: sessionsData, error: sessionsError } = await supabaseFormation
          .from('sessions')
          .select('*')
          .eq('statut', 'ouverte')
          .order('date_debut', { ascending: true })

        if (sessionsError) {
          console.warn('Erreur lors de la récupération des sessions:', sessionsError)
        } else {
          setSessions(sessionsData || [])
        }

        // Transformer les données de la base vers le format attendu
        const transformedFormations = (formationsData || []).map(formation => {
          const niveauInfo = mapNiveauToBadges(formation.niveau)
          const prochaineSession = sessionsData?.find(s => s.formation_id === formation.id && s.statut === 'ouverte')
          
          // Gérer la relation formateur (peut être un objet ou un tableau selon la relation)
          let formateurData = null
          if (formation.formateurs) {
            // Si c'est un tableau (relation one-to-many), prendre le premier
            if (Array.isArray(formation.formateurs)) {
              if (formation.formateurs.length > 0) {
                formateurData = formation.formateurs[0]
              }
            } 
            // Si c'est un objet (relation one-to-one) et qu'il a au moins un nom
            else if (typeof formation.formateurs === 'object' && formation.formateurs !== null) {
              // Vérifier si c'est un objet formateur valide (avec nom ou prenom)
              if (formation.formateurs.nom || formation.formateurs.prenom || formation.formateurs.id) {
                formateurData = formation.formateurs
              }
            }
          }
          
          // Log pour déboguer
          if (formation.titre && formateurData) {
            console.log(`✅ Formateur trouvé pour "${formation.titre}":`, formateurData)
          } else if (formation.titre && !formateurData) {
            console.log(`⚠️ Pas de formateur pour "${formation.titre}"`, {
              formateur_id: formation.formateur_id,
              formateurs: formation.formateurs,
              formateurs_type: typeof formation.formateurs,
              is_array: Array.isArray(formation.formateurs)
            })
          }
          
          return {
            id: formation.id,
            slug: formation.slug,
            category: normalizeCategory(formation.categorie),
            title: formation.titre,
            description: formation.resume || formation.description_longue || '',
            duration: formation.duree_heures ? `${formation.duree_heures} heures` : 'Non spécifié',
            maxParticipants: formation.participants_max ? `${formation.participants_max} participants max` : 'Non spécifié',
            level: niveauInfo.level,
            levelBadges: niveauInfo.levelBadges,
            badge: formation.badge || null,
            icon: getCategoryIcon(formation.categorie),
            mode: formation.mode || 'En ligne',
            prix: formation.prix,
            prochaineSession: prochaineSession ? prochaineSession.date_debut : formation.prochaine_session,
            formateur: formateurData ? {
              nom: formateurData.nom,
              prenom: formateurData.prenom,
              email: formateurData.email,
              photo_url: formateurData.photo_url,
              bio: formateurData.bio
            } : null,
            image_url: formation.image_url
          }
        })
        
        console.log('🔍 Formations avec formateurs:', transformedFormations.map(f => ({
          titre: f.title,
          formateur: f.formateur ? `${f.formateur.prenom} ${f.formateur.nom}` : 'Aucun'
        })))

        console.log('✅ Formations transformées:', transformedFormations.length)
        console.log('📋 Détails formations:', transformedFormations.map(f => ({ 
          titre: f.title, 
          category: f.category,
          categorie_originale: formationsData?.find(orig => orig.id === f.id)?.categorie
        })))
        
        setFormations(transformedFormations)
      } catch (err) {
        console.error('❌ Erreur lors du chargement des formations:', err)
        setError(err.message || 'Erreur lors du chargement des formations')
      } finally {
        setLoading(false)
        console.log('🏁 Chargement terminé, loading:', false)
      }
    }

    fetchFormations()
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

  const filteredFormations = useMemo(() => {
    if (activeFilter === 'all') {
      return formations
    }
    return formations.filter(f => f.category === activeFilter)
  }, [activeFilter, formations])
  
  // Log pour déboguer
  useEffect(() => {
    console.log('🔍 Filtre actif:', activeFilter)
    console.log('📊 Formations totales:', formations.length)
    console.log('✅ Formations filtrées:', filteredFormations.length)
    console.log('⏳ Loading:', loading)
    console.log('❌ Error:', error)
    if (formations.length > 0) {
      const categories = [...new Set(formations.map(f => f.category))]
      console.log('🏷️ Catégories disponibles:', categories)
      console.log('📋 Détails des formations:', formations.map(f => ({ 
        titre: f.title, 
        category: f.category 
      })))
    } else if (!loading && !error) {
      console.warn('⚠️ Aucune formation chargée alors que loading=false et error=null')
    }
  }, [activeFilter, formations, filteredFormations, loading, error])

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

    // Attendre que le DOM soit mis à jour
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
  }, [activeFilter, filteredFormations])

  const FormationCard = ({ formation }) => {
    const badges = []
    for (let i = 0; i < 3; i++) {
      badges.push(
        <span 
          key={i} 
          className={`level-badge ${i < formation.levelBadges ? 'active' : ''}`}
        ></span>
      )
    }

    return (
      <div 
        className="formation-card fade-in visible" 
        data-category={formation.category}
      >
        <div className="formation-image">
          <i className={formation.icon.includes('fab') ? `fab ${formation.icon.split(' ')[1]}` : `fas ${formation.icon}`}></i>
          {formation.badge && <div className="formation-badge">{formation.badge}</div>}
        </div>
        <div className="formation-content">
          <span className="formation-category">{formation.category.toUpperCase()}</span>
          <h3 className="formation-title">{formation.title}</h3>
          <p className="formation-description">{formation.description}</p>
          <div className="formation-details">
            <div className="formation-detail">
              <i className="fas fa-clock"></i>
              <span>{formation.duration}</span>
            </div>
            <div className="formation-detail">
              <i className="fas fa-users"></i>
              <span>{formation.maxParticipants}</span>
            </div>
            <div className="formation-detail">
              <i className="fas fa-calendar"></i>
              <span>
                {formation.prochaineSession 
                  ? new Date(formation.prochaineSession).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })
                  : 'Session à venir'}
              </span>
            </div>
          </div>
          {formation.formateur && formation.formateur.nom && (
            <div className="formation-formateur" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '10px',
              marginBottom: '1rem',
              marginTop: '1rem',
              borderLeft: '3px solid #0066CC'
            }}>
              {formation.formateur.photo_url ? (
                <>
                  <img 
                    src={formation.formateur.photo_url} 
                    alt={`${formation.formateur.prenom || ''} ${formation.formateur.nom || ''}`}
                    style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #0066CC',
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const fallback = e.target.nextElementSibling
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div style={{
                    display: 'none',
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    flexShrink: 0
                  }}>
                    {(formation.formateur.prenom?.[0] || '').toUpperCase()}{(formation.formateur.nom?.[0] || '').toUpperCase()}
                  </div>
                </>
              ) : (
                <div style={{
                  display: 'flex',
                  width: '45px',
                  height: '45px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  flexShrink: 0
                }}>
                  {(formation.formateur.prenom?.[0] || '').toUpperCase()}{(formation.formateur.nom?.[0] || '').toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.2rem' }}>Formateur</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#2d2d2d' }}>
                  {formation.formateur.prenom || ''} {formation.formateur.nom || ''}
                </div>
              </div>
            </div>
          )}
          <div className="formation-footer">
            <div className="formation-level">
              {badges}
              <span style={{marginLeft: '0.5rem', fontSize: '0.85rem', color: '#666'}}>{formation.level}</span>
            </div>
            <Link 
              to={`/formation/inscription/${formation.slug || formation.id}`}
              className="formation-btn"
              state={{ formationId: formation.id, formationSlug: formation.slug }}
            >
              S'inscrire
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <FormationStyles />
      <section className="formations-section">
      <div className="container">
        <div className="formations-header fade-in">
          <h1><i className="fas fa-graduation-cap"></i> Nos Formations</h1>
          <div className="subtitle">RENFORCEZ VOS COMPÉTENCES EN GÉOMATIQUE</div>
          <p>Découvrez notre programme de formations pratiques conçues pour vous accompagner dans votre parcours géomatique. Des formations adaptées à tous les niveaux, de l'initiation à l'expertise avancée.</p>
        </div>

        <div className="stats-banner fade-in">
          <h2>Nos Formations en Chiffres</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{formations.length}+</div>
              <div className="stat-label">Formations disponibles</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">Participants formés</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Satisfaction</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Support disponible</div>
            </div>
          </div>
        </div>

        <div className="filter-tabs fade-in">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Clic sur "Toutes", changement du filtre vers "all"')
              setActiveFilter('all')
            }}
            type="button"
            aria-pressed={activeFilter === 'all'}
          >
            Toutes
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'sig' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              setActiveFilter('sig')
            }}
            type="button"
          >
            SIG
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'teledetection' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              setActiveFilter('teledetection')
            }}
            type="button"
          >
            Télédétection
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'programmation' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              setActiveFilter('programmation')
            }}
            type="button"
          >
            Programmation
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'cartographie' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              setActiveFilter('cartographie')
            }}
            type="button"
          >
            Cartographie
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                margin: '0 auto 1rem',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #0066CC',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <p style={{ fontSize: '1.2rem', color: '#666' }}>Chargement des formations...</p>
            </div>
          </div>
        )}

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
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 style={{ color: '#856404', marginBottom: '0.5rem' }}>Erreur de chargement</h3>
            <p style={{ color: '#856404' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                marginTop: '1rem',
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
          </div>
        )}

        {!loading && !error && filteredFormations.length > 0 && (
          <div 
            className="formations-grid" 
            key={`grid-${activeFilter}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem',
              opacity: 1,
              visibility: 'visible'
            }}
          >
            {filteredFormations.map(formation => (
              <FormationCard key={formation.id} formation={formation} />
            ))}
          </div>
        )}

        {!loading && !error && filteredFormations.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem',
            background: 'white',
            borderRadius: '15px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#999' }}>
              {activeFilter === 'all' ? '📚' : '📋'}
            </div>
            <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>
              {activeFilter === 'all' 
                ? 'Aucune formation disponible' 
                : 'Aucune formation dans cette catégorie'}
            </h3>
            <p style={{ color: '#999' }}>
              {activeFilter === 'all'
                ? 'Il n\'y a actuellement aucune formation active dans la base de données.'
                : `Aucune formation disponible dans la catégorie "${activeFilter}" pour le moment.`}
            </p>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  background: '#0066CC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Voir toutes les formations
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredFormations.length === 0 && activeFilter !== 'all' && (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '4rem',
            background: 'white',
            borderRadius: '15px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#999' }}>
              📋
            </div>
            <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>Aucune formation trouvée</h3>
            <p style={{ color: '#999' }}>
              Aucune formation disponible dans la catégorie "{activeFilter}".
            </p>
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#0066CC',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Voir toutes les formations
            </button>
          </div>
        )}

        <div className="cta-section fade-in visible" style={{
          marginTop: '4rem', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '3rem 2rem',
          borderRadius: '20px',
          boxShadow: '0 15px 40px rgba(102, 126, 234, 0.3)',
          color: 'white'
        }}>
          <h2 style={{ 
            fontSize: '2rem', 
            marginBottom: '1rem',
            color: 'white',
            fontWeight: '700'
          }}>
            Rejoignez l'ASGF
          </h2>
          <p style={{ 
            fontSize: '1.2rem', 
            marginBottom: '2rem',
            opacity: 0.95,
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto 2rem'
          }}>
            Devenez membre de l'Association des Sénégalais Géomaticiens en France et bénéficiez d'un accès privilégié à nos formations, événements et réseau professionnel.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              to="/adhesion" 
              style={{
                padding: '1rem 2.5rem',
                background: 'white',
                color: '#667eea',
                textDecoration: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 5px 20px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)'
                e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 5px 20px rgba(0,0,0,0.2)'
              }}
            >
              <span>👤</span> Devenir membre
            </Link>
            <Link 
              to="/formation" 
              style={{
                padding: '1rem 2.5rem',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1.1rem',
                border: '2px solid white',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'white'
                e.target.style.color = '#667eea'
                e.target.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)'
                e.target.style.color = 'white'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              <span>📚</span> Voir toutes les formations
            </Link>
          </div>
        </div>
      </div>
    </section>
    </>
  )
}

export default Formation
