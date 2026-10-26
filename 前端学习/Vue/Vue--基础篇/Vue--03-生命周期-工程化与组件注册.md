# Vue--03 · 生命周期 · 工程化 · 组件注册（036-046 集）

> **对应课程**：036-038 + 040-046（第 3 天后半 + 第 4 天，约 3.2 小时）
> **跳过**：039 集（小黑记账清单-饼图渲染，21 分钟）—— ECharts 的用法跟 Vue 无关，用到再查
> **读法**：每个语法点按「是什么 → 怎么写 → 为什么 → C# 对照 → 常见错法」拆开，代码只留最短片段。
> **本轮定位**：**这是从"写 demo"到"做项目"的台阶。** 前三轮你写的都是单个 HTML 文件，这一轮结束后，你的代码会变成目录结构。
> **前置**：Vue--02（指令全家、计算属性、watch）已过。

---

==一：概念==

## 1. 生命周期：一个实例从生到死（036-037 集）

### 1.1 是什么

**Vue 实例从创建到销毁，会经历几个固定阶段。每个阶段的交界处，Vue 留了一个"钩子函数"给你插代码。**

你可以理解为：**框架在自己的运行流程里，给你开了 8 个"回调挂载点"**。

```
new Vue()
   │
   ├─ beforeCreate    ← 实例刚出生，data/methods 还没装
   ├─ created         ← data/methods 装好了，DOM 还没生成
   ├─ beforeMount     ← 模板编译完了，还没塞进页面
   ├─ mounted         ← DOM 已经在页面上了 ★最常用
   │
   ├─ beforeUpdate    ← 数据变了，DOM 还没重新渲染
   ├─ updated         ← DOM 重新渲染完了
   │
   ├─ beforeDestroy   ← 实例即将销毁 ★清理定时器/事件的位置
   └─ destroyed       ← 销毁完成
```

### 1.2 八个钩子的分工

| 钩子 | 此刻能拿到什么 | 典型用途 |
|---|---|---|
| `beforeCreate` | 什么都没有（`this.$data` 还是 `undefined`） | 几乎不用 |
| `created` | `data` / `methods` / `computed` 都有了；**DOM 没有** | **发请求拿初始数据**、初始化非 DOM 状态 |
| `beforeMount` | 模板已编译，还没挂载 | 极少用 |
| `mounted` | **DOM 已经有了**（`this.$el` 可用） | **操作 DOM**、初始化图表、让输入框聚焦 |
| `beforeUpdate` | 新数据已就位，DOM 还是旧的 | 需要在更新前记录旧 DOM 状态时 |
| `updated` | DOM 已同步成新数据 | 数据变化后要重新测量 DOM（如重置滚动位置） |
| `beforeDestroy` | 实例还活着 | **清定时器、解绑全局事件、取消请求** |
| `destroyed` | 实例已废 | 极少用 |

### 1.3 🔴 `created` 和 `mounted` 的分界

**分界线只有一条：DOM 有没有生成。**

```js
created()  { console.log(this.$el) },  // undefined
mounted()  { console.log(this.$el) },  // <div id="app">...</div>
```

那为什么"发请求"两个都能放？

| | `created` 发请求 | `mounted` 发请求 |
|---|---|---|
| 时机 | 更早（不用等 DOM） | 稍晚 |
| 适合 | **大部分情况**（数据不需要依赖 DOM） | 需要先测 DOM 尺寸再请求时 |
| 服务端渲染 | ✅ 能跑 | ❌ 不跑 |

> 课程和多数项目用 `created`。原因是：**数据回来了要渲染，早一点拿到就早一点渲染**，
> 而且在 SSR 场景下 `mounted` 根本不会执行。

### 1.4 一个必须澄清的误解

**「`created` 里拿不到 DOM」不等于「`created` 里写的东西不会显示」。**

