# 变更记录

本文件记录项目的重要阶段性变化，不逐条重复所有 commit。

## 2026-06-02

### 新增

- 增加仓库卫生基线：
  - `.gitignore`
  - `README.md`
  - `DEVELOPMENT.md`
  - `CONTRIBUTING.md`
  - `docs/release-checklist.md`
- 增加 fork 模式 Git 协作文档：
  - `docs/git-workflow.zh-CN.md`
- 增加项目运行文档体系：
  - `docs/README.zh-CN.md`
  - `docs/project-status.zh-CN.md`
  - `docs/changelog.zh-CN.md`
  - `docs/audits/2026-06-02-initial-code-audit.zh-CN.md`
  - `docs/superpowers/plans/README.zh-CN.md`
  - `docs/superpowers/plans/_template.zh-CN.md`
  - `docs/superpowers/plans/2026-06-02-project-operations-foundation-plan.md`

### 调整

- 将 `copy-www.js` 移动到 `scripts/copy-www.js`
- 调整 `package.json` 中的脚本路径与本地预览依赖
- 将仓库文档与脚本开始按职责分层
- 将图标资源迁移到 `assets/icons/`
- 将 Android 打包说明迁移到 `docs/platforms/android-packaging.zh-CN.md`
- 同步更新 HTML、manifest、service worker、复制脚本中的图标路径

### 清理

- 删除本地日志文件
- 删除机器专属隧道脚本

### 记录

- 完成第一轮上线风险导向代码审计
- 明确当前处于“仓库治理已完成、结构整理与风险修复待继续”的阶段
- 完成目录结构第二阶段轻整理的实施前计划
- 完成目录结构第二阶段轻整理实施
- 补充 fork 模式下从 `origin` 向 `upstream` 提 Pull Request 的具体流程说明
