# Vue--06 · 路由基础 · SPA 与路由表

> **对应课程**：072-078（黑马 `BV1HV4y1a7n4`，7 集 / 约 1 小时 35 分）
> **读法**：课程全程用 **VueRouter3（配 Vue2）**，本文全部改写为 **VueRouter4（配 Vue3）**。概念一模一样，写法差一层封装 —— 差异集中收在 §5 那张对照表，正文一律按 Vue3 写。
> **本轮定位**：从「一个页面里 `v-show` 切两块」升级到「**地址栏决定渲染谁**」。这是本项目第一次出现「多个页面」，也是组件树从此分裂成多棵的起点 —— 后面 Pinia 的坑，就是在这条裂缝里长出来的。

---

==一：概念==

## 1. 为什么需要路由（072）🔥

### 1.1 你已经写了一个「手工版路由」

项目第 1 步的成果，长这样：

```ts
const screen = ref<'home' | 'pet'>('home')   // ← 全页面唯一的"当前位置"
```

```html
<main    v-show="screen === 'home'">  ...  <!-- 首屏 -->
<section v-show="screen === 'pet'">   ...  <!-- 桌宠舞台 -->
```

一个变量决定谁显示。**这已经是最原始的路由了** —— 「当前位置」被存进了一个变量里。

它只差一件事：**这个变量没有写进 URL**。

### 1.2 不写进 URL 的三堵墙

| 现象 | 根因 | 能不能靠改 `screen` 解决 |
|---|---|---|
| 刷新页面 → 弹回首屏，聊天记录全丢 | 地址栏只有 `pet-vue.html`，浏览器不知道你在哪一屏；变量随页面一起销毁 | ❌ 变量本来就活不过刷新 |
| 想把「设置面板」的地址发给别人 | 没有可分享的地址 | ❌ 无地址可发 |
| 按后退键直接滚出网站 | 两次「切换」没有进浏览器历史，浏览器只记了一条 | ❌ 改变量不写历史 |

**三堵墙的共同点**：不是「状态没存住」，而是「**状态没有对外的名字**」。

所以路由干的事不是「帮你切页面」，而是：

> **给每一个界面一个地址，然后让浏览器的原生能力（刷新 / 前进 / 后退 / 收藏 / 分享 / 新标签页打开）自动恢复工作。**

这一句是整章的锚点。路由不是「又一个 API」，是**把一个前端私有变量上升成公共协议**。

### 1.3 传统多页 vs SPA

| | 传统多页（MPA） | 单页应用（SPA） |
|---|---|---|
| 换页时发生什么 | 浏览器**发请求**，服务器返回**整份新 HTML** | **不发请求**，前端自己换组件 |
| 页面会不会闪 | 会（白屏一下再绘制） | 不会 |
| 谁在管「当前是哪页」 | 服务器：URL → 路由 → 返回对应 HTML | 前端：URL → 路由表 → 渲染对应组件 |
| 首次加载 | 只加载当前页，轻 | 加载整包 JS，重（所以需要分包/懒加载） |
| 典型代表 | 博客、新闻站、你写的 ASP.NET Core MVC 页面 | 后台管理、桌面应用式 Web |

两端都在「按 URL 找东西」，区别只是**在哪儿找、找到后返回什么**：

| | ASP.NET Core | vue-router |
|---|---|---|
| 谁在匹配 | 服务器，收到请求后 | 浏览器，地址变化后 |
| 匹配到之后 | 执行 handler，**生成响应发回网络** | 找到组件，**渲染进 `<router-view>` 这个坑** |
| 会发网络请求吗 | 会，每次都是新请求 | **不会** |

第二行就是「前端路由」四个字的全部含义：**路径匹配 和 网络请求 被拆开了。**

---

## 2. hash 与 history（072）

### 2.1 矛盾的根源

想要两件事同时成立：

1. 地址栏要变（否则上面三堵墙拆不掉）
2. 不能发请求（否则就不是 SPA 了）

