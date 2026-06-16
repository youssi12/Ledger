import { useState } from 'react'
import { ToastProvider } from './components/UI.jsx'
import { useAccounts } from './hooks/index.js'
import Dashboard    from './pages/Dashboard.jsx'
import Transactions from './pages/Transactions.jsx'
import Accounts     from './pages/Accounts.jsx'
import Audit        from './pages/Audit.jsx'

const NAV = [
  { id:'dashboard',    icon:'◈', label:'Dashboard' },
  { id:'transactions', icon:'⇄', label:'Transactions' },
  { id:'accounts',     icon:'▦', label:'Accounts' },
  { id:'audit',        icon:'⧖', label:'Audit Log' },
]

const PAGE_META = {
  dashboard:    { title:'Dashboard',    sub:'Overview' },
  transactions: { title:'Transactions', sub:'Journal entries' },
  accounts:     { title:'Accounts',     sub:'Chart of accounts' },
  audit:        { title:'Audit Log',    sub:'Immutable trail' },
}

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const { data: accData, loading: accLoading, refresh: accRefresh, lastUpdate } = useAccounts(10000)
  const accounts = accData?.accounts || []

  const meta = PAGE_META[tab]

  // Format last-updated time
  const updated = lastUpdate
    ? lastUpdate.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    : '—'

  return (
    <ToastProvider>
      <div className="shell">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">L</div>
            <div>
              <div className="logo-text">Ledger</div>
              <div className="logo-version">v2.0 · Double-entry</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-label">Navigation</div>
              {NAV.map(n => (
                <button
                  key={n.id}
                  className={`nav-item ${tab === n.id ? 'active' : ''}`}
                  onClick={() => setTab(n.id)}
                >
                  <span className="nav-icon">{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              ))}
            </div>

            <div className="nav-section">
              <div className="nav-label">Quick actions</div>
              <button className="nav-item" onClick={() => setTab('transactions')}>
                <span className="nav-icon">＋</span>
                <span>New entry</span>
              </button>
              <a href="/api/transactions/export.csv" className="nav-item" style={{ textDecoration:'none' }} download>
                <span className="nav-icon">↓</span>
                <span>Export CSV</span>
              </a>
            </div>
          </nav>

          {/* Live account balances */}
          <div className="sidebar-accounts">
            <div className="nav-label" style={{ padding:'0 8px', marginBottom:8 }}>Live Balances</div>
            {accounts.slice(0, 6).map(a => (
              <div key={a.id} className="sidebar-acc-item">
                <span className="sidebar-acc-name" title={a.name}>{a.name}</span>
                <span className={`sidebar-acc-val ${Number(a.balance) < 0 ? 'sidebar-acc-neg' : ''}`}>
                  ${Math.abs(Number(a.balance)).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 })}
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main canvas ── */}
        <div className="canvas">
          {/* Topbar */}
          <header className="topbar">
            <div className="topbar-left">
              <span className="topbar-title">{meta.title}</span>
              <span className="topbar-sub">/ {meta.sub}</span>
            </div>
            <div className="topbar-right">
              <div className="live-badge">
                <div className="live-dot" />
                LIVE · {updated}
              </div>
            </div>
          </header>

          {/* Page */}
          {tab === 'dashboard'    && <Dashboard />}
          {tab === 'transactions' && <Transactions accounts={accounts} />}
          {tab === 'accounts'     && <Accounts accounts={accounts} loading={accLoading} refresh={accRefresh} />}
          {tab === 'audit'        && <Audit />}
        </div>
      </div>
    </ToastProvider>
  )
}
