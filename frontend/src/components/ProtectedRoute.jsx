import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="grid min-h-screen place-items-center text-slate-500">Loading...</div>
  }
  return user ? children : <Navigate to="/login" replace />
}