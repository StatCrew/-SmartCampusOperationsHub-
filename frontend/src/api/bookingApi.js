import apiClient from './authService'

const BOOKING_PREFIX = '/api/v1/bookings'

// --- Helper Functions (Matching Member 4's Architecture) ---

function normalizeCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }
  // Handles Spring HATEOAS responses if you use them
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

// 1. Create a Booking (Includes your Smart Suggestion logic on 409 errors)
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

// 6. Get Admin Analytics (Your Innovation Feature)
export async function getBookingAnalytics() {
  const response = await apiClient.get(`${BOOKING_PREFIX}/analytics`)
  return response.data
}