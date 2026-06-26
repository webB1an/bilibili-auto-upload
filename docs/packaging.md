# 打包与代码签名

## 本地打包

```powershell
cd app
npm run typecheck
npm test
npm run dist
```

输出：`app/release/Wallpaper Studio-{version}-Setup.exe`

## 应用图标

图标文件：`app/build/icon.png`（512×512，electron-builder 会自动生成 `.ico`）

更换图标后重新执行 `npm run dist`。

## Windows 代码签名（可选）

未签名安装包可能触发 SmartScreen「未知发布者」警告。正式分发建议购买代码签名证书后对 exe 签名。

electron-builder 支持在环境变量中配置：

```powershell
$env:CSC_LINK = "path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD = "your-password"
cd app
npm run dist
```

或在 CI Secrets 中配置相同变量。

## GitHub Release

```powershell
gh release create v1.0.1 "app/release/Wallpaper Studio-1.0.1-Setup.exe" --title "Wallpaper Studio v1.0.1"
```

## 百度网盘登录说明

bdpan 目前**不支持**应用内 OAuth（与 B 站扫码不同），需通过终端完成：

1. 账号与工具 → **安装 bdpan**
2. **打开终端登录** → 在新 cmd 窗口扫码
3. 回到应用点击 **检测登录状态**

分享能力需在 [百度开放平台](https://pan.baidu.com/union/home) 开通（可能产生费用）。
