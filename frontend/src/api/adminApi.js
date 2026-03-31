import apiClient from './authService'

const ADMIN_USERS_PREFIX = '/api/v1/admin/users'

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

export async function getUsers() {
  const response = await apiClient.get(ADMIN_USERS_PREFIX)
  return normalizeCollection(response.data)
}

export async function createTechnician(payload) {
  const response = await apiClient.post(`${ADMIN_USERS_PREFIX}/technician`, payload)
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

