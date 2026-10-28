# Vue--07 · 路由进阶 · 传参 / 重定向 / 编程式导航 / 组件缓存

> **对应课程**：079-087（黑马 `BV1HV4y1a7n4`，9 集 / 约 2 小时 36 分）
> **读法**：承接 Vue--06。课程仍是 VueRouter3 + 选项式写法，本文一律给 **VueRouter4 + 组合式**版本；凡是版本行为不一致的地方单独标 ⚠️。
> **本轮定位**：Vue--06 只解决了「地址能换页面」。这一轮解决三个新问题 —— **换过去能不能带东西**（传参）、**地址失效了怎么办**（重定向）、**换过去能不能不销毁**（keep-alive）。第三条会直接推翻 Vue--06 里「换页 = 组件销毁」这个默认假设。

---

==一：概念==

## 1. 两种传参（079）🔥

### 1.1 只有一种办法：把标识写进 URL

列表页 10 条数据，点第 3 条进详情页。详情页怎么知道是第 3 条？

`props` 传不了（两个页面之间没有父子关系），`provide` 传不了（不是祖先链）。**它们之间唯一的共同点是 URL。**

所以传参的本质还是那句话：**给状态一个对外名字**。这一轮只是把「当前在哪一页」细化成「当前是哪一条」。

两种写法：

```
/list                列表页
/detail/1            ← 动态路由（params）：1 是路径的一段
/detail?id=1         ← 查询参数（query）：? 后面
```

取值：

```js
route.params.id      // 动态段 → '1'
route.query.id       // ? 后面 → '1'
```

### 1.2 判据：把这个参数去掉，页面还有意义吗

| 参数 | 去掉之后 | 归属 | 典型 |
|---|:--:|---|---|
| 详情页的 id | **完全无法渲染** | `params` | `/detail/1`、`/user/pero23366` |
| 搜索词 | 显示全部，仍有意义 | `query` | `/search?kw=vue` |
| 页码 | 回到第 1 页，仍有意义 | `query` | `/list?page=3` |
| 排序方式 | 用默认排序，仍有意义 | `query` | `/list?sort=hot` |
| 来源页（埋点） | 不影响内容 | `query` | `/post/9?from=list` |

一句话：**`params` 是「你是谁」，`query` 是「你要怎么看」。**

形式上的区别（都来自这个判据）：

| | `params` | `query` |
|---|---|---|
| 在 URL 里的位置 | 路径的**一段** | `?` 后面的键值对 |
| 必须在路由表里声明吗 | **必须**（`:id`） | 不用 |
| 可以有多个吗 | 可以，但顺序固定 | 可以，顺序随意 |
| 可以省略吗 | 默认不行（`:id?` 才行） | 天然可省 |
| 少一段会怎样 | **匹配不上，进 404** | 照常渲染 |

### 1.3 C# 对照：这就是 `[FromRoute]` 和 `[FromQuery]`

这一对是最好的一个跨语言对照，因为**同构，不是类比**：

```csharp
[HttpGet("/detail/{id}")]
public IActionResult Detail([FromRoute] int id, [FromQuery] string kw)
```

```js
route.params.id     // ← 对应 [FromRoute]
route.query.kw      // ← 对应 [FromQuery]
```

ASP.NET Core 的模型绑定也是同一个判断：**路径段是资源定位的一部分，查询串是修饰条件**。你在 MVC 里从来没纠结过「这个参数该用 route 还是 query」，前端也一样 —— 判据是同一句话。

### 1.4 让它不依赖路由：`props: true`

组件里写 `route.params.id` 有个坏处：**这个组件从此离不开路由**，想单独测试或复用于别处，就得造一个假 `route`。

路由表里加一个 `props: true`：

```ts
{ path: '/detail/:id', component: DetailPage, props: true }
```

组件就变成普通的 props 组件：

```ts
defineProps<{ id: string }>()      // ← 不用 import useRoute，不知道路由存在
```

`props` 有三种取值：

| 写法 | 效果 | 什么时候用 |
|---|---|---|
| `props: true` | 把 `params` 全部当 props 传入 | 最常用 |
| `props: { ... }` | 静态对象，永远传这一份 | 传常量配置 |
| `props: route => ({ ... })` | 函数，自己决定传什么 | 想把 `query` 也转成 props、或做类型转换 |

