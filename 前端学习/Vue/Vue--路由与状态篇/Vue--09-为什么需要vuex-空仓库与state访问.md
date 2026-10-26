# Vue--09 · 为什么需要集中式状态 · 空仓库 · state 的提供与访问

> **对应课程**：091-094（黑马 `BV1HV4y1a7n4`，4 集 / 约 55 分钟）
> **读法**：这一轮只有**一个**真概念（集中式状态），其余全是它的脚手架。091-092 讲"为什么"，093-094 讲"怎么做"。**前者比后者重要得多**——你后面学 Pinia 时，脚手架全换、理由一个字不变。
> **本轮定位**：**这是 Vuex 的地基，也是 Pinia 的地基。** 你在 Vue--04 学的组件通信只解决了"父 ↔ 子"；这一轮处理的是"**任何两个组件**"。091-092 先把你逼到墙角，093 给你一个空仓库，094 打通第一个门（`state`）。
> **前置**：Vue--04（props / $emit / EventBus / provide-inject 都见过）、Vue--08（项目能 `npm run serve`）。

---

==一：概念==

## 1. 先看没有 vuex 的世界（092）

### 1.1 那个具体的问题

假设三个组件都要显示**同一个数字**：

```
App.vue          ← 根，显示 count
├── Son1.vue     ← 也要显示 count，有个 +1 按钮
└── Son2.vue     ← 也要显示 count
```

要求：**Son1 点 +1，App 和 Son2 的数字同时变。**

这不是"父子通信"，是"**任意两点通信**"。你在 Vue--04 学过的四个工具，一个一个试。

### 1.2 旧方案一：props 往下传 + `$emit` 往上抛

**① 数据放 App，往下传**

```html
<Son1 :count="count" @add="count++" />
<Son2 :count="count" />
```

**② Son1 想改，只能通知爹**

```js
this.$emit('add')
```

**③ 效果**：能用。但看这条链路——

```
Son1 点按钮 → $emit('add') → App 收到 → count++ → props 重新下发 → Son1 / Son2 一起重渲染
```

| 代价 | 具体表现 |
|---|---|
| **链路长** | 组件一深，`props` 要穿过三层"中间商" |
| **中间商被迫接活** | 中间层自己不用 `count`，却必须声明 `props` + `$emit` 转发 |
| **加一个组件就改一次父** | 新来的 Son3 要读 `count`，得回去改 App 的模板 |
| **命名冲突** | 每层都要想 `count` 还是 `myCount` 还是 `c` |

> **这就是"prop drilling"（属性钻探）**，前端圈的黑话。它不是错，是**在组件树形状合适时最清晰的做法**。问题只出在"深度大 + 用的人多"。

### 1.3 旧方案二：EventBus（全局事件总线）

Vue--04 讲过：一个空的 Vue 实例当广播站。

```js
// main.js
Vue.prototype.$bus = new Vue()

// 发送方
this.$bus.$emit('add')
// 接收方
this.$bus.$on('add', this.handleAdd)
```

| 代价 | 具体表现 |
|---|---|
| **数据没有归属** | `count` 到底存在哪？没人在管，谁都能有一份副本 |
| **谁改的查不出来** | 事件是匿名的，`$emit('add')` 有 20 处，你不知道是哪一处触发的 |
| **必须手动解绑** | `beforeDestroy` 忘了 `$off` → 组件销毁了还在收事件（内存泄漏 + 幽灵回调） |
| **调试靠猜** | 没有记录，只能到处 `console.log` |

> 🔴 **EventBus 只传"消息"，不存"状态"。** 这句话是它的死穴：它解决"通知"，不解决"**这份数据现在是多少、是谁改成这样的**"。

### 1.4 旧方案三：provide / inject

```js
// 祖先
provide () { return { count: this.count } }
// 后代任意层
inject: ['count']
```

| 代价 | 具体表现 |
|---|---|
| **单向** | 祖先提供、后代读，改起来要么传函数、要么直接改引用 |
| **来源不可见** | 后代看到 `this.count`，不知道它是从哪一层注进来的（**这是它在 Vue3 里给 `Symbol` key 的原因**） |
| **响应式有坑** | 传原始值 → 不响应；传对象 → 响应，但"谁改的"依然无记录 |
| **不适合"多人写"** | 它设计目标是"**库/插件往下传配置**"，不是"业务数据多方共享" |

### 1.5 结论：缺的不是"能共享"，是"改的时候有账"

把三个方案和 vuex 摆一张表，缺口立刻清楚：

| 能力 | props 链 | EventBus | provide/inject | **vuex** |
|---|:--:|:--:|:--:|:--:|
| 跨任意层共享 | ❌ | ⚠️ 只传消息 | ✅ | ✅ |
| **数据只有一份** | ✅ | ❌ 各存副本 | ⚠️ 看你怎么写 | ✅ |
| **每次修改有记录** | ❌ | ❌ | ❌ | ✅ |
| **能回放到某一刻** | ❌ | ❌ | ❌ | ✅ |
| 改数据的地方集中 | ❌ 散在各处 | ❌ 散在各处 | ❌ | ✅ |

**最后两行是 vuex 唯一真正的新东西。** 前四行都只是"更方便"；"**每一次修改都留下一条带名字的记录，可以回放**"才是它非存在不可的理由。

> 💡 这个能力叫**时间旅行调试**（time travel）。你在浏览器 devtools 里能把状态倒退回第 3 次修改之前——EventBus 永远做不到，因为它根本不记录。

---

## 2. vuex 是什么（091）

### 2.1 一句话

**vuex 是 Vue 官方的"集中式状态管理"库：把多个组件共用的数据放到**一个仓库**里，并且规定"只能通过登记过的方法去改"。**

拆三个关键词：

| 词 | 意思 | 反例 |
|---|---|---|
| **集中式** | 所有共享数据在一个地方，不散落 | 每个组件 `data` 里各存一份 `count` |
| **状态**（state） | 会变、且变了界面要跟着变的数据 | 一个写死的常量不算状态 |
| **管理** | 不只是存，还要**规定怎么改** | 允许 `this.xxx = 1` 随便赋值就不叫管理 |

### 2.2 五个东西，一张图

vuex 只有五个概念，其中**四个是"仓库里的零件"，一个是"把仓库切成几块"**：

```
        ┌──────────────── Vuex Store（唯一实例） ────────────────┐
        │                                                       │
组件 ──dispatch──▶ actions ──commit──▶ mutations ──改──▶ state   │
        │           （可异步）      （只能同步）           │       │
        │                                                 │       │
        └───────────── getters（state 的派生值）◀─────────┘       │
        └───────────────────────────────────────────────────────┘
                                    │
                              modules：把上面四个按业务分块
```

| 零件 | 存什么 / 干什么 | 一句话记 |
|---|---|---|
| `state` | **数据本体** | 唯一真相源 |
| `mutations` | **唯一能改 state 的函数**，必须同步 | 记账本 |
| `actions` | 处理异步，**再 commit 给 mutation** | 跑腿的 |
| `getters` | 从 state 算出来的值（像 computed） | 派生数据 |
| `modules` | 把上面四个按业务拆成多块 | 分仓库 |

### 2.3 🔴 单向数据流：为什么绕这一圈

初学者最常问：**既然 `this.$store.state.count++` 就能改，为什么要写 mutations 绕一圈？**

```
组件不直接改 state → 只能 commit('add') → mutation 里改 → state 变 → 组件重渲染
```

因为这一圈换来了**四样东西**，而直接赋值一样都没有：

| 直接 `state.count++` | 走 `commit('add')` |
|---|---|
| devtools 里**看不到** | 记一条 `add`，带参数、带前后快照 |
| 出 bug 只能全局搜 `count++` | 搜 `commit('add')` 就知道谁在改 |
| 20 处 `count++` 分散 | 改逻辑只改 mutation 一处 |
| 无法阻止越权修改 | `strict` 模式下直接改**直接报错** |

