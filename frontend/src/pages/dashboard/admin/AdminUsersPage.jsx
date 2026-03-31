import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUsers, updateUserRole, updateUserStatus } from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

function AdminUsersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    setErrorMessage('')

    try {
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsLoadingUsers(false)
    }
  }, [getApiErrorMessage])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const handleRoleUpdate = async (userId, nextRole) => {
    setProcessingId(userId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateUserRole(userId, nextRole)
      await loadUsers()
      setSuccessMessage('User role updated successfully.')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const handleStatusToggle = async (userId, currentStatus) => {
    setProcessingId(userId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateUserStatus(userId, !currentStatus)
      await loadUsers()
      setSuccessMessage('User status updated successfully.')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
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
          title={headerLabels.title}
        />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Manage Users</h2>
                <p className="mt-1 text-sm text-slate-600">Update user roles and account status.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/create-technician')}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Create Technician
              </button>
            </div>

            {errorMessage ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            {isLoadingUsers ? (
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">Loading users...</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {users.map((item) => {
                      const isActive = Boolean(item.emailVerified)
                      const isProcessingRow = processingId === item.id

                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.fullName}</td>
                          <td className="px-4 py-3">{item.email}</td>
                          <td className="px-4 py-3">
                            <span className="mr-3 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                              {item.role}
                            </span>
                            <select
                              value={item.role === 'ADMIN' ? 'USER' : item.role}
                              disabled={isProcessingRow || item.role === 'ADMIN'}
                              onChange={(event) => handleRoleUpdate(item.id, event.target.value)}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              <option value="USER">USER</option>
                              <option value="TECHNICIAN">TECHNICIAN</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={isProcessingRow}
                              onClick={() => handleStatusToggle(item.id, isActive)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessingRow ? 'Updating...' : isActive ? 'Set Inactive' : 'Set Active'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

export default AdminUsersPage

