import fs from 'fs'
import path from 'path'
import type { BrowserWindow } from 'electron'
import type { DownloadResult, HistoryRecord, PipelineProgress, ShareResult } from '../../src/types'
import { getConfig } from './config'
import { downloadWallpaper } from './download'
import { baiduShare, baiduUpload, getRemoteFileName, parseStoredShareLink } from './baidu'
import { createPanControlResource } from './panControl'
import { bilibiliUploadVideo } from './bilibili'
import {
  buildBilibiliDesc,
  buildBilibiliTitleWithLimit,
  buildTitle,
  extractChineseWallpaperName,
  normalizeWallpaperName,
  resourceTitleFromBilibiliTitle,
  translateToChinese
} from './title'
import {
  addHistoryRecord,
  findResumablePipelineJob,
  markDetailUrlPosted,
  updateHistoryRecord
} from './state'
import { findCatalogDuplicate } from './wallpaperCatalog'
import { clearRegisteredProcesses, killRegisteredProcesses, registerProcess } from './processRegistry'
import { cleanupBgmTempFile, prepareBilibiliVideoWithBgm } from './bgmMix'

let running = false
let cancelled = false

function emitProgress(window: BrowserWindow | null, progress: PipelineProgress): void {
  window?.webContents.send('pipeline:progress', progress)
}

function emitLog(window: BrowserWindow | null, line: string): void {
  window?.webContents.send('pipeline:log', line)
}

export function cancelPipeline(): void {
  cancelled = true
  killRegisteredProcesses()
}

export function isPipelineRunning(): boolean {
  return running
}

function downloadFromRecord(record: HistoryRecord): DownloadResult {
  const filePath = record.localPath!
  const rawName = path.basename(filePath, path.extname(filePath))
  return {
    filePath,
    name: normalizeWallpaperName(rawName),
    detailUrl: record.detailUrl,
    source: record.source
  }
}

