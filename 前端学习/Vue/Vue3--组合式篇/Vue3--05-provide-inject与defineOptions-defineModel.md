# Vue3--05 · provide / inject · defineOptions · defineModel

> **对应课程**：150-152（黑马 `BV1HV4y1a7n4`，3 集 / 约 27 分钟）
> **读法**：这是「Vue3--组合式篇」第 5 篇，也是**宏家族收尾篇**。上一篇第一次跨组件（父子一层），这一篇处理**跨层级**（祖孙任意层）和**宏的最后两个成员**。
> **本轮定位**：三集看着不相关，其实一条线 —— **「数据怎么绕过中间层」**（150）、**「组件的元信息放哪」**（151）、**「双向绑定怎么少写两行」**（152）。

---

==一：概念==

## 1. provide / inject：跳过中间层（150）🔥

### 1.1 先把「没有它的世界」看清

三层组件：爷爷 → 爸爸 → 孙子。爷爷有份配置，孙子要用。

```html
<!-- 爷爷 -->
<Father :theme="theme" />

<!-- 爸爸：我根本不用 theme，但必须接住再往下丢 -->
<Son :theme="theme" />
<script setup>
defineProps(['theme'])      // ← 这行纯属被迫
</script>
```

**这叫 props 钻透（prop drilling）**。两个具体代价：

| 代价 | 说明 |
|---|---|
| 中间层被迫声明自己用不到的 props | 组件复用性变差 —— 拿到别的项目里，这个 `theme` 就是赘肉 |
| **每加一层就要改一层** | 孙子变曾孙、隔了四层，中间三层全得改 |

**第三个代价最要命**：中间层改名或重构时，会误删「自己不用」的 props —— 而删掉的那一刻，最底层的组件静默拿到 `undefined`。

**没有 prop drilling 的世界长什么样？** 让**提供方**直接对**整棵子树宣告**：「我这里有份 theme，谁要谁来拿。」

### 1.2 三段式写法

```js
// ① 祖先组件：提供
import { provide } from 'vue'
provide('theme', 'dark')
```

```js
// ② 任意深度的后代：取用
import { inject } from 'vue'
const theme = inject('theme')
```

```js
// ③ 取不到时的兜底（第二个参数）
const theme = inject('theme', 'light')
```

**就这三行。** 中间层一个字都不用改，甚至不知道自己经过了这条数据。

**C# 对照**：这不是「构造函数传参」，是「**在容器里取服务**」。但注意 1.6 有重要差别，先别急着套 DI。

### 1.3 五条规则

| # | 规则 | 违反后 |
|:--:|---|---|
| 1 | 只能**向上找**（祖先 → 后代） | 子孙 provide 的东西，祖先 inject 不到（拿到 `undefined`） |
| 2 | 不限层级 | — |
| 3 | **不能横传** | 兄弟组件之间没有祖先关系（最近的共同祖先是父组件），只能提到父组件 provide |
| 4 | **只能在 `setup` 同步阶段调用** | 警告 `inject() can only be used inside setup() or functional components` |
| 5 | key 是**字符串或 Symbol**，必须完全一致 | 拼错 → `undefined`，不影响运行 |

**第 4 条和上一篇的生命周期钩子是同一个约束**：`provide` / `inject` 都要靠「当前正在创建哪个组件实例」这个全局状态，异步回调里它已经没了。

**key 的工程建议**：用 `Symbol` 避免撞名（课程没讲，但你项目多处 provide 后会需要）：

```js
// keys.js
export const ThemeKey = Symbol('theme')

// 祖先
provide(ThemeKey, 'dark')
// 后代
inject(ThemeKey)
```

字符串 key 在多人协作时一定会撞（`'config'`、`'user'` 这种名字谁都想用），**Symbol 保证引用相等才匹配，天然唯一**。

### 1.4 响应式怎么保持 —— 这是最容易错的一处

**`provide` 传什么，决定了后代拿到的是「快照」还是「活的」。**

```js
const count = ref(0)

// ❌ 传值：后代拿到 0 这个数字，永远不变
provide('count', count.value)

// ✅ 传 ref 本身：后代拿到 ref，双向同步
provide('count', count)
```

后代两种写法：

```js
const count = inject('count')      // ← 得到 ref
console.log(count.value)           // 模板里 {{ count }} 自动解包
```

