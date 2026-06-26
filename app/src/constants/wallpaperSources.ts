export const WALLPAPER_SOURCES = [
  { id: 'wallpaperwaifu', label: 'WallpaperWaifu' },
  { id: 'moewalls', label: 'MoeWalls' },
  { id: 'desktophut', label: 'DesktopHut' },
  { id: 'motionbgs', label: 'MotionBGs' },
  { id: 'wallsflow', label: 'WallsFlow' },
  { id: 'wallpaperwaves', label: 'WallpaperWaves' }
] as const

export const WALLPAPER_SOURCE_IDS = WALLPAPER_SOURCES.map((source) => source.id)

export type WallpaperSourceId = (typeof WALLPAPER_SOURCES)[number]['id']

export function orderWallpaperSources(
  sources: string[],
  catalog: readonly string[] = WALLPAPER_SOURCE_IDS
): string[] {
  const enabled = new Set(sources.filter((source) => catalog.includes(source)))
  return catalog.filter((id) => enabled.has(id))
}

export function toggleWallpaperSource(
  sources: string[],
  sourceId: string,
  enabled: boolean,
  catalog: readonly string[] = WALLPAPER_SOURCE_IDS
): string[] {
  const next = enabled ? [...sources, sourceId] : sources.filter((source) => source !== sourceId)
  return orderWallpaperSources(next, catalog)
}
