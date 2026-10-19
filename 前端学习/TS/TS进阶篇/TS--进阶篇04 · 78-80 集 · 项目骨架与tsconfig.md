# TS--进阶篇04 · 78-80 集 · 项目骨架与 tsconfig

> **对应课程**：黑马《前端 TypeScript 教程》BV14Z4y1u7pi 第 **78 / 79 / 80** 集（章内 10-12），共 **40 分 19 秒**。
> **读法**：全文贯穿 **TS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **本篇定位**：**配置层**。前三组讲"类型是什么"，这三集讲"**编译器按什么规则工作**"。信息密度全章最高。
> **前置**：已建好项目（进阶篇03 实验五）。**没建也能读** —— 但 79 集建议开着 `tsconfig.json` 对照看。

---

==一：概念==

## 1. 78 集：项目目录结构（15'02"）🔥

### 1.1 CRA 建出来的长什么样

```
my-app/
├── node_modules/
├── public/
│   └── index.html              ← 真正的 HTML 外壳（只有一个 <div id="root">）
├── src/
│   ├── App.css
│   ├── App.test.tsx            ← 测试文件也是 .tsx
│   ├── App.tsx                 ← ⭐ 根组件
│   ├── index.css
│   ├── index.tsx               ← ⭐ 入口（把 App 挂到 #root）
│   ├── logo.svg
│   ├── react-app-env.d.ts      ← ⭐ 全项目唯一的类型声明文件
│   ├── reportWebVitals.ts
│   └── setupTests.ts
├── package.json
├── tsconfig.json               ← ⭐ 编译器配置
└── README.md
```

⭐ **只有三个文件是 TS 特有的**，其余都是 JS 项目也有的：

| 文件 | 作用 | 一句话 |
|---|---|---|
| `index.tsx` | 入口 | `ReactDOM.createRoot(...).render(<App />)` |
| `App.tsx` | 根组件 | 你写业务的地方 |
| `react-app-env.d.ts` | 类型声明 | **一行三斜线指令**，给全项目开类型 |

### 1.2 `react-app-env.d.ts` 里到底是什么

**整个文件只有一行**：

```ts
/// <reference types="react-scripts" />
```

⭐ **这一行的作用**：把 `react-scripts` 包里的**全部类型声明**（包括 `*.css` / `*.svg` 的模块声明、`process.env` 的类型、`jest` 的全局类型）一次性引入。

**回忆进阶篇01 §3.4**：三斜线 `/// <reference>` 就是「**单文件级别的引入声明**」。这里是它最典型的实战用法。

⚠️ **用 Vite 的话没有这个文件**。Vite 用另一种方式：

```ts
// src/vite-env.d.ts（Vite 模板自带）
/// <reference types="vite/client" />
```

**思想完全一样，只是换了包名。**

### 1.3 ⭐ 为什么必须是 `.tsx` 而不是 `.ts`

**因为 JSX 语法在 `.ts` 里不合法。**

```ts
// App.ts (❌)
const App = () => <div>hello</div>
```

```
error TS1005: '>' expected.
```

**规则**：

| 文件里有 JSX | 扩展名 |
|---|---|
| ✅ 有 | `.tsx` |
| ❌ 没有（纯类型/纯逻辑） | `.ts` |
| 有 JSX 但写成 `.ts` | ❌ **语法错误** |

⚠️ **`.tsx` 不是"更高级的 `.ts`"** —— 它打开了 JSX 解析，**代价是尖括号有了第二个含义**，于是引出下面两个坑。

### 1.4 ⚠️ 坑一：`.tsx` 里不能写 `<T>` 类型断言

```tsx
// t.tsx
const x = <string>window.title
```

**实测报错（逐字）**：

```
t.tsx(1,12): error TS17008: JSX element 'string' has no corresponding closing tag.
t.tsx(3,1): error TS1005: '</' expected.
```

⭐ **编译器把 `<string>` 当成了一个 JSX 开标签**，然后苦等 `</string>`。

**唯一解法：用 `as`**。

```tsx
const x = window.title as string      // ✅
```

