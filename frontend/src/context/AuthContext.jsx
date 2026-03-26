import { useMemo, useState } from 'react'
import {
  getApiErrorMessage,
  login as loginRequest,
  register as registerRequest,
  verifyEmailOtp as verifyEmailOtpRequest,
} from '../api/authService'
import AuthContext from './authContextInstance'

const AUTH_STORAGE_KEY = 'auth'

function normalizeAuthPayload(data) {
  const token = data?.token || data?.accessToken || null
  const refreshToken = data?.refreshToken || null
  const tokenType = data?.tokenType || 'Bearer'
  const role = data?.role || data?.user?.role || null
  const user = data?.user || null

  if (!token || !role) {
    return null
  }

  return { token, refreshToken, tokenType, role, user }
}

function saveAuth(normalized, setAuth) {
  setAuth(normalized)
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized))
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const persisted = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!persisted) {
      return null
    }

    try {
      const parsed = JSON.parse(persisted)
      if (parsed?.token && parsed?.role) {
        return parsed
      }
    } catch {
      // Ignore parse errors and clear stale auth state.
    }

    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  })

  const login = async (credentials) => {
    const data = await loginRequest(credentials)
    const normalized = normalizeAuthPayload(data)

    if (!normalized) {
      throw new Error('Login response did not include token/role.')
    }

    saveAuth(normalized, setAuth)
    return normalized
  }

  const register = async (registrationData) => {
    const data = await registerRequest(registrationData)
    const normalized = normalizeAuthPayload(data)

    if (normalized) {
      saveAuth(normalized, setAuth)
      return normalized
    }

    return null
  }

  const logout = () => {
    setAuth(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const applyOAuthLogin = (oauthPayload) => {
    const normalized = normalizeAuthPayload(oauthPayload)
    if (!normalized) {
      throw new Error('OAuth response did not include token/role.')
    }

    saveAuth(normalized, setAuth)
    return normalized
  }

  const completeEmailVerification = async ({ email, otp }) => {
    const response = await verifyEmailOtpRequest({ email, otp })

    setAuth((previous) => {
      if (!previous?.user) {
        return previous
      }

      if (previous.user.email?.toLowerCase() !== email.toLowerCase()) {
        return previous
      }

      const updatedAuth = {
        ...previous,
        user: {
          ...previous.user,
          emailVerified: true,
        },
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedAuth))
      return updatedAuth
    })

    return response
  }

  const value = useMemo(
    () => ({
      auth,
      token: auth?.token || null,
      refreshToken: auth?.refreshToken || null,
      role: auth?.role || null,
      user: auth?.user || null,
      isAuthenticated: Boolean(auth?.token),
      isInitializing: false,
      login,
      register,
      applyOAuthLogin,
      completeEmailVerification,
      logout,
      getApiErrorMessage,
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}



