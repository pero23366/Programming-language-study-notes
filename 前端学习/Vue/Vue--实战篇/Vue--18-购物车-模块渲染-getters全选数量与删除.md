# Vue--18 · 购物车 · vuex 模块 · getters 计算 · 全选 · 数量 · 删除

> **对应课程**：127-133（黑马 `BV1HV4y1a7n4`，7 集 / 约 2 小时 5 分）
> **读法**：7 集看着多，实际是**一件事被拆成 7 步**：布局 → 入仓 → 渲染 → 算账 → 勾选 → 改数量 → 删除。没有新概念，全是 Vue--09~11 的组合。
> **本轮定位**：**vuex 最密集的一段**，也是 Vue--11 你跳过实操的那个购物车的"真实项目版"。这一轮如果有一件事必须记牢，是 **§6.2 那个 `v-model`**——它是全课程最容易被"自然地写错"的地方。
> **前置**：Vue--10（getters / mapState）、Vue--11（购物车数据形状）、Vue--17（`CountBox` 组件）。

---

==一：概念==

## 1. 布局：还是三块（127）

### 1.1 结构

```
┌─────────────────────────────┐
│  购物车            [编辑]    │  ① 头部（右上角切编辑模式）
├─────────────────────────────┤
│ ☑ [图] 商品名               │
│      黑色 XL                 │  ② 列表项
│      ¥199      [-] 1 [+]    │
├─────────────────────────────┤
│ ☑ [图] 商品名               │
│      ...                    │
├─────────────────────────────┤
│ ☑ 全选   合计 ¥398  [结算]  │  ③ 底部结算栏（固定）
└─────────────────────────────┘
```

| 块 | 内容 | 数据来源 |
|---|---|---|
| ① 头部 | 标题 + 编辑/完成切换 | 组件 `data` 的 `isEdit` |
| ② 列表 | 商品项（图/名/规格/价/勾选/数量） | **vuex `state.list`** |
| ③ 结算栏 | 全选 + 合计 + 按钮 | **vuex `getters`** |

**注意右边那列**：这一页**几乎没有自己的状态**，只有 `isEdit` 一个。**其余全是仓库的数据。**

### 1.2 底部栏要固定

```css
.settle-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 50px;
  z-index: 10;
}
.cart-list { padding-bottom: 50px; }
```

> ⚠️ **别忘 `padding-bottom`**，否则最后一条商品永远被压住一半。
>
> ⚠️ **别忘 tabbar 的高度**：购物车页面在 Layout 里（Vue--13），下面还有一层 tabbar。所以结算栏要放在 `bottom: 50px`（tabbar 高度）的位置，否则两个底栏重叠。

### 1.3 编辑模式只改一个按钮

```html
<van-button v-if="!isEdit" type="primary" @click="toSettle">结算</van-button>
<van-button v-else type="danger" @click="delSelected">删除</van-button>
```

**编辑模式不换页面、不换组件**，只换底部按钮和"点击商品跳不跳详情"。**这就是一个布尔值能解决的事，别搞成两个路由。**

---

## 2. 构建 cart 模块（128）

### 2.1 `count` 和 `checked` 谁说了算

接口返回的购物车数据大概长这样：

```json
{ "id": 11, "goodsId": 3, "name": "手机", "price": 199, "count": 2, "checked": true, "skuName": "黑色 XL" }
```

**`count` 和 `checked` 是后端给的**（不是前端初始化的）。因为：

| 字段 | 谁维护 | 理由 |
|---|---|---|
| `count` | **后端** | 用户上次买 2 件，下次打开还是 2 件 |
| `checked` | **后端**（或本地） | 淘宝会记住你勾了哪些；也可以纯本地 |

> 🟡 **Vue--11 那个案例里 `count: 1 / checked: true` 是前端初始化的**，因为那是"加入购物车"的瞬间。**而这一轮是"读取已有购物车"，数据已经存在后端。**

### 2.2 五个 mutation

| mutation | payload | 触发场景 |
|---|---|---|
| `setList` | `list` | 进页面取数 |
| `updateCount` | `{ id, count }` | 点数字框 |
| `updateChecked` | `{ id, checked }` | 点单个复选框 |
| `checkAll` | `checked` | 点全选 |
| `delCart` | `id`（或 id 数组） | 删除 |

