# Vue--AI实战03 · 头像预览与上传 · 重置密码

> **对应课程**：195-196（黑马 `BV1HV4y1a7n4`，2 集 / 约 26 分钟）
> **读法**：这是「AI综合实战项目」的收尾篇。195 把 194 留的两个空位填上（`FileReader` 转 base64 → 提交），196 是全项目**唯一带自定义 `validator` 的表单**。
> **本轮定位**：两个新东西 —— **「回调式的浏览器 API 怎么变成 `await`」**（195）、**「一个字段的校验要依赖另一个字段，怎么办」**（196）。前者是通用技能，后者是表单校验的分水岭。

---

==一：概念==

## 1. 头像上传的完整链路（195）

先把 194 停留的位置标出来：

```text
194 已完成：选文件 → [ 拿到 File 对象 ] → 扔掉
195 要补：  [ File 对象 ] → 转 base64 → 存进 avatar → 点按钮 → 提交 → 重新拉用户信息
```

**为什么不用 `URL.createObjectURL` 直接预览？** 因为这里**不只是预览**，还要把图片**内容**发给后端。两条路：

| 方案 | 得到什么 | 能提交给后端吗 | 内存 |
|---|---|---|---|
| `URL.createObjectURL(file)` | `blob:http://localhost:5173/xxxx` | ❌ 后端拿不到内容 | 占用直到 `revokeObjectURL` |
| `FileReader.readAsDataURL(file)` | `data:image/png;base64,iVBOR...` | ✅ **字符串，直接进 JSON** | 字符串常驻，**是原图的 1.37 倍** |

**`blob:` URL 是「本地指针」，`data:` URL 是「把整个文件塞进字符串」** —— 一个是引用，一个是值。

**C# 对照**：`blob:` ≈ 一个文件路径；`data:` ≈ `Convert.ToBase64String(File.ReadAllBytes(path))`。**前者轻，后者能跨进程传输。**

⚠️ **`data:` URL 的体积代价要算清楚**：base64 用 4 个字符表示 3 个字节 → **体积 = 原始 × 4/3 ≈ 1.34 倍**。课程限制 2MB，那么：
- 原始 2MB 的图 → base64 约 **2.7MB 的字符串**
- 这个字符串要经过：`pinia` 内存 → `JSON.stringify` → 请求体 → 后端 `[FromBody] string` → 数据库

**所以「`user_pic` 千万别进 localStorage」**：localStorage 上限一般 5MB，存一张头像就快满了，而且**每次读写都要序列化 2.7MB 的字符串**，页面会明显卡。这一条和 Vue--15 的 token 持久化正好相反 —— **token 是小字符串（值得持久化），头像是大字段（不能持久化）。**

---

## 2. `FileReader`：一个不会 `await` 的老 API（195 的核心）

### 2.1 它长什么样

```js
const reader = new FileReader()

reader.readAsDataURL(file)        // ← 开始读，立即返回 undefined

reader.onload = () => {
  console.log(reader.result)      // ← 读完了才在这里拿到结果
}
```

**注意两件事**：

1. `readAsDataURL()` **没有返回值**（`undefined`）—— 它只是「启动读取」；
2. 结果在 **`reader.result`** 上，**得等 `onload` 触发**。

### 2.2 三种读法

| 方法 | `result` 的类型 | 用途 |
|---|---|---|
| `readAsDataURL(file)` | `string`（`data:...;base64,...`） | **本项目用这个**：预览 + 提交 |
| `readAsText(file, encoding?)` | `string` | 读 .txt / .json / .csv |
| `readAsArrayBuffer(file)` | `ArrayBuffer` | 读二进制（音视频解析、加密、分片上传） |

### 2.3 为什么它不能 `await`？—— 一个真实的历史原因

**这不是设计者没想到 Promise，是时间顺序问题**：

| 年份 | 事件 |
|---|---|
| 2010 | `FileReader` 进入规范，用的是**事件回调**（那一代 API 全这样：`XMLHttpRequest.onload`、`img.onload`） |
| 2015 | `Promise` 才进 ES6 标准 |
| 2017 | `async/await` 才进 ES2017 |

**API 一旦发布就不能改签名** —— 把 `readAsDataURL` 改成返回 Promise，会让所有现存代码失效。所以它**永远**是回调式。

**C# 对照（这个类比非常准）**：这就是 .NET 的 **EAP（事件异步模式）→ TAP（Task 异步模式）** 的迁移：

| .NET | 浏览器 |
|---|---|
| `WebClient.DownloadStringAsync()` + `DownloadStringCompleted` 事件 | `FileReader.readAsDataURL()` + `onload` 事件 |
| `HttpClient.GetStringAsync()` 返回 `Task<string>` | `fetch()` 返回 `Promise<Response>` |
| 微软**新写了一个 `HttpClient`**，而不是改 `WebClient` | 浏览器**新写了 `fetch`**，而不是改 `XMLHttpRequest` |

**结论**：老 API 不改签名，只能**在旁边新增一个新 API**。所以你想用 `await`，办法只有一个 —— **自己包一层**。

### 2.4 包成 Promise：一个要背下来的套路

```js
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result)
  reader.onerror = (err) => reject(err)
})

// 用的时候
const avatar = await fileToBase64(file.raw)
```

**四行，但每一行都不能少**：

| 行 | 为什么必须 |
|---|---|
| `new Promise((resolve, reject) => {...})` | 把「事件完成」翻译成「Promise 结算」 |
| `readAsDataURL` 在 `onload` **之前**调用 | 顺序反了也不会漏（事件是异步派发），但**读法上应该先启动再挂回调** |
| `onload` 里 `resolve(reader.result)` | 这是唯一的出口，不调 → Promise 永远 pending |
| `onerror` 里 `reject(err)` | **不写这行，读失败时 Promise 永远挂着**，`await` 卡死且不报错 |

**这个套路是通用的**：任何「事件式 → Promise」都可以这么包（`img.onload`、`Audio` 的 `canplay`、WebSocket 的 `open`）。

**C# 对照**：这就是手写 `TaskCompletionSource<T>`：

```csharp
var tcs = new TaskCompletionSource<string>();
reader.LoadCompleted += (s, e) => tcs.SetResult(e.Result);
reader.LoadFailed    += (s, e) => tcs.SetException(e.Error);
await tcs.Task;
```

**`resolve` ≈ `SetResult`，`reject` ≈ `SetException`，`new Promise` ≈ `new TaskCompletionSource`。** 唯一区别是 JS 的 `new Promise` 会**立即执行**传入的函数（C# 的 `TaskCompletionSource` 只是造对象，你得自己启动）—— 这就是常说的「Promise 是急的（eager），Task 是懒的（lazy）」。

### 2.5 提交：base64 进 JSON

```js
const onSubmit = async () => {
  await updateAvatarService(avatar.value)      // PUT /my/update/avatar  { avatar: 'data:image/png;base64,...' }
  await userStore.getUser()                    // ← 和 193 一样，让 store 说话
  ElMessage.success('更换头像成功')
}
```

**和 193 完全同构**：请求 → 成功 → 重新拉。**这是本项目所有「修改类」操作的标准三步**，第三次出现了（193 资料、195 头像、196 密码）。

---

## 3. 重置密码：一个字段依赖另一个字段（196）🔥

### 3.1 三个字段和三条规则

| 字段 | 规则 | 为什么 |
|---|---|---|
| `old_pwd` 原密码 | 必填 + 6-15 位非空字符 | 格式一致，便于前后端同一套规则 |
| `new_pwd` 新密码 | 必填 + 6-15 位非空字符 + **不能等于原密码** | 否则「改了等于没改」 |
| `confirm_pwd` 确认密码 | 必填 + **必须等于 `new_pwd`** | 防手滑 |

