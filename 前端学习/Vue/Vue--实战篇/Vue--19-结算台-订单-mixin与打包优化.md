# Vue--19 · 结算台 · 通用接口 · mixin · 提交与支付 · 打包优化

> **对应课程**：134-139（黑马 `BV1HV4y1a7n4`，6 集 / 约 2 小时 50 分）
> **读法**：这是**整章最后一轮，也是最长的一轮**。134-135 是页面，**136 是新概念（mixin）**，137-138 是流程，**139 是唯一讲"上线"的一节**。mixin 和打包优化是这一轮唯一两个"知识增量"。
> **本轮定位**：把商城**做完并打包上线**。这一轮结束后，Vue2 部分就全通了——剩下的 140 起是 Vue3 组合式，你已经在 Vue3--01/02 学过开头。
> **前置**：Vue--18（购物车）、Vue--17（详情/加购）、Vue--15（token/守卫）。

---

==一：概念==

## 1. 结算台：一个页面，两种来源（134-135）

### 1.1 结算页的三块

```
┌─────────────────────────────┐
│ 📍 张三 138****8000          │  ① 收货地址（可点开换）
│    江西省南昌市××区××路      │
├─────────────────────────────┤
│ [图] 商品名  黑色XL   ¥199×2 │  ② 商品清单（只读，不能改数量）
│ [图] 商品名  白色M    ¥99×1  │
├─────────────────────────────┤
│ 商品金额            ¥497.00  │  ③ 金额明细
│ 运费                  ¥0.00  │
│ 合计                ¥497.00  │
├─────────────────────────────┤
│          合计 ¥497  [提交订单]│  ④ 底部栏（固定）
└─────────────────────────────┘
```

**和购物车最大的区别：这里的商品不能改数量、不能删。** 结算页是"确认页"，改东西要回购物车。

> 💡 **这是电商的通用设计**：结算页只做三件事——**确认地址、确认清单、付钱**。任何"还能改"的操作都会让用户犹豫。

### 1.2 收货地址

Vant 有现成组件：

```html
<van-address-list
  v-model="addressId"
  :list="addressList"
  default-id="1"
  @add="onAdd"
  @edit="onEdit"
/>
```

| 属性 | 作用 |
|---|---|
| `v-model` | 当前选中的地址 id |
| `list` | 地址数组（要有 `id` / `name` / `tel` / `address`） |
| `default-id` | 默认选中哪个 |
| `@add` / `@edit` | 新增 / 编辑 |

**如果放在弹层里**（点地址卡片弹出来），用 `van-popup position="bottom"` 包一层即可（Vue--17 §2.1）。

> 🔴 **地址 id 一定要带**。提交订单时要传 `addressId`，传"地址字符串"后端不认——**地址可能被用户改，只有 id 是稳定的。**

### 1.3 🔴 通用接口：一个接口服务两个入口

**问题来了**：结算有两个入口——

| 入口 | 商品从哪来 |
|---|---|
| 购物车 → 结算 | **vuex 里的 `cart.list`**（选中的那几条） |
| 商品详情 → 立即购买 | **路由带过来的** `skuId` + `count` |

**两套数据来源，但后面的流程完全一样**：算金额 → 选地址 → 提交订单。

**如果写两套接口**：

```js
getCartOrderInfo()      // 购物车结算
getBuyNowOrderInfo()    // 立即购买
```

**如果写一个接口**：

```js
getOrderInfo({ mode, ...params })
```

| `mode` | 额外参数 | 后端懂什么 |
|---|---|---|
| `'cart'` | `cartIds: [11, 12]` | 从我的购物车取这几条 |
| `'buy'` | `goodsId, skuId, count` | 直接按规格算价 |

```js
// api/order.js
export const getOrderInfo = (data) => request.post('/order/preview', data)
export const submitOrder = (data) => request.post('/order', data)
```

```js
// 结算页
const params = this.mode === 'cart'
  ? { mode: 'cart', cartIds: this.cartIds }
  : { mode: 'buy', goodsId: this.goodsId, skuId: this.skuId, count: this.count }

const res = await getOrderInfo(params)
this.orderInfo = res.data       // { list, total, freight, ... }
```