`created` 里改 `data`，页面照样会渲染出来。因为渲染发生在 `created` **之后**。
拿不到 DOM 只是说：你不能通过 `this.$el` 去操作元素，但改数据完全没问题。

### 1.5 `beforeDestroy` 为什么重要

```js
mounted() {
  this.timer = setInterval(() => { ... }, 1000)
},
beforeDestroy() {
  clearInterval(this.timer)         // ← 不写这句，定时器会一直跑
}
```

不清理的后果：组件已经销毁了，但定时器还在执行，回调里访问已经失效的数据 —— **内存泄漏 + 潜在报错**。

**这个项目里就有现成例子**：`TS/ui.ts` 里有 `hideTimer`，它配套写了 `cancelAutoHide()`。那就是同一件事的手工版。

---

## 2. 为什么需要工程化（040-041 集）

### 2.1 单 HTML 文件的天花板

前三轮你写的都是这种结构：

```html
<script src="vue.js"></script>
<script>
  new Vue({ el: '#app', data: {...} })
</script>
```

能做 demo，但一旦要满足下面任何一条，就会崩：

| 需求 | 单文件怎么写 | 问题 |
|---|---|---|
| 1000 行 JS | 全塞一个 `<script>` | 没有模块化，全靠全局变量 |
| 多人协作 | 各改各的 | 一个文件冲突不断 |
| 用 npm 包 | 手动下 js 再引入 | 依赖关系要自己理 |
| 写 `.vue` 文件 | 浏览器不认识这个格式 | 必须编译 |
| 代码压缩 / 打包 | 手动来 | 不现实 |

**工程化解决的就是这条线：让"浏览器不认识的东西"（`.vue`、TS、SCSS）在开发时能用、在上线前能变成浏览器认识的。**

### 2.2 脚手架做了什么

课程用 `vue create xxx`（VueCli）。它一次性给你：

```
项目/
├── node_modules/        依赖包（npm 装的）
├── public/
│   └── index.html       唯一的 HTML 骨架，只有一个空的 <div id="app">
├── src/
│   ├── main.js          入口：创建实例、挂载
│   ├── App.vue          根组件
│   ├── components/      子组件
│   └── assets/          图片、样式
├── package.json         项目清单 + 命令
└── babel.config.js      编译配置（把新语法转成老浏览器能跑的）
```

### 2.3 运行流程（041 集，这一段必须搞懂）

一个 `.vue` 文件是怎么变成页面上的东西的：

```
① 浏览器请求 index.html
        ↓
② index.html 里有 <div id="app"></div> 和一个 <script src="/src/main.js">
        ↓
③ main.js 执行：创建 Vue 实例，并告诉它"根组件是 App.vue"
        ↓
④ Vue 把 App.vue 编译成渲染函数，渲染进 #app
        ↓
⑤ App.vue 里写的子组件，再依次被渲染
```

**关键理解：`index.html` 里是空的。你看到的所有内容都是 JS 执行后塞进去的。**

> 这解释了一个常见困惑：为什么"查看网页源代码"看不到页面的内容 ——
> 因为那是**服务器返回的原始 HTML**，DOM 是被 JS 生成出来的。

### 2.4 你的项目和课程的差异（重要）

| | 课程（Vue2 + VueCli） | 你的项目（Vue3 + Vite） |
|---|---|---|
| 创建命令 | `vue create xxx` | 已有项目，直接加插件 |
| 入口文件 | `src/main.js` | `Vue/main.ts` |
| 挂载写法 | `new Vue({ render: h => h(App) }).$mount('#app')` | `createApp(App).mount('#app')` |
| 根组件 | `App.vue` | `Vue/App.vue` |
| 启动命令 | `npm run serve` | `npm run dev` |
| HTML 入口 | `public/index.html` | 项目根的 `pet-vue.html` |

**课程里那套 `new Vue({render: h => h(App)})` 你不用学**，直接对照着看懂就行。

---

## 3. 组件是什么（042 集）

