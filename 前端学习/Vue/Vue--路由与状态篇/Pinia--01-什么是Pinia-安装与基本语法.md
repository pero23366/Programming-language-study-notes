# Pinia--01 · 什么是 Pinia · 装到项目 · 基本语法

> **对应课程**：153-155（黑马 `BV1HV4y1a7n4`，3 集 / 约 39 分钟）
> **读法**：这是「Vue3 线」的第 6 篇，也是**状态管理的正式开场**。前五篇是「组件内部 → 父子 → 跨层级」，这一篇终于跨到了「**跨分支、跨组件、跨文件**」。
> **本轮定位**：三个问题 —— **为什么非得再引入一个库**（153）、**它怎么装进来**（154）、**一个 store 长什么样、怎么写怎么用**（155）。
> **⚠️ 对照提醒**：你在 `Vue--09~11` 学过 vuex（Vue2 时代）。这一篇会**反复拿 Pinia 和 vuex 对照**，因为课程把 Pinia 当作「vuex 的替代品」讲，你不带着 vuex 的印象去听会觉得它俩没关系。

---

==一：概念==

## 1. 为什么还要再来一个库（153）🔥

### 1.1 把你已经有的四种手段排一排

到 Vue3--05 为止，跨组件拿数据的手段你全见过了。**每一种都能用，每一种都有明确的边界**：

| 手段 | 能覆盖的范围 | 死在哪 |
|---|---|---|
| `props` | 父子**一层** | 多层要钻透，中间层被迫当传声筒 |
| `provide / inject` | 祖 → 后代**任意层** | **没有容器**：跨分支不行、非组件代码里取不到、祖先一销毁全丢 |
| 模块级全局变量（`export const count = ref(0)`） | **到处都能用** | 没有组织、没有调试、SSR 下会串数据 |
| 事件总线（Vue2 的 `$bus`） | 任意两个组件 | **只能通信，不能存**；Vue3 直接移除了 `$on/$off` |

**看第三行**：`export const count = ref(0)` 其实**真的能用**，很多小项目就这么干。所以「为什么需要 Pinia」这个问题的答案不是「全局变量不行」，而是：

> **全局变量能跑，但它把「状态」这件事退化成一个孤立的 `ref`** —— 没有地方看、没有地方改、没有归属。

### 1.2 全局变量缺的四样东西

| 缺什么 | 具体表现 | Pinia 怎么补 |
|---|---|---|
| **组织** | 十个页面各自 `export` 一个 ref，散落在十个文件里 | 一个 store 一个文件，`state` / `getters` / `actions` 三段分明 |
| **调试** | 改了谁、什么时候改的，只能靠 `console.log` | Devtools 里有 Pinia 面板，**能看到每次 mutation 和时间线** |
| **约束** | 任何文件都能 `count.value = 0`，无法追溯 | 改数据走 `actions`，有明确的入口 |
| **服务端安全** | 模块级变量在 Node 里是**单例**，SSR 时不同用户的请求会共享同一份状态 | store 按应用实例隔离 |

**第四行你可能觉得遥远**（你项目是纯前端 SPA），但它是 Pinia 在官方文档里被推荐的头号理由之一 —— **不要把它当"多此一举"，当成"提前避开一个结构性坑"**。

### 1.3 用一句话定位 Pinia

> **一个 store = 一份「有名字、有归属、能被调试」的响应式状态 + 它的计算属性 + 它的方法。**

和你 C# 里的东西对一下：

```csharp
// Pinia store 大致等于这个
public class CartStore          // ← defineStore('cart', ...)
{
    public List<Item> Items { get; } = new();      // state
    public decimal Total => Items.Sum(i => i.Price * i.Count);  // getters
    public void Add(Item item) { Items.Add(item); }             // actions
}
```

**唯一的区别是它注册在一个容器里，谁都能按名字取到 —— 而那个容器正是 Vue3--05 里缺的东西。**

**这就把上一篇的坑补上了**：

