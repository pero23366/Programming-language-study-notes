# Vue--17 · 商品详情 · 加购弹层 · 数字框封装 · token 判断

> **对应课程**：123-126（黑马 `BV1HV4y1a7n4`，4 集 / 约 1 小时 44 分）
> **读法**：前两集是"做页面"（快），**后两集是这一轮的真东西**：125 是你第一次写"给别人用的组件"，126 是第一次做"动作级鉴权"。
> **本轮定位**：Vue--13 学了"页面级"的准入（守卫），这一轮学"**动作级**"的准入（点按钮时判断）。**这两层是电商的标配，缺一层就是漏洞或坏体验。**
> **前置**：Vue--16（首页/搜索，会跳详情）、Vue--15（token + 守卫）、Vue--04（组件通信）。

---

==一：概念==

## 1. 详情页：路由参数取 id（123）

### 1.1 路由怎么写

```js
{ path: '/detail/:id', component: () => import('@/views/detail') }
```

跳转：

```js
this.$router.push(`/detail/${item.id}`)
```

**为什么这里用 `params`，而搜索页用 `query`？**

| 场景 | 用什么 | 理由 |
|---|---|---|
| 搜索关键词 | **`query`** `/search?keyword=手机` | 它是**筛选条件**，可以没有、可以有多个 |
| 商品 id | **`params`** `/detail/3` | 它是**资源标识**，没有它这个页面就没意义 |

**一句话：路径里有它才能活 → `params`；它是可选的附加条件 → `query`。**

> 🔴 **`params` 必须在路由表里声明 `:id`**。`{ path: '/detail', params: { id } }` 这种"不声明直接传"是 Vue--07 那个坑——**跳过去就丢**。

### 1.2 取参 + 请求

```js
created () {
  this.id = this.$route.params.id
  this.getDetail()
}
```

```js
async getDetail () {
  const res = await getGoodsDetail({ id: this.id })
  this.detail = res.data
}
```

**渲染时注意字段层级**：接口返回常常是 `{ data: { detail: {...}, related: [] } }`，**你渲染的是 `detail.xxx`，不是 `detail.detail.xxx`**——这一层错位是"页面空白"的第一大原因。

### 1.3 详情页为什么**不**在 Layout 里

Vue--13 的路由表：

```
/login          一级（无壳）
/               一级（壳 + 4 个 tab 页）
```

详情页加在哪？

```js
{ path: '/detail/:id', component: () => import('@/views/detail') }    // ← 一级，独立
```

| 如果放进 Layout（有 tabbar） | 独立一级（无 tabbar） |
|---|---|
| 底部有 4 个 tab | 底部是「客服 / 购物车 / 加入购物车」 |
| 用户能直接切到别的 tab | 用户只能返回 |
| **两个底部栏打架** | 干净 |

**判据：这个页面是属于"主流程"还是"一个临时的深入页"。** 详情、结算、订单详情都属于后者——**用户进来是为了看完就回去**，所以给它独立的一级路由 + 自己的底部操作栏。

### 1.4 底部操作栏

```css
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 50px;
  display: flex;
  background: #fff;
  z-index: 10;
}
```

**内容区要留出底部空档**，否则最后一屏会被盖住：

```css
.detail { padding-bottom: 50px; }
```

> 🟡 `position: fixed` 在移动端有个老坑：**iOS 键盘弹起时，fixed 元素会跟着飘**。详情页没输入框，所以没事；**但购物车、结算页有输入框时要留意**（真项目常用 `position: sticky` 或动态改高度）。

### 1.5 🔴 id 不存在怎么办

用户手输 `/detail/99999`，接口返回 404 或空数据。**你至少要有个兜底**：

```html
<van-empty v-if="!loading && !detail.id" description="商品不存在或已下架"/>
```

**别让页面一直转圈**——这是移动端最常见的"死页面"。

---

## 2. 弹层：它不是一个页面（124）

### 2.1 `van-popup`

```html
<van-popup v-model="showSku" position="bottom" round :style="{ height: '60%' }">
  <!-- 内容 -->
</van-popup>
```

