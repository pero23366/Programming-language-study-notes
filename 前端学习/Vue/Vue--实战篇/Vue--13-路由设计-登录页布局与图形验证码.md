# Vue--13 · 路由设计（一级 + 嵌套）· 登录页静态布局 · 图形验证码

> **对应课程**：109-110（黑马 `BV1HV4y1a7n4`，2 集 / 约 1 小时 17 分）
> **读法**：109 是**设计**（先想清楚页面归属，再写路由表），110 是**体力活**（布局 + 一个验证码）。109 想明白了，110 就是照抄；109 想错了，110 会白写。
> **本轮定位**：这是商城的第一次实操。你会第一次遇到**"布局组件"**这个东西——它不是页面，而是"几个页面共用的外壳"。**这一轮之后，你的项目才有"应用"的样子。**
> **前置**：Vue--06~07（路由基础 / 嵌套路由）、Vue--12（vant 已按需引入、vw 已生效）。

---

==一：概念==

## 1. 先设计路由，再写页面（109）

### 1.1 分界线只有一条：**有没有底部导航**

商城有 5 个页面要看，但它们的"待遇"不一样：

| 页面 | 有底部 tabbar 吗 |
|---|:--:|
| 首页 | ✅ |
| 分类 | ✅ |
| 购物车 | ✅ |
| 我的 | ✅ |
| **登录页** | ❌ **一定没有** |

**这 4 个"有"的页面，除了内容不同，外壳完全一样**——顶上一个标题栏，底下一个 tabbar，中间是内容区。

如果你把 tabbar 分别写进每个页面，会有三个后果：

1. 改一次 tabbar 要改 4 个文件；
2. 切页面时 tabbar 会**重新渲染一次**（闪烁）；
3. 4 份代码早晚长得不一样。

**正解：抽一个"布局组件" `Layout`，把这些页面塞进它的 `<router-view>`。**

### 1.2 这个概念你在 .NET 里天天见

**这就是 ASP.NET Core MVC 的 `_Layout.cshtml`。**

```
_Layout.cshtml            ← 外壳：导航 + 页脚 + @RenderBody()
    ├─ Index.cshtml       ← 内容塞进 @RenderBody()
    ├─ About.cshtml
    └─ Contact.cshtml

views/layout/index.vue    ← 外壳：<van-tabbar> + <router-view/>
    ├─ views/home/index.vue    ← 内容塞进 <router-view/>
    ├─ views/category/index.vue
    ├─ views/cart/index.vue
    └─ views/user/index.vue
```

| ASP.NET Core | Vue Router |
|---|---|
| `_Layout.cshtml` | `views/layout/index.vue` |
| **`@RenderBody()`** | **`<router-view/>`** |
| `_ViewStart.cshtml` 指定默认布局 | **路由表的 `children` 指定归属** |
| 某个页面 `Layout = null` | 登录页**不在** `children` 里 |

> **一句话**：**`<router-view/>` 就是 Vue 版的 `@RenderBody()`。** 你完全不用重新理解"布局"这个词。

### 1.3 目录结构

```
src/
├── views/
│   ├── layout/
│   │   ├── index.vue           ← 外壳
│   │   └── components/
│   │       └── TabBar.vue      ← 底部导航（拆出来，因为它是独立的一块）
│   ├── login/
│   │   └── index.vue           ← 登录页（独立，不套壳）
│   ├── home/index.vue
│   ├── category/index.vue
│   ├── cart/index.vue
│   └── user/index.vue
```

**两条约定**（课程和大厂都是这个惯例）：

| 约定 | 理由 |
|---|---|
| 一个页面一个**文件夹**，入口叫 `index.vue` | 页面以后会带自己的子组件、样式，给个文件夹装 |
| 页面的私有子组件放 `文件夹/components/` | 和全局 `src/components/` 区分开 |

> ⚠️ **`index.vue` 会让编辑器标签页全叫 `index`**，分不清。VS Code 里可以在设置里让标签显示父目录名。这是小麻烦，但**别为了这个改成 `home.vue` 这种全局唯一名**——目录约定比标签页可读性重要。

### 1.4 路由表：一层套一层

```js
const routes = [
  // ① 登录页：一级，独立，不套壳
  { path: '/login', component: () => import('@/views/login') },

  // ② 布局外壳：一级，里面装 4 个页面
  {
    path: '/',
    component: () => import('@/views/layout'),
    redirect: '/home',
    children: [
      { path: 'home', component: () => import('@/views/home') },
      { path: 'category', component: () => import('@/views/category') },
      { path: 'cart', component: () => import('@/views/cart') },
      { path: 'user', component: () => import('@/views/user') }
    ]
  },

  // ③ 兜底
  { path: '*', redirect: '/home' }
]
```

**三个关键点：**

**① `redirect: '/home'`** —— 访问 `/` 时自动跳 `/home`。没有它，`/` 会渲染一个**只有 tabbar、中间空白**的 Layout（因为 Layout 自己有 router-view，但没匹配到子路由）。

**② 子路由的 `path` 不写 `/`**

```js
{ path: 'home', ... }      // → 完整路径 /home
{ path: '/home', ... }     // → 也渲染在父的 router-view 里，但路径是绝对的
```

🟡 **这里有个非常常见的误解**：很多人以为 `path: '/home'` 写成绝对路径就"跳出嵌套"了。

**不会。** 只要它写在 `children` 数组里，**组件就永远渲染在父路由的 `<router-view>` 里**。`/` 只影响**路径怎么拼**，不影响**渲染在哪**。

| 写法 | 最终 URL | 渲染位置 |
|---|---|---|
| `path: 'home'` | `/home` | 父的 `<router-view>` |
| `path: '/home'` | `/home` | **父的 `<router-view>`**（一样） |

**建议统一不写 `/`**，让"相对路径"这个视觉信号提醒你"它在壳里"。

**③ `path: '*'` 放最后** —— 兜底。没匹配到的地址（用户手输 `/abc`）自动回首页，而不是白屏。**顺序有关系，`*` 必须在最后。**

### 1.5 Layout 长什么样

```html
<template>
  <div class="layout">
    <router-view/>            <!-- ← 4 个页面轮流出现在这里 -->
    <TabBar/>
  </div>
</template>
```

**就这两行。** 所有业务代码都在子页面里，Layout 只管"外壳"。

> 💡 **这就是"组合优于复制"的最朴素版本**：4 个页面共用一份 tabbar，切页面时 tabbar 的 DOM **不重建**（因为它在父组件里，没被销毁）。

### 1.6 TabBar

```html
<template>
  <van-tabbar route safe-area-inset-bottom>
    <van-tabbar-item replace to="/home" icon="home-o">首页</van-tabbar-item>
    <van-tabbar-item replace to="/category" icon="apps-o">分类</van-tabbar-item>
    <van-tabbar-item replace to="/cart" icon="shopping-cart-o">购物车</van-tabbar-item>
    <van-tabbar-item replace to="/user" icon="user-o">我的</van-tabbar-item>
  </van-tabbar>
</template>
```

四个属性，每个都有理由：

| 属性 | 作用 | 不加会怎样 |
|---|---|---|
| `route` | 开启路由模式，**按当前地址自动高亮** | 4 个都是灰的，或要自己写 `v-model` 手动同步 |
| `to="/home"` | 点击跳转 | 点了没反应 |
| `replace` | 用 `replace` 跳转 | 用户点 10 个 tab，「返回」要按 10 次才回得来 |
| `safe-area-inset-bottom` | 底部预留安全区 | iPhone 上 tabbar 压在**小白条**上，最后一个 tab 点不到 |

> 🔴 **`safe-area-inset-bottom` 是最容易漏的**：在普通安卓机和 PC 模拟器上完全看不出问题，**一到全面屏 iPhone 就被 Home 指示条盖住**。这个坑你以后做任何移动端项目都会遇到。

### 1.7 懒加载与 `@` 别名

```js
component: () => import('@/views/home')
```

**为什么用函数包一层？**

| 写法 | 打包结果 | 首屏 |
|---|---|---|
| `import Home from '@/views/home'` | 全部塞进 `app.js` | 首屏下载**所有页面** |
| `() => import('@/views/home')` | 每个页面一个**独立 chunk** | 首屏只下当前页 |

**这就是路由级"按需加载"**，和 Vue--12 的 vant 按需是同一个思想：**别把用户暂时用不到的东西先送过去。**

`@` 是 Vue CLI 默认配好的别名，指向 `src`：

