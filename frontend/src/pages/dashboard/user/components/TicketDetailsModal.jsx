import { useState } from 'react'

const STATUS_META = {
  OPEN: { label: 'Open', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

function TicketBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${meta.bg} ${meta.text} ${meta.border}`}>
      {meta.label}
    </span>
  )
}

function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function isImageAttachment(fileUrl) {
  return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(String(fileUrl || ''))
}

function InfoCard({ label, children, icon }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 group">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="material-symbols-outlined text-[18px] text-indigo-500 opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>}
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-indigo-500 transition-colors">{label}</p>
      </div>
      <div className="text-sm font-bold text-slate-700 leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function DetailItem({ label, value, icon }) {
  return (
    <div className="flex items-center gap-3 py-1">
      {icon && <span className="material-symbols-outlined text-[18px] text-slate-400">{icon}</span>}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">{label}</p>
        <p className="text-xs font-bold text-slate-700">{value || '-'}</p>
      </div>
    </div>
  )
}

export default function TicketDetailsModal({
  open,
  ticket,
  onClose,
  onEdit,
  onDelete,
  onAddComment,
  commentText,
  onCommentTextChange,
  isDeleting,
  isCommentSubmitting,
  attachmentUrls,
  currentUserEmail,
  onRate,
  isActionProcessing,
  onDeleteComment,
  onUpdateComment,
  editingCommentId,
  setEditingCommentId,
  editingCommentText,
  setEditingCommentText,
}) {
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')

  if (!open || !ticket) {
    return null
  }

  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : []
  const comments = Array.isArray(ticket.comments) ? ticket.comments : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl rounded-[2.5rem] bg-white p-8 lg:p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-y-auto max-h-[92vh] no-scrollbar">
        {/* Header Section */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-start gap-5">
            <div className="grid h-14 w-14 lg:h-16 lg:w-16 place-items-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20">
              <span className="material-symbols-outlined text-[32px] lg:text-[36px]">confirmation_number</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <TicketBadge status={ticket.status} />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">TICKET #{ticket.id}</span>
              </div>
              <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {ticket.title || `Ticket #${ticket.id}`}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {ticket.status === 'OPEN' && (
              <div className="flex items-center gap-2 mr-2">
                <button
                  type="button"
                  onClick={() => onEdit(ticket)}
                  className="grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-indigo-600 transition-all duration-300 hover:bg-indigo-600 hover:text-white shadow-sm border border-slate-100"
                  title="Edit Ticket"
                >
                  <span className="material-symbols-outlined text-[22px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(ticket)}
                  disabled={isDeleting}
                  className="grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-red-600 transition-all duration-300 hover:bg-red-600 hover:text-white shadow-sm border border-slate-100 disabled:opacity-50"
                  title="Delete Ticket"
                >
                  <span className="material-symbols-outlined text-[22px]">delete</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 hover:bg-red-50 hover:text-red-500 hover:rotate-90 shadow-sm border border-slate-100"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Information Cards */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Request Context Card */}
            <InfoCard label="Request Description" icon="description">
              <div className="whitespace-pre-wrap leading-relaxed text-slate-600 font-semibold italic border-l-4 border-indigo-200 pl-4 py-1 mt-2">
                {ticket.description || 'No description provided.'}
              </div>
            </InfoCard>

            {/* Rejection / Resolution Alerts */}
            {ticket.status === 'REJECTED' && (
              <div className="rounded-2xl border-2 border-red-100 bg-red-50/30 p-5 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-100 text-red-600">
                    <span className="material-symbols-outlined text-[20px]">error</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700">Rejection Reason</p>
                </div>
                <p className="text-sm text-red-800 font-bold leading-relaxed ml-1">{ticket.rejectionReason || 'No specific reason provided by the staff.'}</p>
              </div>
            )}

            {ticket.status === 'RESOLVED' && (
              <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-5 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Resolution Notes</p>
                </div>
                <p className="text-sm text-emerald-800 font-bold leading-relaxed ml-1">{ticket.resolutionNotes || 'The reported issue has been successfully addressed.'}</p>
              </div>
            )}

            {/* Technical Details Card */}
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/20 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 ml-1">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">analytics</span>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Technical Details</p>
              </div>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <DetailItem label="Service Category" value={ticket.category} icon="category" />
                <DetailItem label="Priority Level" value={ticket.priority} icon="priority_high" />
                <DetailItem label="Contact Number" value={ticket.contactNumber} icon="call" />
                <DetailItem label="Resource ID" value={ticket.resourceId ? `#${ticket.resourceId}` : 'N/A'} icon="inventory_2" />
                <DetailItem label="Created At" value={formatDateTime(ticket.createdAt)} icon="event" />
                <DetailItem label="Last Activity" value={formatDateTime(ticket.updatedAt)} icon="update" />
              </div>
            </div>

            {/* Visual Evidence Card */}
            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500 text-[20px]">gallery_thumbnail</span>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Visual Evidence</p>
                </div>
                {attachments.length > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{attachments.length} Files</span>
                )}
              </div>
              
              {attachments.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {attachments.map((attachment, index) => {
                    const isImg = isImageAttachment(attachment)
                    const url = attachmentUrls?.[attachment]

                    return (
                      <div key={`${attachment}-${index}`} className="group relative aspect-square rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        {isImg ? (
                          <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-slate-100">
                            {url ? (
                              <img
                                src={url}
                                alt={`Evidence ${index + 1}`}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
                              </div>
                            )}
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            >
                              <span className="material-symbols-outlined text-white text-[24px]">visibility</span>
                            </a>
                          </div>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[1.25rem] bg-slate-50 text-slate-400">
                            <span className="material-symbols-outlined text-[32px]">description</span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-indigo-600 px-3 py-1 text-[9px] font-black text-white uppercase tracking-wider transition hover:bg-indigo-700"
                            >
                              Open File
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 flex flex-col items-center justify-center text-center opacity-70">
                  <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                    <span className="material-symbols-outlined text-slate-300 text-[32px]">no_photography</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No evidence attached</p>
                </div>
              )}
            </div>

            {/* Rating Section Card */}
            {ticket.status === 'RESOLVED' && (
              <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-indigo-600 p-8 text-white shadow-xl shadow-indigo-500/20 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">star</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-100">Rate this Resolution</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`material-symbols-outlined text-[36px] transition-all duration-300 hover:scale-125 active:scale-95 ${
                          star <= rating ? 'text-amber-300 fill-1 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]' : 'text-indigo-200/50 hover:text-indigo-100'
                        }`}
                      >
                        star
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-3 w-full">
                    <input
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Any thoughts on our service?"
                      className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3.5 text-sm font-semibold placeholder:text-indigo-100/50 outline-none focus:ring-4 focus:ring-white/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => onRate(rating, feedback)}
                      disabled={isActionProcessing || rating === 0}
                      className="rounded-xl bg-white px-8 py-3.5 text-[11px] font-black text-indigo-600 uppercase tracking-widest transition-all duration-300 hover:bg-amber-300 hover:text-slate-900 active:scale-95 disabled:opacity-40 disabled:scale-100 shadow-lg"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Discussion / Chat Panel */}
          <div className="lg:col-span-5 flex flex-col h-full space-y-5">
            <div className="flex items-center justify-between ml-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">forum</span>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Discussion History</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {comments.length} message{comments.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex-1 flex flex-col bg-slate-50/50 rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-inner min-h-[500px]">
              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {comments.length > 0 ? (
                  comments.map((comment) => {
                    const isMe = String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase()
                    const isEditing = editingCommentId === comment.id

                    return (
                      <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`relative max-w-[85%] rounded-[1.5rem] p-4 shadow-sm transition-all duration-300 ${
                          isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                        }`}>
                          {isEditing ? (
                            <div className="space-y-3 min-w-[200px]">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full rounded-xl bg-black/5 p-3 text-sm font-semibold outline-none focus:bg-black/10 transition-all resize-none text-inherit"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end gap-3">
                                <button onClick={() => setEditingCommentId(null)} className="text-[10px] font-black uppercase tracking-widest opacity-70 hover:opacity-100">Cancel</button>
                                <button onClick={() => onUpdateComment(comment.id)} className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30">Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-bold leading-relaxed pr-6">{comment.message}</p>
                              <div className={`flex items-center gap-2 mt-2 opacity-50 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-[9px] font-black tracking-widest uppercase">
                                  {formatDateTime(comment.createdAt).split(',')[1]?.trim() || formatDateTime(comment.createdAt)}
                                </span>
                                {isMe && <span className="material-symbols-outlined text-[14px]">done_all</span>}
                              </div>

                              {isMe && !isEditing && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(comment.id)
                                      setEditingCommentText(comment.message)
                                    }}
                                    className="p-1 rounded-full bg-black/10 hover:bg-black/20 text-white"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                  </button>
                                  <button
                                    onClick={() => onDeleteComment(comment.id)}
                                    className="p-1 rounded-full bg-black/10 hover:bg-red-500 text-white"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {!isMe && (
                          <span className="mt-1.5 ml-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                            {comment.createdBy || 'Staff Support'}
                          </span>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <div className="h-20 w-20 rounded-[2rem] bg-white flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                      <span className="material-symbols-outlined text-slate-300 text-[40px]">chat_bubble</span>
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">No discussion yet</p>
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              {ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED' && (
                <div className="p-4 bg-white border-t border-slate-100">
                  <form
                    className="relative flex items-end gap-3"
                    onSubmit={(event) => {
                      event.preventDefault()
                      onAddComment()
                    }}
                  >
                    <div className="relative flex-1">
                      <textarea
                        value={commentText}
                        onChange={(event) => onCommentTextChange(event.target.value)}
                        rows={1}
                        placeholder="Write a message..."
                        className="w-full rounded-[1.5rem] bg-slate-50 px-6 py-4 text-sm font-bold text-slate-700 outline-none transition-all focus:bg-white focus:ring-[10px] focus:ring-indigo-500/5 focus:border-indigo-200 border border-transparent max-h-32 resize-none"
                        style={{ height: 'auto', minHeight: '52px' }}
                        onInput={(e) => {
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isCommentSubmitting || !commentText.trim()}
                      className="grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 transition-all duration-300 hover:bg-indigo-700 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:scale-100"
                    >
                      {isCommentSubmitting ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <span className="material-symbols-outlined text-[24px]">send</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[10px] font-bold italic text-slate-400 tracking-tight">
            * This view provides a real-time snapshot of the ticket lifecycle and staff communication.
          </p>
        </div>
      </div>
    </div>
  )
}
