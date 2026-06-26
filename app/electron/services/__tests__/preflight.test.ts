import { describe, expect, it } from 'vitest'
import { getRequiredPreflightIds } from '../preflight'

describe('getRequiredPreflightIds', () => {
  it('quick mode requires core account and tool steps only', () => {
    const ids = getRequiredPreflightIds('quick')
    expect(ids).toContain('bdpan')
    expect(ids).toContain('wdbzk')
    expect(ids).not.toContain('disk')
    expect(ids).not.toContain('duplicate')
  })

  it('full mode includes disk and download source but not preview-only steps', () => {
    const ids = getRequiredPreflightIds('full')
    expect(ids).toContain('disk')
    expect(ids).toContain('downloadSource')
    expect(ids).not.toContain('catalog')
    expect(ids).not.toContain('nextItem')
    expect(ids).not.toContain('duplicate')
  })
})
