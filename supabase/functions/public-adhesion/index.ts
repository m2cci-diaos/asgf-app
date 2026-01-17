import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers || {})
  headers.set("Content-Type", "application/json")
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v)
  return new Response(JSON.stringify(body), { ...init, headers })
}

Deno.serve(async (req) => {
  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, message: "Méthode non autorisée" },
      { status: 405 },
    )
  }

  try {
    // Variables d'environnement
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(
        { success: false, message: "Configuration Supabase manquante" },
        { status: 500 },
      )
    }

    // Créer le client Supabase avec service_role (contourne RLS)
    const supabaseAdhesion = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "adhesion" },
    })

    // Parser le body
    const body = await req.json().catch(() => ({}))
    const {
      nom,
      prenom,
      email,
      telephone,
      adresse,
      ville,
      pays,
      date_naissance,
      statut_pro,
      domaine,
      universite,
      niveau_etudes,
      annee_universitaire,
      specialite,
      interets,
      motivation,
      competences,
      is_newsletter_subscribed,
    } = body

    // Validation des champs requis
    if (!nom || !prenom || !email) {
      return jsonResponse(
        { success: false, message: "nom, prenom et email sont requis" },
        { status: 400 },
      )
    }

    // Vérifier que l'email est valide
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const emailNormalized = email.trim().toLowerCase()
    if (!emailRegex.test(emailNormalized)) {
      return jsonResponse(
        { success: false, message: "Email invalide" },
        { status: 400 },
      )
    }

    // Préparer les données à insérer
    const dataToInsert: Record<string, unknown> = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: emailNormalized,
      telephone: telephone?.trim() || null,
      adresse: adresse?.trim() || null,
      ville: ville?.trim() || null,
      pays: pays?.trim() || null,
      date_naissance: date_naissance || null,
      statut_pro: statut_pro || null,
      domaine: domaine || null,
      universite: universite?.trim() || null,
      niveau_etudes: niveau_etudes || null,
      annee_universitaire: annee_universitaire || null,
      specialite: specialite?.trim() || null,
      interets: interets || [],
      motivation: motivation?.trim() || null,
      competences: competences?.trim() || null,
      is_newsletter_subscribed: is_newsletter_subscribed || false,
    }

    // Insérer le membre
    const { data, error } = await supabaseAdhesion
      .from("members")
      .insert([dataToInsert])
      .select()
      .single()

    if (error) {
      console.error("Erreur insertion membre:", error)
      
      // Gérer les erreurs spécifiques
      if (error.code === "23505") {
        // Violation de contrainte unique (email probablement)
        if (error.message.includes("email")) {
          return jsonResponse(
            { success: false, message: "Cet email est déjà enregistré" },
            { status: 409 },
          )
        }
        if (error.message.includes("numero_membre")) {
          // Conflit de numéro - réessayer une fois
          const { data: retryData, error: retryError } = await supabaseAdhesion
            .from("members")
            .insert([dataToInsert])
            .select()
            .single()
          
          if (retryError) {
            return jsonResponse(
              { success: false, message: "Erreur technique lors de l'enregistrement" },
              { status: 500 },
            )
          }
          
          return jsonResponse(
            { success: true, data: retryData },
            { status: 201 },
          )
        }
      }

      return jsonResponse(
        { success: false, message: `Erreur d'enregistrement: ${error.message}` },
        { status: 500 },
      )
    }

    return jsonResponse(
      { success: true, data },
      { status: 201 },
    )
  } catch (err) {
    console.error("Erreur fatale:", err)
    return jsonResponse(
      { success: false, message: "Erreur serveur inattendue" },
      { status: 500 },
    )
  }
})













