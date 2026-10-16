# 邮箱云同步 Implementation Plan

> **For agentic workers:** Execute inline using superpowers:executing-plans.

**Goal:** 在现有GitHub Pages网站加入邮箱登录、离线缓存和可靠的跨设备同步。

**Architecture:** 合并纯函数＋账号隔离存储＋CAS同步器，与Supabase适配及React账号界面分开。数据库RLS与原子revision检查双重约束。

**Tech Stack:** React, Supabase JS, Postgres SQL, Node test runner, PGlite for actual SQL verification.

**Spec:** ../specs/2026-10-16-email-sync-design.md

## Global Constraints
- 既有200篇题库、视觉、备份和本机学习继续可用。
- 邮箱＋密码，按账号隔离，明确迁移游客进度。
- 公开密钥可以进入前端；管理密钥不得进入前端、仓库或日志。
- 只有真实远端确认且当前进度已全部上传，才显示已同步。

## Review Focus
- 旧备份没有同步元数据，升级必须保留原学习记录。
- 同时学习、离线回练与旧缓存返回，不能丢历史或复活旧错句。
- 账号切换发生在网络请求中途，不能串号或覆盖新账号。
- 配置缺失、损坏数据和网络错误不能破坏本机学习。
- 注册确认、密码恢复回调与现有哈希路由不能冲突。

## Tasks
- [x] 1. 测试先行，实现`src/lib/sync-state.mjs`与`src/lib/progress-store.mjs`，覆盖元数据迁移、合并、缓存隔离和游客迁移。
- [x] 2. 测试先行，实现`src/lib/sync-engine.mjs`与Supabase SQL迁移，验证原子冲突、在途更新、切换账号及RLS权限。
- [x] 3. 实现Supabase适配、React钩子、邮箱账号面板和设置页集成；配置校验与部署变量。
- [x] 4. 运行全部逻辑/SQL测试、构建、桌面与手机浏览器验证，更新QA与接通说明。
- [x] 5. 连接用户Supabase，创建数据库及Auth配置，部署并线上核验。数据库、真实SQL权限/CAS验证、用户Auth地址设置、发布和线上认证接口/表单检查均完成；部署提交`f278537`，见`docs/email-sync-qa.md`。
- [ ] 6. 使用者自行注册、设置密码和验证邮箱后，在真实两台设备登录验收。浏览器模拟双设备已通过，不代替这一步。
