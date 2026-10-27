# Vue--14 · api 层封装 · Toast · 短信验证倒计时 · 登录 · 响应拦截器

> **对应课程**：111-115（黑马 `BV1HV4y1a7n4`，5 集 / 约 1 小时 44 分）
> **读法**：这一轮是**网络层**。111 建目录、112 学个提示框、113 写倒计时、114 拼登录、115 收口拦截器。**115 是重点**，其他四集都是它的铺垫。
> **本轮定位**：从这一轮起，你的代码开始**跟外部世界打交道**。前面所有轮次都是"浏览器内部的事"，这一轮要处理**别人的服务器会失败**——超时、401、500、业务错误码。
> **篇幅偏长（5 集），建议分两次读**：① §1-§2（api 层 + Toast）② §3-§5（短信 / 登录 / 拦截器）。**只有 §5 是非读不可的**，前四节是它的铺垫。
> **前置**：Vue--13（登录页 + 图形验证码）、Vue--17 未学但不用等。

---

==一：概念==

## 1. 为什么要一层 api 模块（111）

### 1.1 组件里直接发请求的三个问题

新手最常见的写法：

```js
// 登录页里
const res = await axios.post('https://api.xxx.com/login', { mobile, code })
```

能跑。但项目里出现第二个、第三个请求时：

| 问题 | 具体表现 |
|---|---|
| **地址散落** | 换个环境（测试/生产），要全局搜替换 URL |
| **重复** | 首页要商品列表，"分类"页也要，两份代码 |
| **难改** | 后端说"登录接口加个参数"，你要翻遍所有 `axios.post` |
| **难测** | 想在组件里 mock 数据，没有切入点 |

### 1.2 三层结构

```
组件（.vue）
   │  只调 `api.login({ mobile, code })`，不知道 URL 是什么
   ▼
api 层（src/api/*.js）
   │  只声明"有哪些接口、参数长什么样"
   ▼
request 实例（src/utils/request.js）
   │  只负责"怎么发"：baseURL、超时、拦截器
   ▼
axios
```

**每层只回答一个问题**：

| 层 | 回答的问题 |
|---|---|
| 组件 | 我要什么数据 |
| api | 这个接口叫什么、参数是什么 |
| request | 请求怎么发、错了怎么办 |

> **这个分法你在 .NET 里天天用**：Controller 只调 Service，Service 只调 Repository，Repository 才碰 `DbContext`。**没人会在 Controller 里直接写 SQL。**

### 1.3 目录与命名

```
src/
├── api/
│   └── login.js          ← 登录相关（图形验证码、短信、登录）
├── utils/
│   └── request.js        ← axios 实例（115 才写，111 先用原生 axios 也行）
```

**命名原则：按"业务模块"分文件，不按"HTTP 方法"分。**

```js
// src/api/login.js
import request from '@/utils/request'

export const getPicCode = () => request.get('/captcha/image')
export const getSmsCode = (data) => request.post('/captcha/sms', data)
export const login = (data) => request.post('/login', data)
```

三个函数，三种写法，挑一种就行：

| 写法 | 例子 | 适合 |
|---|---|---|
| 箭头函数 + 直接 return | `export const login = d => request.post('/login', d)` | 最常见 |
| 具名函数 | `export function login (d) { return request.post(...) }` | 需要写注释/调试断点 |
| 对象聚合 | `export default { login, getPicCode }` | 接口特别多时 |

> ⚠️ **`export const` 声明的是"函数引用"，不是"调用结果"**。写成 `export const login = request.post(...)`（少了 `=>`）会在**模块加载时立刻发请求**——这行代码一 `import` 就发出去了，**页面还没渲染就多了一个请求**。

### 1.4 `baseURL` 该放哪

**开发时**前端在 `localhost:8080`，后端在 `localhost:3000`，**跨域**。三种处理：

