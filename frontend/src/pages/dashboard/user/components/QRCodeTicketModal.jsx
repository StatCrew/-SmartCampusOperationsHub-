import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeTicketModal({ isOpen, onClose, booking }) {
  if (!isOpen || !booking) return null

  
  // The Admin scanner will read this JSON and send the ID to the backend.
  const qrPayload = JSON.stringify({
    bookingId: booking.id,
    timestamp: new Date().toISOString()
  })

  const displayDate = booking.startTime ? booking.startTime.split('T')[0] : '—'
  const displayTime = booking.startTime 
    ? `${booking.startTime.split('T')[1].substring(0, 5)} - ${booking.endTime.split('T')[1].substring(0, 5)}` 
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      
      {/* Ticket Card */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-[fadeInUp_0.3s_ease-out]">
        
        {/* Ticket Header */}
        <div className="bg-gradient-to-br from-[#2193b0] to-[#6dd5ed] p-6 text-center text-white relative">
          <h2 className="text-xl font-black uppercase tracking-widest">Entry Pass</h2>
          <p className="text-sm font-medium opacity-90 mt-1">Present to Campus Security</p>
          
          {/* Jagged ticket edge effect */}
          <div className="absolute -bottom-3 left-0 w-full h-6" style={{ background: 'radial-gradient(circle, transparent 10px, #ffffff 11px) repeat-x', backgroundSize: '24px 24px' }}></div>
        </div>

        {/* Ticket Body */}
        <div className="pt-8 pb-6 px-6 flex flex-col items-center">
          
          {/* The QR Code */}
          <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl mb-6 shadow-inner">
            <QRCodeSVG 
              value={qrPayload} 
              size={180} 
              bgColor={"#f8fafc"} 
              fgColor={"#0f172a"} 
              level={"Q"} 
            />
          </div>

          {/* Booking Details */}
          <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500">Booking ID</span>
              <span className="font-black text-slate-800">#{booking.id}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500">Resource</span>
              <span className="font-black text-[#2193b0]">#{booking.resourceId}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500">Date</span>
              <span className="font-bold text-slate-800">{displayDate}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500">Time</span>
              <span className="font-bold text-slate-800">{displayTime}</span>
            </div>
          </div>

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            Close Ticket
          </button>
        </div>
      </div>
    </div>
  )
}