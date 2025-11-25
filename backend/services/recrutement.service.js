// backend/services/recrutement.service.js
import { supabaseRecrutement, supabaseAdhesion, supabaseMentorat } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

// ========== CANDIDATURES ==========

/**
 * Récupère toutes les candidatures avec pagination et filtres
 */
export async function getAllCandidatures({ page = 1, limit = 20, search = '', statut = '', type_contrat = '' }) {
  try {
    let query = supabaseRecrutement
      .from('candidatures')
      .select('*', { count: 'exact' })
      .order('date_candidature', { ascending: false })

    // Recherche par titre de poste ou entreprise
    if (search) {
      query = query.or(`titre_poste.ilike.%${search}%,entreprise.ilike.%${search}%`)
    }

    // Filtre par statut
    if (statut) {
      query = query.eq('statut', statut)
    }

    // Filtre par type de contrat
    if (type_contrat) {
      query = query.eq('type_contrat', type_contrat)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: candidatures, error, count } = await query

    if (error) {
      logError('getAllCandidatures error', { error, details: error.message, code: error.code, hint: error.hint })
      throw new Error(`Erreur lors de la récupération des candidatures: ${error.message || 'Erreur inconnue'}`)
    }

    logInfo('getAllCandidatures: Candidatures récupérées', { count: candidatures?.length || 0, total: count || 0 })

    if (!candidatures || candidatures.length === 0) {
      return {
        candidatures: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir les candidatures avec les données des membres et le nombre de suivis
    const candidaturesWithStats = await Promise.all(
      candidatures.map(async (candidature) => {
        try {
          // Récupérer le membre
          let membre = null
          if (candidature.membre_id) {
            try {
              const { data: membreData, error: membreError } = await supabaseAdhesion
                .from('members')
                .select('id, prenom, nom, email, telephone, numero_membre')
                .eq('id', candidature.membre_id)
                .maybeSingle()
              
              if (membreError) {
                logError('getAllCandidatures: Erreur récupération membre', { candidatureId: candidature.id, membreId: candidature.membre_id, error: membreError })
              } else {
                membre = membreData
              }
            } catch (err) {
              logError('getAllCandidatures: Exception récupération membre', { candidatureId: candidature.id, error: err })
            }
          }

          // Récupérer le nombre de suivis
          let suivisCount = 0
          try {
            const { count, error: suivisError } = await supabaseRecrutement
              .from('suivi_candidatures')
              .select('*', { count: 'exact', head: true })
              .eq('candidature_id', candidature.id)
            
            if (suivisError) {
              logError('getAllCandidatures: Erreur récupération suivis', { candidatureId: candidature.id, error: suivisError })
            } else {
              suivisCount = count || 0
            }
          } catch (err) {
            logError('getAllCandidatures: Exception récupération suivis', { candidatureId: candidature.id, error: err })
          }

          return {
            ...candidature,
            membre: membre,
            suivis_count: suivisCount,
          }
        } catch (err) {
          logError('getAllCandidatures: Erreur enrichissement candidature', { candidatureId: candidature.id, error: err })
          // Retourner la candidature sans enrichissement en cas d'erreur
          return {
            ...candidature,
            membre: null,
            suivis_count: 0,
          }
        }
      })
    )

    return {
      candidatures: candidaturesWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllCandidatures exception', err)
    throw err
  }
}

/**
 * Récupère une candidature par son ID avec tous ses suivis
 */
export async function getCandidatureById(candidatureId) {
  try {
    const { data: candidature, error } = await supabaseRecrutement
      .from('candidatures')
      .select('*')
      .eq('id', candidatureId)
      .maybeSingle()

    if (error) {
      logError('getCandidatureById error', error)
      throw new Error('Erreur lors de la récupération de la candidature')
    }

    if (!candidature) {
      return null
    }

    // Récupérer le membre
    let membre = null
    if (candidature.membre_id) {
      const { data: membreData } = await supabaseAdhesion
        .from('members')
        .select('id, prenom, nom, email, telephone, numero_membre')
        .eq('id', candidature.membre_id)
        .maybeSingle()
      membre = membreData
    }

    // Récupérer les suivis
    const { data: suivis } = await supabaseRecrutement
      .from('suivi_candidatures')
      .select('*')
      .eq('candidature_id', candidatureId)
      .order('date_event', { ascending: false })

    return {
      ...candidature,
      membre: membre,
      suivis: suivis || [],
    }
  } catch (err) {
    logError('getCandidatureById exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle candidature
 */
export async function createCandidature(candidatureData) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('candidatures')
      .insert({
        membre_id: candidatureData.membre_id,
        titre_poste: candidatureData.titre_poste,
        entreprise: candidatureData.entreprise,
        type_contrat: candidatureData.type_contrat,
        statut: candidatureData.statut || 'envoye',
        cv_url: candidatureData.cv_url || null,
        lm_url: candidatureData.lm_url || null,
        portfolio_url: candidatureData.portfolio_url || null,
        date_candidature: candidatureData.date_candidature || new Date().toISOString().split('T')[0],
        commentaire_mentor: candidatureData.commentaire_mentor || null,
      })
      .select()
      .single()

    if (error) {
      logError('createCandidature error', error)
      throw new Error('Erreur lors de la création de la candidature')
    }

    logInfo('Candidature créée', { id: data.id })
    return data
  } catch (err) {
    logError('createCandidature exception', err)
    throw err
  }
}

/**
 * Met à jour une candidature
 */
export async function updateCandidature(candidatureId, updates) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('candidatures')
      .update(updates)
      .eq('id', candidatureId)
      .select()
      .single()

    if (error) {
      logError('updateCandidature error', error)
      throw new Error('Erreur lors de la mise à jour de la candidature')
    }

    logInfo('Candidature mise à jour', { id: candidatureId })
    return data
  } catch (err) {
    logError('updateCandidature exception', err)
    throw err
  }
}

// ========== SUIVI CANDIDATURES ==========

/**
 * Récupère tous les suivis d'une candidature
 */
export async function getSuivisByCandidature(candidatureId) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('suivi_candidatures')
      .select('*')
      .eq('candidature_id', candidatureId)
      .order('date_event', { ascending: false })

    if (error) {
      logError('getSuivisByCandidature error', error)
      throw new Error('Erreur lors de la récupération des suivis')
    }

    return data || []
  } catch (err) {
    logError('getSuivisByCandidature exception', err)
    throw err
  }
}