```js
mutations: {
  setList (state, list) { state.list = list },
  updateCount (state, { id, count }) {
    const item = state.list.find(i => i.id === id)
    if (item) item.count = count
  },
  updateChecked (state, { id, checked }) {
    const item = state.list.find(i => i.id === id)
    if (item) item.checked = checked
  },
  checkAll (state, checked) {
    state.list.forEach(i => { i.checked = checked })
  },
  delCart (state, ids) {
    const arr = Array.isArray(ids) ? ids : [ids]
    state.list = state.list.filter(i => !arr.includes(i.id))
  }
}
```

**`delCart` 用 id 数组**是有意设计的：单个删除传 `[id]`，批量删除传多个。**一个 mutation 覆盖两种场景，比写两个更好维护。**

---

## 3. 渲染列表（129）

```js
computed: {
  ...mapState('cart', ['list'])
}
```

```html
<div v-for="item in list" :key="item.id" class="cart-item">
  <van-checkbox :value="item.checked" @click="toggle(item)"/>
  <img :src="item.pic" alt="">
  <div class="info">
    <p class="name">{{ item.name }}</p>
    <p class="sku">{{ item.skuName }}</p>
    <p class="price">¥{{ item.price }}</p>
  </div>
  <CountBox :value="item.count" :max="item.stock" @input="val => changeCount(item, val)"/>
</div>
```

**`mapState` + `v-for` + `:key="item.id"`** —— 三件套，Vue--11 §3.3 讲过用 `index` 当 key 的后果（删除后输入框串值），**这里就是那个场景**。

### 3.1 🔴 复选框：`v-model` 是陷阱

```html
<!-- ❌ 看着最自然，实际绕过 mutation -->
<van-checkbox v-model="item.checked"/>
```

**`v-model` 会直接给 `item.checked` 赋值** —— 而 `item` 是 `state.list` 里的对象。**这是 Vue--11 §4.2 那个坑的实战版，而且这次你会"自然地"写出来。**

后果：

| 检查项 | `v-model` 直绑 | 走 mutation |
|---|---|---|
| 勾选生效 | ✅ | ✅ |
| 合计金额跟着变 | ✅（getters 依赖 state） | ✅ |
| **devtools 有记录** | ❌ | ✅ |
| 能同步后端 | 要额外写 | 在 mutation 里顺手加 |

**正确写法**：

```html
<van-checkbox :value="item.checked" @click="toggle(item)"/>
```

```js
toggle (item) {
  this.updateChecked({ id: item.id, checked: !item.checked })
}
```

**同理，数字框也不能 `v-model="item.count"`**（§6.2 详讲）。

> **一条可以贴在显示器上的规矩**：**凡是 `v-model` 绑到 `this.$store.state.xxx` 上的，一律是 bug。** `v-model` 的本质是"赋值"，而 state 不许直接赋值。

---

## 4. getters：算账（130）

### 4.1 三个派生值

```js
getters: {
  // 勾选商品的总价
  total (state) {
    return state.list
      .filter(i => i.checked)
      .reduce((sum, i) => sum + i.price * i.count, 0)
  },
  // 勾选商品的总件数
  checkedCount (state) {
    return state.list
      .filter(i => i.checked)
      .reduce((sum, i) => sum + i.count, 0)
  },
  // 是否全选
  isAllChecked (state) {
    return state.list.length > 0 && state.list.every(i => i.checked)
  }
}
```

| getter | 用在哪 |
|---|---|
| `total` | 底部"合计" |
| `checkedCount` | 结算按钮上的件数、"全选(x)" |
| `isAllChecked` | 全选框的 `:value` |

### 4.2 🔴 `list.length > 0 &&` 不能省

```js
isAllChecked (state) {
  return state.list.length > 0 && state.list.every(i => i.checked)
}
```

**`every` 对空数组返回 `true`**（这是 JS 的数学约定：空集上的"所有元素都满足"是真空真）。

不加 `length > 0` 的后果：**购物车被删空后，全选框自动勾上**——用户看着一个空的购物车，全选是亮着的。

> 🔴 **这是 `every` / `some` 的通用坑**：`[].every(x => x)` 是 `true`，`[].some(x => x)` 是 `false`。**永远先判空。**

### 4.3 浮点：`toFixed(2)`

```html
<p>合计：¥{{ total.toFixed(2) }}</p>
```

`199.9 + 199.9` 在 JS 里是 `399.8`（这里没问题），但 `0.1 + 0.2` 是 `0.30000000000000004`。**累加项越多，误差越容易露出来。**

