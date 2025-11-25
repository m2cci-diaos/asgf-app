// backend/controllers/secretariat.controller.js
import * as secretariatService from '../services/secretariat.service.js'
import { validateId, validatePagination } from '../utils/validators.js'
import { logError } from '../utils/logger.js'

// ========== RÉUNIONS ==========

/**
 * GET /api/secretariat/reunions
 * Liste toutes les réunions avec pagination
 */
export async function listReunions(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await secretariatService.getAllReunions({
      ...pagination.data,
      search: req.query.search || '',
      type_reunion: req.query.type_reunion || '',
      pole: req.query.pole || '',
    })

    return res.json({
      success: true,
      data: result.reunions,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listReunions error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des réunions',
    })
  }
}

/**
 * GET /api/secretariat/reunions/:id
 * Récupère une réunion par son ID
 */
export async function getReunion(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const reunion = await secretariatService.getReunionById(req.params.id)

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Réunion introuvable',
      })
    }

    return res.json({
      success: true,
      data: reunion,
    })
  } catch (err) {
    logError('getReunion error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération de la réunion',
    })
  }
}

/**
 * POST /api/secretariat/reunions
 * Crée une nouvelle réunion
 */
export async function createReunion(req, res) {
  try {
    const reunion = await secretariatService.createReunion(req.body)

    return res.status(201).json({
      success: true,
      message: 'Réunion créée avec succès',
      data: reunion,
    })
  } catch (err) {
    logError('createReunion error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la réunion',
    })
  }
}

/**
 * PUT /api/secretariat/reunions/:id
 * Met à jour une réunion
 */
export async function updateReunion(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const reunion = await secretariatService.updateReunion(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Réunion mise à jour avec succès',
      data: reunion,
    })
  } catch (err) {
    logError('updateReunion error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la réunion',
    })
  }
}

// ========== PARTICIPANTS ==========

/**
 * GET /api/secretariat/reunions/:id/participants
 * Récupère tous les participants d'une réunion
 */
export async function getParticipants(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const participants = await secretariatService.getParticipantsByReunion(req.params.id)

    return res.json({
      success: true,
      data: participants,
    })
  } catch (err) {
    logError('getParticipants error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des participants',
    })
  }
}

/**
 * POST /api/secretariat/participants
 * Ajoute un participant à une réunion
 */
export async function addParticipant(req, res) {
  try {
    const participant = await secretariatService.addParticipant(req.body)

    return res.status(201).json({
      success: true,
      message: 'Participant ajouté avec succès',
      data: participant,
    })
  } catch (err) {
    logError('addParticipant error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de l\'ajout du participant',
    })
  }
}

/**
 * PUT /api/secretariat/participants/:id
 * Met à jour le statut d'un participant
 */
export async function updateParticipant(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const participant = await secretariatService.updateParticipant(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Participant mis à jour avec succès',
      data: participant,
    })
  } catch (err) {
    logError('updateParticipant error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du participant',
    })
  }
}

// ========== COMPTES RENDUS ==========

/**
 * GET /api/secretariat/reunions/:id/compte-rendu
 * Récupère le compte rendu d'une réunion
 */
export async function getCompteRendu(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const compteRendu = await secretariatService.getCompteRenduByReunion(req.params.id)

    return res.json({
      success: true,
      data: compteRendu,
    })
  } catch (err) {
    logError('getCompteRendu error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération du compte rendu',
    })
  }
}

/**
 * POST /api/secretariat/comptes-rendus
 * Crée ou met à jour un compte rendu
 */
export async function saveCompteRendu(req, res) {
  try {
    const compteRendu = await secretariatService.saveCompteRendu(req.body)

    return res.status(201).json({
      success: true,
      message: 'Compte rendu sauvegardé avec succès',
      data: compteRendu,
    })
  } catch (err) {
    logError('saveCompteRendu error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la sauvegarde du compte rendu',
    })
  }
}

// ========== ACTIONS ==========

/**
 * GET /api/secretariat/reunions/:id/actions
 * Récupère toutes les actions d'une réunion
 */
export async function getActions(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const actions = await secretariatService.getActionsByReunion(req.params.id)

    return res.json({
      success: true,
      data: actions,
    })
  } catch (err) {
    logError('getActions error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des actions',
    })
  }
}

/**
 * POST /api/secretariat/actions
 * Crée une nouvelle action
 */
export async function createAction(req, res) {
  try {
    const action = await secretariatService.createAction(req.body)

    return res.status(201).json({
      success: true,
      message: 'Action créée avec succès',
      data: action,
    })
  } catch (err) {
    logError('createAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de l\'action',
    })
  }
}

/**
 * PUT /api/secretariat/actions/:id
 * Met à jour une action
 */
export async function updateAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const action = await secretariatService.updateAction(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Action mise à jour avec succès',
      data: action,
    })
  } catch (err) {
    logError('updateAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de l\'action',
    })
  }
}

// ========== DOCUMENTS ==========

/**
 * GET /api/secretariat/documents
 * Liste tous les documents avec pagination
 */
export async function listDocuments(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await secretariatService.getAllDocuments({
      ...pagination.data,
      search: req.query.search || '',
      categorie: req.query.categorie || '',
    })

    return res.json({
      success: true,
      data: result.documents,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listDocuments error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des documents',
    })
  }
}

/**
 * POST /api/secretariat/documents
 * Crée un nouveau document
 */
export async function createDocument(req, res) {
  try {
    const document = await secretariatService.createDocument(req.body)

    return res.status(201).json({
      success: true,
      message: 'Document créé avec succès',
      data: document,
    })
  } catch (err) {
    logError('createDocument error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création du document',
    })
  }
}

/**
 * PUT /api/secretariat/documents/:id
 * Met à jour un document
 */
export async function updateDocument(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const document = await secretariatService.updateDocument(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Document mis à jour avec succès',
      data: document,
    })
  } catch (err) {
    logError('updateDocument error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du document',
    })
  }
}

// ========== STATISTIQUES ==========

/**
 * GET /api/secretariat/stats
 * Récupère les statistiques du module secrétariat
 */
export async function getStats(req, res) {
  try {
    const stats = await secretariatService.getSecretariatStats()

    return res.json({
      success: true,
      data: stats,
    })
  } catch (err) {
    logError('getStats error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des statistiques',
    })
  }
}
