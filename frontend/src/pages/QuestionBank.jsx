import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bookmark, BookmarkCheck, Check, Code2, MessageCircle, Network, Puzzle, Search, Sparkles, Terminal,
} from 'lucide-react'
import { api } from '../lib/api'

const TABS = [
  { key: 'ai_generated', label: 'AI Generated' },
  { key: 'seeded', label: 'Popular' },
  { key: 'saved', label: 'Saved' },
]

const TOPICS = ['DSA', 'System Design', 'Behavioral', 'Coding', 'Problem Solving']
const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard']

const TOPIC_ICON = {
  DSA: Code2,
  'System Design': Network,
  Behavioral: MessageCircle,
  Coding: Terminal,
  'Problem Solving': Puzzle,
}

const DIFFICULTY_BAR = {
  Easy: 'border-l-emerald-500',
  Medium: 'border-l-amber-500',
  Hard: 'border-l-red-500',
}

const DIFFICULTY_TEXT = {
  Easy: 'text-emerald-600',
  Medium: 'text-amber-600',
  Hard: 'text-red-600',
}

function QuestionCard({ q, saved, done, onToggleSave, onToggleDone, onOpenWorkspace }) {
  const Icon = TOPIC_ICON[q.topic] || Code2
  const isCoding = q.topic === 'Coding'

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${
        DIFFICULTY_BAR[q.difficulty] || 'border-l-slate-300'
      } ${done ? 'opacity-60' : ''}`}
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-sm text-slate-800 ${done ? 'line-through decoration-slate-300' : ''}`}>{q.question_text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{q.topic}</span>
          <span className={`font-medium ${DIFFICULTY_TEXT[q.difficulty] || ''}`}>{q.difficulty}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {isCoding ? (
          <button
            onClick={() => onOpenWorkspace(q)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Open in Editor
          </button>
        ) : (
          <button
            onClick={() => onToggleDone(q)}
            title={done ? 'Mark as not done' : 'Mark as done'}
            className={`grid h-8 w-8 place-items-center rounded-lg border ${
              done ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-300 hover:text-slate-500'
            }`}
          >
            <Check size={16} />
          </button>
        )}
        <button
          onClick={() => onToggleSave(q)}
          title={saved ? 'Remove from saved' : 'Save question'}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-indigo-600"
        >
          {saved ? <BookmarkCheck size={16} className="text-indigo-600" /> : <Bookmark size={16} />}
        </button>
      </div>
    </div>
  )
}

export default function QuestionBank() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('ai_generated')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [topics, setTopics] = useState([])

  const [questions, setQuestions] = useState([])
  const [savedIds, setSavedIds] = useState(new Set())
  const [doneIds, setDoneIds] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [genRole, setGenRole] = useState('')
  const [genTopic, setGenTopic] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    api('/questions/saved').then((rows) => setSavedIds(new Set(rows.map((r) => r.id)))).catch(() => {})
    api('/questions/progress').then((ids) => setDoneIds(new Set(ids))).catch(() => {})
  }, [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'saved') {
        setQuestions(await api('/questions/saved'))
      } else {
        const params = new URLSearchParams({ source: tab })
        if (role) params.set('role', role)
        if (difficulty !== 'All') params.set('difficulty', difficulty)
        if (search) params.set('search', search)
        if (topics.length === 1) params.set('topic', topics[0])
        const rows = await api(`/questions?${params.toString()}`)
        setQuestions(topics.length > 1 ? rows.filter((q) => topics.includes(q.topic)) : rows)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, difficulty, topics])

  const toggleTopic = (t) => setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const toggleSave = async (q) => {
    const isSaved = savedIds.has(q.id)
    setSavedIds((prev) => {
      const next = new Set(prev)
      isSaved ? next.delete(q.id) : next.add(q.id)
      return next
    })
    try {
      await api(`/questions/${q.id}/save`, { method: isSaved ? 'DELETE' : 'POST' })
      if (tab === 'saved' && isSaved) setQuestions((prev) => prev.filter((x) => x.id !== q.id))
    } catch (e) {
      setError(e.message)
      setSavedIds((prev) => {
        const next = new Set(prev)
        isSaved ? next.add(q.id) : next.delete(q.id)
        return next
      })
    }
  }

  const toggleDone = async (q) => {
    const isDone = doneIds.has(q.id)
    setDoneIds((prev) => {
      const next = new Set(prev)
      isDone ? next.delete(q.id) : next.add(q.id)
      return next
    })
    try {
      await api(`/questions/${q.id}/progress`, { method: isDone ? 'DELETE' : 'POST' })
    } catch (e) {
      setError(e.message)
      setDoneIds((prev) => {
        const next = new Set(prev)
        isDone ? next.add(q.id) : next.delete(q.id)
        return next
      })
    }
  }

  // TODO: point this at your actual coding workspace route once confirmed —
  // this assumes it takes a question/problem id as a param.
  const openWorkspace = (q) => navigate(`/coding-workspace/${q.id}`)

  const generate = async () => {
    if (!genRole.trim()) {
      setError('Enter a target role to generate questions for')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const created = await api('/questions/generate', {
        method: 'POST',
        body: { role: genRole.trim(), topic: genTopic.trim() || null, difficulty: difficulty === 'All' ? 'Medium' : difficulty, count: 5 },
      })
      setQuestions((prev) => [...created, ...prev])
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const filteredBySearch = useMemo(() => {
    if (tab !== 'saved' || !search) return questions
    return questions.filter((q) => q.question_text.toLowerCase().includes(search.toLowerCase()))
  }, [questions, search, tab])

  const doneCount = filteredBySearch.filter((q) => doneIds.has(q.id)).length

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Question Bank</h1>
          <p className="mt-1 text-sm text-slate-500">Explore curated and AI-generated questions for your target role</p>
        </div>
        {filteredBySearch.length > 0 && (
          <span className="text-xs font-medium text-slate-500">
            {doneCount} of {filteredBySearch.length} done
          </span>
        )}
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search questions, topics or keywords..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onBlur={load}
          placeholder="Role (e.g. Software Engineer)"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
        />
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTopic(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                topics.includes(t) ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {tab === 'ai_generated' && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <Sparkles className="text-indigo-500" size={18} />
          <input
            value={genRole}
            onChange={(e) => setGenRole(e.target.value)}
            placeholder="Target role"
            className="min-w-40 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <input
            value={genTopic}
            onChange={(e) => setGenTopic(e.target.value)}
            placeholder="Topic (optional)"
            className="min-w-40 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            onClick={generate}
            disabled={generating}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate 5 Questions'}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading...</p>
        ) : filteredBySearch.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {tab === 'saved' ? 'No saved questions yet.' : 'No questions found — try different filters.'}
          </p>
        ) : (
          filteredBySearch.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              saved={savedIds.has(q.id)}
              done={doneIds.has(q.id)}
              onToggleSave={toggleSave}
              onToggleDone={toggleDone}
              onOpenWorkspace={openWorkspace}
            />
          ))
        )}
      </div>
    </div>
  )
}