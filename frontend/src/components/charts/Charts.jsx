import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart,
  ReferenceLine
} from 'recharts'
import { fmt, CHART_COLORS, CATEGORY_COLORS } from '../../utils/helpers'

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--bg-card, #fff)',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-primary, #0f172a)',
}

const AXIS_STYLE = { fontSize: 11, fill: 'var(--text-muted, #94a3b8)' }

const formatXDate = (val) => {
  if (!val) return ''
  const s = String(val)
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(s)
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`
  }
  return s
}

// ── Revenue trend line chart ──────────────────────────────────
export function RevenueTrendChart({ data = [], height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={'var(--accent)'} stopOpacity={0.18} />
            <stop offset="95%" stopColor={'var(--accent)'} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={'var(--accent-2)'} stopOpacity={0.14} />
            <stop offset="95%" stopColor={'var(--accent-2)'} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" vertical={false} />
        <XAxis dataKey="period_date" tickFormatter={formatXDate} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => fmt.currency(v, true)} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => [fmt.currency(v), name === 'revenue' ? 'Revenue' : 'Profit']}
          labelFormatter={formatXDate}
        />
        <Legend />
        <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#revGrad)" name="Revenue" dot={{ r: 2 }} />
        <Area type="monotone" dataKey="profit"  stroke="var(--accent-2)" strokeWidth={2} fill="url(#profGrad)" name="Profit" dot={{ r: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Tiny sparkline for KPI cards ─────────────────────────────
export function Sparkline({ data = [], color = '#3b82f6', height = 32, width = 80 }) {
  const series = (data || []).map(d => ({ value: d.revenue ?? d.orders ?? d.value ?? 0 }))
  return (
    <div style={{ width, height }} className="inline-block align-middle">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={v => [v, 'Value']}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Bar chart: category or product revenue ────────────────────
export function CategoryBarChart({ data = [], xKey = 'category', valueKey = 'revenue', height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tickFormatter={v => fmt.currency(v, true)} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={xKey} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={100} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={v => [fmt.currency(v), 'Revenue']}
        />
        <Bar dataKey={valueKey} radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Pie / Donut chart ─────────────────────────────────────────
export function DonutChart({ data = [], nameKey = 'category', valueKey = 'revenue', height = 260 }) {
  const RADIAN = Math.PI / 180
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          labelLine={false}
          label={renderLabel}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={CATEGORY_COLORS[entry[nameKey]] || CHART_COLORS[i % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={v => [fmt.currency(v), 'Revenue']}
        />
        <Legend
          formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Monthly orders bar chart ──────────────────────────────────
export function OrdersBarChart({ data = [], height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="period_date" tickFormatter={formatXDate} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={formatXDate} />
        <Bar dataKey="orders" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={30} name="Orders" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Profit margin line chart ──────────────────────────────────
export function ProfitTrendChart({ data = [], height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatXDate} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left"  tickFormatter={v => fmt.currency(v, true)} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v.toFixed(0)}%`} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => {
            if (name === 'Profit Margin') return [`${v.toFixed(1)}%`, name]
            return [fmt.currency(v), name]
          }}
          labelFormatter={formatXDate}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="profit"  fill="#10b981" radius={[3, 3, 0, 0]} name="Profit" maxBarSize={30} />
        <Bar yAxisId="left" dataKey="cost"    fill="#ef4444" radius={[3, 3, 0, 0]} name="Cost"   maxBarSize={30} />
        <Line yAxisId="right" type="monotone" dataKey="profit_margin" stroke="#f59e0b" strokeWidth={2} dot={false} name="Profit Margin" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Customer growth line chart ────────────────────────────────
export function CustomerGrowthChart({ data = [], height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatXDate} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={35} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={formatXDate} />
        <Area type="monotone" dataKey="new_customers" stroke="#8b5cf6" strokeWidth={2} fill="url(#custGrad)" name="New Customers" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Forecast chart ────────────────────────────────────────────
export function ForecastChart({ historical = [], forecast = [], height = 300 }) {
  const hist = historical.map(d => ({ ...d, date: d.ds || d.date, actual: Number(d.y || d.actual || 0) }))
  const fore = forecast.map(d => ({ ...d, date: d.date, predicted: Number(d.predicted_revenue || 0) }))

  // Merge into single timeline
  const all = [
    ...hist.map(d => ({ date: d.date, actual: d.actual })),
    ...fore.map(d => ({ date: d.date, predicted: d.predicted })),
  ]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={all} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={v => v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          tick={AXIS_STYLE} axisLine={false} tickLine={false}
          interval={Math.floor(all.length / 8)}
        />
        <YAxis tickFormatter={v => fmt.currency(v, true)} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={65} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => [fmt.currency(v), name === 'actual' ? 'Actual' : 'Forecast']}
        />
        <Legend />
        <ReferenceLine
          x={hist[hist.length - 1]?.date}
          stroke="var(--text-muted)"
          strokeDasharray="4 4"
          label={{ value: 'Today', fill: 'var(--text-muted)', fontSize: 11 }}
        />
        <Line type="monotone" dataKey="actual"    stroke="#3b82f6" strokeWidth={2} dot={false} name="Actual" connectNulls />
        <Area type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} fill="url(#foreGrad)" dot={false} name="Forecast" connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Region bar chart ──────────────────────────────────────────
export function RegionBarChart({ data = [], height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="region" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => fmt.currency(v, true)} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={65} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmt.currency(v), 'Revenue']} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={50}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Payment methods pie ───────────────────────────────────────
export function PaymentPieChart({ data = [], height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="payment_method" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  )
}
