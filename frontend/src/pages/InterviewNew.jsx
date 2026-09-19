import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function InterviewNew() {
  const nav = useNavigate()
  const [role, setRole] = useState('')
  const [count, setCount] = useState(5)
  const [hasJd, setHasJd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/jd')
      .then((jd) => {
        if (jd) {
          setRole(jd.analysis?.role || jd.title || '')
          setHasJd(true)
        }
      })
      .catch(() => {})
  }, [])

  const start = async () => {
    setError('')
    setBusy(true)
    try {
      const iv = await api('/interviews', { method: 'POST', body: { role, num_questions: count } })
      nav(`/interview/${iv.id}`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">Start Interview</h1>
      <p className="mt-1 text-sm text-slate-500">
        A mock interview tailored to your resume and target role.
      </p>

      <div className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Target role</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Python Developer"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            {hasJd ? (
              'Questions will follow your latest job description and resume.'
            ) : (
              <>
                Tip: <Link to="/jd-analysis" className="font-medium text-indigo-600 hover:underline">analyze a job description</Link>{' '}
                for role-specific questions.
              </>
            )}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-slate-600">Number of questions</label>
          <div className="grid grid-cols-2 gap-3">
            {[5, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`rounded-lg border py-2.5 text-sm font-semibold ${
                  count === n
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {n} questions {n === 5 ? '(~5 min)' : '(~10 min)'}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        <button
          onClick={start}
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Preparing your interview...' : 'Start Interview'}
        </button>
      </div>
    </div>
  )
}