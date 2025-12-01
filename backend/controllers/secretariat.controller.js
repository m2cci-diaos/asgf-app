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
 * Ajoute un ou plusieurs participants à une réunion
 */
export async function addParticipant(req, res) {
  try {
    // Si le body contient un tableau, ajouter plusieurs participants
    if (Array.isArray(req.body)) {
      const participants = await secretariatService.addMultipleParticipants(req.body)
      return res.status(201).json({
        success: true,
        message: `${participants.length} participant(s) ajouté(s) avec succès`,
        data: participants,
      })
    }
    
    // Sinon, ajouter un seul participant
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
 * GET /api/secretariat/actions
 * Récupère toutes les actions d'une réunion ou toutes les actions
 */
export async function getActions(req, res) {
  try {
    // Si reunion_id dans params, récupérer actions de la réunion
    if (req.params.id) {
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
    }

    // Sinon, récupérer toutes les actions (avec filtres optionnels)
    const actions = await secretariatService.getAllActions({
      assigne_a: req.query.assigne_a,
      statut: req.query.statut,
      limit: req.query.limit || 50,
    })

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

/**
 * DELETE /api/secretariat/actions/:id
 * Supprime une action
 */
export async function deleteAction(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    await secretariatService.deleteAction(req.params.id)

    return res.json({
      success: true,
      message: 'Action supprimée avec succès',
    })
  } catch (err) {
    logError('deleteAction error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression de l\'action',
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

/**
 * PUT /api/secretariat/reunions/:id/participants/presence
 * Met à jour la présence de plusieurs participants
 */
export async function updateParticipantsPresence(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const { participants } = req.body
    if (!Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ participants doit être un tableau',
      })
    }

    const updated = await secretariatService.updateParticipantsPresence(req.params.id, participants)

    return res.json({
      success: true,
      message: 'Présence mise à jour avec succès',
      data: updated,
    })
  } catch (err) {
    logError('updateParticipantsPresence error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la présence',
    })
  }
}

/**
 * GET /api/secretariat/reunions/:id/generate-pdf
 * POST /api/secretariat/comptes-rendus/reunions/:id/pdf
 * Génère un PDF pour une réunion
 */
export async function generateReunionPDF(req, res) {
  try {
    const reunionId = req.params.id
    const idValidation = validateId(reunionId)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const pdfBuffer = await secretariatService.generateReunionPDF(reunionId)

    // Définir les en-têtes pour le téléchargement
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="reunion-${reunionId}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    return res.send(pdfBuffer)
  } catch (err) {
    logError('generateReunionPDF error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la génération du PDF',
    })
  }
}

/**
 * POST /api/secretariat/rapport-presidence
 * Génère un rapport pour la présidence
 */
export async function generateRapportPresidence(req, res) {
  try {
    const { periode_type, periode_debut, periode_fin, options, send_email } = req.body

    if (!periode_type || !periode_debut || !periode_fin) {
      return res.status(400).json({
        success: false,
        message: 'periode_type, periode_debut et periode_fin sont requis',
      })
    }

    const rapportService = await import('../services/secretariat.rapports.service.js')
    const result = await rapportService.generateRapportPresidence({
      periode_type,
      periode_debut,
      periode_fin,
      options: options || {},
      genere_par: req.user?.id,
    })

    // TODO: Si send_email est true, envoyer l'email au Président
    if (send_email) {
      // await sendEmailToPresident(result)
      logInfo('Email au Président demandé (non implémenté)', { rapportId: result.id })
    }

    return res.status(201).json({
      success: true,
      message: 'Rapport généré avec succès',
      data: result,
    })
  } catch (err) {
    logError('generateRapportPresidence error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la génération du rapport',
    })
  }
}

/**
 * GET /api/secretariat/rapport-presidence
 * Récupère les rapports présidence
 */
export async function getRapportsPresidence(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const rapportService = await import('../services/secretariat.rapports.service.js')
    const result = await rapportService.getRapportsPresidence({
      page: pagination.data.page,
      limit: pagination.data.limit,
    })

    return res.json({
      success: true,
      data: result.rapports,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('getRapportsPresidence error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des rapports',
    })
  }
}

/**
 * GET /api/secretariat/members/by-email
 * Trouve un membre par email
 */
export async function findMemberByEmail(req, res) {
  try {
    const { email } = req.query

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis',
      })
    }

    const member = await secretariatService.findMemberByEmail(email)

    return res.json({
      success: true,
      data: member,
    })
  } catch (err) {
    logError('findMemberByEmail error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la recherche du membre',
    })
  }
}
