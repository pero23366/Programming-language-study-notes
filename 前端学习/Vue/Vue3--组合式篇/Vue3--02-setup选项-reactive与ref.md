# Vue3--02 · setup 选项 · reactive 与 ref

> **对应课程**：143-144（黑马 `BV1HV4y1a7n4`，2 集 / 约 27 分钟）
> **读法**：这是「Vue3--组合式篇」第 2 篇。上一篇（Vue3--01）只讲工程结构，**这一篇才第一次真的写组合式语法**。
> **本轮定位**：只解一个问题 —— **没有 `this` 了，状态放哪、怎么让模板看见？**
> **特别说明**：你项目 `App.vue` 里已经在用 `ref` 和 `<script setup>` 了（第 1 步首屏切换就是靠它跑的）。这一轮的作用是把你**已经在抄的写法**变成你**能解释的写法**。

---

==一：概念==

## 1. setup 选项（143）🔥

### 1.1 先把「没有 setup 的世界」看清

选项式里，一个组件的状态是这样进模板的：

```js
export default {
  data() { return { count: 0 } },     // ← 返回对象，模板就能用 count
  methods: { add() { this.count++ } },
}
```

这里有两层东西被 Vue 偷偷接上了：

| 发生了什么 | 谁干的 |
|---|---|
| `data()` 返回的对象被塞进组件实例 | Vue 运行时 |
| 模板里的 `count` 被解析成 `this.count` | Vue 编译器 |
| `this` 上能被访问的成员由 `data`/`methods`/`computed`/`props` 拼起来 | 运行时 `Object.assign` |

**关键点：`data` 的返回值就是「暴露给模板的名单」。** 这个名单机制是组合式的全部起点 —— `setup` 干的就是同一件事，只是它把「名单」摆到了明面上。

### 1.2 setup 是什么：一个跑得更早的 data

`setup` 是 Vue3 新增的一个配置项，位置在所有生命周期之前：

```
setup()  →  beforeCreate  →  created  →  beforeMount  →  mounted  →  ...
   ↑
   组件实例还没建好，this 根本不存在
```

```js
export default {
  setup() {
    console.log(this)          // undefined  ← 不是 "没有成员"，是这个值本身就没有
    return { count: 0 }        // ← 和 data 的 return 长得一模一样
  },
}
```

**三件事一次说清：**

| 问题 | 答案 | 不这样会怎样 |
|---|---|---|
| 谁调用它 | Vue 运行时，每个组件实例创建时调**一次** | — |
| `this` 是什么 | **`undefined`** | 写 `this.count` 直接 `TypeError: Cannot read properties of undefined` |
| 返回对象干什么 | 对象里的键变成模板能用的名字 | 不 return 就模板全空，**且不报错** |

`setup` 里能不能拿到 `props`？能 —— 通过参数 `setup(props, context)`。这是 148 集的事，本轮锁着。

### 1.3 返回值还有第二种形状

`setup` 返回**函数**时，那个函数被当成渲染函数（`h()` 手写 VNode）：

```js
setup() {
  return () => h('div', 'hi')      // ← 函数 = 渲染函数，不是模板
}
```

**这条现在只需知道存在**，写业务永远返回对象。但它是理解 `<script setup>` 编译产物的钥匙，见 1.4。

### 1.4 `<script setup>` 是语法糖，糖纸下面就是 setup 选项

你在项目里写的是这个：

```html
<script setup lang="ts">
const count = ref(0)
</script>
```

它编译后大致变成：

```js
export default {
  setup() {
    const count = ref(0)
    return { count }        // ← 编译器自动帮你 return
  },
}
```

**所以 `setup` 选项和 `<script setup>` 不是两种东西，是同一件事的两种写法。**

| | `setup()` 选项 | `<script setup>` |
|---|---|---|
| 暴露什么给模板 | 你 `return` 的**才**暴露 | 顶层**所有**绑定自动暴露 |
| 多写一行 return | 要（每个变量手写） | 不要 |
| `export default` | 必须有 | **不能有**（编译器自己生成） |
| 组件注册 | `components: { X }` | `import X from './X.vue'` 自动可用（148 讲） |
| 能同时写选项式吗 | 能（同文件共存） | 不能（会冲突，除非再开一个 `<script>`） |

