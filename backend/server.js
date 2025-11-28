// backend/server.js

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

// Import des routes
import authRoutes from './routes/auth.routes.js'
import adminRoutes from './routes/admin.routes.js'
import adhesionRoutes from './routes/adhesion.routes.js'
import formationRoutes from './routes/formation.routes.js'
import mentoratRoutes from './routes/mentorat.routes.js'
import recrutementRoutes from './routes/recrutement.routes.js'
import tresorerieRoutes from './routes/tresorerie.routes.js'
import secretariatRoutes from './routes/secretariat.routes.js'
import webinaireRoutes from './routes/webinaire.routes.js'
import geocodeRoutes from './routes/geocode.routes.js'
import contactRoutes from './routes/contact.routes.js'
import publicRoutes from './routes/public.routes.js'
import {
  sendFormationInvitationController,
  sendFormationReminderController,
} from './controllers/formation.controller.js'

// Import du gestionnaire d'erreurs
import { errorHandler } from './middlewares/errorHandler.js'

// Création de l'application Express
const app = express()

// Middlewares globaux
app.use(cors())
// Augmenter la limite pour permettre l'upload de photos et pièces jointes en base64
// 3 fichiers de 5MB chacun = ~20MB en base64 (base64 augmente la taille de ~33%)
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// Route de test racine
app.get('/', (req, res) => {
  res.json({ message: 'API ASGF Admin OK' })
})

// Routes principales
app.use('/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/adhesion', adhesionRoutes)
app.use('/api/formation', formationRoutes)
app.use('/api/mentorat', mentoratRoutes)
app.use('/api/recrutement', recrutementRoutes)
app.use('/api/tresorerie', tresorerieRoutes)
app.use('/api/secretariat', secretariatRoutes)
app.use('/api/webinaire', webinaireRoutes)
app.use('/api/geocode', geocodeRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/public', publicRoutes)

// Routes directes pour les invitations / rappels de formation
// (assure que ces endpoints existent même si le routeur formation évolue)
import { requireAuth, requireModule } from './middlewares/auth.js'
import { MODULES } from './config/constants.js'

app.post(
  '/api/formation/inscriptions/:id/invitation',
  requireAuth,
  requireModule(MODULES.FORMATION),
  sendFormationInvitationController
)
app.post(
  '/api/formation/sessions/:id/reminder',
  requireAuth,
  requireModule(MODULES.FORMATION),
  sendFormationReminderController
)

// Log des routes enregistrées (pour debug)
console.log('📋 Routes enregistrées:')
console.log('  - /auth')
console.log('  - /api/admin')
console.log('  - /api/adhesion')
console.log('  - /api/formation')
console.log('  - /api/mentorat')
console.log('  - /api/recrutement')
console.log('  - /api/tresorerie')
console.log('  - /api/secretariat')
console.log('  - /api/webinaire')
console.log('  - /api/geocode')
console.log('  - /api/contact')
console.log('  - /api/public')

// Routes de compatibilité pour l'ancien endpoint /admin/members
import {
  getPendingMembersController,
  approveMemberController,
  rejectMemberController,
} from './controllers/adhesion.controller.js'

app.get('/admin/members/pending', requireAuth, requireModule(MODULES.ADHESION), getPendingMembersController)
app.post('/admin/members/:id/approve', requireAuth, requireModule(MODULES.ADHESION), approveMemberController)
app.post('/admin/members/:id/reject', requireAuth, requireModule(MODULES.ADHESION), rejectMemberController)

// Gestionnaire d'erreurs (doit être le dernier middleware)
app.use(errorHandler)

// Lancement du serveur
const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`🚀 Backend ASGF Admin lancé sur http://localhost:${PORT}`)
})
