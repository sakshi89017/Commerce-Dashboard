import { useState, useEffect } from 'react'
import {
  DollarSign, ShoppingCart, Users, TrendingUp,
  BarChart2, Percent, AlertCircle, Star, MapPin, Package
} from 'lucide-react'
import { dashboardAPI, filtersAPI } from '../services/api'
import { KPICard, ChartCard, FilterBar, ErrorState, SectionHeader } from '../components/dashboard/UI'
import { RevenueTrendChart, DonutChart, OrdersBarChart, CategoryBarChart } from '../components/charts/Charts'
import { useFilters } from '../hooks/useFetch'
import { fmt } from '../utils/helpers'

const INSIGHT_ICONS = {
  'trending-up':   TrendingUp,
  'trending-down': TrendingUp,
  'dollar-sign':   DollarSign,
  'alert-triangle':AlertCircle,
  'package':       Package,
  'map-pin':       MapPin,
  'star':          Star,
  'shopping-cart': ShoppingCart,
}

const INSIGHT_COLORS = {
  positive: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800',
  warning:  'border-amber-200  bg-amber-50  dark:bg-amber-900/10  dark:border-amber-800',
  info:     'border-blue-200   bg-blue-50   dark:bg-blue-900/10   dark:border-blue-800',
}

export default function OverviewPage() {
  const { filters, params, update } = useFilters()
  const [data, setData]         = useState(null)
  const [filterOptions, setFO]  = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    filtersAPI.get().then(r => setFO(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    dashboardAPI.get(params)
      .then(r => setData(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [JSON.stringify(params)])

  const kpis = data?.kpis || {}

  const KPI_LIST = [
    { key: 'total_revenue',   title: 'Total Revenue',    format: 'currency', icon: DollarSign,   color: 'blue',   growth: kpis.revenue_growth, spark: (data?.sales_trend || []).map(d => ({ revenue: d.revenue })) },
    { key: 'total_orders',    title: 'Total Orders',     format: 'number',   icon: ShoppingCart,  color: 'purple' },
    { key: 'total_customers', title: 'Customers',        format: 'number',   icon: Users,         color: 'cyan' },
    { key: 'total_profit',    title: 'Total Profit',     format: 'currency', icon: TrendingUp,    color: 'green' },
    { key: 'avg_order_value', title: 'Avg Order Value',  format: 'currency', icon: BarChart2,     color: 'amber' },
    { key: 'profit_margin',   title: 'Profit Margin',    format: 'percent',  icon: Percent,       color: 'green' },
  ]

  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {filterOptions?.date_range?.min && `Data from ${filterOptions.date_range.min} to ${filterOptions.date_range.max}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} update={update} filterOptions={filterOptions} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPI_LIST.map(k => (
          <KPICard
            key={k.key}
            title={k.title}
            value={kpis[k.key]}
            format={k.format}
            icon={k.icon}
            color={k.color}
            growth={k.growth}
            loading={loading}
            sparkData={k.spark}
          />
        ))}
      </div>

      {/* Revenue trend + Category breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard
          title="Revenue & Profit Trend"
          subtitle="Monthly performance"
          className="xl:col-span-2"
        >
          {loading
            ? <div className="skeleton h-64 w-full" />
            : <RevenueTrendChart data={data?.sales_trend || []} height={264} />
          }
        </ChartCard>

        <ChartCard title="Category Revenue" subtitle="Revenue share by category">
          {loading
            ? <div className="skeleton h-64 w-full" />
            : <DonutChart data={data?.product_data?.category_breakdown || []} height={264} />
          }
        </ChartCard>
      </div>

      {/* Orders + Top products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Monthly Orders" subtitle="Order volume over time">
          {loading
            ? <div className="skeleton h-48 w-full" />
            : <OrdersBarChart data={data?.sales_trend || []} height={220} />
          }
        </ChartCard>

        <ChartCard title="Top Products" subtitle="By revenue">
          {loading
            ? <div className="skeleton h-48 w-full" />
            : <CategoryBarChart
                data={data?.product_data?.top_products?.slice(0, 7) || []}
                xKey="product_name"
                height={220}
              />
          }
        </ChartCard>
      </div>

      {/* AI Insights */}
      {!loading && data?.insights?.length > 0 && (
        <div>
          <SectionHeader
            title="AI Business Insights"
            subtitle="Automatically generated from your data"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.insights.map((ins, i) => {
              const Icon = INSIGHT_ICONS[ins.icon] || BarChart2
              return (
                <div
                  key={i}
                  className={`border rounded-xl p-4 ${INSIGHT_COLORS[ins.type] || INSIGHT_COLORS.info}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/60 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{ins.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{ins.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Regional summary */}
      {!loading && data?.regional_data?.regions && (
        <div>
          <SectionHeader title="Regional Performance" subtitle="Revenue by region" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.regional_data.regions.map((reg, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{reg.region}</span>
                </div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{fmt.currency(reg.revenue, true)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{fmt.number(reg.orders)} orders</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