### 3.1 定义

**组件 = 一个可复用的、自带模板和逻辑的 UI 单元。**

```js
// 一个组件就是一个"配置对象"，跟 new Vue({...}) 里那个几乎一样
const MyButton = {
  template: `<button @click="count++">{{ count }}</button>`,
  data() { return { count: 0 } }
}
```

**注意：组件和实例用的是同一套配置项。** `data` / `methods` / `computed` / 生命周期全都能用。

区别只在：
- 实例用 `new Vue()` 创建
- 组件用**注册**的方式，被别的模板以标签形式使用

### 3.2 根组件

每个工程化项目都有一个 `App.vue`，它是**整棵组件树的根** —— 它不被任何组件包含，直接挂在 `#app` 上。

```
App.vue                    ← 根组件
├── Header.vue
├── ChatPanel.vue
│   ├── MessageItem.vue
│   └── InputBar.vue
└── SettingsPanel.vue
```

### 3.3 🔴 组件的 `data` 必须是函数

这是组件和实例最大的语法差异：

```js
// 根实例：可以是对象
new Vue({ data: { count: 0 } })

// 组件：必须是函数
const MyComp = { data() { return { count: 0 } } }
```

**为什么**：如果写成对象，所有组件实例会**共享同一个 data 对象** —— 点 A 按钮，B 按钮的数字也跟着变。

```js
// ❌ 写成对象
data: { count: 0 }        // 所有实例共用这一个对象

// ✅ 写成函数
data() { return { count: 0 } }   // 每次创建实例都调用一次，返回全新对象
```

> C# 对照：这相当于**字段初始化器 vs 静态字段**。
> `public int Count = 0;`（每个实例一份）vs `public static int Count = 0;`（全类共享）。
> 写成对象就是"不小心用了 static"。

> 📌 **Vue3 组合式没有这个问题** —— `setup` 本身就是函数，每次实例化都重新执行。
> 所以这条坑你只会遇到"读老代码"和"面试"两种场合。

---

## 4. 组件注册（043-044 集）

### 4.1 局部注册

**在谁的 `components` 里注册，谁就能用。** 子组件也只能在这个父组件的模板里用。

```js
import MyButton from './components/MyButton.vue'

export default {
  components: { MyButton },       // 注册
  template: `<MyButton />`        // 使用
}
```

### 4.2 全局注册

**注册一次，所有组件都能用。**

```js
// main.js
Vue.component('MyButton', MyButton)
```

### 4.3 怎么选

| | 局部注册 | 全局注册 |
|---|---|---|
| 能在哪用 | 只有注册它的那个组件 | 整个应用 |
| 依赖关系 | 显式（看 import 就知道） | 隐性（不知道谁在用） |
| 打包 | 用到才打进去 | 全部打进去 |
| 适合 | **绝大多数业务组件** | 极少数基础组件（按钮、图标） |

> **实际项目 95% 用局部注册。** 全局注册只用于"几乎每个页面都用"的基础组件，
> 否则包体积会无谓增大，而且删组件时你不知道哪里还在用。

### 4.4 组件命名的两种写法（容易混）

| 写法 | 例子 | 用在哪 |
|---|---|---|
| PascalCase（大驼峰） | `<MyButton />` | **模板里推荐**，和 import 的名字一致 |
| kebab-case（短横线） | `<my-button />` | DOM 模板（直接写在 HTML 里）必须用这个 |

**原因**：HTML 标签名不区分大小写，`<MyButton>` 在浏览器里会被解析成 `<mybutton>`。
Vue 在模板字符串里能区分，在真实 HTML 里不能。

---

## 5. 怎么拆组件（045-046 集）

课程用小兔鲜首页演示拆分。方法是固定的三步：

| 步骤 | 判断依据 |
|---|---|
| 1. 找出**重复出现的结构** | 出现 2 次以上 → 抽组件 |
| 2. 找出**独立的功能块** | 自己的数据、自己的交互 → 抽组件 |
| 3. 剩下的当"容器" | 只负责排列组合，不写业务逻辑 |

