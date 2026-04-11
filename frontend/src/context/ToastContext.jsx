import { createContext, useCallback, useMemo, useState } from 'react'

const ToastContext = createContext(null)

const DEFAULT_DURATION = 3600

function getToastStyles(type) {
  switch (type) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    default:
      return 'border-slate-200 bg-white text-slate-800'
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message, options = {}) => {
    if (!message) {
      return null
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const duration = typeof options.duration === 'number' ? options.duration : DEFAULT_DURATION
    const nextToast = {
      id,
      type: options.type || 'info',
      message,
    }

    setToasts((previous) => [...previous, nextToast])

    window.setTimeout(() => {
      dismissToast(id)
    }, duration)

    return id
  }, [dismissToast])

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
      showSuccess: (message, options = {}) => showToast(message, { ...options, type: 'success' }),
      showError: (message, options = {}) => showToast(message, { ...options, type: 'error' }),
      showWarning: (message, options = {}) => showToast(message, { ...options, type: 'warning' }),
      showInfo: (message, options = {}) => showToast(message, { ...options, type: 'info' }),
    }),
    [dismissToast, showToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-sm ${getToastStyles(toast.type)}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="leading-5">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastContext

