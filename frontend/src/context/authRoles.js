export const ROLE_DASHBOARD_PATHS = {
  USER: '/dashboard/user',
  ADMIN: '/admin/dashboard',
  TECHNICIAN: '/dashboard/technician',
}

export function getDashboardPathByRole(role) {
  const normalizedRole = String(role || '').toUpperCase()
  return ROLE_DASHBOARD_PATHS[normalizedRole] || '/signin'
}
