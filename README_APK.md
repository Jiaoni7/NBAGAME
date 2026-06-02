# 王朝传奇 · 打包安卓 APK 指南

本项目本身是一套纯前端 H5 游戏（`index.html` + `game.js`），已做**移动端适配**与 **PWA**（可“添加到主屏幕”离线运行）。
下面介绍两种让大家在手机上玩的方式。

---

## 方式一（最快）：PWA 添加到主屏幕，无需打包

1. 把目录部署到任意 HTTPS 静态服务器（或本机 `npm run serve` 局域网访问）。
2. 手机浏览器打开页面 → 菜单选择 **“添加到主屏幕 / 安装应用”**。
3. 即可像 App 一样全屏启动、离线游玩（依赖 `manifest.webmanifest` + `sw.js`）。

> 适合快速分发、无需安装包。

---

## 方式二：用 Capacitor 封装为安卓 APK

### 环境准备
- **Node.js** ≥ 18
- **JDK 17**
- **Android Studio**（含 Android SDK、平台工具）
- 配置环境变量 `ANDROID_HOME` 指向 SDK 目录

### 步骤

```bash
# 1. 安装依赖
npm install

# 2. 首次添加安卓平台（会生成 android/ 工程，并把 www/ 资源拷入）
npm run android:add

# 3. 之后每次改完前端代码，同步到安卓工程
npm run sync

# 4a. 用 Android Studio 打开并运行/打包（推荐，可视化签名）
npm run open:android

# 4b. 或命令行直接生成 Debug APK
npm run build:apk
#    产物：android/app/build/outputs/apk/debug/app-debug.apk
```

### 生成正式签名包（发布用）
1. 生成 keystore：
   ```bash
   keytool -genkey -v -keystore dynasty.keystore -alias dynasty -keyalg RSA -keysize 2048 -validity 10000
   ```
2. 在 `android/app/build.gradle` 配置 `signingConfigs`，引用该 keystore。
3. 执行：
   ```bash
   cd android && gradlew.bat assembleRelease
   ```
   产物：`android/app/build/outputs/apk/release/app-release.apk`

### 应用图标
- 默认使用根目录 `icon.svg`。
- 安卓原生图标建议放入 `android/app/src/main/res/mipmap-*` 各分辨率，
  或用 Android Studio 的 *Image Asset* 一键生成。

---

## 关于微信 / QQ 登录与支付（重要）

当前版本中，**微信/QQ 登录**与 **Google Play / 微信 / 支付宝 / Apple Pay 支付**均为**前端模拟流程**，
用于产品原型演示，不会产生真实授权或扣费。若要上线接入真实能力，需要：

| 能力 | 需要的对接 |
| --- | --- |
| 微信登录 | 微信开放平台 App 应用、`AppID/AppSecret`、后端 `code→access_token` 换取、Capacitor 集成微信 SDK 插件 |
| QQ 登录 | 腾讯开放平台 App、QQ 互联 SDK、后端令牌校验 |
| 微信/支付宝支付 | 商户号、后端统一下单与签名校验、客户端调起 SDK |
| Google Play 计费 | Google Play Console、Play Billing Library、后端校验购买凭据 |
| Apple Pay / 内购 | App Store Connect、StoreKit、收据校验 |

这些都需要**对应平台的开发者账号 + 后端服务**配合，无法仅靠纯前端完成。
告诉我目标平台，我可以补充具体的 SDK 接入与后端校验方案。
