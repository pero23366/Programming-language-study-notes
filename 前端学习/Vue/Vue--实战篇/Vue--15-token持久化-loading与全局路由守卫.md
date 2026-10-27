# Vue--15 · token 进 vuex · storage 持久化 · 请求 loading · 全局前置守卫

> **对应课程**：116-119（黑马 `BV1HV4y1a7n4`，4 集 / 约 1 小时 4 分）
> **读法**：四集一条线——**token 存下来（116）→ 刷新不丢（117）→ 请求期间有个反馈（118）→ 没票不让进（119）**。前三集都在为 119 服务。
> **本轮定位**：**全项目的合流点。** 114 的 `redirect`、115 的请求拦截器、117 的 storage、118 的 loading，在 119 这一个函数里全部接上。学完这一轮，你的应用第一次有"**谁能进来**"这个概念。
> **前置**：Vue--14（api 层 + 响应拦截器）、Vue--13（路由表）。

---

==一：概念==

## 1. token 放哪（116）

### 1.1 token 是什么

**一句话：服务端发给你的一张"临时身份手环"。**

```
① 你拿手机号+验证码换手环   →  POST /login  →  服务端返回 { token: 'eyJhbGci...' }
② 之后每次进门都亮手环     →  GET /cart  →  请求头 Authorization: Bearer eyJhbGci...
③ 手环过期/被注销         →  服务端返回 401  →  你得重新去换
```

**服务端不记"谁登录了"**（那是 session），它只认手环上的签名。**这就是 JWT 的核心：状态存在客户端，服务端只验签。**

| | session | token（JWT） |
|---|---|---|
| 状态存哪 | **服务端**内存/Redis | **客户端**，服务端不算 |
| 服务端要查吗 | 每次查 session 表 | 只验签名，**不查库** |
| 扩展性 | 多台服务器要共享 session | 天然无状态 |
| 注销 | 删 session 立即生效 | **不好注销**（要等过期 / 维护黑名单） |

> 🔴 **"注销不好做"是 token 的代价，不是 bug。** 所以课程里的"退出登录"只是**前端删掉 token**——服务端那份手环其实还能用到过期。真项目要靠短有效期 + refresh token 补。

### 1.2 三个位置，怎么选

| 位置 | 刷新页面后 | 能被 JS 读 | 适合 |
|---|:--:|:--:|---|
| 组件 `data` | ❌ 丢 | ✅ | 绝对不行（换个页面就没了） |
| **vuex `state`** | ❌ **丢** | ✅ | **访问快，但内存态** |
| `localStorage` | ✅ 留着 | ✅ | **持久，但有 XSS 风险** |
| `httpOnly` Cookie | ✅ | ❌ 读不到 | 最安全，但跨域配置麻烦 |

**课程的答案：两边都放。**

```
登录成功 → commit 进 vuex（内存，供拦截器秒读）
        → 同时写 localStorage（磁盘，供刷新后恢复）
```

> 🟡 **为什么不只放 localStorage？** 因为 vuex 是**响应式**的——`store.state.user.token` 变了，用到它的组件会自动更新（比如"我的"页面显示用户名）。`localStorage` 变了没人通知。

### 1.3 落地：`store/modules/user.js`

```js
export default {
  namespaced: true,
  state: () => ({
    token: '',
    userInfo: {}
  }),
  mutations: {
    setToken (state, token) { state.token = token },
    setUserInfo (state, info) { state.userInfo = info }
  }
}
```

登录成功后：

```js
const res = await login({ mobile, code })
this.$store.commit('user/setToken', res.data.token)
```

### 1.4 请求拦截器带 token（补 115 的洞）

