# Vue--10 · mutations / mapMutations / actions / getters / 分模块与命名空间

> **对应课程**：095-099（黑马 `BV1HV4y1a7n4`，5 集 / 约 2 小时 15 分）
> **读法**：这是整章最长的一轮，但**只有四个概念**：怎么改（mutations）、怎么异步地改（actions）、怎么算（getters）、怎么切（modules）。前三个各占一节，第四个占两节。**读的时候不要平均用力**——§6 那张"带不带前缀"的表是唯一会把你绕晕的地方。
> **本轮定位**：Vue--09 你只打通了"读"。这一轮补齐"写"，并且让仓库能按业务拆开。**结束之后 vuex 就学完了**，剩下的 100-105 只是实战。
> **这一轮偏长（5 集塞四个概念），建议分两次读**：第一次 §1-§2（mutations）+ §3（actions），第二次 §4（getters）+ §5-§6（分模块）。§6.2 那张表**单独抄一遍**，它是分模块的唯一门槛。
> **前置**：Vue--09（空仓库 + state 访问）。这一轮所有代码都写在那四个空对象里。

---

==一：概念==

## 1. mutations：唯一的改法（095）

### 1.1 语法三件套

```js
mutations: {
  addCount (state) { state.count++ }
}
```

```js
methods: {
  handleClick () { this.$store.commit('addCount') }
}
```

三件事必须同时对上，少一个都不生效：

| 位置 | 写什么 | 注意 |
|---|---|---|
| `mutations` 里的**函数名** | `addCount` | 这个名字就是"账本条目名" |
| 函数的**第一个参数** | `state` | **框架传给你的，不能改名换位** |
| 调用 | `commit('addCount')` | 名字必须一字不差，**拼错不报错** |

> 🔴 **拼错是静默失败**：`commit('addcount')` 不会抛异常，只会在控制台打一行：
> `[vuex] unknown mutation type: addcount`
> 如果控制台被你的 `console.log` 淹了，你会以为"按钮点了没反应"。

### 1.2 payload：只能传**一个**值

mutation 的签名固定是 `(state, payload)`，**没有第三个参数**。想传多个值，包成对象：

```js
addNum (state, n) { state.count += n }              // 单个值
addBoth (state, { n, step }) { state.count += n * step }  // 多个值 → 对象
```

```js
this.$store.commit('addNum', 10)
this.$store.commit('addBoth', { n: 10, step: 2 })
```

> ⚠️ **`commit('addBoth', 10, 2)` 是错的**：第三个参数被直接丢弃，`payload` 只有 `10`，解构 `{ n, step }` 得到 `undefined`，算出 `NaN`。**不报错，只是数字变成 NaN。**

### 1.3 对象风格提交

```js
this.$store.commit({ type: 'addBoth', n: 10, step: 2 })
```

这时候 **`payload` 是整个对象**（含 `type`）：

```js
addBoth (state, payload) { state.count += payload.n * payload.step }
```

| 写法 | mutation 收到的 payload |
|---|---|
| `commit('addBoth', { n: 10 })` | `{ n: 10 }` |
| `commit({ type: 'addBoth', n: 10 })` | `{ type: 'addBoth', n: 10 }` |

**第二种把 `type` 也塞进去了**，所以别在里面解构整个 payload 名字。**日常用第一种就够，第二种知道有这回事即可。**

### 1.4 🔴 为什么必须同步

这是 095 那 36 分钟里最核心的一句解释：

```
devtools 的工作方式：
  commit('addCount')
    → 执行 mutation
    → ★立刻★ 拍照：{ count: 1 }
    → 存进历史记录
```

**它靠"mutation 函数执行完 = 数据改完了"这个假设在拍照。** 一旦你在 mutation 里写 `setTimeout`：

```
commit('addCount')
  → 执行 mutation（只注册了定时器，此刻 count 还是 0）
  → 拍照：{ count: 0 }        ← 拍到了旧值
  → …… 1 秒后回调才真的 count++
  → 没有任何人被通知要重新拍照
```

结果：**devtools 里的记录是错的，时间旅行到这一步会还原成"没改"的状态。**

| 写在哪 | 能异步吗 | 谁来记账 |
|---|:--:|---|
| `mutations` | **不能** | 自己（每次 commit 一条） |
| `actions` | 能 | **先异步，最后 commit → mutation 记账** |

> 这不是"Vuex 技术上禁止"——你写 `setTimeout` 在 mutation 里**照样能跑，数据照样改成功**。禁止的是**规矩**，坏掉的是**账本**。跟 Vue--09 §4.5 完全同一种病：**能改 ≠ 该改**。

### 1.5 mutation 里有没有 `this`

有，但**只有写成普通函数**时：

```js
mutations: {
  addCount (state) { this.state.count++ }   // this 指向 store 实例
}
```

**别用。** 理由：官方文档明确说"不要在 mutation 里用 `this`"，因为它让函数无法独立测试，而且箭头函数里 `this` 是 `undefined`，两种写法行为不一致。

### 1.6 命名约定

课程用驼峰 `addCount`。官方文档给过另一种风格：**全大写常量**。

```js
export const ADD_COUNT = 'ADD_COUNT'
mutations: { [ADD_COUNT] (state) { ... } }
```

好处：调用处 `commit(ADD_COUNT)` 有 IDE 跳转、拼错直接红。代价：多一个文件、名字重复两遍。

**课程不用这套，你也不用。** 知道有这个流派即可——接手大厂代码时可能撞见。

---

## 2. mapMutations：一句话的事（096）

### 2.1 本质

```js
import { mapMutations } from 'vuex'

methods: {
  ...mapMutations(['addCount'])
}
```

**等价于手写**：

```js
methods: {
  addCount (payload) { this.$store.commit('addCount', payload) }
}
```

就这样。7 分钟的一集，全部内容就这一句。它的价值和 `mapState` 一样：**少写样板**。

### 2.2 两种写法和带参数

```js
methods: {
  ...mapMutations(['addCount']),               // 同名
  ...mapMutations({ add: 'addNum' })           // 改名
}
```

带参数时**直接当函数调**，传的东西自动变成 `payload`：

```html
<button @click="add(10)">+10</button>
```

```js
add (payload) { this.$store.commit('addNum', payload) }   // 内部就是这样
```

**所以"带参数"根本不需要额外语法**——`mapMutations` 生成的函数本来就有 `payload` 形参。

### 2.3 和 `mapState` 的对称性（背这张表就够）

| | `mapState` | `mapMutations` |
|---|---|---|
| 放进哪个选项 | **`computed`** | **`methods`** |
| 为什么 | 读数据要缓存、要响应 | 是动作，不是值 |
| 数组写法 | `...mapState(['count'])` | `...mapMutations(['addCount'])` |
| 对象写法 | `...mapState({ n: 'count' })` | `...mapMutations({ add: 'addCount' })` |
| 内部实现 | `this.$store.state[key]` | `this.$store.commit(key, payload)` |

> ⚠️ **放错地方会静默坏掉**：把 `mapState` 放进 `methods`，`{{ count }}` 永远是 `undefined`；把 `mapMutations` 放进 `computed`，`@click="addCount"` 触发的是"计算属性求值"，**什么都不会提交**，也不报错。

---

## 3. actions：异步的入口（097 前半）

### 3.1 为什么需要它

既然 mutations 不能异步，那"点按钮 → 等 1 秒 → 数字变"该写在哪？

**写在组件里也能work**，但代价是：逻辑散落在组件、无法复用、无法测试。actions 就是**把异步流程收进仓库**。

```js
actions: {
  addAsync (context, n) {
    setTimeout(() => { context.commit('addNum', n) }, 1000)
  }
}
```

```js
this.$store.dispatch('addAsync', 5)
```

**对照 mutations**：名字换了（`dispatch` 而不是 `commit`），第一个参数换了（`context` 而不是 `state`），其余一模一样。

### 3.2 🔴 `context` 是什么，不是什么

```js
actions: {
  demo (context) {
    console.log(context)
  }
}
```

| `context` 有 | 说明 |
|---|---|
| `context.state` | 当前模块的 state |
| `context.getters` | getters |
| `context.commit` | **改数据必须用它** |
| `context.dispatch` | 调别的 action |
| `context.rootState` / `rootGetters` | 根级 state / getters（分模块后才用得上） |

**`context` 不是 store 本身。** 区别：`context` 没有 `commit` 之外的"直接改 state"的能力，也没有 `subscribe`、`replaceState` 这些实例方法。**它是一张"给 action 用的受限门禁卡"**。

日常几乎都写成解构：

```js
actions: {
  addAsync ({ commit }, n) {
    setTimeout(() => commit('addNum', n), 1000)
  }
}
```

> 🟡 **解构后 `commit` 是可以脱离 `context` 单独传的**：`setTimeout(() => commit(...))` 能跑，因为 `commit` 内部已经绑定了 store。这一点跟 Vue 实例方法不同（`this.fn` 拔出来会丢 `this`）。

### 3.3 `dispatch` 返回 Promise

```js
actions: {
  async loadUser ({ commit }) {
    const res = await fetch('/api/user')
    commit('setUser', await res.json())
    return 'ok'                     // ← 想拿到返回值，必须 return
  }
}
```

```js
async handleClick () {
  const r = await this.$store.dispatch('loadUser')
  console.log(r)                    // 'ok'
}
```

| 事实 | 说明 |
|---|---|
| `dispatch` **总是**返回 Promise | Vuex 3.x 起，即使 action 是同步的 |
| 不 `return` 就拿不到值 | 拿到的是 `undefined` |
| action 写成 `async` 完全合法 | 里面 `await`，外面 `await dispatch` |

> 💡 **这条是 vuex 最像 C# 的地方**：action ≈ 一个 `async Task<T>` 的应用服务方法，`dispatch` ≈ 调用它并 `await`。而 **mutation ≈ 一个同步的、必须立刻写完的 `SaveChanges()`**。

### 3.4 `mapActions`

和 `mapMutations` 同模子，落 `methods`：

```js
methods: {
  ...mapActions(['addAsync'])
}
```

```js
this.addAsync(5)     // 等价 this.$store.dispatch('addAsync', 5)
```

### 3.5 actions 里直接改 state 也算违规

```js
actions: {
  bad ({ state }) { state.count++ }     // 能跑，devtools 无记录
}
```

**actions 不是"可以随便改数据的地方"**，它只是"可以把异步放进去的地方"。改数据这件事，**从头到尾只有 mutations 一个入口**。

---

## 4. getters：state 的 computed（097 后半）

### 4.1 是什么

```js
getters: {
  doubleCount (state) { return state.count * 2 }
}
```

```html
<p>{{ $store.getters.doubleCount }}</p>
```

**就是 computed，只不过数据源是 store 的 state。** 你在 Vue--02 学的一切关于 computed 的性质，这里全部成立：

| computed | getters |
|---|---|
| 依赖变了才重算 | 同 |
| 不能有副作用 | 同 |
| 结果被缓存 | 同 |
| 用在模板里 | 同 |

> ⚠️ **"缓存"这一条值得亲手验一次**（实验 D）：在 getter 里 `console.log` 一行，改无关数据 → 不打印；改它依赖的数据 → 打印。**这是 getters 存在的唯一理由**：没有它，你在模板里写 `$store.state.list.filter(...)`，每次重渲染都重算一遍。

### 4.2 两个参数

```js
getters: {
  doneCount (state) { return state.list.filter(i => i.done).length },
  summary (state, getters) { return `${getters.doneCount}/${state.list.length}` }
}
```

| 参数 | 是什么 |
|---|---|
| 第一个 | 当前模块的 `state` |
| 第二个 | **整个 `getters` 对象**（可以依赖别的 getter） |

分模块后还有第三个 `rootState`（见 §6.4）。

### 4.3 返回函数的 getter：不缓存

```js
getters: {
  findById: (state) => (id) => state.list.find(i => i.id === id)
}
```

```js
this.$store.getters.findById(3)
```

**用途：需要传参的时候。** 想按 id 取一条，`getters.findXxx` 没法传参，只能返回一个函数。

> 🔴 **代价：它不缓存。** getter 缓存的是"`findById` 这个属性的值"，而这里每次求值都是一个**新函数**，调用新函数自然每次重算。所以**别把它当优化手段**，它只是"让 getter 能带参数"的写法。

### 4.4 `mapGetters`

```js
import { mapGetters } from 'vuex'

computed: {
  ...mapGetters(['doubleCount']),
  ...mapGetters({ double: 'doubleCount' })
}
```

同样落 `computed`（因为它就是 computed）。

> 🟡 **`mapState` 和 `mapGetters` 都进 `computed`，它们会打架吗？** 不会，只要 key 不同。但**如果两者映射出同一个 key，后写的静默覆盖**——和 Vue--09 §4.4 同一个坑。

---

## 5. 分模块：为什么要切（098）

### 5.1 单文件的极限

前面所有代码都写在 `store/index.js` 里。到了真实项目：

| 业务块 | state | mutations | actions | getters |
|---|:--:|:--:|:--:|:--:|
| 用户（登录/token/资料） | 5 | 6 | 4 | 2 |
| 商品（列表/详情/筛选） | 4 | 3 | 3 | 3 |
| 购物车 | 2 | 5 | 2 | 4 |
| 订单 | 3 | 4 | 3 | 1 |

