import { logError } from '../utils/logger.js'

const geocodeCache = new Map()

function buildQueryKey(adresse = '', ville = '', pays = '') {
  return [adresse, ville, pays]
    .map((value) => (value || '').trim().toLowerCase())
    .filter(Boolean)
    .join(', ')
}

export async function geocodeAddress(req, res) {
  try {
    const { adresse = '', ville = '', pays = '' } = req.query

    if (!adresse && !ville && !pays) {
      return res.status(400).json({
        success: false,
        message: 'Adresse, ville ou pays requis pour le géocodage',
      })
    }

    const queryKey = buildQueryKey(adresse, ville, pays)
    if (!queryKey) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres de géocodage invalides',
      })
    }

    if (geocodeCache.has(queryKey)) {
      return res.json({
        success: true,
        data: geocodeCache.get(queryKey),
      })
    }

    const searchParams = new URLSearchParams({
      q: queryKey,
      format: 'json',
      addressdetails: '1',
      limit: '1',
    })

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`, {
      headers: {
        'User-Agent': process.env.GEOCODE_USER_AGENT || 'ASGF-Admin/1.0 (contact@asgf.org)',
        'Accept-Language': 'fr',
      },
    })

    if (!response.ok) {
      throw new Error('Service de géocodage indisponible')
    }

    const results = await response.json()
    const match = Array.isArray(results) && results.length > 0 ? results[0] : null

    const payload = match
      ? {
          lat: parseFloat(match.lat),
          lng: parseFloat(match.lon),
          display_name: match.display_name,
        }
      : null

    if (payload) {
      geocodeCache.set(queryKey, payload)
    }

    return res.json({
      success: true,
      data: payload,
    })
  } catch (err) {
    logError('geocodeAddress error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors du géocodage',
    })
  }
}