**注意第 2、3 条是「跨字段」的**：单字段的 `required` / `pattern` 都不够用，因为**它们要看别的字段的值**。

**这就是 `validator` 存在的理由** —— 它是「你自己写一个判断函数，返回错误信息」。

```js
const validateConfirm = (rule, value, callback) => {
  if (value !== form.value.new_pwd) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()                         // ← 成功也必须调用
  }
}
```

**和 192 那篇的三条坑完全一致**（签名固定 / 成功也要 `callback()` / 用 `callback(new Error())` 不用 `throw`）。**这一篇是它的实战落地。**

### 3.2 跨字段校验的隐藏坑：改了 A，B 不会自动重验

场景：用户先填了确认密码 `123456`（此时 `new_pwd` 还空，报「不一致」），然后去改 `new_pwd` 为 `123456`。

**期望**：「不一致」的红字消失。
**实际**：**红字还在**，因为 `confirm_pwd` 的 `trigger` 是它自己的 `blur`/`change`，`new_pwd` 变了**不会触发 `confirm_pwd` 的校验**。

**解法**（手动触发单字段校验）：

```js
const validateConfirmField = () => {
  formRef.value.validateField('confirm_pwd')     // ← 只校验这一个字段
}
```

在 `new_pwd` 的 `@change` 或 `watch` 里调它。

**这一条课件的代码里没有**，属于「跑起来能过、用起来很别扭」的体验缺陷。**知道它存在，比事后被用户骂好。**

### 3.3 密码改了之后：为什么必须重新登录

课程的做法：`ElMessage.success` → 清 token → `router.push('/login')`。

**三种策略，各有代价**：

| 策略 | 做法 | 好处 | 代价 |
|---|---|---|---|
| **强制重登（课程选的）** | 清 token + 跳登录 | 心智最干净：「改了密码 → 重新证明你是谁」 | 用户多一步 |
| 静默继续 | 不处理 token | 用户无感 | **旧 token 仍然有效到过期**，密码改了等于没改（攻击者手上的 session 还在） |
| 后端吊销 + 前端续期 | 后端给 token 加版本号，改密码时版本 +1，旧 token 立即失效；前端重新登录换新 token | 最安全 | 要后端配合 |

**「静默继续」那一行是真问题**：用户改密码的动机通常是「怀疑泄露了」，而**改完之后旧 token 还能用**，这个动作就等于白做。所以哪怕不强制重登，后端也该吊销。

**C# 对照**：这就是 **ASP.NET Core Identity 的 `SecurityStamp`** —— 改密码时 `SecurityStamp` 变，所有已发的 Cookie / token 校验失败。**原理一模一样，只是课程简化成了「前端自己清掉」。**

---

==二：格式==

## 1. 速查表：本篇用到的 API

| API | 签名 / 用法 | 返回 | 关键点 |
|---|---|---|---|
| `new FileReader()` | — | `FileReader` 实例 | 一次只能读一个文件，读完可复用 |
| `readAsDataURL(file)` | `File` / `Blob` | `undefined` | **结果在 `result` 上，等 `onload`** |
| `readAsText(file)` | 同上 | `undefined` | 文本文件 |
| `readAsArrayBuffer(file)` | 同上 | `undefined` | 二进制 |
| `reader.result` | 属性 | `string \| ArrayBuffer \| null` | TS 里要断言类型 |
| `reader.onload` | 事件 | — | 读**成功** |
| `reader.onerror` | 事件 | — | 读**失败**，必须 `reject` |
| `file.raw` | `el-upload` 的 `on-change` 参数 | **原生 `File` 对象** | `file` 是 `UploadFile`，`file.raw` 才是真文件 |
| `updateAvatarService(str)` | `PUT /my/update/avatar` | `{ message }` | body 是 `{ avatar }` |
| `updatePasswordService(obj)` | `PATCH /my/updatepwd` | `{ message }` | body 是 `{ old_pwd, new_pwd }` |
| `formRef.validateField(name)` | 字段名 | `Promise` | 单字段校验，跨字段依赖时用 |
| `^\S{6,15}$` | 正则 | — | 6-15 位**非空白**字符 |

