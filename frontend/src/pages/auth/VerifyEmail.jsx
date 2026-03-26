import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { sendVerificationOtp } from '../../api/authService'
import { getDashboardPathByRole } from '../../context/authRoles'
import useAuth from '../../context/useAuth'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, role, completeEmailVerification, getApiErrorMessage } = useAuth()

  const defaultEmail = useMemo(
    () => searchParams.get('email') || user?.email || '',
    [searchParams, user?.email],
  )

  const [email, setEmail] = useState(defaultEmail)
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const handleVerify = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!email.trim()) {
      setError('Email is required.')
      return
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('OTP must be a 6 digit code.')
      return
    }

    setIsVerifying(true)

    try {
      const response = await completeEmailVerification({ email: email.trim(), otp: otp.trim() })
      setMessage(response?.message || 'Email verified successfully.')

      if (role) {
        navigate(getDashboardPathByRole(role), { replace: true })
      } else {
        navigate('/signin', { replace: true })
      }
    } catch (verifyError) {
      setError(getApiErrorMessage(verifyError))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setMessage('')
    setError('')

    if (!email.trim()) {
      setError('Enter your email to resend OTP.')
      return
    }

    setIsResending(true)

    try {
      const response = await sendVerificationOtp({ email: email.trim() })
      setMessage(response?.message || 'Verification code sent.')
    } catch (resendError) {
      setError(getApiErrorMessage(resendError))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Verify Your Email</h1>
        <p className="mt-1 text-sm text-slate-600">Enter the 6 digit OTP sent to your email.</p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="otp" className="mb-1 block text-sm font-medium text-slate-700">
              OTP Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 tracking-[0.25em] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="123456"
            />
          </div>

          {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isResending ? 'Sending...' : 'Resend OTP'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          Back to{' '}
          <Link to="/signin" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

export default VerifyEmail

