# 开发规范

## 目标

让 `main` 尽量保持可运行，保护本地私有工作资产，并让每次改动都容易审阅、容易回溯。

## 分支策略

- `main`：稳定集成分支，应尽量保持可运行
- `feat/<name>`：新功能
- `fix/<name>`：问题修复
- `docs/<name>`：纯文档改动
- `chore/<name>`：维护、清理、工具调整

默认从 `main` 切分支，完成本地验证后再合并。

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

## 仅限本地的私有资产

下面这些都属于私有工作资产，不应进入 git：

- `skills/`
- `.codex/`
- `.claude/`
- `notes-private/`
- `research-private/`
- 本地提示词、审计草稿、内部策略笔记
- 个人脚本、本地隧道脚本、临时日志

项目特化的 `skills.md` 可以本地使用，但必须放在被忽略的目录中，不能放在公开仓库路径下。

## 日常工作流

1. 先确认当前分支状态：
   - `git status`
   - 需要时执行 `git pull --ff-only origin main`
2. 创建聚焦分支
3. 进行改动
4. 运行相关本地检查
5. 提交前查看 `git diff` 和 `git status`
6. 确认没有混入私有文件
7. 写清楚 commit message

当前 fork 协作模式的详细流程见：

- `docs/git-workflow.zh-CN.md`

如果朋友的仓库被视为上游主线，优先采用：

1. 在 `origin` 的分支上开发
2. 把分支 push 到 `origin`
3. 从 `origin` 向 `upstream` 发 Pull Request
4. 审核通过后再合入上游主线

## 文档工作流

只靠 commit history 不足以支撑非小型改动。

开始实施前：

- 如果会改结构或行为，先在 `docs/superpowers/specs/` 写设计说明
- 如果需要任务拆分和执行跟踪，先在 `docs/superpowers/plans/` 写计划

实施完成后：

- 如果项目阶段、当前重点或已知风险变化，更新 `docs/project-status.zh-CN.md`
- 如果属于值得记录的阶段性成果，更新 `docs/changelog.zh-CN.md`
- 如果做了正式审计，把结果归档到 `docs/audits/`

这些文档的公开入口在：

- `docs/README.zh-CN.md`

## 提交前最少检查

- 游戏仍能在本地启动
- 改动相关流程至少完整跑过一次
- 暂存区里没有本地私有文件或日志
- 如果行为、命令或结构变化了，文档已同步更新
- 如果这次改动较大，状态 / 计划 / 审计文档也已经同步

## 文件组织规则

- 公开项目文件只放在仓库可见路径
- 可复用脚本放在 `scripts/`
- 稳定的公开文档放在 `docs/`
- 产品调研、提示词、私有操作笔记不要散落在仓库根目录

## 代码审阅时重点看什么

合并到 `main` 前，重点检查：

- 是否误泄露私有工作资产
- 命令或文档是否已经过期
- 是否留有调试残留
- 是否混入无关改动

## 与上游仓库同步

当前仓库有两个远端：

- `origin`：你的个人 fork，也是主要 push 目标
- `upstream`：原始项目仓库

推荐流程：

1. `git fetch upstream`
2. 先看清楚上游变化
3. 优先在工作分支上做整合
4. 本地验证
5. 确认稳定后再合并回 `main`
