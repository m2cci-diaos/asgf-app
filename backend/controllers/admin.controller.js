// backend/controllers/admin.controller.js
import {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deactivateAdmin,
  getAdminModules,
  updateAdminModules,
  getAvailableModules,
  getAdminStats,
} from '../services/admin.service.js'
import { validateCreateAdmin, validateUpdateAdmin, validateUpdateModules, validateId, validatePagination } from '../utils/validators.js'
import { logError } from '../utils/logger.js'

/**
 * GET /api/admin/admins
 * Liste tous les admins avec pagination
 */
export async function listAdmins(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await getAllAdmins(pagination.data)
    return res.json({
      success: true,
      data: result.admins,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listAdmins error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des admins',
    })
  }
}

/**
 * GET /api/admin/admins/:id
 * Récupère un admin par son ID
 */
export async function getAdmin(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const admin = await getAdminById(req.params.id)

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin introuvable',
      })
    }

    return res.json({
      success: true,
      data: admin,
    })
  } catch (err) {
    logError('getAdmin error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération de l\'admin',
    })
  }
}

/**
 * POST /api/admin/admins
 * Crée un nouvel admin
 */
export async function createAdminController(req, res) {
  try {
    const validation = validateCreateAdmin(req.body)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: validation.errors,
      })
    }

    const admin = await createAdmin(req.body)
    return res.status(201).json({
      success: true,
      message: 'Admin créé avec succès',
      data: admin,
    })
  } catch (err) {
    logError('createAdminController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la création de l\'admin',
    })
  }
}

/**
 * PUT /api/admin/admins/:id
 * Met à jour un admin
 */
export async function updateAdminController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const validation = validateUpdateAdmin(req.body)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: validation.errors,
      })
    }

    const admin = await updateAdmin(req.params.id, req.body)
    return res.json({
      success: true,
      message: 'Admin mis à jour avec succès',
      data: admin,
    })
  } catch (err) {
    logError('updateAdminController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de l\'admin',
    })
  }
}

/**
 * DELETE /api/admin/admins/:id
 * Désactive un admin
 */
export async function deleteAdmin(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    // Empêcher la désactivation de soi-même
    if (req.params.id === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte',
      })
    }

    const { reason, disabled_until } = req.body || {}
    const result = await deactivateAdmin(req.params.id, { reason, disabled_until })
    return res.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    logError('deleteAdmin error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la désactivation de l\'admin',
    })
  }
}

/**
 * GET /api/admin/admins/:id/modules
 * Récupère les modules d'un admin
 */
export async function getAdminModulesController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const modules = await getAdminModules(req.params.id)
    return res.json({
      success: true,
      data: modules,
    })
  } catch (err) {
    logError('getAdminModulesController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des modules',
    })
  }
}

/**
 * PUT /api/admin/admins/:id/modules
 * Met à jour les modules d'un admin
 */
export async function updateAdminModulesController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const validation = validateUpdateModules(req.body)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: validation.errors,
      })
    }

    const modules = await updateAdminModules(req.params.id, req.body.modules)
    return res.json({
      success: true,
      message: 'Modules mis à jour avec succès',
      data: modules,
    })
  } catch (err) {
    logError('updateAdminModulesController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour des modules',
    })
  }
}

/**
 * GET /api/admin/modules
 * Récupère la liste de tous les modules disponibles
 */
export async function getModules(req, res) {
  try {
    const modules = getAvailableModules()
    return res.json({
      success: true,
      data: modules,
    })
  } catch (err) {
    logError('getModules error', err)
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des modules',
    })
  }
}

/**
 * GET /api/admin/stats
 * Récupère les statistiques globales
 */
export async function getStats(req, res) {
  try {
    const stats = await getAdminStats()
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
