// ── Products Page ─────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { productsAPI, customersAPI, profitAPI, regionsAPI, forecastAPI } from '../services/api'
import { ChartCard, PageHeader, DataTable, SectionHeader } from '../components/dashboard/UI'
import { CategoryBarChart, DonutChart, ProfitTrendChart,
         CustomerGrowthChart, ForecastChart, RegionBarChart,
         PaymentPieChart } from '../components/charts/Charts'
import { fmt } from '../utils/helpers'
import { TrendingUp, TrendingDown } from 'lucide-react'

// ── PRODUCTS ──────────────────────────────────────────────────
export function ProductsPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    productsAPI.get({ limit: 10 })
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const topCols = [
    { key: 'product_name', label: 'Product',  render: (v, r) => <span title={v} className="font-medium text-slate-700 dark:text-slate-200">{v?.length > 22 ? v.slice(0,22)+'…' : v}</span> },
    { key: 'category',     label: 'Category'  },
    { key: 'units_sold',   label: 'Units',    render: v => fmt.number(v),     align: 'right' },
    { key: 'revenue',      label: 'Revenue',  render: v => fmt.currency(v),   align: 'right' },
    { key: 'profit',       label: 'Profit',   render: v => <span className="text-emerald-600 font-medium">{fmt.currency(v)}</span>, align: 'right' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Product Analytics" subtitle="Top & bottom performers, category breakdown" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Category Revenue" subtitle="Revenue share per category">
          {loading
            ? <div className="skeleton h-64 w-full" />
            : <DonutChart data={data?.category_breakdown || []} height={264} />
          }
        </ChartCard>

        <ChartCard title="Category Revenue (Bar)" subtitle="Detailed comparison">
          {loading
            ? <div className="skeleton h-64 w-full" />
            : <CategoryBarChart data={data?.category_breakdown || []} xKey="category" height={264} />
          }
        </ChartCard>
      </div>

      {/* Top products table */}
      <div className="card p-5">
        <SectionHeader title="Top 10 Products" subtitle="By revenue" />
        <DataTable columns={topCols} rows={loading ? [] : data?.top_products} loading={loading} />
      </div>

      {/* Bottom products */}
      <div className="card p-5">
        <SectionHeader title="Bottom Products" subtitle="Underperformers to review" />
        <DataTable columns={topCols} rows={loading ? [] : data?.bottom_products} loading={loading} />
      </div>
    </div>
  )
}