## 2. 两个新语法的「最小形态」

| 我要… | 写法 | 别写成 |
|---|---|---|
| 把事件式 API 变 `await` | `new Promise((res, rej) => { api(); api.onload = () => res(api.result); api.onerror = rej })` | `await api.readAsync()`（不存在） |
| 跨字段校验 | `validator: (rule, value, callback) => {...}` | 在提交函数里 `if (a !== b)` |

## 3. 密码规则的三种写法对比

| 写法 | 校验能力 | 用在哪 |
|---|---|---|
| `required: true` | 只判空 | 所有必填 |
| `pattern: /^\S{6,15}$/` | 格式 | 长度、字符集 |
| `validator: (rule, value, callback)` | **任意逻辑**（能读其他字段） | 两次一致、不能等于旧值 |

**顺序就是「能力递增」**：能用前两个解决就别写 `validator` —— `validator` 是手写代码，要自己管 `callback`。

---

==三：代码==

## 1. `UserAvatar.vue` 完整版（195）

```html
<script setup>
import { ref } from 'vue'
import { userStore } from '@/stores/user'
import { updateAvatarService } from '@/api/user'
import { ElMessage } from 'element-plus'

const avatar = ref('')
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
})

const onChange = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  const isImage = ['image/png', 'image/jpeg'].includes(file.type)
  if (!isImage) return ElMessage.error('只能上传 JPG/PNG')
  if (file.size / 1024 / 1024 >= 2) return ElMessage.error('图片要小于 2MB')

  avatar.value = await fileToBase64(file)      // ← 预览 + 待提交，同一个值
}
</script>
```

**验证点**：`onChange` 里 `console.log(typeof uploadFile)` —— **是 `object` 不是 `File`**，所以要 `.raw`。这是 `el-upload` 最常见的一个误解。

⚠️ **`reader.onerror = reject` 为什么能直接赋？** 因为 `onerror` 会收到一个 `ProgressEvent`，`reject(event)` 就是「把这个事件当失败原因」。**够用**，但严格点该包一层 `reject(new Error('读取失败'))` —— 前端能看懂 `ProgressEvent`，日志里不好看。

## 2. 重复选同一张图不触发 `on-change` 的坑

`el-upload` 内部有个文件列表。**选了 A → 再选 A**，因为「列表里已有同名同大小的文件」，`on-change` **不再触发**。

```js
const uploadRef = ref()
// 提交成功后清空内部列表
const onSubmit = async () => {
  await updateAvatarService(avatar.value)
  await userStore.getUser()
  uploadRef.value.clearFiles()      // ← 不清，第二次选同一张图没反应
  ElMessage.success('更换头像成功')
}
```

**症状像极了「按钮坏了」**：第一次能换，第二次换回原来那张图 —— **完全没反应，控制台干净。**

## 3. `UserPassword.vue` 的两个 `validator`（196）

```js
const validateNewPwd = (rule, value, callback) => {
  if (value === form.value.old_pwd) {
    callback(new Error('新密码不能和原密码相同'))
  } else {
    callback()
  }
}

const validateConfirmPwd = (rule, value, callback) => {
  if (value !== form.value.new_pwd) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}
```

**两条都是「跨字段」**：第一个读 `old_pwd`，第二个读 `new_pwd`。**这就是为什么必须 `validator` 而不能 `pattern`。**

挂到 `rules` 里：

```js
const rules = {
  old_pwd: [
    { required: true, message: '请输入原密码', trigger: 'blur' },
    { pattern: /^\S{6,15}$/, message: '密码 6-15 位非空字符', trigger: 'blur' },
  ],
  new_pwd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { pattern: /^\S{6,15}$/, message: '密码 6-15 位非空字符', trigger: 'blur' },
    { validator: validateNewPwd, trigger: 'blur' },
  ],
  confirm_pwd: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPwd, trigger: 'blur' },
  ],
}
```

⚠️ **`pattern` 用正则字面量 `/^\S{6,15}$/`，不要写成字符串 `'^\\S{6,15}$'`** —— 字符串里 `\S` 会被当成转义，得写 `\\S`，写漏一个就是「怎么都不通过」。**字面量没这个问题。**

## 4. 提交与「改完必须重登」

```js
const onSubmit = async () => {
  await formRef.value.validate()
  await updatePasswordService({
    old_pwd: form.value.old_pwd,
    new_pwd: form.value.new_pwd,
  })
  ElMessage.success('修改成功，请重新登录')

  userStore.removeToken()             // 清掉本地凭证
  router.push('/login')               // 回登录页，让路由守卫放行
}
```

**注意这里没有 `getUser()`** —— 因为马上就登出了，再拉一次用户信息是浪费。**「标准三步」不是死规矩，要看后续动作。**

**顺序也有讲究**：先清 token 再跳登录页。如果先跳，路由守卫会在跳转过程中读到一个**仍然有效**的 token，判定「已登录」→ 可能把你从登录页又弹回首页。

---

==四：总结==

## 1. 一句话记住三个

- **`FileReader` 是 2010 年的 API，永远不会有 Promise 版本** —— 想 `await` 就自己 `new Promise` 包一层。
- **base64 让图片能进 JSON，代价是体积 ×1.34** —— 能放内存，别进 localStorage。
- **`validator` 是「能读别的字段的 `pattern`」** —— 一旦校验要跨字段，就只能它。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| `FileReader` 结果在哪 | **`reader.result`**，不是返回值 |
| 什么时候有结果 | `onload` 触发之后 |
| `readAsDataURL` 返回 | `undefined`（只是启动读取） |
| 三种读法 | `readAsDataURL`（字符串）/ `readAsText` / `readAsArrayBuffer` |
| 为什么不能 `await` | 2010 年的 API，签名不能改；Promise 是 2015 年才有的 |
| 包 Promise 的出口 | `resolve(reader.result)` + **必须** `reject(reader.onerror)` |
| `onerror` 漏了会怎样 | Promise 永远 pending，`await` 静默卡死 |
| base64 体积 | 原始 × **4/3 ≈ 1.34** |
| `user_pic` 能进 localStorage 吗 | **不能**，5MB 上限一下就满 |
| `el-upload` 的回调参数 | 是 `UploadFile`，**真文件在 `.raw`** |
| 重复选同一张图没反应 | `el-upload` 内部列表没清 → `clearFiles()` |
| 跨字段校验用什么 | `validator`，不是 `pattern` |
| `validator` 成功也要 | **`callback()`**，否则表单卡死 |
| 改了 A 之后 B 的重验 | `formRef.validateField('B')` 手动触发 |
| 密码规则 | `^\S{6,15}$`（正则**字面量**，不是字符串） |
| 改完密码 | 清 token → 跳登录（顺序不能反） |

## 3. ⭐ 收敛时刻

**① 这一轮把「异步」这一条线彻底接上了**

你从 JS 一路学过来，异步见过四种形态：

| 形态 | 例子 | 你怎么等结果 |
|---|---|---|
| **回调** | `setTimeout(fn, 1000)`、`img.onload` | 把代码写进 `fn` 里 |
| **Promise** | `fetch()` | `.then()` / `await` |
| **async/await** | `await fetch()` | 看起来像同步 |
| **事件式异步（EAP）** | **`FileReader`**、`XMLHttpRequest` | **只能回调，但可以自己包成 Promise** |

**第四种是你今天新见到的，也是「历史包袱」的通用形状** —— 凡是「上个时代设计的、又不能改签名的 API」，都是这样。**认出这个形状，你就知道该怎么把它变好用了。**

**而「包一层」这件事，你已经做过一次了**：`provide/inject` 那篇说「Vue 的 provide 很像 DI 但没有容器」—— 那是「认出差异」，这一轮是「认出差异后自己补桥」。**这是同一层次的能力。**

**② 三次「请求 → 重新拉」，是本项目的固定节奏**

| 集数 | 操作 | 成功后 |
|---|---|---|
| 193 | 改资料 | `getUser()` |
| 195 | 换头像 | `getUser()` |
| 196 | 改密码 | **清 token + 跳登录**（不拉） |

**前两个是「同一份数据的刷新」，第三个是「数据主体变了」** —— 密码变了，当前这个 session 的合法性就没了，**刷新数据没意义，得换身份。**

**这条区分很重要**：什么时候「重拉数据」，什么时候「重走流程」，判断标准是 **「这次修改影响的是数据，还是身份」**。

**③ 「静默失败」清单又长了两条，而且是同一族**

| 现象 | 机制 | 和你踩过的哪个坑同族 |
|---|---|---|
| 漏 `reject`，Promise 永远 pending | 没有出口 = 永远等 | `provide` 传 `.value`，数据永远不更新 |
| 重复选同一张图没反应 | 内部状态没清 | `keep-alive` 没 `defineOptions({name})`，缓存静默失效 |

**共同点**：**「状态没有被推进」，而不是「代码执行出错」**。JS 不报错的东西，永远要靠「行为对不对」来判，不能靠「有没有红字」来判。**这条从 JS 基础篇一路贯到现在，一条都没变。**

**④ C# 对照里最值钱的两个**

| 本轮 | C# 对应 | 为什么准 |
|---|---|---|
| `new Promise` 包 `FileReader` | `TaskCompletionSource` + EAP 事件 | **`resolve` = `SetResult`，`reject` = `SetException`** |
| 改密码吊销旧凭证 | `SecurityStamp` 变化 | 都是「凭据失效靠一个可变的版本号」 |

**第一个对照能解决「Promise 到底是怎么来的」这个一直没落地的问题**：Promise 不是魔法，它就是 **「一个你能手动结算的任务对象」**。C# 里你早就用过，只是名字叫 `TaskCompletionSource`。

**⑤ 你已经具备「判断这段代码该不该这么写」的能力了**

这一篇有两个地方，课程给的代码**能跑但不够好**：

| 位置 | 课程/常见写法 | 更好的写法 | 判据 |
|---|---|---|---|
| 跨字段重验 | 不处理（红字要等重新输入才消失） | `validateField('confirm_pwd')` | 「用户改对了但界面还说他错」= bug |
| 校验函数 | `before-upload` 和 `on-change` 各写一份 | 抽一个 `checkImage(file)` 两处调 | 同一规则写两份 = 必然有一份先坏 |

**能看出这两处，说明你已经不是在「抄代码」，是在「评审代码」。** 这是你从「跟着做」到「能自己做」的分界线 —— 比多学三个 API 重要。

## 4. 静默失败清单

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `onerror` 不写 `reject` | 选了一张坏图，**页面永远没反应**，无报错 | Promise 永远 pending |
| 2 | `await reader.readAsDataURL(file)` | 拿到 `undefined`（`await` 一个 `undefined` 直接返回） | 它不是 Promise，返回值也是 `undefined` |
| 3 | `reader.result` 在 `onload` 之前读 | `null` | 还没读完 |
| 4 | `on-change` 的 `file` 直接 `FileReader.readAsDataURL(file)` | 报错「参数不是 Blob」 | 要用 `file.raw` |
| 5 | 上传后不 `clearFiles()` | 第二次选**同一张图**没反应 | 内部列表认为「没变化」 |
| 6 | `validator` 漏 `callback()` | 表单校验 Promise 永远 pending，**提交按钮点了没反应** | 校验没有结论 |
| 7 | `validator` 里 `throw new Error()` | 控制台一片红，表单校验链断掉 | 应 `callback(new Error(...))` |
| 8 | `pattern: '^\S{6,15}$'`（字符串） | 6 位密码也报「格式不正确」 | 字符串里 `\S` 被转义，得写 `\\S`；用字面量 |
| 9 | 改了 `new_pwd`，确认密码的红字不消失 | 用户改对了但界面还说他错 | 跨字段不会自动重验，要 `validateField` |
| 10 | 改完密码只清 token 不跳转 | 停留在页面，下一次请求 401 才被踢 | token 没了但界面还在「已登录」状态 |
| 11 | 先 `router.push('/login')` 再清 token | 被守卫弹回首页 | 跳转过程中 token 还有效 |
| 12 | 把 `user_pic` 存进 localStorage | 第二次打开页面卡死 / `QuotaExceededError` | 一张头像 base64 就 2-3MB |
| 13 | base64 直接拼进 `src` 忘了 `data:` 前缀 | 图片裂开（显示 alt 文字） | 只有 `data:image/png;base64,` 开头才是合法 data URL |

**第 1、6 两条是同一种病**：**Promise 没有结算 → 所有 `await` 它的代码永远停在原地**。工程上怎么防：

- **凡写 `new Promise`，先写 `reject` 那一行再写 `resolve`** —— 顺序反过来，你就不会忘；
- **凡写 `validator`，模板是固定的**：`if (错) callback(new Error(msg)); else callback()`，**先把 `else` 敲出来**；
- 上传类校验**只写一个 `checkImage(file)`**，`before-upload` / `on-change` 都调它。

**这不是 bug，是代价。** 事件式和回调式 API 换来的是「零依赖、老浏览器也能跑」，代价就是**「没有结论」和「没执行」在外部看起来一模一样**。

## 5. C# 类比可用度

| C# / .NET 侧 | Vue3 / 浏览器侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `TaskCompletionSource<T>` + `SetResult` / `SetException` | `new Promise((resolve, reject))` | ⭐⭐⭐ | **`resolve`=`SetResult`，`reject`=`SetException`**，最准的一对 |
| `Task`（懒）vs `Promise`（急） | — | ⭐⭐ | `new Promise` 会**立刻执行**传入函数；`new Task` 不会 |
| `WebClient.DownloadStringAsync` + 事件（EAP） | `FileReader` + `onload` | ⭐⭐⭐ | 同属「被时代淘汰但不能删」的 API 家族 |
| `HttpClient.GetStringAsync()`（TAP） | `fetch()` | ⭐⭐⭐ | 都是「后一代 API」，也是**新写而非改旧** |
| `Convert.ToBase64String(bytes)` | `readAsDataURL` | ⭐⭐⭐ | 后者多带一个 `data:...;base64,` 前缀 |
| `File.ReadAllBytes` 后再 base64 | 先 `FileReader` 再提交 | ⭐⭐ | 都是「两次内存操作」，但 JS 里中间还多一份字符串 |
| `SecurityStamp` 变更吊销旧 Cookie | 清 token + 强制重登 | ⭐⭐ | 课程只做了前端一半，后端那一半在 Identity 里现成 |
| `[Compare(nameof(Password))]` 特性 | `validator` 校验两次一致 | ⭐⭐⭐ | **DataAnnotations 有现成的 `[Compare]`**，Element Plus 没有 |
| `Remote` 验证特性（查库） | 课程未做（改密码要验旧密码） | ⭐ | 这里靠后端返回错误，前端只提示 |

**用法建议**：`FileReader` 那一对记成 **「EAP 时代的 `WebClient`」** —— 你会立刻知道三件事：它不会变成 Promise、它要手动挂事件、**它需要你包一层才能进 `await` 世界**。

## 6. 解锁边界

**本轮新解锁**

- 头像上传的完整链路（选文件 → 校验 → base64 → 预览 → 提交 → 重拉）
- `FileReader` 的三种读法与 `result` 的类型
- 「为什么老 API 不能改成 Promise」的规范原因
- **`new Promise` 包装事件式 API 的四行套路**
- base64 的体积换算（×4/3）与 localStorage 容量风险
- `el-upload` 的 `file.raw`、`clearFiles()`、`show-file-list`、`auto-upload` 组合用法
- 跨字段校验的 `validator`、`callback` 语义、`validateField` 单字段重验
- `pattern` 用正则字面量而不是字符串的坑
- 改密码后「吊销凭证」的三种策略与 `SecurityStamp` 的对应

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 头像裁剪（cropper）、压缩后再传 | 课程未讲 —— **2MB 限制的实际解法**，需要时单开 |
| `createObjectURL` 与 `revokeObjectURL` | 本篇只提了对比，未实操 |
| 分片上传 / 断点续传 / 直传 OSS | 课程未讲，也**不属于现在该学的** |
| `el-form` 的 `scrollToField`、`clearValidate` | 课程未讲 |
| 后端如何校验 base64 大小 | 课程未讲（后端是别人写的） |
| 197「完结撒花」 | 不是知识点，**本系列不单独成篇** |

⚠️ **术语撞车登记**（本轮新增）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `raw` | 原生的、未经加工的 | **`file.raw` 的原生 `File` 对象** | 语境里看到 `el-upload` 就是这个 |
| `result` | 请求的响应体 | **`reader.result` 读到的内容** | 一个在 `.data` 里，一个是属性 |
| `validate` | 整个表单校验 | `validateField` **单字段**校验 | 带 `Field` 的是单个 |
| `change` | 原生 input 的 `change` | `el-upload` 的 `on-change`（**选文件也算**） | `el-upload` 的 `change` 语义更宽 |
| `token` | JWT 凭证 | LLM 计费单位 | 本项目里全是前者 |

## 7. 下一轮预告

**这是「AI综合实战项目」的最后一篇，190-196 到此完结。**

**进度状态**：Vue 课程 001-158 全部完结（Vue2 主线 + Vue3 组合式 + Pinia），**190-196 本篇完结**。剩下的是：

| 缺口 | 状态 | 建议 |
|---|---|---|
| **159-189**（Vue3 大事件项目 31 集，≈6.5h） | 🔴 **资料库 `Vue3大事件项目` 文件夹是空的** | 这是一整条业务线（登录、分类、文章 CRUD、富文本、抽屉封装），**建议补** —— 而且它正好是 190-196 的地基 |
| **197 完结撒花** | ⏭ | 不是知识点 |
| **DesktopPet 项目第 2-11 步** | 🔴 停在首屏切换 | **Vue 全部学完了，该回到项目了** |

**给你一条明确的判断**：

> **Vue 的「课」已经到底了。剩下的学习效率最高的地方是 DesktopPet 项目，不是再看 159-189。**

理由：159-189 是**又一个大同小异的后台管理系统**（你已经有商城项目 106-139 的完整经验），而 DesktopPet 是**你自己的、没有教程的**项目 —— 前者练「熟练度」，后者练「能不能自己做」。**你现在缺的是后者。**

当然，如果你想要「大事件项目」里那些**你还没亲手写过的具体技能**（富文本编辑器 `vue-quill`、抽屉组件二次封装、文件上传 + 表单联动、文章分页 + 搜索重置），那就值得补 —— **要补只补这几集，不用从头做一遍后台管理**（179-189 是文章管理，正好覆盖富文本和抽屉）。

⚠️ **建议新开对话**：下一篇如果开 DesktopPet，是**完全不同的工作模式**（读你自己的项目代码 + 一小步一小步改），和「按集讲课件」是两条线。
