import { Bot } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">
        <Bot size={20} />
      </span>
      <span className="text-lg font-bold text-slate-900">AI Interviewer</span>
    </Link>
  )
}