# TS--进阶篇05 · 81-83 集 · React 类型地图与函数组件

> **对应课程**：黑马《前端 TypeScript 教程》BV14Z4y1u7pi 第 **81 / 82 / 83** 集（章内 13-15），共 **26 分 33 秒**。
> **读法**：全文贯穿 **TS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **本篇定位**：**从"读"切换到"写"**。前三篇你在配环境、读声明；这一组第一次真正**给组件写类型**。
> **前置**：进阶篇04 的项目已建好。**React 基础补丁**在导览 §4（组件 / props / JSX / Blazor 类比）。

---

==一：概念==

## 1. 81 集：React 的常用类型（6'42"）

### 1.1 为什么 React 的类型这么"多层"

因为 React 的返回值有**四种本质不同的东西**，而它们都能"出现在界面上"：

```tsx
<h1>hi</h1>                    // ① ReactElement（一个元素）
"hi"                            // ② string（文本）
{tasks.map(t => <li>{t}</li>)}  // ③ ReactNode[]（数组）
null                            // ④ 什么都不渲染
```

**TS 需要用一个类型把它们全包住** —— 那个类型就是 `ReactNode`。

### 1.2 ⭐ 三兄弟的关系（必须分清）

| 类型 | 定义（简化） | 能表达的 | 典型来源 |
|---|---|---|---|
| `React.ReactNode` | `ReactElement \| string \| number \| Iterable<ReactNode> \| boolean \| null \| undefined` | **一切能渲染的东西** | `props.children` |
| `React.ReactElement` | 一个带 `type` / `props` / `key` 的对象 | **一个 JSX 元素**（不含文本/数字） | `createElement()` 的返回 |
| `JSX.Element` | `ReactElement<any, any>` 的别名 | 同上，但**类型参数被放开** | 组件的返回类型 |

⭐ **包含关系（从大到小）**：

```
ReactNode  ⊃  ReactElement  ⊇  JSX.Element
```

⚠️ **实践中的选择规则（一句话）**：

| 你要表达 | 用 |
|---|---|
| 「这里能放任何能显示的东西」（含文本） | **`ReactNode`** |
| 「这里必须是一个组件/元素」（不能是字符串） | `ReactElement` |
| 组件的返回类型 | **不用手写**，让它自己推断 |

⭐ **最常用的是 `ReactNode`** —— 90% 的场景你要的是"能渲染的东西"，不是"必须是元素"。

### 1.3 ⚠️ `React.FC`：课程在用，但现在不推荐

**课程（2022）的标准写法**：

```tsx
const App: React.FC = () => {
  return <div>hello</div>
}

// 带 props
const Hello: React.FC<{ name: string }> = ({ name }) => {
  return <h1>{name}</h1>
}
```

**现在（2024 之后）社区共识：直接写函数**：

```tsx
function Hello({ name }: { name: string }) {
  return <h1>{name}</h1>
}
```

**为什么变了？四个理由**：

| #   | 问题                   | 具体表现                                                                              |
| --- | -------------------- | --------------------------------------------------------------------------------- |
| 1   | **`children` 的历史包袱** | React 17 时 `FC` **隐式**带 `children?: ReactNode`；**React 18 起去掉了** → 同一段代码在不同版本行为不同 |
| 2   | **返回类型被限制**          | 老版本 `FC` 只能返回 `ReactElement \| null`，返回 `string` 会报错（现在放宽到 `ReactNode`）           |
| 3   | **写不出泛型组件**          | `const List: React.FC<{items: T[]}>` —— **`T` 没地方声明**                             |
| 4   | **多一层无用的类型包装**       | 用 `FC` 只是把一个函数套进一个接口，没有额外收益                                                       |

⚠️ **`children` 的版本差异（最容易踩）**：

