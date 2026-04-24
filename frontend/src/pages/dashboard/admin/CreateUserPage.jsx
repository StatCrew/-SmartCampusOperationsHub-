import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createUser } from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

const initialFormData = {
  fullName: '',
  email: '',
  password: '',
  role: 'USER',
  active: true,
}

function CreateUserPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [formData, setFormData] = useState(initialFormData)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

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
      navigate('/admin/users')
    } catch (error) {
      setFieldErrors({ submit: getApiErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const headerLabels = getHeaderLabelsByRole(role)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={(item) => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader
          onLogout={handleLogout}
          eyebrow={headerLabels.eyebrow}
          title="Create User"
          onToggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        />

        <main className="mx-auto w-full max-w-3xl p-4 pb-24 md:p-8">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Create User</h2>
            <p className="mt-1 text-sm text-slate-600">Add a new account with role-based access.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 ${
                    fieldErrors.fullName ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                  placeholder="Jane Smith"
                />
                {fieldErrors.fullName && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 ${
                    fieldErrors.email ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                  placeholder="user@campus.edu"
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 pr-11 outline-none transition focus:ring-2 ${
                      fieldErrors.password ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                    }`}
                    placeholder="Set a strong password"
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
                {fieldErrors.password && <p className="mt-2 text-xs text-red-600 font-medium">{fieldErrors.password}</p>}
              </div>

              <div>
                <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                </select>
              </div>

              <div>
                <label htmlFor="active" className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  id="active"
                  name="active"
                  value={String(formData.active)}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, active: event.target.value === 'true' }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {fieldErrors.submit ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{fieldErrors.submit}</p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/users')}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  )
}

export default CreateUserPage

