# 开发规范

这份文档是当前仓库的默认开发约定，面向团队成员、外部贡献者，以及需要快速建立上下文的 AI 助手。

## 目标

- 让 `main` 尽量保持可运行
- 保护团队私有工作资产，不把本地材料带进公开仓库
- 让人和 AI 都能快速知道“当前信息该去哪里看、改动该落到哪里”
- 保持文档高信号、低噪音，不为了形式增加低价值文件

## 文档角色分工

- `README.md`：项目公开入口、运行方式、公开/私有边界
- `DEVELOPMENT.md`：默认开发规范与工作约定
- `CONTRIBUTING.md`：外部贡献的最小规则
- `docs/README.zh-CN.md`：公开文档总入口
- `docs/project-status.zh-CN.md`：当前阶段、重点、风险、下一步
- `docs/architecture/current-architecture.zh-CN.md`：当前结构与文件放置原则
- `docs/git-workflow.zh-CN.md`：fork 模式下的 Git 协作流程

新增公开文档前，优先判断能否归入上述入口，而不是新增一类临时文档。

## 分支策略

- `main`：稳定集成分支，应尽量保持可运行
- `feat/<name>`：新功能
- `fix/<name>`：问题修复
- `docs/<name>`：纯文档改动
- `chore/<name>`：维护、清理、工具调整

从当前阶段开始，除非常小的文档修正外，新的非小型工作默认不直接在 `main` 上进行。

默认流程：

1. 先同步本地 `main`
2. 从 `main` 切出聚焦分支
3. 在分支内开发、验证、提交
4. push 到个人 fork
5. 需要共享或并入上游时，再通过 PR 进入上游仓库

详细流程见：

- `docs/git-workflow.zh-CN.md`

## 提交风格

使用简短前缀：

- `feat:`
- `fix:`
- `docs:`
- `chore:`
- `refactor:`

示例：

```text
feat: add season rewards balancing
fix: correct offline income cap
docs: add release checklist
```

## 私有资产边界

下面这些都属于本地私有工作资产，不应进入 git：

- `skills/`
- `skills.md`
- `.codex/`
- `.claude/`
- `notes-private/`
- `research-private/`
- 本地提示词、审计草稿、内部策略笔记
- 个人脚本、本地隧道脚本、临时日志

项目特化的 `SKILL.md` 可以本地使用，但必须放在被忽略的目录中，不能放在公开仓库路径下。

## 新工作如何决定要不要先写文档

默认采用下面的判断规则：

- 小改动：可以直接实施；如果改了命令、结构、流程或文档入口，要同步更新对应文档
- 中大改动：先想清楚目标、范围、影响，再决定是否写设计或计划
- 改结构、改行为、改长期流程：先在 `docs/superpowers/specs/` 写设计说明
- 需要任务拆分、执行跟踪、阶段推进：在 `docs/superpowers/plans/` 写计划

原则是先复用现有文档体系，再新增内容；先补高价值记录，再避免重复描述。

## 日常工作流

1. 确认当前状态：
   - `git status`
   - `git switch main`
   - `git pull --ff-only origin main`
2. 需要时同步上游信息：
   - `git fetch upstream`
3. 创建聚焦分支
4. 进行改动
5. 运行相关本地检查
6. 提交前查看 `git diff` 和 `git status`
7. 确认没有混入私有文件
8. 写清楚 commit message 并 push 到 `origin`

## 文件组织规则

- 公开项目文件只放在仓库可见路径
- 可复用脚本放在 `scripts/`
- 稳定的公开文档放在 `docs/`
- 运行时资源放在 `assets/`
- 本地研究、提示词、技能文件、私有操作笔记不要散落在仓库根目录
- 不为“看起来整齐”随意新增顶层目录；结构变化要有明确理由

如果需要判断某个新文件该放哪里，先看：

- `docs/architecture/current-architecture.zh-CN.md`

## 实施完成后需要同步哪些文档

- 如果项目阶段、当前重点或已知风险变化，更新 `docs/project-status.zh-CN.md`
- 如果属于值得记录的阶段性成果，更新 `docs/changelog.zh-CN.md`
- 如果做了正式审计，把结果归档到 `docs/audits/`
- 如果结构或长期协作规则变化，更新对应入口文档

这些文档的公开入口在：

- `docs/README.zh-CN.md`

## 提交前最少检查

- 游戏仍能在本地启动
- 改动相关流程至少完整跑过一次
- 暂存区里没有本地私有文件或日志
- 如果行为、命令、结构或入口变化了，文档已同步更新
- 如果这次改动较大，状态 / 设计 / 计划 / 审计文档也已经同步

## 代码审阅时重点看什么

合并到 `main` 前，重点检查：

- 是否误泄露私有工作资产
- 命令或文档是否已经过期
- 是否留有调试残留
- 是否混入无关改动
- 结构变化是否仍符合当前架构说明

## 与上游仓库同步

当前仓库有两个远端：

- `origin`：个人 fork，也是主要 push 目标
- `upstream`：上游共享仓库

推荐流程：

1. `git fetch upstream`
2. 先看清楚上游变化
3. 优先在工作分支上做整合
4. 本地验证
5. 确认稳定后再合并回 `main`
