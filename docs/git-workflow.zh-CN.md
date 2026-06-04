# Git 协作流程（Fork + PR 模式）

这份文档面向当前仓库的默认协作方式：

- `origin` = 个人 fork：默认开发与 push 目标
- `upstream` = 上游共享仓库：需要对外同步时的 PR 目标

当前推荐模式是：

- 日常开发在 `origin` 的分支完成
- 需要共享、审阅或并入上游时，再从 `origin` 向 `upstream` 发 PR

## 一、推荐原则

### 1. 日常开发默认在 `origin`

这样做的好处是：

- 避免误操作上游主仓库
- 开发节奏不依赖上游仓库权限
- 出问题时更容易回滚、复盘和审阅

### 2. `main` 尽量保持可运行

不要把半成品、调试残留、私有辅助文件直接堆进 `main`。

### 3. 从当前阶段开始，新的非小型工作默认走分支

推荐分支前缀：

- `feat/...`
- `fix/...`
- `docs/...`
- `chore/...`

补充说明：

- 当前本地历史里已经有一批直接落在 `main` 的仓库基线整理提交，这可以视为早期基线，不必回滚
- 从当前开始，除非常小的文档修正外，建议所有新工作都先开分支，再 push 到 `origin`

### 4. 私有工作资产永远不入库

包括但不限于：

- `skills/`
- `skills.md`
- `.codex/`
- `.claude/`
- 私有调研
- 内部提示词
- 本地日志
- 本地脚本

提交前先看 `git status`。

## 二、开始一个新工作

### 场景 A：开始做一个新功能

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/your-feature-name
```

开发完成后：

```bash
git status
git add <files>
git commit -m "feat: describe the change"
git push -u origin feat/your-feature-name
```

### 场景 B：修复问题

```bash
git switch main
git pull --ff-only origin main
git switch -c fix/short-description
```

修完后：

```bash
git status
git add <files>
git commit -m "fix: describe the bugfix"
git push -u origin fix/short-description
```

## 三、改动怎么共享出去

有两种常见方式。

### 方式 1：先在 `origin` 上共享分支

适用于：

- 先给团队成员看 diff
- 先保留在个人 fork 中继续迭代
- 暂时还不准备并入上游

命令：

```bash
git push -u origin feat/your-feature-name
```

### 方式 2：从 `origin` 向 `upstream` 发 PR

适用于：

- 希望让上游仓库审阅并合并
- 希望把阶段性成果正式同步回共享主线

推荐流程：

1. 本地在分支完成开发
2. push 到 `origin`
3. 从 `origin:<branch>` 向 `upstream:main` 发 Pull Request
4. 审阅通过后再合并

## 四、Pull Request 的推荐做法

### 网页方式

1. 推送分支到 `origin`
2. 打开个人 fork
3. 点击 `Compare & pull request`
4. 选择：
   - base repository: 上游仓库
   - base branch: `main`
   - head repository: 个人 fork
   - compare branch: 当前工作分支
5. 填写标题和说明
6. 创建 PR

### GitHub CLI 方式

如果本机已登录 `gh`，可以直接创建 PR。

示例：

```bash
gh pr create --repo Jiaoni7/NBAGAME --base main --head Raint-s:feat/your-feature-name
```

### 建议的 PR 标题风格

- `chore: sync repository hygiene baseline`
- `docs: refine collaboration workflow docs`
- `refactor: complete Phase 2 light structure reorg`
- `feat: ...`
- `fix: ...`

### 建议的 PR 说明最小结构

```text
## Summary
- change 1
- change 2

## Verification
- local run checked
- npm run www checked

## Notes
- any caveats or follow-up items
```

## 五、上游仓库有更新时怎么同步

先拉上游信息：

```bash
git fetch upstream
```

先看看差异：

```bash
git log --oneline main..upstream/main
```

如果确认要同步，推荐优先走保守流程：

```bash
git switch main
git pull --ff-only origin main
git switch -c chore/sync-upstream-main
git merge upstream/main
```

后续步骤：

1. 解决冲突
2. 本地验证
3. 提交合并结果
4. push 到 `origin`
5. 确认稳定后再合回 `main`

如果同步内容非常简单，也可以直接在 `main` 上整合，但仍应先完成本地验证。

## 六、提交前固定检查

每次提交前都做这几步：

```bash
git status
git diff --staged
```

确认：

- 改动范围符合预期
- 没有私有文件
- 没有日志、缓存、临时脚本
- 没有无关改动

## 七、什么时候不要直接改 `main`

这些情况建议一定开分支：

- 改玩法逻辑
- 改存档逻辑
- 改支付、登录、联网相关逻辑
- 改打包流程
- 改大量 UI 或文案
- 改目录结构、文档入口或协作流程

## 八、当前阶段的团队约定

结合当前“小团队协作优先、兼容外部贡献”的目标，建议执行下面的长期规则：

1. 代码开发默认在个人 fork 的工作分支完成
2. 上游仓库作为共享整合目标，而不是日常直接开发入口
3. 任何准备上线的版本，都先走一次发布检查清单
4. 中大改动先写 spec 或 plan，再进入实现

## 九、长期建议

在项目还不大时，当前 fork 模式已经够用。

如果后面出现下面这些情况，再考虑升级流程：

- 发布频率明显变高
- 有多人开始频繁改代码
- 需要更严格的版本追踪
- 需要 release 分支或更正式的发布节奏

当前阶段先不用上太重的流程，先把规则稳定执行起来最重要。
