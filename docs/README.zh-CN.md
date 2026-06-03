# 文档索引

这份索引用来说明仓库里有哪些公开文档、各自负责什么、什么时候需要更新。

## 文档分类

### 1. 项目状态

- [project-status.zh-CN.md](project-status.zh-CN.md)
  - 用途：记录当前阶段、已完成事项、已知风险、下一步重点
  - 何时更新：阶段变化、完成重要工作、审计结论变化后

- [changelog.zh-CN.md](changelog.zh-CN.md)
  - 用途：记录重要变更，不要求逐条抄写每个 commit
  - 何时更新：完成一个可说明的阶段性改动后

### 2. 协作与发布

- [git-workflow.zh-CN.md](git-workflow.zh-CN.md)
  - 用途：说明 fork 模式下的 pull / push / sync 流程
  - 何时更新：协作模式或分支策略变化时

- [release-checklist.md](release-checklist.md)
  - 用途：发布前核对仓库卫生、运行状态、资源和打包流程
  - 何时更新：发布流程变化、检查项发现缺口时

- [platforms/android-packaging.zh-CN.md](platforms/android-packaging.zh-CN.md)
  - 用途：记录 Android / Capacitor 打包相关说明
  - 何时更新：打包流程、平台要求或发布方式变化时

### 3. 迭代记录

- [iterations/2026-06-03-iteration-1.1.zh-CN.md](iterations/2026-06-03-iteration-1.1.zh-CN.md)
  - 用途：归档公开可见的版本迭代说明、功能更新摘要和实现范围
  - 何时更新：完成一轮值得单独说明的版本迭代后，新增一份新文档，不覆盖旧记录

### 4. 审计记录

- [audits/2026-06-02-initial-code-audit.zh-CN.md](audits/2026-06-02-initial-code-audit.zh-CN.md)
  - 用途：归档阶段性代码审计结论
  - 何时更新：完成新的正式审计后，新增一份新文档，不覆盖旧记录

### 5. 设计与计划

- [superpowers/specs/2026-06-02-repo-hygiene-design.md](superpowers/specs/2026-06-02-repo-hygiene-design.md)
  - 用途：记录仓库规范化设计

- [superpowers/specs/2026-06-02-project-docs-workflow-design.md](superpowers/specs/2026-06-02-project-docs-workflow-design.md)
  - 用途：记录项目状态、计划、审计、变更文档体系设计

- [superpowers/plans/README.zh-CN.md](superpowers/plans/README.zh-CN.md)
  - 用途：说明计划文档该怎么写、什么时候写

- [superpowers/plans/_template.zh-CN.md](superpowers/plans/_template.zh-CN.md)
  - 用途：新计划的模板

- [superpowers/plans/2026-06-02-project-operations-foundation-plan.md](superpowers/plans/2026-06-02-project-operations-foundation-plan.md)
  - 用途：本轮项目运行文档体系落地计划

- [superpowers/plans/2026-06-02-directory-structure-light-reorg-plan.md](superpowers/plans/2026-06-02-directory-structure-light-reorg-plan.md)
  - 用途：目录结构第二阶段轻整理计划

## 最小更新规则

为了让仓库状态始终可读，建议至少遵守下面 4 条：

1. 做非小型改动前，先写 spec 或 plan
2. 做完阶段性改动后，更新 `project-status.zh-CN.md`
3. 做完值得对外说明的改动后，更新 `changelog.zh-CN.md`
4. 做完正式审计后，在 `docs/audits/` 新增一份记录，并同步状态文档

## 语言约定

当前团队高频使用的内部工程文档，默认采用中文优先：

- `DEVELOPMENT.md`
- `CONTRIBUTING.md`
- `docs/release-checklist.md`
- `docs/git-workflow.zh-CN.md`
- `docs/project-status.zh-CN.md`
- `docs/changelog.zh-CN.md`

对外说明文档可以根据需要保留英文或后续补充双语版本。

## 不放进仓库的内容

下面这些仍然属于本地私有工作资产：

- `skills/`
- `.codex/`
- `.claude/`
- 私有提示词
- 私有调研、内部操作笔记

这些内容可以帮助开发，但不应替代仓库中的公开正式文档。