```js
// utils/request.js
import store from '@/store'

request.interceptors.request.use((config) => {
  const token = store.state.user.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

| 细节 | 说明 |
|---|---|
| `Bearer ` 有空格 | `Bearer` + **一个空格** + token，少了服务端解析失败 |
| `if (token)` | 没登录时不带，否则发出去是 `Bearer undefined` |
| 直接 `import store` | **不要在拦截器里用 `this.$store`**，那不是组件 |

> 🔴 **`import store` 有循环依赖风险**：`store` 若 import 了 `request`（比如 action 里调 api），而 `request` 又 import `store`，就成了环。**解法：store 里不直接 import api，或者用 `require` 延迟取。** 课程规模小，一般不出问题，但报错 `Cannot read property 'state' of undefined` 时先想这条。

---

## 2. 刷新就丢：持久化（117）

### 2.1 问题复现

1. 登录成功 → token 在 vuex 里，一切正常；
2. **按 F5 刷新**；
3. `store.state.user.token` 变成 `''` → 请求不带 token → **401** → 跳登录页。

**因为 vuex 的 state 就是一个 JS 对象，存在内存里。** 页面一刷新，整个 JS 运行环境重建，对象没了。

> **这和 Vue--09 §4.1 那条"state 是对象、data 是函数"是同一件事的两面**：state 是内存里的**单份对象**，所以刷新即失忆。

### 2.2 两条方案

| 方案 | 做法 | 代码量 | 适合 |
|---|---|---|---|
| **A. 手写 storage 模块** | 建 `utils/storage.js`，在 mutation 里顺手写盘 | 20 行 | 想搞懂原理 |
| **B. 用插件 `vuex-persistedstate`** | `plugins: [createPersistedState()]` | 3 行 | 项目里直接用 |

**课程讲的是 B**（11 分钟，讲原理来不及）。但 A 你得看懂，不然 B 出问题你没法查。

### 2.3 方案 A：手写

```js
// utils/storage.js
export const setItem = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}
export const getItem = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch (e) {
    return null
  }
}
```

```js
// store/modules/user.js
mutations: {
  setToken (state, token) {
    state.token = token
    setItem('token', token)          // ← 顺手写盘
  }
}
```

**初始化**：`store/index.js` 里读回来。

```js
state: () => ({
  token: getItem('token') || '',
  userInfo: {}
})
```

### 2.4 🔴 localStorage 的三个坑

**① 只能存字符串**

```js
localStorage.setItem('user', { name: '张三' })   // 存进去变成 "[object Object]"
```

**这是最经典的静默失败**：不报错，读出来永远解析失败。**对象一律 `JSON.stringify`。**

**② 别做"自动类型猜测"**

网上很多 storage 封装长这样：

```js
// ❌ 看着聪明，实际有坑
export const getItem = (key) => {
  const v = localStorage.getItem(key)
  try { return JSON.parse(v) } catch (e) { return v }
}
```

| 存进去 | 读出来 | 问题 |
|---|---|---|
| `'abc'` | `'abc'` | 正常 |
| `'"abc"'`（stringify 过的） | `'abc'` | 正常 |
| **`'123'`** | **`123`（数字）** | **类型变了** |
| **`'true'`** | **`true`（布尔）** | 类型变了 |

**统一 stringify / 统一 parse，别猜。** 写入端保证一定是 JSON，读取端就敢直接 `JSON.parse`。

**③ token 存 localStorage 有 XSS 风险**

| 位置 | XSS 能不能偷到 |
|---|---|
| localStorage | ✅ **能**（`localStorage.getItem('token')`） |
| httpOnly cookie | ❌ 不能（JS 读不到） |

**但业界还是大量用 localStorage**，原因：跨域简单、移动端 WebView 友好。**代价是必须自己防 XSS**（不渲染用户输入的 HTML、不用 `v-html` 渲染外部内容）。

> **这不是"正确做法"，是"妥协后的事实"。** 你只要知道有这条取舍，别以为 localStorage 是标准答案。

### 2.5 方案 B：插件

```bash
npm i vuex-persistedstate
```

```js
import createPersistedState from 'vuex-persistedstate'

export default new Vuex.Store({
  modules: { user, cart },
  plugins: [
    createPersistedState({
      key: 'hm-shop',
      paths: ['user']          // ← 只持久化 user 模块
    })
  ]
})
```

| 配置 | 作用 |
|---|---|
| `key` | localStorage 里的键名 |
| **`paths`** | **只存这些路径**（不写就全存） |
| `storage` | 默认 localStorage，可换 sessionStorage |

> 🔴 **`paths` 一定要写。** 不写就把整个仓库（含购物车列表、商品缓存）全塞进 localStorage——**5MB 上限，塞满后 `setItem` 抛 `QuotaExceededError`，而这个错误很多人不知道会被忽略**。

---

## 3. 请求 loading（118）

### 3.1 为什么需要

用户在弱网下点"登录"，**1.5 秒内没有任何反应** → 他会再点一次 → **发两个请求** → 后端可能生成两条订单。

**loading 有三个作用**：

| 作用 | 机制 |
|---|---|
| 告诉用户"在处理" | 视觉反馈 |
| **阻止重复点击** | `forbidClick: true` |
| 掩盖布局抖动 | 遮罩 |

### 3.2 挂在拦截器上

```js
// utils/request.js
import { Toast } from 'vant'

