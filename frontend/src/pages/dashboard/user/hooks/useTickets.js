import { useCallback, useEffect, useMemo, useState } from 'react'
import { createTicketComment, deleteTicket, deleteTicketComment, getTicketComments, getUserTicketAttachmentUrl, getUserTicketById, getUserTickets, rateUserTicket, updateTicket, updateTicketComment } from '../../../../api/ticketApi'

export default function useTickets(getApiErrorMessage) {
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [activeTicket, setActiveTicket] = useState(null)
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [previewTicket, setPreviewTicket] = useState(null)
  
  const [processingId, setProcessingId] = useState(null)
  const [isActionProcessing, setIsActionProcessing] = useState(false)
  
  // Comment state
  const [commentText, setCommentText] = useState('')
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  
  // Attachment state
  const [attachmentUrls, setAttachmentUrls] = useState({})
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false)

  const loadTickets = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getUserTickets()
      const sortedData = Array.isArray(data) 
        ? [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : []
      setTickets(sortedData)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [getApiErrorMessage])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'OPEN').length,
      inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
      resolved: tickets.filter(t => t.status === 'RESOLVED').length
    }
  }, [tickets])

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = (ticket.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (ticket.description || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [tickets, search, statusFilter])

  const fetchAttachmentUrls = async (ticket) => {
    if (!ticket?.attachments?.length) return
    
    setIsAttachmentsLoading(true)
    const urls = { ...attachmentUrls }
    
    try {
      for (const attachment of ticket.attachments) {
        if (urls[attachment]) continue
        
        try {
          const storageKey = attachment.includes('/') ? attachment.split('/').pop() : attachment
          const response = await getUserTicketAttachmentUrl(ticket.id, storageKey)
          if (response?.url) {
            urls[attachment] = response.url
          }
        } catch (err) {
          console.error('Failed to fetch URL for:', attachment, err)
        }
      }
      setAttachmentUrls(urls)
    } finally {
      setIsAttachmentsLoading(false)
    }
  }

  const handleViewTicket = async (ticket) => {
    setProcessingId(ticket.id)
    try {
      const detailed = await getUserTicketById(ticket.id)
      setPreviewTicket(detailed)
      setIsDetailsOpen(true)
      fetchAttachmentUrls(detailed)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (ticket) => {
    if (!window.confirm('Are you sure you want to cancel this ticket?')) return
    
    setProcessingId(ticket.id)
    try {
      await deleteTicket(ticket.id)
      setSuccessMessage('Ticket cancelled successfully')
      await loadTickets()
      if (isDetailsOpen) setIsDetailsOpen(false)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !previewTicket) return
    
    setIsCommentSubmitting(true)
    try {
      await createTicketComment(previewTicket.id, commentText.trim())
      setCommentText('')
      // Refresh ticket details to show new comment
      const updated = await getUserTicketById(previewTicket.id)
      setPreviewTicket(updated)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsCommentSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?') || !previewTicket) return
    
    setIsActionProcessing(true)
    try {
      await deleteTicketComment(previewTicket.id, commentId)
      const updated = await getUserTicketById(previewTicket.id)
      setPreviewTicket(updated)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsActionProcessing(false)
    }
  }

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentText.trim() || !previewTicket) return
    
    setIsActionProcessing(true)
    try {
      await updateTicketComment(previewTicket.id, commentId, editingCommentText.trim())
      setEditingCommentId(null)
      setEditingCommentText('')
      const updated = await getUserTicketById(previewTicket.id)
      setPreviewTicket(updated)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsActionProcessing(false)
    }
  }

  const handleRateTicket = async (rating, feedback) => {
    if (!previewTicket) return
    
    setIsActionProcessing(true)
    try {
      await rateUserTicket(previewTicket.id, rating, feedback)
      setSuccessMessage('Thank you for your feedback!')
      const updated = await getUserTicketById(previewTicket.id)
      setPreviewTicket(updated)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsActionProcessing(false)
    }
  }

  return {
    tickets,
    filteredTickets,
    isLoading,
    errorMessage,
    successMessage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    isFormOpen,
    formMode,
    activeTicket,
    isDetailsOpen,
    previewTicket,
    processingId,
    commentText,
    setCommentText,
    isCommentSubmitting,
    attachmentUrls,
    isAttachmentsLoading,
    isActionProcessing,
    stats,
    loadTickets,
    openCreateTicket: () => {
      setFormMode('create')
      setActiveTicket(null)
      setIsFormOpen(true)
    },
    closeTicketForm: () => setIsFormOpen(false),
    closeTicketDetails: () => {
      setIsDetailsOpen(false)
      setPreviewTicket(null)
    },
    handleViewTicket,
    handleEditFromDetails: (ticket) => {
      setActiveTicket(ticket)
      setFormMode('edit')
      setIsDetailsOpen(false)
      setIsFormOpen(true)
    },
    handleDelete,
    handleAddComment,
    handleDeleteComment,
    handleUpdateComment,
    handleRateTicket,
    editingCommentId,
    setEditingCommentId,
    editingCommentText,
    setEditingCommentText
  }
}
