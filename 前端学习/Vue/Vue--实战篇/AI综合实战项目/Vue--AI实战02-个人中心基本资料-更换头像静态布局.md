# Vue--AI实战02 · 个人中心-基本资料 · 更换头像-静态布局

> **对应课程**：193-194（黑马 `BV1HV4y1a7n4`，2 集 / 约 31 分钟）
> **读法**：这是「AI综合实战项目」的第 2 篇，回到写代码。193 是**第一个完整表单页**（读 store → 编辑 → 提交 → 回写 store），194 只搭**上传的静态壳子**，交互留到 195。
> **本轮定位**：193 讲透「**表单的三段**」（数据从哪来 / 怎么校验 / 提交后怎么刷新），这是整个个人中心三个 tab 的公共骨架；194 讲透「**为什么关掉 `el-upload` 的自动上传**」。

---

==一：概念==

## 1. 个人中心的整体结构：为什么用 tab 而不是二级路由（193 前置）

课程把 `/user/profile` 做成**一个页面 + 三个 tab**，不是三个路由：

```text
/user/profile
└── UserProfile.vue          ← 左侧用户卡片 + 右侧 el-tabs
    ├── tab「基本资料」 → UserInfo.vue
    ├── tab「更换头像」 → UserAvatar.vue
    └── tab「重置密码」 → UserPassword.vue
```

| 方案 | 好处 | 代价 |
|---|---|---|
| **tab（课程选的）** | 切 tab 是组件切换，**store 里已经拉好的数据直接复用**，不用重新请求 | URL 不反映当前 tab，刷新回到第一个 tab |
| 三个子路由 | URL 可分享、可前进后退 | 每个页面都要自己拉一遍用户信息；三个页面的「左侧用户卡」要重复写或抽 layout |

**这个选择背后的判据是「数据复用成本 vs URL 可分享性」**。个人中心是登录后才有的一次性配置页，URL 分享没有价值 —— 所以 tab 对。

⚠️ **但要知道代价**：tab 模式下「刷新页面回到基本资料」是**默认行为**，课程没处理。想修就加 `?tab=avatar` 同步到 query（不做也行，不是 bug，是取舍）。

**C# 对照**：这就是 **WPF 的 `TabControl` vs 三个独立 `Window`**。tab 共享同一个 DataContext（≈ 共享同一个 store），独立窗口各自持有一份。**同一个取舍。**

---

## 2. 基本资料：表单的三段结构（193）🔥

### 2.1 先把「没有骨架」的写法看清

新手写这个页面通常是：`ref` 一个表单对象、模板绑一堆 `v-model`、点提交直接 `axios.put`、完事。

**跑起来没问题，但有三个洞**：

| 洞 | 后果 |
|---|---|
| 数据是「自己 `ref` 的一份副本」，没跟 store 对齐 | 侧边栏显示旧昵称，页面上是新昵称，两个地方打架 |
| 提交成功只弹一句提示 | **store 还是旧值**，左侧昵称不变 —— 用户以为没保存成功，再点一次 |
| 校验靠 `if (!nickname) return` | 邮箱格式、长度限制全靠手写，写漏了就是脏数据进库 |

**所以「三段」是**：

```text
① 数据来源  ← store（单一真相源），表单是它的「可编辑副本」
② 校验      ← el-form 的 rules，声明式，不写在提交函数里
③ 提交与回写 ← 发请求 → 成功 → 让 store 重新拉一次 → 全部界面自动更新
```

**第 ③ 步的「重新拉一次」是这段的核心**。不是手动改 store 里的 `nickname`，而是 `await userStore.getUser()`。

**为什么？** 因为**「谁是真值」这件事不能有两个答案**。手动改 store 是「我猜后端存成了这样」；重新拉是「后端说它存成了这样」。**前者在「后端做了格式处理」时立刻出错**（比如昵称首尾空格被 trim、邮箱被转小写）。

**C# 对照**：这就是 **EF Core 的 `SaveChanges()` 之后要不要 `Reload()`**。你可以手动把实体的属性改掉假装同步，也可以让数据库告诉你真实结果。**前者叫乐观假设，后者叫一致性。**

### 2.2 表单是「副本」，不是「引用」

```js
// ❌ 直接引用：表单就是 store 里那个对象，边打字边污染 store
const form = userStore.user

// ✅ 浅拷贝：表单是独立的一份，取消编辑时 store 不受影响
const form = ref({ ...userStore.user })
```

**差别在「用户点了输入框但最后没保存」这一刻**：

| 写法 | 打了一半字然后关掉页面 | 侧边栏昵称 |
|---|---|---|
| `= userStore.user` | store 已经被改了（**没发请求，但界面变了**） | **已经变了** → 刷新后又变回去，像见了鬼 |
| `= ref({ ...userStore.user })` | store 没动 | 不变，符合预期 |

⚠️ **`{ ... }` 是浅拷贝** —— 这条 Vue3--05 已经讲过（`provide('s', {...state})` 丢响应式）。这里反过来用：**正因为是浅拷贝，才能隔离**。但如果 `userStore.user` 里有嵌套对象，嵌套那层仍然是共享的：

```js
const form = ref({ ...userStore.user })   // 第一层隔离 ✅
form.value.profile.bio = 'xxx'            // 嵌套层 → 改到了 store ❌
```

**这一轮的用户对象是扁平的**（`id / username / nickname / email / user_pic`），所以浅拷贝够用。**知道它在什么情况下不够用，比知道它能用更重要。**

### 2.3 `rules`：把校验从「函数里」搬到「声明里」

```js
const rules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 1, max: 10, message: '昵称 1-10 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
  ],
}
```

**三个字段的含义必须分清**：

| 字段 | 是什么 | 不写会怎样 |
|---|---|---|
| `required` | 是否必填 | 空字符串能提交 |
| `trigger` | **什么时候触发校验**：`'blur'`（失焦）或 `'change'`（每次输入） | 不写默认 `'change'` → **每敲一个字符就报一次错**，体验极差 |
| `type` | 内置校验类型，`'email'` 直接给你邮箱正则 | 得自己写 `pattern` |

**`trigger` 是这里最值得记的一条**：`required` 用 `blur`（离开输入框才提示，不然一进来就红一片），`type: 'email'` 用 `['blur', 'change']`（改的时候也要清掉旧错误）。

### 2.4 提交：`validate()` 是 Promise

```js
const formRef = ref()

const onSubmit = async () => {
  await formRef.value.validate()        // ← 失败会 reject，直接中断
  await updateUserInfoService(form.value)
  await userStore.getUser()             // ← 让 store 重新拉
  ElMessage.success('修改成功')
}
```

**`validate()` 到底返回什么**（这是本轮唯一的新语法点，按五段拆）：

| 问题 | 答案 |
|---|---|
| **是什么** | `el-form` 实例上的方法，校验所有字段 |
| **返回什么** | 成功：`Promise<true>`；**失败：`reject` 一个 `fields` 对象**（不是 `false`） |
| **为什么这么写** | 失败走 reject，所以 `await` 之后一行不用 `if` 判断，**代码不会被校验失败污染** |
| **C# 对照** | 像 `validate()` 抛出 `ValidationException` 而不是返回 `bool` —— **异常即短路**，成功路径保持一条直线 |
| **常见错法** | ① 不 `await`，请求照发 ② 用 `if (await validate())` —— 失败分支永远进不去（因为直接 reject 了）③ 不 `catch`，控制台一片 unhandled rejection |

**第 ② 个错法特别值得停一下**：

```js
// ❌ 看起来最"稳"，其实 validate 失败时这行代码根本到不了
if (await formRef.value.validate()) { submit() }

// ✅ 失败自动短路，不需要 if
await formRef.value.validate()
submit()
```

**为什么？** 因为 `validate()` 失败时**返回的不是 `false`，是抛出的异常**。`await` 遇到 reject 会**立刻中断当前函数**，`if` 的条件都没算完。**你写的是「如果校验通过」，实际执行的是「校验失败就整个函数退出」—— 结果对，但你心里那张图是错的**，将来加 `else` 分支就会写出死代码。

**想自己处理失败信息**（比如把第一个错误弹出来）：

```js
try {
  await formRef.value.validate()
} catch (err) {
  ElMessage.error(Object.values(err)[0][0].message)   // err 的形状：{ 字段名: [ {message}, ... ] }
  return
}
```

**`err` 的形状要记住**：`{ nickname: [{ message: '...', field: 'nickname' }], email: [...] }` —— **按字段分组的数组**，不是一个字符串。

---

## 3. 更换头像：为什么关掉 `el-upload` 的自动上传（194）

### 3.1 先看「默认行为」的世界

`el-upload` 默认是一条**完整的上传流水线**：

```text
选文件 → 校验(before-upload) → 自动发 multipart/form-data 请求到 action → 显示文件列表 → 回调 on-success
```

**它的设计前提是：后端有一个「接收文件」的接口**（`IFormFile` 那种）。

**而黑马这个项目的后端接口是**：

```json
// PUT /my/update/avatar
{ "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..." }
```

**是 JSON，不是文件流**。所以：

| 冲突点 | 默认 `el-upload` | 本项目要的 |
|---|---|---|
| 请求体格式 | `multipart/form-data` | `application/json` |
| 字段值 | 二进制流 | **base64 字符串** |
| 谁来做编码 | 浏览器自动（multipart） | **你自己得转**（`FileReader`） |
| 接口地址 | `action` 属性 | 走统一的 `request` 封装（带 token 拦截器） |

**四条全冲突**。所以 194 的第一件事就是把这个默认流水线**拆掉一半**：

```html
<el-upload
  :show-file-list="false"
  :auto-upload="false"
  accept="image/png,image/jpeg"
>
```

**只留「选文件」和「校验」，把「发请求」这一环留给自己。**

### 3.2 每个属性的作用与不写的后果

| 属性 | 作用 | 不写会怎样 |
|---|---|---|
| `:auto-upload="false"` | 选完文件**不发请求**，只拿到 `File` 对象 | 选完立刻往 `action` 发 multipart 请求 → `action` 没配就发到当前页 URL → 404 / 405 |
| `:show-file-list="false"` | 不渲染那行「文件名 + 删除」的列表 | 界面上多出一行灰字，和你的布局打架 |
| `accept="image/png,image/jpeg"` | **只是文件选择框的过滤器** | 用户仍可拖拽/手动改后缀绕过 → **必须再在 `before-upload` 里校验** |
| `action` | 上传地址 | `:auto-upload="false"` 时可以不写；一旦写了又没关自动上传，就会真发请求 |

⚠️ **`accept` 不是安全措施**，只是「帮用户少点两次」。校验必须在 JS 里做：

```js
const beforeUpload = (file) => {
  const isImage = file.type === 'image/png' || file.type === 'image/jpeg'
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) { ElMessage.error('只能上传 JPG/PNG'); return false }
  if (!isLt2M) { ElMessage.error('图片要小于 2MB'); return false }
  return true
}
```

**`return false` 的作用是「阻止后续流程」** —— 在 `:auto-upload="false"` 下它其实**拦不住 `on-change`**（因为没走上传流程），所以这段校验要在 `on-change` 里也做一遍。**这是课程没强调、但必然踩的一条**，写到 195 会显形。

**C# 对照**：`accept` ≈ **前端的 `accept` 属性 ≈ 后端的 `[Required]` 注释掉了只剩 Swagger 文档**。**客户端校验永远是体验，服务端校验才是约束**。这个项目现在是 base64 直传，后端也做了长度/大小限制，**两边都要有**。

### 3.3 静态布局：先把「长什么样」定死

194 集只做一件事：**页面长对，按钮点了没反应（这是预期，不是 bug）**。

结构和「账号信息展示」用的 img 是同一张脸：

```text
┌─────────────────────────────────────┐
│   [当前头像 大图]                    │  ← img :src="avatarUrl"
│                                     │
│   [ 选择文件 ]  ← el-upload 的触发区 │
│   [ 上传头像 ]  ← 独立的 el-button    │
│   只能上传 jpg/png 文件，且不超过 2MB │
└─────────────────────────────────────┘
```

**为什么「选择文件」和「上传头像」是两个按钮，而不是选完就传？**

因为中间夹着**预览**这一步（195 集）：用户得先看见「我选的是这张」，确认了再提交。**这和 2.1 的「表单是副本」是同一条设计**：**先改副本、看清了、再决定要不要提交**。「选完就传」把确认环节删了，用户选错图 = 头像立刻变了。

**C# 对照**：`OpenFileDialog` 选完文件 ≠ 已经上传。中间那一步「预览 + 确认」是 UI 层的责任，不是服务的责任。

---

==二：格式==

## 1. 速查表：个人中心用到的 API

| 位置 | 用法 | 关键点 |
|---|---|---|
| 取用户信息 | `userStore.getUser()` | 内部是 `GET /my/userinfo`，把结果写回 store |
| 表单绑数据 | `:model="form"` + `v-model="form.nickname"` | `form` 必须**是对象**（`ref({})`），不能是 `reactive` 再整体替换 |
| 表单绑规则 | `:rules="rules"` | `rules` 的 key 必须和 `form` 的字段名**完全一致** |
| 拿表单实例 | `const formRef = ref()` + `ref="formRef"` | `<script setup>` 里名字必须和 `ref="xxx"` 一致 |
| 手动校验 | `await formRef.value.validate()` | 失败 **reject**，不是返回 `false` |
| 重置表单 | `formRef.value.resetFields()` | 只重置有 `prop` 的字段 |
| 上传选文件 | `<el-upload :auto-upload="false" :show-file-list="false">` | 关掉自动上传，自己接管 |
| 文件校验 | `before-upload` 里 `return false` | 返回 `false` = 取消上传 |
| 提交资料 | `updateUserInfoService({ id, nickname, email })` | `PUT /my/userinfo` |

## 2. 三个 tab 的文件清单（195-196 会继续用）

| 文件 | 职责 | 本篇覆盖 |
|---|---|---|
| `UserProfile.vue` | 外壳：左侧卡片 + `el-tabs` | ✅ 193 |
| `UserInfo.vue` | 基本资料表单 | ✅ 193 |
| `UserAvatar.vue` | 头像上传 | 🟡 只搭静态（194） |
| `UserPassword.vue` | 重置密码 | ⏭ 196 |

## 3. 「副本 vs 引用」决策表

| 场景 | 用 `= store.xxx` | 用 `ref({ ...store.xxx })` |
|---|:--:|:--:|
| 只读展示（左侧昵称） | ✅ | 多此一举 |
| 可编辑表单 | ❌ 会边打字边污染 | ✅ |
| 需要「取消编辑」 | ❌ 取消不了 | ✅ |
| 嵌套对象深的表单 | ❌ | 🟡 浅拷贝也不够，要 `structuredClone` |

---

==三：代码==

## 1. `UserInfo.vue` 骨架（193 的完整三段）

```html
<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { updateUserInfoService } from '@/api/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const formRef = ref()

// ① 数据来源：浅拷贝，隔离 store
const form = ref({ ...userStore.user })

// ② 校验：声明式，不写进提交函数
const rules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
  ],
}

// ③ 提交：校验 → 请求 → 回写 store
const onSubmit = async () => {
  await formRef.value.validate()
  await updateUserInfoService(form.value)
  await userStore.getUser()
  ElMessage.success('修改成功')
}
</script>
```

**验证点**：把 ① 改成 `const form = userStore.user`，在输入框里随便打一个字 —— **左侧昵称立刻跟着变**（还没点保存）。这就证明了「命令式改 store」和「一致性」是两个层次。

## 2. `UserAvatar.vue` 静态壳（194）

```html
<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const avatarUrl = computed(() => userStore.user.user_pic || defaultAvatar)
const defaultAvatar = new URL('@/assets/default.png', import.meta.url).href
</script>

<template>
  <el-upload
    :show-file-list="false"
    :auto-upload="false"
    accept="image/png,image/jpeg"
  >
    <img :src="avatarUrl" class="avatar" />
    <el-button type="primary">选择文件</el-button>
  </el-upload>
  <el-button type="primary">上传头像</el-button>
</template>
```

⚠️ **`new URL('...', import.meta.url).href` 这行先别深究** —— Vite 处理静态资源路径的写法，你项目里已经踩过一次「相对路径按组件目录解析」的坑（记忆里的 `../image/` 那个）。**能用 `import x from '@/assets/default.png'` 就用那个，更好读。**

**这一刻的预期行为**：点「选择文件」能弹出文件选择框，选完**什么都没发生**。**这不是 bug**，因为 `:auto-upload="false"` 且没有 `on-change` —— 文件对象被拿到了又扔了。195 集才把它接住。

## 3. 两个「故意留空」的位置

| 位置 | 195 会填什么 |
|---|---|
| `el-upload` 的 `:on-change` | 拿到 `file.raw`（原生 `File` 对象）→ `FileReader` 转 base64 → 存进 `avatar` |
| 「上传头像」按钮的 `@click` | `await updateAvatarService(avatar)` → `userStore.getUser()` |

**先知道「空在哪、为什么空」，比稀里糊涂让页面「看起来完整」有用得多。**

---

==四：总结==

## 1. 一句话记住三个

- **表单是 store 的「可编辑副本」**，不是 store 本身 —— 拷贝的边界就是「用户能不能在没保存时改坏真值」。
- **`validate()` 失败是 reject，不是 `false`** —— 所以成功路径是一条直线，`if (await validate())` 是心里那张图画错了。
- **`el-upload` 默认是 multipart，本项目要的是 base64 JSON** —— 格式不匹配时，正确做法是**拆掉框架的默认流程**，不是硬掰。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 表单数据来源 | `ref({ ...store.xxx })`，**不是** `= store.xxx` |
| `{ ... }` 的边界 | **浅拷贝**，只隔离第一层 |
| `rules` 三个关键字段 | `required` / `trigger` / `type` |
| `trigger` 选什么 | 必填用 `'blur'`，格式类用 `['blur','change']` |
| `validate()` 成功返回 | `Promise<true>` |
| `validate()` 失败 | **reject 一个按字段分组的对象** `{ email: [{message}] }` |
| 提交后怎么同步界面 | **`await userStore.getUser()` 重新拉**，不手动改 |
| `el-form` 三个绑定 | `:model` / `:rules` / `ref`（三者的字段名要一致） |
| `:auto-upload="false"` | 关掉自动发请求，只保留「选文件」 |
| `:show-file-list="false"` | 关掉文件列表 UI |
| `accept` 的性质 | **只是选择框过滤器，不是校验** |
| `before-upload` 返回 `false` | 取消上传（`:auto-upload="false"` 下拦不住 `on-change`） |
| 为什么两个按钮 | 中间要夹「预览确认」，和「表单是副本」同一条设计 |

## 3. ⭐ 收敛时刻

**① Vue3--05 的「传引用才活」，在这里被反向使用**

那一轮的结论是：`provide` 要传 **ref 本身**，传 `.value` 就断了响应式。
这一轮的结论是：表单要传**拷贝**，传引用就污染了 store。

**看起来矛盾，其实是同一个问题的两面**：**你传的是「引用」还是「值」，决定了两边是「同一份数据」还是「两份」**。

| 场景 | 你想要 | 所以传 |
|---|---|---|
| 跨组件共享状态 | 同一份（改一处全变） | 引用（ref / reactive） |
| 表单编辑 | 两份（提交前互不影响） | 值（浅拷贝） |

**「响应式」和「污染」是同一种机制的两种后果** —— 一份数据能同时被两个地方看到，这既是共享，也是串味。**判据不是「要不要响应式」，而是「这两个地方该不该是同一份」。**

**② 你已经踩过的「静默失败」，这一轮又出现两次**

| 本轮现象 | 为什么不报错 |
|---|---|
| `if (await validate())` 的 `else` 永远是死代码 | `validate` 失败是 reject，`await` 直接抛出，`if` 根本没算完 |
| 输入框打字，左侧昵称跟着变 | 因为 `form` 就是 store 那个对象，`.value` 一改就都改 —— **没有任何警告，行为还"很像对的"** |

**第二次这个尤其阴**：它看起来像「双向绑定做得很成功」，你会以为这就是 Vue 的魔法。**实际是你把 store 当成了草稿纸。**

**③ 「先静态，后交互」是黑马这条线贯穿的教法，你已经见过四次**

| 集数 | 先搭静态 | 再做交互 |
|---|---|---|
| 123-126 | 加购弹层结构 | 数量、token 判断 |
| 127-133 | 购物车列表渲染 | 全选、数量、删除 |
| **194** | **头像上传壳** | **195 预览与上传** |
| 195-196 | — | — |

**为什么这个顺序是对的？** 因为**布局问题和逻辑问题是两种不同的调试手段**：布局靠「看」，逻辑靠「断点/打印」。**混在一起做，你没法判断「没反应」是样式挡了点击，还是逻辑没接上。** 194 集「点了没反应」是**预期**，这个「预期」本身就是在缩小排查范围。

**④ C# 对照：`validate()` 的 reject 就是「异常即短路」**

```csharp
// C# 里你也这么写：校验不过就抛，成功路径一条直线
public async Task UpdateAsync(UserDto dto)
{
    Validator.ValidateObject(dto, new ValidationContext(dto), true);   // 失败抛异常
    await _db.SaveChangesAsync();                                      // 只有成功才到这
}
```

**你在 C# 里从来不写 `if (Validator.TryValidate(...))` 然后再回来**，因为抛异常能保证「不该继续的绝不继续」。`el-form` 的 `validate()` 选了同一条路 —— **它拒绝返回 `bool`，就是为了逼你写成直线。**

## 4. 静默失败清单

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `const form = userStore.user` | 打字时侧边栏跟着变 | 同一个对象，没隔离 |
| 2 | `if (await formRef.value.validate())` | 看起来「能用」，其实分支写反 | 失败是 reject，`else` 是死代码 |
| 3 | `formRef.value.validate()` 不加 `await` | 表单没填也照样发请求 | Promise 不 await 等于没写 |
| 4 | `rules` 的 key 拼错（`nickName`） | 该字段**完全不做校验**，无提示 | 按字段名匹配，对不上就跳过 |
| 5 | `rules` 不写 `trigger` | 每敲一个字符报一次错 | 默认 `change` |
| 6 | `el-form` 没写 `:model` | 校验全不生效 | `rules` 依赖 `model` 取值，缺了静默失效 |
| 7 | 提交成功后没 `getUser()` | 提示「修改成功」但左侧还是旧昵称 | store 是旧值，UI 读的是 store |
| 8 | `el-upload` 只写 `:auto-upload="false"`，`action` 留空没管 | 某些版本仍会拼一个上传请求 | `action` 是必填语义，习惯上配 `action="#"` 更稳 |
| 9 | 只靠 `accept` 限制类型 | 拖拽一个 `.gif` 改名成 `.png` 就过了 | `accept` 只是选择框过滤 |
| 10 | `before-upload` 里 `return false` 但在 `auto-upload=false` 下 | 校验没生效，图片还是进了预览 | 没走上传流程就不会调 `before-upload`，校验要放 `on-change` |
| 11 | `resetFields()` 想清空整个表单 | 有的字段没清 | 只重置**有 `prop`** 的字段 |

**第 4、6、9 条是重灾区**，它们共同的特征是：**配置写错了不报错，只是"那个功能默默地不存在"**。工程上怎么防：

- `rules` 的定义**紧贴 `form` 写**，两个对象上下相邻，拼错肉眼可见；
- 表单里每个 `el-form-item` **都写 `prop`**（不写 `prop` 的字段既不校验也不 reset）；
- 上传校验**只写一处函数，`before-upload` 和 `on-change` 都调它**，不复制粘贴。

**这不是 bug，是代价。** 声明式配置（`rules` 对象）换来「不写 if」，代价就是**键名对不上时它不说话**。

## 5. C# 类比可用度

| C# / .NET 侧 | Vue3 / Element Plus 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `Validator.ValidateObject` 抛 `ValidationException` | `validate()` reject | ⭐⭐⭐ | 都是「异常即短路」，成功路径一条直线 |
| `IValidatableObject` / `yield return ValidationResult` | `validator: (rule, value, callback)` | ⭐⭐⭐ | **校验失败走回调，不走 throw** |
| `DataAnnotations` 的 `[Required]` `[EmailAddress]` | `rules` 的 `required` / `type:'email'` | ⭐⭐⭐ | 声明式校验，几乎一一对应 |
| `TryValidateObject` 返回 `bool` | **没有** | ❌ | 想拿 bool 得自己 try/catch |
| 实体的「编辑副本」DTO | `ref({ ...store.user })` | ⭐⭐⭐ | 都是「别直接改被追踪的实体」 |
| EF Core `SaveChanges()` 后 `Reload()` | 提交后 `getUser()` 重拉 | ⭐⭐⭐ | **同理：让权威源说话** |
| `IFormFile`（multipart） | `el-upload` 默认行为 | ⭐⭐⭐ | 默认流水线就是为它设计的 |
| `[FromBody] string base64` | `:auto-upload="false"` + `FileReader` | ⭐⭐ | 格式不匹配时**拆默认流程**，不是硬掰 |
| `OpenFileDialog` | `el-upload` 的选择动作 | ⭐⭐ | 选定 ≠ 已提交 |

**用法建议**：把 `validate()` 读成 **「会抛异常的 `Validator.ValidateObject`」**，一句话解决三个常见错法（不 await、`if`、不 catch）。

## 6. 解锁边界

**本轮新解锁**

- 个人中心的 tab 结构，以及「tab vs 二级路由」的取舍判据
- 表单三段（数据来源 / 校验 / 提交回写）
- `ref({ ...store })` 的隔离作用与浅拷贝的边界
- `el-form` 的 `:model` / `:rules` / `ref` 三件套
- `rules` 的 `required` / `trigger` / `type`，以及 `prop` 的必要性
- `validate()` 的 Promise 语义（失败 reject）、`err` 的形状、`try/catch` 用法
- `resetFields()` 只清有 `prop` 的字段
- `el-upload` 的 `:auto-upload` / `:show-file-list` / `accept` / `before-upload`
- **「客户端校验是体验，服务端校验是约束」**

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| `FileReader` 与 base64 预览 | 195（AI实战03） |
| `updateAvatarService` 的实际调用 | 195 |
| 自定义 `validator` 的完整写法（两次密码一致） | 196 |
| 重置密码后的「退出登录」链路 | 196 |
| `el-tabs` 的 `v-model` 与 `tab-click` 细节 | 课程只用了默认行为，需要时单开 |
| `el-form` 的 `validateField`（单字段校验） | 课程未讲 |
| 大文件分片 / 断点续传 / 直传 OSS | 课程未讲，也**不属于现在该学的** |

⚠️ **术语撞车登记**（本轮新增）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `validate` | HTML 表单的原生 `checkValidity` | Element Plus 的 `validate()` | 有 `await` 的是 Element 的 |
| `prop` | Vue 组件的**属性**（props） | `el-form-item` 上**绑定字段名的 `prop`** | 后者是字符串字段名，不是对象 |
| `action` | Vuex 的 `dispatch` 目标 | `el-upload` 的上传地址 | 看是否在模板属性里 |
| `form` | HTML 的 `<form>` 标签 | 组件里那个 `ref({})` 对象 | 前者有标签，后者是变量 |
| `change` | 原生 `change` 事件 | `trigger: 'change'` 的校验时机 | 语义一致，容易混的是**触发频率** |

## 7. 下一轮预告

**Vue--AI实战03 = 195-196：预览和上传头像 · 重置密码。**

三件事，一件比一件深：

- **195 的 `FileReader`**：这是你第一次在浏览器里读**二进制文件**。它的 API 是**回调式**的（`reader.onload = ...`），不是 `await` —— **和你已经会的 `fetch` Promise 风格完全不同**。我会讲清「为什么它不能 await」，以及怎么用 `new Promise` 把它包成 await 版本（这个包装套路以后到处用）。
- **195 的 base64 体积问题**：一张 2MB 的图转 base64 会变成 ~2.7MB 的字符串，塞进 JSON、再塞进 pinia。**「别把 `user_pic` 放进 localStorage」** 这条会在这里显形（和 Vue--15 的 token 持久化正好对照）。
- **196 的自定义 `validator`**：两次密码一致、新密码不能等于旧密码 —— 两个 `validator` 写法，加一个「校验成功后要不要强制重新登录」的流程判断。

⚠️ **前提提醒（再说一次）**：这两篇用到了 `userStore.getUser()`、`updateUserInfoService`、`updateAvatarService`、`request` 封装 —— 这些是 **159-189 大事件项目**里建的东西，而那个文件夹现在是空的。**如果你没跟着做 159-189，这三篇笔记里的 `import` 会全部落空。** 到时候告诉我，我在这几篇里就地补一节「最小可运行前提」。
