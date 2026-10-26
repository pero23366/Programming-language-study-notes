# Vue3--01 · 为什么要 Vue3 · create-vue · 项目结构

> **对应课程**：140-142（黑马 `BV1HV4y1a7n4`，3 集 / 约 33 分钟）
> **读法**：这是「Vue3--组合式篇」第 1 篇。前面 001-087 全是**选项式**写法，从这一篇起换车道。
> **本轮定位**：**这一轮不写组合式语法。** 它只解决两件事 —— 换不换（140）、换了以后文件长什么样（141-142）。第一行 `<script setup>` 放到 Vue3--02。
> **特别说明**：你项目里 `pet-vue.html` + `main.ts` 已经在跑 Vue3 了，但那是「直接引 module」的写法。这一轮把**正规 Vue3 工程**长什么样补齐，顺便解释你现在这套为什么也能跑。

---

==一：概念==

## 1. 选项式的三个痛点（140）🔥

课程这一集在讲「为什么要 Vue3」。对你来说这个问题的答案有点不一样 —— **你已经在用了**，所以真正的问题是：**你现在写的 `<script setup>` 为什么长这个形状？** 答案藏在选项式的三个痛点里。

### 1.1 痛点一：一个功能被切成四段

假设桌宠项目有个「搜索历史消息」功能。选项式写法下，它要分散到 4 个地方：

```js
export default {
  data()      { return { keyword: '', history: [] } },        // ① 状态
  computed:   { matched() { /* 过滤 */ } },                   // ② 派生
  watch:      { keyword() { /* 存历史 */ } },                 // ③ 副作用
  methods:    { search() { /* 请求 */ } },                    // ④ 动作
}
```

四个地方**物理上隔了几十行**。改这个功能要在文件里上下来回跳，而且在 `methods.search` 里想看一眼 `matched` 是怎么算的，得滚回去。

更别提一个组件里塞三个功能：

```
搜索    → data.keyword + computed.matched + watch.keyword + methods.search
分页    → data.page + computed.pageList + watch.page + methods.load
上传    → data.file + methods.upload + mounted 里初始化
```

| 选项式按什么分组 | 组合式按什么分组 |
|---|---|
| **按「代码的类型」**（状态一堆、方法一堆、钩子一堆） | **按「功能」**（搜索的全部代码挨在一起） |

一句话：**选项式是按零件分抽屉，组合式是按机器分抽屉。** 你要修的是机器，不是抽屉。

### 1.2 痛点二：mixin 不能复用，只能「撒」

选项式时代，复用逻辑只有 `mixin` 一条路：

```js
// mixins/useMouse.js
export default {
  data()      { return { x: 0, y: 0 } },
  mounted()   { window.addEventListener('mousemove', this.onMove) },
  methods:    { onMove(e) { this.x = e.clientX; this.y = e.clientY } },
}
```

```js
export default { mixins: [useMouse], data() { return { x: 999 } } }   // ← 被覆盖了
```

mixin 三个问题，一个比一个隐蔽：

| 问题 | 具体表现 | 报错吗 |
|---|---|:--:|
| **来源不清** | 组件里能用 `this.x`，但搜遍文件找不到 `x` 在哪定义 | ❌ 完全不报 |
| **命名冲突** | 组件自己也写 `x`，**组件的赢**，mixin 里那份静默失效 | ❌ 不报 |
| **隐式契约** | mixin 内部用了 `this.someField`，要求使用者必须有这个字段 | ❌ 不报 |

**C# 对照（有偏差，但骨架一致）**：

`mixin` 最像**没签接口的 `partial class`** —— 你以为你声明了成员，其实另一处代码早就往同一个类里塞了同名字段。C# 里 `partial class` 至少有编译器帮你查重复定义；mixin 什么都不查。

想解决？C# 的答案是 **接口 + 依赖注入**：先声明「我需要什么」（接口），再让容器给你（注入）。Vue3 的答案是 **组合函数**（composable）：