**拆完后的检验标准**：看父组件的模板，如果还能一眼看出"这个页面有哪几块"，说明拆对了；如果只剩一堆 `<div>`，说明拆过头了。

> ⚠️ 常见误区：**一开始就按"能复用"去拆**。
> 实际项目里大部分组件是不可复用的（只在一个地方用），拆它们的理由不是"复用"，是**"这段逻辑太长了，我要给它一个名字"**。

---

==二：格式==

## 1. 生命周期速查

| 阶段 | Vue2 选项式 | Vue3 组合式 | 能拿 DOM 吗 |
|---|---|---|:--:|
| 创建前 | `beforeCreate` | （`setup` 本身） | ❌ |
| 创建后 | `created` | （`setup` 本身） | ❌ |
| 挂载前 | `beforeMount` | `onBeforeMount` | ❌ |
| **挂载后** | **`mounted`** | **`onMounted`** | ✅ |
| 更新前 | `beforeUpdate` | `onBeforeUpdate` | ✅（旧） |
| 更新后 | `updated` | `onUpdated` | ✅（新） |
| 销毁前 | `beforeDestroy` | `onBeforeUnmount` | ✅ |
| 销毁后 | `destroyed` | `onUnmounted` | ❌ |

> ⚠️ Vue3 改了两个名字：`beforeDestroy` → `onBeforeUnmount`，`destroyed` → `onUnmounted`。
> 课程是 Vue2，你项目里要用右边的。

## 2. 组件注册对照

| 项 | 局部注册 | 全局注册 |
|---|---|---|
| 写法 | `components: { X }` | `Vue.component('X', X)` |
| 作用域 | 当前组件 | 全局 |
| 项目里推荐 | ✅ | ⚠️ 仅基础组件 |
| Vue3 写法 | 会自动导入（`<script setup>`） | `app.component('X', X)` |

> 📌 **Vue3 的 `<script setup>` 里不用写 `components`** —— 只要 `import` 了，模板里就能用。
> 这是组合式 API 减少样板代码的一个体现。

## 3. Vue ↔ C# 对照

| Vue | C# / .NET | 档位 | 说明 |
|---|---|---|---|
| 组件 | 类 | ⭐⭐⭐ | 封装 + 复用 + 有自己的状态 |
| `data() { return {} }` | 实例字段初始化器 | ⭐⭐⭐ | 每次实例化都执行一次 |
| 组件 `data` 写成对象 | 误用 `static` 字段 | ⭐⭐⭐ | 所有实例共享 |
| 局部注册 | 显式 `using` | ⭐⭐⭐ | 依赖写在明面上 |
| 全局注册 | 全局静态类 | ⭐⭐ | 到处能用，但依赖关系隐形 |
| 生命周期钩子 | 事件回调 / 构造-析构 | ⭐⭐ | 框架在你的流程里留挂载点 |
| `beforeDestroy` 清定时器 | `IDisposable.Dispose()` | ⭐⭐⭐ | 都是"释放资源"，不写就泄漏 |
| `index.html` + `main.js` | `Program.cs` 的启动装配 | ⭐⭐ | 都是"入口 → 组装 → 跑起来" |

---

==三：代码==

## 1. 生命周期顺序实证

```js
new Vue({
  el: '#app',
  data: { msg: 'hi' },
  beforeCreate() { console.log('1 beforeCreate', this.$data) },  // undefined
  created()      { console.log('2 created', this.msg) },         // hi
  beforeMount()  { console.log('3 beforeMount', this.$el) },     // 有元素，但内部是 {{ msg }} 原文
  mounted()      { console.log('4 mounted', this.$el.innerHTML) } // hi
})
```

打开控制台，四行按顺序打出。**第 3 行能看出"模板还没被替换"** —— 这比记概念有用。

