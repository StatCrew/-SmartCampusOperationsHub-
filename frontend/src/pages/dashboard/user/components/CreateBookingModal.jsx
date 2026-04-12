import { useState, useEffect, useRef } from 'react'
import { createBooking } from '../../../../api/bookingApi'
import useAuth from '../../../../context/useAuth'

const mockCreateBooking = async (payload) => {
  await new Promise(r => setTimeout(r, 1500))
  if (payload.resourceId === 999) {
    const err = new Error('Conflict')
    err.response = { status: 409, data: { message: 'Resource 999 is booked 10:00–12:00. Next available slot: 12:30 PM.' } }
    throw err
  }
}

// --- Step definitions ---
const STEPS = [
  { id: 1, label: 'Resource',  icon: '🏢' },
  { id: 2, label: 'Schedule',  icon: '📅' },
  { id: 3, label: 'Details',   icon: '📝' },
]

// --- Helper: parse "HH:MM" to minutes ---
const toMins = t => { if (!t) return 0; const [h,m] = t.split(':'); return +h*60 + +m }
const fmtDuration = (s, e) => {
  const d = toMins(e) - toMins(s)
  if (d <= 0) return null
  const h = Math.floor(d / 60), m = d % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

// ─── Main Component ───────────────────────────────────────────────
export default function CreateBookingModal({ isOpen, onClose, onSuccess }) {
  const { getApiErrorMessage } = useAuth()
  //const getApiErrorMessage = () => 'Something went wrong. Please try again.'

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    resourceId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', attendees: 1
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [conflictMessage, setConflictMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back
  const [animating, setAnimating] = useState(false)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setStep(1); setSubmitted(false); setError(''); setConflictMessage('')
      setFormData({ resourceId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', attendees: 1 })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
    setError(''); setConflictMessage('')
  }

  const goTo = (next) => {
    if (animating) return
    setDirection(next > step ? 1 : -1)
    setAnimating(true)
    setTimeout(() => { setStep(next); setAnimating(false) }, 260)
  }

  const stepValid = () => {
    if (step === 1) return formData.resourceId !== ''
    if (step === 2) return formData.bookingDate && formData.startTime && formData.endTime && toMins(formData.endTime) > toMins(formData.startTime)
    if (step === 3) return formData.purpose.trim().length > 0
    return true
  }

  const handleSubmit = async () => {
    setLoading(true); setError(''); setConflictMessage('')
    try {
      const payload = {
        resourceId: parseInt(formData.resourceId),
        startTime: `${formData.bookingDate}T${formData.startTime}:00`,
        endTime:   `${formData.bookingDate}T${formData.endTime}:00`,
        purpose:   formData.purpose,
        attendees: parseInt(formData.attendees)
      }
      await createBooking(payload)
      setSubmitted(true)
      setTimeout(() => { onSuccess?.(); onClose() }, 2200)
    } catch (err) {
      if (err.response?.status === 409) {
        const msg = err.response.data?.message || err.response.data?.error || err.response.data
        setConflictMessage(typeof msg === 'string' ? msg : 'Resource already booked during this time.')
        goTo(2)
      } else {
        setError(getApiErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const duration = fmtDuration(formData.startTime, formData.endTime)
  const today = new Date().toISOString().split('T')[0]

  // ── Success Screen ──
  if (submitted) return (
    <Overlay onClose={onClose} ref={overlayRef}>
      <div className="modal-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="success-burst">
          <div className="success-ring" />
          <span className="success-icon">✓</span>
        </div>
        <h2 style={{ marginTop: '1.5rem', fontSize: '1.4rem', fontWeight: 700, color: '#0d2b25', fontFamily: "'Playfair Display', serif" }}>
          Booking Requested!
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Your facility request has been submitted and is pending approval.
        </p>
        <div className="success-badge">
          Resource #{formData.resourceId} · {formData.bookingDate} · {formData.startTime}–{formData.endTime}
        </div>
      </div>
    </Overlay>
  )

  return (
    <Overlay onClose={onClose}>
      <div className="modal-card">

        {/* ── Header ── */}
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Facility Booking</p>
            <h3 className="modal-title">Request a Space</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Step Progress ── */}
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div key={s.id} className="stepper-item">
              <button
                className={`stepper-dot ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}
                onClick={() => step > s.id && goTo(s.id)}
                disabled={step <= s.id}
              >
                {step > s.id ? '✓' : s.icon}
              </button>
              <span className={`stepper-label ${step === s.id ? 'active' : ''}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`stepper-line ${step > s.id ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* ── Conflict Banner ── */}
        {conflictMessage && (
          <div className="conflict-banner">
            <div className="conflict-icon">⚡</div>
            <div>
              <strong>Time Conflict</strong>
              <p>{conflictMessage}</p>
            </div>
          </div>
        )}

        {/* ── Step Content ── */}
        <div className={`step-wrap ${animating ? (direction > 0 ? 'slide-out-left' : 'slide-out-right') : 'slide-in'}`}>

          {step === 1 && (
            <div className="step-body">
              <FieldLabel>Resource ID</FieldLabel>
              <input
                type="number" name="resourceId" value={formData.resourceId}
                onChange={handleChange} placeholder="e.g. 101"
                className="field-input" required
              />
              <p className="field-hint">Enter the unique ID of the facility or room you wish to book.</p>

              <FieldLabel>Number of Attendees</FieldLabel>
              <div className="attendee-row">
                <button className="attendee-btn" onClick={() => setFormData(p => ({ ...p, attendees: Math.max(1, +p.attendees - 1) }))}>−</button>
                <span className="attendee-count">{formData.attendees}</span>
                <button className="attendee-btn" onClick={() => setFormData(p => ({ ...p, attendees: +p.attendees + 1 }))}>+</button>
                <span className="attendee-label">
                  {formData.attendees === 1 ? 'person' : 'people'}
                </span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-body">
              <FieldLabel>Date</FieldLabel>
              <input type="date" name="bookingDate" value={formData.bookingDate}
                onChange={handleChange} min={today} className="field-input" required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <FieldLabel>Start Time</FieldLabel>
                  <input type="time" name="startTime" value={formData.startTime}
                    onChange={handleChange} className="field-input" required />
                </div>
                <div>
                  <FieldLabel>End Time</FieldLabel>
                  <input type="time" name="endTime" value={formData.endTime}
                    onChange={handleChange} className="field-input" required />
                </div>
              </div>

              {duration && (
                <div className="duration-pill">
                  <span>⏱</span> {duration} session
                </div>
              )}

              {formData.startTime && formData.endTime && toMins(formData.endTime) <= toMins(formData.startTime) && (
                <p className="inline-error">End time must be after start time.</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="step-body">
              <FieldLabel>Purpose</FieldLabel>
              <textarea
                name="purpose" value={formData.purpose}
                onChange={handleChange} rows={3}
                placeholder="Describe why you need this space…"
                className="field-input field-textarea" required
              />
              <p className="field-hint">{formData.purpose.length}/280 characters</p>

              {/* Summary card */}
              {formData.resourceId && formData.bookingDate && (
                <div className="summary-card">
                  <p className="summary-title">Booking Summary</p>
                  <div className="summary-grid">
                    <SummaryItem icon="🏢" label="Resource" value={`#${formData.resourceId}`} />
                    <SummaryItem icon="📅" label="Date" value={formData.bookingDate} />
                    <SummaryItem icon="🕐" label="Time" value={`${formData.startTime} – ${formData.endTime}`} />
                    <SummaryItem icon="👥" label="Attendees" value={formData.attendees} />
                  </div>
                </div>
              )}

              {error && <div className="inline-error" style={{ marginTop: '0.75rem' }}>{error}</div>}
            </div>
          )}
        </div>

        {/* ── Footer Navigation ── */}
        <div className="modal-footer">
          {step > 1
            ? <button className="btn-ghost" onClick={() => goTo(step - 1)}>← Back</button>
            : <button className="btn-ghost" onClick={onClose}>Cancel</button>
          }

          {step < 3
            ? <button className="btn-primary" onClick={() => goTo(step + 1)} disabled={!stepValid()}>
                Continue →
              </button>
            : <button className="btn-primary" onClick={handleSubmit} disabled={loading || !stepValid()}>
                {loading
                  ? <span className="loading-dots"><span/><span/><span/></span>
                  : '✦ Submit Request'
                }
              </button>
          }
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --ink: #0d2b25;
          --ink-2: #2e6b5e;
          --ink-3: #7ab5a8;
          --surface: #ffffff;
          --surface-2: #f0faf8;
          --border: #b2ddd7;
          --accent: #0e9e84;
          --accent-2: #0cbfa0;
          --accent-light: #d6f5ef;
          --accent-dark: #0a7a65;
          --amber: #d97706;
          --amber-bg: #fffbeb;
          --amber-border: #fde68a;
          --green: #0e9e84;
          --green-bg: #d6f5ef;
          --red: #dc2626;
          --red-bg: #fef2f2;
          --radius: 16px;
          --radius-sm: 10px;
          --gradient: linear-gradient(135deg, #0e9e84 0%, #0cbfa0 50%, #14c9ab 100%);
          --shadow: 0 25px 60px -10px rgba(14,158,132,0.2), 0 0 0 1px rgba(14,158,132,0.08);
        }

        .modal-overlay {
          position: fixed; inset: 0; z-index: 999;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          background: rgba(10, 40, 35, 0.6);
          backdrop-filter: blur(8px);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

        .modal-card {
          width: 100%; max-width: 460px;
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
          animation: slideUp 0.3s cubic-bezier(.22,1,.36,1);
          font-family: 'DM Sans', sans-serif;
        }
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }

        /* Header */
        .modal-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 1.5rem 1.5rem 1rem;
          border-bottom: 1px solid var(--border);
          background: var(--gradient);
        }
        .modal-eyebrow {
          font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(255,255,255,0.8); margin: 0 0 0.2rem;
        }
        .modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem; font-weight: 700;
          color: #ffffff; margin: 0;
        }
        .close-btn {
          background: rgba(255,255,255,0.2); border: none; cursor: pointer;
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .close-btn:hover { background: rgba(255,255,255,0.35); color: #fff }

        /* Stepper */
        .stepper {
          display: flex; align-items: center; justify-content: center;
          padding: 1.25rem 1.5rem 0.75rem; gap: 0;
        }
        .stepper-item {
          display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
          position: relative; flex: 1;
        }
        .stepper-dot {
          width: 40px; height: 40px; border-radius: 50%;
          border: 2px solid var(--border); background: var(--surface-2);
          font-size: 1rem; cursor: default;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.25s ease; color: var(--ink-2);
          position: relative; z-index: 1;
        }
        .stepper-dot.active {
          border-color: var(--accent); background: var(--accent-light);
          color: var(--accent); box-shadow: 0 0 0 4px rgba(79,70,229,0.12);
          transform: scale(1.1);
        }
        .stepper-dot.done {
          border-color: var(--green); background: var(--green-bg);
          color: var(--green); cursor: pointer;
        }
        .stepper-dot.done:hover { transform: scale(1.05) }
        .stepper-label {
          font-size: 0.68rem; font-weight: 500; color: var(--ink-3);
          letter-spacing: 0.03em; text-transform: uppercase;
        }
        .stepper-label.active { color: var(--accent); font-weight: 600 }
        .stepper-line {
          position: absolute; top: 19px; left: calc(50% + 20px);
          width: calc(100% - 40px); height: 2px;
          background: var(--border); transition: background 0.3s;
        }
        .stepper-line.done { background: var(--accent) }

        /* Step content */
        .step-wrap { padding: 1.25rem 1.5rem; min-height: 200px }
        .step-body { display: flex; flex-direction: column; gap: 0 }
        .slide-in { animation: slideIn 0.25s cubic-bezier(.22,1,.36,1) }
        @keyframes slideIn { from { opacity:0; transform:translateX(18px) } to { opacity:1; transform:none } }
        .slide-out-left { animation: outLeft 0.25s ease forwards }
        @keyframes outLeft { to { opacity:0; transform:translateX(-18px) } }
        .slide-out-right { animation: outRight 0.25s ease forwards }
        @keyframes outRight { to { opacity:0; transform:translateX(18px) } }

        /* Fields */
        .field-label {
          font-size: 0.72rem; font-weight: 600; letter-spacing: 0.07em;
          text-transform: uppercase; color: var(--ink-2); margin-bottom: 0.4rem;
        }
        .field-input {
          width: 100%; box-sizing: border-box;
          border: 1.5px solid var(--border); border-radius: var(--radius-sm);
          padding: 0.65rem 0.85rem; font-size: 0.9rem; font-family: 'DM Sans', sans-serif;
          color: var(--ink); background: var(--surface-2);
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          outline: none;
        }
        .field-input:focus {
          border-color: var(--accent); background: #fff;
          box-shadow: 0 0 0 3px rgba(14,158,132,0.15);
        }
        .field-textarea { resize: vertical; min-height: 80px }
        .field-hint { font-size: 0.75rem; color: var(--ink-3); margin: 0.3rem 0 1rem }

        /* Attendees */
        .attendee-row {
          display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
        }
        .attendee-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1.5px solid var(--border); background: var(--surface-2);
          font-size: 1.1rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink); transition: all 0.15s;
        }
        .attendee-btn:hover { border-color: var(--accent); background: var(--accent-light); color: var(--accent) }
        .attendee-count {
          font-size: 1.4rem; font-weight: 700; font-family: 'Playfair Display', serif;
          color: var(--ink); min-width: 32px; text-align: center;
        }
        .attendee-label { font-size: 0.85rem; color: var(--ink-2) }

        /* Duration pill */
        .duration-pill {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: var(--accent-light); color: var(--accent);
          font-size: 0.78rem; font-weight: 600; padding: 0.3rem 0.8rem;
          border-radius: 100px; margin-top: 0.75rem; border: 1px solid rgba(14,158,132,0.25);
        }

        /* Summary card */
        .summary-card {
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 1rem; margin-top: 1rem;
        }
        .summary-title {
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--ink-3); margin: 0 0 0.75rem;
        }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem }
        .summary-item { display: flex; align-items: center; gap: 0.5rem }
        .summary-item-icon { font-size: 1rem }
        .summary-item-text { display: flex; flex-direction: column }
        .summary-item-label { font-size: 0.65rem; color: var(--ink-3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em }
        .summary-item-value { font-size: 0.82rem; font-weight: 600; color: var(--ink) }

        /* Conflict */
        .conflict-banner {
          display: flex; gap: 0.75rem; align-items: flex-start;
          background: var(--amber-bg); border-top: 1px solid var(--amber-border);
          border-bottom: 1px solid var(--amber-border);
          padding: 0.9rem 1.5rem; animation: slideIn 0.2s ease;
        }
        .conflict-icon { font-size: 1.4rem; flex-shrink: 0; margin-top: 0.1rem }
        .conflict-banner strong { font-size: 0.82rem; font-weight: 700; color: #92400e; display: block; margin-bottom: 0.2rem }
        .conflict-banner p { font-size: 0.78rem; color: #b45309; margin: 0; line-height: 1.5 }

        /* Errors */
        .inline-error {
          font-size: 0.78rem; color: var(--red);
          background: var(--red-bg); border-radius: 8px;
          padding: 0.5rem 0.75rem; margin-top: 0.5rem;
        }

        /* Footer */
        .modal-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 1.5rem; border-top: 1px solid var(--border);
          background: var(--surface-2);
        }
        .btn-ghost {
          background: none; border: none; cursor: pointer;
          font-size: 0.85rem; font-weight: 500; color: var(--ink-2);
          padding: 0.5rem 0.75rem; border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s, color 0.15s;
        }
        .btn-ghost:hover { background: var(--border); color: var(--ink) }
        .btn-primary {
          background: var(--gradient); color: #fff;
          border: none; cursor: pointer;
          font-size: 0.88rem; font-weight: 600;
          padding: 0.65rem 1.4rem; border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          transition: filter 0.15s, transform 0.1s, opacity 0.15s;
          display: flex; align-items: center; gap: 0.4rem;
          min-width: 130px; justify-content: center;
          box-shadow: 0 4px 14px rgba(14,158,132,0.35);
        }
        .btn-primary:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px) }
        .btn-primary:active:not(:disabled) { transform: translateY(0) }
        .btn-primary:disabled { opacity: 0.45; cursor: not-allowed }

        /* Loading dots */
        .loading-dots { display: flex; gap: 4px; align-items: center }
        .loading-dots span {
          width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.8);
          animation: bounce 0.8s infinite ease-in-out;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.15s }
        .loading-dots span:nth-child(3) { animation-delay: 0.3s }
        @keyframes bounce { 0%,80%,100% { transform: scale(0.7); opacity:0.5 } 40% { transform: scale(1); opacity:1 } }

        /* Success */
        .success-burst {
          width: 80px; height: 80px; margin: 0 auto;
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .success-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 3px solid var(--green);
          animation: expand 0.5s cubic-bezier(.22,1,.36,1) forwards;
        }
        @keyframes expand { from { transform: scale(0); opacity:1 } to { transform: scale(1); opacity:1 } }
        .success-icon {
          font-size: 2rem; color: var(--green);
          animation: popIn 0.35s 0.2s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes popIn { from { transform: scale(0); opacity:0 } to { transform: scale(1); opacity:1 } }
        .success-badge {
          background: var(--accent-light); color: var(--accent);
          font-size: 0.78rem; font-weight: 600; padding: 0.5rem 1rem;
          border-radius: 100px; margin-top: 1.25rem; display: inline-block;
          border: 1px solid rgba(14,158,132,0.25);
        }
      `}</style>
    </Overlay>
  )
}

// ─── Sub-components ───────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return <p className="field-label">{children}</p>
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="summary-item">
      <span className="summary-item-icon">{icon}</span>
      <div className="summary-item-text">
        <span className="summary-item-label">{label}</span>
        <span className="summary-item-value">{value}</span>
      </div>
    </div>
  )
}
