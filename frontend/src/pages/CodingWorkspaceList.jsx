import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Circle } from 'lucide-react'
import { api } from '../lib/api'

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard']

const DIFFICULTY_TEXT = {
  Easy: 'text-emerald-600',
  Medium: 'text-amber-600',
  Hard: 'text-red-600',
}

export default function CodingWorkspaceList() {
  const [problems, setProblems] = useState(null)
  const [difficulty, setDifficulty] = useState('All')
  const [error, setError] = useState('')

  useEffect(() => {
    const params = difficulty !== 'All' ? `?difficulty=${difficulty}` : ''
    api(`/coding-problems${params}`).then(setProblems).catch((e) => setError(e.message))
  }, [difficulty])

  const solvedCount = problems?.filter((p) => p.solved).length ?? 0

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coding Interview Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Solve real coding problems with instant feedback and test cases</p>
        </div>
        {problems && (
          <span className="text-xs font-medium text-slate-500">
            {solvedCount} of {problems.length} solved
          </span>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              difficulty === d ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {problems === null ? (
          <p className="p-10 text-center text-sm text-slate-500">Loading...</p>
        ) : problems.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No problems found.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {problems.map((p) => (
              <li key={p.id}>
                <Link to={`/coding-workspace/${p.slug}`} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50">
                  {p.solved ? (
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                  ) : (
                    <Circle size={18} className="shrink-0 text-slate-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{p.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{p.topic}</div>
                  </div>
                  <span className={`text-xs font-medium ${DIFFICULTY_TEXT[p.difficulty] || ''}`}>{p.difficulty}</span>
                  <ChevronRight size={16} className="shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}