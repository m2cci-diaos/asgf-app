import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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

Deno.serve(async (req) => {
  // Gérer les requêtes OPTIONS (preflight) en premier
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }

  try {
    // Variables d'environnement
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const jwtSecret = Deno.env.get("JWT_SECRET") || ""

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(
        { success: false, message: "Configuration Supabase manquante" },
        { status: 500 },
      )
    }

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

    // Créer les clients Supabase
    const supabasePublic = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "public" },
    })

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/admin-projets"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-projets")) {
      relativePath = pathname.substring("/admin-projets".length)
    }
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // ========== PROJETS ==========

    // GET /projets - Liste tous les projets
    if (req.method === "GET" && relativePath === "projets") {
      const activeOnly = searchParams.get("activeOnly") === "true"
      
      let query = supabasePublic
        .from("projets")
        .select("*")
        .order("created_at", { ascending: false })

      if (activeOnly) {
        query = query.eq("is_active", true)
      }

      const { data, error } = await query

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la récupération des projets" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        data: data || [],
      })
    }

    // GET /projets/:id
    const projetMatch = relativePath.match(/^projets\/(.+)$/)
    if (req.method === "GET" && projetMatch) {
      const projetId = projetMatch[1]
      const { data, error } = await supabasePublic
        .from("projets")
        .select("*")
        .eq("projet_id", projetId)
        .maybeSingle()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération du projet" },
          { status: 500 },
        )
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Projet introuvable" },
          { status: 404 },
        )
      }

      return jsonResponse({
        success: true,
        data,
      })
    }

    // POST /projets
    if (req.method === "POST" && relativePath === "projets") {
      const body = await req.json()
      const { projet_id, titre, description, icon, color, is_active } = body

      if (!projet_id || !titre) {
        return jsonResponse(
          { success: false, message: "projet_id et titre sont requis" },
          { status: 400 },
        )
      }

      // Vérifier si le projet_id existe déjà
      const { data: existing } = await supabasePublic
        .from("projets")
        .select("id")
        .eq("projet_id", projet_id)
        .maybeSingle()

      if (existing) {
        return jsonResponse(
          { success: false, message: "Un projet avec cet ID existe déjà" },
          { status: 409 },
        )
      }

      const { data, error } = await supabasePublic
        .from("projets")
        .insert({
          projet_id: projet_id.trim(),
          titre: titre.trim(),
          description: description?.trim() || null,
          icon: icon?.trim() || null,
          color: color?.trim() || null,
          is_active: is_active !== undefined ? is_active : true,
        })
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Impossible de créer le projet" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Projet créé avec succès",
        data,
      }, { status: 201 })
    }

    // PUT /projets/:id
    if (req.method === "PUT" && projetMatch) {
      const projetId = projetMatch[1]
      const body = await req.json()
      const { titre, description, icon, color, is_active } = body

      const updateData: any = {}
      if (titre !== undefined) updateData.titre = titre.trim()
      if (description !== undefined) updateData.description = description?.trim() || null
      if (icon !== undefined) updateData.icon = icon?.trim() || null
      if (color !== undefined) updateData.color = color?.trim() || null
      if (is_active !== undefined) updateData.is_active = is_active

      const { data, error } = await supabasePublic
        .from("projets")
        .update(updateData)
        .eq("projet_id", projetId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour du projet" },
          { status: 500 },
        )
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Projet introuvable" },
          { status: 404 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Projet mis à jour",
        data,
      })
    }

    // DELETE /projets/:id
    if (req.method === "DELETE" && projetMatch) {
      const projetId = projetMatch[1]
      const { error } = await supabasePublic
        .from("projets")
        .delete()
        .eq("projet_id", projetId)

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la suppression du projet" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Projet supprimé",
      })
    }

    // ========== INSCRIPTIONS ==========

    // GET /inscriptions
    if (req.method === "GET" && relativePath === "inscriptions") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const projet_id = searchParams.get("projet_id") || ""
      const statut = searchParams.get("statut") || ""
      const search = searchParams.get("search") || ""

      let query = supabasePublic
        .from("projets_inscriptions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (projet_id) {
        query = query.eq("projet_id", projet_id)
      }

      if (statut) {
        query = query.eq("statut", statut)
      }

      if (search) {
        query = query.or(`prenom.ilike.%${search}%,nom.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la récupération des inscriptions" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        inscriptions: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // GET /inscriptions/:id
    const inscriptionMatch = relativePath.match(/^inscriptions\/(.+)$/)
    if (req.method === "GET" && inscriptionMatch) {
      const inscriptionId = inscriptionMatch[1]
      const { data, error } = await supabasePublic
        .from("projets_inscriptions")
        .select("*")
        .eq("id", inscriptionId)
        .maybeSingle()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération de l'inscription" },
          { status: 500 },
        )
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Inscription introuvable" },
          { status: 404 },
        )
      }

      return jsonResponse({
        success: true,
        data,
      })
    }

    // PATCH /inscriptions/:id/status
    const inscriptionStatusMatch = relativePath.match(/^inscriptions\/(.+)\/status$/)
    if (req.method === "PATCH" && inscriptionStatusMatch) {
      const inscriptionId = inscriptionStatusMatch[1]
      const body = await req.json()
      const { statut } = body

      if (!statut || !["pending", "approved", "rejected"].includes(statut)) {
        return jsonResponse(
          { success: false, message: "statut est requis et doit être pending, approved ou rejected" },
          { status: 400 },
        )
      }

      const { data, error } = await supabasePublic
        .from("projets_inscriptions")
        .update({ statut })
        .eq("id", inscriptionId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour du statut" },
          { status: 500 },
        )
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Inscription introuvable" },
          { status: 404 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Statut mis à jour",
        data,
      })
    }

    // PUT /inscriptions/:id
    if (req.method === "PUT" && inscriptionMatch) {
      const inscriptionId = inscriptionMatch[1]
      const body = await req.json()

      const updateData: any = {}
      if (body.prenom !== undefined) updateData.prenom = body.prenom.trim()
      if (body.nom !== undefined) updateData.nom = body.nom.trim()
      if (body.email !== undefined) updateData.email = body.email.trim().toLowerCase()
      if (body.telephone !== undefined) updateData.telephone = body.telephone?.trim() || null
      if (body.numero_membre !== undefined) updateData.numero_membre = body.numero_membre?.trim() || null
      if (body.statut_pro !== undefined) updateData.statut_pro = body.statut_pro?.trim() || null
      if (body.motivation !== undefined) updateData.motivation = body.motivation?.trim() || null
      if (body.competences !== undefined) updateData.competences = body.competences?.trim() || null
      if (body.statut !== undefined) updateData.statut = body.statut

      const { data, error } = await supabasePublic
        .from("projets_inscriptions")
        .update(updateData)
        .eq("id", inscriptionId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour de l'inscription" },
          { status: 500 },
        )
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Inscription introuvable" },
          { status: 404 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Inscription mise à jour",
        data,
      })
    }

    // DELETE /inscriptions/:id
    if (req.method === "DELETE" && inscriptionMatch) {
      const inscriptionId = inscriptionMatch[1]
      const { error } = await supabasePublic
        .from("projets_inscriptions")
        .delete()
        .eq("id", inscriptionId)

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la suppression de l'inscription" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Inscription supprimée",
      })
    }

    // Route non trouvée
    return jsonResponse(
      { success: false, message: "Route non trouvée" },
      { status: 404 },
    )
  } catch (err) {
    console.error("admin-projets exception", err)
    return jsonResponse(
      {
        success: false,
        message: (err as Error).message || "Erreur serveur",
      },
      { status: 500 },
    )
  }
})


