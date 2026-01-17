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

// Helper function pour obtenir le contexte email formation
async function getFormationEmailContext(
  supabaseFormation: any,
  formationId: string,
  sessionId?: string,
) {
  const context: any = {
    formationTitle: "",
    formationMode: "",
    formationSlug: "",
    sessionDate: "",
  }

  if (formationId) {
    const { data: formation } = await supabaseFormation
      .from("formations")
      .select("titre, mode, slug")
      .eq("id", formationId)
      .maybeSingle()

    if (formation) {
      context.formationTitle = formation.titre || ""
      context.formationMode = formation.mode || ""
      context.formationSlug = formation.slug || ""
    }
  }

  if (sessionId) {
    const { data: session } = await supabaseFormation
      .from("sessions")
      .select("date_debut")
      .eq("id", sessionId)
      .maybeSingle()

    if (session?.date_debut) {
      context.sessionDate = session.date_debut
    }
  }

  return context
}

Deno.serve(async (req) => {
  // Gérer les requêtes OPTIONS (preflight) en premier
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

    // Créer les clients Supabase
    const supabaseFormation = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "formation" },
    })
    const supabaseAdhesion = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "adhesion" },
    })

    // Parser le body
    const body = await req.json().catch(() => ({}))
    const {
      prenom,
      nom,
      email,
      formation_id,
      session_id,
      niveau,
      niveau_etude,
      adresse,
      ville,
      pays,
      whatsapp,
      numero_membre,
    } = body

    // Validation des champs requis
    if (!prenom || !nom || !email || !formation_id || !niveau) {
      return jsonResponse(
        {
          success: false,
          message: "prenom, nom, email, formation_id et niveau sont requis",
        },
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

    // Vérifier que la formation existe et est active
    const { data: formation, error: formationError } = await supabaseFormation
      .from("formations")
      .select("id, titre, is_active, participants_max")
      .eq("id", formation_id)
      .maybeSingle()

    if (formationError || !formation) {
      return jsonResponse(
        { success: false, message: "Formation introuvable" },
        { status: 404 },
      )
    }

    if (!formation.is_active) {
      return jsonResponse(
        { success: false, message: "Cette formation n'est plus disponible" },
        { status: 400 },
      )
    }

    // Vérifier si l'utilisateur est membre (optionnel, pour remplir membre_id)
    let membre_id = null
    if (emailNormalized || numero_membre) {
      const membreQuery = supabaseAdhesion
        .from("members")
        .select("id")
        .eq("email", emailNormalized)

      if (numero_membre) {
        membreQuery.eq("numero_membre", numero_membre.trim())
      }

      const { data: membre } = await membreQuery.maybeSingle()
      if (membre) {
        membre_id = membre.id
      }
    }

    // Vérifier la capacité si définie
    if (formation.participants_max) {
      const { count: confirmedCount } = await supabaseFormation
        .from("inscriptions")
        .select("*", { count: "exact", head: true })
        .eq("formation_id", formation_id)
        .eq("status", "confirmed")

      if ((confirmedCount || 0) >= formation.participants_max) {
        return jsonResponse(
          {
            success: false,
            message: "La formation a atteint sa capacité maximale",
          },
          { status: 400 },
        )
      }
    }

    // Créer l'inscription
    const { data: inscription, error: insertError } = await supabaseFormation
      .from("inscriptions")
      .insert({
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: emailNormalized,
        formation_id,
        session_id: session_id || null,
        niveau,
        niveau_etude: niveau_etude || null,
        adresse: adresse || null,
        ville: ville || null,
        pays: pays || "France",
        whatsapp: whatsapp || null,
        membre_id,
        paiement_status: "non payé",
        source: "site web",
        notes_admin: null,
        status: "pending",
      })
      .select()
      .single()

    if (insertError) {
      console.error("createInscription error", insertError)
      const message = insertError.message || ""

      // Contrainte d'unicité sur (formation_id, email)
      if (
        insertError.code === "23505" ||
        message.includes("inscriptions_formation_email_unique") ||
        message.toLowerCase().includes("duplicate key value")
      ) {
        return jsonResponse(
          {
            success: false,
            message:
              "Cet email est déjà inscrit à cette formation. Utilisez une autre adresse ou contactez l'ASGF.",
          },
          { status: 400 },
        )
      }

      return jsonResponse(
        {
          success: false,
          message: "Erreur lors de la création de l'inscription",
        },
        { status: 500 },
      )
    }

    // Envoyer notification email (via webhook)
    const context = await getFormationEmailContext(
      supabaseFormation,
      inscription.formation_id,
      inscription.session_id,
    )

    const APPSCRIPT_WEBHOOK_URL = Deno.env.get("APPSCRIPT_CONTACT_WEBHOOK_URL") || ""
    const APPSCRIPT_WEBHOOK_TOKEN = Deno.env.get("APPSCRIPT_CONTACT_TOKEN") || ""

    if (APPSCRIPT_WEBHOOK_URL) {
      try {
        await fetch(APPSCRIPT_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(APPSCRIPT_WEBHOOK_TOKEN && {
              "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN,
            }),
          },
          body: JSON.stringify({
            event_type: "formation_inscription",
            prenom: inscription.prenom,
            nom: inscription.nom,
            email: inscription.email,
            formation_title: context.formationTitle,
            formation_mode: context.formationMode,
            formation_slug: context.formationSlug,
            session_date: context.sessionDate,
            niveau: inscription.niveau,
            token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
          }),
        })
      } catch (err) {
        console.error("Error sending notification email", err)
        // Ne pas bloquer la réponse si l'email échoue
      }
    }

    return jsonResponse({
      success: true,
      message: "Inscription enregistrée. Vous recevrez une confirmation par email.",
      data: inscription,
    })
  } catch (err) {
    console.error("public-formation-inscription exception", err)
    return jsonResponse(
      {
        success: false,
        message: (err as Error).message || "Erreur serveur",
      },
      { status: 500 },
    )
  }
})


