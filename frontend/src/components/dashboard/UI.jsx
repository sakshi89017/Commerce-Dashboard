import { TrendingUp, TrendingDown } from 'lucide-react'
import { fmt, cx } from '../../utils/helpers'

// ── KPI Card ──────────────────────────────────────────────────
export function KPICard({ title, value, format = 'currency', growth, icon: Icon, color = 'blue', loading }) {
  const colors = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   icon: 'text-blue-600 dark:text-blue-400' },
    green:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',  icon: 'text-amber-600 dark:text-amber-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',     icon: 'text-red-600 dark:text-red-400' },
    cyan:   { bg: 'bg-cyan-50 dark:bg-cyan-900/20',   icon: 'text-cyan-600 dark:text-cyan-400' },
  }
  const c = colors[color] || colors.blue

  const displayValue = () => {
    if (loading) return null
    if (format === 'currency')  return fmt.currency(value, true)
    if (format === 'number')    return fmt.number(value, true)
    if (format === 'percent')   return fmt.percent(value)
    return value
  }

  const g = growth != null ? fmt.growth(growth) : null

  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
        {Icon && (
          <div className={cx('p-2 rounded-lg', c.bg)}>
            <Icon className={cx('w-4 h-4', c.icon)} />
          </div>
        )}
      </div>

      {loading
        ? <div className="skeleton h-8 w-32 mt-1" />
        : <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{displayValue()}</p>
      }

      {g && !loading && (
        <div className={cx('flex items-center gap-1 text-xs font-medium', g.positive ? 'text-emerald-600' : 'text-red-500')}>
          {g.positive
            ? <TrendingUp  className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          <span>{g.label} vs last period</span>
        </div>
      )}
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────
export function CardSkeleton({ rows = 1 }) {
  return (
    <div className="card p-5 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-5 w-full" style={{ width: `${60 + (i % 3) * 15}%` }} />
      ))}
    </div>
  )
}

// ── Error state ────────────────────────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <div className="card p-8 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
        <span className="text-2xl">⚠️</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{message || 'Something went wrong'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-xs px-3 py-1.5">
          Retry
        </button>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ title = 'No data', subtitle, icon: Icon }) {
  return (
    <div className="card p-10 flex flex-col items-center gap-3 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
      )}
      <p className="font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
    </div>
  )
}

// ── Chart container ───────────────────────────────────────────
export function ChartCard({ title, subtitle, action, children, className }) {
  return (
    <div className={cx('card p-5', className)}>
      <SectionHeader title={title} subtitle={subtitle} action={action} />
      {children}
    </div>
  )
}

// ── Filter bar ────────────────────────────────────────────────
export function FilterBar({ filters, update, filterOptions, showPeriod = false }) {
  const periods = [
    { value: 'daily',   label: 'Daily' },
    { value: 'weekly',  label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly',  label: 'Yearly' },
  ]

  return (
    <div className="card p-4 mb-5">
      <div className="flex flex-wrap gap-3">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={e => update('start_date', e.target.value)}
            className="input w-auto text-xs"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={e => update('end_date', e.target.value)}
            className="input w-auto text-xs"
          />
        </div>

        {/* Category */}
        {filterOptions?.categories?.length > 0 && (
          <select
            value={filters.category || ''}
            onChange={e => update('category', e.target.value)}
            className="input w-auto text-xs"
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {/* Region */}
        {filterOptions?.regions?.length > 0 && (
          <select
            value={filters.region || ''}
            onChange={e => update('region', e.target.value)}
            className="input w-auto text-xs"
          >
            <option value="">All Regions</option>
            {filterOptions.regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}

        {/* Period */}
        {showPeriod && (
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            {periods.map(p => (
              <button
                key={p.value}
                onClick={() => update('period', p.value)}
                className={cx(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  filters.period === p.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Data table ────────────────────────────────────────────────
export function DataTable({ columns, rows, loading, emptyMessage = 'No data' }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!rows?.length) {
    return <p className="text-sm text-slate-400 text-center py-8">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            {columns.map(col => (
              <th
                key={col.key}
                className={cx(
                  'pb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide',
                  col.align === 'right' ? 'text-right' : 'text-left'
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              {columns.map(col => (
                <td
                  key={col.key}
                  className={cx(
                    'py-2.5 text-slate-700 dark:text-slate-300',
                    col.align === 'right' && 'text-right',
                    col.className
                  )}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────
export function SegmentBadge({ segment }) {
  const map = {
    VIP:       'badge-blue',
    Returning: 'badge-green',
    New:       'badge-amber',
    'At-Risk': 'badge-red',
  }
  return <span className={map[segment] || 'badge-amber'}>{segment}</span>
}