| 方案 | 做法 | 适合 |
|---|---|---|
| 后端开 CORS | 后端加请求头 | 简单，但生产要收紧 |
| **devServer 代理** | `vue.config.js` 里 proxy | **课程常用** |
| 前端全用绝对地址 | `baseURL: 'https://api.xxx.com'` | 前后端已同域部署 |

```js
// vue.config.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: { '^/api': '' }
      }
    }
  }
}
```

配完之后，`request.get('/captcha/image')` 实际打到 `localhost:3000/captcha/image`，**浏览器看不到跨域**（代理是 Node 发的请求，不是浏览器）。

> 🔴 **改 `vue.config.js` 必须重启** —— 这一条从 Vue--08 说到现在，是同一个原因。

---

## 2. Toast：一次"怎么读文档"的示范（112）

### 2.1 三种用法

```js
import { Toast } from 'vant'

Toast('普通提示')
Toast.success('成功')
Toast.fail('失败')
```

带配置：

```js
Toast({
  message: '加载中...',
  duration: 0,          // 0 = 不自动关
  forbidClick: true,    // 期间禁止点击（防重复提交）
  position: 'top'
})
```

| 选项 | 默认 | 说明 |
|---|---|---|
| `message` | — | 文本 |
| `duration` | 2000 | 毫秒，**`0` 表示不自动消失** |
| `position` | `middle` | `top` / `middle` / `bottom` |
| `forbidClick` | `false` | 显示期间禁止点击 |
| `loadingType` | — | `spinner` / `circular` |

**手动关闭**：

```js
Toast.clear()
```

### 2.2 为什么有时要 `Vue.use(Toast)`

Vue--12 §2.7 提过：Toast 是**函数式组件**，不在模板里写标签。它有两条使用路径：

| 写法 | 需要 `Vue.use(Toast)` 吗 |
|---|---|
| `import { Toast } from 'vant'` → `Toast('x')` | ❌ 不需要 |
| `this.$toast('x')` | ✅ **需要** |

`Vue.use(Toast)` 干的事就是**挂一个 `$toast` 到 Vue 原型上**（和 `Vue.use(Vuex)` 挂 `$store` 同一个套路，Vue--09 §3.3）。

> **建议**：在 `utils/vant.js` 里 `Vue.use(Toast)`，之后全项目统一用 `this.$toast`——**少一行 import，且不用在每个文件里记着引**。

### 2.3 单例：后一个会顶掉前一个

```js
Toast('第一条')
Toast('第二条')     // 屏幕上只会看到"第二条"
```

**Toast 全局只有一个实例。** 这带来两个真实后果：

| 场景 | 结果 |
|---|---|
| 三个请求同时失败 | 只弹最后一条（**这其实是好事**，防刷屏） |
| 想同时显示两条不同提示 | 做不到，需要 `Toast.allowMultiple()`（Vant 3+ 才有） |

### 2.4 这一集真正教的事：定位到 API 表格

112 那 13 分钟标题是"**阅读文档**，掌握 toast 轻提示"——重点在前半句。

组件库文档的固定结构：

```
组件页
├── 介绍（这个组件干什么）
├── 代码演示（复制即用）
├── ★ API 表格（属性 / 事件 / 方法 / 插槽）  ← 你要的是这块
└── 常见问题
```

**遇到"这个组件能干什么"的问题，直接跳 API 表格，别从头读。** 表格里三列：参数名 / 说明 / 默认值。**默认值那一列最值得看**——它告诉你"不写会怎样"。

---

## 3. 短信验证：一个倒计时（113）

### 3.1 五步流程

```
点「发送验证码」
 ① 手机号格式对吗？        → 错就 Toast 提示，停
 ② 图形验证码填了吗？      → 没填就提示，停（防脚本刷短信）
 ③ 调接口 /captcha/sms
 ④ 成功 → 按钮禁用 + 60 秒倒计时
 ⑤ 倒计时结束 → 恢复可点
```

