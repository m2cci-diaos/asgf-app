// Script de test pour vérifier la connexion au schéma organisation
import { supabaseOrganisation } from '../config/supabase.js'

async function testConnection() {
  console.log('🔍 Test de connexion au schéma organisation...\n')
  
  try {
    const { data, error } = await supabaseOrganisation
      .from('bureau_members')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Erreur Supabase:')
      console.error('  Code:', error.code)
      console.error('  Message:', error.message)
      console.error('  Details:', error.details)
      console.error('  Hint:', error.hint)
      
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('\n⚠️  La table organisation.bureau_members n\'existe pas encore!')
        console.error('   Veuillez exécuter le script SQL: backend/sql/organisation_bureau_members.sql')
      }
      return
    }

    console.log('✅ Connexion réussie!')
    console.log('   La table organisation.bureau_members existe.')
    
    // Compter les membres
    const { count, error: countError } = await supabaseOrganisation
      .from('bureau_members')
      .select('*', { count: 'exact', head: true })
    
    if (!countError) {
      console.log(`   Nombre de membres: ${count || 0}`)
    }
  } catch (err) {
    console.error('❌ Erreur inattendue:', err.message)
    console.error(err.stack)
  }
}

testConnection()