> **这条在 JS 阶段是"推荐用 as"，在 `.tsx` 里是"必须用 as"。**

### 1.5 ⚠️ 坑二：`.tsx` 里泛型箭头函数要加逗号

```tsx
// g.tsx
const id = <T>(x: T): T => x
```

**实测报错**：

```
g.tsx(1,13): error TS17008: JSX element 'T' has no corresponding closing tag.
g.tsx(1,26): error TS1382: Unexpected token. Did you mean `{'>'}` or `&gt;`?
```

**解法**：加一个逗号，让它不再像标签。

```tsx
const id = <T,>(x: T): T => x       // ✅ 实测通过
```

⭐ **为什么是逗号**：`<T,>` 不是合法 JSX（标签名不能有逗号），编译器只能按泛型解析。**这是社区约定俗成的写法。**

### 1.6 `index.tsx` 干了什么（三行看完整）

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
```

⚠️ **注意 `!`（非空断言）**：`getElementById` 返回 `HTMLElement | null`，而 `createRoot` 要 `HTMLElement`。这里用 `!` 告诉编译器"我保证不为 null"。

> **这是 `strictNullChecks` 的日常代价** —— 每一处"我确定不为空"，都得自己写 `!` 或做判断。

---

## 2. 79 集：`tsconfig.json` 详解（18'32"）🔥🔥🔥

**全章信息密度最高的一集。** 我不逐个抄课程，而是按「**这个字段会怎么坑你**」来组织。

### 2.1 CRA 的完整 tsconfig（一字不改）

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

**只有 16 个字段 + 1 个 `include`。** 别被网上的长配置吓到 —— **这就是一个能跑生产的配置**。

### 2.2 逐字段：哪些必须懂、哪些可以不管

| 字段 | 值 | 干什么 | 重要度 |
|---|---|---|---|
| `target` | `es5` | 编译到哪个 JS 版本（**降级语法**） | 🔥🔥 |
| `lib` | `dom, dom.iterable, esnext` | 加载哪些类型声明（**声明世界**） | 🔥🔥 |
| `module` | `esnext` | 输出哪种模块格式 | 🔥 |
| `moduleResolution` | `node` | 怎么找模块 | 🔥🔥 |
| `jsx` | `react-jsx` | JSX 怎么编译 | 🔥🔥 |
| `strict` | `true` | 严格模式总开关 | 🔥🔥🔥 |
| `noEmit` | `true` | **不产出 JS**（只查错） | 🔥🔥 |
| `isolatedModules` | `true` | 每个文件独立编译 | 🔥 |
| `esModuleInterop` | `true` | 让 CJS 的 `import` 顺手 | 🔥 |
| `skipLibCheck` | `true` | 跳过 `.d.ts` 内部检查 | ⭐（但很实用） |
| `allowSyntheticDefaultImports` | `true` | 类型层允许默认导入 | ⭐ |
| `forceConsistentCasingInFileNames` | `true` | 大小写一致（跨平台） | ⭐ |
| `resolveJsonModule` | `true` | 能 `import data from './x.json'` | ⭐ |
| `noFallthroughCasesInSwitch` | `true` | switch 穿透检查 | ⚪ |
| `allowJs` | `true` | 允许 JS 参与编译 | ⭐ |
| `include` | `["src"]` | **哪些文件算项目的一部分** | 🔥🔥 |

### 2.3 ⭐ `target` 与 `lib`：最容易搞混的一对

**这是 TS 里最容易混的两个字段**，课程讲得比较快，我给你一张图：

| | `target` | `lib` |
|---|---|---|
| 管什么 | **语法**能不能用 | **API/类型**认不认识 |
| 影响产物 | ✅ 产物语法会降级 | ❌ 完全不影响产物 |
| 举例 | `target: es5` → `async` 被转成 `__awaiter` | `lib` 里没 `es2015` → `Promise` 报错 |
| 举例 | `target: es5` → 箭头函数转 `function` | `lib` 里没 `dom` → `document` 报错 |

⭐ **一句话总结**：
> **`target` 决定"你写的新语法怎么变旧"；`lib` 决定"你以为运行环境有什么"。**

⚠️ **最常见的事故**：`target: es5` + 用了 `Promise` → **编译通过，IE 里炸**。因为 `target` 只管语法降级，**不管 API 的 polyfill**。

```js
// target: es5 编译后
var p = new Promise(...)      // ← Promise 还在！只是语法变了，API 没补
```

> **C# 类比**：`target` ≈ `LangVersion`（语法版本）；`lib` ≈ 引用了哪些 `System.*` 程序集。**C# 里这两件事本来分得很清，TS 里却经常被混为一谈。**

### 2.4 ⭐ `jsx`：四个值，实际只用两个

| 值 | 产物 | 需要 `import React` 吗 | 什么时候用 |
|---|---|---|---|
| `react` | `React.createElement(...)` | ✅ **必须** | React 16 及以前 |
| `react-jsx` | `_jsx(...)`（自动引入） | ❌ **不需要** | **React 17+（现代默认）** |
| `react-jsxdev` | `_jsxDEV(...)`（带调试信息） | ❌ | 开发模式 |
| `preserve` | **原样保留 JSX** | — | 交给别的工具处理（如 esbuild） |

⭐ **这一条解释了一个高频困惑**：

> 「为什么我 `import React from 'react'` 之后 ESLint 说 `'React' is defined but never used`？」

**因为 `jsx: react-jsx` 时代不需要 `import React` 了。** 但课程年代（2022）写的代码还有这行 —— **它没错，只是多余**。

⚠️ **反过来**：如果你的项目 `jsx: "react"`（老项目），**忘了 `import React` 会报 `React is not defined`**（运行时报错，不是编译期）。

### 2.5 `strict`：一个开关，八个检查

```json
{ "compilerOptions": { "strict": true } }
```

**等价于**：

| 子选项 | 检查什么 | 典型报错 |
|---|---|---|
| `noImplicitAny` | 推断不出类型时**禁止隐式 `any`** | `TS7006: Parameter 'x' implicitly has an 'any' type.` |
| `strictNullChecks` | `null` / `undefined` **不能随便赋给别的类型** | `TS2322: Type 'null' is not assignable to type 'string'.` |
| `strictFunctionTypes` | 函数参数**逆变**检查 | 回调参数类型不符时 |
| `strictBindCallApply` | `bind` / `call` / `apply` 参数检查 | 参数个数/类型不符 |
| `strictPropertyInitialization` | 类属性**必须初始化** | `TS2564: Property 'x' has no initializer.` |
| `noImplicitThis` | `this` 不能隐式 `any` | 方法里 `this.xxx` 报错 |
| `alwaysStrict` | 产物加 `"use strict"` | — |
| `useUnknownInCatchVariables` | `catch (e)` 里 `e` 是 `unknown` | TS 4.4+，`e.message` 报错 |

⭐ **`strict: true` 是整份配置里最值钱的一行**。**新项目一律开，老项目逐个击破。**

⚠️ **但要知道它带来的日常代价**：

```ts
// 开了 strictNullChecks 之后
const el = document.getElementById('app')   // HTMLElement | null
el.innerHTML = 'hi'                          // ❌ 'el' is possibly 'null'
el!.innerHTML = 'hi'                         // ✅ 用非空断言
if (el) el.innerHTML = 'hi'                  // ✅ 更安全
```

> **这就是 `!` 的来源** —— 不是 TS 麻烦，是它在提醒你"这里真的可能是 null"。

### 2.6 ⭐ `noEmit` + `isolatedModules`：为什么 CRA 要这么配

这两个字段经常一起出现，**背后是一件事**：

> **CRA 不用 `tsc` 生成 JS，它用 Babel / SWC 生成；`tsc` 只负责查错。**

| 字段 | 含义 | 后果 |
|---|---|---|
| `noEmit: true` | `tsc` **不产出任何文件** | 只做类型检查 |
| `isolatedModules: true` | **每个文件必须能被单独编译**（不能依赖跨文件信息） | ⚠️ 禁掉 `export =`、`const enum`、纯类型再导出等 |

⚠️ **`isolatedModules` 带来的具体报错**（你一定会遇到）：

```ts
// ❌ 导出纯类型时必须加 type
export { User } from './types'
// error TS1205: Re-exporting a type when 'isolatedModules' is enabled
// requires using 'export type'.