**但在传统浏览器模型里，「地址变了」和「发请求」是同一件事。** 想拆开，只有两条历史遗留的后门。

### 2.2 后门一：hash 模式

用 `#` 后面那段。

**关键事实**：`#` 及其之后的内容，浏览器**从来不会发给服务器**（HTML 规范自锚点跳转时代就定死了）。所以：

- 改 `#` 后面 → 不发请求 ✅
- 但仍然写进历史、仍然触发 `hashchange` 事件 ✅

前端监听这个事件，自己决定渲染哪个组件。

```
http://localhost:5173/pet-vue.html#/pet
                              └─┬─┘
                        这一段服务器永远看不见
```

### 2.3 后门二：history 模式

用 `history.pushState()` / `replaceState()`。

这个 API 能改地址栏、能压历史栈，**且不发请求**。代价是：

> 用户按 **F5** 时，浏览器真的去请求 `/pet` → 服务器上没有这个文件 → **404**。

解法是让服务端兜底：任何没匹配到静态文件的路径，都返回 `index.html`，剩下的交给前端路由表。

你在 ASP.NET Core 里见过这一行：

```csharp
app.MapFallbackToFile("index.html");   // ← history 模式在服务端的那一半
```

这一行**只在 history 模式下必需**。用 hash 模式，这一行可以不写。

### 2.4 可自证实验

**实验 A：证明 hash 不发请求。**

浏览器打开 `pet-vue.html`，地址栏末尾打 `#abc` 回车 —— 页面**纹丝不动**，不闪、不刷新。

F12 控制台贴：

```js
addEventListener('hashchange', () => console.log(location.hash))
```

再改一次 `#` 后面的字，控制台立刻打印。**地址变了、历史记了、事件发了、一个请求都没发。**

**实验 B：证明 history 有 404 隐患。**

把 `#abc` 改成 `/abc` 回车。在 Vite 开发服务器上**看起来正常** —— 因为 Vite 自带 SPA fallback。但 `npm run build` 后丢到 IIS/Nginx 上，**同一个地址就是 404**。

**结论**：开发时看不出问题，上线才炸。这是 history 模式最典型的「环境差异型静默失败」。

### 2.5 怎么选

| | hash | history |
|---|---|---|
| 地址形状 | `/#/pet` | `/pet` |
| 刷新会不会 404 | 不会 | **会**（除非服务端配 fallback） |
| 服务端要配置吗 | 不要 | 要 |
| 前端创建函数 | `createWebHashHistory()` | `createWebHistory()` |
| SEO / 观感 | 差一点 | 干净 |
| 老浏览器兼容 | 最好 | IE9 及以下不行 |

**对桌宠项目的结论**：选 **history 模式**。理由不是「更现代」，而是你已经有一个 ASP.NET Core 后端，`MapFallbackToFile` 是现成的一行 —— **兜底成本对你来说是零**。反过来，如果这是个纯静态托管在 GitHub Pages 的项目，就该选 hash，因为 Pages 不让你配 fallback。

---

## 3. 路由表与出口（073）🔥

### 3.1 三个文件，三种分工

| 文件 | 职责 | 一句话 |
|---|---|---|
| `router/index.ts` | 造 router 实例，定义**路由表** | 「哪个地址对应哪个组件」 |
| `main.ts` | `app.use(router)` | 「把 router 装进应用」 |
| `App.vue` | 写 `<router-view />` | 「匹配到的组件往这儿塞」 |

**三者缺一，页面就白屏**，而且**都不报错**（见 §四.4）。

### 3.2 `createRouter` 逐符号拆解

课程里（Vue2）写 `new VueRouter({ mode: 'hash', routes })`。Vue3 里没有全局 `Vue` 构造函数了，`Vue.use()` 那套插件机制一起消失，于是改成「工厂函数造对象 → 对象自带 `install` 方法 → `app.use()` 认这个方法」。Pinia、Element Plus 全都是这个模式。

```ts
const router = createRouter({
  history: createWebHistory(),
  routes: [ /* ... */ ],
})
```