> **这就是"绕一圈"的全部收益：把"改数据"这件事从散文变成了账本。**

### 2.4 什么时候**不该**用 vuex

官方原话大意：**如果你的应用够简单，加 vuex 可能是负担。**

| 场景 | 该用吗 |
|---|---|
| 只有父子传值 | ❌ props 就够 |
| 数据只有 1 个组件用 | ❌ 放自己 `data` |
| 一份数据 2 个以上**互不相邻**的组件读写 | ✅ |
| 需要"谁改了、改了什么"的记录 | ✅ |
| 跨页面保留（切路由不丢） | ✅ |

**代价必须提前知道**：多一层抽象、多一份样板代码、每个改动要改 2~3 个地方。**小项目上 vuex 是负债。**

### 2.5 版本对照（后面学 Pinia 时回来看这表）

| 生态 | 配 Vue | 仓库写法 | 现在 |
|---|---|---|---|
| **Vuex 3** | Vue 2 | `new Vuex.Store({...})` + `this.$store` | 本课程用 |
| Vuex 4 | Vue 3 | 同上，`createStore()` | 维护中 |
| **Pinia** | Vue 3 | `defineStore('id', {...})` | **官方推荐** |

**换的是 API，不是理由。** 你在这一轮学到的"为什么要有集中式状态"，Pinia 一个字都不改；只有 `mutations` 这一层被砍掉了（Pinia 允许直接改 state）。所以下面这段要记牢：

> **Vuex 用 mutations 强制记账；Pinia 取消了 mutations，改由 devtools 直接追踪 state 变更。** 手段不同，目的同一个——**改得可追溯**。

---

## 3. 建一个空仓库（093）

### 3.1 装什么

Vue CLI 勾了 Vuex 的话，`package.json` 里已经有 `"vuex": "^3.6.2"`。没勾就：

```bash
npm i vuex@3
```

> 🔴 **版本必须对上**：Vue2 配 **vuex@3**，Vue3 配 vuex@4。装错了报错五花八门（最常见 `Cannot read property '_modulesNamespaceMap' of undefined`），但根因就这一条。

### 3.2 仓库文件：四个空对象

`src/store/index.js`：

```js
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({})
```

**空仓库就是"什么都没配"**。`new Vuex.Store({})` 合法，里面会自动补出四个空容器。093 这 10 分钟做的事，就是**先把壳立起来，再一个一个填**。

> ⚠️ `src/store/index.js` 是**约定**不是规定——文件名、目录名都能改，但 `main.js` 的 import 路径要跟着改。课程用默认位置。

### 3.3 🔴 `Vue.use(Vuex)` 到底干了什么

这一行是全场最容易被跳过、又最该知道的一行。

```
Vue.use(Vuex)
   ↓ 调用 Vuex 的 install 方法
   ↓ 里面做了一次全局混入：
Vue.mixin({
  beforeCreate () {
    this.$store = this.$options.store || (this.$parent && this.$parent.$store)
  }
})
```

**结论：`this.$store` 不是 Vue 自带的属性，是 `Vue.use` 给你注入的。** 它通过"每个组件 `beforeCreate` 时从父组件抄一份"的方式，让**任意深度的组件**都能拿到同一个 store。

这解释了三个现象：

| 现象 | 原因 |
|---|---|
| 组件里 `this.$store` 能用，但你从没声明过 | 全局混入注入的 |
| 根实例必须传 `store` 选项 | 链头没有父组件可抄，必须自己给 |
| 忘了 `Vue.use(Vuex)` → `this.$store` 是 `undefined` | 混入没装上 |

### 3.4 挂到根实例

`src/main.js`：

```js
import store from './store'

new Vue({
  store,                        // ← 名字必须叫 store，Vuex 按这个 key 找
  render: h => h(App)
}).$mount('#app')
```

> 🔴 **`store` 这个 key 是硬编码的**：`new Vuex.Store()` 的 install 里读的就是 `options.store`。写成 `myStore` 会静默失败——不报错，只是所有组件 `$store` 都是 `undefined`。

