import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTicket, updateTicket } from '../../../../api/ticketApi'
import { sendAdminRoleBroadcast } from '../../../../api/adminApi'

const CATEGORIES = ['GENERAL', 'PLUMBING', 'ELECTRICAL', 'EQUIPMENT', 'HVAC', 'NETWORK', 'CLEANING', 'OTHER']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export default function TicketFormModal({ open, mode, ticket, onClose, onSaved, getApiErrorMessage }) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [touched, setTouched] = useState({})
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    resourceId: '',
    contactNumber: '',
  })
  const [files, setFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const initialData = useRef({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    resourceId: '',
    contactNumber: '',
  })

  useEffect(() => {
    if (!open) {
      return
    }

    const data = {
      title: ticket?.title || '',
      description: ticket?.description || '',
      category: ticket?.category || 'GENERAL',
      priority: ticket?.priority || 'MEDIUM',
      resourceId: ticket?.resourceId ? String(ticket.resourceId) : '',
      contactNumber: ticket?.contactNumber || '',
    }

    initialData.current = data
    setFormData(formData => ({ ...formData, ...data }))
    setErrorMessage('')
    setFileError('')
    setTouched({})
    setIsSubmitting(false)
    setFiles([])
  }, [open, ticket, mode])

  const errors = {}
  if (!formData.title.trim()) errors.title = 'Ticket title is required'
  else if (formData.title.length < 5) errors.title = 'Title must be at least 5 characters'

  if (!formData.description.trim()) errors.description = 'Please describe the issue'
  else if (formData.description.length < 20) errors.description = 'Description must be at least 20 characters'

  if (formData.contactNumber && !/^\d{10}$/.test(formData.contactNumber)) {
    errors.contactNumber = 'Contact number must be exactly 10 digits'
  }

  const isFormValid = Object.keys(errors).length === 0 && files.length <= 3

  const processFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length === 0) return

    if (selectedFiles.length > 3) {
      setFileError('Maximum 3 images allowed. Only the first 3 were selected.')
      setFiles(selectedFiles.slice(0, 3))
    } else {
      setFileError('')
      setFiles(selectedFiles)
    }
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dataTransfer = new DataTransfer()
      Array.from(e.dataTransfer.files).forEach(file => dataTransfer.items.add(file))
      fileInputRef.current.files = dataTransfer.files
      processFiles({ target: { files: dataTransfer.files } })
    }
  }

  const handleRevert = () => {
    setFormData(initialData.current)
    setFiles([])
    setFileError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (files.length > 3) {
      setFileError('Please remove images to stay within the 3-file limit.')
      return
    }

    if (!isFormValid) {
      setTouched({
        title: true,
        description: true,
        contactNumber: true,
      })
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = {
        ...formData,
        resourceId: formData.resourceId ? Number(formData.resourceId) : null,
      }

      if (mode === 'edit') {
        await updateTicket(ticket.id, payload, files)
      } else {
        await createTicket(payload, files)
        
        // Broadcast to ADMIN and TECHNICIAN
        try {
          await Promise.all([
            sendAdminRoleBroadcast({
              targetRole: 'ADMIN',
              title: 'New Support Ticket',
              message: `Ticket "${payload.title}" created in category ${payload.category}.`,
              actionUrl: '/admin/tickets',
              category: 'TICKET'
            }),
            sendAdminRoleBroadcast({
              targetRole: 'TECHNICIAN',
              title: 'New Maintenance Request',
              message: `Urgent: "${payload.title}" requires attention in ${payload.category}.`,
              actionUrl: '/dashboard/technician/tickets',
              category: 'TICKET'
            })
          ])
        } catch (e) { console.error('Broadcast failed:', e) }
      }

      onSaved()
      navigate('/dashboard/user/tickets')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-6xl rounded-[2.5rem] bg-white p-8 lg:p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-y-auto max-h-[92vh] no-scrollbar">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">STUDENT SUPPORT PORTAL</p>
            </div>
            <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {mode === 'edit' ? 'Update Ticket' : 'New Ticket'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 lg:h-12 lg:w-12 place-items-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 hover:bg-red-50 hover:text-red-500 hover:rotate-90 shadow-sm border border-slate-100"
          >
            <span className="material-symbols-outlined text-[20px] lg:text-[24px]">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/50 p-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="text-xs font-bold tracking-tight">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-7 space-y-5 lg:space-y-6">
            <div className="space-y-1.5 group">
              <label className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 transition-colors group-focus-within:text-indigo-500">Issue Title</label>
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                onBlur={() => setTouched({ ...touched, title: true })}
                placeholder="What's the problem?"
                className={`w-full rounded-xl lg:rounded-2xl border bg-slate-50/30 px-5 lg:px-6 py-3.5 lg:py-4 text-sm font-semibold outline-none transition-all duration-300 placeholder:text-slate-300 shadow-sm ${touched.title && errors.title ? 'border-red-200 focus:border-red-400 focus:ring-4 focus:ring-red-500/5' : 'border-slate-100 focus:border-indigo-400 focus:bg-white focus:ring-[10px] focus:ring-indigo-500/5'
                  }`}
              />
              {touched.title && errors.title && (
                <p className="ml-1 text-[9px] font-black text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">{errors.title}</p>
              )}
            </div>

            <div className="space-y-1.5 group">
              <label className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 transition-colors group-focus-within:text-indigo-500">Detailed Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onBlur={() => setTouched({ ...touched, description: true })}
                rows={3}
                placeholder="Describe the incident, location, and specific details..."
                className={`w-full rounded-xl lg:rounded-[1.5rem] border bg-slate-50/30 px-5 lg:px-6 py-3.5 lg:py-4 text-sm font-semibold outline-none transition-all duration-300 placeholder:text-slate-300 leading-relaxed resize-none shadow-sm ${touched.description && errors.description ? 'border-red-200 focus:border-red-400 focus:ring-4 focus:ring-red-500/5' : 'border-slate-100 focus:border-indigo-400 focus:bg-white focus:ring-[10px] focus:ring-indigo-500/5'
                  }`}
              />
              {touched.description && errors.description && (
                <p className="ml-1 text-[9px] font-black text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5 lg:gap-6">
              <div className="space-y-1.5 group">
                <label className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 transition-colors group-focus-within:text-indigo-500">Category</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl lg:rounded-2xl border border-slate-100 bg-slate-50/30 px-5 lg:px-6 py-3.5 lg:py-4 text-sm font-bold text-slate-700 outline-none transition-all duration-300 focus:border-indigo-400 focus:bg-white appearance-none cursor-pointer shadow-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                  <span className="absolute right-5 lg:right-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none transition-transform group-focus-within:rotate-180 text-[20px]">expand_more</span>
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 transition-colors group-focus-within:text-indigo-500">Priority Level</label>
                <div className="relative">
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-xl lg:rounded-2xl border border-slate-100 bg-slate-50/30 px-5 lg:px-6 py-3.5 lg:py-4 text-sm font-bold text-slate-700 outline-none transition-all duration-300 focus:border-indigo-400 focus:bg-white appearance-none cursor-pointer shadow-sm"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                  <span className="absolute right-5 lg:right-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none transition-transform group-focus-within:rotate-180 text-[20px]">expand_more</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 lg:gap-6">
              <div className="space-y-1.5 group">
                <label className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 transition-colors group-focus-within:text-indigo-500">Resource ID</label>
                <input
                  value={formData.resourceId}
                  onChange={(e) => setFormData({ ...formData, resourceId: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 102 (Optional)"
                  className="w-full rounded-xl lg:rounded-2xl border border-slate-100 bg-slate-50/30 px-5 lg:px-6 py-3.5 lg:py-4 text-sm font-semibold outline-none transition-all duration-300 focus:border-indigo-400 focus:bg-white focus:ring-[10px] focus:ring-indigo-500/5 shadow-sm placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 transition-colors group-focus-within:text-indigo-500">Contact Number</label>
                <input
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  onBlur={() => setTouched({ ...touched, contactNumber: true })}
                  placeholder="0712345678"
                  className={`w-full rounded-xl lg:rounded-2xl border bg-slate-50/30 px-5 lg:px-6 py-3.5 lg:py-4 text-sm font-semibold outline-none transition-all duration-300 placeholder:text-slate-300 shadow-sm ${touched.contactNumber && errors.contactNumber ? 'border-red-200 focus:border-red-400 focus:ring-4 focus:ring-red-500/5' : 'border-slate-100 focus:border-indigo-400 focus:bg-white focus:ring-[10px] focus:ring-indigo-500/5'
                    }`}
                />
                {touched.contactNumber && errors.contactNumber && (
                  <p className="ml-1 text-[9px] font-black text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">{errors.contactNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Evidence */}
          <div className="lg:col-span-5 space-y-4 lg:space-y-5 flex flex-col h-full">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[12px] lg:text-[12px] font-black uppercase tracking-[0.25em] text-slate-400">Visual Evidence</label>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full transition-colors ${files.length >= 3 ? 'bg-red-500' : 'bg-indigo-500'}`} />
                <span className={`text-[12px] lg:text-[12px] font-black uppercase tracking-widest ${files.length >= 3 ? 'text-red-500' : 'text-slate-400'}`}>
                  {files.length} / 3 Files
                </span>
              </div>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative flex-1 rounded-[2rem] lg:rounded-[2.5rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center p-6 lg:p-10 min-h-[280px] shadow-sm ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[0.97] ring-[15px] ring-indigo-500/5' : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-indigo-300 hover:shadow-md'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={processFiles}
                className="hidden"
              />

              <div className="grid h-14 w-14 lg:h-16 lg:w-16 place-items-center rounded-2xl bg-white text-indigo-500 shadow-sm border border-slate-100 mb-4 lg:mb-6 transition-transform duration-500">
                <span className="material-symbols-outlined text-[32px] lg:text-[36px]">add_photo_alternate</span>
              </div>

              <h4 className="text-base lg:text-lg font-black text-slate-900 tracking-tight text-center">Drag & drop images here</h4>
              <p className="mt-2 text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                Supported: JPG, PNG, WEBP
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 lg:mt-8 rounded-xl lg:rounded-2xl bg-slate-900 px-7 lg:px-8 py-3 lg:py-3.5 text-[9px] lg:text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all duration-300 hover:bg-indigo-600 hover:shadow-[0_15px_30px_-8px_rgba(79,70,229,0.3)] active:scale-95"
              >
                Browse Gallery
              </button>

              {fileError && (
                <div className="absolute bottom-6 lg:bottom-8 px-4 lg:px-6 py-2 lg:py-2.5 bg-red-500 text-white text-[9px] lg:text-[10px] font-black uppercase tracking-widest rounded-xl lg:rounded-2xl text-center shadow-xl animate-in zoom-in-95 duration-300">
                  You can upload maximum 3 images
                </div>
              )}
            </div>

            {/* Selected Files Preview */}
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-3 lg:gap-4 mt-4 animate-in fade-in slide-in-from-bottom-4">
                {files.map((file, index) => (
                  <div key={index} className="group relative aspect-square rounded-[1.25rem] border border-slate-200 bg-white overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 p-1">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="preview"
                      className="h-full w-full object-cover rounded-[1rem]"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                      className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white shadow-lg opacity-0 scale-75 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 hover:bg-red-600 z-10"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="lg:col-span-12 flex flex-col md:flex-row items-center justify-between gap-3 lg:gap-4 pt-3 lg:pt-4 mt-0 border-t border-slate-50">
            <p className="text-[12px] lg:text-[12px] text-slate-400 font-bold italic tracking-tight opacity-70">
              * By submitting, you confirm the incident details are accurate for investigation.
            </p>

            <div className="flex items-center gap-4 lg:gap-5 w-full md:w-auto">
              <button
                type="button"
                onClick={handleRevert}
                className="flex-1 md:flex-none rounded-xl lg:rounded-2xl border-2 border-amber-200 bg-white px-8 lg:px-10 py-4 lg:py-4.5 text-[12px] lg:text-[12px] font-black uppercase tracking-[0.2em] text-amber-600 transition-all duration-300 hover:bg-amber-50 hover:border-amber-300 active:scale-95"
              >
                Revert
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="flex-1 md:flex-none rounded-xl lg:rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 px-10 lg:px-12 py-4 lg:py-4.5 text-[12px] lg:text-[12px] font-black uppercase tracking-[0.25em] text-white transition-all duration-300 hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg"
              >
                {isSubmitting ? 'Processing...' : mode === 'edit' ? 'Save Changes' : 'Publish Ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
