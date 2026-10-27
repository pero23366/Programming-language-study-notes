# Vue3--04 · defineProps / defineEmits · 模板引用 / defineExpose

> **对应课程**：148-149（黑马 `BV1HV4y1a7n4`，2 集 / 约 37 分钟）
> **读法**：这是「Vue3--组合式篇」第 4 篇。前三篇都在**一个组件内部**打转，这一篇第一次跨出组件边界 —— 数据怎么下去、事件怎么上来、实例怎么被外面拿到。
> **本轮定位**：第一次接触**编译宏**。它们看起来像函数，但**根本不是函数** —— 你前三篇养成的「import 一个 API、然后调用它」的肌肉记忆，在这里会反过来坑你。
> **⚠️ 版本先声明**：课程录于 2023 年（Vue 3.2/3.3 时代），**你项目里是 vue 3.5.44**。涉及 props 解构的地方两版行为**相反**，本文会在对应位置显式标出 🟡 **版本差异**。

---

==一：概念==

## 1. defineProps：父传子（148）🔥

### 1.1 先把「没有宏的世界」看一眼

选项式接收 props，是声明一个配置项：

```js
export default {
  props: {
    msg: { type: String, required: true, default: 'hi' },
  },
  mounted() { console.log(this.msg) },     // ← 挂在 this 上
}
```

组合式没有 `this`，所以问题变成：**props 从哪进来？**

答案：`defineProps()` 的返回值。

```js
const props = defineProps(['msg'])
console.log(props.msg)
```

**就这一行。** 没有 `export default`、没有 import、没有配置对象。

### 1.2 三种写法，从松到紧

| 写法 | 代码 | 校验 | 默认值 | 适合 |
|---|---|:--:|---|---|
| 数组 | `defineProps(['msg', 'count'])` | ❌ 无 | ❌ 无 | 临时验证 |
| 对象 | `defineProps({ msg: String, count: { type: Number, default: 0 } })` | ✅ | ✅ | **JS 项目 / 需要运行时校验** |
| 泛型（TS） | `defineProps<{ msg: string }>()` | 编译期 | 见 1.6 | **TS 项目首选** |

**对象形式的完整能力：**

```js
const props = defineProps({
  msg:   { type: String, required: true },
  count: { type: Number, default: 0 },
  list:  { type: Array,  default: () => [] },   // ← 对象/数组的 default 必须是函数
})
```

⚠️ **`default: []` 是错的**，必须 `default: () => []`。原因和你 C# 里踩过的坑一模一样：

```csharp
// ❌ 所有实例共享同一个 List
public List<int> Items { get; set; } = new List<int>();
```

Vue 的 `props` 定义对象是**模块级共享的一份**，`default: []` 会让所有组件实例指向同一个数组。**改一个，全变。**

**泛型形式（你项目在用）：**

```ts
const props = defineProps<{ msg: string; count?: number }>()
```

**注意泛型形式的三个限制**：

| 限制 | 说明 |
|---|---|
| 运行时校验消失 | 类型只存在于编译期，浏览器里没有任何检查 |
| 不能写 `required` | 用 `msg: string` 就是必填，`msg?: string` 就是可选 |
| 默认值要另想办法 | 见 1.6，Vue 3.5 前后写法不同 |

### 1.3 它是「宏」不是函数 —— 四条硬规则

**这是本轮最重要的认知**。`defineProps` / `defineEmits` / `defineExpose` / `defineOptions` / `defineModel` 都是**编译宏**（compiler macro）。

**什么叫宏？** 它在**编译阶段**就被替换掉了，浏览器里根本不存在这个函数。

```js
// 你写的
const props = defineProps(['msg'])

// 编译后（大致）
export default {
  props: ['msg'],
  setup(__props) {
    const props = __props
    return { props }
  },
}
```

看编译产物就懂了：**`defineProps` 那行消失了**，变成了 `props` 配置项 + `setup` 的参数。

**所以四条硬规则，全部从「它不存在」推出来：**

| 规则 | 违反后 | 为什么 |
|---|---|---|
| **不用 import**（也不该 import） | 编译警告 `defineProps is a compiler macro and no longer needs to be imported` | 它不在 vue 包里 |
| **只能在 `<script setup>` 顶层** | 编译报错 | 编译器必须能静态找到它、搬到 `setup` 外面 |
| **不能赋值给变量再调用** | 编译报错 | `const p = defineProps` 里没有可提取的调用 |
| **不能引用同文件的局部变量** | 编译报错 `defineProps() in <script setup> cannot reference locally declared variables because it will be hoisted outside of the setup() function` | 它被提到了 `setup` 外面，外面的作用域里没有那些变量 |

