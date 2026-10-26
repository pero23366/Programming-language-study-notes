# Vue--11 · 购物车案例 · 请求入仓 · 映射渲染 · 数量与结算

> **对应课程**：100-105（黑马 `BV1HV4y1a7n4`，6 集 / 约 1 小时 14 分）
> **状态**：**这个案例你已决定跳过实操**，本篇是「回头看用的参考」——写代码时不用照着做，但 §1.3 的数据形状和 §4.2 那个静默失败值得单独看。
> **读法**：这一轮**没有新概念**。全部内容都是 091-099 的组合使用。所以本篇按「一个需求走一遍全链路」组织，而不是按语法点。
> **本轮定位**：vuex 的观念部分在 Vue--10 已经结束。这一轮回答的是**"真写起来会长什么样"**：数据放什么形状、mutation 该切几个、getters 到底省了什么。
> **前置**：Vue--09（state）、Vue--10（mutations / actions / getters / 分模块）。

---

==一：概念==

## 1. 功能分析先于写代码（100）

### 1.1 一张功能清单

课程这 9 分钟干的事，是把"购物车"这个模糊需求拆成可执行的条目：

| 功能 | 涉及哪一层 |
|---|---|
| 商品列表（含"加入购物车"按钮） | 页面 + **跨组件改状态** |
| 购物车列表（数量、单价、小计） | 页面 + state 映射 |
| 数量 +1 / -1 | **mutation** |
| 删除某一项 | **mutation** |
| 底部：总数量、总价、全选 | **getters** |
| 数据从接口来 | **action** |

**注意右边那一列**——这是全轮最重要的一张表：**六个功能里有四个落在仓库，不是页面。** 页面只负责"显示"和"触发"。

### 1.2 项目基本结构

```bash
vue create cart-demo       # 勾 Babel + Router + Vuex + Linter，Vue 2.x
```

只需要两个页面：

```
src/
├── views/
│   ├── ListView.vue       ← 商品列表
│   └── CartView.vue       ← 购物车
├── store/
│   ├── index.js
│   └── modules/cart.js    ← 全部业务在这
└── router/index.js        ← /list 和 /cart
```

> 💡 **两个页面就够了**，别贪心。这个案例的目的是把 vuex 走通，不是做完整商城。

### 1.3 🔴 先定数据形状（本轮的真正价值）

新手拿到需求就开始写模板，写到一半发现"总价算不出来"——因为**数据形状选错了**。

**购物车一条记录要存什么**：

| 字段 | 类型 | 从哪来 | 为什么要存 |
|---|---|---|---|
| `id` | number | 接口 | 删除、改数量时的**唯一标识** |
| `name` | string | 接口 | 显示 |
| `price` | number | 接口 | 算小计 |
| `count` | number | **本地初始 1** | 数量 |
| `checked` | boolean | **本地初始 true** | 全选 / 只结算选中项 |
| `cover` | string | 接口 | 图片 |

**三条设计原则**：

**① 用数组，不用对象**

```js
list: [ { id: 1, name: '...', count: 1, checked: true }, ... ]
```

数组天然有顺序（购物车要保序），`v-for` 直接渲染。对象要额外维护顺序。

**② 必须有 `id`**

没有 id，你只能用**下标**删除：`list.splice(index, 1)`。**下标会随删除、排序变化**，一删就错位。**凡是"要增删改"的集合，元素必须有稳定 id。**

**③ 派生数据（总价/总数）不进 state**

`total` 是 `list` 算出来的，**存一份就是存两份真相**——改数量忘了同步 `total`，界面就骗你。

> **判断标准**：能由 state 算出来的，一律放 `getters`；不能算的（用户的选择、接口返回的）才放 `state`。

---

## 2. 构建购物车模块（101）

### 2.1 为什么第一个文件是 `modules/cart.js`

因为**业务在仓库里**（§1.1 那张表）。先写仓库，页面才有东西可显示。

```js
// src/store/modules/cart.js
export default {
  namespaced: true,
  state: () => ({ list: [] }),
  mutations: {},
  actions: {},
  getters: {}
}
```

> `namespaced: true` 是**默认姿势**——Vue--10 §5.4 讲过，不开的话两个模块同名 mutation 会静默改错数据。

### 2.2 四个 mutation，按"动作"切，不按"字段"切

