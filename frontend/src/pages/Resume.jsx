import { useEffect, useRef, useState } from 'react'
import { Check, FileText, Lightbulb, Upload } from 'lucide-react'
import { api } from '../lib/api'

const MAX = 5 * 1024 * 1024

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  )
}

export default function Resume() {
  const inputRef = useRef(null)
  const [resume, setResume] = useState(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/resume').then((r) => r && setResume(r)).catch(() => {})
  }, [])

  const upload = async (file) => {
    setError('')
    if (!file) return
    if (!/\.(pdf|docx)$/i.test(file.name)) return setError('Only PDF or DOCX files are supported')
    if (file.size > MAX) return setError('File is too large (max 5MB)')

    const form = new FormData()
    form.append('file', file)
    setBusy(true)
    try {
      setResume(await api('/resume', { method: 'POST', body: form }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const a = resume?.analysis

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">Resume Analysis</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload your resume to get AI-powered insights about your skills, experience and improvement areas.
      </p>

      {/* upload */}
      <div
        onClick={() => !busy && inputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          if (!busy) upload(e.dataTransfer.files[0])
        }}
        className={`mt-6 cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          drag ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200 bg-white hover:bg-indigo-50/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            upload(e.target.files[0])
            e.target.value = ''
          }}
        />

        {busy ? (
          <div className="flex flex-col items-center gap-3">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm font-medium text-slate-700">Analyzing your resume...</p>
            <p className="text-xs text-slate-500">This usually takes 10-20 seconds</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-indigo-50 text-indigo-600">
              <Upload size={20} />
            </span>
            <p className="text-sm font-semibold text-slate-800">
              {resume ? 'Upload a new resume' : 'Upload Resume'}
            </p>
            <p className="text-xs text-slate-500">Drag &amp; drop your file here, or click to browse</p>
            <p className="text-xs text-slate-400">Supported formats: PDF, DOCX (Max 5MB)</p>
          </div>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* results */}
      {a && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FileText size={16} className="text-indigo-500" />
            <span className="font-medium text-slate-700">{resume.filename}</span>
            <span>• analyzed {new Date(resume.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          <Card title="Skills Extracted">
            <div className="flex flex-wrap gap-2">
              {a.skills?.map((s) => (
                <span key={s} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                  {s}
                </span>
              ))}
            </div>
          </Card>

          <Card title="Experience Summary">
            <p className="text-sm leading-relaxed text-slate-600">{a.experience_summary}</p>
          </Card>

          {a.projects?.length > 0 && (
            <Card title="Key Projects">
              <ul className="space-y-3">
                {a.projects.map((p) => (
                  <li key={p.name} className="text-sm">
                    <div className="font-medium text-slate-800">{p.name}</div>
                    <div className="text-slate-500">{p.description}</div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Strengths">
              <ul className="space-y-2">
                {a.strengths?.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-slate-600">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" /> {s}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Areas to Improve">
              <ul className="space-y-2">
                {a.improvements?.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-slate-600">
                    <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500" /> {s}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}