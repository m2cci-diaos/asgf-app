// backend/routes/projets.routes.js
import { Router } from 'express'
import {
  createInscriptionController,
  listInscriptionsController,
  updateInscriptionStatusController,
} from '../controllers/projets.controller.js'
import {
  listProjetsController,
  getProjetController,
  createProjetController,
  updateProjetController,
  deleteProjetController,
  getInscriptionController,
  updateInscriptionController,
  deleteInscriptionController,
} from '../controllers/projets-admin.controller.js'
import { rateLimiter } from '../middlewares/rateLimiter.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Route publique pour l'inscription (limitée pour éviter le spam)
router.post(
  '/inscription',
  rateLimiter(5, 60 * 1000), // 5 inscriptions par minute
  createInscriptionController
)

// Routes publiques pour récupérer les projets actifs
router.get('/projets', listProjetsController)
router.get('/projets/:id', getProjetController)

// Routes protégées pour l'admin - Gestion des projets
router.post('/projets', requireAuth, requireModule(MODULES.PROJETS), createProjetController)
router.put('/projets/:id', requireAuth, requireModule(MODULES.PROJETS), updateProjetController)
router.delete('/projets/:id', requireAuth, requireModule(MODULES.PROJETS), deleteProjetController)

// Routes protégées pour l'admin - Gestion des inscriptions
router.get('/inscriptions', requireAuth, requireModule(MODULES.PROJETS), listInscriptionsController)
router.get('/inscriptions/:id', requireAuth, requireModule(MODULES.PROJETS), getInscriptionController)
router.patch('/inscriptions/:id/status', requireAuth, requireModule(MODULES.PROJETS), updateInscriptionStatusController)
router.put('/inscriptions/:id', requireAuth, requireModule(MODULES.PROJETS), updateInscriptionController)
router.delete('/inscriptions/:id', requireAuth, requireModule(MODULES.PROJETS), deleteInscriptionController)

export default router

