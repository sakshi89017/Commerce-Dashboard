import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await authAPI.me()
      setUser(data.data)
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials)
    localStorage.setItem('access_token',  data.data.access_token)
    localStorage.setItem('refresh_token', data.data.refresh_token)
    setUser(data.data.user)
    return data.data.user
  }

  const register = async (payload) => {
    const { data } = await authAPI.register(payload)
    localStorage.setItem('access_token',  data.data.access_token)
    localStorage.setItem('refresh_token', data.data.refresh_token)
    setUser(data.data.user)
    return data.data.user
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