// ✅ 正确
export type { User } from './types'
```

⭐ **这条规矩现在成了通用最佳实践** —— 因为 Vite / esbuild 也是"单文件编译"，同样要求。

### 2.7 `moduleResolution`：`node` vs `bundler`

| 值 | 找模块的方式 | 现代项目 |
|---|---|---|
| `node`（= `node10`） | 经典 Node 解析，**不看 `exports` 字段** | CRA / 老项目 |
| `bundler` | 支持 `package.json#exports`、无扩展名导入 | **Vite / 新项目** |
| `node16` / `nodenext` | 严格按 Node ESM 规则（**必须写扩展名**） | Node 后端 |

⚠️ **症状**：某个新库明明装了，`import` 却报 `Cannot find module` —— **多半是 `moduleResolution` 太老，读不懂它的 `exports` 字段**。

**修法**：改成 `"bundler"`。

### 2.8 `paths`：路径别名（课程没讲，但你必须会）

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

```ts
import { User } from '@/types'      // 不用写 '../../../types'
```

⚠️ **只在类型层面生效** —— **打包器还得单独配一份**（Vite 用 `resolve.alias`，Webpack 用 `resolve.alias`）。
**这是新手最常踩的"类型能过、跑起来 404"**。

### 2.9 `include` / `exclude` / `files`

