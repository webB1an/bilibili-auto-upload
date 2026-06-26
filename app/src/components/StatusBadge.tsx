interface StatusBadgeProps {
  ok: boolean
  label: string
  detail?: string
}

export function StatusBadge({ ok, label, detail }: StatusBadgeProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${ok ? 'bg-accent shadow-[0_0_12px_rgba(45,212,191,0.8)]' : 'bg-danger'}`}
      />
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {detail && <p className="mt-1 text-xs text-white/45">{detail}</p>}
      </div>
    </div>
  )
}