| mutation | payload | 干什么 |
|---|---|---|
| `setList` | `list` | 接口数据整批入仓 |
| `addCart` | `goods`（整条） | 加入购物车（已存在则数量 +1） |
| `updateCount` | `{ id, count }` | 改数量 |
| `delCart` | `id` | 删除 |
| `checkAll` | `checked` | 全选 / 全不选 |

**切分原则：一个 mutation 对应一次"用户意图"，不是一次字段赋值。**

反例（别这么干）：

```js
mutations: {
  setCount (state, n) { state.list[0].count = n }   // ← 谁的 count？看不出意图
}
```

### 2.3 payload 传整条还是只传 id

| 场景 | 传什么 | 理由 |
|---|---|---|
| `addCart` | **整条商品** | 仓库里还没有这条，需要全部字段 |
| `updateCount` | `{ id, count }` | 只改一个字段，传全部是浪费 |
| `delCart` | `id` | 只需要定位 |

**判据：mutation 里需不需要这个字段。** 不需要就别传——payload 越大，越容易让人以为"我也可以传别的"。

---

## 3. 请求入仓 + 映射渲染（102）

### 3.1 链路：action 取数 → commit → state → getters → 模板

```js
actions: {
  async getList ({ commit }) {
    const res = await axios.get('/api/list')
    commit('setList', res.data.list)
  }
}
```

```js
// 页面 created
created () { this.$store.dispatch('cart/getList') }
```

**为什么一定要走 action 而不能在组件里请求？**

| 组件里请求 | action 里请求 |
|---|---|
| 每个用到数据的页面都要写一遍 | 写一次，谁要谁 dispatch |
| 数据存哪要每个页面自己想 | 统一进 state |
| 请求失败的处理散落各处 | 可集中处理 |

> 💡 **Vue--10 §3.1 说"actions 是异步入口"，这里就是它的真实用途**：不是"为了绕一圈"，是把**取数逻辑**从页面里搬出来。

### 3.2 映射渲染

```js
computed: {
  ...mapState('cart', ['list'])
}
```

```html
<div v-for="item in list" :key="item.id" class="item">
  <span>{{ item.name }}</span>
  <span>{{ item.price }}</span>
</div>
```

**`namespaced: true` 之后，`mapState` 必须带模块名**（Vue--10 §6.2）。这是本案例第一次真正用到那张表。

### 3.3 🔴 `:key` 必须是 `id`

```html
<div v-for="item in list" :key="item.id">     ✅
<div v-for="item in list" :key="index">       ⚠️
```

用 `index` 的后果：删除第 2 条后，第 3 条变第 2 条，**Vue 会复用旧的 DOM 节点**，导致：

- 输入框里的值错位（残留上一条的内容）
- 动画错乱
- 勾选状态跟着错

**用 index 当 key 等于告诉 Vue"位置就是身份"**，而购物车的身份是 `id`。

---

## 4. 改数量与底部结算（103）

### 4.1 数量 ±1 走 commit

```html
<button @click="updateCount({ id: item.id, count: item.count - 1 })">-</button>
```

```js
methods: {
  ...mapMutations('cart', ['updateCount'])
}
```

**边界要在 mutation 里挡**，不在按钮上挡：

```js
updateCount (state, { id, count }) {
  if (count < 1) return                    // ← 最小 1
  const item = state.list.find(i => i.id === id)
  if (item) item.count = count
}
```

> **为什么不在模板里 `v-if="item.count > 1"` 挡？** 因为它只挡住"这一个按钮"，挡不住"别的地方也调 updateCount"。**约束放在数据入口，才叫约束。**

### 4.2 🔴 直接改 `item.count` 会发生什么（本案例最阴的坑）

```js
methods: {
  add (item) { item.count++ }              // ← 看着像普通对象操作
}
```

**页面会变。真的会变。**

原因：`state.list` 是响应式的，数组里的**对象**被 Vue 递归转成了响应式对象，所以 `item.count++` 触发了 setter → 视图更新。

但：

| | 直接改 | `commit('updateCount')` |
|---|---|---|
| 页面更新 | ✅ | ✅ |
| devtools 记录 | ❌ **空** | ✅ 一条 |
| 时间旅行 | ❌ | ✅ |
| 别人接手能查到 | ❌ | ✅ |

**这比 Vue--09 那个 `state.count++` 更危险**，因为 Vue--09 你改的是**根 state 的原始值**，好歹只有一种写法；这里你改的是**数组元素对象的属性**，`item.count++` 和普通 JS 操作长得一模一样，**review 时极容易漏掉**。

