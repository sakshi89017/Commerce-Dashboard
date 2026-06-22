import { useState, useEffect } from 'react'
import { salesAPI, filtersAPI } from '../services/api'
import { ChartCard, FilterBar, PageHeader, DataTable } from '../components/dashboard/UI'
import { RevenueTrendChart, OrdersBarChart } from '../components/charts/Charts'
import { useFilters } from '../hooks/useFetch'
import { fmt } from '../utils/helpers'

export default function SalesPage() {
  const { filters, params, update } = useFilters()
  const [data, setData]       = useState([])
  const [filterOpts, setFO]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    filtersAPI.get().then(r => setFO(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    salesAPI.getTrend(params)
      .then(r => setData(r.data.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [JSON.stringify(params)])

  // Aggregated summary
  const totals = data.reduce(
    (acc, row) => ({
      revenue: acc.revenue + (row.revenue || 0),
      profit:  acc.profit  + (row.profit  || 0),
      orders:  acc.orders  + (row.orders  || 0),
      units:   acc.units   + (row.units   || 0),
    }),
    { revenue: 0, profit: 0, orders: 0, units: 0 }
  )

  const columns = [
    { key: 'period_date', label: 'Period', render: v => v?.slice(0, 10) },
    { key: 'orders',      label: 'Orders',  render: v => fmt.number(v),        align: 'right' },
    { key: 'units',       label: 'Units',   render: v => fmt.number(v),        align: 'right' },
    { key: 'revenue',     label: 'Revenue', render: v => fmt.currency(v),      align: 'right' },
    { key: 'cost',        label: 'Cost',    render: v => fmt.currency(v),      align: 'right' },
    { key: 'profit',      label: 'Profit',  render: v => fmt.currency(v),      align: 'right',
      className: v => v >= 0 ? 'text-emerald-600' : 'text-red-500' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Sales Analytics" subtitle="Revenue, profit, and order trends" />

      <FilterBar filters={filters} update={update} filterOptions={filterOpts} showPeriod />

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt.currency(totals.revenue, true) },
          { label: 'Total Profit',  value: fmt.currency(totals.profit,  true) },
          { label: 'Total Orders',  value: fmt.number(totals.orders,   true) },
          { label: 'Total Units',   value: fmt.number(totals.units,    true) },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Revenue & Profit Trend" subtitle={`${filters.period} view`}>
          {loading
            ? <div className="skeleton h-64 w-full" />
            : <RevenueTrendChart data={data} height={260} />
          }
        </ChartCard>

        <ChartCard title="Order Volume" subtitle={`${filters.period} orders`}>
          {loading
            ? <div className="skeleton h-64 w-full" />
            : <OrdersBarChart data={data} height={260} />
          }
        </ChartCard>
      </div>

      {/* Data table */}
      <div className="card p-5">
        <h3 className="section-title mb-4">Detailed Data</h3>
        <DataTable
          columns={columns}
          rows={loading ? [] : data}
          loading={loading}
          emptyMessage="No sales data for selected filters"
        />
      </div>
    </div>
  )
}