| 属性 | 值 | 说明 |
|---|---|---|
| `v-model` | 布尔 | **打开/关闭** |
| `position` | `bottom` / `top` / `left` / `right` / `center` | 从哪滑出 |
| `round` | 布尔 | 圆角 |
| `close-on-click-overlay` | 默认 `true` | 点遮罩关闭 |
| `lock-scroll` | 默认 `true` | **打开时锁住背景滚动** |

**`v-model` 在这里是"双向"的**：你点遮罩，van-popup 内部会把 `v-model` 置 `false`。**所以 `showSku` 必须放在 `data` 里**（不能是 computed）。

### 2.2 弹层里放什么

电商的"选规格"弹层，标准四块：

```
┌──────────────────────────┐
│  [图]   ¥ 199            │  ① 商品信息（让用户确认买的是啥）
│        已选：黑色  XL     │
├──────────────────────────┤
│  颜色： ○黑 ○白 ○红      │  ② 规格选择
│  尺码： ○S ○M ○L         │
├──────────────────────────┤
│  数量：  [-] 1 [+]       │  ③ 数字框（就是 125 要封装的）
├──────────────────────────┤
│  [    加入购物车    ]     │  ④ 确定按钮
└──────────────────────────┘
```

**为什么要弹层而不是跳新页面？**

| 弹层 | 新页面 |
|---|---|
| 详情页**不销毁**，不重新请求 | 返回要重新加载 |
| 用户可以只关掉，不上当 | 要后退 |
| 停留感强 | 打断感强 |

**弹层是"在同一份上下文里做决定"**，这是它存在的全部理由。

### 2.3 状态放哪

```js
data () {
  return {
    showSku: false,                    // 弹层开关
    currentSku: { color: '黑', size: 'XL' },   // 用户选的规格
    count: 1,                          // 数量
    stock: 99                          // 库存（接口给）
  }
}
```

**全是局部 UI 状态，一个都不进 vuex**。判据还是那句：**只有这个页面关心 → 放 `data`。**

### 2.4 弹层里的"确定"要收集什么

```js
async handleAdd () {
  const payload = {
    goodsId: this.id,
    skuId: this.currentSku.id,
    count: this.count
  }
  await addToCart(payload)
  this.$toast.success('已加入购物车')
  this.showSku = false
}
```

**三个字段缺一不可**：买什么（`goodsId`）、哪个规格（`skuId`）、几件（`count`）。

> 🔴 **规格是 `skuId` 不是 `color + size`**。真实后端只认 sku 的 id——因为"黑+XL"和"白+XL"可能是两个不同的库存记录。**你别自己拼字符串传给后端。**

---

## 3. 数字框：第一次封装组件（125）🔥

### 3.1 为什么不用 `van-stepper`

vant 有现成的 `<van-stepper v-model="count"/>`，一行搞定。**课程自己封装，是为了让你第一次完整走一遍"组件设计"**——这个能力比省下的那几行重要得多。

> 真实项目里：**能用库就用库**。但**"能自己写"和"只会用"是两种人。**

### 3.2 组件 API 设计（这一步比写代码重要）

先定"外面怎么用它"，再写里面：

```html
<CountBox v-model="count" :min="1" :max="stock"/>
```

| 接口 | 类型 | 默认 | 作用 |
|---|---|---|---|
| `v-model` | number | 1 | 当前数量 |
| `min` | number | 1 | 下限 |
| `max` | number | 99 | 上限（库存） |

**事件**：

| 事件 | 何时触发 |
|---|---|
| `input` | 数量变了（给 `v-model` 用） |
| `change` | 数量变了（给业务用，比 `input` 语义清晰） |

**设计原则**：**props 是"输入"，events 是"输出"，组件内部状态一律私有。** 你在 C# 里设计一个类也是这个思路——构造函数收参数，方法往外抛事件或返回值，字段不外露。

### 3.3 🔴 `v-model` 在组件上的真相

```html
<CountBox v-model="count"/>
```

**这一行是语法糖，等价于：**

```html
<CountBox :value="count" @input="count = $event"/>
```

**所以组件里必须做两件事**：

```js
export default {
  name: 'CountBox',
  props: {
    value: { type: Number, default: 1 }
  },
  methods: {
    update (val) {
      this.$emit('input', val)      // ← 唯一的出口
    }
  }
}
```