| 符号 | 是什么 | 谁调用它 | 不写会怎样 |
|---|---|---|---|
| `createRouter` | `vue-router` 导出的工厂函数 | 你，在 `router/index.ts` 里调**一次** | 没有 router 对象 |
| `history` | 选项名，值是「地址管理策略对象」 | `createRouter` 内部拿它操作地址栏 | **必填**，它是 §2 那道选择题 |
| `createWebHistory()` | 返回 history 模式的策略对象 | 作为 `history` 的值 | — |
| `routes` | 选项名，值是**路由表**（数组） | `createRouter` 读它建匹配索引 | **必填**，空数组合法但没路由可匹配 |
| 返回值 | `Router` 实例 | 下一行 `app.use(router)` | 不挂载 → `<router-view>` 永远空 |
| `export default router` | 默认导出 | `main.ts` 里 `import router from './router'` | `import` 拿到 `undefined`，`app.use(undefined)` 静默无事 |

### 3.3 路由表每一项能写什么

`routes` 本质就是一张**两列的对照表**：`path` → `component`。

```ts
routes: [
  { path: '/',    component: HomePage },
  { path: '/pet', component: PetPage  },
]
```

| 字段 | 类型 | 作用 | 本轮用不用 |
|---|---|---|:--:|
| `path` | `string` | 匹配规则，**必须 `/` 开头** | ✅ |
| `component` | 组件对象本身 | 匹配到后渲染谁 | ✅ |
| `name` | `string` | 给路由起名，跳转时可代替 path | 079+ |
| `redirect` | `string` / 函数 | 访问 A 自动跳到 B | 080 |
| `children` | 数组 | 嵌套路由（父组件里有子出口） | 109+ |
| `meta` | 任意对象 | 塞自定义数据，守卫里读 | 119 |
| `props` | `boolean` / 对象 / 函数 | 把路由参数当 props 传进组件 | 085 |

**注意 `component` 的取值**：是**组件对象本身**（`HomePage`），不是字符串 `'HomePage'`，不是 `<HomePage />`，不是 `'../pages/HomePage.vue'`。

### 3.4 出口 `<router-view />`

```html
<template>
  <router-view />
</template>
```

它是一个**占位组件**：路由表匹配到谁，就把谁渲染在自己的位置上。位置换到哪儿，页面就长在哪儿。

一个 `App.vue` 只要一个 `<router-view>` 就够了 —— 它代表「一层路由出口」。嵌套路由（父路由里有子路由）才会有第二个，那要等 `children`。

### 3.5 入口：为什么不能用 `<a href>`

课程 077 的正题。

```html
<a href="/pet">去桌宠</a>          <!-- ❌ -->
<router-link to="/pet">去桌宠</router-link>   <!-- ✅ -->
```

`<a href>` 的默认行为是**整页跳转**：浏览器发请求、卸载整个应用、重新加载 JS、所有内存状态清零。

`<router-link>` 编译出来的**也是 `<a>`**，但它在 `click` 里 `preventDefault()` 拦掉了默认行为，改调 `router.push()` —— 只换组件，不重载页面。

| | `<a href>` | `<router-link to>` |
|---|---|---|
| 实际渲染 | `<a href="/pet">` | `<a href="/pet">`（一样） |
| 点击后 | 整页请求 + 重载 | `preventDefault` + 改 URL + 换组件 |
| 状态 | **全丢** | 保留 |
| 刷新体验 | 白屏一下 | 无感 |
| 高亮 | 无 | **自动**（见 3.6） |
| 要不要写 `href` | 要 | 不要，写 `to` |

**`to` 可以传字符串，也可以传对象**（`{ path: '/pet' }` / `{ name: 'pet' }`），对象形式 079 才用得上。

### 3.6 高亮类名（077-078）

`<router-link>` 会自动给「当前匹配上」的链接加类名。两个，名字很像但含义不同：

