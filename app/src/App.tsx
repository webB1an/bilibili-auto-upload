import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { OnboardingGate } from './components/OnboardingGate'
import { Dashboard } from './pages/Dashboard'
import { Publish } from './pages/Publish'
import { Accounts } from './pages/Accounts'
import { Settings } from './pages/Settings'
import { History } from './pages/History'
import { Queue } from './pages/Queue'
import { Onboarding } from './pages/Onboarding'

export default function App(): React.JSX.Element {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="onboarding" element={<Onboarding />} />
        <Route element={<OnboardingGate />}>
          <Route index element={<Dashboard />} />
          <Route path="publish" element={<Publish />} />
          <Route path="queue" element={<Queue />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="settings" element={<Settings />} />
          <Route path="history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