**为什么这样更好？**

| 维度 | 两个接口 | 一个接口 + mode |
|---|---|---|
| 金额计算规则 | **写两遍，可能不一致** | 一份 |
| 运费/优惠规则 | 写两遍 | 一份 |
| 加新入口（如"再来一单"） | 再写一个 | 加一个 mode |
| 后端维护 | 两套 | 一套 |

> **这是"参数化"的经典价值**：**流程相同、数据来源不同 → 用参数区分，不要复制流程。**

---

## 2. mixin：Vue2 的代码复用（136）🔥

### 2.1 问题：两个页面 80% 一样

购物车结算页和立即购买结算页，**逻辑几乎相同**：

```js
data () { return { addressList: [], addressId: '', orderInfo: {}, loading: false } }
created () { this.getAddress(); this.getOrderInfo() }
methods: {
  getAddress () { ... },
  getOrderInfo () { ... },
  submit () { ... }
}
```

**差在哪？** 只差 `getOrderInfo` 的参数（`mode: 'cart'` vs `mode: 'buy'`）。

**复制一份？** 两份代码，改一处忘另一处。
**用组件？** 不行——这是**页面的逻辑**，不是 UI。

**mixin 就是为这个场景生的：把"组件的可复用部分"抽出来，混进多个组件。**

### 2.2 怎么写

`src/mixins/order.js`：

```js
export default {
  data () {
    return {
      addressList: [],
      addressId: '',
      orderInfo: {},
      loading: false
    }
  },
  created () {
    this.getAddress()
    this.getOrderInfo()
  },
  methods: {
    async getAddress () {
      const res = await getAddressList()
      this.addressList = res.data
      const def = this.addressList.find(a => a.isDefault)
      this.addressId = def ? def.id : ''
    },
    async submit () {
      this.loading = true
      try {
        const res = await submitOrder(this.getParams())
        this.$router.replace(`/pay/${res.data.orderId}`)
      } finally {
        this.loading = false
      }
    },
    // 子组件（页面）必须自己实现这个
    getParams () { throw new Error('必须实现 getParams') }
  }
}
```

页面里：

```js
import orderMixin from '@/mixins/order'

export default {
  name: 'CartOrder',
  mixins: [orderMixin],
  created () {
    this.mode = 'cart'              // 只写差异部分
  },
  methods: {
    getParams () {
      return { mode: 'cart', cartIds: this.cartIds }
    }
  }
}
```

**页面从 80 行变成 15 行，且逻辑只有一份。**

### 2.3 🔴 合并策略：必须记住的四条

mixin 和组件都有同名项时，谁赢？

| 类型 | 合并规则 | 记忆法 |
|---|---|---|
| `data` | **递归合并**，**组件同名覆盖 mixin** | 组件赢 |
| `methods` / `computed` | **组件覆盖 mixin**（不报错！） | 组件赢 |
| **生命周期**（`created` 等） | **两个都执行，mixin 的先执行** | 都跑，mixin 在前 |
| `watch` | 合并成数组，**两个都执行** | 都跑 |

**第二条是最大的坑**：组件写了同名的 `getAddress`，**mixin 里那个被静默覆盖**，没有任何警告。你以为在改 mixin，其实组件里那份在跑。

**第三条容易让人困惑**：

```js
// mixin
created () { console.log('mixin created') }
// 组件
created () { console.log('component created') }
```

输出顺序：

```
mixin created
component created
```

**为什么 mixin 先？** 因为它像"基类构造函数"——**先初始化公共部分，再初始化特有部分**。

### 2.4 🔴 mixin 的三个坑

**坑 1：来源不明**

你在 `CartOrder.vue` 里看到：

```html
<p>{{ orderInfo.total }}</p>
```

**这个 `orderInfo` 是哪来的？** 组件里搜不到 `data` 里的 `orderInfo`，得去翻 `mixins/order.js`。

