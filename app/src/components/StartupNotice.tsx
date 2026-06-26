import { useEffect, useState } from 'react'
import { getWallpaperStudio } from '@/lib/bridge'

export function StartupNotice(): React.JSX.Element | null {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void getWallpaperStudio()
      .startupConsumeNotice()
      .then((notice) => {
        if (notice?.message) {
          setMessage(notice.message)
        }
      })
      .catch(() => undefined)
  }, [])

  if (!message) return null

  return (
    <div className="relative z-20 border-b border-accent/20 bg-accent/10 px-6 py-3 text-sm text-white/80">
      <div className="flex items-center justify-between gap-4">
        <span>{message}</span>
        <button
          type="button"
          className="shrink-0 text-white/50 hover:text-white"
          onClick={() => setMessage(null)}
        >
          关闭
        </button>
      </div>
    </div>
  )
}