**为什么会这样？** 因为 `provide` 存的是**你传进去的那个引用**。传 `count.value` 传的是「0」，一个数字，跟那个 ref 从此没关系。**这和上一篇 props 解构丢响应式是同一个根因：JS 只有值语义，取出来的那一刻关系就断了。**

传 `reactive` 对象同理，要传**对象本身**，不能传 `state.count`：

```js
const state = reactive({ count: 0 })
provide('state', state)            // ✅ 后代 inject('state').count
provide('state', { ...state })     // ❌ 展开是浅拷贝，后代改的不是同一个
```

⚠️ **`{ ...state }` 比传值更阴**：它长得像对象、用起来像对象、改起来也像对象 —— 就是不响应。

### 1.5 谁来改数据：`readonly` + 提供方法

后代拿到 ref 就能改。**技术上能改，工程上不该改** —— 一旦后代随便改，数据来源就又变成黑账了（和 props 只读是同一个理由）。

**规范做法：提供方给「数据 + 改数据的方法」，后代只调方法。**

```js
// 祖先
const count = ref(0)
const add = () => count.value++
provide('counter', { count, add })
```

```js
// 后代
const { count, add } = inject('counter')
add()                              // ✅ 请求修改
count.value++                      // ❌ 能跑，但绕过了提供方
```

**想物理上禁止乱改**，用 `readonly`：

```js
import { readonly } from 'vue'
provide('count', readonly(count))
// 后代：count.value++ → 警告 "Set operation on key "value" failed: target is readonly"
```

⚠️ **`readonly` 只挡得住「直接赋值」，挡不住 `readonly(state).nested.x++` 里的深层修改吗？** 挡得住 —— `readonly` 是深层的。但它挡不住「后代把注入的对象再传给第三方改」，那属于契约问题，只能靠约定。

### 1.6 ⚠️ 它和 ASP.NET Core DI 差在哪 —— 这段是本轮重点

你会本能地把它和 DI 对上，**对上七成，剩下三成是坑**：

| | ASP.NET Core DI | Vue provide / inject |
|---|---|---|
| 有容器吗 | ✅ `IServiceProvider` 是实体，注册表集中管理 | ❌ **没有容器**。数据就挂在组件实例上 |
| 按什么匹配 | **类型**（`typeof(IFoo)`） | **key**（字符串 / Symbol） |
| 作用域 | Singleton / Scoped / Transient，由生命周期决定 | **组件子树的存活期**，祖先销毁 → 数据没了 |
| 从哪取 | **任何有容器的地方**（Controller、Service、中间件） | **只能在组件的 `setup` 里**，且必须在这棵子树中 |
| 默认值 | `GetService<T>()` 返回 null，`GetRequiredService` 抛异常 | `inject(key, 默认值)`，**取不到就是 undefined，不抛** |
| 生命周期管理 | 容器负责 `Dispose` | Vue 自己处理 |

**最关键的一条：Vue 没有容器，所以没有「全局取用」的门。**

```csharp
// ASP.NET Core：只要有 IServiceProvider，哪里都能拿
var svc = _provider.GetRequiredService<IFoo>();
```

```js
// Vue：不在组件树里，就没办法 inject
// 一个普通的 utils.ts 里写 inject('theme') → 警告 + undefined
```

**推论（这三条决定了它能不能替代 Pinia）**：

| 因为 | 所以 |
|---|---|
| 没有容器 | 不能在非组件代码里取数据（api 封装、工具函数都取不到） |
| 只在子树里 | 跨分支（两个不相关的子树）共享不到 |
| 靠组件树存活 | 祖先一销毁，数据全丢，做不了「应用级全局状态」 |

**所以 153 集要学 Pinia** —— 它才是那个真正的「容器」。`provide/inject` 只是「沿着树递东西」。

### 1.7 什么时候不该用它

`provide/inject` 的本质是**隐式依赖**：后代用了什么，从参数列表上看不出来。

| 场景 | 该用什么 |
|---|---|
| 父子一层 | **props**，显式最好 |
| 祖孙 / 多层，但只有这一条链 | `provide/inject` ✅ |
| 组件库内部（Form → FormItem → Input 共享校验状态） | `provide/inject` ✅ 典型 |
| 主题 / 语言 / 当前用户 / 注入配置 | `provide/inject` ✅ 纵向、「只读」为主 |
| **跨分支共享业务状态** | ❌ 用 **Pinia**（153） |
| **要在非组件代码里访问** | ❌ 用 Pinia 或模块级单例 |