> **这就是"静默失败"最典型的形态**：所有表象都对，只有账本是空的。而账本恰恰是你出问题时唯一能查的东西。

### 4.3 getters 算总价

```js
getters: {
  // 只算勾选的
  total (state) {
    return state.list
      .filter(i => i.checked)
      .reduce((sum, i) => sum + i.price * i.count, 0)
  },
  // 勾选的总件数
  checkedCount (state) {
    return state.list
      .filter(i => i.checked)
      .reduce((sum, i) => sum + i.count, 0)
  },
  // 是否全选（用于全选框的受控状态）
  isAllChecked (state) {
    return state.list.length > 0 && state.list.every(i => i.checked)
  }
}
```

```js
computed: {
  ...mapGetters('cart', ['total', 'checkedCount', 'isAllChecked'])
}
```

**三个都不该进 state**：它们是 `list` 的函数。

### 4.4 全选：用 `every` 判断，用 mutation 改

```js
mutations: {
  checkAll (state, checked) {
    state.list.forEach(i => { i.checked = checked })
  }
}
```

```html
<van-checkbox :value="isAllChecked" @click="checkAll(!isAllChecked)">全选</van-checkbox>
```

> **别在模板里写 `list.every(...)`**——模板里每次重渲染都会重算，而 getters 有缓存（Vue--10 §4.1）。

### 4.5 🔴 浮点：总价算出来 `39.900000000000006`

```js
0.1 + 0.2 === 0.30000000000000004      // true
```

购物车累加几十项，小数误差会攒出来。三种处理：

| 方案 | 做法 | 适合 |
|---|---|---|
| **展示时四舍五入** | `total.toFixed(2)` | 只显示，够用 |
| **整数分存储** | `price: 1990`（分），显示时 `/100` | **电商标准做法** |
| 用 decimal 库 | `decimal.js` / `big.js` | 财务级计算 |

**课程用第一种**（`toFixed(2)`）。但你要知道：**`toFixed` 只是遮住误差，不是消除误差。** 真做支付，金额从后端到前端全程用"分"。

> ⚠️ `toFixed` 自身也有坑：`(1.005).toFixed(2)` 得到 `'1.00'` 不是 `'1.01'`，因为 `1.005` 二进制存不下。**涉及钱，就别用浮点。**

---

## 5. 项目收获：一条完整链路（105）

课程最后 3 分钟总结的"核心技术收获"，压成一张图：

```
页面 created
   └─ dispatch('cart/getList')          ← ① 异步入口（action）
        ├─ axios 取数
        └─ commit('setList', list)      ← ② 唯一写入口（mutation）
             └─ state.list 变化          ← ③ 唯一真相源
                  ├─ mapState → 模板渲染  ← ④ 读
                  └─ getters → 总价/件数   ← ⑤ 派生
```

**五个环节各对应一个概念**，少一个这条链就断。**你现在应该能不看笔记把这五个词按顺序说出来。**

### 5.1 什么时候**不**该这么写

| 需求 | 该用什么 |
|---|---|
| 父子传一个值 | props / `$emit` |
| 一个页面内的状态（弹窗开没开） | 组件自己的 `data` |
| 跨页面共享业务数据 | **vuex** |
| 只想通知一下 | EventBus（但优先考虑 vuex） |

**"弹窗开没开"绝对不该进 vuex**——它是**局部 UI 状态**，只有那个组件关心。放进仓库等于把私事贴到公告栏。

---

## 6. 商城项目演示（104）：下一段的引子

104 那 9 分钟是**演示**（不是写代码），把上一段课程做的完整商城跑给你看。它的作用是让你知道 106 起要做什么。

| 模块 | 涉及的新东西 |
|---|---|
| 登录 / 注册 | 图形验证码、短信验证、**token** |
| 首页 | 轮播、搜索历史（**localStorage**）、商品流 |
| 商品详情 | 弹层、数字框、**加购时的登录判断** |
| 购物车 | `mapState` / getters / 全选 / 删除（= 本轮内容的加强版） |
| 结算 / 订单 | 地址、支付、订单列表 |
| 我的 | 用户信息、退出登录、**路由守卫** |

**和购物车案例的差距，主要是这三个真实问题**：

