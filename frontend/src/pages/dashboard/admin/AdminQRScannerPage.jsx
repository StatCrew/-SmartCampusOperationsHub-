import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Scanner } from '@yudiel/react-qr-scanner'
import { verifyBookingTicket, saveScanLog, getScanHistory } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

export default function AdminQRScannerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [scanResult, setScanResult] = useState(null)
  const [scanHistory, setScanHistory] = useState([])

  const isProcessing = useRef(false)

  const handleLogout = () => { 
    logout()
    navigate('/signin', { replace: true }) 
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role]
  )

  // Initialize component by fetching recent scan history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getScanHistory();
        setScanHistory(data);
      } catch (error) {
        console.error("Failed to retrieve scan history:", error);
      }
    };
    loadHistory();
  }, []);

  // Process the decoded QR payload and verify via backend
  const handleScan = async (detectedCodes) => {
    if (!detectedCodes || detectedCodes.length === 0) return
    if (isProcessing.current) return

    const text = detectedCodes[0].rawValue
    if (!text) return

    isProcessing.current = true
    let parsedBookingId = null

    try {
      setScanResult('loading')

      const payload = JSON.parse(text)
      if (!payload.bookingId) throw new Error("Invalid QR Code format")
      
      parsedBookingId = payload.bookingId

      const response = await verifyBookingTicket(payload.bookingId)

      const formattedTime = new Date(response.startTime).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      })

      setScanResult({
        success: true,
        message: "Access Granted",
        subtext: "User identity and booking authority verified.",
        bookingData: {
          "Booking ID": `#${response.bookingId}`,
          "Resource": `Facility ${response.resourceId}`,
          "Reserved Time": formattedTime
        }
      })

      // Persist successful scan log to database
      const newLog = await saveScanLog({
        bookingId: response.bookingId,
        resourceName: `Facility ${response.resourceId}`,
        status: 'Granted',
        note: 'Access Granted'
      });
      setScanHistory(prev => [newLog, ...prev]);

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Unrecognized or invalid QR Code."
      
      setScanResult({
        success: false,
        message: "Access Denied",
        subtext: errorMsg
      })

      // Persist failed scan log to database
      const newLog = await saveScanLog({
        bookingId: parsedBookingId, 
        resourceName: '-',
        status: 'Denied',
        note: errorMsg
      });
      setScanHistory(prev => [newLog, ...prev]);
    }
  }

  const resetScanner = () => {
    setScanResult(null)
    isProcessing.current = false 
  }

  // Format ISO timestamps for tabular display
  const formatTableTime = (isoString) => {
    if (!isoString) return new Date().toLocaleTimeString();
    
    const utcString = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
    return new Date(utcString).toLocaleString('en-US', { 
      month: 'short', day: 'numeric', 
      hour: 'numeric', minute: '2-digit' 
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={item => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader 
          onLogout={handleLogout} 
          eyebrow="Admin Check-in" 
          title="Facility Access Control" 
          onToggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        />

        <main className="mx-auto w-full max-w-5xl p-6 md:p-8 flex flex-col items-center">

          {/* Page Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">QR Ticket Verification</h2>
            <p className="mt-1 text-sm text-slate-500">Scan digital passes to authenticate facility reservations.</p>
          </div>

          {/* Scanner Card */}
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative mb-10">
            {scanResult === null || scanResult === 'loading' ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 relative aspect-square bg-slate-100 flex items-center justify-center">
                {scanResult === 'loading' ? (
                  <div className="flex flex-col items-center text-indigo-600 animate-pulse">
                    <span className="text-3xl mb-3">⟳</span>
                    <p className="font-semibold text-sm">Authenticating...</p>
                  </div>
                ) : (
                  <Scanner
                    onScan={handleScan}
                    onError={(e) => console.warn(e)}
                    constraints={{ facingMode: 'environment' }}
                    formats={['qr_code']}
                    scanDelay={500}
                    styles={{
                      container: { width: '100%', height: '100%' },
                      video: { width: '100%', height: '100%', objectFit: 'cover' }
                    }}
                  />
                )}
              </div>
            ) : (
              <div className={`rounded-xl flex flex-col items-center text-center p-8 border aspect-square justify-center ${scanResult.success ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                
                {/* Status Indicator */}
                <div className={`flex items-center justify-center w-16 h-16 rounded-full mb-4 ${scanResult.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  {scanResult.success ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                  ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  )}
                </div>
                
                <h3 className={`text-xl font-bold mb-1 ${scanResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                  {scanResult.message}
                </h3>
                <p className={`text-sm mb-6 ${scanResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {scanResult.subtext}
                </p>

                {/* Booking Details Table (Success Only) */}
                {scanResult.success && scanResult.bookingData && (
                  <div className="w-full max-w-sm bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm text-left">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-50">
                        {Object.entries(scanResult.bookingData).map(([key, value]) => (
                          <tr key={key}>
                            <th className="px-4 py-2.5 font-medium text-slate-500 bg-slate-50/50 w-1/3">{key}</th>
                            <td className="px-4 py-2.5 text-slate-800 font-medium">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  onClick={resetScanner}
                  className="mt-8 px-6 py-2.5 w-full rounded-lg font-semibold text-white transition-colors bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 outline-none"
                >
                  Scan Next Ticket
                </button>
              </div>
            )}
          </div>

          {/* Audit Log Table */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-lg font-semibold text-slate-800">Recent Scans</h3>
              <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">Live Audit Log</span>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3.5">Time</th>
                      <th className="px-6 py-3.5">Booking ID</th>
                      <th className="px-6 py-3.5">Resource</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scanHistory.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                          No verification logs recorded.
                        </td>
                      </tr>
                    ) : (
                      scanHistory.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3 text-slate-500">{formatTableTime(log.scanTime)}</td>
                          <td className="px-6 py-3 font-medium text-slate-800">
                            {log.bookingId ? `#${log.bookingId}` : '-'}
                          </td>
                          <td className="px-6 py-3 text-slate-600">{log.resourceName}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              log.status === 'Granted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-500 max-w-xs truncate" title={log.note}>
                            {log.note}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}