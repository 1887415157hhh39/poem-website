# 拼音 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Reuse the authorized existing checkout.

**Goal:** 为现有200篇诗词增加可开关、有校核依据的完整带调拼音。

**Architecture:** 开源词典构建静态逐字数据，篇目/原句修订独立维护；纯函数按遮罩生成展示token；Reader用ruby呈现，视图偏好独立本机保存。

**Tech Stack:** React, Node test runner, pinyin-pro build-only, existing Playwright CLI.

**Spec:** ../specs/2026-10-16-pinyin-design.md

## Global Constraints
- 原始200篇文字、题库、学习状态和同步协议不改。
- 按用户选定的现代普通话与教材常用读法；特殊字音修订可追溯，有争议则注明。
- 拼音默认关闭；遮住的字不显示拼音，揭晓同步显示。
- 词典依赖只用于离线生成，不进入客户端。

## Review Focus
- 长拼音及现代诗长句在320像素屏幕上也应正常换行。
- 原文异体字、古语虚词、专名不得按现代常见词机械处理。
- 开关失败不能影响学习记录；浏览器存储不可用仍可切换。
- 同一多音字在不同句子需有不同读音；修订不可全局误伤。
- 新数据需防止原文更新后字符索引错位或出现缺注。

## Tasks
- [x] 1. 编写数据覆盖、修订锚点和关键读音测试；构建可复现的静态注音生成器与审校记录，检查全题库候选多音字及漏注。
- [x] 2. 实现遮字安全的拼音token函数、ruby显示组件和阅读页开关；测试全文/遮字/揭晓与逐字对应。
- [x] 3. 运行全部测试与构建，实际浏览器验证桌面/手机、持久偏好、无障碍与原功能，更新字体子集和说明。
- [ ] 4. 发布GitHub Pages，核验线上特殊读音、开关及遮字流程，记录结果。
