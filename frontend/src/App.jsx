import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import InterviewNew from './pages/InterviewNew'
import InterviewRoom from './pages/InterviewRoom'
import JdAnalysis from './pages/JdAnalysis'
import Landing from './pages/Landing'
import Login from './pages/Login'
import PrepPlan from './pages/PrepPlan'
import Resume from './pages/Resume'
import SkillGap from './pages/SkillGap'
import ReportPage from './pages/ReportPage'
import Interviews from './pages/Interviews'
import Progress from './pages/Progress'
import Settings from './pages/Settings'

import QuestionBank from './pages/QuestionBank'
   
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* full-screen interview: sidebar nahi, focus ke liye */}
        <Route
          path="/interview/:id"
          element={
            <ProtectedRoute>
              <InterviewRoom />
            </ProtectedRoute>
          }
        />

        {/* baaki logged-in pages: sidebar layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/interview/new" element={<InterviewNew />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/jd-analysis" element={<JdAnalysis />} />
          <Route path="/skill-gap" element={<SkillGap />} />
          <Route path="/prep-plan" element={<PrepPlan />} />
          <Route path="/interviews/:id/report" element={<ReportPage />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/reports" element={<Progress />} />
          <Route path="/settings" element={<Settings />} /> 
          <Route path="/question-bank" element={<QuestionBank />} />         
        </Route>

        <Route
          path="*"
          element={<div className="grid min-h-screen place-items-center text-slate-500">Coming soon</div>}
        />
      </Routes>
    </AuthProvider>
  )
}