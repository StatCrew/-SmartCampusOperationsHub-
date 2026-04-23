import { useEffect, useState } from 'react'
import { getTicketAnalytics } from '../../../../api/ticketApi'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function TicketAnalyticsModal({ open, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      loadAnalytics()
    }
  }, [open])

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getTicketAnalytics()
      setData(result)
    } catch (err) {
      console.error('Analytics Fetch Error:', err)
      setError('Failed to load analytics data.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = () => {
    console.log('Starting PDF Generation...', data)
    if (!data) {
      console.warn('No data available for PDF')
      return
    }

    try {
      const doc = new jsPDF()

      // Header
      doc.setFontSize(22)
      doc.setTextColor(30, 41, 59) // Slate-800
      doc.text('Smart Campus - Ticket Analytics Report', 14, 22)

      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139) // Slate-500
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)
      doc.line(14, 35, 196, 35)

      // Summary
      doc.setFontSize(16)
      doc.setTextColor(79, 70, 229) // Indigo-600
      doc.text('Overview Metrics', 14, 48)

      doc.setFontSize(11)
      doc.setTextColor(30, 41, 59)
      doc.text(`• Total Tickets Submitted: ${data.totalTickets}`, 14, 58)
      doc.text(`• Average Resolution Time: ${data.averageResolutionTimeHours.toFixed(1)} hours`, 14, 65)
      doc.text(`• Average User Satisfaction: ${data.averageUserRating.toFixed(1)} / 5.0`, 14, 72)
      doc.text(`• Overdue Tickets (Active): ${data.overdueCount}`, 14, 79)
      doc.text(`• SLA Compliance Rate: ${((data.slaComplianceCount / (data.slaComplianceCount + data.overdueCount || 1)) * 100).toFixed(0)}%`, 14, 86)

      // Category Table
      doc.setFontSize(14)
      doc.setTextColor(79, 70, 229)
      doc.text('Category Breakdown', 14, 100)

      autoTable(doc, {
        startY: 105,
        head: [['Category Name', 'Ticket Count']],
        body: Object.entries(data.ticketsByCategory || {}).sort((a, b) => b[1] - a[1]),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
      })

      // Priority Table
      const finalY = doc.lastAutoTable?.finalY || 150
      doc.setFontSize(14)
      doc.setTextColor(79, 70, 229)
      doc.text('Priority Distribution', 14, finalY + 15)

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Priority Level', 'Ticket Count']],
        body: Object.entries(data.ticketsByPriority || {}).sort((a, b) => b[1] - a[1]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] }
      })

      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(`Page ${i} of ${pageCount} - Campus Hub Operations`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
      }

      console.log('Saving PDF...')
      doc.save(`Ticket_Analytics_${new Date().toISOString().split('T')[0]}.pdf`)
      console.log('PDF Saved successfully')
    } catch (err) {
      console.error('PDF Generation Error:', err)
      alert('Error generating PDF. Please check console for details.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-4xl rounded-[2.5rem] bg-white p-8 lg:p-10 shadow-2xl overflow-y-auto max-h-[90vh] hide-scrollbar">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <span className="material-symbols-outlined text-[28px]">analytics</span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Ticket Analysis</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Insights & Metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-300"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Analyzing system data...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center text-red-500 font-bold">{error}</div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Tickets" value={data.totalTickets} icon="receipt_long" color="text-slate-700" />
              <StatCard label="Avg Resolution" value={`${data.averageResolutionTimeHours.toFixed(1)}h`} icon="timer" color="text-indigo-600" />
              <StatCard label="Avg Rating" value={`${data.averageUserRating.toFixed(1)} / 5`} icon="star" color="text-amber-500" />
              <StatCard label="Overdue" value={data.overdueCount} icon="running_with_errors" color="text-red-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Category Breakdown */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50/30 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-indigo-500 text-[20px]">category</span>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Top Categories</p>
                </div>
                <div className="space-y-4">
                  {Object.entries(data.ticketsByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <div key={category} className="group">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-700">{category}</span>
                          <span className="text-[10px] font-black text-indigo-600">{count}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000 group-hover:bg-indigo-400"
                            style={{ width: `${(count / data.totalTickets) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Priority & SLA */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-100 bg-slate-50/30 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-amber-500 text-[20px]">priority_high</span>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Priority Distribution</p>
                  </div>
                  <div className="flex items-end gap-2 h-32 px-2">
                    {Object.entries(data.ticketsByPriority).map(([prio, count]) => {
                      const percentage = data.totalTickets > 0 ? (count / data.totalTickets) * 100 : 0
                      return (
                        <div key={prio} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group">
                          <div
                            className={`w-full rounded-t-lg transition-all duration-700 ${prio.toUpperCase() === 'URGENT' ? 'bg-red-500 shadow-lg shadow-red-500/20' :
                                prio.toUpperCase() === 'HIGH' ? 'bg-amber-500' :
                                  prio.toUpperCase() === 'MEDIUM' ? 'bg-blue-500' :
                                    prio.toUpperCase() === 'LOW' ? 'bg-emerald-500' : 'bg-slate-400'
                              } group-hover:opacity-80`}
                            style={{ height: `${Math.max(percentage, 2)}%` }}
                          />
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter truncate w-full text-center">
                            {prio}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-3xl bg-indigo-600 p-6 text-white shadow-xl shadow-indigo-600/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">SLA Compliance</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-3xl font-black">{((data.slaComplianceCount / (data.slaComplianceCount + data.overdueCount || 1)) * 100).toFixed(0)}%</h4>
                      <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">Resolution Accuracy</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{data.slaComplianceCount} On-Time</p>
                      <p className="text-[10px] font-bold text-white/40">{data.overdueCount} Delayed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-slate-50 flex justify-end gap-3">
          <button
            onClick={handleDownloadReport}
            disabled={!data}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-[10px] font-black text-white uppercase tracking-widest transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Download PDF
          </button>
          <button
            onClick={loadAnalytics}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-[10px] font-black text-white uppercase tracking-widest transition-all hover:bg-indigo-600 hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh Report
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <span className={`material-symbols-outlined text-[18px] ${color} opacity-40`}>{icon}</span>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      </div>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  )
}
