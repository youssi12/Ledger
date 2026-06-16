import { useCallback, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { useAutoRefresh } from '../hooks/index.js'
import { KpiCard, Amount, FmtDate, Spinner } from '../components/UI.jsx'
import { api } from '../lib/api.js'

const fmt = v => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--card2)', border:'1px solid var(--border2)', borderRadius:6, padding:'8px 12px', fontSize:11 }}>
      <div style={{ color:'var(--steel)', marginBottom:4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily:'var(--font-mono)' }}>
          {p.name}: ${Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data: summary, loading: sLoad } = useAutoRefresh(useCallback(() => api.summary(), []), 10000)
  const { data: txData,  loading: tLoad } = useAutoRefresh(useCallback(() => api.transactions({ limit: 8 }), []), 10000)
  const { data: accData, loading: aLoad } = useAutoRefresh(useCallback(() => api.accounts(), []), 10000)

  if (sLoad || tLoad || aLoad) return <Spinner />

  const monthly = (summary?.monthly || []).map(m => ({
    month: m.month,
    Revenue: Math.round(m.revenue / 100),
  }))

  const byType = (accData?.accounts || []).reduce((acc, a) => {
    const t = a.type
    acc[t] = (acc[t] || 0) + Number(a.balance)
    return acc
  }, {})

  const typeChart = Object.entries(byType).map(([t, v]) => ({ name: t, value: Math.round(v) }))
  const recent = txData?.transactions || []

  return (
    <div className="page">
      {/* KPIs */}
      <div className="kpi-strip">
        <KpiCard label="Total Revenue"    value={summary?.revenue}  prefix="$" colorClass="cyan"  delta="All time" />
        <KpiCard label="Total Expenses"   value={summary?.expenses} prefix="$" colorClass=""      delta="All time" />
        <KpiCard label="Net Position"     value={summary?.net}      prefix="$"
          colorClass={Number(summary?.net) >= 0 ? 'green' : 'red'}
          delta={Number(summary?.net) >= 0 ? '▲ Positive' : '▼ Negative'} />
        <KpiCard label="Journal Entries"  value={summary?.transaction_count} colorClass="" delta={`Across ${summary?.account_count} accounts`} />
      </div>

      {/* Chart + breakdown */}
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Revenue — 6 months</span>
          </div>
          <div className="chart-wrap" style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d44d5c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d44d5c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize:9, fill:'var(--fog)', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} tick={{ fontSize:9, fill:'var(--fog)', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="Revenue"
                  stroke="#d44d5c" strokeWidth={2}
                  fill="url(#rev-fill)"
                  dot={{ fill:'#d44d5c', r:3, strokeWidth:0 }}
                  activeDot={{ r:5, fill:'#d44d5c', stroke:'var(--abyss)', strokeWidth:2 }}
                  isAnimationActive={true} animationDuration={1200} animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Net by account type</span>
          </div>
          <div className="chart-wrap" style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChart} margin={{ top:4, right:8, left:0, bottom:0 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:9, fill:'var(--fog)', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} tick={{ fontSize:9, fill:'var(--fog)' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#d44d5c" fillOpacity={.7} radius={[3,3,0,0]}
                  isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent entries */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Recent Entries</span>
          <span style={{ fontSize:10, color:'var(--fog)', fontFamily:'var(--font-mono)' }}>auto-refresh 10s</span>
        </div>
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
            {recent.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--fog)', padding:32 }}>No entries yet</td></tr>
            )}
            {recent.map(t => (
              <tr key={t.id}>
                <td><FmtDate value={t.created_at} /></td>
                <td style={{ maxWidth:220 }}>{t.description}</td>
                <td className="dim" style={{ fontSize:11 }}>{t.debit_name}</td>
                <td className="dim" style={{ fontSize:11 }}>{t.credit_name}</td>
                <td className="tr"><Amount value={t.amount} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