**C# 对照（这个类比最准）**：它不是方法，是**编译器指令** —— 就像 Razor 里的 `@model` / `@inject`。

```cshtml
@model ProductVM          @* 不是运行时对象，是给 Razor 编译器的指令 *@
@inject ILogger Log
```

`@model` 你写错位置（比如塞进 `@if` 里）编译器直接不认。**`defineProps` 完全同构。** 你在 ASP.NET Core 里天天用指令，只是那边长得像 `@xxx`，这边长得像函数调用，**长得像函数是为了 IDE 有类型提示**。

### 1.4 props 是只读的

```js
const props = defineProps(['msg'])
props.msg = '改一下'          // ❌
```

开发环境警告：

```
[Vue warn] Set operation on key "msg" failed: target is readonly.
```

**值不会变，页面不动，生产环境连警告都没有。**

**为什么必须是只读？** 因为 props 的数据**不归你**。父组件是唯一所有者，子组件改了，下次父组件数据一变，你的修改就被覆盖 —— 而且父组件永远不知道发生过什么。这就是**单向数据流**。

要改怎么办？两条路：

| 需求 | 做法 |
|---|---|
| 想让父组件改 | **`emit` 上去**（见第 2 节） |
| 只想在自己内部用 | **复制一份**：`const local = ref(props.msg)` |

第二条有个细节：复制是**一次性**的，父组件后面再改 `msg`，`local` 不跟。想跟就 `watch(() => props.msg, v => local.value = v)`，或者干脆别复制。

**C# 对照**：`public string Msg { get; }` —— 构造函数传进来、外面能读、内部不能写。完全同构。

### 1.5 🟡 版本差异：props 解构到底丢不丢响应式

**课程（Vue 3.2/3.3）的结论：会丢。**

```js
const props = defineProps(['msg'])
const { msg } = props            // ← 课程说：msg 是普通字符串，父组件再改不会更新
```

**你项目（Vue 3.5.44）的结论：不会丢。**

```js
const { msg } = defineProps(['msg'])   // ✅ 3.5 起，解构后仍是响应式的
```

Vue 3.5 把「响应式 props 解构」从实验特性转正并默认开启，编译器会把解构改写成对 `props.xxx` 的访问。

| 版本 | `const { msg } = defineProps(...)` | 建议 |
|---|---|---|
| ≤ 3.4 | **丢响应式**（模板里永远显示初始值） | 用 `props.msg`，或 `toRefs(props)` |
| **3.5+（你）** | **保持响应式** | 可以直接解构，这是官方推荐写法 |

**为什么还要讲老版本行为？**

① 你以后看任何 2023-2024 年的教程、博客都会说「解构丢响应式」，不知道这条会以为代码写错了。
② **有边界**：解构的响应式只对**顶层字段**生效；`const { user } = props` 之后 `user.name` 是深层嵌套，仍然要靠 `props.user` 的响应式（这个没问题），但**把 `user` 再传出去就断了**。
③ `<script setup>` 之外（比如 `setup()` 选项里）**没有这个编译转换**，解构照样丢。

> **记忆口诀**：**3.5 的解构是「编译器帮你补了 `.value`」，不是 JS 语义变了。** 所以凡是编译器管不到的地方，老规则照样生效。

### 1.6 🟡 版本差异：泛型形式的默认值

```ts
// 课程里的写法（3.3/3.4 时代唯一解）
const props = withDefaults(defineProps<{ count?: number }>(), { count: 0 })

// 你项目 3.5.44 可以直接解构给默认值（更推荐）
const { count = 0 } = defineProps<{ count?: number }>()
```

`withDefaults` 现在**还能用**，只是不再是唯一写法。看到别人代码里出现不用慌，它就是个「给泛型 props 补默认值」的辅助宏。

### 1.7 命名：驼峰 vs 短横线

```html
<!-- 父组件 -->
<Child :msg-text="hello" />
```

```js
// 子组件
const props = defineProps(['msgText'])     // ← 必须驼峰，否则 props.msgText 是 undefined
```