```json
{
  "include": ["src"],
  "exclude": ["node_modules", "dist"],
  "files": ["src/global.d.ts"]
}
```

| 字段 | 语义 | 注意 |
|---|---|---|
| `include` | 用 **glob** 匹配（默认 `**/*`） | ⚠️ 默认还包含 `.d.ts` |
| `exclude` | 从 `include` 里排除 | ⚠️ **只影响 `include`，不影响被 `import` 的文件** |
| `files` | **精确列文件**（不用 glob） | 里边的文件一定会被编译 |

⭐ **最重要的一条**：**`include` 决定"谁是项目的一部分"** —— 不在 `include` 里的 `.d.ts`，**全局声明根本不生效**（进阶篇01 静默失败 #3）。

---

## 3. 80 集：命令行方式使用编译配置（6'45"）

### 3.1 为什么要学命令行

CRA 里 `tsconfig` 被托管，**改了看不了效果**。想真正理解 79 集的内容，必须能自己跑 `tsc`。

### 3.2 六个必会命令

| 命令 | 作用 | 什么时候用 |
|---|---|---|
| `tsc --init` | 生成一份带注释的 `tsconfig.json` | 新项目起步 |
| `tsc -p ./tsconfig.json` | 用指定配置编译 | 多份配置（build / test） |
| `tsc --noEmit` | **只查类型，不产出** | ⭐ **CI / 提交前必跑** |
| `tsc -w` | watch 模式，改了就重查 | 本地开发 |
| `tsc --showConfig` | 打印**最终生效**的配置（含默认值） | 排查"为什么这个字段没生效" |
| `tsc --explainFiles` | 打印**每个文件为什么被包含** | 排查"这个文件哪来的" |

⭐ **`--showConfig` 是被严重低估的命令**：
**你写的 16 个字段，实际生效可能是 40 个**（其余是默认值）。怀疑某个字段没生效，先跑这个。

### 3.3 `tsc` 与构建工具的分工（一张表说清）

| 谁 | 干什么 | 命令 |
|---|---|---|
| 开发时 | 转译 TS → JS，跑起来 | `vite` / `react-scripts start`（**不用 `tsc`**） |
| 检查时 | 只查类型，不产出 | `tsc --noEmit` |
| 构建时 | 打包压缩 | `vite build` / `react-scripts build` |
| 发布库时 | 产出 `.js` + `.d.ts` | `tsc` + `--declaration` |

