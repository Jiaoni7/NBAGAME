# 项目状态总览

最后更新：2026-06-03

## 当前结论

项目已经完成第一阶段的仓库治理基线，但还没有完成全部工程化整理。

当前更准确的状态是：

- 已完成：仓库卫生、公开/私有边界、基础协作文档、fork Git 流程
- 已补齐：状态文档、变更记录、审计归档、计划文档机制、迭代记录归档入口、当前架构说明入口
- 已完成：目录结构第二阶段轻整理
- 尚未完成：核心代码风险修复、发布级功能收口

## 当前阶段划分

### Phase 0：仓库治理基线

状态：已完成

已完成内容：

- 增加 `.gitignore`
- 明确 `skills/` 等本地私有资产不入库
- 增加 `README.md`、`DEVELOPMENT.md`、`CONTRIBUTING.md`
- 增加发布检查清单
- 增加 fork 协作 Git 流程文档
- 将 `copy-www.js` 归位到 `scripts/`
- 清理本地日志和机器专属脚本

### Phase 1：项目运行文档体系

状态：已完成基础版

已完成内容：

- 文档索引
- 项目状态总览
- 变更记录
- 首份代码审计记录
- 计划目录与模板
- 当前架构说明入口

### Phase 2：目录结构轻整理

状态：已完成

目标：

- 明确哪些运行核心文件暂时保留在根目录
- 明确哪些脚本、文档、资源后续应该继续归位
- 在不破坏当前运行方式的前提下做轻量整理

当前计划：

- [superpowers/plans/2026-06-02-directory-structure-light-reorg-plan.md](superpowers/plans/2026-06-02-directory-structure-light-reorg-plan.md)

已完成内容：

- 图标资源迁移到 `assets/icons/`
- Android 打包说明迁移到 `docs/platforms/android-packaging.zh-CN.md`
- HTML、manifest、service worker、复制脚本已同步更新新路径
- 根目录移除一批可归位的资源与历史文档

### Phase 3：代码与发布风险修复

状态：未开始

目标：

- 收口模拟登录和模拟支付的公开入口风险
- 修复存档状态不完整问题
- 评估并收紧 service worker 缓存策略
- 收紧移动端配置中的高风险默认项

## 当前仓库结构判断

当前结构是“核心入口保持稳定，资源与文档已经完成第二阶段轻整理”。

已整理：

- `docs/`：公开文档
- `docs/iterations/`：公开迭代记录
- `scripts/`：辅助脚本
- `assets/icons/`：公开图标资源

暂时保留在根目录且仍然合理的文件：

- `index.html`
- `game.js`
- `sw.js`
- `manifest.webmanifest`
- `package.json`
- `capacitor.config.json`

说明：

这些文件仍然是当前运行模型的核心文件，因此目前保留在根目录不算错误。后续如果继续整理，应优先整理可移动的脚本、资源组织和文档，而不是为了“看起来整齐”打乱运行结构。

本地生成或依赖目录：

- `node_modules/`：依赖安装目录
- `www/`：由 `npm run www` 生成的打包资源目录

说明：

这两个目录不属于“源码结构没有整理好”的范畴，它们分别是依赖产物和构建产物，不应作为手工整理目标。

## 当前已知风险

1. 账号、钻石、支付结果完全在前端本地存储和结算
2. 微信 / QQ 登录与多种支付方式目前仍是前端模拟流程
3. 存档未保存全部关键状态，读档后会出现状态丢失
4. service worker 缓存策略偏粗
5. Android `allowMixedContent` 当前开启

详细内容见：

- [audits/2026-06-02-initial-code-audit.zh-CN.md](audits/2026-06-02-initial-code-audit.zh-CN.md)

## 下一步建议

按优先级建议：

1. 进入第一批高风险代码问题修复
2. 完成后新增下一轮审计记录
3. 持续维护本状态文档和 changelog

## 更新规则

以下情况应更新本文件：

- 完成一个阶段性目标
- 阶段状态改变
- 审计结论发生变化
- 下一步重点发生变化