**②是很多人不理解的**：为什么发短信还要先填图形验证码？

因为**短信是要花钱的**（一条几分钱）。没有图形验证码，脚本能一秒发一万条，你的账户当天就被刷爆。**图形验证码是短信接口的门卫。**

### 3.2 手机号正则

```js
const mobileReg = /^1[3-9]\d{9}$/
```

拆开看：

| 片段 | 含义 |
|---|---|
| `^` | 开头 |
| `1` | 第一位必须是 1 |
| `[3-9]` | 第二位 3~9（**排除 10/11/12 这些号段**） |
| `\d{9}` | 后面 9 位数字 |
| `$` | 结尾（**必须写**，否则 11 位后面还能接东西） |

> 🔴 **漏了 `$` 的后果**：`/^1[3-9]\d{9}/` 会让 `138001380001234` 通过校验。**正则校验一定要两端锚定。**

### 3.3 倒计时怎么写

```js
data () {
  return {
    totalSecond: 0          // 0 = 可点
  }
},
methods: {
  async sendSms () {
    if (this.totalSecond > 0) return                 // ① 防重复
    if (!/^1[3-9]\d{9}$/.test(this.form.mobile)) {
      return this.$toast.fail('手机号格式不正确')
    }
    if (!this.form.picCode) {
      return this.$toast.fail('请先输入图形验证码')
    }

    await getSmsCode({ mobile: this.form.mobile, picCode: this.form.picCode })

    this.totalSecond = 60                            // ② 起跳
    const timer = setInterval(() => {                // ③ 每秒减
      this.totalSecond--
      if (this.totalSecond <= 0) clearInterval(timer)  // ④ 到 0 停
    }, 1000)
    this.timer = timer
  }
}
```

```html
<van-button
  size="small"
  :disabled="totalSecond > 0"
  @click="sendSms"
>{{ totalSecond > 0 ? `${totalSecond}s 后重发` : '发送验证码' }}</van-button>
```

四个细节全在里面：**先判重、再起跳、每秒减、到 0 停**。

### 3.4 🔴 定时器必须清（这一轮最实际的坑）

```js
beforeDestroy () {
  clearInterval(this.timer)
}
```

**不清会怎样？**

| 场景 | 后果 |
|---|---|
| 倒计时中途用户点了"返回" | 组件销毁，**但定时器还在跑** |
| 定时器回调里 `this.totalSecond--` | 访问已销毁实例的属性 |
| 结果 | 控制台报错 / 内存泄漏 / 再进页面时**旧定时器还在改新实例** |

**最阴的一种**：用户快速进出 5 次登录页 → **5 个定时器同时跑** → 倒计时从 60 直接掉到 55（五个一起减）。

> **C# 里这事有强制机制**：`System.Threading.Timer` 实现了 `IDisposable`，你可能忘了 `Dispose`，但**静态分析（CA2000 一类规则）会提示你**。JS 里没有任何提醒——**`setInterval` 返回一个数字，长得完全无害。**

### 3.5 🟡 `setInterval` 在移动端不准

```js
setInterval(() => { this.totalSecond-- }, 1000)
```

手机切到后台（接电话、切 App），**浏览器会节流甚至暂停定时器**。你切回来发现"60 秒变成 45 秒就结束了"或者"过了 2 分钟还在倒计时"。

| 实现 | 问题 |
|---|---|
| 累减 `totalSecond--` | 后台被节流 → 不准 |
| **记结束时间戳** | `endTime = Date.now() + 60000`，每次 tick 算 `Math.ceil((endTime - Date.now()) / 1000)` |

**课程用累减**（够用）。真实项目用时间戳——**因为"还剩多少秒"应该由"当前时间"决定，而不是由"减了几次"决定。**

### 3.6 按钮禁用 + 判断保护，两道都要

```html
<van-button :disabled="totalSecond > 0" @click="sendSms">
```

```js
if (this.totalSecond > 0) return
```