**组件越多、mixin 越多，这个问题越致命。** 新人接手一个用 5 个 mixin 的页面，**根本不知道某个变量/方法是哪来的**。

**坑 2：命名冲突静默覆盖**

两个 mixin 都有 `loading`：

```js
mixins: [orderMixin, payMixin]     // 两个都有 loading
```

**后写的覆盖前面的，不报错。** 你以为 `loading` 是 A 的，其实用的是 B 的。

**坑 3：隐式依赖**

mixin 里调了 `this.getParams()`，但**这个方法必须由组件实现**。

```js
// mixin 里
submit () { submitOrder(this.getParams()) }
// 组件忘了实现 → 运行时才炸，且报错指向 mixin，不指向组件
```

**这是"隐式契约"**：mixin 要求组件实现某些方法，但**没有类型系统约束**（JS 项目）。C# 里这功能叫**抽象方法**，编译器会逼你实现；**Vue 的 mixin 没有这种保障。**

### 2.5 Vue3 为什么不用 mixin 了

**Vue3 的组合式 API 用"函数"替代了 mixin**：

```js
// Vue2 mixin：变量凭空出现在 this 上
this.orderInfo

// Vue3 组合函数：明确地从函数返回值拿
const { orderInfo, getOrderInfo } = useOrder()
```

| | mixin | 组合式函数 |
|---|---|---|
| 来源 | **不明**（翻 mixin 文件） | **明确**（解构出来的） |
| 冲突 | 静默覆盖 | **重命名即可**（解构时改名） |
| 依赖 | 隐式（要求组件实现方法） | **显式传参** |
| 多次使用 | 只能一次（同一 mixin 混一次） | **可调多次**（每次独立状态） |

> **一句话总结**：mixin 是"**把属性撒到 `this` 上**"，组合式是"**把属性装进一个对象交给你**"。**后者能追踪来源，前者不能**——这就是 Vue3 弃用它的原因。
>
> 🟡 **但 mixin 没被删除**，Vue3 仍然支持。**老项目里到处是 mixin**，你得能读懂。**只是新代码不该再写。**

---

## 3. 提交订单与支付（137）

### 3.1 流程

```
点「提交订单」
 → 校验：地址选了吗？金额 > 0？
 → POST /order  → 返回 { orderId }
 → 跳 /pay/:orderId
 → 点「立即支付」 → POST /pay { orderId }
 → 成功 → 跳订单详情 / 订单列表
 → 失败 → 留在支付页，允许重试
```

### 3.2 防重复提交

**用户手快，会连点两次。** 结果：两个订单。

```js
async submit () {
  if (this.loading) return           // ① 判重
  this.loading = true                // ② 上锁
  try {
    const res = await submitOrder(this.getParams())
    this.$router.replace(`/pay/${res.data.orderId}`)
  } finally {
    this.loading = false             // ③ 无论成败都解锁
  }
}
```

```html
<van-button :loading="loading" :disabled="loading" @click="submit">提交订单</van-button>
```

**四道防线，缺一不可**：

| 层 | 作用 | 少了会怎样 |
|---|---|---|
| `:disabled` | 视觉上不能点 | 用户能点（但被 ① 挡） |
| `:loading` | 转圈，告诉用户在等 | 用户以为没反应，更用力点 |
| `if (this.loading) return` | **真正的锁** | 连点两次发两个请求 |
| `finally` 解锁 | 失败了还能重试 | 失败后按钮永久锁死 |

> 🔴 **`finally` 不是"可选的优雅"**：如果你在 `catch` 里解锁、`try` 成功后跳走——**跳走那次的 `loading` 没被清理**，返回时按钮是锁死的。**`finally` 保证任何路径都解锁。**

### 3.3 🔴 支付失败，订单还在

**这是真实电商里最重要的一条业务规则**：

| 情况 | 订单状态 | 用户看到 |
|---|---|---|
| 提交成功、支付失败 | **待付款** | 订单列表里有这笔，可以继续付 |
| 支付成功 | 待发货 | 正常 |

