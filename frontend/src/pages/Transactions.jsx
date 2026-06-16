import { useState, useCallback, useEffect } from 'react'
import { api } from '../lib/api.js'
import { useToastCtx } from '../components/UI.jsx'
import { Amount, FmtDate, Modal, Field, Spinner } from '../components/UI.jsx'

const LIMIT = 20

export default function Transactions({ accounts }) {
  const toast = useToastCtx()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [query, setQuery]   = useState('')
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState({ description:'', amount:'', debit_account:'', credit_account:'', idempotency_key:'' })
  const [err, setErr]       = useState('')
  const [submitting, setSub] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.transactions({ limit: LIMIT, offset, q: query || undefined })
      setData(res)
    } catch(e) { /* ignore */ }
    finally { setLoading(false) }
  }, [offset, query])

  useEffect(() => { load() }, [load])

  // auto-refresh
  useEffect(() => {
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [load])

  const pages = Math.ceil((data?.total || 0) / LIMIT)
  const curPage = Math.floor(offset / LIMIT)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setErr('')
    const { description, amount, debit_account, credit_account, idempotency_key } = form
    if (!description || !amount || !debit_account || !credit_account) { setErr('All fields except idempotency key are required.'); return }
    if (debit_account === credit_account) { setErr('Debit and credit accounts must differ.'); return }
    setSub(true)
    try {
      await api.createTx({ description, amount, debit_account, credit_account, idempotency_key: idempotency_key || undefined })
      toast('Entry posted successfully.', 'success')
      setModal(false)
      setForm({ description:'', amount:'', debit_account:'', credit_account:'', idempotency_key:'' })
      load()
    } catch(e) { setErr(e.message) }
    finally { setSub(false) }
  }

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--steel)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Ledger</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, letterSpacing:'-.02em' }}>
            Journal Entries
          </h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <a href={api.exportUrl()} className="btn btn-ghost btn-sm" download>↓ Export CSV</a>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ New Entry</button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="search-wrap" style={{ width: 260 }}>
            <span className="search-icon">⌕</span>
            <input className="inp" placeholder="Search entries…" value={query}
              onChange={e => { setQuery(e.target.value); setOffset(0) }} />
          </div>
          <span style={{ fontSize:10, color:'var(--fog)', fontFamily:'var(--font-mono)' }}>
            {data?.total ?? '—'} entries
          </span>
        </div>

        {loading ? <Spinner /> : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th className="tr">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.transactions || []).length === 0 && (
                <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--fog)', padding:32 }}>No entries found.</td></tr>
              )}
              {(data?.transactions || []).map(t => (
                <tr key={t.id}>
                  <td><FmtDate value={t.created_at} /></td>
                  <td style={{ maxWidth:280 }}>{t.description}</td>
                  <td className="dim" style={{ fontSize:11 }}>{t.debit_name}</td>
                  <td className="dim" style={{ fontSize:11 }}>{t.credit_name}</td>
                  <td className="tr"><Amount value={t.amount} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div className="pagination">
            <span className="pg-info">Page {curPage + 1} of {pages}</span>
            <button className="pg-btn" disabled={curPage === 0} onClick={() => setOffset(o => o - LIMIT)}>‹</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => (
              <button key={i} className={`pg-btn ${i === curPage ? 'active' : ''}`}
                onClick={() => setOffset(i * LIMIT)}>{i + 1}</button>
            ))}
            <button className="pg-btn" disabled={curPage >= pages - 1} onClick={() => setOffset(o => o + LIMIT)}>›</button>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          title="New Journal Entry"
          onClose={() => setModal(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Posting…' : 'Post Entry'}
            </button>
          </>}
        >
          <Field label="Description">
            <input className="inp" placeholder="Client invoice — Project X" value={form.description} onChange={set('description')} />
          </Field>
          <Field label="Amount (USD)">
            <input className="inp" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={set('amount')} />
          </Field>
          <div className="field-row">
            <Field label="Debit Account">
              <select className="inp" value={form.debit_account} onChange={set('debit_account')}>
                <option value="">Select…</option>
                {(accounts || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Credit Account">
              <select className="inp" value={form.credit_account} onChange={set('credit_account')}>
                <option value="">Select…</option>
                {(accounts || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Idempotency Key" hint="Optional — prevents duplicate entries if you retry.">
            <input className="inp" placeholder="inv-2026-001" value={form.idempotency_key} onChange={set('idempotency_key')} />
          </Field>
          {err && <div className="err-msg">{err}</div>}
        </Modal>
      )}
    </div>
  )
}