```ts
props: route => ({ id: Number(route.params.id) })    // ← 顺手转类型
```

⚠️ **`props: true` 只转 `params`，不转 `query`**。要 `query` 必须用函数形式。

### 1.5 ⚠️ VueRouter4 的丢参坑：`path` 和 `params` 不能同时用

这是从 Vue2 迁移过来最容易踩的一个，而且**不报错**：

```js
router.push({ path: '/detail', params: { id: 1 } })    // ❌ params 被静默丢弃
router.push({ name: 'detail', params: { id: 1 } })     // ✅ 必须用 name
```

**原因**：`path` 已经是一条完整地址，路由器不知道 `params` 该往路径的哪个位置塞。VueRouter3 会替你拼，VueRouter4 直接无视。

**这是 4.x 的 breaking change**（官方迁移指南里叫 "params are ignored if a path is provided"）。照 Vue2 教程抄，症状是详情页显示 `undefined`、接口 404，而控制台一片干净。

**推论**：凡是需要带 `params` 跳转的路由，**都该给它起个 `name`**：

```ts
{ path: '/detail/:id', name: 'detail', component: DetailPage }
```

`query` 没这个问题（`{ path: '/list', query: { page: 2 } }` 完全合法），因为 `?` 后面跟路径无关。

---

## 2. `$route` 和 `$router`（079 / 081）

两个词差一个字母，用途完全不同。课程里一带而过，但它是路由部分最高频的误用源。

| | `$route` | `$router` |
|---|---|---|
| 是什么 | **当前这条路由的记录**（快照对象） | **路由器本体** |
| 有什么 | 只有数据：`path` `params` `query` `name` `meta` `matched` | 只有方法：`push` `replace` `go` `back` `addRoute` |
| 读写 | **只读** | 通过它才能**改地址** |
| 组合式写法 | `const route = useRoute()` | `const router = useRouter()` |
| 常见误用 | `$route.push()` ❌ 不存在 | `$router.params` ❌ 没有 |

**记法**：`route` 是名词（那条路），`router` 是**走的那个东西**。

⚠️ **`useRoute()` 返回的是响应式对象**。地址一变，读它的地方自动更新 —— 行为上像 `ref`，但它的源头是浏览器地址栏，不是你的变量。这也意味着：**不要在 `setup` 顶层把 `route.params.id` 解构出来**：

```ts
const { id } = route.params        // ❌ 拿到的是一次性快照，地址再变不会更新
const id = computed(() => route.params.id)    // ✅ 保住响应性
```

Vue2 里对应的是 `watch: { '$route'(to, from) { ... } }`，Vue3 里换成 `watch(() => route.params.id, ...)`。

---

## 3. 重定向（080）

### 3.1 三种写法

```ts
{ path: '/', redirect: '/home' }                        // ① 字符串
{ path: '/', redirect: { name: 'home' } }               // ② 命名路由（推荐）
{ path: '/old/:id', redirect: to => `/new/${to.params.id}` }   // ③ 函数，参数透传
```

**推荐 ②**：路由表里改了 `path`，`redirect` 不用跟着改，因为名字比路径稳定。

**③ 的意义**：改版时把老地址平滑迁移到新地址，且**保留参数**。网站永远有一部分老链接在外面流传，这是必须付的账。

### 3.2 重定向 vs 别名

```ts
{ path: '/home', component: Home, alias: '/index' }     // 别名
```

| | `redirect` | `alias` |
|---|---|---|
| 地址栏会变成 | **会**（跳到新地址） | **不会**（还是原样） |
| 历史记录 | 多一条 | 不多 |
| 用途 | 旧地址作废 | 一个页面有两个合法地址 |

**判据**：这个旧地址「未来还该不该存在」？不该存在 → `redirect`；它只是同一页的另一个名字（比如 `/` 和 `/home`）→ `alias`。

### 3.3 404 兜底

Vue--06 提过 Vue3 的通配写法，这里补全成一个完整的收尾结构：