**一句话判据**：**「这份数据是顺着树往下流的，还是全局共享的？」** 前者 provide，后者 Pinia。

---

## 2. defineOptions：给 `<script setup>` 补一个缺口（151）

### 2.1 缺口在哪：不能写 `export default`

`<script setup>` 的规矩是**不能有 `export default`**（编译器自己生成）。那这些原本住在 `export default` 里的东西放哪？

| 配置项 | 干什么用 | 没了会怎样 |
|---|---|---|
| `name` | 组件名 | `keep-alive` 的 `include` 匹配不上；递归组件没法引用自己；devtools 显示成匿名 |
| `inheritAttrs: false` | 阻止「透传属性」落到根元素 | 父组件随手写的 `class` / `@click` 会糊在你根元素上 |
| 自定义选项 | 极少用 | — |

**`name` 是最现实的痛点**，尤其在用 `keep-alive` 做缓存时：

```html
<keep-alive include="UserList">
  <component :is="cur" />
</keep-alive>
```

`include` 是按**组件名**匹配的。`<script setup>` 组件默认**没有显式 name**（靠文件名推断，构建配置一变就失效）—— 于是「该缓存的没缓存」，而 `keep-alive` **不报错，就是每次重建**。

### 2.2 宏解法

```html
<script setup>
defineOptions({
  name: 'UserList',
  inheritAttrs: false,
})
</script>
```

**一行解决，且它还是那个宏**：不 import、只在顶层。

### 2.3 旧解法（看到别人代码时别慌）

Vue 3.3 之前没有 `defineOptions`，只能**再开一个普通 `<script>`**：

```html
<script>
export default { name: 'UserList' }     // ← 普通 script 可以有 export default
</script>

<script setup>
// 主逻辑
</script>
```

**两个 `<script>` 块共存**是官方支持的写法（普通那个负责「宏管不到」的选项）。

| | 双 `<script>` | `defineOptions` |
|---|---|---|
| 需要几块 | 2 | 1 |
| 3.3+ | 仍可用 | ✅ 推荐 |
| 可读性 | 差（跳来跳去） | 好 |

**所以 `defineOptions` 不是新能力，是「把两个 script 合成一个」。** 这也是宏家族的通性 —— **它们全是为了抹掉 `export default` 留下的洞**。

### 2.4 别把它当成「万能配置区」

```js
defineOptions({ name: 'X', props: {...}, emits: [...] })   // ❌ 无效
```

`defineOptions` **只收** `export default` 里那些**没有专属宏**的选项。`props`/`emits`/`expose` 各有自己的宏，写这里**不生效也不报错** —— 本轮又一个静默失败。

---

## 3. defineModel：把上一轮那两行压成一行（152）

### 3.1 先回想上一篇的写法

子组件要实现 `v-model`，上一篇 2.5 给的是这个：

```js
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
```

```html
<input :value="props.modelValue" @input="emit('update:modelValue', $event.target.value)" />
```

**五行，其中三行是纯模板代码。** 而且每次做双向绑定的组件都要重抄一遍。

### 3.2 一行搞定

```html
<script setup>
const model = defineModel()
</script>

<template>
  <input v-model="model" />
</template>
```

父组件那边**一个字都不用改**：

```html
<Child v-model="text" />
```

**`defineModel()` 返回一个 ref，读写都行：**

```js
const model = defineModel()
console.log(model.value)      // 当前值（就是父组件的 text）
model.value = 'abc'           // ← 自动 emit('update:modelValue', 'abc')，父组件的 text 跟着变
```

**这是本轮最爽的一处**，但爽的前提是上一篇那层手动实现你写过 —— 因为：

> `defineModel` **没有任何新机制**。它编译后产出的就是 `defineProps` + `defineEmits` 那一对，再加一个带 getter/setter 的 ref。

**验证方法**：把 `defineModel()` 用起来后，打开 Vue Devtools 看这个组件的 props 和 events —— 里面明明白白写着 `modelValue` 和 `update:modelValue`。**宏再花哨，落地永远是那一对。**

### 3.3 多个 `v-model`

```js
const firstName = defineModel('firstName')     // ← 传个名字
const lastName  = defineModel('lastName')
```

```html
<!-- 父组件 -->
<UserName v-model:first-name="a" v-model:last-name="b" />
```