```tsx
// @types/react 17（课程年代）
const Wrap: React.FC = ({ children }) => <div>{children}</div>   // ✅ 能拿到 children

// @types/react 18+
const Wrap: React.FC = ({ children }) => <div>{children}</div>   // ❌ children 不存在
```

**修法**：显式声明。

```tsx
// 写法 A：手写
function Wrap({ children }: { children?: React.ReactNode }) { … }

// 写法 B：用 PropsWithChildren（推荐）
function Wrap({ children }: React.PropsWithChildren) { … }

// 写法 C：带自己的 props
type Props = { title: string }
function Wrap({ title, children }: React.PropsWithChildren<Props>) { … }
```

⭐ **`PropsWithChildren<P>` 的定义**（一行）：

```ts
type PropsWithChildren<P = unknown> = P & { children?: ReactNode | undefined }
```

> ⭐ **一句话**：**课程里的 `React.FC` 不是"错"，是"那个年代的写法"。你写新代码直接用函数声明，遇到老代码能读懂就行。**

### 1.4 `React.CSSProperties`：内联样式的类型

```tsx
const style: React.CSSProperties = {
  color: 'red',
  fontSize: 16,          // ⚠️ 驼峰，且数字自动补 px
  backgroundColor: '#fff',
}

// 或者直接内联（自动推断，不用写类型）
<div style={{ color: 'red', fontSize: 16 }} />
```

⚠️ **两个坑**：

| 坑 | 错误 | 正确 |
|---|---|---|
| 连字符属性名 | `{ 'font-size': 16 }` | `{ fontSize: 16 }` |
| 拼错的属性 | `{ colour: 'red' }` → **报错** | `{ color: 'red' }` |

⭐ **第二个是好事** —— 这是 TS 帮你抓 CSS 拼写错误，**原生 JS 里不可能有这种保护**。

### 1.5 常用类型全家福

| 类型 | 用在哪 | 例子 |
|---|---|---|
| `React.ReactNode` | 任意可渲染内容 | `children: React.ReactNode` |
| `React.ReactElement` | 必须是一个元素 | `icon: React.ReactElement` |
| `React.CSSProperties` | 内联样式 | `style={…}` |
| `React.PropsWithChildren<P>` | 需要 `children` 的 props | 布局组件 |
| `React.MouseEvent<T>` | 鼠标事件 | 84 集 |
| `React.ChangeEvent<T>` | 表单变化 | 84 集 |
| `React.FormEvent<T>` | 表单提交 | 84 集 |
| `React.useState<T>` | 状态 | 87/91 集 |
| `React.useRef<T>` | DOM 引用 | 89 集可能用到 |
| `React.FC<P>` | 函数组件（**老写法**） | — |

---

## 2. 82 集：函数组件的类型（1 组件和属性类型，13'03"）🔥🔥

**这一集是本组的核心**：props 怎么定义。

### 2.1 最基本的三种写法

**写法 A · 内联类型（简单组件）**

```tsx
function Hello({ name }: { name: string }) {
  return <h1>你好，{name}</h1>
}
```

**写法 B · `type` 别名（推荐，最常用）**

```tsx
type Props = {
  name: string
  age?: number
}

function Hello({ name, age }: Props) {
  return <h1>你好，{name}，{age} 岁</h1>
}
```

**写法 C · `interface`（跟 B 等价，团队风格问题）**

```tsx
interface Props {
  name: string
  age?: number
}
```

⭐ **`type` vs `interface` 选哪个**：React 社区**用 `type` 更多**（因为 props 常用联合类型、交叉类型，`interface` 做不了）。**课程用的是 `type`，跟着走。**

### 2.2 ⭐ 参数解构 + 可选属性 + 默认值，一次说完

```tsx
type Props = {
  name: string          // 必填
  age?: number          // 可选 → 类型是 number | undefined
}

function Hello({ name, age = 18 }: Props) {
  return <h1>{name} 今年 {age} 岁</h1>
}
```

**三个要点**：

| 写法 | 含义 |
|---|---|
| `age?: number` | 可以不传；传了必须是 number |
| `age = 18`（默认参数） | 不传时是 18；**推断出的类型自动去掉 `undefined`** |
| `{ name, age }` 解构 | 少写 `props.` ；但**解构后立刻失去"整体"的能力** |

⚠️ **解构的一个坑**：

```tsx
function Hello({ name }: Props) {
  console.log(props.name)      // ❌ props 没定义
}
```

**要么全解构，要么不解构**，不能只解一部分又用 `props`。

### 2.3 `children` 怎么加（三种写法对照）

```tsx
// ① 手写
type Props = { children?: React.ReactNode }

// ② 用 PropsWithChildren（最简洁）
function Card({ children }: React.PropsWithChildren) { … }

// ③ 自己的 props + children
type CardProps = { title: string }
function Card({ title, children }: React.PropsWithChildren<CardProps>) { … }
```

⚠️ **`children` 的位置**：它在 **JSX 标签中间**，不在属性列表里。

```tsx
<Card title="标题">
  这里的内容就是 children
</Card>
```

### 2.4 一个完整的真实组件（把上面全用上）

```tsx
type Task = {
  id: number
  name: string
  done: boolean
}

type TaskItemProps = {
  task: Task
  onToggle?: (id: number) => void
}

function TaskItem({ task, onToggle }: TaskItemProps) {
  return (
    <li>
      <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
        {task.name}
      </span>
      <button onClick={() => onToggle?.(task.id)}>切换</button>
    </li>
  )
}
```

⭐ **三个细节值得注意**：

| 细节 | 说明 |
|---|---|
| `onToggle?: (id: number) => void` | 回调类型 = **参数表 + 返回 `void`** |
| `onToggle?.(task.id)` | `?.` 调用 —— 回调可能没传 |
| `void` 不是 `undefined` | 表示"我不关心返回值"，**允许传一个返回任何值的函数** |

### 2.5 ⚠️ `void` 为什么不是 `undefined`

```ts
type F1 = () => void
type F2 = () => undefined

const a: F1 = () => 123        // ✅ 允许！返回值被忽略
const b: F2 = () => 123        // ❌ 报错
```

⭐ **这是 TS 的一个"故意放宽"**：
**`() => void` 表示"你可以给我任何函数，我不看返回值"** —— 这样 `onClick={() => setX(1)}` 才不用写成 `onClick={() => { setX(1); return undefined }}`。

> **C# 对照**：C# 里 `Func<int>` 和 `Action` 是两个类型，**不能互转**。TS 的 `() => void` 相当于一个"可以接受有返回值的 `Action`" —— **比 C# 宽松**。

---

## 3. 83 集：函数组件的属性默认值（6'48"）

### 3.1 三种做法，只有一个活着

| 做法 | 语法 | 现状 |
|---|---|---|
| **① 默认参数** | `{ age = 18 }: Props` | ✅ **推荐** |
| ② 函数组件 `defaultProps` | `Hello.defaultProps = { age: 18 }` | ⚠️ **React 18.3 警告，19 移除** |
| ③ 类组件 `static defaultProps` | `static defaultProps = { age: 18 }` | ✅ 仍可用（86 集讲） |

### 3.2 ⚠️ 函数组件的 `defaultProps` 已经死了

```tsx
// 课程里（2022）的写法
function Hello({ name, age }: Props) {
  return <h1>{name} {age}</h1>
}
Hello.defaultProps = { age: 18 }        // ← 现在会警告/失效
```

**时间线**：

| 版本 | 状态 |
|---|---|
| React 18.2 及以前 | ✅ 正常 |
| **React 18.3** | ⚠️ **控制台警告**：`Support for defaultProps will be removed from function components` |
| **React 19** | ❌ **完全移除**（函数组件上设了也没用） |