## 2. 最小的一个组件

```js
// components/MyButton.vue（Vue2 写法，看得懂即可）
export default {
  name: 'MyButton',
  props: ['label'],                    // 外面传进来的（下轮细讲）
  data() { return { count: 0 } },      // 必须是函数
  template: `<button @click="count++">{{ label }} {{ count }}</button>`
}
```

```js
// 父组件里用
import MyButton from './components/MyButton.vue'
export default {
  components: { MyButton },
  template: `<MyButton label="点我" />`
}
```

> 注意这里出现了 `props` —— 它是组件通信的入口，**048 集才正式讲**。
> 现在只需要知道"组件可以接收外部传进来的值"。

## 3. 你项目里的对应写法

```ts
// Vue/main.ts —— 你的项目已经是工程化结构了
import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')
```

**对照课程的 `main.js`**：`new Vue({ render: h => h(App) }).$mount('#app')`。
两者做的是同一件事：**创建应用 → 指定根组件 → 挂到 `#app` 上**。

---

==四：总结==

## 1. 一句话记住三个

1. **`created` 有数据没 DOM，`mounted` 两个都有。要操作 DOM 就 `mounted`，要发请求两个都行。**
2. **工程化的本质：让浏览器不认识的东西（`.vue` / TS / SCSS）在开发时能用。**
3. **组件的 `data` 必须是函数 —— 写成对象就是"不小心用了 static"。**

## 2. ⭐⭐ 本轮要背的

| 要背 | 内容 |
|---|---|
| 四个核心钩子 | `created` / `mounted` / `updated` / `beforeDestroy` |
| Vue3 改名的两个 | `beforeDestroy` → `onBeforeUnmount`，`destroyed` → `onUnmounted` |
| 局部注册三步 | `import` → `components: { X }` → 模板里 `<X />` |
| 组件 data | 必须 `data() { return {} }`，不能是对象 |
| 命名规范 | 模板里 PascalCase，DOM 模板里 kebab-case |
| 清理资源 | 定时器、全局事件监听 → 全在 `beforeDestroy` 清 |
| 工程入口链 | `index.html` → `main.js` → `App.vue` → 子组件 |

## 3. ⭐ 收敛时刻

**这一轮把前三轮的"碎片"全部装进了一个结构里。**

| 之前学的 | 在新结构里的位置 |
|---|---|
| `data` / `computed` / `watch` | 组件的"逻辑部分" |
| `{{ }}` / `v-if` / `v-for` / `v-bind` | 组件的"模板部分" |
| `v-on` / `v-model` | 组件的"交互部分" |
| 响应式 | 组件内部"数据驱动"的机制 |
| **新增：生命周期** | 给上述逻辑加"时机" |

也就是说：**组件 = 之前所有知识 + 一个"什么时候执行"的维度。**

再往上想一层：**整个应用 = 一棵组件树**。后面学的 props / emit（父子通信）、provide/inject（跨层）、路由（页面级切换）、状态管理（跨组件共享）—— 全是在这棵树**之上**处理"数据怎么流动"。

> **Vue 的骨架到这里就完整了。** 剩下 150 集都是在这个骨架上加东西。

## 4. 静默失败清单（本轮）

| 现象 | 真实原因 |
|---|---|
| `created` 里 `this.$el` 是 `undefined` | DOM 还没生成，改数据可以，操作 DOM 不行 |
| `mounted` 里拿不到 `v-if="false"` 的元素 | 它压根没渲染，DOM 里不存在 |
| `mounted` 里拿到的 DOM 尺寸是 0 | 元素可能还在隐藏状态（`display:none`），量不到 |
| 组件 `data` 写成对象，多个实例互相影响 | 共享了同一份数据 |
| 组件注册了但模板里不显示，控制台警告 `Unknown custom element` | 名字大小写不符，或注册在别的组件里了 |
| 定时器没清，切走后还在跑 | `beforeDestroy` 少了 `clearInterval` |
| 组件拆完样式错乱 | `scoped` 样式作用域问题（下轮 048 集讲） |
| 改了数据但 `updated` 没触发 | 改的不是响应式数据（没在 `data` 里声明） |