| 要求 | 不满足会怎样 |
|---|---|
| prop 必须叫 **`value`** | `v-model` 绑不上，**不报错**，数量永远不变 |
| 必须 `$emit('input', v)` | 父组件收不到，同上 |

> 🔴 **`value` 这个名字不能改**（Vue2）。改成 `count` 就得用 `:count` + `@change` 手动绑，不能用 `v-model` 简写。**Vue3 才支持 `v-model:count`。**

### 3.4 🔴 不能直接改 props

```js
// ❌ 错
reduce () { this.value-- }
```

控制台：

```
[Vue warn]: Avoid mutating a prop directly since the value will be overwritten
whenever the parent component re-renders.
```

**为什么不行**：`value` 是父组件 `count` 的**副本引用**。你改了，父组件的数据没变；下次父组件重渲染，你的修改**被覆盖掉**。

**正确做法（两个方向走一遍）**：

```
子组件想改 → $emit('input', 新值) → 父组件 v-model 自动更新 count
                                    → 新 count 通过 :value 传回来
                                    → 子组件拿到新 value
```

**这就是"单向数据流"的完整循环。** Vue--04 讲过"子传父用 `$emit`"，这里是它在**双向绑定**场景下的具体形态。

### 3.5 边界处理：三道都要

```js
methods: {
  reduce () {
    if (this.value <= this.min) return          // ① 方法内挡
    this.$emit('input', this.value - 1)
  },
  add () {
    if (this.value >= this.max) return          // ① 方法内挡
    this.$emit('input', this.value + 1)
  }
}
```

```html
<van-icon name="minus" :class="{ disabled: value <= min }" @click="reduce"/>
<van-icon name="plus" :class="{ disabled: value >= max }" @click="add"/>
```

| 层 | 作用 |
|---|---|
| 样式 `.disabled` | 让用户**看出来**不能点 |
| 方法里 `return` | **真正**挡住（样式只是提示） |
| `props` 校验 | 挡住"传错类型"（比如传了字符串） |

**三层各管一件事，缺一层都有漏洞**：只有样式 → 用户能点；只有方法 → 用户看不出为什么点了没反应。

### 3.6 props 校验

```js
props: {
  value: { type: Number, default: 1 },
  min: { type: Number, default: 1 },
  max: { type: Number, default: 99 }
}
```

| 写法 | 效果 |
|---|---|
| `type: Number` | 传字符串会**警告**（不报错，但控制台红字） |
| `default` | 不传时的值 |
| `required: true` | 必传，不传就警告 |

> 🟡 **`type` 只是"警告"不是"拦截"**：传 `"1"`（字符串）照样能用，因为 JS 会隐式转换。**这就是 JS 和 C# 的差别**——C# 编译期就报错，JS 只能"提醒你一下"。

**C# 对照**：

```csharp
public CountBox(int value = 1, int min = 1, int max = 99) {
    if (value < min) throw new ArgumentOutOfRangeException(nameof(value));
    Value = value;
}
```

**C# 是"参数不合规就抛异常"，Vue 是"警告 + 照跑"。** 所以 Vue 里**校验必须自己写在逻辑里**（§3.5 的第 ① 道）。

---

## 4. 加购时判断 token（126）🔥

### 4.1 两层"拦截"

Vue--15 的守卫管**页面**，这里管**动作**：

| 层 | 拦什么 | 手段 | 没登录的表现 |
|---|---|---|---|
| **页面级**（119） | 整个页面 | `beforeEach` | 直接进不去 `/cart` |
| **动作级**（126） | 一次点击 | 函数开头 `if` | 能看详情，但**不能加购** |

**为什么详情页不做页面级拦截？**

因为**未登录用户也应该能看商品**——这是电商的基本逻辑（先勾引，再要求注册）。**如果详情页也要登录，90% 的用户在第一步就走了。**

**这就是 126 存在的理由：把"必须登录"的边界从"页面"精确到"动作"。**

### 4.2 完整流程

```js
handleClick () {
  if (!this.token) {
    // ① 没登录：提示 + 引导
    Dialog.confirm({
      title: '提示',
      message: '请先登录后再操作'
    }).then(() => {
      this.$router.push(`/login?redirect=${this.$route.fullPath}`)
    }).catch(() => {})
    return
  }
  // ② 有登录：开弹层
  this.showSku = true
}
```