### 3.5 空仓库长什么样

在任意组件 `mounted` 里打一行：

```js
mounted () { console.log(this.$store) }
```

你会看到一个 **Store 实例**，身上除了四个空容器，还有三个方法：

| 成员 | 类型 | 干什么 |
|---|---|---|
| `state` | 对象 | 数据 |
| `getters` | 对象 | 派生值 |
| `mutations` | 对象 | 改数据的函数表 |
| `actions` | 对象 | 异步流程表 |
| `commit(type, payload)` | 方法 | **触发 mutation** |
| `dispatch(type, payload)` | 方法 | **触发 action** |
| `subscribe(fn)` | 方法 | 订阅每次 mutation（devtools 就是靠它） |

**记住 `commit` 和 `dispatch` 这两个方法名**：前面那张图里"组件 → actions → mutations"的箭头，在代码里就是这两个函数。

> ⚠️ **一个项目只能有一个 Store 实例。** `export default new Vuex.Store({})` 是模块级单例——`import` 一百次拿到的都是同一个对象。如果你不小心在别的文件里又 `new Vuex.Store()`，那是**两个互不相通的仓库**，数据不同步且没有任何报错。

---

## 4. state：怎么提供，怎么访问（094）

### 4.1 提供数据

```js
state: {
  count: 0,
  user: { name: '张三' }
}
```

**和组件的 `data` 一个道理**，区别只有一条：

| | 组件 `data` | vuex `state` |
|---|---|---|
| 作用域 | 自己 + 子组件（通过 props） | **全项目任何组件** |
| 谁来改 | 自己（`this.xxx = 1`） | **只能 mutation** |
| 写法 | **函数**返回对象 | **普通对象** |

> 🟡 **为什么 `data` 是函数、`state` 是对象？** `data` 是函数是为了让**每个组件实例**拿到独立副本；`state` 全项目只有一个实例，不需要每次 new 一份，所以直接给对象。**这一条下面会变成真实的坑**（见 §4.5）。

### 4.2 三种访问方式

**① 模板里直接取**

```html
<p>{{ $store.state.count }}</p>
```

`$store` 在模板里**不用写 `this`**，Vue 模板会自动从实例上找。

**② 脚本里取**

```js
computed: {
  count () { return this.$store.state.count }
}
```

> ⚠️ **不要写进 `data`**：`data () { return { count: this.$store.state.count } }` 只在创建时取一次，**之后 vuex 变了它不会变**——这是最经典的静默失败（见 §4.5 第 3 条）。

**③ `mapState` 批量映射**（推荐）

```js
import { mapState } from 'vuex'

computed: {
  ...mapState(['count'])
}
```

`mapState` 返回的是一堆 `computed` 函数，`...` 把它们展开进 `computed`。上面这一行等价于手写 ②。

### 4.3 `mapState` 的三种写法

| 写法 | 代码 | 什么时候用 |
|---|---|---|
| 数组 | `...mapState(['count'])` | 名字和 state 里**完全一致** |
| 对象（字符串） | `...mapState({ num: 'count' })` | 想换个名字用 |
| 对象（函数） | `...mapState({ num: state => state.count })` | 要加工、或要用 `this` |

第三种还能用 `this`（**必须写普通函数，不能箭头函数**）：

```js
...mapState({
  myCount (state) { return state.count + this.step }
})
```

> 🔴 **为什么箭头函数用不了 `this`？** 箭头函数的 `this` 在**定义时**就固定为外层作用域（模块顶层 → `undefined`），而 `mapState` 需要它指向**组件实例**。这是 JS 的老规矩，不是 Vue 的怪癖。

### 4.4 和本地 computed 混用

```js
computed: {
  ...mapState(['count']),
  double () { return this.count * 2 }   // ← 这里能用 this.count
}
```

**注意顺序不影响**：展开在前还是后都行，反正最终都是 `computed` 的 key。但**本地写一个同名的 `count` 会把 `mapState` 的覆盖掉**（后面的 key 胜出），而且**没有警告**。

### 4.5 🔴 直接改 state 会发生什么

这是 094 最长的一段（28 分钟里大半在这），也是全轮最该亲手试的：

```js
methods: {
  add () { this.$store.state.count++ }    // 能改！页面也会变！
}
```

**页面真的会更新，一切看起来正常。** 然后你打开 devtools 的 Vuex 面板——

```
（空）
```

**没有任何记录。** 因为 devtools 只听 `commit`；绕过 mutations 的修改，它完全不知道。于是：

| 后果 | 具体表现 |
|---|---|
| 时间旅行失效 | 无法回退、无法回放 |
| "谁改的"查不到 | 只能全局搜 `state.count` |
| 别人接手时是黑箱 | 数据莫名其妙变，代码里找不到原因 |
| 未来加校验/日志无从下手 | 没有统一的入口 |

**这就是"能改"和"该改"的区别**——Vuex 从来没在技术上禁止你，它只是不给你记账。

### 4.6 strict 模式：让越权修改直接报错

```js
export default new Vuex.Store({
  strict: true,          // ← 加这一行
  state: { count: 0 }
})
```

再执行 `this.$store.state.count++`，控制台报：

```
Error: [vuex] do not mutate vuex store state outside mutation handlers.
```

| | 普通模式 | `strict: true` |
|---|---|---|
| 直接改 state | 静默成功 | **报错**（且数据仍被改了） |
| 性能 | 无额外开销 | 每次 mutation 后 **deep watch 整个 state** |
| 生产环境 | — | **官方建议关掉**（用 `process.env.NODE_ENV !== 'production'`） |

```js
strict: process.env.NODE_ENV !== 'production'
```

> ⚠️ **报错不等于拦住**：strict 模式下代码**仍然改了数据**，只是事后告诉你"你违规了"。它是个**告警器**，不是门锁。真正拦住你的只有 `mutations` 这个约定。

### 4.7 那 094 为什么不直接用 mutations

因为 095 才是 mutations（36 分钟，比这一整集还长）。094 的任务边界很清楚：

**先把"数据能读到"打通**，让你确认 `state` → 组件渲染这条线通了；"数据怎么改"留给 095。

所以 094 结束时你的项目应该是：**能显示 count，但还没有正经的 +1 按钮**。如果现在就想改，只能绕过 mutations 直接赋值——而这恰好给你演示了"为什么不能这么干"。

---

==二：格式==

## 1. 仓库骨架速查

```js
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)                 // ① 必须，否则 $store 是 undefined

export default new Vuex.Store({
  state: {},                  // 数据
  mutations: {},              // 唯一的改法
  actions: {},                // 异步
  getters: {},                // 派生
  modules: {},                // 分块（098 起）
  strict: process.env.NODE_ENV !== 'production'
})
```

`main.js` 三行：

```js
import store from './store'
// ...
new Vue({ store, render: h => h(App) }).$mount('#app')
```

## 2. 访问 state 的四种写法

| 写法 | 代码 | 响应式 | 推荐度 |
|---|---|:--:|:--:|
| 模板直取 | `{{ $store.state.count }}` | ✅ | ⭐ 临时看 |
| computed 手写 | `count () { return this.$store.state.count }` | ✅ | ⭐⭐ |
| `mapState` 数组 | `...mapState(['count'])` | ✅ | ⭐⭐⭐ |
| **写进 data** | `data () { return { count: this.$store.state.count } }` | ❌ | **❌ 禁用** |

## 3. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| `this.$store` 是 `undefined` | 忘 `Vue.use(Vuex)` 或根实例没传 `store` | 两处都补 |
| `Cannot read property '_modulesNamespaceMap' of undefined` | vuex 版本跟 Vue 版本不配 | Vue2 → `vuex@3` |
| `do not mutate vuex store state outside mutation handlers` | strict 模式下直接改 | 改用 `commit`（095） |
| state 变了界面不变 | 数据取进了 `data` | 改 `computed` / `mapState` |
| devtools 面板是空的 | 没走 `commit`，或没装 Vue Devtools | 095 才有 mutation 可看 |

