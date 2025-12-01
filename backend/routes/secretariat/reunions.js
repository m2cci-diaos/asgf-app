// backend/routes/secretariat/reunions.js
import { Router } from 'express'
import {
  listReunions,
  getReunion,
  createReunion,
  updateReunion,
  getParticipants,
  getCompteRendu,
  getActions,
  generateReunionPDF,
} from '../../controllers/secretariat.controller.js'
import { requireAuth, requireModule } from '../../middlewares/auth.js'
import { MODULES } from '../../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)
router.use(requireModule(MODULES.SECRETARIAT))

router.get('/', listReunions)
router.post('/', createReunion)

// Routes imbriquées pour les participants, compte-rendu et actions (doivent être avant /:id)
router.get('/:id/participants', getParticipants)
router.get('/:id/compte-rendu', getCompteRendu)
router.get('/:id/actions', getActions)
router.get('/:id/generate-pdf', generateReunionPDF)

// Routes pour une réunion spécifique (doivent être après les routes imbriquées)
router.get('/:id', getReunion)
router.put('/:id', updateReunion)

export default router