**三个细节：**

| 细节 | 说明 |
|---|---|
| `redirect` 用 **`fullPath`** | `path` 会丢 `?id=3` 这类参数（Vue--15 §4.4 提过） |
| `.catch(() => {})` | 用户点"取消"会 reject，不接就红字 |
| `return` 在 `if` 里 | 否则没登录也会开弹层 |

### 4.3 🔴 登录回来之后……然后呢

这是**126 那 42 分钟最纠结的地方**，也是真实产品里最容易被忽略的体验问题：

```
用户点"加入购物车"
 → 提示"请先登录"
 → 跳登录页（redirect=/detail/3）
 → 登录成功 → 回到 /detail/3
 → ？？？
```

**三种做法，代价递增：**

| 做法 | 体验 | 实现成本 |
|---|---|---|
| **A. 什么都不做**（课程） | 用户要**再点一次**加购 | 0 |
| B. 回来自动开弹层 | 好一些，但规格还得重选 | 低（`redirect` 带 `?action=add`） |
| C. 回来自动加购 | 最好，但"未经确认就下单"有风险 | 高（要暂存 skuId + count） |

**课程选 A**——不是偷懒，是**A 是最不容易出错的**。B 和 C 需要把"用户意图"跨页面暂存，一旦登录失败/超时，状态就脏了。

> **这个取舍值得记住**：**功能"看起来完整"不等于"该做"。** 每加一层"自动继续"，你就多一份"状态不一致"的风险。**先做对的，再做爽的。**

### 4.4 加购成功之后：角标

```js
// TabBar 里
<van-tabbar-item to="/cart" :badge="cartCount">购物车</van-tabbar-item>
```

```js
computed: {
  ...mapGetters('cart', ['totalCount'])
}
```

**`cartCount` 从 vuex 的 getters 来**（Vue--11 §4.3）——加购后 `commit` 一改，角标**自动更新**，不用手动通知。

**这就是 vuex 在这一刻的兑现**：加购发生在**详情页**，角标显示在 **Layout 的 TabBar**，两个组件毫无父子关系。**没有 vuex，你得用 EventBus 到处广播。**

### 4.5 加购失败怎么办

```js
try {
  await addToCart(payload)
  this.$toast.success('已加入购物车')
  this.showSku = false
} catch (e) {
  // 拦截器已经 toast 过了
  // 这里不要关弹层 —— 让用户能重试
}
```

**关键：失败时不要关弹层。** 关了用户就得重新选规格，白费一次操作。**成功才关，失败留着。**

---

==二：格式==

## 1. 现场的标准结构

```js
data () {
  return {
    detail: {},          // 商品详情
    showSku: false,      // 弹层开关
    sku: {},             // 选中的规格
    count: 1             // 数量
  }
}
```

## 2. `CountBox.vue` 骨架

```js
export default {
  name: 'CountBox',
  props: {
    value: { type: Number, default: 1 },
    min: { type: Number, default: 1 },
    max: { type: Number, default: 99 }
  },
  methods: {
    reduce () {
      if (this.value <= this.min) return
      this.$emit('input', this.value - 1)
    },
    add () {
      if (this.value >= this.max) return
      this.$emit('input', this.value + 1)
    }
  }
}
```

```html
<div class="count-box">
  <span :class="{ disabled: value <= min }" @click="reduce">-</span>
  <span>{{ value }}</span>
  <span :class="{ disabled: value >= max }" @click="add">+</span>
</div>
```

## 3. `v-model` 对照

| 你写的 | 编译成 |
|---|---|
| `<CountBox v-model="count"/>` | `<CountBox :value="count" @input="count = $event"/>` |
| `<input v-model="msg"/>` | `<input :value="msg" @input="msg = $event.target.value"/>` |

**同一个机制，两处形态。**