```js
import TabBar from '@/views/layout/components/TabBar'   // ✅
import TabBar from '../../components/TabBar'            // 😵 数不清几个点了
```

---

## 2. 登录页静态布局（110 前半）

### 2.1 移动端登录页的标准结构

几乎所有 App 的登录页都是同一个骨架，从上到下五块：

```
┌─────────────────────┐
│      [ Logo ]       │   logo + 一句话介绍
│                     │
│  ┌───────────────┐  │
│  │ 手机号         │  │   输入区
│  ├───────────────┤  │
│  │ 验证码  [图]   │  │
│  └───────────────┘  │
│                     │   登录按钮
│  [    登  录    ]   │
│                     │   协议勾选
│  ☐ 已阅读并同意协议  │
└─────────────────────┘
```

**没有花活。** 这一集的 45 分钟主要花在"调到好看"上，不是技术上难。

### 2.2 `van-field`：vant 的输入框

```html
<van-field
  v-model="form.mobile"
  label="手机号"
  placeholder="请输入手机号"
  clearable
/>
```

五个属性，够用了：

| 属性 | 值 | 作用 |
|---|---|---|
| `v-model` | 数据 | **双向绑定**，输入立刻回写 |
| `label` | 文字 | 左侧标签 |
| `placeholder` | 文字 | 占位提示 |
| `clearable` | 布尔 | 右侧出现"×"清空按钮 |
| `type` | `text` / `password` / `tel` | `tel` 会唤起数字键盘（**手机号必须用它**） |

> 🟡 **`type="tel"` 和 `type="number"` 的区别**：`number` 会去掉前导 0、允许滚轮改值、可能带上下箭头；`tel` 就是数字键盘但**保留字符串**。**手机号、验证码一律用 `tel`。**

### 2.3 数据放哪

```js
data () {
  return {
    form: {
      mobile: '',
      code: ''
    }
  }
}
```

**这些是"局部 UI 状态"**——只有这个页面关心，**不进 vuex**（Vue--11 §5.1 讲过判据）。等你点了登录、拿到 token，**token 才进 vuex**（116 集的事）。

### 2.4 布局的三个细节

**① 尺寸直接写 px**（Vue--12 的 vw 插件会替你转）

```css
.logo { width: 100px; height: 100px; }
```

编译后自动变 `26.66667vw`，**你不用手工算**。这就是 108 那 12 分钟的价值：**你只跟设计稿打交道，换算交给构建管道。**

**② 居中不要用 `margin: auto` 猜**

```css
.login {
  display: flex;
  flex-direction: column;
  align-items: center;      /* 水平居中 */
  padding: 40px 20px;
}
```

**③ 输入框要包在 `van-cell-group` 里才有圆角和分组线**

```html
<van-cell-group inset>
  <van-field ... />
  <van-field ... />
</van-cell-group>
```

`inset` 属性给一个内缩的卡片样式，是移动端最常见的观感。

---

## 3. 图形验证码（110 后半）

### 3.1 它防的是"脚本"，不是"人"

先纠正一个常见误解：**图形验证码不是为了让你多点一次**。

| 攻击方式 | 验证码有用吗 |
|---|:--:|
| 脚本批量试 10000 个手机号+密码 | ✅ **挡住**（每次都要识图） |
| 真人挨个试 | ❌ 没用（但成本高） |
| 短信轰炸（疯狂点"发送验证码"） | ✅ 有用（配合频率限制） |

**它的本质是一个"人类成本"的门槛。** 你觉得烦，说明它在正常工作。

### 3.2 两条实现路线

**路线 A：后端返回 base64（真实项目、也是课程做法）**

```js
const res = await getPicCode()       // { base64, key }
this.picUrl = res.base64
```

```html
<img :src="picUrl" @click="refresh" />
```

**后端做了两件事**：
1. 生成一张图（4 位随机字符 + 干扰线），转成 base64；
2. **把答案存在服务端**（用 `key` 关联），前端拿不到正确答案。

**路线 B：前端 canvas 自己画（练手用）**

前端生成随机字符、画图、**自己也知道答案**——**这种验证码毫无安全性**，任何人打开控制台调个函数就绕过了。

> 🔴 **课程为了不依赖后端，可能用的是 mock 接口**。你要记住的是这条底线：
> **验证码的答案必须在服务端。前端生成的验证码，只能用来练布局，不能上线。**

