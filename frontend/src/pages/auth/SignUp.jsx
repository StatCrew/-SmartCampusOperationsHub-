import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getGoogleLoginUrl } from '../../api/authService'
import { LOGO_URL } from '../../constants/branding'
import { getDashboardPathByRole } from '../../context/authRoles'
import useAuth from '../../context/useAuth'
import useToast from '../../context/useToast'
const AUTH_ILLUSTRATION_URL =
  import.meta.env.VITE_AUTH_SIGNUP_ILLUSTRATION_URL ||
  'https://smart-campus-bucket-prod.s3.ap-south-1.amazonaws.com/public-images/signup-ilusstration.jpg'

// Illustration component for signup
function SignUpIllustration() {
  return (

      <img
        src={AUTH_ILLUSTRATION_URL}
        alt="Sign up illustration"
        className="h-full w-full rounded-lg object-cover"
        loading="lazy"
      />

  )
}

function SignUp() {
  const navigate = useNavigate()
  const { register, getApiErrorMessage } = useAuth()
  const { showError, showInfo, showSuccess } = useToast()

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
    { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
    { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
    { label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  ]

  const validateField = (name, value) => {
    let error = ''
    switch (name) {
      case 'fullName':
        if (!value.trim()) {
          error = 'Full name is required.'
        } else if (!/^[a-zA-Z\s]{2,50}$/.test(value.trim())) {
          error = 'Name must be 2-50 characters and contain only letters.'
        }
        break
      case 'email':
        if (!value.trim()) {
          error = 'Email is required.'
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
          error = 'Please enter a valid email address.'
        }
        break
      case 'phoneNumber':
        if (!value.trim()) {
          error = 'Phone number is required.'
        } else if (!/^\d{10}$/.test(value.trim())) {
          error = 'Phone number must be exactly 10 digits.'
        }
        break
      case 'password':
        if (!value) {
          error = 'Password is required.'
        } else {
          const failed = passwordRequirements.filter((req) => !req.test(value))
          if (failed.length > 0) {
            error = 'Password does not meet all requirements.'
          }
        }
        break
      case 'confirmPassword':
        if (value !== formData.password) {
          error = 'Passwords do not match.'
        }
        break
      default:
        break
    }
    return error
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    let processedValue = value

    if (name === 'fullName') {
      // Allow only letters and spaces
      processedValue = value.replace(/[^a-zA-Z\s]/g, '')
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }))
    const error = validateField(name, processedValue)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  const validateForm = () => {
    const nextErrors = {}
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key])
      if (error) {
        nextErrors[key] = error
      }
    })
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
      const result = await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phoneNumber: formData.phoneNumber.trim(),
      })

      if (result?.user?.provider === 'LOCAL' && result?.user?.emailVerified === false) {
        showInfo('Account created. Verify your email with the OTP to continue.')
        navigate(`/verify-email?from=signup&email=${encodeURIComponent(formData.email.trim())}`, {
          replace: true,
        })
      } else if (result?.role) {
        showSuccess('Registration successful.')
        navigate(getDashboardPathByRole(result.role), { replace: true })
      } else {
        showSuccess('Registration successful. Please sign in.')
        navigate('/signin', { replace: true })
      }
    } catch (error) {
      showError(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignUp = () => {
    window.location.href = getGoogleLoginUrl()
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="w-full max-w-6xl">
        {/* Header */}
        <Link to="/" className="flex items-center gap-2 mb-8 md:absolute md:top-8 md:left-8">
          <img
              src={LOGO_URL}
              alt="Smart Campus logo"
              className="h-24 w-auto rounded-lg object-contain md:h-28"
              loading="lazy"
          />
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Illustration Section */}
          <div className="hidden lg:block">
            <SignUpIllustration />
          </div>

          {/* Form Section */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              {/* Form Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
                <p className="mt-2 text-slate-600">Start managing your campus with Campus Hub</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name Field */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 ${
                      errors.fullName ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                    }`}
                    placeholder="Jane Doe"
                  />
                  {errors.fullName && <p className="mt-1 text-xs text-red-600 font-medium">{errors.fullName}</p>}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 ${
                      errors.email ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                    }`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600 font-medium">{errors.email}</p>}
                </div>

                {/* Phone Number Field */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    maxLength={10}
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 ${
                      errors.phoneNumber ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                    }`}
                    placeholder="10 digit number"
                  />
                  {errors.phoneNumber && <p className="mt-1 text-xs text-red-600 font-medium">{errors.phoneNumber}</p>}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full rounded-lg border px-4 py-3 pr-11 text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 ${
                        errors.password ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                      }`}
                      placeholder="Enter a strong password"
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
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {passwordRequirements.map((req, index) => {
                      const isMet = req.test(formData.password)
                      return (
                        <div key={index} className="flex items-center gap-1.5">
                          <span className={`material-symbols-outlined text-[14px] ${isMet ? 'text-emerald-500' : 'text-slate-300'}`}>
                            {isMet ? 'check_circle' : 'circle'}
                          </span>
                          <span className={`text-[11px] font-medium ${isMet ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {req.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {errors.password && <p className="mt-2 text-xs text-red-600 font-medium">{errors.password}</p>}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full rounded-lg border px-4 py-3 pr-11 text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 ${
                        errors.confirmPassword ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                      }`}
                      placeholder="Re-enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-600 font-medium">{errors.confirmPassword}</p>}
                </div>

                {/* Sign Up Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 mt-6"
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-slate-500">Or sign up with</span>
                  </div>
                </div>

                {/* Google Sign Up Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign Up with Google
                </button>
              </form>

              {/* Sign In Link */}
              <p className="mt-6 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/signin" className="font-semibold text-indigo-600 hover:text-indigo-700 transition">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp



