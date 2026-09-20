import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    setUser(await api('/auth/login', { method: 'POST', body: { email, password } }))
  }

  const signup = async (email, password) => {
    const data = await api('/auth/signup', { method: 'POST', body: { email, password } })
    if (data.needs_confirmation) return data
    setUser(data)
  }

  const signOut = async () => {
    await api('/auth/logout', { method: 'POST' })
    setUser(null)
  }
  const refresh = () => api('/auth/me').then(setUser).catch(() => {})

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)