⭐ **记住这个分工**：**现代项目里，`tsc` 基本不负责"编译"，只负责"检查"。** 转译交给 esbuild / Babel / SWC —— 因为它们**快 10-100 倍**（它们只擦类型，不做类型检查）。

> **这正是 TS--01 那条"类型擦除"的工程后果**：**擦类型只要语法分析，不需要类型检查，所以可以极快。** 于是"快"的负责转译，"慢"的负责查错。

### 3.4 ⚠️ 你的环境：TS 7 的默认值变了

**实测**：你装的 `tsc` 是 **7.0.2（Go 重写版）**，几个默认值跟课程年代（TS 4.x）**不一样**：

| 选项 | TS 4/5 默认 | **TS 7 默认（你的机器）** |
|---|---|---|
| `strict` | `false` | **`true`** |
| `esModuleInterop` | `false` | **`true`** |
| `target` | `es3` / `es5` | **`es2025`** |

⚠️ **所以你在裸命令行跑 `tsc x.ts` 会比课程里严格得多**。这不是你写错了，是版本变了。

⭐ **另一个实测差异**：**没有 `tsconfig.json` 时，`tsc --noEmit` 在 TS 7 下会打印帮助并退出 1**，不像 TS 5.x 那样编译当前目录。验证时必须**显式列文件名**。

---

==二：格式==

## 1. `.ts` / `.tsx` / `.d.ts` 三兄弟总表（本章收口用）

| | `.ts` | `.tsx` | `.d.ts` |
|---|---|---|---|
| 能写 JSX | ❌ | ✅ | ❌ |
| 能写实现 | ✅ | ✅ | ❌ |
| 有编译产物 | ✅ `.js` | ✅ `.js` | ❌ **无** |
| `<T>` 类型断言 | ✅ | ❌ **用 `as`** | — |
| 泛型箭头函数 | `<T>(x:T)=>x` | **`<T,>(x:T)=>x`** | — |
| 典型文件 | `utils.ts` | `App.tsx` | `types.d.ts` |

## 2. `tsconfig` 字段速查（按重要度排序）

**必懂（6 个）**：

| 字段 | 一句话 |
|---|---|
| `target` | 语法降到哪一代 |
| `lib` | 声明里认为世界有什么 |
| `strict` | 严格总开关（8 项） |
| `jsx` | `react-jsx`（现代）/ `react`（老） |
| `moduleResolution` | `bundler`（新）/ `node`（老） |
| `include` | 谁是项目的一部分 |

**该懂（6 个）**：`noEmit` / `isolatedModules` / `esModuleInterop` / `skipLibCheck` / `paths` / `module`

**可不管（4 个）**：`allowJs` / `resolveJsonModule` / `forceConsistentCasingInFileNames` / `noFallthroughCasesInSwitch`

## 3. `strict` 八个子项速查

| 子项 | 一句话 | 常见报错码 |
|---|---|---|
| `noImplicitAny` | 不许偷偷 `any` | TS7006 |
| `strictNullChecks` | `null` 不能随便塞 | TS2322 |
| `strictFunctionTypes` | 函数参数逆变检查 | TS2345 |
| `strictBindCallApply` | `bind/call/apply` 检查参数 | TS2345 |
| `strictPropertyInitialization` | 类属性必须初始化 | TS2564 |
| `noImplicitThis` | `this` 不许隐式 any | TS2683 |
| `alwaysStrict` | 产物加 `"use strict"` | — |
| `useUnknownInCatchVariables` | `catch(e)` 的 `e` 是 unknown | TS18046 |

## 4. 命令行速查

```bash
tsc --init                 # 生成 tsconfig.json
tsc                        # 用当前目录的 tsconfig 编译
tsc -p ./tsconfig.build.json
tsc --noEmit               # ⭐ 只查错
tsc -w                     # watch
tsc --showConfig           # ⭐ 看最终生效配置
tsc --explainFiles         # 看每个文件为什么被包含
tsc --listFiles            # 看编译了哪些文件
tsc --declaration          # 产出 .d.ts
tsc --emitDeclarationOnly  # 只产 .d.ts
```