**为什么两处都写？** `disabled` 只挡"点击这个按钮"，挡不住"代码里别处调用 `sendSms()`"。**约束放在函数入口**——这是 Vue--11 §4.1 讲过的同一条原则。

---

## 4. 登录（114）

### 4.1 流程

```
点「登录」
 → 校验手机号 / 验证码非空
 → dispatch? 不，先直接调 api.login({ mobile, code })
 → 成功：后端返回 { token, ... }
 → 跳转（回首页 或 回来源页）
 → 失败：拦截器已经弹提示了（115 之后）
```

### 4.2 成功后跳哪：`redirect` 参数

用户可能因为"想买某商品"被踢到登录页（119 的守卫会做这件事）。登录完**该回到他原本想去的地方**。

```js
async handleLogin () {
  await this.$api.login({ mobile: this.form.mobile, code: this.form.code })
  const redirect = this.$route.query.redirect || '/home'
  this.$router.replace(redirect)          // replace: 登录页不进历史
}
```

| 方法 | 历史记录 | 适合 |
|---|---|---|
| `push` | 留一条 | 正常跳转 |
| **`replace`** | **替换当前** | **登录成功后**（不然按返回又回登录页） |

> 🔴 **登录成功用 `push` 的经典 bug**：用户点返回 → 回到登录页 → 再点返回 → 回到上一个页面。**用户会觉得"我明明登录了，怎么又回来了"。**

### 4.3 token 先别管

114 只做到"请求发出、拿到响应"。**token 存哪、怎么带、怎么续**是 116 集的事。

**这一轮的边界要清楚**：你现在会有一个"能登录但不记得自己登录过"的应用。**这是对的，不是你没学会。**

---

## 5. 响应拦截器：让错误只处理一次（115）

### 5.1 没有拦截器时，每个请求都要写一遍

```js
const res = await request.post('/login', data)
if (res.data.code !== 200) {
  Toast.fail(res.data.message)
  return
}
// 然后才用 res.data.data
```

10 个接口 → **10 份一模一样的判断**。而且总有一个忘了写。

### 5.2 `utils/request.js`

```js
import axios from 'axios'
import { Toast } from 'vant'

const request = axios.create({
  baseURL: '/api',
  timeout: 5000
})

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      Toast.fail(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res            // ← 关键：业务层拿到的是 res，不是 res.data
  },
  (error) => {
    Toast.fail('网络异常，请稍后重试')
    return Promise.reject(error)
  }
)

export default request
```

### 5.3 `return res` 这一个动作省了多少

| 没有这行 | 有这行 |
|---|---|
| 业务层写 `res.data.data` | 业务层写 `res.data` |
| 每处都要记得 `.data` | 拦截器统一剥一层 |

```js
// api/login.js
export const login = (data) => request.post('/login', data)

// 页面里
const res = await login({ mobile, code })
console.log(res.data)          // ← 直接是业务数据
```

> ⚠️ **一旦定了"拦截器剥一层"，全项目就必须一致**。半路加这行，会让之前写好的 `res.data.data` 全部变成 `undefined`——**静默失败，且是大面积。**

### 5.4 🔴 错误分支的三个坑

**① `reject` 了但调用方没 `catch`**

```js
await login(...)        // ← 失败时抛错，这行之后不执行
```

| 情况 | 结果 |
|---|---|
| 页面里 `await` 没 `try/catch` | **未处理的 Promise rejection**（控制台一片红，但功能看着正常） |
| 页面里 `await` 有 `try/catch` | 干净 |

**这不是 bug**：拦截器 reject 是正确做法（让调用方知道失败），**但调用方必须处理**。工程上常见两种策略：

| 策略 | 做法 | 适合 |
|---|---|---|
| **拦截器只弹提示，不 reject** | `return Promise.resolve(null)` | 页面懒得管失败 |
| **拦截器 reject，页面 try/catch** | 本笔记的写法 | **更正确**，但要写 catch |