⭐ **为什么移除**：`defaultProps` 在函数组件里是**运行时**行为（React 在调用前合并），而**类型系统在编译期**——两者对不上，`Props` 里还得写成可选 `age?: number`，用起来很别扭。

**默认参数是编译期 + 运行时一致的**：

```tsx
function Hello({ name, age = 18 }: Props) {
  // age 的类型在这里自动变成 number（去掉了 undefined）
}
```

⭐ **注意这个"类型自动收窄"**：`Props` 里写 `age?: number`，但解构时给了默认值，**函数体里 `age` 就是 `number`，不用再判空**。这是 TS 的贴心设计。

### 3.3 什么时候还会见到 `defaultProps`

**只在两处**：

1. **老项目**（React 17 / 18.2 时代写的）—— 能读懂就行
2. **类组件** —— `static defaultProps` 在 React 19 里**仍然支持**（86 集）

> ⭐ **判断标准**：看到 `defaultProps` 出现在**函数**上 → 这是老代码；出现在 **class 里** → 现在还能用。

---

==二：格式==

## 1. React 常用类型速查表（贴墙版）

| 场景                 | 类型                                    | 备注                         |
| ------------------ | ------------------------------------- | -------------------------- |
| 子内容                | `React.ReactNode`                     | **最常用**                    |
| 必须是一个元素            | `React.ReactElement`                  | 不能是字符串                     |
| 有 children 的 props | `React.PropsWithChildren<P>`          | 或手写 `children?: ReactNode` |
| 内联样式               | `React.CSSProperties`                 | 驼峰属性名                      |
| 鼠标事件               | `React.MouseEvent<HTMLButtonElement>` | 84 集                       |
| 输入变化               | `React.ChangeEvent<HTMLInputElement>` | 84 集                       |
| 表单提交               | `React.FormEvent<HTMLFormElement>`    | 84 集                       |
| 状态                 | `useState<T>(初始值)`                    | 泛型可省（靠推断）                  |
| DOM 引用             | `useRef<HTMLInputElement>(null)`      | —                          |
| 函数组件（老）            | `React.FC<P>`                         | 不推荐                        |

## 2. 组件定义三种写法对照

| | A 内联 | B `type` 别名 | C `React.FC` |
|---|---|---|---|
| 语法 | `({a}:{a:string})` | `type P={a:string}; ({a}:P)` | `const X: React.FC<P> = ({a}) =>` |
| 复用 Props | ❌ | ✅ | ✅ |
| 写泛型组件 | ✅ | ✅ | ❌ |
| 隐式 children | ❌ 清晰 | ❌ 清晰 | ⚠️ 版本相关 |
| 现在推荐 | 小组件 | ✅ **首选** | ❌ 老代码 |

## 3. 默认值三种做法对照

| | 默认参数 | 函数组件 `defaultProps` | 类组件 `static defaultProps` |
|---|---|---|---|
| 语法 | `{x = 1}: P` | `X.defaultProps={x:1}` | `static defaultProps={x:1}` |
| 生效时机 | 编译期 + 运行时一致 | 运行时 | 运行时 |
| React 19 | ✅ | ❌ 移除 | ✅ 保留 |
| 类型收窄 | ✅ 自动去 `undefined` | ❌ 要自己处理 | ❌ |

## 4. `children` 四种写法

```tsx
// ① 可选
type P1 = { children?: React.ReactNode }

// ② 必须
type P2 = { children: React.ReactNode }

// ③ 用工具类型（不带自己的 props）
function A({ children }: React.PropsWithChildren) {}

// ④ 用工具类型（带自己的 props）
type P4 = { title: string }
function B({ title, children }: React.PropsWithChildren<P4>) {}
```

---

==三：代码==

## 1. 实验一：`ReactNode` 与 `ReactElement` 的区别

```tsx
// node-vs-element.tsx
const asNode: React.ReactNode = "纯文本"        // ✅ 可以
const asElement: React.ReactElement = "纯文本"  // ❌ 报错
```

