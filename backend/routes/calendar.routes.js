// backend/routes/calendar.routes.js
import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { getCalendarEventsController } from '../controllers/calendar.controller.js'

const router = Router()

// Toutes les routes nécessitent l'authentification
// Mais pas requireModule car calendar est accessible à tous les admins
router.use(requireAuth)

router.get('/events', getCalendarEventsController)

export default router




