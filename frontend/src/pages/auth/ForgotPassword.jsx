import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage, resetForgotPassword, sendForgotPasswordOtp } from '../../api/authService'
import useToast from '../../context/useToast'

function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()

  const defaultEmail = useMemo(() => searchParams.get('email') || '', [searchParams])

  const [email, setEmail] = useState(defaultEmail)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [otpExpiresAt, setOtpExpiresAt] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const validateEmail = () => {
    if (!email.trim()) {
      showError('Email is required.')
      return false
    }

    return true
  }

  const handleSendOtp = async (event) => {
    event.preventDefault()

    if (!validateEmail()) {
      return
    }

    setIsSendingOtp(true)

    try {
      const response = await sendForgotPasswordOtp({ email: email.trim() })
      showSuccess(response?.message || 'Password reset code sent.')
      setOtpExpiresAt(response?.otpExpiresAt || '')
    } catch (sendError) {
      showError(getApiErrorMessage(sendError))
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()

    if (!validateEmail()) {
      return
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      showError('OTP must be a 6 digit code.')
      return
    }

    if (newPassword.length < 8) {
      showError('New password must be at least 8 characters.')
      return
    }

    setIsResettingPassword(true)

    try {
      const response = await resetForgotPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      })

      showSuccess(response?.message || 'Password reset successfully.')
      setTimeout(() => {
        navigate('/signin', { replace: true })
      }, 900)
    } catch (resetError) {
      showError(getApiErrorMessage(resetError))
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Forgot Password</h1>
        <p className="mt-1 text-sm text-slate-600">Request an OTP and set a new password.</p>

        <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
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

          <button
            type="submit"
            disabled={isSendingOtp}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSendingOtp ? 'Sending code...' : 'Send Reset OTP'}
          </button>
        </form>

        <form onSubmit={handleResetPassword} className="mt-4 space-y-4 border-t border-slate-200 pt-4">
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

          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Minimum 8 characters"
            />
          </div>

          {otpExpiresAt ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">OTP expires at: {otpExpiresAt}</p>
          ) : null}


          <button
            type="submit"
            disabled={isResettingPassword}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isResettingPassword ? 'Resetting password...' : 'Reset Password'}
          </button>
        </form>

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

export default ForgotPassword

