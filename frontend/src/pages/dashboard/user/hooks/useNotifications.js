import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getNotificationPreferences,
  getMyNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from '../../../../api/notificationsApi'
import { connectNotificationsSocket } from '../../../../api/notificationsSocket'

const POLL_INTERVAL_MS = 45000
const MAX_ITEMS = 6

function useNotifications({ role, token, getApiErrorMessage }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const [preferences, setPreferences] = useState([])
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const disabledCategoriesRef = useRef(new Set())

  const applyNotificationEvent = useCallback((incomingNotification) => {
    if (!incomingNotification?.id) {
      return
    }

    const category = (incomingNotification.category || 'GENERAL').toUpperCase()
    if (disabledCategoriesRef.current.has(category)) {
      return
    }

    setNotifications((previous) => {
      const withoutCurrent = previous.filter((item) => item.id !== incomingNotification.id)
      return [incomingNotification, ...withoutCurrent].slice(0, MAX_ITEMS)
    })
  }, [])

  const refreshUnreadCount = useCallback(async () => {
    const count = await getUnreadCount()
    setUnreadCount(count)
  }, [])

  const loadPreferences = useCallback(async () => {
    const response = await getNotificationPreferences()
    setPreferences(response)

    const disabled = new Set(
      response
        .filter((item) => item && item.enabled === false)
        .map((item) => String(item.category || '').toUpperCase()),
    )

    disabledCategoriesRef.current = disabled
  }, [])

  const loadNotifications = useCallback(async () => {
    setErrorMessage('')

    try {
      const page = await getMyNotifications({ page: 0, size: 6 })
      setNotifications(Array.isArray(page?.content) ? page.content : [])
      await refreshUnreadCount()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [getApiErrorMessage, refreshUnreadCount])

  useEffect(() => {
    let isMounted = true

    const guardedLoad = async () => {
      if (!isMounted) {
        return
      }
      await loadNotifications()
    }

    guardedLoad()
    loadPreferences().catch(() => {
      // Preferences are optional for initial render.
    })

    const intervalId = setInterval(() => {
      if (!isSocketConnected) {
        guardedLoad()
      }
    }, POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [isSocketConnected, loadNotifications, loadPreferences])

  useEffect(() => {
    if (!token) {
      setIsSocketConnected(false)
      return () => {}
    }

    const connection = connectNotificationsSocket({
      token,
      role,
      onNotification: applyNotificationEvent,
      onUnreadCount: (count) => setUnreadCount(Number(count) || 0),
      onConnect: () => setIsSocketConnected(true),
      onDisconnect: () => setIsSocketConnected(false),
      onError: () => setIsSocketConnected(false),
    })

    return () => {
      connection.disconnect()
      setIsSocketConnected(false)
    }
  }, [applyNotificationEvent, role, token])

  const markOneAsRead = useCallback(async (id) => {
    await markNotificationRead(id)
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              read: true,
            }
          : item,
      ),
    )
    setUnreadCount((previous) => Math.max(previous - 1, 0))
  }, [])

  const markAllAsRead = useCallback(async () => {
    await markAllNotificationsRead()
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })))
    setUnreadCount(0)
  }, [])

  const togglePreference = useCallback(
    async (category) => {
      if (!category) {
        return
      }

      setIsSavingPreferences(true)
      setErrorMessage('')

      try {
        const nextPreferences = preferences.map((item) =>
          item.category === category ? { ...item, enabled: !item.enabled } : item,
        )

        const payload = nextPreferences.map((item) => ({
          category: item.category,
          enabled: item.enabled,
        }))

        const updated = await updateNotificationPreferences(payload)
        setPreferences(updated)

        const disabled = new Set(
          updated
            .filter((item) => item && item.enabled === false)
            .map((item) => String(item.category || '').toUpperCase()),
        )
        disabledCategoriesRef.current = disabled

        await loadNotifications()
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error))
      } finally {
        setIsSavingPreferences(false)
      }
    },
    [getApiErrorMessage, loadNotifications, preferences],
  )

  const orderedPreferences = useMemo(
    () => [...preferences].sort((a, b) => String(a.category).localeCompare(String(b.category))),
    [preferences],
  )

  return {
    notifications,
    unreadCount,
    isLoading,
    errorMessage,
    isSocketConnected,
    preferences: orderedPreferences,
    isSavingPreferences,
    loadNotifications,
    markOneAsRead,
    markAllAsRead,
    togglePreference,
  }
}

export default useNotifications

