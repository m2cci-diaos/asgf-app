// src/config/supabase.config.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Client pour le schéma adhesion (par défaut)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'adhesion',
  },
})

// Client pour le schéma formation
// Utilise un identifiant de stockage différent pour éviter les conflits
export const supabaseFormation = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'formation',
  },
  auth: {
    storageKey: 'asgf-formation-auth',
  },
})

// Client pour le schéma webinaire
export const supabaseWebinaire = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'webinaire',
  },
  auth: {
    storageKey: 'asgf-webinaire-auth',
  },
})
