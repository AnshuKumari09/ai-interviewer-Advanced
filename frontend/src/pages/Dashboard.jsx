import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard 🚀</h1>
        <p className="mt-2 text-sm text-slate-500">{user?.email}</p>
        <button
          onClick={signOut}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Logout
        </button>
      </div>
    </div>
  )
}