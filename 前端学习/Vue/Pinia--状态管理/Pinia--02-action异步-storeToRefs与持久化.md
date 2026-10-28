# Pinia--02 · action 异步 · storeToRefs · 持久化

> **对应课程**：156-158（黑马 `BV1HV4y1a7n4`，3 集 / 约 36 分钟）
> **读法**：这是「Vue3 线」的第 7 篇，也是**课程 Vue3 主线（140-158）的最后一篇**。上一篇把 store 立起来了，这一篇全是「用起来才会撞到的东西」：异步怎么写、解构怎么救、刷新怎么不丢。
> **本轮定位**：三集各补一个缺口 —— **副作用往哪放**（156）、**解构的正解**（157，上一篇的坑）、**内存 → 磁盘**（158）。

---

==一：概念==

## 1. action 异步写法（156）🔥

### 1.1 先看「没有统一答案」的世界

组件里发请求，你已经在 `Vue--14`（实战篇）写过一遍了。当时的结论是：

```
组件 onMounted → 调 api 函数 → 拿数据 → 塞进 vuex → 渲染
```

**问题：loading、错误、防重、缓存，全散在组件里。** 十个组件请求同一份数据，就是十套 loading 逻辑。

**store 的价值就是把「拿数据」这件事收进去**：组件只说「我要数据」，剩下的（loading / 失败重试 / 缓存）归 store。

### 1.2 action 天然是异步的

```js
export const useListStore = defineStore('list', () => {
  const list = ref([])
  const loading = ref(false)

  async function loadList() {
    loading.value = true
    try {
      const res = await getListApi()      // ← 直接 await，不用包 mutation
      list.value = res.data
    } finally {
      loading.value = false
    }
  }

  return { list, loading, loadList }
})
```

**为什么 vuex 里要绕一圈？**

| | vuex | Pinia |
|---|---|---|
| mutations | **必须同步**（为了 Devtools 能记录快照） | 没有这个概念 |
| 异步请求 | 只能在 action 里，拿到结果再 `commit` | action 里 **直接改 state** |
| 中间那层 | `commit('SET_LIST', data)` + 一个 mutation | **不存在** |

**这就是上一篇 1.4 那句话的具体样子**：mutation 消失不是简化，是「不需要中间人也能记录」的结果。**你的 action 同时是 vuex 的 action + mutation。**

### 1.3 三段结构：loading / try / finally

**把 1.2 那段拆开看，每一行的职责：**

| 行 | 作用 | 漏了会怎样 |
|---|---|---|
| `loading.value = true` | 让 UI 显示骨架屏 / 转圈 | 用户不知道在等 |
| `try { ... }` | 正常路径 | 报错直接冒到控制台 |
| `finally { loading.value = false }` | **无论成败都关掉 loading** | **失败时永远卡在转圈** |

**为什么必须是 `finally` 而不是 `catch` 里写？**

```js
// ❌ 错误示范
try {
  list.value = await getListApi()
  loading.value = false        // ← 请求成功走这里
} catch (e) {
  console.error(e)             // ← 失败时不执行上一行
}                              // loading 永远是 true，页面一直转圈
```

**这不是理论上会出的事，是必出的。** 网络一断，用户看到的是「一直在加载」，而不是「加载失败」。

**和你在 `Vue--14` 学的那条完全一样**（当时是 `finally` 关 loading 与防重），只不过那次写在组件里，这次写在 store 里。**规则没变，位置变了。**

### 1.4 错误处理：两个层次

```js
async function loadList() {
  loading.value = true
  try {
    const res = await getListApi()
    list.value = res.data
  } catch (e) {
    error.value = e.message       // ① store 自己留一份，给 UI 展示
    // ② 是否再 throw 出去？见下表
  } finally {
    loading.value = false
  }
}
```

| 场景 | 该不该 `throw` |
|---|---|
| 组件只需要「显示错误」 | ❌ 不抛，store 里存 `error` 就行 |
| 组件需要「失败后跳到别的页面 / 重试」 | ✅ 抛出去，让调用方 `try/catch` 决定 |
| **表单提交失败要拦住后续流程** | ✅ 抛 |

**关键是不能「吞掉」**：`catch {}` 空着 = 错误消失 + 调用方误以为成功，**这是最坏的一种静默失败**。

### 1.5 防重复请求

用户手抖点两次按钮 → 两个请求 → 后回来的覆盖先回来的（可能覆盖成旧数据）。

```js
const loading = ref(false)

async function loadList() {
  if (loading.value) return          // ← 最简单的一道闸
  loading.value = true
  try { /* ... */ } finally { loading.value = false }
}
```

**够用版就到这。** 更严的做法（`Vue--14` 的四道防重：标志位 + 按钮 disable + 请求取消 + 后端幂等）在这里同样成立 —— **`loading` 既能给按钮 `:disabled="store.loading"`，又能当闸，一份状态两用**。

### 1.6 action 返回 Promise，可以 `await`

```js
// 组件里
await store.loadList()
console.log(store.list)         // ← 这里一定拿到数据了
```

**因为 action 是 `async` 函数，返回 Promise。** 这让「串行流程」变得很自然：

```js
await userStore.login(form)
await cartStore.loadCart()      // 登录成功后再拉购物车
```

⚠️ **和 Vuex 的差别**：vuex 的 `dispatch` 也返回 Promise，但当时你要 `await store.dispatch('login')`。Pinia 里就是**调方法**，`await store.login()`。**少一层字符串，少一个拼错的机会。**

### 1.7 action 之间互相调用

```js
function addItem(item) {
  list.value.push(item)
  saveCount()                    // setup 式：直接调
}
```

选项式里是 `this.saveCount()`（注意还是那个坑：**不能是箭头函数**）。

---

## 2. storeToRefs：解构的正解（157）🔥

### 2.1 先把上一篇那个坑复现一遍

```js
const store = useCounterStore()
const { count } = store          // ❌ count 是「0 这个数字」
count++                          // 改本地变量，store 没动
```

**根因**：`store` 是 reactive 对象，**解构就是一次读取**，读完关系就断。

**但它长得太无辜了** —— 模板里写 `{{ count }}` 比 `{{ store.count }}` 干净，所以你还是会想解构。

### 2.2 `storeToRefs` 做什么

```js
import { storeToRefs } from 'pinia'

const store = useCounterStore()
const { count, double } = storeToRefs(store)     // ← 拿到的是 ref

count.value++                                     // ✅ store 真的变了
```

```html
<template>
  <p>{{ count }} / {{ double }}</p>    <!-- 模板自动解包，和普通 ref 一样 -->
</template>
```

**原理一句话**：它不是「取值」，是「造一个指向 store 那个属性的引用」。

```
普通解构：  store.count  →  拿走 0          （关系断了）
storeToRefs: store.count →  造一个 ref，读写都转给 store.count  （关系一直在）
```

**C# 对照**：普通解构像 `var c = obj.Count;`（值拷贝）；`storeToRefs` 像拿到一个 `Func<int>` + `Action<int>` 的合体，**读和写都回到原对象上**。.NET 里没有直接对应物 —— 这是 JS 代理才能做出来的东西。

### 2.3 关键细节：它**只**转 state 和 getters

```js
const { count, double, add } = storeToRefs(store)
//      ✅ state  ✅ getters  ❌ undefined
```

**actions 不在里面。** 为什么？

| 类型 | 需要包成 ref 吗 | 理由 |
|---|---|---|
| state | ✅ 需要 | 值会变，要追 |
| getters | ✅ 需要 | 派生值会变，要追 |
| **actions** | ❌ **不需要** | **它是函数，函数本身不会「变」**（你永远不会 `add = 另一个函数`） |

**所以 actions 直接解构就行**（函数解构不丢什么）：

```js
const { count, double } = storeToRefs(store)    // ← 响应式的
const { add } = store                           // ← 函数，直接取
```

**但更常见的写法是干脆不解构 actions**：`store.add()`。少一行，也不会看错。

### 2.4 别拿 `toRefs` 顶替

```js
import { toRefs } from 'vue'

const { count, add } = toRefs(store)     // ⚠️ 能用，但 add 变成了 ref
add.value()                              // ← 必须这么调，还容易丢 this（选项式 store）
```

**`toRefs` 是「无差别全转」**，它不知道 `add` 是函数。`storeToRefs` 是 Pinia 提供的**有判断版本** —— 它内部只挑 `state` 和 `getters`。

