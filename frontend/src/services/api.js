import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.error('VITE_API_URL not set in production build!')
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ──────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle 401 / token refresh ─────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          })
          const newToken = data.data.access_token
          localStorage.setItem('access_token', newToken)
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/Commerce-Dashboard/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/Commerce-Dashboard/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
}

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardAPI = {
  get: (params) => api.get('/dashboard', { params }),
}

// ── Sales ─────────────────────────────────────────────────────
export const salesAPI = {
  getTrend: (params) => api.get('/sales', { params }),
}

// ── Products ──────────────────────────────────────────────────
export const productsAPI = {
  get: (params) => api.get('/products', { params }),
}

// ── Customers ─────────────────────────────────────────────────
export const customersAPI = {
  get: (params) => api.get('/customers', { params }),
}

// ── Profit ────────────────────────────────────────────────────
export const profitAPI = {
  get: (params) => api.get('/profit', { params }),
}

// ── Regions ───────────────────────────────────────────────────
export const regionsAPI = {
  get: (params) => api.get('/regions', { params }),
}

// ── Forecast ──────────────────────────────────────────────────
export const forecastAPI = {
  get: (params) => api.get('/forecast', { params }),
}

// ── Upload ────────────────────────────────────────────────────
export const uploadAPI = {
  uploadFile: (formData, onProgress) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  getBatches: (params) => api.get('/upload/batches', { params }),
}

// ── Reports ───────────────────────────────────────────────────
export const reportsAPI = {
  downloadExcel: (params) =>
    api.get('/reports/excel', { params, responseType: 'blob' }),
  downloadPdf: (params) =>
    api.get('/reports/pdf', { params, responseType: 'blob' }),
  getHistory: () => api.get('/reports/history'),
}

// ── Filters ───────────────────────────────────────────────────
export const filtersAPI = {
  get: () => api.get('/filters'),
}

export default api