```js
// composables/useMouse.ts —— 导出的是函数，不是对象
export function useMouse() {
  const x = ref(0), y = ref(0)
  return { x, y }                 // ← 谁用谁自己接，不往 this 上倒
}
```

```js
const { x, y } = useMouse()       // 用得明明白白，来源就在这一行
```

区别一句话：**mixin 是往 `this` 上倒，组合函数是往你手里递。** 倒进去的东西看不见，递到手里的东西必须自己接。

### 1.3 痛点三：`this` 到底是什么

这是最值得切开的一处，因为你写过 C#。

```csharp
// C#：this 是编译期就确定的一个东西
public class Pet { public string Name; public void Say() => Console.WriteLine(this.Name); }
```

`this` = 当前类的实例。编译器知道它有哪些成员，写错一个字母就报错。

```js
// Vue 选项式：this 是运行时拼装的
export default {
  data()    { return { name: '小宠' } },
  methods:  { say() { console.log(this.name) } },     // ← this 是谁？
}
```

`this` 是 Vue **在运行时把 `data` / `computed` / `methods` / `props` / `$router` ... 全部 `Object.assign` 到一个代理对象上**，然后把这个代理当 `this` 传进来。

后果三个：

| 现象 | 原因 |
|---|---|
| `this.name` 拼错了字母，不报错，只是 `undefined` | 这个"类"是运行时拼的，没有静态成员表 |
| 方法里解构一下 `const { say } = this` 就崩 | `say` 被拔离了代理，`this` 丢了 |
| `console.log(this)` 打出来一大堆不是你写的属性 | `$attrs` `$slots` `$refs` `$emit` 全是拼上去的 |

**`<script setup>` 里没有 `this`** —— 这不是"藏起来了"，是**真的没有**。所有东西都是普通变量，`this` 回到 JS 原本的含义（在模块顶层就是 `undefined`）。

**这是这一轮最该记住的一句**：选项式的 `this` 是 Vue 造出来的假象，组合式把这层假象拆了，让你用普通的 JS 变量作用域。你 C# 里对 `this` 的直觉，**在组合式里才是对的**。

### 1.4 Vue3 实际给了什么

课程列了四条，我按「你能感受到的」排个序：

| 收益 | 你什么时候会碰到 | 强度 |
|---|---|---|
| **组合式 API**（逻辑归拢 + 真复用） | 从 143 集开始每一天 | ⭐⭐⭐ |
| **更好的 TS 推导** | `defineProps<{ id: string }>()` 能补全 —— 选项式的 `this` 基本推不出来 | ⭐⭐⭐ |
| **响应式换 Proxy** | 新增属性、数组下标赋值，Vue2 检测不到，Vue3 都能 | ⭐⭐ |
| **体积更小**（tree-shaking） | 打包时没用到的 API 会被摇掉 | ⭐ |
| **性能更好** | 实际项目感知不强 | ⭐ |

⚠️ **第三行是 Vue--01 埋的坑的回收**：你当时写过「手写响应式」，用的是 `Object.defineProperty` 递归劫持 —— 那正是 Vue2 的做法，它的两个硬伤（对象新增属性、数组 `arr[0] = x` 不触发）在 Vue3 用 `Proxy` 之后消失了。**Proxy 拦的是整个对象，不是一个个属性名**，所以"新加的属性"天然被拦到。

---

## 2. 创建项目：`create-vue` 而不是 `vue create`（141）

### 2.1 两代脚手架

| | VueCli（课程 036 集讲的） | **create-vue（现在）** |
|---|---|---|
| 命令 | `vue create my-app` | `npm create vue@latest` |
| 构建工具 | **webpack** | **Vite** |
| 谁维护 | VueCli 团队（维护模式） | Vue 官方 |
| 配置文件 | `vue.config.js` | `vite.config.js` |
| 启动速度 | 冷启 5-15 秒（要打包） | 冷启 < 1 秒（**按需编译**） |
| 环境变量前缀 | `VUE_APP_XXX` | `VITE_XXX` |
| 现状 | 新项目不建议用 | **官方推荐** |