**加起来一个文件 50+ 个函数**，滚轮滚三屏找不到 `addCount`。这不是"不优雅"，是**没法维护**。

**分模块就是按业务把上面这四个对象各切一份，一个业务一个文件。**

### 5.2 模块文件结构

`src/store/modules/user.js`：

```js
export default {
  state: () => ({ name: '', token: '' }),
  mutations: { setName (state, n) { state.name = n } },
  actions: {},
  getters: {}
}
```

`src/store/index.js`：

```js
import user from './modules/user'

export default new Vuex.Store({
  modules: { user }        // ← key 就是模块名
})
```

### 5.3 🔴 模块的 `state` **必须写成函数**

这是 098 那 12 分钟里唯一必须记住的点：

```js
state: () => ({ name: '' })     // ✅ 每个模块实例拿到独立对象
state: { name: '' }             // ⚠️ 大家共用同一个对象
```

| 为什么根 state 可以是对象，模块 state 要是函数 | |
|---|---|
| 根 state | 全项目只有一个 Store，`new` 一次，不需要"每次新建一份" |
| 模块 state | 模块是**可复用的零件**（同一个模块可以被注册到两个 Store、SSR 里每个请求要一份） |

**这不是理论洁癖。** 写成对象时，如果你把同一模块注册两次（`modules: { user, adminUser: userModule }`），两个模块会**共享同一个 state 对象**——改 A 时 B 跟着变，零报错。写成函数就没这个问题。

> 这和组件 `data` 必须是函数是**完全同一个道理**（Vue--09 §4.1 提过）：**要多个实例，就得每次给你一个新对象。**

### 5.4 默认注册是"全局"的，会撞名

**这是分模块最容易翻车的地方。** 默认情况下（不加命名空间），模块里的 mutation / action / getter 全都**平铺注册到根上**：

```js
// user 模块里有 setName
// cart 模块里也有 setName
modules: { user, cart }
```

```js
this.$store.commit('setName', '张三')    // ← 谁执行？
```

**两个都叫 `setName`，后注册的覆盖前一个。** 而且：

- **不报错**；
- **改错了数据**（你以为在改 user，其实改的 cart）；
- 你 debug 半天以为是"vuex 抽风"。

**这就是 099 那 49 分钟存在的理由：命名空间。**

---

## 6. 命名空间（099）

### 6.1 开一个开关

```js
export default {
  namespaced: true,          // ← 就加这一行
  state: () => ({ name: '' }),
  mutations: { setName (state, n) { state.name = n } }
}
```

加了之后：

| 变化 | 之前 | 之后 |
|---|---|---|
| mutation 名字 | `setName` | **`user/setName`** |
| getter 名字 | `doubleName` | **`user/doubleName`** |
| action 名字 | `login` | **`user/login`** |
| state 路径 | `state.user.name` | `state.user.name`（**不变**） |

### 6.2 🔴 唯一会把你绕晕的表（背它）

**这张表是 099 的全部内容。** 记住左边两列，右边两列是"要不要加前缀"。

| 你要访问的 | 无 `namespaced` | 有 `namespaced: true` |
|---|---|---|
| **state**（模板/脚本） | `$store.state.user.name` | `$store.state.user.name`<br>**永远带模块名，开关无关** |
| **getters** | `$store.getters.doubleName` | `$store.getters['user/doubleName']` |
| **mutations** | `commit('setName', v)` | `commit('user/setName', v)` |
| **actions** | `dispatch('login', v)` | `dispatch('user/login', v)` |
| `mapState` | `mapState({ name: s => s.user.name })` | `mapState('user', ['name'])` |
| `mapGetters` | `mapGetters(['doubleName'])` | `mapGetters('user', ['doubleName'])` |
| `mapMutations` | `mapMutations(['setName'])` | `mapMutations('user', ['setName'])` |
| `mapActions` | `mapActions(['login'])` | `mapActions('user', ['login'])` |

**三句口诀**：

> **① `state` 永远要写全路径**（`state.user.xxx`），因为 state 是**对象嵌套**，不是"名字注册"。
>
> **② 只有 `namespaced: true` 时，getters / mutations / actions 才要加 `模块名/`。**
>
> **③ `mapState('user', [...])` 只在开了 namespaced 时才能用**——没开的话报：
> `[vuex] module namespace not found in mapState(): user/`
> 这是**分模块场景下最高频的报错**。

### 6.3 为什么 state 是例外

因为 state 的寻址方式是**按对象路径**（`state.user.name`），而 getters / mutations / actions 的寻址方式是**按注册名字符串**（`'user/setName'`）。

