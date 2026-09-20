import { NavLink } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { nameOf } from '../lib/utils'
import {
  Briefcase, ClipboardList, FileText, History, LayoutDashboard, LogOut, Mic, Settings, Target,
  BookOpen,
} from 'lucide-react'
const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/interview/new', label: 'Start Interview', icon: Mic },
  { to: '/interviews', label: 'My Interviews', icon: History },
  { to: '/question-bank', label: 'Question Bank', icon: BookOpen },
  { to: '/prep-plan', label: 'Prep Plan', icon: Lightbulb },
  { to: '/jd-analysis', label: 'JD Analysis', icon: Briefcase },
  { to: '/resume', label: 'Resume Analysis', icon: FileText },
  { to: '/skill-gap', label: 'Skill Gap', icon: Target },
  { to: '/reports', label: 'Reports', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const name = nameOf(user)

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex print:hidden">
      <div className="px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-slate-200 p-4">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
          {name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-800">{name}</div>
          <div className="text-xs text-slate-500">Candidate</div>
        </div>
        <button onClick={signOut} title="Logout" className="text-slate-400 hover:text-red-500">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  )
}