```ts
{ path: '/:pathMatch(.*)*', redirect: '/404' }          // 花哨的做法：都跳 404 页
{ path: '/:pathMatch(.*)*', component: NotFoundPage }   // 朴素做法：直接渲染
```

**别用 `redirect`**，除非 `/404` 本身有一条真实路由。否则用户访问 `/404` 时又匹配到通配 → 再跳 `/404` → vue-router 会检测到死循环并放弃，最终一片空白。

---

## 4. 编程式导航（081）

### 4.1 `push` / `replace` / `go`

前两种是**改去哪**，第三种是**在历史栈里移动**：

| 方法 | 行为 | 后退键能回来吗 |
|---|---|:--:|
| `router.push(...)` | 压一条新记录 | ✅ |
| `router.replace(...)` | **替换**当前记录 | ❌ |
| `router.go(n)` | 前进/后退 n 步 | — |
| `router.back()` | `go(-1)` | — |
| `router.forward()` | `go(1)` | — |

**参数格式跟 `router-link` 的 `to` 完全一致**（它们最终调的是同一个内部函数）：

```js
router.push('/list')                                  // 字符串
router.push({ path: '/list', query: { page: 2 } })    // 带 query
router.push({ name: 'detail', params: { id: 1 } })    // 带 params，必须 name
router.push({ path: '/detail', params: { id: 1 } })   // ❌ 见 §1.5
```

### 4.2 什么时候必须用 `push`，不能用 `<router-link>`

`<router-link>` 编译出来就是 `<a>`，它**必须看起来像个链接**。以下几种情况它做不到：

| 场景 | 为什么 |
|---|---|
| 登录成功后跳首页 | 跳转是**异步结果**，不是用户点了链接 |
| 提交表单后跳列表 | 同上，且要等接口返回 |
| 按钮点了才发现没权限 → 踢去登录 | 跳转嵌在判断逻辑里 |
| 删除最后一条后回列表 | 跳转是**业务结果** |
| 条件跳转（`if` 里） | 模板里塞 `v-if` 也能做，但逻辑该在 JS 里 |

**判据**：**跳转是一个「用户可选择的位置」还是一个「程序执行的结果」？**
前者用 `<router-link>`（能中键新标签页打开、能复制链接），后者用 `router.push`。

⚠️ **`<router-link>` 有一个 `router.push` 替代不了的能力**：用户可以右键「在新标签页打开」。任何用户**可能想分享或同时打开**的导航，都别改成 `push`。

### 4.3 VueRouter4 的一个行为变化：`push` 返回 Promise

```js
const failure = await router.push('/list')     // v4：返回 Promise
if (failure) { /* 导航被中止或重复了 */ }
```

- **VueRouter3**：`push` 返回 `undefined`；重复导航会 reject 一个 `NavigationDuplicated`，于是全网教程都教你写 `.catch(() => {})`。
- **VueRouter4**：返回 `Promise<NavigationFailure | void>`，**重复导航不再抛错**，而是 resolve 一个描述失败原因的对象。

**所以网上那句 `.catch(err => {})` 在 Vue3 项目里已经是历史包袱** —— 加了不报错，但它掩盖的其实是别的问题。

---

## 5. 组件缓存 `keep-alive`（087）🔥

### 5.1 它推翻了 Vue--06 的一句话

Vue--06 写着：**「换页 = 组件销毁重建」**，所以 `PetPage` 一离开，`messages` 就没了。

`<keep-alive>` 就是这个规则的例外：**它让组件在离开路由后不被销毁，而是被「停用」并留在内存里。**

```
正常：  进入 → 创建 → 挂载 → 离开 → 卸载 → 销毁
keep-alive：进入 → 创建 → 挂载 → 离开 → 【停用，实例保留】→ 再进入 → 【激活，状态还在】
```

### 5.2 写法（Vue3 推荐 v-slot 形式）

```html
<router-view v-slot="{ Component }">
  <keep-alive>
    <component :is="Component" />
  </keep-alive>
</router-view>
```

`v-slot` 拿到的是「当前匹配到的组件」，然后用 `<component :is>` 动态渲染。这样 `<keep-alive>` 就能包住它。