```
state:      state ─┬─ user ─── name        ← 天然分层
mutations:  { setName, addCount, ... }     ← 平铺的字符串表
```

**平铺的表需要"前缀"来避免撞名，嵌套的对象不需要。** 这一句解释完，你就不会再记混了。

### 6.4 跨模块：`rootState` / `rootGetters` / `root: true`

**场景**：购物车模块要读用户模块的 `id`。

```js
// cart 模块的 getter
getters: {
  myCart (state, getters, rootState) {
    return state.items.filter(i => i.userId === rootState.user.id)
  }
}
```

```js
// cart 模块的 action 里调根 action
actions: {
  checkout ({ dispatch, commit }) {
    dispatch('user/logout', null, { root: true })
  }
}
```

| 写法 | 含义 |
|---|---|
| `rootState` | 根 state（第三个参数） |
| `rootGetters` | 根 getters（action 的 `context` 里有） |
| `{ root: true }` | **第三个参数**，让 `dispatch` / `commit` 去根上找 |

> 🔴 `{ root: true }` 的位置很容易记错：它是 `dispatch(type, payload, options)` 的**第三个**参数。写第二个会被当成 payload——**不报错，action 收不到参数，还可能把 `{ root: true }` 当成业务数据**。

### 6.5 嵌套模块

```js
modules: {
  user: {
    namespaced: true,
    modules: {
      profile: { namespaced: true, state: () => ({ bio: '' }) }
    }
  }
}
```

路径就变成 `user/profile/bio`、`'user/profile/setBio'`。

**层数越多，字符串越长，越容易拼错，且拼错大多只打一行 `unknown mutation type`。** 工程上通常**只分一层**，就是这个原因。

---

==二：格式==

## 1. 四个概念的调用对照

| | 提供在哪 | 组件里读/调 | 辅助函数落点 |
|---|---|---|---|
| `state` | `state: {}` | `this.$store.state.x` | `computed` + `mapState` |
| `getters` | `getters: { f (state) {} }` | `this.$store.getters.f` | `computed` + `mapGetters` |
| `mutations` | `mutations: { m (state, p) {} }` | `this.$store.commit('m', p)` | `methods` + `mapMutations` |
| `actions` | `actions: { a (ctx, p) {} }` | `this.$store.dispatch('a', p)` | `methods` + `mapActions` |

## 2. 完整骨架

```js
export default new Vuex.Store({
  state: { count: 0 },
  getters: {
    doubleCount (state) { return state.count * 2 },
    findById: (state) => (id) => state.list.find(i => i.id === id)
  },
  mutations: {
    addCount (state) { state.count++ },
    addNum (state, n) { state.count += n }
  },
  actions: {
    addAsync ({ commit }, n) {
      setTimeout(() => commit('addNum', n), 1000)
    }
  },
  modules: { user, cart },
  strict: process.env.NODE_ENV !== 'production'
})
```

## 3. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| `unknown mutation type: xxx` | 拼错 / 忘加 `模块名/` | 核对 §6.2 |
| `unknown action type: xxx` | 同上 | 同上 |
| `module namespace not found in mapState(): user/` | 模块**没开** `namespaced` 却用了 `mapState('user',...)` | 开 namespaced，或改用函数写法 |
| `getters.xxx is not a function` | 把"返回函数的 getter"当属性用了 | 加括号 `findById(3)` |
| mutation 里数字变 `NaN` | 多个参数只传了第一个 | 包成对象 |
| 按钮点了没反应 | `mapMutations` 放进了 `computed` | 挪到 `methods` |
| devtools 记录错乱 | mutation 里写了异步 | 挪进 actions |

---

==三：代码==

## 1. 实验 A：mutations 的三种传参

```js
mutations: {
  addCount (state) { state.count++ },
  addNum (state, n) { state.count += n },
  addBoth (state, { n, step }) { state.count += n * step }
}
```

```js
this.$store.commit('addCount')
this.$store.commit('addNum', 10)
this.$store.commit('addBoth', { n: 10, step: 2 })
```

**反例（试一次，看到 `NaN` 就懂）**

```js
this.$store.commit('addBoth', 10, 2)    // 第三个参数被丢弃
```

## 2. 实验 B：mutation 里写异步 → devtools 记错

```js
mutations: {
  addLazy (state) {
    setTimeout(() => { state.count++ }, 1000)
  }
}
```

