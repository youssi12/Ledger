import { useCountUp, useToast } from '../hooks/index.js'
import { createContext, useContext } from 'react'

// ── Toast context ────────────────────────────────────────
export const ToastCtx = createContext(null)
export const useToastCtx = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const { toasts, push } = useToast()
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ── KPI card with count-up ───────────────────────────────
export function KpiCard({ label, value, prefix = '', suffix = '', colorClass = '', delta }) {
  const num = useCountUp(Number(value) || 0)
  const display = Number.isInteger(Number(value))
    ? Math.round(num).toLocaleString()
    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-num ${colorClass}`}>{prefix}{display}{suffix}</div>
      {delta && <div className="kpi-delta">{delta}</div>}
    </div>
  )
}

// ── Type pill ────────────────────────────────────────────
export function Pill({ type }) {
  return <span className={`pill pill-${type}`}>{type}</span>
}

// ── Amount display ───────────────────────────────────────
export function Amount({ value, className = '' }) {
  const n = Number(value)
  const cls = n >= 0 ? 'pos' : 'neg'
  return <span className={`mono ${cls} ${className}`}>${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
}

// ── Date display ─────────────────────────────────────────
export function FmtDate({ value, time = false }) {
  const d = new Date(value)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const t = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return <span className="dim mono" style={{ fontSize: 11 }}>{date}{time && <> · {t}</>}</span>
}

// ── Modal wrapper ────────────────────────────────────────
export function Modal({ title, onClose, footer, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// ── Field ────────────────────────────────────────────────
export function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

// ── Spinner ──────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
      <div style={{
        width: 28, height: 28,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--cyan)',
        borderRadius: '50%',
        animation: 'spin .7s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