| 做法 | 适合 |
|---|---|
| `toFixed(2)` 展示 | **课程做法**，够用 |
| 后端算好金额下发 | **真项目首选**（前端只显示） |
| 整数分 | 前端也要算时 |

> 💡 **真项目里"合计"常常是后端算的**——因为运费、优惠券、满减都在后端。前端算的那份只是"预估值"。**但前端还是要算，因为要即时反馈。**

---

## 5. 全选反选（131）

### 5.1 两个动作

```js
// 单个
toggle (item) {
  this.updateChecked({ id: item.id, checked: !item.checked })
}
// 全选 / 全不选
toggleAll () {
  this.checkAll(!this.isAllChecked)
}
```

```html
<van-checkbox :value="isAllChecked" @click="toggleAll">全选</van-checkbox>
```

### 5.2 🔴 为什么"全选状态"要算不要存

假设你把 `isAllChecked` 也存进 state：

```js
state: { list: [], isAllChecked: false }    // ❌
```

然后你必须保证：**每次 `updateChecked`、`delCart`、`setList` 之后，都同步更新 `isAllChecked`**。

漏一次会怎样？

| 场景 | 漏更新后 |
|---|---|
| 手动取消最后一个勾选 | **全选框还是亮的** |
| 删除唯一未勾选的商品 | **全选框没变化**（其实应该自动全选） |
| 接口返回全新列表 | 全选框保持上次状态 |

**这就是"两份真相"的代价**（Vue--11 §1.3 讲过）。**能算的绝不存。**

### 5.3 一个容易忽略的交互

**取消一个 → 全选框自动灭 → 再勾回来 → 全选框自动亮。** 你不用写任何代码，因为 `isAllChecked` 是算出来的。

**这条是 getters 最漂亮的用法**：你没写"同步逻辑"，但状态永远一致。

---

## 6. 数字框改数量（132）🔥

### 6.1 复用 `CountBox`

Vue--17 封装的组件，这里直接用：

```html
<CountBox :value="item.count" :min="1" :max="item.stock" @input="val => changeCount(item, val)"/>
```

```js
changeCount (item, count) {
  this.updateCount({ id: item.id, count })
}
```

**注意这里没有 `v-model`**，是 `:value` + `@input` 手工展开——**因为我们要在中间插一层 `commit`。**

### 6.2 🔴 `v-model="item.count"` 是本轮最大的坑

```html
<!-- ❌ 千万别这么写 -->
<CountBox v-model="item.count"/>
```

**为什么这是 bug？** 展开一下就清楚了：

```html
<CountBox :value="item.count" @input="item.count = $event"/>
```

`item.count = $event` —— **直接给 `state.list[i].count` 赋值**。

| 结果 | 说明 |
|---|---|
| 数字变了 | ✅ |
| 合计跟着变 | ✅ 因为 getters 依赖 state |
| **devtools 里一条记录都没有** | ❌ **黑账** |
| 后端不知道 | ❌ 你以为改了，刷新就回去了 |
| 数量下界失效 | ❌ `CountBox` 的 `min/max` 只挡按钮，挡不住 `v-model` 直接赋值 |

**最后一条最要命**：`v-model` 绕过了 `CountBox` 里所有的边界判断（Vue--17 §3.5）。**用户手动输入时能填 0 或 -1。**

> **对比一下两种写法的"诱惑程度"**：
> - `v-model="item.count"` —— **最短、最符合直觉、看起来最对**
> - `:value` + `@input` + `commit` —— **多写两行**
>
> **这就是为什么这个坑必踩**：错的那条路才是"自然"的那条。

### 6.3 完整链路

```
用户点 +
  → CountBox 内部 this.$emit('input', value + 1)
  → 父组件 changeCount(item, 新值)
  → this.updateCount({ id, count })     ← mapMutations
  → commit('cart/updateCount', ...)
  → mutation 里 item.count = count
  → state 变 → getters 重算 → 合计更新
```

**一条链走完，devtools 里有一条 `cart/updateCount`。** 这才是对的。

### 6.4 要不要同时调后端接口

课程里**更新数量会调接口**（真实项目必须，否则刷新就丢）。

```js
async changeCount (item, count) {
  this.updateCount({ id: item.id, count })     // ① 先改本地（立刻响应）
  try {
    await updateCartCount({ id: item.id, count })
  } catch (e) {
    this.updateCount({ id: item.id, count: item.count })   // ② 失败回滚
  }
}
```