| | `toRefs(store)` | `storeToRefs(store)` |
|---|---|---|
| state / getters | ✅ 转成 ref | ✅ 转成 ref |
| actions | ⚠️ **也转**（函数被包成 ref） | ✅ **跳过** |
| `$patch` 等内置 | ⚠️ 也转 | ✅ 跳过 |
| 该用哪个 | 别用在 store 上 | **store 专用** |

**记忆口诀：`storeToRefs` 的 `store` 前缀就是在说「我知道 store 长什么样」。**

### 2.5 什么时候真的需要它

| 场景 | 用不用 |
|---|---|
| 组件里只读几个字段，模板嫌 `store.` 长 | ✅ 用 |
| 要把 store 的字段传给 composable / 子组件 | ✅ 用（不丢响应式） |
| `v-model` 绑 store 的某个字段 | ✅ 用（`v-model="count"` 需要可写 ref） |
| 只用一个字段 | ❌ 直接 `store.count` 更清楚 |
| 要用 actions | ❌ 不用，直接 `store.add()` |

**重要的一条：`storeToRefs` 返回的 ref 是「可写」的。**

```js
const { count } = storeToRefs(store)
count.value = 10                 // ✅ 直接改到 store
```

**所以它能接 `v-model`** —— 这也是它比 `computed(() => store.count)` 强的地方（后者只读，`v-model` 会报无 setter）。

### 2.6 一个反直觉的边界

```js
const { user } = storeToRefs(store)      // user 是 ref，指向 store.user 这个 reactive 对象
user.value.name = 'x'                    // ✅ 深层也生效
user.value = { name: 'y' }               // ✅ 整体替换也生效
```

**都能改，因为 ref 的读写都转给了 `store.user`。** 但注意：

```js
const { name } = store.user              // ❌ 这是「从 reactive 对象里解构」，又丢响应式
```

**`storeToRefs` 只保证它自己那一层。** 再往下拆，规则回到 Vue3--02 的 `reactive` 解构。**「包」和「拆」永远成对出现，拆一次就断一次。**

---

## 3. 持久化（158）

### 3.1 为什么需要：store 活在内存里

```
刷新页面 → JS 全部重跑 → createPinia() 重建 → 所有 state 回到初始值
```

**这不是 bug，是 SPA 的物理事实**：store 没有磁盘，页面一刷就清空。所以这些东西必须落盘：

| 要落盘 | 为什么 |
|---|---|
| token / 登录态 | 否则每次刷新都要重新登录 |
| 用户信息、主题、语言 | 否则每次刷新闪一下默认值 |
| 购物车（未登录时） | 否则加了一堆东西刷新就没了 |
| 草稿、表单临时数据 | 意外关闭能恢复 |

**你在 `Vue--15` 手写过一遍**：`localStorage.setItem('token', ...)` + 请求拦截器里读。那时候是**一个字段一个字段手动管**。

### 3.2 方案一：手写（够用版）

```js
// 读：初始化时
const count = ref(Number(localStorage.getItem('count') ?? 0))

// 写：监听变化
watch(count, (v) => localStorage.setItem('count', String(v)))
```

**三个毛病：**

| 毛病 | 说明 |
|---|---|
| **类型丢失** | localStorage 只能存字符串，`number` 要转、对象要 `JSON.stringify` |
| **每加一个字段就要加一段** | 十个字段二十行，还容易漏 |
| 第一次 watch 不触发 | 初始值不会写回去（一般无所谓，但调试时会困惑） |

**这是「够用」的临界点**：一两个字段（token）手写完全合理，**一多就该上插件**。

### 3.3 方案二：`pinia-plugin-persistedstate`

```bash
npm i pinia-plugin-persistedstate
```

```js
// main.js
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)      // ← 装插件（不是 app.use！）
app.use(pinia)
```

```js
// stores/user.js —— setup store 的第三个参数就是选项
defineStore('user', () => {
  const token = ref('')
  const info = ref(null)
  return { token, info }
}, {
  persist: true,                          // ← 一行开启
})
```

**注意位置**：`persist` 是 `defineStore` 的**第三个参数**，不是第二个。**setup store 写错位置 → 静默不生效**（本轮第 5 条静默失败）。

**选项式 store 是另一回事**（它只有两个参数，`persist` 写在选项对象里）：

```js
defineStore('user', {
  state: () => ({ token: '' }),
  persist: true,                // ← 选项式：塞在选项里
})
```

### 3.4 细配置