**没名字的那个是默认的 `modelValue`。** 一个组件只能有一个默认 `v-model`，其余必须具名 —— 这个限制来自 `v-model` 本身的编译规则，不是 `defineModel` 的。

### 3.4 类型、默认值、选项

```ts
// 带类型 + 默认值
const model = defineModel<string>({ default: '' })

// 必填 / 自定义校验
const model = defineModel<string>({ required: true })

// 禁止父组件「透传」时被覆盖？ 用 get/set 接管
const model = defineModel<string>({
  get: (v) => v ?? '',
  set: (v) => v.trim(),        // ← 写入前统一 trim
})
```

**`set` 那一手很实用**：需要「转换 / 格式化」时，不用退回手写 props + emit。

### 3.5 什么时候别用它

| 场景 | 用什么 |
|---|---|
| 单纯的 `v-model` 双向绑定 | `defineModel` ✅ |
| 需要在**写入时校验并拒绝**（不合规就不 emit） | 手写 `props + emit`，`defineModel` 的 `set` 拦不住「不该写」 |
| 需要**多个关联字段一起更新** | 手写 props + emit |
| 3.3 及更早版本 | **只能手写**（3.3 是实验特性，要开 `defineModel` 选项） |

🟡 **版本差异**：`defineModel` 在 **3.4 转正**，3.3 是实验特性且返回的 ref **只读**（只能靠编译配置开启）。**你项目 3.5.44，直接用，别管旧教程。**

---

## 4. 宏家族全家福（横向收口）

学到这里，宏已经见完了。把它们排一张表，你会发现**它们全是为同一个洞打的补丁**：

| 宏 | 替代了 `export default` 里的 | 集数 |
|---|---|---|
| `defineProps` | `props` 选项 | 148 |
| `defineEmits` | `emits` 选项 | 148 |
| `defineExpose` | `expose` 选项 / 实例公开面 | 149 |
| `defineOptions` | `name` / `inheritAttrs` / 其他 | 151 |
| `defineModel` | `props` + `emits` 的组合（新增便利） | 152 |
| `withDefaults` | 泛型 props 的默认值 | 148（🟡 3.5 可省） |
| `defineSlots` | 插槽类型声明 | **课程未讲，锁着** |

**共同点（一条记全）**：

- 不 import（编译器认名字）
- 只在 `<script setup>` 顶层
- 编译后消失，落地成普通选项
- **不能引用同文件局部变量**（会被提到 `setup` 外面）

**为什么宏这么多？** 因为它们要解决的其实是同一件事：**`<script setup>` 取消了 `export default` 这个「组件配置的入口」，所有配置都得另外找地方放。** 宏就是那些「另外的地方」。

---

==二：格式==

## 1. 速查表

| API | 签名 | 返回 / 作用 | 硬约束 |
|---|---|---|---|
| `provide(key, value)` | key: string \| Symbol | — | setup 同步阶段；**传引用才响应** |
| `inject(key, 默认值)` | 同上 | 取到的值 / ref | 取不到是 `undefined`，**不抛异常** |
| `readonly(x)` | 任意响应式对象 | 只读代理 | 深层生效；写入给警告 |
| `defineOptions(obj)` | 选项对象 | — | 只收**没有专属宏**的选项 |
| `defineModel(name?)` | 名字 / 选项 | **可读写的 ref** | 3.4+ 才稳定；编译成 props + emit |
| `Symbol()` 作 key | — | 唯一引用 | 工程推荐，防撞名 |

## 2. 三集选型对照

| 我要… | 用什么 | 别用 |
|---|---|---|
| 祖孙传数据、中间层不关心 | `provide` / `inject` | props 钻透 |
| 跨**分支**共享 | 锁着 → Pinia（153） | `provide/inject`（树不同分支，取不到） |
| 在**非组件代码**里取数据 | 锁着 → Pinia / 模块单例 | `inject`（没有容器，调不了） |
| 给组件起名字（keep-alive / 递归） | `defineOptions({ name })` | 双 `<script>`（能跑但啰嗦） |
| 阻止属性透传到根元素 | `defineOptions({ inheritAttrs: false })` | — |
| 组件双向绑定 | `defineModel` | 手写 `modelValue` + `update:modelValue`（啰嗦但可控） |

---

==三：代码==

## 1. provide / inject 完整三层（含只读与修改方法）

**`keys.js`**

```js
export const CounterKey = Symbol('counter')
```

**`Grandpa.vue`**

