import { useState, useEffect } from 'react'
import { FileText, FileSpreadsheet, Download, Loader2, Clock, Brain, TrendingUp, Package, MapPin, Star } from 'lucide-react'
import { reportsAPI, dashboardAPI } from '../services/api'
import { PageHeader } from '../components/dashboard/UI'
import { downloadBlob } from '../utils/helpers'
import toast from 'react-hot-toast'

const INSIGHT_ICONS = {
  'trending-up':    TrendingUp,
  'trending-down':  TrendingUp,
  'dollar-sign':    TrendingUp,
  'alert-triangle': TrendingUp,
  'package':        Package,
  'map-pin':        MapPin,
  'star':           Star,
  'shopping-cart':  TrendingUp,
}

export default function ReportsPage() {
  const [downloading, setDownloading] = useState({ pdf: false, excel: false })
  const [history, setHistory]         = useState([])
  const [insights, setInsights]       = useState([])
  const [insightLoading, setIL]       = useState(true)

  useEffect(() => {
    // Load report history
    reportsAPI.getHistory()
      .then(r => setHistory(r.data.data || []))
      .catch(() => {})

    // Load AI insights from dashboard
    dashboardAPI.get({})
      .then(r => setInsights(r.data.data?.insights || []))
      .catch(() => {})
      .finally(() => setIL(false))
  }, [])

  const downloadExcel = async () => {
    setDownloading(d => ({ ...d, excel: true }))
    try {
      const { data } = await reportsAPI.downloadExcel({})
      downloadBlob(data, `commerce_report_${new Date().toISOString().slice(0,10)}.xlsx`)
      toast.success('Excel report downloaded!')
      reportsAPI.getHistory().then(r => setHistory(r.data.data || [])).catch(() => {})
    } catch {
      toast.error('Failed to generate Excel report')
    } finally {
      setDownloading(d => ({ ...d, excel: false }))
    }
  }

  const downloadPdf = async () => {
    setDownloading(d => ({ ...d, pdf: true }))
    try {
      const { data } = await reportsAPI.downloadPdf({})
      downloadBlob(data, `commerce_report_${new Date().toISOString().slice(0,10)}.pdf`)
      toast.success('PDF report downloaded!')
      reportsAPI.getHistory().then(r => setHistory(r.data.data || [])).catch(() => {})
    } catch {
      toast.error('Failed to generate PDF report')
    } finally {
      setDownloading(d => ({ ...d, pdf: false }))
    }
  }

  const INSIGHT_COLORS = {
    positive: { card: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800', icon: 'text-emerald-600', label: 'Positive' },
    warning:  { card: 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800',         icon: 'text-amber-600',   label: 'Warning' },
    info:     { card: 'border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800',             icon: 'text-blue-600',    label: 'Info' },
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Reports & AI Insights" subtitle="Generate reports and view automated business insights" />

      {/* Report download cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Excel */}
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Excel Report</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Multi-sheet with KPIs, products, customers</p>
            </div>
          </div>

          <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <p>📊 KPI Summary sheet</p>
            <p>📈 Sales trend data</p>
            <p>📦 Top 20 products</p>
            <p>👥 Top customers</p>
          </div>

          <button
            onClick={downloadExcel}
            disabled={downloading.excel}
            className="btn-primary w-full justify-center"
          >
            {downloading.excel
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Download className="w-4 h-4" /> Download Excel (.xlsx)</>
            }
          </button>
        </div>

        {/* PDF */}
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">PDF Report</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Executive summary with insights</p>
            </div>
          </div>

          <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <p>📋 Executive KPI summary</p>
            <p>📦 Top 10 product table</p>
            <p>🤖 AI-generated insights</p>
            <p>🎨 Professional formatting</p>
          </div>

          <button
            onClick={downloadPdf}
            disabled={downloading.pdf}
            className="btn-primary w-full justify-center bg-red-500 hover:bg-red-600"
          >
            {downloading.pdf
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Download className="w-4 h-4" /> Download PDF</>
            }
          </button>
        </div>
      </div>

      {/* AI Insights panel */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="section-title">AI Business Insights</h3>
          <span className="badge-blue text-xs ml-auto">Auto-generated</span>
        </div>

        {insightLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No insights available — upload some data first</p>
        ) : (
          <div className="space-y-3">
            {insights.map((ins, i) => {
              const colors = INSIGHT_COLORS[ins.type] || INSIGHT_COLORS.info
              const Icon   = INSIGHT_ICONS[ins.icon] || TrendingUp
              return (
                <div key={i} className={`border rounded-xl p-4 ${colors.card}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/60 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-4 h-4 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{ins.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          ins.type === 'positive' ? 'bg-emerald-100 text-emerald-700'
                          : ins.type === 'warning' ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                        }`}>
                          {colors.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{ins.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Report history */}
      {history.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="section-title">Report History</h3>
          </div>
          <div className="space-y-2">
            {history.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
                {r.report_type === 'excel'
                  ? <FileSpreadsheet className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <FileText        className="w-4 h-4 text-red-400       flex-shrink-0" />
                }
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{r.title}</span>
                <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                <span className={`badge text-xs ${r.report_type === 'excel' ? 'badge-green' : 'badge-red'}`}>
                  {r.report_type.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
