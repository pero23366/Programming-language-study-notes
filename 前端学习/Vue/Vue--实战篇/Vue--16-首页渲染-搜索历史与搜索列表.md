# Vue--16 · 首页动态渲染 · 搜索历史管理 · 搜索列表页

> **对应课程**：120-122（黑马 `BV1HV4y1a7n4`，3 集 / 约 1 小时 19 分）
> **读法**：三集三件事，彼此独立。120 是"把接口数据渲染成页面"、121 是"**storage 的第二次使用**"、122 是"**路由传参的第二形态**（query）"。**121 和 122 各带一个新坑，都在 §2.3 和 §3.4。**
> **本轮定位**：Vue--15 把"谁能进来"解决了，这一轮开始**填内容**。这是全课程第一次"没有新概念、只有组合"的连续三轮——**如果三轮里你觉得轻松，说明前面的地基是真的打住了。**
> **前置**：Vue--15（守卫、token、loading）、Vue--10（vuex 分模块）、Vue--13（路由）。

---

==一：概念==

## 1. 首页：把静态结构拆成三块（120）

### 1.1 首屏的三块

打开任何电商 App 的首页，结构几乎一样：

```
┌─────────────────────────┐
│  🔍 搜索商品             │  ① 搜索入口（不是输入框，是"跳转按钮"）
├─────────────────────────┤
│  [ 轮播图 1 / 2 / 3 ]    │  ② 轮播（运营位，接口下发）
├─────────────────────────┤
│  📱  📺  💻  🎧          │  ③ 分类宫格（固定 8-10 个）
├─────────────────────────┤
│  ┌────┐  ┌────┐         │  ④ 商品流（分页加载）
│  │ 商品│  │ 商品│         │
│  └────┘  └────┘         │
└─────────────────────────┘
```

**四个块的"数据来源"完全不同**，这决定了它们该放哪：

| 块 | 数据从哪来 | 放哪 |
|---|---|---|
| ① 搜索框 | 不用数据 | 静态 |
| ② 轮播 | **接口** | 首页自己的 state |
| ③ 分类宫格 | 前端写死 | **常量**（`data` 里） |
| ④ 商品流 | **接口 + 分页** | 首页自己的 state（或 vuex，见 §1.4） |

### 1.2 ① 搜索"框"其实不是框

```html
<div class="search-bar" @click="$router.push('/search')">
  <van-icon name="search"/>
  <span>搜索商品</span>
</div>
```

**首页的搜索框是个假框**——点一下跳搜索页，真正的输入在搜索页里。

**为什么不做成真输入框？** 因为首页要滚动、要展示，输入框会抢焦点、弹键盘、把页面顶上去。**所有电商 App 都是这么做的**，你现在看到"框"只是视觉。

### 1.3 ② 轮播：`van-swipe`

```html
<van-swipe :autoplay="3000" indicator-color="#fff" class="banner">
  <van-swipe-item v-for="item in bannerList" :key="item.id">
    <img :src="item.imgUrl" alt="">
  </van-swipe-item>
</van-swipe>
```

| 属性 | 值 | 说明 |
|---|---|---|
| `autoplay` | 毫秒数（`3000`） | **不写就不自动播**；写 `true` 是 3000 |
| `indicator-color` | 颜色 | 小圆点颜色 |
| `loop` | 默认 `true` | 循环 |
| `duration` | 默认 500 | 滑动动画时长（毫秒） |

> 🔴 **`autoplay="3000"` 少了冒号 = 传字符串 `"3000"`**，vant 内部会当成"开"处理（真值），**行为看起来一样**，但 `duration`、`interval` 这类会算错。**数字属性一律 `:autoplay="3000"`。**

### 1.4 🔴 首页数据到底该不该进 vuex

这一节没有标准答案，但**有判断标准**。

| 判据 | 结论 |
|---|---|
| 只有首页用 | 放**组件 `data`**，够了 |
| 多个不相干页面用（购物车、结算都要） | **进 vuex** |
| 切走再切回来，**希望不用重新请求** | 进 vuex（数据留在内存） |
| 数据量大、页面一关就该丢 | 放组件 |

**课程首页的做法**：把首页数据放进 `store/modules/home.js`。

**为什么？** 因为切换 tab 时，首页组件**会被销毁重建**（`<router-view>` 换组件），放 `data` 里每次回首页都要重新请求一次。**放 vuex 后数据留在仓库，回来秒开。**

