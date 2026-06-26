# 动态壁纸下载工具

批量下载动态壁纸的 Node.js 脚本集合，与 [Hermes tencent-channel-live-wallpaper](https://github.com/webB1an/hermes-tencent-channel-profiles/tree/master/tencent-channel-live-wallpaper/scripts/live-wallpaper-download/scripts) 同源。

## 支持的壁纸源（6 个）

| 源 ID | 脚本 | dry-run | manifest |
|-------|------|---------|----------|
| wallpaperwaifu | `download-wallpaperwaifu-first-page.mjs` | ✅ | `manifest-wallpaperwaifu.json` |
| moewalls | `download-moewalls-first-page.mjs` | ✅ | `manifest.json` |
| desktophut | `download-desktophut-first-page.mjs` | ✅ | `manifest-desktophut.json` |
| motionbgs | `download-motionbgs-first-page.mjs` | ✅ | `manifest-motionbgs.json` |
| wallsflow | `download-wallsflow-first-page.mjs` | ✅ | `manifest-wallsflow.json` |
| wallpaperwaves | `download-wallpaperwaves-first-page.mjs` | ✅ | `manifest-wallpaperwaves.json` |

Wallpaper Studio 默认按此顺序尝试各源，每次 `--limit 1` 下载一条。

## 目录结构

```text
.
├─ downloads/   下载的壁纸视频（不提交 Git）
├─ config/      去重记录与 manifest（*.json 不提交）
├─ scripts/     下载脚本
└─ README.md
```

## 环境要求

```powershell
node --version
curl.exe --version
```

## 通用参数

```text
--page / -p      指定列表页，默认 1
--out / -o       壁纸保存目录，默认 downloads
--limit / -l     最多处理 N 条（Wallpaper Studio 使用 --limit 1）
--dry-run        只解析不下载（发布前预检使用）
--help / -h      帮助
```

## 示例

```powershell
# WallpaperWaifu dry-run 预览
node .\scripts\download-wallpaperwaifu-first-page.mjs --dry-run --limit 1

# MoeWalls 下载一条
node .\scripts\download-moewalls-first-page.mjs --limit 1

# MotionBGs 指定页
node .\scripts\download-motionbgs-first-page.mjs --page 2 --limit 1
```

## 去重规则

按壁纸**详情页 URL** 去重，记录在 `config/downloaded-*-detail-urls.json`。  
即使修改 `--out` 目录，去重记录仍使用项目 `config/` 目录。

## 从上游同步

```powershell
# 在仓库根目录执行（需已 clone Hermes 仓库）
.\scripts\wallpaper-download\sync-from-hermes.ps1
```

或手动对比：

https://github.com/webB1an/hermes-tencent-channel-profiles/tree/master/tencent-channel-live-wallpaper/scripts/live-wallpaper-download/scripts

## 大文件下载

脚本使用 `curl.exe`，支持断点续传与自动重试（`--retry 6 -C -`）。
