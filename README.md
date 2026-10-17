# Programming Language Study Notes

> 这是我的语言学习记录，你可以将其内容喂给 AI 作为自己的学习边界。

![C](https://img.shields.io/badge/C-language-00599C?logo=c&logoColor=white)
![C#](https://img.shields.io/badge/C%23-language-239120?logo=csharp&logoColor=white)
![.NET](https://img.shields.io/badge/ASP.NET_Core-learning-512BD4?logo=dotnet&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

所有笔记均为 Markdown 手写整理，记录的是**从零开始**学编程时踩过的坑、想通的概念和可复用的代码片段。全部公开，欢迎参考。

今后的学习笔记分享也会在这里发布。

---

## 学习路线

```
C  →  C#  →  ASP.NET Core  →  HTML  →  CSS  →  JS
                    ▲
              正在学习中
```

| 阶段 | 语言 / 技术 | 状态 | 笔记数量 |
| :--: | :-- | :--: | :--: |
| 01 | **C** 语言基础 | 已完成 | 15 篇 + 13 份 PDF |
| 02 | **C#** 入门 / 基础 / 核心 / 进阶 | 已完成 | 103 篇 |
| 03 | **ASP.NET Core**（配置、DI、EF Core、LINQ、异步、日志……） | 🚧 正在学习 | 62 篇 |
| 04 | **HTML** | 已完成 | 19 篇 |
| 05 | **CSS**（布局、动效、响应式、SVG……） | 已完成 | 84 篇 |
| 06 | **JavaScript**（基础 + DOM + 进阶 ES6） | 已完成 | 30 篇 |

合计 **313 篇** Markdown 笔记。

---

## 目录导航

```
.
├── c语言学习笔记/          # 01 C 语言
│   ├── c学习笔记markdown版本/   # Markdown 正文（推荐阅读）
│   ├── 笔记/                    # 原始导出的 PDF 版本
│   └── 说明/                    # 学习说明
├── CSharp/                 # 02 C# 四部曲笔记（面向对象、集合、委托事件、反射、多线程……）
├── 后端学习/
│   └── Asr.Net.Core/       # 03 ASP.NET Core 学习笔记
└── 前端学习/
    ├── HTML/               # 04 HTML 结构与语义化
    ├── CSS/                # 05 CSS 基础、布局、动效
    └── JS/                 # 06 JavaScript 基础、DOM、进阶
```

各目录的阅读顺序基本按文件名中的序号 / 数字排列（如 `c语言00--造轮子.md`、`JS--进阶篇01-…`），也按知识依赖排列。

---

## 对应视频教程

笔记为配套视频所写，看不清概念时建议回到原视频。

### C

- [黑马程序员 C 语言零基础入门到精通全套视频教程，计算机二级 C 语言、专升本、考研、期末、嵌入式开发一套搞定](https://www.bilibili.com/video/BV1Xa4y1k7LU?vd_source=7ded051cec3c99d6e968b122e2017be3)

### C#（唐老狮 · Unity 系列之 C# 四部曲）

1. [【唐老狮】Unity 系列之 C# 四部曲 — C# 入门](https://www.bilibili.com/video/BV1PA411p7A6?vd_source=7ded051cec3c99d6e968b122e2017be3)
2. [【唐老狮】Unity 系列之 C# 四部曲 — C# 基础](https://www.bilibili.com/video/BV1Kv411s7VG?vd_source=7ded051cec3c99d6e968b122e2017be3)
3. [【唐老狮】Unity 系列之 C# 四部曲 — C# 核心](https://www.bilibili.com/video/BV1tV411q7Rq?vd_source=7ded051cec3c99d6e968b122e2017be3)
4. [【唐老狮】Unity 系列之 C# 四部曲 — C# 进阶](https://www.bilibili.com/video/BV1Ar4y1K7AK?vd_source=7ded051cec3c99d6e968b122e2017be3)

### ASP.NET Core

- [.NET 教程，.NET Core 视频教程，杨中科主讲](https://www.bilibili.com/video/BV1pK41137He?vd_source=7ded051cec3c99d6e968b122e2017be3)

### HTML / CSS

- [2025 版 pink 老师最新 AI+前端入门教程，零基础必看的 html5、css3、grid、flex 布局、响应式、移动端，bootstrap5 框架，AI 工具](https://www.bilibili.com/video/BV1MvaVzUEuz?vd_source=7ded051cec3c99d6e968b122e2017be3)

### JavaScript

- [黑马程序员前端 JavaScript 入门到精通全套视频教程，javascript 核心进阶 ES6 语法、API、js 高级等基础知识和实战教程](https://www.bilibili.com/video/BV1Y84y1L7Nn?vd_source=7ded051cec3c99d6e968b122e2017be3)

---

## 怎么用这份笔记

- **当速查表**：文件名即知识点，比如 `csharp--Dictionary&List.md`、`CSS--filter滤镜.md`、`JS--日期与时间戳速查表.md`。
- **喂给 AI 当上下文**：把这些 `.md` 直接丢进大模型，告诉它「以这份笔记的范围为知识边界」，能得到更贴合我当前水平的解释与练习，不会飘到你还没学的概念上。
- **按路线顺序读**：C → C# → ASP.NET Core → HTML → CSS → JS，前端部分放在后端之后，是因为先在 C# 里练过面向对象，再看 JS 的原型链会轻松很多。

> 笔记是个人学习过程的第一手记录，受当时理解所限，可能存在表述不准或笔误。如果发现错误，欢迎提 Issue 指正。

---

## Star

如果这份笔记对你有一点点帮助，**请点亮 Star ⭐**，这是我持续更新的最大动力。

[![Star History Chart](https://api.star-history.com/svg?repos=pero23366/Programming-language-study-notes&type=Date)](https://star-history.com/#pero23366/Programming-language-study-notes&Date)

---

## 许可

本项目采用 [MIT License](LICENSE)，可自由参考、引用、二次整理，注明出处即可。