**判据**：2026 年新开 Vue3 项目，**只有 `create-vue` 一个选择**。看到「`vue create`」「`vue.config.js`」的教程，先确认它是不是 2021 年前的。

⚠️ **这条对你很重要**：课程后面 159-189 的「大事件项目」用的是 `pnpm create vue`，和你之前 Vue--03 学的 VueCli（`vue create`）**不是一套东西**。目录结构、配置文件名、启动命令全都不一样，别混。

### 2.2 Vite 快在哪（一句话）

webpack 是 **先把整个项目打包成 bundle 再启动 dev server**；Vite 是 **启动时什么都不编译，浏览器请求哪个文件就现编译哪个文件**。

```
webpack：  npm run dev → 打包 3000 个模块 → 起服务（等 10 秒）→ 打开页面
Vite：     npm run dev → 起服务（0.3 秒）→ 打开页面 → 浏览器要 Home.vue → 现编译那一个
```

代价：**生产构建 Vite 仍然要打包**（用 Rollup）。所以"快"只体现在开发时。这不是 bug，是取舍。

### 2.3 一条命令的完整形状

```bash
npm create vue@latest
```

它会交互式问你七八个问题（TypeScript？Router？Pinia？测试？ESLint？……）。**全选 No 也能跑** —— 课程 141 就是这么选的（纯 JS 项目）。

但**你的选择应该不一样**，因为：

| 选项 | 课程（教学内容） | 你（实做项目） | 理由 |
|---|:--:|:--:|---|
| TypeScript | No | **Yes** | 你 TS 01-80 已解锁，且项目是 `.ts` |
| Vue Router | No | 看需要 | 路由要单开一篇（已学过） |
| Pinia | No | 稍后 | 153 集讲了再加 |
| ESLint / Prettier | No | 可 No | 一个人写代码，别先给自己上枷锁 |

⚠️ **2026 年的版本坑**：`npm create vue@latest` 现在拉的是 Vite 7，要求 **Node ≥ 20.19**。你本机 Node v24.22.0，满足。但你项目里手装的是 `vue 3.5.44` + `vite 5.4.21` —— **两套版本能共存，但别在同一个 `node_modules` 里混**。

---

## 3. 项目结构：谁是入口（142）🔥

### 3.1 逐文件看

```
my-app/
├── index.html              ← ★ 真正的入口（这一点和老项目一样）
├── vite.config.ts          ← 构建配置
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts             ← ★ 应用启动脚本
    ├── App.vue             ← ★ 根组件
    ├── components/         ← 通用小组件
    ├── views/              ← 页面级组件（配了 Router 才有）
    └── assets/             ← 会被构建处理的资源（图片、CSS）
```

| 文件 | 干什么 | 易错点 |
|---|---|---|
| `index.html` | **Vite 的构建入口** | 就一行 `<script type="module" src="/src/main.ts">`。**必须留在根目录** |
| `main.ts` | 创建应用、挂全局插件、`mount` | 只有 3-5 行，别往里塞业务 |
| `App.vue` | 根组件，所有东西的祖先 | 它没有 `props`（没有父组件传给它） |
| `vite.config.ts` | 插件、别名、代理 | 课程里叫 `vue.config.js`，**不是同一个文件** |
| `public/` | 原样拷到产物根目录 | 这里的文件**不走** Vite 处理（不能 import） |
| `assets/` | 被 Vite 处理（会哈希、会压缩） | 用 `import` 或相对路径引用 |

### 3.2 ★ `index.html` 是入口 —— 这条你已经踩中过了

webpack 的入口是 `main.js`，`index.html` 只是被 `html-webpack-plugin` 塞进去的模板。

**Vite 反过来：`index.html` 是入口，`main.js` 是被它 `import` 进去的。**

