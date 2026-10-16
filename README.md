# 温故 · 诗词备赛

[在线使用](https://1887415157hhh39.github.io/poem-website/) · [GitHub仓库](https://github.com/1887415157hhh39/poem-website)

面向院级诗词抢答比赛的个人备赛网站，支持手机与电脑，使用GitHub Pages托管。

- 学校指定200篇：诗162篇、词38篇，包含现代诗。
- 逐句阅读、遮字、首字提示、自评掌握与1/3/7/14天递增复习。
- 上下句、挖空、作者、篇名练习；先抢答后自评，或输入答案自动判分。
- 错误、超时、提示题自动回练；答对后移出错句。
- 浏览器本地保存，支持JSON导出、导入。无账号，无自动跨设备同步。

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

## 字体

本站本地加载基于Google Fonts Noto Serif SC和Noto Sans SC的子集字体（WenGu Serif/Sans），遵循SIL Open Font License 1.1，许可证位于`public/fonts/`。`scripts/prepare-font.py`可用fonttools和brotli重新生成子集，无需在阅读时连接Google Fonts。
