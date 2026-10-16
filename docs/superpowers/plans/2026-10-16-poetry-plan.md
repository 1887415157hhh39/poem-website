# 温故 Implementation Plan

> **For agentic workers:** Execute inline using superpowers:executing-plans. Track tasks with checkboxes.

**Goal:** 完成200篇诗词的背诵与抢答训练网站，并部署GitHub Pages。

**Architecture:** 题库离线JSON；纯函数学习引擎；React功能视图；本地存储及备份。保留模板构建与Worker文件，Pages仅发布dist/client。

**Tech Stack:** React 19, Vite 6, Phosphor icons, Python/PyMuPDF, Node test runner.

**Spec:** ../specs/2026-10-16-poetry-design.md

## Global Constraints
- 固定200篇：诗162、词38，原文可追溯PDF页。
- 手机/电脑可用；GitHub Pages子路径可用；所有初始统计为零。
- 11月上半月比赛；米白/墨绿；无账号或自动云同步。
- 提示不计独立答对；限时停止后不可重复计分。

## Review Focus
- 跨页长诗、小序、编号换行和提取乱码：题库验证与源PDF核对。
- 标点/空白与真正错字：答案归一化测试。
- 超时/跳过/提示：引擎评分及浏览器验证。
- 损坏备份与存储失败：校验测试，原数据不覆盖。
- 子目录部署和手机溢出：生产预览与线上核验。

## Tasks
- [x] 1. `scripts/extract_poems.py`生成`src/data/poems.json`及核验报告，保留原文PDF；运行数量、序列、异常字符及跨页测试。
- [x] 2. 先编写`tests/study.test.mjs`，再实现`src/lib/study.mjs`：normalizeAnswer、makeQuestions、gradeAnswer、recordAttempt、scheduleReview、validateBackup。运行Node测试。
- [x] 3. 实现`src/App.jsx`、`src/components/`和`src/styles.css`：首页、题库、背诵、抢答、错句与设置，连接真实进度，验证完整操作。
- [x] 4. 生成桌面/手机截图，对照融合图记录`design-qa.md`并修复；检查可访问性和控制台。
- [ ] 5. 配置`.github/workflows/deploy.yml`，构建验证后创建GitHub仓库、推送、开启Pages，并核验线上资源。
