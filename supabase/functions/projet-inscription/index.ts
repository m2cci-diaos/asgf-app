import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const ALLOWED_PROJET_IDS = ["mobilite-intelligente", "dashboard-energie"] as const

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers || {})
  headers.set("Content-Type", "application/json")
  Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v))
  return new Response(JSON.stringify(body), { ...init, headers })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: CORS_HEADERS })
  if (req.method !== "POST") return jsonResponse({ success: false, message: "Méthode non autorisée" }, { status: 405 })

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquants")
    return jsonResponse({ error: "Configuration serveur incomplète" }, { status: 500 })
  }

  const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
  const supabaseAdhesion = createClient(supabaseUrl, supabaseServiceKey, { db: { schema: "adhesion" } })

  try {
    const payload = await req.json().catch(() => null)
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ success: false, message: "Requête invalide" }, { status: 400 })
    }

    const {
      projet_id,
      prenom,
      nom,
      email,
      telephone,
      numero_membre,
      statut_pro,
      motivation,
      competences,
    } = payload as Record<string, unknown>

    if (
      typeof projet_id !== "string" ||
      typeof prenom !== "string" ||
      typeof nom !== "string" ||
      typeof email !== "string"
    ) {
      return jsonResponse({ success: false, message: "projet_id, prenom, nom et email sont requis" }, { status: 400 })
    }

    if (!ALLOWED_PROJET_IDS.includes(projet_id as (typeof ALLOWED_PROJET_IDS)[number])) {
      return jsonResponse({ success: false, message: "projet_id invalide" }, { status: 400 })
    }

    const emailNormalized = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailNormalized)) {
      return jsonResponse({ success: false, message: "Email invalide" }, { status: 400 })
    }

    const { data: membre, error: membreError } = await supabaseAdhesion
      .from("members")
      .select("id, numero_membre, status, email")
      .eq("email", emailNormalized)
      .maybeSingle()

    if (membreError) console.error("Erreur lookup membre", membreError)

    if (!membre) {
      return jsonResponse(
        {
          success: false,
          message:
            "Vous n'êtes pas encore membre de l'ASGF. Ces projets sont réservés exclusivement aux membres.",
          code: "NOT_MEMBER",
          redirectTo: "/adhesion",
        },
        { status: 400 },
      )
    }

    const membre_id = membre.id as string
    const numero_membre_final =
      (typeof membre.numero_membre === "string" && membre.numero_membre) ||
      (typeof numero_membre === "string" ? numero_membre.trim() : null) ||
      null

    const { data: existing, error: checkError } = await supabasePublic
      .from("projets_inscriptions")
      .select("id")
      .eq("projet_id", projet_id.trim())
      .eq("email", emailNormalized)
      .maybeSingle()

    if (checkError) console.error("Erreur vérification inscription existante", checkError)

    if (existing) {
      return jsonResponse({ success: false, message: "Vous êtes déjà inscrit à ce projet avec cet email" }, { status: 400 })
    }

    const { data, error } = await supabasePublic
      .from("projets_inscriptions")
      .insert({
        projet_id: projet_id.trim(),
        membre_id,
        email: emailNormalized,
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: typeof telephone === "string" ? telephone.trim() || null : null,
        numero_membre: numero_membre_final,
        statut_pro: typeof statut_pro === "string" ? statut_pro.trim() || null : null,
        motivation: typeof motivation === "string" ? motivation.trim() || null : null,
        competences: typeof competences === "string" ? competences.trim() || null : null,
        statut: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Erreur insertion inscription projet", error)
      return jsonResponse(
        { success: false, message: "Impossible d'enregistrer votre inscription pour le moment" },
        { status: 500 },
      )
    }

    console.log("Nouvelle inscription projet", { id: data.id, projet_id, email: data.email })
    return jsonResponse(
      { success: true, message: "Inscription enregistrée avec succès", data },
      { status: 201 },
    )
  } catch (err) {
    console.error("Erreur inattendue fonction projet-inscription", err)
    return jsonResponse({ success: false, message: "Erreur serveur inattendue" }, { status: 500 })
  }
})


