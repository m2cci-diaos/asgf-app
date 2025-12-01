// backend/controllers/mentorat.controller.js
import * as mentoratService from '../services/mentorat.service.js'
import { validateId, validatePagination } from '../utils/validators.js'
import { logError } from '../utils/logger.js'

// ========== MENTORS ==========

/**
 * GET /api/mentorat/mentors
 * Liste tous les mentors avec pagination
 */
export async function listMentors(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await mentoratService.getAllMentors({
      ...pagination.data,
      search: req.query.search || '',
      domaine: req.query.domaine || '',
      status: req.query.status || '',
    })

    return res.json({
      success: true,
      data: result.mentors,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listMentors error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des mentors',
    })
  }
}

/**
 * GET /api/mentorat/mentors/:id
 * Récupère un mentor par son ID
 */
export async function getMentor(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const mentor = await mentoratService.getMentorById(req.params.id)

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor introuvable',
      })
    }

    return res.json({
      success: true,
      data: mentor,
    })
  } catch (err) {
    logError('getMentor error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération du mentor',
    })
  }
}

/**
 * POST /api/mentorat/mentors
 * Crée un nouveau mentor
 */
export async function createMentor(req, res) {
  try {
    const mentor = await mentoratService.createMentor(req.body)

    return res.status(201).json({
      success: true,
      message: 'Mentor créé avec succès',
      data: mentor,
    })
  } catch (err) {
    logError('createMentor error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création du mentor',
    })
  }
}

/**
 * PUT /api/mentorat/mentors/:id
 * Met à jour un mentor
 */
export async function updateMentor(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const mentor = await mentoratService.updateMentor(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Mentor mis à jour avec succès',
      data: mentor,
    })
  } catch (err) {
    logError('updateMentor error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du mentor',
    })
  }
}

// ========== MENTEES ==========

/**
 * GET /api/mentorat/mentees
 * Liste tous les mentorés avec pagination
 */
export async function listMentees(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await mentoratService.getAllMentees({
      ...pagination.data,
      search: req.query.search || '',
      domaine: req.query.domaine || '',
      status: req.query.status || '',
    })

    return res.json({
      success: true,
      data: result.mentees,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listMentees error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des mentorés',
    })
  }
}

/**
 * GET /api/mentorat/mentees/:id
 * Récupère un mentoré par son ID
 */
export async function getMentee(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const mentee = await mentoratService.getMenteeById(req.params.id)

    if (!mentee) {
      return res.status(404).json({
        success: false,
        message: 'Mentoré introuvable',
      })
    }

    return res.json({
      success: true,
      data: mentee,
    })
  } catch (err) {
    logError('getMentee error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération du mentoré',
    })
  }
}

/**
 * POST /api/mentorat/mentees
 * Crée un nouveau mentoré
 */
export async function createMentee(req, res) {
  try {
    const mentee = await mentoratService.createMentee(req.body)

    return res.status(201).json({
      success: true,
      message: 'Mentoré créé avec succès',
      data: mentee,
    })
  } catch (err) {
    logError('createMentee error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création du mentoré',
    })
  }
}

/**
 * PUT /api/mentorat/mentees/:id
 * Met à jour un mentoré
 */
export async function updateMentee(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const mentee = await mentoratService.updateMentee(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Mentoré mis à jour avec succès',
      data: mentee,
    })
  } catch (err) {
    logError('updateMentee error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du mentoré',
    })
  }
}

// ========== RELATIONS (BINÔMES) ==========

/**
 * GET /api/mentorat/relations
 * Liste toutes les relations mentor/mentoré
 */
export async function listRelations(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await mentoratService.getAllRelations({
      ...pagination.data,
      status: req.query.status || '',
    })

    return res.json({
      success: true,
      data: result.relations,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listRelations error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des relations',
    })
  }
}

/**
 * GET /api/mentorat/relations/:id
 * Récupère une relation par son ID
 */
