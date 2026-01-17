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
    const supabaseWebinaire = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "webinaire" },
    })
    const supabaseAdhesion = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "adhesion" },
    })

    // Parser le body
    const body = await req.json().catch(() => ({}))
    const { prenom, nom, email, webinaire_id, pays, whatsapp, numero_membre } = body

    // Validation des champs requis
    if (!prenom || !nom || !email || !webinaire_id) {
      return jsonResponse(
        {
          success: false,
          message: "prenom, nom, email et webinaire_id sont requis",
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

    // Vérifier que le webinaire existe et est actif
    const { data: webinaire, error: webinaireError } = await supabaseWebinaire
      .from("webinaires")
      .select("id, titre, is_active, capacite_max")
      .eq("id", webinaire_id)
      .maybeSingle()

    if (webinaireError || !webinaire) {
      return jsonResponse(
        { success: false, message: "Webinaire introuvable" },
        { status: 404 },
      )
    }

    if (!webinaire.is_active) {
      return jsonResponse(
        { success: false, message: "Ce webinaire n'est plus disponible" },
        { status: 400 },
      )
    }

    // Vérifier la capacité si définie
    if (webinaire.capacite_max) {
      const { count: currentInscriptions } = await supabaseWebinaire
        .from("inscriptions")
        .select("*", { count: "exact", head: true })
        .eq("webinaire_id", webinaire_id)

      if ((currentInscriptions || 0) >= webinaire.capacite_max) {
        return jsonResponse(
          {
            success: false,
            message: "La capacité maximale du webinaire est atteinte",
          },
          { status: 400 },
        )
      }
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

    // Créer l'inscription
    const { data: inscription, error: insertError } = await supabaseWebinaire
      .from("inscriptions")
      .insert({
        webinaire_id,
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: emailNormalized,
        whatsapp: whatsapp || null,
        pays: pays || "France",
        membre_id,
        source: "site web",
        statut: "pending",
      })
      .select()
      .single()

    if (insertError) {
      console.error("createInscription error", insertError)
      return jsonResponse(
        {
          success: false,
          message: "Erreur lors de la création de l'inscription",
        },
        { status: 500 },
      )
    }

    // Mettre à jour les stats du webinaire
    try {
      const [
        { count: nb_inscrits },
        { count: nb_confirmes },
        { count: nb_presents },
      ] = await Promise.all([
        supabaseWebinaire
          .from("inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("webinaire_id", webinaire_id),
        supabaseWebinaire
          .from("inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("webinaire_id", webinaire_id)
          .eq("statut", "confirmed"),
        supabaseWebinaire
          .from("inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("webinaire_id", webinaire_id)
          .eq("presence", "present"),
      ])

      const taux_presence =
        nb_confirmes && nb_confirmes > 0
          ? Math.round(((nb_presents || 0) / nb_confirmes) * 100 * 100) / 100
          : 0

      await supabaseWebinaire.from("stats").upsert({
        webinaire_id,
        nb_inscrits: nb_inscrits || 0,
        nb_confirmes: nb_confirmes || 0,
        nb_presents: nb_presents || 0,
        taux_presence,
      })
    } catch (statsErr) {
      console.error("Error updating webinaire stats", statsErr)
      // Ne pas bloquer la réponse si les stats échouent
    }

    // Récupérer les détails du webinaire pour l'email
    const { data: webinaireDetails } = await supabaseWebinaire
      .from("webinaires")
      .select("titre, date_webinaire, heure_debut, lien_webinaire")
      .eq("id", webinaire_id)
      .maybeSingle()

    // Envoyer notification email (via webhook)
    const APPSCRIPT_WEBHOOK_URL = Deno.env.get("APPSCRIPT_CONTACT_WEBHOOK_URL") || ""
    const APPSCRIPT_WEBHOOK_TOKEN = Deno.env.get("APPSCRIPT_CONTACT_TOKEN") || ""

    if (APPSCRIPT_WEBHOOK_URL && webinaireDetails) {
      try {
        const webinaireDate = webinaireDetails.date_webinaire
          ? new Date(webinaireDetails.date_webinaire).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : ""

        // Notifier l'admin de la nouvelle inscription
        await fetch(APPSCRIPT_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(APPSCRIPT_WEBHOOK_TOKEN && {
              "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN,
            }),
          },
          body: JSON.stringify({
            event_type: "webinaire_inscription",
            prenom: inscription.prenom,
            nom: inscription.nom,
            email: inscription.email,
            webinaire_title: webinaireDetails.titre,
            webinaire_date: webinaireDetails.date_webinaire || "",
            webinaire_time: webinaireDetails.heure_debut
              ? webinaireDetails.heure_debut.substring(0, 5)
              : "",
            pays: pays || "France",
            whatsapp: whatsapp || null,
            token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
          }),
        })

        // Envoyer l'email de confirmation au participant (via le même webhook)
        await fetch(APPSCRIPT_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(APPSCRIPT_WEBHOOK_TOKEN && {
              "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN,
            }),
          },
          body: JSON.stringify({
            event_type: "webinaire_confirmation",
            to: inscription.email,
            prenom: inscription.prenom,
            nom: inscription.nom,
            webinaireTitre: webinaireDetails.titre,
            webinaireDate,
            webinaireHeure: webinaireDetails.heure_debut
              ? webinaireDetails.heure_debut.substring(0, 5)
              : "",
            webinaireLien: webinaireDetails.lien_webinaire || null,
            confirmationCode: inscription.confirmation_code || null,
            token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
          }),
        })
      } catch (err) {
        console.error("Error sending notification emails", err)
        // Ne pas bloquer la réponse si l'email échoue
      }
    }

    return jsonResponse({
      success: true,
      message: "Inscription enregistrée. Vous recevrez une confirmation par email.",
      data: inscription,
    })
  } catch (err) {
    console.error("public-webinaire-inscription exception", err)
    return jsonResponse(
      {
        success: false,
        message: (err as Error).message || "Erreur serveur",
      },
      { status: 500 },
    )
  }
})