**所以"提交订单"和"支付"必须是两个动作、两笔记录。** 你不能"提交失败就什么都不留"，也不能"没付款就不算下单"——**用户可能付到一半网络断了。**

> **这条你现在知道就行**：课程里支付是模拟的，代码不会体现。但真实项目里，"订单状态机"是最容易出 bug 的地方。

### 3.4 下单成功后：清购物车

```js
// 提交成功后（在 mixin 的 submit 里，或用 watch 监听订单成功）
this.delCart(this.cartIds)           // 本地
await clearCartApi({ cartIds })      // 后端
```

**注意顺序**：**先提交订单成功，再清购物车。** 反过来（先清后提交）如果提交失败，用户购物车空了但没下单。

---

## 4. 订单列表与个人中心（138）

### 4.1 订单列表：状态 tab

```html
<van-tabs v-model="active" @change="onTabChange">
  <van-tab title="全部"/>
  <van-tab title="待付款"/>
  <van-tab title="待发货"/>
  <van-tab title="待收货"/>
  <van-tab title="已完成"/>
</van-tabs>
```

**每个 tab 就是一串数字状态码**：

| 状态 | 码 | 能做什么 |
|---|---|---|
| 待付款 | 1 | 去支付 / 取消 |
| 待发货 | 2 | 提醒发货 |
| 待收货 | 3 | 确认收货 |
| 已完成 | 4 | 评价 / 再来一单 |

> ⚠️ **别用字符串做状态**（`'待付款'`）。**用数字码，前端做映射**——文案会改、可能要多语言，码不会。

### 4.2 退出登录：要清的东西不止 token

```js
logout () {
  this.setToken('')                    // ① vuex
  removeItem('token')                  // ② localStorage
  this.setUserInfo({})                 // ③ 用户信息
  this.clearCart()                     // ④ 购物车（可选，看业务）
  this.$router.replace('/login')
}
```

| 清什么 | 不清会怎样 |
|---|---|
| vuex 的 token | 守卫还认为"已登录" |
| localStorage 的 token | **刷新后"复活"** ← 最阴 |
| 用户信息 | 换个账号登录还看到旧昵称 |
| 购物车 | 换个账号看到别人的购物车（如果购物车存了 localStorage） |

**第 2 条是最常见的漏洞**：只 `commit('setToken', '')` 忘了删 storage，**刷新一下又登录了**。

---

## 5. 打包优化（139）🔥

### 5.1 先看体积，再优化

```bash
npm run build -- --report
```

会生成 `dist/report.html`，**打开它看"哪个体积最大"**。

**不看去优化 = 闭眼改代码。** 常见的结果：**`chunk-vendors.js` 占 70%**，里面 80% 是 vant 和 vue。

| 文件 | 典型大小 | 说明 |
|---|---|---|
| `chunk-vendors.js` | 500KB-1MB | 第三方库 |
| `app.js` | 100-300KB | 你的业务代码 |
| `app.css` | 50-100KB | 样式 |

### 5.2 五个手段，按性价比排序

**① 路由懒加载（已做）**

Vue--13 §1.7 做过：`() => import('@/views/home')`。**这是性价比最高的一招**，首屏只下当前页。

**② 关掉 source map**

```js
// vue.config.js
module.exports = {
  productionSourceMap: false
}
```

| 影响 | 说明 |
|---|---|
| 产物变小 | `.map` 文件通常和 JS 差不多大 |
| **代价** | 线上报错只有压缩后的行列号，**难调试** |

> 🟡 **别一律关**。中型项目建议**保留**，把 map 上传到监控平台（Sentry 一类）而不部署到服务器。**课程关掉是因为不上线。**

**③ 分包：把不常变的库单独打**

```js
module.exports = {
  configureWebpack: {
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            name: 'chunk-vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          }
        }
      }
    }
  }
}
```

**为什么分包？** 因为**业务代码天天改，第三方库几个月不变**。分开之后：

| | 不分包 | 分包 |
|---|---|---|
| 改了业务代码 | 用户重下 **1MB** | 只重下 `app.js` **200KB** |
| 缓存命中 | ❌ | ✅ |

