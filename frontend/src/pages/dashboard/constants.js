export const roleSidebarItems = {
  USER: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/user' },
    { icon: 'person', label: 'Profile', path: '/dashboard/user/profile' },
    { icon: 'book_online', label: 'Bookings', path: '/dashboard/user/bookings' },
    { icon: 'inventory_2', label: 'Resources', path: '/dashboard/user/resources' },
    { icon: 'confirmation_number', label: 'Tickets', path: '/dashboard/user/tickets' },
  ],
  ADMIN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: 'group', label: 'People', path: '/admin/users' },
    { icon: 'list_alt', label: 'Bookings', path: '/admin/bookings' },
    { icon: 'bar_chart', label: 'Reports', path: '/admin/resource-analytics' },
    { icon: 'inventory_2', label: 'Resources', path: '/admin/resources' },
    { label: 'Scan', icon: 'qr_code_scanner', path: '/dashboard/admin/scanner' },
    { icon: 'confirmation_number', label: 'Tickets', path: '/admin/tickets' },
  ],
  TECHNICIAN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/technician' },
    { icon: 'inventory_2', label: 'Resources', path: '/dashboard/user/resources' },
    { icon: 'build', label: 'Tickets', path: '/dashboard/technician/tickets' },
  ],
}

export const roleHeaderLabels = {
  USER: { eyebrow: 'Student Dashboard', title: 'Dashboard' },
  ADMIN: { eyebrow: 'Admin Dashboard', title: 'Dashboard' },
  TECHNICIAN: { eyebrow: 'Technician Dashboard', title: 'Workspace' },
}

export function getSidebarItemsByRole(role) {
  return roleSidebarItems[role] || []
}

export function getHeaderLabelsByRole(role) {
  return roleHeaderLabels[role] || roleHeaderLabels.USER
}