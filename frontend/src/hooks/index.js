import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api.js'

// Count-up animation hook
export function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current
    const end = Number(target) || 0
    if (start === end) return
    const startTime = performance.now()
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setValue(start + (end - start) * ease)
      if (t < 1) requestAnimationFrame(tick)
      else { setValue(end); prev.current = end }
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

// Auto-refresh hook
export function useAutoRefresh(fetcher, interval = 10000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = useCallback(async () => {
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
      setLastUpdate(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    load()
    const id = setInterval(load, interval)
    return () => clearInterval(id)
  }, [load, interval])

  return { data, loading, error, refresh: load, lastUpdate }
}

// Toast hook
export function useToast() {
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])
  return { toasts, push }
}

// Accounts data
export function useAccounts(refreshInterval = 10000) {
  return useAutoRefresh(useCallback(() => api.accounts(), []), refreshInterval)
}