**这叫"乐观更新"**：先假装成功，UI 立刻响应；失败了再回滚。

| 策略 | 体验 | 风险 |
|---|---|---|
| 先请求，成功后改 | 点一下要等半秒 | 慢但稳 |
| **乐观更新** | 立刻响应 | 要写回滚 |
| 只改本地不请求 | 最快 | **刷新就丢** |

> ⚠️ **回滚要小心**：`item.count` 在 `commit` 之后**已经被改了**，所以第 ② 步的 `item.count` 拿到的是**新值**，不是旧值。正确做法是**先存旧值**：
> ```js
> const old = item.count
> this.updateCount({ id: item.id, count })
> try { await ... } catch { this.updateCount({ id: item.id, count: old }) }
> ```

---

## 7. 编辑与删除（133）

### 7.1 编辑模式

```js
data () { return { isEdit: false } }
```

```html
<span @click="isEdit = !isEdit">{{ isEdit ? '完成' : '管理' }}</span>
```

**编辑模式下点商品不跳详情**（避免误触）：

```js
goDetail (item) {
  if (this.isEdit) return
  this.$router.push(`/detail/${item.goodsId}`)
}
```

### 7.2 删除：两条路

**① 侧滑删除（`van-swipe-cell`）**

```html
<van-swipe-cell>
  <div class="cart-item">...</div>
  <template #right>
    <van-button square type="danger" text="删除" @click="delOne(item)"/>
  </template>
</van-swipe-cell>
```

**② 编辑模式下批量删**

```html
<van-button type="danger" @click="delSelected">删除选中</van-button>
```

### 7.3 删除必须二次确认

```js
async delOne (item) {
  try {
    await Dialog.confirm({ message: '确定删除这件商品吗？' })
  } catch (e) {
    return                        // 用户点了取消
  }
  this.delCart([item.id])         // 先改本地
  await delCartApi([item.id])     // 再同步后端
}
```

> 🔴 **`Dialog.confirm` 用 `try/catch` 比 `.then/.catch` 好读**：`await` 成功就是"确认"，抛错就是"取消"。**这比 Vue--16 那个 `.catch(() => {})` 更清楚。**

### 7.4 空购物车

```html
<van-empty v-if="!list.length" description="购物车还是空的">
  <van-button round type="primary" @click="$router.push('/home')">去逛逛</van-button>
</van-empty>
```

**空态不是"没数据就白屏"**，它是一次**引导**：告诉用户去哪。电商里"空购物车"页面的转化价值不低。

### 7.5 删完之后的三件事（都不用你写）

| 删一条后 | 为什么自动对 |
|---|---|
| 合计重算 | `total` 是 getters |
| 全选框状态更新 | `isAllChecked` 是 getters |
| 列表少一条 | `mapState` 响应式 |

**只 commit 一次，三处全对。** 这就是"派生数据不进 state"的收益。

---

==二：格式==

## 1. 模块骨架

```js
export default {
  namespaced: true,
  state: () => ({ list: [] }),
  mutations: {
    setList (state, list) { state.list = list },
    updateCount (state, { id, count }) {
      const item = state.list.find(i => i.id === id)
      if (item) item.count = count
    },
    updateChecked (state, { id, checked }) {
      const item = state.list.find(i => i.id === id)
      if (item) item.checked = checked
    },
    checkAll (state, checked) { state.list.forEach(i => { i.checked = checked }) },
    delCart (state, ids) {
      const arr = Array.isArray(ids) ? ids : [ids]
      state.list = state.list.filter(i => !arr.includes(i.id))
    }
  },
  actions: {
    async getCart ({ commit }) {
      const res = await getCartList()
      commit('setList', res.data.list)
    }
  },
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
}
```

## 2. 组件三件套

```js
computed: {
  ...mapState('cart', ['list']),
  ...mapGetters('cart', ['total', 'checkedCount', 'isAllChecked'])
},
methods: {
  ...mapMutations('cart', ['updateCount', 'updateChecked', 'checkAll', 'delCart']),
  ...mapActions('cart', ['getCart'])
}
```

## 3. 绑定的正确写法（对比表）

| 控件 | ❌ 错的 | ✅ 对的 |
|---|---|---|
| 复选框 | `v-model="item.checked"` | `:value="item.checked" @click="toggle(item)"` |
| 数字框 | `v-model="item.count"` | `:value="item.count" @input="v => changeCount(item, v)"` |
| 全选框 | `v-model="isAllChecked"` | `:value="isAllChecked" @click="toggleAll"` |

