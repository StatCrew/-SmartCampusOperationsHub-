import apiClient from "./authService";

const TICKET_PREFIX = "/api/tickets";

// USER 

// Create Ticket (multipart)
export async function createTicket(formData) {
  const response = await apiClient.post(TICKET_PREFIX, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

// Get My Tickets
export async function getMyTickets() {
  const response = await apiClient.get(`${TICKET_PREFIX}/my`);
  return response.data;
}

// Get Ticket by ID
export async function getTicketById(id) {
  const response = await apiClient.get(`${TICKET_PREFIX}/${id}`);
  return response.data;
}

// Update Ticket with files
export async function updateTicket(id, formData) {
  const response = await apiClient.put(
    `${TICKET_PREFIX}/${id}/with-files`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

// Delete Ticket
export async function deleteTicket(id) {
  const response = await apiClient.delete(`${TICKET_PREFIX}/${id}`);
  return response.data;
}

// COMMENTS 

// Get comments
export async function getComments(ticketId) {
  const response = await apiClient.get(
    `${TICKET_PREFIX}/${ticketId}/comments`
  );
  return response.data;
}

// Add comment
export async function addComment(ticketId, message) {
  const response = await apiClient.post(
    `${TICKET_PREFIX}/${ticketId}/comments`,
    null,
    { params: { message } }
  );
  return response.data;
}

// Update comment
export async function updateComment(ticketId, commentId, message) {
  const response = await apiClient.put(
    `${TICKET_PREFIX}/${ticketId}/comments/${commentId}`,
    null,
    { params: { message } }
  );
  return response.data;
}

// Delete comment
export async function deleteComment(ticketId, commentId) {
  const response = await apiClient.delete(
    `${TICKET_PREFIX}/${ticketId}/comments/${commentId}`
  );
  return response.data;
}

// ADMIN 

// Get all tickets
export async function getAllTickets() {
  const response = await apiClient.get("/api/admin/tickets");
  return response.data;
}

// Get single ticket (admin)
export async function getAdminTicketById(id) {
  const response = await apiClient.get(`/api/admin/tickets/${id}`);
  return response.data;
}

// Update status
export async function updateTicketStatus(id, status) {
  const response = await apiClient.put(
    `/api/admin/tickets/${id}/status`,
    null,
    { params: { status } }
  );
  return response.data;
}

//TECHNICIAN 

// Get assigned tickets
export async function getTechnicianTickets() {
  const response = await apiClient.get("/api/technician/tickets");
  return response.data;
}