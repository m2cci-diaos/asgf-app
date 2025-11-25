// backend/services/formation.service.js
import { supabaseFormation } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

/**
 * Récupère toutes les formations avec pagination et filtres
 */
export async function getAllFormations({ page = 1, limit = 20, search = '', categorie = '', statut = '' }) {
  try {
    let query = supabaseFormation
      .from('formations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Recherche par titre ou slug
    if (search) {
      query = query.or(`titre.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    // Filtre par catégorie
    if (categorie) {
      query = query.eq('categorie', categorie)
    }

    // Filtre par statut (is_active)
    if (statut === 'active') {
      query = query.eq('is_active', true)
    } else if (statut === 'inactive') {
      query = query.eq('is_active', false)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('getAllFormations error', error)
      throw new Error('Erreur lors de la récupération des formations')
    }

    // Pour chaque formation, récupérer le nombre d'inscriptions
    const formationsWithStats = await Promise.all(
      (data || []).map(async (formation) => {
        const { count: inscriptionsCount } = await supabaseFormation
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('formation_id', formation.id)

        const { count: confirmedCount } = await supabaseFormation
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('formation_id', formation.id)
          .eq('status', 'confirmed')

        return {
          ...formation,
          inscriptions_count: inscriptionsCount || 0,
          confirmed_count: confirmedCount || 0,
          places_restantes: formation.participants_max - (confirmedCount || 0),
        }
      })
    )

    return {
      formations: formationsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllFormations exception', err)
    throw err
  }
}

/**
 * Récupère une formation par son ID avec ses sessions et statistiques
 */
export async function getFormationById(formationId) {
  try {
    // Récupérer la formation
    const { data: formation, error: formationError } = await supabaseFormation
      .from('formations')
      .select('*')
      .eq('id', formationId)
      .maybeSingle()

    if (formationError) {
      logError('getFormationById error', formationError)
      throw new Error('Erreur lors de la récupération de la formation')
    }

    if (!formation) {
      return null
    }

    // Récupérer les sessions
    const { data: sessions, error: sessionsError } = await supabaseFormation
      .from('sessions')
      .select('*')
      .eq('formation_id', formationId)
      .order('date_debut', { ascending: true })

    if (sessionsError) {
      logError('getFormationById sessions error', sessionsError)
    }

    // Statistiques des inscriptions
    const { count: totalInscriptions } = await supabaseFormation
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('formation_id', formationId)

    const { count: confirmedInscriptions } = await supabaseFormation
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('formation_id', formationId)
      .eq('status', 'confirmed')

    const { count: pendingInscriptions } = await supabaseFormation
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('formation_id', formationId)
      .eq('status', 'pending')

    return {
      ...formation,
      sessions: sessions || [],
      stats: {
        total_inscriptions: totalInscriptions || 0,
        confirmed: confirmedInscriptions || 0,
        pending: pendingInscriptions || 0,
        places_restantes: formation.participants_max - (confirmedInscriptions || 0),
        taux_occupation: formation.participants_max > 0 
          ? Math.round(((confirmedInscriptions || 0) / formation.participants_max) * 100) 
          : 0,
      },
    }
  } catch (err) {
    logError('getFormationById exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle formation
 */
export async function createFormation(formationData) {
  try {
    const {
      slug,
      titre,
      categorie,
      niveau,
      badge,
      resume,
      duree_heures,
      nb_sessions,
      participants_max,
      mode,
      prochaine_session,
      description_longue,
      image_url,
      prix,
      formateur_id,
    } = formationData

    // Vérifier si le slug existe déjà
    const { data: existing, error: checkError } = await supabaseFormation
      .from('formations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (checkError) {
      logError('createFormation check error', checkError)
      throw new Error('Erreur lors de la vérification')
    }

    if (existing) {
      throw new Error('Une formation avec ce slug existe déjà')
    }

    // Créer la formation
    const { data: formation, error: createError } = await supabaseFormation
      .from('formations')
      .insert({
        slug,
        titre,
        categorie,
        niveau,
        badge,
        resume,
        duree_heures: parseInt(duree_heures) || null,
        nb_sessions: parseInt(nb_sessions) || null,
        participants_max: parseInt(participants_max) || null,
        mode,
        prochaine_session,
        description_longue,
        image_url,
        prix: prix ? parseFloat(prix) : null,
        formateur_id,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      logError('createFormation error', createError)
      throw new Error('Erreur lors de la création de la formation')
    }

    logInfo('Formation créée', { id: formation.id, slug })
    return formation
  } catch (err) {
    logError('createFormation exception', err)
    throw err
  }
}

/**
 * Met à jour une formation
 */
export async function updateFormation(formationId, updateData) {
  try {
    // Vérifier que la formation existe
    const { data: existing, error: checkError } = await supabaseFormation
      .from('formations')
      .select('id')
      .eq('id', formationId)
      .maybeSingle()

    if (checkError) {
      logError('updateFormation check error', checkError)
      throw new Error('Erreur lors de la vérification')
    }

    if (!existing) {
      throw new Error('Formation introuvable')
    }

    // Vérifier le slug si modifié
    if (updateData.slug && updateData.slug !== existing.slug) {
      const { data: slugExists, error: slugError } = await supabaseFormation
        .from('formations')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', formationId)
        .maybeSingle()

      if (slugError) {
        logError('updateFormation slug check error', slugError)
        throw new Error('Erreur lors de la vérification du slug')
      }

      if (slugExists) {
        throw new Error('Ce slug est déjà utilisé par une autre formation')
      }
    }

    // Préparer les données de mise à jour
    const updateObj = {}
    if (updateData.titre !== undefined) updateObj.titre = updateData.titre
    if (updateData.slug !== undefined) updateObj.slug = updateData.slug
    if (updateData.categorie !== undefined) updateObj.categorie = updateData.categorie
    if (updateData.niveau !== undefined) updateObj.niveau = updateData.niveau
    if (updateData.badge !== undefined) updateObj.badge = updateData.badge
    if (updateData.resume !== undefined) updateObj.resume = updateData.resume
    if (updateData.duree_heures !== undefined) updateObj.duree_heures = parseInt(updateData.duree_heures) || null
    if (updateData.nb_sessions !== undefined) updateObj.nb_sessions = parseInt(updateData.nb_sessions) || null
    if (updateData.participants_max !== undefined) updateObj.participants_max = parseInt(updateData.participants_max) || null
    if (updateData.mode !== undefined) updateObj.mode = updateData.mode
    if (updateData.prochaine_session !== undefined) updateObj.prochaine_session = updateData.prochaine_session
    if (updateData.description_longue !== undefined) updateObj.description_longue = updateData.description_longue
    if (updateData.image_url !== undefined) updateObj.image_url = updateData.image_url
    if (updateData.prix !== undefined) updateObj.prix = updateData.prix ? parseFloat(updateData.prix) : null
    if (updateData.formateur_id !== undefined) updateObj.formateur_id = updateData.formateur_id
    if (updateData.is_active !== undefined) updateObj.is_active = updateData.is_active

    // Mettre à jour
    const { data: formation, error: updateError } = await supabaseFormation
      .from('formations')
      .update(updateObj)
      .eq('id', formationId)
      .select()
      .single()

    if (updateError) {
      logError('updateFormation error', updateError)
      throw new Error('Erreur lors de la mise à jour de la formation')
    }

    logInfo('Formation mise à jour', { id: formationId })
    return formation
  } catch (err) {
    logError('updateFormation exception', err)
    throw err
  }
}

/**
 * Désactive une formation (soft delete)
 */
export async function deactivateFormation(formationId) {
  try {
    const { data, error } = await supabaseFormation
      .from('formations')
      .update({ is_active: false })
      .eq('id', formationId)
      .select('id')
      .single()

    if (error) {
      logError('deactivateFormation error', error)
      throw new Error('Erreur lors de la désactivation de la formation')
    }

    if (!data) {
      throw new Error('Formation introuvable')
    }

    logInfo('Formation désactivée', { id: formationId })
    return { success: true, message: 'Formation désactivée avec succès' }
  } catch (err) {
    logError('deactivateFormation exception', err)
    throw err
  }
}

/**
 * Récupère les inscriptions d'une formation
 */
export async function getFormationInscriptions(formationId, { status = '', page = 1, limit = 50 }) {
  try {
    let query = supabaseFormation
      .from('inscriptions')
      .select('*', { count: 'exact' })
      .eq('formation_id', formationId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('getFormationInscriptions error', error)
      throw new Error('Erreur lors de la récupération des inscriptions')
    }

    return {
      inscriptions: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getFormationInscriptions exception', err)
    throw err
  }
}

/**
 * Valide une inscription (change le statut à 'confirmed')
 */
export async function confirmInscription(inscriptionId, adminId) {
  try {
    // Vérifier que l'inscription existe
    const { data: inscription, error: checkError } = await supabaseFormation
      .from('inscriptions')
      .select('formation_id, status')
      .eq('id', inscriptionId)
      .maybeSingle()

    if (checkError || !inscription) {
      throw new Error('Inscription introuvable')
    }

    // Vérifier la capacité de la formation
    const { data: formation } = await supabaseFormation
      .from('formations')
      .select('participants_max')
      .eq('id', inscription.formation_id)
      .maybeSingle()

    if (formation && formation.participants_max) {
      const { count: confirmedCount } = await supabaseFormation
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('formation_id', inscription.formation_id)
        .eq('status', 'confirmed')

      if ((confirmedCount || 0) >= formation.participants_max) {
        throw new Error('La formation a atteint sa capacité maximale')
      }
    }

    // Mettre à jour le statut
    const { data, error } = await supabaseFormation
      .from('inscriptions')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', inscriptionId)
      .select()
      .single()

    if (error) {
      logError('confirmInscription error', error)
      throw new Error('Erreur lors de la confirmation de l\'inscription')
    }

    logInfo('Inscription confirmée', { id: inscriptionId, adminId })
    return data
  } catch (err) {
    logError('confirmInscription exception', err)
    throw err
  }
}

/**
 * Refuse une inscription (change le statut à 'rejected')
 */
export async function rejectInscription(inscriptionId, adminId) {
  try {
    const { data, error } = await supabaseFormation
      .from('inscriptions')
      .update({ status: 'rejected' })
      .eq('id', inscriptionId)
      .select()
      .single()

    if (error) {
      logError('rejectInscription error', error)
      throw new Error('Erreur lors du rejet de l\'inscription')
    }

    if (!data) {
      throw new Error('Inscription introuvable')
    }

    logInfo('Inscription rejetée', { id: inscriptionId, adminId })
    return data
  } catch (err) {
    logError('rejectInscription exception', err)
    throw err
  }
}

/**
 * Récupère les statistiques globales des formations
 */
export async function getFormationStats() {
  try {
    // Total formations actives
    const { count: totalFormations } = await supabaseFormation
      .from('formations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Total inscriptions
    const { count: totalInscriptions } = await supabaseFormation
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })

    // Inscriptions confirmées
    const { count: confirmedInscriptions } = await supabaseFormation
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')

    // Inscriptions en attente
    const { count: pendingInscriptions } = await supabaseFormation
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Répartition par catégorie
    const { data: formationsByCategory } = await supabaseFormation
      .from('formations')
      .select('categorie')
      .eq('is_active', true)

    const categoryStats = {}
    formationsByCategory?.forEach((f) => {
      categoryStats[f.categorie] = (categoryStats[f.categorie] || 0) + 1
    })

    return {
      total_formations: totalFormations || 0,
      total_inscriptions: totalInscriptions || 0,
      confirmed_inscriptions: confirmedInscriptions || 0,
      pending_inscriptions: pendingInscriptions || 0,
      rejected_inscriptions: (totalInscriptions || 0) - (confirmedInscriptions || 0) - (pendingInscriptions || 0),
      categories: categoryStats,
    }
  } catch (err) {
    logError('getFormationStats exception', err)
    throw err
  }
}
