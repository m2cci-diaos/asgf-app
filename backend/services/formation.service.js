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

    // Total sessions
    const { count: totalSessions } = await supabaseFormation
      .from('sessions')
      .select('*', { count: 'exact', head: true })

    // Sessions à venir
    const today = new Date().toISOString().split('T')[0]
    const { count: upcomingSessions } = await supabaseFormation
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('date_debut', today)

    // Répartition par mode
    const { data: formationsByMode } = await supabaseFormation
      .from('formations')
      .select('mode')
      .eq('is_active', true)

    const modeStats = {}
    formationsByMode?.forEach((f) => {
      const mode = f.mode || 'Non spécifié'
      modeStats[mode] = (modeStats[mode] || 0) + 1
    })

    return {
      total_formations: totalFormations || 0,
      total_inscriptions: totalInscriptions || 0,
      confirmed_inscriptions: confirmedInscriptions || 0,
      pending_inscriptions: pendingInscriptions || 0,
      rejected_inscriptions: (totalInscriptions || 0) - (confirmedInscriptions || 0) - (pendingInscriptions || 0),
      total_sessions: totalSessions || 0,
      upcoming_sessions: upcomingSessions || 0,
      categories: categoryStats,
      modes: modeStats,
    }
  } catch (err) {
    logError('getFormationStats exception', err)
    throw err
  }
}

/**
 * Récupère toutes les sessions avec pagination
 */
