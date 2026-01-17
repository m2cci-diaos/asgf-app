// backend/services/secretariat.service.js
import { supabaseSecretariat, supabaseAdhesion } from '../config/supabase.js'
import { logError, logInfo, logWarning } from '../utils/logger.js'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
 * Récupère une réunion par son ID avec les participants et le présentateur
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

    if (!data) {
      return null
    }

    // Enrichir avec les données du présentateur si disponible
    if (data.presente_par) {
      try {
        const { data: presentateurData } = await supabaseAdhesion
          .from('members')
          .select('id, prenom, nom, email, numero_membre')
          .eq('id', data.presente_par)
          .maybeSingle()
        data.presentateur = presentateurData
      } catch (err) {
        logError(`Error fetching presenter for reunion ${reunionId}: ${err.message}`)
      }
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
    // Préparer les données d'insertion (sans presente_par si non fourni ou si la colonne n'existe pas)
    const insertData = {
      type_reunion: reunionData.type_reunion,
      titre: reunionData.titre,
      description: reunionData.description || null,
      date_reunion: reunionData.date_reunion,
      heure_debut: reunionData.heure_debut,
      heure_fin: reunionData.heure_fin || null,
      pole: reunionData.pole || null,
      lien_visio: reunionData.lien_visio || null,
      ordre_du_jour: reunionData.ordre_du_jour || null,
    }
    
    // Ajouter presente_par seulement s'il est fourni (la colonne peut ne pas exister encore)
    if (reunionData.presente_par) {
      insertData.presente_par = reunionData.presente_par
    }

    const { data, error } = await supabaseSecretariat
      .from('reunions')
      .insert(insertData)
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
          // Ajouter un nom d'affichage unifié
          nom_display: membre 
            ? `${membre.prenom} ${membre.nom}` 
            : participant.prenom_externe && participant.nom_externe
            ? `${participant.prenom_externe} ${participant.nom_externe}`
            : participant.nom_externe || 'Participant externe',
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
    // Préparer les données d'insertion (sans les champs qui peuvent ne pas exister encore)
    const insertData = {
      reunion_id: participantData.reunion_id,
      membre_id: participantData.membre_id || null,
      statut_invitation: participantData.statut_invitation || 'envoye',
      commentaire: participantData.commentaire || null,
    }
    
    // Ajouter les champs pour les non-membres seulement s'ils sont fournis
    if (participantData.nom_externe) {
      insertData.nom_externe = participantData.nom_externe
    }
    if (participantData.prenom_externe) {
      insertData.prenom_externe = participantData.prenom_externe
    }
    if (participantData.email_externe) {
      insertData.email_externe = participantData.email_externe
    }
    
    // Ajouter les champs de présence seulement s'ils sont fournis
    if (participantData.presence) {
      insertData.presence = participantData.presence
    }
    if (participantData.motif_absence) {
      insertData.motif_absence = participantData.motif_absence
    }

    const { data, error } = await supabaseSecretariat
      .from('participants_reunion')
      .insert(insertData)
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
 * Ajoute plusieurs participants à une réunion en une seule opération
 */
export async function addMultipleParticipants(participantsData) {
  try {
    if (!Array.isArray(participantsData) || participantsData.length === 0) {
      throw new Error('La liste des participants ne peut pas être vide')
    }

    // Récupérer les participants existants pour éviter les doublons
    const reunionId = participantsData[0]?.reunion_id
    if (!reunionId) {
      throw new Error('reunion_id est requis')
    }

    const { data: existingParticipants, error: fetchError } = await supabaseSecretariat
      .from('participants_reunion')
      .select('membre_id')
      .eq('reunion_id', reunionId)
      .not('membre_id', 'is', null)

    if (fetchError) {
      logError('addMultipleParticipants - fetch existing error', fetchError)
      // Continuer même si la récupération échoue
    }

    const existingMemberIds = (existingParticipants || [])
      .map(p => p.membre_id)
      .filter(Boolean)

    // Filtrer les participants qui n'existent pas déjà
    const newParticipantsData = participantsData.filter((participantData) => {
      // Si c'est un membre, vérifier qu'il n'existe pas déjà
      if (participantData.membre_id) {
        return !existingMemberIds.includes(participantData.membre_id)
      }
      // Pour les non-membres, on les laisse passer (pas de contrainte unique sur eux)
      return true
    })

    if (newParticipantsData.length === 0) {
      throw new Error('Tous les participants sélectionnés sont déjà invités à cette réunion')
    }

    // Préparer les données d'insertion pour les nouveaux participants
    const insertDataArray = newParticipantsData.map((participantData) => {
      const insertData = {
        reunion_id: participantData.reunion_id,
        membre_id: participantData.membre_id || null,
        statut_invitation: participantData.statut_invitation || 'envoye',
        commentaire: participantData.commentaire || null,
      }
      
      // Ajouter les champs pour les non-membres seulement s'ils sont fournis
      if (participantData.nom_externe) {
        insertData.nom_externe = participantData.nom_externe
      }
      if (participantData.prenom_externe) {
        insertData.prenom_externe = participantData.prenom_externe
      }
      if (participantData.email_externe) {
        insertData.email_externe = participantData.email_externe
      }
      
      // Ajouter les champs de présence seulement s'ils sont fournis
      if (participantData.presence) {
        insertData.presence = participantData.presence
      }
      if (participantData.motif_absence) {
        insertData.motif_absence = participantData.motif_absence
      }

      return insertData
    })

    const { data, error } = await supabaseSecretariat
      .from('participants_reunion')
      .insert(insertDataArray)
      .select()

    if (error) {
      logError('addMultipleParticipants error', error)
      // Vérifier si c'est une erreur de contrainte unique
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('Certains participants sont déjà invités à cette réunion')
      }
      throw new Error('Erreur lors de l\'ajout des participants: ' + (error.message || 'Erreur inconnue'))
    }

    logInfo('Participants ajoutés', { count: data?.length || 0 })
    return data || []
  } catch (err) {
    logError('addMultipleParticipants exception', err)
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

/**
 * Met à jour la présence de plusieurs participants en une seule opération
 */
export async function updateParticipantsPresence(reunionId, participantsUpdates) {
  try {
    const updates = []
    for (const update of participantsUpdates) {
      // Préparer les données de mise à jour (sans les champs qui peuvent ne pas exister)
      const updateData = {}
      
      if (update.presence !== undefined && update.presence !== null) {
        updateData.presence = update.presence
      }
      if (update.motif_absence !== undefined) {
        updateData.motif_absence = update.presence === 'absent' ? (update.motif_absence || null) : null
      }

      // Ne faire la mise à jour que si on a des données à mettre à jour
      if (Object.keys(updateData).length === 0) {
        continue
      }

      const { data, error } = await supabaseSecretariat
        .from('participants_reunion')
        .update(updateData)
        .eq('id', update.participant_id)
        .eq('reunion_id', reunionId)
        .select()
        .single()

      if (error) {
        logError(`Error updating participant ${update.participant_id}`, error)
        // Continuer avec les autres participants même en cas d'erreur
        continue
      }
      updates.push(data)
    }

    logInfo('Participants mis à jour', { count: updates.length, reunionId })
    return updates
  } catch (err) {
    logError('updateParticipantsPresence exception', err)
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
 * Récupère toutes les actions (avec filtres optionnels)
 */
export async function getAllActions({ assigne_a, statut, limit = 50 } = {}) {
  try {
    let query = supabaseSecretariat
      .from('actions')
      .select('*')
      .order('deadline', { ascending: true })
      .limit(limit)

    if (assigne_a) {
      query = query.eq('assigne_a', assigne_a)
    }

    if (statut) {
      query = query.eq('statut', statut)
    }

    const { data, error } = await query

    if (error) {
      logError('getAllActions error', error)
      throw new Error('Erreur lors de la récupération des actions')
    }

    if (!data || data.length === 0) {
      return []
    }

    // Enrichir avec les données des membres assignés (multi-assignation)
    const actionsWithMembers = await Promise.all(
      data.map(async (action) => {
        // Récupérer tous les assignés depuis action_assignees
        const { data: assigneesData } = await supabaseSecretariat
          .from('action_assignees')
          .select('member_id')
          .eq('action_id', action.id)

        const assigneeIds = assigneesData?.map((a) => a.member_id) || []
        
        // Si pas d'assignés multiples mais assigne_a existe, l'ajouter pour compatibilité
        if (assigneeIds.length === 0 && action.assigne_a) {
          assigneeIds.push(action.assigne_a)
        }

        // Récupérer les données de tous les membres assignés
        const membres = await Promise.all(
          assigneeIds.map(async (memberId) => {
            try {
              const { data: membreData } = await supabaseAdhesion
                .from('members')
                .select('id, prenom, nom, email, numero_membre')
                .eq('id', memberId)
                .maybeSingle()
              return membreData
            } catch (err) {
              logError(`Error fetching member ${memberId} for action ${action.id}: ${err.message}`)
              return null
            }
          })
        )

        // Filtrer les membres null
        const membresValides = membres.filter(m => m !== null)

        return {
          ...action,
          membre: membresValides.length > 0 ? membresValides[0] : null, // Pour compatibilité avec l'ancien code
          assignees: membresValides, // Tous les assignés
        }
      })
    )

    return actionsWithMembers
  } catch (err) {
    logError('getAllActions exception', err)
    throw err
  }
}

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

    // Enrichir avec les données des membres assignés (multi-assignation)
    const actionsWithMembers = await Promise.all(
      data.map(async (action) => {
        // Récupérer tous les assignés depuis action_assignees
        const { data: assigneesData } = await supabaseSecretariat
          .from('action_assignees')
          .select('member_id')
          .eq('action_id', action.id)

        const assigneeIds = assigneesData?.map((a) => a.member_id) || []
        
        // Si pas d'assignés multiples mais assigne_a existe, l'ajouter pour compatibilité
        if (assigneeIds.length === 0 && action.assigne_a) {
          assigneeIds.push(action.assigne_a)
        }

        // Récupérer les données de tous les membres assignés
        const membres = await Promise.all(
          assigneeIds.map(async (memberId) => {
            try {
              const { data: membreData } = await supabaseAdhesion
                .from('members')
                .select('id, prenom, nom, email, numero_membre')
                .eq('id', memberId)
                .maybeSingle()
              return membreData
            } catch (err) {
              logError(`Error fetching member ${memberId} for action ${action.id}: ${err.message}`)
              return null
            }
          })
        )

        // Filtrer les membres null
        const membresValides = membres.filter(m => m !== null)

        return {
          ...action,
          membre: membresValides.length > 0 ? membresValides[0] : null, // Pour compatibilité avec l'ancien code
          assignees: membresValides, // Tous les assignés
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
        statut: actionData.statut || 'en_cours',
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

/**
 * Supprime une action
 */
export async function deleteAction(actionId) {
  try {
    const { error } = await supabaseSecretariat
      .from('actions')
      .delete()
      .eq('id', actionId)

    if (error) {
      logError('deleteAction error', error)
      throw new Error('Erreur lors de la suppression de l\'action')
    }

    logInfo('Action supprimée', { id: actionId })
    return { success: true }
  } catch (err) {
    logError('deleteAction exception', err)
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
    // Vérifier si uploaded_by existe dans adhesion.members avant de l'utiliser
    let uploadedBy = null
    if (documentData.uploaded_by) {
      const { data: memberExists } = await supabaseAdhesion
        .from('members')
        .select('id')
        .eq('id', documentData.uploaded_by)
        .maybeSingle()
      
      if (memberExists) {
        uploadedBy = documentData.uploaded_by
      } else {
        logInfo('uploaded_by ID not found in members, setting to null', { uploaded_by: documentData.uploaded_by })
      }
    }

    const { data, error } = await supabaseSecretariat
      .from('documents')
      .insert({
        titre: documentData.titre,
        categorie: documentData.categorie,
        description: documentData.description || null,
        lien_pdf: documentData.lien_pdf,
        uploaded_by: uploadedBy,
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
      .eq('statut', 'en_cours')

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

// ========== GÉNÉRATION PDF ==========

/**
 * Génère un PDF pour une réunion avec son compte-rendu
 */
export async function generateReunionPDF(reunionId) {
  try {
    // Récupérer la réunion avec tous les détails
    const reunion = await getReunionById(reunionId)
    if (!reunion) {
      throw new Error('Réunion introuvable')
    }

    // Récupérer les participants
    const participants = await getParticipantsByReunion(reunionId)

    // Récupérer le compte-rendu
    const compteRendu = await getCompteRenduByReunion(reunionId)

    // Récupérer les actions
    const actions = await getActionsByReunion(reunionId)

    // Récupérer le présentateur si disponible
    let presentateur = null
    if (reunion.presente_par) {
      try {
        const { data: presentateurData } = await supabaseAdhesion
          .from('members')
          .select('id, prenom, nom, email, numero_membre')
          .eq('id', reunion.presente_par)
          .maybeSingle()
        presentateur = presentateurData
      } catch (err) {
        logWarning('Erreur récupération présentateur', { error: err.message })
      }
    }

    // Créer le PDF
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50
    })
    
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => {})

    // Couleurs améliorées
    const primaryColor = '#0d47a1'
    const secondaryColor = '#1565c0'
    const accentColor = '#1976d2'
    const textColor = '#1a1a1a'
    const lightGray = '#f5f5f5'
    const borderGray = '#e0e0e0'
    const darkGray = '#424242'

    // Chemins vers les images
    const imagesPath = path.join(__dirname, '../../asgf-app/public/assets/images')
    const logoPath = path.join(imagesPath, 'Logo_officiel_ASGF.png')
    const signaturesPath = path.join(imagesPath, 'signatures')
    const photoPresidentPath = path.join(signaturesPath, 'Photo président.jpg')
    const photoSecretairePath = path.join(signaturesPath, 'Photo_secretaire_generale.jpg')
    const signaturePresidentPath = path.join(signaturesPath, 'Signature_president.png')
    const signatureSecretairePath = path.join(signaturesPath, 'signature_secretaire_generale.png')

    // Fonction pour dessiner une boîte avec bordure
    const drawBox = (x, y, width, height, color = lightGray, borderColor = borderGray) => {
      doc.rect(x, y, width, height)
        .fillAndStroke(color, borderColor)
        .lineWidth(1)
    }

    // En-tête avec logo
    const headerY = 30
    const logoSize = 60
    
    // Logo à gauche
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, headerY, {
          width: logoSize,
          height: logoSize,
          fit: [logoSize, logoSize]
        })
      } catch (err) {
        logWarning('Erreur chargement logo', { error: err.message })
      }
    }

    // Titre centré
    doc.fontSize(22)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('COMPTE-RENDU DE RÉUNION', 50 + logoSize + 20, headerY + 10, {
        width: doc.page.width - 200 - logoSize,
        align: 'center'
      })
    
    doc.fontSize(16)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(reunion.titre || 'Réunion', 50 + logoSize + 20, headerY + 35, {
        width: doc.page.width - 200 - logoSize,
        align: 'center'
      })
    
    // Ligne de séparation
    doc.moveTo(50, headerY + logoSize + 20)
      .lineTo(doc.page.width - 50, headerY + logoSize + 20)
      .strokeColor(primaryColor)
      .lineWidth(2)
      .stroke()
    
    doc.y = headerY + logoSize + 40

    const formatDate = (dateStr) => {
      if (!dateStr) return '—'
      const date = new Date(dateStr)
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })
    }

    // Informations de la réunion dans une boîte stylisée
    const infoBoxY = doc.y
    const infoBoxHeight = 100
    drawBox(50, infoBoxY, doc.page.width - 100, infoBoxHeight, lightGray, primaryColor)
    
      doc.fontSize(14)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text('■ Informations de la réunion', 60, infoBoxY + 10)
    
    doc.fontSize(10)
      .fillColor(textColor)
      .font('Helvetica')
      .text(`Type: ${reunion.type_reunion || '—'}`, 60, infoBoxY + 30)
      .text(`Date: ${formatDate(reunion.date_reunion)}`, 60, infoBoxY + 45)
      .text(`Heure: ${reunion.heure_debut || '—'}${reunion.heure_fin ? ` - ${reunion.heure_fin}` : ''}`, 60, infoBoxY + 60)
    
    if (reunion.pole) {
      doc.text(`Pôle: ${reunion.pole}`, 60, infoBoxY + 75)
    }
    if (presentateur) {
      doc.text(`Présenté par: ${presentateur.prenom} ${presentateur.nom}`, doc.page.width / 2, infoBoxY + 30)
    }

    doc.y = infoBoxY + infoBoxHeight + 20

    // Ordre du jour dans une boîte
    if (reunion.ordre_du_jour) {
      const ordreBoxY = doc.y
      const ordreTextHeight = doc.heightOfString(reunion.ordre_du_jour, { width: doc.page.width - 140 }) + 40
      drawBox(50, ordreBoxY, doc.page.width - 100, ordreTextHeight, '#fafafa', accentColor)
      
      doc.fontSize(14)
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .text('■ Ordre du jour', 60, ordreBoxY + 10)
      
      doc.moveDown(0.3)
      doc.fontSize(10)
        .fillColor(textColor)
        .font('Helvetica')
        .text(reunion.ordre_du_jour, 60, ordreBoxY + 30, {
          width: doc.page.width - 140,
          align: 'left'
        })
      
      doc.y = ordreBoxY + ordreTextHeight + 10
    }

    // Participants dans une boîte stylisée
    if (participants && participants.length > 0) {
      const participantsBoxY = doc.y
      let participantsHeight = 50
      
      const presents = participants.filter(p => p.presence === 'present')
      const absents = participants.filter(p => p.presence === 'absent')
      const nonDefinis = participants.filter(p => !p.presence)
      
      // Calculer la hauteur nécessaire
      participantsHeight += (presents.length > 0 ? presents.length * 15 + 20 : 0)
      participantsHeight += (absents.length > 0 ? absents.length * 15 + 20 : 0)
      participantsHeight += (nonDefinis.length > 0 ? nonDefinis.length * 15 + 20 : 0)
      
      drawBox(50, participantsBoxY, doc.page.width - 100, participantsHeight, '#f0f7ff', secondaryColor)
      
      doc.fontSize(14)
        .fillColor(secondaryColor)
        .font('Helvetica-Bold')
        .text('■ Participants', 60, participantsBoxY + 10)
      
      doc.fontSize(10)
        .font('Helvetica')
        let currentY = participantsBoxY + 35

      if (presents.length > 0) {
        doc.font('Helvetica-Bold')
          .fillColor('#2e7d32')
          .text('+ Présents:', 60, currentY)
        doc.font('Helvetica')
          .fillColor(textColor)
        currentY += 15
        presents.forEach(p => {
          const nom = p.nom_display || (p.membre ? `${p.membre.prenom} ${p.membre.nom}` : `${p.prenom_externe || ''} ${p.nom_externe || ''}`.trim() || 'Participant externe')
          doc.text(`  • ${nom}`, 60, currentY)
          currentY += 15
        })
        currentY += 5
      }

      if (absents.length > 0) {
        doc.font('Helvetica-Bold')
          .fillColor('#c62828')
          .text('- Absents:', 60, currentY)
        doc.font('Helvetica')
          .fillColor(textColor)
        currentY += 15
        absents.forEach(p => {
          const nom = p.nom_display || (p.membre ? `${p.membre.prenom} ${p.membre.nom}` : `${p.prenom_externe || ''} ${p.nom_externe || ''}`.trim() || 'Participant externe')
          const motif = p.motif_absence ? ` (${p.motif_absence})` : ''
          doc.text(`  • ${nom}${motif}`, 60, currentY)
          currentY += 15
        })
        currentY += 5
      }

      if (nonDefinis.length > 0) {
        doc.font('Helvetica-Bold')
          .fillColor(darkGray)
          .text('? Non définis:', 60, currentY)
        doc.font('Helvetica')
          .fillColor(textColor)
        currentY += 15
        nonDefinis.forEach(p => {
          const nom = p.nom_display || (p.membre ? `${p.membre.prenom} ${p.membre.nom}` : `${p.prenom_externe || ''} ${p.nom_externe || ''}`.trim() || 'Participant externe')
          doc.text(`  • ${nom}`, 60, currentY)
          currentY += 15
        })
      }
      
      doc.y = participantsBoxY + participantsHeight + 10
    }

    // Compte-rendu dans des boîtes stylisées
    if (compteRendu) {
      if (compteRendu.resume) {
        const resumeBoxY = doc.y
        const resumeTextHeight = doc.heightOfString(compteRendu.resume, { width: doc.page.width - 140 }) + 40
        drawBox(50, resumeBoxY, doc.page.width - 100, resumeTextHeight, '#fff9e6', '#f57c00')
        
        doc.fontSize(14)
          .fillColor('#f57c00')
          .font('Helvetica-Bold')
          .text('■ Résumé', 60, resumeBoxY + 10)
        
        doc.moveDown(0.3)
        doc.fontSize(10)
          .fillColor(textColor)
          .font('Helvetica')
          .text(compteRendu.resume, 60, resumeBoxY + 30, {
            width: doc.page.width - 140,
            align: 'left'
          })
        
        doc.y = resumeBoxY + resumeTextHeight + 10
      }

      if (compteRendu.decisions) {
        const decisionsBoxY = doc.y
        const decisionsTextHeight = doc.heightOfString(compteRendu.decisions, { width: doc.page.width - 140 }) + 40
        drawBox(50, decisionsBoxY, doc.page.width - 100, decisionsTextHeight, '#e8f5e9', '#388e3c')
        
        doc.fontSize(14)
          .fillColor('#388e3c')
          .font('Helvetica-Bold')
          .text('■ Décisions', 60, decisionsBoxY + 10)
        
        doc.moveDown(0.3)
        doc.fontSize(10)
          .fillColor(textColor)
          .font('Helvetica')
          .text(compteRendu.decisions, 60, decisionsBoxY + 30, {
            width: doc.page.width - 140,
            align: 'left'
          })
        
        doc.y = decisionsBoxY + decisionsTextHeight + 10
      }
    }

    // Actions dans une boîte stylisée
    if (actions && actions.length > 0) {
      const actionsBoxY = doc.y
      
      // Calculer la hauteur nécessaire approximative (sera ajustée après le rendu)
      // On utilise une estimation généreuse pour éviter les coupures
      let estimatedHeight = 50 // Hauteur de l'en-tête
      actions.forEach((action) => {
        const assignees = action.assignees && action.assignees.length > 0
          ? action.assignees
          : (action.membre ? [action.membre] : [])
        const assignesList = assignees.length > 0
          ? assignees.map(m => `${m.prenom} ${m.nom}`).join(', ')
          : 'Non assigné'
        
        // Estimation : titre (15px) + assignés (hauteur variable, ~10px par ligne) + statut/deadline (15px) + espace (5px)
        const assignesHeight = Math.max(10, Math.ceil(assignesList.length / 80) * 10) // ~80 caractères par ligne
        estimatedHeight += 35 + assignesHeight
      })
      
      drawBox(50, actionsBoxY, doc.page.width - 100, estimatedHeight, '#f3e5f5', '#7b1fa2')
      
      doc.fontSize(14)
        .fillColor('#7b1fa2')
        .font('Helvetica-Bold')
        .text('■ Actions assignées', 60, actionsBoxY + 10)
      
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(textColor)
      
      let currentActionY = actionsBoxY + 35
      actions.forEach((action, index) => {
        // Récupérer tous les assignés
        const assignees = action.assignees && action.assignees.length > 0
          ? action.assignees
          : (action.membre ? [action.membre] : [])
        
        // Formater la liste des assignés
        const assignesList = assignees.length > 0
          ? assignees.map(m => `${m.prenom} ${m.nom}`).join(', ')
          : 'Non assigné'
        
        const deadline = action.deadline 
          ? formatDate(action.deadline)
          : '—'
        const statutColor = action.statut === 'termine' ? '#2e7d32' : action.statut === 'en_cours' ? '#f57c00' : '#424242'
        
        doc.font('Helvetica-Bold')
          .fillColor('#7b1fa2')
          .text(`${index + 1}. ${action.intitule}`, 60, currentActionY)
        
        doc.font('Helvetica')
          .fillColor(textColor)
          .fontSize(9)
        
        // Calculer la hauteur du texte des assignés pour ajuster la position Y
        const assignesTextHeight = doc.heightOfString(`   Assigné à: ${assignesList}`, {
          width: doc.page.width - 140
        })
        
        doc.text(`   Assigné à: ${assignesList}`, 60, currentActionY + 15, {
          width: doc.page.width - 140,
          align: 'left'
        })
        
        const statutY = currentActionY + 15 + assignesTextHeight + 5
        doc.text(`   Statut: `, 60, statutY)
        
        doc.fillColor(statutColor)
          .text(action.statut || 'en cours', 120, statutY)
        
        doc.fillColor(textColor)
          .text(`   Deadline: ${deadline}`, 200, statutY)
        
        // Ajuster la position Y : titre (15px) + assignés (hauteur variable) + statut/deadline (15px) + espace (5px)
        currentActionY = statutY + 20
      })
      
      // Utiliser currentActionY comme position finale réelle
      doc.y = currentActionY + 10
    }

    // Ajouter les signatures avec photos en bas de la dernière page
    // Vérifier s'il y a assez d'espace (photo + signature + texte = ~200px)
    const photoHeight = 80
    const signatureHeight = 50
    const textHeight = 40
    const totalHeight = photoHeight + signatureHeight + textHeight + 30
    
    // Vérifier si on a assez d'espace pour les signatures
    // Ne créer une nouvelle page que si vraiment nécessaire (pas si on est déjà en haut de page)
    const spaceNeeded = totalHeight + 20
    const spaceAvailable = doc.page.height - doc.y - 80
    
    // Seulement créer une nouvelle page si on a vraiment besoin d'espace ET qu'on a déjà du contenu
    if (spaceAvailable < spaceNeeded && doc.y > 200) {
      doc.addPage()
      doc.y = 50 // Réinitialiser la position Y sur la nouvelle page
    }
    
    doc.moveDown(1)
    
    // Vérifier que les fichiers existent
    const photoPresidentExists = fs.existsSync(photoPresidentPath)
    const photoSecretaireExists = fs.existsSync(photoSecretairePath)
    const signaturePresidentExists = fs.existsSync(signaturePresidentPath)
    const signatureSecretaireExists = fs.existsSync(signatureSecretairePath)
    
    if (photoPresidentExists || photoSecretaireExists || signaturePresidentExists || signatureSecretaireExists) {
      const signatureY = doc.y
      const pageWidth = doc.page.width
      const margin = 50
      const boxWidth = 200
      const spacing = (pageWidth - 2 * margin - 2 * boxWidth) / 3
      
      // Boîte pour le Président (à gauche)
      if (photoPresidentExists || signaturePresidentExists) {
        const presidentX = margin
        const presidentBoxY = signatureY
        
        // Dessiner une boîte pour le président
        drawBox(presidentX, presidentBoxY, boxWidth, totalHeight - 20, '#fafafa', primaryColor)
        
        let currentY = presidentBoxY + 10
        
        // Photo du président
        if (photoPresidentExists) {
          try {
            doc.image(photoPresidentPath, presidentX + 10, currentY, {
              width: boxWidth - 20,
              height: photoHeight,
              fit: [boxWidth - 20, photoHeight]
            })
            currentY += photoHeight + 5
          } catch (err) {
            logWarning('Erreur chargement photo président', { error: err.message })
          }
        }
        
        // Signature du président
        if (signaturePresidentExists) {
          try {
            doc.image(signaturePresidentPath, presidentX + (boxWidth - signatureHeight) / 2, currentY, {
              width: signatureHeight,
              height: signatureHeight,
              fit: [signatureHeight, signatureHeight]
            })
            currentY += signatureHeight + 5
          } catch (err) {
            logWarning('Erreur chargement signature président', { error: err.message })
          }
        }
        
        // Nom et fonction
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('Serigne Omar Diao', presidentX + 10, currentY, {
            width: boxWidth - 20,
            align: 'center'
          })
        
        doc.fontSize(9)
          .font('Helvetica')
          .fillColor(textColor)
          .text('Président', presidentX + 10, currentY + 15, {
            width: boxWidth - 20,
            align: 'center'
          })
      }
      
      // Boîte pour le Secrétaire Général (à droite)
      if (photoSecretaireExists || signatureSecretaireExists) {
        const secretaireX = margin + boxWidth + spacing
        const secretaireBoxY = signatureY
        
        // Dessiner une boîte pour le secrétaire
        drawBox(secretaireX, secretaireBoxY, boxWidth, totalHeight - 20, '#fafafa', secondaryColor)
        
        let currentY = secretaireBoxY + 10
        
        // Photo du secrétaire
        if (photoSecretaireExists) {
          try {
            doc.image(photoSecretairePath, secretaireX + 10, currentY, {
              width: boxWidth - 20,
              height: photoHeight,
              fit: [boxWidth - 20, photoHeight]
            })
            currentY += photoHeight + 5
          } catch (err) {
            logWarning('Erreur chargement photo secrétaire', { error: err.message })
          }
        }
        
        // Signature du secrétaire
        if (signatureSecretaireExists) {
          try {
            doc.image(signatureSecretairePath, secretaireX + (boxWidth - signatureHeight) / 2, currentY, {
              width: signatureHeight,
              height: signatureHeight,
              fit: [signatureHeight, signatureHeight]
            })
            currentY += signatureHeight + 5
          } catch (err) {
            logWarning('Erreur chargement signature secrétaire', { error: err.message })
          }
        }
        
        // Nom et fonction
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text('Moustapha Gakou', secretaireX + 10, currentY, {
            width: boxWidth - 20,
            align: 'center'
          })
        
        doc.fontSize(9)
          .font('Helvetica')
          .fillColor(textColor)
          .text('Secrétaire Général', secretaireX + 10, currentY + 15, {
            width: boxWidth - 20,
            align: 'center'
          })
      }
      
      doc.y = signatureY + totalHeight
    }

    // Pied de page sur toutes les pages
    // PDFKit utilise une indexation basée sur 1 pour switchToPage (selon l'erreur "pages 1 to 1")
    const pageRange = doc.bufferedPageRange()
    const pageCount = pageRange.count || 1
    
    // Utiliser l'indexation 1-based comme indiqué par l'erreur
    for (let i = 1; i <= pageCount; i++) {
      try {
        doc.switchToPage(i)
        doc.fontSize(8)
          .fillColor('#666666')
          .font('Helvetica')
          .text(
            `Page ${i} sur ${pageCount} - ASGF - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
            50,
            doc.page.height - 30,
            { align: 'center', width: doc.page.width - 100 }
          )
      } catch (err) {
        // Si l'indexation 1-based ne fonctionne pas, essayer 0-based
        try {
          doc.switchToPage(i - 1)
          doc.fontSize(8)
            .fillColor('#666666')
            .font('Helvetica')
            .text(
              `Page ${i} sur ${pageCount} - ASGF - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
              50,
              doc.page.height - 30,
              { align: 'center', width: doc.page.width - 100 }
            )
        } catch (err2) {
          logWarning('Impossible d\'ajouter le pied de page', { page: i, error: err2.message })
        }
      }
    }

    // Finaliser le PDF
    doc.end()

    // Attendre que le PDF soit complètement généré
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(pdfBuffer)
      })
      doc.on('error', (err) => {
        logError('Erreur génération PDF réunion', err)
        reject(err)
      })
    })
  } catch (err) {
    logError('generateReunionPDF exception', err)
    throw err
  }
}

/**
 * Trouve un membre par email dans adhesion.members
 */
export async function findMemberByEmail(email) {
  try {
    if (!email) {
      return null
    }

    const { data, error } = await supabaseAdhesion
      .from('members')
      .select('id, prenom, nom, email, numero_membre')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logError('findMemberByEmail error', error)
      return null
    }

    return data || null
  } catch (err) {
    logError('findMemberByEmail exception', err)
    return null
  }
}