**① 点按钮 → 1 秒后数字变了**
**② 打开 Vue Devtools 的 Vuex 面板** → 有一条 `addLazy` 记录，但**展开它的 state 快照，count 还是旧值**

**③ 结论**：数据对了，账本错了。**这就是"必须同步"的全部理由。**

## 3. 实验 C：actions 的 Promise 返回值

```js
actions: {
  addAsync ({ commit }, n) {
    return new Promise(resolve => {
      setTimeout(() => { commit('addNum', n); resolve('done') }, 1000)
    })
  }
}
```

```js
async handleClick () {
  const r = await this.$store.dispatch('addAsync', 5)
  console.log(r)          // 'done'
}
```

**改成 `async` 也一样**：

```js
actions: {
  async addAsync ({ commit }, n) {
    await new Promise(r => setTimeout(r, 1000))
    commit('addNum', n)
    return 'done'
  }
}
```

**④ 反证**：把 `return` 去掉 → `console.log(r)` 是 `undefined`。

## 4. 实验 D：getters 到底缓不缓存

```js
getters: {
  doubleCount (state) {
    console.log('getter 被求值了')
    return state.count * 2
  }
}
```

**① 页面上再放一个无关的 state（如 `msg`），改 `msg`** → 控制台**不打印**
**② 改 `count`** → 打印

**③ 再对比**：模板里直接写 `{{ $store.state.count * 2 }}`，改 `msg` 时它也会重算（但你不易察觉）

> **这就是 getters 存在的唯一理由**：把"算"这件事从模板搬进缓存层。

## 5. 实验 E：分模块 + namespaced 全链路

**`store/modules/user.js`**

```js
export default {
  namespaced: true,
  state: () => ({ name: '张三', token: '' }),
  getters: {
    welcome (state) { return `欢迎 ${state.name}` }
  },
  mutations: {
    setName (state, n) { state.name = n }
  },
  actions: {
    async login ({ commit }, name) {
      await new Promise(r => setTimeout(r, 500))
      commit('setName', name)
      return 'ok'
    }
  }
}
```

**`store/index.js`**

```js
import user from './modules/user'
export default new Vuex.Store({ modules: { user } })
```

**组件里四种访问各来一次**

```html
<p>{{ $store.state.user.name }}</p>
<p>{{ $store.getters['user/welcome'] }}</p>
<button @click="$store.commit('user/setName', '李四')">改名</button>
<button @click="$store.dispatch('user/login', '王五')">登录</button>
```

**然后全部换成 `mapXXX` 版本**

```js
computed: {
  ...mapState('user', ['name']),
  ...mapGetters('user', ['welcome'])
},
methods: {
  ...mapMutations('user', ['setName']),
  ...mapActions('user', ['login'])
}
```

**④ 反证**：把 `namespaced: true` 注释掉再刷新 → 上面所有带 `user/` 的写法全部报
`unknown mutation type: user/setName` / `module namespace not found in mapState(): user/`。

## 6. 实验 F：验证命名冲突是真的

```js
modules: { user, cart }     // 两个模块都有 setName，都**不加** namespaced
```

```js
this.$store.commit('setName', 'x')
console.log(this.$store.state.user.name, this.$store.state.cart.name)
```

**只有后注册的那个变了。** 加上 `namespaced: true` 后各走各的。

---

==四：总结==

## 1. 一句话记住三个

- **改数据只有一条路**：`commit` → mutation，且 mutation 必须同步。
- **异步只进 actions**，它最后还是要 `commit` 一次。
- **`state` 永远带模块名，其余三个只有开了 `namespaced` 才带前缀。**

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| mutation 签名 | `m (state, payload)`，**只有两个参数** |
| 多参数 | 包成对象，`commit('m', { a, b })` |
| 调 mutation / action | `commit` / `dispatch` |
| payload 丢弃 | `commit('m', 1, 2)` → 第三个**静默丢弃** |
| mutation 必须同步的原因 | devtools 靠"函数执行完"拍照 |
| action 的 `context` | 有 `commit` / `dispatch` / `state` / `getters` / `rootState`，**不是 store 本身** |
| `dispatch` 返回 | **Promise**，要拿到值 action 必须 `return` |
| getters 位置 | `computed`；像 computed，**带缓存** |
| 返回函数的 getter | **不缓存**，只为支持传参 |
| 模块 state | **必须是函数** `() => ({})` |
| 开命名空间 | `namespaced: true` |
| state 寻址 | `state.模块名.字段`，**与 namespaced 无关** |
| 其余三个寻址 | 有 namespaced → `'模块名/名字'` |
| `mapState('user',[])` 前提 | **必须开了 namespaced**，否则报 namespace not found |
| 跨模块 dispatch | `dispatch('a', payload, { root: true })`（**第三个**参数） |

