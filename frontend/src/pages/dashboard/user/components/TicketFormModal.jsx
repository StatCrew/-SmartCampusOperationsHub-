import { useEffect, useRef, useState } from 'react'
import { createTicket, updateTicket } from '../../../../api/ticketApi'

const CATEGORIES = ['GENERAL', 'PLUMBING', 'ELECTRICAL', 'EQUIPMENT', 'HVAC', 'NETWORK', 'CLEANING', 'OTHER']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export default function TicketFormModal({ open, mode, ticket, onClose, onSaved, getApiErrorMessage }) {
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
      }

      onSaved()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-[2rem] bg-white p-6 shadow-2xl overflow-y-auto max-h-[95vh] no-scrollbar">
        <div className="mb-6 flex items-center justify-between border-b border-slate-50 pb-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <span className="material-symbols-outlined text-[24px]">
                {mode === 'edit' ? 'edit_note' : 'add_task'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                {mode === 'edit' ? 'Update Support Request' : 'Create New Ticket'}
              </h3>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {mode === 'edit' ? `Editing Ticket #${ticket.id}` : 'Smart Campus Maintenance System'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-red-50 hover:text-red-500 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 text-red-700">
              <span className="material-symbols-outlined">error</span>
              <p className="text-sm font-bold">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-6">
          <div className="md:col-span-8 space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ml-1">Problem Title</label>
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                onBlur={() => setTouched({ ...touched, title: true })}
                placeholder="Brief summary of the issue (e.g., Leaking pipe in Lab 302)"
                className={`w-full rounded-2xl border bg-slate-50/50 px-5 py-4 text-sm font-medium outline-none transition focus:bg-white focus:ring-4 focus:ring-indigo-500/10 ${
                  touched.title && errors.title ? 'border-red-300' : 'border-slate-100 focus:border-indigo-400'
                }`}
              />
              {touched.title && errors.title && (
                <p className="ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wide">{errors.title}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ml-1">Issue Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onBlur={() => setTouched({ ...touched, description: true })}
                rows={5}
                placeholder="Provide as much detail as possible to help our technicians understand the problem..."
                className={`w-full rounded-2xl border bg-slate-50/50 px-5 py-4 text-sm font-medium outline-none transition focus:bg-white focus:ring-4 focus:ring-indigo-500/10 leading-relaxed ${
                  touched.description && errors.description ? 'border-red-300' : 'border-slate-100 focus:border-indigo-400'
                }`}
              />
              {touched.description && errors.description && (
                <p className="ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wide">{errors.description}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ml-1">Contact Number (Optional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-[18px]">call</span>
                  <input
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    onBlur={() => setTouched({ ...touched, contactNumber: true })}
                    placeholder="10-digit mobile number"
                    className={`w-full rounded-2xl border bg-slate-50/50 pl-11 pr-5 py-4 text-sm font-medium outline-none transition focus:bg-white focus:ring-4 focus:ring-indigo-500/10 ${
                      touched.contactNumber && errors.contactNumber ? 'border-red-300' : 'border-slate-100 focus:border-indigo-400'
                    }`}
                  />
                </div>
                {touched.contactNumber && errors.contactNumber && (
                  <p className="ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wide">{errors.contactNumber}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ml-1">Resource ID (Optional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-[18px]">tag</span>
                  <input
                    value={formData.resourceId}
                    onChange={(e) => setFormData({ ...formData, resourceId: e.target.value.replace(/\D/g, '') })}
                    placeholder="Equipment or Room ID"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 pl-11 pr-5 py-4 text-sm font-medium outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ml-1">Service Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ml-1">Urgency Level</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={`rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition border ${
                      formData.priority === p 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-95' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-500'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ml-1">Visual Evidence (Max 3)</label>
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 min-h-[160px] ${
                  isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-95' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300'
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
                
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-slate-400 shadow-sm transition group-hover:scale-110 group-hover:text-indigo-600">
                  <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {files.length > 0 ? `${files.length} Files selected` : 'Drop images or click'}
                </p>
                <p className="mt-1 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                  Support JPEG, PNG up to 5MB
                </p>

                {fileError && (
                  <div className="absolute inset-x-2 -bottom-2 px-2 py-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg text-center animate-bounce shadow-lg">
                    {fileError}
                  </div>
                )}
              </div>

              {files.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-5">
                  {files.map((file, index) => {
                    const isImage = file.type.startsWith('image/')
                    return (
                      <div key={index} className="group relative aspect-square rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm transition hover:shadow-md hover:border-indigo-200 p-1">
                        {isImage ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            className="h-full w-full object-cover rounded-[1.125rem]"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center bg-slate-50 rounded-[1.125rem]">
                            <span className="material-symbols-outlined text-slate-300">draft</span>
                            <span className="mt-1 block truncate text-[8px] font-bold text-slate-400 w-full">{file.name}</span>
                          </div>
                        )}
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                          className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white shadow-lg opacity-0 scale-75 transition group-hover:opacity-100 group-hover:scale-100 hover:bg-red-600 z-10"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>

                        <div className="absolute inset-x-2 bottom-2 bg-slate-900/70 backdrop-blur-sm p-1 px-2 text-[8px] font-bold text-white uppercase tracking-tighter truncate opacity-0 group-hover:opacity-100 transition rounded-md">
                          {(file.size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-12 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-50 pt-8">
            <p className="text-[10px] text-slate-400 font-medium italic">
              * By submitting, you confirm the incident details are accurate for investigation.
            </p>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 md:flex-none rounded-2xl border border-slate-200 px-6 py-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevert}
                className="flex-1 md:flex-none rounded-2xl border border-amber-200 bg-amber-50 px-6 py-3 text-xs font-bold text-amber-600 transition hover:bg-amber-100 shadow-sm shadow-amber-500/5"
              >
                Revert
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="flex-1 md:flex-none rounded-2xl bg-indigo-600 px-8 py-3 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 shadow-xl shadow-indigo-600/20 active:scale-95"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : mode === 'edit' ? 'Save Changes' : 'Publish Ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
