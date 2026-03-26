export const ROLE_DASHBOARD_PATHS = {
  USER: '/user-dashboard',
  ADMIN: '/admin-dashboard',
  TECHNICIAN: '/technician-dashboard',
}

export function getDashboardPathByRole(role) {
  return ROLE_DASHBOARD_PATHS[role] || '/signin'
}

