// backend/controllers/tresorerie.controller.js
import * as tresorerieService from '../services/tresorerie.service.js'
import { validateId, validatePagination } from '../utils/validators.js'
import { logError } from '../utils/logger.js'

// ========== COTISATIONS ==========

/**
 * GET /api/tresorerie/cotisations
 * Liste toutes les cotisations avec pagination
 */
export async function listCotisations(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await tresorerieService.getAllCotisations({
      ...pagination.data,
      search: req.query.search || '',
      annee: req.query.annee || '',
      statut_paiement: req.query.statut_paiement || '',
    })

    return res.json({
      success: true,
      data: result.cotisations,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listCotisations error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des cotisations',
    })
  }
}

/**
 * GET /api/tresorerie/cotisations/:id
 * Récupère une cotisation par son ID
 */
export async function getCotisation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const cotisation = await tresorerieService.getCotisationById(req.params.id)

    if (!cotisation) {
      return res.status(404).json({
        success: false,
        message: 'Cotisation introuvable',
      })
    }

    return res.json({
      success: true,
      data: cotisation,
    })
  } catch (err) {
    logError('getCotisation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération de la cotisation',
    })
  }
}

/**
 * POST /api/tresorerie/cotisations
 * Crée une nouvelle cotisation
 */
export async function createCotisation(req, res) {
  try {
    const cotisation = await tresorerieService.createCotisation(req.body)

    return res.status(201).json({
      success: true,
      message: 'Cotisation créée avec succès',
      data: cotisation,
    })
  } catch (err) {
    logError('createCotisation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la cotisation',
    })
  }
}

/**
 * PUT /api/tresorerie/cotisations/:id
 * Met à jour une cotisation
 */
export async function updateCotisation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const cotisation = await tresorerieService.updateCotisation(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Cotisation mise à jour avec succès',
      data: cotisation,
    })
  } catch (err) {
    logError('updateCotisation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la cotisation',
    })
  }
}

export async function validateCotisationAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const cotisation = await tresorerieService.validateCotisation(req.params.id, {
      date_paiement: req.body?.date_paiement || null,
      admin_id: req.user?.id || null,
    })

    if (!cotisation) {
      return res.status(404).json({
        success: false,
        message: 'Cotisation introuvable',
      })
    }

    return res.json({
      success: true,
      message: 'Cotisation validée',
      data: cotisation,
    })
  } catch (err) {
    logError('validateCotisationAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la validation de la cotisation',
    })
  }
}

export async function resetCotisationAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const cotisation = await tresorerieService.resetCotisation(req.params.id, {
      admin_id: req.user?.id || null,
    })

    if (!cotisation) {
      return res.status(404).json({
        success: false,
        message: 'Cotisation introuvable',
      })
    }

    return res.json({
      success: true,
      message: 'Cotisation remise en attente',
      data: cotisation,
    })
  } catch (err) {
    logError('resetCotisationAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la remise en attente de la cotisation',
    })
  }
}

export async function deleteCotisationAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const removed = await tresorerieService.deleteCotisation(req.params.id, {
      admin_id: req.user?.id || null,
    })

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Cotisation introuvable',
      })
    }

    return res.json({
      success: true,
      message: 'Cotisation supprimée',
    })
  } catch (err) {
    logError('deleteCotisationAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression de la cotisation',
    })
  }
}

// ========== PAIEMENTS ==========

/**
 * GET /api/tresorerie/paiements
 * Liste tous les paiements avec pagination
 */
export async function listPaiements(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await tresorerieService.getAllPaiements({
      ...pagination.data,
      search: req.query.search || '',
      type_paiement: req.query.type_paiement || '',
      statut: req.query.statut || '',
    })

    return res.json({
      success: true,
      data: result.paiements,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listPaiements error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des paiements',
    })
  }
}

/**
 * POST /api/tresorerie/paiements
 * Crée un nouveau paiement
 */
export async function createPaiement(req, res) {
  try {
    const paiement = await tresorerieService.createPaiement(req.body)

    return res.status(201).json({
      success: true,
      message: 'Paiement créé avec succès',
      data: paiement,
    })
  } catch (err) {
    logError('createPaiement error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création du paiement',
    })
  }
}

/**
 * PUT /api/tresorerie/paiements/:id
 * Met à jour un paiement
 */
