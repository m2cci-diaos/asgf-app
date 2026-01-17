// backend/routes/contact.routes.js
import { Router } from 'express'
import {
  changeContactMessageStatus,
  createContactMessage,
  getContactMessages,
} from '../controllers/contact.controller.js'
import { rateLimiter } from '../middlewares/rateLimiter.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Route publique pour le formulaire de contact (limitée pour éviter le spam)
router.post('/messages', rateLimiter(10, 60 * 1000), createContactMessage)

// Routes protégées pour l'admin
router.use(requireAuth, requireModule(MODULES.CONTACT))

router.get('/messages', getContactMessages)
router.patch('/messages/:id/status', changeContactMessageStatus)

export default router











