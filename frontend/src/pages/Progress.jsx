import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Target } from 'lucide-react'
import { api } from '../lib/api'

const short = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

export default function Progress() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/progress').then(setData).catch((e) => setError(e.message))
  }, [])

  const trend = (data?.trend ?? []).map((t) => ({ label: short(t.date), score: t.score }))

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Your Career Progress</h1>
      <p className="mt-1 text-sm text-slate-500">Track your improvement and stay on top of your goals.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="mt-8 text-sm text-slate-500">Loading...</p>}

      {data && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Interview Score Trend</h2>
              <Link to="/interviews" className="text-xs font-semibold text-indigo-600 hover:underline">
                All interviews
              </Link>
            </div>
            {trend.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">
                Complete an interview to see your score trend.
              </p>
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Top Skills</h2>
            {data.top_skills.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                <Link to="/jd-analysis" className="font-semibold text-indigo-600 hover:underline">
                  Analyze a job description
                </Link>{' '}
                to see your skill levels.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {data.top_skills.map((s) => (
                  <li key={s.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <span className="text-slate-500">{Number(s.level).toFixed(1)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${s.level * 10}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.next_goal && (
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-violet-50 p-5 lg:col-span-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-indigo-600 shadow-sm">
                  <Target size={20} />
                </span>
                <div>
                  <div className="text-xs font-semibold text-indigo-600">Next Goal</div>
                  <div className="text-sm font-medium text-slate-800">{data.next_goal}</div>
                </div>
              </div>
              <Link
                to="/prep-plan"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                View Learning Plan
              </Link>
            </section>
          )}
        </div>
      )}
    </div>
  )
}