export const ROLE_DASHBOARD_PATHS = {
  USER: '/dashboard/user',
  ADMIN: '/admin/dashboard',
  TECHNICIAN: '/dashboard/technician',
}

export function getDashboardPathByRole(role) {
  return ROLE_DASHBOARD_PATHS[role] || '/signin'
}