| 位置 | 写法 |
|---|---|
| 子组件定义 | **camelCase**（`msgText`） |
| 父组件模板传 | **kebab-case**（`msg-text`）—— HTML 属性不分大小写，只能这么写 |
| 父组件 `<script>` 里（h 函数 / JSX） | 两种都行 |

⚠️ **写错不报错**：父传 `:msgtext`、子定义 `msgText` → props 里是 `undefined`，模板渲染空白。**这是本轮第二个静默失败。**

---

## 2. defineEmits：子传父（148）🔥

### 2.1 为什么组件不能直接改 props

把 1.4 的话反过来看一遍，这次站在子组件的角度：

```
父组件持有数据
    ↓ props（只读）
子组件
    ↑ emit（请求修改）
父组件改数据
    ↓ props 重新下发
```

**这个环叫单向数据流。** 环上唯一能写数据的节点是「拥有它的组件」。子组件只能**请求**，不能**直接改**。

**这不是 Vue 的洁癖**，是你 C# 里早就有的东西：**事件回调**。

```csharp
// C# 里子控件不直接改父窗体的字段
public event Action<int>? ValueChanged;
ValueChanged?.Invoke(newValue);
```

### 2.2 声明与触发

```js
// 子组件
const emit = defineEmits(['change'])

function handleClick() {
  emit('change', 42)          // ← 事件名 + 参数（可多个）
}
```

```html
<!-- 父组件 -->
<Child @change="onChange" />

<script setup>
function onChange(val) { console.log(val) }   // 42
</script>
```

**四步一一对应：**

| 步骤 | 子组件 | 父组件 |
|---|---|---|
| 1. 声明 | `defineEmits(['change'])` | — |
| 2. 触发 | `emit('change', 42)` | — |
| 3. 监听 | — | `@change="onChange"` |
| 4. 接收 | — | 处理函数第一个参数就是 `42` |

**TS 版（你项目会用）：**

```ts
const emit = defineEmits<{ change: [val: number] }>()
// 等价于：change 事件带一个 number 参数
emit('change', 42)      // ✅
emit('change', 'abc')   // ❌ 编译报错 —— 这是 TS 少数能真正救你的地方
```

老写法 `defineEmits<{ (e: 'change', val: number): void }>()` 也能用，是函数重载形式，效果一样。

### 2.3 没声明就 emit 会怎样

```js
const emit = defineEmits(['change'])
emit('chagne', 42)          // 拼错了
```

控制台：

```
[Vue warn] Component emitted event "chagne" but it is neither declared in the
emits option nor as an "onChagne" prop.
```

**父组件的 `@change` 收不到，回调不执行 —— 但它不是错误，页面照常跑。** 本轮第三个静默失败。

**为什么要有这个声明？** 两个作用，都跟声明无关的「正确性」有关：

| 作用 | 说明 |
|---|---|
| **告诉 Vue 这不是透传属性** | 未声明的事件名会落进 `$attrs`，最终被拼到根元素上（3.x 里没有 `.native` 了，`@click` 在组件上默认走 attrs） |
| **让 IDE / TS 能校验** | 泛型形式下拼错事件名直接编译失败 |

### 2.4 事件名大小写

```js
emit('updateValue')       // 子
```
```html
<Parent @update-value="..." />    <!-- 父：能匹配上 -->
<Parent @updateValue="..." />     <!-- 父：也能匹配 -->
```

Vue 3 的 `emit` 内部会同时尝试 `onUpdateValue` 和 `onUpdate-value` 两种键，**两种写法都能收到**。

**但别依赖这个。** 工程约定：**事件名一律 kebab-case**（`update-value`、`item-click`），和 DOM 原生事件（`click`、`keydown`）风格统一，也省得跨版本、跨工具链出岔子。

### 2.5 组件上的 `v-model` 就是这一对的封装

```html
<Child v-model="text" />
```

**完全等价于：**

```html
<Child :model-value="text" @update:model-value="text = $event" />
```

| 部分 | 对应 |
|---|---|
| `:model-value` | 一个名叫 `modelValue` 的 prop |
| `@update:model-value` | 一个名叫 `update:modelValue` 的事件 |

子组件要实现它，就是「接收 prop + emit 回去」：

```js
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
// <input :value="modelValue" @input="emit('update:modelValue', $event.target.value)" />
```

