import { Button } from '@/components/ui/Button'

interface ReadOnlyPathProps {
  label: string
  value: string
}

function resolveOpenPath(value: string): string {
  if (/\.(exe|cmd|bat)$/i.test(value)) {
    const index = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'))
    return index >= 0 ? value.slice(0, index) : value
  }
  return value
}

export function ReadOnlyPath({ label, value }: ReadOnlyPathProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <label className="text-sm text-white/55">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        <code className="flex-1 break-all rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-xs text-white/70">
          {value || '—'}
        </code>
        {value && (
          <Button
            variant="secondary"
            className="shrink-0"
            onClick={() => void window.wallpaperStudio.shellOpenPath(resolveOpenPath(value))}
          >
            打开目录
          </Button>
        )}
      </div>
    </div>
  )
}
