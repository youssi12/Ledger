const express = require('express')
const { v4: uuid } = require('uuid')
const db = require('../db')

const r = express.Router()

// ── Helpers ──────────────────────────────────────────────────────────
const balance = (accId, type) => {
  const dr = db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE debit_account=?').get(accId).v
  const cr = db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE credit_account=?').get(accId).v
  return ['asset','expense'].includes(type) ? dr - cr : cr - dr
}

// ── Accounts ─────────────────────────────────────────────────────────
r.get('/accounts', (_req, res) => {
  const accs = db.prepare('SELECT * FROM accounts ORDER BY type,name').all()
  res.json({ accounts: accs.map(a => ({ ...a, balance_cents: balance(a.id, a.type), balance: (balance(a.id, a.type)/100).toFixed(2) })) })
})

r.get('/accounts/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM accounts WHERE id=?').get(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  res.json({ account: { ...a, balance: (balance(a.id, a.type)/100).toFixed(2) } })
})

r.post('/accounts', (req, res) => {
  const { name, type, currency='USD' } = req.body
  if (!name || !type) return res.status(400).json({ error: 'name and type required' })
  if (!['asset','liability','equity','income','expense'].includes(type))
    return res.status(400).json({ error: 'invalid type' })
  const id = `acc-${uuid().slice(0,8)}`
  try {
    db.prepare('INSERT INTO accounts (id,name,type,currency) VALUES (?,?,?,?)').run(id, name, type, currency)
    db.prepare('INSERT INTO audit_log (event,payload) VALUES (?,?)').run('account.created', JSON.stringify({ id, name, type }))
    res.status(201).json({ account: db.prepare('SELECT * FROM accounts WHERE id=?').get(id) })
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Name already exists' })
    throw e
  }
})

r.delete('/accounts/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM accounts WHERE id=?').get(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  const used = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE debit_account=? OR credit_account=?').get(req.params.id, req.params.id)
  if (used.c > 0) return res.status(409).json({ error: 'Account has transactions' })
  db.prepare('DELETE FROM accounts WHERE id=?').run(req.params.id)
  db.prepare('INSERT INTO audit_log (event,payload) VALUES (?,?)').run('account.deleted', JSON.stringify({ id: req.params.id }))
  res.json({ deleted: true })
})

// ── Transactions ──────────────────────────────────────────────────────
r.get('/transactions/export.csv', (_req, res) => {
  const rows = db.prepare(`
    SELECT t.created_at, t.description, da.name as dr, ca.name as cr,
           printf('%.2f', t.amount/100.0) as amount, t.currency, t.id
    FROM transactions t
    JOIN accounts da ON t.debit_account=da.id
    JOIN accounts ca ON t.credit_account=ca.id
    ORDER BY t.created_at DESC
  `).all()
  res.setHeader('Content-Type','text/csv')
  res.setHeader('Content-Disposition','attachment; filename="ledger.csv"')
  res.send('Date,Description,Debit,Credit,Amount,Currency,ID\n' +
    rows.map(r => `"${r.created_at}","${r.description}","${r.dr}","${r.cr}",${r.amount},${r.currency},"${r.id}"`).join('\n'))
})

r.get('/transactions', (req, res) => {
  const { limit=20, offset=0, account, q } = req.query 
  let sql = `SELECT t.*,da.name as debit_name,ca.name as credit_name FROM transactions t JOIN accounts da ON t.debit_account=da.id JOIN accounts ca ON t.credit_account=ca.id WHERE 1=1`
  const params = []
  if (account) { sql += ' AND (t.debit_account=? OR t.credit_account=?)'; params.push(account,account) }
  if (q)       { sql += ' AND t.description LIKE ?'; params.push(`%${q}%`) }
  const total = db.prepare(`SELECT COUNT(*) as c FROM transactions t WHERE 1=1${account?' AND (t.debit_account=? OR t.credit_account=?)':''}${q?' AND t.description LIKE ?':''}`).get(...params).c
  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?'
  params.push(Number(limit), Number(offset))
  const rows = db.prepare(sql).all(...params)
  res.json({ transactions: rows.map(t => ({ ...t, amount:(t.amount/100).toFixed(2) })), total, limit:Number(limit), offset:Number(offset) })
})

