import apiClient from './authService'

const ADMIN_USERS_PREFIX = '/api/v1/admin/users'
const ADMIN_STORAGE_TEST_PREFIX = '/api/v1/admin/storage-test'
const ADMIN_NOTIFICATIONS_PREFIX = '/api/v1/admin/notifications'

function normalizeCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?._embedded?.userResponseList)) {
    return payload._embedded.userResponseList
  }

  if (Array.isArray(payload?._embedded?.users)) {
    return payload._embedded.users
  }

  if (Array.isArray(payload?.content)) {
    return payload.content
  }

  return []
}

function normalizePage(payload) {
  if (Array.isArray(payload)) {
    return {
      content: payload,
      number: 0,
      size: payload.length,
      totalElements: payload.length,
      totalPages: payload.length ? 1 : 0,
      first: true,
      last: true,
    }
  }

  if (payload?.content) {
    return payload
  }

  return {
    content: normalizeCollection(payload),
    number: 0,
    size: 0,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  }
}

function buildParams(params = {}) {
  const next = {}

  if (params.search) next.search = params.search
  if (params.role) next.role = params.role
  if (typeof params.active === 'boolean') next.active = params.active
  if (typeof params.page === 'number') next.page = params.page
  if (typeof params.size === 'number') next.size = params.size

  return next
}

export async function getUsers(params = {}) {
  const response = await apiClient.get(ADMIN_USERS_PREFIX, { params: buildParams(params) })
  return normalizePage(response.data)
}

export async function createTechnician(payload) {
  return createUser({ ...payload, role: 'TECHNICIAN' })
}

export async function createUser(payload) {
  const response = await apiClient.post(ADMIN_USERS_PREFIX, payload)
  return response.data
}

export async function updateUser(id, payload) {
  const response = await apiClient.put(`${ADMIN_USERS_PREFIX}/${id}`, payload)
  return response.data
}

export async function updateUserRole(id, role) {
  const response = await apiClient.patch(`${ADMIN_USERS_PREFIX}/${id}/role`, { role })
  return response.data
}

export async function updateUserStatus(id, status) {
  const response = await apiClient.patch(`${ADMIN_USERS_PREFIX}/${id}/status`, { active: status })
  return response.data
}

export async function deleteUser(id) {
  const response = await apiClient.delete(`${ADMIN_USERS_PREFIX}/${id}`)
  return response.data
}

export async function uploadAdminTestImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post(`${ADMIN_STORAGE_TEST_PREFIX}/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function getAdminTestFileUrl(key) {
  const response = await apiClient.get(`${ADMIN_STORAGE_TEST_PREFIX}/file-url`, {
    params: { key },
  })

  return response.data
}

export async function sendAdminTestNotification(payload) {
  const response = await apiClient.post(`${ADMIN_NOTIFICATIONS_PREFIX}/test`, payload)
  return response.data
}