**这才是分包的真正价值：让缓存能命中。**

**④ 去掉 console**

```js
chainWebpack: (config) => {
  config.optimization.minimizer('terser').tap((args) => {
    args[0].terserOptions.compress.drop_console = true
    args[0].terserOptions.compress.drop_debugger = true
    return args
  })
}
```

**顺带解决了 Vue--08 那个 `no-console` 规则的纠结**：开发时随便写 `console.log`，生产自动删掉。

**⑤ CDN 引入（`externals`）**

```js
configureWebpack: {
  externals: {
    vue: 'Vue',
    'vue-router': 'VueRouter',
    vuex: 'Vuex'
  }
}
```

配合 `public/index.html` 里加：

```html
<script src="https://cdn.jsdelivr.net/npm/vue@2.7.16/dist/vue.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-router@3.6.5/dist/vue-router.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vuex@3.6.2/dist/vuex.min.js"></script>
```

**原理：webpack 看到 `externals` 就不把这些库打进产物，运行时从全局变量取。**

| 收益 | 代价 |
|---|---|
| 产物小很多（vue 全家桶省 200KB+） | **依赖 CDN 可用性** |
| CDN 常有缓存，用户可能不用下载 | 国内 CDN 要选对（jsdelivr 有时不稳） |

> 🔴 **externals 的经典坑**：**版本必须和 `package.json` 对齐**。CDN 上是 vue 2.7.16，本地装的是 2.6.x —— **构建能过，运行时报奇怪的错**。

### 5.3 gzip：服务端配合才有用

```bash
npm i compression-webpack-plugin -D
```

```js
const CompressionPlugin = require('compression-webpack-plugin')

module.exports = {
  configureWebpack: {
    plugins: [new CompressionPlugin({ test: /\.(js|css)$/, threshold: 10240 })]
  }
}
```

**它生成 `.gz` 文件**，但**必须服务端开启 gzip 静态压缩**才会被用上（Nginx 的 `gzip_static on`）。

**自己开不生效**——这是最常见的"优化了但没效果"。

### 5.4 🔴 别过度优化

课程 19 分钟，够用就好。**以下三件事现在别做**：

| 别做 | 为什么 |
|---|---|
| 手写 webpack 配置替换 Vue CLI | 你在学 Vue，不是在学构建工具 |
| 上 Vite / 微前端 | 换工具链的收益跟项目规模绑定，你现在没那个规模 |
| 为一个 50KB 的包折腾三天 | **用户的 4G 网速比你的优化快** |

> **这条也是你自己的原则**（你明确说过"不要因为一点性能问题就去学新技术"）。**优化要看收益/成本比，不看"别人都在做"。**

### 5.5 部署那一句话

**`history` 模式必须服务端 fallback**（Vue--06 / Vue--13 反复提过）：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**没有这一行，用户刷新 `/cart` 就 404。** 这是 SPA 部署的**第一大坑**，没有第二。

---

==二：格式==

## 1. `vue.config.js` 完整版（课程用到的全在这）

```js
module.exports = {
  productionSourceMap: false,
  devServer: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true, pathRewrite: { '^/api': '' } }
    }
  },
  configureWebpack: {
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: { name: 'chunk-vendors', test: /[\\/]node_modules[\\/]/, priority: 10, chunks: 'initial' }
        }
      }
    }
  },
  chainWebpack: (config) => {
    config.optimization.minimizer('terser').tap((args) => {
      args[0].terserOptions.compress.drop_console = true
      return args
    })
  }
}
```

## 2. mixin 合并策略速查

| 同名项 | 结果 |
|---|---|
| `data` | 递归合并，**组件优先** |
| `methods` / `computed` | **组件覆盖**（**静默**） |
| 生命周期 | **都执行，mixin 先** |
| `watch` | 都执行 |

## 3. 提交订单防重四道

```html
<van-button :loading="loading" :disabled="loading" @click="submit">
```

```js
if (this.loading) return
this.loading = true
try { ... } finally { this.loading = false }
```