### 3.3 🔴 点击刷新为什么要加随机参数

```js
refresh () {
  this.picUrl = await getPicCode()      // ❌ 可能拿到缓存
}
```

```js
refresh () {
  const t = Date.now()                  // ✅ 加时间戳
  this.picUrl = `${baseUrl}/captcha?t=${t}`
}
```

**因为浏览器会缓存 `GET` 请求的图片。** 地址不变 → 用缓存 → **你点了十次，图还是那一张**，而且**不报错**。

| 症状 | 真相 |
|---|---|
| 点击验证码没反应 | 拿到的是缓存图 |
| 换了个手机号，验证码还是老的 | 同上 |
| 加 `?t=时间戳` 就好了 | 证明是缓存 |

**这是"点击刷新"类需求的通用套路**：只要地址不变、内容会变，就得加时间戳。

### 3.4 真实项目的数据流（看懂这张就不怕后端换实现）

```
① 前端 GET /captcha
② 后端生成 code = "8x3k"，图片 base64，存进 Redis：key=uuid → value="8x3k"
   ↳ 返回 { key: 'uuid-xxx', base64: 'data:image/png;base64,...' }
③ 前端显示图片，同时把 key 记在 data 里
④ 用户输入 8x3k，点登录
⑤ 前端 POST /login { mobile, code: '8x3k', captchaKey: 'uuid-xxx' }
⑥ 后端用 captchaKey 查 Redis，比对 8x3k；一致才继续，然后删除该 key（一次性）
```

**三个必须理解的约束**：

| 约束 | 为什么 |
|---|---|
| **一次性** | 验证成功后立刻失效，防重放 |
| **有效期**（通常 1-5 分钟） | 防暴力穷举 |
| **答案不下发前端** | 前端能看到答案就白做了 |

> 💡 你在 .NET 里写这个，就是 `IMemoryCache` / Redis 存 `key → code`，`Guid.NewGuid()` 当 key。**一模一样。**

---

==二：格式==

## 1. 目录树（照着建）

```
src/views/
├── layout/
│   ├── index.vue
│   └── components/TabBar.vue
├── login/index.vue
├── home/index.vue
├── category/index.vue
├── cart/index.vue
└── user/index.vue
```

## 2. 路由表模板

```js
import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  { path: '/login', component: () => import('@/views/login') },
  {
    path: '/',
    component: () => import('@/views/layout'),
    redirect: '/home',
    children: [
      { path: 'home', component: () => import('@/views/home') },
      { path: 'category', component: () => import('@/views/category') },
      { path: 'cart', component: () => import('@/views/cart') },
      { path: 'user', component: () => import('@/views/user') }
    ]
  },
  { path: '*', redirect: '/home' }
]

export default new VueRouter({
  mode: 'history',
  routes
})
```

## 3. `van-field` 属性速查

| 属性 | 常用值 | 说明 |
|---|---|---|
| `v-model` | 数据字段 | 双向绑定 |
| `label` | 字符串 | 左侧标签 |
| `placeholder` | 字符串 | 占位 |
| `type` | `text` / `password` / `tel` | **手机号验证码用 `tel`** |
| `maxlength` | 数字 | 验证码限 4 位 |
| `clearable` | `true` | 带清空按钮 |
| `right-icon` | `clear` / `eye-o` | 右侧图标 |

## 4. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| `/` 打开只有 tabbar、中间空白 | 漏 `redirect` | 加 `redirect: '/home'` |
| 登录页也有 tabbar | 登录页被写进 `children` | 挪到一级 |
| 切 tab 后返回键要按很多次 | 没用 `replace` | 加 `replace` |
| iPhone 上最后一个 tab 点不到 | 漏安全区 | `safe-area-inset-bottom` |
| 点验证码不刷新 | 图片缓存 | 地址加 `?t=Date.now()` |
| 手输 `/abc` 白屏 | 没兜底路由 | `{ path: '*', redirect: '/home' }` |
| `Unknown custom element: <van-tabbar>` | 没注册该组件 | `Vue.use(Tabbar)` 等 |

---

==三：代码==

## 1. 实验 A：五个空页面 + 路由跑通

**① 建 6 个文件**（内容先全是 `<template><div>首页</div></template>`）

**② 贴路由表**（§二.2）

**③ 手输地址验证**

