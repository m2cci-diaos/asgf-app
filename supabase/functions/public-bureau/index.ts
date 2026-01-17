import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers || {})
  headers.set("Content-Type", "application/json")
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v)
  return new Response(JSON.stringify(body), { ...init, headers })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== "GET") {
    return jsonResponse({ success: false, message: "Méthode non autorisée" }, {
      status: 405,
    })
  }

  const PROJECT_URL = Deno.env.get("PROJECT_URL")
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")

  if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
    console.error("PROJECT_URL ou SERVICE_ROLE_KEY manquants")
    return jsonResponse(
      { success: false, message: "Configuration serveur incomplète" },
      { status: 500 },
    )
  }

  const supabaseOrganisation = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "organisation" },
  })

  try {
    const { data, error } = await supabaseOrganisation
      .from("bureau_members")
      .select(
        "id, prenom, nom, nom_affichage, role_court, role_long, categorie, pole_nom, highlight, ordre, is_active, email, phone, linkedin_url, other_url, photo_url",
      )
      .eq("is_active", true)
      .order("categorie", { ascending: true })
      .order("ordre", { ascending: true })

    if (error) {
      console.error("public-bureau erreur requête", error)
      return jsonResponse(
        { success: false, message: "Erreur lors du chargement du bureau" },
        { status: 500 },
      )
    }

    return jsonResponse({
      success: true,
      data: data || [],
    })
  } catch (err) {
    console.error("public-bureau exception", err)
    return jsonResponse(
      { success: false, message: "Erreur serveur" },
      { status: 500 },
    )
  }
})





