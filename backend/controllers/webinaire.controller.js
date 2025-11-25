// backend/controllers/webinaire.controller.js
import {
  getAllWebinaires,
  getWebinaireById,
  createWebinaire,
  updateWebinaire,
  deleteWebinaire,
  getAllInscriptions,
  createInscription,
  updateInscription,
  deleteInscription,
  getPresentateursByWebinaire,
  createPresentateur,
  updatePresentateur,
  deletePresentateur,
  getWebinaireStats,
} from '../services/webinaire.service.js'
import { validateId, validatePagination } from '../utils/validators.js'
import { logError } from '../utils/logger.js'

/**
 * GET /api/webinaire/webinaires
 * Liste toutes les webinaires avec pagination
 */
export async function listWebinaires(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await getAllWebinaires({
      ...pagination.data,
      theme: req.query.theme || '',
      statut: req.query.statut || '',
    })

    return res.json({
      success: true,
      data: result.webinaires,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listWebinaires error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des webinaires',
    })
  }
}

/**
 * GET /api/webinaire/webinaires/:id
 * Récupère un webinaire par son ID
 */
export async function getWebinaire(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const webinaire = await getWebinaireById(req.params.id)

    if (!webinaire) {
      return res.status(404).json({
        success: false,
        message: 'Webinaire introuvable',
      })
    }

    return res.json({
      success: true,
      data: webinaire,
    })
  } catch (err) {
    logError('getWebinaire error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération du webinaire',
    })
  }
}

/**
 * POST /api/webinaire/webinaires
 * Crée un nouveau webinaire
 */
export async function createWebinaireController(req, res) {
  try {
    const { slug, titre, theme, date_webinaire, heure_debut } = req.body

    // Validation basique
    if (!slug || !titre || !theme || !date_webinaire || !heure_debut) {
      return res.status(400).json({
        success: false,
        message: 'Slug, titre, thème, date_webinaire et heure_debut sont requis',
      })
    }

    const webinaire = await createWebinaire(req.body)
    return res.status(201).json({
      success: true,
      message: 'Webinaire créé avec succès',
      data: webinaire,
    })
  } catch (err) {
    logError('createWebinaireController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la création du webinaire',
    })
  }
}

/**
 * PUT /api/webinaire/webinaires/:id
 * Met à jour un webinaire
 */
export async function updateWebinaireController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const webinaire = await updateWebinaire(req.params.id, req.body)
    return res.json({
      success: true,
      message: 'Webinaire mis à jour avec succès',
      data: webinaire,
    })
  } catch (err) {
    logError('updateWebinaireController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du webinaire',
    })
  }
}

/**
 * DELETE /api/webinaire/webinaires/:id
 * Supprime un webinaire (seulement si aucun inscrit)
 */
export async function deleteWebinaireController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const result = await deleteWebinaire(req.params.id)
    return res.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    logError('deleteWebinaireController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression du webinaire',
    })
  }
}

/**
 * GET /api/webinaire/inscriptions
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
      webinaire_id: req.query.webinaire_id || '',
      statut: req.query.statut || '',
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
 * POST /api/webinaire/inscriptions
 * Crée une nouvelle inscription
 */
export async function createInscriptionController(req, res) {
  try {
    const { webinaire_id, prenom, nom, email } = req.body

    if (!webinaire_id || !prenom || !nom || !email) {
      return res.status(400).json({
        success: false,
        message: 'webinaire_id, prenom, nom et email sont requis',
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
 * PUT /api/webinaire/inscriptions/:id
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
 * DELETE /api/webinaire/inscriptions/:id
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
 * GET /api/webinaire/webinaires/:id/presentateurs
 * Récupère les présentateurs d'un webinaire
 */
export async function getPresentateurs(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const presentateurs = await getPresentateursByWebinaire(req.params.id)
    return res.json({
      success: true,
      data: presentateurs,
    })
  } catch (err) {
    logError('getPresentateurs error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des présentateurs',
    })
  }
}

/**
 * POST /api/webinaire/presentateurs
 * Crée un nouveau présentateur
 */
export async function createPresentateurController(req, res) {
  try {
    const { webinaire_id, nom, prenom } = req.body

    if (!webinaire_id || !nom || !prenom) {
      return res.status(400).json({
        success: false,
        message: 'webinaire_id, nom et prenom sont requis',
      })
    }

    const presentateur = await createPresentateur(req.body)
    return res.status(201).json({
      success: true,
      message: 'Présentateur créé avec succès',
      data: presentateur,
    })
  } catch (err) {
    logError('createPresentateurController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la création du présentateur',
    })
  }
}

/**
 * PUT /api/webinaire/presentateurs/:id
 * Met à jour un présentateur
 */
export async function updatePresentateurController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const presentateur = await updatePresentateur(req.params.id, req.body)
    return res.json({
      success: true,
      message: 'Présentateur mis à jour avec succès',
      data: presentateur,
    })
  } catch (err) {
    logError('updatePresentateurController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du présentateur',
    })
  }
}

/**
 * DELETE /api/webinaire/presentateurs/:id
 * Supprime un présentateur
 */
export async function deletePresentateurController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const result = await deletePresentateur(req.params.id)
    return res.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    logError('deletePresentateurController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression du présentateur',
    })
  }
}

/**
 * GET /api/webinaire/stats
 * Récupère les statistiques globales
 */
export async function getStats(req, res) {
  try {
    const stats = await getWebinaireStats()
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