**别混用**。混用会出现"有的地方 await 拿到 null，有的地方抛错"。

**② 多个请求同时失败 → 弹很多次**

```js
Toast.fail(res.message)     // 三个请求同时 500 → 弹三次
```

**处方**（简单版）：判断当前是否已有 Toast 在显示。

```js
let toastShowing = false
const showError = (msg) => {
  if (toastShowing) return
  toastShowing = true
  Toast.fail(msg)
  setTimeout(() => { toastShowing = false }, 2000)
}
```

**处方（Vant 2 现成方案）**：`Toast` 本身就是单例，后一个会覆盖前一个，**最多也就是闪几下**。所以很多项目干脆不管。**知道有这个问题，比装作没有强。**

**③ 401 要单独处理**

```js
if (res.code === 401) {
  // token 失效 → 清 token + 跳登录
  return Promise.reject(new Error('未登录'))
}
```

**401 不能只弹一句"请重新登录"就完了**，必须**清掉本地 token**，否则用户会卡在"每次请求都 401，但页面显示已登录"的状态。**116-119 会补这块，这里先留个位置。**

### 5.5 请求拦截器：给每个请求带上 token（预告 116）

```js
request.interceptors.request.use((config) => {
  const token = store.state.user.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

**它和响应拦截器是一对**：一个"出门前带证件"，一个"回来时看结果"。**116 集就干这件事。**

---

==二：格式==

## 1. 三个文件的分工

| 文件 | 只写 | 不写 |
|---|---|---|
| `src/api/login.js` | 接口名 + 参数 | URL 前缀、错误处理 |
| `src/utils/request.js` | baseURL、超时、拦截器 | 任何业务接口 |
| `src/views/login/index.vue` | 校验、调 api、跳转 | axios、URL |

## 2. `request.js` 完整模板

```js
import axios from 'axios'
import { Toast } from 'vant'

const request = axios.create({ baseURL: '/api', timeout: 5000 })

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      Toast.fail(res.message || '请求失败')
      return Promise.reject(new Error(res.message || 'error'))
    }
    return res
  },
  (error) => {
    Toast.fail('网络异常，请稍后重试')
    return Promise.reject(error)
  }
)

export default request
```

## 3. 倒计时代码模板

```js
data () { return { totalSecond: 0 } },
methods: {
  async sendSms () {
    if (this.totalSecond > 0) return
    // ① 校验 ② 调接口
    this.totalSecond = 60
    const timer = setInterval(() => {
      if (--this.totalSecond <= 0) clearInterval(timer)
    }, 1000)
    this.timer = timer
  }
},
beforeDestroy () { clearInterval(this.timer) }
```

## 4. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| `res.data` 是 `undefined` | 拦截器已剥一层，又写了一次 `.data` | 全项目统一规则 |
| 请求 / 跨域失败 | 没配 devServer proxy | §1.4 |
| 改了 proxy 不生效 | 没重启 | 重启 |
| 控制台一片 `Uncaught (in promise)` | 拦截器 reject 了，页面没 catch | 加 `try/catch` |
| 回到登录页还能"登录状态" | 401 没清 token | 116 补 |
| 倒计时越跑越快 | 多个定时器叠着跑 | `beforeDestroy` 清 |
| 手机号 `1380013800012` 通过了 | 正则漏 `$` | 两端锚定 |
| 点一次发两条短信 | 没防重复点击 | `totalSecond > 0` 直接 return |

---

==三：代码==

## 1. 实验 A：三层结构跑通一个请求

**① `utils/request.js`**（先不加拦截器）

```js
import axios from 'axios'
export default axios.create({ baseURL: '/api', timeout: 5000 })
```

**② `api/login.js`**

```js
import request from '@/utils/request'
export const getPicCode = () => request.get('/captcha/image')
```

**③ 页面里**

```js
import { getPicCode } from '@/api/login'