**看出来了？`v-model` 没有任何魔法，就是 1 + 2 的固定组合。** 152 集的 `defineModel` 是把这个组合压成一个宏 —— 那时候你会觉得「早该这样」，但前提是现在这层手动实现你亲手写过一遍。

---

## 3. 模板引用（149）

### 3.1 从 `$refs` 到 ref 变量

想在 JS 里拿到**真实 DOM 元素**（聚焦输入框、滚动到底部、播放视频）。选项式：

```js
// 模板：<input ref="inp" />
mounted() { this.$refs.inp.focus() }
```

组合式：**`ref` 属性值 = 一个 ref 变量名**。

```html
<script setup>
import { ref, onMounted } from 'vue'
const inp = ref(null)          // ← 初始值必须是 null
onMounted(() => inp.value.focus())
</script>

<template>
  <input ref="inp" />
</template>
```

**关键点只有一条：模板里 `ref="inp"` 的字符串，必须和变量名 `inp` 完全一致。**

Vue 编译器看到 `ref="inp"`，会生成「把元素赋给名为 `inp` 的变量」的代码。名字不一致 → **那行赋值找不到目标，`inp.value` 永远是 `null`，零报错**。

⚠️ 这和 1.7 的 props 命名坑是同一类：**字符串和变量名对不上，Vue 不报错，只是什么也不发生。**

### 3.2 时机：为什么 setup 里读是 null

```js
const inp = ref(null)
console.log(inp.value)          // null  ← setup 执行时 DOM 还不存在

onMounted(() => {
  console.log(inp.value)        // <input>  ← 挂载后有值
})
```

**执行顺序**：

```
setup()        ← 变量声明了，值是 null
   ↓
渲染 DOM
   ↓
把 DOM 赋给 inp.value    ← Vue 在这里填值
   ↓
onMounted()    ← 第一个能安全读到值的时机
```

**这就是上一篇 `onMounted` 最典型的用途**，没有之一。

### 3.3 v-for 里是数组

```html
<li v-for="item in list" :key="item.id" ref="items">{{ item.name }}</li>
```

```js
const items = ref([])        // ← 自动收集成数组，顺序不保证
```

⚠️ **官方明确说：ref 数组的填充顺序不保证和源数组一致。** 所以别用 `items.value[0]` 对 `list[0]` —— 要按顺序访问就用 `:ref="el => arr[i] = el"` 函数式写法。

### 3.4 🆕 Vue 3.5 的 `useTemplateRef`

```js
import { useTemplateRef } from 'vue'
const inp = useTemplateRef('inp')     // ← 显式声明「我要模板里那个叫 inp 的」
```

**好处**：变量名和 `ref` 属性值解耦，`const inputEl = useTemplateRef('inp')` 也成立，编译器不再靠「名字巧合」。

**但课程没讲，你项目虽能用到，先别用** —— 先把「字符串必须等于变量名」这条规则吃透，这是理解这个新 API 为什么存在的前提。已在「仍锁着」里登记。

---

## 4. defineExpose（149）🔥

### 4.1 先看「默认封闭」长什么样

**这是本轮最反直觉的一处，也是和前三篇最大的反差。**

前三篇反复说过：`<script setup>` 里**顶层所有绑定自动暴露给模板**。

```html
<script setup>
const count = ref(0)
function add() { count.value++ }
</script>
<template>
  {{ count }} <button @click="add">+1</button>   <!-- ✅ 模板能访问 -->
</template>
```

**但「暴露给模板」≠「暴露给父组件」。**

父组件用 `ref` 拿子组件实例：

```html
<!-- 父 -->
<Child ref="childRef" />
<script setup>
const childRef = ref(null)
onMounted(() => {
  console.log(childRef.value)          // { }  ← 空对象（被包装过）
  childRef.value.add()                 // ❌ TypeError: childRef.value.add is not a function
})
</script>
```

**对比选项式**：选项式里父组件能通过 `$refs.child` 直接访问子组件的**一切**（data、methods、computed 全在实例上）。`<script setup>` 把这条路**关死了**。

**为什么关？** 因为组合式的变量是**普通 `const`**，散在文件各处，Vue 无法区分「哪些是公开 API、哪些是内部实现」。与其全暴露，不如**默认全封闭，要什么自己声明**。

