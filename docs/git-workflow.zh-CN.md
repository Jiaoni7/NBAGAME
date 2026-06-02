# Git 协作流程（Fork 模式）

这份文档面向当前仓库的协作方式：

- `origin` = 你的 fork：`git@github.com:Raint-s/NBAGAME.git`
- `upstream` = 朋友的原始仓库：`git@github.com:Jiaoni7/NBAGAME.git`

当前建议把 `origin` 视为你的主开发仓库，把 `upstream` 视为上游同步来源。

## 一、先讲清楚推荐原则

### 1. 日常开发默认在 `origin`

因为你是主要开发者，最稳的方式是：

- 日常开发、提交、推送，默认都走你自己的 `origin`
- 朋友那边如果有新改动，再从 `upstream` 同步回来

这样做的好处是：

- 你不会误操作朋友的主仓库
- 你的开发节奏不依赖别人仓库权限
- 出问题时回滚、审计、复盘都更清楚

### 2. `main` 尽量保持可运行

不要把半成品、调试残留、私有辅助文件直接堆进 `main`。

### 3. 开发用分支，稳定后再回 `main`

推荐分支前缀：

- `feat/...`
- `fix/...`
- `docs/...`
- `chore/...`

### 4. 私有工作资产永远不入库

包括但不限于：

- `skills/`
- `.codex/`
- `.claude/`
- 私有调研
- 内部提示词
- 本地日志
- 本地脚本

提交前先看 `git status`。

## 二、你自己日常开发的标准流程

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

如果你当前项目还是你自己主控、暂时不走 PR，也可以在确认没问题后合并回 `main`：

```bash
git switch main
git merge --no-ff feat/your-feature-name
git push origin main
```

## 三、修复问题时的流程

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

## 四、朋友在 `upstream` 有更新时怎么同步

先拉上游信息：

```bash
git fetch upstream
```

先看看差异：

```bash
git log --oneline main..upstream/main
```

如果你确认要同步：

```bash
git switch main
git pull --ff-only origin main
git merge upstream/main
git push origin main
```

如果有冲突：

1. 解决冲突
2. 本地验证
3. 再提交合并结果
4. 再推到 `origin/main`

如果你想更保守一点，也可以先建同步分支：

```bash
git switch -c chore/sync-upstream-main
git merge upstream/main
```

确认无误后再合回 `main`。

## 五、你的改动怎么给朋友

有两种常见方式。

### 方式 1：朋友直接看你的 fork

你推到：

```bash
git push origin main
```

或者功能分支：

```bash
git push -u origin feat/your-feature-name
```

朋友从你的仓库看代码、拉代码、或者按需合并。

### 方式 2：你向 `upstream` 发 PR

适合朋友的仓库是“官方主仓库”的情况。

流程是：

1. 你先把改动推到自己的 `origin`
2. 从 `origin` 对 `upstream` 发 Pull Request
3. 朋友审核后合并

如果未来要正式上线、外部协作也增加，建议尽量收敛到这种方式。

## 六、Pull Request 具体怎么提

如果你们后续以朋友的仓库作为“主仓库”，那么推荐默认流程就是：

1. 你在本地开分支开发
2. 推到你自己的 `origin` 分支
3. 从你的 fork 向朋友的 `upstream` 发 PR
4. 朋友审核并合并

### 网页方式（当前最稳）

当前这台机器如果没有安装并登录 GitHub CLI，那么最稳的方式是 GitHub 网页提 PR。

示例流程：

```bash
git switch -c feat/your-feature-name
git add <files>
git commit -m "feat: describe the change"
git push -u origin feat/your-feature-name
```

然后在 GitHub 上：

1. 打开你的 fork：`Raint-s/NBAGAME`
2. GitHub 通常会提示 `Compare & pull request`
3. 选择：
   - base repository: `Jiaoni7/NBAGAME`
   - base branch: `main`
   - head repository: `Raint-s/NBAGAME`
   - compare branch: `feat/your-feature-name`
4. 填写标题和说明
5. 创建 PR

### 命令行方式（未来可选）

如果以后本机安装了 `gh`，并完成 GitHub 登录，那么可以本地直接创建 PR。

示例命令：

```bash
gh pr create --repo Jiaoni7/NBAGAME --base main --head Raint-s:feat/your-feature-name
```

注意：

- `gh` 当前不属于本仓库的前置依赖
- 如果机器没有安装 `gh`，或者没有完成认证，就不能直接在本地创建 PR
- 在这种情况下，继续使用 GitHub 网页即可

### 建议

对你们现在这种“你主开发、朋友偏产品”的模式，我建议：

- 日常开发和自测：在你的 `origin` 分支上完成
- 准备让朋友审核或并入主仓库时：通过 PR 进入 `upstream`
- 不要频繁直接往 `upstream/main` 推代码，除非以后仓库权限和流程已经明确收敛

## 七、提交前固定检查

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

## 八、什么时候 push 到 `main`

满足这几个条件再推：

- 功能至少本地跑过一次
- 关键流程没坏
- 文档和命令没有过期
- 没有私有资产混进提交

## 九、什么时候不要直接改 `main`

这些情况建议一定开分支：

- 改玩法逻辑
- 改存档逻辑
- 改支付/登录/联网相关逻辑
- 改打包流程
- 改大量 UI 或文案

## 十、推荐的团队约定

结合你们现在“你主开发、朋友偏产品”的模式，我建议：

1. 你负责代码分支、提交、同步
2. 朋友主要提需求、验收、在必要时查看 PR 或对比 diff
3. 任何准备上线的版本，都先走一次发布检查清单

## 十一、长期建议

在项目还不大时，当前 fork 模式够用。

但如果后面出现下面这些情况：

- 海外版本开始并行
- 发布频率变高
- 朋友也开始频繁改代码
- 需要更严格的版本追踪

建议再升级为更正式的 PR + release 分支流程。

当前阶段先不用上太重的流程，先把规则稳定执行起来最重要。
