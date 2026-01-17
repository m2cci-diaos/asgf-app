import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
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

const CFA_TO_EUR_RATE = 1 / 655.957

function normalizeCountry(pays = "") {
  try {
    return pays
      ? pays
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
      : ""
  } catch {
    return pays?.toLowerCase().trim() || ""
  }
}

function getTarifInfoForCountry(pays = "") {
  const normalized = normalizeCountry(pays)
  const senegalKeywords = ["senegal", "sénégal"]
  if (senegalKeywords.some((kw) => normalized.includes(kw))) {
    return { montant: 2000, devise: "XOF", symbol: "FCFA", isSenegal: true }
  }
  return { montant: 10, devise: "EUR", symbol: "€", isSenegal: false }
}

function convertToEuro(amount = 0, tarifInfo: any) {
  const parsed = parseFloat(String(amount || 0))
  if (!parsed) return 0
  if (tarifInfo.isSenegal) {
    return parsed * CFA_TO_EUR_RATE
  }
  return parsed
}

function convertCurrencyToEuro(amount = 0, devise = "EUR") {
  const parsed = parseFloat(String(amount || 0))
  if (!parsed) return 0
  const normalized = (devise || "").toUpperCase()
  const cfaCurrencies = ["XOF", "CFA", "FCFA"]
  if (cfaCurrencies.includes(normalized)) {
    return parsed * CFA_TO_EUR_RATE
  }
  return parsed
}