⚠️ **`<script setup>` 那条「所有顶层绑定自动暴露」有个暗面**：你定义了一个变量忘了用，它照样进模板作用域，**没有任何提示**。选项式至少要在 `data` 里主动列出来，你骗不了自己。

### 1.5 为什么必须换掉 `this`

把你 C# 的直觉摆出来对一下：

| | C# 的 `this` | 选项式 Vue 的 `this` | 组合式 |
|---|---|---|---|
| 谁创建 | 编译器 | Vue 运行时 `Object.assign` 拼 | **不存在** |
| 成员表 | 编译期固定，写错报错 | 运行时拼，写错是 `undefined` | 编译期就能查（你在用 `const`/`let`） |
| 是什么 | 你自己的类实例 | 一个 `Proxy` 包着的普通对象 | — |
| 提取方法后 | 委托还带实例（`this` 不丢） | **`this` 丢了** | 函数就是函数，不丢 |

最后一行是选项式最经典的坑，组合式天然没有：

```js
// 选项式
setTimeout(this.add, 1000)      // ← this 丢了，运行时 TypeError
// 组合式
setTimeout(add, 1000)          // ← 没有 this 可丢
```

**这就是 1.1 那个「名单」要摆到明面的真实收益：没有间层，就没有间层出错的地方。**

---

## 2. reactive 和 ref（144）🔥

### 2.1 两个函数，回答同一个问题

`setup` 只解决了「放哪」，没解决「怎么让改动被感知」。Vue 给了两个函数：

```js
import { reactive, ref } from 'vue'

const state = reactive({ count: 0 })   // ← 包对象
const count = ref(0)                   // ← 包一切，但要 .value
```

**为什么需要「包」这个动作？** 回到 Vue--01 你手写过的东西：

```js
// 你 Vue--01 手写的版本（简化）
function reactive(obj) {
  return new Proxy(obj, {
    get(t, k) { track(t, k); return t[k] },      // 读的时候记下"谁在用"
    set(t, k, v) { t[k] = v; trigger(t, k); return true },  // 写的时候通知
  })
}
```

**Vue 内置的 `reactive` 就是你这个东西的工业版。** 它必须返回一个新东西（Proxy），因为只有「经过代理」的读写才能被拦截 —— 直接改原对象，Vue 永远不知道。

那基本类型怎么办？`1` 是个数字，**没法挂 getter/setter**，也没有引用可以代理。所以只能套一层容器：

```js
// ref(0) 大概长这样（极简版）
function ref(v) {
  return {
    get value() { track(); return v },
    set value(nv) { v = nv; trigger() },
  }
}
```

**这就是 `.value` 的全部理由 —— 不是设计失误，是 JS 值语义逼出来的唯一解。**

### 2.2 reactive：只能包对象

```js
const s1 = reactive({ a: 1 })      // ✅ 对象
const s2 = reactive([1, 2, 3])     // ✅ 数组
const s3 = reactive(new Map())     // ✅ 集合
const s4 = reactive(1)             // ❌ 控制台警告，返回原值，不响应
```

报错原文（Vue 3.5）：

```
[Vue warn] value cannot be made reactive: 1
```

**注意它是 `warn` 不是 `error`。** 代码继续跑，`s4` 就是 `1`，你改它页面不动，控制台一片安静 —— 这是本轮的**第一个静默失败**。

`reactive` 的三个官方局限（不是 bug，是 Proxy 方案的边界）：

| 局限 | 代码 | 结果 |
|---|---|---|
| 只能对象 | `reactive(1)` | 警告 + 不响应 |
| **解构丢响应式** | `const { a } = reactive({ a: 1 })` | `a` 是普通数字，改它页面不动 |
| **整体替换丢响应式** | `let s = reactive({a:1}); s = reactive({a:2})` | 模板还盯着**老对象**，新对象没人管 |

第二条展开看一眼，因为你会天天碰到：

