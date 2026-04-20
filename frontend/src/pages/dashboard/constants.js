export const roleSidebarItems = {
  USER: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/user' },
    // ADDED: Student Bookings Page
    { icon: 'book_online', label: 'My Bookings', path: '/dashboard/user/bookings' },
    //resource 
    { icon: 'inventory_2', label: 'Resources', path: '/dashboard/user/resources' },

  ],
  ADMIN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: 'group', label: 'Users', path: '/admin/users' },
    // ADDED: Admin Analytics & Booking Requests
   
    { icon: 'list_alt', label: 'Booking Requests', path: '/admin/bookings' },
    //{ icon: 'analytics', label: 'Booking Analytics', path: '/admin/analytics' },
    { icon: 'bar_chart', label: 'Resource Analytics', path: '/admin/resource-analytics' },
    // { icon: 'cloud_upload', label: 'Storage Test', path: '/admin/storage-test' },
    { icon: 'inventory_2', label: 'Resources', path: '/admin/resources' },
    
    { label: 'QR Scanner', icon: 'qr_code_scanner', path: '/dashboard/admin/scanner' },

  ],
  TECHNICIAN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/technician' },
    { icon: 'inventory_2', label: 'Resources',  path: '/dashboard/user/resources' }, // ← ADD

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