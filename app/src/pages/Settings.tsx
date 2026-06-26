import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, TextArea } from '@/components/ui/Input'
import { useBootstrap } from '@/hooks/usePipeline'
import { useAppStore } from '@/store/appStore'
import type { AppConfig } from '@/types'

export function Settings(): React.JSX.Element {
  useBootstrap()
  const { config, setConfig } = useAppStore()
  const [draft, setDraft] = useState<AppConfig | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (config) setDraft(config)
  }, [config])

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
              setSaved(true)
            })
          }
        >
          保存配置
        </Button>
      </header>

      {saved && <p className="mb-4 text-sm text-accent">配置已保存</p>}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="pan-control">
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
            <Input
              label="bdpan 命令路径"
              value={draft.baidu.bdpanPath}
              onChange={(e) => update({ baidu: { ...draft.baidu, bdpanPath: e.target.value } })}
            />
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
            <Input
              label="social-auto-upload 路径"
              value={draft.bilibili.socialAutoUploadPath}
              onChange={(e) =>
                update({
                  bilibili: { ...draft.bilibili, socialAutoUploadPath: e.target.value }
                })
              }
            />
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

        <Card title="流水线">
          <div className="space-y-4">
            <TextArea
              label="壁纸源顺序（逗号分隔）"
              value={draft.download.sources.join(', ')}
              onChange={(e) =>
                update({
                  download: {
                    ...draft.download,
                    sources: e.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean)
                  }
                })
              }
            />
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
    </div>
  )
}
