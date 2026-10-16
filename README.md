# 温故 · 诗词备赛

[在线使用](https://1887415157hhh39.github.io/poem-website/) · [GitHub仓库](https://github.com/1887415157hhh39/poem-website)

面向院级诗词抢答比赛的个人备赛网站，支持手机与电脑，使用GitHub Pages托管。

- 学校指定200篇：诗162篇、词38篇，包含现代诗。
- 逐句阅读、遮字、首字提示、自评掌握与1/3/7/14天递增复习。
- 上下句、挖空、作者、篇名练习；先抢答后自评，或输入答案自动判分。
- 错误、超时、提示题自动回练；答对后移出错句。
- 邮箱注册、登录和重设密码；同一账号自动同步学习进度、抢答记录、错句和设置。
- 本机与账号缓存分开保存，首次登录可确认合并访客记录；支持断网记忆与联网后重试，以及JSON导出、导入。

## 本地使用

需要Node.js 22+。

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 4173
```

```powershell
npm test
npm run build
```

静态文件输出至`dist/client`。GitHub Actions在推送main后自动测试、构建和部署；仓库Pages发布源设置为GitHub Actions。相对资源路径和哈希导航支持项目子目录。

## 题库来源与复现

原始材料位于`public/curriculum.pdf`，来源为用户提供的《中国传媒大学本科通识素养诗词基本篇目》。材料版权归相应权利人；本站用于个人学习，不宣称拥有原文版权。

抽取结果带原文页码；已检查数量、编号、跨页衔接，分离三处小序并修复一处PDF字符映射异常。并非全部原文逐字人工校订，具体说明见`docs/corpus-audit.json`。如有异文，以比赛指定版本为准。

安装PyMuPDF后可重新生成：

```powershell
python scripts/extract_poems.py public/curriculum.pdf
```

设计依据为`docs/design/approved-reference.png`。题库保存在`src/data/poems.json`，学习逻辑在`src/lib/study.mjs`，不同功能视图在`src/components/`。

## 邮箱与云同步

前端继续由GitHub Pages托管，Supabase负责邮箱认证和数据库。云端只保存该账号的学习状态，不上传诗词PDF。浏览器使用公开的publishable key，数据库通过RLS限制每个账号只能访问自己的记录；服务端RPC核对账号ID并使用版本号比较后写入，发生并发冲突时客户端合并重试。

学习记录按篇目合并；设置按字段合并，同一字段以较新操作为准（时间相同以操作ID稳定裁决）。答题历史按ID去重，保留最近5000条。错句有持久的答对标记，避免旧设备复活已改对题目。设备时钟应保持准确；离线期间的进度需要重新打开网站并联网后才能上传。两台同时在线的设备约每20秒检查一次更新，也会在返回页面、恢复网络时立即检查。

首次部署到自己的项目时：

1. 在Supabase SQL编辑器执行`supabase/migrations/202610160001_email_progress.sql`。
2. Auth → URL Configuration：Site URL和Redirect URLs都填写实际网站根地址（本站为`https://1887415157hhh39.github.io/poem-website/`）。邮箱验证保持开启。
3. 将`.env.example`复制为`.env.local`，填写项目URL与公开publishable key。不要填写`sb_secret_`、`service_role`或管理令牌。无配置时可继续仅本机学习。
4. GitHub仓库Settings → Secrets and variables → Actions → Variables，设置同名`VITE_SUPABASE_URL`与`VITE_SUPABASE_PUBLISHABLE_KEY`。工作流在构建时注入，并校验密钥类型。
5. 在网站“设置与同步”注册邮箱，点击确认邮件，再登录同一账号。已有本机学习记录需要点击“合并本机学习记录”才会上传。

Supabase默认邮件服务通常仅支持项目团队成员邮箱，个人使用请用Supabase账号邮箱；开放给其他用户前需要配置自己的SMTP并核实邮件额度。注册请求成功不等于邮件已投递，实际收信与确认需要使用者验证。密码由Supabase认证服务处理，应用的学习备份不包含密码或登录令牌。

账号缓存保留在当前浏览器，退出后回到访客记录；公共设备使用后应退出并清除站点数据。清除浏览器数据会删除尚未上传的离线记录，建议等到“进度已同步”再换设备，并定期导出独立备份。当前同步方案不包含多人对战或协作编辑。

## 字体

本站本地加载基于Google Fonts Noto Serif SC和Noto Sans SC的子集字体（WenGu Serif/Sans），遵循SIL Open Font License 1.1，许可证位于`public/fonts/`。`scripts/prepare-font.py`可用fonttools和brotli重新生成子集，无需在阅读时连接Google Fonts。
