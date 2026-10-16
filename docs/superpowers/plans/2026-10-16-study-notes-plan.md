# 每篇理解与注释 Implementation Plan

> **For agentic workers:** Execute inline in the authorized checkout. No delegation is needed.

**Goal:** 为200篇提供可查来源、贴合指定文字的重点理解注释与背诵路线。

**Architecture:** 手工整理分组静态JSON；Reader的独立StudyNotes组件按需加载；纯函数验证并解析数据。源文本及同步模块保持不变。

**Tech Stack:** Existing React/CSS, Node test runner, Playwright CLI, axe-core.

**Spec:** ../specs/2026-10-16-study-notes-design.md

## Constraints / review focus
- 覆盖200篇，不用默认通用说明冒充注释。
- 同名篇按首句定位；材料中的组诗、并收内容与小序应单独处理。
- 词句与路线有原文锚点，参考链接真实且区分整理与来源。
- 遮字模式切换收起内容，定位不改变揭晓状态或原文。
- 按需加载与错误状态可用；不写入学习／账号状态。

## Tasks
- [x] 1. 逐篇读取指定文字，检索与整理参考链接，校核疑难及材料差异。
- [x] 2. 完成200篇大意、重点词句与背诵思路的分组数据，增加内容覆盖和锚点校验。
- [x] 3. 实现按需注释面板、模式切换收起、原文定位及响应式样式。
- [x] 4. 校验数据、运行测试与构建、浏览器逐类验证与截图，更新字体与说明。
- [ ] 5. GitHub Pages发布并核验正式网址，记录完成结果。
