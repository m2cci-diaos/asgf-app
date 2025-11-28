// backend/middlewares/auth.js
import { verifyToken } from '../utils/jwt.js'
import { supabase } from '../config/supabase.js'
import { logError } from '../utils/logger.js'
import { ROLE_TYPES } from '../config/constants.js'

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Token manquant' 
      })
    }

    const token = header.split(' ')[1]
    const payload = verifyToken(token)
    req.admin = payload
    next()
  } catch (err) {
    logError('Auth error', { message: err.message })
    return res.status(401).json({ 
      success: false,
      message: 'Token invalide ou expiré' 
    })
  }
}

// Vérifie que l'admin a accès à un module donné
export function requireModule(moduleName) {
  return async (req, res, next) => {
    try {
      const adminId = req.admin?.id
      if (!adminId) {
        return res.status(401).json({ message: 'Non authentifié' })
      }

      // Les superadmins ont accès global (masters) ou scoped
      if (req.admin.is_master) {
        return next()
      }

      if (req.admin.role_type === ROLE_TYPES.SUPERADMIN) {
        const scopedModules = Array.isArray(req.admin.super_scope) ? req.admin.super_scope : []
        if (scopedModules.length === 0 || scopedModules.includes(moduleName)) {
          return next()
        }
      }

      const { data, error } = await supabase
        .from('admins_modules')
        .select('id')
        .eq('admin_id', adminId)
        .eq('module', moduleName)
        .maybeSingle()

      if (error) {
        logError('requireModule error', error)
        return res.status(500).json({ 
          success: false,
          message: 'Erreur serveur' 
        })
      }

      if (!data) {
        logError('requireModule: Accès refusé', { adminId, moduleName, ip: req.ip })
        return res.status(403).json({ 
          success: false,
          message: `Accès refusé au module ${moduleName}` 
        })
      }

      next()
    } catch (err) {
      logError('requireModule exception', err)
      return res.status(500).json({ 
        success: false,
        message: 'Erreur serveur' 
      })
    }
  }
}