| 类名 | 何时加 | 举例（当前 `/pet/settings`） |
|---|---|---|
| `.router-link-active` | **包含匹配** —— 当前路径以链接的 `path` 开头 | 指向 `/pet` 的链接 **会**被加上 |
| `.router-link-exact-active` | **精确匹配** —— 当前路径完全相等 | 指向 `/pet` 的链接 **不会**被加 |

**为什么需要两个**：导航栏里「文章」这个一级菜单，进了「文章详情」后应该还是亮的 → 用 `active`。但「首页」`/` 是所有路径的前缀，用 `active` 会让首页**永远亮着** → 就得用 `exact-active`。

这也是**静默失败**：不会报错，只是样式看着不对。

自定义类名有两种粒度（078）：

```ts
createRouter({
  linkActiveClass: 'my-active',            // 全局改
  linkExactActiveClass: 'my-exact-active',
})
```

```html
<router-link to="/pet" active-class="my-active">  <!-- 单个改 -->
```

**Vue2 课程里 `linkActiveClass` 写在 `new VueRouter({...})` 里，Vue3 写在 `createRouter({...})` 里 —— 位置一样，只是构造方式换了。**

---

## 4. 组件该放哪个文件夹（074）

课程 074 只有 6 分钟，但这是一条**会跟着你一辈子的约定**。

| 目录 | 放什么 | 判据 |
|---|---|---|
| `pages/`（或 `views/`） | **路由级组件** —— 和一条 `path` 一一对应的 | 「它出现在路由表里吗？」出现了就是 page |
| `components/` | **可复用组件** —— 被页面反复用了 2 次以上的 | 「它出现在路由表里吗？」没出现就是 component |

**为什么必须分开**：两类东西的「变动原因」不同。

- `pages/` 的变动原因 = **产品需求变了**（加一页、删一页）
- `components/` 的变动原因 = **设计变了**（按钮圆角、弹层动画）

混在一起，你会在一堆同名文件夹里翻页组件。这是最朴素的分层，不需要任何架构知识就能理解。

**桌宠项目的现状**：`App.vue` 里同时装着「首屏」和「舞台」两个页面级结构 → 路由化就是把它们拆进 `pages/`。而气泡、输入框、设置面板这些**将来**才是 `components/`（第 8 步拆组件时才会出现）。

---

## 5. VueRouter3 → VueRouter4 对照

课程从 073 一路到 140 全是 Vue2 写法。这张表建议存着，见一条查一条。

| 场景 | Vue2 / VueRouter3（课程） | Vue3 / VueRouter4（你的项目） |
|---|---|---|
| 安装插件 | `Vue.use(VueRouter)` | `app.use(router)` |
| 创建 | `new VueRouter({ ... })` | `createRouter({ ... })` |
| hash 模式 | `mode: 'hash'` | `history: createWebHashHistory()` |
| history 模式 | `mode: 'history'` | `history: createWebHistory()` |
| 路由表 | `routes: [...]` | `routes: [...]`（**一样**） |
| 出口 | `<router-view>` | `<router-view />`（**一样**） |
| 跳转组件 | `<router-link to="...">` | 同（**一样**） |
| 高亮类 | `router-link-active` | 同（**一样**） |
| 自定义类名 | `linkActiveClass` | 同，写在 `createRouter` 里 |
| 404 通配 | `path: '*'` | `path: '/:pathMatch(.*)*'` ⚠️ **写法完全变了** |
| 追加路由 | `router.addRoutes([...])`（已废弃） | `router.addRoute({...})` 单个加 |
| 组件里拿路由 | `this.$route` / `this.$router` | `useRoute()` / `useRouter()`（**组合式**，143+ 才讲） |
| 访问 `$route` 类型 | 无类型 | 需在 `vue-router` 的 `RouteMeta` 里扩展 |

**唯一需要背的两条**：
1. **`createRouter` + `createXxxHistory()` 取代 `new VueRouter({ mode })`**
2. **404 通配符从 `'*'` 变成 `'/:pathMatch(.*)*'`** —— 老教程直接抄会得到「路径解析错误」

---

==二：格式==

## 1. 速查表