**代价**：数据可能在仓库里变旧（用户 10 分钟前看的首页）。真项目会加"缓存时间"或下拉刷新。

> **这就是"能用 data 就别用 vuex"的例外**：判断标准不是"几个组件用"，而是"**这份数据的生命周期该有多长**"。

### 1.5 动态渲染：还是那条链

```js
// store/modules/home.js
export default {
  namespaced: true,
  state: () => ({ bannerList: [], goodsList: [] }),
  mutations: {
    setBanner (state, list) { state.bannerList = list },
    setGoods (state, list) { state.goodsList = list }
  },
  actions: {
    async getHomeData ({ commit }) {
      const res = await getHome()
      commit('setBanner', res.data.banner)
      commit('setGoods', res.data.goods)
    }
  }
}
```

```js
computed: {
  ...mapState('home', ['bannerList', 'goodsList'])
},
created () {
  this.getHomeData()          // mapActions 出来的
}
```

**和 Vue--11 购物车一字不差**：action 取数 → commit → state → mapState → 模板。**你已经写过两遍了，这是第三遍。**

### 1.6 图片懒加载

首页商品图有几十张，**全下完要好几 MB**。懒加载 = **只加载看得见的**。

```js
import { Lazyload } from 'vant'
Vue.use(Lazyload)         // ← 一次性注册，全局生效
```

```html
<van-image lazy-load :src="item.pic" />
<!-- 或者原生的 -->
<img v-lazy="item.pic" />
```

> ⚠️ **`lazy-load` 只在 `van-image` 上有效**，普通 `<img>` 要写 `v-lazy` 指令。**两个都写反了会静默不生效**——图照样加载，只是"没省流量"。

---

## 2. 搜索历史：storage 的第二次使用（121）

### 2.1 需求拆成四条规则

"搜索历史"听起来简单，实际有四条规则，**少一条就会被用户投诉**：

| 规则 | 说明 |
|---|---|
| ① **最新的在最前** | 刚搜的要在第一个 |
| ② **不能重复** | 搜两次"手机"，只留一条 |
| ③ **有上限**（如 10 条） | 不然一年后几百条 |
| ④ **能删**（单条 / 全部） | 用户要能反悔 |

### 2.2 存哪：三个候选

| 位置 | 刷新后 | 跨组件 | 适合 |
|---|:--:|:--:|---|
| 组件 `data` | ❌ 丢 | ❌ | 临时输入 |
| vuex | ❌ 丢 | ✅ | 需要多组件共享 |
| **localStorage** | ✅ **留着** | ✅（谁都能读） | **搜索历史** |

**搜索历史必须是 localStorage** ——用户关掉 App 再打开，历史还在，这才叫"历史"。

> **和 token 的区别**：token 要"响应式"（登录状态变了界面要变），所以两边都放；搜索历史**只在搜索页显示**，不需要跨组件响应，**只放 storage 就够**。
>
> **判断标准**：需要"变了立刻影响界面" → vuex；只需要"下次还能读到" → storage。

### 2.3 🔴 去重 + 限长的正确顺序

**错误写法（很常见）：**

```js
const list = getItem('history') || []
list.push(keyword)                       // ❌ 最新的跑到最后了
setItem('history', list.slice(0, 10))    // ❌ 超了 10 条时，新的被切掉
```

**正确写法，一行搞定：**

```js
const history = getItem('history') || []
const newList = [keyword, ...history.filter(k => k !== keyword)].slice(0, 10)
setItem('history', newList)
```

**这行的顺序是有讲究的：**

```
[keyword, ...history.filter(...)]    ① 新的放最前  ② 去掉旧的同名
        ↓
.slice(0, 10)                        ③ 再截断
```

**为什么不能颠倒？** 先 `slice` 再 `filter` 的话，如果 `keyword` 本来就在第 10 位，截断时它被切掉，去重就白做了。

| 步骤 | 作用 |
|---|---|
| `[keyword, ...]` | 新的插到最前（规则 ①） |
| `.filter(k => k !== keyword)` | 去掉旧的同名（规则 ②） |
| `.slice(0, 10)` | 只留 10 条（规则 ③） |

> 💡 `filter` 里比较的是**字符串全等**。所以 `"手机"` 和 `"手机 "`（带空格）算两条——**存之前要 `trim()`**。

### 2.4 删除单条与清空

```js
// 删单条：还是老套路——filter 出新数组
const newList = history.filter(k => k !== keyword)

// 清空：二次确认
Dialog.confirm({ message: '确定清空搜索历史吗？' })
  .then(() => setItem('history', []))
  .catch(() => {})
```

| 操作 | 注意 |
|---|---|
| 删单条 | **不能 `splice` 原数组后直接存**（改了原数组，但没重新 stringify 的话白改）；**filter 出新数组最省心** |
| 清空 | `Dialog.confirm` 的 `.catch(() => {})` **必须写**——用户点取消会 reject |
| 存空数组 | 存 `[]`，别存 `''` 或 `null`（读取时类型不一致） |

### 2.5 🔴 一个必须知道的限制

**localStorage 是同步阻塞的。** 存几 KB 的数组毫无感觉，但如果你把整个商品列表往里面塞，主线程会卡住。

| 数据量 | 影响 |
|---|---|
| < 100KB | 无感 |
| 1MB 左右 | 明显卡顿 |
| 5MB（上限） | `QuotaExceededError` |

**搜索历史 10 条字符串 = 几百字节，完全没问题。** 这也解释了为什么 Vue--15 说持久化要写 `paths`。

---

## 3. 搜索列表页（122）

### 3.1 传参：query 还是 params

**上一轮（Vue--07）学过两种传参，这一轮要选一个：**

| | `params` | `query` |
|---|---|---|
| 写法 | `/search/手机` | `/search?keyword=手机` |
| 刷新后 | **还在**（在路径里） | **还在**（在查询串里） |
| 分享链接 | ✅ 能带 | ✅ 能带 |
| 可选性 | 必须有 | 可以没有 |
| 中文 | 需要 `encodeURIComponent` | 同样需要（路由会处理） |

**两个都能刷新不丢**（Vue--07 说的"params 刷新丢"是指**不在路由表里声明的那种**，见下面的坑）。

**课程用 `query`**：

```js
this.$router.push({ path: '/search', query: { keyword: this.keyword } })
```

```js
// 搜索页读
const { keyword } = this.$route.query
```

> 🔴 **Vue--07 那个坑再强调一次**：`this.$router.push({ name: 'search', params: { kw } })` 而路由表里是 `/search` 不写 `:kw` —— **`params` 会丢**（刷新后、甚至跳转后就没有了）。**用 `query` 没有这个问题。**

### 3.2 进入页面 → 读参 → 请求 → 渲染

```js
created () {
  this.keyword = this.$route.query.keyword || ''
  this.getList()
}
```

```js
methods: {
  async getList () {
    const res = await searchGoods({ keyword: this.keyword, page: 1 })
    this.list = res.data.list
  }
}
```

### 3.3 空态：别让用户看着白屏

```html
<van-empty v-if="!loading && list.length === 0" description="没有找到相关商品"/>

<div v-else class="goods-list">
  <van-card v-for="item in list" :key="item.id" :title="item.name" :price="item.price"/>
</div>
```

**三个状态必须都处理**：

| 状态 | 显示 |
|---|---|
| 加载中 | loading 骨架 / 转圈 |
| **有数据** | 列表 |
| **空** | `van-empty` + 一句人话 |

> **"空"和"加载中"要分开**，否则用户看到"没有找到"以为是搜不到，其实是还没回来。**`v-if="!loading && list.length === 0"`** 那个 `!loading` 就是干这个的。

### 3.4 🔴 最阴的一个坑：同一个页面换关键词不请求

**场景**：用户在搜索页，直接改地址栏 `?keyword=手机` → `?keyword=电脑`。

或者更常见的：**搜索结果页顶部还有个搜索框**，用户在里面改词再搜。

```js
// 用了 $router.push({ query: { keyword: '电脑' } })
```

**现象：地址变了，列表没变。**

**原因**：两次导航的**目标路由是同一条**（`/search`），Vue Router 会**复用组件实例**（不销毁不重建）。所以：

| 钩子 | 会不会跑 |
|---|---|
| `created` | ❌ **不会**（组件没重建） |
| `mounted` | ❌ 不会 |
| `beforeRouteUpdate` | ✅ 会 |
| `watch: '$route'` | ✅ 会 |

**两种修法**：

```js
// 修法一：watch $route
watch: {
  '$route.query.keyword' (val) {
    this.keyword = val
    this.getList()
  }
}
```

```js
// 修法二：组件内守卫（Vue--07 学过）
beforeRouteUpdate (to, from, next) {
  this.keyword = to.query.keyword
  this.getList()
  next()
}
```

**推荐 `watch`** —— 更直观，且不需要管 `next`（Vue--15 那个坑少一个）。