let loadingCount = 0

const showLoading = () => {
  if (loadingCount === 0) {
    Toast.loading({ message: '加载中...', forbidClick: true, duration: 0 })
  }
  loadingCount++
}

const hideLoading = () => {
  loadingCount--
  if (loadingCount <= 0) {
    loadingCount = 0
    Toast.clear()
  }
}
```

```js
request.interceptors.request.use((config) => {
  showLoading()
  // ...带 token
  return config
})

request.interceptors.response.use(
  (response) => { hideLoading(); /* ... */ },
  (error) => { hideLoading(); /* ... */ }
)
```

### 3.3 🔴 为什么必须计数器

**假设没有计数器，直接 `Toast.clear()`：**

```
请求 A 发出 → 显示 loading
请求 B 发出 → 再调一次 Toast.loading（单例，覆盖，看起来没变）
请求 A 回来 → Toast.clear()   ← 遮罩没了
请求 B 还在跑 → 用户以为结束了，又点了一次按钮
```

**计数器解决的就是"谁有权关灯"**：

| 时刻 | `loadingCount` | 是否显示 |
|---|:--:|:--:|
| A 发出 | 1 | ✅ |
| B 发出 | 2 | ✅ |
| A 回来 | 1 | ✅ **继续显示** |
| B 回来 | 0 | ❌ 关闭 |

> **这个模式在 .NET 里叫"引用计数"**：`Interlocked.Increment/Decrement`，最后一个使用者负责释放。**你写 `IDisposable` 的时候用过同一套思路。**

### 3.4 三个细节

**① `duration: 0`** —— 不自动关。**少了它 2 秒后自己消失**，请求还在跑但用户以为完了。

**② 响应拦截器的两个分支都要 `hideLoading()`** —— 成功和失败。**漏了失败分支 → 一旦报错，loading 永远不消失**，用户只能刷新页面。

**③ 有些请求不该有 loading**

```js
request.get('/captcha/image', { showLoading: false })
```

需要自定义配置，在 `request.use` 里判断（`config.showLoading !== false` 才显示）。**验证码图、静默刷新用户信息这类请求不该转圈。**

---

## 4. 全局前置守卫（119）🔥

### 4.1 它管的是"进门前"

路由守卫是**导航过程中的钩子**，在**组件渲染之前**执行：

```
用户点链接 / 手输地址 / router.push
        ↓
  ★ beforeEach（全局前置）★  ← 这里能改道
        ↓
  路由级 beforeEnter
        ↓
  组件内 beforeRouteEnter
        ↓
  解析异步组件（懒加载的 chunk 在这下载）
        ↓
  ★ 组件渲染 ★
```

**关键点：`beforeEach` 在组件渲染之前跑**，所以"没登录的用户**根本不会看到**购物车页面"，而不是"看到了再跳走"。

> **这就是它和 `v-if` 隐藏按钮的本质区别**：`v-if` 是"进门后藏东西"，守卫是"**门都不让进**"。安全必须用后者。

### 4.2 三参数

```js
router.beforeEach((to, from, next) => {
  // to   : 要去哪（Route 对象）
  // from : 从哪来
  // next : 放行/改道的开关
})
```

| `next` 调用方式 | 结果 |
|---|---|
| `next()` | 放行 |
| `next(false)` | **中断导航**（URL 回到原处） |
| `next('/login')` | 改道去 `/login` |
| `next(new Error())` | 中断并触发 `router.onError` |

### 4.3 完整写法

```js
// src/router/index.js
import store from '@/store'

const whiteList = ['/login']