```js
const state = reactive({ count: 0 })
const { count } = state          // ← 这里拿到的是 0 这个值，不是"引用"
count++                          // 改的是本地变量，和 state 一点关系没有
```

**C# 对照**：这就像 `var a = obj.A;` 拿到的是值拷贝 —— 你不会指望改 `a` 会改 `obj.A`。JS 的解构只是语法糖，**它不产生引用**。区别是 C# 编译器不让你对值类型误会，JS 什么都不说。

要救解构，Vue 给了两个函数（够用版，本轮先认识 `toRefs`）：

```js
import { toRefs } from 'vue'
const { count } = toRefs(state)   // ← 拿到的是 ref，改 count.value 有效
```

### 2.3 ref：什么都包，代价是 `.value`

```js
const n = ref(0)              // 数字
const s = ref('hi')           // 字符串
const b = ref(false)          // 布尔
const arr = ref([1, 2])       // 数组
const obj = ref({ id: 1 })    // 对象 ← 也完全可以
```

`ref` 返回的是一个**对象**，形如 `{ value: 0 }`。所以脚本里必须：

```js
n.value++                     // ✅
n++                           // ❌ 改的是 ref 对象本身，报错或静默失效
```

用 `const` 还是 `let`？

```js
const n = ref(0)              // ✅ 标准写法
```

因为你永远只替换 `.value`，**不替换容器本身**。`const` 挡住的是「把容器换掉」这种操作 —— 而这正好是 `reactive` 那个「整体替换丢响应式」的坑，`ref` 用 `const` 就物理上防住了。

**C# 对照**：`readonly` 字段不能整体重新赋值，但可以改它内部状态 —— 完全同构。

`ref` 的深层响应：**传对象时内部会自动转成 `reactive`**。

```js
const user = ref({ name: 'a', tags: [] })
user.value.name = 'b'         // ✅ 深层也响应
user.value.tags.push('x')     // ✅
```

`ref` 传对象和 `reactive` 传对象，底层最后都是 Proxy。区别只在**外面那层 `{ value }` 壳**。

### 2.4 模板自动解包，脚本必须 `.value` —— 这条最容易骗你

```html
<script setup>
const count = ref(0)
</script>

<template>
  <p>{{ count }}</p>          <!-- ✅ 自动解包，渲染 0 -->
  <p>{{ count.value }}</p>    <!-- ❌ 渲染空白（number 没有 value） -->
</template>
```

**规则：模板只在「顶层」自动解包。**

| 位置 | 写什么 |
|---|---|
| `<template>` 顶层 | `{{ count }}` |
| `<template>` 里嵌在普通对象中 | `{{ obj.id }}` 中若 `obj.id` 是 ref → **不解包**，要 `.value` |
| `<script>` / `setup` 里 | 一律 `.value` |
| 传给函数当参数 | 想传值就 `.value`，想传响应式引用就不加 |

⚠️ 第二条是真坑，举个例子：

```js
const id = ref(1)
const wrapper = { id }        // ← 普通对象，不是 reactive
```

模板里 `{{ wrapper.id }}` 渲染出来是 `[object Object]`（RefImpl），不是 `1`。因为**只有 `wrapper` 是响应式对象时，Vue 才会顺手解包它内部的 ref**。

**记忆口诀：模板解包，看的是「离根几层」。顶层直接解，套在普通对象里不解，套在 reactive 里解。**

### 2.5 官方为什么推荐 ref 而不是 reactive

课程 144 集给了结论。四条理由：

| 理由 | 具体 |
|---|---|
| ① 通吃类型 | `reactive` 对基本类型直接无效；`ref` 什么都能装 |
| ② 整体替换安全 | `count.value = 1` 换的是值，容器没变；`reactive` 一换就断链 |
| ③ 解构有救 | `toRefs` 一行转回来；`reactive` 原始解构必丢 |
| ④ 传递不丢失 | `ref` 作为函数参数/返回值传出去，`.value` 一直在；`reactive` 传出去被人整体换掉就没救 |
| ⑤ TS 友好 | `Ref<number>` 类型明确；`reactive` 推导出的是 `UnwrapNestedRefs<T>`，看类型定义会绕 |