## 3. ⭐ 收敛时刻

**这一轮把四个散点接上了：**

**① Vue--09 的"能改 ≠ 该改" → 现在有了正确的改法**

Vue--09 你只能 `state.count++`，看着 devtools 空着。现在 `commit` 一出现，那个空洞被填上了。**回头看 §1.4 那段"拍照"的解释，它同时也解释了 Vue--09 的 strict 模式为什么只是告警——它没能力替你记账。**

**② Vue--02 的 computed → `getters` 是它的跨组件版**

你在 Vue--02 学的"依赖变了才重算"，在这里一字不改地复用。**这也是为什么 `mapGetters` 落 `computed` 而不是 `methods`**——位置上就说明它是"值"，不是"动作"。

**③ Vue--04 的组件通信 → 现在知道该选哪个**

| 需求 | 答案 |
|---|---|
| 父子传值 | props / `$emit` |
| 跨层传配置 | `provide/inject` |
| **多人读写同一份业务数据** | **vuex** |
| 只是为了通知一下 | EventBus |

**④ Vue--08 的 ESLint → 现在你知道为什么它重要了**

这一轮新增了 `mapState` + `mapGetters` + `mapMutations` + `mapActions` 四条 import，加上 `namespaced` 和一堆对象嵌套。**代码一乱，`user/setName` 少个斜杠就查半小时。** 规范不是审美，是排错成本的预付。

## 4. 静默失败清单

vuex 后半章的坑密度比前半章高，因为它们都在**字符串**上：

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `commit('addcount')` | 数字不动，控制台一行 `unknown mutation type` | 大小写错 |
| 2 | `commit('m', 1, 2)` | 结果 `NaN` | 多参数被丢，只留第一个 |
| 3 | `mapMutations` 放进 `computed` | 点击无反应 | computed 不会 commit |
| 4 | `mapState` 放进 `methods` | `{{ count }}` 是 `undefined` | 没进 computed 就没有响应 |
| 5 | mutation 里写 `setTimeout` | 数据对，devtools 快照错 | 拍照时机错位 |
| 6 | action 忘了 `return` | `await dispatch()` 得到 `undefined` | 不 return 就没值 |
| 7 | `dispatch('a', { root: true })` | action 收到的 payload 是 `{root:true}` | `root` 是**第三个**参数 |
| 8 | 模块 state 写成对象 | 单模块看不出问题，复用/SSR 时串数据 | 必须 `() => ({})` |
| 9 | 没开 namespaced 却写 `mapState('user',[])` | `module namespace not found` | 见 §6.2 |
| 10 | 两个模块同名 mutation，都没开 namespaced | **改错数据，零提示** | §5.4 |
| 11 | 嵌套模块拼错路径 | `unknown mutation type`，但路径看着很对 | 少一层 / 多一斜杠 |
| 12 | getters 里 `$store.getters.find(3)` 忘加括号 | 拿到的是函数，渲染成 `function ...` | 返回函数型 getter 要调用 |

**第 10 条是最贵的**：它不报错、不警告，只是**默默改错地方**。等你发现"用户信息被购物车覆盖了"，可能已经在写第三个模块。

**工程上怎么防**：

- **分模块一律开 `namespaced: true`**，从根上断掉第 10 条——这是本课程后面（购物车案例）的默认做法；
- mutation / action 名用**动词 + 名词**（`setName`、`addToCart`），别用 `update`、`change` 这种泛名；
- 装了 Vue Devtools 就**每次改完扫一眼 Vuex 面板**：做了操作却没新增记录，说明你绕过了 mutation；
- 第 11 条只能靠**少分层**：模块深度控制在一层。

**这不是 bug，是代价**：vuex 用**字符串**做路由（`'user/setName'`），字符串就注定拼得错、查不出。Pinia 换成了 `useUserStore().setName()`——**方法调用有 IDE 补全，这条坑整类消失**。你学完 vuex 再看 Pinia，会发现它砍掉 mutations 只是顺手，**真正解决的是这类字符串寻址**。

## 5. C# 类比可用度