router.beforeEach((to, from, next) => {
  const token = store.state.user.token

  if (token) {
    // 已登录：别再去登录页
    if (to.path === '/login') next('/home')
    else next()
  } else {
    // 未登录：白名单放行，其余踢回登录
    if (whiteList.includes(to.path)) next()
    else next(`/login?redirect=${to.path}`)
  }
})
```

**四条分支，一条都不能少：**

| 情况 | 处理 | 少了会怎样 |
|---|---|---|
| 有 token + 去正常页 | `next()` | — |
| 有 token + **去登录页** | `next('/home')` | 已登录还能看到登录页，怪 |
| 无 token + **白名单** | `next()` | **死循环**（见 4.5） |
| 无 token + 其他页 | `next('/login?redirect=...')` | 一串 401 |

### 4.4 `redirect` 闭环：从写入到读回

```
① 用户想买商品 → 点「加入购物车」
② 守卫发现没 token → 改道 /login?redirect=/detail/3
③ 登录成功 → 读 this.$route.query.redirect
④ router.replace('/detail/3')  → 回到他本来要去的地方
```

```js
// 登录页 114 的代码，现在才真正有用
const back = this.$route.query.redirect || '/home'
this.$router.replace(back)
```

**114 那集你觉得 `redirect` 可有可无——现在它是闭环的关键一环。**

> 🟡 **`to.path` 里不带 query**。如果用户访问 `/detail?id=3`，`redirect=/detail` 会丢参数。严谨写法：
> ```js
> next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
> ```
> 然后登录后 `decodeURIComponent`（`$route.query` 会自动解一次）。**课程用 `to.path`，够用；真项目用 `fullPath`。**

### 4.5 🔴 `next` 的三个坑（这一节是 119 的全部难点）

**坑 1：忘了调 `next()`**

```js
router.beforeEach((to, from, next) => {
  if (!token) next('/login')
  // ← 有 token 时忘了写 next()
})
```

**现象：页面一片空白，地址栏还是新地址，控制台无报错。** 导航**卡住**了——Vue Router 在等你的答复，你不吭声它就一直等。

**坑 2：`next()` 调了两次**

```js
if (!token) next('/login')
next()          // ← 又调一次
```

**现象**：控制台 `Uncaught (in promise) Error: Invalid navigation guard` 或 `next() was called twice`。

**规矩：一条分支只能调一次。** 用 `return` 保证：

```js
if (!token) return next('/login')
next()
```

**坑 3：死循环**

```js
// 忘了把 /login 放进白名单
if (!token) next('/login')
```

```
访问 /login（无 token）
  → 守卫：无 token → next('/login')
  → 触发新的导航到 /login
  → 守卫又跑：无 token → next('/login')
  → ……
```

**现象**：控制台 `Maximum call stack size exceeded` 或 Vue Router 的 "Detected an infinite redirection in a navigation guard"。

**白名单存在的唯一理由就是断这个环。**

### 4.6 更细的写法：`meta.requiresAuth`

白名单是"黑名单式"——**新增一个需要登录的页面，你不用改守卫**（默认拦）。但真实项目通常反过来：

```js
// 路由表里标注
{ path: '/cart', component: ..., meta: { requiresAuth: true } }
```

```js
router.beforeEach((to, from, next) => {
  const token = store.state.user.token
  if (to.meta.requiresAuth && !token) {
    return next(`/login?redirect=${to.path}`)
  }
  next()
})
```

| 方案 | 新增页面时 | 漏了会怎样 |
|---|---|---|
| **白名单**（本课程） | 不用改，默认拦 | — |
| **`meta.requiresAuth`** | **要记得加 meta** | **该拦的没拦，数据泄露** |

**白名单更安全（默认拒绝），meta 更灵活（公开页多时省事）。** 课程用白名单，是对的。

---

==二：格式==

## 1. 四个文件，各管一段

| 文件 | 这一轮加什么 |
|---|---|
| `store/modules/user.js` | `token` / `setToken` / 从 storage 初始化 |
| `utils/storage.js` | `setItem` / `getItem`（JSON 统一处理） |
| `utils/request.js` | 请求拦截器带 token；loading 计数器 |
| `router/index.js` | `beforeEach` 守卫 |

## 2. token 全链路（背这张）

| 环节 | 代码位置 |
|---|---|
| 拿到 | 登录页 `res.data.token` |
| 存内存 | `commit('user/setToken', token)` |
| 存磁盘 | mutation 里 `setItem('token', token)` |
| **刷新恢复** | `state: () => ({ token: getItem('token') \|\| '' })` |
| 每次带上 | 请求拦截器 `config.headers.Authorization` |
| 判断能不能进 | 守卫 `store.state.user.token` |
| 失效处理 | 响应拦截器 401 → 清 token + 跳登录 |

## 3. 守卫模板

```js
const whiteList = ['/login']

