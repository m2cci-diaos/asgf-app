// backend/routes/auth.routes.js
import { Router } from 'express'
import { loginAdmin, getMe, changePassword, refreshToken, logout } from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { strictRateLimiter } from '../middlewares/rateLimiter.js'

const router = Router()

// Route de login avec rate limiting strict
router.post('/login', strictRateLimiter(), loginAdmin)

// Route de refresh token
router.post('/refresh', refreshToken)

// Routes protégées nécessitant une authentification
router.get('/me', requireAuth, getMe)
router.post('/change-password', requireAuth, changePassword)
router.post('/logout', requireAuth, logout)

export default router