| Vue3--05 的三条限制 | Pinia |
|---|---|
| 没有容器，非组件代码取不到 | ✅ 任何 `.js/.ts` 都能 `useXxxStore()` |
| 靠组件树存活，祖先销毁就没了 | ✅ 挂在 app 上，应用活着它就在 |
| 跨分支共享不到 | ✅ 全局唯一，随便哪个分支都取同一份 |

### 1.4 Pinia 与 vuex 的五个差别

你学过 vuex，直接对照最快：

| | vuex（你学过的） | Pinia |
|---|---|---|
| 改 state 的方式 | **必须** `commit('mutation')` | **直接改** `store.count++`，或 `$patch` |
| 有 mutations 吗 | ✅ 有，且是唯一改 state 的入口 | ❌ **没有这个概念** |
| 异步放哪 | actions（mutations 必须同步） | actions（本来就没有同步限制） |
| 分模块 | `modules` + `namespaced: true` + 拼路径 `'cart/add'` | **一个文件一个 store**，直接 import，可互相引用 |
| 类型推断（TS） | 差，要手写一堆类型 | **好**，自动推导 |

**第一行和第三行是同一个变化的两面**：vuex 强制「先 commit 再改」是为了**让 Devtools 能记录每一步**。Pinia 直接在 store 上做代理拦截，**不需要 mutation 这一层中间人也能记录**。所以 mutations 消失不是简化的妥协，是**技术进步让它变成冗余**。

⚠️ **一个后果**：vuex 里你能靠「搜索 `commit(`」找出所有改数据的地方；Pinia 里 `store.count++` 散落各处也能改。**这层安全网没了**，纪律得自己守（见 3.4）。

---

## 2. 装到项目里（154）

### 2.1 三步

```bash
npm i pinia
```

```js
// main.js / main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())        // ② 装插件
app.mount('#app')             // ③ 挂载
```

```js
// src/stores/counter.js  ← ③ 建一个 store 文件
import { defineStore } from 'pinia'
export const useCounterStore = defineStore('counter', { state: () => ({ count: 0 }) })
```

**目录约定**：`src/stores/`（不是 `store`，官方模板用复数）。

### 2.2 ⚠️ 顺序不能反

```js
app.use(createPinia())
app.mount('#app')          // ← use 必须在 mount 之前
```

**反了会怎样？** 组件在 `mount` 时就开始执行 `setup`，里面调 `useCounterStore()` —— 此时 Pinia 还没装好，报错：

```
[🍍]: "getActivePinia()" was called but there was no active Pinia.
Are you trying to use a store before calling "app.use(pinia)"?
```

**这个错误信息质量很高**，直接告诉你原因了。把 🍍 这个前缀记住：**所有 Pinia 的运行时错误都带它**，一眼能认出是谁在抱怨。

### 2.3 `create-vue` 生成的模板已经自带

上一轮（Vue3--01）你用 `create-vue` 建项目时如果勾了 Pinia，`main.ts` 里已经有一行 `app.use(createPinia())` 了 —— 只是你当时不认识它。

**课程让你手动装一遍的意义**：知道它只是「一个 Vue 插件」，`app.use()` 一装就有，**没有任何构建配置**。这和你 C# 里 `services.AddXxx()` 是同一种体验。

---

## 3. 一个 store 长什么样（155）🔥

### 3.1 两种写法，先看对照

**选项式（options store）—— 像 vuex**

```js
// src/stores/counter.js
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),

  getters: {
    double: (state) => state.count * 2,
  },

  actions: {
    add() {
      this.count++          // ← this 指向 store 实例
    },
  },
})
```

**setup 式（setup store）—— 像组件**

```js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)                              // state
  const double = computed(() => count.value * 2)    // getters
  function add() { count.value++ }                  // actions

  return { count, double, add }                     // ← 必须 return
})
```

**看第二段有没有很眼熟？** `ref` / `computed` / 函数 / `return` —— **和 `<script setup>` 一模一样**。

这就是 setup 式 store 的全部秘密：**它就是「把组件的 `<script setup>` 抽出来，改个名字复用」**。你前五篇学的所有东西（`.value`、computed 缓存、没有 `this`）在这里**原样成立**。