课程里的 Vue2 写法是直接包（`<keep-alive><router-view/></keep-alive>`），**在 Vue3 里也仍然有效**，但官方推荐上面的 v-slot 形式 —— 因为要在包一层的同时加 `include` 判断、或者做过渡动画，只有 v-slot 形式腾得出手。

### 5.3 三个 props

| prop | 值 | 作用 | 坑 |
|---|---|---|---|
| `include` | 组件**名**（字符串/正则/数组） | 只缓存这些 | ⚠️ 匹配的是**组件 `name`**，不是路由 `name` |
| `exclude` | 同上 | 除了这些全缓存 | 同上 |
| `max` | 数字 | 最多缓存几个，超出按 LRU 淘汰 | 超了会**真的销毁**最久没用的 |

⚠️ **`include` 不生效的头号原因**：组件没有 `name`。

- Vue2：`export default { name: 'DetailPage' }`
- Vue3 `<script setup>`：**默认用文件名推断**（Vue 3.2.34+，`DetailPage.vue` → `DetailPage`）。文件名改了，`include` 就悄悄失效。
- 想显式指定：`defineOptions({ name: 'DetailPage' })`（3.3+）

### 5.4 两个新钩子

被缓存的组件不再走 `onUnmounted` / `onMounted`（第二次进入时），而是走：

| 钩子 | 什么时候触发 | 典型用途 |
|---|---|---|
| `onActivated` | 每次进入（**含第一次**） | 刷新数据、恢复滚动位置 |
| `onDeactivated` | 每次离开 | 暂停定时器、停掉轮询 |

**这是最容易写错的一处**：把「进入时要跑的逻辑」写在 `onMounted` 里，加缓存后**只有第一次会跑**，第二次进入页面数据是旧的。

**判据**：**这个组件会被缓存吗？** 会被缓存 → 用 `onActivated` 代替 `onMounted`。

### 5.5 什么时候该用、什么时候是毒药

| 该用 | 不该用 |
|---|---|
| 列表页（返回时保留搜索词和滚动位置） | 需要每次拿最新数据的页面 |
| 表单页（切走再回来草稿还在） | 内存敏感的页面（大列表全缓存会爆） |
| 有本地交互状态的页面（展开/折叠） | 已经用 Pinia 存了状态的地方（重复） |

**核心判断**：**这个状态是「页面自己的」还是「全应用共享的」？**

- 页面自己的（滚动位置、草稿、展开状态）→ `keep-alive`，成本低
- 全应用共享的（登录用户、消息列表）→ 状态提升/Pinia，`keep-alive` 治不了

用 `keep-alive` 去当状态管理，是这一章最容易犯的错。

---

## 6. 面经案例的骨架（082-087）

082-087 用一个「面试题小程序」把上面全部串起来。它的结构值得单独记，因为**这就是所有列表-详情型应用的标准骨架**：

| 集 | 做了什么 | 对应的通用套路 |
|:--:|---|---|
| 082 | 效果分析 | 先拆「几个页面、几条路由」 |
| 083 | 路由配置 | 一级路由 + 一个 `:id` 动态路由 |
| 084 | 首页请求渲染 | `onMounted` 里 fetch → 渲染列表 |
| 085 | 传参 | 同一份数据，两条路径：query 传「哪一类」，params 传「哪一条」 |
| 086 | 详情页渲染 | 从 `params.id` 请求单条 |
| 087 | 缓存组件 | 回列表时搜索词和滚动位置还在 |

**085 是这个案例的精华**：它同时用了两种传参，正好演示判据 ——

- 点「前端」分类 → `/list?type=frontend`（query：**哪一类**，可以没有）
- 点某一题 → `/detail/9`（params：**哪一条**，没有就渲染不了）

---

==二：格式==

## 1. 速查表

