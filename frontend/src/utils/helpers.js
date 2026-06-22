// ── Number formatting ─────────────────────────────────────────
export const fmt = {
  currency: (n, compact = false) => {
    if (n == null) return '₹0'
    const num = Number(n)
    if (compact) {
      if (num >= 1e7) return `₹${(num / 1e7).toFixed(1)}Cr`
      if (num >= 1e5) return `₹${(num / 1e5).toFixed(1)}L`
      if (num >= 1e3) return `₹${(num / 1e3).toFixed(1)}K`
      return `₹${num.toFixed(0)}`
    }
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
  },

  number: (n, compact = false) => {
    if (n == null) return '0'
    const num = Number(n)
    if (compact) {
      if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
      if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
      return num.toLocaleString('en-IN')
    }
    return num.toLocaleString('en-IN')
  },

  percent: (n, decimals = 1) =>
    n == null ? '0%' : `${Number(n).toFixed(decimals)}%`,

  growth: (n) => {
    if (n == null) return { label: '0%', positive: true }
    const num = Number(n)
    return { label: `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`, positive: num >= 0 }
  },
}

// ── Date helpers ──────────────────────────────────────────────
export const dateUtils = {
  today:      () => new Date().toISOString().split('T')[0],
  daysAgo:    (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0],
  firstOfYear: () => `${new Date().getFullYear()}-01-01`,

  presets: [
    { label: 'Last 30 days',  start: () => dateUtils.daysAgo(30),  end: () => dateUtils.today() },
    { label: 'Last 90 days',  start: () => dateUtils.daysAgo(90),  end: () => dateUtils.today() },
    { label: 'This year',     start: () => dateUtils.firstOfYear(), end: () => dateUtils.today() },
    { label: 'Last year',     start: () => '2023-01-01',            end: () => '2023-12-31' },
    { label: 'All time',      start: () => null,                    end: () => null },
  ],
}

// ── Download blob helper ──────────────────────────────────────
export const downloadBlob = (blob, filename) => {
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Chart colors ──────────────────────────────────────────────
export const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
]

export const CATEGORY_COLORS = {
  'Electronics':    '#3b82f6',
  'Clothing':       '#10b981',
  'Home & Kitchen': '#f59e0b',
  'Books':          '#8b5cf6',
  'Sports':         '#06b6d4',
  'Beauty':         '#ec4899',
}

// ── Truncate text ─────────────────────────────────────────────
export const truncate = (str, n = 24) =>
  str && str.length > n ? `${str.slice(0, n)}…` : str

// ── Class name helper (simple cx) ─────────────────────────────
export const cx = (...classes) => classes.filter(Boolean).join(' ')
