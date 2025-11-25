// backend/routes/tresorerie.routes.js
import { Router } from 'express'
import {
  listCotisations,
  getCotisation,
  createCotisation,
  updateCotisation,
  validateCotisationAction,
  resetCotisationAction,
  deleteCotisationAction,
  listPaiements,
  createPaiement,
  updatePaiement,
  validatePaiementAction,
  cancelPaiementAction,
  deletePaiementAction,
  listDepenses,
  createDepense,
  updateDepense,
  validateDepenseAction,
  rejectDepenseAction,
  deleteDepenseAction,
  listRelances,
  createRelance,
  listCartes,
  createCarte,
  updateCarte,
  listHistorique,
  createHistorique,
  getStats,
  exportCotisations,
  exportPaiements,
  exportDepenses,
  downloadMonthlyReport,
} from '../controllers/tresorerie.controller.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Vérifier l'accès au module Trésorerie
router.use(requireModule(MODULES.TRESORERIE))

// Routes pour les cotisations
router.get('/cotisations', listCotisations)
router.get('/cotisations/:id', getCotisation)
router.post('/cotisations', createCotisation)
router.put('/cotisations/:id', updateCotisation)
router.post('/cotisations/:id/validate', validateCotisationAction)
router.post('/cotisations/:id/reset', resetCotisationAction)
router.delete('/cotisations/:id', deleteCotisationAction)

// Routes pour les paiements
router.get('/paiements', listPaiements)
router.post('/paiements', createPaiement)
router.put('/paiements/:id', updatePaiement)
router.post('/paiements/:id/validate', validatePaiementAction)
router.post('/paiements/:id/cancel', cancelPaiementAction)
router.delete('/paiements/:id', deletePaiementAction)

// Routes pour les dépenses
router.get('/depenses', listDepenses)
router.post('/depenses', createDepense)
router.put('/depenses/:id', updateDepense)
router.post('/depenses/:id/validate', validateDepenseAction)
router.post('/depenses/:id/reject', rejectDepenseAction)
router.delete('/depenses/:id', deleteDepenseAction)

// Routes pour les relances
router.get('/relances', listRelances)
router.post('/relances', createRelance)

// Routes pour les cartes membres
router.get('/cartes', listCartes)
router.post('/cartes', createCarte)
router.put('/cartes/:id', updateCarte)

// Routes pour l'historique
router.get('/historique', listHistorique)
router.post('/historique', createHistorique)

// Route pour les statistiques
router.get('/stats', getStats)

// Routes pour les exports
router.get('/exports/cotisations', exportCotisations)
router.get('/exports/paiements', exportPaiements)
router.get('/exports/depenses', exportDepenses)

// Rapport PDF
router.get('/reports/mensuel', downloadMonthlyReport)

export default router