---

==三：代码==

## 1. 实验 A：先体验一次 prop drilling

**`App.vue`**

```html
<template>
  <div>
    <p>App: {{ count }}</p>
    <Son1 :count="count" @add="count++" />
    <Son2 :count="count" />
  </div>
</template>
```

**`Son1.vue`**

```js
export default {
  name: 'SonOne',
  props: ['count'],
  template: '<button @click="$emit(\'add\')">{{ count }}</button>'
}
```

**观察**：能用，但**只要再加一个 Son3，或者把 Son2 挪到 Son1 里面，就得回去改三条链路**。这就是 092 那 8 分钟想让你烦的地方。

> 注：`name: 'SonOne'` 是为了躲 Vue--08 讲的 `vue/multi-word-component-names`。守规矩就得多起两个字。

## 2. 实验 B：立一个空仓库，看 `$store` 到底是什么

**① `src/store/index.js`** 用 §二.1 的骨架（先只留 `state: {}`）

**② `main.js`** 传 `store`

**③ 任意组件里打一行**

```js
mounted () { console.log(this.$store) }
```

**④ 期望**：控制台出现 `Store` 对象，展开能看到 `state` / `getters` / `mutations` / `actions` 四个空对象 + `commit` / `dispatch` 两个函数。

**⑤ 反证**：把 `Vue.use(Vuex)` 注释掉再刷新 → `undefined`，且组件里写 `$store.state` 会报 `Cannot read properties of undefined`。

## 3. 实验 C：state 提供数据 + 三种访问

**`store`**

```js
state: { count: 100 }
```

**组件三种写法各来一次**

```html
<p>{{ $store.state.count }}</p>
```

```js
computed: { count () { return this.$store.state.count } }
```

```js
computed: { ...mapState(['count']) }
```

三种都应显示 `100`。

## 4. 实验 D：直接改 vs strict

**① 普通模式**

```js
add () { this.$store.state.count++ }
```

点按钮 → 数字变，**devtools 的 Vuex 面板无记录**。

**② 打开 `strict: true` 重启**，再点 → 控制台红字，但数字**仍然变了**：

```
[vuex] do not mutate vuex store state outside mutation handlers.
```

**③ 记下这条报错原文**，095 学完 mutations 之后它就不会再出现了。

## 5. 实验 E：`mapState` 的三种写法 + 一个反例

```js
computed: {
  ...mapState(['count']),                       // 原样
  ...mapState({ num: 'count' }),                // 改名
  ...mapState({ big: state => state.count * 2 }),// 加工
  local () { return this.count + 1 }             // 混用（用得上上面的 count）
}
```

**反例**（务必试一次，记住这个静默失败）：

```js
data () { return { c: this.$store.state.count } },
methods: { add2 () { this.$store.state.count++ } }
```

`{{ c }}` **永远不动**，而 `{{ $store.state.count }}` 在变。

> **原因**：`data` 只在创建时求值一次，拿到的是当时那个**数字的副本**。数字是原始值，没有引用关系可追随。**这一条能解释你以后遇到的 80% 的"数据没更新"。**

---

==四：总结==

## 1. 一句话记住三个

- **vuex 解决的不是"共享"，是"改动有账本"**——时间旅行是它唯一不可替代的能力。
- **`this.$store` 是 `Vue.use(Vuex)` 用全局混入塞进去的**，不是 Vue 自带的。
- **`state` 是普通对象，`data` 是函数**——所以取 state 只能走 `computed`，绝不能塞 `data`。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 五个零件 | `state` / `mutations` / `actions` / `getters` / `modules` |
| 谁能改 state | **只有 mutations**，且必须同步 |
| 调用方法 | 组件 `commit` → mutation；组件 `dispatch` → action |
| 版本配对 | Vue2 → **vuex@3**；Vue3 → vuex@4 |
| 根实例 key | `new Vue({ store })`，**`store` 这个名字不能改** |
| `Vue.use(Vuex)` 的作用 | 全局混入 `beforeCreate`，注入 `this.$store` |
| 访问 state | 模板 `$store.state.x` / `computed` / `...mapState([...])` |
| **禁止** | 把 state 写进 `data` |
| strict 报错原文 | `do not mutate vuex store state outside mutation handlers` |
| 生产环境 | `strict` 要关，用 `process.env.NODE_ENV` 判断 |

