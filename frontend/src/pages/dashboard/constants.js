export const roleSidebarItems = {
  USER: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/user' },
    // ADDED: Student Bookings Page
    { icon: 'book_online', label: 'My Bookings', path: '/dashboard/user/bookings' },
    //resource 
    { icon: 'inventory_2', label: 'Resources', path: '/dashboard/user/resources' },
    //Ticketing system
    { icon: 'confirmation_number', label: 'My Tickets', path: '/dashboard/user/tickets' },

  ],
  ADMIN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: 'group', label: 'Users', path: '/admin/users' },
    { icon: 'list_alt', label: 'Bookings', path: '/admin/bookings' },
    { icon: 'bar_chart', label: 'Analytics', path: '/admin/resource-analytics' },
    { icon: 'inventory_2', label: 'Resources', path: '/admin/resources' },
    { label: 'QR Scanner', icon: 'qr_code_scanner', path: '/dashboard/admin/scanner' },
    { icon: 'confirmation_number', label: 'Tickets', path: '/admin/tickets' },
  ],
  TECHNICIAN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/technician' },
    { icon: 'inventory_2', label: 'Resources', path: '/dashboard/user/resources' },
    { icon: 'build', label: 'My Tickets', path: '/dashboard/technician/tickets' },
  ],
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