| 输入 | 期望 |
|---|---|
| `/` | 自动跳 `/home`，**有 tabbar** |
| `/cart` | 显示"购物车"，**tabbar 高亮购物车** |
| `/login` | 显示"登录"，**没有 tabbar** |
| `/xyz` | 回到首页 |

**④ 这一步做完，109 就结束了。** 剩下全是填内容。

## 2. 实验 B：Layout + TabBar 拆开

**`views/layout/index.vue`**

```html
<template>
  <div class="layout">
    <router-view/>
    <TabBar/>
  </div>
</template>

<script>
import TabBar from './components/TabBar'
export default { name: 'LayoutPage', components: { TabBar } }
</script>
```

**`views/layout/components/TabBar.vue`** 用 §1.6 那段。

**验证"DOM 不重建"**：在 TabBar 里加 `mounted () { console.log('tabbar mounted') }`，切换 tab —— **控制台只打印一次**。

> 这一条是布局组件的**唯一证明**：如果切页面 tabbar 重新 mounted 了，说明它被写在页面里，而不是外层。

## 3. 实验 C：登录页静态（骨架版）

```html
<template>
  <div class="login">
    <img class="logo" src="@/assets/logo.png" alt="">
    <h2>黑马商城</h2>

    <van-cell-group inset>
      <van-field
        v-model="form.mobile"
        label="手机号"
        type="tel"
        maxlength="11"
        placeholder="请输入手机号"
        clearable
      />
      <van-field
        v-model="form.code"
        label="验证码"
        type="tel"
        maxlength="4"
        placeholder="请输入验证码"
      >
        <template #button>
          <img class="captcha" :src="picUrl" @click="refresh">
        </template>
      </van-field>
    </van-cell-group>

    <van-button type="primary" block round>登 录</van-button>
  </div>
</template>
```

```js
data () {
  return {
    form: { mobile: '', code: '' },
    picUrl: ''
  }
}
```

> 💡 `#button` 是**具名插槽**（Vue--05 讲过），vant 的 `van-field` 用它放"右侧的按钮/图片"。**这就是插槽在真实组件库里的用法**——不用自己写 `position: absolute`。
>
> ⚠️ Vue--12 让你删过 `assets/logo.png`。这里**随便放一张图**进 `src/assets/`（或先用一个纯色 div 占位），别因为找不到图片卡住。

## 4. 实验 D：图形验证码 + 点击刷新

**先假装一个接口**（真正的 api 封装是 111 集）

```js
async function getPicCode () {
  const t = Date.now()
  // 真实项目：return axios.get(`/api/captcha?t=${t}`)
  return {
    key: String(t),
    base64: `https://dummyimage.com/120x40/eee/333&text=${Math.random().toString(36).slice(2, 6)}`
  }
}
```

```js
methods: {
  async refresh () {
    const res = await getPicCode()
    this.picUrl = res.base64
    this.captchaKey = res.key
  }
},
created () { this.refresh() }
```

**④ 验证点**：

1. 进页面自动出现一张图；
2. 点图 → **图变了**；
3. 把 `?t=` 去掉再试 → **图不变**（缓存，这就是 §3.3 那个坑）。

## 5. 实验 E：看一眼"前端生成的验证码"有多不安全

```js
// 假装前端生成
const code = Math.random().toString(36).slice(2, 6)
```

**打开控制台，输入 `code`** —— 答案就在你手里。

**结论**：这条路只能练布局。**真实项目的答案必须留在服务端。**

---

==四：总结==

## 1. 一句话记住三个

- **`<router-view/>` 就是 Vue 版的 `@RenderBody()`**，Layout 是 `_Layout.cshtml`。
- **子路由写 `path: 'home'` 不写 `'/home'`**——`/` 只改拼路径，不改渲染位置。
- **验证码的答案必须在服务端**；前端生成的那张图只配练布局。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 一级路由 | `/login`（无壳）、`/`（壳 + children） |
| 布局组件 | 里面只有 `<router-view/>` + `<TabBar/>` |
| `redirect` | `'/'` 必须跳 `/home`，否则中间空白 |
| 子路由路径 | 不写 `/`，`path: 'home'` |
| **误解** | `/home` 写在 children 里**照样渲染在父 router-view** |
| 兜底 | `{ path: '*', redirect: '/home' }`，**放最后** |
| TabBar 四属性 | `route` / `to` / `replace` / `safe-area-inset-bottom` |
| 懒加载 | `() => import('@/views/home')` |
| 别名 | `@` = `src` |
| 手机号输入 | `type="tel"`，不用 `number` |
| 验证码刷新 | 地址加 `?t=Date.now()` 防缓存 |
| 验证码安全 | **答案在服务端**，一次性 + 有有效期 |

## 3. ⭐ 收敛时刻

**这一轮把三件事接上了：**

**① Vue--07 的嵌套路由 → 第一次有了"业务理由"**

Vue--07 你学的 `children` 是语法练习（父组件里放个 router-view 看看效果）。这次它有了明确用途：**给 4 个页面共用外壳**。**语法在需要它的场景里才变成能力。**

**② Vue--06 的 `history` 模式 → 现在知道后果了**

地址是 `/home`、`/cart` 这种干净路径（没有 `#`）。代价在部署：**服务器必须把所有路径 fallback 到 `index.html`**，否则用户刷新 `/cart` 会 404。**开发时（dev-server）已帮你处理，上线时运维要配。**

