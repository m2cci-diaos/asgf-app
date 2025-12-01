// Script pour créer le bucket Storage "bureau-photos" dans Supabase
// Usage: node backend/scripts/create-bureau-photos-bucket.js

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

async function createBureauPhotosBucket() {
  try {
    console.log('🔄 Création du bucket "bureau-photos"...')

    // Vérifier si le bucket existe déjà
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Erreur lors de la vérification des buckets:', listError)
      throw listError
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'bureau-photos')
    
    if (bucketExists) {
      console.log('✅ Le bucket "bureau-photos" existe déjà')
      return
    }

    // Créer le bucket
    const { data, error } = await supabase.storage.createBucket('bureau-photos', {
      public: true, // Bucket public pour que les photos soient accessibles
      fileSizeLimit: 5242880, // 5 MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    })

    if (error) {
      // Si l'erreur indique que le bucket existe déjà, c'est OK
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log('✅ Le bucket "bureau-photos" existe déjà')
        return
      }
      console.error('❌ Erreur lors de la création du bucket:', error)
      throw error
    }

    console.log('✅ Bucket "bureau-photos" créé avec succès !')
    console.log('📋 Configuration:')
    console.log('   - Public: ✅')
    console.log('   - Taille max fichier: 5 MB')
    console.log('   - Types MIME autorisés: image/jpeg, image/png, image/gif, image/webp')
    
  } catch (err) {
    console.error('❌ Erreur:', err.message || err)
    console.error('\n💡 Si le script échoue, créez le bucket manuellement:')
    console.error('   1. Allez dans Supabase Dashboard > Storage')
    console.error('   2. Cliquez sur "New bucket"')
    console.error('   3. Nom: "bureau-photos"')
    console.error('   4. Public: ✅ (coché)')
    console.error('   5. File size limit: 5 MB')
    console.error('   6. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp')
    process.exit(1)
  }
}

createBureauPhotosBucket()



