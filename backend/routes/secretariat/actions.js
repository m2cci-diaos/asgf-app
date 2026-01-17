// backend/routes/secretariat/actions.js
import { Router } from 'express'
import {
  getActions,
  createAction,
  updateAction,
  deleteAction,
} from '../../controllers/secretariat.controller.js'

const router = Router()

// Les middlewares sont déjà appliqués dans secretariat.routes.js
router.get('/reunions/:id/actions', getActions)
router.get('/', getActions) // Pour récupérer toutes les actions
router.post('/', createAction)
router.put('/:id', updateAction)
router.delete('/:id', deleteAction)

export default router