## 3. ⭐ 收敛时刻

**这一轮把三个散点接上了：**

**① Vue--04 的 `provide/inject` → 现在知道它为什么不够**

Vue--04 里它是"跨层传值"的答案。这一轮你看清了它的边界：**它能传，但不管账**。Vue3 后来给它加 `Symbol` key、加默认值，解决的正是"来源不可见"这一条。

**② Vue--02 的 `computed` → 现在知道为什么非用它不可**

你在 Vue--02 学的 `computed` 是"依赖变了自动重算"。`mapState` 本质就是**批量生成 computed**——所以它和手写 computed 完全等价。**没有 computed，就没有 state 的响应式**（`data` 那条反例就是活证）。

**③ Vue--01 的"响应式" → 现在见到它跨越组件的形态**

Vue--01 讲的 `Object.defineProperty` 只管**一个组件自己的数据**。vuex 让同一份数据被**任意多个组件**依赖——但底层还是同一套依赖收集：**谁在渲染时读过 `state.count`，`count` 一变就通知谁。**

**④ 顺带解释了 Vue--08 为什么不让你随便关 ESLint**

下一轮开始，vuex 的样板代码会翻倍。样板代码最怕"格式不一致"——差一个空格就整片红字。**工程规范和状态管理是配套的，不是两件事。**

## 4. 静默失败清单

vuex 的坑**几乎全不报错**，这是它比语法坑更危险地方：

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `new Vue({ myStore })` | 所有组件 `$store` 为 `undefined` | install 只认 `options.store` 这个 key |
| 2 | 忘 `Vue.use(Vuex)` | 同上，且可能连带其他怪错 | 混入没装 |
| 3 | `data () { return { c: this.$store.state.count } }` | 界面永不更新 | 原始值副本，无响应 |
| 4 | 在别的文件里又 `new Vuex.Store()` | 数据不同步，**零报错** | 变成两个仓库 |
| 5 | `this.$store.state.count++` | 界面更新，**devtools 无记录** | 绕过 mutations |
| 6 | `strict: true` 却以为自己改了 mutation | 红字报错但**数据已变** | 它是告警器不是门锁 |
| 7 | `mapState` 用箭头函数还想用 `this` | `this` 是 `undefined` | 箭头函数锁死外层 `this` |
| 8 | 本地 computed 与 `mapState` 同名 | 本地那个静默覆盖 | 后写的 key 胜出 |
| 9 | `npm i vuex`（默认装 4）配 Vue2 | 一堆 `undefined` 报错 | 版本不配 |

**第 3、5、8 条是重灾区**，共同特征：**页面看起来对，账本上没你**。

**工程上怎么防**：

- 一律 `...mapState([...])`，不手写、不塞 `data`，从源头断掉 3 和 8；
- 开发期开 `strict: true`，把第 5 条的静默变响；
- **养成看 Vue Devtools 的 Vuex 面板的习惯**——面板空着就说明你在越权改数据，这比任何 lint 都灵。

**这不是 bug，是代价**：JS 不能阻止你写 `obj.x = 1`。vuex 能做的只有"事后记账"和"开 strict 后事后骂你"。**真正的防线是"看到 state 就想到 commit"这个条件反射。**

## 5. C# 类比可用度

