import { getBridgeErrorMessage } from '@/lib/bridge'

export function BridgeGuard(): React.JSX.Element | null {
  const error = getBridgeErrorMessage()
  if (!error) return null

  return (
    <div className="border-b border-danger/30 bg-danger/10 px-6 py-3 text-sm text-danger">
      {error}
    </div>
  )
}
