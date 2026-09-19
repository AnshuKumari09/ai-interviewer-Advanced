import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Lightbulb, Star, Target, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { displayName } from '../lib/utils'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'
}

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const EMPTY = { total_interviews: 0, avg_score: 0, improvement: 0, skills_tracked: 0, recent: [] }

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/dashboard').then(setData).catch((e) => setError(e.message))
  }, [])

  const d = data ?? EMPTY
  const cards = [
    { label: 'Total Interviews', value: d.total_interviews, icon: ClipboardList, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Avg. Score', value: `${d.avg_score}%`, icon: Star, tone: 'bg-emerald-50 text-emerald-600' },
    {
      label: 'Improvement',
      value: `${d.improvement >= 0 ? '+' : ''}${d.improvement}%`,
      icon: TrendingUp,
      tone: 'bg-violet-50 text-violet-600',
    },
    { label: 'Skills Tracked', value: d.skills_tracked, icon: Target, tone: 'bg-sky-50 text-sky-600' },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">
        {greeting()}, {displayName(user?.email).split(' ')[0]}! 👋
      </h1>
      <p className="mt-1 text-sm text-slate-500">Here&apos;s your interview preparation overview</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>
              <Icon size={18} />
            </span>
            <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* recent interviews */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Interviews</h2>
            <Link to="/interviews" className="text-xs font-semibold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>

          {d.recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No interviews yet. Start your first mock interview!
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {d.recent.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{i.title}</div>
                    <div className="text-xs capitalize text-slate-500">
                      {i.status}
                      {i.score != null && ` • ${i.score}%`}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{fmtDate(i.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* tip */}
        <section className="rounded-xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-violet-50 p-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-amber-500 shadow-sm">
            <Lightbulb size={18} />
          </span>
          <h2 className="mt-3 font-semibold text-slate-900">Today&apos;s Tip</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Focus on explaining your projects in depth. Be ready to discuss the technologies, challenges and
            your learnings.
          </p>
          <Link
            to="/interview/new"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Start Interview
          </Link>
        </section>
      </div>
    </div>
  )
}