```html
<!-- index.html -->
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

这就是为什么**你桌宠项目的 `pet-vue.html` 能直接跑**：它自己就是入口，自己写了 `<script type="module" src="...">`，压根不需要 main 之外的东西。你当时做的其实是 **Vite 的原生用法**，只是没有 main.ts 这层「统一挂载」。

**推论（很重要）**：一个 Vite 项目可以**有多个入口**。你项目现在就有 `index.html` + `pet-vue.html` 两个，各自引各自的 TS 入口 —— 这在 VueCli 里要写一堆配置，在 Vite 里天然支持。

### 3.3 `main.ts`：三行，但每一行都有话说

```ts
import { createApp } from 'vue'      // ① 按需引入，不再 import 整个 Vue
import App from './App.vue'
createApp(App).mount('#app')         // ② 创建 → 挂载
```

对比 Vue2：

```js
import Vue from 'vue'
new Vue({ render: h => h(App) }).$mount('#app')
```

**差别不只是写法，是设计。** 最能对标 C# 的一处：

| | Vue2 | Vue3 |
|---|---|---|
| 应用是什么 | **`Vue` 这个构造函数的一个实例** | `createApp()` 返回的 **app 对象** |
| 全局配置写在哪 | `Vue.prototype.$http = ...`<br>`Vue.use(插件)`<br>`Vue.component('X', X)` | `app.config.globalProperties.$http = ...`<br>`app.use(插件)`<br>`app.component('X', X)` |
| 副作用范围 | **全局**（一个页面里所有 Vue 实例共享） | **只这个 app** |
| 能同时有好几个 app 吗 | 可以，但全局配置互相污染 | ✅ 各自独立 |
| 测试 | 全局状态难清 | 每个测试 `createApp` 一个干净实例 |

**C# 对照（这次是精准的）**：Vue2 那种写法像**往静态类上挂东西**

```csharp
public static class Global { public static HttpClient Http; }   // ← 谁都能改，改了就影响全世界
```

Vue3 是**实例成员**

```csharp
var app = new WebApplication(...);      // ← 每个 app 一份配置，互不干扰
app.Services.AddSingleton<...>();
```

**这就是「为什么 `Vue.prototype.$http` 在 Vue3 里没了」的真正原因** —— 不是改名了，是**从静态挪到实例上**，`Vue.use()` 也相应变成 `app.use()`。

### 3.4 环境变量：`VITE_` 前缀

VueCli 时代用 `process.env.VUE_APP_API`。Vue3 + Vite 变成：

```bash
# .env
VITE_API_BASE=http://localhost:5003
```

```ts
import.meta.env.VITE_API_BASE     // ← 注意是 import.meta.env，不是 process.env
```

**两个坑**：

| 坑 | 现象 | 真因 |
|---|---|---|
| 变量名没加 `VITE_` | 拿到 `undefined` | 不带的**不会暴露给浏览器**（防泄漏密钥） |
| 用 `process.env.XXX` | 生产构建时 `process is not defined` | Vite 在浏览器里**不注入 `process`** |

**第二条是迁移时的经典炸点**：VueCli 项目搬到 Vite，`process.env` 全崩。因为浏览器里根本没有 Node 的 `process` 对象 —— 这是 Vite 拒绝给你造假的少数几处之一。

---

==二：格式==

## 1. 速查表

```bash
# ═══ 创建 ═══
npm create vue@latest          # Vue3 官方脚手架（Vite）
npx create-vite my-app --template vue   # 纯 Vite，不带 Vue 的官方选项表
npm run dev                    # 开发（Vite，秒启）
npm run build                  # 生产构建（Rollup，真打包）
```

```ts
// ═══ 三行启动脚本（main.ts）═══
import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')
```

```ts
// ═══ 挂全局（Vue3 写法）═══
app.use(router)                            // app.use，不是 Vue.use
app.component('BaseBtn', BaseBtn)          // app.component
app.config.globalProperties.$http = http   // 替代 Vue.prototype.$http
```

| 想做的事 | 文件 | 关键点 |
|---|---|---|
| 改端口 | `vite.config.ts` | `server: { port: 5174 }` |
| 配路径别名 `@` | `vite.config.ts` + `tsconfig.json` | **两边都要配**，否则 TS 报错但能跑 |
| 加环境变量 | `.env` | 前缀必须 `VITE_` |
| 读环境变量 | 任意 `.ts` | `import.meta.env.VITE_XXX` |
| 加第三方 CSS | `main.ts` | `import './assets/main.css'` |

---

==三：代码==

## 1. 最小可跑项目（手写，不靠脚手架）

三个文件，`npm create vite` 之后逐个替换就能验证「每一行是谁在起作用」。

**① `index.html`** —— 入口，只负责一件事：给个挂载点 + 拉脚本

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**② `src/main.ts`** —— 只做创建和挂载，不写业务

```ts
import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')
```

**③ `src/App.vue`** —— 本轮**故意还是选项式**，因为组合式语法下一轮才解锁

```html
<template>
  <h1>{{ title }}</h1>
