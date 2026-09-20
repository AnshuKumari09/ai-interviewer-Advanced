import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'in_progress', label: 'In Progress' },
]
const CHIP = {
  completed: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-500',
}
const LABEL = { completed: 'Completed', in_progress: 'In Progress', cancelled: 'Cancelled' }
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const scoreColor = (s) => (s >= 70 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-red-600')

export default function Interviews() {
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/interviews').then(setRows).catch((e) => setError(e.message))
  }, [])

  const shown = (rows ?? []).filter((r) => tab === 'all' || r.status === tab)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">My Interviews</h1>
      <p className="mt-1 text-sm text-slate-500">All your mock interviews in one place.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows === null && !error && <p className="p-8 text-center text-sm text-slate-500">Loading...</p>}
        {rows && shown.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            Nothing here yet.{' '}
            <Link to="/interview/new" className="font-semibold text-indigo-600 hover:underline">
              Start an interview
            </Link>
          </p>
        )}
        {shown.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Role / Type</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 font-medium text-slate-800">{r.title}</td>
                  <td className="px-5 py-3 text-slate-500">{fmt(r.created_at)}</td>
                  <td className={`px-5 py-3 font-semibold ${r.score != null ? scoreColor(r.score) : 'text-slate-400'}`}>
                    {r.score != null ? `${r.score}%` : '-'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CHIP[r.status] ?? CHIP.cancelled}`}>
                      {LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.status === 'completed' && (
                      <Link to={`/interviews/${r.id}/report`} className="text-xs font-semibold text-indigo-600 hover:underline">
                        View Report
                      </Link>
                    )}
                    {r.status === 'in_progress' && (
                      <Link to={`/interview/${r.id}`} className="text-xs font-semibold text-indigo-600 hover:underline">
                        Continue
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}