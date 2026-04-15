import { Client } from '@stomp/stompjs'

function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_API_URL ||
    'http://localhost:8080'
  ).replace(/\/$/, '')
}

function buildWebSocketUrl(token) {
  const apiBaseUrl = getApiBaseUrl()
  const wsBaseUrl = apiBaseUrl.replace(/^http/i, 'ws')
  const encodedToken = encodeURIComponent(token)
  return `${wsBaseUrl}/ws-notifications?token=${encodedToken}`
}

function parseJson(payload) {
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export function connectNotificationsSocket({
  token,
  role,
  onNotification,
  onUnreadCount,
  onConnect,
  onDisconnect,
  onError,
}) {
  if (!token) {
    return { disconnect: () => {} }
  }

  const client = new Client({
    brokerURL: buildWebSocketUrl(token),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  })

  client.onConnect = () => {
    client.subscribe('/user/queue/notifications', (message) => {
      const parsed = parseJson(message.body)
      if (parsed && onNotification) {
        onNotification(parsed)
      }
    })

    client.subscribe('/user/queue/notification-count', (message) => {
      const parsed = parseJson(message.body)
      if (parsed?.unreadCount != null && onUnreadCount) {
        onUnreadCount(parsed.unreadCount)
      }
    })

    if (role) {
      client.subscribe(`/topic/roles/${role}/notifications`, (message) => {
        const parsed = parseJson(message.body)
        if (parsed && onNotification) {
          onNotification(parsed)
        }
      })
    }

    if (onConnect) {
      onConnect()
    }
  }

  client.onStompError = () => {
    if (onError) {
      onError()
    }
  }

  client.onWebSocketClose = () => {
    if (onDisconnect) {
      onDisconnect()
    }
  }

  client.activate()

  return {
    disconnect: () => {
      client.deactivate()
    },
  }
}

