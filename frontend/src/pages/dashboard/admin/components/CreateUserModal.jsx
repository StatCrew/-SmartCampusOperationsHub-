import { useState } from 'react'
import { createUser } from '../../../../api/adminApi'
import useAuth from '../../../../context/useAuth'
import { Button } from '../../../../components/ui/Button'

const initialFormData = {
  fullName: '',
  email: '',
  password: '',
  role: 'USER',
  active: true,
}

function CreateUserModal({ isOpen, onClose, onSuccess }) {
  const { getApiErrorMessage } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
    { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
    { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
    { label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  ]

  const validateField = (name, value) => {
    let err = ''
    switch (name) {
      case 'fullName':
        if (!value.trim()) err = 'Full name is required.'
        else if (!/^[a-zA-Z\s]{2,50}$/.test(value.trim())) err = 'Name must be 2-50 letters only.'
        break
      case 'email':
        if (!value.trim()) err = 'Email is required.'
        else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) err = 'Invalid email address.'
        break
      case 'password':
        if (!value) err = 'Password is required.'
        else {
          const failed = passwordRequirements.filter(req => !req.test(value))
          if (failed.length > 0) err = 'Password is too weak.'
        }
        break
      default:
        break
    }
    return err
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    let processedValue = value
    
    if (name === 'fullName') {
      processedValue = value.replace(/[^a-zA-Z\s]/g, '')
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }))
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, processedValue) }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    const nameErr = validateField('fullName', formData.fullName)
    const emailErr = validateField('email', formData.email)
    const passErr = validateField('password', formData.password)

    if (nameErr || emailErr || passErr) {
      setFieldErrors({ fullName: nameErr, email: emailErr, password: passErr })
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})

    try {
      await createUser({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        active: formData.active,
      })

      setFormData(initialFormData)
      onSuccess?.()
      onClose()
    } catch (error) {
      setFieldErrors({ submit: getApiErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-50 pb-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <span className="material-symbols-outlined text-[24px]">person_add</span>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Register Identity</h3>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Add new campus member</p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose} className="w-10 h-10 !p-0 rounded-xl">
            <span className="material-symbols-outlined">close</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={`w-full rounded-2xl border px-5 py-3 text-sm font-medium outline-none transition focus:ring-4 ${
                fieldErrors.fullName ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
              }`}
              placeholder="Jane Smith"
            />
            {fieldErrors.fullName && <p className="mt-1 text-[10px] font-medium text-red-600 ml-1">{fieldErrors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity Channel (Email)</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full rounded-2xl border px-5 py-3 text-sm font-medium outline-none transition focus:ring-4 ${
                fieldErrors.email ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
              }`}
              placeholder="user@campus.edu"
            />
            {fieldErrors.email && <p className="mt-1 text-[10px] font-medium text-red-600 ml-1">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Access (Password)</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full rounded-2xl border px-5 py-3 pr-12 text-sm font-medium outline-none transition focus:ring-4 ${
                  fieldErrors.password ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                }`}
                placeholder="Set a strong password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            
            {/* Password Checklist */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 p-1">
              {passwordRequirements.map((req, index) => {
                const isMet = req.test(formData.password)
                return (
                  <div key={index} className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[14px] ${isMet ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {isMet ? 'check_circle' : 'circle'}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isMet ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {req.label}
                    </span>
                  </div>
                )
              })}
            </div>
            {fieldErrors.password && <p className="mt-2 text-[10px] font-medium text-red-600 ml-1">{fieldErrors.password}</p>}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Privilege Level</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="TECHNICIAN">TECHNICIAN</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Operational State</label>
              <select
                id="active"
                name="active"
                value={String(formData.active)}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, active: event.target.value === 'true' }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {fieldErrors.submit ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">{fieldErrors.submit}</p>
          ) : null}

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Registering...' : 'Register User'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="px-8"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateUserModal
