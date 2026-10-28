# 大事件02 · 注册登录 · layout 骨架 · 文章分类

> **对应课程**：168-178（黑马 `BV1HV4y1a7n4`，11 集 / 约 3 小时 33 分）
> **读法**：这是「Vue3 大事件项目」第 2 篇。上一篇一行业务代码都没有，这一篇**第一次出现能点的界面** —— 从「空壳」到「登录进去、看到分类列表、增删改」。
> **本轮定位**：一个完整的业务闭环要走完 **六步** —— 静态结构 → 表单校验 → 发请求 → 拿 token → 进主页 → 增删改。这 11 集就是这六步。

---

==一：概念==

## 1. 登录/注册页的静态结构（168）

### 1.1 一个文件管两个页面

打开 `views/login/` 你会看到两个文件：`LoginPage.vue` 和 `RegisterPage.vue`。**但它们的布局完全一样**（左边插图、右边表单），只有「登录 or 注册」的文案和字段不同。

**课程的取舍：两个页面各自一份，共用一套 CSS。** 靠一个父级 class 切换样式：

```html
<!-- LoginPage.vue -->
<div class="login-page">
  <div class="form">...</div>
</div>

<!-- RegisterPage.vue -->
<div class="login-page reg-page">
  <div class="form">...</div>
</div>
```

**为什么不用一个组件 + `v-if`？** 因为路由是 `/login` 和 `/reg` 两个地址，**用两个文件的话 URL 和组件是一一对应的**，心智负担最小。**代价是样式重复** —— 所以样式写在**共用的 css 文件**里，靠父级 class 区分。

**这是个典型的取舍**：

| 方案 | 好处 | 代价 |
|---|---|---|
| 两个文件 + 共用 CSS | 路由清晰、互不干扰 | 少量 HTML 重复 |
| 一个文件 + `v-if` | 零重复 | 组件里到处判断「现在是登录还是注册」，越写越乱 |

**「少量重复 vs 一堆 if」—— 选前者。** 这条在你后面封装组件时还会遇到。

### 1.2 `el-form` 的三个绑定

```html
<el-form :model="form" :rules="rules" ref="formRef">
  <el-form-item prop="username">
    <el-input v-model="form.username" placeholder="请输入用户名" />
  </el-form-item>
</el-form>
```

**三个属性，各管一件事，缺一个校验就废**：

| 属性 | 挂在哪 | 作用 | 少了会怎样 |
|---|---|---|---|
| `:model` | `el-form` | 告诉表单「数据对象是谁」 | 所有校验失效（拿不到值） |
| `:rules` | `el-form` | 校验规则表 | 不校验 |
| `prop` | `el-form-item` | **告诉这一项对应 `model` 里的哪个字段** | **这一项静默不校验** |

⚠️ **`prop` 是最高频的静默失败点**，单独拎出来说（见 2.1）。

### 1.3 几个小细节

```html
<el-input v-model="form.password" type="password" show-password />
```

- `type="password"` → 输入内容变成圆点
- `show-password` → 右侧出现「小眼睛」按钮，可以切换明文

```html
<el-checkbox v-model="form.agree">我已阅读并同意用户协议</el-checkbox>
```

**`el-checkbox` 配 `v-model` 绑的是 `boolean`** —— 不是 `string`。这点和原生 `<input type="checkbox">` 一样，但和 `el-input` 不一样（那边是 string）。**Element Plus 的组件，`v-model` 的类型各不一样，要看文档。**

---

## 2. 表单校验：`rules` 的三种写法（169）🔥🔥

**这是 11 集里最长的一集（2175 秒，36 分钟）**，因为它把 Element Plus 校验的三种模式全讲了一遍。

### 2.1 先解决 `prop` 这个坑

```html
<el-form :model="form" :rules="rules">
  <el-form-item prop="username">                    <!-- ✅ 对上 form.username -->
  <el-form-item prop="user">                        <!-- ❌ 拼错 -->
  <el-form-item>                                    <!-- ❌ 压根没写 -->
```

**三种错法的表现完全相同**：输入框能打字，点「登录」，**没有任何红字提示，也没有任何报错**。

**为什么这么静默？** 因为 Element Plus 是**按 `prop` 去 `model` 里取值**，然后去 `rules` 里找**同名规则**。`prop` 拼错 → `model` 里取到 `undefined` → `rules` 里也找不到规则 → **「没有规则」= 「不需要校验」**。

**这是 Element Plus 的设计选择：它的校验是「查表」，查不到就当没这回事。** 不是 bug。

**防法（三条，按性价比排序）**：

1. **TS 项目里给 `rules` 加类型**，字段名写错 TS 当场红；
2. **每写完一个 `el-form-item`，立刻对着 `model` 核一遍字段名**；
3. **写完先故意留空点一次提交** —— 该报错的地方不报错，就是 `prop` 断了。

### 2.2 第一种：`required`（必填）

```js
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
  ],
}
```

**`trigger` 决定什么时候检查**：

| `trigger` | 什么时候触发 | 适合 |
|---|---|---|
| `'blur'` | **失去焦点** | 输入框（用户打完字离开时提示） |
| `'change'` | 值变化（每次输入） | 下拉、开关、单选 |

⚠️ **`trigger: 'blur'` 的坑**：如果你直接点「提交」而**没离开输入框**，`blur` 不会触发 —— 但 `validate()` 会强制校验全部，所以提交没问题。**只是「边打字边提示」不会有。**

**同一个字段可以写多条规则**（数组），从前往后依次检查，**第一条不通过就停**：

```js
username: [
  { required: true, message: '请输入用户名', trigger: 'blur' },
  { min: 5, max: 16, message: '用户名 5-16 位', trigger: 'blur' },
]
```

### 2.3 第二种：`pattern`（正则）

```js
password: [
  { required: true, message: '请输入密码', trigger: 'blur' },
  { pattern: /^\S{6,15}$/, message: '密码 6-15 位非空字符', trigger: 'blur' },
]
```

**`/^\S{6,15}$/` 拆开读**：

| 片段 | 含义 |
|---|---|
| `^` `$` | 从头到尾完整匹配（不加这两个就会「包含即可」） |
| `\S` | 非空白字符（`\s` 的反面） |
| `{6,15}` | 重复 6 到 15 次 |

⚠️ **`^\S{6,15}$` vs `\S{6,15}` 的区别是致命的**：

```js
/\S{6,15}/.test('a  b  c  d  e  f')     // true  ← 中间有空格也算过
/^\S{6,15}$/.test('a  b  c  d  e  f')   // false ← 正确
```

**校验规则的正则，两端必须锚定。**

### 2.4 第三种：`validator`（自定义函数）🔥

**什么时候必须用它？** 当校验**依赖别的字段**时 —— 最典型的就是「确认密码要和密码一样」。

```js
const rules = {
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  repassword: [
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error('两次密码不一致'))    // ← 不通过
        } else {
          callback()                              // ← 通过（不传参数）
        }
      },
      trigger: 'blur',
    },
  ],
}
```

**`validator` 的三个参数**：

| 参数 | 是什么 | 你要不要管 |
|---|---|---|
| `rule` | 当前这条规则的完整对象 | 基本不用 |
| `value` | **当前字段的值** | 用它 |
| `callback` | **必须调用的回调** | 一定要调 |

### 2.5 `callback` 不调用会怎样 —— 这是最容易犯的错

```js
// ❌ 错法：忘了调 callback
validator: (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次密码不一致'))
  }
  // ← 相等时什么都不做
}
```

**后果：表单永远停在「校验中」，`validate()` 永远不 resolve**。界面上看不到任何错误，但**提交按钮点了没反应** —— 因为 `await validate()` 卡死了。

**这条要背下来**：`validator` 的两条分支必须都调 `callback`：

```js
callback()                  // 通过：不传参
callback(new Error('原因'))  // 不通过：传 Error 对象
```

**为什么必须传 `Error` 对象，不能传字符串？** 因为底层（async-validator）会读 `error.message`。传字符串的话 `error.message` 是 `undefined` → **不通过，但没有提示文字**。又一种静默失败。

### 2.6 跨字段校验的第二个坑：改密码时确认密码不重新校验

**场景**：用户先填了确认密码（对得上），回去改了密码 → **确认密码那一栏不会自动重新校验**。

**原因**：`repassword` 的校验只在 `repassword` 自己 `blur` 时触发。`password` 变了它不知道。

**解法**：在 `password` 的校验通过后，手动触发一次 `repassword` 的校验：

```js
// password 的 bluer 事件里
const onPasswordBlur = () => {
  if (form.repassword) {
    formRef.value.validateField('repassword')    // ← 只校验指定字段
  }
}
```

**`validateField`** 是 `el-form` 实例的方法，只校验传入的字段（可以传数组）。**另一个方法 `clearValidate`** 用来清空校验状态（关弹层后重开必用，见 9.3）。

**这两个方法平时用不到，但「跨字段」和「弹层复用」这两个场景下躲不开。**

### 2.7 一次全量校验：`validate()`

```js
const formRef = ref(null)

const submit = async () => {
  await formRef.value.validate()      // 不通过会 reject
  // 走到这里说明全过了
}
```

**`validate()` 的 Promise 语义**（要背）：

| 情况 | 结果 |
|---|---|
| 全部通过 | `resolve(true)` |
| 有一项不通过 | **`reject(错误对象)`** —— 不是 resolve(false) |
| 忘了 `callback` | **永远 pending** |

**「reject 而不是 resolve(false)」这个设计决定了你必须用 try/catch 或 .catch**：

```js
// 写法 A：await + catch（课程用的）
try {
  await formRef.value.validate()
} catch {
  return                              // 校验没过，直接退
}

// 写法 B：.catch 吞掉
await formRef.value.validate().catch(() => {})
// ⚠️ 但这样吞掉后，你无法区分「过了」还是「没过」——所以要么在 catch 里 return
```

**推荐写法 A。** 写法 B 看起来更短，但它把「失败」和「成功」变成同一条路径 —— **和你上一篇学的「拦截器不能 return undefined」是同一个错误**：**把失败做成静默的。**

### 2.8 一个 `rules` 的写法细节：什么时候用 `ref` 什么时候用普通对象

```js
const form = reactive({ username: '', password: '' })
const rules = { username: [...] }         // ← 普通对象，不需要 reactive
```

**`rules` 不需要响应式**：它一旦定义就不再变。**给不需要变的东西套 `reactive` 是浪费**，而且会让人误以为「规则是动态的」。

**但如果规则真的依赖别的状态**（比如「编辑时密码非必填」），就必须用 `computed` 生成：

```js
const rules = computed(() => ({
  password: isEdit.value ? [] : [{ required: true, ... }],
}))
```

⚠️ **`computed` 出来的 rules 传给 `:rules` 时不用 `.value`**（模板里自动解包）。但**在 JS 里访问要 `.value`** —— 这是你 Vue3 篇踩过的老坑，这里会再撞一次。

---

## 3. 预校验 + 封装 api 完成注册（170）

### 3.1 从「点按钮」到「真的发请求」的四步

```
① 用户点「注册」
② await formRef.value.validate()   → 通过才继续
③ await registerAPI(form)          → 拿结果
④ 成功 → ElMessage.success + router.push('/login')
```

**这四步是所有表单提交的通用骨架**，后面「添加分类」「添加文章」全是它。

### 3.2 api 层怎么写（呼应篇 1 的 `api/` 目录）

```js
// api/user.js
import request from '@/utils/request'

export const registerAPI = ({ username, password, repassword }) =>
  request.post('/api/reg', { username, password, repassword })
```

**三个细节**：

**① 参数用解构 `{ username, password, repassword }`**

**好处**：调用方传多余的字段（比如 `agree`、`confirmPwd`）不会被带进请求体。**后端接口多一个字段就可能报错**。

**② 用箭头函数 + 隐式 return，不写 `{}`**

```js
export const registerAPI = (data) => request.post('/api/reg', data)      // ✅ 一行
export const registerAPI = (data) => { request.post('/api/reg', data) }  // ❌ 返回 undefined
```

**第二行是经典坑**：加了花括号就**没有隐式 return**，调用方 `await registerAPI()` 拿到 `undefined`。**而报错会发生在很远的地方**（`Cannot read properties of undefined`）。

**③ 不要在这里加 try/catch**

api 层的职责是「发出去」。**错误处理应该在调用方**（决定是弹提示、还是留在页面）。在 api 层 catch 掉，调用方就永远不知道失败了 —— 又一种静默。

### 3.3 为什么 `registerAPI` 不接 `form` 整个对象

```js
await registerAPI(form)                    // 传 reactive 对象
```

**可以，但要注意**：传进去的是 **Proxy**（`reactive` 的代理对象）。axios 序列化时能正常处理，但**如果你在请求发出去之前改了 `form`，请求体里的值也会变**（因为传的是引用）。

**这不是 bug，是「引用传递」的正常后果**。但在「提交后立刻清空表单」的场景下会踩到：

```js
const p = registerAPI(form)     // 还没 await
form.username = ''              // ← 请求体可能已经变成空了
```

**严格说 axios 在 `request()` 调用时就会序列化**，所以这行不会出问题。**但「传引用给异步函数，然后改它」是个坏习惯** —— 改成 `registerAPI({ ...form })` 或解构取值，就没有这类疑虑。

---

## 4. 登录校验和登录请求（171）

### 4.1 登录和注册的差别只有一步

**多了一步「拿到 token 存起来」**：

```js
const res = await loginAPI(form)        // res 是 { token, ... }（拦截器已拆包）
userStore.setUser(res.token)
router.push('/')
```

**注意 `res` 是什么**。上一篇讲过：拦截器 `return data`，所以 `res` **直接就是后端 `data` 字段的内容**。

**如果这里你写 `res.data.token`** → `undefined` → token 存成 undefined → 刷新掉登录 → **你会以为是持久化失效，其实是拆包认知错了**。

⚠️ **这条要反复看**：**判断 `res` 是什么的唯一依据是「这段代码在哪一层」**：

| 代码位置 | `res` 是 |
|---|---|
| 组件里（`await xxxAPI()`） | 后端 body 的 **`data`** |
| `request.js` 的拦截器里 | **axios 的 response** |

### 4.2 `router.push('/')` 之后发生了什么

**`push('/')` 不是「跳到首页」，是「改了 URL」**。真正让它变成首页的是：

```
URL 变 /  → router 匹配到 /  → 加载 LayoutContainer  → redirect 到 /article/manage
```

**链路必须清楚**，因为后面 `router.push` 失效时会很难查：

| 现象 | 原因 |
|---|---|
| URL 变了但页面没变 | `router-view` 没放在对的位置 |
| 页面白屏 | redirect 指向的组件 import 失败（路径错） |
| 被弹回登录页 | 守卫把请求拦了（见 5.2） |

### 4.3 一个容易重复弹的提示

**如果后端返回 `code: 0`，而你的响应拦截器里也写了 `ElMessage.success`，业务层又写一遍** → **用户看到两条「操作成功」**。

**判断标准**：**成功提示归业务层（它知道「成功了要说什么」），错误提示归拦截器（它知道「为什么失败」）**。

**这个分工很自然**：拦截器不知道这次请求是「登录」还是「删文章」，没法给出合适的成功文案。但它知道 `code` 是什么、`status` 是多少。

---

## 5. layout 骨架与登录访问拦截（172）🔥

### 5.1 后台布局的解剖

```
┌─────────────────────────────────┐
│  header（用户信息 / 退出）        │
├──────────┬──────────────────────┤
│  aside   │                      │
│  菜单     │   main               │
│          │   <router-view />    │
└──────────┴──────────────────────┘
```

对应 Element Plus：

```html
<el-container>
  <el-aside width="200px">菜单</el-aside>
  <el-container>
    <el-header>用户信息</el-header>
    <el-main><router-view /></el-main>
  </el-container>
</el-container>
```

**关键点：`el-container` 是嵌套的**。外层左右分（aside + 内层），内层上下分（header + main）。**Element Plus 的 `el-container` 会自动判断方向** —— 里面有 `el-aside` 就横排，没有就竖排。

**`<router-view />` 在 `el-main` 里** —— 这就是上一篇说的「第二层 router-view」。**换子页面时，aside 和 header 不重新渲染**，所以用户信息不会闪一下。

### 5.2 全局前置守卫（Vue Router 4 的新写法）

```js
router.beforeEach((to) => {
  const userStore = useUserStore()
  if (!userStore.token && to.path !== '/login') {
    return '/login'          // ← 直接 return 路径
  }
})
```

**`to` 是什么**：目标路由对象，常用的三个属性：

| 属性 | 值 |
|---|---|
| `to.path` | `'/article/manage'`（完整路径） |
| `to.name` | 路由名（如果配了 `name`） |
| `to.meta` | 路由的 `meta` 自定义字段 |

### 5.3 `return '/login'` vs `next('/login')` —— 别混用

| 写法 | 属于 | 能不能用 |
|---|---|---|
| `next()` / `next('/login')` / `next(false)` | Vue Router **3 的老写法** | **4 里还能用**，但要保证「每次守卫恰好调一次」 |
| `return '/login'` / `return false` / 无返回值 | **4 的新写法** | 推荐 |

**四种返回值的含义**（这是新写法要背的表）：

| 返回 | 含义 |
|---|---|
| `undefined` / 什么都不返回 | **放行** |
| `false` | **中断导航**（URL 不变，停在这） |
| `'/login'`（字符串/对象） | **重定向**到该地址 |
| `true` | 放行（和 undefined 一样） |

⚠️ **混用的后果**：

```js
router.beforeEach((to, from, next) => {
  if (!token) next('/login')
  return '/login'           // ← 又 return 一次
})
```

**守卫被调用了两次 → 控制台报 `Uncaught (in promise) Error: Redirected when going from ...`**，或者**死循环**（每次都重定向）。

**规则**：**要么全用 `next`（并且每个分支都调一次、只一次），要么全用 `return`。** 一个守卫里不许两种。

### 5.4 白名单：课程这条写法有个洞

**按 5.2 那条规则，注册页 `/reg` 会被拦**：

```
用户在登录页点「去注册」→ router.push('/reg')
→ 守卫发现「没 token 且 to.path !== '/login'」→ return '/login'
→ 用户点了半天，还是登录页
```

**修法：把免登录页面列成白名单**：

```js
const whiteList = ['/login', '/reg']

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (!userStore.token && !whiteList.includes(to.path)) return '/login'
})
```

**为什么用白名单而不是黑名单（`to.path !== '/login'`）？** 因为**免登录页面会越加越多**（找回密码、404 页、公开的文章详情页…）。黑名单是「默认全拦，例外一个个排除」，**每加一个例外都要改守卫**；白名单是「默认全拦，列出来的放行」，**结构不变，只加数据**。

**这是「配置化」的老套路** —— 和篇 1 的 `api/` 层、`router/index.js` 是同一个思路：**把会变的收进数据里，让代码不变**。

### 5.5 守卫里为什么又要 `useUserStore()`

**因为守卫是一个「在 router 加载时就注册」的回调**。如果你在 `router/index.js` 顶层写 `const userStore = useUserStore()`，会遇到**和篇 1 的 `request.js` 一模一样的 `no active Pinia` 问题**。

**同一条纪律**：**`useXxxStore()` 写在用到它的函数体内。** 守卫是函数，所以写在守卫里。

⚠️ **小性能提醒**：守卫每次导航都跑，`useUserStore()` 每次调用都会做一次「取缓存」的动作（pinia 内部有缓存，开销很小）。**不值得优化**，别为此改成模块级变量 —— **那是在用 bug 换微秒**。

---

## 6. 用户信息渲染与退出（173）

### 6.1 进首页后要拉一次用户信息

```js
onMounted(async () => {
  const res = await getUserInfoAPI()
  userStore.setUser(userStore.token, res)      // ← 只更新 userInfo，token 不动
})
```

**为什么 token 存了还要拉用户信息？**

**因为 token 只是一张「通行证」，里面没有昵称和头像。** 后端签发 token 时一般只放 `id`，其他信息要再查一次。

**这也解释了「为什么不把 userInfo 也持久化」**（篇 1 的 8.3）：**它本来就要重新请求** —— 而且账号信息可能在别处被改（比如换了头像），持久化反而会让你看到旧值。

### 6.2 退出的三件事，少一件就出问题

```js
const logout = () => {
  userStore.removeUser()          // ① 清内存（token + userInfo）
  // ② persist 插件会自动清 localStorage（因为 state 变了）
  router.push('/login')           // ③ 跳回登录页
}
```

**如果你漏了 ①**：`router.push('/login')` 后守卫会发现「还有 token」→ 用户手动访问 `/` 又能进去。**看起来「退出没生效」。**

**如果你漏了 ③**：页面还停在首页，但 `userInfo` 已经空了 → **头像变成空白、昵称没了**，用户以为界面坏了。

**顺序不能反**：先清再跳。反过来的话，跳转过程中守卫会读到旧 token —— 虽然结果一样（能跳过去），但**如果守卫里有「已登录就跳首页」的逻辑，就会死循环**。

### 6.3 退出要不要二次确认

**要。** 用一个 `ElMessageBox.confirm`：

```js
await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
```

**`ElMessageBox.confirm` 的返回值是 Promise**：

| 用户操作 | 结果 |
|---|---|
| 点「确定」 | `resolve('confirm')` |
| 点「取消」/ 关闭 | **`reject('cancel')`** |

⚠️ **注意也是 reject**。所以代码必须包 `try/catch`，**而且 catch 里要什么都不做**（用户取消不是错误）：

```js
try {
  await ElMessageBox.confirm(...)
  userStore.removeUser()
  router.push('/login')
} catch {
  // 用户取消，什么都不做
}
```

**如果你不写 catch** → 控制台每次点取消都冒一条红色 `Uncaught (in promise) cancel`。**不写不影响功能，但很脏。**

**「用 reject 表示取消」这个设计在 Element Plus 里到处都是** —— 后面删除分类（第 178 集）也是同一个模式。

---

## 7. `PageContainer`：第一次自己设计组件 API（174）

### 7.1 先看重复在哪

打开三个页面，它们的结构长这样：

```html
<!-- 文章分类 -->
<div class="page">
  <h3>文章分类</h3> <el-button>添加分类</el-button>
  <el-table>...</el-table>
</div>

<!-- 文章管理 -->
<div class="page">
  <h3>文章管理</h3> <el-button>发布文章</el-button>
  <el-table>...</el-table>
</div>
```

**重复的是「壳」，不重复的是「内容」** —— 这正是组件封装的判据。

### 7.2 组件的 API 设计：一个 prop + 两个插槽

```html
<!-- components/PageContainer.vue -->
<template>
  <div class="page-container">
    <div class="header">
      <h3>{{ title }}</h3>
      <div class="extra">
        <slot name="extra"></slot>       <!-- 具名插槽：右上角的按钮 -->
      </div>
    </div>
    <div class="content">
      <slot></slot>                    <!-- 默认插槽：主体内容 -->
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String })
</script>
```

**用起来**：

```html
<PageContainer title="文章分类">
  <template #extra>
    <el-button type="primary">添加分类</el-button>
  </template>

  <el-table :data="list">...</el-table>
</PageContainer>
```

### 7.3 为什么「标题用 prop，按钮用插槽」

**这是组件设计里最重要的一条判断**：

| 位置 | 内容特征 | 该用什么 |
|---|---|---|
| 标题 | **只是一个字符串**，内容固定 | `prop` |
| 右上角 | **可能是按钮、可能是下拉、可能好几个** | **插槽** |

**规则**：**「数据」用 prop，「一段模板」用插槽。**

**如果标题也用插槽**会怎样？调用方每次都要写 `<template #title>文章分类</template>` —— **多写 6 个字符换取零收益**。

**如果按钮也用 prop** 会怎样？你得设计 `btnText`、`btnType`、`btnIcon`、`onBtnClick`... **每加一种按钮就改一次组件**，最后组件变成一只缝合怪。

**这就是「插槽是逃生口」的含义**：prop 用来表达「确定的、可枚举的」内容，插槽用来表达「调用方自己决定」的内容。

### 7.4 一个隐藏细节：默认插槽 + 具名插槽混用

```html
<PageContainer title="文章分类">
  <el-table />              <!-- ← 没有 template 包裹，自动进默认插槽 -->
  <template #extra>...</template>
</PageContainer>
```

**没被 `<template #xxx>` 包住的内容，全部进默认插槽。** 所以顺序可以随便写，Vue 会自己归位。

⚠️ **但要小心**：如果你写了两个「非 template 包裹」的兄弟元素，它们**都进默认插槽**，容器里就会出现两个根节点 —— 布局可能错位。**内容多的时候，老老实实包一层 `<template #default>`。**

---

## 8. 文章分类：表格渲染（175）

### 8.1 `el-table` 的两个绑定

```html
<el-table :data="list">
  <el-table-column prop="cate_name" label="分类名称" />
  <el-table-column prop="cate_alias" label="分类别名" />
  <el-table-column label="操作" width="120">
    <template #default="{ row }">
      <el-button @click="edit(row)">编辑</el-button>
      <el-button @click="del(row.id)">删除</el-button>
    </template>
  </el-table-column>
</el-table>
```

| 属性 | 在哪 | 作用 |
|---|---|---|
| `:data` | `el-table` | 数据数组 |
| `prop` | `el-table-column` | **从每行对象里取哪个字段** |
| `label` | `el-table-column` | 表头文字 |
| `#default="{ row }"` | `el-table-column` 内部 | **拿到当前行的对象** |

### 8.2 `#default="{ row }"` 是什么

**这是「作用域插槽」的解构写法**。`el-table-column` 会往插槽里传一个对象（`{ row, column, $index }`），你用解构只取 `row`。

**展开写是**：

```html
<template #default="scope">
  {{ scope.row.cate_name }}
</template>
```

**`{ row }` 就是 `scope.row` 的解构** —— 和你写 `const { row } = scope` 一样。

⚠️ **`row` 是「当前行的原始对象」**。改 `row.cate_name = 'x'` 会**直接改到 `list` 里的数据**（因为引用相同）。这有时候是特性（就地编辑），有时候是灾难（还没保存 UI 就变了）。

### 8.3 为什么 `el-table` 不需要 `v-for`

**这是 Element Plus 和你以前手写表格的最大差别**：

```html
<!-- 原生：你要自己 v-for -->
<tr v-for="item in list" :key="item.id">
  <td>{{ item.cate_name }}</td>
</tr>

<!-- el-table：你只声明「列」，它自己循环「行」 -->
<el-table :data="list">
  <el-table-column prop="cate_name" label="分类名称" />
</el-table>
```

**`el-table` 内部已经 `v-for` 过 `:data` 了**，你声明的是「列的定义」。**所以 `el-table-column` 里不会有 `item`，只有 `row`。**

**理解这一点，就不会再问「为什么这里不能 v-for」。**

---

## 9. 弹层封装（176）—— 组件的第二种 API

### 9.1 先在页面里写一个「能用」的弹层

```html
<el-dialog v-model="dialogVisible" title="添加分类" width="500px">
  <el-form>...</el-form>
</el-dialog>
```

**`v-model` 绑 `dialogVisible`**：点右上角 × 或点遮罩时，`el-dialog` 会**自己把它改成 `false`**。这就是「组件能改父组件数据」的合法途径 —— `v-model` 本质是 `:modelValue` + `@update:modelValue`。

### 9.2 封装成组件，两种 API 风格

**风格 A：`v-model` 控制显隐（推荐）**

```html
<!-- components/DialogEdit.vue -->
<script setup>
const visible = defineModel()        // ← Vue3--05 学的 defineModel
</script>

<template>
  <el-dialog v-model="visible" title="添加分类">
    <slot></slot>
  </el-dialog>
</template>
```

```html
<!-- 用 -->
<DialogEdit v-model="showDialog"> 表单内容 </DialogEdit>
```

**风格 B：父组件用 ref 调子组件方法**

```html
<!-- 子组件 -->
<script setup>
const visible = ref(false)
const open = () => { visible.value = true }
defineExpose({ open })               // ← 暴露给父组件
</script>
```

```html
<!-- 父组件 -->
<DialogEdit ref="dialogRef" />
<el-button @click="dialogRef.open()">添加</el-button>
```

### 9.3 两种风格的取舍 —— 这是本轮最值得记的一个判断

| | `v-model`（风格 A） | `ref.open()`（风格 B） |
|---|---|---|
| 显隐状态**存在哪** | **父组件** | **子组件** |
| 父组件知不知道开没开 | 知道（自己有变量） | **不知道**（除非子组件再 emit） |
| 「打开时顺便带参数」 | 要额外 prop | `open(row)` 直接传 |
| 代码量 | 少 | 多（多一个 `defineExpose`） |
| 适合 | **开关型**（添弹层、抽屉） | **「命令型」**（要传上下文、要做初始化） |

**课程的取舍**：两个都用。**简单弹层用 `v-model`**，**「编辑某一行」这种要带数据的用 ref + `open(row)`**（第 189 集）。

**判断口诀**：**「父组件需不需要知道它在显示」** —— 需要就用 `v-model`，不需要就用 `ref.open()`。

### 9.4 弹层复用必踩的坑：上次的校验红字还在

**场景**：加了分类 → 关闭弹层 → 再点「添加分类」→ **上次的红字提示还在**。

**原因**：组件没销毁（`v-model` 只是隐藏），`el-form` 的校验状态还留着。

**两种解法**：

```js
// ① 关闭时清校验（推荐，因为数据可能也要清）
const close = () => {
  formRef.value?.clearValidate()
}

// ② 打开时清（更稳，因为「关闭」不一定走你的 close 函数）
watch(visible, (v) => {
  if (v) formRef.value?.clearValidate()
})
```

⚠️ **注意 `formRef.value?.` 的可选链**：弹层刚挂载时 `formRef.value` 还是 `null`，直接 `.clearValidate()` 会 `Cannot read properties of null`。

**为什么打开时要清而不是关闭时清？** 因为「关闭」的路径有很多（点 ×、点遮罩、按 ESC、代码 `visible = false`），**你不可能全拦住**；而「打开」只有一个入口。**在「唯一入口」做事，是更可靠的工程习惯。**

**这条和你之前学的「在组件卸载时清理定时器不如在挂载时重新初始化」是同一个思路。**

---

## 10. 添加分类 & 删除分类（177-178）

### 10.1 添加的六步（和注册一模一样）

```js
const submit = async () => {
  await formRef.value.validate()                    // ① 校验
  await addCategoryAPI({ cate_name, cate_alias })   // ② 请求
  ElMessage.success('添加成功')                      // ③ 提示
  visible.value = false                             // ④ 关弹层
  form.cate_name = ''                               // ⑤ 清表单
  form.cate_alias = ''
  await getList()                                   // ⑥ 刷新列表
}
```

**第 ⑥ 步是重点**：**不要手动往 `list` 里 push 一条**。

**为什么不 push？**

| 做法 | 问题 |
|---|---|
| `list.push({ ...form, id: Date.now() })` | **`id` 是假的**，后端给的真实 id 你不知道 → 编辑/删除会用错 id |
| 重新请求 | 多一次请求，但**数据一定是对的** |

**「重新拉列表」是后台项目的标准做法**，因为列表可能被别的操作影响（排序、分页、别人的改动）。**唯一例外是「删除」时可以先本地删，让界面立刻响应，再后台刷新** —— 但课程没这么做，你也别自找麻烦。

### 10.2 删除：`ElMessageBox.confirm` + reject

```js
const del = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该分类吗？', '提示', { type: 'warning' })
  } catch {
    return                        // ← 用户取消，直接退出
  }
  await delCategoryAPI(id)
  ElMessage.success('删除成功')
  await getList()
}
```

**注意 `catch` 里 `return` 的位置**：如果 Catch 里什么都不做就往下走，**用户点「取消」也会把分类删了** —— 这是个真会发生的 bug。

**写法对比**：

```js
// ❌ 危险
try { await ElMessageBox.confirm(...) } catch {}
await delCategoryAPI(id)          // ← 取消也会执行

// ✅ 正确
try {
  await ElMessageBox.confirm(...)
} catch {
  return                          // ← 取消就退出函数
}
await delCategoryAPI(id)
```

⚠️ **这是本轮最凶的一个坑** —— 因为它「几乎总是对的」（用户大部分时候点确定），**偶尔删错一次你才会发现**。

### 10.3 删除后如果当前页空了

**场景**：第 2 页只剩 1 条，删掉 → 重新拉第 2 页 → **空的**。

**原因**：删完后总数少 1，第 2 页可能不存在了。

**解法**（课程可能没做，但你要知道）：

```js
if (list.value.length === 1 && page.value > 1) {
  page.value--              // 如果这页只剩一条，翻回上一页
}
await getList()
```

**这个坑第 182 集分页才明显**，但根在这里。

---

==二：格式==

## 1. 速查表

### 1.1 Element Plus 组件速查（本轮用到）

| 组件 | 核心绑定 | 关键属性/事件 |
|---|---|---|
| `el-form` | `:model` `:rules` `ref` | 方法 `validate()` `validateField()` `clearValidate()` |
| `el-form-item` | **`prop`** | 决定校验哪一项 |
| `el-input` | `v-model` | `type="password"` `show-password` `placeholder` |
| `el-checkbox` | `v-model`（**boolean**） | — |
| `el-container` | — | 内有 `el-aside` 就横排 |
| `el-table` | `:data` | — |
| `el-table-column` | `prop` `label` | `#default="{ row }"` |
| `el-dialog` | **`v-model`（显示）** | `title` `width` |
| `el-button` | — | `type="primary" / "danger"` |

### 1.2 表单校验三种规则

| 类型 | 写法 | 用在 |
|---|---|---|
| 必填 | `{ required: true, message, trigger }` | 所有必填项 |
| 正则 | `{ pattern: /^...$/, message, trigger }` | 格式（密码、手机号） |
| 自定义 | `{ validator: (rule, value, callback) => {}, trigger }` | **跨字段**（确认密码） |

### 1.3 守卫四种返回值

| 返回 | 含义 |
|---|---|
| 不返回 / `undefined` / `true` | 放行 |
| `false` | 中断 |
| `'/path'` / `{ path }` | 重定向 |

### 1.4 Promise 型 API 的「reject 表示不通过」

| API | resolve | reject |
|---|---|---|
| `formRef.validate()` | `true` | 校验错误对象 |
| `ElMessageBox.confirm()` | `'confirm'` | `'cancel'`（用户取消） |
| `ElMessageBox.prompt()` | `{ value }` | `'cancel'` |

**这张表要背** —— **它的价值在于：凡是 reject 的地方，你都必须 `catch`，而且必须判断「这个 reject 是不是真正的错误」。**

---

==三：代码==

## 1. 最小可验证实验：`validate()` 到底 resolve 什么

**目的**：亲眼确认「不通过是 reject 不是 resolve(false)」。

```js
// 在任意 el-form 页面的控制台（Vue devtools 里选中组件后）
const r = formRef.value.validate()
r.then(v => console.log('resolve:', v))
 .catch(e => console.log('reject:', e))
```

**留空点提交，你会看到**：

```
reject: { username: [ { message: '请输入用户名', field: 'username' } ], ... }
```

**全部填对，你会看到**：

```
resolve: true
```

**这个实验的价值**：以后写 `if (await validate())` 这种代码时，你会立刻想起「这里不会返回 false，它会直接抛」。

## 2. 验证 `prop` 断了会怎样

**故意把一个 `el-form-item` 的 `prop` 改成不存在的名字**，然后：

```js
await formRef.value.validate()      // → resolve(true)！
```

**校验「通过」了。** 因为那一项被表单认为「没有规则」。

**这是本轮最值得亲手做一次的实验** —— 你会对「静默失败」有肌肉记忆。做完记得改回来。

## 3. 验证守卫的两种写法不能混

```js
// 故意混用
router.beforeEach((to, from, next) => {
  if (!userStore.token) next('/login')
  return '/'
})
```

**现象**：控制台 `Uncaught (in promise) Error: Redirected when going from "/login" to "/" via a navigation guard.`，或者无限循环。

**原因**：守卫被调用一次，但触发了两次导航决策。

---

==四：总结==

## 1. 一句话记住三个

1. **`prop` 是 Element Plus 校验的命门** —— 拼错 = 这一项没规则 = 静默不校验。
2. **`validator` 的两条分支都必须调 `callback`** —— 漏了会让 `validate()` 永远 pending（点了没反应）。
3. **所有 Promise 型 API 都用 reject 表示「没通过」**（`validate` / `confirm`），所以 `catch` 里必须判断「是取消还是真错」。

## 2. ⭐⭐ 本轮要背的

| 内容 | 答案 |
|---|---|
| `el-form` 三个必需的绑定 | `:model` / `:rules` / 子项 `prop` |
| `prop` 拼错的后果 | **静默**：这一项不校验，`validate()` 仍然 resolve |
| `trigger: 'blur'` vs `'change'` | 失焦检查 vs 值变即检查 |
| 正则必须锚定 | `^\S{6,15}$`，不锚定会「包含即通过」 |
| `validator` 通过怎么写 | `callback()`（不传参） |
| `validator` 不通过怎么写 | `callback(new Error('原因'))`（**必须 Error 对象**） |
| `callback` 漏调 | `validate()` **永远 pending**，界面无反应 |
| `validate()` 失败 | **reject**，要 `try/catch` |
| 只校验单个字段 | `formRef.value.validateField('repassword')` |
| 清校验状态 | `formRef.value.clearValidate()`（**打开弹层时清**） |
| 跨字段校验什么时候失效 | 改了 A，B 不会自动重校验 → 手动 `validateField` |
| 守卫四种返回 | 无 / `false` / 路径 / `true` |
| `next` 和 `return` 能混用吗 | **不能**，会重复导航或死循环 |
| 白名单为什么比黑名单好 | 例外会越来越多；白名单只加数据不改代码 |
| `el-table` 为什么不用 `v-for` | 内部已循环 `:data`，你只声明「列」 |
| `#default="{ row }"` 是 | 作用域插槽解构 |
| `el-dialog` 的 `v-model` 绑什么 | **显示状态（boolean）** |
| 弹层组件两种 API | `v-model`（父存状态）/ `ref.open()`（子存状态） |
| 弹层复用为什么要 `clearValidate` | 组件没销毁，校验状态还在 |
| 添加成功后为什么重新拉列表 | 假 `id` 会导致后续编辑/删除用错 |
| `ElMessageBox.confirm` 取消时 | **reject('cancel')**，`catch` 里要 `return` |
| 退出登录三件事 | 清 store → 跳登录（顺序不能反） |

## 3. ⭐ 收敛时刻

**① 这一轮的 11 集，是一条「校验 → 请求 → 导航」的流水线，而每个环节都有一个「用失败表示不通过」的设计。**

看这三处：

```js
await formRef.value.validate()      // 不通过 → reject
await loginAPI(form)                // 失败 → reject（拦截器里 Promise.reject）
await ElMessageBox.confirm()        // 取消 → reject
```

**三处全是 reject。** 这不是巧合 —— **Promise 的设计者认为「拿不到预期结果」就该走失败路径**。

**而你在篇 1 学过「拦截器不能 return undefined，要 reject」** —— 现在你会看到这条原则在三个地方同时生效。**「宁可炸，不要静默」不是一句话，是一套贯穿全栈的做法。**

**② `prop` 那个坑，和 `inject('them')` 拼错是同一个病。**

| 位置 | 拼错的后果 |
|---|---|
| `inject('them')`（Vue3--05） | 返回 `undefined`，不报错 |
| `provide` 传 `.value`（Vue3--05） | 后代永远拿初始值，不报错 |
| `el-form-item prop="user"` | 这一项不校验，不报错 |
| `persist: { paths }`（篇 1，v4 改名） | 持久化失效，不报错 |
| `useUserStore()` 写在顶层（篇 1） | 有时炸有时好，错误信息跟原因无关 |

**五个坑，同一个规律**：**它们是「按名字/按 key 查表」的 API。查不到就是「没有」，而不是「错了」。**

**这就是弱类型语言 + 字符串 key 的固有代价。** 你已经见过五遍了，应该有感觉了：**凡是「用字符串当 key」的地方，都要用「立刻能验证」的方法核对一遍**（TS 类型、打印一次、故意空着提交一次）。

**③ `PageContainer` 那一集，是「你已经会的东西」第一次被用来「设计别人要用的东西」。**

它用了什么新语法吗？**没有**。`defineProps`（Vue3--04）、具名插槽（Vue--05）、`defineModel`（Vue3--05）—— 全是旧知识。

**但它的难度不在语法，在「决定什么该是 prop、什么该是插槽」** —— 这是**设计**，不是编码。

**这个转折点很重要**：从这一集开始，你写的代码**不再只给自己用**。判断标准从「能不能跑」变成「**用起来顺不顺手**」。

**给你一条可操作的判据**（本篇 7.3 / 9.3 提炼）：

| 问题 | 选 |
|---|---|
| 内容是「一个值」还是「一段模板」？ | 值 → prop；模板 → 插槽 |
| 父组件需不需要知道子组件的状态？ | 需要 → `v-model`；不需要 → `ref.open()` |
| 这个东西会不会只用一次？ | **会 → 别封装** |

**第三条最容易被忽略**。`views/article/components/` 存在的意义就是「只给这个页面用的组件放这」—— 放进去就说明「它还没到被复用的程度」。

**④ 一个回头看能连上的线：layout 的 `router-view`，就是篇 1 说的「第二层」。**

篇 1 第 6.3 节我说「两层 router-view 是嵌套路由的本质，换子页面时 layout 不重新渲染」。**这一轮你在代码里看到它了** —— `<el-main><router-view /></el-main>`。

**为什么这句话重要？** 因为**「不重新渲染」= 「`onMounted` 不会重新执行」**。这意味着：

- 你在 layout 的 `onMounted` 里拉的 `userInfo`，**切换菜单时不会重新拉**（这是好事，省请求）；
- 但如果你想「每次切页面都刷新数据」，**必须在子页面的 `onMounted` 里做，不能在 layout 里做**。

**这个区别，是「组件生命周期」和「路由生命周期」的第一次分家。** 到第 182 集（分页）你会用到它。

## 4. 静默失败清单

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `el-form-item prop` 拼错 / 漏写 | **这一项不校验**，`validate()` 仍 resolve | 查表查不到 = 不需要校验 |
| 2 | `validator` 通过分支忘调 `callback()` | `validate()` **永远 pending**，按钮点了没反应 | 校验器没给结论 |
| 3 | `callback('错了')` 传字符串 | 不通过**但没提示文字** | 底层读 `error.message` |
| 4 | `rules` 用 `computed` 但在 JS 里忘 `.value` | 校验规则是 `undefined` → 全不校验 | 模板自动解包，JS 不会 |
| 5 | 正则不锚定 `/^\S{6,15}$/` 写成 `/\S{6,15}/` | 中间带空格也通过 | 「包含」≠「完整匹配」 |
| 6 | 改了密码，确认密码红字没消失/没出现 | 跨字段校验不联动 | 需要手动 `validateField` |
| 7 | 弹层复用，上次红字还在 | 组件没销毁，状态残留 | `clearValidate()` |
| 8 | `formRef.value.clearValidate()` 无 `?.` | 首次挂载 `Cannot read properties of null` | ref 还没赋值 |
| 9 | 守卫里 `next()` + `return` 混用 | `Redirected when going from...` 或死循环 | 一次导航只能一个决策 |
| 10 | 守卫黑名单漏了 `/reg` | **注册页进不去**，一直弹回登录 | 应该用白名单 |
| 11 | 登录后写 `res.data.token` | token 是 `undefined`，刷新掉登录 | 拦截器已拆包 |
| 12 | 退出只 `push('/login')` 不清 store | **手动访问 `/` 还能进去** | 退出没真的生效 |
| 13 | `ElMessageBox.confirm` 的 catch 里没 `return` | **点「取消」也把数据删了** | 取消后代码继续往下走 |
| 14 | 添加成功后 `list.push({ id: Date.now() })` | 后续编辑/删除用错 id | 假 id 与后端不一致 |
| 15 | api 函数写成 `(d) => { request.post(...) }` | `await` 拿到 `undefined` | 花括号丢了隐式 return |
| 16 | 删除末页最后一条不翻页 | **看到空白列表**（其实数据没丢） | 当前页超出总页数 |

**重灾区是 1、2、13。** 三个的共同点：**「差不多能用」，只有边界情况才露馅**。

**工程上怎么防**：

- **第 1 条**：TS 项目给 `rules` 标类型；JS 项目就靠「故意留空提交一次」这个动作；
- **第 2 条**：写 `validator` 时**先写 `callback()`，再写 if** —— 保证「通过」这条路径一定存在；
- **第 13 条**：把「确认框」封成一个小函数，**它 reject 时直接 return**，只在一处写这个逻辑：

```js
// utils/confirm.js
export const confirmBox = async (msg) => {
  try { await ElMessageBox.confirm(msg, '提示', { type: 'warning' }); return true }
  catch { return false }
}
```

```js
// 调用处
if (!(await confirmBox('确定删除吗？'))) return      // ← 一眼看出「不删就退出」
```

**这 5 行代码能消灭一整类 bug。** 这就是「把易错模式收口」的实际操作 —— 和篇 1 的 `request.js` 是同一个思路。

## 5. C# 类比可用度

| C# / .NET 侧 | 前端侧 | 可用度 | 注意 |
|---|---|:--:|---|
| ASP.NET Core 的 `[Required]` / `ModelState.IsValid` | `rules` + `validate()` | ⭐⭐⭐ | 「声明式规则 + 集中校验」完全同构 |
| FluentValidation 的 `RuleFor` | `rules` 对象 | ⭐⭐⭐ | 都是「一个字段一个规则数组」 |
| `Custom()` 自定义校验 | `validator` | ⭐⭐⭐ | **连「必须回调」这一点都像**（FluentValidation 要 `context.AddFailure`） |
| `ModelState` 里的 key = 属性名 | `prop` = 字段名 | ⭐⭐⭐ | 拼错的后果也一样：**静默跳过** |
| 中间件 `app.UseAuthentication()` | **路由守卫** | ⭐⭐ | 守卫在**前端**跑，安全的真正边界在**后端**（见下） |
| `[Authorize]` 特性 | `router.beforeEach` | ⭐ | ⚠️ **别混**：`[Authorize]` 是服务端强制，守卫是**用户体验**，前端守卫**永远拦不住有心人** |
| `IValidatableObject` 跨字段校验 | `validator` 读别的字段 | ⭐⭐⭐ | 同一个需求 |
| `MessageBox.Show()` 的 `DialogResult` | `ElMessageBox.confirm` | ⭐⭐ | WPF 是同步返回值，这里是 Promise + reject |
| `try/catch` 里的空 catch | `catch { return }` | ⭐⭐⭐ | 但**前端 catch 的应用频率高得多**（几乎每个 confirm 都要） |
| 父窗体与子窗体的 `ShowDialog()` | `el-dialog` | ⭐⭐ | WPF 是模态阻塞，前端是遮罩 + 不阻塞 JS |

**最值得记的一条对照**：**`[Authorize]` 和路由守卫不是一回事，别把它们当同一个东西学。**

```csharp
[Authorize]                                // 服务端：没 token 直接 401，拿不到任何数据
public IActionResult GetArticles() { ... }
```

```js
router.beforeEach(...)                     // 前端：把用户「引导」到登录页，仅此而已
```

**前端守卫的作用是「别让用户白点」，不是「保护数据」。** 你完全可以把 `token` 改成随便一个字符串骗过守卫 —— 但后端一验就 401。

**这个认知很重要**，因为你后面会写 ASP.NET Core 的后端（DesktopPet）。**当你写后端时，你必须真的做认证**，不能因为「前端有守卫」就省掉。

## 6. 解锁边界

**本轮新解锁**

- **Element Plus 表单体系**：`el-form` 三项绑定、`prop` 查表机制、`trigger`、三种规则、`validate` / `validateField` / `clearValidate`
- **`validate()` 的 Promise 语义**（resolve(true) / reject(error) / pending）
- **`el-checkbox` 的 v-model 是 boolean**（和 `el-input` 的 string 不同）
- **layout 嵌套容器**（`el-container` 自动判方向）+ 第二层 `router-view`
- **Vue Router 4 守卫新写法**：四种返回值、不能和 `next` 混用、白名单模式
- **`el-table` 的声明式列 + 作用域插槽 `{ row }`**
- **`el-dialog` 的 `v-model` 控制显隐**
- **组件封装两种 API**：`v-model`（父存状态）/ `ref.open()`（子存状态）
- **`ElMessageBox.confirm` 用 reject 表示取消** + `catch { return }` 模式
- **「重新拉列表」优于本地 push**（假 id 问题）

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 分页 `el-pagination` + 搜索重置 | 篇 3，第 182-183 集 |
| 上传 `el-upload`（要手动带 token） | 篇 3，第 186 集 |
| 富文本 `@vueup/vue-quill` | 篇 3，第 187 集 |
| Element Plus 中文国际化（`ElConfigProvider` + `zhCn`） | 篇 3，第 180 集 |
| `el-select` / `el-radio` / `el-date-picker` | 篇 3 |
| 编辑时「回填表单」（`Object.assign`） | 篇 3，第 189 集 |
| `el-drawer` 抽屉（和 dialog 几乎一样，只是动画方向） | 篇 3，第 184 集 |
| 自定义指令 `v-loading` | 篇 3，第 183 集 |
| 401 自动登出 + 跳登录（拦截器里） | 篇 1 提过，课程在 172 一并处理 |

⚠️ **术语撞车登记（本篇新增）**

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| **prop** | Vue 组件的 `props`（属性） | `el-form-item` 的 `prop`（字段名） | 一个是「传值」，一个是「指向 model 的键」 |
| **validate** | 表单的 `validate()` | 后端的 `[ValidateAntiForgeryToken]` 那种 | 前端这个只做「格式检查」，不防攻击 |
| **guard** | 路由守卫 | C# 的 `Guard Clause`（提前返回） | 拼写一样，毫无关系 |
| **dialog** | `<dialog>` HTML 原生标签 | `el-dialog` 组件 | Element Plus 的**没有用**原生 `<dialog>` |
| **confirm** | `window.confirm()`（同步返回 boolean） | `ElMessageBox.confirm()`（**异步 + reject**） | 用法完全不同，别混 |
| **row** | `el-table-column` 插槽里的当前行 | 布局里的「行」`el-row` | 前者是数据，后者是栅格 |

## 7. 下一轮预告

**篇 3 = 179-189（11 集）：文章管理 —— 列表 / 分页 / 上传 / 富文本 / 新增 / 编辑。**

这是整个项目的**主体业务**，也是「表单 + 表格 + 弹层」这套模式被推到极限的地方。

关键看点：

- **`el-upload` 是最不讲道理的一个组件**（186 集）：它**不走你的 axios**，所以**拦截器加的 token 它拿不到** —— 你必须手动把 token 塞进它的 `headers`。**这是「封装漏了一个入口」的经典案例。**
- **富文本 `vue-quill` 用的是 `v-model:content` 而不是 `v-model`**（187 集），而且 `content-type` 要选 `html`，否则存进去的是 Delta 格式（一堆 JSON），后端不认。
- **「新增」和「编辑」共用一个抽屉**（189 集）：靠「有没有 id」判断模式。这里会出现一个你必须警惕的写法 —— `Object.assign(form, row)`，**它保留引用，所以旧数据会残留**。
- **分页 + 搜索 + 重置**（182-183 集）三个状态互相牵连：**重置时忘了把页码归 1，就会看到空白列表**。

**进度提醒**：篇 2 的 `PageContainer` 和「弹层封装」做扎实了，篇 3 会非常顺 —— 因为文章管理页就是「PageContainer + 表格 + 分页 + 抽屉」，**四个零件你已经有两个**。如果篇 2 的封装你只是抄了一遍没理解为什么这么设计，篇 3 会明显拧巴。