| 问题 | 购物车案例有吗 | 商城项目 |
|---|---|---|
| 接口要**统一封装**（baseURL、拦截器） | 直接 `axios.get` | ✅ 111 起 |
| 要**鉴权**（token 带在请求头） | ❌ | ✅ 116 起 |
| 未登录要**拦住路由** | ❌ | ✅ 119 |

**所以购物车案例是"仓库内部的练习"，商城是"仓库 + 网络 + 鉴权"的完整链路。**

---

==二：格式==

## 1. 数据形状模板

```js
state: () => ({
  list: [
    { id: 1, name: '商品', price: 19.9, count: 1, checked: true, cover: '' }
  ]
})
```

## 2. 四个 mutation + 三个 getter 骨架

```js
mutations: {
  setList (state, list) { state.list = list },
  addCart (state, goods) {
    const item = state.list.find(i => i.id === goods.id)
    if (item) item.count++
    else state.list.push({ ...goods, count: 1, checked: true })
  },
  updateCount (state, { id, count }) {
    if (count < 1) return
    const item = state.list.find(i => i.id === id)
    if (item) item.count = count
  },
  delCart (state, id) {
    state.list = state.list.filter(i => i.id !== id)
  }
}
```

```js
getters: {
  total (state) {
    return state.list.filter(i => i.checked)
      .reduce((s, i) => s + i.price * i.count, 0)
  },
  checkedCount (state) {
    return state.list.filter(i => i.checked)
      .reduce((s, i) => s + i.count, 0)
  },
  isAllChecked (state) {
    return state.list.length > 0 && state.list.every(i => i.checked)
  }
}
```

> 注意 `addCart` 里 `item.count++` **是合法的**——它在 mutation 内部，devtools 记的是 `addCart` 这一条。**规矩是"只能在 mutation 里直接改"，不是"永远不能直接改"。**

## 3. 组件三件套

```js
computed: {
  ...mapState('cart', ['list']),
  ...mapGetters('cart', ['total', 'checkedCount', 'isAllChecked'])
},
methods: {
  ...mapMutations('cart', ['updateCount', 'delCart', 'checkAll']),
  ...mapActions('cart', ['getList'])
}
```

## 4. 静默失败对照

| 现象 | 根因 | 处方 |
|---|---|---|
| 总价不变 | 总价被复制进了 `data` | 用 `getters` + `mapGetters` |
| 删一条、错一条 | `:key="index"` | `:key="item.id"` |
| 页面变了、devtools 没记录 | 直接改 `item.count` | 走 mutation |
| `mapState('cart', [...])` 返回 undefined | 模块没开 `namespaced` | 开，或改函数写法 |
| 总价 `39.900000000000006` | 浮点累加 | `toFixed(2)` / 用分 |
| 全选框点不动 | 用了 `v-model` 绑 getter（只读） | `:value` + `@click` |

---

==三：代码==

## 1. 实验 A：完整 cart 模块（可直接抄进项目）

`src/store/modules/cart.js`：

```js
export default {
  namespaced: true,
  state: () => ({ list: [] }),
  mutations: {
    setList (state, list) { state.list = list },
    addCart (state, goods) {
      const item = state.list.find(i => i.id === goods.id)
      if (item) { item.count++ } else {
        state.list.push({ ...goods, count: 1, checked: true })
      }
    },
    updateCount (state, { id, count }) {
      if (count < 1) return
      const item = state.list.find(i => i.id === id)
      if (item) item.count = count
    },
    delCart (state, id) { state.list = state.list.filter(i => i.id !== id) },
    checkAll (state, checked) { state.list.forEach(i => { i.checked = checked }) }
  },
  actions: {
    async getList ({ commit }) {
      const res = await axios.get('/api/list')
      commit('setList', res.data.list)
    }
  },
  getters: {
    total (state) {
      return state.list.filter(i => i.checked)
        .reduce((s, i) => s + i.price * i.count, 0)
    },
    isAllChecked (state) {
      return state.list.length > 0 && state.list.every(i => i.checked)
    }
  }
}
```

`store/index.js` 里注册：

```js
import cart from './modules/cart'
export default new Vuex.Store({ modules: { cart } })
```

## 2. 实验 B：亲手验证"能改但不记账"

**① 组件里写**

```js
add (item) { item.count++ }
```

**② 点按钮**：数字变、页面变、**devtools 的 Vuex 面板一条记录都没有**

**③ 换成** `this.updateCount({ id: item.id, count: item.count + 1 })` → 面板出现 `cart/updateCount`

