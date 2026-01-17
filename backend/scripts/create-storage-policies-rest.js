// Script pour créer automatiquement les politiques de storage via l'API REST Supabase
// Usage: node backend/scripts/create-storage-policies-rest.js

import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE manquants dans le .env')
  process.exit(1)
}

async function createStoragePolicies() {
  try {
    console.log('🔄 Création des politiques de storage via l\'API REST...')

    const policies = [
      {
        name: 'Allow public read access',
        operation: 'SELECT',
        roles: ['anon', 'authenticated'],
        definition: "bucket_id = 'bureau-photos'::text"
      },
      {
        name: 'Allow uploads to photos folder',
        operation: 'INSERT',
        roles: ['anon', 'authenticated'],
        definition: "(bucket_id = 'bureau-photos'::text) AND ((storage.foldername(name))[1] = 'photos'::text)"
      },
      {
        name: 'Allow update in photos folder',
        operation: 'UPDATE',
        roles: ['anon', 'authenticated'],
        definition: "(bucket_id = 'bureau-photos'::text) AND ((storage.foldername(name))[1] = 'photos'::text)"
      },
      {
        name: 'Allow delete in photos folder',
        operation: 'DELETE',
        roles: ['anon', 'authenticated'],
        definition: "(bucket_id = 'bureau-photos'::text) AND ((storage.foldername(name))[1] = 'photos'::text)"
      }
    ]

    // L'API REST de Supabase pour les politiques de storage nécessite des appels spécifiques
    // Malheureusement, l'API REST pour les politiques de storage n'est pas directement documentée
    // et nécessite des permissions spéciales. La meilleure approche est de les créer manuellement.
    
    console.log('⚠️  Les politiques de storage doivent être créées manuellement dans Supabase Dashboard.')
    console.log('   L\'API REST pour les politiques de storage n\'est pas directement accessible.')
    console.log('\n📋 Suivez ces étapes:\n')
    console.log('1. Allez dans Supabase Dashboard > Storage > bureau-photos > Policies')
    console.log('2. Cliquez sur "New Policy" pour chaque politique ci-dessous:\n')

    policies.forEach((policy, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`POLITIQUE ${index + 1}: ${policy.name}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`Policy name: "${policy.name}"`)
      console.log(`Operation: ${policy.operation}`)
      console.log(`Target roles: ${policy.roles.join(', ')}`)
      console.log(`Policy definition:`)
      console.log(`  ${policy.definition}`)
      console.log('')
    })

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Une fois les politiques créées, l\'upload depuis le frontend fonctionnera !')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  } catch (err) {
    console.error('❌ Erreur:', err.message || err)
    process.exit(1)
  }
}

createStoragePolicies()






