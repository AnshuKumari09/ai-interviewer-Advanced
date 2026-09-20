import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { nameOf } from '../lib/utils'

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500'

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function Msg({ ok, text }) {
  if (!text) return null
  return (
    <p className={`rounded-lg px-3 py-2 text-xs ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
      {text}
    </p>
  )
}

export default function Settings() {
  const { user, refresh } = useAuth()
  const [form, setForm] = useState({ email: '', full_name: '', target_role: '', bio: '' })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [profileMsg, setProfileMsg] = useState({ ok: true, text: '' })
  const [pwMsg, setPwMsg] = useState({ ok: true, text: '' })
  const [busy, setBusy] = useState('')

  useEffect(() => {
    api('/profile').then(setForm).catch((e) => setProfileMsg({ ok: false, text: e.message }))
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const saveProfile = async (e) => {
    e.preventDefault()
    setBusy('profile')
    setProfileMsg({ ok: true, text: '' })
    try {
      setForm(await api('/profile', { method: 'PUT', body: form }))
      await refresh() // sidebar me naya naam
      setProfileMsg({ ok: true, text: 'Profile updated' })
    } catch (err) {
      setProfileMsg({ ok: false, text: err.message })
    } finally {
      setBusy('')
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwMsg({ ok: true, text: '' })
    if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: 'New passwords do not match' })
    setBusy('pw')
    try {
      await api('/profile/password', { method: 'POST', body: { current_password: pw.current, new_password: pw.next } })
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg({ ok: true, text: 'Password updated' })
    } catch (err) {
      setPwMsg({ ok: false, text: err.message })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
              {nameOf(user).charAt(0)}
            </span>
            <div>
              <div className="font-semibold text-slate-900">{nameOf(user)}</div>
              <div className="text-xs text-slate-500">{form.email}</div>
            </div>
          </div>

          <Field label="Full Name">
            <input value={form.full_name} onChange={set('full_name')} placeholder="Your name" className={input} />
          </Field>
          <Field label="Email">
            <input value={form.email} disabled className={input} />
          </Field>
          <Field label="Target Role">
            <input value={form.target_role} onChange={set('target_role')} placeholder="e.g. Python Developer" className={input} />
          </Field>
          <Field label="About">
            <textarea value={form.bio} onChange={set('bio')} rows={3} placeholder="A short line about you" className={`${input} resize-none`} />
          </Field>

          <Msg {...profileMsg} />
          <button
            disabled={busy === 'profile'}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy === 'profile' ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <form onSubmit={changePassword} className="space-y-4 self-start rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Change Password</h2>
          <Field label="Current Password">
            <input type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={input} />
          </Field>
          <Field label="New Password">
            <input type="password" required minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={input} />
          </Field>
          <Field label="Confirm Password">
            <input type="password" required minLength={6} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className={input} />
          </Field>

          <Msg {...pwMsg} />
          <button
            disabled={busy === 'pw'}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy === 'pw' ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}