## 4. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| `this.getParams is not a function` | mixin 依赖的方法组件没实现 | 实现它（或给默认实现） |
| 改了 mixin 没生效 | 组件里同名方法覆盖了 | 搜组件里有无同名 |
| 出现两个订单 | 没防重复提交 | 四道防线 |
| 失败后按钮永久锁死 | 没用 `finally` 解锁 | 改 `finally` |
| 退出登录后刷新又登录 | 没删 localStorage | 清 storage |
| 刷新 `/cart` 404 | history 模式没 fallback | Nginx `try_files` |
| externals 后运行时报错 | CDN 版本和本地不一致 | 对齐版本 |
| gzip 没生效 | 服务端没开 | `gzip_static on` |
| 分包没变小 | 只配了 `chunks: 'initial'` 而业务也在 vendor | 看 report 定位 |
| 支付成功但购物车没清 | 清理写在提交前 / 忘了 | 提交成功后清 |

---

==三：代码==

## 1. 实验 A：眼见 mixin 的"来源不明"

**① 建 `mixins/order.js`**（§2.2 那份）

**② 页面里 `mixins: [orderMixin]`，模板用 `{{ orderInfo.total }}`**

**③ 关键动作**：把 `data` 里的 `orderInfo` 从 mixin 里删掉再刷新

→ 报错 `Cannot read property 'total' of undefined`，**但报错位置在模板，不在 mixin**。

**④ 体会一下**：如果这是三个月后你接手别人的代码，你要怎么找到 `orderInfo`？

## 2. 实验 B：验证生命周期顺序

```js
// mixin
created () { console.log('mixin') }
// 组件
created () { console.log('component') }
```

**期望输出顺序**：`mixin` → `component`

## 3. 实验 C：同名方法静默覆盖

```js
// mixin
methods: { hello () { console.log('mixin hello') } }
// 组件
methods: { hello () { console.log('component hello') } }
```

**点按钮** → 只打印 `component hello`，**控制台一声不响**。

## 4. 实验 D：看一次打包产物

```bash
npm run build -- --report
```

**① 打开 `dist/report.html`**
**② 记下 `chunk-vendors.js` 和 `app.js` 的大小**
**③ 加上 `productionSourceMap: false` 再 build** → 对比 `dist` 总大小
**④ 加上分包配置再 build** → 看 `app.js` 有没有变小

## 5. 实验 E：防重复提交

**① 把 `if (this.loading) return` 注释掉，`:disabled` 也去掉**
**② 疯狂点 5 次提交**
**③ 看 Network 面板** → 5 个请求
**④ 恢复四道防线** → 只有 1 个

---

==四：总结==

## 1. 一句话记住三个

- **流程相同、来源不同 → 用一个接口 + `mode` 参数**，不要写两套。
- **mixin 是把属性撒到 `this` 上**，代价是"来源不明 + 静默覆盖"。
- **打包优化先看 report 再动手**，性价比最高的是路由懒加载和分包。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 通用接口 | `getOrderInfo({ mode: 'cart' \| 'buy', ... })` |
| 地址传什么 | **`addressId`**，不传地址字符串 |
| mixin 写法 | `mixins: [orderMixin]` |
| **合并策略** | `data` 递归合并；`methods` **组件覆盖**；**生命周期都执行、mixin 先** |
| mixin 三坑 | 来源不明 / 静默覆盖 / 隐式依赖 |
| Vue3 替代 | **组合式函数**（来源明确、可多次调用） |
| 防重四道 | `:disabled` + `:loading` + `if (loading) return` + **`finally`** |
| 下单与支付 | **两个动作两笔记录**，支付失败订单仍是"待付款" |
| 清购物车时机 | **提交成功后**，不是之前 |
| 退出登录 | token(vuex) + **token(storage)** + 用户信息 |
| 优化顺序 | 报告 → 懒加载 → sourceMap → 分包 → 去 console → CDN |
| 分包真价值 | **让缓存命中**（库不变就不用重下） |
| history 部署 | **`try_files $uri $uri/ /index.html`** |