const res = await getPicCode()
console.log(res)         // 没有拦截器时：{ data: {...}, status: 200, ... }
```

**④ 加上拦截器后再打一次** → `res` 直接是后端的 JSON。

> **这一步是 115 的全部价值**：同一行 `console.log`，输出形状变了。

## 2. 实验 B：验证"定时器不清会叠"

**① 故意删掉 `beforeDestroy`**
**② 进登录页 → 发一次 → 立刻 `router.push('/home')` → 再进登录页 → 再发一次**
**③ 观察**：第二次倒计时**每 2 秒掉 2 个数**（两个定时器在跑）

**④ 加回 `beforeDestroy` → 恢复正常。**

## 3. 实验 C：拦截器 reject 的两种处理

**① 页面里不写 catch**

```js
await login({ mobile: 'x', code: 'y' })     // 后端返回 code: 400
```

→ 控制台：`Uncaught (in promise) Error: 手机号格式错误`

**② 加上 catch**

```js
try {
  await login(...)
  this.$router.replace('/home')
} catch (e) {
  // 拦截器已经 toast 过了，这里可以什么都不做
}
```

→ 控制台干净，Toast 照常弹出。

**③ 结论**：**reject 是"通知"，不是"二次报错"**。拦截器负责提示，页面负责收尾。

## 4. 实验 D：登录完整链路（无 token）

```js
async handleLogin () {
  if (!/^1[3-9]\d{9}$/.test(this.form.mobile)) return this.$toast.fail('手机号不正确')
  if (!this.form.code) return this.$toast.fail('请输入验证码')
  try {
    await login({ mobile: this.form.mobile, code: this.form.code })
    const back = this.$route.query.redirect || '/home'
    this.$router.replace(back)
  } catch (e) {}
}
```

> **注意 `catch (e) {}` 是空块** —— 部分 lint 规则集（`no-empty`）会报；Standard 新版允许空 catch，但**写个注释更保险**：`catch (e) { /* 拦截器已提示 */ }`。

---

==四：总结==

## 1. 一句话记住三个

- **api 层只管"接口叫什么"，request 只管"怎么发"**，组件只管"我要什么"。
- **`return res` 剥一层是全局约定**，定了就别半路改。
- **`setInterval` 必须 `clearInterval`**，JS 里没人替你报这个错。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| api 写法 | `export const login = d => request.post('/login', d)` |
| **常见错** | 少写 `=>` → `import` 时就发请求 |
| Toast 三兄弟 | `Toast()` / `Toast.success()` / `Toast.fail()` |
| `this.$toast` 前提 | `Vue.use(Toast)` |
| Toast 特性 | **单例**，后一个覆盖前一个 |
| 手机号正则 | `/^1[3-9]\d{9}$/`，**两端锚定** |
| 倒计时四步 | 判重 → 起跳 → 每秒减 → 到 0 停 |
| **必须清定时器** | `beforeDestroy () { clearInterval(this.timer) }` |
| 登录成功跳转 | **`replace`**，不用 `push` |
| 拦截器成功分支 | `return res`（不是 `response`） |
| 拦截器错误分支 | `Promise.reject(...)`，**页面要 catch** |
| 401 | 光提示不够，**必须清 token** |

## 3. ⭐ 收敛时刻

**① Vue--09 §3.3 的 `Vue.use` 机制 → 这里又见一次**

`Vue.use(Vuex)` 挂 `$store`，`Vue.use(Toast)` 挂 `$toast`。**这不是巧合**：插件机制的通用形态就是"往原型上挂东西"。你现在应该能自己解释"为什么 `this.$xxx` 能凭空存在"。

**② Vue--13 §3.3 的"加时间戳防缓存" → 这里换了个形态**

上一轮是图片缓存，这一轮是**请求结果不能复用**（比如登录后立刻查购物车，拿到的可能是旧数据）。**同一条直觉：地址不变 + 内容要新 = 加随机量。**

**③ Vue--01 的"生命周期" → 第一次有了必须清的东西**

Vue--03 §「beforeDestroy」你只是背了"要清定时器/解绑事件"。这一轮它是**具体的、会真的出 bug 的**。**`beforeDestroy` 从"知识点"变成了"习惯"。**

**④ Vue--11 的"约束放在入口" → 这里第三次出现**

Vue--11 说"数量下界放 mutation 里挡"，这一轮说"防重复点击放 `sendSms` 开头挡"。**同一条原则，换个场景。** 你现在该能看出：**`disabled`、`v-if` 都是"面子"，函数开头的判断才是"里子"。**

## 4. 静默失败清单

网络层的坑**比语法坑贵**，因为它们牵扯外部：

| # | 做法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `export const login = request.post(...)` | 页面一加载就发请求 | 少写 `=>`（少了函数体） |
| 2 | 拦截器剥了 `.data`，页面又写 `res.data.data` | 数据是 `undefined`，页面空白 | 剥了两层 |
| 3 | 定时器没清 | 多次进出后倒计时跳着走 | 多个 interval 并存 |
| 4 | 正则漏 `$` | 超长手机号通过校验 | 没锚定结尾 |
| 5 | 拦截器 reject，页面没 catch | 控制台红字一片 | 未处理 rejection |
| 6 | 401 只 toast 不清 token | 一直"已登录"但每个请求都失败 | 状态没重置 |
| 7 | 登录成功用 `push` | 按返回回到登录页 | 历史没替换 |
| 8 | Toast 里 `duration: 0` 忘了关 | 提示永远不消失 | 要 `Toast.clear()` |
| 9 | 三个请求同时失败 | Toast 闪三下 | 单例被反复覆盖 |
| 10 | proxy 配了但没重启 | 还是跨域 | 启动时读配置 |

**第 1、2、3 条是这一轮的三大坑**，共同特征：**代码看起来完全正常。**

**工程上怎么防**：

- api 层**只导出函数**，谁都不许在里面写"立即执行"的代码；
- 项目开工就定死"拦截器剥不剥 `.data`"，写进 README；
- **只要写了 `setInterval` / `setTimeout` / `addEventListener`，下一行就想"谁清它"**；
- 手机号、邮箱这类校验，**正则先拿去测边界值**（11 位刚好、12 位、第二位是 2）。

**这不是 bug，是代价**：HTTP 请求天生可能失败，而 JS 的失败默认是"抛给没人接的地方"。**拦截器给了你一个"集中收口"的机会，但不能替你在每个调用点做决定。**

## 5. C# 类比可用度

| C# / .NET 侧 | 前端侧 | 可用度 | 注意 |
|---|---|:--:|---|
| Controller → Service → Repository | 组件 → api → request → axios | ⭐⭐⭐ | **同构**，分层理由一样 |
| `HttpClient` 单例 + `BaseAddress` | `axios.create({ baseURL })` | ⭐⭐⭐ | 都要求"一个实例，别每次 new" |
| **`DelegatingHandler`** | **拦截器** | ⭐⭐⭐ | **最准的类比**：都能在发出前/收到后统一改 |
| ASP.NET Core Middleware | 拦截器 | ⭐⭐⭐ | 都是"请求管道上的一环" |
| `System.Threading.Timer` / `IDisposable` | `setInterval` / `clearInterval` | ⭐⭐⭐ | 都必须释放，但 **.NET 有静态分析提醒，JS 没有** |
| `try/catch (HttpRequestException)` | `try/catch` 包 `await` | ⭐⭐⭐ | 一样 |
| 全局异常过滤器 `IExceptionFilter` | 响应拦截器 | ⭐⭐⭐ | 都是"统一处理错误" |
| `Toaster`（WPF 弹窗库） | `Toast` | ⭐⭐ | 目的一样，机制不同 |

**用法建议**：把 `request.interceptors.response` 直接当 **`DelegatingHandler`** 看：

```csharp
// 你写过的样子
protected override async Task<HttpResponseMessage> SendAsync(...) {
    var res = await base.SendAsync(request, ct);
    if (!res.IsSuccessStatusCode) { /* 统一处理 */ }
    return res;
}
```

**一模一样的职责：把"每个请求都要做的事"从调用点搬到管道上。**

**C# 有而 JS 没有的**：**编译期就能发现"定时器没释放"**（`IDisposable` + 分析器）。JS 里 `const t = setInterval(...)` 的 `t` 只是个数字，**丢了就丢了，永远不会有人提醒你。**

## 6. 解锁边界

**本轮新解锁**

- api 层的存在理由与三层分工（组件 / api / request / axios）
- `export const` 与"立即执行"的区别（少写 `=>` 就发请求）
- devServer proxy 解决跨域，及其"必须重启"
- Toast：三种快捷方法、5 个配置项、单例覆盖、`Vue.use(Toast)` 与 `$toast`
- 组件库文档的读法（直接跳 API 表格，重点看默认值）
- 短信用图形验证码挡脚本的真实原因（短信要钱）
- 手机号正则 `/^1[3-9]\d{9}$/` 与**两端锚定**
- 倒计时四步法；**`beforeDestroy` 必须清定时器**；`setInterval` 后台节流的替代方案
- 登录成功后用 `replace` 与其原因
- 响应拦截器：`return res` 剥一层、成功/错误两分支、`reject` 与 `catch` 的配合
- 401 必须清 token（留下位置，116-119 补）

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 请求拦截器 + token 携带 | **Vue--15（116）** |
| token 存 vuex + `localStorage` 持久化 | Vue--15（116-117） |
| 全局 loading 遮罩 | Vue--15（118） |
| **全局路由守卫（未登录拦截）** | Vue--15（119） |
| `redirect` 参数的完整闭环（守卫写入 → 登录页读取） | Vue--15（119） |
| 首页轮播 / 搜索历史 | Vue--16（120-122） |
| `van-form` + `rules` 表单校验 | 课程未系统讲，用到时查 |
| 接口并发控制 / 取消请求（`AbortController`） | 课程未讲 |

⚠️ **术语撞车登记**（本轮新增三条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `拦截器` | axios 的 interceptor | 路由守卫 | 一个管请求，一个管页面 |
| `token` | 登录凭证 | 词法单元（编译器） | 本项目里是凭证 |
| `replace` | `$router.replace` | `String.replace` | 带 `$router` 的是跳转 |

## 7. 下一轮预告

**Vue--15（116-119，4 集 / 约 1 小时 4 分）：token 权证 · storage 持久化 · loading · 全局路由守卫**

这一轮补的是**鉴权闭环**，你在表里标了"119 是最大的洞"。四集对应四个环节：

| 集 | 环节 | 一句话 |
|---|---|---|
| 116 | token 进 vuex | 登录成功后 `commit` 存起来 |
| 117 | 存 localStorage | **刷新页面 token 不能丢** |
| 118 | 全局 loading | 请求中遮罩，防重复提交 |
| 119 | **路由守卫** | 没票不让进门，**并记住他原本要去哪** |

**119 之所以是"最大的洞"**：前面所有内容都是"功能"，只有它是"**安全**"。而且它把 114 的 `redirect` 参数、116 的 token、118 的 loading 全串起来了——**这一轮是全项目的合流点。**

开跑之前请确认：

1. 三个文件（`api/login.js` / `utils/request.js` / 页面）分工清楚，页面里**没有一个 axios**；
2. 倒计时**中途离开页面再回来不会跳着走**；
3. 拦截器 reject 时控制台**没有** `Uncaught (in promise)`。

**建议开新对话**——119 的守卫逻辑会推翻"页面想进就进"这个默认假设，跟这一轮的网络层是不同的心智模型。