```js
// ═══ 取值 ═══
route.params.id            // 动态段（必须在路由表声明 :id）
route.query.kw             // ? 后面
route.path                 // 当前完整路径
route.name                 // 当前路由名

// ═══ 跳转 ═══
router.push('/list')                                  // 压栈
router.push({ path: '/list', query: { page: 2 } })    // query 可与 path 共存
router.push({ name: 'detail', params: { id: 1 } })    // params 必须配 name
router.replace('/list')                               // 替换当前记录
router.go(-1) / router.back()                         // 后退

// ═══ 路由表 ═══
{ path: '/detail/:id', name: 'detail', component: D, props: true }
{ path: '/', redirect: { name: 'home' } }
{ path: '/:pathMatch(.*)*', component: NotFound }
{ path: '/home', component: Home, alias: '/index' }

// ═══ 缓存 ═══
<router-view v-slot="{ Component }">
  <keep-alive include="ListPage"><component :is="Component" /></keep-alive>
</router-view>
```

| 想做的事 | 用哪个 |
|---|---|
| 用户能看见的导航 | `<router-link to>` |
| 程序执行完的跳转 | `router.push` |
| 跳转后不想让用户退回来 | `router.replace` |
| 旧地址作废 | `redirect` |
| 同一页的另一个名字 | `alias` |
| 回列表保留状态 | `keep-alive` + `onActivated` |

---

==三：代码==

## 1. 完整可跑：列表 → 详情（Vue3 组合式）

**路由表**

```ts
// Vue/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import ListPage from '../pages/ListPage.vue'
import DetailPage from '../pages/DetailPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: { name: 'list' } },
    { path: '/list', name: 'list', component: ListPage },
    { path: '/detail/:id', name: 'detail', component: DetailPage, props: true },
    { path: '/:pathMatch(.*)*', component: ListPage },   // 先拿列表兜底
  ],
})
export default router
```

**列表页**：两种跳法并列，看区别

```html
<!-- Vue/pages/ListPage.vue -->
<template>
  <router-link :to="{ name: 'detail', params: { id: 1 } }">第 1 条（声明式）</router-link>
  <button @click="go(2)">第 2 条（编程式）</button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const go = (id: number) => router.push({ name: 'detail', params: { id } })
</script>
```

**详情页**：`props: true` 之后，它不知道路由存在

```html
<!-- Vue/pages/DetailPage.vue -->
<template>
  <p>当前是第 {{ id }} 条</p>
</template>

<script setup lang="ts">
defineProps<{ id: string }>()    // ← 注意是 string，URL 里的一切都是字符串
</script>
```

⚠️ **`params` 的值永远是字符串**。`/detail/1` 拿到的 `id` 是 `'1'` 不是 `1`。要数字就自己转：

```ts
defineProps<{ id: string }>()
const numId = Number(id)                 // 或者路由表里 props: r => ({ id: Number(r.params.id) })
```

**加缓存版**（App.vue）：

```html
<router-view v-slot="{ Component }">
  <keep-alive include="ListPage">
    <component :is="Component" />
  </keep-alive>
</router-view>
```

## 2. 桌宠项目的落地映射

| 课程里的东西 | 桌宠将来对应什么 | 什么时候做 |
|---|---|---|
| `/detail/:id` params | 将来的 `/history/:sessionId`（某一轮对话） | 有会话历史时 |
| `?type=` query | 将来的 `/history?type=chat`（筛选） | 同上 |
| `redirect` | 老地址 `/pet-vue.html` → 新地址 `/` | **立刻可用** |
| `router.push` | 「生成桌宠」按钮（业务动作，不是导航） | 第 3 步 |
| `keep-alive` | **`/pet` 页的聊天记录保鲜** | 路由化之后立刻需要 |
| `onActivated` | 回舞台时刷新未读计数 | 同上 |

**注意 `keep-alive` 在项目里的定位**：它能救「离开 `/pet` 再回来记录还在」，但**救不了刷新**（刷新时内存全清）。所以它只能当过渡手段，第 11 步还是要落到 `localStorage` 或后端。

---

==四：总结==

## 1. 一句话记住三个

- **传参就是给状态一个更细的名字**：`params` 是「你是谁」、`query` 是「你要怎么看」。
- **`route` 是名词、`router` 是动词**；带 `params` 跳转必须用 `name`，用 `path` 会被静默丢弃。
- **`keep-alive` 是「换页 = 销毁」这条规则的唯一例外**，而且它只在内存里保鲜，救不了刷新。