| | 选项式 store | setup store |
|---|---|---|
| 长相 | 像 vuex | 像 `<script setup>` |
| `this` | ✅ 有，指向 store | ❌ 没有 |
| `.value` | 不用 | **要**（和组件一样） |
| 要 return 吗 | 不用（自动收集） | **要**（漏了就是 `undefined`） |
| `$reset()` | ✅ 有 | **❌ 没有**（见 3.5） |
| 和组合式语法一致 | ❌ 另一套 | ✅ 完全一致 |

**选哪个？** 你现在是「Vue3 组合式」这条线，**用 setup 式**。理由不是它更先进，是**你不用同时维护两套心智** —— `this` 一套、`.value` 一套，混着写必错。

⚠️ 但**看懂选项式是必须的**：官方文档和绝大部分教程、公司老代码都是选项式。**读得懂、写只写一种**。

### 3.2 在组件里用

```html
<script setup>
import { useCounterStore } from '@/stores/counter'

const store = useCounterStore()          // ← 调用一下，拿到 store 实例
</script>

<template>
  <p>{{ store.count }} / {{ store.double }}</p>
  <button @click="store.add()">+1</button>
</template>
```

**三件事**：

| 写法 | 说明 |
|---|---|
| `useCounterStore()` | 一个**函数**，返回 store 实例。名字必须 `use` 开头（约定，Devtools 靠它识别） |
| `store.count` | 读 state，**不用 `.value`**（store 是 reactive 对象，属性自动解包） |
| `store.double` | 读 getters，也是**不带括号、不带 `.value`** |
| `store.add()` | 调 actions，**带括号** |

**注意 `store.count` 不用 `.value`** —— 这一条特别好记，因为它和 `reactive` 对象的规则一致（`reactive({count: 0})` 也是 `state.count`）。**store 本质就是一个被包了额外能力的 `reactive` 对象。**

### 3.3 🔥 最大的坑：解构 store 会丢响应式

```js
const store = useCounterStore()
const { count, double } = store        // ❌ 拿到的是「当前值」，不是响应式的
count++                                // 改的是本地变量，store 一点没变
```

**症状**：按钮点了，`console.log(count)` 在涨，**页面永远是 0**，控制台零报错。

**根因和 Vue3--02 的 `reactive` 解构、Vue3--05 的 `provide(k, count.value)` 是同一个**：

> JS 只有值语义。`{ count } = store` 是一次**读取**，读到的是那一刻的数字。你和 store 的关系在读完就断了。

**三种应对**：

| 做法 | 说明 | 什么时候用 |
|---|---|---|
| **不解构**，全程 `store.count` | 最稳，零心智负担 | **默认就用这个** |
| `computed(() => store.count)` | 手动包一层，保住响应式 | 模板里嫌 `store.` 太长 |
| `storeToRefs(store)` | Pinia 官方函数，一次性全拆成 ref | **157 集专门讲，本轮锁着** |

**本轮先只记第一条**：**别解构，写 `store.count`。** 多打四个字符，省一晚排查。

### 3.4 改 state 的三种方式

```js
const store = useCounterStore()

// ① 直接改（最常见）
store.count++

// ② $patch 传对象：批量改，一次触发
store.$patch({ count: 0, name: 'x' })

// ③ $patch 传函数：适合「根据旧值算新值」
store.$patch((state) => {
  state.count++
  state.list.push(item)
})
```

| 方式 | 特点 |
|---|---|
| 直接改 | 简单；**Devtools 里会显示成一次 mutation** |
| `$patch(对象)` | 批量合并且只触发一次更新；**嵌套对象是浅合并** |
| `$patch(函数)` | 能拿旧值；**数组操作必须用这个**（`push` 在对象形式里做不出来） |

⚠️ **`$patch` 对象形式对嵌套是「浅替换」**：

```js
// store.user = { name: 'a', age: 18 }
store.$patch({ user: { name: 'b' } })     // ← age 没了
```

**要局部改嵌套，用函数形式**：`store.$patch(s => { s.user.name = 'b' })`。

### 3.5 `$reset()` 只属于选项式

```js
store.$reset()        // 选项式 store ✅
```

**setup store 里调用会报错：**

```
[🍍]: Store "counter" is built using the setup syntax and does not implement $reset()
```

**为什么？** 选项式的 `state` 是一个**函数**，`$reset` 就是「再调一次那个函数，把结果赋回去」。setup store 的 state 是一堆散在闭包里的 `ref`，**没有「一键重建」的入口** —— Pinia 不知道该怎么把 `count` 复原成 `0`。

**setup store 想要 reset 就自己写一个**：

```js
function reset() { count.value = 0 }
return { count, double, add, reset }
```

**这条是选 setup 式要付的代价，得知道。**

### 3.6 getters 与 `this` 的两个细节

**选项式的 getters 默认是普通函数，`this` 指向 store：**

```js
getters: {
  double: (state) => state.count * 2,          // ✅ 用参数
  triple() { return this.count * 3 },          // ✅ 用 this（注意不是箭头函数）
  wrong: () => this.count * 4,                 // ❌ 箭头函数没有 this
}
```

**为什么必须用普通函数？** 和 Vue2 的 `methods` 同一个坑 —— **箭头函数的 `this` 是定义时所在的作用域，不指向 store**。`this.count` 会得到 `undefined`，算出 `NaN`，**不报错**。

**setup 式里没有这个问题**：`computed(() => count.value * 2)`，压根没有 `this`。

### 3.7 一个 store 用另一个 store

```js
export const useCartStore = defineStore('cart', () => {
  const user = useUserStore()          // ← 直接在顶部调，不用传参
  const items = ref([])
  function checkout() {
    if (!user.isLogin) return
    // ...
  }
  return { items, checkout }
})
```

**这是 vuex 里最烦的事**（跨模块要 `rootState`、要拼 namespace），Pinia 里就是**普普通通的 import + 调用**。因为每个 store 都是独立的容器条目，**互相引用不构成层级**。

⚠️ **但会形成循环依赖**：A 的顶部 `useBStore()`、B 的顶部 `useAStore()` → 运行时报 `Cannot access 'xxx' before initialization`。**解法**：把调用挪到**函数体内**（action 里），用的时候才取。

---

==二：格式==

## 1. 速查表

| API | 签名 | 说明 |
|---|---|---|
| `createPinia()` | — | 返回插件实例，`app.use()` 装上 |
| `defineStore(id, 选项对象)` | id 必须**唯一** | 选项式 store |
| `defineStore(id, setup函数)` | 同上 | setup store，**必须 return** |
| `useXxxStore()` | — | 拿 store 实例；**必须在 pinia 装好之后** |
| `store.xxx` | — | 读 state / getters，**不用 `.value`** |
| `store.action()` | — | 调 actions |
| `store.$patch({...})` | 对象 | 批量改，浅合并 |
| `store.$patch(s => {...})` | 函数 | 能拿旧值、能操作数组 |
| `store.$reset()` | — | **仅选项式** |
| `store.$state` | 可读可写 | 整体替换（会合并） |

## 2. 两种写法对照

| 位置 | 选项式 | setup 式 |
|---|---|---|
| state | `state: () => ({ count: 0 })` | `const count = ref(0)` |
| getters | `getters: { double: (s) => s.count * 2 }` | `const double = computed(() => count.value * 2)` |
| actions | `actions: { add() { this.count++ } }` | `function add() { count.value++ }` |
| 入口 | 传**对象** | 传**函数** |
| 要不要 return | 不用 | **全部 return** |

**一句话记**：**选项式 = vuex 的语法减掉 mutations；setup 式 = `<script setup>` 换个壳。**

---

==三：代码==

## 1. 最小可跑：一个计数器 store

**`src/stores/counter.js`**

```js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)

  function add() { count.value++ }
  function reset() { count.value = 0 }

  return { count, double, add, reset }
})
```

**`main.js`**

```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
```

**`Counter.vue`**

