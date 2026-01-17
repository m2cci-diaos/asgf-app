// backend/utils/formationEmailContext.js
import { supabaseFormation } from '../config/supabase.js'

export async function getFormationEmailContext(formationId, sessionId) {
  const context = {
    formationTitle: '',
    formationMode: '',
    formationSlug: '',
    sessionDate: '',
  }

  if (formationId) {
    const { data: formation } = await supabaseFormation
      .from('formations')
      .select('titre, mode, slug')
      .eq('id', formationId)
      .maybeSingle()

    if (formation) {
      context.formationTitle = formation.titre || ''
      context.formationMode = formation.mode || ''
      context.formationSlug = formation.slug || ''
    }
  }

  if (sessionId) {
    const { data: session } = await supabaseFormation
      .from('sessions')
      .select('date_debut')
      .eq('id', sessionId)
      .maybeSingle()

    if (session?.date_debut) {
      context.sessionDate = session.date_debut
    }
  }

  return context
}











