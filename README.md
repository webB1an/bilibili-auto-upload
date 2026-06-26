# Wallpaper Studio

wdbzk 壁纸站运营工作台：下载壁纸 → 百度网盘分享 → panapi 入库 → B 站投稿。

## 运营者快速开始

1. 安装 [Node.js 18+](https://nodejs.org/) 与 [Python 3.10+](https://www.python.org/)（B 站 CLI 需要）
2. 开发模式：`cd app && npm install && npm run dev`
3. 或打包：`cd app && npm run dist`，安装包在 `app/release/`
4. 首次打开进入 **首次设置**：安装 bdpan / B 站 CLI → 登录百度与 B 站 → 填写 wdbzk API Token
5. 完成后在 **一键发布** 页点击「开始发布」

默认 panapi：`https://panapi.wdbzk.com`，分类 ID `61`。

## 前置说明

- **bdpan**：应用内一键安装；分享能力需百度开放平台服务
- **B 站 CLI**：应用内置，安装到用户数据目录，自动 `pip install requests`
- **wdbzk Token**：向运营方获取，在首次设置或系统设置中填写

详细实施计划见 [`docs/plans/2026-06-26-wdbzk-operator-onboarding.md`](docs/plans/2026-06-26-wdbzk-operator-onboarding.md)。

## 免责声明

请确保你对再分发的壁纸内容拥有合法权利。使用者需自行承担平台审核与版权风险。
