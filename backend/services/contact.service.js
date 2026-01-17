// backend/services/contact.service.js
import { supabasePublic } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'
import { notifyContactMessage } from './notifications.service.js'

const ALLOWED_STATUS = ['pending', 'in_progress', 'resolved']

export async function createMessage(payload = {}) {
  try {
    const { full_name, email, subject, message } = payload

    if (!full_name || !email || !subject || !message) {
      throw new Error('full_name, email, subject et message sont requis')
    }

    const { data, error } = await supabasePublic
      .from('contact_messages')
      .insert({
        full_name: full_name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      })
      .select()
      .single()

    if (error) {
      logError('createMessage error', error)
      throw new Error("Impossible d'enregistrer votre message pour le moment")
    }

    logInfo('Nouveau message de contact enregistré', { id: data.id, email: data.email })
    await notifyContactMessage({
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      created_at: data.created_at,
    })

    return data
  } catch (err) {
    logError('createMessage exception', err)
    throw err
  }
}

export async function listMessages({ page = 1, limit = 20, status = '', search = '' } = {}) {
  try {
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabasePublic
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status && ALLOWED_STATUS.includes(status)) {
      query = query.eq('status', status)
    }

    if (search) {
      const sanitized = search.trim()
      query = query.or(
        `full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,subject.ilike.%${sanitized}%`
      )
    }

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('listMessages error', error)
      throw new Error('Erreur lors de la récupération des messages')
    }

    return {
      data,
      meta: {
        page,
        limit,
        total: count || 0,
      },
    }
  } catch (err) {
    logError('listMessages exception', err)
    throw err
  }
}

export async function updateMessageStatus(messageId, status) {
  try {
    if (!messageId) {
      throw new Error('messageId requis')
    }
    if (!ALLOWED_STATUS.includes(status)) {
      throw new Error(
        `Statut invalide. Valeurs autorisées: ${ALLOWED_STATUS.join(', ')}`
      )
    }

    const { data, error } = await supabasePublic
      .from('contact_messages')
      .update({ status })
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      logError('updateMessageStatus error', error)
      throw new Error('Impossible de mettre à jour le statut du message')
    }

    logInfo('Statut du message mis à jour', { id: messageId, status })
    return data
  } catch (err) {
    logError('updateMessageStatus exception', err)
    throw err
  }
}

