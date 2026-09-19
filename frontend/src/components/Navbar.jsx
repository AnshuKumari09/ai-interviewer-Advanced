import { Link } from 'react-router-dom'
import Logo from './Logo'

const links = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how' },
  { label: 'Pricing', href: '#pricing' },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden gap-8 text-sm font-medium text-slate-600 md:flex">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="hover:text-indigo-600">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Login
          </Link>
          <Link
            to="/login?tab=signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}