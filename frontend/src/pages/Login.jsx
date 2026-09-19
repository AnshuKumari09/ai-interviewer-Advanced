import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

export default function Login() {
  const { user, loading: authLoading, login, signup } = useAuth()
  const [params, setParams] = useSearchParams()
  const isSignup = params.get('tab') === 'signup'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (!authLoading && user) return <Navigate to="/dashboard" replace />

  const setTab = (tab) => {
    setError('')
    setInfo('')
    setParams(tab === 'signup' ? { tab } : {})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const data = isSignup ? await signup(email, password) : await login(email, password)
      if (data?.needs_confirmation) setInfo('Check your email to confirm your account.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleOAuth = () => setError('Google/GitHub login abhi available nahi hai. Email se login karo.')

  return (
    <div className="grid min-h-screen place-items-center bg-linear-to-br from-indigo-50 via-white to-violet-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white bg-white/80 p-8 shadow-xl shadow-indigo-100 backdrop-blur">
        <Logo className="justify-center" />

        <h1 className="mt-6 text-center text-2xl font-bold text-slate-900">
          {isSignup ? 'Create your account' : 'Welcome back!'}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          {isSignup ? 'Sign up to start your interview journey' : 'Sign in to continue to your interview journey'}
        </p>

        {/* tabs */}
        <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
          {['login', 'signup'].map((t) => {
            const active = (t === 'signup') === isSignup
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-md py-2 ${active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                {t === 'login' ? 'Login' : 'Sign Up'}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Password</label>
              {!isSignup && (
                <button type="button" className="text-xs font-medium text-indigo-600 hover:underline">
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={inputCls}
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          {info && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? 'Please wait...' : isSignup ? 'Create account' : 'Login'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Or continue with
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <GoogleIcon /> Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('github')}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <GithubIcon /> GitHub
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => setTab(isSignup ? 'login' : 'signup')}
            className="font-semibold text-indigo-600 hover:underline"
          >
            {isSignup ? 'Login' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}