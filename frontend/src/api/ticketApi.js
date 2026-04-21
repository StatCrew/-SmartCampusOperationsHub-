import apiClient from "./authService";

const USER_TICKETS_PREFIX = '/api/tickets'
const ADMIN_TICKETS_PREFIX = '/api/admin/tickets'
const TECHNICIAN_TICKETS_PREFIX = '/api/technician/tickets'

function normalizeCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?._embedded?.ticketResponseList)) {
    return payload._embedded.ticketResponseList
  }

  if (Array.isArray(payload?._embedded?.ticketResponses)) {
    return payload._embedded.ticketResponses
  }

  if (Array.isArray(payload?._embedded?.tickets)) {
    return payload._embedded.tickets
  }

  if (Array.isArray(payload?._embedded?.ticketList)) {
    return payload._embedded.ticketList
  }

  if (Array.isArray(payload?.content)) {
    return payload.content
  }

  return []
}

function buildParams(params = {}) {
  const next = {}

  if (params.search) next.search = params.search
  if (params.status) next.status = params.status
  if (params.category) next.category = params.category
  if (params.priority) next.priority = params.priority
  if (typeof params.page === 'number') next.page = params.page
  if (typeof params.size === 'number') next.size = params.size

  return next
}

function toTicketFormData(ticketPayload, files = []) {
  const formData = new FormData()
  const ticketBlob = new Blob([JSON.stringify(ticketPayload)], { type: 'application/json' })

  formData.append('ticket', ticketBlob)

  files
    .filter(Boolean)
    .forEach((file) => {
      formData.append('files', file)
    })

  return formData
}

async function normalizeResponse(response) {
  return response.data
}

export async function getTicketComments(ticketId) {
  const response = await apiClient.get(`${USER_TICKETS_PREFIX}/${ticketId}/comments`)
  return Array.isArray(response.data) ? response.data : []
}

export async function createTicketComment(ticketId, message) {
  const response = await apiClient.post(`${USER_TICKETS_PREFIX}/${ticketId}/comments`, { message })
  return normalizeResponse(response)
}

export async function updateTicketComment(ticketId, commentId, message) {
  const response = await apiClient.put(`${USER_TICKETS_PREFIX}/${ticketId}/comments/${commentId}`, { message })
  return normalizeResponse(response)
}

export async function deleteTicketComment(ticketId, commentId) {
  const response = await apiClient.delete(`${USER_TICKETS_PREFIX}/${ticketId}/comments/${commentId}`)
  return normalizeResponse(response)
}

export async function getUserTickets(params = {}) {
  const response = await apiClient.get(`${USER_TICKETS_PREFIX}/my`, { params: buildParams(params) })
  return normalizeCollection(response.data)
}

export async function getUserTicketById(id) {
  const response = await apiClient.get(`${USER_TICKETS_PREFIX}/${id}`)
  return response.data
}

export async function getUserTicketAttachmentUrl(id, key) {
  const response = await apiClient.get(`${USER_TICKETS_PREFIX}/${id}/attachments/file-url`, {
    params: { key },
  })
  return response.data
}

export async function createTicket(ticketPayload, files = []) {
  const response = await apiClient.post(USER_TICKETS_PREFIX, toTicketFormData(ticketPayload, files), {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function updateTicket(id, ticketPayload, files = []) {
  const response = await apiClient.put(`${USER_TICKETS_PREFIX}/${id}/with-files`, toTicketFormData(ticketPayload, files), {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function deleteTicket(id) {
  const response = await apiClient.delete(`${USER_TICKETS_PREFIX}/${id}`)
  return response.data
}

export async function rateUserTicket(id, rating, feedback) {
  const response = await apiClient.put(`${USER_TICKETS_PREFIX}/${id}/rate`, { rating, feedback })
  return response.data
}

export async function getAdminTickets(params = {}) {
  const response = await apiClient.get(ADMIN_TICKETS_PREFIX, { params: buildParams(params) })
  return normalizeCollection(response.data)
}

export async function getAdminTicketById(id) {
  const response = await apiClient.get(`${ADMIN_TICKETS_PREFIX}/${id}`)
  return response.data
}

export async function getAdminTicketAttachmentUrl(id, key) {
  const response = await apiClient.get(`${ADMIN_TICKETS_PREFIX}/${id}/attachments/file-url`, {
    params: { key },
  })
  return response.data
}

export async function updateAdminTicketStatus(id, status) {
  const response = await apiClient.put(`${ADMIN_TICKETS_PREFIX}/${id}/status`, null, {
    params: { status },
  })

  return response.data
}

export async function assignAdminTicket(id, technicianId) {
  const response = await apiClient.put(`${ADMIN_TICKETS_PREFIX}/${id}/assign`, { technicianId })
  return response.data
}

export async function rejectAdminTicket(id, reason) {
  const response = await apiClient.put(`${ADMIN_TICKETS_PREFIX}/${id}/reject`, { reason })
  return response.data
}

export async function getTechnicianTickets(params = {}) {
  const response = await apiClient.get(TECHNICIAN_TICKETS_PREFIX, { params: buildParams(params) })
  return normalizeCollection(response.data)
}

export async function getTechnicianTicketById(id) {
  const response = await apiClient.get(`${TECHNICIAN_TICKETS_PREFIX}/${id}`)
  return response.data
}

export async function getTechnicianTicketAttachmentUrl(id, key) {
  const response = await apiClient.get(`${TECHNICIAN_TICKETS_PREFIX}/${id}/attachments/file-url`, {
    params: { key },
  })
  return response.data
}

export async function resolveTechnicianTicket(id, notes) {
  const response = await apiClient.put(`${TECHNICIAN_TICKETS_PREFIX}/${id}/resolve`, { notes })
  return response.data
}

const ticketApi = {
  getUserTickets,
  getUserTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getAdminTickets,
  getAdminTicketById,
  updateAdminTicketStatus,
  getTechnicianTickets,
  getTechnicianTicketById,
}

export default ticketApi