**④ 结论**：同样的视觉结果，一种是"有账"，一种是"黑账"。

## 3. 实验 C：`:key="index"` 的后果

**① 渲染 3 条，每条带一个 `<input>`**
**② 在第 2 条的输入框里打几个字**
**③ 删掉第 1 条**

用 `:key="index"` → **输入的字跟着挪到了第 1 条的位置上**（DOM 被复用）
用 `:key="item.id"` → 输入框跟着自己的数据一起消失

## 4. 实验 D：总价的浮点误差

```js
const goods = [{ price: 0.1, count: 1 }, { price: 0.2, count: 1 }]
const total = goods.reduce((s, i) => s + i.price * i.count, 0)
console.log(total)              // 0.30000000000000004
console.log(total.toFixed(2))   // '0.30'
```

**再试** `(1.005).toFixed(2)` → `'1.00'`（不是 `'1.01'`）

> **记住这条**：**浮点只适合"算着玩"，涉及钱一律用整数分。**

---

==四：总结==

## 1. 一句话记住三个

- **先定数据形状**，再写模板；能算出来的绝不进 state。
- **所有改动走 mutation**，`item.count++` 在 mutation 里合法、在组件里是黑账。
- **`getters` 是购物车的核心**：总价、件数、全选三个都从 `list` 算，一份真相。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 数据形状 | `{ id, name, price, count, checked }`，**数组 + 稳定 id** |
| 派生数据 | 总价 / 件数 / 全选 → **`getters`** |
| 取数 | `dispatch` → action 里 axios → `commit('setList')` |
| 四个 mutation | `setList` / `addCart` / `updateCount` / `delCart` |
| payload 判据 | **mutation 里需不需要这个字段** |
| `:key` | **`item.id`**，不是 index |
| 数量下界 | 在 **mutation 里**挡 `count < 1` |
| 浮点 | `toFixed(2)` 只遮误差；真项目用**整数分** |
| 局部 UI 状态 | **不进 vuex**（弹窗开关放 `data`） |

## 3. ⭐ 收敛时刻

**① Vue--09 的"能改≠该改" → 这里变成了真实的坑**

Vue--09 你是故意去试 `state.count++`。这里是**手滑就写成 `item.count++`**——而且 `item` 看起来就是个普通对象。**同一个道理，换了个更隐蔽的皮。**

**② Vue--10 的 `getters` → 购物车是它唯一的正确用法**

Vue--10 你只验证过"缓存"。这里它承担了**全部计算**：总价、件数、全选。**如果 getters 只学了个语法，这一轮你才会明白它为什么存在。**

**③ Vue--06 的 `:key` → 第一次因为 key 出错**

路由那轮 `v-for` 都是静态数据，看不出问题。购物车要**动态增删**，`index` 当 key 的 bug 才现形。

**④ Vue--04 的组件通信 → 现在能一刀切开**

| 数据性质 | 用什么 |
|---|---|
| 父子之间 | props / `$emit` |
| 跨页面业务数据（购物车） | **vuex** |
| 组件内部 UI 状态（弹窗） | `data` |

**⑤ Vue--08 的 ESLint / 12 的 vant → 这一轮都没出现，但它们决定了你写得顺不顺**

购物车案例里模板很长、`v-for` 嵌套深，**没格式化工具你会花一半时间在缩进上**；有了 vant，底部结算栏不用自己写。

## 4. 静默失败清单

购物车案例几乎全是"**看起来对了**"：

| # | 做法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `item.count++`（组件里） | 全对，devtools 空 | 绕过 mutation |
| 2 | `:key="index"` | 删除后内容错位、输入框串值 | DOM 复用 |
| 3 | 总价写进 `data` | 改数量总价不动 | 副本，不响应 |
| 4 | `mapState('cart',[])` 但模块没开 namespaced | 报 `module namespace not found` | 见 Vue--10 §6.2 |
| 5 | 全选框 `v-model="isAllChecked"` | 点了弹回去 | getters 是只读，v-model 试图写 |
| 6 | `state.list.push(...)` 但 `list` 被整体替换过 | 局部不更新 | 替换后旧引用失效（少见但真会） |
| 7 | `total.toFixed(2)` 当金额用 | 支付差 1 分 | `toFixed` 有舍入 bug |
| 8 | 把 `list` 传给子组件改 | 子组件里 `props` 直接改，父组件警告 | props 单向 |

