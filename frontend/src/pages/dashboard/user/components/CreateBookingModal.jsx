import { useState, useEffect, useRef } from 'react';
import { createBooking, updateFullBooking } from '../../../../api/bookingApi';
import useAuth from '../../../../context/useAuth';

/* Constant configurations for modal steps */
const STEPS = [
  { id: 1, label: 'Resource',  icon: '🏢' },
  { id: 2, label: 'Schedule',  icon: '📅' },
  { id: 3, label: 'Details',   icon: '📝' },
];

/* Helper utilities for time calculations */
const toMins = t => { 
  if (!t) return 0; 
  const [h,m] = t.split(':'); 
  return +h * 60 + (+m); 
};

const fmtDuration = (s, e) => {
  const d = toMins(e) - toMins(s); 
  if (d <= 0) return null;
  const h = Math.floor(d / 60);
  const m = d % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};

export default function CreateBookingModal({ isOpen, onClose, onSuccess, selectedResource, activeKeys, modifyData }) {
  const { getApiErrorMessage } = useAuth();
  
  /* Component State */
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ resourceId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', attendees: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conflictMessage, setConflictMessage] = useState('');
  const [suggestedSlot, setSuggestedSlot] = useState(null); 
  const [submitted, setSubmitted] = useState(false);
  
  /* Animation State */
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);

  /* Initialize form data when modal opens or modifyData changes */
  useEffect(() => {
    if (isOpen) {
      setStep(1); 
      setSubmitted(false); 
      setError(''); 
      setConflictMessage('');
      setSuggestedSlot(null);
      
      if (modifyData) {
        const [startDate, startTimeStr] = modifyData.startTime.split('T');
        const [, endTimeStr] = modifyData.endTime.split('T');
        
        setFormData({
          resourceId: selectedResource?.id || modifyData.resourceId || '',
          bookingDate: startDate,
          startTime: startTimeStr.substring(0, 5),
          endTime: endTimeStr.substring(0, 5),
          purpose: modifyData.purpose || '',
          attendees: modifyData.attendees || 1
        });
      } else {
        setFormData({ 
          resourceId: selectedResource?.id || '', 
          bookingDate: '', startTime: '', endTime: '', purpose: '', attendees: 1 
        });
      }
    }
  }, [isOpen, selectedResource, modifyData]);

  if (!isOpen) return null;

  const handleChange = (e) => { 
    setFormData(p => ({ ...p, [e.target.name]: e.target.value })); 
    setError(''); 
    setConflictMessage(''); 
    setSuggestedSlot(null);
  };

  const goTo = (next) => {
    if (animating) return;
    setDirection(next > step ? 1 : -1); 
    setAnimating(true);
    setTimeout(() => { 
      setStep(next); 
      setAnimating(false); 
    }, 200);
  };

  /* Validates if the selected time falls within the resource's operating hours */
  const isWithinSchedule = () => {
    if (!activeKeys || activeKeys.size === 0) return true;
    if (!formData.bookingDate || !formData.startTime || !formData.endTime) return true;
    
    const [y, m, d] = formData.bookingDate.split('-');
    const dateObj = new Date(y, m - 1, d);
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = days[dateObj.getDay()];
    
    const startHour = parseInt(formData.startTime.split(':')[0], 10);
    const endHour   = parseInt(formData.endTime.split(':')[0], 10);
    const endMin    = parseInt(formData.endTime.split(':')[1], 10);
    
    const effectiveEnd = endMin > 0 ? endHour : endHour - 1;
    
    for (let h = startHour; h <= effectiveEnd; h++) {
      if (!activeKeys.has(`${dayOfWeek}-${String(h).padStart(2, '0')}`)) return false;
    }
    return true;
  };

  const scheduleValid = isWithinSchedule();

  /* Validates current step requirements before allowing progression */
  const stepValid = () => {
    if (step === 1) return formData.resourceId !== '';
    if (step === 2) return formData.bookingDate && formData.startTime && formData.endTime && toMins(formData.endTime) > toMins(formData.startTime) && scheduleValid;
    if (step === 3) return formData.purpose.trim().length > 0;
    return true;
  };

  // Instantly populates the form inputs with the suggested timeslot
  const acceptSuggestedSlot = () => {
    if (suggestedSlot) {
      setFormData(prev => ({
        ...prev,
        bookingDate: suggestedSlot.date,
        startTime: suggestedSlot.startTime,
        endTime: suggestedSlot.endTime
      }));
      setConflictMessage('');
      setSuggestedSlot(null);
    }
  };

  const handleSubmit = async () => {
    setLoading(true); 
    setError(''); 
    setConflictMessage('');
    setSuggestedSlot(null);
    
    try {
      const payload = {
        resourceId: parseInt(formData.resourceId),
        startTime: `${formData.bookingDate}T${formData.startTime}:00`,
        endTime:   `${formData.bookingDate}T${formData.endTime}:00`,
        purpose:   formData.purpose,
        attendees: parseInt(formData.attendees)
      };

      if (modifyData) {
        await updateFullBooking(modifyData.id, payload);
      } else {
        await createBooking(payload);
      }

      setSubmitted(true);
      setTimeout(() => { onSuccess?.(); }, 2000);
      
    } catch (err) {
      if (err.response?.status === 409) {
        const msg = err.response.data?.message || err.response.data?.error || err.response.data;
        const conflictText = typeof msg === 'string' ? msg : 'Resource already booked during this time.';
        
        setConflictMessage(conflictText);

        const timeRegex = /(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/g;
        const matches = [...conflictText.matchAll(timeRegex)];

        if (matches.length >= 2) {
          setSuggestedSlot({
            date: matches[0][1],      
            startTime: matches[0][2], 
            endTime: matches[1][2]    
          });
        }
        
        goTo(2); 
      } else { 
        setError(getApiErrorMessage(err)); 
      }
    } finally { 
      setLoading(false); 
    }
  };

  const duration = fmtDuration(formData.startTime, formData.endTime);
  const today = new Date().toISOString().split('T')[0];

  if (submitted) return (
    <div className="cbm-overlay">
      <CBMStyles />
      <div className="cbm-card" style={{ textAlign: 'center', padding: '3rem 2rem', display: 'block' }}>
        <div className="cbm-success-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 className="cbm-success-title">{modifyData ? 'Modification Requested' : 'Booking Requested'}</h2>
        <p className="cbm-success-sub">Your facility request has been submitted and is pending approval.</p>
        <div className="cbm-success-badge">
          Resource #{formData.resourceId} • {formData.bookingDate} • {formData.startTime} – {formData.endTime}
        </div>
      </div>
    </div>
  );

  return (
    <div className="cbm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <CBMStyles />
      <div className="cbm-card">

        <div className="cbm-header">
          <p className="cbm-eyebrow">Facility Booking</p>
          <h3 className="cbm-title">{modifyData ? 'Modify Reservation' : 'Request a Space'}</h3>
          <button className="cbm-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="cbm-stepper">
          {STEPS.map((s, i) => (
            <div key={s.id} className="cbm-step-item">
              <button
                className={`cbm-step-dot ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}
                onClick={() => step > s.id && goTo(s.id)}
                disabled={step <= s.id}
              >
                {step > s.id ? '✓' : s.id}
              </button>
              <span className={`cbm-step-lbl ${step === s.id ? 'active' : ''}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`cbm-step-line ${step > s.id ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Standard Conflict Warning Banner */}
        {conflictMessage && (
          <div className="cbm-conflict">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <strong>Time Conflict</strong>
              <p>{conflictMessage}</p>
            </div>
          </div>
        )}

        <div className={`cbm-step-wrap ${animating ? (direction > 0 ? 'out-left' : 'out-right') : 'in'}`}>
          {step === 1 && (
            <div className="cbm-step-body">
              <label className="cbm-lbl">Selected Resource</label>
              {selectedResource ? (
                <>
                  <input type="text" value={`${selectedResource.name} (ID: ${selectedResource.id})`} className="cbm-input locked" readOnly />
                  <p className="cbm-hint">You are requesting this specific facility.</p>
                </>
              ) : (
                <>
                  <input type="number" name="resourceId" value={formData.resourceId} onChange={handleChange} placeholder="e.g. 101" className="cbm-input" />
                  <p className="cbm-hint">Enter the unique ID of the facility you wish to book.</p>
                </>
              )}

              <label className="cbm-lbl" style={{ marginTop: '1.25rem' }}>
                Total Attendees {selectedResource ? `(Max: ${selectedResource.capacity})` : ''}
              </label>
              <div className="cbm-attendee-row">
                <button className="cbm-att-btn" onClick={() => setFormData(p => ({ ...p, attendees: Math.max(1, +p.attendees - 1) }))}>−</button>
                <span className="cbm-att-num">{formData.attendees}</span>
                <button className="cbm-att-btn" onClick={() => setFormData(p => ({ ...p, attendees: Math.min(selectedResource?.capacity || 999, +p.attendees + 1) }))}>+</button>
                <span className="cbm-att-lbl">{formData.attendees === 1 ? 'person' : 'people'}</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="cbm-step-body">
              <label className="cbm-lbl">Reservation Date</label>
              <input type="date" name="bookingDate" value={formData.bookingDate} onChange={handleChange} min={today} className="cbm-input" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                <div>
                  <label className="cbm-lbl">Start Time</label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="cbm-input" />
                </div>
                <div>
                  <label className="cbm-lbl">End Time</label>
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="cbm-input" />
                </div>
              </div>

              {formData.startTime && formData.endTime && !scheduleValid && (
                <div className="cbm-warn">This time falls outside the resource's active schedule.</div>
              )}
              
              {duration && (
                <div className="cbm-duration-pill">Duration: {duration}</div>
              )}
              
              {formData.startTime && formData.endTime && toMins(formData.endTime) <= toMins(formData.startTime) && (
                <p className="cbm-err-inline">End time must be after start time.</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="cbm-step-body">
              <label className="cbm-lbl">Purpose of Booking</label>
              <textarea name="purpose" value={formData.purpose} onChange={handleChange} rows={3} placeholder="Provide a brief description..." className="cbm-input cbm-textarea" />
              <p className="cbm-hint">{formData.purpose.length} / 280 characters</p>

              {formData.resourceId && formData.bookingDate && (
                <div className="cbm-summary">
                  <p className="cbm-summary-title">Booking Summary</p>
                  <div className="cbm-summary-grid">
                    <SumItem label="Resource"  value={`#${formData.resourceId}`} />
                    <SumItem label="Date"      value={formData.bookingDate} />
                    <SumItem label="Time"      value={`${formData.startTime} – ${formData.endTime}`} />
                    <SumItem label="Attendees" value={formData.attendees} />
                  </div>
                </div>
              )}

              {error && <div className="cbm-err-inline" style={{ marginTop: '1rem' }}>{error}</div>}
            </div>
          )}
        </div>

        <div className="cbm-footer">
          {step > 1
            ? <button className="cbm-btn-ghost" onClick={() => goTo(step - 1)}>Back</button>
            : <button className="cbm-btn-ghost" onClick={onClose}>Cancel</button>
          }
          {step < 3
            ? <button className="cbm-btn-primary" onClick={() => goTo(step + 1)} disabled={!stepValid()}>Continue</button>
            : <button className="cbm-btn-primary" onClick={handleSubmit} disabled={loading || !stepValid()}>
                {loading ? <span className="cbm-dots"><span/><span/><span/></span> : (modifyData ? 'Submit Modification' : 'Submit Request')}
              </button>
          }
        </div>

        {/* Nested Pop-up Box for the Suggestion */}
        {suggestedSlot && (
          <div className="cbm-popup-overlay">
            <div className="cbm-popup">
              <div className="cbm-popup-icon">💡</div>
              <h4 className="cbm-popup-title">Time Slot Taken</h4>
              <p className="cbm-popup-text">That exact time is already booked. Would you like to instantly switch to the next available slot?</p>
              
              <div className="cbm-popup-time">
                {suggestedSlot.date} <br />
                {suggestedSlot.startTime} – {suggestedSlot.endTime}
              </div>
              
              <div className="cbm-popup-actions">
                <button className="cbm-btn-ghost" onClick={() => setSuggestedSlot(null)}>Dismiss</button>
                <button className="cbm-btn-primary" style={{ width: '100%' }} onClick={acceptSuggestedSlot}>Accept Time</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function SumItem({ label, value }) {
  return (
    <div>
      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>{label}</span>
      <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{value}</span>
    </div>
  );
}

function CBMStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      .cbm-overlay {
        position: fixed; inset: 0; z-index: 1000;
        display: flex; align-items: center; justify-content: center; padding: 1rem;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(3px);
        animation: cbm-fade 0.2s ease;
      }
      @keyframes cbm-fade { from { opacity: 0 } to { opacity: 1 } }

      .cbm-card {
        width: 100%; max-width: 460px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.18);
        overflow: hidden;
        font-family: 'Poppins', sans-serif;
        animation: cbm-up 0.22s cubic-bezier(.22,1,.36,1);
        position: relative; /* Required to trap the absolute suggestion popup */
      }
      @keyframes cbm-up {
        from { transform: scale(0.96) translateY(8px); opacity: 0 }
        to   { transform: none; opacity: 1 }
      }

      .cbm-header {
        flex-shrink: 0;
        position: relative;
        padding: 1.75rem;
        background: #4f46e5; /* Theme Indigo */
      }
      .cbm-eyebrow { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #c7d2fe; margin: 0 0 0.35rem; }
      .cbm-title { font-size: 1.35rem; font-weight: 700; color: #ffffff; margin: 0; }
      .cbm-close {
        position: absolute; top: 1.5rem; right: 1.5rem;
        width: 32px; height: 32px; border-radius: 8px;
        background: rgba(255,255,255,0.15); border: none;
        color: #ffffff; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s;
      }
      .cbm-close:hover { background: rgba(255,255,255,0.3); }

      .cbm-stepper { flex-shrink: 0; display: flex; align-items: center; padding: 1.25rem 1.75rem; background: #fdfcff; border-bottom: 1.5px solid #f8fafc; }
      .cbm-step-item { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; }
      .cbm-step-dot {
        width: 30px; height: 30px; border-radius: 50%;
        border: 2px solid #e2e8f0; background: #ffffff;
        font-size: 0.875rem; font-weight: 600; color: #9ca3af;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease; position: relative; z-index: 1;
        font-family: 'Poppins', sans-serif;
      }
      .cbm-step-dot.active { border-color: #4f46e5; background: #4f46e5; color: #ffffff; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25); }
      .cbm-step-dot.done { border-color: #4f46e5; background: #eef2ff; color: #4f46e5; cursor: pointer; }
      .cbm-step-lbl { font-size: 0.75rem; font-weight: 500; color: #9ca3af; margin-top: 0.5rem; }
      .cbm-step-lbl.active { color: #0f172a; font-weight: 600; }
      .cbm-step-line { position: absolute; top: 14px; left: calc(50% + 15px); width: calc(100% - 30px); height: 2px; background: #e2e8f0; transition: background 0.3s; }
      .cbm-step-line.done { background: #4f46e5; }

      .cbm-conflict { flex-shrink: 0; display: flex; gap: 0.75rem; background: #fffbeb; border: 1.5px solid #fde68a; padding: 1rem 1.25rem; margin: 1.5rem 1.75rem 0; border-radius: 10px; }
      .cbm-conflict strong { font-size: 0.875rem; font-weight: 600; color: #92400e; display: block; margin-bottom: 0.25rem; }
      .cbm-conflict p { font-size: 0.8125rem; color: #b45309; margin: 0; line-height: 1.4; }

      /* Suggestion Box Pop-up Overlay */
      .cbm-popup-overlay {
        position: absolute; inset: 0; z-index: 50;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: 1.5rem;
      }
      .cbm-popup {
        background: #ffffff; border: 1.5px solid #e2e8f0;
        border-radius: 16px; padding: 1.75rem; width: 100%; max-width: 340px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
        text-align: center;
        animation: cbm-pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
      @keyframes cbm-pop {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .cbm-popup-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
      .cbm-popup-title { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0 0 0.5rem; }
      .cbm-popup-text { font-size: 0.8125rem; color: #64748b; margin: 0 0 1.25rem; line-height: 1.5; }
      .cbm-popup-time { background: #eef2ff; color: #4f46e5; font-weight: 700; font-size: 0.875rem; padding: 0.85rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #c7d2fe; }
      .cbm-popup-actions { display: flex; gap: 0.75rem; }
      .cbm-popup-actions button { flex: 1; min-width: 0; }

      .cbm-step-wrap { padding: 1.75rem; flex-grow: 1; overflow-y: auto; overflow-x: hidden; }
      .cbm-step-body { display: flex; flex-direction: column; }
      .in       { animation: cbm-in  0.2s ease-out }
      .out-left { animation: cbm-outL 0.2s ease-in forwards }
      .out-right{ animation: cbm-outR 0.2s ease-in forwards }
      @keyframes cbm-in   { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:none} }
      @keyframes cbm-outL { to{opacity:0;transform:translateX(-10px)} }
      @keyframes cbm-outR { to{opacity:0;transform:translateX(10px)} }

      .cbm-lbl { display: block; font-size: 0.8125rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; }
      .cbm-input {
        width: 100%; box-sizing: border-box;
        border: 1.5px solid #e5e7eb; border-radius: 8px;
        padding: 0.7rem 1rem; font-size: 0.875rem; font-family: 'Poppins', sans-serif;
        color: #1e293b; background: #ffffff;
        transition: all 0.2s; outline: none;
      }
      .cbm-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); }
      .cbm-input.locked { background: #f8fafc; color: #64748b; cursor: not-allowed; border-color: #e2e8f0; font-weight: 500; }
      .cbm-textarea { resize: vertical; min-height: 80px; }
      .cbm-hint { font-size: 0.75rem; color: #9ca3af; margin: 0.4rem 0 0; }

      .cbm-attendee-row { display: flex; align-items: center; gap: 1rem; }
      .cbm-att-btn {
        width: 36px; height: 36px; border-radius: 8px;
        border: 1.5px solid #e5e7eb; background: #ffffff;
        font-size: 1.25rem; color: #4b5563; cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: all 0.2s;
      }
      .cbm-att-btn:hover { border-color: #a5b4fc; background: #eef2ff; color: #4f46e5; }
      .cbm-att-num { font-size: 1.125rem; font-weight: 600; color: #1e1b4b; min-width: 32px; text-align: center; }
      .cbm-att-lbl { font-size: 0.875rem; color: #64748b; font-weight: 500; }

      .cbm-duration-pill { display: inline-flex; align-items: center; background: #eef2ff; color: #4f46e5; padding: 0.4rem 0.85rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600; margin-top: 1rem; border: 1px solid #c7d2fe; }
      .cbm-summary { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; margin-top: 1.5rem; }
      .cbm-summary-title { font-size: 0.875rem; font-weight: 600; color: #0f172a; margin: 0 0 1rem; }
      .cbm-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem 1rem; }

      .cbm-err-inline { font-size: 0.8125rem; font-weight: 500; color: #dc2626; margin-top: 0.75rem; }
      .cbm-warn { font-size: 0.8125rem; font-weight: 500; color: #b45309; margin-top: 0.75rem; padding: 0.75rem; background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; }

      .cbm-footer { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.75rem; background: #fdfcff; border-top: 1.5px solid #f8fafc; }
      .cbm-btn-ghost { background: #ffffff; border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 0.65rem 1.25rem; font-size: 0.875rem; font-weight: 600; color: #4b5563; cursor: pointer; transition: all 0.2s; font-family: 'Poppins', sans-serif; }
      .cbm-btn-ghost:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
      
      .cbm-btn-primary { background: #4f46e5; color: #ffffff; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; padding: 0.65rem 1.75rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; min-width: 120px; font-family: 'Poppins', sans-serif; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.15); }
      .cbm-btn-primary:hover:not(:disabled) { background: #4338ca; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25); transform: translateY(-1px); }
      .cbm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }

      .cbm-dots { display: flex; gap: 5px; align-items: center; }
      .cbm-dots span { width: 6px; height: 6px; border-radius: 50%; background: #ffffff; animation: cbm-bounce 0.8s infinite ease-in-out; }
      .cbm-dots span:nth-child(2) { animation-delay: 0.15s; }
      .cbm-dots span:nth-child(3) { animation-delay: 0.3s; }
      @keyframes cbm-bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.6} 40%{transform:scale(1);opacity:1} }

      .cbm-success-icon { width: 64px; height: 64px; border-radius: 50%; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
      .cbm-success-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 0.5rem; }
      .cbm-success-sub { font-size: 0.875rem; color: #64748b; margin: 0 0 1.5rem; }
      .cbm-success-badge { display: inline-block; padding: 0.6rem 1.2rem; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; font-weight: 600; color: #334155; }
    `}</style>
  );
}