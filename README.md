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
 
