# 计划文档说明

`docs/superpowers/plans/` 用来存放实现前计划文档。

## 什么时候需要写计划

建议在下面这些情况开始前先写计划：

- 新功能
- 结构整理
- 存档模型变更
- 登录、支付、联网、打包相关改动
- 跨多个文件的较大改动

## 文件命名

推荐格式：

`YYYY-MM-DD-<topic>-plan.md`

例如：

- `2026-06-02-project-operations-foundation-plan.md`
- `2026-06-05-save-model-fix-plan.md`

## 最小内容

一份计划至少应包含：

- 目标
- 范围
- 不做什么
- 风险
- 任务拆分
- 完成标准

## 配合规则

1. 做非小型改动前，先写计划
2. 做完后更新 `docs/project-status.zh-CN.md`
3. 如果改动值得记录，再更新 `docs/changelog.zh-CN.md`
4. 如果做了正式审计，新增 `docs/audits/` 记录
