import { useEffect, useMemo, useState } from 'react'
import useAuth from '../../../../context/useAuth'

function UserProfileDetailsCard({ loadingProfile, profile, onReloadProfile }) {
  const { updateMyProfile, completeEmailChange, getApiErrorMessage } = useAuth()
  const [fullName, setFullName] = useState(profile?.fullName || '')
  const [email, setEmail] = useState(profile?.email || '')
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '')
  const [otp, setOtp] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    setFullName(profile?.fullName || '')
    setEmail(profile?.email || '')
    setPhoneNumber(profile?.phoneNumber || '')
  }, [profile?.fullName, profile?.email, profile?.phoneNumber])

  const emailChanged = useMemo(
    () => email.trim().toLowerCase() !== (profile.email || '').trim().toLowerCase(),
    [email, profile.email],
  )

  const validateField = (name, value) => {
    let err = ''
    if (name === 'fullName') {
      if (!value.trim()) {
        err = 'Full name is required.'
      } else if (!/^[a-zA-Z\s]{2,50}$/.test(value.trim())) {
        err = 'Name must be 2-50 characters (letters only).'
      }
    } else if (name === 'email') {
      if (!value.trim()) {
        err = 'Email is required.'
      } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
        err = 'Invalid email address.'
      }
    } else if (name === 'phoneNumber') {
      if (value.trim() && !/^\d{10}$/.test(value.trim())) {
        err = 'Phone number must be exactly 10 digits.'
      }
    }
    return err
  }

  const handleNameChange = (val) => {
    const cleanVal = val.replace(/[^a-zA-Z\s]/g, '')
    setFullName(cleanVal)
    setFieldErrors(prev => ({ ...prev, fullName: validateField('fullName', cleanVal) }))
  }

  const handleEmailChange = (val) => {
    setEmail(val)
    setFieldErrors(prev => ({ ...prev, email: validateField('email', val) }))
  }

  const handlePhoneChange = (val) => {
    setPhoneNumber(val)
    setFieldErrors(prev => ({ ...prev, phoneNumber: validateField('phoneNumber', val) }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    
    const nameErr = validateField('fullName', fullName)
    const emailErr = emailChanged ? validateField('email', email) : ''
    const phoneErr = validateField('phoneNumber', phoneNumber)

    if (nameErr || emailErr || phoneErr) {
      setFieldErrors({ fullName: nameErr, email: emailErr, phoneNumber: phoneErr })
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await updateMyProfile({
          fullName,
        email: emailChanged ? email : '',
        phoneNumber,
      })

      if (response?.profile) {
        setFullName(response.profile.fullName || fullName)
        setEmail(response.profile.email || email)
        setPhoneNumber(response.profile.phoneNumber || phoneNumber)
      }

      if (response?.emailVerificationRequired) {
        setPendingEmail(response.pendingEmail || email)
        setEmailVerificationRequired(true)
        setMessage(response.message || 'Verification code sent to your new email address')
      } else {
        setPendingEmail('')
        setEmailVerificationRequired(false)
        setOtp('')
        setMessage(response?.message || 'Profile updated successfully')
      }

      onReloadProfile?.()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyEmailChange = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await completeEmailChange({ email: pendingEmail || email, otp })
      setEmail(pendingEmail || email)
      setEmailVerificationRequired(false)
      setPendingEmail('')
      setOtp('')
      setMessage('Email updated successfully')
      onReloadProfile?.()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Update Profile</h3>
        <button
          type="button"
          onClick={onReloadProfile}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Refresh Data
        </button>
      </div>

      {loadingProfile ? (
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : (
        <>
          {error ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {message ? <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

          <form className="space-y-5" onSubmit={handleSave}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Full Name</p>
                <input
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                    fieldErrors.fullName ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                  }`}
                  type="text"
                />
                {fieldErrors.fullName && <p className="mt-1 text-[10px] font-medium text-red-600">{fieldErrors.fullName}</p>}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
                <input
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                    fieldErrors.email ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                  }`}
                  type="email"
                />
                {fieldErrors.email && <p className="mt-1 text-[10px] font-medium text-red-600">{fieldErrors.email}</p>}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Phone Number</p>
                <input
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={10}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                    fieldErrors.phoneNumber ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                  }`}
                  type="tel"
                  placeholder="10 digit number"
                />
                {fieldErrors.phoneNumber && <p className="mt-1 text-[10px] font-medium text-red-600">{fieldErrors.phoneNumber}</p>}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Role</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                  {profile?.role || 'USER'}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Account Source</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                  {profile?.provider || 'Local'}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Update Profile'}
            </button>
          </form>

          {emailVerificationRequired ? (
            <form className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4" onSubmit={handleVerifyEmailChange}>
              <p className="text-sm font-semibold text-amber-900">Confirm your new email</p>
              <p className="mt-1 text-xs text-amber-800">
                Enter the 6-digit code sent to <span className="font-semibold">{pendingEmail || email}</span>.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                  maxLength={6}
                  placeholder="Enter OTP"
                  inputMode="numeric"
                  type="text"
                />
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Confirm Email'}
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}

      <p className="mt-6 text-xs text-slate-500">Profile data comes from `GET /api/v1/auth/me`.</p>
    </section>
  )
}

export default UserProfileDetailsCard