```html
<script setup>
import { ref, provide, readonly } from 'vue'
import { CounterKey } from './keys'

const count = ref(0)
provide(CounterKey, {
  count: readonly(count),        // ← 只给看
  add: () => count.value++,      // ← 只给方法改
})
</script>

<template><Father /></template>
```

**`Son.vue`**（隔了两层，中间 `Father.vue` 一个字没写）

```html
<script setup>
import { inject } from 'vue'
import { CounterKey } from './keys'

const { count, add } = inject(CounterKey)     // ← 拆对象，count 是 ref 不是值
</script>

<template>
  <p>{{ count }}</p>
  <button @click="add">+1</button>
</template>
```

**验证点**：把 `readonly(count)` 换回 `count`，在 `Son.vue` 里写 `count.value++` —— 两边都变，**说明「能改」和「该改」是两件事**。

## 2. `defineModel` 前后对照（同一功能）

```html
<!-- 前：手写，5 行 -->
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
</script>
<template>
  <input :value="props.modelValue" @input="emit('update:modelValue', $event.target.value)" />
</template>
```

```html
<!-- 后：1 行 -->
<script setup>
const model = defineModel()
</script>
<template>
  <input v-model="model" />
</template>
```

**父组件两种写法完全一样：`<Child v-model="text" />`** —— 这就是「宏只改内部实现」的证据。

## 3. `defineOptions` 解决 keep-alive 失效

```html
<!-- UserList.vue -->
<script setup>
defineOptions({ name: 'UserList' })     // ← 少了这行，include="UserList" 匹配不上
const list = ref([])
onMounted(() => fetchList())
</script>
```

```html
<!-- 父组件 -->
<keep-alive include="UserList">
  <component :is="cur" />
</keep-alive>
```

**症状对照**：没有 `defineOptions` 时，切走再切回来，`onMounted` 会**再执行一次**（说明组件被重建了，缓存没生效）—— 而 `keep-alive` 不会提示你任何东西。

---

==四：总结==

## 1. 一句话记住三个

- **`provide/inject` 是「沿树递东西」，不是「注册到容器」** —— Vue 没有容器，所以它替代不了 Pinia。
- **`defineOptions` 补的是 `export default` 的洞**，只管没有专属宏的选项。
- **`defineModel` 一行换五行**，但落地还是 `modelValue` + `update:modelValue`。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| provide 的方向 | **只能祖先 → 后代**，不能反向、不能横传 |
| 响应式的关键 | **传引用才活**：`provide(k, count)` ✅ / `provide(k, count.value)` ❌ |
| inject 取不到 | 返回 `undefined`，**不抛异常** |
| inject 的默认值 | 第二个参数；⚠️ 若传函数会被**当作工厂调用** |
| 调用时机 | **setup 同步阶段**，和生命周期钩子同一约束 |
| key 类型 | 字符串或 **Symbol**（推荐 Symbol 防撞名） |
| 和 DI 的根本差别 | **没有容器** → 非组件代码里取不到 |
| `readonly` | 深层只读，写入给警告 |
| `defineOptions` 收什么 | 只收 `name` / `inheritAttrs` / 自定义选项 |
| `defineModel` 返回 | **可读写的 ref**，写它就自动 emit |
| `defineModel` 编译成什么 | `defineProps` + `defineEmits` 那一对 |
| 多个 v-model | `defineModel('name')` ↔ `v-model:name` |
| 宏的共同硬约束 | 不 import、只在顶层、不引用局部变量 |

## 3. ⭐ 收敛时刻

**这一轮把前四篇的三个结论接上了：**

**① 上一篇的「单向数据流」→ 这里变成「谁提供、谁修改」**

`props` 只读 → 子组件只能 emit。`provide/inject` 一模一样：**后代能拿到 ref 就能改，但规范是「提供方给方法」**。`readonly` + `add()` 这个组合，就是 `props` + `emit` 在跨层级场景的翻版。**不是两套规则，是同一条规则在两种距离上的表现。**

**② 上一篇的「`<script setup>` 对模板全开、对父组件全关」→ 这里出现了第三面**

现在「暴露」有三个方向，三套规则：

| 方向 | 规则 | 机制 |
|---|---|---|
| 对**模板** | 全开 | 编译器自动收集顶层绑定 |
| 对**父组件** | 全关 | `defineExpose` 显式开 |
| 对**后代组件** | **完全不开** | 后代拿不到祖先的任何东西，只能靠 `provide` 主动递 |

