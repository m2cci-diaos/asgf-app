import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers || {})
  headers.set("Content-Type", "application/json")
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v)
  return new Response(JSON.stringify(body), { ...init, headers })
}

async function verifyJwt(req: Request, jwtSecret: string) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Token manquant")
  }
  const token = authHeader.substring(7)
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  )
  await verify(token, key)
}

function parseUrl(url: string) {
  const u = new URL(url)
  return {
    pathname: u.pathname,
    searchParams: u.searchParams,
  }
}

function buildQueryKey(adresse = "", ville = "", pays = "") {
  return [adresse, ville, pays]
    .map((value) => (value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(", ")
}

Deno.serve(async (req) => {
  // Gérer les requêtes OPTIONS (preflight) en premier
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }

  try {
    // Variables d'environnement
    const jwtSecret = Deno.env.get("JWT_SECRET") || ""

    // Vérifier JWT si secret fourni
    if (jwtSecret) {
      try {
        await verifyJwt(req, jwtSecret)
      } catch (jwtError) {
        return jsonResponse(
          { success: false, message: "Token invalide" },
          { status: 401 },
        )
      }
    }

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/geocode"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/geocode")) {
      relativePath = pathname.substring("/geocode".length)
    }
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // ========== GÉOCODAGE ==========

    // GET /search - Géocode une adresse
    if (req.method === "GET" && relativePath === "search") {
      const adresse = searchParams.get("adresse") || ""
      const ville = searchParams.get("ville") || ""
      const pays = searchParams.get("pays") || ""

      if (!adresse && !ville && !pays) {
        return jsonResponse(
          {
            success: false,
            message: "Adresse, ville ou pays requis pour le géocodage",
          },
          { status: 400 },
        )
      }

      const queryKey = buildQueryKey(adresse, ville, pays)
      if (!queryKey) {
        return jsonResponse(
          {
            success: false,
            message: "Paramètres de géocodage invalides",
          },
          { status: 400 },
        )
      }

      console.log(`Géocodage de: ${queryKey}`)

      // Appeler Nominatim (OpenStreetMap)
      const searchParamsGeocode = new URLSearchParams({
        q: queryKey,
        format: "json",
        addressdetails: "1",
        limit: "1",
      })

      const geocodeUserAgent = Deno.env.get("GEOCODE_USER_AGENT") || "ASGF-Admin/1.0 (contact@asgf.org)"
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${searchParamsGeocode.toString()}`,
          {
            headers: {
              "User-Agent": geocodeUserAgent,
              "Accept-Language": "fr",
            },
          },
        )

        if (!response.ok) {
          console.error(`Erreur Nominatim: ${response.status} ${response.statusText}`)
          throw new Error("Service de géocodage indisponible")
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

        if (!payload) {
          console.log(`Aucun résultat pour: ${queryKey}`)
        } else {
          console.log(`Géocodage réussi: ${payload.lat}, ${payload.lng}`)
        }

        return jsonResponse({
          success: true,
          data: payload,
        })
      } catch (err) {
        console.error("Erreur lors du géocodage:", err)
        return jsonResponse(
          {
            success: false,
            message: (err as Error).message || "Erreur lors du géocodage",
          },
          { status: 500 },
        )
      }
    }

    // Route non trouvée
    return jsonResponse(
      { success: false, message: "Route non trouvée" },
      { status: 404 },
    )
  } catch (err) {
    console.error("geocode exception", err)
    return jsonResponse(
      {
        success: false,
        message: (err as Error).message || "Erreur serveur",
      },
      { status: 500 },
    )
  }
})


