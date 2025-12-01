// backend/routes/bureau.routes.js
import { Router } from 'express'
import {
  getBureauMembersController,
  getAllBureauMembersController,
  createBureauMemberController,
  updateBureauMemberController,
  deleteBureauMemberController,
  uploadBureauMemberPhotoController,
} from '../controllers/bureau.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

// Route publique - GET /api/bureau
router.get('/bureau', getBureauMembersController)

// Routes admin - nécessitent authentification
// GET /api/admin/bureau - Liste tous les membres (y compris inactifs)
router.get('/admin/bureau', requireAuth, getAllBureauMembersController)

// POST /api/admin/bureau - Créer un membre
router.post('/admin/bureau', requireAuth, createBureauMemberController)

// PUT /api/admin/bureau/:id - Mettre à jour un membre
router.put('/admin/bureau/:id', requireAuth, updateBureauMemberController)

// DELETE /api/admin/bureau/:id - Désactiver un membre (soft delete)
router.delete('/admin/bureau/:id', requireAuth, deleteBureauMemberController)

// POST /api/admin/bureau/:id/photo - Upload une photo pour un membre
router.post('/admin/bureau/:id/photo', requireAuth, uploadBureauMemberPhotoController)

export default router

