import { useEffect, useMemo, useState } from 'react'
import useAuth from '../../../../context/useAuth'

function UserProfileDetailsCard({ loadingProfile, profile, onReloadProfile }) {
  const { updateMyProfile, completeEmailChange, getApiErrorMessage } = useAuth()
  const [fullName, setFullName] = useState(profile?.fullName || '')
  const [email, setEmail] = useState(profile?.email || '')
  const [otp, setOtp] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setFullName(profile?.fullName || '')
    setEmail(profile?.email || '')
  }, [profile?.fullName, profile?.email])

  const emailChanged = useMemo(
    () => email.trim().toLowerCase() !== (profile.email || '').trim().toLowerCase(),
    [email, profile.email],
  )

  const handleSave = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await updateMyProfile({
          fullName,
        email: emailChanged ? email : '',
      })

      if (response?.profile) {
        setFullName(response.profile.fullName || fullName)
        setEmail(response.profile.email || email)
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
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                  type="text"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                  type="email"
                />
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

