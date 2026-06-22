import { useState, useEffect, useCallback, useRef } from 'react'
import { dateUtils } from '../utils/helpers'

// ── Generic data fetching hook ────────────────────────────────
export function useFetch(fetchFn, params = {}, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const abortRef              = useRef(null)

  const execute = useCallback(async (overrideParams) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn(overrideParams ?? params)
      setData(result.data?.data ?? result.data)
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Request failed')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { execute() }, [execute])

  return { data, loading, error, refetch: execute }
}

// ── Dashboard filter state ─────────────────────────────────────
export function useFilters(initial = {}) {
  const [filters, setFilters] = useState({
    start_date: dateUtils.firstOfYear(),
    end_date:   dateUtils.today(),
    category:   '',
    region:     '',
    period:     'monthly',
    ...initial,
  })

  const update = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value }))

  const reset = () =>
    setFilters({
      start_date: dateUtils.firstOfYear(),
      end_date:   dateUtils.today(),
      category:   '',
      region:     '',
      period:     'monthly',
    })

  const applyPreset = (preset) => {
    const s = preset.start()
    const e = preset.end()
    setFilters(prev => ({
      ...prev,
      start_date: s || '',
      end_date:   e || '',
    }))
  }

  // Build clean params (remove empty strings)
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v != null)
  )

  return { filters, params, update, reset, applyPreset }
}

// ── Debounce hook ─────────────────────────────────────────────
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Local storage hook ────────────────────────────────────────
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initial
    } catch { return initial }
  })

  const set = useCallback((val) => {
    setValue(val)
    localStorage.setItem(key, JSON.stringify(val))
  }, [key])

  return [value, set]
}
