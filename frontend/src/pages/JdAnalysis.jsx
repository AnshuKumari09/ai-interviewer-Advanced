import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { pct, STATUS } from '../lib/skills'

function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  )
}

export default function JdAnalysis() {
  const [text, setText] = useState('')
  const [jd, setJd] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/jd').then((r) => r && setJd(r)).catch(() => {})
  }, [])

  const analyze = async () => {
    setError('')
    setBusy(true)
    try {
      setJd(await api('/jd', { method: 'POST', body: { text } }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const a = jd?.analysis
  const skills = a?.skills ?? []
  const count = (st) => skills.filter((s) => s.status === st).length
  const yours = [...skills].filter((s) => s.current > 0).sort((x, y) => y.current - x.current)
  const required = [...skills].sort((x, y) => y.required - x.required)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Job Description Analysis</h1>
      <p className="mt-1 text-sm text-slate-500">
        Paste a job description to analyze required skills and compare with your resume.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Paste the job description here... Example: We are looking for a Python Developer with experience in FastAPI, PostgreSQL and Docker."
          className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          onClick={analyze}
          disabled={busy || text.trim().length < 50}
          className="mt-3 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Analyzing... (10-20 sec)' : 'Analyze JD'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}{' '}
          {/resume/i.test(error) && (
            <Link to="/resume" className="font-semibold underline">
              Go to Resume Analysis
            </Link>
          )}
        </p>
      )}

      {a && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Resume vs Job Description</h2>
              <p className="text-sm text-slate-500">
                {jd.title} • See how your profile matches the job requirements
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="text-2xl font-bold text-indigo-600">{a.match_score}%</span>
              <span className="text-xs text-slate-500">Match score</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            {['matched', 'partial', 'missing'].map((st) => (
              <span key={st} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS[st].dot}`} />
                {STATUS[st].label} ({count(st)})
              </span>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Your Skills">
              {yours.length === 0 ? (
                <p className="text-sm text-slate-500">No matching skills found in your resume.</p>
              ) : (
                <ul className="space-y-2">
                  {yours.map((s) => (
                    <li key={s.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${STATUS[s.status].dot}`} />
                        {s.name}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[s.status].chip}`}>
                        {pct(s.current)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Required Skills (from JD)">
              <ul className="space-y-2">
                {required.map((s) => (
                  <li key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className={`h-2 w-2 rounded-full ${STATUS[s.status].dot}`} />
                      {s.name}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[s.status].chip}`}>
                      {STATUS[s.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Skill Gap Summary" className="bg-linear-to-br from-indigo-50 to-violet-50">
            <p className="text-sm leading-relaxed text-slate-600">{a.gap_summary}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/skill-gap"
                className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                Skill Gap Analysis
              </Link>
              <Link
                to="/prep-plan"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                View Personalized Plan
              </Link>
            </div>
          </Card>

          {a.interview_focus?.length > 0 && (
            <Card title="Interview Focus">
              <div className="flex flex-wrap gap-2">
                {a.interview_focus.map((t) => (
                  <span key={t} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                    {t}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}