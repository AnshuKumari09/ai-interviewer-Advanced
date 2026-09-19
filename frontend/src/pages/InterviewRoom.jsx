import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bot, Mic, MicOff, Send } from 'lucide-react'
import Robot from '../components/Robot'
import { useVoice } from '../hooks/useVoice'
import { api } from '../lib/api'

const LABELS = {
  connecting: 'Starting voice...',
  listening: 'Listening... speak now',
  thinking: 'Thinking...',
  speaking: 'AI is speaking...',
}

export default function InterviewRoom() {
  const { id } = useParams()
  const nav = useNavigate()
  const [iv, setIv] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  const voice = useVoice(id, {
    onFinal: (t) => setIv((p) => ({ ...p, transcript: [...p.transcript, { role: 'candidate', text: t }] })),
    // AI ka jawab sentence-by-sentence aata hai, ek message me jodte hain
    onAiText: (t) =>
      setIv((p) => {
        const tr = [...p.transcript]
        const last = tr[tr.length - 1]
        if (last?.role === 'ai' && last.live) tr[tr.length - 1] = { ...last, text: `${last.text} ${t}` }
        else tr.push({ role: 'ai', text: t, live: true })
        return { ...p, transcript: tr }
      }),
    onTurnEnd: () => setIv((p) => ({ ...p, transcript: p.transcript.map((m) => ({ ...m, live: false })) })),
    onWarning: (msg) => setError(msg),
    onError: (msg) => {
      setError(msg)
      api(`/interviews/${id}`).then(setIv).catch(() => {}) // server ke saath transcript sync
    },
  })

  useEffect(() => {
    api(`/interviews/${id}`).then(setIv).catch((e) => setError(e.message))
  }, [id])

  const transcript = iv?.transcript ?? []
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript.length, transcript[transcript.length - 1]?.text, sending])

  const total = iv?.config?.total_questions ?? 0
  const answered = transcript.filter((m) => m.role === 'candidate').length
  const done = !!iv && (iv.status !== 'in_progress' || answered >= total)
  const lastAi = [...transcript].reverse().find((m) => m.role === 'ai')
  const voiceOn = voice.state !== 'idle'

  const send = async () => {
    const answer = text.trim()
    if (!answer || sending || done || voiceOn) return
    setError('')
    setSending(true)
    setText('')
    setIv((p) => ({ ...p, transcript: [...p.transcript, { role: 'candidate', text: answer }] }))
    try {
      const r = await api(`/interviews/${id}/answer`, { method: 'POST', body: { text: answer } })
      setIv((p) => ({ ...p, transcript: [...p.transcript, { role: 'ai', text: r.reply }] }))
    } catch (e) {
      setIv((p) => ({ ...p, transcript: p.transcript.slice(0, -1) }))
      setText(answer)
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const finish = async () => {
    voice.stop()
    const r = await api(`/interviews/${id}/end`, { method: 'POST' }).catch(() => null)
    nav(r?.status === 'completed' ? `/interviews/${id}/report` : '/dashboard')
  }

  if (!iv) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
        {error ? (
          <div className="text-center">
            <p className="text-sm text-red-400">{error}</p>
            <Link to="/dashboard" className="mt-3 inline-block text-sm text-indigo-400 underline">
              Back to dashboard
            </Link>
          </div>
        ) : (
          'Loading...'
        )}
      </div>
    )
  }

  const status = done
    ? 'Interview complete'
    : LABELS[voice.state] ?? (sending ? 'Thinking...' : 'Type your answer or tap the mic')

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600">
            <Bot size={18} />
          </span>
          AI Interviewer
        </div>
        <div className="hidden text-sm text-slate-300 md:block">{iv.title}</div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">
            Question {Math.min(answered + 1, total)} of {total}
          </span>
          <button onClick={finish} className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold hover:bg-red-700">
            {done ? 'View Report' : 'End Interview'}
          </button>
        </div>
      </header>

      <main className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
        <section className="flex flex-col items-center justify-center overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
          <div className="grid h-40 w-40 place-items-center rounded-full bg-indigo-500/15">
            <Robot className={`h-32 w-28 ${voice.state === 'speaking' || sending ? 'animate-pulse' : ''}`} />
          </div>
          <div className="mt-4 text-sm font-semibold">AI Interviewer</div>
          <div className="mt-1 text-xs text-indigo-300">{status}</div>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-100">{lastAi?.text}</p>
          {voice.partial && <p className="mt-4 text-sm italic text-emerald-300">You: {voice.partial}</p>}
        </section>

        <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-900">
          <h2 className="border-b border-white/10 px-5 py-3 text-sm font-semibold">Live Transcript</h2>
          <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm leading-relaxed">
            {transcript.map((m, i) => (
              <p key={i}>
                <span className={`mr-2 font-semibold ${m.role === 'ai' ? 'text-indigo-300' : 'text-emerald-300'}`}>
                  {m.role === 'ai' ? 'AI:' : 'You:'}
                </span>
                <span className="text-slate-200">{m.text}</span>
              </p>
            ))}
            <div ref={endRef} />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 p-4">
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        {done ? (
          <div className="text-center">
            <button onClick={finish} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold hover:bg-indigo-700">
              View Report
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl items-end gap-3">
            <button
              onClick={voiceOn ? voice.stop : voice.start}
              title={voiceOn ? 'Stop voice mode' : 'Start voice mode'}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                voiceOn ? 'animate-pulse bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {voiceOn ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && send()}
              disabled={voiceOn}
              rows={2}
              placeholder={voiceOn ? 'Voice mode is on, just speak...' : 'Type your answer... (Ctrl+Enter to send)'}
              className="flex-1 resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-indigo-500 disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={sending || voiceOn || !text.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}