**实践结论（记住这条就够）：**

> **默认用 `ref`。** 只有当「一坨强相关的字段天然属于同一个对象，而且你从不整体替换它、从不解构它」时，才用 `reactive`。

你项目里 `App.vue` 用的全是 `ref`，就是这个原则的落点。

### 2.6 撞名必切：Vue 的 `ref` ≠ C# 的 `ref`

这两个词长得一样，**语义毫无关系**：

| | C# `ref` | Vue `ref()` |
|---|---|---|
| 是什么 | 参数的**传递方式修饰符** | 一个**函数**，返回容器对象 |
| 用在哪 | `void F(ref int x)` | `const x = ref(0)` |
| 解决什么 | 让被调方改到调用方的变量 | 让基本类型也能被拦截读写 |
| 谁提供 | 语言关键字 | 运行时库函数 |

你在 Vue 里看到 `ref`，脑子里**不要**冒出「引用传递」。它是「一个带 `.value` 的盒子」。

---

==二：格式==

## 1. 速查表

```js
// ═══ 引入 ═══
import { ref, reactive, toRefs } from 'vue'

// ═══ 声明 ═══
const count = ref(0)                    // 基本类型 / 任意类型
const state = reactive({ a: 1, b: 2 })  // 只对象
const { a, b } = toRefs(state)          // reactive 解构救急
```

```html
<!-- ═══ 模板 vs 脚本 ═══ -->
<template>{{ count }}</template>        <!-- 顶层自动解包 -->
<script setup>
count.value++                           <!-- 脚本必须 .value -->
</script>
```

| 想做的事 | 写法 | 坑 |
|---|---|---|
| 改数字 | `n.value = 1` | 忘 `.value` 静默失效 |
| 改对象字段 | `obj.value.name = 'x'` | 深层自动响应 |
| 加数组元素 | `list.value.push(x)` | `push` 是原地改，能响应 |
| 整体换数组 | `list.value = [...list.value, x]` | ✅ 安全（换的是 `.value`） |
| 整体换 reactive | — | ❌ 断响应式，**别这么写** |
| 解构 reactive | `toRefs(state)` | 直接解构必丢 |
| 判断是不是 ref | `isRef(x)` | 只在需要动态判断时用 |

| 场景 | 用哪个 |
|---|---|
| 数字 / 字符串 / 布尔 | `ref`（`reactive` 根本不支持） |
| 一个对象，字段强相关，从不整体替换 | `reactive` 也可以 |
| 表单一堆字段要双向绑定 | `reactive({...})` 也行，但项目里推荐 `ref` 包对象 |
| 要传给别的函数 / return 出去 | **只能 `ref`** |
| 数组 | `ref([])` 最稳 |

---

==三：代码==

## 1. 完整可跑实验：同一个计数器，四种写法

**目的**：让「哪种写法会静默失效」亲眼可见，不靠背。

### 1.1 reactive 正常版

```html
<script setup>
import { reactive } from 'vue'
const state = reactive({ count: 0 })
</script>

<template>
  <p>{{ state.count }}</p>
  <button @click="state.count++">+1</button>
</template>
```

点按钮数字涨 —— 正常。`state.count++` 走的是 Proxy 的 `set`，触发更新。

### 1.2 reactive 解构版（静默失败）

```js
const state = reactive({ count: 0 })
const { count } = state            // ← 拿到的是 0，不是引用
```

```html
<button @click="count++">+1</button>   <!-- 点了没反应 -->
```

**现象**：按钮能点，`count` 确实变成了 1、2、3，但**页面永远是 0**，控制台零报错。

**为什么**：`count` 是 `setup` 作用域里的普通变量。它**不是响应式的**，所以改它不会触发任何东西。而模板渲染的 `count` 恰好也是这个普通变量 —— 但它只在首次渲染时取过一次值，之后没人通知它重算。

> **自证方法**：在按钮里同时 `console.log(state.count, count)`。你会看到 `state.count` 一直是 0，`count` 在涨。两个值从解构那一行起就分道扬镳了。

### 1.3 reactive 整体替换版（断链）

```js
let state = reactive({ count: 0 })
state = reactive({ count: 100 })   // ← 模板还盯着老的
```

**现象**：页面还是 0。

`state` 这个变量指向了新对象，但模板在首次渲染时**已经记住了老对象**（通过闭包/渲染函数的依赖）。换变量指向，模板不知道。

**修法**：要么别整体换（改字段），要么改用 `ref`：

```js
const state = ref({ count: 0 })
state.value = { count: 100 }       // ✅ 换的是 .value，容器没变
```

### 1.4 ref 版（推荐）

```html
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <p>{{ count }}</p>
  <button @click="count++">+1</button>
</template>
```

**注意模板里写的是 `count` 不是 `count.value`** —— 自动解包。而 `@click="count++"` 会被编译成 `count.value++`，也自动处理了。

⚠️ 但**同一份逻辑搬到 script 里就得手写**：

```js
const count = ref(0)
function add() {
  count++            // ❌ 改的是容器对象 → 报错或静默失效
  count.value++      // ✅
}
```

**这就是组合式里最高频的一个错，没有之一。**

## 2. 一个能跑通的 `setup` 选项版（和 `<script setup>` 对照）

同一份功能，两种写法，建议并排开两个文件对一次：

**A. `setup` 选项**

```html
<script lang="ts">
import { ref } from 'vue'
export default {
  setup() {
    const count = ref(0)
    const add = () => count.value++
    return { count, add }        // ← 名单：不写就不给模板
  },
}
</script>
```

**B. `<script setup>`**

```html
<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
const add = () => count.value++
</script>
```

**差别的就三处**：`export default` / `setup(){}` 壳 / `return`。功能完全一致。

**建议你现在只写 B。** A 的价值是让你知道 B 编译成了什么 —— 哪天看到旧项目的写法不至于陌生。

## 3. 桌宠项目落地映射

你第 1 步（首屏切换）已经用到了本轮的半套知识，现在能对上号了：

| 项目里写的 | 本轮解释 |
|---|---|
| `const isPet = ref(false)` | `ref` 装布尔，`reactive` 装不了 |
| 模板 `v-show="isPet"` | 顶层自动解包，不写 `.value` |
| 函数里 `isPet.value = true` | 脚本必须 `.value`，这就是你之前抄的那行 |
| `const msgList = ref<Msg[]>([])` | 数组用 `ref`，整体替换安全（第 2 步会用到） |
| `computed(() => ...)` | 145 集讲，本轮锁着 |

**一个提醒**：你项目里 `App.vue` 如果同时有 `ref` 和 `reactive`，检查一下 `reactive` 那份**有没有被解构过**。有的话，现在就知道为什么当时改不动了。

---

==四：总结==

## 1. 一句话记住三个

- **`setup` = 摆到明面上的 `data`**，`<script setup>` 是它的糖；`this` 在这里不存在。
- **`reactive` 包对象，`ref` 包一切**；包装的本质是「造一个能被拦截的读写入口」。
- **模板顶层自动解包，脚本一律 `.value`。** 记错这一条，你会花掉一整晚。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| setup 里 `this` | **`undefined`**，不是"空对象" |
| setup 返回什么 | 返回**对象** → 给模板；返回**函数** → 当渲染函数 |
| `<script setup>` 暴露规则 | 顶层**所有**绑定自动暴露，不用 `return` |
| `reactive` 入参 | **只能是对象**（对象/数组/Map/Set） |
| `reactive` 三条局限 | 只能对象 / 解构丢响应 / 整体替换丢响应 |
| `ref` 返回值 | 一个带 `value` 属性的**对象**，不是原始值 |
| `ref` 用 `const` | 因为只换 `.value`，不换容器 |
| 解包边界 | 模板**顶层**自动解；脚本里必须 `.value` |
| 官方推荐 | **默认 `ref`**，`reactive` 只在「对象强相关且不替换不解构」时用 |

## 3. ⭐ 收敛时刻

**这一轮把前面三个散点一次性接上了：**

**① Vue--01 你手写的 `reactive()` → 内置 `reactive`**