export async function runPipeline(window: BrowserWindow | null): Promise<{
  ok: boolean
  message: string
  recordId?: string
  skipped?: boolean
}> {
  if (running) {
    return { ok: false, message: '已有任务正在运行' }
  }

  running = true
  cancelled = false
  const config = getConfig()
  const log = (line: string) => emitLog(window, line)
  const isCancelled = () => cancelled

  let recordId: string | undefined
  let previewTitle: string | undefined
  let previewPath: string | undefined
  let bgmTempPath: string | undefined

  const progress = (
    step: PipelineProgress['step'],
    status: PipelineProgress['status'],
    percent: number,
    message: string
  ) => {
    emitProgress(window, { step, status, percent, message, previewTitle, previewPath })
  }

  const setPreview = (title?: string, filePath?: string): void => {
    if (title !== undefined) previewTitle = title
    if (filePath !== undefined) previewPath = filePath
  }

  try {
    const resumable = findResumablePipelineJob()
    let downloaded: DownloadResult
    let resourceTitle: string
    let bilibiliTitle: string

    if (resumable) {
      downloaded = downloadFromRecord(resumable)
      recordId = resumable.id
      resourceTitle = resourceTitleFromBilibiliTitle(resumable.title)
      bilibiliTitle = buildBilibiliTitleWithLimit(resourceTitle, {
        chineseName: extractChineseWallpaperName(resourceTitle)
      })
      if (bilibiliTitle !== resumable.title) {
        updateHistoryRecord(recordId, { title: bilibiliTitle })
      }

      log(`继续上次未完成的发布: ${bilibiliTitle}`)
      setPreview(bilibiliTitle, downloaded.filePath)
      progress('download', 'skipped', 100, `复用本地文件: ${path.basename(downloaded.filePath)}`)
      progress('translate', 'skipped', 100, `复用标题: ${bilibiliTitle}`)
    } else {
      progress('download', 'running', 5, '正在下载动态壁纸...')
      downloaded = await downloadWallpaper(config, log, isCancelled, ({ title }) => {
        setPreview(title)
        progress('download', 'running', 5, `正在下载: ${title}`)
      })
      setPreview(downloaded.name, downloaded.filePath)
      progress('download', 'success', 100, `下载完成: ${downloaded.name}`)

      progress('translate', 'running', 10, '正在生成标题...')
      const chinese = await translateToChinese(downloaded.name, config.translation)
      resourceTitle = buildTitle(downloaded.name, chinese)
      bilibiliTitle = buildBilibiliTitleWithLimit(resourceTitle, { chineseName: chinese })
      setPreview(bilibiliTitle, downloaded.filePath)
      progress('translate', 'success', 100, `标题: ${bilibiliTitle}`)

      const duplicate = await findCatalogDuplicate(resourceTitle)
      log(`去重: ${duplicate.message}`)
      if (duplicate.duplicate && config.pipeline.abortOnCatalogDuplicate) {
        if (downloaded.detailUrl) {
          markDetailUrlPosted(downloaded.detailUrl)
        }
        if (config.pipeline.deleteLocalAfterSuccess && fs.existsSync(downloaded.filePath)) {
          fs.unlinkSync(downloaded.filePath)
          log(`已删除重复壁纸本地文件: ${downloaded.filePath}`)
        }
        progress('translate', 'warning', 100, duplicate.message)
        return { ok: true, skipped: true, message: duplicate.message }
      }
      if (duplicate.duplicate) {
        progress('translate', 'warning', 100, duplicate.message)
      }

      const record = addHistoryRecord({
        title: bilibiliTitle,
        detailUrl: downloaded.detailUrl,
        source: downloaded.source,
        localPath: downloaded.filePath,
        bilibiliStatus: 'pending',
        status: 'partial'
      })
      recordId = record.id
    }

    const sizeMb = fs.statSync(downloaded.filePath).size / 1024 / 1024
    if (sizeMb > config.pipeline.maxFileSizeMb) {
      throw new Error(`文件过大 (${sizeMb.toFixed(1)}MB)，超过限制 ${config.pipeline.maxFileSizeMb}MB`)
    }

    let remotePath = resumable?.baiduRemotePath
    let share: ShareResult

    if (resumable?.shareLink) {
      share = parseStoredShareLink(resumable.shareLink)
      remotePath = remotePath ?? resumable.baiduRemotePath
      progress('baiduUpload', 'skipped', 100, `已上传: ${remotePath ?? '（远端路径未知）'}`)
      progress('baiduShare', 'skipped', 100, '复用已有分享链接')
    } else if (remotePath) {
      progress('baiduUpload', 'skipped', 100, `已上传: ${remotePath}`)
      progress('baiduShare', 'running', 20, '正在创建分享链接...')
      share = await baiduShare(config, remotePath, log)
      updateHistoryRecord(recordId!, { shareLink: share.fullLink })
      progress('baiduShare', 'success', 100, '分享链接已生成')
    } else {
      progress('baiduUpload', 'running', 15, '正在上传到百度网盘...')
      const remoteName = getRemoteFileName(downloaded.filePath)
      remotePath = await baiduUpload(config, downloaded.filePath, remoteName, log)
      updateHistoryRecord(recordId!, { baiduRemotePath: remotePath })
      progress('baiduUpload', 'success', 100, `上传完成: ${remotePath}`)

      progress('baiduShare', 'running', 20, '正在创建分享链接...')
      share = await baiduShare(config, remotePath, log)
      updateHistoryRecord(recordId!, { shareLink: share.fullLink })
      progress('baiduShare', 'success', 100, '分享链接已生成')
    }

    if (resumable?.panControlId) {
      progress('panControl', 'skipped', 100, `已入库 #${resumable.panControlId}`)
    } else {
      progress('panControl', 'running', 30, '正在写入 wdbzk 资源库...')
      const panDesc = `动态壁纸资源\n来源: ${downloaded.source}\n${downloaded.detailUrl}`
      const panResult = await createPanControlResource(config, {
        name: resourceTitle,
        link: share!.fullLink,
        resourceDescription: panDesc
      })
      if (panResult.duplicate) {
        progress('panControl', 'warning', 100, panResult.message)
        log(`wdbzk 资源库: ${panResult.message}`)
        progress('bilibili', 'skipped', 100, '库内已有相同链接，跳过 B 站投稿')
        updateHistoryRecord(recordId!, {
          bilibiliStatus: 'skipped',
          status: 'partial',
          bilibiliMessage: panResult.message
        })
        if (downloaded.detailUrl) {
          markDetailUrlPosted(downloaded.detailUrl)
        }
        return { ok: true, skipped: true, message: panResult.message, recordId }
      }

      updateHistoryRecord(recordId!, { panControlId: panResult.id })
      progress('panControl', 'success', 100, `wdbzk 入库成功 #${panResult.id ?? ''}`)
    }

    progress('bgm', 'running', 35, '正在准备 B 站投稿视频（配乐）...')
    const bgmResult = await prepareBilibiliVideoWithBgm(config, downloaded.filePath, log)
    const bilibiliVideoPath = bgmResult.ok && bgmResult.outputPath ? bgmResult.outputPath : downloaded.filePath
    if (bgmResult.ok && bgmResult.outputPath) {
      bgmTempPath = bgmResult.outputPath
      log(`BGM: 合成成功 → ${bgmTempPath}`)
      progress('bgm', 'success', 100, bgmResult.message)
    } else {
      log(`BGM: 未使用配乐（${bgmResult.message}）`)
      progress('bgm', 'warning', 100, `${bgmResult.message}，使用原视频投稿`)
    }
    log(`B 站投稿文件: ${bilibiliVideoPath}`)

    progress('bilibili', 'running', 40, '正在投稿 B 站...')
    const bilibiliDesc = buildBilibiliDesc(config.bilibili.descTemplate, {
      title: resourceTitle,
      bilibiliTitle,
      shareLink: share!.fullLink,
      sharePwd: share!.pwd,
      detailUrl: downloaded.detailUrl,
      source: downloaded.source
    })
    await bilibiliUploadVideo(
      config,
      { filePath: bilibiliVideoPath, title: bilibiliTitle, desc: bilibiliDesc },
      log
    )
    cleanupBgmTempFile(bgmTempPath)
    bgmTempPath = undefined
    updateHistoryRecord(recordId!, { bilibiliStatus: 'success', status: 'success', error: undefined })
    progress('bilibili', 'success', 100, 'B 站投稿完成')

    if (downloaded.detailUrl) {
      markDetailUrlPosted(downloaded.detailUrl)
    }

    if (config.pipeline.deleteLocalAfterSuccess && fs.existsSync(downloaded.filePath)) {
      fs.unlinkSync(downloaded.filePath)
      log(`已删除本地文件: ${downloaded.filePath}`)
    }

    const message = resumable ? '断点续传完成' : '流水线执行成功'
    return { ok: true, message, recordId }
  } catch (error) {
    cleanupBgmTempFile(bgmTempPath)
    const message = (error as Error).message || '流水线失败'
    log(`错误: ${message}`)
    if (recordId) {
      updateHistoryRecord(recordId, {
        status: 'failed',
        bilibiliStatus: 'failed',
        bilibiliMessage: message,
        error: message
      })
    }
    emitProgress(window, {
      step: 'bilibili',
      status: 'error',
      percent: 0,
      message
    })
    return { ok: false, message, recordId }
  } finally {
    running = false
    cancelled = false
    clearRegisteredProcesses()
  }
}
