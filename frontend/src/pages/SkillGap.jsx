import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'
import { CATEGORIES, insights, pct } from '../lib/skills'

function Bars({ skills }) {
  return (
    <ul className="space-y-4 py-4">
      {skills.map((s) => (
        <li key={s.name}>
          <div className="mb-1 flex justify-between text-xs text-slate-600">
            <span className="font-medium text-slate-800">{s.name}</span>
            <span>
              You {pct(s.current)} / Need {pct(s.required)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-pink-100">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: pct(s.current) }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function SkillGap() {
  const [jd, setJd] = useState(undefined) // undefined = loading, null = none
  const [tab, setTab] = useState('technical')

  useEffect(() => {
    api('/jd').then(setJd).catch(() => setJd(null))
  }, [])

  const skills = jd?.analysis?.skills ?? []
  const inTab = skills.filter((s) => s.category === tab)
  const { strongest, gaps } = insights(skills)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Skill Gap Analysis</h1>
      <p className="mt-1 text-sm text-slate-500">
        Based on your resume and target job role{jd?.title ? `: ${jd.title}` : ''}.
      </p>

      {jd === undefined && <p className="mt-10 text-sm text-slate-500">Loading...</p>}

      {jd === null && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-600">No analysis yet. Analyze a job description first.</p>
          <Link
            to="/jd-analysis"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to JD Analysis
          </Link>
        </div>
      )}

      {jd && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex gap-6 border-b border-slate-200 text-sm font-medium">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setTab(c.key)}
                  className={`-mb-px border-b-2 pb-3 ${
                    tab === c.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {inTab.length === 0 && (
              <p className="py-16 text-center text-sm text-slate-500">No skills in this category for this JD.</p>
            )}
            {inTab.length > 0 && inTab.length < 3 && <Bars skills={inTab} />}
            {inTab.length >= 3 && (
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={inTab} outerRadius="72%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar name="Your Skills" dataKey="current" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.35} />
                  <Radar name="Required Skills" dataKey="required" stroke="#ec4899" fill="#ec4899" fillOpacity={0.15} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Key Insights</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li>
                <div className="text-xs text-slate-500">Strongest Skill</div>
                <div className="font-medium text-emerald-600">
                  {strongest ? `${strongest.name} (${pct(strongest.current)})` : 'N/A'}
                </div>
              </li>
              <li>
                <div className="text-xs text-slate-500">Biggest Gap</div>
                <div className="font-medium text-red-600">
                  {gaps[0] ? `${gaps[0].name} (${pct(gaps[0].current)} of ${pct(gaps[0].required)})` : 'No gaps'}
                </div>
              </li>
              <li>
                <div className="text-xs text-slate-500">Improvement Required</div>
                <div className="font-medium text-amber-600">
                  {gaps[1] ? `${gaps[1].name} (${pct(gaps[1].current)} of ${pct(gaps[1].required)})` : 'None'}
                </div>
              </li>
            </ul>
            <Link
              to="/prep-plan"
              className="mt-6 block rounded-lg bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              View Personalized Plan
            </Link>
          </section>
        </div>
      )}
    </div>
  )
}