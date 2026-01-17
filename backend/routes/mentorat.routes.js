// backend/routes/mentorat.routes.js
import { Router } from 'express'
import {
  listMentors,
  getMentor,
  createMentor,
  updateMentor,
  listMentees,
  getMentee,
  createMentee,
  updateMentee,
  listRelations,
  getRelation,
  createRelation,
  updateRelation,
  closeRelation,
  getObjectifs,
  createObjectif,
  updateObjectif,
  getRendezVous,
  createRendezVous,
  updateRendezVous,
  getStats,
} from '../controllers/mentorat.controller.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Vérifier l'accès au module Mentorat
router.use(requireModule(MODULES.MENTORAT))

// Routes pour les mentors
router.get('/mentors', listMentors)
router.get('/mentors/:id', getMentor)
router.post('/mentors', createMentor)
router.put('/mentors/:id', updateMentor)

// Routes pour les mentorés
router.get('/mentees', listMentees)
router.get('/mentees/:id', getMentee)
router.post('/mentees', createMentee)
router.put('/mentees/:id', updateMentee)

// Routes pour les relations (binômes)
router.get('/relations', listRelations)
router.get('/relations/:id', getRelation)
router.post('/relations', createRelation)
router.put('/relations/:id', updateRelation)
router.post('/relations/:id/close', closeRelation)

// Routes pour les objectifs
router.get('/relations/:id/objectifs', getObjectifs)
router.post('/objectifs', createObjectif)
router.put('/objectifs/:id', updateObjectif)

// Routes pour les rendez-vous
router.get('/relations/:id/rendezvous', getRendezVous)
router.post('/rendezvous', createRendezVous)
router.put('/rendezvous/:id', updateRendezVous)

// Route pour les statistiques
router.get('/stats', getStats)

export default router