export async function updatePaiement(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const paiement = await tresorerieService.updatePaiement(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Paiement mis à jour avec succès',
      data: paiement,
    })
  } catch (err) {
    logError('updatePaiement error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du paiement',
    })
  }
}

export async function validatePaiementAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const paiement = await tresorerieService.validatePaiement(req.params.id, {
      date_paiement: req.body?.date_paiement || null,
      admin_id: req.user?.id || null,
    })

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: 'Paiement introuvable',
      })
    }

    return res.json({
      success: true,
      message: 'Paiement validé',
      data: paiement,
    })
  } catch (err) {
    logError('validatePaiementAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la validation du paiement',
    })
  }
}

export async function cancelPaiementAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const paiement = await tresorerieService.cancelPaiement(req.params.id, {
      admin_id: req.user?.id || null,
      reason: req.body?.reason || '',
    })

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: 'Paiement introuvable',
      })
    }

    return res.json({
      success: true,
      message: 'Paiement annulé',
      data: paiement,
    })
  } catch (err) {
    logError('cancelPaiementAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de l’annulation du paiement',
    })
  }
}

export async function deletePaiementAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const removed = await tresorerieService.deletePaiement(req.params.id, {
      admin_id: req.user?.id || null,
    })

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Paiement introuvable',
      })
    }

    return res.json({
      success: true,
      message: 'Paiement supprimé',
    })
  } catch (err) {
    logError('deletePaiementAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression du paiement',
    })
  }
}

// ========== DEPENSES ==========

export async function listDepenses(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await tresorerieService.getAllDepenses({
      ...pagination.data,
      statut: req.query.statut || '',
      categorie: req.query.categorie || '',
    })

    return res.json({
      success: true,
      data: result.depenses,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listDepenses error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des dépenses',
    })
  }
}

export async function createDepense(req, res) {
  try {
    const depense = await tresorerieService.createDepense(req.body)
    return res.status(201).json({
      success: true,
      message: 'Dépense créée avec succès',
      data: depense,
    })
  } catch (err) {
    logError('createDepense error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la dépense',
    })
  }
}

export async function updateDepense(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const depense = await tresorerieService.updateDepense(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Dépense mise à jour avec succès',
      data: depense,
    })
  } catch (err) {
    logError('updateDepense error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la dépense',
    })
  }
}

export async function validateDepenseAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const depense = await tresorerieService.validateDepense(req.params.id, {
      admin_id: req.user?.id || null,
    })

    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense introuvable',
      })
    }

    return res.json({
      success: true,
      message: 'Dépense validée',
      data: depense,
    })
  } catch (err) {
    logError('validateDepenseAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la validation de la dépense',
    })
  }
}

export async function rejectDepenseAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const depense = await tresorerieService.rejectDepense(req.params.id, {
      admin_id: req.user?.id || null,
      reason: req.body?.reason || '',
    })

    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense introuvable',
      })
    }

    return res.json({
      success: true,
      message: 'Dépense rejetée',
      data: depense,
    })
  } catch (err) {
    logError('rejectDepenseAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors du rejet de la dépense',
    })
  }
}

export async function deleteDepenseAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const removed = await tresorerieService.deleteDepense(req.params.id, {
      admin_id: req.user?.id || null,
    })

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Dépense introuvable',
      })
    }

    return res.json({
      success: true,
      message: 'Dépense supprimée',
    })
  } catch (err) {
    logError('deleteDepenseAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression de la dépense',
    })
  }
}

// ========== RELANCES ==========

/**
 * GET /api/tresorerie/relances
 * Liste toutes les relances avec pagination
 */
export async function listRelances(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await tresorerieService.getAllRelances({
      ...pagination.data,
      annee: req.query.annee || '',
      type_relance: req.query.type_relance || '',
      statut: req.query.statut || '',
    })

    return res.json({
      success: true,
      data: result.relances,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listRelances error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des relances',
    })
  }
}

/**
 * POST /api/tresorerie/relances
 * Crée une nouvelle relance
 */
export async function createRelance(req, res) {
  try {
    const relance = await tresorerieService.createRelance(req.body)

    return res.status(201).json({
      success: true,
      message: 'Relance créée avec succès',
      data: relance,
    })
  } catch (err) {
    logError('createRelance error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la relance',
    })
  }
}

// ========== CARTES MEMBRES ==========

/**
 * GET /api/tresorerie/cartes
 * Liste toutes les cartes membres avec pagination
 */