```js
persist: {
  key: 'my-user',                       // 存进 localStorage 的键名，默认是 store 的 id
  storage: sessionStorage,              // 换存储（默认 localStorage）
  pick: ['token'],                      // 只存这几个字段（v4 叫 pick，v3 叫 paths）
}
```

| 选项 | 用途 | 场景 |
|---|---|---|
| `key` | 换个名字 | 同一个 store 在不同页面要隔离 |
| `storage` | `localStorage` / `sessionStorage` | 「关浏览器就忘」用 session |
| `pick` | 只存部分字段 | **只存 token，不存整个 user**（减少泄露面） |

⚠️ **`pick` / `paths` 的名字随版本变过**（v3 用 `paths`，v4 改用 `pick`）。你装的是最新版，**写 `pick`**；看到旧教程写 `paths` 不生效就是这个原因。

### 3.5 它的原理（不神秘）

```
store 任何变化 → 插件订阅 $subscribe → 序列化 → 写 storage
应用启动 → 插件读 storage → 反序列化 → $patch 回 store
```

**就这两句。** 没有魔法，只是把 3.2 那段手写代码**自动化 + 加了序列化**。

**验证方法**：打开 Devtools → Application → Local Storage，能看到一个 key 就是 store 的 id，值是 JSON。

### 3.6 五个必须知道的坑

| 坑 | 现象 | 原因 |
|---|---|---|
| **类型不是原样回来** | `Date` 变字符串、`Map`/`Set` 变 `{}`、`undefined` 消失 | JSON 序列化只认基础类型 |
| **结构升级后旧数据有毒** | 页面白屏或字段莫名 `undefined` | 缓存里是旧结构的 JSON，代码按新结构读 |
| **每次都全量写盘** | 大 state 高频变化时卡顿 | 插件默认每次变更都写 |
| **敏感字段落盘** | token 明文在 localStorage，XSS 一抓就走 | localStorage 无任何保护 |
| **服务端没有 localStorage** | SSR / Node 构建时报 `localStorage is not defined` | 那是浏览器 API |

**第二条最阴**：你改了 store 的字段名（`userName` → `username`），**本地缓存里还是旧的**，于是新代码读到 `undefined`，**刷新也修不好**（缓存还在）。**排查时的第一步：清一下 localStorage。**

**解法（够用版）**：开发期直接清缓存；要兼容老用户就加版本号 + 迁移函数（这个超出本轮范围，用到再单开）。

---

==二：格式==

## 1. 速查表

| API | 用法 | 关键点 |
|---|---|---|
| `async function xxx()` 定义 | 直接写，不用 `defineAction` | 返回 Promise，可 `await` |
| `try / finally` | `finally` 里关 loading | **不能写在 catch 里** |
| `if (loading.value) return` | 防重第一道 | 一份状态两用 |
| `storeToRefs(store)` | 拆 state + getters | **不含 actions** |
| `store.add()` | 调 action | 不用拆 |
| `pinia.use(plugin)` | 装持久化插件 | **不是 `app.use`** |
| `persist: true` | setup store **第 3 个参数** | 位置错 → 静默失效 |
| `persist: { pick: [...] }` | 只存部分字段 | v4 用 `pick` |

## 2. 三件事的分工

| 我想… | 放哪 | 别放 |
|---|---|---|
| 发请求、拿数据 | **store 的 action** | 组件里（会散落十份） |
| 展示 loading | store 的 state + 组件读 | 组件自己 `ref(false)`（同一份数据要同步两次） |
| 错误提示 | store 存 `error` + 组件 watch 弹 toast | store 里直接调 `Toast()`（UI 依赖进 store，不可测） |
| 刷新后还在 | `persist` | 手写一堆 `localStorage` |

**最后一行那条原则值得单独记**：**store 不碰 UI**。弹窗、toast、跳路由都在组件里做，store 只负责「数据和状态」。**否则你换一个 UI 库，store 就得改。**

---

==三：代码==

## 1. 异步 action 的标准骨架（直接抄）

```js
// stores/list.js
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getListApi } from '@/api/list'

export const useListStore = defineStore('list', () => {
  const list = ref([])
  const loading = ref(false)
  const error = ref('')

  async function loadList(params) {
    if (loading.value) return            // 防重
    loading.value = true
    error.value = ''
    try {
      const res = await getListApi(params)
      list.value = res.data
    } catch (e) {
      error.value = e.message || '加载失败'
      // 不 throw：这里只要求"能显示错误"
    } finally {
      loading.value = false              // ← 成败都关
    }
  }

  return { list, loading, error, loadList }
})
```