> **第三行还有点特殊**：`isAllChecked` 是 **getters（只读计算值）**，`v-model` 想写它 → 直接报 `Avoid mutating a prop` 或"computed property was assigned to but it has no setter"。**它连"黑账"都写不成，直接报错。**

## 4. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| **数量改了但 devtools 没记录** | `v-model="item.count"` | `:value` + `@input` + `commit` |
| 勾选改了但没记录 | `v-model="item.checked"` | 同上 |
| 数量能填 0 / 负数 | 绕过了 `CountBox` 的边界 | 同上 |
| 全选框点不动 / 报 computed 赋值 | `v-model="isAllChecked"` | `:value` + `@click` |
| 空购物车全选框是亮的 | `every` 对空数组返回 `true` | 加 `list.length > 0` |
| 合计 `399.90000000000003` | 浮点累加 | `toFixed(2)` |
| 刷新后数量回去了 | 只改本地没调接口 | 补接口（含回滚） |
| 删除后合计没变 | 合计被存进了 `data` | 用 getters |
| 底部栏压住最后一条 | 漏 `padding-bottom` | 补 |
| 两个底栏重叠 | 结算栏没避开 tabbar | `bottom` 让出 tabbar 高度 |

---

==三：代码==

## 1. 实验 A：先"自然地"写错一次

**① 就按最直觉的写**

```html
<van-checkbox v-model="item.checked"/>
<CountBox v-model="item.count" :min="1" :max="item.stock"/>
```

**② 打开 Vue Devtools 的 Vuex 面板，点一下复选框、点一下 +**

**③ 观察**：数字变了、合计变了、**面板里一条记录都没有**。

**④ 再试**：在 `CountBox` 里把 `min` 改成 1 的情况下，用 `v-model` 是不是能填 0？**能**——因为 `v-model` 直接赋值，没走 `reduce()/add()`。

**⑤ 改成 §二.3 的正确写法** → 面板出现 `cart/updateChecked` / `cart/updateCount`。

> **这个实验必须做。** 你不是在学"正确的写法"，是在**认出那个"看起来对但其实错"的形态**。

## 2. 实验 B：`every` 的空数组

```js
[].every(x => x.checked)     // true  ← 记住这个
[].some(x => x.checked)      // false
```

**然后**：把购物车删空，看全选框 —— 不加 `length > 0` 就是亮的。

## 3. 实验 C：getters 的自动重算

**① 勾两条商品** → 合计 398
**② 取消一条** → 合计自动变 199，**全选框自动灭**
**③ 再勾回来** → 合计 398，**全选框自动亮**

**④ 删掉最后一条未勾选的** → 全选框自动变亮（因为剩下的都勾了）

**这三步里你没有写一行"同步代码"。**

## 4. 实验 D：乐观更新的回滚

```js
async changeCount (item, count) {
  const old = item.count
  this.updateCount({ id: item.id, count })
  try {
    await updateCartCount({ id: item.id, count })
  } catch (e) {
    this.updateCount({ id: item.id, count: old })    // ← 关键：用 old，不是 item.count
  }
}
```

**验证**：把接口地址故意写错 → 点 + → 数字先变、再退回去。

**反例**：`catch` 里写 `count: item.count` → **回滚成"新值"，等于没回滚**（因为 `item.count` 已经被改了）。

## 5. 实验 E：删除后三件事自动对

**① 勾两条（合计 398），删掉其中一条**
**② 期望**：列表少一条、合计变 199、全选框灭（如果剩下那条没勾）

**③ 全部删空** → `van-empty` 出现，底部结算栏合计变 `¥0.00`

---

==四：总结==

## 1. 一句话记住三个

- **`v-model` 永远不绑 state**：绑上去就是黑账，还会绕过组件的边界判断。
- **能算的不存**：`total` / `isAllChecked` 都是 getters，删一条三处自动对。
- **`every` 对空数组返回 `true`**，全选判断必须加 `length > 0`。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 五个 mutation | `setList` / `updateCount` / `updateChecked` / `checkAll` / `delCart` |
| 三个 getter | `total` / `checkedCount` / `isAllChecked` |
| **复选框正确写法** | `:value="item.checked"` + `@click` |
| **数字框正确写法** | `:value="item.count"` + `@input` + `commit` |
| 全选框 | `:value="isAllChecked"` + `@click="checkAll(!isAllChecked)"` |
| 空数组坑 | `every` → `true`，必须 `length > 0 &&` |
| 删除 payload | id 数组（单个传 `[id]`，一个 mutation 管两种） |
| 二次确认 | `await Dialog.confirm()` + `try/catch` |
| 乐观更新 | 先 commit 再请求，失败**用存下的 `old`** 回滚 |
| 空态 | `van-empty` + "去逛逛" |