**C# 对照**：选项式像「所有成员都是 `public`」，`<script setup>` 像「所有成员默认 `private`」。你要给外部用，必须自己加访问修饰符 —— 而 `defineExpose` 就是那个修饰符。

### 4.2 暴露什么就有什么

```html
<script setup>
const count = ref(0)
function add() { count.value++ }
const secret = '内部的'

defineExpose({ count, add })        // ← 只开这两扇门
</script>
```

```js
// 父组件
childRef.value.count        // 0
childRef.value.add()        // ✅ 能调
childRef.value.secret       // undefined  ← 没暴露就是没有
```

**这张「暴露清单」就是子组件的公开 API。** 没在清单里的，父组件看都看不见 —— 这是组合式比选项式**更安全**的地方。

### 4.3 访问时不用 `.value`

**这一条最容易踩**：

```js
// 子组件
const count = ref(0)
defineExpose({ count })

// 父组件
childRef.value.count          // 0        ✅ 自动解包
childRef.value.count.value    // undefined ❌
```

`defineExpose` 传进去的对象会被 `proxyRefs` 包一层，**里面的 ref 自动解包**。所以父组件拿到的不是 `Ref<number>`，是数字。

⚠️ **和 1.3 呼应一下**：这是「模板自动解包」的同一条规则换了场景 —— 你不需要知道 `proxyRefs` 怎么实现，只要记住 **「只要经过 Vue 的代理层，ref 就自动 `.value`」**。

**但反过来，如果你在 expose 里放的是 `reactive` 对象**：

```js
defineExpose({ state })       // state 是 reactive
// 父：childRef.value.state.count    ✅ 直接访问，一层都不用加
```

---

==二：格式==

## 1. 速查表

| API | 签名 | 返回 | 硬约束 |
|---|---|---|---|
| `defineProps([...])` | 数组 / 对象 / 泛型 | props 对象（**只读**） | 宏：不 import、只在顶层、不引用局部变量 |
| `defineEmits([...])` | 数组 / 泛型 | `emit` 函数 | 同上；声明了才能 emit |
| `defineExpose({...})` | 对象 | — | 同上；`<script setup>` 默认封闭 |
| `ref(null)` + `ref="x"` | — | DOM / 组件实例 | 名字必须一致；`onMounted` 后才有值 |
| `useTemplateRef('x')` | 字符串 | 同上的 ref | **3.5 新增，课程没讲** |

## 2. 通信方向决策表

| 我要… | 用什么 | 别用 |
|---|---|---|
| 父 → 子**传数据** | `props` | 直接读子组件内部变量（拿不到） |
| 子 → 父**通知 / 请求修改** | `emit` | 改 props（警告 + 无效） |
| 子 → 父 + 父 → 子**双向** | `v-model`（= props + emit） | 两套独立的 props/emit 手写（能跑但啰嗦） |
| 父**主动调**子组件方法 | `ref` + `defineExpose` | 往子组件塞一个「命令 prop」（脏） |
| 父**操作 DOM** | `ref` + `onMounted` | `document.querySelector`（绕过了 Vue） |
| 兄弟 / 跨层级共享 | 锁着（150 的 provide/inject、153 的 Pinia） | 一层层 emit 往上搬（props 钻透） |

---

==三：代码==

## 1. 父传子 + 子传父，完整一对

**`Child.vue`**

```html
<script setup lang="ts">
const props = defineProps<{ msg: string; count: number }>()
const emit = defineEmits<{ change: [val: number] }>()

function add() {
  emit('change', props.count + 1)      // ← 不写 props.count++，只上报
}
</script>

<template>
  <p>{{ msg }}：{{ count }}</p>
  <button @click="add">+1</button>
</template>
```

**`Parent.vue`**

```html
<script setup lang="ts">
import { ref } from 'vue'
import Child from './Child.vue'
const num = ref(0)
</script>

<template>
  <Child msg="计数器" :count="num" @change="num = $event" />
</template>
```

**验证点**：把子组件的 `props.count + 1` 改成 `props.count++` —— 控制台出 `target is readonly` 警告，`num` 不变。**这就是单向数据流被撞的即时反馈。**

## 2. 模板引用两种用途

