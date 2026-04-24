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
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import CreateUserModal from './components/CreateUserModal'

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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

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

  const handleEditFieldChange = (name, value) => {
    let processedValue = value
    if (name === 'fullName') {
      processedValue = value.replace(/[^a-zA-Z\s]/g, '')
    }
    setEditForm(prev => ({ ...prev, [name]: processedValue }))
  }

  const validateEditForm = () => {
    if (!editForm.fullName.trim()) return 'Full name is required.'
    if (!/^[a-zA-Z\s]{2,50}$/.test(editForm.fullName.trim())) return 'Name must be 2-50 letters only.'
    if (!editForm.email.trim()) return 'Email is required.'
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(editForm.email.trim())) return 'Invalid email address.'
    return ''
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!editingUser) {
      return
    }

    const valErr = validateEditForm()
    if (valErr) {
      setErrorMessage(valErr)
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
          title="Identity Nexus"
          onToggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
          <section className="mb-8 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Identity Management</h2>
                <p className="mt-2 text-indigo-100/70 max-w-md font-medium">
                  Control campus access, modify permissions, and audit user states. {pageInfo.totalElements} active identities registered.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                    onClick={refreshUsers}
                    variant="secondary"
                >
                  <span className="material-symbols-outlined mr-2">refresh</span>
                  Sync Data
                </Button>

                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    variant="secondary"
                >
                  Register User
                </Button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Identities</p>
              <h3 className="text-3xl font-black text-slate-900">{isLoadingUsers ? '—' : pageInfo.totalElements}</h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Administrators</p>
              <h3 className="text-3xl font-black text-indigo-600">{isLoadingUsers ? '—' : users.filter(u => u.role === 'ADMIN').length}+</h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Active Systems</p>
              <h3 className="text-3xl font-black text-emerald-600">{isLoadingUsers ? '—' : users.filter(u => u.active).length}</h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">Suspended</p>
              <h3 className="text-3xl font-black text-rose-600">{isLoadingUsers ? '—' : users.filter(u => !u.active).length}</h3>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100 mb-8">
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="relative group flex-1 max-w-xl">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </span>
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(0)
                  }}
                  placeholder="Query by name, email, or department..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={roleFilter}
                  onChange={(event) => {
                    setRoleFilter(event.target.value)
                    setPage(0)
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">All Roles</option>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="TECHNICIAN">Technician</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setPage(0)
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Suspended</option>
                </select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('')
                    setRoleFilter('')
                    setStatusFilter('')
                    setPage(0)
                  }}
                  className="rounded-xl"
                >
                  Reset Registry
                </Button>
              </div>
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
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Identity</th>
                        <th className="px-6 py-4">Auth Channel</th>
                        <th className="px-6 py-4">Permissions</th>
                        <th className="px-6 py-4">State</th>
                        <th className="px-6 py-4 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white text-slate-700">
                      {users.map((item) => {
                        const isActive = Boolean(item.active)
                        const isProcessingRow = processingId === item.id

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{item.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-medium">UID: {item.id}</div>
                            </td>
                            <td className="px-6 py-4 font-medium">{item.email}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge variant="neutral" className="bg-indigo-50 text-indigo-700 border-indigo-100">{item.role}</Badge>
                                <select
                                  value={item.role}
                                  disabled={isProcessingRow}
                                  onChange={(event) => handleRoleUpdate(item.id, event.target.value)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest outline-none transition focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                                >
                                  <option value="USER">USER</option>
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="TECHNICIAN">TECHNICIAN</option>
                                </select>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={isActive ? 'success' : 'neutral'} className={isActive ? '' : 'bg-rose-50 text-rose-600 border-rose-100'}>
                                {isActive ? 'ACTIVE' : 'SUSPENDED'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isProcessingRow}
                                  onClick={() => handleStatusToggle(item.id, isActive)}
                                  className="text-[10px] font-black uppercase tracking-widest px-3"
                                >
                                  {isProcessingRow ? 'Syncing...' : isActive ? 'Suspend' : 'Activate'}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={isProcessingRow}
                                  onClick={() => openEditUser(item)}
                                  className="text-[10px] font-black uppercase tracking-widest px-3"
                                >
                                  Modify
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={isProcessingRow}
                                  onClick={() => handleDeleteUser(item.id, item.fullName)}
                                  className="text-[10px] font-black uppercase tracking-widest px-3"
                                >
                                  Purge
                                </Button>
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
                    <Button
                      variant="outline"
                      disabled={page <= 0}
                      onClick={() => setPage((previous) => Math.max(previous - 1, 0))}
                    >
                      Previous
                    </Button>
                    <span className="rounded-lg bg-slate-50 px-3 py-2 font-medium text-slate-700">
                      Page {page + 1} of {Math.max(totalPages, 1)}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((previous) => previous + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeEditUser} />
          <div className="relative w-full max-w-lg rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-50 pb-5">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                  <span className="material-symbols-outlined text-[24px]">manage_accounts</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Modify Identity</h3>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">UID: {editingUser.id}</p>
                </div>
              </div>
              <Button variant="outline" onClick={closeEditUser} className="w-10 h-10 !p-0 rounded-xl">
                <span className="material-symbols-outlined">close</span>
              </Button>
            </div>

            <form className="space-y-6" onSubmit={handleEditSubmit}>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                <input
                  value={editForm.fullName}
                  onChange={(event) => handleEditFieldChange('fullName', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity Channel (Email)</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(event) => handleEditFieldChange('email', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Privilege Level</label>
                  <select
                    value={editForm.role}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, role: event.target.value }))}
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
                    value={String(editForm.active)}
                    onChange={(event) =>
                      setEditForm((previous) => ({ ...previous, active: event.target.value === 'true' }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="true">Active</option>
                    <option value="false">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={processingId === editingUser.id}
                  className="flex-1"
                >
                  {processingId === editingUser.id ? 'Persisting...' : 'Confirm Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={closeEditUser}
                  className="px-8"
                >
                  Abort
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <CreateUserModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => {
          setSuccessMessage('User registered successfully')
          refreshUsers()
        }}
      />
    </div>
  )
}

export default AdminUsersPage