> 🟡 **为什么不是销毁重建？** 因为重建组件代价大（重新挂载、重新请求、丢失滚动位置）。Vue 选择复用是**性能优先**，代价就是"你要自己监听变化"。**这不是 bug，是设计取舍。**

---

==二：格式==

## 1. 首页三块的模板骨架

```html
<div class="home">
  <div class="search-bar" @click="$router.push('/search')">
    <van-icon name="search"/> 搜索商品
  </div>

  <van-swipe :autoplay="3000">
    <van-swipe-item v-for="b in bannerList" :key="b.id">
      <van-image lazy-load :src="b.imgUrl"/>
    </van-swipe-item>
  </van-swipe>

  <van-grid :column-num="5">
    <van-grid-item v-for="c in categories" :key="c.id" :icon="c.icon" :text="c.name"/>
  </van-grid>

  <van-card v-for="g in goodsList" :key="g.id" :title="g.name" :price="g.price" :thumb="g.pic"/>
</div>
```

## 2. 搜索历史的四个操作

| 操作 | 代码 |
|---|---|
| 读 | `getItem('history') \|\| []` |
| 加（去重 + 限长） | `[kw, ...list.filter(k => k !== kw)].slice(0, 10)` |
| 删单条 | `list.filter(k => k !== kw)` |
| 清空 | `setItem('history', [])` + `Dialog.confirm` |

## 3. query vs params

| | `query` | `params` |
|---|---|---|
| 形式 | `/search?kw=x` | `/search/x` |
| 刷新 | ✅ | ✅（**但必须写在路由表 `:kw`**） |
| 路由表要改吗 | 不用 | **要加 `:kw`** |
| 推荐 | ⭐⭐⭐ | ⭐ |

## 4. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| 图不显示 | 接口字段名错 / `pic` vs `imgUrl` | 看返回 |
| `[object Object]` 渲染出来 | `{{ item }}` 直接渲染对象 | 取字段 |
| 轮播不动 | 漏 `autoplay` 或写了字符串 | `:autoplay="3000"` |
| 切 tab 回首页要重新请求 | 数据放 `data` | 进 vuex |
| 搜索历史重复 | 忘了 `filter` 去重 | §2.3 |
| 搜索历史超过 10 条 | 忘了 `slice` | §2.3 |
| **改关键词列表不变** | 组件被复用，`created` 不跑 | `watch $route` |
| 空页面无提示 | 没处理空态 | `van-empty` |
| `params` 刷新就丢 | 路由表没声明 `:kw` | 用 `query` |
| 懒加载没生效 | 属性名写错 / 用在普通 img | §1.6 |

---

==三：代码==

## 1. 实验 A：首页从"假数据"到"真接口"

**① 先在 `data` 里写死三条商品**，模板渲染出来
**② 再把数据挪到 `store/modules/home.js`**，走 action
**③ 打开 devtools 的 Vuex 面板** → 能看到 `home/goodsList`

**④ 关键验证**：切到"分类" tab 再切回"首页"，**看 Network 面板有没有重复请求**。

- 放 `data` → **每次回来都请求**
- 放 vuex + `if (list.length === 0) 才请求` → **只请求一次**

```js
created () {
  if (!this.goodsList.length) this.getHomeData()    // ← 缓存判断
}
```

## 2. 实验 B：搜索历史的去重与限长

```js
// 连续执行
addHistory('手机'); addHistory('电脑'); addHistory('手机')
```

**期望**：`['手机', '电脑']`（手机跑到最前，且只有一条）

```js
// 再看限长
for (let i = 0; i < 15; i++) addHistory('词' + i)
```

**期望**：10 条，最新的是 `'词14'`。

**反例**：把 `slice` 提到 `filter` 前面，再跑一次 → 观察顺序和条数的变化。

## 3. 实验 C：`$route` 复用不触发 `created`

**① 搜索页 `created` 里打 `console.log('created')`**
**② 地址栏把 `?keyword=手机` 改成 `?keyword=电脑`**
**③ 观察**：**控制台不再打印**，列表还是手机的。

**④ 加 `watch`**

```js
watch: {
  '$route.query.keyword' (val) {
    console.log('keyword 变了', val)
    this.keyword = val
    this.getList()
  }
}
```

**⑤ 再改地址** → 打印了，列表变了。

> **这个实验必须自己做一次。** 它是"路由复用"这个概念唯一能亲手验证的地方，以后你在任何列表页都会遇到。

## 4. 实验 D：空态与加载中