```html
<script setup>
import { ref, onMounted } from 'vue'

const inp = ref<HTMLInputElement | null>(null)   // ① DOM
const child = ref<InstanceType<typeof Child> | null>(null)  // ② 组件实例

onMounted(() => {
  inp.value?.focus()          // ← 自动聚焦
  child.value?.reset()        // ← 调子组件方法（需 defineExpose）
})
</script>

<template>
  <input ref="inp" />
  <Child ref="child" />
</template>
```

```ts
// Child.vue 里必须有这一行，否则 child.value.reset 是 undefined
defineExpose({ reset() { /* ... */ } })
```

**TS 类型那两行值得抄**：`ref<HTMLInputElement | null>(null)` 让你 `inp.value.` 时能出 DOM 方法提示；`InstanceType<typeof Child>` 是拿组件实例类型的老办法（3.5 也可以用 `useTemplateRef` 自动推导）。

## 3. 三个静默失败的最小复现

```html
<!-- ① 名字不一致：el 永远是 null -->
<script setup>
const inputEl = ref(null)
</script>
<template>
  <input ref="inp" />          <!-- ← 少了 El -->
</template>
```

```html
<!-- ② setup 同步读：null -->
<script setup>
const el = ref(null)
console.log(el.value)          // null（不报错！）
</script>
```

```html
<!-- ③ 子组件没 expose：方法不存在 -->
<script setup>
const child = ref(null)
onMounted(() => child.value.reset())    // TypeError: reset is not a function
</script>
<template><Child ref="child" /></template>
```

---

==四：总结==

## 1. 一句话记住三个

- **`defineProps` / `defineEmits` 是编译宏**：不 import、只在顶层、编译后就消失。
- **数据只能父改、子只能 emit 请求**；`v-model` 就是这对的固定组合。
- **`<script setup>` 对模板全开、对父组件全关**，要开门就 `defineExpose`。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 宏需要 import 吗 | **不需要**，也不该 —— 它不在 vue 包里 |
| 宏能放 if / 函数里吗 | **不能**，必须 `<script setup>` 顶层 |
| props 可写吗 | **只读**（`shallowReadonly`），改它 → 警告 + 无效 |
| 对象/数组的 `default` | 必须是**函数** `() => []`，否则实例间共享 |
| 父传子的命名 | 子**驼峰**定义 / 父**短横线**传，写错是 `undefined` |
| props 解构 | **3.5+ 保持响应式**（课程讲的「丢」已过期） |
| `defineEmits` 返回值 | 一个 `emit` 函数，`emit(名字, 参数...)` |
| 未声明的事件 | 警告 + 父组件收不到 |
| 组件 `v-model` 本质 | `:model-value` + `@update:model-value` |
| 模板 ref 的 key | **属性值必须等于变量名**，否则恒为 `null` |
| ref 何时有值 | **`onMounted` 之后**；setup 同步读是 `null` |
| `<script setup>` 默认 | 对**模板**全开，对**父组件**全关 |
| expose 后访问 | **不用 `.value`**，自动解包 |
| 关闭的两个钩子 | `beforeCreate` / `created` → `setup`（上一篇） |

## 3. ⭐ 收敛时刻

**这一轮把前三篇的四个结论一次性闭环了：**

**① 前一篇的「`computed` 返回 ref → 守 ref 规矩」→ 这里的 `ref(null)` 是同一套**

模板引用变量也是 ref，所以「脚本 `.value` / 模板自动解包」照旧。而 `defineExpose` 里的 ref 被父组件访问时**又自动解包了一次** —— 三次出现同一规则，你现在应该不用背了。

**② 第一篇的「`setup` 没有 `this`」→ 解释了宏为什么必须存在**

选项式里 props 挂在 `this` 上，`this` 就是那个「名单」。组合式没有 `this`，**名单必须由编译器显式生成** —— `defineProps` / `defineEmits` / `defineExpose` 全是「告诉编译器往名单里塞什么」。**三个宏其实是同一个机制的三次出场。**

**③ 第一篇的「`<script setup>` 顶层绑定全暴露」→ 这里出现了它的反面**

那是**对模板**。对**父组件**是完全相反的规则。**「暴露」这个词有方向，方向不同规则相反** —— 这个区分是本轮最值得记的一句话。

**④ 选项式的 `props` / `$emit` / `$refs` → 三个宏 + 一个 ref 变量**