```html
<!-- 组件：只管展示 -->
<script setup>
import { onMounted } from 'vue'
import { useListStore } from '@/stores/list'
const store = useListStore()
onMounted(() => store.loadList())
</script>

<template>
  <p v-if="store.loading">加载中…</p>
  <p v-else-if="store.error">{{ store.error }}</p>
  <ul v-else><li v-for="i in store.list" :key="i.id">{{ i.name }}</li></ul>
</template>
```

**注意组件里一个 `ref` 都没有** —— 全是 `store.xxx`。这就是 3.2 那张表想达到的效果。

## 2. `storeToRefs` 前后对照

```js
// ❌ 丢了响应式
const { count, double } = useCounterStore()

// ✅ 正确
const { count, double } = storeToRefs(useCounterStore())
const store = useCounterStore()                  // actions 还是从 store 拿
// 或更省事：count/double 用 refs，动作直接 store.add()
```

**一个能验证的细节**：`storeToRefs` 之后 `count` 是 `ObjectRefImpl`（不是普通 ref），但它**可写**：

```js
count.value = 99        // ← store.count 也跟着变，Devtools 里能看到
```

## 3. 持久化完整配置

```js
// main.js
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
```

```js
// stores/user.js
export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const info = ref(null)
  function logout() { token.value = ''; info.value = null }
  return { token, info, logout }
}, {
  persist: {
    key: 'pet-user',
    pick: ['token'],          // ← 只存 token，info 每次重新拉（更安全、更符合数据新鲜度）
  },
})
```

**为什么只存 `token` 不存 `info`？**

| 存 info 的问题 | 说明 |
|---|---|
| 数据会过期 | 缓存里的昵称/头像可能早改了 |
| 私密信息落盘 | 手机号、邮箱明文躺在 localStorage |
| 结构升级 | 后端加字段后旧缓存不完整 |

**惯例：持久化「凭据」，不持久化「内容」。** 凭据（token）换不来最新的内容，那就每次进来重新拉一次 —— **一个请求的成本，换数据永远新鲜。**

---

==四：总结==

## 1. 一句话记住三个

- **action 就是 async 函数**：`try` 干活、`finally` 关 loading、`loading` 顺手当防重闸。
- **要解构 store 就用 `storeToRefs`**，它只拆 state + getters，**actions 直接 `store.add()`**。
- **持久化只存「凭据」，不存「内容」**；配置在 setup store 的第 **3** 个参数里。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| action 能直接改 state 吗 | ✅ 能，**不需要 mutation** |
| 关 loading 写哪 | **`finally`**，不是 `catch` |
| loading 的第二个用途 | 防重闸 `if (loading.value) return` |
| action 返回值 | **Promise**，可以 `await store.xxx()` |
| `storeToRefs` 拆什么 | **state + getters**，不含 actions、不含 `$patch` |
| `storeToRefs` 返回的 ref 可写吗 | ✅ **可写**，所以能接 `v-model` |
| 能不能用 `toRefs` 代替 | ❌ actions 会被包成 ref |
| 拆几层算安全 | **只安全一层**；再往下拆回到 `reactive` 解构规则 |
| 持久化插件的安装 | `pinia.use(plugin)`，**不是 `app.use`** |
| `persist` 写哪（setup store） | **`defineStore` 第 3 个参数** |
| 只存部分字段 | `pick: ['token']`（v4；v3 叫 `paths`） |
| 持久化的取舍 | **存凭据，不存内容** |
| JSON 序列化丢了什么 | `Date`、`Map`/`Set`、`undefined`、函数 |

## 3. ⭐ 收敛时刻

**这一轮把 Vue3 整条线的四个散点接上了：**

**① 上一篇的「解构丢响应式」→ 正解出现了**

```
普通解构：拿走值，关系断
storeToRefs：造引用，关系在
```

**回头看这一路的同一个坑：**

| 场景 | 错误写法 | 正解 |
|---|---|---|
| Vue3--02 `reactive` | `const { a } = reactive({a:1})` | `toRefs` / 直接用 |
| Vue3--05 `provide` | `provide(k, count.value)` | 传 `count` 本身 |
| Pinia--01 store | `const { count } = store` | **`storeToRefs`** |