export async function listCartes(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await tresorerieService.getAllCartesMembres({
      ...pagination.data,
      search: req.query.search || '',
      statut_carte: req.query.statut_carte || '',
      statut_paiement: req.query.statut_paiement || '',
    })

    return res.json({
      success: true,
      data: result.cartes,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listCartes error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des cartes membres',
    })
  }
}

/**
 * POST /api/tresorerie/cartes
 * Crée une nouvelle carte membre
 */
export async function createCarte(req, res) {
  try {
    const carte = await tresorerieService.createCarteMembre(req.body)

    return res.status(201).json({
      success: true,
      message: 'Carte membre créée avec succès',
      data: carte,
    })
  } catch (err) {
    logError('createCarte error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la carte membre',
    })
  }
}

/**
 * PUT /api/tresorerie/cartes/:id
 * Met à jour une carte membre
 */
export async function updateCarte(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const carte = await tresorerieService.updateCarteMembre(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Carte membre mise à jour avec succès',
      data: carte,
    })
  } catch (err) {
    logError('updateCarte error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la carte membre',
    })
  }
}

/**
 * GET /api/tresorerie/cartes/numero/:numero
 * Récupère la carte membre par numero_membre
 */
export async function getCarteByNumero(req, res) {
  try {
    const { numero } = req.params
    if (!numero) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de membre est requis',
      })
    }

    const carte = await tresorerieService.getCarteMembreByNumero(numero)

    return res.json({
      success: true,
      data: carte,
    })
  } catch (err) {
    logError('getCarteByNumero error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération de la carte membre',
    })
  }
}

// ========== HISTORIQUE ==========

export async function listHistorique(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await tresorerieService.getHistorique({
      ...pagination.data,
      action: req.query.action || '',
    })

    return res.json({
      success: true,
      data: result.historique,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listHistorique error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération de l’historique',
    })
  }
}

export async function createHistorique(req, res) {
  try {
    const entry = await tresorerieService.createHistoriqueEntry(req.body)
    return res.status(201).json({
      success: true,
      message: 'Entrée ajoutée à l’historique',
      data: entry,
    })
  } catch (err) {
    logError('createHistorique error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de l’entrée',
    })
  }
}

// ========== STATISTIQUES ==========

/**
 * GET /api/tresorerie/stats
 * Récupère les statistiques du module trésorerie
 */
export async function getStats(req, res) {
  try {
    const stats = await tresorerieService.getTresorerieStats()

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

function buildExportFilters(query = {}) {
  const filters = {}
  if (query.periode_mois) {
    filters.periode_mois = parseInt(query.periode_mois, 10)
  }
  if (query.periode_annee) {
    filters.periode_annee = parseInt(query.periode_annee, 10)
  }
  if (query.membre_id) {
    filters.membre_id = query.membre_id
  }
  if (query.statut) {
    filters.statut = query.statut
  }
  if (query.type_paiement) {
    filters.type_paiement = query.type_paiement
  }
  return filters
}

export async function exportCotisations(req, res) {
  try {
    const filters = buildExportFilters(req.query)
    const format = (req.query.format || 'csv').toLowerCase()
    const result = await tresorerieService.generateCotisationsExport({ format, filters })

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
    return res.send(result.buffer)
  } catch (err) {
    logError('exportCotisations error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la génération de l’export cotisations',
    })
  }
}

export async function exportPaiements(req, res) {
  try {
    const filters = buildExportFilters(req.query)
    const format = (req.query.format || 'csv').toLowerCase()
    const result = await tresorerieService.generatePaiementsExport({ format, filters })

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
    return res.send(result.buffer)
  } catch (err) {
    logError('exportPaiements error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la génération de l’export paiements',
    })
  }
}

export async function exportDepenses(req, res) {
  try {
    const filters = buildExportFilters(req.query)
    const format = (req.query.format || 'csv').toLowerCase()
    const result = await tresorerieService.generateDepensesExport({ format, filters })

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
    return res.send(result.buffer)
  } catch (err) {
    logError('exportDepenses error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la génération de l’export dépenses',
    })
  }
}

export async function downloadMonthlyReport(req, res) {
  try {
    const filters = buildExportFilters(req.query)
    const result = await tresorerieService.generateMonthlyReportPdf(filters)

    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
    return res.send(result.buffer)
  } catch (err) {
    logError('downloadMonthlyReport error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la génération du rapport PDF',
    })
  }
}
