const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(__dirname, '../../data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(path.join(DATA_DIR, 'ledger.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('asset','liability','equity','income','expense')),
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT UNIQUE,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    debit_account TEXT NOT NULL REFERENCES accounts(id),
    credit_account TEXT NOT NULL REFERENCES accounts(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tx_debit  ON transactions(debit_account);
  CREATE INDEX IF NOT EXISTS idx_tx_credit ON transactions(credit_account);
  CREATE INDEX IF NOT EXISTS idx_tx_date   ON transactions(created_at);
`)

const seeded = db.prepare('SELECT COUNT(*) as c FROM accounts').get()
if (seeded.c === 0) {
  const { v4: uuid } = require('uuid')
  const ins = db.prepare('INSERT INTO accounts (id,name,type,currency) VALUES (?,?,?,?)')
  const insTx = db.prepare(`INSERT INTO transactions (id,idempotency_key,description,amount,currency,debit_account,credit_account,created_at) VALUES (?,?,?,?,?,?,?,?)`)
  const insLog = db.prepare('INSERT INTO audit_log (event,payload) VALUES (?,?)')

  const accounts = [
    { id:'acc-bank',      name:'Main Bank Account',   type:'asset' },
    { id:'acc-cash',      name:'Petty Cash',           type:'asset' },
    { id:'acc-ar',        name:'Accounts Receivable',  type:'asset' },
    { id:'acc-revenue',   name:'Revenue',              type:'income' },
    { id:'acc-saas',      name:'SaaS Subscriptions',   type:'income' },
    { id:'acc-expenses',  name:'Operating Expenses',   type:'expense' },
    { id:'acc-payroll',   name:'Payroll',              type:'expense' },
    { id:'acc-hosting',   name:'Cloud & Hosting',      type:'expense' },
    { id:'acc-equity',    name:'Owner Equity',         type:'equity' },
    { id:'acc-payable',   name:'Accounts Payable',     type:'liability' },
  ]
  accounts.forEach(a => { ins.run(a.id, a.name, a.type, 'USD'); insLog.run('account.created', JSON.stringify(a)) })

  const ago = n => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,19).replace('T',' ') }

  const txs = [
    { d:180, desc:'Founder capital injection',        amt:5000000, dr:'acc-bank',     cr:'acc-equity' },
    { d:160, desc:'Client A — retainer Q1',           amt: 450000, dr:'acc-bank',     cr:'acc-revenue' },
    { d:155, desc:'Payroll — January',                amt: 280000, dr:'acc-payroll',  cr:'acc-bank' },
    { d:150, desc:'AWS hosting — January',            amt:  18900, dr:'acc-hosting',  cr:'acc-payable' },
    { d:140, desc:'Client B — project invoice',       amt: 320000, dr:'acc-ar',       cr:'acc-revenue' },
    { d:130, desc:'SaaS subscriptions collected',     amt:  95000, dr:'acc-bank',     cr:'acc-saas' },
    { d:125, desc:'Accounts receivable — collected',  amt: 320000, dr:'acc-bank',     cr:'acc-ar' },
    { d:120, desc:'Payroll — February',               amt: 280000, dr:'acc-payroll',  cr:'acc-bank' },
    { d:115, desc:'AWS hosting — February',           amt:  21400, dr:'acc-hosting',  cr:'acc-payable' },
    { d:110, desc:'Office supplies',                  amt:   8700, dr:'acc-expenses', cr:'acc-cash' },
    { d: 90, desc:'Client C — discovery sprint',      amt: 180000, dr:'acc-bank',     cr:'acc-revenue' },
    { d: 85, desc:'SaaS subscriptions collected',     amt: 112000, dr:'acc-bank',     cr:'acc-saas' },
    { d: 80, desc:'Payroll — March',                  amt: 280000, dr:'acc-payroll',  cr:'acc-bank' },
    { d: 75, desc:'AWS hosting — March',              amt:  24100, dr:'acc-hosting',  cr:'acc-payable' },
    { d: 60, desc:'Client A — retainer Q2',           amt: 450000, dr:'acc-bank',     cr:'acc-revenue' },
    { d: 55, desc:'Client D — full-stack build',      amt: 620000, dr:'acc-ar',       cr:'acc-revenue' },
    { d: 50, desc:'Payroll — April',                  amt: 310000, dr:'acc-payroll',  cr:'acc-bank' },
    { d: 45, desc:'Miscellaneous tooling',            amt:  14200, dr:'acc-expenses', cr:'acc-bank' },
    { d: 40, desc:'AWS hosting — April',              amt:  26800, dr:'acc-hosting',  cr:'acc-payable' },
    { d: 35, desc:'Client D — AR collected',          amt: 620000, dr:'acc-bank',     cr:'acc-ar' },
    { d: 30, desc:'SaaS subscriptions collected',     amt: 134000, dr:'acc-bank',     cr:'acc-saas' },
    { d: 25, desc:'Payroll — May',                    amt: 310000, dr:'acc-payroll',  cr:'acc-bank' },
    { d: 20, desc:'AWS hosting — May',                amt:  29500, dr:'acc-hosting',  cr:'acc-payable' },
    { d: 15, desc:'Client E — MVP contract',          amt: 390000, dr:'acc-ar',       cr:'acc-revenue' },
    { d: 10, desc:'Consultant fee — design audit',    amt:  75000, dr:'acc-expenses', cr:'acc-bank' },
    { d:  7, desc:'Client E — partial payment',       amt: 200000, dr:'acc-bank',     cr:'acc-ar' },
    { d:  5, desc:'SaaS subscriptions collected',     amt: 148000, dr:'acc-bank',     cr:'acc-saas' },
    { d:  3, desc:'Payroll — June',                   amt: 310000, dr:'acc-payroll',  cr:'acc-bank' },
    { d:  2, desc:'AWS hosting — June',               amt:  31200, dr:'acc-hosting',  cr:'acc-payable' },
    { d:  1, desc:'Client F — initial invoice',       amt: 280000, dr:'acc-ar',       cr:'acc-revenue' },
  ]

  txs.forEach(t => {
    const id = uuid()
    insTx.run(id, id, t.desc, t.amt, 'USD', t.dr, t.cr, ago(t.d))
    insLog.run('transaction.created', JSON.stringify({ id, description: t.desc, amount: t.amt }))
  })
}

module.exports = db