**三个场景，三次「把值取出来」。** 现在你应该能在看到 `const { ... } =` 的瞬间警觉 —— 这是这五篇里最值钱的一个条件反射。

**② `Vue--14/15` 的「loading + finally + 防重」→ 换到 store 里，一模一样**

当时这些逻辑写在组件里，每个页面抄一遍。现在它们**只写一次**，所有组件共享同一份 `loading`。

**这就是状态管理省下的东西**：不是省代码行数，是省「同一份逻辑被抄十遍之后的十种略有不同的实现」。

**③ `Vue--15` 的「token 手动 localStorage」→ 抽象成插件配置**

| 那时 | 现在 |
|---|---|
| `localStorage.setItem('token', t)` | `persist: { pick: ['token'] }` |
| 请求拦截器里 `localStorage.getItem` | `store.token`（插件启动时已灌回） |
| 每加一个字段加两行 | 加进 `pick` 数组 |

**你没有学新东西，你只是把学过的东西交给了一个自动化。** 这也是「框架演进」一贯的样子：**先手动做一遍（知道代价），再交给抽象（知道它在替你做什么）。**

**④ 一个可以带走的方法论：判断「该不该进 store」**

跑完这七篇，你手上有一条完整的判据链：

| 问题 | 是 → | 否 ↓ |
|---|---|---|
| 只有这个组件用？ | 组件内 `ref` | 往下 |
| 父子一层？ | `props` / `emit` | 往下 |
| 祖孙、单条链、只读为主？ | `provide/inject` | 往下 |
| 跨分支 / 跨文件 / 要调试？ | **Pinia** | — |
| 刷新后还要在？ | + `persist` | — |

**这张表比任何一篇笔记都值得夹在手边。** 因为它回答的不是「怎么写」，是「**写在哪**」—— 而后者才是你在真实项目里每天要做的决定。

## 4. 静默失败清单

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `catch` 里关 loading，不用 `finally` | 请求失败后永远转圈 | 失败路径没执行到那行 |
| 2 | `catch {}` 空着 | 调用方以为成功 | 错误被吞 |
| 3 | `storeToRefs` 里解构 action | `undefined` | actions 不在返回值里 |
| 4 | 用 `toRefs(store)` 代替 | `add.value is not a function` | 函数被包成 ref |
| 5 | `storeToRefs` 后继续解构嵌套 | 深层不响应 | 只保证第一层 |
| 6 | `persist: true` 写成第 2 个参数 | **完全不生效，零提示** | setup store 的选项在第 3 个 |
| 7 | 插件只 `import` 没 `pinia.use()` | `persist` 配置被忽略 | 没有插件处理这个字段 |
| 8 | 旧教程的 `paths: [...]` | 不生效 | v4 改叫 `pick` |
| 9 | 存了 `Date` / `Map` | 读回来是字符串 / `{}` | JSON 序列化限制 |
| 10 | 改了 state 字段名但没清缓存 | 新代码读到 `undefined`，**刷新也不好** | 旧结构 JSON 还在 |
| 11 | SSR / Node 里用 `persist` | `localStorage is not defined` | 那是浏览器 API |
| 12 | action 里直接弹 toast / 跳路由 | 能跑，但 store 绑死了 UI | 违反「store 不碰 UI」 |

**第 1、6、10 条是重灾区。** 工程上怎么防：

- **`finally` 当肌肉记忆**：只要函数开头有 `loading.value = true`，结尾无条件补一行 `finally`；
- **`persist` 写完立刻去 Devtools → Application → Local Storage 看一眼有没有那个 key** —— 有 key 才是真生效，这是唯一的验证方法；
- **调试「字段莫名 undefined」时，第一动作是清 localStorage**，别急着怀疑代码。

**这不是 bug，是代价。** store 活在内存、storage 活在磁盘、JSON 只认基础类型 —— 三者之间的每一道转换都会丢东西，而**每一道都不报错**。

## 5. C# 类比可用度

