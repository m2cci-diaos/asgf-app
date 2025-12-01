// backend/routes/secretariat/participants.js
import { Router } from 'express'
import {
  getParticipants,
  addParticipant,
  updateParticipant,
  updateParticipantsPresence,
} from '../../controllers/secretariat.controller.js'
import { requireAuth, requireModule } from '../../middlewares/auth.js'
import { MODULES } from '../../config/constants.js'

const router = Router()

router.use(requireAuth)
router.use(requireModule(MODULES.SECRETARIAT))

router.get('/reunions/:id/participants', getParticipants)
router.post('/', addParticipant)
router.put('/:id', updateParticipant)
router.put('/reunions/:id/presence', updateParticipantsPresence)

export default router





