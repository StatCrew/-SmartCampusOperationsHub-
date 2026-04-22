import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import { NotificationProvider } from '../context/NotificationContext'
import AppRoutes from '../routes/AppRoutes'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