export async function getRelation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const relation = await mentoratService.getRelationById(req.params.id)

    if (!relation) {
      return res.status(404).json({
        success: false,
        message: 'Relation introuvable',
      })
    }

    return res.json({
      success: true,
      data: relation,
    })
  } catch (err) {
    logError('getRelation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération de la relation',
    })
  }
}

/**
 * POST /api/mentorat/relations
 * Crée une nouvelle relation mentor/mentoré
 */
export async function createRelation(req, res) {
  try {
    const relation = await mentoratService.createRelation(req.body)

    return res.status(201).json({
      success: true,
      message: 'Relation créée avec succès',
      data: relation,
    })
  } catch (err) {
    logError('createRelation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de la relation',
    })
  }
}

/**
 * PUT /api/mentorat/relations/:id
 * Met à jour une relation
 */
export async function updateRelation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const relation = await mentoratService.updateRelation(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Relation mise à jour avec succès',
      data: relation,
    })
  } catch (err) {
    logError('updateRelation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de la relation',
    })
  }
}

/**
 * POST /api/mentorat/relations/:id/close
 * Clôture une relation (statut 'terminée' + date_fin)
 */
export async function closeRelation(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const commentaire = req.body.commentaire || null
    const relation = await mentoratService.closeRelation(req.params.id, commentaire)

    return res.json({
      success: true,
      message: 'Relation clôturée avec succès',
      data: relation,
    })
  } catch (err) {
    logError('closeRelation error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la clôture de la relation',
    })
  }
}

// ========== OBJECTIFS ==========

/**
 * GET /api/mentorat/relations/:id/objectifs
 * Récupère tous les objectifs d'une relation
 */
export async function getObjectifs(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const objectifs = await mentoratService.getObjectifsByRelation(req.params.id)

    return res.json({
      success: true,
      data: objectifs,
    })
  } catch (err) {
    logError('getObjectifs error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des objectifs',
    })
  }
}

/**
 * POST /api/mentorat/objectifs
 * Crée un nouvel objectif
 */
export async function createObjectif(req, res) {
  try {
    const objectif = await mentoratService.createObjectif(req.body)

    return res.status(201).json({
      success: true,
      message: 'Objectif créé avec succès',
      data: objectif,
    })
  } catch (err) {
    logError('createObjectif error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création de l\'objectif',
    })
  }
}

/**
 * PUT /api/mentorat/objectifs/:id
 * Met à jour un objectif
 */
export async function updateObjectif(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const objectif = await mentoratService.updateObjectif(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Objectif mis à jour avec succès',
      data: objectif,
    })
  } catch (err) {
    logError('updateObjectif error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de l\'objectif',
    })
  }
}

// ========== RENDEZ-VOUS ==========

/**
 * GET /api/mentorat/relations/:id/rendezvous
 * Récupère tous les rendez-vous d'une relation
 */
export async function getRendezVous(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const rendezvous = await mentoratService.getRendezVousByRelation(req.params.id)

    return res.json({
      success: true,
      data: rendezvous,
    })
  } catch (err) {
    logError('getRendezVous error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des rendez-vous',
    })
  }
}

/**
 * POST /api/mentorat/rendezvous
 * Crée un nouveau rendez-vous
 */
export async function createRendezVous(req, res) {
  try {
    const rdv = await mentoratService.createRendezVous(req.body)

    return res.status(201).json({
      success: true,
      message: 'Rendez-vous créé avec succès',
      data: rdv,
    })
  } catch (err) {
    logError('createRendezVous error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la création du rendez-vous',
    })
  }
}

/**
 * PUT /api/mentorat/rendezvous/:id
 * Met à jour un rendez-vous
 */
export async function updateRendezVous(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const rdv = await mentoratService.updateRendezVous(req.params.id, req.body)

    return res.json({
      success: true,
      message: 'Rendez-vous mis à jour avec succès',
      data: rdv,
    })
  } catch (err) {
    logError('updateRendezVous error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du rendez-vous',
    })
  }
}

// ========== STATISTIQUES ==========

/**
 * GET /api/mentorat/stats
 * Récupère les statistiques du module mentorat
 */
export async function getStats(req, res) {
  try {
    const stats = await mentoratService.getMentoratStats()

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
