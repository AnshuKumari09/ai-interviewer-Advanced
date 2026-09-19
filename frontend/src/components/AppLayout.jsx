import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="min-h-screen p-6 md:ml-60 md:p-8" print:ml-0 print:p-0>
        <Outlet />
      </main>
    </div>
  )
}