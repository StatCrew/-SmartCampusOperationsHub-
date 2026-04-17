import apiClient from './authService'

const NOTIFICATIONS_PREFIX = '/api/v1/notifications'

export async function getMyNotifications(params = {}) {
  const response = await apiClient.get(`${NOTIFICATIONS_PREFIX}/me`, {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 6,
      unreadOnly: params.unreadOnly ?? false,
    },
  })

  return response.data
}

export async function getUnreadCount() {
  const response = await apiClient.get(`${NOTIFICATIONS_PREFIX}/me/unread-count`)
  return response.data?.unreadCount ?? 0
}

export async function markNotificationRead(id) {
  const response = await apiClient.patch(`${NOTIFICATIONS_PREFIX}/${id}/read`)
  return response.data
}

export async function markAllNotificationsRead() {
  const response = await apiClient.patch(`${NOTIFICATIONS_PREFIX}/me/read-all`)
  return response.data
}

export async function getNotificationPreferences() {
  const response = await apiClient.get(`${NOTIFICATIONS_PREFIX}/me/preferences`)
  return Array.isArray(response.data) ? response.data : []
}

export async function updateNotificationPreferences(preferences) {
  const response = await apiClient.put(`${NOTIFICATIONS_PREFIX}/me/preferences`, {
    preferences,
  })

  return Array.isArray(response.data) ? response.data : []
}

