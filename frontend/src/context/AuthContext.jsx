import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getApiErrorMessage,
  getMyProfile as getMyProfileRequest,
  login as loginRequest,
  register as registerRequest,
  updateMyProfile as updateMyProfileRequest,
  verifyEmailOtp as verifyEmailOtpRequest,
  verifyEmailChange as verifyEmailChangeRequest,
} from '../api/authService'
import AuthContext from './authContextInstance'

const AUTH_STORAGE_KEY = 'auth'

function normalizeAuthPayload(data) {
  const token = data?.token || data?.accessToken || null
  const refreshToken = data?.refreshToken || null
  const tokenType = data?.tokenType || 'Bearer'
  const role = data?.role || data?.user?.role || null
  const active = typeof data?.active === 'boolean' ? data.active : data?.user?.active
  const user = data?.user || null

  if (!token || !role) {
    return null
  }

  return { token, refreshToken, tokenType, role, active, user }
}

function isUnverifiedLocalUser(authState) {
  return authState?.user?.provider === 'LOCAL' && authState?.user?.emailVerified === false
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
        if (isUnverifiedLocalUser(parsed)) {
          localStorage.removeItem(AUTH_STORAGE_KEY)
          return null
        }

        return parsed
      }
    } catch {
      // Ignore parse errors and clear stale auth state.
    }

    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  })

  const [isInitializing, setIsInitializing] = useState(() => Boolean(auth?.token))

  useEffect(() => {
    let isMounted = true

    const validatePersistedSession = async () => {
      if (!auth?.token) {
        setIsInitializing(false)
        return
      }

      setIsInitializing(true)

      try {
        const profile = await getMyProfileRequest()
        if (!isMounted) {
          return
        }

        setAuth((previous) => {
          if (!previous) {
            return previous
          }

          const nextAuth = {
            ...previous,
            role: profile.role || previous.role,
            user: {
              ...(previous.user || {}),
              ...profile,
              active:
                typeof profile.active === 'boolean'
                  ? profile.active
                  : previous.user?.active,
            },
          }

          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth))
          return nextAuth
        })
      } catch {
        if (!isMounted) {
          return
        }

        setAuth(null)
        localStorage.removeItem(AUTH_STORAGE_KEY)
      } finally {
        if (isMounted) {
          setIsInitializing(false)
        }
      }
    }

    validatePersistedSession()

    return () => {
      isMounted = false
    }
  }, [auth?.token])

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials)
    const normalized = normalizeAuthPayload(data)

    if (!normalized) {
      throw new Error('Login response did not include token/role.')
    }

    saveAuth(normalized, setAuth)
    return normalized
  }, [])

  const register = useCallback(async (registrationData) => {
    const data = await registerRequest(registrationData)
    const normalized = normalizeAuthPayload(data)

    if (normalized) {
      if (isUnverifiedLocalUser(normalized)) {
        setAuth(null)
        localStorage.removeItem(AUTH_STORAGE_KEY)
        return normalized
      }

      saveAuth(normalized, setAuth)
      return normalized
    }

    return null
  }, [])

  const logout = useCallback(() => {
    setAuth(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const applyOAuthLogin = useCallback((oauthPayload) => {
    const normalized = normalizeAuthPayload(oauthPayload)
    if (!normalized) {
      throw new Error('OAuth response did not include token/role.')
    }

    saveAuth(normalized, setAuth)
    return normalized
  }, [])

  const completeEmailVerification = useCallback(async ({ email, otp }) => {
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
  }, [])

  const syncProfile = useCallback((profile) => {
    if (!profile) {
      return
    }

    setAuth((previous) => {
      if (!previous) {
        return previous
      }

      const nextAuth = {
        ...previous,
        role: profile.role || previous.role,
        active:
          typeof profile.active === 'boolean'
            ? profile.active
            : previous.active,
        user: {
          ...(previous.user || {}),
          ...profile,
          emailVerified:
            typeof profile.emailVerified === 'boolean'
              ? profile.emailVerified
              : previous.user?.emailVerified,
          active:
            typeof profile.active === 'boolean'
              ? profile.active
              : previous.user?.active,
        },
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth))
      return nextAuth
    })
  }, [])

  const updateMyProfile = useCallback(async (payload) => {
    const response = await updateMyProfileRequest(payload)

    if (response?.profile) {
      syncProfile(response.profile)
    }

    return response
  }, [syncProfile])

  const completeEmailChange = useCallback(async ({ email, otp }) => {
    const response = await verifyEmailChangeRequest({ email, otp })
    const normalized = normalizeAuthPayload(response)

    if (normalized) {
      saveAuth(normalized, setAuth)
    }

    return response
  }, [])

  const value = useMemo(
    () => ({
      auth,
      token: auth?.token || null,
      refreshToken: auth?.refreshToken || null,
      role: auth?.role || null,
      active: auth?.active ?? auth?.user?.active ?? null,
      user: auth?.user || null,
      isAuthenticated: Boolean(auth?.token),
      isInitializing,
      login,
      register,
      applyOAuthLogin,
      completeEmailVerification,
      completeEmailChange,
      updateMyProfile,
      syncProfile,
      logout,
      getApiErrorMessage,
    }),
    [
      auth,
      applyOAuthLogin,
      completeEmailVerification,
      completeEmailChange,
      login,
      logout,
      register,
      updateMyProfile,
      syncProfile,
      isInitializing,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}



