import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getGoogleLoginUrl } from '../../api/authService'
import { getDashboardPathByRole } from '../../context/authRoles'
import useAuth from '../../context/useAuth'

function SignIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, getApiErrorMessage } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const oauthError = searchParams.get('oauth') === 'failed' ? searchParams.get('message') || 'Google sign in failed.' : ''

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    setServerError('')
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required.'
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Password is required.'
    }

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validateForm()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const authenticatedUser = await login(formData)
      navigate(getDashboardPathByRole(authenticatedUser.role), { replace: true })
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      if (errorMessage.toLowerCase().includes('email is not verified')) {
        navigate(`/verify-email?email=${encodeURIComponent(formData.email.trim())}`, { replace: true })
        return
      }

      setServerError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = () => {
    window.location.href = getGoogleLoginUrl()
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Sign In</h1>
        <p className="mt-1 text-sm text-slate-600">Access your Smart Campus account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="you@example.com"
            />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="********"
            />
            {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
            <div className="mt-2 text-right">
              <Link to="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Forgot password?
              </Link>
            </div>
          </div>

          {oauthError ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{oauthError}</p>
          ) : null}

          {serverError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Continue with Google
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Do not have an account?{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default SignIn