**第三行是新的**：父组件至少还能通过 ref 摸到子组件（有 expose 的话），但**子组件反过来完全摸不到父组件**。所以「数据往下流」不是约定，是**物理限制** —— 你不 provide，下面就是拿不到。

**③ 第一篇的「`setup` 没有 `this`」→ 解释了宏为什么是一整套**

`export default` 是「挂在实例上的配置入口」，`this` 是「运行时查表」。组合式把这两个都去掉了，所以需要**一整套宏**来重新提供这个入口。**`defineOptions` 是这个家族里最直白的一个：它的名字就叫「定义选项」。**

**④ 和 ASP.NET Core DI 的边界（最重要的一条）**

```csharp
// DI：容器是全局实体，任何地方都能解析
services.AddScoped<IThemeService, ThemeService>();
var svc = provider.GetRequiredService<IThemeService>();
```

```js
// provide/inject：没有容器，只能「在树里往上找」
provide(ThemeKey, theme)      // 挂在组件实例上
```

**记住这个结论**：`provide/inject` **不是 Vue 的 DI 容器**，它是「父组件往自己的子树上贴了张便条」。**Pinia 才是那个容器** —— 下一轮你会看到它怎么把「取数据」这件事从组件树里解放出来。

## 4. 静默失败清单

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `provide('n', count.value)` | 后代永远显示初始值 | 传的是快照，不是 ref |
| 2 | `provide('s', { ...state })` | 同上，且看起来像对象 | 展开是浅拷贝 |
| 3 | `inject('them')` 拼错 | `undefined`，不报错（开发有 warning） | key 靠引用/字符串相等匹配 |
| 4 | 祖先没 provide，后代没给默认值 | `undefined`，模板渲染空白 | `inject` 不抛异常 |
| 5 | `inject('fn', () => {})` | 默认值被**当工厂调用**了 | 函数型默认值会被执行 |
| 6 | 在 `utils.ts` 里 `inject(...)` | 警告 `inject() can only be used inside setup()` | 没有活动实例，也没有容器 |
| 7 | 后代直接改注入的 `reactive` 对象 | 能改，能生效，事后极难查 | 不是错误，是契约被破坏 |
| 8 | `defineOptions({ props: {...} })` | props **不生效**，无任何提示 | 只收没有专属宏的选项 |
| 9 | 漏 `defineOptions({ name })` | keep-alive 缓存失效，`onMounted` 反复执行 | 无提示，只能靠行为反推 |
| 10 | 3.3 及以前用 `defineModel` | 返回的 ref **只读**，赋值无效 | 实验特性且未开启 |
| 11 | `defineModel()` 但父组件没传 `v-model` | `model.value` 是 `undefined` | 需要 `{ default: '' }` |

**第 1、2、3 条是重灾区，全在 provide 这一侧。** 工程上怎么防：

- **`provide` 的值永远是「引用」或「对象」**，绝不传 `.value` / 展开 —— 把这条写成注释贴在那行旁边都值得；
- key 全部提到 `keys.js` 用 `Symbol` 导出，**双方 import 同一个常量**，拼错就编译报错（TS 项目）；
- 需要「只读 + 方法」的模式就用 `{ data: readonly(x), setX }` 这套固定形状，**别每次自由发挥**。

**这不是 bug，是代价。** `provide/inject` 故意做得「轻」—— 没有容器、没有类型注册、没有生命周期管理，换来的是零配置。**代价就是所有错误都退化成 `undefined`**。

## 5. C# 类比可用度

| C# / .NET 侧 | Vue3 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| ASP.NET Core DI（`AddScoped` + 构造注入） | `provide` / `inject` | ⭐⭐ | **七成像，三成不像**：Vue **没有容器**，按 key 不按类型 |
| `IServiceProvider.GetService<T>()` 返回 null | `inject(key)` 返回 `undefined` | ⭐⭐⭐ | 「取不到不抛」这点完全一致 |
| `GetRequiredService<T>()` 抛异常 | **没有对应** | ❌ | Vue 没有「必须存在」的版本 |
| `readonly` 字段 / 只读属性 | `readonly(count)` | ⭐⭐⭐ | 同构：可读、写入被拦 |
| `Action` 回调传给下层 | `provide` 一个方法 | ⭐⭐⭐ | 「给方法不给数据」的规范一致 |
| 类的 `[Attribute]` / 程序集元数据 | `defineOptions` | ⭐⭐ | 都是「给类型挂元信息」，但 Vue 只认几个固定键 |
| Blazor 的 `@bind` / `[Parameter]` + `EventCallback` | `defineModel` | ⭐⭐⭐ | 如果你以后碰 Blazor，会发现几乎一样 |
| WPF 的 `DependencyProperty` | `defineModel` | ⭐ | 形似（都是双向绑定属性），机制完全不同，别硬套 |
| `static` 单例（应用级共享） | — | ❌ | **这正是 provide/inject 做不到的**，要等 Pinia |

