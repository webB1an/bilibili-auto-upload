# wdbzk 运营者上手流程 Implementation Plan

> **Goal:** 装完应用 → 首次设置（安装工具、登录双账号、填 wdbzk Token）→ 一键发布，无需手填路径或克隆 `_research`。

**Architecture:** Electron 内置 `bundled/bilibili-cli`，安装到 `%APPDATA%/Wallpaper Studio/tools/`；`preflight` 统一门禁；`Onboarding` 向导页 + 发布前 IPC 校验。

**Tech Stack:** Electron, React, Zustand, bdpan CDN, bili_cli + biliup runtime, panapi.wdbzk.com

---

## 已完成（本迭代）

- [x] `app/bundled/bilibili-cli` 最小 B 站 CLI 包
- [x] `bilibiliRuntime.ts` 安装 CLI + `pip install requests`
- [x] `preflight.ts` 六步就绪检测
- [x] `Onboarding.tsx` 首次设置页
- [x] `OnboardingGate` 未完成时跳转向导
- [x] 发布按钮 / `pipeline:run` 双重门禁
- [x] 默认 `panapi.wdbzk.com`、categoryId 61
- [x] `accountsBilibiliInstall` IPC + 账号页按钮
- [x] electron-builder 打包 `bilibili-cli` extraResources

## 待办（下一迭代）

- [ ] wallpaper.wdbzk.com 发布前去重 API
- [ ] 首次向导内嵌二维码（减少终端依赖）
- [ ] 便携 Python 或检测引导安装 Python 3.10+
- [ ] 运营一页纸文档 `docs/wdbzk-operator-guide.md`
- [ ] 批量/定时发布队列

## 运营者路径

1. 安装 Wallpaper Studio（NSIS）
2. 打开应用 → 自动进入「首次设置」
3. 安装 bdpan + B 站 CLI
4. 百度 / B 站终端扫码登录
5. 填写 wdbzk API Token，测试连接
6. 「完成设置，去发布」→ 一键发布

## 验证

```powershell
cd app
npm run typecheck
npm run dev
```

在首次设置页逐项变绿后，发布页「开始发布」应可点击并成功跑通流水线。
