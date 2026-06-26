import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ReadOnlyPath } from '@/components/ReadOnlyPath'
import { Input, TextArea } from '@/components/ui/Input'
import { WALLPAPER_SOURCES, toggleWallpaperSource } from '@/constants/wallpaperSources'
import { useBootstrap } from '@/hooks/usePipeline'
import { useAppStore } from '@/store/appStore'
import type { AppConfig, UpdateStatus } from '@/types'
import { getWallpaperStudio } from '@/lib/bridge'

export function Settings(): React.JSX.Element {
  useBootstrap()
  const { config, setConfig } = useAppStore()
  const [draft, setDraft] = useState<AppConfig | null>(null)
  const [saved, setSaved] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    if (config) setDraft(config)
  }, [config])

  useEffect(() => {
    void getWallpaperStudio()
      .updaterGetStatus()
      .then(setUpdateStatus)
      .catch(() => undefined)
  }, [])

  if (!draft) {
    return <div className="p-8 text-white/50">加载配置中...</div>
  }

  const update = (patch: Partial<AppConfig>): void => {
    setDraft({ ...draft, ...patch })
    setSaved(false)
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/45">Settings</p>
          <h2 className="font-display text-3xl font-bold text-white">系统设置</h2>
        </div>
        <Button
          onClick={() =>
            void window.wallpaperStudio.configSet(draft).then((next) => {
              setConfig(next)
              useAppStore.getState().invalidatePreflightCache()
              setSaved(true)
            })
          }
        >
          保存配置
        </Button>
      </header>

      {saved && <p className="mb-4 text-sm text-accent">配置已保存</p>}

      {updateStatus?.updateAvailable && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <p className="text-sm text-white/80">
            发现新版本 v{updateStatus.latestVersion}（当前 v{updateStatus.currentVersion}）
          </p>
          <Button
            variant="secondary"
            onClick={() =>
              void getWallpaperStudio().openExternal(
                updateStatus.releaseUrl ?? 'https://github.com/webB1an/bilibili-auto-upload/releases'
              )
            }
          >
            打开下载页
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-white/45">
        <span>当前版本 v{updateStatus?.currentVersion ?? '—'}</span>
        <Button
          variant="secondary"
          onClick={() =>
            void getWallpaperStudio()
              .updaterCheck(true)
              .then(setUpdateStatus)
          }
        >
          检查更新
        </Button>
        {updateStatus?.error && <span className="text-danger">{updateStatus.error}</span>}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="wdbzk 资源库 API">
          <div className="space-y-4">
            <Input
              label="API Base URL"
              value={draft.panControl.baseUrl}
              onChange={(e) => update({ panControl: { ...draft.panControl, baseUrl: e.target.value } })}
            />
            <Input
              label="API Token"
              value={draft.panControl.apiToken}
              onChange={(e) => update({ panControl: { ...draft.panControl, apiToken: e.target.value } })}
            />
            <Input
              label="分类 ID"
              type="number"
              value={draft.panControl.categoryId}
              onChange={(e) =>
                update({
                  panControl: { ...draft.panControl, categoryId: Number(e.target.value) || 61 }
                })
              }
            />
          </div>
        </Card>

        <Card title="百度网盘">
          <div className="space-y-4">
            <Input
              label="远程目录（相对 /apps/bdpan/）"
              value={draft.baidu.remoteBase}
              onChange={(e) => update({ baidu: { ...draft.baidu, remoteBase: e.target.value } })}
            />
            <ReadOnlyPath label="bdpan 可执行文件（自动）" value={draft.baidu.bdpanPath} />
            <Input
              label="分享有效期（天，0=永久）"
              type="number"
              value={draft.baidu.sharePeriodDays}
              onChange={(e) =>
                update({
                  baidu: { ...draft.baidu, sharePeriodDays: Number(e.target.value) || 0 }
                })
              }
            />
          </div>
        </Card>

        <Card title="Bilibili">
          <div className="space-y-4">
            <Input
              label="账号名 account_name"
              value={draft.bilibili.accountName}
              onChange={(e) =>
                update({ bilibili: { ...draft.bilibili, accountName: e.target.value } })
              }
            />
            <Input
              label="分区 tid"
              type="number"
              value={draft.bilibili.tid}
              onChange={(e) =>
                update({ bilibili: { ...draft.bilibili, tid: Number(e.target.value) || 138 } })
              }
            />
            <Input
              label="标签（逗号分隔）"
              value={draft.bilibili.tags.join(', ')}
              onChange={(e) =>
                update({
                  bilibili: {
                    ...draft.bilibili,
                    tags: e.target.value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                  }
                })
              }
            />
            <ReadOnlyPath label="B 站 CLI 目录（自动）" value={draft.bilibili.socialAutoUploadPath} />
            <TextArea
              label="投稿简介模板"
              value={draft.bilibili.descTemplate ?? ''}
              onChange={(e) =>
                update({
                  bilibili: { ...draft.bilibili, descTemplate: e.target.value }
                })
              }
            />
            <p className="text-xs text-white/40">
              可用变量：{'{title}'} 资源名、{'{bilibiliTitle}'} 完整 B 站标题、{'{shareLink}'} 网盘链接、
              {'{sharePwd}'} 提取码、{'{sharePwdLine}'} 提取码整行（无码时为空）、{'{detailUrl}'} 来源页、
              {'{source}'} 壁纸源
            </p>
          </div>
        </Card>

        <Card title="B 站 BGM 配乐">
          <div className="space-y-4">
            <Input
              label="曲库文件夹路径"
              value={draft.bgm.libraryPath}
              onChange={(e) => update({ bgm: { ...draft.bgm, libraryPath: e.target.value } })}
            />
            <p className="text-xs text-white/40">
              仅 B 站投稿使用配乐版本；上传百度仍用原视频。支持 mp3 / wav / flac / m4a / aac / ogg 等。
              曲库为空或 ffmpeg 不可用时自动改用原视频。
            </p>
            <div>
              <p className="mb-2 text-sm text-white/70">选曲方式</p>
              <div className="flex flex-wrap gap-4 text-sm text-white/75">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="bgm-mode"
                    checked={draft.bgm.selectionMode === 'random'}
                    onChange={() => update({ bgm: { ...draft.bgm, selectionMode: 'random' } })}
                  />
                  随机
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="bgm-mode"
                    checked={draft.bgm.selectionMode === 'sequential'}
                    onChange={() => update({ bgm: { ...draft.bgm, selectionMode: 'sequential' } })}
                  />
                  依次（状态持久化，重启后继续）
                </label>
              </div>
            </div>
            <Input
              label="整段 BGM 头尾淡入淡出（秒）"
              type="number"
              value={draft.bgm.fadeSeconds}
              onChange={(e) =>
                update({
                  bgm: {
                    ...draft.bgm,
                    fadeSeconds: Math.max(0.1, Number(e.target.value) || 2)
                  }
                })
              }
            />
          </div>
        </Card>

        <Card title="流水线">
          <div className="space-y-4">
            <div>
              <p className="mb-3 text-sm text-white/70">壁纸源（勾选启用）</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {WALLPAPER_SOURCES.map((source) => {
                  const enabled = draft.download.sources.includes(source.id)
                  const onlyEnabled = enabled && draft.download.sources.length === 1

                  return (
                    <label
                      key={source.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        enabled
                          ? 'border-accent/40 bg-accent/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/55'
                      } ${onlyEnabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-white/20'}`}
                      title={onlyEnabled ? '至少保留一个壁纸源' : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={onlyEnabled}
                        onChange={(e) =>
                          update({
                            download: {
                              ...draft.download,
                              sources: toggleWallpaperSource(
                                draft.download.sources,
                                source.id,
                                e.target.checked
                              )
                            }
                          })
                        }
                      />
                      <span>{source.label}</span>
                      <span className="ml-auto text-xs text-white/35">{source.id}</span>
                    </label>
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-white/40">
                流水线会按上表顺序依次尝试已启用的源；取消勾选后该源不会被下载。
              </p>
            </div>
            <label className="flex items-center gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={draft.pipeline.deleteLocalAfterSuccess}
                onChange={(e) =>
                  update({
                    pipeline: { ...draft.pipeline, deleteLocalAfterSuccess: e.target.checked }
                  })
                }
              />
              成功后删除本地 mp4
            </label>
            <label className="flex items-center gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={draft.pipeline.abortOnCatalogDuplicate ?? true}
                onChange={(e) =>
                  update({
                    pipeline: { ...draft.pipeline, abortOnCatalogDuplicate: e.target.checked }
                  })
                }
              />
              wallpaper.wdbzk.com 已有类似资源时中止发布
            </label>
            <Input
              label="最大文件大小 (MB)"
              type="number"
              value={draft.pipeline.maxFileSizeMb}
              onChange={(e) =>
                update({
                  pipeline: {
                    ...draft.pipeline,
                    maxFileSizeMb: Number(e.target.value) || 300
                  }
                })
              }
            />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Button variant="secondary" onClick={() => setShowAdvanced((value) => !value)}>
          {showAdvanced ? '收起高级路径设置' : '展开高级路径设置'}
        </Button>
        {showAdvanced && (
          <Card className="mt-4" title="高级路径" subtitle="仅在有自定义安装位置时修改">
            <div className="space-y-4">
              <Input
                label="bdpan 命令路径"
                value={draft.baidu.bdpanPath}
                onChange={(e) => update({ baidu: { ...draft.baidu, bdpanPath: e.target.value } })}
              />
              <Input
                label="B 站 CLI 目录"
                value={draft.bilibili.socialAutoUploadPath}
                onChange={(e) =>
                  update({
                    bilibili: { ...draft.bilibili, socialAutoUploadPath: e.target.value }
                  })
                }
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