```html
<script setup>
import { useCounterStore } from '@/stores/counter'
const store = useCounterStore()
</script>

<template>
  <p>{{ store.count }} × 2 = {{ store.double }}</p>
  <button @click="store.add">+1</button>
  <button @click="store.reset">复位</button>
</template>
```

**验证点**：打开 Devtools 的 Pinia 面板，点 `+1` —— 能看到 `count` 变化的历史记录。**这就是 vuex 的 `commit` 曾经提供的那个能力，现在自动有了。**

## 2. 对照实验：解构 store（静默失败）

```js
const store = useCounterStore()
const { count } = store        // ← 罪魁祸首

function badAdd() {
  count++                      // 本地变量在涨
  console.log(count)           // 1 2 3...
  console.log(store.count)     // 0 0 0...   ← store 一动不动
}
```

**这四行值得亲手跑一遍。** 它和 Vue3--02 的 `reactive` 解构、Vue3--05 的 `provide(k, count.value)` **是同一个坑的第三次出场** —— 三个场景、一个根因。

## 3. 两个 store 互相调用（含规避循环依赖）

```js
// stores/user.js
export const useUserStore = defineStore('user', () => {
  const isLogin = ref(false)
  return { isLogin }
})
```

```js
// stores/cart.js
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  function checkout() {
    const user = useUserStore()      // ✅ 放在函数里，用到才取
    if (!user.isLogin) return
    items.value = []
  }

  return { items, checkout }
})
```

**为什么不放顶部？** 顶部写法在**单向依赖**时没问题（cart 依赖 user），但一旦 user 也 import cart 就成环。**统一放函数体，永远不会错**，代价只是每次调用多一条语句。

---

==四：总结==

## 1. 一句话记住三个

- **Pinia 就是上一篇缺的那个「容器」**：有容器了，非组件代码能取、跨分支能共享、祖先销毁不丢。
- **store 是 reactive 对象**：读写直接 `store.xxx`，**不用 `.value`、解构必死**。
- **setup store = `<script setup>` 换个壳**，你前五篇的规则一条都没变。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 安装 | `app.use(createPinia())`，**在 `mount` 之前** |
| 未安装就调 store | `[🍍] getActivePinia() was called but there was no active Pinia` |
| `defineStore` 第一个参数 | **id，全局唯一**（Devtools 靠它、持久化插件靠它） |
| state 为什么是函数 | 和组件的 `data` 一样，避免实例间共享 |
| setup store 必须做什么 | **return** 所有要暴露的 state / getters / actions |
| 读 state 要 `.value` 吗 | **不要**，store 是 reactive |
| 解构 store | **丢响应式**（第三次见到同一个坑） |
| `$patch` 对象 vs 函数 | 浅合并 vs 能拿旧值 / 能操作数组 |
| `$reset` 支持谁 | **只有选项式**；setup store 报 `does not implement $reset()` |
| 选项式 getters 的 `this` | 必须是**普通函数**，箭头函数里 `this` 是 `undefined` |
| 跨 store 引用 | 直接 `useOtherStore()`；**放在函数体里防循环依赖** |
| 和 vuex 最大差别 | **没有 mutations**，直接改 state |

## 3. ⭐ 收敛时刻

**这一轮把前五篇的三个悬念一次性结清：**

**① Vue3--05「provide/inject 没有容器」→ Pinia 就是那个容器**

把那张表拿回来对一遍：

| Vue3--05 的限制 | 现在 |
|---|---|
| 非组件代码取不到 | `import { useCartStore }` 在 `api/cart.js` 里照样能用 |
| 只在子树里，跨分支不行 | 全局唯一，随便哪都取同一份 |
| 靠树存活 | 挂在 app 上，应用活着它就在 |
| key 拼错变 `undefined` | id 是字符串但只在一处定义，**且 Devtools 会显示有哪些 store** |

**「没有容器」这句话你现在应该能自己补全后半句了：所以要有一个容器。**

**② Vue3--02「不包就没有响应式」→ store 是自动包好的**

