export const roleSidebarItems = {
  USER: [{ icon: 'dashboard', label: 'Dashboard', path: '/dashboard/user' }],
  ADMIN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: 'group', label: 'Users', path: '/admin/users' },
  ],
  TECHNICIAN: [{ icon: 'dashboard', label: 'Dashboard', path: '/dashboard/technician' }],
}

export const roleHeaderLabels = {
  USER: { eyebrow: 'Student Dashboard', title: 'My Account' },
  ADMIN: { eyebrow: 'Admin Dashboard', title: 'Admin Dashboard' },
  TECHNICIAN: { eyebrow: 'Technician Dashboard', title: 'My Workspace' },
}

export function getSidebarItemsByRole(role) {
  return roleSidebarItems[role] || []
}

export function getHeaderLabelsByRole(role) {
  return roleHeaderLabels[role] || roleHeaderLabels.USER
}