export async function getAllSessions({ page = 1, limit = 20, formation_id = '', statut = '' }) {
  try {
    let query = supabaseFormation
      .from('sessions')
      .select('*', { count: 'exact' })
      .order('date_debut', { ascending: true })

    if (formation_id) {
      query = query.eq('formation_id', formation_id)
    }

    if (statut) {
      query = query.eq('statut', statut)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('getAllSessions error', error)
      throw new Error('Erreur lors de la récupération des sessions')
    }

    // Enrichir avec les données de formation et le nombre d'inscriptions
    const sessionsEnriched = await Promise.all(
      (data || []).map(async (session) => {
        // Récupérer la formation
        const { data: formation } = await supabaseFormation
          .from('formations')
          .select('titre, slug, participants_max')
          .eq('id', session.formation_id)
          .maybeSingle()

        // Compter les inscriptions confirmées pour cette session
        const { count: inscriptionsCount } = await supabaseFormation
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('status', 'confirmed')

        return {
          ...session,
          formation: formation || null,
          inscriptions_count: inscriptionsCount || 0,
          places_restantes: session.capacite_max ? session.capacite_max - (inscriptionsCount || 0) : null,
          taux_occupation: session.capacite_max && session.capacite_max > 0
            ? Math.round(((inscriptionsCount || 0) / session.capacite_max) * 100)
            : null,
        }
      })
    )

    return {
      sessions: sessionsEnriched,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllSessions exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle session
 */
export async function createSession(sessionData) {
  try {
    const { formation_id, date_debut, date_fin, capacite_max, statut } = sessionData

    if (!formation_id || !date_debut) {
      throw new Error('formation_id et date_debut sont requis')
    }

    const { data: session, error } = await supabaseFormation
      .from('sessions')
      .insert({
        formation_id,
        date_debut,
        date_fin: date_fin || null,
        capacite_max: capacite_max ? parseInt(capacite_max) : null,
        statut: statut || 'ouverte',
      })
      .select()
      .single()

    if (error) {
      logError('createSession error', error)
      throw new Error('Erreur lors de la création de la session')
    }

    logInfo('Session créée', { id: session.id, formation_id })
    return session
  } catch (err) {
    logError('createSession exception', err)
    throw err
  }
}

/**
 * Met à jour une session
 */
export async function updateSession(sessionId, updateData) {
  try {
    const updateObj = {}
    if (updateData.date_debut !== undefined) updateObj.date_debut = updateData.date_debut
    if (updateData.date_fin !== undefined) updateObj.date_fin = updateData.date_fin
    if (updateData.capacite_max !== undefined) updateObj.capacite_max = updateData.capacite_max ? parseInt(updateData.capacite_max) : null
    if (updateData.statut !== undefined) updateObj.statut = updateData.statut

    const { data, error } = await supabaseFormation
      .from('sessions')
      .update(updateObj)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      logError('updateSession error', error)
      throw new Error('Erreur lors de la mise à jour de la session')
    }

    if (!data) {
      throw new Error('Session introuvable')
    }

    logInfo('Session mise à jour', { id: sessionId })
    return data
  } catch (err) {
    logError('updateSession exception', err)
    throw err
  }
}

/**
 * Supprime une session
 */
export async function deleteSession(sessionId) {
  try {
    const { error } = await supabaseFormation
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      logError('deleteSession error', error)
      throw new Error('Erreur lors de la suppression de la session')
    }

    logInfo('Session supprimée', { id: sessionId })
    return { success: true, message: 'Session supprimée avec succès' }
  } catch (err) {
    logError('deleteSession exception', err)
    throw err
  }
}

/**
 * Récupère toutes les inscriptions avec pagination
 */
export async function getAllInscriptions({ page = 1, limit = 20, formation_id = '', session_id = '', status = '' }) {
  try {
    let query = supabaseFormation
      .from('inscriptions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (formation_id) {
      query = query.eq('formation_id', formation_id)
    }

    if (session_id) {
      query = query.eq('session_id', session_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('getAllInscriptions error', error)
      throw new Error('Erreur lors de la récupération des inscriptions')
    }

    // Enrichir avec les données de formation et session
    const inscriptionsEnriched = await Promise.all(
      (data || []).map(async (inscription) => {
        const [formation, session] = await Promise.all([
          supabaseFormation
            .from('formations')
            .select('titre, slug')
            .eq('id', inscription.formation_id)
            .maybeSingle(),
          inscription.session_id
            ? supabaseFormation
                .from('sessions')
                .select('date_debut, date_fin')
                .eq('id', inscription.session_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ])

        return {
          ...inscription,
          formation: formation?.data || null,
          session: session?.data || null,
        }
      })
    )

    return {
      inscriptions: inscriptionsEnriched,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllInscriptions exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle inscription
 */
export async function createInscription(inscriptionData) {
  try {
    const {
      prenom,
      nom,
      email,
      formation_id,
      session_id,
      niveau,
      niveau_etude,
      adresse,
      ville,
      pays,
      whatsapp,
      membre_id,
      paiement_status,
      source,
      notes_admin,
    } = inscriptionData

    if (!prenom || !nom || !email || !formation_id || !niveau) {
      throw new Error('prenom, nom, email, formation_id et niveau sont requis')
    }

    const { data: inscription, error } = await supabaseFormation
      .from('inscriptions')
      .insert({
        prenom,
        nom,
        email,
        formation_id,
        session_id: session_id || null,
        niveau,
        niveau_etude: niveau_etude || null,
        adresse: adresse || null,
        ville: ville || null,
        pays: pays || 'France',
        whatsapp: whatsapp || null,
        membre_id: membre_id || null,
        paiement_status: paiement_status || 'non payé',
        source: source || 'site web',
        notes_admin: notes_admin || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      logError('createInscription error', error)

      // Contrainte d'unicité sur (formation_id, email)
      const message = error.message || ''
      if (
        error.code === '23505' ||
        message.includes('inscriptions_formation_email_unique') ||
        message.toLowerCase().includes('duplicate key value')
      ) {
        throw new Error(
          "Cet email est déjà inscrit à cette formation. Utilisez une autre adresse ou contactez l'ASGF."
        )
      }

      throw new Error(message || "Erreur lors de la création de l'inscription")
    }

    logInfo('Inscription créée', { id: inscription.id, email })
    return inscription
  } catch (err) {
    logError('createInscription exception', err)
    throw err
  }
}

/**
 * Met à jour une inscription
 */
export async function updateInscription(inscriptionId, updateData) {
  try {
    const updateObj = {}
    if (updateData.prenom !== undefined) updateObj.prenom = updateData.prenom
    if (updateData.nom !== undefined) updateObj.nom = updateData.nom
    if (updateData.email !== undefined) updateObj.email = updateData.email
    if (updateData.session_id !== undefined) updateObj.session_id = updateData.session_id || null
    if (updateData.niveau !== undefined) updateObj.niveau = updateData.niveau
    if (updateData.niveau_etude !== undefined) updateObj.niveau_etude = updateData.niveau_etude
    if (updateData.status !== undefined) updateObj.status = updateData.status
    if (updateData.paiement_status !== undefined) updateObj.paiement_status = updateData.paiement_status
    if (updateData.notes_admin !== undefined) updateObj.notes_admin = updateData.notes_admin
    if (updateData.status === 'confirmed' && !updateData.confirmed_at) {
      updateObj.confirmed_at = new Date().toISOString()
    }

    const { data, error } = await supabaseFormation
      .from('inscriptions')
      .update(updateObj)
      .eq('id', inscriptionId)
      .select()
      .single()

    if (error) {
      logError('updateInscription error', error)
      throw new Error('Erreur lors de la mise à jour de l\'inscription')
    }

    if (!data) {
      throw new Error('Inscription introuvable')
    }

    logInfo('Inscription mise à jour', { id: inscriptionId })
    return data
  } catch (err) {
    logError('updateInscription exception', err)
    throw err
  }
}

/**
 * Supprime une inscription
 */
export async function deleteInscription(inscriptionId) {
  try {
    const { error } = await supabaseFormation
      .from('inscriptions')
      .delete()
      .eq('id', inscriptionId)

    if (error) {
      logError('deleteInscription error', error)
      throw new Error('Erreur lors de la suppression de l\'inscription')
    }

    logInfo('Inscription supprimée', { id: inscriptionId })
    return { success: true, message: 'Inscription supprimée avec succès' }
  } catch (err) {
    logError('deleteInscription exception', err)
    throw err
  }
}

/**
 * Récupère tous les formateurs
 */
export async function getAllFormateurs() {
  try {
    const { data, error } = await supabaseFormation
      .from('formateurs')
      .select('*')
      .order('nom', { ascending: true })

    if (error) {
      logError('getAllFormateurs error', error)
      throw new Error('Erreur lors de la récupération des formateurs')
    }

    return data || []
  } catch (err) {
    logError('getAllFormateurs exception', err)
    throw err
  }
}

/**
 * Crée un nouveau formateur
 */
export async function createFormateur(formateurData) {
  try {
    const { nom, prenom, email, photo_url, bio } = formateurData

    if (!nom || !prenom || !email) {
      throw new Error('nom, prenom et email sont requis')
    }

    // Vérifier si l'email existe déjà
    const { data: existing } = await supabaseFormation
      .from('formateurs')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      throw new Error('Un formateur avec cet email existe déjà')
    }

    const { data: formateur, error } = await supabaseFormation
      .from('formateurs')
      .insert({
        nom,
        prenom,
        email,
        photo_url: photo_url || null,
        bio: bio || null,
      })
      .select()
      .single()

    if (error) {
      logError('createFormateur error', error)
      throw new Error('Erreur lors de la création du formateur')
    }

    logInfo('Formateur créé', { id: formateur.id, email })
    return formateur
  } catch (err) {
    logError('createFormateur exception', err)
    throw err
  }
}

/**
 * Met à jour un formateur
 */
export async function updateFormateur(formateurId, updateData) {
  try {
    const updateObj = {}
    if (updateData.nom !== undefined) updateObj.nom = updateData.nom
    if (updateData.prenom !== undefined) updateObj.prenom = updateData.prenom
    if (updateData.email !== undefined) updateObj.email = updateData.email
    if (updateData.photo_url !== undefined) updateObj.photo_url = updateData.photo_url
    if (updateData.bio !== undefined) updateObj.bio = updateData.bio

    // Vérifier l'email si modifié
    if (updateData.email) {
      const { data: existing } = await supabaseFormation
        .from('formateurs')
        .select('id')
        .eq('email', updateData.email)
        .neq('id', formateurId)
        .maybeSingle()

      if (existing) {
        throw new Error('Cet email est déjà utilisé par un autre formateur')
      }
    }

    const { data, error } = await supabaseFormation
      .from('formateurs')
      .update(updateObj)
      .eq('id', formateurId)
      .select()
      .single()

    if (error) {
      logError('updateFormateur error', error)
      throw new Error('Erreur lors de la mise à jour du formateur')
    }

    if (!data) {
      throw new Error('Formateur introuvable')
    }

    logInfo('Formateur mis à jour', { id: formateurId })
    return data
  } catch (err) {
    logError('updateFormateur exception', err)
    throw err
  }
}

/**
 * Supprime un formateur
 */
export async function deleteFormateur(formateurId) {
  try {
    const { error } = await supabaseFormation
      .from('formateurs')
      .delete()
      .eq('id', formateurId)

    if (error) {
      logError('deleteFormateur error', error)
      throw new Error('Erreur lors de la suppression du formateur')
    }

    logInfo('Formateur supprimé', { id: formateurId })
    return { success: true, message: 'Formateur supprimé avec succès' }
  } catch (err) {
    logError('deleteFormateur exception', err)
    throw err
  }
}