router.beforeEach((to, from, next) => {
  const token = store.state.user.token
  if (token) {
    if (to.path === '/login') return next('/home')
    return next()
  }
  if (whiteList.includes(to.path)) return next()
  next(`/login?redirect=${to.path}`)
})
```

## 4. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| 页面空白、地址变了、无报错 | 守卫里漏 `next()` | 每条分支都调 |
| `next() was called twice` | 一条分支调了两次 | 加 `return` |
| `Maximum call stack` / 无限重定向 | 白名单漏 `/login` | 补白名单 |
| 刷新后 401 | token 没持久化 | 117 |
| `localStorage` 取出来是 `"[object Object]"` | 存对象没 stringify | 统一序列化 |
| loading 永不消失 | 失败分支没 `hideLoading` | 两分支都写 |
| loading 提前消失 | 没计数器，被先回来的请求关了 | 计数器 |
| 请求头是 `Bearer undefined` | 没判空 | `if (token)` |
| `QuotaExceededError` | 持久化没写 `paths`，全存了 | 只存需要的 |
| 已登录还能进登录页 | 漏"有 token + 去 /login"分支 | 补 `next('/home')` |

---

==三：代码==

## 1. 实验 A：看着 token 丢一次

**① 116 做完，登录成功**，控制台 `store.state.user.token` 有值
**② 按 F5**
**③ 再看** → 空字符串

**④ 加上 117 的持久化，重来一次** → 刷新后还在。

> 这一步必须**自己看到空**，你才会相信"vuex 会失忆"。

## 2. 实验 B：storage 的 `[object Object]`

```js
localStorage.setItem('u', { name: '张三' })
localStorage.getItem('u')      // "[object Object]"
JSON.parse(localStorage.getItem('u'))   // SyntaxError
```

**这就是为什么 `getItem` 外面要包 `try/catch`。**

## 3. 实验 C：计数器验证

**① 去掉计数器，直接 `Toast.clear()`**
**② 页面 `created` 里同时发两个请求**（其中一个故意慢 2 秒）
**③ 观察**：快的回来 → 遮罩消失 → 慢的还在跑（无遮罩）
**④ 加上计数器** → 遮罩等到最后一个回来才消失。

## 4. 实验 D：守卫的四种走法

| 操作 | 期望 |
|---|---|
| 未登录 → 访问 `/cart` | 跳 `/login?redirect=/cart` |
| 未登录 → 访问 `/home` | 跳 `/login?redirect=/home` |
| 未登录 → 直接访问 `/login` | **正常显示**（白名单） |
| 登录后 → 访问 `/login` | 自动跳 `/home` |
| 登录后 → 访问 `/cart` | 正常 |

## 5. 实验 E：故意造一个死循环

把白名单改成空数组：

```js
const whiteList = []
```

→ 控制台出现 `Maximum call stack size exceeded` 或 `Detected an infinite redirection`。

**改回来。** 你现在知道这个报错长什么样了。

## 6. 实验 F：`redirect` 完整闭环

**① 未登录，手输 `/cart`**
**② 被踢到 `/login?redirect=/cart`**
**③ 登录成功**
**④ 期望：落在 `/cart`，不是首页。**

如果落在首页，检查登录页那行是不是 `this.$router.replace(back)` 而不是写死 `'/home'`。

---

==四：总结==

## 1. 一句话记住三个

- **token 两边都放**：vuex 供响应式，localStorage 供刷新后恢复。
- **loading 必须计数器**，否则先回来的请求会替所有人关灯。
- **守卫的唯一难点是 `next`**：一条分支调一次、必须有白名单。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| token 存哪 | vuex + `localStorage`，**各司其职** |
| 请求头 | `Authorization: Bearer <token>`（**有空格**） |
| 持久化坑 | localStorage **只能存字符串** |
| storage 原则 | 统一 stringify / 统一 parse，**不做类型猜测** |
| XSS | localStorage 里的 token **能被 JS 读走**（妥协，不是最佳） |
| loading | `duration: 0` + **计数器** + 失败分支也要 hide |
| `next` 三坑 | 漏调 → 空白页；调两次 → 报错；死循环 → 白名单 |
| 白名单 | `['/login']`，**它是断死循环的唯一手段** |
| 守卫四分支 | 有票正常 / 有票去 login 转走 / 无票白名单 / 无票踢走 |
| redirect | `?redirect=${to.path}`，登录后 **`replace`** 回去 |
| 401 | 清 token + 跳登录（115 留的洞） |

## 3. ⭐ 收敛时刻

**这一轮是"回头看得最清楚"的一轮：**

**① 114 的 `redirect` → 当时多余的参数，现在是闭环的一半**

你在 114 觉得"跳首页就行"，119 告诉你：用户是有目的地的。**一个参数埋了三轮才用上——这就是真实项目的样子。**

**② 115 的 401 → 现在有了正确写法**

115 我说"401 光提示不够，必须清 token"，这一轮补全：`commit('user/setToken', '')` + `setItem('token', '')` + `next('/login')`。

**③ Vue--09 的"state 是内存对象" → 第一次以 bug 的形式撞上**

Vue--09 我特意对比过"`data` 是函数、`state` 是对象"。这一轮你亲眼看到 F5 之后仓库空了。**那次对比不是抠细节，是在这儿等着你。**

**④ Vue--12 的 `utils/vant.js` → 现在 `utils/` 有三个人了**

`vant.js`（注册组件）、`request.js`（网络）、`storage.js`（本地存储）。**`utils` 就是"跟业务无关、全项目共用"的收口。** 以后还会加 `auth.js`、`validate.js`。

**⑤ Vue--13 的 Layout / 路由表 → 守卫就挂在那张表上**

守卫不是独立的东西，它是**路由表的一个副作用**：只要有 `router` 实例，就能挂。**你 13 轮建的表，这轮才长出"规则"。**

## 4. 静默失败清单

这一轮**全是"没报错但不安全 / 不工作"**：

| # | 做法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | 守卫某分支漏 `next()` | **页面空白、地址变了、零报错** | 导航卡住 |
| 2 | 白名单漏 `/login` | 无限重定向 / 栈溢出 | 守卫拦住了自己 |
| 3 | `localStorage.setItem` 直接存对象 | 读出来 `"[object Object]"` | 只能存字符串 |
| 4 | 自动 `JSON.parse` + catch 返回原值 | `'123'` 变数字、`'true'` 变布尔 | 类型悄悄变了 |
| 5 | 响应拦截器失败分支忘 `hideLoading` | 报错后遮罩永不消失 | 用户只能刷新 |
| 6 | 没 `Bearer ` 的空格 | 服务端 401，前端看着很正常 | 头格式错 |
| 7 | 持久化不写 `paths` | 5MB 塞满，`QuotaExceededError` | 存储溢出 |
| 8 | `if (token)` 漏了 | `Bearer undefined`，全 401 | 没判空 |
| 9 | 已登录还能进 `/login` | 体验怪（不算 bug） | 漏了那条分支 |
| 10 | token 只放 vuex | **刷新即掉线**，用户以为被踢了 | 内存态 |
| 11 | `redirect` 用 `to.path` | 带 `?id=3` 的参数丢了 | 该用 `fullPath` |

**第 1 条是最贵的**：它不是"报错"，是**一片空白**，而且新手根本不会想到去查守卫。**记住这个形态：地址变了 + 页面空白 + 无报错 = 守卫没调 `next()`。**

**工程上怎么防**：

- 守卫写成**"每条分支都 `return next(...)`"**，从形式上避免漏调；
- 白名单**放在文件顶部当常量**，一眼能看见；
- `storage` 封装**只暴露 `setItem` / `getItem`**，谁都不许直接碰 `localStorage`；
- loading 的 `showLoading` / `hideLoading` **成对出现**，写一个就写另一个；
- **F5 之后先测一次**——每次改鉴权相关代码，刷新是最快的验证。

**这不是 bug，是代价**：前端的"安全"只是**引导用户走对路**，真正的权限校验必须在服务端。**你把守卫写得再好，用户改一下 localStorage 里的 token 就绕过了——服务端仍会 401，这才是最后一道门。**

## 5. C# 类比可用度

| C# / .NET 侧 | 本轮 | 可用度 | 注意 |
|---|---|:--:|---|
| JWT Bearer 认证 | token 全链路 | ⭐⭐⭐ | **同一套东西**：签发 → 带在头里 → 验签 |
| `[Authorize]` 过滤器 | `beforeEach` 守卫 | ⭐⭐⭐ | 都是"进门前查票" |
| `[AllowAnonymous]` | 白名单 | ⭐⭐⭐ | 都是"这几个不查" |
| `AuthenticationStateProvider`（Blazor） | `store.state.user.token` | ⭐⭐⭐ | 都是"当前用户状态" |
| `HttpClient.DefaultRequestHeaders` | 请求拦截器加头 | ⭐⭐⭐ | 都是"每个请求自动带" |
| `Interlocked.Increment/Decrement` | loading 计数器 | ⭐⭐⭐ | **引用计数，完全同构** |
| `IMemoryCache`（进程内） | vuex `state` | ⭐⭐⭐ | 都随进程/页面消失 |
| 本地文件 / `ProtectedData` | `localStorage` | ⭐⭐ | 都是持久化，但 localStorage **不加密** |
| `Session`（服务端） | — | ❌ | token 是**客户端**存状态，理念相反 |

**用法建议**：把 `beforeEach` 直接当 **`[Authorize]` 过滤器**看，把白名单当 `[AllowAnonymous]`。**你是从"后端怎么防"迁移到"前端怎么防"，逻辑几乎不用改。**

**必须记牢的差异**：**`[Authorize]` 是服务端强制，守卫只是前端引导。** 用户能手改 localStorage 的 token，服务端仍会拒绝——**这才是真安全**。前端的守卫只负责"别让他白跑一趟"，不负责"安全"。

## 6. 解锁边界

**本轮新解锁**

- token 的本质（无状态凭证）与 session 的取舍；"注销不好做"是它的代价
- token 四位置对比（`data` / vuex / localStorage / httpOnly cookie）
- `store/modules/user.js` 的 `token` / `setToken`
- 请求拦截器带 `Authorization: Bearer `（含那个空格）
- 持久化两条方案：手写 `storage.js` / `vuex-persistedstate` 的 `paths`
- localStorage 三坑：只能字符串、类型猜测、XSS 风险
- loading：`duration: 0`、**引用计数**、失败分支也要 hide
- **全局前置守卫 `beforeEach`**：三参数、`next` 的四种用法
- **守卫四分支**（有票正常 / 有票去 login 转走 / 无票白名单 / 无票踢走）
- `next` 三坑（漏调 / 调两次 / 死循环）与白名单的作用
- `meta.requiresAuth` 与白名单的取舍
- `redirect` 闭环（含 `to.path` vs `to.fullPath`）

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 首页轮播 / 动态渲染 | **Vue--16（120）** |
| 搜索历史（storage 的第二个用途） | Vue--16（121） |
| 搜索列表页 | Vue--16（122） |
| 商品详情 + 弹层 + 数字框 | Vue--17（123-125） |
| **加购时的 token 判断** | Vue--17（126） |
| 购物车模块（vuex 最密集） | Vue--18（127-133） |
| 结算 / 订单 / mixin / 打包优化 | Vue--19（134-139） |
| refresh token / 无感刷新 | 课程未讲 |
| 组件级守卫 `beforeRouteEnter` / `beforeRouteLeave` | 课程未讲 |

⚠️ **术语撞车登记**（本轮新增两条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `守卫` | 路由守卫 | `v-if` 一类的显示控制 | 守卫在**渲染前**，`v-if` 在**渲染中** |
| `白名单` | 守卫里免检的路由 | 接口 / IP 白名单 | 看上下文 |

## 7. 下一轮预告

**Vue--16（120-122，3 集 / 约 1 小时 19 分）：首页渲染 · 搜索历史 · 搜索列表**

这一轮回到"做页面"，但有两个新东西：

| 集 | 内容 | 新东西 |
|---|---|---|
| 120 | 首页静态 + **动态渲染** | 轮播、商品流、`v-for` 嵌套 |
| 121 | **搜索历史** | **第二次用 storage**（第一次是 token） |
| 122 | 搜索列表页 | 列表 + 空态 |

**121 的搜索历史**会让你把这一轮的 `storage.js` 用第二遍——**你会发现它长得和 token 那套几乎一样，只是存的是数组。** 那时候"复用"才变成直觉。

开跑之前请确认：

1. **F5 之后不掉线**（token 从 localStorage 恢复）；
2. 未登录访问 `/cart` 会跳到 `/login?redirect=/cart`，**登录后回到 `/cart`**；
3. 同时发两个请求时，loading 等到最后一个才消失。

**建议开新对话** —— 下一轮是纯页面，跟这一轮的"规则"不是一类东西。