你那版只有 `get`/`set` 两个坑没填（嵌套对象不递归代理、依赖存储用的是全局 Set 而不是「当前渲染函数」）。内置版填的就是这些，**骨架完全一样**。你现在应该能解释「为什么 `reactive` 必须 return 一个新对象」——不 return 就没法拦截。

**② Vue--01 讲的 Vue2 `Object.defineProperty` → `ref` 的 `.value`**

Vue2 为什么不能新增属性？因为 `defineProperty` 是**逐个属性**挂 getter/setter，挂的时候对象有哪些属性是固定的。`ref` 的 `.value` 是**单个属性版**的同一个思路 —— 一个属性，一个 getter/setter，够用就行。**Vue3 用 Proxy 是因为要解决「新增属性」；`ref` 不需要解决，所以继续用属性拦截。**

**③ Vue3--01 说的「Proxy 响应式」→ 现在见到实物**

上一篇只是宣告「Vue3 换成 Proxy 了」，这一篇你亲手声明了 `reactive` 和 `ref` —— 它们就是 Proxy 和属性拦截对外的两个门。

**④ 选项式的 `data` → 拆成两半**

| 选项式 | 组合式 |
|---|---|
| `data()` 返回对象 | `setup` 返回对象（或 `<script setup>` 自动收集） |
| `this.xxx` 访问 | 直接访问 `const` 变量 |
| 响应式由 Vue 在你背后加 | 你必须**显式** `ref()` / `reactive()` 包一下 |

**最后一行是这轮真正的思维转变：Vue2 里「放进 data 就响应」，Vue3 里「不包就没有响应」。**

## 4. 静默失败清单

组合式最坑的地方是**它不报错**。逐条对照：

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `reactive(1)` | 控制台 `value cannot be made reactive: 1`，页面不动 | 警告不是错误，代码照跑 |
| 2 | `const { a } = reactive({a:1})` | 改 `a` 页面不动 | 解构拿到的是值拷贝，不是引用 |
| 3 | `let s = reactive({...}); s = reactive({...})` | 模板还显示老数据 | 模板记住了老对象 |
| 4 | 脚本里 `count++` | 用 `const` 时报 `Assignment to constant variable`；用 `let` 时**静默失效** | 改的是容器，不是 `.value` |
| 5 | 模板里 `{{ count.value }}` | 渲染空白 | 模板已解包，`number.value` 是 `undefined` |
| 6 | `{{ wrapper.id }}`（`wrapper` 是普通对象、`id` 是 ref） | 渲染 `[object Object]` | 只有 reactive 对象内部的 ref 才解包 |
| 7 | setup 里用 `this.x` | `TypeError: Cannot read properties of undefined` | 这个还算好的，至少报错 |
| 8 | `setup` 忘了 `return` | 模板全空，**零报错** | `<script setup>` 不会犯，选项式会 |
| 9 | ref 和 reactive 混用同名 | 后者覆盖前者，无提示 | 同一个作用域不能重名，但跨文件不会报 |

**第 4 条是重灾区。** 工程上怎么防：

- 一律 `const xxx = ref()`，让「替换容器」直接编译报错；
- 编辑器装 Vue 官方插件（Volar），它会检测模板里多余的 `.value`；
- 习惯性把所有状态集中在文件顶部，一眼能看完 —— 这是组合式的组织优势，别浪费。

**这不是 bug，是代价**：JS 是动态语言，`ref`/`reactive` 都是普通函数，编译器不可能知道「这个变量是响应式的」。TS 能帮你一点（`Ref<number>` 类型明确），但 `.value` 忘写它也不报 —— 因为 `count++` 对 `Ref<number>` 类型本身就非法……**除非** TS 宽容了。所以真正的防线是 **Volar 插件 + 自己的书写习惯**。

## 5. C# 类比可用度