## 4. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| 数量点了不动 | prop 名不是 `value` / 没 emit `input` | §3.3 |
| `Avoid mutating a prop directly` | 子组件里 `this.value--` | 改成 `$emit` |
| 详情页空白 | 字段层级错（`detail.detail.xxx`） | 打 log 看结构 |
| `id` 是 `undefined` | 路由没声明 `:id` | §1.1 |
| 弹层点了遮罩不关 | `showSku` 不在 `data` 里 | 放 `data` |
| 弹层打开背景还能滚 | `lock-scroll` 关掉了 | 默认是开的 |
| 加购后角标不更新 | 角标读的是组件 `data` | 改用 `mapGetters` |
| 登录后跳到首页 | `redirect` 用了 `path` 或没传 | 用 `fullPath` |
| 加购失败弹层关了 | `catch` 里也 `showSku = false` | 只在成功时关 |

---

==三：代码==

## 1. 实验 A：`v-model` 的等价改写

**① 先写简写**

```html
<CountBox v-model="count"/>
```

**② 改成展开写法**

```html
<CountBox :value="count" @input="val => count = val"/>
```

**③ 行为完全一样** → 证明 `v-model` 就是糖。

**④ 再把 prop 名改成 `num`** → `v-model` 立刻失效（不报错，只是不动）。**这条验证一次，以后不会忘。**

## 2. 实验 B：数字框的边界

```html
<CountBox v-model="count" :min="1" :max="3"/>
```

| 点法 | 期望 |
|---|---|
| 从 1 点"−" | 不动，`−` 变灰 |
| 加到 3 再点"+" | 不动，`+` 变灰 |
| 把 `max` 改成 0 | 初始值 1 > max，**应当有警告或无响应**（说明校验的必要性） |

## 3. 实验 C：弹层的 `lock-scroll`

**① 详情页做得很长，能滚动**
**② 打开弹层**
**③ 手指在遮罩上滑** → 背景**不动**（`lock-scroll` 默认开）

**④ 手动写 `:lock-scroll="false"`** → 背景会跟着滚，观感很乱。

## 4. 实验 D：动作级拦截的四种组合

| token | 点"加入购物车" | 期望 |
|---|---|---|
| 无 | 点 | 弹确认框 → 跳登录（带 `redirect`） |
| 无 | 取消 | 什么都不发生，留在详情页 |
| 有 | 点 | 打开弹层 |
| 有 | 弹层里点"确定" | toast 成功 + 关弹层 + **tabbar 角标 +1** |

## 5. 实验 E：验证角标是靠 vuex 更新的

**① 角标用 `mapGetters('cart', ['totalCount'])`**
**② 在详情页加购**
**③ 切到购物车 tab** → 数据在
**④ 回来再切** → 还在

**⑤ 反证**：把角标改成组件自己的 `data`（`cartCount: 0`），加购后手动 `this.cartCount++` —— 切个 tab 回来**归零**（组件重建）。**这就是"状态放错地方"的代价。**

---

==四：总结==

## 1. 一句话记住三个

- **`v-model` = `:value` + `@input`**，prop 名必须叫 `value`。
- **props 只读**：子组件想改只能 `$emit`，让父组件改。
- **加购判断 token 是"动作级拦截"**，页面级拦截（守卫）拦不了这个。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 详情路由 | `/detail/:id` + `$route.params.id` |
| params vs query | **标识用 params，条件用 query** |
| 详情页归属 | **一级路由，不进 Layout**（否则两个底栏打架） |
| `van-popup` | `v-model` 开关放 `data`，`position="bottom"` |
| 加购三字段 | `goodsId` / `skuId` / **`count`** |
| 规格 id | 传 **`skuId`**，别自己拼 `color+size` |
| `v-model` 展开 | `:value` + `@input` |
| **prop 名** | 必须 **`value`**，改名则 `v-model` 失效 |
| 子组件改值 | `this.$emit('input', 新值)` |
| 边界三道 | 样式灰化 + 方法 `return` + props 校验 |
| 动作级拦截 | 函数开头 `if (!token)`，**带 `return`** |
| `redirect` | 用 **`fullPath`**，不用 `path` |
| 加购失败 | **不关弹层**，只在成功时关 |
| 角标 | 用 `mapGetters`，不存组件 `data` |

## 3. ⭐ 收敛时刻

**① Vue--04 的 `$emit` → 第一次用在"双向"上**

