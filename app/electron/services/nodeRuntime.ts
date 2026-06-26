import { spawn } from 'child_process'

export function getNodeSpawnEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1'
  }
}

export function resolveNodeExecutable(): string {
  return process.execPath
}

export async function detectEmbeddedNode(): Promise<{ ok: boolean; message: string; version?: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--version'], {
      env: getNodeSpawnEnv(),
      windowsHide: true,
      shell: false
    })

    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      output += chunk.toString()
    })
    child.on('close', (code) => {
      const version = output.trim()
      if (code === 0 && version) {
        resolve({ ok: true, message: `内置 Node 就绪 (${version})`, version })
        return
      }
      resolve({ ok: false, message: version || '内置 Node 不可用' })
    })
    child.on('error', (error) => {
      resolve({ ok: false, message: error.message })
    })
  })
}
