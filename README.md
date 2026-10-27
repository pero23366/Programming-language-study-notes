# Programming Language Study Notes

> 这是我的语言学习记录，你可以将其内容喂给 AI 作为自己的学习边界。

![C](https://img.shields.io/badge/C-language-00599C?logo=c&logoColor=white)
![C#](https://img.shields.io/badge/C%23-language-239120?logo=csharp&logoColor=white)
![.NET](https://img.shields.io/badge/ASP.NET_Core-learning-512BD4?logo=dotnet&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

所有笔记均为 Markdown 手写整理，记录的是**从零开始**学编程时踩过的坑、想通的概念和可复用的代码片段。全部公开，欢迎参考。

今后的学习笔记分享也会在这里发布。

---

## 学习路线

```
C  →  C#  →  ASP.NET Core  →  HTML  →  CSS  →  JS  →  TS  →  Vue
                    ▲
              正在学习中
```

| 阶段 | 语言 / 技术 | 状态 | 笔记数量 |
| :--: | :-- | :--: | :--: |
| 01 | **C** 语言基础 | 已完成 | 15 篇 + 13 份 PDF |
| 02 | **C#** 入门 / 基础 / 核心 / 进阶 | 已完成 | 103 篇 |
| 03 | **ASP.NET Core**（配置、DI、EF Core、LINQ、异步、日志……） | 🚧 正在学习 | 79 篇 |
| 04 | **HTML** | 已完成 | 19 篇 |
| 05 | **CSS**（布局、动效、响应式、SVG……） | 已完成 | 84 篇 |
| 06 | **JavaScript**（基础 + DOM + 进阶 ES6） | 已完成 | 31 篇 |
| 07 | **TypeScript**（类型系统 + 泛型 + 声明文件） | ✅ 主线完成 | 14 篇 |
| 08 | **Vue**（Vue2 心智 → Vue3 组合式 + 实战） | 🚧 正在学习 | 26 篇 |

合计 **371 篇** Markdown 笔记。

> TypeScript 笔记按四个阶段组织：基础篇（01-25 集）→ 类相关篇（26-48 集）→ 泛型相关篇（49-68 集）→ 进阶篇（69-80 集）。
> 课程 81-92 集是 React 实战，与 TS 主线无关，单独放在 `TS/TS进阶篇-React预习/`，等学框架时再读。
>
> Vue 笔记按能力分段组织：基础篇（响应式 / 指令 / 计算属性 / 生命周期）→ 组件篇 → 路由与状态篇 → 组合式篇 → 实战篇。
> 采用「用 Vue2 学原理，用 Vue3 写代码」的路线：Vue2 段只学与版本无关的心智，工程化之后全部用 Vue3 + Vite。

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
    ├── JS/                 # 06 JavaScript 基础、DOM、进阶
    ├── TS/                 # 07 TypeScript（按四阶段分子目录）
    │   ├── TS基础篇/                    # 01-25 集：类型注解、接口、函数类型
    │   ├── TS核心篇-类相关/              # 26-48 集：class、枚举、类型兼容性
    │   ├── TS核心篇-泛型相关/            # 49-68 集：泛型、工具类型、映射类型
    │   ├── TS进阶篇/                    # 69-80 集：类型声明文件、tsconfig
    │   └── TS进阶篇-React预习/          # 81-92 集：React 实战（暂缓）
    └── Vue/                # 08 Vue（按能力分段分子目录）
        ├── Vue--基础篇/                  # 实例、插值、响应式、指令、计算属性、生命周期
        ├── Vue--组件篇/                  # 工程化、组件注册、通信、插槽
        ├── Vue--路由与状态篇/            # vue-router 路由基础（072-078）、状态归属问题
        ├── Vue3--组合式篇/               # setup、ref/reactive、Pinia
        └── Vue--实战篇/                  # 大事件后台管理项目
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

> 该课程共 196 集，分 Part1~Part6 六大章节。Part1、Part2 已全部整理完，Part3 起按 `ASP.NET Core--后端学习方案.md` 里的 23 批清单推进（方案内含逐节页码与优先级，可当学习进度表用）。

### HTML / CSS

- [2025 版 pink 老师最新 AI+前端入门教程，零基础必看的 html5、css3、grid、flex 布局、响应式、移动端，bootstrap5 框架，AI 工具](https://www.bilibili.com/video/BV1MvaVzUEuz?vd_source=7ded051cec3c99d6e968b122e2017be3)

### JavaScript

- [黑马程序员前端 JavaScript 入门到精通全套视频教程，javascript 核心进阶 ES6 语法、API、js 高级等基础知识和实战教程](https://www.bilibili.com/video/BV1Y84y1L7Nn?vd_source=7ded051cec3c99d6e968b122e2017be3)

### TypeScript

- [黑马程序员前端 TypeScript 教程，TypeScript 零基础入门到实战全套教程](https://www.bilibili.com/video/BV14Z4y1u7pi?vd_source=7ded051cec3c99d6e968b122e2017be3)

> 该课程共 92 集，其中 69-75 集是类型声明文件、79-80 集是 `tsconfig`（本笔记主线覆盖到 80 集），81-92 集是用 React 做实战案例，与 TS 本身无关，笔记单独归档在 `TS进阶篇-React预习/`。

---

## 怎么用这份笔记

- **当速查表**：文件名即知识点，比如 `csharp--Dictionary&List.md`、`CSS--filter滤镜.md`、`JS--日期与时间戳速查表.md`。
- **喂给 AI 当上下文**：把这些 `.md` 直接丢进大模型，告诉它「以这份笔记的范围为知识边界」，能得到更贴合我当前水平的解释与练习，不会飘到你还没学的概念上。
- **按路线顺序读**：C → C# → ASP.NET Core → HTML → CSS → JS → TS，前端部分放在后端之后，是因为先在 C# 里练过面向对象，再看 JS 的原型链会轻松很多；TS 放在 JS 之后，是因为它的类型系统跟 C# 同源（Anders Hejlsberg），两者对照着看最快。

> 笔记是个人学习过程的第一手记录，受当时理解所限，可能存在表述不准或笔误。如果发现错误，欢迎提 Issue 指正。

---

## Star

如果这份笔记对你有一点点帮助，**请点亮 Star ⭐**，这是我持续更新的最大动力。

[![Star History Chart](https://api.star-history.com/svg?repos=pero23366/Programming-language-study-notes&type=Date)](https://star-history.com/#pero23366/Programming-language-study-notes&Date)

---

## 许可

本项目采用 [MIT License](LICENSE)，可自由参考、引用、二次整理，注明出处即可。