```html
<!-- 加载中 -->
<van-loading v-if="loading"/>

<!-- 空 -->
<van-empty v-else-if="list.length === 0" description="没有找到相关商品"/>

<!-- 有数据 -->
<div v-else>...</div>
```

**验证**：搜一个肯定不存在的词（如 `zzzzz`）→ 应该看到"没有找到"，**而不是白屏**。

---

==四：总结==

## 1. 一句话记住三个

- **首页搜索框是假框**，点一下跳搜索页；真输入在搜索页里。
- **搜索历史 = `[kw, ...老列表去重].slice(0, 10)`**，顺序不能换。
- **同一路由只改 query，组件不会重建**，必须 `watch $route`。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 轮播 | `:autoplay="3000"`（**带冒号**） |
| 数据归属判据 | 只看一个页面 → `data`；**要跨 tab 存活 → vuex** |
| 首页缓存 | `if (!list.length) 才请求` |
| 懒加载 | `Lazyload` 注册 + `van-image lazy-load` / `v-lazy` |
| 搜索历史容量 | `[kw, ...list.filter(k=>k!==kw)].slice(0,10)` |
| 删单条 | `filter` 出新数组 |
| 清空 | `Dialog.confirm` + **`.catch(() => {})`** |
| 存之前 | **`trim()`** |
| 搜索传参 | **`query`**，不用 `params` |
| 换词不刷新 | **`watch: { '$route.query.keyword' }`** |
| 三态 | 加载中 / 有数据 / **空态**，缺一不可 |

## 3. ⭐ 收敛时刻

**① Vue--15 的 `storage.js` → 第二次用，这次存数组**

token 那套是"一个字符串"，搜索历史是"一个数组"——**`setItem`/`getItem` 一个字都不用改**。**这就是"收口"的价值**：你已经写过的 `utils/storage.js`，现在直接拿来用，不用重写。

**② Vue--10 的 `getters` → 这一轮一次都没用上**

因为首页和搜索页**不需要派生数据**（拿到的就是列表，直接渲染）。**这不是巧合**：`getters` 只在"要算"的时候才出场（购物车的总价）。**工具不是每轮都要用一遍。**

**③ Vue--07 的 `query` / `params` → 第一次有了真实选择**

Vue--07 你两个都学、都用。这一轮有了判据：**必须能分享、必须能在刷新后活着 → `query`**。`params` 那条"刷新丢"的坑，现在你知道它到底丢在哪了。

**④ Vue--15 的守卫 → 这一轮一次都没出现**

因为首页和搜索页都是**公开页**（白名单式的默认拦，但你没访问它们）。**守卫是"隐形"的**：它一直在跑，只是没拦你。**这才是好的基础设施——你在用它，但感觉不到它。**

## 4. 静默失败清单

| # | 做法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `autoplay="3000"`（无冒号） | 看着能转 | 传的是字符串 |
| 2 | 搜索历史忘了 `filter` | 同一词出现多次 | 没去重 |
| 3 | `slice` 提到 `filter` 前 | 条数对但顺序怪 / 新词被切掉 | 顺序错 |
| 4 | **改 query 不刷新列表** | 地址变了数据没变 | 组件复用，`created` 不跑 |
| 5 | 数据放 `data`，切 tab 回来重新请求 | 只是"慢一点"，不报错 | 组件销毁重建 |
| 6 | 空态没处理 | 白屏，用户以为坏了 | 少一个分支 |
| 7 | `van-image` 上写 `v-lazy` | 图正常显示 | 指令不生效，白费流量 |
| 8 | 存搜索词不 `trim` | `"手机"` 和 `"手机 "` 两条 | 字符串全等 |
| 9 | `Dialog.confirm` 没 `.catch` | 点取消后控制台红字 | 取消也 reject |
| 10 | 渲染 `{{ item }}` 而不是 `{{ item.name }}` | 页面出现 `[object Object]` | 对象直接插值 |

**第 4 条是最贵的**：它只在"**在同一个页面里改参数**"时出现——从首页跳过来是好的，用户手动改地址就坏了。**测试时一定要试一次"在搜索页里改词再搜"。**

**工程上怎么防**：

- 所有"列表页"**默认加 `watch $route`**，不管现在会不会触发；
- 搜索历史的增删**统一走一个函数**（`addHistory` / `removeHistory` / `clearHistory`），别在组件里散着写；
- 列表页**三态齐全**（loading / 空 / 有数据），这是最低标准；
- 数字类属性**一律加冒号**，养成习惯比记规则可靠。