| C# / .NET 侧 | Vue3 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `private int _x; public int X { get => _x; set { _x = value; Notify(); } }` | `ref(0).value` 的 get/set 拦截 | ⭐⭐⭐ | **同构**：都是「属性包一层，读写被截」 |
| `INotifyPropertyChanged` / `PropertyChanged` 事件 | Vue 的依赖收集 + `trigger` | ⭐⭐⭐ | Vue 自动记录「谁在用」，.NET 要手工 `AddHandler` |
| `class Box<T> { public T Value {get;set;} }` | `Ref<T>` | ⭐⭐⭐ | 形似：都是为了「装一个值，共享可变」 |
| `readonly` 字段（不能重赋值，可改内部） | `const n = ref(0)` | ⭐⭐⭐ | 完全同构，`ref` 用 `const` 就是这个理由 |
| `DispatchProxy` / EF Core 的变更追踪实体 | `reactive()` | ⭐⭐ | 都是代理拦截，但 .NET 侧要`DbContext`记账，Vue 是自动的 |
| `record` / 不可变对象 | — | ❌ | Vue 的响应式要求可变，理念相反 |
| `ref` **关键字** | `ref()` **函数** | ❌ | **纯撞名**，语义无关，见 2.6 |

**用法建议**：把 `ref(0)` 想成「一个 `Box<int>`，读写得走 `.Value`」——你立刻能理解为什么必须 `.value`，以及为什么 `const` 不矛盾。这个类比比任何比喻都准。

## 6. 解锁边界

**本轮新解锁**

- `setup` 选项：执行时机（`beforeCreate` 之前）、`this === undefined`、两种返回值
- `<script setup>` 与 `setup` 选项的编译对应关系，及各自暴露规则
- `reactive`：入参限制、深层响应、三条局限、`value cannot be made reactive` 警告
- `ref`：任意类型、`.value` 的**存在理由**（值语义无法拦截）、深层自动转 reactive
- `toRefs` 解构救急（**够用版**，只讲了「能救」，没讲实现）
- 模板解包边界：顶层解 / 普通对象内不解 / reactive 内解
- 官方「默认用 ref」的五条理由

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| `computed` 组合式版 | **Vue3--03（145）** |
| `watch` / `watchEffect` | Vue3--03（146） |
| 组合式生命周期（`onMounted` / `onUnmounted`） | Vue3--03（147） |
| `setup(props, ctx)` 的 `props` 参数、`defineProps` / `defineEmits` | Vue3--04（148） |
| 模板引用 `ref="xxx"`、`defineExpose` | Vue3--04（149） |
| `provide` / `inject` / `defineOptions` / `defineModel` | Vue3--05（150-152） |
| `toRefs` / `toRef` 的底层实现与 `shallowRef` | 课程未讲，用时单开 |
| Pinia（跨组件共享） | Pinia--01（153-155） |
| 组件拆分 + 组合函数落地 | 项目第 8 步 |

⚠️ **术语撞车登记**（本轮新增两条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `ref` | C# 引用传递修饰符 | Vue 响应式容器 | 看有没有括号：`ref()` 是前者 |
| `reactive` | — | Vue Proxy 包装函数 | 顺带记住：**不是形容词**，是函数名 |

## 7. 下一轮预告

**Vue3--03 = 145-147：`computed` / `watch` / 生命周期。**

这三集回答的问题是：**「派生值」和「副作用」没有 `computed:` / `watch:` 配置项了，放哪？**

关键看点：

- `computed` 组合式版返回的**是一个 ref** —— 所以它也要按 `ref` 的规则走（脚本 `.value`，模板自动解包）。这一点课程可能一句话带过，但它是「组合式所有返回 ref 的函数都长得一样」的第一块拼图。
- `watch` 从「写字段名」变成「传一个 getter」，**这是从字符串配置到函数式 API 的范式切换**，也是你 C# 出身的直觉最不适应的一处。
- 生命周期钩子从「选项」变成「函数调用」，且**必须在 setup 同步阶段调用** —— 放到 `setTimeout` 里调会静默失效。

⚠️ **建议新开对话**：下一篇开始接触「函数式 API 的范式切换」，和这篇的「声明式状态」是两套思路，堆在同一个对话里上下文会串。

**项目侧**：第 3 步（输入框与发送）只用到 `v-model`，第 4 步（气泡定时器）才需要 `watch` + `onUnmounted`。所以你可以**先做第 3 步**，等下一篇讲完 `watch` 再做第 4 步 —— 顺序正好。
