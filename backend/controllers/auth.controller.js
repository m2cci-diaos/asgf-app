// backend/controllers/auth.controller.js
import { logAction, ACTION_TYPES, ENTITY_TYPES } from '../services/audit.service.js'
import { supabase } from '../config/supabase.js'
import { comparePassword, hashPassword } from '../utils/hashPassword.js'
import { signAdminToken, verifyToken } from '../utils/jwt.js'
import { logError, logInfo } from '../utils/logger.js'

// 👉 Login avec email OU numero_membre + password
export async function loginAdmin(req, res) {
  try {
    const { email, password, numero_membre } = req.body

    if (!password || (!email && !numero_membre)) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe + email ou numero_membre requis',
      })
    }

    // On peut se connecter soit avec l'email, soit avec le numéro de membre
    let query = supabase
      .from('admins')
      .select('id, numero_membre, role_type, super_scope, is_master, is_active, password_hash, email, disabled_until, disabled_reason')
      .limit(1)

    if (email) {
      query = query.eq('email', email)
    } else if (numero_membre) {
      query = query.eq('numero_membre', numero_membre)
    }

    const { data: admins, error } = await query

    if (error) {
      logError('loginAdmin error', error)
      return res.status(500).json({ 
        success: false,
        message: 'Erreur serveur' 
      })
    }

    const admin = admins?.[0]

    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Compte introuvable' 
      })
    }

    // Compte désactivé définitivement
    if (!admin.is_active) {
      return res.status(401).json({ 
        success: false,
        message: 'Compte désactivé par un superadmin' 
      })
    }

    // Suspension temporaire
    if (admin.disabled_until) {
      const disabledUntilDate = new Date(admin.disabled_until)
      const now = new Date()
      if (disabledUntilDate > now) {
        return res.status(423).json({
          success: false,
          message: `Compte suspendu jusqu'au ${disabledUntilDate.toLocaleString('fr-FR')}`,
        })
      }

      // Suspension expirée : nettoyage automatique
      await supabase
        .from('admins')
        .update({ disabled_until: null, disabled_reason: null })
        .eq('id', admin.id)
    }

    const ok = await comparePassword(password, admin.password_hash)
    if (!ok) {
      return res.status(401).json({ 
        success: false,
        message: 'Identifiants invalides' 
      })
    }

    const token = signAdminToken(admin)

    // Récupérer les modules autorisés
    const { data: modules, error: modError } = await supabase
      .from('admins_modules')
      .select('module')
      .eq('admin_id', admin.id)

    if (modError) {
      logError('loginAdmin modules error', modError)
    }

    logInfo('Admin connecté', { id: admin.id, email: admin.email })

    // Logger la connexion dans l'audit log
    logAction({
      adminId: admin.id,
      adminEmail: admin.email,
      adminNom: admin.nom || `${admin.prenom || ''} ${admin.nom || ''}`.trim(),
      actionType: ACTION_TYPES.LOGIN,
      entityType: ENTITY_TYPES.ADMIN,
      module: 'auth',
      metadata: { success: true },
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    }).catch(err => console.error('Erreur audit log login (non bloquant):', err))

    return res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        admin: {
          id: admin.id,
          numero_membre: admin.numero_membre,
          role_type: admin.role_type,
          is_master: admin.is_master,
          super_scope: admin.super_scope || [],
          email: admin.email,
          disabled_reason: admin.disabled_reason,
          disabled_until: admin.disabled_until,
          modules: (modules || []).map(m => m.module),
        },
      },
    })
  } catch (err) {
    logError('loginAdmin exception', err)
    return res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    })
  }
}

// 👉 Retourne les informations de l'admin connecté
export async function getMe(req, res) {
  try {
    const adminId = req.admin?.id

    // Récupérer les informations complètes de l'admin avec ses modules
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, numero_membre, email, role_type, super_scope, is_master, is_active, created_at, disabled_until, disabled_reason')
      .eq('id', adminId)
      .maybeSingle()

    if (adminError || !admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin introuvable',
      })
    }

    // Récupérer les modules
    const { data: modules, error: modError } = await supabase
      .from('admins_modules')
      .select('module')
      .eq('admin_id', adminId)

    if (modError) {
      logError('getMe modules error', modError)
    }

    return res.json({
      success: true,
      data: {
        ...admin,
        modules: (modules || []).map(m => m.module),
      },
    })
  } catch (err) {
    logError('getMe exception', err)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    })
  }
}

// 👉 Permet de changer le mot de passe (on garde la route, ça servira)
export async function changePassword(req, res) {
  try {
    const adminId = req.admin?.id
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Ancien et nouveau mot de passe requis' 
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' 
      })
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, password_hash')
      .eq('id', adminId)
      .maybeSingle()

    if (error || !admin) {
      logError('changePassword error', error)
      return res.status(404).json({ 
        success: false,
        message: 'Admin introuvable' 
      })
    }

    const ok = await comparePassword(oldPassword, admin.password_hash)
    if (!ok) {
      return res.status(401).json({ 
        success: false,
        message: 'Ancien mot de passe incorrect' 
      })
    }

    const newHash = await hashPassword(newPassword)

    const { error: updateError } = await supabase
      .from('admins')
      .update({ password_hash: newHash })
      .eq('id', adminId)

    if (updateError) {
      logError('changePassword update error', updateError)
      return res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la mise à jour du mot de passe' 
      })
    }

    logInfo('Mot de passe changé', { id: adminId })
    return res.json({ 
      success: true,
      message: 'Mot de passe mis à jour avec succès' 
    })
  } catch (err) {
    logError('changePassword exception', err)
    return res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    })
  }
}

// 👉 Refresh token (vérifie et renvoie un nouveau token si valide)
export async function refreshToken(req, res) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant',
      })
    }

    const token = header.split(' ')[1]
    const payload = verifyToken(token)

    // Vérifier que l'admin existe toujours et est actif
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, numero_membre, role_type, super_scope, is_master, is_active')
      .eq('id', payload.id)
      .maybeSingle()

    if (error || !admin || !admin.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Admin introuvable ou désactivé',
      })
    }

    // Générer un nouveau token
    const newToken = signAdminToken(admin)

    return res.json({
      success: true,
      data: {
        token: newToken,
      },
    })
  } catch (err) {
    logError('refreshToken exception', err)
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré',
    })
  }
}

// 👉 Logout (côté serveur, on ne fait rien de spécial, le client supprime le token)
export async function logout(req, res) {
  try {
    logInfo('Admin déconnecté', { id: req.admin?.id })
    
    // Logger la déconnexion dans l'audit log
    if (req.admin) {
      logAction({
        adminId: req.admin.id,
        adminEmail: req.admin.email,
        adminNom: req.admin.nom || `${req.admin.prenom || ''} ${req.admin.nom || ''}`.trim(),
        actionType: ACTION_TYPES.LOGOUT,
        entityType: ENTITY_TYPES.ADMIN,
        module: 'auth',
        metadata: { success: true },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      }).catch(err => console.error('Erreur audit log logout (non bloquant):', err))
    }
    
    return res.json({
      success: true,
      message: 'Déconnexion réussie',
    })
  } catch (err) {
    logError('logout exception', err)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    })
  }
}
