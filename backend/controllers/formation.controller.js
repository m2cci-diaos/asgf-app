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
} from '../services/formation.service.js'
import { validateId, validatePagination } from '../utils/validators.js'
import { logError } from '../utils/logger.js'

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
