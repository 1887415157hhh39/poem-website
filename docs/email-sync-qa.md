# 邮箱同步验证记录 · 2026-10-16

前端托管保持GitHub Pages，云端项目为`wengu-poetry`（`zlmpibqtsrdmhmlhxbsx`，新加坡区域，Free组织）。公开URL与publishable key通过GitHub仓库Variables注入；`.env.local`不提交。用户已确认保存正式站点的Site URL与Redirect URLs。

## 已验证

- `npm test`：26项通过。包含既有200篇题库/背诵/答题逻辑，以及合并交换性/幂等性、分字段设置、错句删除标记、备份兼容、导入元数据、账号缓存隔离、显式访客迁移、存储失败、CAS冲突、在途本地更新、切换账号后迟到响应与断网重试。
- `npm run test:sites`：4项通过。原模板发布协议保留。
- `npm run build`通过，浏览器配置校验只允许公开密钥。产物保留`dist/client`与Sites兼容文件。
- 本地PGlite执行实际迁移SQL：账号A/B的RLS隔离、匿名访问拒绝、跨账号RPC拒绝、更新revision增长、过期revision返回最新数据而不覆盖。
- 真实Supabase数据库事务验证上述CAS与权限行为，临时用户ID和进度均在事务结束时回滚，没有发送测试邮件或创建可登录测试账号。
- 独立Playwright浏览器，使用两份隔离的浏览器Context和拦截的Supabase接口：注册/重设请求的根地址回跳、登录失败中文提示、显式访客合并、第二设备下载、断网更改与另一设备同时学习后的合并、退出恢复访客、其他账号不继承记录，均通过。此项是浏览器集成模拟，不代表真实邮件投递或真实账号跨设备验收。
- 独立Playwright密码恢复模拟：识别recovery回调、移除URL中的token、进入新密码表单、提交密码修改、刷新后恢复同一账号并同步，均通过。
- 320、390、834、1440像素宽度无水平溢出；登录/已登录页axe WCAG 2 A/AA及2.1 AA扫描均0项违规；浏览器模拟无未捕获异常。移动登录截图见`docs/design/email-login-mobile.png`。
- 正式部署提交`f278537`，GitHub Actions[38862212988](https://github.com/1887415157hhh39/poem-website/actions/runs/38862212988)构建、测试与发布均成功。线上隔离浏览器向真实Supabase发送一次保留域名邮箱的无效登录，返回400并显示中文凭据错误，没有发送邮件；注册表单、项目子目录、PDF HEAD 200与类型、390像素无溢出、axe 0项、无未捕获异常均核对。截图初次等待字体加载超时，随后正式页面`document.fonts.status=loaded`并成功截图`docs/design/email-production-mobile.png`。
- 实际公开Auth设置确认邮箱登录与注册开启、邮箱确认开启、匿名登录关闭。Supabase安全Advisor返回空列表。

## 需要使用者完成的真实验收

默认Supabase邮件服务仅支持项目团队邮箱且有频率限制。使用注册Supabase的邮箱在正式网站注册，由使用者自行设置密码并点击确认邮件；然后在第二台设备登录同一账号，分别学习一篇，检查双方显示“进度已同步”并看到合并进度。应用不索取或记录使用者密码；此真实邮箱链路尚未代替使用者验收。

离线支持指已打开网站中的进度缓存与联网补传，不包含首次离线打开网站的PWA缓存。账号快照留在本机直到清除站点数据，云端只保存最新合并状态；独立JSON备份仍有必要。设备时钟影响同一篇目/同一设置的较新操作裁决。

参考官方文档：[邮箱密码](https://supabase.com/docs/guides/auth/passwords)、[回跳地址](https://supabase.com/docs/guides/auth/redirect-urls)、[默认邮件服务](https://supabase.com/docs/guides/auth/auth-smtp)。
