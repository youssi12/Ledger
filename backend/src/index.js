const express = require('express')
const cors    = require('cors')
const path    = require('path')
const fs      = require('fs')

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api', require('./routes/api'))

// Serve React build only when dist exists (production)
const DIST = path.join(__dirname, '../../frontend/dist')
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  app.use(express.static(DIST))
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')))
} else {
  app.get('/', (_req, res) => res.send('API running. Open http://localhost:5173 for the UI.'))
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Ledger API → http://localhost:${PORT}`))
