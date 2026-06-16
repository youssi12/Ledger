import { useState, useCallback, useEffect } from 'react'
import { api } from '../lib/api.js'
import { FmtDate, Spinner } from '../components/UI.jsx'

export default function Audit() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 30

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.audit({ limit: LIMIT, offset })
      setData(res)
    } catch(e) { /* ignore */ }
    finally { setLoading(false) }
  }, [offset])

  useEffect(() => { load() }, [load])
  useEffect(() => { const id = setInterval(load, 10000); return () => clearInterval(id) }, [load])

  const pages   = Math.ceil((data?.total || 0) / LIMIT)
  const curPage = Math.floor(offset / LIMIT)

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize:10, color:'var(--steel)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Immutable</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, letterSpacing:'-.02em' }}>
          Audit Trail
        </h1>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">All Events</span>
          <span style={{ fontSize:10, color:'var(--fog)', fontFamily:'var(--font-mono)' }}>
            {data?.total ?? '—'} events · auto-refresh 10s
          </span>
        </div>

        {loading ? <Spinner /> : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {(data?.audit || []).length === 0 && (
                <tr><td colSpan={3} style={{ textAlign:'center', color:'var(--fog)', padding:32 }}>No events yet.</td></tr>
              )}
              {(data?.audit || []).map(e => (
                <tr key={e.id}>
                  <td><FmtDate value={e.created_at} time /></td>
                  <td>
                    <span className={`ev-badge ${e.event.startsWith('transaction') ? 'ev-tx' : 'ev-acc'}`}>
                      {e.event}
                    </span>
                  </td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--steel)', maxWidth:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {JSON.stringify(e.payload)}
                  </td>
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
    </div>
  )
}
