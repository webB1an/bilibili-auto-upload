let activeChildren: Array<{ kill: () => void }> = []

export function registerProcess(child: { kill: (signal?: NodeJS.Signals) => void }): void {
  activeChildren.push({
    kill: () => {
      try {
        child.kill('SIGTERM')
      } catch {
        // ignore
      }
    }
  })
}

export function killRegisteredProcesses(): void {
  activeChildren.forEach((child) => {
    try {
      child.kill()
    } catch {
      // ignore
    }
  })
  activeChildren = []
}

export function clearRegisteredProcesses(): void {
  activeChildren = []
}