---

==三：代码==

## 1. 实验一：`.tsx` 的尖括号坑（两条报错原文）

```tsx
// t.tsx
const x = <string>window.title
```

```bash
tsc --noEmit --jsx react-jsx t.tsx
```

**实测输出**：

```
t.tsx(1,12): error TS17008: JSX element 'string' has no corresponding closing tag.
t.tsx(3,1): error TS1005: '</' expected.
```

```tsx
// g.tsx
const id = <T>(x: T): T => x
```

**实测输出**：

```
g.tsx(1,13): error TS17008: JSX element 'T' has no corresponding closing tag.
g.tsx(1,26): error TS1382: Unexpected token. Did you mean `{'>'}` or `&gt;`?
```

**修正版**（实测通过）：

```tsx
const id = <T,>(x: T): T => x
const y = window.title as string
```

⭐ **两条报错的关键词都是 `JSX element`** —— **看到这四个字就想到"我在 `.tsx` 里用了尖括号"。**

---

## 2. 实验二：`target` 与 `lib` 的分工（对照看才明白）

```ts
// demo.ts
const p = Promise.resolve(1)
const arrow = () => p
```

**① 只改 `target`**：

```bash
tsc demo.ts --target es5 --lib es2015,dom --outDir out1
cat out1/demo.js
```

**你会看到**：箭头函数变成了 `function`（语法降级），但 `Promise` **原样保留**。

**② 只改 `lib`**：

```bash
tsc demo.ts --target es5 --lib es5 --noEmit
```

**你会看到**：

```
demo.ts(1,11): error TS2585: 'Promise' only refers to a type, but is being
used as a value here. Do you need to change your 'target' library?
```

⭐ **两个实验合起来说明**：
- `target` 改的是**产物**（箭头函数 → `function`）
- `lib` 改的是**认知**（认不认识 `Promise`）
- **`Promise` 在 ES5 里不存在这件事，`lib` 管报错，`target` 管不了 polyfill**

---

## 3. 实验三：`skipLibCheck` 的真实作用

```bash
# 关掉
tsc --noEmit --skipLibCheck false

# 打开（默认 true）
tsc --noEmit
```

**在大项目里比较耗时**：关了之后 `tsc` 会检查 `node_modules/**/*.d.ts` 内部的一致性 —— **通常几百个库的 `.d.ts` 里有各种小毛病，一开就报几百条你修不了的错**。

⭐ **所以 `skipLibCheck: true` 不是"偷懒"，是"不自找麻烦"**：那些错是库作者的，不是你的。

⚠️ **它不跳过你的代码检查**，只跳过 `.d.ts` **文件之间**的检查。

---

## 4. 实验四：`--showConfig` 看真实生效的配置

```bash
tsc --showConfig
```

**你会看到**（节选）：

```json
{
  "compilerOptions": {
    "target": "es2025",
    "strict": true,
    "esModuleInterop": true,
    ...
  },
  "files": ["./src/main.ts", ...]
}
```

⭐ **注意 `files` 数组** —— 这是**编译器实际要处理的文件清单**。你发现某个 `.d.ts` 没生效，先看它有没有出现在这里。

---

## 5. 实验五：`isolatedModules` 的报错（TS1205）

```ts
// types.ts
export interface User { name: string }
```

```ts
// re-export.ts
export { User } from './types'
```

```bash
tsc --noEmit --isolatedModules re-export.ts types.ts
```

**你会看到**：

```
re-export.ts(1,8): error TS1205: Re-exporting a type when 'isolatedModules'
is enabled requires using 'export type'.
```

**修正**：

```ts
export type { User } from './types'
```

⭐ **这条规矩你每天都在用**（Vite / CRA 都开 `isolatedModules`），**但很少有人知道它的原因**：**esbuild 一次只看一个文件，它没法判断 `User` 是类型还是值，只能要求你显式说明。**

---

## 动手小练习（本组 5 题）