**③ Vue--12 的 vant 按需 → 这一轮多了 3 个组件要注册**

`Tabbar`、`TabbarItem`、`Field`（还有 `Cell`、`CellGroup`、`Button`）。**回 Vue--12 §三.5 那个 `utils/vant.js`** ——一次性加进去，别在页面里 `import`（那样每个页面都要自己引）。**这就是"收口"的价值第一次兑现。**

**④ Vue--05 的插槽 → 第一次用在"别人的组件"上**

`<template #button>` 是给 `van-field` 填右侧内容。你之前用插槽是"自己写组件自己用"，这次是**按组件库规定的接口去填**——这是插槽最常见的实际用途。

## 4. 静默失败清单

这一轮的坑主要是"**页面能开、但结构错了**"：

| # | 做法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | 漏 `redirect: '/home'` | `/` 打开只有 tabbar，中间空白 | 没子路由匹配 |
| 2 | 登录页写进 `children` | 登录页也出现 tabbar | 归属错了 |
| 3 | 以为 `path: '/home'` 能跳出嵌套 | 结果还是在壳里（有人反而以为对了） | `/` 只影响路径拼法 |
| 4 | `path: '*'` 写在前面 | 后面的路由全部失效（都被 `*` 吃掉） | 顺序敏感 |
| 5 | 没用 `replace` | 返回键要按 N 次 | 每次切 tab 都进历史 |
| 6 | 漏 `safe-area-inset-bottom` | 只在全面屏 iPhone 上露馅 | 安全区 |
| 7 | 验证码不加时间戳 | 点了没反应，**零报错** | 图片被缓存 |
| 8 | 手机号用 `type="number"` | 输入 `0123` 变成 `123` | number 会丢前导 0 |
| 9 | 忘了注册 `Tabbar` | `Unknown custom element` | Vue--12 §2.6 |
| 10 | 页面文件叫 `index.vue` 但没在 `components` 里 import | 标签页全叫 index，改错文件 | 靠目录结构认，别靠标签 |

**第 3 和第 7 条最值钱**：一个让你对嵌套路由的理解一直错着（但代码能跑），一个让你以为"功能坏了"其实是缓存。

**工程上怎么防**：

- 建完路由**先手输 4 个地址走一遍**，别等页面写完才发现结构错；
- 移动端项目**第一件事**就是加 `safe-area-inset-bottom`，别等真机；
- 任何"内容会变、地址不变"的请求，**默认加时间戳**，然后才去查别的。

**这不是 bug，是代价**：路由表是**声明式**的，写错了不会报错——它只会"渲染出你没预料的组合"。**所以路由必须靠"走一遍"验证，不能靠读代码。**

## 5. C# 类比可用度