**预期报错**：

```
Type 'string' is not assignable to type 'ReactElement<any, any>'.
```

**但这样都可以**：

```tsx
const e1: React.ReactNode = <div />
const e2: React.ReactElement = <div />
```

⭐ **结论**：**`ReactNode` 是 `ReactElement` 的超集** —— 多了文本、数字、布尔、`null`、数组。

> **实践建议**：写 `children` 的类型时**用 `ReactNode`**，因为谁也不知道用户会往里塞字符串还是组件。

---

## 2. 实验二：`React.FC` 的三个问题（版本差异实测）

**① children 消失**

```tsx
// 在你的项目里（@types/react 18+）
const Wrap: React.FC = ({ children }) => <div>{children}</div>
```

**会报**：`Property 'children' does not exist on type '{}'.`

**② 写不出泛型组件**

```tsx
// ❌ 做不到：T 没地方声明
const List: React.FC<{ items: T[] }> = ({ items }) => …

// ✅ 普通函数可以
function List<T,>({ items }: { items: T[] }) {
  return <ul>{items.map((it, i) => <li key={i}>{String(it)}</li>)}</ul>
}
```

⚠️ **注意 `<T,>` 的逗号** —— 进阶篇04 §1.5 讲过的 `.tsx` 泛型坑，这里正好用上。

**③ 返回类型受限（老版本）**

```tsx
// @types/react 17 时代
const Hello: React.FC = () => "hello"    // ❌ 不能返回 string
```

⭐ **这三条合起来，就是"现在不推荐 `React.FC`"的全部理由。**

---

## 3. 实验三：默认参数的"类型自动收窄"

```tsx
type Props = {
  name: string
  age?: number          // ← 可选，类型是 number | undefined
}

function Hello({ name, age = 18 }: Props) {
  const double: number = age * 2      // ✅ 不报错！
  return <h1>{name} {double}</h1>
}
```

**如果把默认值去掉**：

```tsx
function Hello({ name, age }: Props) {
  const double: number = age * 2      // ❌ 'age' is possibly 'undefined'
}
```

⭐ **一行默认值，省掉一个 `?.` 或 `!`。** 这是 `strictNullChecks` 下最划算的写法之一。

---

## 4. 实验四：`void` 回调的宽松性

```ts
type Handler = () => void

const h1: Handler = () => { console.log("no return") }   // ✅
const h2: Handler = () => 123                            // ✅ 允许！
const h3: Handler = () => "abc"                          // ✅ 也允许！
```

⭐ **`() => void` 接受任何返回值的函数**。这就是为什么：

```tsx
<button onClick={() => setCount(count + 1)}>+1</button>
```

能通过 —— 即使 `setCount` 返回 `void`、箭头函数返回 `void`，**换成有返回值的函数也不会报错**。

---

## 5. 实验五：完整组件跑起来（把本组内容全用上）

```tsx
// src/TaskItem.tsx
import React from 'react'

export type Task = {
  id: number
  name: string
  done: boolean
}

type Props = {
  task: Task
  onToggle?: (id: number) => void
}

export function TaskItem({ task, onToggle }: Props) {
  return (
    <li style={{ marginBottom: 8 }}>
      <span
        style={{
          textDecoration: task.done ? 'line-through' : 'none',
          color: task.done ? '#999' : '#000',
        }}
      >
        {task.name}
      </span>
      <button onClick={() => onToggle?.(task.id)} style={{ marginLeft: 8 }}>
        {task.done ? '取消' : '完成'}
      </button>
    </li>
  )
}
```

```tsx
// src/App.tsx
import { TaskItem } from './TaskItem'
import type { Task } from './TaskItem'

const tasks: Task[] = [
  { id: 1, name: '学 TS 声明文件', done: true },
  { id: 2, name: '学 React 类型', done: false },
]

export default function App() {
  return (
    <ul>
      {tasks.map(t => <TaskItem key={t.id} task={t} />)}
    </ul>
  )
}
```

