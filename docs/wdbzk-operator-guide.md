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
- 若 wallpaper.wdbzk.com 已有类似标题，默认会中止（可在设置关闭）
- 成功后显示分享链接与 panapi 信息

## 4. 百度网盘说明

- bdpan 在应用内一键安装
- **分享功能**需在百度开放平台开通（可能付费）
- 远程目录默认：`动态壁纸`

## 5. B 站说明

- 分区 `tid` 在系统设置中配置（动态壁纸常用 138 等）
- 账号 cookie 保存在 B 站 CLI 目录的 `cookies/` 下
- 登录失效时到「账号与工具」重新扫码

## 6. 常见错误

| 现象 | 处理 |
|------|------|
| Python 未检测到 | 安装 Python 3.10+ 并勾选 Add to PATH |
| bdpan 未登录 | 账号与工具 → 打开终端登录 |
| B 站账号无效 | 应用内登录或终端 `bili_cli.py login` |
| panapi Token 失败 | 检查 Token、网络、Base URL 是否为 wdbzk |
| 库内重复 | 正常去重；确认是否已发过该壁纸 |
| 无新壁纸 | 壁纸源暂无新内容，稍后再试 |

## 7. 路径说明（自动管理，无需手填）

| 工具 | 位置 |
|------|------|
| bdpan | `%APPDATA%\Wallpaper Studio\tools\bdpan\` |
| B 站 CLI | `%APPDATA%\Wallpaper Studio\tools\bilibili-cli\` |
| 配置 | `%APPDATA%\Wallpaper Studio\config.json` |