| C# / .NET 侧 | Pinia 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `async Task LoadAsync()` | `async function load()` | ⭐⭐⭐ | **完全同构**：返回 Task ↔ 返回 Promise |
| `try / catch / finally` | 同 | ⭐⭐⭐ | 连语义都一样，`finally` 必执行 |
| `CancellationToken` 防重 / 幂等 | `if (loading.value) return` | ⭐⭐ | .NET 那套更严谨；Vue 这版是够用版 |
| `JsonSerializer.Serialize/Deserialize` | 插件的序列化 | ⭐⭐⭐ | **丢类型这事一模一样**：`DateTime` 也会变字符串 |
| EF Core 的 `SaveChanges` 自动持久化 | `persist` 自动落盘 | ⭐⭐ | 形似：都是「你只管改内存，它负责落盘」 |
| `IDistributedCache` / Redis | `storage` 选项 | ⭐⭐ | 都是「换个后端存」，但 Vue 只能选两种 |
| 属性通知订阅（`PropertyChanged`） | `$subscribe`（插件内部用） | ⭐⭐ | 插件就是靠它实现自动同步的 |
| **`storeToRefs`** | — | ❌ | **.NET 没有对应物**：引用语义天然存在，不需要「造引用」这一步 |

**用法建议**：`action` 直接当成 `async Task` 方法读，`try/finally` 一个字都不用改。**`storeToRefs` 别硬套 C#** —— 它的存在恰恰证明了 JS 缺什么：**没有引用语义，只能造一个代理来模拟**。

## 6. 解锁边界

**本轮新解锁**

- async action 的完整骨架（loading / error / 防重 / `finally`）
- action 返回 Promise、可 `await`、可互相调用
- 「store 不碰 UI」的分工原则
- `storeToRefs`：拆什么、不拆什么、返回可写 ref、只保证一层
- `toRefs` 与 `storeToRefs` 的差别
- `pinia-plugin-persistedstate`：安装（`pinia.use`）、`persist` 的位置、`key`/`storage`/`pick`
- 持久化的取舍原则（存凭据不存内容）与五个坑

**仍然锁着**

| 内容 | 状态 |
|---|---|
| `$subscribe` / `$onAction` 的详细用法 | 课程未讲，插件内部用到，要单开 |
| 持久化的版本迁移（`version` + `migrate`） | 课程未讲，结构升级时才需要 |
| 自定义序列化器（存 `Date`） | 课程未讲 |
| 循环依赖、store 拆分的粒度 | 课程未讲，项目变大再谈 |
| **159-197：Vue3「大事件」实战项目（39 集）** | **全新项目，见 7** |
| React（81-92 的预习篇） | 仍锁着 |

⚠️ **术语撞车登记**：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `persist` | 泛指「持久化」 | 插件的**固定配置键** | 只在 `defineStore` 第 3 参数里 |
| `pick` / `paths` | 数组选字段 | 同名不同版本 | **v4 `pick`，v3 `paths`** |
| `$subscribe` | Pinia 的监听 API | 你自己 `watch` store | 前者精度更高（能拿到 mutation 信息） |

## 7. 下一轮预告

**Vue3 主线到此结束（140-158）。** 158 之后课程进入 **159-197：Vue3「大事件」实战项目**（39 集，约 8 小时），从 `pnpm` 建项目、ESLint + Prettier、husky 提交检查，一路做到完整后台管理系统。

**这是一个决策点，三种走法：**

| 走法 | 适合 | 代价 |
|---|---|---|
| **A. 跟着做完 39 集** | 想要「一个完整 Vue3 项目」的履历和肌肉记忆 | 8 小时课程 + 更长的实操时间 |
| **B. 跳过，回项目** | 现在最缺的是「自己写过一遍」 | 少一套工程化脚手架的经验 |
| **C. 只挑工程化那几集（159-162）** | 想学 pnpm / ESLint / husky / 目录规范 | 半途而废，项目结构只学一半 |

**我的判断（你可以不同意）**：你现在的状态是「**学了 7 篇组合式 + Pinia，但 DesktopPet 还停在第 2 步**」。**继续看 39 集不会让你多会一点，但做完项目第 2-4 步会让你第一次真正「用上」这七篇。**

所以建议 **B 优先、C 次之**：先回项目把第 2、3、4 步做掉（`v-for` / `v-model` / `watch` + `onUnmounted`），**在真实代码里把这七篇踩一遍**，之后再决定要不要补工程化（159-162 那四集，pnpm + ESLint + husky，是独立可拆的）。

⚠️ **无论选哪条，都建议新开对话** —— 本篇是 Vue3 组合式主线的收尾，下一段是新项目，上下文不通用。