| C# / .NET 侧 | Vue Router / 本轮 | 可用度 | 注意 |
|---|---|:--:|---|
| `_Layout.cshtml` | `views/layout/index.vue` | ⭐⭐⭐ | **同构**：都是"共用外壳" |
| **`@RenderBody()`** | **`<router-view/>`** | ⭐⭐⭐ | 内容注入点，一一对应 |
| `Layout = null` | 登录页不进 `children` | ⭐⭐⭐ | 都是"这个页面不套壳" |
| `RedirectToAction("Home")` | `redirect: '/home'` | ⭐⭐⭐ | 同 |
| 路由表 `MapControllerRoute` / `[Route]` | `routes: [...]` | ⭐⭐⭐ | 都是**集中声明式**路由 |
| 区域（Areas） | `children` 嵌套 | ⭐⭐ | 形似，Vue 的嵌套是**渲染层级**，Area 是**URL 分组** |
| 按需加载程序集 | `() => import(...)` | ⭐⭐ | 目标一致：首屏别全下 |
| 后端生成验证码存 `IMemoryCache` | 服务端存 code | ⭐⭐⭐ | 一模一样，`Guid` 当 key |
| `[Authorize]` | 路由守卫（下一轮 119） | ⭐⭐⭐ | 都是"进门先查票" |

**用法建议**：把 `Layout` 直接当 `_Layout.cshtml` 用，别想成新东西。

**唯一的真差异**：**ASP.NET 的路由是服务端匹配，Vue 的路由是浏览器端匹配**。所以 history 模式下**服务器必须把所有路径交给 `index.html`**——这就是 Vue--12 §1.2 里 `history: Y` 那个提示"Requires proper server setup"的含义。**部署时刷新 404，百分之百是这条没配。**

## 6. 解锁边界

**本轮新解锁**

- **布局组件**（Layout）：与 `_Layout.cshtml` / `@RenderBody()` 的对应关系
- 一级路由 + `children` 的归属划分：**登录页不进壳**
- `redirect` 的必要性（`/` 必须跳一个默认子路由）
- **子路由 `path` 的 `/` 只影响路径拼法，不影响渲染位置**
- `path: '*'` 兜底与顺序敏感性
- `van-tabbar` 的 `route` / `to` / `replace` / `safe-area-inset-bottom`
- 路由懒加载 `() => import()` 与 `@` 别名
- `van-field` 的五个常用属性、`type="tel"` 的原因
- `van-cell-group inset` 的分组样式；`van-field` 的 `#button` 插槽
- 图形验证码的两条路线、**答案必须在服务端**、一次性 + 有效期
- "点击刷新"必须加时间戳防缓存

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| axios 实例 / baseURL / 请求拦截器 | **Vue--14（111）** |
| Toast 轻提示 | Vue--14（112） |
| 短信验证码（60 秒倒计时） | Vue--14（113） |
| 登录接口封装 + 提交 | Vue--14（114） |
| 响应拦截器统一处理错误 | Vue--14（115） |
| token 存 vuex + `localStorage` 持久化 | Vue--15（116-117） |
| 全局路由守卫（未登录拦截） | Vue--15（119） |
| 首页轮播 / 搜索历史 / 列表 | Vue--16（120-122） |
| 商品详情弹层 / 数字框 | Vue--17（123-126） |
| 表单校验（`van-form` + `rules`） | 课程未系统讲，用到时查 |

⚠️ **术语撞车登记**（本轮新增两条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `layout` | 布局组件（本轮） | CSS 布局（flex/grid） | 有 `<router-view>` 的就是前者 |
| `key` | 验证码的服务端标识 | `v-for` 的 `:key` | 看上下文 |

## 7. 下一轮预告

**Vue--14（111-115，5 集 / 约 1 小时 44 分）：api 封装 · Toast · 短信验证 · 登录 · 响应拦截器**

这一轮开始"接真后端"，是整个项目**唯一同时碰到"网络 + 鉴权 + 错误处理"**的一段：

| 集 | 内容 | 关键点 |
|---|---|---|
| 111 | 封装 api 模块 | 为什么不直接在组件里 `axios.get` |
| 112 | Toast 轻提示 | 函数式组件，`this.$toast` |
| 113 | 短信验证 | **60 秒倒计时 + 定时器必须清** |
| 114 | 封装登录接口 | 拿到 token 前先不管它 |
| 115 | **响应拦截器** | **统一处理错误**，你表格里标了"漏的洞之一" |

开跑之前请确认：

1. 手输 `/`、`/home`、`/cart`、`/login`、`/xyz` 五个地址**行为都对**；
2. 切 tab 时控制台**只打印一次** `tabbar mounted`；
3. 验证码点一下**图真的变了**。

**建议开新对话** —— 111-115 是"网络层"的话题，跟这一轮的"结构设计"不是一类东西。
