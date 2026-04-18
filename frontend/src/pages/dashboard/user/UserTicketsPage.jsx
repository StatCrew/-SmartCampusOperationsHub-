import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUserBookings } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'

import useTickets from "./hooks/useTickets";
import TicketDetailsModal from "./components/TicketDetailsModal";
import CreateTicketModal from "./components/CreateTicketModal";

export default function UserTicketsPage() {
  const { tickets, loading, refetch } = useTickets();
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Tickets</h2>

        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Report Issue
        </button>
      </div>

      {/* TICKETS LIST */}
      {loading ? (
        <p>Loading...</p>
      ) : tickets.length === 0 ? (
        <p className="text-gray-500">No tickets found</p>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="border rounded-xl p-4 shadow-sm bg-white hover:shadow-md transition"
            >
                {/* TOP ROW */}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">{ticket.title}</h3>

                    <span
                        className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === "OPEN"
                                ? "bg-yellow-100 text-yellow-700"
                                : ticket.status === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-700"
                                : ticket.status === "RESOLVED"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-700"
                        }`}
                    >
                        {ticket.status}
                    </span>
                </div>

                {/* DESCRIPTION */}
                <p className="text-sm text-gray-600 mb-3">
                    {ticket.description}
                </p>

                {/* PRIORITY */}
                <p className="text-xs mb-3">
                    Priority:{" "}
                    <span className="font-medium text-indigo-600">
                        {ticket.priority}
                    </span>
                </p>

                {/* ATTACHMENTS */}
                {ticket.attachments?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                        {ticket.attachments.map((url, i) => (
                            <img
                                key={i}
                                src={url}
                                alt="attachment"
                                className="w-16 h-16 object-cover rounded-lg border"
                            />
                            ))}
                    </div>
                )}
            </div>
            ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <CreateTicketModal
          onClose={() => setShowModal(false)}
          onSuccess={refetch}
        />
      )}
    
      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <TicketDetailsModal
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
        />
    )}
    </div>
  );
}