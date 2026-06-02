# 目录结构轻整理计划

日期：2026-06-02

## 目标

在不破坏当前可运行状态的前提下，完成仓库的第二阶段轻量结构整理，让公开文件的职责更清楚、根目录更克制、后续维护成本更低。

## 背景

当前仓库已经完成：

- 仓库卫生基线
- 公开 / 私有边界
- 协作与发布基础文档
- 项目状态 / 变更 / 审计 / 计划文档体系

但结构层面仍然处于“第一阶段整理完成、第二阶段未实施”的状态。

当前判断是：

- 根目录中既有合理保留的运行核心文件
- 也还有可以继续归位的资源和文档

因此这一步的目标不是“把所有东西都搬走”，而是做一轮风险可控的轻整理。

## 当前结构判断

### 应继续保留在根目录的文件

这些文件当前仍属于运行入口或核心配置，暂不建议迁移：

- `index.html`
- `game.js`
- `sw.js`
- `manifest.webmanifest`
- `package.json`
- `package-lock.json`
- `capacitor.config.json`
- `README.md`
- `DEVELOPMENT.md`
- `CONTRIBUTING.md`

原因：

- 它们直接参与当前运行模型
- 迁移后会牵连 HTML 引用、PWA 路径、service worker、Capacitor 资源复制路径
- 当前阶段收益不如风险高

### 建议后续归位的文件

这些内容更适合在 Phase 2 中整理：

- 图标资源：`icon.svg`、`icon-192.png`、`icon-512.png`、`icon-1024.png`
- 旧版打包说明：`README_APK.md`

原因：

- 图标属于静态资源，适合归到统一资源目录
- `README_APK.md` 本质是文档，不应长期留在仓库根目录

## 本次建议实施内容

### 1. 新增公开资源目录

建议目标：

- `assets/icons/`

将图标统一放入该目录，并同步更新：

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `scripts/copy-www.js`

### 2. 整理历史打包文档

建议目标：

- `docs/platforms/android-packaging.zh-CN.md`

处理方式：

- 将 `README_APK.md` 的内容迁移到 `docs/` 下更合适的位置
- 原文件可删除，或者短期保留并在内容中提示新位置

### 3. 保持运行入口不动

本轮不迁移：

- `index.html`
- `game.js`
- `sw.js`
- `manifest.webmanifest`

这是这次轻整理最重要的边界。

## 本次不做

- 不拆分 `game.js`
- 不把当前项目改造成 `src/` + 构建工具结构
- 不调整核心运行入口文件位置
- 不处理支付 / 登录 / 存档等业务风险
- 不引入新的前端框架、构建器、打包器

## 风险

### 风险 1：图标路径迁移会影响 PWA 和打包资源

影响面：

- HTML 引用
- manifest 图标引用
- service worker 缓存列表
- `npm run www` 的复制结果

控制方式：

- 只整理图标，不碰主入口
- 每一步后检查 `npm run www`

### 风险 2：文档迁移会让旧引用失效

控制方式：

- 先迁移，再更新 README / docs index / 状态文档中的引用

### 风险 3：为了整齐过度搬运

控制方式：

- 只移动“明显属于资源或文档”的文件
- 暂不移动运行入口和运行配置

## 任务拆分

1. [ ] 确定 Phase 2 实施边界：哪些文件不动，哪些文件可迁移
2. [ ] 新建 `assets/icons/` 并迁移图标文件
3. [ ] 更新 HTML、manifest、service worker、复制脚本中的图标路径
4. [ ] 迁移 `README_APK.md` 到 `docs/` 体系内
5. [ ] 更新 `README.md`、文档索引、项目状态文档中的相关路径说明
6. [ ] 运行 `npm run www` 进行结构变更后的验证
7. [ ] 更新 `docs/project-status.zh-CN.md` 与 `docs/changelog.zh-CN.md`

## 完成标准

- 根目录减少一批可归位的资源 / 历史文档
- 运行入口仍保持当前简单结构
- `npm run www` 可继续正常生成 `www/`
- 文档引用与项目状态同步更新

## 完成后下一步

完成本轮轻整理后，再进入：

- 模拟登录 / 模拟支付入口收口
- 存档模型修复
- service worker 与 Android 配置收紧

## 状态

已规划，待实施。
