import apiClient from './authService'

const BOOKING_PREFIX = '/api/v1/bookings'

export const saveScanLog = async (logData) => {
  //Changed axiosInstance to apiClient
  const response = await apiClient.post('/api/admin/scan-logs', logData);
  return response.data;
};

export const getScanHistory = async () => {
  //Changed axiosInstance to apiClient
  const response = await apiClient.get('/api/admin/scan-logs');
  return response.data;
};

export async function updateFullBooking(id, payload) {
  const response = await apiClient.put(`/api/v1/bookings/${id}`, payload)
  return response.data
}

// Verify a QR Code Ticket (Admin Only)
export async function verifyBookingTicket(id) {
  const response = await apiClient.post(`${BOOKING_PREFIX}/${id}/verify`)
  return response.data
}

function normalizeCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }
  // Handles Spring HATEOAS responses 
  if (Array.isArray(payload?._embedded?.bookingResponseList)) {
    return payload._embedded.bookingResponseList
  }
  if (Array.isArray(payload?._embedded?.bookings)) {
    return payload._embedded.bookings
  }
  // Handles standard Spring Page responses
  if (Array.isArray(payload?.content)) {
    return payload.content
  }
  return []
}

function normalizePage(payload) {
  if (Array.isArray(payload)) {
    return {
      content: payload,
      number: 0,
      size: payload.length,
      totalElements: payload.length,
      totalPages: payload.length ? 1 : 0,
      first: true,
      last: true,
    }
  }

  if (payload?.content) {
    return payload
  }

  return {
    content: normalizeCollection(payload),
    number: 0,
    size: 0,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  }
}

// Builds clean query parameters for searching/filtering
function buildParams(params = {}) {
  const next = {}

  if (params.search) next.search = params.search
  if (params.status) next.status = params.status
  if (params.resourceId) next.resourceId = params.resourceId
  if (typeof params.page === 'number') next.page = params.page
  if (typeof params.size === 'number') next.size = params.size

  return next
}

// --- Booking API Endpoints ---

// 1. Create a Booking 
export async function createBooking(payload) {
  const response = await apiClient.post(BOOKING_PREFIX, payload)
  return response.data
}

// 2. Get All Bookings (Admin Dashboard View)
export async function getAllBookings(params = {}) {
  const response = await apiClient.get(BOOKING_PREFIX, { params: buildParams(params) })
  return normalizePage(response.data)
}

// 3. Get User Bookings (Student Dashboard View)
export async function getUserBookings(userId, params = {}) {
  const response = await apiClient.get(`${BOOKING_PREFIX}/user/${userId}`, { params: buildParams(params) })
  return normalizePage(response.data)
}

// 4. Update Booking Status (Approve / Reject / Cancel)
export async function updateBookingStatus(id, status) {
  const response = await apiClient.patch(`${BOOKING_PREFIX}/${id}/status`, { status })
  return response.data
}

// 5. Delete a Booking
export async function deleteBooking(id) {
  const response = await apiClient.delete(`${BOOKING_PREFIX}/${id}`)
  return response.data
}

// 6. Get Admin Analytics 
export async function getBookingAnalytics() {
  const response = await apiClient.get(`${BOOKING_PREFIX}/analytics`)
  return response.data
}

// 7. Safely Cancel a Booking (User Action)
export async function cancelBookingReq(id) {
  const response = await apiClient.patch(`${BOOKING_PREFIX}/${id}/cancel`)
  return response.data
}