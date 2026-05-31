import { Routes, Route, Navigate } from 'react-router-dom'
import RecruiterApp from './pages/recruiter/RecruiterApp'
import CandidateInterview from './pages/recruiter/CandidateInterview'
import ApplyPage from './pages/ApplyPage'
import LandingPage from './pages/LandingPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/recruiter/*" element={<RecruiterApp />} />
      <Route path="/interview/:sessionId" element={<CandidateInterview />} />
      <Route path="/apply/:jobId" element={<ApplyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}