</template>

<script lang="ts">
export default {
  data() { return { title: 'Vue3 工程跑起来了' } },
}
</script>
```

⚠️ 注意这里用的是 `<script lang="ts">` + `export default`，**不是** `<script setup lang="ts">`。这一轮要看清的是「工程结构」，语法换皮放下一轮。**能跑通，就说明 140-142 三集给的东西你已经吃下了。**

## 2. 桌宠项目的落地映射

你项目现在的结构 vs 正规 Vue3 工程：

| 现在（`My_First_DesktopPet/`） | 正规 Vue3 工程 | 差什么 |
|---|---|---|
| `index.html` + `pet-vue.html` | 单 `index.html` | 你**双入口**，是特性不是问题 |
| `TS/main.ts` 直接 `createApp().mount()` | `src/main.ts` | **完全一致** |
| `TS/*.ts`（9 个模块 1200 行） | `src/components/*.vue` | 你**没拆组件**（第 8 步才拆） |
| CSS 在 `CSS/` 目录，`<link>` 引 | `src/assets/*.css` 用 `import` | 你现在是**不经过构建**的静态引用 |
| 无 `vite.config.ts` 里的 vue 插件配置 | 必配 `@vitejs/plugin-vue` | 你**已经配了** |

**要不要重构成 create-vue 的结构？**

**不要。** 理由三条：

1. 你项目的核心资产是那 9 个模块的 TS，重构目录 = 全部相对路径失效，收益为零。
2. 你已经跑通了 Vite + `@vitejs/plugin-vue`，`create-vue` 只是帮你填了一堆默认值。
3. 真正的差别（`src/` 分层、`views/`、路由）等第 8 步「拆组件」和第 11 步「路由化」时**自然会用到**，到时候按需建目录就行。

**这一轮对项目的实际动作：零。** 它只是让你以后看到「`vue.config.js`」「`Vue.prototype`」「`process.env.VUE_APP`」时知道那是上一个时代的东西。

---

==四：总结==

## 1. 一句话记住三个

- **选项式按「零件类型」分抽屉，组合式按「功能」分抽屉。** 你要修的是功能。
- **`mixin` 往 `this` 上倒东西，组合函数往你手里递东西。** 倒进去的看不见，递过来的必须自己接。
- **Vue3 的 `createApp` 把全局配置从「静态」搬到「实例」上。** 所以 `Vue.use` → `app.use`，`Vue.prototype` → `app.config.globalProperties`。

## 2. ⭐⭐ 要背的

1. **`<script setup>` 里没有 `this`** —— 不是藏了，是真没有。选项式的 `this` 是 Vue 运行时拼的代理对象。
2. **`npm create vue@latest`** 是 Vue3 官方脚手架（Vite）；`vue create` 是 VueCli（webpack），**两代东西，别混**。
3. **`index.html` 是 Vite 的入口**，`main.ts` 是被它 `import` 进来的。所以多入口天然支持（你项目就是双入口）。
4. **`main.ts` 三行**：`createApp(App).mount('#app')`。全局配置挂 `app` 上，不挂 `Vue` 上。
5. **环境变量必须 `VITE_` 前缀**，读法 `import.meta.env.VITE_XXX`；`process.env` 在浏览器里**不存在**。
6. **`vite.config.ts` 和 `vue.config.js` 是两个时代的配置文件**，不通用。

## 3. ⭐ 收敛时刻

**收敛点一：你说的「`this` 不可靠」，Vue3 官方的答案是「那就别用」。**

你学 JS 时对 `this` 的警惕是对的 —— 它的绑定规则（谁调用指向谁、箭头函数继承、`bind` 硬绑）是 JS 里最容易出错的地方之一。选项式 Vue **把这个最不可靠的机制，当成组件里唯一的取数通道**：

```
data / computed / methods / props / $router  ──→  全部 Object.assign 到一个代理  ──→  当 this 传进每个函数
```

单看没问题，一旦遇到这三件事就塌：**方法被解构**、**回调里的 `this`**、**`watch` 里的普通函数**。

`<script setup>` 的解法不是「把 `this` 修好」，是**把这个通道整个删掉** —— 变量就在词法作用域里，闭包天然带上，不需要任何绑定。这和 C# 里「能用参数传就别用静态字段」是同一个思路：**少一个隐式通道，就少一类 bug。**

**收敛点二：Vue2 → Vue3 的 `Vue.prototype` 变化，和 EF Core 的 `DbContext` 是同一个教训。**

| | 静态 / 全局 | 实例 |
|---|---|---|
| Vue | `Vue.prototype.$http`（全局污染） | `app.config.globalProperties.$http`（每个 app 一份） |
| EF Core | `static DbContext`（连接共享、并发炸） | `AddDbContext` 注入的实例（作用域独立） |

两边犯的是**同一个错**：为了省事，把「本该属于一次会话的东西」挂到全局。症状也一样 —— 平时没事，一并发/一多实例就互相踩。

**收敛点三：Vite 的「入口是 HTML」推翻了你脑子里的构建模型，但恰好和你项目现状一致。**

webpack 世界：`main.js` 是根，HTML 是产物。Vite 世界：**HTML 是根，JS 是它的依赖**。这条翻转解释了三个你以后一定会遇到的现象：

- 为什么 `<script src>` 用绝对路径 `/src/main.ts` 而不是 `./`（它按 URL 解析，按服务器根算）
- 为什么多页面应用只要多写几个 HTML（你项目就是）
- 为什么 `public/` 里的东西不能 `import`（它们不进依赖图，只是原样复印）

## 4. 静默失败清单

| # | 写法 | 现象 | 真因 |
|:--:|---|---|---|
| 1 | mixin 和组件有同名字段 | 组件的赢，mixin 那份静默失效 | 合并策略：组件优先 |
| 2 | 选项式里 `const { say } = this` | `say()` 报 `this is undefined` | 方法被拔离代理，`this` 丢了 |
| 3 | `this.nmae`（拼错） | 不报错，就是 `undefined` | 运行时拼的对象，没有静态成员表 |
| 4 | `Vue.prototype.$http = ...`（Vue3 里写） | 全局都没挂上，用到时 undefined | Vue3 的 `Vue` 上没有 `prototype` 这条路了 |
| 5 | `Vue.use(router)`（Vue3 里写） | 报 `Vue.use is not a function` | 必须 `app.use` |
| 6 | `.env` 里写 `API_BASE`（无前缀） | 读到 `undefined` | 只有 `VITE_` 前缀才暴露给浏览器 |
| 7 | `process.env.VITE_XXX` | 生产环境 `process is not defined` | Vite 不注入 `process` |
| 8 | 把 `index.html` 挪进 `src/` | `404`，或构建后白屏 | 它是**入口**，必须在根目录 |
| 9 | `public/` 里的图片用 `import` | 报找不到模块 | `public` 不进依赖图 |
| 10 | 别名 `@` 只配了 `vite.config.ts` | 能跑，但编辑器全程红波浪线 | `tsconfig.json` 的 `paths` 也必须配 |
| 11 | 照 VueCli 教程改 `vue.config.js` | 改了完全没反应 | 这个文件在 Vite 项目里**不被读取** |

## 5. C# 类比可用度

| C# / .NET 侧 | Vue3 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| 实例化后配置（`new WebApplication` + `Services.Add...`） | `createApp(App)` + `app.use` | ⭐⭐⭐ | **同构**：配置跟着实例走 |
| `static` 字段（全局唯一、易污染） | `Vue.prototype.$xxx` | ⭐⭐⭐ | Vue3 主动废掉了这条路 |
| 接口 + DI 注入 | 组合函数 `useXxx()` 返回对象 | ⭐⭐⭐ | 都是「显式声明要什么」 |
| `partial class` 塞成员 | `mixin` | ⭐⭐ | 形似，但 mixin 无编译期检查 |
| `[FromServices]` / 构造函数注入 | `inject()` | ⭐⭐⭐ | 150 集讲，但**没有 DI 容器** |
| `Environment.GetEnvironmentVariable` | `import.meta.env.VITE_XXX` | ⭐⭐ | 前端只能拿到**白名单**前缀的，不是全部 |
| MSBuild 的 `Directory.Build.props` | `vite.config.ts` | ⭐⭐ | 都是构建配置，但一个声明式、一个 JS |

⚠️ **必切的一个撞名：`this` 这个词，两边不是一个东西。**

| | C# 的 `this` | Vue 选项式的 `this` |
|---|---|---|
| 谁创建 | 编译器 | **Vue 运行时** |
| 成员表 | 编译期固定，写错报错 | 运行时 `Object.assign` 拼，写错是 `undefined` |
| 是什么类型的实例 | 你自己的类 | 一个 `Proxy` 包着的普通对象 |
| 组合式里 | — | **不存在** |

你对 `this` 的 C# 直觉，在「选项式 Vue」里会一路骗你；在「组合式 Vue」里才重新成立。这也是我建议你把 `<script setup>` 当主线的技术理由，不只是"新"。

## 6. 解锁边界

**本轮新解锁**

- 选项式三大痛点（逻辑分散 / mixin 复用失败 / `this` 是运行时拼的）
- Vue3 相对 Vue2 的四项收益，及 `Proxy` 响应式对 Vue--01 手写版本的回收
- `create-vue` vs `vue create` 的世代差异，及 Vite「入口是 HTML」的模型
- 项目结构逐文件职责：`index.html` / `main.ts` / `App.vue` / `vite.config.ts` / `public` vs `assets`
- `createApp` 实例化设计，`Vue.use` → `app.use`、`Vue.prototype` → `app.config.globalProperties`
- 环境变量 `import.meta.env.VITE_XXX` 与两条坑

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| `<script setup>` 的语法形状 | **Vue3--02（143）** |
| `reactive` / `ref` / `toRefs` | Vue3--02（144） |
| `computed` / `watch` 的组合式版本 | Vue3--03（145-146） |
| 组合式生命周期（`onMounted` 等） | Vue3--03（147） |
| `defineProps` / `defineEmits` / `defineExpose` | Vue3--04（148-149） |
| `provide` / `inject` / `defineOptions` / `defineModel` | Vue3--05（150-152） |
| Pinia（含「为什么需要集中式状态」） | Pinia--01（153-155） |
| 组件拆分 + 组合函数落地 | 项目第 8 步 |
| 路由懒加载、`meta` 类型扩展 | 课程未讲 |

## 7. 下一轮预告

**Vue3--02 = 143-144：`setup` / `reactive` / `ref`。**

这一轮只解一个问题：**没有 `this` 了，状态放哪、怎么让模板看见？**

`reactive` 和 `ref` 是同一个问题的两个答案，而它们的分歧（**为什么官方推荐 `ref` 而不是 `reactive`**）会在 144 集里出现，是组合式里最需要一次想通的地方。届时会拿你 Vue--01 手写的 `reactive()` 和 Vue 内置的做正面对照 —— 那时候你才看得见「`Proxy` + 依赖收集」这套东西在你手里和在框架里差在哪。

⚠️ **提醒**：这一轮（Vue3--01）是「组合式篇」的开门，只讲工程结构。**下一轮开始就在写 `setup` 了，那是真语法**，建议**新开一个对话**再从 143 集往下走，免得这个对话里堆了两套上下文。
