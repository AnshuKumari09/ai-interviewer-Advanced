import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { api } from '../lib/api'

const fmt = (d) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const TABS = ['Strengths', 'Areas to Improve', 'Evidence', 'Recommended Learning']

function Ring({ value }) {
  const r = 52
  const c = 2 * Math.PI * r
  const color = value >= 70 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="text-3xl font-bold text-slate-900">{value}%</div>
        <div className="text-xs text-slate-500">Overall Score</div>
      </div>
    </div>
  )
}

function Chips({ items, cls }) {
  if (!items.length) return <p className="text-sm text-slate-500">Nothing to show.</p>
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span key={t} className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
          {t}
        </span>
      ))}
    </div>
  )
}

function Quote({ quote, note, label }) {
  return (
    <div className="rounded-lg border-l-4 border-indigo-300 bg-indigo-50/60 p-3 text-sm">
      {label && <div className="mb-1 text-xs font-semibold text-indigo-600">{label}</div>}
      <p className="italic text-slate-700">&ldquo;{quote}&rdquo;</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  )
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-slate-200 px-5 text-sm font-medium">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px shrink-0 border-b-2 py-3 ${
            active === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function ReportPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(TABS[0])
  const [cat, setCat] = useState('technical')
  const started = useRef(false)

  const generate = async (force = false) => {
    setError('')
    setBusy(true)
    try {
      setData(await api(`/reports/${id}${force ? '?force=true' : ''}`, { method: 'POST' }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (started.current) return // dev me StrictMode do baar chalata hai, LLM call ek hi baar
    started.current = true
    api(`/reports/${id}`)
      .then((d) => {
        setData(d)
        if (!d.report) generate()
      })
      .catch((e) => setError(e.message))
  }, [id])

  const r = data?.report

  if (!data) {
    return error ? (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
    ) : (
      <p className="text-sm text-slate-500">Loading...</p>
    )
  }

  if (!r) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        {error ? (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => generate()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Try again
              </button>
              <Link to="/dashboard" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
                Dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="mt-4 text-sm font-medium text-slate-700">Generating your report...</p>
            <p className="mt-1 text-xs text-slate-500">Analyzing your answers, this takes 15-30 seconds</p>
          </>
        )}
      </div>
    )
  }

  const cats = r.categories
  const active = cats.find((c) => c.key === cat) ?? cats[0]
  const evidence = cats.flatMap((c) => c.evidence.map((e) => ({ ...e, label: c.label })))

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.title} • {fmt(data.created_at)}
          </p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button
            onClick={() => generate(true)}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Download size={16} /> Download Report
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* score + categories */}
      <div className="mt-6 grid gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[auto_1fr]">
        <div className="mx-auto">
          <Ring value={r.overall_score} />
        </div>
        <ul className="space-y-3 self-center">
          {cats.map((c) => (
            <li key={c.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-700">{c.label}</span>
                <span className="font-semibold text-slate-900">{c.score}/10</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${c.score * 10}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">{r.summary}</p>
      {r.answered < r.planned && (
        <p className="mt-2 text-xs text-slate-400">
          Based on {r.answered} of {r.planned} questions answered.
        </p>
      )}

      {/* strengths / improve / evidence / learning */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs tabs={TABS.map((t) => ({ key: t, label: t }))} active={tab} onChange={setTab} />
        <div className="p-5">
          {tab === 'Strengths' && <Chips items={r.strengths} cls="bg-emerald-50 text-emerald-700" />}
          {tab === 'Areas to Improve' && <Chips items={r.improvements} cls="bg-amber-50 text-amber-700" />}
          {tab === 'Evidence' &&
            (evidence.length ? (
              <div className="space-y-3">
                {evidence.map((e, i) => (
                  <Quote key={i} {...e} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No direct quotes could be verified for this interview.</p>
            ))}
          {tab === 'Recommended Learning' &&
            (r.recommended_learning.length ? (
              <ul className="space-y-3">
                {r.recommended_learning.map((l) => (
                  <li key={l.topic} className="text-sm">
                    <div className="font-medium text-slate-800">{l.topic}</div>
                    <div className="text-slate-500">{l.why}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nothing to show.</p>
            ))}
        </div>
      </section>

      {/* detailed feedback */}
      <h2 className="mt-8 text-lg font-bold text-slate-900">Feedback Details</h2>
      <section className="mt-3 rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs tabs={cats.map((c) => ({ key: c.key, label: c.label }))} active={active.key} onChange={setCat} />
        <div className="space-y-5 p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold text-slate-900">{active.label}</h3>
            <span className="text-sm text-slate-500">
              Score: <b className="text-slate-900">{active.score}/10</b>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{active.feedback}</p>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Evidence</h4>
            {active.evidence.length ? (
              <div className="space-y-3">
                {active.evidence.map((e, i) => (
                  <Quote key={i} quote={e.quote} note={e.note} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No direct quote available for this category.</p>
            )}
          </div>

          {active.focus.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Recommended Focus</h4>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
                {active.focus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}