## 3. ⭐ 收敛时刻

**① Vue--11 §4.2 的 `item.count++` → 这一轮它以 `v-model` 的形态回来了**

Vue--11 那个坑你要"故意写错"才会遇到；**这一轮它是默认写法**。同一个错误，第二次出现时藏得更深。

**② Vue--17 的 `CountBox` → 第一次被"正确使用"**

Vue--17 你自己封装的组件，当时只是"能加减"。这一轮它接上了 commit，**成了"业务组件"**——`props` 是 state，`@input` 是 mutation。**这就是组件从"玩具"变成"零件"的过程。**

**③ Vue--10 的 `mapState` → 这一轮出现了两种配合**

| 场景 | 配合 |
|---|---|
| 列表渲染 | `mapState('cart', ['list'])` |
| 算出来的 | `mapGetters('cart', ['total', ...])` |

**两个都进 `computed`，但一个读"存着的"，一个读"算出来的"。** 你现在应该能一眼分清。

**④ Vue--09 的"两份真相" → 这一轮用显式的反例讲透了**

`isAllChecked` 存起来会怎样（§5.2 那张表）。**Vue--09 是"讲道理"，这一轮是"如果存了，删一条你就得记得更新三处"。**

**⑤ Vue--13 的 Layout → 这一轮第一次遇到"两个底栏"**

结算栏 + tabbar 会叠。**这是布局组件带来的第一个真实麻烦**，解决办法就一句"让出高度"。

## 4. 静默失败清单

这一轮的坑**高度集中**，几乎全在"绑定方式"上：

| # | 做法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `v-model="item.count"` | 全对，devtools 空 | 直接赋 state |
| 2 | `v-model="item.checked"` | 全对，devtools 空 | 同上 |
| 3 | `v-model="isAllChecked"` | 报"computed has no setter" | getters 是只读 |
| 4 | `every` 没判空 | 空车全选框是亮的 | 真空真 |
| 5 | 合计存 `data` | 改数量合计不动 | 副本 |
| 6 | 回滚用 `item.count` | 失败后数字不变 | 已经是新值了 |
| 7 | 只改本地不请求 | 刷新回到旧值 | 没同步 |
| 8 | 用 `index` 当 key | 删一条后勾选错位 | DOM 复用 |
| 9 | 侧滑删除没二次确认 | 手滑就删了 | 少了 Dialog |
| 10 | 漏 `padding-bottom` | 最后一条被压住 | 固定定位不占位 |

**第 1、2 条是这一轮的全部价值**：它们**让"错的写法"比"对的写法"短**。**这跟 C# 不一样——C# 里你写 `readonly` 字段赋值，编译器直接不让你过；JS 里它默默跑通。**

**工程上怎么防**：

- **全项目搜 `v-model=`**，凡右边出现 `item.` / `state` / `this.$store` 的，一律改；
- 组件里只暴露 `mapMutations` 出来的函数，**不让 `item` 有被直接赋值的机会**；
- 边界（min/max）**只在组件内部判断**，不让父组件有机会绕过；
- 每次改完购物车，**扫一眼 devtools 的 Vuex 面板**——空的就是黑账。

**这不是 bug，是代价**：Vue 的 `v-model` 是"语法糖 + 约定"，它不知道你绑的是本地变量还是仓库状态。**省了代码，就要还一份注意力。**

## 5. C# 类比可用度

| C# / .NET 侧 | 购物车 | 可用度 | 注意 |
|---|---|:--:|---|
| `List<CartItem>` + 仓储方法 | `list` + 五个 mutation | ⭐⭐⭐ | 集合操作必须有主键 |
| LINQ `Where().Sum()` | `filter().reduce()` | ⭐⭐⭐ | 一比一 |
| **计算属性 `Total => Items.Sum()`** | `getters.total` | ⭐⭐⭐ | **都是"不存，现算"** |
| `INotifyPropertyChanged` | state 变 → 视图变 | ⭐⭐ | 机制像，Vue 自动 |
| `Idisposable` / 事件解绑 | （本轮没涉及） | — | — |
| **`readonly` 字段赋值编译失败** | `v-model` 绑 state **照样跑** | ❌ | **最重要的差异** |
| 事务（先改后提交 / 回滚） | 乐观更新 + 回滚 | ⭐⭐⭐ | 都是"先假装成功" |