## 3. ⭐ 收敛时刻

**这一轮把前面所有东西收口了：**

**① Vue--04 的组件通信 vs 这一轮的 mixin**

Vue--04 你学了 props / `$emit` / EventBus / provide-inject —— **都是"组件之间"**。mixin 是"**组件内部的复用**"，两者解决的是不同层面的问题。

**② Vue--03 的"工程化" → 到 139 才闭环**

Vue--03 你知道了目录结构，Vue--08 学会了 `vue create`，Vue--12 装了 UI 库 —— **但一直到这一轮，"构建产物"才第一次被当成一件正经事来看**（体积、缓存、部署）。

**③ Vue--15 的 token 清理 → 退出登录的完整版**

Vue--15 说过"401 要清 token"，这一轮补齐：**清 vuex + 清 storage + 清用户信息**。**只清一个，刷新就复活。**

**④ Vue--11 / 18 的购物车 → 结算时只读**

购物车里能改数量，结算页里不能。**同一个数据，两个页面两种权限**——这不是代码问题，是**产品设计**。你现在能看出"哪些交互该在哪一层"了。

**⑤ 你自己的那句原则，在这一轮被验证**

你说过"不要因为一点性能问题就去学新技术"。§5.4 就是这句话的工程版：**优化要看收益/成本比，不看别人都在做什么。**

## 4. 静默失败清单

| # | 做法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | 组件里同名方法覆盖 mixin | 改 mixin 无效，无提示 | 组件优先 |
| 2 | 两个 mixin 同名 `data` | 用的是后一个 | 静默覆盖 |
| 3 | mixin 依赖的方法没实现 | 运行时才炸，报错指向 mixin | 隐式契约 |
| 4 | 只清 vuex 的 token | **刷新又登录了** | storage 没清 |
| 5 | 没用 `finally` 解锁 | 失败后按钮永久锁死 | 该解锁的路径漏了 |
| 6 | 先清购物车再提交 | 提交失败 → 车空了没订单 | 顺序错 |
| 7 | externals 版本不匹配 | 构建过，运行时报怪错 | CDN 与本地不一致 |
| 8 | gzip 只配前端 | 产物有 `.gz`，浏览器没用上 | 服务端没开 |
| 9 | `productionSourceMap: false` 后线上报错 | 只有行列号，没法查 | map 没了 |
| 10 | 没配 `try_files` | 刷新子路由 404 | history 模式 |

**第 1 条和第 4 条最值钱**：一个让你"改了半天没生效"，一个让"退出登录形同虚设"。

**工程上怎么防**：

- **新代码别写 mixin**（Vue3 用组合式），遇到老项目的 mixin 先搜同名；
- 退出登录**写成一个 action**（`user/logout`），里面清所有东西，页面只调一次；
- 提交类操作**永远四道防线**，`finally` 记牢；
- 每次 build **看一眼 report**，体积突变立刻查。

**这不是 bug，是代价**：mixin 用"混入"换来了复用，代价是**打散了"这个组件有什么"的边界**。**Vue3 换成组合式函数，就是把边界还给你。**

## 5. C# 类比可用度

| C# / .NET 侧 | 本轮 | 可用度 | 注意 |
|---|---|:--:|---|
| **基类继承** | mixin | ⭐⭐⭐ | 都是"共用逻辑抽出去" |
| **多继承**（C# 没有，靠接口） | 多个 mixin | ⭐⭐ | mixin 支持多个 → **菱形问题回来了** |
| **抽象方法** | mixin 要求组件实现 `getParams` | ⭐⭐⭐ | 但 **C# 编译器强制，Vue 运行时才炸** |
| 扩展方法 | 组合式函数 | ⭐⭐⭐ | 都是"不改类也能加能力" |
| `try/finally` | 解锁 `loading` | ⭐⭐⭐ | **完全同构** |
| Release 优化 / ILLink 剪裁 | 打包优化 | ⭐⭐⭐ | 都是"产物变小" |
| 程序集拆分（分项目） | `splitChunks` | ⭐⭐⭐ | 都是"改一处不用全重下" |
| 引用系统 DLL 而非复制 | `externals` + CDN | ⭐⭐ | 都是"不打包，运行时找" |
| 订单状态机 | 待付款/待发货 | ⭐⭐⭐ | **业务逻辑，跨语言一致** |

