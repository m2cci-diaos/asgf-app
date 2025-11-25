import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

router.get('/test-supabase', async (req, res) => {
  try {
   const { data, error } = await supabase
  .from('members')   // Mets une table qui existe vraiment
  .select('*')
  .limit(1)


    if (error) {
      console.error(error)
      return res.status(500).json({ error: error.message })
    }

    res.json({
      message: 'Connexion Supabase OK 👍',
      data,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
