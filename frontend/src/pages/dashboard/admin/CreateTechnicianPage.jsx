import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createTechnician } from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

const initialFormData = {
  fullName: '',
  email: '',
  password: '',
}

function CreateTechnicianPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    setFormError('')
    setFormSuccess('')
  }

  const validate = () => {
    if (!formData.fullName.trim()) {
      return 'Full name is required.'
    }

    if (!formData.email.trim()) {
      return 'Email is required.'
    }

    if (!formData.password.trim()) {
      return 'Password is required.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validate()

    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsSubmitting(true)
    setFormError('')
    setFormSuccess('')

    try {
      await createTechnician({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      })

      setFormData(initialFormData)
      setFormSuccess('Technician account created successfully.')

      setTimeout(() => {
        navigate('/dashboard/admin/users')
      }, 700)
    } catch (error) {
      setFormError(getApiErrorMessage(error))
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
          title="Create Technician"
        />

        <main className="mx-auto w-full max-w-3xl p-4 pb-24 md:p-8">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Create Technician</h2>
            <p className="mt-1 text-sm text-slate-600">Add a new technician account with role-based access.</p>

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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Jane Smith"
                />
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="technician@campus.edu"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Minimum 8 characters"
                />
              </div>

              {formError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
              ) : null}
              {formSuccess ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {formSuccess}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Creating...' : 'Create Technician'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/admin/users')}
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

export default CreateTechnicianPage

