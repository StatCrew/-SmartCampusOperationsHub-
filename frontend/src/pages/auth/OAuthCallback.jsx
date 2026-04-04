import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDashboardPathByRole } from '../../context/authRoles'
import useAuth from '../../context/useAuth'

function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { applyOAuthLogin } = useAuth()

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
          provider: provider || 'GOOGLE',
        },
      },
    }
  }, [searchParams])

  useEffect(() => {
    if (!oauthData.isValid) {
      return
    }

    try {
      const normalized = applyOAuthLogin(oauthData.payload)

      navigate(getDashboardPathByRole(normalized.role), { replace: true })
    } catch {
      navigate('/signin', { replace: true })
    }
  }, [applyOAuthLogin, navigate, oauthData])

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