async function getAdhesionStats(supabaseAdhesion: any) {
  try {
    const { count: totalMembers } = await supabaseAdhesion
      .from("members")
      .select("*", { count: "exact", head: true })

    const { data: statusData } = await supabaseAdhesion
      .from("members")
      .select("status")

    const statusCounts = { pending: 0, approved: 0, rejected: 0 }
    if (statusData) {
      statusData.forEach((m: any) => {
        if (m.status === "pending") statusCounts.pending++
        else if (m.status === "approved") statusCounts.approved++
        else if (m.status === "rejected") statusCounts.rejected++
      })
    }

    const { count: activeCount } = await supabaseAdhesion
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    const { data: countryData } = await supabaseAdhesion
      .from("members")
      .select("pays")
      .not("pays", "is", null)

    const countryDistribution: Record<string, number> = {}
    if (countryData) {
      countryData.forEach((m: any) => {
        const country = m.pays || "Non renseigné"
        countryDistribution[country] = (countryDistribution[country] || 0) + 1
      })
    }

    const { data: monthlyData } = await supabaseAdhesion
      .from("members")
      .select("created_at, status")
      .order("created_at", { ascending: true })

    const monthlyEvolution: Record<string, any> = {}
    if (monthlyData) {
      monthlyData.forEach((m: any) => {
        const date = new Date(m.created_at)
        const month = String(date.getMonth() + 1)
        const key = `${date.getFullYear()}-${month.length === 1 ? "0" + month : month}`
        if (!monthlyEvolution[key]) {
          monthlyEvolution[key] = { total: 0, approved: 0, pending: 0, rejected: 0 }
        }
        monthlyEvolution[key].total++
        if (m.status === "approved") monthlyEvolution[key].approved++
        else if (m.status === "pending") monthlyEvolution[key].pending++
        else if (m.status === "rejected") monthlyEvolution[key].rejected++
      })
    }

    const { data: levelData } = await supabaseAdhesion
      .from("members")
      .select("niveau_etudes")
      .not("niveau_etudes", "is", null)

    const levelDistribution: Record<string, number> = {}
    if (levelData) {
      levelData.forEach((m: any) => {
        const level = m.niveau_etudes || "Non renseigné"
        levelDistribution[level] = (levelDistribution[level] || 0) + 1
      })
    }

    const now = new Date()
    const currentMonthNum = String(now.getMonth() + 1)
    const currentMonth = `${now.getFullYear()}-${currentMonthNum.length === 1 ? "0" + currentMonthNum : currentMonthNum}`
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthNum = String(lastMonth.getMonth() + 1)
    const lastMonthKey = `${lastMonth.getFullYear()}-${lastMonthNum.length === 1 ? "0" + lastMonthNum : lastMonthNum}`

    const currentMonthCount = monthlyEvolution[currentMonth]?.total || 0
    const lastMonthCount = monthlyEvolution[lastMonthKey]?.total || 0
    const growthRate = lastMonthCount > 0
      ? ((currentMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(1)
      : currentMonthCount > 0 ? "100.0" : "0.0"

    return {
      total_membres: totalMembers || 0,
      membres_actifs: activeCount || 0,
      membres_en_attente: statusCounts.pending,
      membres_approuves: statusCounts.approved,
      membres_rejetes: statusCounts.rejected,
      repartition_pays: countryDistribution,
      evolution_mensuelle: monthlyEvolution,
      country_distribution: countryDistribution,
      monthly_evolution: monthlyEvolution,
      level_distribution: levelDistribution,
      taux_croissance: parseFloat(growthRate),
      nombre_mois_courant: currentMonthCount,
      nombre_mois_precedent: lastMonthCount,
    }
  } catch (err) {
    console.error("getAdhesionStats error", err)
    return null
  }
}

async function getFormationStats(supabaseFormation: any) {
  try {
    const { count: totalFormations } = await supabaseFormation
      .from("formations")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    const { count: totalInscriptions } = await supabaseFormation
      .from("inscriptions")
      .select("*", { count: "exact", head: true })

    const { count: confirmedInscriptions } = await supabaseFormation
      .from("inscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")

    const { count: pendingInscriptions } = await supabaseFormation
      .from("inscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")

    const { data: formationsByCategory } = await supabaseFormation
      .from("formations")
      .select("categorie")
      .eq("is_active", true)

    const categoryStats: Record<string, number> = {}
    formationsByCategory?.forEach((f: any) => {
      categoryStats[f.categorie] = (categoryStats[f.categorie] || 0) + 1
    })

    const { count: totalSessions } = await supabaseFormation
      .from("sessions")
      .select("*", { count: "exact", head: true })

    const today = new Date().toISOString().split("T")[0]
    const { count: upcomingSessions } = await supabaseFormation
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .gte("date_debut", today)

    const { data: formationsByMode } = await supabaseFormation
      .from("formations")
      .select("mode")
      .eq("is_active", true)

    const modeStats: Record<string, number> = {}
    formationsByMode?.forEach((f: any) => {
      const mode = f.mode || "Non spécifié"
      modeStats[mode] = (modeStats[mode] || 0) + 1
    })

    return {
      total_formations: totalFormations || 0,
      total_inscriptions: totalInscriptions || 0,
      confirmed_inscriptions: confirmedInscriptions || 0,
      pending_inscriptions: pendingInscriptions || 0,
      rejected_inscriptions: (totalInscriptions || 0) - (confirmedInscriptions || 0) - (pendingInscriptions || 0),
      total_sessions: totalSessions || 0,
      upcoming_sessions: upcomingSessions || 0,
      categories: categoryStats,
      modes: modeStats,
    }
  } catch (err) {
    console.error("getFormationStats error", err)
    return null
  }
}

async function getWebinaireStats(supabaseWebinaire: any) {
  try {
    const { count: totalWebinaires } = await supabaseWebinaire
      .from("webinaires")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    const today = new Date().toISOString().split("T")[0]
    const { count: upcomingWebinaires } = await supabaseWebinaire
      .from("webinaires")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("date_webinaire", today)

    const { count: totalInscriptions } = await supabaseWebinaire
      .from("inscriptions")
      .select("*", { count: "exact", head: true })

    const { count: confirmedInscriptions } = await supabaseWebinaire
      .from("inscriptions")
      .select("*", { count: "exact", head: true })
      .eq("statut", "confirmed")

    const { count: pendingInscriptions } = await supabaseWebinaire
      .from("inscriptions")
      .select("*", { count: "exact", head: true })
      .eq("statut", "pending")

    const { data: webinairesByTheme } = await supabaseWebinaire
      .from("webinaires")
      .select("theme")
      .eq("is_active", true)

    const themeStats: Record<string, number> = {}
    webinairesByTheme?.forEach((w: any) => {
      themeStats[w.theme] = (themeStats[w.theme] || 0) + 1
    })

    const { data: allStats } = await supabaseWebinaire
      .from("stats")
      .select("taux_presence")

    const tauxMoyen = allStats && allStats.length > 0
      ? Math.round((allStats.reduce((sum: number, s: any) => sum + (s.taux_presence || 0), 0) / allStats.length) * 100) / 100
      : 0

    return {
      total_webinaires: totalWebinaires || 0,
      upcoming_webinaires: upcomingWebinaires || 0,
      total_inscriptions: totalInscriptions || 0,
      confirmed_inscriptions: confirmedInscriptions || 0,
      pending_inscriptions: pendingInscriptions || 0,
      taux_moyen_participation: tauxMoyen,
      themes: themeStats,
    }
  } catch (err) {
    console.error("getWebinaireStats error", err)
    return null
  }
}

async function getTresorerieStats(supabaseTresorerie: any, supabaseAdhesion: any) {
  try {
    const { count: totalCotisations } = await supabaseTresorerie
      .from("cotisations")
      .select("*", { count: "exact", head: true })

    const { count: cotisationsPayees } = await supabaseTresorerie
      .from("cotisations")
      .select("*", { count: "exact", head: true })
      .eq("statut_paiement", "paye")

    const { count: cotisationsEnAttente } = await supabaseTresorerie
      .from("cotisations")
      .select("*", { count: "exact", head: true })
      .eq("statut_paiement", "en_attente")

    const { count: totalPaiements } = await supabaseTresorerie
      .from("paiements")
      .select("*", { count: "exact", head: true })

    const { data: paiementsData } = await supabaseTresorerie
      .from("paiements")
      .select("montant, statut")
      .eq("statut", "valide")

    let totalPaiementsDonsEur = 0
    ;(paiementsData || []).forEach((pai: any) => {
      totalPaiementsDonsEur += pai.montant || 0
    })

    const { data: cotisationsData } = await supabaseTresorerie
      .from("cotisations")
      .select("membre_id, montant")
      .eq("statut_paiement", "paye")

    let montantTotalEur = 0
    let montantSenegalEur = 0
    let montantInternationalEur = 0
    let cotisationsSenegal = 0
    let cotisationsInternationales = 0

    if (cotisationsData && cotisationsData.length > 0) {
      const memberIds = [
        ...new Set(cotisationsData.map((c: any) => c.membre_id).filter(Boolean)),
      ]

      let membersMap: Record<string, string> = {}
      if (memberIds.length > 0) {
        const { data: members } = await supabaseAdhesion
          .from("members")
          .select("id, pays")
          .in("id", memberIds)
        membersMap = Object.fromEntries((members || []).map((m: any) => [m.id, m.pays || ""]))
      }

      cotisationsData.forEach((cot: any) => {
        const pays = membersMap[cot.membre_id] || ""
        const tarifInfo = getTarifInfoForCountry(pays)
        const montantEur = convertToEuro(cot.montant, tarifInfo)
        montantTotalEur += montantEur
        if (tarifInfo.isSenegal) {
          montantSenegalEur += montantEur
          cotisationsSenegal += 1
        } else {
          montantInternationalEur += montantEur
          cotisationsInternationales += 1
        }
      })
    }

    const { data: depensesData } = await supabaseTresorerie
      .from("depenses")
      .select("montant, devise, statut")

    let depensesTotalEur = 0
    let depensesValideesEur = 0
    let depensesValidees = 0

    ;(depensesData || []).forEach((dep: any) => {
      const montantEur = convertCurrencyToEuro(dep.montant, dep.devise)
      depensesTotalEur += montantEur
      if (dep.statut === "valide") {
        depensesValidees += 1
        depensesValideesEur += montantEur
      }
    })

    const { data: cartesMembresData } = await supabaseTresorerie
      .from("cartes_membres")
      .select("pays, statut_paiement")
      .or("statut_paiement.eq.paye,statut_paiement.eq.oui")

    let revenusCartesMembresEur = 0
    let cartesPayees = 0
    if (cartesMembresData && cartesMembresData.length > 0) {
      cartesMembresData.forEach((carte: any) => {
        const tarifInfo = getTarifInfoForCountry(carte.pays)
        const montantEur = convertToEuro(tarifInfo.montant, tarifInfo)
        revenusCartesMembresEur += montantEur
        cartesPayees += 1
      })
    }

    const { count: totalRelances } = await supabaseTresorerie
      .from("relances")
      .select("*", { count: "exact", head: true })

    const { data: cotisationsByYear } = await supabaseTresorerie
      .from("cotisations")
      .select("annee, statut_paiement")

    const repartitionParAnnee: Record<string, any> = {}
    ;(cotisationsByYear || []).forEach((c: any) => {
      if (!repartitionParAnnee[c.annee]) {
        repartitionParAnnee[c.annee] = { total: 0, payees: 0, en_attente: 0 }
      }
      repartitionParAnnee[c.annee].total++
      if (c.statut_paiement === "paye") {
        repartitionParAnnee[c.annee].payees++
      } else if (c.statut_paiement === "en_attente") {
        repartitionParAnnee[c.annee].en_attente++
      }
    })

    const recettesTotal = montantTotalEur + totalPaiementsDonsEur + revenusCartesMembresEur
    const soldeTotal = recettesTotal - depensesValideesEur

    return {
      total_cotisations: totalCotisations || 0,
      cotisations_payees: cotisationsPayees || 0,
      cotisations_en_attente: cotisationsEnAttente || 0,
      total_paiements: totalPaiements || 0,
      total_paiements_dons_eur: totalPaiementsDonsEur,
      montant_total: montantTotalEur,
      montant_total_eur: montantTotalEur,
      montant_senegal_eur: montantSenegalEur,
      montant_international_eur: montantInternationalEur,
      cotisations_senegal: cotisationsSenegal,
      cotisations_internationales: cotisationsInternationales,
      taux_cfa_eur: CFA_TO_EUR_RATE,
      depenses_total_eur: depensesTotalEur,
      depenses_validees_eur: depensesValideesEur,
      depenses_validees: depensesValidees,
      total_relances: totalRelances || 0,
      repartition_par_annee: repartitionParAnnee,
      revenus_cartes_membres_eur: revenusCartesMembresEur,
      cartes_membres_payees: cartesPayees,
      solde_total_eur: soldeTotal,
    }
  } catch (err) {
    console.error("getTresorerieStats error", err)
    return null
  }
}

async function getSecretariatStats(supabaseSecretariat: any) {
  try {
    const { count: totalReunions } = await supabaseSecretariat
      .from("reunions")
      .select("*", { count: "exact", head: true })

    const today = new Date().toISOString().split("T")[0]
    const { count: reunionsAVenir } = await supabaseSecretariat
      .from("reunions")
      .select("*", { count: "exact", head: true })
      .gte("date_reunion", today)

    const { count: totalParticipants } = await supabaseSecretariat
      .from("participants_reunion")
      .select("*", { count: "exact", head: true })

    const { count: totalActions } = await supabaseSecretariat
      .from("actions")
      .select("*", { count: "exact", head: true })

    const { count: actionsEnCours } = await supabaseSecretariat
      .from("actions")
      .select("*", { count: "exact", head: true })
      .eq("statut", "en_cours")

    const { count: totalDocuments } = await supabaseSecretariat
      .from("documents")
      .select("*", { count: "exact", head: true })

    const { data: reunionsByType } = await supabaseSecretariat
      .from("reunions")
      .select("type_reunion")

    const repartitionParType: Record<string, number> = {}
    ;(reunionsByType || []).forEach((r: any) => {
      repartitionParType[r.type_reunion] = (repartitionParType[r.type_reunion] || 0) + 1
    })

    return {
      total_reunions: totalReunions || 0,
      reunions_a_venir: reunionsAVenir || 0,
      total_participants: totalParticipants || 0,
      total_actions: totalActions || 0,
      actions_en_cours: actionsEnCours || 0,
      total_documents: totalDocuments || 0,
      repartition_par_type: repartitionParType,
    }
  } catch (err) {
    console.error("getSecretariatStats error", err)
    return null
  }
}

async function getMentoratStats(supabaseMentorat: any) {
  try {
    const { count: mentorsCount } = await supabaseMentorat
      .from("mentors")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")

    const { count: menteesCount } = await supabaseMentorat
      .from("mentees")
      .select("*", { count: "exact", head: true })
      .eq("status", "en recherche")

    const { count: relationsCount } = await supabaseMentorat
      .from("relations")
      .select("*", { count: "exact", head: true })
      .eq("statut_relation", "active")

    const { count: rdvCount } = await supabaseMentorat
      .from("rendezvous")
      .select("*", { count: "exact", head: true })

    const { data: domainesData } = await supabaseMentorat
      .from("mentors")
      .select("domaine")
      .eq("status", "active")

    const domainesRepartition: Record<string, number> = {}
    ;(domainesData || []).forEach((m: any) => {
      domainesRepartition[m.domaine] = (domainesRepartition[m.domaine] || 0) + 1
    })

    const { data: objectifsData } = await supabaseMentorat
      .from("objectifs")
      .select("statut")

    const objectifsRepartition: Record<string, number> = {}
    ;(objectifsData || []).forEach((o: any) => {
      objectifsRepartition[o.statut] = (objectifsRepartition[o.statut] || 0) + 1
    })

    return {
      mentors_actifs: mentorsCount || 0,
      mentees_en_recherche: menteesCount || 0,
      relations_actives: relationsCount || 0,
      total_rendezvous: rdvCount || 0,
      repartition_domaines: domainesRepartition,
      repartition_objectifs: objectifsRepartition,
    }
  } catch (err) {
    console.error("getMentoratStats error", err)
    return null
  }
}

async function getRecrutementStats(supabaseRecrutement: any) {
  try {
    const { count: totalCandidatures } = await supabaseRecrutement
      .from("candidatures")
      .select("*", { count: "exact", head: true })

    const { data: candidaturesData } = await supabaseRecrutement
      .from("candidatures")
      .select("statut")

    const candidaturesParStatut: Record<string, number> = {}
    ;(candidaturesData || []).forEach((c: any) => {
      candidaturesParStatut[c.statut] = (candidaturesParStatut[c.statut] || 0) + 1
    })

    const { data: contratsData } = await supabaseRecrutement
      .from("candidatures")
      .select("type_contrat")

    const candidaturesParContrat: Record<string, number> = {}
    ;(contratsData || []).forEach((c: any) => {
      candidaturesParContrat[c.type_contrat] = (candidaturesParContrat[c.type_contrat] || 0) + 1
    })

    const { count: totalSuivis } = await supabaseRecrutement
      .from("suivi_candidatures")
      .select("*", { count: "exact", head: true })

    const { count: totalRecommandations } = await supabaseRecrutement
      .from("recommandations")
      .select("*", { count: "exact", head: true })

    const { data: suivisData } = await supabaseRecrutement
      .from("suivi_candidatures")
      .select("type_event")

    const suivisParType: Record<string, number> = {}
    ;(suivisData || []).forEach((s: any) => {
      suivisParType[s.type_event] = (suivisParType[s.type_event] || 0) + 1
    })

    return {
      total_candidatures: totalCandidatures || 0,
      candidatures_par_statut: candidaturesParStatut,
      candidatures_par_contrat: candidaturesParContrat,
      total_suivis: totalSuivis || 0,
      total_recommandations: totalRecommandations || 0,
      suivis_par_type: suivisParType,
    }
  } catch (err) {
    console.error("getRecrutementStats error", err)
    return null
  }
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
  const JWT_SECRET = Deno.env.get("JWT_SECRET")

  if (!PROJECT_URL || !SERVICE_ROLE_KEY || !JWT_SECRET) {
    console.error("PROJECT_URL, SERVICE_ROLE_KEY ou JWT_SECRET manquant")
    return jsonResponse(
      { success: false, message: "Configuration serveur incomplète" },
      { status: 500 },
    )
  }

  // Vérifier le JWT
  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse(
      { success: false, message: "Token manquant" },
      { status: 401 },
    )
  }

  const token = authHeader.substring(7)
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )
    await verify(token, key)
  } catch (err) {
    console.error("JWT verification error", err)
    return jsonResponse(
      { success: false, message: "Token invalide" },
      { status: 401 },
    )
  }

  // Clients Supabase pour chaque schéma
  const supabaseAdhesion = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "adhesion" },
  })
  const supabaseFormation = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "formation" },
  })
  const supabaseWebinaire = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "webinaire" },
  })
  const supabaseTresorerie = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "tresorerie" },
  })
  const supabaseSecretariat = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "secretariat" },
  })
  const supabaseMentorat = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "mentorat" },
  })
  const supabaseRecrutement = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "recrutement" },
  })

  try {
    // Charger toutes les stats en parallèle
    const [
      adhesionStats,
      formationStats,
      webinaireStats,
      tresorerieStats,
      secretariatStats,
      mentoratStats,
      recrutementStats,
    ] = await Promise.allSettled([
      getAdhesionStats(supabaseAdhesion).catch(() => null),
      getFormationStats(supabaseFormation).catch(() => null),
      getWebinaireStats(supabaseWebinaire).catch(() => null),
      getTresorerieStats(supabaseTresorerie, supabaseAdhesion).catch(() => null),
      getSecretariatStats(supabaseSecretariat).catch(() => null),
      getMentoratStats(supabaseMentorat).catch(() => null),
      getRecrutementStats(supabaseRecrutement).catch(() => null),
    ])

    const stats = {
      adhesion: adhesionStats.status === "fulfilled" ? adhesionStats.value : null,
      formation: formationStats.status === "fulfilled" ? formationStats.value : null,
      webinaire: webinaireStats.status === "fulfilled" ? webinaireStats.value : null,
      tresorerie: tresorerieStats.status === "fulfilled" ? tresorerieStats.value : null,
      secretariat: secretariatStats.status === "fulfilled" ? secretariatStats.value : null,
      mentorat: mentoratStats.status === "fulfilled" ? mentoratStats.value : null,
      recrutement: recrutementStats.status === "fulfilled" ? recrutementStats.value : null,
    }

    return jsonResponse({
      success: true,
      data: stats,
    })
  } catch (err) {
    console.error("admin-dashboard-stats exception", err)
    return jsonResponse(
      { success: false, message: "Erreur serveur" },
      { status: 500 },
    )
  }
})
