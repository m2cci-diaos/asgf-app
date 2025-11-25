// backend/utils/hashPassword.js
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS)
}

export async function comparePassword(plainPassword, hash) {
  if (!hash) return false
  return await bcrypt.compare(plainPassword, hash)
}