```js
const count = ref(0)              // 组件里：要自己包
const store = useCounterStore()   // store 里：state 已经被包好了
```

所以 `store.count` 直接读写、不用 `.value`。**但「解构丢响应式」照样成立** —— 因为解构发生在**包好之后**，你把它拆出来就退化成普通值了。**「包」和「拆」是两件事，Pinia 只帮你做了前一件。**

**③ Vue3--05「宏是为 `export default` 打的补丁」→ `defineStore` 是同一个模式**

`defineProps` / `defineEmits` / `defineStore` 全都是 `defineXxx` —— **这个前缀是 Vue 生态的约定：「定义一个编译器/运行时能识别的东西」**。看到 `define` 开头就知道它大概率有特殊约束（宏不能乱放、`defineStore` 的 id 必须唯一）。

**④ 同一个坑，第三次**

| 场景 | 丢响应式的写法 |
|---|---|
| Vue3--02 | `const { a } = reactive({ a: 1 })` |
| Vue3--05 | `provide(k, count.value)` / `provide(k, {...state})` |
| **Pinia** | `const { count } = store` |

**三个场景，一个根因：JS 只有值语义，读出来的那一刻关系就断了。** 你以后遇到任何「响应式突然不灵了」，先问一句：**我是不是把值取出来了？**

## 4. 静默失败清单

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `const { count } = store` | 页面永远不动，控制台干净 | 解构成了普通值 |
| 2 | 从解构出来的变量赋值 | 改得动，但 store 没变 | 同上，改的是本地副本 |
| 3 | setup store 忘了 `return xxx` | `store.xxx` 是 `undefined`，零提示 | 没 return 就不在 store 上 |
| 4 | 选项式 getters 用箭头函数 + `this` | 算出 `NaN` / `undefined` | 箭头函数没有 `this` |
| 5 | `$patch({ user: { name } })` | 嵌套字段被整块替换，`age` 消失 | 对象形式是**浅合并** |
| 6 | setup store 调 `$reset()` | `[🍍] does not implement $reset()` | 闭包里没法一键重建 |
| 7 | 顶层互相 `useOtherStore()` | `Cannot access 'x' before initialization` | 循环依赖，挪进函数体 |
| 8 | `app.mount()` 在 `use(pinia)` 之前 | `[🍍] no active Pinia` | 顺序反了（这个会报，算好运） |
| 9 | 组件外**模块顶层**调 `useXxxStore()` | `no active Pinia` | 模块加载时 pinia 还没装 |
| 10 | 两个 store 用了同一个 id | 后者覆盖前者，无提示 | id 必须全局唯一 |

**第 1、2、3 条是重灾区。** 工程上怎么防：

- **组件里永远写 `store.xxx`**，把「不解构」当铁律；真嫌长就 `const s = useCartStore()`；
- setup store 的 `return` **写成一行、和上面的定义一一对应**，肉眼能对账；
- 需要「展开」时（比如 `v-bind="store"` 或传对象），先想一秒「我是不是在拆响应式」，**要拆就用 `storeToRefs`**（157）。

**这不是 bug，是代价。** store 是 Proxy 包装的 reactive 对象，**响应式活在「属性访问」这个动作上**，一旦你把值取出来，Vue 就没有任何东西可拦截了。

## 5. C# 类比可用度

| C# / .NET 侧 | Pinia 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `services.AddSingleton<T>()` + `GetRequiredService<T>()` | `defineStore` + `useXxxStore()` | ⭐⭐⭐ | **最准的类比**：注册一次、随处解析、单例 |
| 单例服务的字段 / 属性 | `state` | ⭐⭐⭐ | 同构 |
| 只读计算属性（带缓存） | `getters` / `computed` | ⭐⭐⭐ | 都是「派生值，自动失效」 |
| 实例方法 | `actions` | ⭐⭐⭐ | `this` 指向 store ↔ `this` 指向实例，**完全同构** |
| MediatR 的 Command 分发 | `$patch` | ⭐ | 都是「一次改动一个入口」，但 Pinia 不强制 |
| `INotifyPropertyChanged` | store 的响应式 | ⭐⭐ | Pinia 自动，.NET 要手工 raise |
| `IDisposable` 单例的 `Dispose` | — | ❌ | store 没有销毁概念，应用结束就没了 |
| 静态类 + 静态字段 | 模块级 `export const x = ref()` | ⭐⭐ | **这就是 Pinia 要替代的东西**，能跑但没组织 |