```ts
// ═══ 创建 ═══
createRouter({ history, routes })          // 造 router
createWebHistory()                          // history 模式（要服务端 fallback）
createWebHashHistory()                      // hash 模式（不要服务端配置）

// ═══ 装进应用 ═══
createApp(App).use(router).mount('#app')

// ═══ 模板 ═══
<router-view />                             // 出口：匹配到的组件渲染在这
<router-link to="/pet">去</router-link>     // 入口：替代 <a>

// ═══ 高亮 ═══
.router-link-active                         // 包含匹配
.router-link-exact-active                   // 精确匹配
active-class="xxx"                          // 单链接自定义
linkActiveClass: 'xxx'                      // 全局自定义

// ═══ 路由表项 ═══
{ path: '/pet', component: PetPage }        // 最小合法项
{ path: '/:pathMatch(.*)*', component: NotFound }   // Vue3 的 404
```

| 想做的事 | 写在哪 |
|---|---|
| 加一个页面 | `router/index.ts` 的 `routes` 数组 + `pages/` 建文件 |
| 换模式 hash ↔ history | 只改 `history:` 那一个函数 |
| 改高亮样式 | CSS 里写 `.router-link-active` |
| 页面里加导航 | `<router-link to="...">` |

---

==三：代码==

## 1. 最小可跑（Vue3，三文件版）

**① `Vue/pages/HomePage.vue`**

```html
<template>
  <main class="home">
    <h1 class="home__title">My First DestopPet</h1>
    <button class="home__btn" @click="$router.push('/pet')">生成桌宠</button>
  </main>
</template>
```

**② `Vue/pages/PetPage.vue`**

```html
<template>
  <section class="pet">
    <router-link to="/">← 回首页</router-link>
  </section>
</template>
```

**③ `Vue/router/index.ts`**

```ts
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import PetPage from '../pages/PetPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',    component: HomePage },   // ← 首屏
    { path: '/pet', component: PetPage  },   // ← 舞台
  ],
})

export default router
```

**④ `Vue/main.ts`** —— 只多两处

```ts
import router from './router'          // ← ① 引入
createApp(App).use(router).mount('#app')   // ← ② .use(router)
```

**⑤ `Vue/App.vue`** —— 瘦成一个壳

```html
<template>
  <router-view />
</template>
```

跑起来后，手工在地址栏改 `/` ↔ `/pet`，页面内容跟着换、**刷新不再弹回首屏**。

---

## 2. 项目落地版（第 3 步之后要做的事）

改造清单（**一次只动一处，每处改完 `npm run dev` 确认能跑**）：

| # | 动作 | 验证点 |
|:--:|---|---|
| 1 | `Vue/pages/HomePage.vue` ← 抠 `App.vue` 的 `<main class="home">` 整块 | 首屏样式不变（CSS 是共用的） |
| 2 | `Vue/pages/PetPage.vue` ← 抠 `<section class="pet">` 整块，**连带 `messages` / `addMessage` 一起搬** | 消息列表还是刚做好的样子 |
| 3 | `Vue/router/index.ts` ← 路由表 | 无 |
| 4 | `main.ts` 加 `.use(router)` | 无 |
| 5 | `App.vue` 换成 `<router-view />` | **地址栏 `/`、`/pet` 都能正常显示** |
| 6 | 「生成桌宠」按钮改成 `$router.push('/pet')` | 点按钮 → 地址变 → 进舞台 |
| 7 | 舞台的 ✕ 改为 `<router-link to="/">` | 能退回首屏 |

**⚠️ 一个必须提前知道的坑**：`PetPage` 里的 `messages` 从「`App.vue` 的局部变量」变成了「`PetPage` 的局部变量」。**离开 `/pet` 这一页，`PetPage` 被卸载，聊天记录就没了。**

这不是 bug，是路由的本性：**换页 = 组件销毁重建**。要留住它只有三条路：

| 方法 | 是什么 | 什么时候学 |
|---|---|---|
| `<keep-alive>` 包住 `<router-view>` | 不销毁组件，缓存实例 | 087（缓存组件） |
| 状态提到路由之外（Pinia） | 数据不归页面管 | 153+ |
| 存 localStorage | 落盘 | 项目第 11 步 |

