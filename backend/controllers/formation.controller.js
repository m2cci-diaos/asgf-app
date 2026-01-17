// backend/controllers/formation.controller.js
import {
  getAllFormations,
  getFormationById,
  createFormation,
  updateFormation,
  deactivateFormation,
  getFormationInscriptions,
  confirmInscription,
  rejectInscription,
  getFormationStats,
  getAllSessions,
  createSession,
  updateSession,
  deleteSession,
  getAllInscriptions,
  createInscription,
  updateInscription,
  deleteInscription,
  getAllFormateurs,
  createFormateur,
  updateFormateur,
  deleteFormateur,
} from '../services/formation.service.js'
import { supabaseFormation } from '../config/supabase.js'
import { validateId, validatePagination } from '../utils/validators.js'
import { logError } from '../utils/logger.js'
import {
  notifyFormationInvitation,
  notifyFormationReminder,
  notifyFormationStatus,
} from '../services/notifications.service.js'
import { getFormationEmailContext } from '../utils/formationEmailContext.js'

/**
 * GET /api/formation/formations
 * Liste toutes les formations avec pagination
 */
export async function listFormations(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await getAllFormations({
      ...pagination.data,
      categorie: req.query.categorie || '',
      statut: req.query.statut || '',
    })

    return res.json({
      success: true,
      data: result.formations,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listFormations error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des formations',
    })
  }
}

/**
 * GET /api/formation/formations/:id
 * Récupère une formation par son ID
 */
export async function getFormation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const formation = await getFormationById(req.params.id)

    if (!formation) {
      return res.status(404).json({
        success: false,
        message: 'Formation introuvable',
      })
    }

    return res.json({
      success: true,
      data: formation,
    })
  } catch (err) {
    logError('getFormation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération de la formation',
    })
  }
}

/**
 * POST /api/formation/formations
 * Crée une nouvelle formation
 */
export async function createFormationController(req, res) {
  try {
    const { slug, titre, categorie, niveau } = req.body

    // Validation basique
    if (!slug || !titre || !categorie || !niveau) {
      return res.status(400).json({
        success: false,
        message: 'Slug, titre, catégorie et niveau sont requis',
      })
    }

    const formation = await createFormation(req.body)
    return res.status(201).json({
      success: true,
      message: 'Formation créée avec succès',
      data: formation,
    })
  } catch (err) {
    logError('createFormationController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la formation',
    })
  }
}

/**
 * PUT /api/formation/formations/:id
 * Met à jour une formation
 */
export async function updateFormationController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const formation = await updateFormation(req.params.id, req.body)
    return res.json({
      success: true,
      message: 'Formation mise à jour avec succès',
      data: formation,
    })
  } catch (err) {
    logError('updateFormationController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la formation',
    })
  }
}

/**
 * DELETE /api/formation/formations/:id
 * Désactive une formation
 */
export async function deleteFormation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const result = await deactivateFormation(req.params.id)
    return res.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    logError('deleteFormation error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la désactivation de la formation',
    })
  }
}

/**
 * GET /api/formation/formations/:id/inscriptions
 * Récupère les inscriptions d'une formation
 */
export async function getInscriptions(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await getFormationInscriptions(req.params.id, {
      status: req.query.status || '',
      ...pagination.data,
    })

    return res.json({
      success: true,
      data: result.inscriptions,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('getInscriptions error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des inscriptions',
    })
  }
}

/**
 * POST /api/formation/inscriptions/:id/confirm
 * Valide une inscription
 */
export async function confirmInscriptionController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const adminId = req.admin?.id
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      })
    }

    const inscription = await confirmInscription(req.params.id, adminId)
    const context = await getFormationEmailContext(
      inscription.formation_id,
      inscription.session_id
    )

    await notifyFormationStatus({
      status: 'confirmed',
      email: inscription.email,
      prenom: inscription.prenom,
      nom: inscription.nom,
      formation_title: context.formationTitle,
      session_date: context.sessionDate,
    })

    return res.json({
      success: true,
      message: 'Inscription confirmée avec succès',
      data: inscription,
    })
  } catch (err) {
    logError('confirmInscriptionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la confirmation de l\'inscription',
    })
  }
}