⭐ **注意两件事**：

| 细节 | 说明 |
|---|---|
| `import type { Task }` | `Task` 是纯类型，用 `import type`（`isolatedModules` 的要求） |
| `<TaskItem key={t.id} task={t} />` | `key` 是 React 内置属性，**不在 `Props` 里**，TS 不会报错 |

⚠️ **`key` 的坑**：`key` 不是 props，`TaskItem` 里**拿不到** `props.key`（React 19 会警告）。**它只是给 React 用的。**

---

## 动手小练习（本组 5 题）

1. 用 `type` 定义一个 `Button` 组件的 props：`label: string` / `onClick?: () => void` / `type?: 'primary' | 'default'`。故意传 `type="danger"` 看报错。
2. 写一个 `Card` 组件，要求 `children` 必填（`children: React.ReactNode`），试试不传 children 会不会报错。
3. 把 `Card` 改成 `React.PropsWithChildren<{ title: string }>`，确认不用手写 `children`。
4. 写一个泛型组件 `List<T>`，接收 `items: T[]` 和 `render: (item: T) => React.ReactNode`。（**这题超纲一半**，做不出来就看进阶篇08 的预告）
5. 给一个组件设 `defaultProps`，跑起来看控制台有没有警告（如果你的 React 版本 ≥ 18.3）。

---

==四：总结==

## 1. 一句话记住三集

| 集 | 一句话 |
|---|---|
| 81 | **`ReactNode` 是一切的父类，`React.FC` 是老写法，`CSSProperties` 能抓 CSS 拼写错误。** |
| 82 | **`type Props = {…}` + 函数声明，是 2026 年的标准写法。** |
| 83 | **默认值用默认参数，`defaultProps` 在函数上已经死了。** |

## 2. ⭐⭐ 本篇要背的（5 条）

1. **`ReactNode` ⊃ `ReactElement` ⊇ `JSX.Element`**；`children` 用 `ReactNode`。
2. **`React.FC` 的三个问题**：`children` 版本差异 / 写不出泛型 / 返回类型限制。
3. **`React.PropsWithChildren<P>`** 一行加上 `children`。
4. **`() => void` 是宽松的**，接受任何返回值的函数。
5. **默认参数会让类型自动去掉 `undefined`**，是 `strictNullChecks` 下最划算的写法。

## 3. ⭐ 收敛时刻：三集其实在讲"一个契约的两个面"

| 面 | 内容 | 集 |
|---|---|---|
| **形状** | props 有哪些字段、什么类型 | 82 |
| **缺省** | 没传的时候是什么 | 83 |
| **容器** | 组件整体长什么样（`FC`？函数？） | 81 |

> ⭐ **一句话收口**：
> **组件类型不是"给函数加个类型"，而是"给父子之间签一份合同"：字段（82）、缺省值（83）、合同形式（81）。**

**再回扣前四篇**：

| 你之前学的 | 在这里变成了 |
|---|---|
| `interface` / `type`（基础篇） | `type Props = {…}` |
| 可选属性 `?`（基础篇） | `age?: number` |
| 联合类型（基础篇） | `type?: 'primary' \| 'default'` |
| `ReactNode` 从哪来（进阶篇02） | `@types/react` 里的 `.d.ts` |
| `isolatedModules`（进阶篇04） | `import type { Task }` |
| `.tsx` 的 `<T,>`（进阶篇04） | 泛型组件要写逗号 |

⭐ **六条线在这里汇成了一个点：你终于写出一个"类型完整"的 React 组件了。**

## 4. 静默失败清单（本篇 4 条）

