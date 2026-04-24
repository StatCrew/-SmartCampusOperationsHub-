import axios from 'axios'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? `${window.location.protocol}//${window.location.hostname}` 
    : 'http://localhost:8080')
).replace(/\/$/, '')
const AUTH_PREFIX = import.meta.env.VITE_AUTH_PREFIX || '/api/v1/auth'
const GOOGLE_AUTH_PATH = import.meta.env.VITE_GOOGLE_AUTH_PATH || '/oauth2/authorization/google'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const persistedAuth = localStorage.getItem('auth')

  if (!persistedAuth) {
    return config
  }

  try {
    const auth = JSON.parse(persistedAuth)
    if (auth?.token) {
      config.headers.Authorization = `Bearer ${auth.token}`
    }
  } catch {
    localStorage.removeItem('auth')
  }

  return config
})

export async function login(payload) {
  const response = await apiClient.post(`${AUTH_PREFIX}/login`, payload)
  return response.data
}

export async function register(payload) {
  const response = await apiClient.post(`${AUTH_PREFIX}/register`, payload)
  return response.data
}

export async function sendVerificationOtp(payload) {
  const response = await apiClient.post(`${AUTH_PREFIX}/email-verification/send-otp`, payload)
  return response.data
}

export async function verifyEmailOtp(payload) {
  const response = await apiClient.post(`${AUTH_PREFIX}/email-verification/verify`, payload)
  return response.data
}

export async function getMyProfile() {
  const response = await apiClient.get(`${AUTH_PREFIX}/me`)
  return response.data
}

export async function updateMyProfile(payload) {
  const response = await apiClient.put('/api/v1/users/me', payload)
  return response.data
}

export async function verifyEmailChange(payload) {
  const response = await apiClient.post('/api/v1/users/me/email-change/verify', payload)
  return response.data
}

export async function sendForgotPasswordOtp(payload) {
  const response = await apiClient.post(`${AUTH_PREFIX}/forgot-password/send-otp`, payload)
  return response.data
}

export async function resetForgotPassword(payload) {
  const response = await apiClient.post(`${AUTH_PREFIX}/forgot-password/reset`, payload)
  return response.data
}

export function getGoogleLoginUrl() {
  return new URL(GOOGLE_AUTH_PATH, API_BASE_URL).toString()
}

export function getApiErrorMessage(error) {
  const status = error?.response?.status

  if (error?.response?.data?.message) {
    return error.response.data.message
  }

  if (error?.response?.data?.error) {
    return error.response.data.error
  }

  if (status === 401) {
    return 'Invalid email or password.'
  }

  if (status === 403) {
    return 'Access denied. If you recently signed up, please verify your email first.'
  }

  return error?.message || 'Something went wrong. Please try again.'
}

export default apiClient