**这就是你上一条交接里说的那个洞**：「路由一上，组件树分裂成多棵树，接着就出现两个页面共享数据的问题」。路由不是终点，它是**逼你面对状态归属的第一记耳光**。

---

==四：总结==

## 1. 一句话记住三个

- **路由 = 给界面一个地址**，然后白拿浏览器的刷新 / 后退 / 分享能力。
- **hash 骗过请求，history 骗过地址**；history 的账要在服务端用 fallback 结清。
- **三件套**：`router/index.ts` 定义表、`main.ts` 装进去、`App.vue` 留出口。缺一个就白屏，且不报错。

## 2. ⭐⭐ 本轮要背的

1. `createRouter({ history: createWebHistory(), routes: [...] })` —— 六个字的函数名 + 两个必填选项。
2. `routes` 每一项 `{ path, component }`，`component` 是**组件对象本身**。
3. `app.use(router)` 和 `<router-view />`，两处缺一不可。
4. `<router-link to>` 而不是 `<a href>` —— 后者会整页重载、状态全丢。
5. `router-link-active`（包含）vs `router-link-exact-active`（精确）。
6. Vue3 的 404 通配是 `'/:pathMatch(.*)*'`，不是 `'*'`。

## 3. ⭐ 收敛时刻

**收敛点一：「状态到底存哪」这条线，到这里完成了第四次升维。**

| 阶段 | 状态存哪 | 谁能读 | 生命周期 |
|---|---|---|---|
| 组件内部 | `ref` 局部变量 | 只有自己 | 组件活着就活着 |
| Vue--04 | `props` / `emit` | 父 ↔ 子 | 跟着父组件 |
| Vue--05 | `provide/inject` | 祖先 → 后代整条链 | 跟着祖组件 |
| **Vue--06** | **URL** | **所有人，包括浏览器和外部** | **不受组件生死影响** |

`ref` → `props` → `provide` → `URL`，**每一层都是因为上一层「传不到」才出现的**。这不是巧合，是同一个问题的四次回答：**状态该被谁知道，就该被放在那个可见范围的边界上。**

所以下一站必然是 Pinia —— 因为「跨页面、跨组件树、但不该给浏览器看」的状态，上面四个都装不下。

**收敛点二：`<router-link>` 的高亮，是 Vue--02 的 `:class` 的官方封装。**

它自动帮你做的事，等价于：

```html
<a :class="{ 'router-link-active': 当前路径以它开头 }">   <!-- 只是替你写了 -->
```

「根据当前状态给元素加 class」这个动作，你在计算属性那一章已经手动做过一次了。理解这点，你以后就不会去「背」两个 active 类的区别 —— 你知道它在判断什么。

## 4. 静默失败清单

本章全是**不报错但行为错**的坑，这是路由最恶劣的地方：

| # | 写法 | 现象 | 真因 |
|:--:|---|---|---|
| 1 | `routes` 写成 `route` | 页面全白，控制台干净 | 路由表视为空 |
| 2 | `component` 写成 `components` | 全白，或报 `Cannot read properties of undefined` | 拼写 |
| 3 | `path: 'pet'`（漏 `/`） | 该路由永远匹配不上，控制台只有 warning | 必须 `/` 开头 |
| 4 | 忘了 `app.use(router)` | `<router-view>` 里什么都没有 | router 没装进应用 |
| 5 | 忘了 `<router-view />` | 地址变了、组件没渲染 | 没有出口 |
| 6 | `export default` 漏了 router | `app.use(undefined)`，静默无效 | 导入拿到 `undefined` |
| 7 | 用 `<a href="/pet">` | 每次点击整页重载，状态全丢 | 默认行为没拦 |
| 8 | Vue3 里写 `path: '*'` | 控制台报路径解析错误 | 改成 `/:pathMatch(.*)*` |
| 9 | 首页用 `router-link-active` 高亮 | 首页永远亮着 | 该用 `exact-active` |
| 10 | `mode: 'history'` 直接抄进 Vue3 | 选项被忽略，变成默认 hash | Vue3 没有 `mode` 选项 |
| 11 | history 模式上线后刷新 404 | 本地正常、线上 404 | 服务端缺 fallback |
| 12 | 换页后聊天记录没了 | 数据"丢"了 | 组件被卸载，这是设计不是 bug |

