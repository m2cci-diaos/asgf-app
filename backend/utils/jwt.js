// backend/utils/jwt.js
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
// Token valide 7 jours, mais l'inactivité de 15 min est gérée côté frontend
const JWT_EXPIRES_IN = '7d'

export function signAdminToken(admin) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET non configuré dans les variables d\'environnement')
  }

  return jwt.sign(
    {
      id: admin.id,
      numero_membre: admin.numero_membre,
      role_type: admin.role_type,
      super_scope: admin.super_scope || [],
      is_master: admin.is_master,
      iat: Math.floor(Date.now() / 1000), // Issued at
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET non configuré')
  }

  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token expiré')
    }
    if (err.name === 'JsonWebTokenError') {
      throw new Error('Token invalide')
    }
    throw err
  }
}
