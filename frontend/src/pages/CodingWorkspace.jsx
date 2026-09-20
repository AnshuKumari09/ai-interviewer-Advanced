import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, Loader2, Play, XCircle } from 'lucide-react'
import { api } from '../lib/api'
import { runInWorker } from '../lib/runner'

const LANGS = [
  { key: 'python', label: 'Python' },
  { key: 'javascript', label: 'JavaScript' },
]

export default function CodingWorkspace() {
  const { slug } = useParams()
  const [problem, setProblem] = useState(null)
  const [error, setError] = useState('')

  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('') // loading messages from Pyodide, etc.
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState([]) // one entry per test, filled in as they arrive
  const [feedback, setFeedback] = useState('')
  const cancelRef = useRef(null)

  useEffect(() => {
    api(`/coding-problems/${slug}`)
      .then((p) => {
        setProblem(p)
        setCode(p.starter_code[language] || '')
      })
      .catch((e) => setError(e.message))
    return () => cancelRef.current?.()
  }, [slug])

  const switchLanguage = (lang) => {
    setLanguage(lang)
    // only reset to starter code if the user hasn't started editing this language yet
    setCode(problem.starter_code[lang] || '')
    setResults([])
    setFeedback('')
  }

  const run = () => {
    if (!problem || running) return
    setRunning(true)
    setResults(problem.tests.map(() => ({ status: 'pending' })))
    setStatus('')
    setFeedback('')
    setError('')

    cancelRef.current = runInWorker(
      { language, code, func: problem.function_name, tests: problem.tests },
      {
        onStatus: setStatus,
        onLoaded: () => setStatus(''),
        onResult: (m) => {
          setResults((prev) => {
            const next = [...prev]
            next[m.index] = m
            return next
          })
        },
        onCompileError: (message) => {
          setError(message)
          setRunning(false)
        },
        onFatal: (message) => {
          setError(message)
          setRunning(false)
        },
        onDone: async () => {
          setRunning(false)
          setResults((prev) => {
            const allPassed = prev.length > 0 && prev.every((r) => r.status === 'passed')
            if (allPassed) {
              api(`/coding-problems/${slug}/complete?language=${language}`, { method: 'POST' }).catch(() => {})
              requestFeedback(true, null)
            } else {
              const firstFail = prev.find((r) => r.status !== 'passed')
              requestFeedback(false, firstFail?.error || 'One or more test cases did not match the expected output.')
            }
            return prev
          })
        },
      }
    )
  }

  const requestFeedback = async (passed, failingOutput) => {
    try {
      const res = await api(`/coding-problems/${slug}/feedback`, {
        method: 'POST',
        body: { code, language, passed, failing_output: failingOutput },
      })
      setFeedback(res.feedback)
    } catch {
      // feedback is a nice-to-have; silently skip if it fails
    }
  }

  if (error && !problem) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        <Link to="/coding-workspace" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to problems
        </Link>
      </div>
    )
  }

  if (!problem) return <p className="text-sm text-slate-500">Loading...</p>

  const passedCount = results.filter((r) => r.status === 'passed').length

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
      {/* left: problem */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link to="/coding-workspace" className="mb-4 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
          <ChevronLeft size={14} /> All problems
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{problem.title}</h1>
        <div className="mt-1 flex gap-3 text-xs text-slate-500">
          <span>{problem.topic}</span>
          <span>{problem.difficulty}</span>
        </div>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">{problem.description}</p>

        {problem.examples?.length > 0 && (
          <div className="mt-5 space-y-3">
            {problem.examples.map((ex, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-3 font-mono text-xs">
                <div><span className="text-slate-400">Input:</span> {ex.input}</div>
                <div><span className="text-slate-400">Output:</span> {ex.output}</div>
                {ex.explanation && <div className="mt-1 text-slate-500">{ex.explanation}</div>}
              </div>
            ))}
          </div>
        )}

        {problem.constraints?.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">Constraints</h3>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500">
              {problem.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* right: editor */}
      <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <div className="flex gap-1">
            {LANGS.map((l) => (
              <button
                key={l.key}
                onClick={() => switchLanguage(l.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  language === l.key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            onClick={run}
            disabled={running}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? 'Running...' : 'Run'}
          </button>
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="h-72 w-full resize-none bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none"
        />

        <div className="flex-1 overflow-y-auto p-4">
          {status && <p className="mb-3 text-xs text-slate-500">{status}</p>}
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          {results.length > 0 && (
            <>
              <div className="mb-2 text-xs font-medium text-slate-500">
                {passedCount} / {results.length} test cases passed
              </div>
              <ul className="space-y-1.5">
                {results.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    {r.status === 'pending' && <Loader2 size={14} className="animate-spin text-slate-400" />}
                    {r.status === 'passed' && <CheckCircle2 size={14} className="text-emerald-500" />}
                    {(r.status === 'failed' || r.status === 'error') && <XCircle size={14} className="text-red-500" />}
                    <span className="font-medium text-slate-700">Test {i + 1}</span>
                    {r.error && <span className="truncate text-red-500">{r.error}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {feedback && (
            <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-relaxed text-slate-700">
              <div className="mb-1 font-semibold text-indigo-600">AI Feedback</div>
              {feedback}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}