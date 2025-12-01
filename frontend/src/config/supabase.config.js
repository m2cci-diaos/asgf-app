// frontend/src/config/supabase.config.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants dans les variables d\'environnement')
}

// Client Supabase pour l'upload de fichiers (Storage)
export const supabaseStorage = createClient(supabaseUrl, supabaseAnonKey)