1. 在 `.tsx` 里写 `const n = <number>window.innerWidth`，抄下报错；改成 `as` 并验证通过。
2. 把 `jsx` 从 `react-jsx` 改成 `react`，然后删掉 `import React from 'react'`，跑 `npm start`，看控制台报什么（提示：`React is not defined`）。
3. 跑 `tsc --showConfig`，数一数实际生效的 `compilerOptions` 有多少项 —— 对比你写了多少项。
4. 把 `strictNullChecks` 单独关掉（`strict: true` 时可以用 `strictNullChecks: false` 覆盖），看 `document.getElementById('x').innerHTML = 'a'` 是否还报错。
5. 配一次 `paths: {"@/*": ["src/*"]}`，然后在 `.tsx` 里 `import App from '@/App'`，确认 **类型通过**，再跑 `npm run dev` 看**运行时会不会 404**（体会"两份配置"的坑）。

---

==四：总结==

## 1. 一句话记住三集

| 集 | 一句话 |
|---|---|
| 78 | **有 JSX 就是 `.tsx`；`.tsx` 里尖括号只能当标签，断言用 `as`，泛型加逗号。** |
| 79 | **`target` 管语法降级，`lib` 管认不认识 API，`strict` 管严不严 —— 三者互不相干。** |
| 80 | **现代项目里 `tsc` 不编译，只查错；转译交给 esbuild/Babel。** |

## 2. ⭐⭐ 本篇要背的（6 条）

1. **`react-app-env.d.ts` 只有一行** `/// <reference types="react-scripts" />`。
2. **`.tsx` 里 `<T>` 断言失效** → `TS17008`；改用 `as`。
3. **`.tsx` 里泛型箭头函数写 `<T,>`**（多一个逗号）。
4. **`target` ≠ `lib`**：一个管语法，一个管 API；**`target` 不做 polyfill**。
5. **`strict: true` = 8 个检查**，其中 `strictNullChecks` 是你每天遇到 `!` 的原因。
6. **`isolatedModules` 要求 `export type`** —— 因为单文件编译认不出类型。

## 3. ⭐ 收敛时刻：这三集把前面所有"散点"变成了"一条流水线"

回头看你这一路学的东西，**它们最终都落在 `tsconfig` 的某一格上**：

| 你之前学的 | 对应哪个字段 |
|---|---|
| `.d.ts` 全局声明生效不了（进阶篇01 坑#3） | `include` |
| `document` 有类型（进阶篇01 §3.2） | `lib` 里的 `"dom"` |
| `@types/*` 自动加载（进阶篇02 §1.3） | `typeRoots` / `types` |
| 泛型擦除（49-68 集） | `isolatedModules` 存在的原因 |
| 类型断言 `<T>x`（基础篇） | `.tsx` 里必须换 `as` |
| `any` 很危险（26-48 集） | `noImplicitAny` 把它禁掉 |

> ⭐ **一句话收口**：
> **前面 68 集你在学"语言"，这三集告诉你"语言装在一个配置盒子里" —— 盒子上的每个旋钮，都对应你之前学过的一个知识点。**

**再收一层**（接 TS--01）：

| TS 的处境 | 配置上的后果 |
|---|---|
| 类型运行时不存在 | 所以 `tsc` 只需要"擦"，`noEmit` 就够 |
| 擦类型不需要类型检查 | 所以 esbuild/Babel 能快 10-100 倍 |
| 快的不查错 | 所以必须单独跑 `tsc --noEmit` |
| 单文件转译 | 所以必须 `isolatedModules` |

⭐ **一张表：从"类型擦除"这一个前提，推出了整套工程实践。**

## 4. 静默失败清单（本篇 5 条）

| # | 陷阱 | 表现 | 怎么防 |
|---|---|---|---|
| 1 | `target: es5` 以为 `Promise` 会被 polyfill | 编译过，**老浏览器运行时报 `Promise is not defined`** | 配 polyfill（core-js）或改 target |
| 2 | `paths` 只配了 tsconfig | **类型通过，运行时 404** | 打包器也要配 alias |
| 3 | 文件不在 `include` 里 | 全局 `.d.ts` **静默不生效** | `tsc --showConfig` 看 `files` |
| 4 | `jsx: "react"` 却忘了 `import React` | **编译通过，运行时 `React is not defined`** | 用 `react-jsx`，或补 import |
| 5 | CRA 里改 `tsconfig` | `npm start` 时**被覆盖**，你以为改生效了 | 用 Vite，或只用 `tsc --noEmit` 验证 |

