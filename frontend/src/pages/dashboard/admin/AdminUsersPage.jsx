import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  deleteUser,
  getUsers,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

const PAGE_SIZE = 10

const emptyEditForm = {
  fullName: '',
  email: '',
  role: 'USER',
  active: true,
}

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
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState(emptyEditForm)

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    setErrorMessage('')

    try {
      const data = await getUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        active:
          statusFilter === ''
            ? undefined
            : statusFilter === 'true',
        page,
        size: PAGE_SIZE,
      })

      setUsers(data?.content || [])
      setPageInfo({
        totalPages: data?.totalPages || 0,
        totalElements: data?.totalElements || 0,
      })
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsLoadingUsers(false)
    }
  }, [getApiErrorMessage, page, roleFilter, search, statusFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const refreshUsers = useCallback(async () => {
    await loadUsers()
  }, [loadUsers])

  const openEditUser = (user) => {
    setEditingUser(user)
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role || 'USER',
      active: Boolean(user.active),
    })
    setErrorMessage('')
    setSuccessMessage('')
  }

  const closeEditUser = () => {
    setEditingUser(null)
    setEditForm(emptyEditForm)
  }

  const handleRoleUpdate = async (userId, nextRole) => {
    setProcessingId(userId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateUserRole(userId, nextRole)
      await refreshUsers()
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
      await refreshUsers()
      setSuccessMessage('User status updated successfully.')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteUser = async (userId, fullName) => {
    const confirmed = window.confirm(`Delete ${fullName}? This action cannot be undone.`)
    if (!confirmed) {
      return
    }

    setProcessingId(userId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteUser(userId)
      await refreshUsers()
      setSuccessMessage('User deleted successfully.')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!editingUser) {
      return
    }

    setProcessingId(editingUser.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateUser(editingUser.id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        active: editForm.active,
      })
      setSuccessMessage('User updated successfully.')
      closeEditUser()
      await refreshUsers()
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

  const totalPages = pageInfo.totalPages || 0

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

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Manage Users</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Search, filter, edit, update roles, change status, and delete users.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/users/create')}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Create User
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(0)
                }}
                placeholder="Search by name or email"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />

              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value)
                  setPage(0)
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">All Roles</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="TECHNICIAN">TECHNICIAN</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(0)
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setRoleFilter('')
                  setStatusFilter('')
                  setPage(0)
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear Filters
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
              <>
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
                        const isActive = Boolean(item.active)
                        const isProcessingRow = processingId === item.id

                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{item.fullName}</td>
                            <td className="px-4 py-3">{item.email}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                  {item.role}
                                </span>
                                <select
                                  value={item.role}
                                  disabled={isProcessingRow}
                                  onChange={(event) => handleRoleUpdate(item.id, event.target.value)}
                                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                                >
                                  <option value="USER">USER</option>
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="TECHNICIAN">TECHNICIAN</option>
                                </select>
                              </div>
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
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={isProcessingRow}
                                  onClick={() => handleStatusToggle(item.id, isActive)}
                                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isProcessingRow ? 'Updating...' : isActive ? 'Set Inactive' : 'Set Active'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessingRow}
                                  onClick={() => openEditUser(item)}
                                  className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessingRow}
                                  onClick={() => handleDeleteUser(item.id, item.fullName)}
                                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                  <p>
                    Showing {users.length} of {pageInfo.totalElements} users
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 0}
                      onClick={() => setPage((previous) => Math.max(previous - 1, 0))}
                      className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="rounded-lg bg-slate-50 px-3 py-2 font-medium text-slate-700">
                      Page {page + 1} of {Math.max(totalPages, 1)}
                    </span>
                    <button
                      type="button"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((previous) => previous + 1)}
                      className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
                <p className="text-sm text-slate-500">Update profile, role, or status.</p>
              </div>
              <button type="button" onClick={closeEditUser} className="text-slate-500 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  value={editForm.fullName}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, fullName: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, email: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, role: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={String(editForm.active)}
                    onChange={(event) =>
                      setEditForm((previous) => ({ ...previous, active: event.target.value === 'true' }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={processingId === editingUser.id}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingId === editingUser.id ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeEditUser}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminUsersPage

