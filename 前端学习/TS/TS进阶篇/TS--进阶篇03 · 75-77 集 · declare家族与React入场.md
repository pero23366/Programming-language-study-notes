# TS--进阶篇03 · 75-77 集 · `declare` 家族 & React 入场

> **对应课程**：黑马《前端 TypeScript 教程》BV14Z4y1u7pi 第 **75 / 76 / 77** 集（章内 07-09），共 **30 分 20 秒**。
> **读法**：全文贯穿 **TS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **本篇定位**：**分水岭**。75 集收尾「声明文件」这条线（`declare` 全套）；76-77 集拉开门 —— **从这里开始你要写项目了，不再是读代码**。
> **⚠️ 章界提示**：75 集属于第 8 章，76 集已跳到第 9 章。这不是分组失误，是课程的硬切。我在 §3 做了过渡。

---

==一：概念==

## 1. 75 集：`declare` 家族（22'00"）🔥🔥🔥

**全章最长的一集**，因为它要把「怎么凭空描述一个已经存在的东西」这件事讲完。

### 1.1 `declare` 一句话本质

```ts
declare function greet(name: string): string
```

翻译成人话：**「运行时真的有个叫 `greet` 的函数，参数是 `string` 返回 `string`。别问我实现，别问我在哪定义，你信就行。」**

> **C# 对照**：这就是 `[DllImport("user32.dll")] static extern int MessageBox(...)` —— **声明一个你没有源码、但运行时存在的东西**。
> 差别：C# 的 `extern` 指向一个真实的 `.dll`；TS 的 `declare` 指向一个**存在于 JS 世界里、但编译器看不见的实体**。

### 1.2 完整家族（六种）

| 写法 | 声明什么 | 现实中对应 | 注意 |
|---|---|---|---|
| `declare const X: T` | 常量 | `window.X = …` / CDN 引入的全局 | 可带字面量初值 `declare const V = 1` |
| `declare let X: T` | 变量 | 同上，可变 | — |
| `declare function f(a: T): R` | 函数 | 全局函数 / JS 库的导出 | **不能有 `{}`** |
| `declare class C { … }` | 类 | JS 里的构造函数 | 只能写签名 + 属性，方法无实现 |
| `declare namespace N { … }` | 命名空间 | jQuery 那种 `$.ajax` 结构 | 里面只能声明，不能写逻辑 |
| `declare module 'x' { … }` | 模块 | 一个包 / 一个路径 | 三种形态，见 §1.3 |

⚠️ **`.d.ts` 里 `declare` 可以省略**（整个文件已是 ambient 环境）。但**在 `.ts` 里想声明全局必须写 `declare`**。课程里两者混着出现，别被绕晕。

### 1.3 `declare module` 的三种形态（必须分清）

**形态 A · 裸声明（把模块变成 `any`）**

```ts
declare module 'jquery'
```

→ 模块存在，内容全是 `any`。**止疼不止病**（进阶篇02 实验二已证）。

**形态 B · 带 body（精确描述）**

```ts
declare module 'jquery' {
  const $: {
    (selector: string): { text(): string }
  }
  export default $
}
```

→ 有真实类型。`$(123)` 会报错。

**形态 C · 通配（按扩展名/模式）**

```ts
declare module '*.css'
declare module '*.svg' {
  const src: string
  export default src
}
```

→ 匹配所有符合模式的文件。⚠️ **React 项目的标配**，因为 `import './App.css'` 在 TS 眼里是"引入一个 JS 模块"。

### 1.4 CommonJS 老库：`export =`

2015 年前的 npm 包都是 CommonJS：`module.exports = fn`。这种"整体导出一个东西"的形态，ESM 的 `export default` 表达不了。

```ts
// mylib.d.ts
declare function greet(name: string): string
export = greet
```

```ts
// use.ts
import greet = require("./mylib")
const s: string = greet("a")
```

⚠️ **实测坑**：在默认（ESM 目标）下会报

```
use.ts(1,1): error TS1202: Import assignment cannot be used when targeting
ECMAScript modules. Consider using 'import * as ns from "mod"', ...
```

**必须加 `--module commonjs`**（实测通过，exit 0）。

⭐ **`export =` 只会出现在 `.d.ts` 里**，而且只在描述**老库**时。**自己写代码永远不要用。**

### 1.5 UMD 库：`export as namespace`

jQuery / lodash 这种库有个特点：**既能 `import`，也能 `<script>` 直接用全局变量**。

```ts
// jquery.d.ts
export as namespace $           // ← 声明"全局也有一个 $"
export = jQuery                 // ← 同时声明"也能 import"
```

**实测**：`export as namespace MyLib` + `MyLib.init(...)` 直接可用，exit 0。

⭐ **这个关键字的语义**：**「这个包被 `<script>` 引入时会挂一个全局变量，名字叫什么」**。

### 1.6 完整实战：给一个 JS 库补声明

**原始 JS**（你同事写的，或从 CDN 拷来的）：

```js
// date-utils.js
const DATE_FORMAT = 'YYYY-MM-DD'

function format(date, fmt) {
  fmt = fmt || DATE_FORMAT
  return fmt.replace('YYYY', date.getFullYear())
            .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
            .replace('DD', String(date.getDate()).padStart(2, '0'))
}

function parse(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

window.DateUtils = { format, parse, DATE_FORMAT }
```

**补声明**：

```ts
// date-utils.d.ts —— 注意：与 .js 同名同目录
declare namespace DateUtils {
  const DATE_FORMAT: string

  /** 把 Date 格式化成字符串，fmt 省略时用 DATE_FORMAT */
  function format(date: Date, fmt?: string): string

  /** 把 'YYYY-MM-DD' 解析成 Date */
  function parse(str: string): Date
}
```

⭐ **这个套路叫「命名空间式声明」**，专门用来描述**挂在一棵树上的全局对象**（`window.DateUtils.xxx`）。

**验证**：

```ts
const d = DateUtils.parse('2026-10-19')
DateUtils.format(d)              // ✅
DateUtils.format('2026-10-19')   // ❌ 报错：string 不能赋给 Date
```

> ⭐ **这就是 75 集的价值**：你给一段**一行没改的 JS** 配了完整类型，从此全项目都能被检查。

---

## 2. 76 集：在 React 中使用 TS 概述（2'21"）⚪

最短的一集，本质是**章节导语**。核心就三句话：

| 说法 | 含义 |
|---|---|
| 「React 本身是 JS 写的」 | 所以 React 的类型来自 `@types/react` |
| 「React 项目天然适合 TS」 | 因为 props / state 天然是"结构化数据"，正是类型擅长的 |
| 「用 CRA 可以直接建带 TS 的项目」 | 免手工配 `tsconfig` |

⭐ **为什么 React 和 TS 特别搭**（这一句课程没说透，但它决定了后面 16 集的走向）：

| React 的机制 | TS 能补什么 |
|---|---|
| 组件靠 **props** 通信 | props 是**契约** → 类型能写死契约 |
| state 是**不可变**更新 | 类型能防止你把 state 改成别的形状 |
| 事件对象是**包装过的** | 泛型能指定"这是哪个元素的事件" |
| 组件可以**组合** | 泛型能表达"这个组件能接受任意类型的列表" |

> **一句话**：**React 是"数据驱动界面"，TS 是"描述数据形状" —— 二者天生是一件事的两面。**

---

## 3. 77 集：用 CRA 创建支持 TS 的项目（5'59"）

### 3.1 课程给的命令

```bash
npx create-react-app my-app --template typescript
```

⚠️ **注意 `--template typescript` 是必须的**。不加就是纯 JS 模板，事后转 TS 极其麻烦。

### 3.2 ⚠️ 一个必须告诉你的事实：CRA 已经废弃

**2025 年 2 月，React 官方博客正式宣布 `create-react-app` 停止维护。**

| | CRA | Vite |
|---|---|---|
| 状态 | ❌ 已停止维护 | ✅ 官方推荐（React 文档首页就用它） |
| 构建工具 | Webpack | **Vite（开发时 esbuild，生产 Rollup）** |
| 首次 `npm i` | 上千个包，**10 分钟起步** | 200 个左右，1-2 分钟 |
| 冷启动 | 20-40 秒 | **< 1 秒** |
| 热更新 | 2-5 秒 | 几乎瞬时 |
| `tsconfig` | **被 react-scripts 管着，改不动** | **完全自己管** |
| 学习价值 | 存量项目多，得能看懂 | 新项目标准 |

⭐ **对你（.NET 出身）的类比**：CRA ≈ 老版 `dotnet new mvc`（模板重、隐藏配置）；Vite ≈ `dotnet new web`（薄、配置在你手里）。

### 3.3 两条路都给你

**路 A · 跟课程走（CRA）**

```bash
npx create-react-app ts-demo --template typescript
cd ts-demo && npm start
```

**路 B · 我建议你走（Vite）**

```bash
npm create vite@latest ts-demo -- --template react-ts
cd ts-demo
npm install
npm run dev
```

⚠️ **两条路的 `tsconfig` 不一样**，笔记里 79 集会两份都给。

### 3.4 用 Vite 的话，会少学课程里的两样东西

| 课程里有                   | Vite 里 | 怎么补                      |
| ---------------------- | ------ | ------------------------ |
| `react-app-env.d.ts`   | ❌ 没有   | 自己建一个，内容不同（见进阶篇04）       |
| `react-scripts` 的三斜线指令 | ❌ 没有   | 不需要                      |
| `tsconfig` 被托管         | ✅ 自己管  | **更好**：79 集的内容你能**亲手验证** |

> ⭐ **这其实是好事**：Vite 的 `tsconfig` 是**可编辑的**，79 集讲的每个字段你都能改了看效果；CRA 里改了会被覆盖，只能"听讲不能动手"。

---

==二：格式==

## 1. `declare` 家族速查表

| 关键词 | 语法 | 能写实现吗 | 典型场景 |
|---|---|---|---|
| `const` | `declare const X: T` | ❌（字面量初值例外） | CDN 全局常量 |
| `let` / `var` | `declare let X: T` | ❌ | 全局可变变量 |
| `function` | `declare function f(a: T): R` | ❌ | 全局函数 |
| `class` | `declare class C { p: T; m(): R }` | ❌ | JS 的构造函数 |
| `namespace` | `declare namespace N { … }` | ❌ | 树形全局对象（`$.ajax`） |
| `module` | `declare module 'x' { … }` | ❌ | 包 / 路径 / 通配 |
| `global` | `declare global { … }` | ❌ | 扩展全局（需在模块里） |
| `enum` | `declare enum E { A, B }` | ❌ | 全局枚举 |
| `type`/`interface` | 不需要 `declare` | — | 纯类型（本来就无运行时） |

## 2. `declare module` 三形态对照

| 形态 | 写法 | 效果 | 何时用 |
|---|---|---|---|
| 裸 | `declare module 'x'` | 整个模块 = `any` | 最后手段 |
| body | `declare module 'x' { … }` | 精确类型 | 真要用它 |
| 通配 | `declare module '*.css'` | 匹配一批文件 | 静态资源 |

## 3. 三种模块导出形态对照（读懂老 `.d.ts` 必备）

| 形态 | JS 里长这样 | `.d.ts` 里这样写 | 导入写法 |
|---|---|---|---|
| **ESM**（现代） | `export default X` / `export const y` | `export default X` | `import X from 'x'` |
| **CJS**（老） | `module.exports = X` | `export = X` | `import X = require('x')` |
| **UMD**（浏览器+模块） | 两者都支持 | `export as namespace X` + `export = X` | `<script>` 用全局 / `import` 都行 |

## 4. CRA vs Vite 配置对照

| 文件 | CRA | Vite |
|---|---|---|
| `tsconfig.json` | ✅ 有，但受限 | ✅ 有，完全可控 |
| `tsconfig.node.json` | ❌ | ✅ 有（给 `vite.config.ts` 用） |
| `react-app-env.d.ts` | ✅ 有 | ❌ 没有 |
| 入口 | `src/index.tsx` | `src/main.tsx` |
| 根组件 | `src/App.tsx` | `src/App.tsx` |
| 静态资源声明 | 由 `react-scripts` 提供 | 由 `vite/client` 提供 |

## 5. 命令对照

| 目的                     | 命令                                                     |
| ---------------------- | ------------------------------------------------------ |
| CRA 建 TS 项目            | `npx create-react-app my-app --template typescript`    |
| **Vite 建 TS React 项目** | `npm create vite@latest my-app -- --template react-ts` |
| 看 Vite 有哪些模板           | `npm create vite@latest -- --help`                     |
| 启动 CRA                 | `npm start`                                            |
| 启动 Vite                | `npm run dev`                                          |

---

==三：代码==

## 1. 实验一：`declare` 三件套一次性验证

```ts
// lib.d.ts
declare function greet(name: string): string
declare class Animal {
  name: string
  speak(): void
}
declare namespace MyLib {
  const version: string
}
```

```ts
// use.ts
greet("a")
new Animal().speak()
console.log(MyLib.version)
```

```bash
tsc --noEmit use.ts lib.d.ts
```

**实测**：exit 0，无报错。

⭐ **注意 `declare class` 里的 `speak(): void` 也没有函数体** —— 这就是"环境声明"的统一规则：**只描述形状，不描述行为**。

---

## 2. 实验二：`export =` 必须配 CommonJS（TS1202 原文）

```ts
// mylib.d.ts
declare function greet(name: string): string
export = greet
```

```ts
// use.ts
import greet = require("./mylib")
const s: string = greet("a")
```

```bash
tsc --noEmit use.ts mylib.d.ts
```

**实测输出**：

```
use.ts(1,1): error TS1202: Import assignment cannot be used when targeting
ECMAScript modules. Consider using 'import * as ns from "mod"',
'import {a} from "mod"', 'import d from "mod"', or another module format instead.
```

**加上 `--module commonjs`**：

```bash
tsc --noEmit --module commonjs use.ts mylib.d.ts
```

**实测**：exit 0 ✅

⭐ **记住这个因果**：`import x = require()` 是 **CommonJS 专属语法**，在现代 ESM 目标下根本不合法。**你在 React 项目里永远见不到它** —— 只在读老库的 `.d.ts` 时会碰到。

---

## 3. 实验三：UMD 全局声明（`export as namespace`）

```ts
// lib.d.ts
export as namespace MyLib
export declare function init(o: { key: string }): void
```

```ts
// use.ts —— 注意：没有 import！
MyLib.init({ key: "a" })
```

```bash
tsc --noEmit use.ts lib.d.ts
```

**实测**：exit 0 ✅

⭐ `export as namespace` 干的事：**告诉 TS「这个包如果被 `<script>` 标签引入，会挂一个叫 `MyLib` 的全局变量」**。

---

## 4. 实验四：给一段真 JS 补完整声明（75 集核心）

**JS 源码**（不动它）：

```js
// date-utils.js
const DATE_FORMAT = 'YYYY-MM-DD'
function format(date, fmt) {
  fmt = fmt || DATE_FORMAT
  return fmt.replace('YYYY', date.getFullYear())
            .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
            .replace('DD', String(date.getDate()).padStart(2, '0'))
}
function parse(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
window.DateUtils = { format, parse, DATE_FORMAT }
```

**声明**（同目录 `date-utils.d.ts`）：

```ts
declare namespace DateUtils {
  const DATE_FORMAT: string
  function format(date: Date, fmt?: string): string
  function parse(str: string): Date
}
```

**验证**：

```ts
const d = DateUtils.parse('2026-10-19')
console.log(DateUtils.format(d))            // ✅ 通过
console.log(DateUtils.format('2026-10-19')) // ❌ 报错
```

⭐ **最后一行会报**：`Argument of type 'string' is not assignable to parameter of type 'Date'.`
**这就是你要的效果** —— JS 一行没改，错误在编译期被抓住。

---

## 5. 实验五：建项目（二选一）

**Vite（推荐）**：

```bash
npm create vite@latest ts-demo -- --template react-ts
cd ts-demo && npm install && npm run dev
```

**建完先做一件事**：看 `tsconfig.json` 和 `src/` 目录，**对照进阶篇04 的 §1 目录结构表**，一个个认。

⚠️ **如果 CRA 装到一半卡住**（很可能，`react-scripts` 依赖树巨大），直接切 Vite。**不要为了跟课程硬等 20 分钟。**

---

## 动手小练习（本组 4 题）

1. 写一个 `declare function` 描述 `parseInt`（提示：`(string: string, radix?: number) => number`），在 `.ts` 里直接调用 `parseInt('10', 2)`，确认不报错。
2. 把实验四的 `format` 第二个参数改成**必填**，看原来的调用会不会报错。
3. 建一个 `declare module '*.svg'`，然后 `import logo from './logo.svg'`，确认 `logo` 的类型是 `string`。
4. 用 `declare namespace` 描述 `window.Math` 里的 `max`（提示：`function max(...values: number[]): number`），然后写 `Math.max(1, 2, 3)` 验证。

---

==四：总结==

## 1. 一句话记住三集

| 集 | 一句话 |
|---|---|
| 75 | **`declare` = "我保证运行时存在，你别问实现"；六种形态记牢，模块声明分裸/带体/通配。** |
| 76 | **React 是"数据驱动界面"，TS 是"描述数据形状" —— 天生一对。** |
| 77 | **CRA 已死，Vite 当立。命令不一样，`tsconfig` 的学法是通用的。** |

## 2. ⭐⭐ 本篇要背的（5 条）

1. **`declare` 家族的六种形态**：`const` / `let` / `function` / `class` / `namespace` / `module`。
2. **`declare module` 三形态**：裸（any）/ 带 body（精确）/ 通配（`*.css`）。
3. **`.d.ts` 里一切都没有实现体**，写了报 `TS1183`。
4. **`export =` 是老 CommonJS 库的写法**，配套 `import x = require()`，**必须 `module: commonjs`**（否则 `TS1202`）。
5. **`export as namespace`** = 声明 UMD 库的全局变量名。

## 3. ⭐ 收敛时刻：75 集把「声明文件」这条线彻底封口

回头把进阶篇01-03 串成一条线：

| 集 | 你学的是 | 归属 |
|---|---|---|
| 69 | `.d.ts` 是什么 | **概念** |
| 70 | `.ts` vs `.d.ts` | **形态** |
| 71 | 内置声明（`lib.dom.d.ts`） | **来源①** |
| 72 | `@types/*` | **来源②** |
| 73 | 项目内共享 | **来源③** |
| 74 | 给 JS 补声明（三条路） | **方法** |
| **75** | **`declare` 全套语法** | **工具** ← 最后一颗钉子 |

> ⭐ **一句话收口**：
> **69-74 告诉你「类型可以住在 `.d.ts` 里」，75 集告诉你「那个文件里到底能写什么」。**
> **到此为止，你已经能在任何 JS 世界里凭空造出类型了 —— 这是 TS 里最"工程"的一项能力。**

**再往回收一层**（接你的 JS 阶段）：

| JS 阶段你学的 | 现在它变成了 |
|---|---|
| JSDoc `@param {number}` | 74 集路线③：让 JS 被检查 |
| `module.exports` / `require` | 75 集 `export =` / `import = require` |
| CDN 引入 jQuery 挂 `$` 到 window | 75 集 `export as namespace` |
| 给 jQuery 写 `$.fn.xxx` 扩展 | 75 集 `declare namespace` |

⭐ **你的 JS 200 集在这三集里全兑现了** —— 那些当时"只是知道有这么回事"的东西，现在有了**类型层的正式写法**。

## 4. 静默失败清单（本篇 4 条）

