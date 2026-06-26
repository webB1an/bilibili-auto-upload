# Wallpaper Studio

wdbzk 壁纸站运营工作台：下载壁纸 → 百度网盘分享 → panapi 入库 → B 站投稿。

## 运营者快速开始

1. 安装 [Python 3.10+](https://www.python.org/)（B 站 CLI 需要；**无需单独安装 Node.js**）
2. 安装应用：
   - **推荐**：从 [GitHub Releases](https://github.com/webB1an/bilibili-auto-upload/releases) 下载 `Wallpaper Studio-*-Setup.exe`
   - **开发模式**：`cd app && npm install && npm run dev`
3. 首次打开进入 **首次设置**（四步）：
   - 安装 bdpan / B 站 CLI
   - 登录百度网盘与 B 站（推荐应用内扫码）
   - 填写 wdbzk API Token
4. 在 **一键发布** 页点击「开始发布」；批量运营可使用 **发布队列**

默认 panapi：`https://panapi.wdbzk.com`，分类 ID `61`。

详细说明见 [`docs/wdbzk-operator-guide.md`](docs/wdbzk-operator-guide.md)。

## 功能概览

| 功能 | 说明 |
|------|------|
| 一键发布 | 下载 → 百度分享 → wdbzk 入库 → B 站投稿 |
| 发布队列 | 按间隔自动发布，支持每日上限与失败暂停 |
| 库内去重 | 发布前检查 wallpaper.wdbzk.com 是否已有类似资源 |
| 应用内 B 站登录 | 无需打开 cmd，扫码即可 |
| Token 加密 | wdbzk API Token 使用系统 safeStorage 存储 |

## 打包（开发者）

```powershell
cd app
npm install
npm run typecheck
npm test
npm run dist
```

安装包输出：`app/release/Wallpaper Studio-{version}-Setup.exe`

## 前置说明

- **bdpan**：应用内一键安装；分享能力需百度开放平台服务
- **B 站 CLI**：内置，安装到 `%APPDATA%\Wallpaper Studio\tools\bilibili-cli\`
- **wdbzk Token**：向运营方获取，在首次设置或系统设置中填写

## 免责声明

请确保你对再分发的壁纸内容拥有合法权利。使用者需自行承担平台审核与版权风险。