| # | 陷阱 | 表现 | 怎么防 |
|---|---|---|---|
| 1 | `React.FC` 的 `children` | React 17→18 升级后**突然报错** | 显式写 `children?: ReactNode` |
| 2 | `defaultProps` 在函数组件上 | **不报错，但值不生效**（React 19） | 换默认参数 |
| 3 | `key` 当 props 用 | `props.key` 拿不到值 | `key` 只给 React 用，要传数据就另加字段 |
| 4 | `children` 类型写成 `ReactElement` | 传字符串时**报错**，但运行时其实正常 | 用 `ReactNode` |

> ⚠️ **第 2 条最阴**：不报错、不警告（如果版本够新）、值就是不对。**这类"版本静默变更"是前端生态的常态，记不住就查 changelog。**

## 5. C# 类比可用度（本篇新增）

| 概念 | C# 对应 | 可用度 | 说明 |
|---|---|---|---|
| `type Props = {…}` | 一个 DTO / `record` | ⭐⭐⭐ | 都是"一组字段的形状" |
| 组件 + props | Blazor 的 `[Parameter]` | ⭐⭐⭐ | **几乎一一对应** |
| `children` | `RenderFragment` | ⭐⭐⭐ | **都是"标签中间的内容"** |
| `ReactNode` | `RenderFragment` 的联合体 | ⭐⭐ | 概念像，但 TS 是类型联合 |
| 默认参数 | C# 默认参数 | ⭐⭐⭐ | **完全一样** |
| `defaultProps` | `[DefaultValue]` 特性 | ⭐ | 都是"元数据形式给默认值" |
| `() => void` 宽松性 | `Action` vs `Func<T>` | ⭐ | **TS 更宽松，C# 严格区分** |
| `React.CSSProperties` | WPF 的 `Style` 对象 | ⭐ | 都是"样式的类型化对象" |

⭐ **统计：8 项里 4 项 ⭐⭐⭐、1 项 ⭐⭐、3 项 ⭐。**
**这是整章类比可用度第二高的一篇** —— 因为"组件 + props + children"在 Blazor 里有**一一对应物**。

## 6. 解锁边界（本篇变更）

**新解锁：**

- ✅ 给任何函数组件写类型完整的 props
- ✅ `children` 的四种写法
- ✅ 用 `ReactNode` / `PropsWithChildren` / `CSSProperties`
- ✅ 知道 `React.FC` 为什么被弃用（**面试常问**）
- ✅ 默认参数替代 `defaultProps` 的迁移方法

**仍然锁着：**

| 🔒 | 为什么 | 什么时候解 |
|---|---|---|
| `React.MouseEvent<T>` / `ChangeEvent<T>` | 84 集 | ⑥ 组（马上） |
| 泛型参数的 `<T>` 写在事件上是什么意思 | 84 集 | ⑥ 组 |
| 类组件 `Component<P, S>` | 85 集 | ⑥ 组 |
| `useState<T>` / `useRef<T>` | 87/91 集 | ⑦⑧ 组 |
| `forwardRef` / `memo` 的类型 | 课程不讲 | 自己查 |
| 泛型组件 `<T,>` 的完整写法 | 课程不讲 | 现在只能照抄实验二 |

## 7. 下一组预告：84-86 集（26 分 22 秒）

| 集 | 内容 | 热度 | 为什么重要 |
|---|---|---|---|
| 84 | 函数组件的事件和事件对象（9'30"） | 🔥🔥 | **泛型参数是"元素"不是"事件"** —— 90% 的人搞反 |
| 85 | 类组件的类型（1 组件类型，7'52"） | ⭐ | `Component<Props, State>` |
| 86 | 类组件的类型（2 组件属性，9'00"） | ⭐ | `static defaultProps` 还能用 |

⭐ **⑥ 组的看点**：84 集是**每个 React 开发者都要卡一次的坑**（事件类型写不对）；85-86 是"存量代码必修课" —— 老项目里全是类组件。

> **本篇收口句**：
> **`type Props` 是你第一次真正"给界面签合同"。从这一行开始，React 组件的错误不用等到点开浏览器才发现。**
