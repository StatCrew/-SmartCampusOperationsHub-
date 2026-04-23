import React, { createContext, useContext } from 'react'
import useAuth from './useAuth'
import useNotificationsHook from '../pages/dashboard/user/hooks/useNotifications'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { role, token, getApiErrorMessage } = useAuth()
  const notificationsState = useNotificationsHook({ role, token, getApiErrorMessage })

  return (
    <NotificationContext.Provider value={notificationsState}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}