| 选项式 | 组合式 | 变化 |
|---|---|---|
| `props: { msg: String }` | `defineProps({...})` | 配置项 → 宏 |
| `this.$emit('x')` | `const emit = defineEmits(['x'])` → `emit('x')` | 必须**先声明**才能用 |
| `this.$refs.inp` | `const inp = ref(null)` + `ref="inp"` | 字符串查找 → 变量绑定 |
| 实例默认全公开 | `defineExpose({...})` | 默认封闭，显式公开 |

**这一行「配置项 → 宏」是上一篇「配置项 → 函数」的升级版**：上一轮的 `computed`/`watch`/`onMounted` 是**真函数**（能 import、能传参、能放任何地方），这一轮的宏**不是**。**同样长得像函数调用，行为完全不同 —— 这就是必须单独标出来的理由。**

## 4. 静默失败清单

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `ref="inp"` 但变量叫 `inputEl` | 恒为 `null`，零报错 | 编译器按名字字符串赋值，找不到目标就跳过 |
| 2 | setup 里同步 `el.value.focus()` | `TypeError: Cannot read properties of null` | DOM 还没生成，要 `onMounted` |
| 3 | `v-if` 初始 false 时读 ref | `null` | 元素都没渲染；切换后才有值 |
| 4 | 子组件漏 `defineExpose` | `xxx is not a function` | 实例是空壳，不是「方法不存在」 |
| 5 | expose 后父组件写 `.value` | `undefined` | 已自动解包，再取 `.value` 就没了 |
| 6 | 父传 `:msgtext` / 子定义 `msgText` | 渲染空白 | props 里是 `undefined` |
| 7 | 直接改 `props.msg` | 警告 `target is readonly`，值不变 | 生产环境无警告 |
| 8 | `default: []`（不是函数） | 一个组件改了，另一个也跟着变 | 定义对象模块级共享 |
| 9 | `emit('chagne')` 拼错 | 警告，父组件收不到 | 不抛异常 |
| 10 | `import { defineProps } from 'vue'` | 编译警告 `is a compiler macro` | 它不进运行时 |
| 11 | `defineProps` 引用同文件变量 | 编译报错 `cannot reference locally declared variables` | 宏被提到 `setup` 外，作用域里没那变量 |
| 12 | 在选项式 `setup()` 里解构 props | 丢响应式（3.5 也救不了） | 编译转换只对 `<script setup>` 生效 |

**第 1、4 两条是重灾区，且都属于「父组件那边出错、报错信息指向子组件」的类型。** 工程上怎么防：

- **`ref` 变量名和 `ref` 属性值用同一份复制粘贴**，别手打 —— 这是唯一可靠的办法；
- 子组件的 `defineExpose` **写在文件最下面、和 `defineProps` 上下呼应**，形成一个「API 区」，一眼能看出这个组件对外给了什么；
- TS 项目里 `ref<InstanceType<typeof Child>>(null)` —— 子组件没 expose 你要调的方法时，**这行会编译报错**，比 `is not a function` 早得多。这是 TS 在 Vue 里最值钱的一处。

**这不是 bug，是代价。** 组合式把「实例上有什么」从运行时反射变成了编译期约定，**换来的是可控的公开面，代价是编译器只能靠字符串和类型去猜、猜不到就静默。**

## 5. C# 类比可用度

| C# / .NET 侧 | Vue3 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| Razor 的 `@model` / `@inject` | `defineProps` | ⭐⭐⭐ | **最准的类比**：都是编译器指令，写错位置编译器不认 |
| `public string Msg { get; }` | props 只读 | ⭐⭐⭐ | 构造传入、外部可读、内部不可写 |
| 构造函数参数 | 父传 props | ⭐⭐⭐ | 都是「由外部提供、自己不该改」 |
| `event Action<int>` + `?.Invoke` | `defineEmits` + `emit` | ⭐⭐⭐ | 同一个模型：声明 → 触发 → 订阅 |
| `public` / `private` 访问修饰符 | `defineExpose` | ⭐⭐⭐ | **默认 `private`**，要开才开 |
| `x:Name` + 代码后置访问控件 | 模板 `ref` | ⭐⭐ | WPF 里 `x:Name` 生成字段，Vue 靠名字匹配变量，**匹配不上不报错** |
| `[Parameter]`（Blazor） | `defineProps` | ⭐⭐⭐ | 如果你以后碰 Blazor，会发现几乎一模一样 |
| `internal` 程序集内可见 | — | ⭐ | Vue 没有中间层，只有「开 / 关」 |
| 接口 `interface` 约束成员契约 | `defineExpose` 的清单 | ⭐⭐ | 形似：都是「对外承诺哪些成员」，但 Vue 不强制实现 |

