import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

export function OnboardingGate(): React.JSX.Element {
  const { config } = useAppStore()
  const location = useLocation()

  if (config && !config.onboarding?.completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
