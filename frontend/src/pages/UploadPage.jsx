import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2, Clock } from 'lucide-react'
import { uploadAPI } from '../services/api'
import { PageHeader, DataTable } from '../components/dashboard/UI'
import toast from 'react-hot-toast'

export default function UploadPage() {
  const [file, setFile]       = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [result, setResult]   = useState(null)
  const [batches, setBatches] = useState([])
  const [batchLoading, setBL] = useState(true)
  const inputRef = useRef()
  const dropRef  = useRef()

  const loadBatches = () => {
    setBL(true)
    uploadAPI.getBatches({ per_page: 10 })
      .then(r => setBatches(r.data.data?.batches || []))
      .catch(() => {})
      .finally(() => setBL(false))
  }

  useEffect(() => { loadBatches() }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) validateAndSet(f)
  }

  const validateAndSet = (f) => {
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Only CSV, XLSX, and XLS files are supported')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50 MB')
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    const fd = new FormData()
    fd.append('file', file)

    try {
      const { data } = await uploadAPI.uploadFile(fd, (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 90))
      })
      setProgress(100)
      setResult({ success: true, data: data.data })
      toast.success(`Imported ${data.data.import_result.imported} records!`)
      loadBatches()
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed'
      setResult({ success: false, error: msg })
      toast.error(msg)
    } finally {
      setUploading(false)
      setFile(null)
    }
  }

  const batchCols = [
    { key: 'file_name',     label: 'File' },
    { key: 'total_rows',    label: 'Total',    render: v => v?.toLocaleString(), align: 'right' },
    { key: 'imported_rows', label: 'Imported', render: v => <span className="text-emerald-600 font-medium">{v?.toLocaleString()}</span>, align: 'right' },
    { key: 'skipped_rows',  label: 'Skipped',  render: v => v > 0 ? <span className="text-amber-500">{v}</span> : <span className="text-slate-400">{v}</span>, align: 'right' },
    { key: 'status',        label: 'Status',   render: v => {
      const map = {
        completed:  <span className="badge-green"><CheckCircle className="w-3 h-3" /> Completed</span>,
        processing: <span className="badge-blue"><Loader2 className="w-3 h-3 animate-spin" /> Processing</span>,
        failed:     <span className="badge-red"><XCircle className="w-3 h-3" /> Failed</span>,
      }
      return map[v] || v
    }},
    { key: 'created_at', label: 'Uploaded', render: v => v ? new Date(v).toLocaleString() : '—' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Upload Commerce Data"
        subtitle="Import CSV or Excel files with order data"
      />

      {/* Required columns hint */}
      <div className="card p-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
        <div className="flex gap-3">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Required Columns</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1 font-mono">
              Order_ID · Order_Date · Customer_ID · Customer_Name · Product_ID · Product_Name ·
              Category · Quantity · Price · Cost · Revenue · Profit · Region · State · City · Payment_Method
            </p>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`card border-2 border-dashed p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors
          ${file
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
            : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={e => e.target.files[0] && validateAndSet(e.target.files[0])}
        />

        {file ? (
          <>
            <FileText className="w-12 h-12 text-blue-500" />
            <div className="text-center">
              <p className="font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-slate-400" />
            <div className="text-center">
              <p className="font-medium text-slate-600 dark:text-slate-300">Drop your file here</p>
              <p className="text-sm text-slate-400 mt-1">or click to browse — CSV, XLSX, XLS up to 50 MB</p>
            </div>
          </>
        )}
      </div>

      {/* Upload button + progress */}
      {file && (
        <div className="space-y-3">
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Uploading & processing…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                : <><Upload className="w-4 h-4" /> Upload & Import</>
              }
            </button>
            {!uploading && (
              <button onClick={() => { setFile(null); setResult(null) }} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`card p-5 border ${result.success ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10' : 'border-red-200 bg-red-50 dark:bg-red-900/10'}`}>
          <div className="flex items-start gap-3">
            {result.success
              ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              : <XCircle    className="w-5 h-5 text-red-500    flex-shrink-0 mt-0.5" />
            }
            <div className="space-y-2">
              <p className={`font-semibold ${result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                {result.success ? 'Import Successful' : 'Import Failed'}
              </p>
              {result.success && (
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p>✅ <strong>{result.data.import_result.imported}</strong> records imported</p>
                  {result.data.import_result.skipped > 0 && (
                    <p>⚠️ <strong>{result.data.import_result.skipped}</strong> records skipped (duplicates or invalid)</p>
                  )}
                  {result.data.clean_report?.issues?.map((issue, i) => (
                    <p key={i} className="text-xs text-slate-500">• {issue}</p>
                  ))}
                </div>
              )}
              {result.error && <p className="text-sm text-red-600">{result.error}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Upload history */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="section-title">Upload History</h3>
        </div>
        <DataTable
          columns={batchCols}
          rows={batches}
          loading={batchLoading}
          emptyMessage="No uploads yet"
        />
      </div>
    </div>
  )
}
