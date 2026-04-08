import apiClient from './authService'

const BOOKING_PREFIX = '/api/v1/bookings'

// 1. Create a Booking (This handles the 409 Smart Recommendation)
export async function createBooking(payload) {
  const response = await apiClient.post(BOOKING_PREFIX, payload)
  return response.data
}

// 2. Get User Bookings
export async function getUserBookings(userId) {
  const response = await apiClient.get(`${BOOKING_PREFIX}/user/${userId}`)
  return response.data
}

// 3. Get All Bookings (Admin)
export async function getAllBookings() {
  const response = await apiClient.get(BOOKING_PREFIX)
  return response.data
}

// 4. Update Status (Approve/Reject)
export async function updateBookingStatus(id, status) {
  const response = await apiClient.patch(`${BOOKING_PREFIX}/${id}/status`, { status })
  return response.data
}

// 5. Get Analytics (Innovation Feature!)
export async function getBookingAnalytics() {
  // Use /analytics or /admin/analytics depending on how you configured your Spring Security
  const response = await apiClient.get(`${BOOKING_PREFIX}/analytics`) 
  return response.data
}