import apiClient from './authService'

const RESOURCE_PREFIX = '/api/v1/resources'

// Normalize various response shapes (array, page, HATEOAS)
function normalizeCollection(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?._embedded?.resourceResponseList))
    return payload._embedded.resourceResponseList
  if (Array.isArray(payload?._embedded?.resources))
    return payload._embedded.resources
  if (Array.isArray(payload?.content)) return payload.content
  return []
}

function buildParams(params = {}) {
  const next = {}
  if (params.type)     next.type     = params.type
  if (params.status)   next.status   = params.status
  if (params.location) next.location = params.location
  if (typeof params.minCapacity === 'number') next.minCapacity = params.minCapacity
  return next
}

// GET /api/v1/resources   — USER, ADMIN, TECHNICIAN
export async function getAllResources(params = {}) {
  const response = await apiClient.get(RESOURCE_PREFIX, { params: buildParams(params) })
  return normalizeCollection(response.data)
}

// GET /api/v1/resources/:id   — USER, ADMIN, TECHNICIAN
export async function getResourceById(id) {
  const response = await apiClient.get(`${RESOURCE_PREFIX}/${id}`)
  return response.data
}

// POST /api/v1/resources   — ADMIN, TECHNICIAN
export async function createResource(payload) {
  const response = await apiClient.post(RESOURCE_PREFIX, payload)
  return response.data
}

// PUT /api/v1/resources/:id   — ADMIN, TECHNICIAN
export async function updateResource(id, payload) {
  const response = await apiClient.put(`${RESOURCE_PREFIX}/${id}`, payload)
  return response.data
}

// DELETE /api/v1/resources/:id   — ADMIN only
export async function deleteResource(id) {
  const response = await apiClient.delete(`${RESOURCE_PREFIX}/${id}`)
  return response.data
}

// POST /api/v1/resources/:id/image   — ADMIN, TECHNICIAN
export async function uploadResourceImage(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post(`${RESOURCE_PREFIX}/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const RESOURCE_TYPES    = ['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT']
export const RESOURCE_STATUSES = ['ACTIVE', 'OUT_OF_SERVICE']

export function formatResourceType(type) {
  const map = {
    LECTURE_HALL: 'Lecture Hall',
    LAB:          'Laboratory',
    MEETING_ROOM: 'Meeting Room',
    EQUIPMENT:    'Equipment',
  }
  return map[type] || type
}