| C# / .NET 侧 | vuex 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `static` 静态字段（全局唯一） | 单例 Store | ⭐⭐⭐ | 同构：import 多少次都是同一份 |
| DI 的 `Singleton` 注册 | `export default new Vuex.Store()` | ⭐⭐⭐ | 都是"整个应用一个实例" |
| **`private set` + 显式方法** | `state` + `mutations` | ⭐⭐⭐ | **最有用的类比**：字段私有、只能走方法改 |
| 数据库**事务日志** / 事件溯源 | mutation 记录 + 时间旅行 | ⭐⭐⭐ | 都是"先记账再落到状态" |
| `INotifyPropertyChanged` | state 变更 → 组件重渲染 | ⭐⭐ | 机制像，vuex 是自动的 |
| 仓储层（Repository） | 整个 Store | ⭐⭐ | 形似，但仓储管持久化，vuex 不管 |
| 异步服务方法 | `actions` | ⭐⭐ | 都处理"等待"，但 actions 必须再 commit |
| `record` 不可变对象 | — | ❌ | vuex **要求可变**，理念相反 |

**用法建议**：把 store 想成一个 **`static` 单例类**，字段全是 `private set`，只暴露一堆 `Add()` / `Set()` 方法。

```csharp
public static class CounterStore {
    public static int Count { get; private set; }        // ← state
    public static void Add() { Count++; }                 // ← mutation
}
```

**你现在应该能感到这个类差了什么**：它没有**日志**。`Add()` 被调了 20 次，你查不出第 7 次是谁调的。vuex 的 `commit` 补的就是这一层——**所以它不是"全局变量"，是"带审计的全局变量"**。

## 6. 解锁边界

**本轮新解锁**

- 集中式状态的存在理由（与 props 链 / EventBus / provide-inject 的四列对比）
- vuex 五零件定位 + 单向数据流 `commit` / `dispatch` 两个入口
- vuex3 / vuex4 / Pinia 的版本对照（**换 API 不换理由**）
- `new Vuex.Store({})` 空仓库骨架、`Vue.use(Vuex)` 的 install 与全局混入
- `this.$store` 的真实来源；`store` 这个 key 硬编码
- `state` 提供数据；三种访问方式；`mapState` 三种写法 + 与本地 computed 混用
- 直接改 state 的后果；`strict` 模式报错原文与其"告警不拦"的本质

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| `mutations` 定义 / 调用 / payload | **Vue--10（095，36 分钟）** |
| `mapMutations` | Vue--10（096） |
| `actions`（异步）/ `getters`（派生） | Vue--10（097） |
| 分模块 `modules` / 命名空间 | Vue--10（098-099） |
| 购物车实战里的映射渲染 | Vue--11（100-105） |
| `subscribe` / 插件机制 / 持久化（手写） | 课程未讲 |
| Pinia 的 `defineStore` | Pinia--01（153-155） |
| Vue Devtools 的完整用法 | 课程未系统讲，自己点 |

⚠️ **术语撞车登记**（本轮新增两条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `store` | 数据仓库（vuex） | `localStorage` 等存储 API | 有 `$` 前缀的是 vuex |
| `state` | vuex 里的共享数据 | 组件的**内部**状态（React 常这么叫） | 看**作用域**，不看词 |

## 7. 下一轮预告

**Vue--10（095-099，5 集 / 2 小时 15 分）：mutations / mapMutations / actions / getters / 分模块**

下一轮是 vuex 全部核心，也是整章最长的一轮（比这一轮多一倍半）。节奏会变：

- 095（36 分钟，**全场最长**）：mutations 到底是什么、payload 怎么传、为什么必须同步；
- 096（7 分钟）：`mapMutations` —— 一句话的事，跟 `mapState` 一个模子；
- 097（29 分钟）：`actions` + `getters`，两个概念塞一集；
- 098-099（61 分钟）：`modules` + 命名空间，**这一块最容易把人绕晕**。

开跑之前请确认三件事：

1. `npm run serve` 能起，控制台没有 ESLint 红字（不然 095 你会被样板代码淹掉）；
2. `this.$store` 打印出来不是 `undefined`；
3. `state` 里的数据**在页面上显示出来了**（哪怕是硬编码的 `100`）。

**下一轮建议开新对话**——2 小时 15 分的内容塞进一个上下文，容易中途断片。