**这不是 bug，是代价**：Vue 为了性能复用组件，代价就是"你要自己监听参数变化"。**框架替你省了重建的开销，就要求你多写一行 watch。**

## 5. C# 类比可用度

| C# / .NET 侧 | 本轮 | 可用度 | 注意 |
|---|---|:--:|---|
| `List<T>` + `Where(...).Take(10)` | `[kw, ...filter].slice(0,10)` | ⭐⭐⭐ | 几乎一比一 |
| `List.RemoveAll(x => x == kw)` | `filter` 去重 | ⭐⭐⭐ | 都是"造新集合" |
| `IMemoryCache` 缓存首页数据 | 首页数据进 vuex | ⭐⭐⭐ | 都是"别每次重新查" |
| `MessageBox.Show` 确认 | `Dialog.confirm` | ⭐⭐⭐ | 都是"二次确认" |
| `[FromQuery] string keyword` | `this.$route.query.keyword` | ⭐⭐⭐ | **同构**：查询串参数 |
| `[FromRoute]` | `params` | ⭐⭐⭐ | 路径参数 |
| 分页 `Skip/Take` | 商品流分页 | ⭐⭐ | 都用，但本轮没深入 |
| 图片 CDN 懒加载 | `lazy-load` | ⭐⭐ | 概念一致 |

**用法建议**：搜索页就是 `[FromQuery]` 的用法，**`query` 对应查询串、`params` 对应路径段**，你在 ASP.NET 里区分这两个很熟，前端完全一样。

**C# 里没有的**：**组件复用导致的"钩子不跑"**。ASP.NET 每次请求都是新的 Controller 实例，不存在"同一条路由复用实例"的问题。**这是 SPA 特有的，必须单独记。**

## 6. 解锁边界

**本轮新解锁**

- 首页三块结构（假搜索框 / 轮播 / 宫格 / 商品流）与各自的数据来源
- `van-swipe` 的 `autoplay`（**必须加冒号**）、`loop`、`indicator-*`
- **数据归属的第二个判据**：不只看"几个组件用"，还要看"**要活多久**"
- 首页缓存判断 `if (!list.length) 才请求`
- `Lazyload` 注册；`van-image lazy-load` 与 `v-lazy` 的区别
- 搜索历史四规则；**去重 + 限长的正确顺序**
- `Dialog.confirm` 的 `.catch` 必须写
- `query` vs `params` 的最终选择判据
- **同路由换 query 组件不重建**，必须 `watch '$route.query'`
- 列表页三态（loading / 空 / 有数据）

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 商品详情页 + 动态渲染 | **Vue--17（123）** |
| 加入购物车的弹层 | Vue--17（124） |
| **数字框封装（组件封装实战）** | Vue--17（125） |
| **加购时的 token 判断** | Vue--17（126） |
| 购物车模块（vuex 最密集） | Vue--18（127-133） |
| 结算 / 订单 / mixin / 打包优化 | Vue--19（134-139） |
| 上拉加载更多 / 下拉刷新 | 课程未系统讲（`van-list` / `van-pull-refresh`） |
| 骨架屏 `van-skeleton` | 课程未讲 |

⚠️ **术语撞车登记**（本轮新增一条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `query` | URL 查询串 | 数据库查询 / jQuery | 前置 `$route.` 的是前者 |

## 7. 下一轮预告

**Vue--17（123-126，4 集 / 约 1 小时 44 分）：商品详情 · 加入购物车 · 数字框封装 · token 判断**

这一轮有三个"第一次"：

| 集 | 第一次什么 |
|---|---|
| 123 | 详情页 + **路由参数取 id** 再请求 |
| 124 | **弹层**（`van-popup`）—— 不是新页面，是浮在上面的 |
| 125 | **封装自己的组件**（数字框）—— 课程里第一次"写给别人用的组件" |
| 126 | **加购时判断登录**——这是 119 守卫的"局部版"（守卫管页面，这里管动作） |

**126 那 42 分钟是重点，也是这一轮最长的**：它要处理"没登录 → 弹登录提示 → 登录完回来还要继续加购吗"这个真实的体验问题。

开跑之前请确认：

1. 切 tab 回首页**不重复请求**；
2. 搜索历史**不重复、不超 10 条**、删得掉；
3. **在搜索页里改 `?keyword=` 列表会变**。

**建议开新对话** —— 125 的组件封装和 126 的交互逻辑是两类活儿。
