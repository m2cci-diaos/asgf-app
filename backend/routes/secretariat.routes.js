// backend/routes/secretariat.routes.js
import { Router } from 'express'
import {
  listReunions,
  getReunion,
  createReunion,
  updateReunion,
  getParticipants,
  addParticipant,
  updateParticipant,
  getCompteRendu,
  saveCompteRendu,
  getActions,
  createAction,
  updateAction,
  listDocuments,
  createDocument,
  updateDocument,
  getStats,
} from '../controllers/secretariat.controller.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Vérifier l'accès au module Secrétariat
router.use(requireModule(MODULES.SECRETARIAT))

// Routes pour les réunions
router.get('/reunions', listReunions)
router.get('/reunions/:id', getReunion)
router.post('/reunions', createReunion)
router.put('/reunions/:id', updateReunion)

// Routes pour les participants
router.get('/reunions/:id/participants', getParticipants)
router.post('/participants', addParticipant)
router.put('/participants/:id', updateParticipant)

// Routes pour les comptes rendus
router.get('/reunions/:id/compte-rendu', getCompteRendu)
router.post('/comptes-rendus', saveCompteRendu)

// Routes pour les actions
router.get('/reunions/:id/actions', getActions)
router.post('/actions', createAction)
router.put('/actions/:id', updateAction)

// Routes pour les documents
router.get('/documents', listDocuments)
router.post('/documents', createDocument)
router.put('/documents/:id', updateDocument)

// Route pour les statistiques
router.get('/stats', getStats)

export default router