**用法建议**：把 `provide/inject` 读成 **「Scoped 服务，但容器不存在」**。这句话能同时解释「为什么它能跨层级」和「为什么它替代不了 Pinia」—— 是本轮性价比最高的一句。

## 6. 解锁边界

**本轮新解锁**

- `provide` / `inject`：方向、层级、横传限制、调用时机、`Symbol` key
- 响应式的传递规则（传引用 vs 传值 vs 展开）、`readonly` 用法
- 「数据 + 方法」的 provide 契约
- 与 ASP.NET Core DI 的三条差别（无容器 / 按 key / 子树存活）
- `defineOptions` 能收什么、不能收什么、旧的双 `<script>` 写法
- `defineModel`：默认 / 具名、`default` / `required` / `get` / `set`、编译产物
- **宏家族全家福**（7 个）及其共同约束

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| Pinia（真正的「容器」） | Pinia--01（153-155） |
| `defineSlots` / 插槽类型化 | 课程未讲，用时单开 |
| `useTemplateRef`（3.5 新 API） | 课程未讲，先别用 |
| `app.provide()`（应用级 provide） | 课程未讲 —— 它是「全局」的折中，但仍无容器 |
| `$attrs` 透传的完整规则（`v-bind="$attrs"`） | 151 只带了一句，深挖单开 |
| 组合式函数（`useXxx`）的封装套路 | 课程未系统讲，项目第 8 步拆组件时单开 |
| 组件拆分实操 | 项目第 8 步 |

⚠️ **术语撞车登记**（本轮新增一条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `provide` / `inject` | Angular / 某些框架里的**DI 容器注册** | Vue 的**沿树传递** | 提到 Vue 就默念「没有容器」 |
| `model` | `v-model` 的**指令** | `defineModel()` 返回的 **ref** | 有括号是宏，在模板里是指令 |
| `name` | HTML 属性 `name` | `defineOptions({ name })` 的**组件名** | 组件名用于 keep-alive 和 devtools |

## 7. 下一轮预告

**Pinia--01 = 153-155：什么是 Pinia · 手动装到项目 · 基本语法。**

这是「Vue3--组合式篇」的收尾，也是**状态管理的正式开场**。

关键看点：

- **Pinia 就是那个「容器」**。你这一轮学到的三条限制（无容器 / 只在子树 / 靠树存活），Pinia 一条一条全给补上了 —— **到时候把 1.6 那张表拿出来对一遍，会非常痛快。**
- `defineStore` 的**两种写法**（选项式 / setup 式）—— setup 式的写法**完全复用你已经会的组合式语法**，`ref` / `computed` / 函数直接 return 出去。**这一轮不需要学新东西，只是换个容器装。**
- ⚠️ 一个必踩的坑：从 store 里**解构会丢响应式**（`const { count } = store` 是普通值）。救法是 `storeToRefs`（157 集）。**这个坑和本篇 1.4「传 `.value` 丢响应式」是同一个根因**，你到时候应该能自己推出来。

⚠️ **建议新开对话**：Pinia 是一个新工具 + 新目录结构 + 新调试面板，和宏家族是两个话题。

**项目侧提醒**：本篇对应**第 9 步（`provide/inject` 跨组件共享人设与配置）**，而你现在还在第 2 步之前。**这轮笔记同样先存着。** 如果想让笔记立刻有用，最省的做法是先把第 2、3 步做掉（`v-for` 渲染 + `v-model` 输入），那样第 4 步（气泡定时器，用上一篇的 `watch` + `onUnmounted`）就能连上了。

**一个顺序建议**：Pinia 讲完（157 之后）再拆组件，会少走一遍弯路 —— 因为项目第 9 步本来打算用 `provide/inject`，但第 10 步马上又换成 Pinia。**直接上 Pinia 能省掉中间那一步。**
