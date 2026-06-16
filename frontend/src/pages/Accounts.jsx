import { useState } from 'react'
import { api } from '../lib/api.js'
import { useToastCtx, Pill, Amount, Modal, Field, Spinner } from '../components/UI.jsx'

export default function Accounts({ accounts, loading, refresh }) {
  const toast = useToastCtx()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ name: '', type: 'asset' })
  const [err, setErr]     = useState('')
  const [submitting, setSub] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setErr('')
    if (!form.name.trim()) { setErr('Account name is required.'); return }
    setSub(true)
    try {
      await api.createAccount(form)
      toast('Account created.', 'success')
      setModal(false)
      setForm({ name: '', type: 'asset' })
      refresh()
    } catch (e) { setErr(e.message) }
    finally { setSub(false) }
  }

  const del = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await api.deleteAccount(id)
      toast('Account deleted.', 'info')
      refresh()
    } catch (e) { toast(e.message, 'error') }
  }

  // Group by type
  const grouped = (accounts || []).reduce((g, a) => {
    g[a.type] = g[a.type] || []
    g[a.type].push(a)
    return g
  }, {})

  const typeOrder = ['asset', 'income', 'expense', 'liability', 'equity']

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--steel)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Chart of Accounts</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, letterSpacing:'-.02em' }}>
            Accounts
          </h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ New Account</button>
      </div>

      {loading ? <Spinner /> : typeOrder.map(type => {
        const group = grouped[type]
        if (!group?.length) return null
        return (
          <div key={type} style={{ marginBottom: 24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <Pill type={type} />
              <span style={{ fontSize:10, color:'var(--fog)', fontFamily:'var(--font-mono)' }}>{group.length} accounts</span>
            </div>
            <div className="acc-grid">
              {group.map(a => (
                <div key={a.id} className="acc-card">
                  <div className="acc-card-name">{a.name}</div>
                  <div className={`acc-card-bal ${Number(a.balance) >= 0 ? 'pos' : 'neg'}`}>
                    ${Math.abs(Number(a.balance)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="acc-card-foot">
                    <span className="acc-card-id">{a.id}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize:10, padding:'3px 8px', color:'var(--fog)' }}
                      onClick={() => del(a.id, a.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {modal && (
        <Modal
          title="New Account"
          onClose={() => setModal(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Account'}
            </button>
          </>}
        >
          <Field label="Account Name">
            <input className="inp" placeholder="Marketing Budget" value={form.name} onChange={set('name')} autoFocus />
          </Field>
          <Field label="Type">
            <select className="inp" value={form.type} onChange={set('type')}>
              <option value="asset">Asset — things you own</option>
              <option value="liability">Liability — things you owe</option>
              <option value="equity">Equity — owner's stake</option>
              <option value="income">Income — money coming in</option>
              <option value="expense">Expense — money going out</option>
            </select>
          </Field>
          {err && <div className="err-msg">{err}</div>}
        </Modal>
      )}
    </div>
  )
}
