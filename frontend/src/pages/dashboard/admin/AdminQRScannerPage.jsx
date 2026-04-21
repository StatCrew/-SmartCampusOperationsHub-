import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Scanner } from '@yudiel/react-qr-scanner'
import { verifyBookingTicket } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

export default function AdminQRScannerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [scanResult, setScanResult] = useState(null) // null | 'loading' | { success: true/false, message: '' }
  const [scannedData, setScannedData] = useState(null)

  const handleLogout = () => { logout(); navigate('/signin', { replace: true }) }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role]
  )

  const handleScan = async (text) => {
    // Prevent scanning again while already processing
    if (scanResult === 'loading' || scanResult?.success) return

    try {
      setScanResult('loading')
      
      // 1. Parse the JSON from the QR code
      const payload = JSON.parse(text)
      if (!payload.bookingId) throw new Error("Invalid QR Code format")
      
      setScannedData(payload)

      // 2. Send to Spring Boot for secure verification
      const response = await verifyBookingTicket(payload.bookingId)
      
      // 3. Show Success
      setScanResult({
        success: true,
        message: response.message || "Access Granted",
        details: `Booking #${response.bookingId} • Resource #${response.resourceId}`
      })

    } catch (error) {
      // Show Error (Either invalid JSON, or Spring Boot rejected it)
      const errorMsg = error.response?.data?.message || "Invalid or Unrecognized QR Code."
      setScanResult({ success: false, message: "Access Denied", details: errorMsg })
    }
  }

  const resetScanner = () => {
    setScanResult(null)
    setScannedData(null)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <UserSidebar isSidebarExpanded={isSidebarExpanded} onCollapse={() => setIsSidebarExpanded(false)} onExpand={() => setIsSidebarExpanded(true)} onItemNavigate={item => item.path && navigate(item.path)} onLogout={handleLogout} sidebarItems={sidebarItems} />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Admin" title="Security Check-in" />

        <main className="mx-auto w-full max-w-3xl p-4 pb-24 md:p-8 flex flex-col items-center">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">QR Ticket Scanner</h2>
            <p className="mt-2 text-sm text-slate-500">Scan a student's digital pass to verify their facility access.</p>
          </div>

          {/* Scanner Box */}
          <div className="w-full max-w-md bg-white rounded-3xl p-4 shadow-xl border border-slate-200 overflow-hidden relative">
            
            {scanResult === null || scanResult === 'loading' ? (
              <div className="rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 relative aspect-square bg-slate-50 flex items-center justify-center">
                {scanResult === 'loading' ? (
                  <div className="flex flex-col items-center text-violet-600 animate-pulse">
                    <span className="text-4xl mb-2">⏳</span>
                    <p className="font-bold">Verifying with Server...</p>
                  </div>
                ) : (
                  <Scanner 
                    onResult={(text) => handleScan(text)} 
                    onError={(error) => console.log(error?.message)}
                    options={{ delayBetweenScanSuccess: 2000 }}
                  />
                )}
              </div>
            ) : (
              /* Result Screen */
              <div className={`rounded-2xl flex flex-col items-center justify-center text-center p-8 aspect-square ${scanResult.success ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <div className={`text-6xl mb-4 ${scanResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
                  {scanResult.success ? '✅' : '❌'}
                </div>
                <h3 className={`text-2xl font-black mb-2 ${scanResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                  {scanResult.message}
                </h3>
                <p className="text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-lg shadow-sm">
                  {scanResult.details}
                </p>
                <button 
                  onClick={resetScanner}
                  className={`mt-8 px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-transform hover:scale-105 ${scanResult.success ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Scan Next Ticket
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}