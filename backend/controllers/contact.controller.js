// backend/controllers/contact.controller.js
import { logError } from '../utils/logger.js'
import {
  createMessage,
  listMessages,
  updateMessageStatus,
} from '../services/contact.service.js'

export async function createContactMessage(req, res) {
  try {
    const message = await createMessage(req.body)
    return res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: message,
    })
  } catch (err) {
    logError('createContactMessage controller error', err)
    return res.status(400).json({
      success: false,
      message: err.message || "Impossible d'envoyer le message",
    })
  }
}

export async function getContactMessages(req, res) {
  try {
    const { page, limit, status, search } = req.query
    const result = await listMessages({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
      search,
    })

    return res.json({
      success: true,
      ...result,
    })
  } catch (err) {
    logError('getContactMessages controller error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors du chargement des messages',
    })
  }
}

export async function changeContactMessageStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body
    const message = await updateMessageStatus(id, status)

    return res.json({
      success: true,
      message: 'Statut mis à jour',
      data: message,
    })
  } catch (err) {
    logError('changeContactMessageStatus controller error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Impossible de mettre à jour le statut',
    })
  }
}








