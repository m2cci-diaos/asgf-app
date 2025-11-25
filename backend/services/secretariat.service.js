// backend/services/secretariat.service.js
import { supabaseSecretariat, supabaseAdhesion } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

// ========== RÉUNIONS ==========

/**
 * Récupère toutes les réunions avec pagination et filtres
 */
export async function getAllReunions({ page = 1, limit = 20, search = '', type_reunion = '', pole = '' }) {
  try {
    logInfo('getAllReunions: Requête initiale', { page, limit, search, type_reunion, pole })
    let query = supabaseSecretariat
      .from('reunions')
      .select('*', { count: 'exact' })
      .order('date_reunion', { ascending: false })

    if (type_reunion) {
      query = query.eq('type_reunion', type_reunion)
    }

    if (pole) {
      query = query.eq('pole', pole)
    }

    if (search) {
      query = query.or(`titre.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: reunions, error, count } = await query

    if (error) {
      logError('getAllReunions error', error)
      throw new Error('Erreur lors de la récupération des réunions')
    }

    logInfo('getAllReunions: Réunions récupérées', { count: reunions?.length || 0, total: count || 0 })

    return {
      reunions: reunions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllReunions exception', err)
    throw err
  }
}

/**
 * Récupère une réunion par son ID
 */
export async function getReunionById(reunionId) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('reunions')
      .select('*')
      .eq('id', reunionId)
      .maybeSingle()

    if (error) {
      logError('getReunionById error', error)
      throw new Error('Erreur lors de la récupération de la réunion')
    }

    return data
  } catch (err) {
    logError('getReunionById exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle réunion
 */
export async function createReunion(reunionData) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('reunions')
      .insert({
        type_reunion: reunionData.type_reunion,
        titre: reunionData.titre,
        description: reunionData.description || null,
        date_reunion: reunionData.date_reunion,
        heure_debut: reunionData.heure_debut,
        heure_fin: reunionData.heure_fin || null,
        pole: reunionData.pole || null,
        lien_visio: reunionData.lien_visio || null,
        ordre_du_jour: reunionData.ordre_du_jour || null,
      })
      .select()
      .single()

    if (error) {
      logError('createReunion error', error)
      throw new Error('Erreur lors de la création de la réunion')
    }

    logInfo('Réunion créée', { id: data.id })
    return data
  } catch (err) {
    logError('createReunion exception', err)
    throw err
  }
}

/**
 * Met à jour une réunion
 */
export async function updateReunion(reunionId, updates) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('reunions')
      .update(updates)
      .eq('id', reunionId)
      .select()
      .single()

    if (error) {
      logError('updateReunion error', error)
      throw new Error('Erreur lors de la mise à jour de la réunion')
    }

    logInfo('Réunion mise à jour', { id: reunionId })
    return data
  } catch (err) {
    logError('updateReunion exception', err)
    throw err
  }
}

// ========== PARTICIPANTS RÉUNION ==========

/**
 * Récupère tous les participants d'une réunion
 */
export async function getParticipantsByReunion(reunionId) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('participants_reunion')
      .select('*')
      .eq('reunion_id', reunionId)
      .order('created_at', { ascending: false })

    if (error) {
      logError('getParticipantsByReunion error', error)
      throw new Error('Erreur lors de la récupération des participants')
    }

    if (!data || data.length === 0) {
      return []
    }

    // Enrichir avec les données des membres
    const participantsWithMembers = await Promise.all(
      data.map(async (participant) => {
        let membre = null
        if (participant.membre_id) {
          try {
            const { data: membreData } = await supabaseAdhesion
              .from('members')
              .select('id, prenom, nom, email, numero_membre')
              .eq('id', participant.membre_id)
              .maybeSingle()
            membre = membreData
          } catch (err) {
            logError(`Error fetching member for participant ${participant.id}: ${err.message}`)
          }
        }
        return {
          ...participant,
          membre: membre,
        }
      })
    )

    return participantsWithMembers
  } catch (err) {
    logError('getParticipantsByReunion exception', err)
    throw err
  }
}

/**
 * Ajoute un participant à une réunion
 */
export async function addParticipant(participantData) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('participants_reunion')
      .insert({
        reunion_id: participantData.reunion_id,
        membre_id: participantData.membre_id || null,
        statut_invitation: participantData.statut_invitation || 'envoye',
        commentaire: participantData.commentaire || null,
      })
      .select()
      .single()

    if (error) {
      logError('addParticipant error', error)
      throw new Error('Erreur lors de l\'ajout du participant')
    }

    logInfo('Participant ajouté', { id: data.id })
    return data
  } catch (err) {
    logError('addParticipant exception', err)
    throw err
  }
}

/**
 * Met à jour le statut d'un participant
 */
export async function updateParticipant(participantId, updates) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('participants_reunion')
      .update(updates)
      .eq('id', participantId)
      .select()
      .single()

    if (error) {
      logError('updateParticipant error', error)
      throw new Error('Erreur lors de la mise à jour du participant')
    }

    logInfo('Participant mis à jour', { id: participantId })
    return data
  } catch (err) {
    logError('updateParticipant exception', err)
    throw err
  }
}

// ========== COMPTES RENDUS ==========

/**
 * Récupère le compte rendu d'une réunion
 */
export async function getCompteRenduByReunion(reunionId) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('comptes_rendus')
      .select('*')
      .eq('reunion_id', reunionId)
      .maybeSingle()

    if (error) {
      logError('getCompteRenduByReunion error', error)
      throw new Error('Erreur lors de la récupération du compte rendu')
    }

    return data
  } catch (err) {
    logError('getCompteRenduByReunion exception', err)
    throw err
  }
}

/**
 * Crée ou met à jour un compte rendu
 */
export async function saveCompteRendu(compteRenduData) {
  try {
    // Vérifier si un compte rendu existe déjà
    const { data: existing } = await supabaseSecretariat
      .from('comptes_rendus')
      .select('id')
      .eq('reunion_id', compteRenduData.reunion_id)
      .maybeSingle()

    let data, error
    if (existing) {
      // Mettre à jour
      const result = await supabaseSecretariat
        .from('comptes_rendus')
        .update({
          resume: compteRenduData.resume || null,
          decisions: compteRenduData.decisions || null,
          actions_assignées: compteRenduData.actions_assignées || null,
          participants_list: compteRenduData.participants_list || null,
          lien_pdf: compteRenduData.lien_pdf || null,
        })
        .eq('id', existing.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Créer
      const result = await supabaseSecretariat
        .from('comptes_rendus')
        .insert({
          reunion_id: compteRenduData.reunion_id,
          resume: compteRenduData.resume || null,
          decisions: compteRenduData.decisions || null,
          actions_assignées: compteRenduData.actions_assignées || null,
          participants_list: compteRenduData.participants_list || null,
          lien_pdf: compteRenduData.lien_pdf || null,
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      logError('saveCompteRendu error', error)
      throw new Error('Erreur lors de la sauvegarde du compte rendu')
    }

    logInfo('Compte rendu sauvegardé', { id: data.id })
    return data
  } catch (err) {
    logError('saveCompteRendu exception', err)
    throw err
  }
}

// ========== ACTIONS ==========

/**
 * Récupère toutes les actions d'une réunion
 */
export async function getActionsByReunion(reunionId) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('actions')
      .select('*')
      .eq('reunion_id', reunionId)
      .order('deadline', { ascending: true })

    if (error) {
      logError('getActionsByReunion error', error)
      throw new Error('Erreur lors de la récupération des actions')
    }

    if (!data || data.length === 0) {
      return []
    }

    // Enrichir avec les données des membres assignés
    const actionsWithMembers = await Promise.all(
      data.map(async (action) => {
        let membre = null
        if (action.assigne_a) {
          try {
            const { data: membreData } = await supabaseAdhesion
              .from('members')
              .select('id, prenom, nom, email, numero_membre')
              .eq('id', action.assigne_a)
              .maybeSingle()
            membre = membreData
          } catch (err) {
            logError(`Error fetching member for action ${action.id}: ${err.message}`)
          }
        }
        return {
          ...action,
          membre: membre,
        }
      })
    )

    return actionsWithMembers
  } catch (err) {
    logError('getActionsByReunion exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle action
 */
export async function createAction(actionData) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('actions')
      .insert({
        reunion_id: actionData.reunion_id || null,
        intitule: actionData.intitule,
        assigne_a: actionData.assigne_a || null,
        statut: actionData.statut || 'en cours',
        deadline: actionData.deadline || null,
      })
      .select()
      .single()

    if (error) {
      logError('createAction error', error)
      throw new Error('Erreur lors de la création de l\'action')
    }

    logInfo('Action créée', { id: data.id })
    return data
  } catch (err) {
    logError('createAction exception', err)
    throw err
  }
}

/**
 * Met à jour une action
 */
export async function updateAction(actionId, updates) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('actions')
      .update(updates)
      .eq('id', actionId)
      .select()
      .single()

    if (error) {
      logError('updateAction error', error)
      throw new Error('Erreur lors de la mise à jour de l\'action')
    }

    logInfo('Action mise à jour', { id: actionId })
    return data
  } catch (err) {
    logError('updateAction exception', err)
    throw err
  }
}

// ========== DOCUMENTS ==========

/**
 * Récupère tous les documents avec pagination et filtres
 */
export async function getAllDocuments({ page = 1, limit = 20, search = '', categorie = '' }) {
  try {
    logInfo('getAllDocuments: Requête initiale', { page, limit, search, categorie })
    let query = supabaseSecretariat
      .from('documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (categorie) {
      query = query.eq('categorie', categorie)
    }

    if (search) {
      query = query.or(`titre.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: documents, error, count } = await query

    if (error) {
      logError('getAllDocuments error', error)
      throw new Error('Erreur lors de la récupération des documents')
    }

    logInfo('getAllDocuments: Documents récupérés', { count: documents?.length || 0, total: count || 0 })

    return {
      documents: documents || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllDocuments exception', err)
    throw err
  }
}

/**
 * Crée un nouveau document
 */
export async function createDocument(documentData) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('documents')
      .insert({
        titre: documentData.titre,
        categorie: documentData.categorie,
        description: documentData.description || null,
        lien_pdf: documentData.lien_pdf,
        uploaded_by: documentData.uploaded_by || null,
      })
      .select()
      .single()

    if (error) {
      logError('createDocument error', error)
      throw new Error('Erreur lors de la création du document')
    }

    logInfo('Document créé', { id: data.id })
    return data
  } catch (err) {
    logError('createDocument exception', err)
    throw err
  }
}