> ⚠️ **第 1、2、4 条全是"编译期通过、运行时爆炸"** —— 这是 TS 的固有边界：**它管不了你配错的目标环境。**

## 5. C# 类比可用度（本篇新增）

| 概念 | C# 对应 | 可用度 | 说明 |
|---|---|---|---|
| `target` | `<LangVersion>` | ⭐⭐⭐ | 都是"语法版本" |
| `lib` | 引用的 `System.*` 程序集 | ⭐⭐⭐ | 都是"平台提供什么" |
| `strict` | `<Nullable>enable</Nullable>` + 警告当错误 | ⭐⭐ | 都是"更严"；但 C# 没有"总开关一次开 8 项" |
| `noEmit` | `dotnet build /t:Compile` 的 check-only | ⭐⭐ | 都是只查不产 |
| `isolatedModules` | **无** | ❌ | C# 编译器看整个程序集，不存在单文件问题 |
| `paths` | `global using` / 文件夹命名空间 | ⭐ | 形似，但 alias 是"字符串替换"级 |
| `include` | `.csproj` 的 `<Compile Include>` | ⭐⭐ | 都是"哪些文件算项目" |
| `skipLibCheck` | `<NoWarn>` 屏蔽第三方警告 | ⭐⭐ | 都是"别管别人的错" |

⭐ **统计：8 项里 2 项 ⭐⭐⭐、4 项 ⭐⭐、1 项 ⭐、1 项 ❌。**
**这一篇类比可用度很高** —— 因为"编译器配置"这个概念在两边是对应的。

## 6. 解锁边界（本篇变更）

**新解锁：**

- ✅ 独立读懂任何 `tsconfig.json`（CRA / Vite / Next.js）
- ✅ 知道 `target` / `lib` / `strict` 三者的边界
- ✅ 会用 `tsc --noEmit` / `--showConfig` / `--explainFiles` 排查配置问题
- ✅ 知道 `.tsx` 的两个尖括号坑及修法
- ✅ 遇到"编译过但运行炸"能想到是哪类配置问题

**仍然锁着：**

| 🔒 | 为什么 | 什么时候解 |
|---|---|---|
| `React.FC` / `ReactNode` / `CSSProperties` | 81 集 | ⑤ 组（马上） |
| 组件 props 类型 | 82 集 | ⑤ 组 |
| 事件对象类型 `ChangeEvent<T>` | 84 集 | ⑥ 组 |
| `useState<T>` | 87/91 集 | ⑦⑧ 组 |
| 项目引用 `references` / `composite` | 课程不讲 | 做 monorepo 时 |
| `tsc --build` 增量构建 | 课程只提一句 | 同上 |

## 7. 下一组预告：81-83 集（26 分 33 秒）

| 集 | 内容 | 热度 | 为什么重要 |
|---|---|---|---|
| 81 | React 中的常用类型介绍（6'42"） | 🔥 | `ReactNode` / `FC` / `CSSProperties` 全家桶 |
| 82 | 函数组件的类型（1 组件和属性类型，**13'03"**） | 🔥🔥 | **`type Props` 的标准写法** |
| 83 | 函数组件的类型（2 属性默认值，6'48"） | ⭐ | ⚠️ `defaultProps` 已废弃 |

⭐ **⑤ 组的看点**：从这一组起，**你终于开始"写"了** —— 前面 4 组都是"配"和"读"。而且 ⑤⑥⑦⑧ 四组是一条完整的项目流水线。

> **本篇收口句**：
> **`tsconfig` 是你和编译器签的合同：你告诉它世界按什么规则运转，它才按那套规则给你挑错。合同签错了，它挑的错全是错的。**
