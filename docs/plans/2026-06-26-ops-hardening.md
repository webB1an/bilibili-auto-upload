# 运营稳定性优化 Implementation Plan

> **For agentic workers:** 按 Wave 顺序实施；每 Wave 完成后 typecheck + test。

**Goal:** 让 wdbzk 运营者能稳定使用发布队列批量发稿，减少重复入库、队列卡死、取消无效等生产问题。

**Architecture:** 在现有 pipeline + queue + preflight 上修补正确性缺口；UI 补齐队列可观测性与 preflight 一键修复；不引入新依赖（磁盘检测用 PowerShell）。

**Tech Stack:** Electron 33, TypeScript, Vitest

**基线：** Phase 1–3 已完成（`docs/plans/2026-06-26-wdbzk-full-optimization.md`）

---

## Wave 1 — P0 正确性（本轮实施）

- [x] **Task 1:** panapi 重复时跳过 B 站投稿（`pipeline.ts`）
- [x] **Task 2:** 库内去重中止时标记 `detailUrl`，返回 `skipped` 供队列继续（`pipeline.ts`, `queue.ts`, types）
- [x] **Task 3:** 去重 catalog 分页扫描（`wallpaperCatalog.ts` + 单测）
- [x] **Task 4:** 子进程注册与取消任务（`processRegistry.ts`, `download.ts`, `baidu.ts`, `bilibili.ts`, `pipeline.ts`）
- [x] **Task 5:** Windows 真实磁盘空间检测（`publishDryRun.ts`）

## Wave 2 — P1 运营体验（本轮实施）

- [x] **Task 6:** 发布队列页接入实时日志与进度（`Queue.tsx`）
- [x] **Task 7:** 暂停队列同步 `queue.enabled = false`（`main.ts`, `Queue.tsx`）
- [x] **Task 8:** Preflight 失败项一键修复按钮（`PreflightPanel.tsx`）
- [x] **Task 9:** 文案统一 pan-control → wdbzk 资源库（UI + logs）
- [x] **Task 10:** 运营文档补「发布队列 / 去重 / 断点续传」（`docs/wdbzk-operator-guide.md`）

## Wave 3 — 后续（计划内，下轮）

- [ ] 下载前去重 dry-run（preflight `duplicate` 步骤）
- [ ] History 页断点续传 / 放弃 UI
- [ ] CI 增加 `npm run build`
- [ ] 百度应用内登录调研
- [ ] 应用图标 + 代码签名

---

## 验收标准

**Wave 1 Done：** panapi 重复不投 B 站；重复壁纸不卡队列；catalog 分页；取消能停下载；Windows 磁盘不足 preflight 失败。

**Wave 2 Done：** 队列页可看日志；暂停后重启不自动开队列；preflight 可点修复；文档覆盖队列。

## 验证命令

```powershell
cd app
npm run typecheck
npm test
npm run dev
```