Vue--04 你学 `$emit` 是"子组件通知父组件发生了什么事"。这一轮它是"**请求修改**"——子组件不自己改，而是把新值发上去，等父组件回传。**同一条通道，两种语义。**

**② Vue--11 §5.1 的"局部 UI 状态不进 vuex" → 弹层是活例**

`showSku`、`currentSku`、`count` 全在 `data`。**如果这些进 vuex，你会得到"切页面回来弹层还开着"这种鬼现象。**

**③ Vue--15 的守卫 → 现在知道了它的边界**

守卫只能拦"进页面"。**"能在详情页看，但不能加购"这种粒度，守卫做不到。** 所以必须再有一层 `if (!token)`。

**④ Vue--16 的 `query` vs 这一轮的 `params` → 形成了判据**

上一轮我说"搜索用 query"，这一轮说"id 用 params"。**不是随机的**：一个是条件、一个是标识。**你现在应该能自己判断新的场景该用哪个。**

**⑤ Vue--12 的按需引入 → 这一轮又多了 3 个组件**

`Popup`、`Icon`、`Dialog`（还有 `Empty`）。**`utils/vant.js` 那个文件现在已经是你能直接看出"项目用到哪些组件"的清单了。**

## 4. 静默失败清单

| # | 做法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | 子组件 prop 叫 `num` 却用 `v-model` | 数量永远不变，**零报错** | `v-model` 只认 `value` |
| 2 | `this.value--` 直接改 props | 有时能变（父组件没重渲染时） | 假象，迟早被覆盖 |
| 3 | 详情页字段层级错 | 页面空白 | `detail.detail.xxx` |
| 4 | `:lock-scroll="false"` | 弹层打开时背景跟着滚 | 观感崩 |
| 5 | 加购角标存组件 `data` | 切 tab 回来归零 | 组件重建 |
| 6 | `redirect` 用 `path` | 登录后回到 `/detail` 没有 id → 空白 | 参数丢了 |
| 7 | 加购失败也关弹层 | 用户要重新选规格 | `catch` 里关了 |
| 8 | 传 `color+size` 给后端 | 后端返回"规格不存在"或加错 | 该传 `skuId` |
| 9 | `min` 传字符串 `"1"` | 比较时 `"1" <= 1` 为真，行为诡异 | props 校验 + 转数字 |
| 10 | 弹层 `v-model` 绑 computed | 点遮罩关不掉，报"Avoid mutating" | 必须绑 `data` |

**第 1 和第 2 条是组件封装的必踩坑**，它们共同的特征是：**代码看起来完全正确，就是不工作。**

**工程上怎么防**：

- 封装组件**先定 API 再写实现**（`v-model` / props / 事件），写在文件头顶的注释里；
- **prop 一律写 `type` 和 `default`**，让错误在控制台就被看见；
- 组件里**出现 `this.xxx =` 而 `xxx` 是 props，立刻改成 `$emit`**；
- 边界（min/max）**写在一处**（`reduce`/`add` 里），样式只负责"看起来能点"。

**这不是 bug，是代价**：Vue 的 `v-model` 是**约定式魔法**——它默认你的 prop 叫 `value`、事件叫 `input`。**约定省了代码，代价是"改名就静默失效"。**

## 5. C# 类比可用度

| C# / .NET 侧 | 本轮 | 可用度 | 注意 |
|---|---|:--:|---|
| 构造函数参数 + `readonly` 字段 | `props` | ⭐⭐⭐ | **都是"外面给的，里面不能改"** |
| `event EventHandler<T>` / 回调委托 | `$emit` | ⭐⭐⭐ | 都是"往外抛" |
| 属性 setter 里 `Notify()` | `$emit('input')` → 父组件改 | ⭐⭐ | 目的像，机制不同 |
| `ArgumentOutOfRangeException` | `min/max` 的 `return` | ⭐⭐⭐ | 都是边界检查，**但 .NET 会抛，Vue 只能自己 return** |
| 方法级 `[Authorize]` | `if (!token)` | ⭐⭐⭐ | 都是"这个动作要票" |
| 类设计（属性公开、字段私有） | props 公开、内部状态私有 | ⭐⭐⭐ | 同一条封装原则 |
| `Nullable<int>` 校验 | props `type` | ⭐⭐ | .NET 是强制，Vue 是警告 |