**用法建议**：把 `useCartStore()` 直接读成 **`GetRequiredService<CartStore>()`** —— 这个类比在 Pinia 上几乎百分之百成立（有容器、单例、随处可取），比在 `provide/inject` 上套 DI 准得多。**这也反过来印证了上一篇的结论。**

## 6. 解锁边界

**本轮新解锁**

- Pinia 的定位与「四种共享手段」的边界对照
- 与 vuex 的五条差别（无 mutations / 无 modules / TS 友好 / 直接改 state / actions 天然异步）
- `createPinia()` + `app.use()` 的安装顺序与 `[🍍]` 报错
- `defineStore` 两种写法（选项式 / setup 式）及其完整对照
- `store.xxx` 读写规则（不用 `.value`）、`$patch` 两种形式、`$state`、`$reset` 的限制
- 解构丢响应式（第 3 次出现）及「不解构」的默认策略
- 跨 store 引用与循环依赖的规避

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| `storeToRefs`（解构的正确姿势） | **Pinia--02（157）** |
| action 的异步写法、loading 状态、错误处理 | Pinia--02（156） |
| store 持久化（`pinia-plugin-persistedstate`） | 课程未讲，用时单开 |
| `$subscribe` / `$onAction`（监听 store 变化） | 课程未讲，用时单开 |
| `mapState` / `mapActions` 的 Pinia 版本 | **没有** —— 那是 vuex 的 API，别去找 |
| SSR 下的状态隔离 | 超出范围 |
| 项目第 9/10 步（状态收口） | 项目侧 |

⚠️ **术语撞车登记**（本轮新增两条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `store` | vuex 的**单一容器**（整个应用一个） | Pinia 的**一个模块**（可以有几十个） | Pinia 的 store 是复数概念，`stores/` 目录 |
| `state` | 组件的 `data` | store 里的第一段 | 组件里叫「状态」，store 里也叫 state，但**前者要 `ref()` 包，后者不用** |
| `getters` | vuex 的配置项 | Pinia 的配置项 / `computed` | 语义一样，**Pinia 的 setup 式直接用 `computed`** |
| `action` | vuex 里**提交 mutation 的人** | Pinia 里**直接改 state 的人** | 角色变了，别带着 vuex 的印象读 |

## 7. 下一轮预告

**Pinia--02 = 156-158：action 异步写法 · `storeToRefs` · 综合案例。**

三集都在补「用了才会遇到的坑」：

- **156**：`action` 里发请求的完整套路 —— `loading` 状态、错误处理、`try/finally`。**你 Vue--14 学过的「防重四道 + finally」在这里会原样复现**，只不过包在 store 里。
- **157**：`storeToRefs` 终于来了。**本轮 3.3 那个坑的正解**：它只拆 `state` 和 `getters`（拆成 ref），**不拆 `actions`**（函数不需要响应式）。为什么这么设计，到时候对着 3.3 那张表看就明白了。
- **158**：把上面的东西拼成一个完整案例。

⚠️ **建议新开对话**：这一轮是「建立新工具」，下一轮是「把工具用顺」，两件事。

**项目侧提醒**：本篇对应**第 10 步**（全局状态收口），你现在还在第 2 步之前。**笔记继续存着。**

**但我上一篇给的建议这里要修正一下**：项目第 9 步（`provide/inject`）和第 10 步（Pinia）本来就是同一个需求的两版方案，课程特意这么排是为了让你体会「为什么最后都上 Pinia」。**你项目小、又是自己一个人写，直接跳第 9 步、只做第 10 步完全可以** —— 只要做完之后回头把 Vue3--05 的 1.6 那张表再读一遍，那个「为什么」你照样能拿到。