**用法建议**：把 mixin 当**基类**看，但你得记住它比基类**弱**：

```csharp
// C# 会逼你实现
public abstract class OrderBase {
    protected abstract object GetParams();      // ← 不实现编译不过
    public void Submit() { ... GetParams() ... }
}
```

**Vue 的 mixin 里写 `getParams() { throw ... }` 只是"提醒"**，不实现照样能跑，**跑到那一步才炸**。**C# 用编译器保障的契约，JS 只能靠约定。**

**C# 里最该记的对照**：`try/finally` 那一条是**完全同构**的，没有任何差异。**所以"提交按钮锁死"这种 bug，你在 C# 里不会犯——因为你会本能地写 `finally`。**

## 6. 解锁边界

**本轮新解锁**

- 结算页三块结构与"结算页不能改"的设计意图
- **通用接口参数化**：`mode: 'cart' | 'buy'`，一处算价逻辑服务两个入口
- **mixin 完整机制**：写法、四条合并策略（含"mixin 生命周期先执行"）
- mixin 三坑（来源不明 / 静默覆盖 / 隐式依赖）与 Vue3 的替代方案
- 提交订单与支付**是两个动作两笔记录**；支付失败订单仍在"待付款"
- **防重复提交四道防线**与 `finally` 的必要性
- 退出登录要清的四样（vuex token / **storage token** / 用户信息 / 购物车）
- 订单状态用**数字码**不用字符串
- 打包优化五手段：路由懒加载 / `productionSourceMap` / `splitChunks` / `drop_console` / `externals`
- `compression-webpack-plugin` 与"服务端不开 gzip 就白做"
- history 模式部署的 `try_files`

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| **Vue3 组合式**：`computed` / `watch` / 生命周期钩子 | **Vue3--03（145-147）** |
| `defineProps` / `defineEmits` / 模板引用 / `defineExpose` | Vue3--04（148-149） |
| `provide/inject` / `defineOptions` / `defineModel` | Vue3--05（150-152） |
| **Pinia**（替代 vuex） | Pinia--01（153-155） |
| 订单状态机 / 退款流程 | 课程未讲 |
| SSR / Nuxt | 课程未讲 |
| Vite / 构建工具迁移 | 课程未讲 |

⚠️ **术语撞车登记**（本轮新增一条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `mixin` | Vue 的混入 | Sass/Less 的 `@mixin` | **一个混 JS，一个混 CSS** |

## 7. 下一轮预告

**Vue2 的部分到此全部结束（001-139）。**

你接下来有两条路，**建议按这个顺序**：

**① 先回 Vue3--03（145-147，约 1 小时）**

| 集 | 内容 |
|---|---|
| 145 | `computed`（组合式版） |
| 146 | `watch` / `watchEffect` |
| 147 | 组合式生命周期（`onMounted` / `onUnmounted`） |

**为什么先回 Vue3**：你已经学了 Vue3--01/02（`setup` / `ref` / `reactive`），但组合式里**最常用的三个（computed / watch / 生命周期）还锁着**。学完之后，你就能**用组合式重写这一轮的那个 mixin**——**用 `useOrder()` 替代 `mixins: [orderMixin]`，你会立刻感觉到差别。**

**② 再往下是 Pinia（153-155）**

Pinia 是 vuex 的替代品。**你这一章学的 `state` / `getters` / `actions`，Pinia 全都保留，只砍掉了 `mutations`。** 到时候你会发现：**Vue--10 那 2 小时不是白学的，只是把"记账"这层交给了 devtools。**

如果现在想验证自己学得怎么样，**只有一个标准**：

> **打开你做的商城，随便点一个功能，你能说出它经过哪几个文件、哪几个函数、哪个 mutation。**

说得出来，这一章就是真的过了。
