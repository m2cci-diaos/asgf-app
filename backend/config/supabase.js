// backend/config/supabase.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE manquants dans le .env du backend'
  )
}

// 👉 client pour le schéma "admin" (table admin.admins, admins_modules)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'admin' },
})

// 👉 client pour le schéma "adhesion" (table adhesion.members)
export const supabaseAdhesion = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    db: { schema: 'adhesion' },
  }
)

// 👉 client pour le schéma "formation" (table formation.formations, inscriptions)
export const supabaseFormation = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    db: { schema: 'formation' },
  }
)

// 👉 client pour le schéma "mentorat" (tables mentorat.mentors, mentees, relations, objectifs, rendezvous)
export const supabaseMentorat = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    db: { schema: 'mentorat' },
  }
)

// 👉 client pour le schéma "recrutement" (tables recrutement.candidatures, recommandations, suivi_candidatures)
export const supabaseRecrutement = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    db: { schema: 'recrutement' },
  }
)

// 👉 client pour le schéma "tresorerie" (tables tresorerie.cotisations, paiements, relances, cartes_membres, historique)
export const supabaseTresorerie = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    db: { schema: 'tresorerie' },
  }
)

// 👉 client pour le schéma "secretariat" (tables secretariat.reunions, invitations, comptes_rendus, actions, documents)
export const supabaseSecretariat = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    db: { schema: 'secretariat' },
  }
)

// 👉 client pour le schéma "webinaire" (tables webinaire.webinaires, inscriptions, presentateurs, stats)
export const supabaseWebinaire = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    db: { schema: 'webinaire' },
  }
)
