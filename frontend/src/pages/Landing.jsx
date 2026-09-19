import { Link } from 'react-router-dom'
import { Mic, Play, ShieldCheck } from 'lucide-react'
import Navbar from '../components/Navbar'
import Robot from '../components/Robot'

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '95%', label: 'Interview Success' },
  { value: '4.8/5', label: 'User Rating' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-violet-100 text-slate-900">
      <Navbar />

      <main id="home" className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        {/* Left */}
        <div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Your AI-Powered
            <br />
            Interview Coach &amp;
            <br />
            Career Assistant
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-600">
            Get personalized interviews, actionable feedback, skill gap analysis and career guidance — powered by AI.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/login?tab=signup"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
            >
              Start Interview
            </Link>
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Play size={16} className="text-indigo-600" /> Watch Demo
            </button>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            {stats.map((s) => (
              <div key={s.label} className="min-w-28 rounded-xl border border-slate-100 bg-white px-5 py-3 shadow-sm">
                <div className="text-lg font-bold text-indigo-600">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="relative mx-auto h-105 w-full max-w-md">
          <div className="absolute inset-0 m-auto h-72 w-72 rounded-full bg-indigo-300/40 blur-3xl" />

          <Robot className="animate-float absolute inset-0 m-auto h-80 w-72" />

          {/* speech bubble */}
          <div className="absolute right-2 top-4 rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-lg">
            Let&apos;s build your
            <br />
            dream career!
          </div>

          {/* shield card */}
          <div className="absolute right-0 top-1/2 grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-lg">
            <ShieldCheck className="text-indigo-500" />
          </div>

          {/* voice card */}
          <div className="absolute bottom-10 left-2 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-600 text-white">
              <Mic size={16} />
            </span>
            <div className="flex h-6 items-center gap-0.5">
              {[8, 16, 10, 22, 14, 20, 9, 15].map((h, i) => (
                <span key={i} className="w-1 rounded-full bg-indigo-400" style={{ height: h }} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}