**第 1 和第 2 条是这轮最值钱的两个教训。**

**工程上怎么防**：

- 组件里**只允许出现 `mapMutations` 出来的函数**，不出现 `item.xxx =`——这一条能挡掉 80% 的黑账；
- `v-for` 的 `:key` **一律用 id**，没有 id 就先加 id；
- 金额相关**一律整数分**，从接口到展示都不碰浮点；
- 打开 devtools 的 Vuex 面板**常驻**，做了操作没新记录就是有问题。

**这不是 bug，是代价**：vuex 给你账本，但不能强迫你记账。**它把"改数据"从一个动作变成了一个约定，约定只能靠人守。**

## 5. C# 类比可用度

| C# / .NET 侧 | 购物车案例 | 可用度 | 注意 |
|---|---|:--:|---|
| `List<CartItem>` + 稳定主键 | `state.list` + `id` | ⭐⭐⭐ | 同构：集合操作必须有主键 |
| LINQ `Where(...).Sum(...)` | `filter().reduce()` | ⭐⭐⭐ | 几乎一比一 |
| 仓储的 `Add` / `Update` / `Remove` | `addCart` / `updateCount` / `delCart` | ⭐⭐⭐ | 都是"集合的受控操作" |
| 计算属性 `public decimal Total => Items.Sum(...)` | `getters.total` | ⭐⭐⭐ | 都是"不存，现算" |
| `decimal` 做金额 | **用整数分** | ⭐⭐⭐ | C# 有 `decimal` 能用，**JS 没有** |
| `INotifyCollectionChanged` | 数组变化 → 视图更新 | ⭐⭐ | 机制像，Vue 自动 |
| `SaveChanges()` | `commit` | ⭐⭐⭐ | 都是"一次落盘一条记录" |

**用法建议**：把 `state.list` 想成一张**内存表**，四个 mutation 就是这张表的四个仓储方法，`getters` 就是 `Total` 那种只读属性。

**C# 里最该记的差异**：**`decimal` 是 C# 的杀手锏，JS 没有。** 你在 C# 里写 `decimal price` 就没精度问题；JS 里 `0.1 + 0.2 !== 0.3` 是语言级的坑。**所以电商后端用 `decimal`（或分），前端只做展示——这也解释了为什么接口给金额常常是整数分。**

## 6. 解锁边界

**本轮新解锁**

- 购物车的数据形状设计（数组 + 稳定 id + 本地字段 `count` / `checked`）
- 派生数据一律进 `getters` 的判据；`isAllChecked` 用 `every`
- 取数链路 `dispatch → action(axios) → commit → state → mapState`
- `:key` 用 id 而不是 index 的真实后果
- 约束（数量下界）放在 mutation 而不是模板
- 浮点金额问题与三种处理方案（`toFixed` / 整数分 / decimal 库）
- 商城项目（104）的功能模块清单，作为 106 起的地图

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| axios 封装（baseURL / 实例 / 拦截器） | Vue--14（111-115） |
| Toast 轻提示 | Vue--14（112） |
| 登录 / 短信验证 / 图形验证码 | Vue--13~14（110-113） |
| token 存 vuex + storage 持久化 | Vue--15（116-119） |
| 全局路由守卫 | Vue--15（119） |
| 商品详情弹层 / 数字框 | Vue--17（123-126） |
| 结算台 / 订单 / mixin / 打包优化 | Vue--19（134-139） |
| Vue3 下同样的购物车（Pinia 版） | Pinia--01（153-155） |

⚠️ **术语撞车登记**（本轮新增一条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `total` | 商品总额 | 订单应付（含运费/优惠） | 案例里是前者，真项目里别混 |

## 7. 下一轮预告

**Vue--12（106-108，约 1 小时 1 分）：项目初始化 · vant 按需导入 · postcss vw 适配**

已经写好了（`Vue--实战篇/Vue--12-...md`），可以直接看。**这一轮的购物车代码不会白写**——127-133 的购物车是它的加强版，你到时候只需要补"全选状态怎么同步""删除要二次确认"这两块。

**如果要动手练这个案例**，顺序建议：

1. 先建 `modules/cart.js`，写死三条假数据；
2. 页面用 `mapState` 渲染出来；
3. 加 `updateCount`，验证 devtools 有记录；
4. 最后才接接口。

**别一上来就写 axios** ——那会让你在"数据没进来"和"渲染写错了"之间分不清原因。