**用法建议**：把 `CountBox` 当成一个**只能通过构造函数赋值、通过事件通知变化的类**：

```csharp
public class CountBox {
    public int Value { get; }        // ← props，只读
    public event Action<int> OnInput; // ← $emit('input')
    public void Add() {
        if (Value >= Max) return;
        OnInput?.Invoke(Value + 1);   // ← 不自己改，通知外面
    }
}
```

**这个类为什么"不能自己改 `Value`"？** 因为真正的值存在**父组件**那里，`CountBox` 只是它的"投影"。**Vue 的 props 就是这个意思——子组件不拥有数据，它只是显示数据。**

**C# 里没有的**：**props 的"警告但不阻止"**。C# 的 `readonly` 是编译期硬约束，你在方法里写 `Value = 1` 直接编译失败。**JS 里 `this.value = 1` 能跑，只是控制台红字**——所以你得靠纪律，而不是靠编译器。

## 6. 解锁边界

**本轮新解锁**

- 详情页路由 `/detail/:id` 与 `params` 取值
- **params / query 的最终判据**（标识 vs 条件）
- 详情页作为一级路由（不进 Layout）的理由：**两个底栏打架**
- `position: fixed` 底栏 + 内容 `padding-bottom` 留位
- `van-popup`：`v-model` / `position` / `round` / `lock-scroll` / `close-on-click-overlay`
- 弹层"四块结构"与"为什么不跳页面"
- 加购 payload 三字段（`goodsId` / **`skuId`** / `count`）
- **组件封装完整流程**：先定 API（props + events）再写实现
- **`v-model` = `:value` + `@input`**；prop 名必须 `value`
- props 只读与 `$emit('input')` 的完整循环
- props 的 `type` / `default` / `required`，以及"只警告不拦截"的本质
- 边界处理三道（样式 / 方法 / 校验）
- **动作级鉴权**：`if (!token)` + `Dialog.confirm` + `redirect=fullPath`
- "登录回来要不要自动继续"的三种做法与取舍
- 加购失败**不关弹层**；角标靠 `mapGetters` 自动更新

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 购物车页静态布局 | **Vue--18（127）** |
| 购物车 vuex 模块 + 取数 | Vue--18（128） |
| `mapState` / `getters` 在购物车的密集使用 | Vue--18（129-133） |
| 结算台 / 订单 | Vue--19（134-139） |
| `mixin` | Vue--19（135 左右） |
| 打包优化（`chainWebpack` / 分包） | Vue--19（139） |
| `van-sku` 现成规格组件 | 课程自己写，没讲 |
| 登录后"自动继续动作"的完整实现 | 课程选 A（不做），只留了讨论 |

⚠️ **术语撞车登记**（本轮新增两条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `sku` | 最小库存单位（颜色+尺码） | 商品（spu） | **spu 是"iPhone 15"，sku 是"黑色 128G"** |
| `props` | 组件属性 | React 里的同名概念 | 名字一样，机制不同，别混 |

## 7. 下一轮预告

**Vue--18（127-133，7 集 / 约 2 小时 5 分）：购物车 —— vuex 最密集的一段**

七集，是整章最长的一轮（比这一轮还多 20 分钟）。核心就一件事：**把 Vue--11 那个购物车案例，用真实项目的方式重做一遍**。

| 集 | 内容 |
|---|---|
| 127-128 | 静态布局 + 构建 vuex 模块、取数入仓 |
| 129-130 | `mapState` / `getters` 渲染列表与合计 |
| 131-132 | 全选 / 单选 / 数量增减 |
| 133 | 删除（含二次确认） |

**Vue--11 你跳过了实操，这一轮正好补上**——而且这次是真实项目里的购物车，要接接口、要和详情页联动、要更新角标。

开跑之前请确认：

1. 详情页能按 id 取到数据（手输 `/detail/1` 也行）；
2. **数字框在 1 和 max 处都点不动**，且父组件的 `count` 真的变了；
3. **未登录点加购 → 提示 → 登录 → 回到详情页（不是首页）**。

**建议开新对话** —— 7 集的东西塞一个上下文，会中途断片。