| #   | 陷阱                         | 表现                                       | 怎么防                    |
| --- | -------------------------- | ---------------------------------------- | ---------------------- |
| 1   | `declare module 'x'` 裸声明   | 编译过，**类型全丢**                             | 只会当临时措施；加 TODO 注释      |
| 2   | `declare namespace` 里的名字拼错 | 调用处报"属性不存在"，**但你不觉得是声明写错了**              | 声明写完立刻写一行调用验证          |
| 3   | CRA 里改 `tsconfig.json`     | `npm start` 时**被 react-scripts 覆盖**，改了白改 | 用 Vite；或只在 CRA 允许的字段内改 |
| 4   | `.d.ts` 与 `.js` 不同名        | 声明**根本不配对**，等于没写                         | 严格同目录同名                |
|     |                            |                                          |                        |

## 5. C# 类比可用度（本篇新增）

| 概念                    | C# 对应                             | 可用度 | 说明                            |
| --------------------- | --------------------------------- | --- | ----------------------------- |
| `declare function`    | `[DllImport] static extern`       | ⭐⭐⭐ | **一模一样的思想**：声明外部存在的东西         |
| `declare class`       | `extern class` + `ComImport`      | ⭐⭐  | 都是"外部有实现"                     |
| `declare namespace`   | `namespace` 嵌套                    | ⭐⭐  | 都是树形组织                        |
| `declare module 'x'`  | **无**                             | ❌   | C# 里的"一个 dll 一个程序集"是天然的，不需要声明 |
| `export =`            | `[assembly: ...]` / 老 COM 导出      | ⭐   | 都是历史包袱                        |
| `export as namespace` | `[assembly: ComVisible]` + ProgID | ⭐   | 都是"给非托管环境用"                   |
| **React 组件**          | **Blazor 组件**                     | ⭐⭐⭐ | **76 集之后全靠这个类比**              |

⭐ **统计：7 项里 2 项 ⭐⭐⭐、2 项 ⭐⭐、1 项 ⭐、1 项 ❌。**

## 6. 解锁边界（本篇变更）

**新解锁：**

- ✅ 用 `declare` 六件套描述任何运行时实体
- ✅ 能读懂 npm 包里所有奇怪的 `.d.ts` 写法（`export =` / `export as namespace` / 通配）
- ✅ 给一段纯 JS 补出完整类型，并验证检查生效
- ✅ 自己建一个 React + TS 项目（Vite 或 CRA）
- ✅ 知道 CRA 已废弃这件事，不会在面试里说错

**仍然锁着：**

| 🔒 | 为什么 | 什么时候解 |
|---|---|---|
| `.tsx` 与 `.ts` 的区别 | 78 集 | ④ 组（马上） |
| `tsconfig` 每个字段 | 79 集 | ④ 组（马上） |
| `React.FC` / `ReactNode` | 81 集 | ⑤ 组 |
| `useState<T>` 的泛型 | 87/91 集 | ⑦⑧ 组 |
| `forwardRef` / `memo` 的类型 | 课程不讲 | 自己查文档 |
| 泛型组件 `<T,>` | 课程不讲 | 遇到再说 |

## 7. 下一组预告：78-80 集（40 分 19 秒）

| 集   | 内容                              | 热度     | 为什么重要                      |
| --- | ------------------------------- | ------ | -------------------------- |
| 78  | React 支持 TS 的项目目录结构（**15'02"**） | 🔥     | `.tsx` 为什么是 `.tsx`；三斜线指令揭晓 |
| 79  | `tsconfig.json` 详解（**18'32"**）  | 🔥🔥🔥 | **全章信息密度最高的一集**            |
| 80  | 通过命令行方式使用编译配置（6'45"）            | ⭐      | 摆脱 CRA 自己跑 `tsc`           |

⭐ **④ 组的看点**：这三集是「**配置层**」。前面的 `.d.ts` 是"内容"，这三集是"**规则**" —— 决定编译器怎么找文件、怎么放宽、怎么严格。

> **本篇收口句**：
> **`declare` 让你能在任何 JS 世界里凭空造类型；从下一集起，你要开始决定"这个世界按什么规矩运转"了。**
