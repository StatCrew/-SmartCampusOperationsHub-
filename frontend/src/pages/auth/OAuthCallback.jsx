import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDashboardPathByRole } from '../../context/authRoles'
import useAuth from '../../context/useAuth'
import useToast from '../../context/useToast'

function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { applyOAuthLogin } = useAuth()
  const { showError, showSuccess } = useToast()
  const hasHandledCallback = useRef(false)

  const oauthData = useMemo(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const tokenType = searchParams.get('tokenType') || 'Bearer'
    const role = searchParams.get('role')
    const id = searchParams.get('id')
    const fullName = searchParams.get('fullName')
    const email = searchParams.get('email')
    const provider = searchParams.get('provider')
    const emailVerified = searchParams.get('emailVerified') === 'true'
    const active = searchParams.get('active') === 'true'

    const isValid = Boolean(accessToken && role)

    return {
      isValid,
      payload: {
        accessToken,
        refreshToken,
        tokenType,
        user: {
          id: id ? Number(id) : null,
          fullName: fullName || '',
          email: email || '',
          role,
          emailVerified,
          active,
          provider: provider || 'GOOGLE',
        },
      },
    }
  }, [searchParams])

  useEffect(() => {
    if (hasHandledCallback.current) {
      return
    }

    hasHandledCallback.current = true

    if (!oauthData.isValid) {
      showError('Google login response is invalid. Please try again.')
      navigate('/signin?oauth=failed&message=Google%20login%20failed', { replace: true })
      return
    }

    try {
      const normalized = applyOAuthLogin(oauthData.payload)
      showSuccess('Signed in with Google successfully.')

      navigate(getDashboardPathByRole(normalized.role), { replace: true })
    } catch {
      showError('Google sign in failed. Please try again.')
      navigate('/signin', { replace: true })
    }
  }, [applyOAuthLogin, navigate, oauthData, showError, showSuccess])

  if (!oauthData.isValid) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Google login response is invalid. Please try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <p className="text-slate-600">Completing Google sign in...</p>
      </div>
    </div>
  )
}

export default OAuthCallback


