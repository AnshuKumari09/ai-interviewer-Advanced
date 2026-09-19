import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { api } from '../lib/api'

export default function PrepPlan() {
  const [data, setData] = useState(undefined) // undefined = loading, null = no plan yet
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(1)

  useEffect(() => {
    api('/plan').then(setData).catch(() => setData(null))
  }, [])

  const generate = async () => {
    setError('')
    setBusy(true)
    try {
      setData(await api('/plan', { method: 'POST' }))
      setOpen(1)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const days = data?.plan?.days ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your 7-Day Preparation Plan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Based on your resume and skill gap analysis{data?.plan?.role ? ` for ${data.plan.role}` : ''}
          </p>
        </div>
        {data && (
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {busy ? 'Generating...' : 'Regenerate'}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}{' '}
          {/job description/i.test(error) && (
            <Link to="/jd-analysis" className="font-semibold underline">
              Go to JD Analysis
            </Link>
          )}
        </p>
      )}

      {data === undefined && <p className="mt-10 text-sm text-slate-500">Loading...</p>}

      {data === null && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            No plan yet. We will build a 7-day plan from your latest job description analysis.
          </p>
          <button
            onClick={generate}
            disabled={busy}
            className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? 'Generating... (10-20 sec)' : 'Generate My Plan'}
          </button>
        </div>
      )}

      {days.length > 0 && (
        <>
          <ol className="relative mt-8 space-y-4 border-l-2 border-indigo-100 pl-8">
            {days.map((d) => {
              const isOpen = open === d.day
              return (
                <li key={d.day} className="relative">
                  <span className="absolute -left-[41px] top-5 h-4 w-4 rounded-full border-2 border-indigo-600 bg-white" />
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <button
                      onClick={() => setOpen(isOpen ? null : d.day)}
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-indigo-600">Day {d.day}</div>
                        <div className="text-sm font-semibold text-slate-900">{d.title}</div>
                        <div className="mt-1 text-xs text-slate-500">Focus: {d.focus}</div>
                      </div>
                      {d.questions > 0 && (
                        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          {d.questions} Questions
                        </span>
                      )}
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && d.tasks.length > 0 && (
                      <ul className="space-y-2 border-t border-slate-100 px-4 py-3">
                        {d.tasks.map((t) => (
                          <li key={t} className="flex gap-2 text-sm text-slate-600">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          <Link
            to="/interview/new"
            className="mt-8 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
          >
            Start Mock Interview
          </Link>
        </>
      )}
    </div>
  )
}