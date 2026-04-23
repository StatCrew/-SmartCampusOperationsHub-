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
  const [showPassword, setShowPassword] = useState(false)
  const [otpExpiresAt, setOtpExpiresAt] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [errors, setErrors] = useState({
    email: '',
    otp: '',
    password: '',
  })

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
    { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
    { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
    { label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  ]

  const validateField = (name, value) => {
    let err = ''
    if (name === 'email') {
      if (!value.trim()) {
        err = 'Email is required.'
      } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
        err = 'Invalid email address.'
      }
    } else if (name === 'otp') {
      if (!value.trim()) {
        err = 'OTP is required.'
      } else if (!/^\d{6}$/.test(value.trim())) {
        err = 'OTP must be 6 digits.'
      }
    } else if (name === 'password') {
      if (!value) {
        err = 'Password is required.'
      } else {
        const failed = passwordRequirements.filter((req) => !req.test(value))
        if (failed.length > 0) {
          err = 'Password does not meet all requirements.'
        }
      }
    }
    return err
  }

  const handleEmailChange = (val) => {
    setEmail(val)
    setErrors(prev => ({ ...prev, email: validateField('email', val) }))
  }

  const handleOtpChange = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 6)
    setOtp(clean)
    setErrors(prev => ({ ...prev, otp: validateField('otp', clean) }))
  }

  const handlePasswordChange = (val) => {
    setNewPassword(val)
    setErrors(prev => ({ ...prev, password: validateField('password', val) }))
  }

  const handleSendOtp = async (event) => {
    event.preventDefault()

    const err = validateField('email', email)
    if (err) {
      setErrors(prev => ({ ...prev, email: err }))
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

    const emailErr = validateField('email', email)
    const otpErr = validateField('otp', otp)
    const passErr = validateField('password', newPassword)

    if (emailErr || otpErr || passErr) {
      setErrors({ email: emailErr, otp: otpErr, password: passErr })
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
              onChange={(event) => handleEmailChange(event.target.value)}
              className={`w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 ${
                errors.email ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600 font-medium">{errors.email}</p>}
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
              onChange={(event) => handleOtpChange(event.target.value)}
              className={`w-full rounded-lg border px-3 py-2 tracking-[0.25em] outline-none transition focus:ring-2 ${
                errors.otp ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
              placeholder="123456"
            />
            {errors.otp && <p className="mt-1 text-xs text-red-600 font-medium">{errors.otp}</p>}
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => handlePasswordChange(event.target.value)}
                className={`w-full rounded-lg border px-3 py-2 pr-11 outline-none transition focus:ring-2 ${
                  errors.password ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            
            {/* Password Checklist */}
            <div className="mt-3 grid grid-cols-1 gap-y-1">
              {passwordRequirements.map((req, index) => {
                const isMet = req.test(newPassword)
                return (
                  <div key={index} className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[12px] ${isMet ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {isMet ? 'check_circle' : 'circle'}
                    </span>
                    <span className={`text-[10px] font-medium ${isMet ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {req.label}
                    </span>
                  </div>
                )
              })}
            </div>
            {errors.password && <p className="mt-2 text-xs text-red-600 font-medium">{errors.password}</p>}
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