// ── CUSTOMERS ─────────────────────────────────────────────────
export function CustomersPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    customersAPI.get()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const custCols = [
    { key: 'customer_name',  label: 'Customer', render: v => <span className="font-medium text-slate-700 dark:text-slate-200">{v}</span> },
    { key: 'segment',        label: 'Segment',  render: v => {
      const map = { VIP: 'badge-blue', Returning: 'badge-green', New: 'badge-amber', 'At-Risk': 'badge-red' }
      return <span className={map[v] || 'badge-amber'}>{v}</span>
    }},
    { key: 'order_count',    label: 'Orders',   render: v => fmt.number(v),   align: 'right' },
    { key: 'total_revenue',  label: 'Revenue',  render: v => fmt.currency(v), align: 'right' },
    { key: 'total_profit',   label: 'Profit',   render: v => fmt.currency(v), align: 'right' },
    { key: 'last_order_date', label: 'Last Order', render: v => v?.slice(0, 10) },
  ]

  const summary = data?.summary || {}

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Customer Analytics" subtitle="Segments, lifetime value, and growth" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: fmt.number(summary.total_customers) },
          { label: 'VIP Customers',   value: fmt.number(summary.vip_count) },
          { label: 'Returning',       value: fmt.number(summary.returning_count) },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Customer Growth" subtitle="New customers per month">
          {loading
            ? <div className="skeleton h-52 w-full" />
            : <CustomerGrowthChart data={data?.growth_trend || []} height={220} />
          }
        </ChartCard>

        <ChartCard title="Payment Methods" subtitle="Order distribution">
          {loading
            ? <div className="skeleton h-52 w-full" />
            : <PaymentPieChart data={data?.payment_methods || []} height={220} />
          }
        </ChartCard>
      </div>

      {/* Segments */}
      {!loading && data?.segments && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.segments.map(seg => (
            <div key={seg.segment} className="card p-4 text-center">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{seg.count}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{seg.segment} Customers</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5">
        <SectionHeader title="Top 20 Customers" subtitle="By revenue" />
        <DataTable columns={custCols} rows={loading ? [] : data?.top_customers} loading={loading} />
      </div>
    </div>
  )
}

// ── PROFIT ────────────────────────────────────────────────────
export function ProfitPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    profitAPI.get()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const monthly = data?.monthly_trend || []
  const totals = monthly.reduce((a, r) => ({
    revenue: a.revenue + (r.revenue || 0),
    cost:    a.cost    + (r.cost    || 0),
    profit:  a.profit  + (r.profit  || 0),
  }), { revenue: 0, cost: 0, profit: 0 })

  const avgMargin = monthly.length
    ? monthly.reduce((a, r) => a + (r.profit_margin || 0), 0) / monthly.length
    : 0

  const catCols = [
    { key: 'category',      label: 'Category'                                     },
    { key: 'revenue',       label: 'Revenue',        render: v => fmt.currency(v), align: 'right' },
    { key: 'cost',          label: 'Cost',           render: v => fmt.currency(v), align: 'right' },
    { key: 'profit',        label: 'Profit',         render: v => <span className="text-emerald-600 font-medium">{fmt.currency(v)}</span>, align: 'right' },
    { key: 'profit_margin', label: 'Margin',         render: v => fmt.percent(v),  align: 'right' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Profit Analysis" subtitle="Gross profit, cost breakdown, and margins" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt.currency(totals.revenue, true) },
          { label: 'Total Cost',    value: fmt.currency(totals.cost,    true) },
          { label: 'Gross Profit',  value: fmt.currency(totals.profit,  true) },
          { label: 'Avg Margin',    value: fmt.percent(avgMargin) },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      <ChartCard title="Monthly Profit & Margin Trend" subtitle="Revenue vs cost vs profit margin">
        {loading
          ? <div className="skeleton h-64 w-full" />
          : <ProfitTrendChart data={monthly} height={260} />
        }
      </ChartCard>

      <div className="card p-5">
        <SectionHeader title="Category Profit Breakdown" />
        <DataTable columns={catCols} rows={loading ? [] : data?.category_profit} loading={loading} />
      </div>
    </div>
  )
}

// ── REGIONS ───────────────────────────────────────────────────
export function RegionsPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    regionsAPI.get()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const regionCols = [
    { key: 'region',    label: 'Region'                                        },
    { key: 'orders',    label: 'Orders',    render: v => fmt.number(v),   align: 'right' },
    { key: 'customers', label: 'Customers', render: v => fmt.number(v),   align: 'right' },
    { key: 'revenue',   label: 'Revenue',   render: v => fmt.currency(v), align: 'right' },
    { key: 'profit',    label: 'Profit',    render: v => fmt.currency(v), align: 'right' },
  ]

  const stateCols = [
    { key: 'state',   label: 'State'                                         },
    { key: 'region',  label: 'Region'                                        },
    { key: 'orders',  label: 'Orders',  render: v => fmt.number(v),    align: 'right' },
    { key: 'revenue', label: 'Revenue', render: v => fmt.currency(v),  align: 'right' },
  ]

  const cityCols = [
    { key: 'city',    label: 'City'                                          },
    { key: 'state',   label: 'State'                                         },
    { key: 'orders',  label: 'Orders',  render: v => fmt.number(v),    align: 'right' },
    { key: 'revenue', label: 'Revenue', render: v => fmt.currency(v),  align: 'right' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Regional Analysis" subtitle="Revenue breakdown by region, state, and city" />

      <ChartCard title="Region-wise Revenue">
        {loading
          ? <div className="skeleton h-60 w-full" />
          : <RegionBarChart data={data?.regions || []} height={240} />
        }
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionHeader title="Region Summary" />
          <DataTable columns={regionCols} rows={loading ? [] : data?.regions} loading={loading} />
        </div>
        <div className="card p-5">
          <SectionHeader title="Top States by Revenue" />
          <DataTable columns={stateCols} rows={loading ? [] : data?.states} loading={loading} />
        </div>
      </div>

      <div className="card p-5">
        <SectionHeader title="Top 15 Cities by Revenue" />
        <DataTable columns={cityCols} rows={loading ? [] : data?.cities} loading={loading} />
      </div>
    </div>
  )
}

// ── FORECAST ──────────────────────────────────────────────────
export function ForecastPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays]     = useState(30)

  const load = (d) => {
    setLoading(true)
    forecastAPI.get({ days: d })
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(days) }, [days])

  const summary = data?.summary || {}

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Revenue Forecast"
        subtitle="Polynomial regression forecast using historical trends"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Forecast horizon:</span>
            {[14, 30, 60].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  days === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        }
      />

      {/* Summary cards */}
      {!loading && summary.forecast_total && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Forecast ({days}d)</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmt.currency(summary.forecast_total, true)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Previous Period</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmt.currency(summary.prev_period_total, true)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Expected Growth</p>
            <div className="flex items-center gap-2 mt-1">
              {summary.expected_growth_pct >= 0
                ? <TrendingUp className="w-5 h-5 text-emerald-500" />
                : <TrendingDown className="w-5 h-5 text-red-500" />}
              <p className={`text-2xl font-bold ${summary.expected_growth_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {summary.expected_growth_pct >= 0 ? '+' : ''}{summary.expected_growth_pct?.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      <ChartCard
        title={`Revenue Forecast — Next ${days} Days`}
        subtitle="Historical actuals (blue) + projected trend (amber)"
      >
        {loading
          ? <div className="skeleton h-72 w-full" />
          : data?.error
            ? <p className="text-sm text-red-500 py-8 text-center">{data.error}</p>
            : <ForecastChart
                historical={data?.historical || []}
                forecast={data?.forecast || []}
                height={290}
              />
        }
      </ChartCard>

      {/* Forecast table */}
      {!loading && data?.forecast && (
        <div className="card p-5">
          <SectionHeader title="Daily Forecast Detail" />
          <div className="overflow-y-auto max-h-80">
            <DataTable
              columns={[
                { key: 'date',               label: 'Date'                                          },
                { key: 'predicted_revenue',  label: 'Predicted Revenue', render: v => fmt.currency(v), align: 'right' },
              ]}
              rows={data.forecast}
              loading={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}