## 5. C# 类比可用度

| 类比 | 档位 | 说明 |
|---|---|---|
| 组件 ↔ 类 | ⭐⭐⭐ | 封装、复用、有自己的状态 |
| 组件 `data()` ↔ 实例字段初始化器 | ⭐⭐⭐ | 每次实例化都跑 |
| `data` 写成对象 ↔ 误用 static | ⭐⭐⭐ | 共享状态 |
| `beforeDestroy` ↔ `Dispose()` | ⭐⭐⭐ | 资源释放 |
| 局部注册 ↔ 显式 `using` | ⭐⭐⭐ | 依赖可见 |
| 全局注册 ↔ 全局静态类 | ⭐⭐ | 方便但耦合 |
| 生命周期 ↔ 构造/析构 | ⭐⭐ | 有对应，但 Vue 的钩子更多更细 |
| `index.html → main.js` ↔ `Program.cs` | ⭐⭐ | 都是启动装配 |

## 6. 解锁边界

**✅ 本轮新解锁**

- 生命周期 8 个钩子 + Vue3 对应改名
- 工程化概念：脚手架、`src` 目录、入口链、`package.json`
- 组件定义、根组件、局部注册、全局注册、命名规范
- 组件 `data` 必须函数

**🔒 仍锁着**

| 类别 | 具体 | 何时解 |
|---|---|---|
| 组件通信 | `props` / `$emit` / `ref` / `$nextTick` | 048-060 集（第 4 天后半） |
| 样式作用域 | `scoped` | 048 集 |
| 插槽 / 自定义指令 | `<slot>` / `Vue.directive` | 060-067 集（第 5 天） |
| 路由 | vue-router | 072 集起（第 6 天） |
| 状态管理 | Vuex | 091 集起 |
| 组件库 | Vant / ElementPlus | 107 集 / 164 集 |
| **Vue3 组合式** | `setup` / `onMounted` / `defineProps` | 140 集起 |

> ⚠️ 你的项目 `Vue/App.vue` 里已经在用组合式，所以生命周期要按右边的 `onMounted` / `onUnmounted` 记。
> 课程的 8 个钩子是"认读"用（看懂老代码），你写新代码用 4 个：`onMounted` / `onUnmounted` / `onUpdated` / `onBeforeUpdate`。

## 7. 下一步（047-059 集 · 组件通信）

**这是 Vue 最重要的一轮，也是项目拆组件的门槛。**

| 集 | 内容 | 难度 |
|---|---|---|
| 047 | 第 4 天课程介绍 | ⏭ 可跳 |
| 048 | `scoped` 样式冲突 | 🟡 必看 |
| 049 | `data` 是一个函数 | ⚪ 本轮已讲，复习 |
| 050-051 | 组件通信总览 + **`props` 详解** | 🔴 **必须停** |
| 052-054 | 小黑记事本组件版 | 🟡 综合 |
| 055-056 | 事件总线 / `provide-inject`（拓展） | 🟡 概念即可，Vue3 已删前者 |
| 057 | **`v-model` 详解** | 🔴 必须停 |
| 058 | `.sync` 修饰符 | ⏭ Vue3 已删，只认读 |
| 059 | `ref` 和 `$refs` | 🟡 |

**并轮判据**（开始前先回答）：

1. 父组件传给子组件的 `props`，子组件能不能直接改？如果不能，想改要怎么办？
2. `provide/inject` 和你在 ASP.NET Core 里用的依赖注入，最大的区别是什么？

两题全对 → 048-059 可以压到 3 小时（跳过 055-056 的实现细节、058 整集）。
错一道 → 只讲错的那个点。