/**
 * Crée un nouveau suivi pour une candidature
 */
export async function createSuiviCandidature(suiviData) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('suivi_candidatures')
      .insert({
        candidature_id: suiviData.candidature_id,
        date_event: suiviData.date_event,
        type_event: suiviData.type_event,
        notes: suiviData.notes || null,
      })
      .select()
      .single()

    if (error) {
      logError('createSuiviCandidature error', error)
      throw new Error('Erreur lors de la création du suivi')
    }

    logInfo('Suivi créé', { id: data.id })
    return data
  } catch (err) {
    logError('createSuiviCandidature exception', err)
    throw err
  }
}

/**
 * Met à jour un suivi
 */
export async function updateSuiviCandidature(suiviId, updates) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('suivi_candidatures')
      .update(updates)
      .eq('id', suiviId)
      .select()
      .single()

    if (error) {
      logError('updateSuiviCandidature error', error)
      throw new Error('Erreur lors de la mise à jour du suivi')
    }

    logInfo('Suivi mis à jour', { id: suiviId })
    return data
  } catch (err) {
    logError('updateSuiviCandidature exception', err)
    throw err
  }
}

/**
 * Supprime un suivi
 */
export async function deleteSuiviCandidature(suiviId) {
  try {
    const { error } = await supabaseRecrutement
      .from('suivi_candidatures')
      .delete()
      .eq('id', suiviId)

    if (error) {
      logError('deleteSuiviCandidature error', error)
      throw new Error('Erreur lors de la suppression du suivi')
    }

    logInfo('Suivi supprimé', { id: suiviId })
    return true
  } catch (err) {
    logError('deleteSuiviCandidature exception', err)
    throw err
  }
}

// ========== RECOMMANDATIONS ==========

/**
 * Récupère toutes les recommandations avec pagination
 */
