// backend/utils/jwt.js
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '7d'

export function signAdminToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      numero_membre: admin.numero_membre,
      role_global: admin.role_global,
      is_master: admin.is_master,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}
