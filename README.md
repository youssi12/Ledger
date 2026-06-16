# Ledger v2 — Double-Entry Finance API

Navy + electric cyan. Bloomberg terminal meets design school.

## Stack
- **Backend**: Node.js · Express · SQLite (zero config, file-based)
- **Frontend**: React 18 · Recharts · Vite

## Quick Start

### Option A — Development (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm start
# API running at http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
# UI at http://localhost:5173  (proxies /api → :3000)
```

### Option B — Production (single server)

```bash
# Build React first
cd frontend && npm install && npm run build

# Then run backend (serves the built frontend + API)
cd ../backend && npm install && npm start
# Everything at http://localhost:3000
```

---

## Features
- **Double-entry bookkeeping** — every transaction debits one account, credits another
- **Idempotency keys** — POST the same key twice, get the same result. No duplicate entries.
- **Audit log** — every account creation and transaction is written immutably
- **CSV export** — `GET /api/transactions/export.csv`
- **Live auto-refresh** — dashboard, balances, and tables update every 10 seconds
- **Count-up animations** — KPI numbers animate on load
- **Heartbeat sweep** — cyan pulse line on each stat card signals live data

---

## API Reference

### GET /api/summary
Dashboard KPIs: revenue, expenses, net, counts, monthly chart data.

### GET /api/accounts
All accounts with computed balances (double-entry normal balance rules applied).

### POST /api/accounts
```json
{ "name": "Marketing", "type": "expense" }
```
Types: `asset` · `liability` · `equity` · `income` · `expense`

### DELETE /api/accounts/:id
Only works if account has zero transactions.

### GET /api/transactions?limit=20&offset=0&q=invoice
Paginated, searchable journal entries.

### POST /api/transactions
```json
{
  "description": "Client invoice",
  "amount": 2500.00,
  "debit_account": "acc-bank",
  "credit_account": "acc-revenue",
  "idempotency_key": "inv-2026-042"
}
```

### GET /api/transactions/export.csv
Full CSV download.

### GET /api/audit?limit=50&offset=0
Immutable audit trail, newest first.

---

## Project Structure
```
ledger/
├── backend/
│   ├── src/
│   │   ├── index.js          ← Express server
│   │   ├── db/index.js       ← SQLite + seed data
│   │   └── routes/api.js     ← All routes
│   ├── data/                 ← ledger.db lives here (auto-created)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx            ← Shell + sidebar nav
    │   ├── components/UI.jsx  ← Shared components + toast
    │   ├── hooks/index.js     ← useCountUp, useAutoRefresh, useToast
    │   ├── lib/api.js         ← API client
    │   └── pages/
    │       ├── Dashboard.jsx
    │       ├── Transactions.jsx
    │       ├── Accounts.jsx
    │       └── Audit.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

Data persists in `backend/data/ledger.db` — 30 realistic seed transactions across 10 accounts, spanning 6 months.
