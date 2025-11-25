// backend/scripts/generateHash.js
import bcrypt from 'bcryptjs'

const PASSWORD = 'AdminASGF_2025!'   // choisis TON mot de passe ici

const SALT_ROUNDS = 10

async function run() {
  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS)
  console.log('Mot de passe en clair :', PASSWORD)
  console.log('Hash à copier dans Supabase :', hash)
}

run()