/**
 * POST /api/formation/inscriptions/:id/reject
 * Rejette une inscription
 */
export async function rejectInscriptionController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const adminId = req.admin?.id
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      })
    }

    const inscription = await rejectInscription(req.params.id, adminId)
    const context = await getFormationEmailContext(
      inscription.formation_id,
      inscription.session_id
    )

    await notifyFormationStatus({
      status: 'rejected',
      email: inscription.email,
      prenom: inscription.prenom,
      nom: inscription.nom,
      formation_title: context.formationTitle,
      session_date: context.sessionDate,
    })

    return res.json({
      success: true,
      message: 'Inscription rejetée avec succès',
      data: inscription,
    })
  } catch (err) {
    logError('rejectInscriptionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors du rejet de l\'inscription',
    })
  }
}

/**
 * POST /api/formation/inscriptions/:id/invitation
 * Envoie un email d'invitation avec le lien d'accès
 */
export async function sendFormationInvitationController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const { access_link } = req.body || {}
    if (!access_link) {
      return res.status(400).json({
        success: false,
        message: "Le lien d'accès (access_link) est requis",
      })
    }

    // Récupérer directement l'inscription par ID dans Supabase
    const { data: inscription, error } = await supabaseFormation
      .from('inscriptions')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) {
      throw new Error("Erreur lors de la récupération de l'inscription")
    }

    if (!inscription) {
      return res.status(404).json({
        success: false,
        message: 'Inscription introuvable',
      })
    }

    const context = await getFormationEmailContext(
      inscription.formation_id,
      inscription.session_id
    )

    await notifyFormationInvitation({
      email: inscription.email,
      prenom: inscription.prenom,
      nom: inscription.nom,
      formation_title: context.formationTitle,
      session_date: context.sessionDate,
      access_link,
    })

    return res.json({
      success: true,
      message: 'Invitation envoyée avec succès',
    })
  } catch (err) {
    logError('sendFormationInvitationController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || "Erreur lors de l'envoi de l'invitation",
    })
  }
}

/**
 * POST /api/formation/sessions/:id/reminder
 * Envoie un rappel à toutes les inscriptions confirmées d'une session
 */
export async function sendFormationReminderController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const { kind = 'generic', access_link } = req.body || {}

    const { data: inscriptions, error } = await supabaseFormation
      .from('inscriptions')
      .select('*')
      .eq('session_id', req.params.id)
      .eq('status', 'confirmed')

    if (error) {
      throw new Error("Erreur lors de la récupération des inscriptions")
    }

    if (!inscriptions || inscriptions.length === 0) {
      return res.json({
        success: true,
        message: 'Aucune inscription confirmée pour cette session',
      })
    }

    const session = inscriptions[0]
    const context = await getFormationEmailContext(
      session.formation_id,
      session.session_id
    )

    for (const inscription of inscriptions) {
      await notifyFormationReminder({
        kind,
        email: inscription.email,
        prenom: inscription.prenom,
        nom: inscription.nom,
        formation_title: context.formationTitle,
        session_date: context.sessionDate,
        access_link,
      })
    }

    return res.json({
      success: true,
      message: 'Rappel envoyé aux participants',
    })
  } catch (err) {
    logError('sendFormationReminderController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de lenvoi du rappel',
    })
  }
}

/**
 * GET /api/formation/stats
 * Récupère les statistiques globales
 */
export async function getStats(req, res) {
  try {
    const stats = await getFormationStats()
    return res.json({
      success: true,
      data: stats,
    })
  } catch (err) {
    logError('getStats error', err)
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    })
  }
}

/**
 * GET /api/formation/sessions
 * Liste toutes les sessions
 */
export async function listSessions(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await getAllSessions({
      ...pagination.data,
      formation_id: req.query.formation_id || '',
      statut: req.query.statut || '',
    })

    return res.json({
      success: true,
      data: result.sessions,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listSessions error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des sessions',
    })
  }
}

/**
 * POST /api/formation/sessions
 * Crée une nouvelle session
 */