export async function getAllRecommandations({ page = 1, limit = 20 }) {
  try {
    let query = supabaseRecrutement
      .from('recommandations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: recommandations, error, count } = await query

    if (error) {
      logError('getAllRecommandations error', error)
      throw new Error('Erreur lors de la récupération des recommandations')
    }

    if (!recommandations || recommandations.length === 0) {
      return {
        recommandations: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir les recommandations avec les données des mentors et mentorés
    const enrichedRecommandations = await Promise.all(
      recommandations.map(async (reco) => {
        // Récupérer le mentor
        const { data: mentor } = await supabaseMentorat
          .from('mentors')
          .select('*')
          .eq('id', reco.mentor_id)
          .maybeSingle()

        // Récupérer le mentoré
        const { data: mentee } = await supabaseMentorat
          .from('mentees')
          .select('*')
          .eq('id', reco.mentee_id)
          .maybeSingle()

        // Récupérer les membres
        let mentorMembre = null
        let menteeMembre = null

        if (mentor?.membre_id) {
          const { data: membre } = await supabaseAdhesion
            .from('members')
            .select('id, prenom, nom, email, numero_membre')
            .eq('id', mentor.membre_id)
            .maybeSingle()
          mentorMembre = membre
        }

        if (mentee?.membre_id) {
          const { data: membre } = await supabaseAdhesion
            .from('members')
            .select('id, prenom, nom, email, numero_membre')
            .eq('id', mentee.membre_id)
            .maybeSingle()
          menteeMembre = membre
        }

        return {
          ...reco,
          mentor: mentor ? { ...mentor, membre: mentorMembre } : null,
          mentee: mentee ? { ...mentee, membre: menteeMembre } : null,
        }
      })
    )

    return {
      recommandations: enrichedRecommandations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllRecommandations exception', err)
    throw err
  }
}

/**
 * Récupère une recommandation par son ID
 */
export async function getRecommandationById(recommandationId) {
  try {
    const { data: recommandation, error } = await supabaseRecrutement
      .from('recommandations')
      .select('*')
      .eq('id', recommandationId)
      .maybeSingle()

    if (error) {
      logError('getRecommandationById error', error)
      throw new Error('Erreur lors de la récupération de la recommandation')
    }

    if (!recommandation) {
      return null
    }

    // Récupérer le mentor
    const { data: mentor } = await supabaseMentorat
      .from('mentors')
      .select('*')
      .eq('id', recommandation.mentor_id)
      .maybeSingle()

    // Récupérer le mentoré
    const { data: mentee } = await supabaseMentorat
      .from('mentees')
      .select('*')
      .eq('id', recommandation.mentee_id)
      .maybeSingle()

    // Récupérer les membres
    let mentorMembre = null
    let menteeMembre = null

    if (mentor?.membre_id) {
      const { data: membre } = await supabaseAdhesion
        .from('members')
        .select('*')
        .eq('id', mentor.membre_id)
        .maybeSingle()
      mentorMembre = membre
    }

    if (mentee?.membre_id) {
      const { data: membre } = await supabaseAdhesion
        .from('members')
        .select('*')
        .eq('id', mentee.membre_id)
        .maybeSingle()
      menteeMembre = membre
    }

    return {
      ...recommandation,
      mentor: mentor ? { ...mentor, membre: mentorMembre } : null,
      mentee: mentee ? { ...mentee, membre: menteeMembre } : null,
    }
  } catch (err) {
    logError('getRecommandationById exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle recommandation
 */
export async function createRecommandation(recommandationData) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('recommandations')
      .insert({
        mentor_id: recommandationData.mentor_id,
        mentee_id: recommandationData.mentee_id,
        texte: recommandationData.texte,
        lien_pdf: recommandationData.lien_pdf || null,
      })
      .select()
      .single()

    if (error) {
      logError('createRecommandation error', error)
      throw new Error('Erreur lors de la création de la recommandation')
    }

    logInfo('Recommandation créée', { id: data.id })
    return data
  } catch (err) {
    logError('createRecommandation exception', err)
    throw err
  }
}

/**
 * Met à jour une recommandation
 */
export async function updateRecommandation(recommandationId, updates) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('recommandations')
      .update(updates)
      .eq('id', recommandationId)
      .select()
      .single()

    if (error) {
      logError('updateRecommandation error', error)
      throw new Error('Erreur lors de la mise à jour de la recommandation')
    }

    logInfo('Recommandation mise à jour', { id: recommandationId })
    return data
  } catch (err) {
    logError('updateRecommandation exception', err)
    throw err
  }
}

/**
 * Supprime une recommandation
 */
export async function deleteRecommandation(recommandationId) {
  try {
    const { error } = await supabaseRecrutement
      .from('recommandations')
      .delete()
      .eq('id', recommandationId)

    if (error) {
      logError('deleteRecommandation error', error)
      throw new Error('Erreur lors de la suppression de la recommandation')
    }

    logInfo('Recommandation supprimée', { id: recommandationId })
    return true
  } catch (err) {
    logError('deleteRecommandation exception', err)
    throw err
  }
}

// ========== STATISTIQUES ==========

/**
 * Récupère les statistiques du module recrutement
 */
export async function getRecrutementStats() {
  try {
    // Nombre total de candidatures
    const { count: totalCandidatures } = await supabaseRecrutement
      .from('candidatures')
      .select('*', { count: 'exact', head: true })

    // Candidatures par statut
    const { data: candidaturesData } = await supabaseRecrutement
      .from('candidatures')
      .select('statut')

    const candidaturesParStatut = {}
    ;(candidaturesData || []).forEach((c) => {
      candidaturesParStatut[c.statut] = (candidaturesParStatut[c.statut] || 0) + 1
    })

    // Candidatures par type de contrat
    const { data: contratsData } = await supabaseRecrutement
      .from('candidatures')
      .select('type_contrat')

    const candidaturesParContrat = {}
    ;(contratsData || []).forEach((c) => {
      candidaturesParContrat[c.type_contrat] = (candidaturesParContrat[c.type_contrat] || 0) + 1
    })

    // Nombre total de suivis
    const { count: totalSuivis } = await supabaseRecrutement
      .from('suivi_candidatures')
      .select('*', { count: 'exact', head: true })

    // Nombre total de recommandations
    const { count: totalRecommandations } = await supabaseRecrutement
      .from('recommandations')
      .select('*', { count: 'exact', head: true })

    // Répartition des types d'événements de suivi
    const { data: suivisData } = await supabaseRecrutement
      .from('suivi_candidatures')
      .select('type_event')

    const suivisParType = {}
    ;(suivisData || []).forEach((s) => {
      suivisParType[s.type_event] = (suivisParType[s.type_event] || 0) + 1
    })

    return {
      total_candidatures: totalCandidatures || 0,
      candidatures_par_statut: candidaturesParStatut,
      candidatures_par_contrat: candidaturesParContrat,
      total_suivis: totalSuivis || 0,
      total_recommandations: totalRecommandations || 0,
      suivis_par_type: suivisParType,
    }
  } catch (err) {
    logError('getRecrutementStats exception', err)
    throw err
  }
}