**判据统一成一句**：别问「会不会报错」，要问「**地址栏、历史栈、组件生命周期这三样，是不是我想要的**」。

## 5. C# 类比可用度

| C# / ASP.NET Core 侧 | 前端侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `app.MapGet("/api/chat", Handler)` | `{ path: '/pet', component: PetPage }` | ⭐⭐⭐ | 同样是 path → 处理器；但**方向相反**：那边生成响应发回网络，这边只渲染组件 |
| `app.MapFallbackToFile("index.html")` | history 模式的服务端兜底 | ⭐⭐⭐ | 完全同一件事，你已经写过这行 |
| Controller 上的 `[Route("pet")]` | `path: '/pet'` | ⭐⭐ | 都是声明式映射；但 MVC 一个 Controller 摞多个 action，路由表是平铺的 |
| `app.UseAuthentication()` 等中间件注册 | `app.use(router)` | ⭐⭐ | 都是「注册一项能力，之后各处可用」；但中间件有**顺序**，插件没有 |
| `HttpContext.Request.Path` | 组件里的 `route.path` | ⭐⭐ | 一个是服务端读请求，一个是前端读当前地址 |
| 服务端 Session / Cookie | ❌ 无对应 | ❌ | 路由不是存储，别拿它比 Session |
| `Response.Redirect("/pet")` | `redirect: '/pet'` | ⭐⭐ | 都是「访问 A 转去 B」；但前者是一次 HTTP 往返，后者纯前端 |

⚠️ **最容易误用的一个**：把路由表当成「后端路由」。后端路由是**地址 → 数据**，前端路由是**地址 → 界面**。同一个 URL 在前端可能压根不发请求，所以「我在路由表里配了接口却拿不到数据」这类困惑，根源都是没分清这两层。

## 6. 解锁边界

**本轮新解锁**

- 路由基础：`createRouter` / `routes` / `<router-view>` / `<router-link>` / 高亮类名（072-078）
- 目录约定：`pages/`（路由级）与 `components/`（复用级）
- Vue3 与课程 Vue2 的路由写法差异（§5 对照表）
- 概念层：SPA、hash vs history、前端路由的职责

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 路由传参（query / params） | 079、085 |
| `redirect` 与 404 | 080 |
| 编程式导航 `router.push` / `replace` | 081 |
| `useRoute()` / `useRouter()`（组合式里拿路由） | 143+ |
| 嵌套路由 `children` | 109+ |
| 路由守卫 `beforeEach` | 119 |
| `<keep-alive>` 缓存组件 | 087 |
| 路由懒加载 `() => import()` | 课程未讲，项目需要时单开 |
| vuex | 091-105（**但项目不用它**，Vue3 用 Pinia） |
| Pinia | 153-158 |
| 组合式 API 全套 | 143-152 |

## 7. 下一轮预告

**079-087 路由进阶**（约 1 小时 20 分），三件事：

1. **传参两种方式**（079、085）：`?id=1` 查询参数 vs `/detail/1` 动态路由 —— 什么时候必须用后者。
2. **重定向与 404**（080）：`redirect` + Vue3 的 `/:pathMatch(.*)*`。
3. **编程式导航**（081）：`router.push` / `replace` / `go` —— 什么时候按钮不该是链接。

然后 082-087 是「面经案例」，把传参、缓存组件串起来做一个完整小页面。

**对项目的判断**：079-081 是你迟早要用的（桌宠将来要有 `/settings`、`/history` 这类独立页面），082-087 的案例可以快速过。**这一轮学完，路由这条线在项目里就够用了。**
