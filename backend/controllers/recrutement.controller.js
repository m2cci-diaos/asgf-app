// backend/controllers/recrutement.controller.js
import * as recrutementService from '../services/recrutement.service.js'
import { validateId, validatePagination } from '../utils/validators.js'
import { logError } from '../utils/logger.js'

// ========== CANDIDATURES ==========

/**
 * GET /api/recrutement/candidatures
 * Liste toutes les candidatures avec pagination
 */
export async function listCandidatures(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await recrutementService.getAllCandidatures({
      ...pagination.data,
      search: req.query.search || '',
      statut: req.query.statut || '',
      type_contrat: req.query.type_contrat || '',
    })

    return res.json({
      success: true,
      data: result.candidatures,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listCandidatures error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des candidatures',
    })
  }
}

/**
 * GET /api/recrutement/candidatures/:id
 * Récupère une candidature par son ID avec tous ses suivis
 */
export async function getCandidature(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const candidature = await recrutementService.getCandidatureById(req.params.id)

    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature introuvable',
      })
    }

    return res.json({
      success: true,
      data: candidature,
    })
  } catch (err) {
    logError('getCandidature error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération de la candidature',
    })
  }
}

/**
 * POST /api/recrutement/candidatures
 * Crée une nouvelle candidature
 */
export async function createCandidature(req, res) {
  try {
    const candidature = await recrutementService.createCandidature(req.body)

    return res.status(201).json({
      success: true,
      message: 'Candidature créée avec succès',
      data: candidature,
    })
  } catch (err) {
    logError('createCandidature error', err)
    // Gérer les erreurs de doublon
    if (err.code === 'DUPLICATE_CANDIDATURE') {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_CANDIDATURE',
        message: err.message || 'Une candidature similaire existe déjà pour ce membre. Vérifiez avant de continuer.',
      })
    }
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la candidature',
    })
  }
}

/**
 * PUT /api/recrutement/candidatures/:id
 * Met à jour une candidature
 */
export async function updateCandidature(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const candidature = await recrutementService.updateCandidature(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Candidature mise à jour avec succès',
      data: candidature,
    })
  } catch (err) {
    logError('updateCandidature error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la candidature',
    })
  }
}

// ========== SUIVI CANDIDATURES ==========

/**
 * GET /api/recrutement/candidatures/:id/suivis
 * Récupère tous les suivis d'une candidature
 */
export async function getSuivis(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const suivis = await recrutementService.getSuivisByCandidature(req.params.id)

    return res.json({
      success: true,
      data: suivis,
    })
  } catch (err) {
    logError('getSuivis error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des suivis',
    })
  }
}

/**
 * POST /api/recrutement/suivis
 * Crée un nouveau suivi pour une candidature
 */
export async function createSuivi(req, res) {
  try {
    const suivi = await recrutementService.createSuiviCandidature(req.body)

    return res.status(201).json({
      success: true,
      message: 'Suivi créé avec succès',
      data: suivi,
    })
  } catch (err) {
    logError('createSuivi error', err)
    // Gérer les erreurs de doublon
    if (err.code === 'DUPLICATE_SUIVI') {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_SUIVI',
        message: err.message || 'Un suivi identique existe déjà pour cette candidature.',
      })
    }
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création du suivi',
    })
  }
}

/**
 * PUT /api/recrutement/suivis/:id
 * Met à jour un suivi
 */
export async function updateSuivi(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const suivi = await recrutementService.updateSuiviCandidature(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Suivi mis à jour avec succès',
      data: suivi,
    })
  } catch (err) {
    logError('updateSuivi error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du suivi',
    })
  }
}

/**
 * DELETE /api/recrutement/suivis/:id
 * Supprime un suivi
 */
export async function deleteSuivi(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    await recrutementService.deleteSuiviCandidature(req.params.id)

    return res.json({
      success: true,
      message: 'Suivi supprimé avec succès',
    })
  } catch (err) {
    logError('deleteSuivi error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression du suivi',
    })
  }
}

// ========== RECOMMANDATIONS ==========

/**
 * GET /api/recrutement/recommandations
 * Liste toutes les recommandations avec pagination
 */
export async function listRecommandations(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await recrutementService.getAllRecommandations({
      ...pagination.data,
    })

    return res.json({
      success: true,
      data: result.recommandations,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listRecommandations error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des recommandations',
    })
  }
}

/**
 * GET /api/recrutement/recommandations/:id
 * Récupère une recommandation par son ID
 */
export async function getRecommandation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const recommandation = await recrutementService.getRecommandationById(req.params.id)

    if (!recommandation) {
      return res.status(404).json({
        success: false,
        message: 'Recommandation introuvable',
      })
    }

    return res.json({
      success: true,
      data: recommandation,
    })
  } catch (err) {
    logError('getRecommandation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération de la recommandation',
    })
  }
}

/**
 * POST /api/recrutement/recommandations
 * Crée une nouvelle recommandation
 */
export async function createRecommandation(req, res) {
  try {
    const recommandation = await recrutementService.createRecommandation(req.body)

    return res.status(201).json({
      success: true,
      message: 'Recommandation créée avec succès',
      data: recommandation,
    })
  } catch (err) {
    logError('createRecommandation error', err)
    // Gérer les erreurs de doublon
    if (err.code === 'DUPLICATE_RECOMMANDATION') {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_RECOMMANDATION',
        message: err.message || 'Une recommandation existe déjà pour ce binôme mentor/mentoré.',
      })
    }
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la recommandation',
    })
  }
}

/**
 * PUT /api/recrutement/recommandations/:id
 * Met à jour une recommandation
 */
export async function updateRecommandation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const recommandation = await recrutementService.updateRecommandation(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Recommandation mise à jour avec succès',
      data: recommandation,
    })
  } catch (err) {
    logError('updateRecommandation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la recommandation',
    })
  }
}

/**
 * DELETE /api/recrutement/recommandations/:id
 * Supprime une recommandation
 */
export async function deleteRecommandation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    await recrutementService.deleteRecommandation(req.params.id)

    return res.json({
      success: true,
      message: 'Recommandation supprimée avec succès',
    })
  } catch (err) {
    logError('deleteRecommandation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression de la recommandation',
    })
  }
}

// ========== STATISTIQUES ==========

/**
 * GET /api/recrutement/stats
 * Récupère les statistiques du module recrutement
 */
export async function getStats(req, res) {
  try {
    const stats = await recrutementService.getRecrutementStats()

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