| C# / .NET 侧 | vuex 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `SaveChanges()`（同步、不可 await） | `mutations` | ⭐⭐⭐ | 都是"到此为止必须写完" |
| `async Task<T>` 应用服务方法 | `actions` | ⭐⭐⭐ | 都可挂异步、都可 `await` 拿返回值 |
| 命令对象（Command）+ 处理器 | `commit('add', payload)` | ⭐⭐ | 形似：名字 + 数据一起送进去 |
| `MemoryCache` / `Lazy<T>` | `getters` 的缓存 | ⭐⭐ | 都是"算一次存着" |
| LINQ 投影 `list.Select(...)` | `getters` 的加工 | ⭐⭐ | 都声明式，但 LINQ 不缓存 |
| 命名空间 / 类型前缀 | `namespaced` | ⭐⭐⭐ | 都在解决"撞名" |
| 分部类 `partial class` / 按聚合拆 `DbContext` | `modules` | ⭐⭐ | 都是"一个文件太大就拆"，但 vuex 合并的是**运行时对象** |
| 事件溯源 Event Sourcing | mutations 记录 | ⭐⭐⭐ | 都是"状态 = 记录的回放" |
| `ref` / `out` 参数 | `{ root: true }` 的位置 | ❌ | 纯位置依赖，别类比 |

**用法建议**：把整个 store 想成一个**按业务拆分的 `DbContext`**：

```csharp
// mutations ≈ SaveChanges 里的那一次落盘
public void AddCount() => Count++;              // 同步、无异步、当场可见

// actions ≈ 服务层方法
public async Task<string> AddAsync(int n) {
    await Task.Delay(1000);
    AddCount();                                  // ← 最后还是要落盘
    return "ok";
}
```

**差的那一层还是"账本"**：C# 里你靠日志、靠数据库事务日志；vuex 把账本做进了 `commit`。

## 6. 解锁边界

**本轮新解锁**

- `mutations`：签名、payload 单值/对象、对象风格提交、`this` 的陷阱、命名流派
- **mutations 必须同步的真实原因**（devtools 拍照时机），以及异步写进去的具体后果
- `mapMutations`：数组/对象写法、带参数、与 `mapState` 的落点差异
- `actions`：`context` 的构成与"不是 store"、解构写法、`dispatch` 返回 Promise、`mapActions`
- `getters`：与 computed 的对应、`(state, getters)` 两参数、缓存实证、返回函数型 getter 不缓存、`mapGetters`
- `modules`：文件拆分、**模块 state 必须是函数**、默认全局注册导致的撞名
- `namespaced: true`：四类访问的**前缀总表**、`state` 的例外、`mapXXX(namespace, [...])`
- 跨模块：`rootState` / `rootGetters` / `dispatch(type, payload, { root: true })`

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 购物车案例的映射渲染、跨组件改状态 | **Vue--11（100-105，6 集）** |
| `subscribe` / 插件 / 手动持久化到 localStorage | 课程未讲（Vue--15 的 token 走 storage，但不用 vuex 插件） |
| 动态注册模块 `registerModule` | 课程未讲 |
| 严格模式下 `strict` 的性能实测 | 课程未讲 |
| Pinia：`defineStore` / `storeToRefs` / 无 mutations | Pinia--01（153-155） |
| Vuex 的 TS 类型写法 | 课程这条线是 JS，不涉及 |

⚠️ **术语撞车登记**（本轮新增三条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `commit` | vuex 触发 mutation | git 提交 | 看上下文，都是"落一次盘" |
| `dispatch` | vuex 触发 action | Redux/事件派发 | 同名词，机制不同 |
| `context` | action 的第一个参数 | React Context（跨组件传值） | 在 vuex 里它就是个普通对象 |

## 7. 下一轮预告

**Vue--11（100-105，6 集 / 1 小时 14 分）：购物车案例 —— vuex 第一个实战**

这一轮没有新概念，全是**把前两轮的东西用起来**。课程会做一个小项目：商品列表 → 加入购物车 → 购物车页显示 → 数量增减 → 删除。

它的价值在于**暴露你还没意识到的组合问题**：

- `state` 里放什么形状的数据（数组还是对象？按 id 索引吗？）
- mutation 该叫 `add` 还是 `addToCart`；参数传整条商品还是只传 id
- 组件里 `mapState` 拿到的数据怎么在模板里循环
- **"加入购物车"的按钮在商品卡片里，购物车在另一个路由**——这是第一次真正的跨组件改状态

开跑之前确认：

1. 一个项目能起两个路由（Vue--06 的路由表还在）；
2. `commit` 能改数据且 devtools 有记录；
3. 分模块 + `namespaced: true` 能跑通（实验 E）。

**下一轮建议开新对话。** 到这里 vuex 的观念部分已经讲完了，剩下的是"用起来会碰到什么"。