/**
 * Met à jour un document
 */
export async function updateDocument(documentId, updates) {
  try {
    const { data, error } = await supabaseSecretariat
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      logError('updateDocument error', error)
      throw new Error('Erreur lors de la mise à jour du document')
    }

    logInfo('Document mis à jour', { id: documentId })
    return data
  } catch (err) {
    logError('updateDocument exception', err)
    throw err
  }
}

// ========== STATISTIQUES ==========

/**
 * Récupère les statistiques du module secrétariat
 */
export async function getSecretariatStats() {
  try {
    // Total réunions
    const { count: totalReunions } = await supabaseSecretariat
      .from('reunions')
      .select('*', { count: 'exact', head: true })

    // Réunions à venir (date >= aujourd'hui)
    const today = new Date().toISOString().split('T')[0]
    const { count: reunionsAVenir } = await supabaseSecretariat
      .from('reunions')
      .select('*', { count: 'exact', head: true })
      .gte('date_reunion', today)

    // Total participants
    const { count: totalParticipants } = await supabaseSecretariat
      .from('participants_reunion')
      .select('*', { count: 'exact', head: true })

    // Total actions
    const { count: totalActions } = await supabaseSecretariat
      .from('actions')
      .select('*', { count: 'exact', head: true })

    // Actions en cours
    const { count: actionsEnCours } = await supabaseSecretariat
      .from('actions')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'en cours')

    // Total documents
    const { count: totalDocuments } = await supabaseSecretariat
      .from('documents')
      .select('*', { count: 'exact', head: true })

    // Répartition par type de réunion
    const { data: reunionsByType } = await supabaseSecretariat
      .from('reunions')
      .select('type_reunion')

    const repartitionParType = {}
    ;(reunionsByType || []).forEach((r) => {
      repartitionParType[r.type_reunion] = (repartitionParType[r.type_reunion] || 0) + 1
    })

    return {
      total_reunions: totalReunions || 0,
      reunions_a_venir: reunionsAVenir || 0,
      total_participants: totalParticipants || 0,
      total_actions: totalActions || 0,
      actions_en_cours: actionsEnCours || 0,
      total_documents: totalDocuments || 0,
      repartition_par_type: repartitionParType,
    }
  } catch (err) {
    logError('getSecretariatStats exception', err)
    throw err
  }
}
