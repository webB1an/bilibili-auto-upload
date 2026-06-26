# wdbzk 壁纸站运营指南

Wallpaper Studio 面向 wdbzk 壁纸站运营：自动下载壁纸 → 百度分享 → panapi 入库 → B 站投稿。

## 1. 安装

- 安装包：运行 `Wallpaper Studio Setup.exe`
- 或开发模式：`cd app && npm install && npm run dev`
- **仍需本机安装 Python 3.10+**（B 站 CLI 使用）

## 2. 首次设置（四步）

1. **安装工具**：bdpan、B 站 CLI；检测 Python
2. **登录账号**：百度终端扫码；B 站推荐「应用内登录」扫二维码
3. **wdbzk Token**：向运营获取 panapi Token，分类 ID 默认 `61`
4. **完成**：就绪检查全绿 → 去发布

接口地址固定：`https://panapi.wdbzk.com`

## 3. 一键发布

- 发布前检查全部通过后再点「开始发布」
- **下一条壁纸预览 / 去重预检**：full 模式下会 dry-run 预览候选并检查 wallpaper.wdbzk.com 是否重复
- 若 wallpaper.wdbzk.com 已有类似标题，默认会跳过该壁纸（可在设置关闭「重复时中止」）
- panapi 若提示链接已存在，会跳过 B 站投稿，避免重复视频
- 成功后显示分享链接与 wdbzk 入库信息

## 4. 发布队列（批量运营）

- 入口：**发布队列** 页
- 配置：发布间隔（分钟）、每日上限、失败时是否暂停
- **启动队列**：保存设置并开始按间隔自动发布
- **暂停队列**：停止定时任务，并关闭「启用队列」（重启应用不会自动再开）
- 队列页可查看实时日志与当前任务进度
- 库内重复资源会自动跳过并尝试下一条，不算发布失败

## 5. 百度网盘说明

- bdpan 在应用内一键安装
- **分享功能**需在百度开放平台开通（可能付费）
- 远程目录默认：`动态壁纸`

## 6. B 站说明

- 分区 `tid` 在系统设置中配置（动态壁纸常用 138 等）
- 账号 cookie 保存在 B 站 CLI 目录的 `cookies/` 下
- 登录失效时到「账号与工具」重新扫码

## 7. 常见错误

| 现象 | 处理 |
|------|------|
| Python 未检测到 | 安装 Python 3.10+ 并勾选 Add to PATH |
| bdpan 未登录 | 账号与工具 → 打开终端登录 |
| B 站账号无效 | 应用内登录或终端 `bili_cli.py login` |
| panapi Token 失败 | 检查 Token、网络、Base URL 是否为 wdbzk |
| 库内重复 | 正常去重；队列模式会自动跳过并继续下一条 |
| 队列一直停着 | 检查是否达每日上限、是否勾选「失败时暂停」、环境 preflight 是否通过 |
| 断点续传 | 上次百度成功但 B 站失败时，再次发布会从本地文件继续 |
| 无新壁纸 | 壁纸源暂无新内容，稍后再试 |

## 8. 路径说明（自动管理，无需手填）

| 工具 | 位置 |
|------|------|
| bdpan | `%APPDATA%\Wallpaper Studio\tools\bdpan\` |
| B 站 CLI | `%APPDATA%\Wallpaper Studio\tools\bilibili-cli\` |
| 配置 | `%APPDATA%\Wallpaper Studio\config.json` |
