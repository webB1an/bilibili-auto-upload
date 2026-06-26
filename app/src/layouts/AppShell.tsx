import { NavLink, Outlet } from 'react-router-dom'
import { BridgeGuard } from '@/components/BridgeGuard'
import { StartupNotice } from '@/components/StartupNotice'

const navItems = [
  { to: '/', label: '仪表盘', end: true },
  { to: '/onboarding', label: '首次设置' },
  { to: '/publish', label: '一键发布' },
  { to: '/queue', label: '发布队列' },
  { to: '/history', label: '任务历史' },
  { to: '/accounts', label: '账号与工具' },
  { to: '/settings', label: '系统设置' }
]

export function AppShell(): React.JSX.Element {
  return (
    <div className="flex h-full">
      <aside className="glass-panel relative z-10 flex w-64 shrink-0 flex-col border-r border-white/5 px-5 py-6">
        <div className="mb-8">
          <p className="font-display text-xs uppercase tracking-[0.24em] text-accent/80">Studio</p>
          <h1 className="font-display mt-1 text-2xl font-bold text-white">Wallpaper</h1>
          <p className="mt-2 text-sm text-white/50">动态壁纸自动化工作台</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'rounded-xl px-4 py-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-accent/15 text-accent shadow-glow'
                    : 'text-white/65 hover:bg-white/5 hover:text-white'
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 rounded-xl border border-white/5 bg-black/20 p-4 text-xs text-white/45">
          下载 → 百度分享 → wdbzk 入库 → B 站投稿
        </div>
      </aside>
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <BridgeGuard />
        <StartupNotice />
        <Outlet />
      </main>
    </div>
  )
}
