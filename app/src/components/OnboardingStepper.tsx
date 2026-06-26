interface OnboardingStepperProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

const STEPS = [
  { id: 1, label: '安装工具', hint: 'bdpan · B 站 CLI · Python' },
  { id: 2, label: '登录账号', hint: '百度网盘 · B 站' },
  { id: 3, label: 'wdbzk 配置', hint: 'API Token' },
  { id: 4, label: '完成', hint: '就绪检查' }
]

export function OnboardingStepper({
  currentStep,
  onStepClick
}: OnboardingStepperProps): React.JSX.Element {
  return (
    <ol className="mb-8 flex flex-wrap gap-3">
      {STEPS.map((step) => {
        const active = step.id === currentStep
        const done = step.id < currentStep
        return (
          <li key={step.id}>
            <button
              type="button"
              disabled={!onStepClick}
              onClick={() => onStepClick?.(step.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                active
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : done
                    ? 'border-accent/20 bg-accent/5 text-white/75'
                    : 'border-white/8 bg-white/5 text-white/40'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.16em] opacity-70">Step {step.id}</p>
              <p className="mt-1 text-sm font-semibold">{step.label}</p>
              <p className="mt-0.5 text-xs opacity-70">{step.hint}</p>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function stepOk(
  result: { steps: Array<{ id: string; ok: boolean }> } | null,
  ids: string[]
): boolean {
  if (!result) return false
  return ids.every((id) => result.steps.find((step) => step.id === id)?.ok)
}

export function deriveOnboardingStep(
  result: { steps: Array<{ id: string; ok: boolean }>; ready: boolean } | null
): number {
  if (!result) return 1
  if (result.ready) return 4
  if (!stepOk(result, ['bdpan', 'bilibiliCli', 'python', 'pythonRequests'])) return 1
  if (!stepOk(result, ['baidu', 'bilibili'])) return 2
  if (!stepOk(result, ['wdbzk'])) return 3
  return 4
}