**用法建议**：把 `defineProps` 直接读成 **Razor 的 `@model`**，把 `defineExpose` 读成 **`public` 修饰符**。这两个类比在本轮全程成立，且不依赖你对 WPF 的了解程度。

## 6. 解锁边界

**本轮新解锁**

- `defineProps` 三种写法（数组 / 对象 / TS 泛型）、`default` 必须是函数的原因
- 编译宏的四条硬规则（不 import、只在顶层、不赋值、不引用局部变量）
- props 只读（`shallowReadonly`）、单向数据流、复制与 `watch` 同步
- **🟡 Vue 3.5 响应式 props 解构**（课程的「解构丢响应式」已过期）、`withDefaults` 与解构默认值
- props / 事件的驼峰 ↔ 短横线映射
- `defineEmits` 声明 + 泛型语法、未声明事件的警告
- 组件 `v-model` = `:model-value` + `@update:model-value`
- 模板引用：`ref(null)` + 同名 `ref="x"`、`onMounted` 时机、`v-for` 数组
- `defineExpose`、`<script setup>` 默认封闭、expose 后自动解包

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| `provide` / `inject` | Vue3--05（150） |
| `defineOptions`（继承 `inheritAttrs`、`name`） | Vue3--05（151） |
| `defineModel`（简化 `v-model`） | Vue3--05（152） |
| `defineSlots` / 插槽的类型化 | 课程未讲，用时单开 |
| `useTemplateRef`（3.5 新 API） | 课程未讲，**你项目可用但先别用** |
| `$attrs` / `inheritAttrs` 透传细节 | 151 会带一句，深挖要单开 |
| Pinia（跨组件共享） | Pinia--01（153-155） |
| 组件拆分实操（项目第 8 步） | 项目侧 |

⚠️ **术语撞车登记**（本轮新增两条，都很危险）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `props` | 选项式的**配置项** | 组合式 `defineProps` 的**返回值** | 组合式里 `props` 是你起的变量名，可以叫别的 |
| `emit` / `$emit` | 选项式**实例方法** `this.$emit` | 组合式的**局部变量** `const emit = defineEmits(...)` | 有 `this.` 是旧写法；组合式没有 `this` |
| `ref` | **响应式容器** `ref(0)` | **模板引用属性** `ref="inp"` | 同一个词指两件事：`ref()` 是函数，`ref="x"` 是**字符串属性**，别混 |

## 7. 下一轮预告

**Vue3--05 = 150-152：`provide` / `inject` · `defineOptions` · `defineModel`。**

三集是「跨层级」和「宏的收尾」，各解决一件事：

- **150 `provide` / `inject`**：props 只能一层层往下传（props 钻透），爷爷给孙子得让爸爸当中转站。`provide/inject` 就是跳过中间层。你在 C# 里最熟的对照是 **DI 容器** —— 但注意：**Vue 没有容器**，它是沿着组件树往上找，这个差别是理解它的关键（也是「为什么它不能替代 Pinia」的答案）。
- **151 `defineOptions`**：宏家族里最「无聊」的一个 —— 只是让你在 `<script setup>` 里写 `name` / `inheritAttrs` 这些原本属于 `export default` 的选项。价值在于补上「`<script setup>` 不能有第二个 `export default`」这个缺口。
- **152 `defineModel`**：把本篇 2.5 那段「`modelValue` + `update:modelValue` 手动实现」压成一行。**你会用得很爽，但爽的原因必须是本篇那层手动实现你已经写过。**

⚠️ **建议新开对话**：这一篇的核心是「编译宏」和「组件边界」，下一篇转向「层级关系与状态归属」，是另一个话题。

**项目侧顺序提醒**：本篇对应**第 8 步（拆组件）**，你现在进度还在第 2 步（消息列表）之前。所以这轮笔记**先当资料存着**，不用急着用 —— 但 1.4 那条「props 只读 → 复制一份」和 3.2 那条「`onMounted` 才拿得到 DOM」，在第 4、7 步会提前用上。

**下一步建议**：先做**第 2 步（消息列表渲染）**，只用到上一篇的 `ref` + 数组响应式，和本篇无关，可以马上动手。
