export const roleSidebarItems = {
  USER: [{ icon: 'person', label: 'Profile', path: '/dashboard/user/profile' }],
  ADMIN: [
    { icon: 'person', label: 'Dashboard', path: '/dashboard/admin' },
    { icon: 'group', label: 'Manage Users', path: '/dashboard/admin/users' }
  ],
  TECHNICIAN: [{ icon: 'person', label: 'My Profile', path: '/dashboard/technician' }],
}

export const roleHeaderLabels = {
  USER: { eyebrow: 'Student Dashboard', title: 'My Account' },
  ADMIN: { eyebrow: 'Admin Dashboard', title: 'User Management' },
  TECHNICIAN: { eyebrow: 'Technician Dashboard', title: 'My Workspace' },
}

export function getSidebarItemsByRole(role) {
  return roleSidebarItems[role] || []
}

export function getHeaderLabelsByRole(role) {
  return roleHeaderLabels[role] || roleHeaderLabels.USER
}

