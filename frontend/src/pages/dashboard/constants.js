export const roleSidebarItems = {
  USER: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/user' },
    // ADDED: Student Bookings Page
    { icon: 'book_online', label: 'My Bookings', path: '/dashboard/user/bookings' } 
  ],
  ADMIN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: 'group', label: 'Users', path: '/admin/users' },
    // ADDED: Admin Analytics & Booking Requests
   
    { icon: 'list_alt', label: 'Booking Requests', path: '/admin/bookings' },
    { icon: 'analytics', label: 'Booking Analytics', path: '/admin/analytics' },
    { icon: 'cloud_upload', label: 'Storage Test', path: '/admin/storage-test' },
  ],
  TECHNICIAN: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard/technician' }
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