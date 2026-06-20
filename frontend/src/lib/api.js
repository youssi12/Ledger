const BASE = 'https://ledger-clir.onrender.com/api'

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  summary:      ()      => req('/summary'),
  accounts:     ()      => req('/accounts'),
  createAccount:(body)  => req('/accounts', { method:'POST', body }),
  deleteAccount:(id)    => req(`/accounts/${id}`, { method:'DELETE' }),
  transactions: (params)=> req('/transactions?' + new URLSearchParams(params).toString()),
  createTx:     (body)  => req('/transactions', { method:'POST', body }),
  audit:        (params)=> req('/audit?' + new URLSearchParams(params).toString()),
  exportUrl:    ()      => `${BASE}/transactions/export.csv`,
}