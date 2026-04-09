import { useCallback, useEffect, useState } from 'react'
import {
  getMyNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../../api/notificationsApi'

const POLL_INTERVAL_MS = 45000

function useNotifications({ getApiErrorMessage }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const refreshUnreadCount = useCallback(async () => {
    const count = await getUnreadCount()
    setUnreadCount(count)
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
    const intervalId = setInterval(guardedLoad, POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [loadNotifications])

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

  return {
    notifications,
    unreadCount,
    isLoading,
    errorMessage,
    loadNotifications,
    markOneAsRead,
    markAllAsRead,
  }
}

export default useNotifications