**用法建议**：把购物车想成**一个仓储 + 一个只读的 `Total` 属性**。

```csharp
public class CartStore {
    private List<CartItem> _items = new();          // state
    public decimal Total =>                          // getter
        _items.Where(i => i.Checked).Sum(i => i.Price * i.Count);
    public void UpdateCount(int id, int count) {     // mutation
        var item = _items.FirstOrDefault(i => i.Id == id);
        if (item != null) item.Count = count;
    }
}
```

**你现在该能看出这个类"哪里不对"**：`_items` 是 `private`，但元素的属性是**可变**的——**外面拿到 `item` 就能改 `item.Count`**，绕过 `UpdateCount`。**这正是 Vue 里 `item.count = xxx` 能跑通的原因：Vue 拦得住"替换 list"，拦不住"改元素属性"。**

**C# 的解法**：`CartItem` 做成 `record`（不可变），改数量就得替换整个元素——那时你**必须**走方法。**Vue2 没这个约束，只能靠纪律。**

## 6. 解锁边界

**本轮新解锁**

- 购物车三块布局、结算栏与 tabbar 的高度冲突
- `cart` 模块五个 mutation 的完整设计（含 `delCart` 收 id 数组）
- `mapState` / `mapGetters` 在真实页面的配合
- **所有绑定的正确写法**（复选框 / 数字框 / 全选框）与 `v-model` 绑 state 的后果
- `every` 对空数组返回 `true`，全选判断必须判空
- `total.toFixed(2)` 与"真项目金额由后端算"
- **乐观更新 + 回滚**（含"回滚要用保存的旧值"这个细节）
- `van-swipe-cell` 侧滑删除、`Dialog.confirm` 的 `try/catch` 写法
- 空购物车引导（`van-empty` + "去逛逛"）
- "只 commit 一次，合计/全选/列表三处自动对"的实证

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 订单结算台（收货地址） | **Vue--19（134）** |
| 通用接口封装 + 购物车结算 | Vue--19（135） |
| **立即购买 + `mixin`** | Vue--19（136） |
| 提交订单并支付 | Vue--19（137） |
| 订单管理 / 个人中心 | Vue--19（138） |
| **打包优化** | Vue--19（139） |
| 空购物车"猜你喜欢"推荐 | 课程未讲 |
| 全选与后端的同步策略（谁说了算） | 课程未深入 |

⚠️ **术语撞车登记**（本轮新增一条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `checked` | 复选框选中状态 | `:checked` DOM 属性 | 项目里是前者 |

## 7. 下一轮预告

**Vue--19（134-139，6 集 / 约 2 小时 50 分）：结算台 · 订单 · mixin · 打包优化**

**这是整章最后一轮，也是最长的一轮（2h50m）。**

| 集 | 内容 | 关键点 |
|---|---|---|
| 134 | 收货地址列表 | 又一个列表页，但这次是"选一个" |
| 135 | 通用接口封装 + 购物车结算 | **同样的接口给两种场景用**（购物车结算 / 立即购买） |
| 136 | 立即购买 + **`mixin`** | **Vue2 的代码复用机制**，和"组件"是两条路 |
| 137 | 提交订单 + 支付 | 一段"必须小心"的流程 |
| 138 | 订单管理 / 个人中心 | 快速跑通 |
| 139 | **打包优化** | `chainWebpack` / 分包 / 分析体积 |

**136 的 `mixin` 是新概念**，也是 Vue2 特有的东西（Vue3 组合式之后基本不用了）。**139 的打包优化是唯一一节讲"上线"的**——Vue--08 埋的 `productionSourceMap` 到那里才真正用上。

开跑之前请确认：

1. 购物车列表能渲染，**devtools 里能看到 `cart/setList`**；
2. 点勾选 / 改数量，**面板里都有记录**（这是本轮唯一的验收标准）；
3. 删空后是 `van-empty` + "去逛逛"，**不是白屏**。

**强烈建议开新对话** —— 2h50m 是这一章最长的一段，塞进当前上下文会很吃力。