## 2. ⭐⭐ 要背的

1. `params` vs `query` 的判据：**去掉这个参数，页面还能不能渲染**。
2. `router.push({ name, params })` —— **必须 `name`**。`{ path, params }` 是丢参坑，不报错。
3. `route` 只读、`router` 才有方法。
4. `props: true` 只转 `params`，不转 `query`；`params` 的值永远是字符串。
5. `push` 压栈、`replace` 替换（后退回不来）。
6. `<keep-alive include>` 匹配的是**组件名**；`<script setup>` 里组件名由**文件名**推断。
7. 被缓存的组件用 `onActivated` 代替 `onMounted`。

## 3. ⭐ 收敛时刻

**收敛点一：`keep-alive` 让 Vue--06 的一句话失效了。**

Vue--06 的推论链是这样的：

> 换页 → 组件卸载 → 局部状态消失 → 所以要 Pinia

`keep-alive` 把第二环掐掉了。于是出现一个**分叉**，而这个分叉值得记一辈子：

| 状态的性质 | 该放哪 | 理由 |
|---|---|---|
| 页面自己的、短命的、不需要跨页面读 | `keep-alive` 缓存实例 | 便宜、零改造 |
| 跨页面共享、多组件要读、要能持久化 | Pinia / 外部存储 | 生命周期与页面解耦 |

**"要不要 Pinia"这个问题的答案不在「状态多不多」，而在「这个状态该不该活得比页面长」。**
你项目里 `messages` 就是典型：它不该随 `/pet` 生灭（要 Pinia/存储），而「列表页滚动到第几行」就该（`keep-alive`）。

**收敛点二：传参是「状态可见范围」这张表的第五个刻度。**

| 谁能读 | 手段 | 出处 |
|---|---|---|
| 只有自己 | `ref` | Vue--01 |
| 父子之间 | `props` / `emit` | Vue--04 |
| 祖先链 | `provide` / `inject` | Vue--05 |
| **所有人（含浏览器、外部）** | **URL（params / query）** | **Vue--06 / 07** |
| 全应用、但不对浏览器公开 | Pinia | 153+ |

这张表每往下走一格，都是因为**上一格传不到**。

`params` / `query` 的意义在于：它是**唯一一个会被用户看见、被搜索引擎读到、被复制粘贴带走的通道**。所以它只该装「标识」和「筛选条件」，不该装「密码」「完整数据对象」—— 这就是它的边界。

**收敛点三：`push` 返回 Promise，和 `fetch` 是同一个范式。**

从 VueRouter3 的「发出命令就完事」到 v4 的「返回一个可等待的结果」，和 `XMLHttpRequest` → `fetch` 是同一条演化路径：**异步操作要能被检查、能被串起来**。你学 `Promise` 那一章时以为那只跟网络请求有关，其实整套生态都在往这个形状上收。

## 4. 静默失败清单

| # | 写法 | 现象 | 真因 |
|:--:|---|---|---|
| 1 | `{ path, params }` 跳转 | 详情页永远 `undefined`，接口 404 | v4 忽略 `path` 旁的 `params` |
| 2 | `const { id } = route.params` | 连续切两条详情，内容不更新 | 解构丢了响应性 |
| 3 | `props: true` 后想拿 `query` | `query` 永远是 `undefined` | `props: true` 只转 `params` |
| 4 | `Number` 比较 `params` | `1 === '1'` 恒 false | URL 里全是字符串 |
| 5 | `<keep-alive include="detail-page">` | 完全没缓存 | 匹配的是组件名，不是路由名/kebab |
| 6 | 组件没 `name` + `include` | 缓存不生效，无任何提示 | `<script setup>` 靠文件名推断 |
| 7 | 缓存组件里写 `onMounted` 拉数据 | 第二次进入数据是旧的 | 该用 `onActivated` |
| 8 | 通配路由 `redirect: '/404'` | 访问坏地址 → 白屏 | `/404` 本身也被通配捕获，死循环 |
| 9 | `onUnmounted` 里清定时器 | 加缓存后定时器一直在跑 | 组件没卸载，该用 `onDeactivated` |
| 10 | 用户想「新标签页打开」却改成 `push` | 右键菜单没「在新标签打开」 | `push` 渲染的是 `div`，不是 `<a>` |
| 11 | `router.push` 后面写 `.catch(()=>{})` | 看着没事，但掩盖了真错误 | v4 不再因重复导航 reject |
| 12 | 用 `keep-alive` 当状态管理 | 刷新后全空，且多标签页不一致 | 它只在内存里，不落盘 |