r.get('/transactions/:id', (req, res) => {
  const t = db.prepare(`SELECT t.*,da.name as debit_name,ca.name as credit_name FROM transactions t JOIN accounts da ON t.debit_account=da.id JOIN accounts ca ON t.credit_account=ca.id WHERE t.id=?`).get(req.params.id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json({ transaction: { ...t, amount:(t.amount/100).toFixed(2) } })
})

r.post('/transactions', (req, res) => {
  const { description, amount, currency='USD', debit_account, credit_account, idempotency_key, metadata={} } = req.body
  if (!description||!amount||!debit_account||!credit_account) return res.status(400).json({ error: 'Missing required fields' })
  if (debit_account===credit_account) return res.status(400).json({ error: 'Accounts must differ' })
  const cents = Math.round(Number(amount)*100)
  if (!Number.isFinite(cents)||cents<=0) return res.status(400).json({ error: 'Invalid amount' })
  const ikey = idempotency_key||null
  if (ikey) {
    const ex = db.prepare('SELECT * FROM transactions WHERE idempotency_key=?').get(ikey)
    if (ex) return res.json({ transaction:{ ...ex, amount:(ex.amount/100).toFixed(2) }, idempotent:true })
  }
  if (!db.prepare('SELECT id FROM accounts WHERE id=?').get(debit_account)) return res.status(400).json({ error: `Debit account not found` })
  if (!db.prepare('SELECT id FROM accounts WHERE id=?').get(credit_account)) return res.status(400).json({ error: `Credit account not found` })
  const id = uuid()
  db.prepare('INSERT INTO transactions (id,idempotency_key,description,amount,currency,debit_account,credit_account,metadata) VALUES (?,?,?,?,?,?,?,?)').run(id,ikey,description,cents,currency,debit_account,credit_account,JSON.stringify(metadata))
  db.prepare('INSERT INTO audit_log (event,payload) VALUES (?,?)').run('transaction.created', JSON.stringify({ id, description, amount:cents }))
  const t = db.prepare(`SELECT t.*,da.name as debit_name,ca.name as credit_name FROM transactions t JOIN accounts da ON t.debit_account=da.id JOIN accounts ca ON t.credit_account=ca.id WHERE t.id=?`).get(id)
  res.status(201).json({ transaction: { ...t, amount:(t.amount/100).toFixed(2) } })
})

// ── Audit ─────────────────────────────────────────────────────────────
r.get('/audit', (req, res) => {
  const { limit=50, offset=0 } = req.query
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?').all(Number(limit),Number(offset))
  const total = db.prepare('SELECT COUNT(*) as c FROM audit_log').get().c
  res.json({ audit: rows.map(r => ({ ...r, payload:JSON.parse(r.payload) })), total })
})

// ── Summary ───────────────────────────────────────────────────────────
r.get('/summary', (_req, res) => {
  const revenue  = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE credit_account IN (SELECT id FROM accounts WHERE type IN ('income'))`).get().v
  const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE debit_account IN (SELECT id FROM accounts WHERE type IN ('expense'))`).get().v
  const txCount  = db.prepare('SELECT COUNT(*) as c FROM transactions').get().c
  const accCount = db.prepare('SELECT COUNT(*) as c FROM accounts').get().c

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as revenue
    FROM transactions WHERE credit_account IN (SELECT id FROM accounts WHERE type='income' OR type='income')
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all().reverse()

  const byType = db.prepare(`
    SELECT a.type, COALESCE(SUM(CASE WHEN t.credit_account=a.id THEN t.amount ELSE -t.amount END),0) as flow
    FROM accounts a LEFT JOIN transactions t ON (t.debit_account=a.id OR t.credit_account=a.id)
    GROUP BY a.type
  `).all()

  res.json({
    revenue: (revenue/100).toFixed(2),
    expenses: (expenses/100).toFixed(2),
    net: ((revenue-expenses)/100).toFixed(2),
    revenue_cents: revenue,
    expenses_cents: expenses,
    net_cents: revenue-expenses,
    transaction_count: txCount,
    account_count: accCount,
    monthly,
    by_type: byType
  })
})

module.exports = r
