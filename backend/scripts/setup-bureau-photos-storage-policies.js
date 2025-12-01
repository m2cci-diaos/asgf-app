// Script pour configurer les politiques de storage pour le bucket "bureau-photos"
// Usage: node backend/scripts/setup-bureau-photos-storage-policies.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE manquants dans le .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStoragePolicies() {
  try {
    console.log('🔄 Configuration des politiques de storage pour "bureau-photos"...')

    // Les politiques de storage dans Supabase doivent être créées via l'API REST
    // ou via l'interface. Le client JavaScript ne permet pas de créer des politiques directement.
    
    // Vérifier que le bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Erreur lors de la vérification des buckets:', listError)
      throw listError
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'bureau-photos')
    
    if (!bucketExists) {
      console.error('❌ Le bucket "bureau-photos" n\'existe pas. Exécutez d\'abord:')
      console.error('   node backend/scripts/create-bureau-photos-bucket.js')
      process.exit(1)
    }

    console.log('✅ Le bucket "bureau-photos" existe')
    console.log('\n📋 Pour configurer les politiques de storage, suivez ces étapes:')
    console.log('\n1. Allez dans Supabase Dashboard > Storage > bureau-photos > Policies')
    console.log('\n2. Créez les politiques suivantes:\n')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('POLITIQUE 1: Lecture publique')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Policy name: "Allow public read access"')
    console.log('Operation: SELECT')
    console.log('Target roles: anon, authenticated')
    console.log('Policy definition:')
    console.log('  bucket_id = \'bureau-photos\'::text')
    console.log('')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('POLITIQUE 2: Upload pour tous (anon + authenticated)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Policy name: "Allow uploads to photos folder"')
    console.log('Operation: INSERT')
    console.log('Target roles: anon, authenticated')
    console.log('Policy definition:')
    console.log('  (bucket_id = \'bureau-photos\'::text) AND ((storage.foldername(name))[1] = \'photos\'::text)')
    console.log('')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('POLITIQUE 3: Mise à jour pour tous (anon + authenticated)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Policy name: "Allow update in photos folder"')
    console.log('Operation: UPDATE')
    console.log('Target roles: anon, authenticated')
    console.log('Policy definition:')
    console.log('  (bucket_id = \'bureau-photos\'::text) AND ((storage.foldername(name))[1] = \'photos\'::text)')
    console.log('')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('POLITIQUE 4: Suppression pour tous (anon + authenticated)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Policy name: "Allow delete in photos folder"')
    console.log('Operation: DELETE')
    console.log('Target roles: anon, authenticated')
    console.log('Policy definition:')
    console.log('  (bucket_id = \'bureau-photos\'::text) AND ((storage.foldername(name))[1] = \'photos\'::text)')
    console.log('')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('💡 Note: Ces politiques permettent l\'upload depuis le frontend avec l\'anon key.')
    console.log('   Pour plus de sécurité, vous pouvez restreindre aux "authenticated" uniquement.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
  } catch (err) {
    console.error('❌ Erreur:', err.message || err)
    process.exit(1)
  }
}

setupStoragePolicies()