## 5. C# 类比可用度

| C# / ASP.NET Core 侧 | 前端侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `[FromRoute] int id` | `route.params.id` | ⭐⭐⭐ | **同构**，判断标准都一样 |
| `[FromQuery] string kw` | `route.query.kw` | ⭐⭐⭐ | **同构** |
| 路由参数默认是 `string`，模型绑定才转 `int` | `params` 是 `string`，要自己 `Number()` | ⭐⭐⭐ | ASP.NET Core 帮你转，vue-router 不转 |
| `Response.Redirect("/home")` | `redirect: '/home'` | ⭐⭐ | 前者一次 HTTP 往返，后者纯前端 |
| `services.AddScoped` 的作用域生命周期 | `keep-alive` 的组件实例保留 | ⭐⭐ | 都是「延长寿命」，但一个是 DI 容器管、一个是组件树管 |
| `IMemoryCache` | `keep-alive` | ⭐ | 都是内存缓存，但 `keep-alive` 缓的是**组件实例**，含 DOM 和事件 |

⚠️ **必切的一个术语撞车：`keep-alive` 和 HTTP 的 `Keep-Alive` 毫无关系。**

| | HTTP `Keep-Alive` | Vue `<keep-alive>` |
|---|---|---|
| 缓的是什么 | **TCP 连接** | **组件实例（含 DOM、状态、事件）** |
| 解决什么 | 少握手，省网络往返 | 少销毁重建，省状态 |
| 谁管 | 服务端 / 浏览器网络栈 | 前端组件树 |
| 你会同时见到 | `Connection: keep-alive` 响应头 | `<keep-alive>` 标签 |

名字撞了纯属巧合（都取「保持活着」的字面意思）。两个都出现在同一个项目里，很容易在排查性能时想错方向。

## 6. 解锁边界

**本轮新解锁**

- 传参两种：`params`（动态路由）与 `query`，含判据与 `props: true`
- `$route` / `$router` 的切分，及组合式 `useRoute()` / `useRouter()`
- `redirect` / `alias` / 404 通配的完整收尾结构
- 编程式导航：`push` / `replace` / `go` / `back`
- `<keep-alive>` 三个 props + `onActivated` / `onDeactivated`
- **列表 → 详情** 这类应用的标准骨架

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 嵌套路由 `children` + 子出口 | 109+（课程移动端项目） |
| 路由守卫 `beforeEach`（登录拦截） | 119 |
| 路由懒加载 `() => import()` | 课程未讲，项目需要时单开 |
| VueRouter4 的 `RouteMeta` 类型扩展 | 课程未讲（TS 项目会用） |
| vuex | 091-105（**项目不用**，跳过） |
| Pinia | 153-158 |
| 组合式 API 完整体系（`watch` / `模板引用` / `defineExpose`） | 143-152 |

## 7. 下一轮预告

**路由板块到此结束**（072-087 全部讲完）。

下一步有两条路，按你的项目状态选：

**路线 A：先补组合式（141-152）再接 Pinia（153-158）**
适合「先把项目写通再回头看细节」。你的 `App.vue` 已经在写 `<script setup>`，这 12 集会把你零散用过的东西系统化。

**路线 B：先把项目第 3-7 步做完（输入框 / 气泡 / 设置 / 表单 / 上传）**
适合「先有能跑的东西」。这几步只用到已解锁的知识（`v-model` / `watch` / `computed` / 事件参数），不需要新语法。

**中间有一条必须跳过的沟**：088-140 是 ESLint + **vuex** + Vue2 移动端商城实战，和你的技术栈（Vue3 + `<script setup>` + Vite + Pinia）不同源。101 集的 vuex 认知可以只看 091-092 两集（理解「为什么需要集中式状态」），其余跳过。
