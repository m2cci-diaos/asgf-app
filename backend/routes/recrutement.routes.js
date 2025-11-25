// backend/routes/recrutement.routes.js
import { Router } from 'express'
import {
  listCandidatures,
  getCandidature,
  createCandidature,
  updateCandidature,
  getSuivis,
  createSuivi,
  updateSuivi,
  deleteSuivi,
  listRecommandations,
  getRecommandation,
  createRecommandation,
  updateRecommandation,
  deleteRecommandation,
  getStats,
} from '../controllers/recrutement.controller.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Vérifier l'accès au module Recrutement
router.use(requireModule(MODULES.RECRUTEMENT))

// Routes pour les candidatures
router.get('/candidatures', listCandidatures)
router.get('/candidatures/:id', getCandidature)
router.post('/candidatures', createCandidature)
router.put('/candidatures/:id', updateCandidature)

// Routes pour les suivis de candidatures
router.get('/candidatures/:id/suivis', getSuivis)
router.post('/suivis', createSuivi)
router.put('/suivis/:id', updateSuivi)
router.delete('/suivis/:id', deleteSuivi)

// Routes pour les recommandations
router.get('/recommandations', listRecommandations)
router.get('/recommandations/:id', getRecommandation)
router.post('/recommandations', createRecommandation)
router.put('/recommandations/:id', updateRecommandation)
router.delete('/recommandations/:id', deleteRecommandation)

// Route pour les statistiques
router.get('/stats', getStats)

export default router
