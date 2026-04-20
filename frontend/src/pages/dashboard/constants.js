export const roleSidebarItems = {
  USER: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/user' },
    // ADDED: Student Bookings Page
    { icon: 'book_online', label: 'My Bookings', path: '/dashboard/user/bookings' },
    //resource 
    { icon: 'inventory_2', label: 'Resources', path: '/dashboard/user/resources' },
    //Ticketing system
    { icon: 'report_problem', label: 'My Tickets', path: '/dashboard/user/tickets' },
    { icon: 'confirmation_number', label: 'Tickets', path: '/dashboard/user/tickets' },

  ],
  ADMIN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: 'group', label: 'Users', path: '/admin/users' },
    // ADDED: Admin Analytics & Booking Requests
   
    { icon: 'list_alt', label: 'Booking Requests', path: '/admin/bookings' },
    { icon: 'confirmation_number', label: 'Tickets', path: '/admin/tickets' },
    { icon: 'analytics', label: 'Booking Analytics', path: '/admin/analytics' },
    { icon: 'bar_chart', label: 'Resource Analytics', path: '/admin/resource-analytics' },
    // { icon: 'cloud_upload', label: 'Storage Test', path: '/admin/storage-test' },
    { icon: 'inventory_2', label: 'Resources', path: '/admin/resources' },

    // Admin Ticketing system
    { icon: 'report_problem', label: 'Manage Tickets', path: '/admin/tickets' },

  ],
  TECHNICIAN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/technician' },
    { icon: 'confirmation_number', label: 'Tickets', path: '/dashboard/technician/tickets' },
    { icon: 'inventory_2', label: 'Resources',  path: '/dashboard/user/resources' }, // ← ADD

    // Technician Ticketing system
    { icon: 'build', label: 'Assigned Tickets', path: '/dashboard/technician/tickets' },
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