export async function createSessionController(req, res) {
  try {
    const { formation_id, date_debut } = req.body

    if (!formation_id || !date_debut) {
      return res.status(400).json({
        success: false,
        message: 'formation_id et date_debut sont requis',
      })
    }

    const session = await createSession(req.body)
    return res.status(201).json({
      success: true,
      message: 'Session créée avec succès',
      data: session,
    })
  } catch (err) {
    logError('createSessionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la session',
    })
  }
}

/**
 * PUT /api/formation/sessions/:id
 * Met à jour une session
 */
export async function updateSessionController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const session = await updateSession(req.params.id, req.body)
    return res.json({
      success: true,
      message: 'Session mise à jour avec succès',
      data: session,
    })
  } catch (err) {
    logError('updateSessionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la session',
    })
  }
}

/**
 * DELETE /api/formation/sessions/:id
 * Supprime une session
 */
export async function deleteSessionController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const result = await deleteSession(req.params.id)
    return res.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    logError('deleteSessionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression de la session',
    })
  }
}

/**
 * GET /api/formation/inscriptions
 * Liste toutes les inscriptions
 */
export async function listInscriptions(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await getAllInscriptions({
      ...pagination.data,
      formation_id: req.query.formation_id || '',
      session_id: req.query.session_id || '',
      status: req.query.status || '',
    })

    return res.json({
      success: true,
      data: result.inscriptions,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listInscriptions error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des inscriptions',
    })
  }
}

/**
 * POST /api/formation/inscriptions
 * Crée une nouvelle inscription
 */
export async function createInscriptionController(req, res) {
  try {
    const { prenom, nom, email, formation_id, niveau } = req.body

    if (!prenom || !nom || !email || !formation_id || !niveau) {
      return res.status(400).json({
        success: false,
        message: 'prenom, nom, email, formation_id et niveau sont requis',
      })
    }

    const inscription = await createInscription(req.body)
    return res.status(201).json({
      success: true,
      message: 'Inscription créée avec succès',
      data: inscription,
    })
  } catch (err) {
    logError('createInscriptionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la création de l\'inscription',
    })
  }
}

/**
 * PUT /api/formation/inscriptions/:id
 * Met à jour une inscription
 */
export async function updateInscriptionController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const inscription = await updateInscription(req.params.id, req.body)
    return res.json({
      success: true,
      message: 'Inscription mise à jour avec succès',
      data: inscription,
    })
  } catch (err) {
    logError('updateInscriptionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de l\'inscription',
    })
  }
}

/**
 * DELETE /api/formation/inscriptions/:id
 * Supprime une inscription
 */
export async function deleteInscriptionController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const result = await deleteInscription(req.params.id)
    return res.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    logError('deleteInscriptionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression de l\'inscription',
    })
  }
}

/**
 * GET /api/formation/formateurs
 * Liste tous les formateurs
 */
export async function listFormateurs(req, res) {
  try {
    const formateurs = await getAllFormateurs()
    return res.json({
      success: true,
      data: formateurs,
    })
  } catch (err) {
    logError('listFormateurs error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des formateurs',
    })
  }
}

/**
 * POST /api/formation/formateurs
 * Crée un nouveau formateur
 */
export async function createFormateurController(req, res) {
  try {
    const { nom, prenom, email } = req.body

    if (!nom || !prenom || !email) {
      return res.status(400).json({
        success: false,
        message: 'nom, prenom et email sont requis',
      })
    }

    const formateur = await createFormateur(req.body)
    return res.status(201).json({
      success: true,
      message: 'Formateur créé avec succès',
      data: formateur,
    })
  } catch (err) {
    logError('createFormateurController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la création du formateur',
    })
  }
}

/**
 * PUT /api/formation/formateurs/:id
 * Met à jour un formateur
 */
export async function updateFormateurController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const formateur = await updateFormateur(req.params.id, req.body)
    return res.json({
      success: true,
      message: 'Formateur mis à jour avec succès',
      data: formateur,
    })
  } catch (err) {
    logError('updateFormateurController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du formateur',
    })
  }
}

/**
 * DELETE /api/formation/formateurs/:id
 * Supprime un formateur
 */
export async function deleteFormateurController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const result = await deleteFormateur(req.params.id)
    return res.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    logError('deleteFormateurController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression du formateur',
    })
  }
}
