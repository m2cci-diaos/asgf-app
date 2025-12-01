// backend/controllers/bureau.controller.js
import { supabaseOrganisation } from '../config/supabase.js'
import { logError } from '../utils/logger.js'

// GET /api/bureau - Route publique pour récupérer les membres du bureau
export async function getBureauMembersController(req, res) {
  try {
    const { data, error } = await supabaseOrganisation
      .from('bureau_members')
      .select('*')
      .eq('is_active', true)
      .order('categorie', { ascending: true })
      .order('ordre', { ascending: true })

    if (error) {
      logError('Error fetching bureau members - Supabase error', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      // Si la table n'existe pas, retourner un tableau vide plutôt qu'une erreur
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json({
          direction: [],
          pole: [],
          autre: [],
        })
      }
      throw error
    }

    // Regrouper par catégorie
    const grouped = {
      direction: [],
      pole: [],
      autre: [],
    }

    if (data && Array.isArray(data)) {
      data.forEach((m) => {
        if (grouped[m.categorie]) {
          grouped[m.categorie].push(m)
        }
      })
    }

    res.json(grouped)
  } catch (err) {
    logError('Error fetching bureau members', {
      message: err.message,
      stack: err.stack,
      error: err,
    })
    res.status(500).json({ 
      success: false,
      message: 'Erreur chargement bureau',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
}

// GET /api/admin/bureau - Route admin pour récupérer tous les membres (y compris inactifs)
export async function getAllBureauMembersController(req, res) {
  try {
    const { data, error } = await supabaseOrganisation
      .from('bureau_members')
      .select('*')
      .order('categorie', { ascending: true })
      .order('ordre', { ascending: true })

    if (error) {
      logError('Error fetching all bureau members - Supabase error', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      // Si la table n'existe pas, retourner un tableau vide
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json({ 
          success: true,
          data: []
        })
      }
      throw error
    }

    res.json({ 
      success: true,
      data: data || []
    })
  } catch (err) {
    logError('Error fetching all bureau members', {
      message: err.message,
      stack: err.stack,
      error: err,
    })
    res.status(500).json({ 
      success: false,
      message: 'Erreur chargement bureau',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
}

// POST /api/admin/bureau - Créer un membre du bureau
export async function createBureauMemberController(req, res) {
  try {
    const payload = req.body

    // Validation des champs requis
    if (!payload.prenom || !payload.nom || !payload.role_court || !payload.role_long || !payload.categorie) {
      return res.status(400).json({ 
        success: false,
        message: 'Champs requis manquants' 
      })
    }

    const { data, error } = await supabaseOrganisation
      .from('bureau_members')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ 
      success: true,
      data 
    })
  } catch (err) {
    logError('Error creating bureau member', err)
    res.status(500).json({ 
      success: false,
      message: 'Erreur création membre' 
    })
  }
}

// PUT /api/admin/bureau/:id - Mettre à jour un membre du bureau
export async function updateBureauMemberController(req, res) {
  try {
    const { id } = req.params
    const payload = req.body

    const { data, error } = await supabaseOrganisation
      .from('bureau_members')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ 
        success: false,
        message: 'Membre non trouvé' 
      })
    }

    res.json({ 
      success: true,
      data 
    })
  } catch (err) {
    logError('Error updating bureau member', err)
    res.status(500).json({ 
      success: false,
      message: 'Erreur mise à jour membre' 
    })
  }
}

// DELETE /api/admin/bureau/:id - Soft delete d'un membre
export async function deleteBureauMemberController(req, res) {
  try {
    const { id } = req.params

    const { error } = await supabaseOrganisation
      .from('bureau_members')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    res.status(204).end()
  } catch (err) {
    logError('Error deleting bureau member', err)
    res.status(500).json({ 
      success: false,
      message: 'Erreur suppression membre' 
    })
  }
}

// POST /api/admin/bureau/:id/photo - Upload une photo pour un membre
// Accepte un fichier en base64 dans le body: { file: 'data:image/jpeg;base64,...', fileName: 'photo.jpg' }
export async function uploadBureauMemberPhotoController(req, res) {
  try {
    const { id } = req.params
    const { file: fileBase64, fileName } = req.body

    if (!fileBase64) {
      return res.status(400).json({ 
        success: false,
        message: 'Aucun fichier fourni' 
      })
    }

    // Extraire le type MIME et les données base64
    const matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ 
        success: false,
        message: 'Format de fichier invalide. Attendu: data:image/...;base64,...' 
      })
    }

    const mimeType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    // Déterminer l'extension du fichier
    const fileExt = fileName ? fileName.split('.').pop() : (mimeType.includes('jpeg') ? 'jpg' : mimeType.split('/')[1])
    const finalFileName = `member-${id}.${fileExt}`
    const filePath = `photos/${finalFileName}`

    // Utiliser le client Supabase avec service_role pour l'upload
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE
    
    const supabaseStorage = createClient(supabaseUrl, supabaseServiceKey)

    // Upload du fichier
    const { data: uploadData, error: uploadError } = await supabaseStorage.storage
      .from('bureau-photos')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadError) {
      logError('Error uploading photo to storage', uploadError)
      throw uploadError
    }

    // Obtenir l'URL publique
    const { data: publicUrlData } = supabaseStorage.storage
      .from('bureau-photos')
      .getPublicUrl(filePath)

    // Mettre à jour le membre avec la photo_url
    const { data: memberData, error: updateError } = await supabaseOrganisation
      .from('bureau_members')
      .update({ 
        photo_url: publicUrlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logError('Error updating member photo_url', updateError)
      throw updateError
    }

    res.json({ 
      success: true,
      data: {
        photo_url: publicUrlData.publicUrl,
        member: memberData
      }
    })
  } catch (err) {
    logError('Error uploading bureau member photo', err)
    res.status(500).json({ 
      success: false,
      message: 'Erreur upload photo',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
}

