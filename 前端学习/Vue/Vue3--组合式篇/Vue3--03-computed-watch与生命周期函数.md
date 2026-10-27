# Vue3--03 · computed · watch · 生命周期函数

> **对应课程**：145-147（黑马 `BV1HV4y1a7n4`，3 集 / 约 40 分钟）
> **读法**：这是「Vue3--组合式篇」第 3 篇。前两篇解决了「状态放哪、怎么变响应式」，这一篇解决「**派生值**放哪、**副作用**放哪、**时机**放哪」。
> **本轮定位**：三集其实在讲同一件事 —— 选项式里那三个「配置项」（`computed:` / `watch:` / `mounted()`），在组合式里全部变成了**函数调用**。这一篇就是把这三处对照逐个拆开。

---

==一：概念==

## 1. computed（145）🔥

### 1.1 先把「没有 computed 的世界」看清

假设要显示「购物车总价」，不用计算属性，你有两条路，都难看：

```js
const list = ref([{ price: 10, n: 2 }])
// 路 1：在模板里直接算
// <p>{{ list.reduce((s, i) => s + i.price * i.n, 0) }}</p>
```

模板里塞表达式，一旦逻辑超过一行就没法读。路 2 是定义个函数：

```js
const total = () => list.value.reduce((s, i) => s + i.price * i.n, 0)
// 模板：{{ total() }}   ← 必须加括号
```

**能跑，但有两个毛病**：① 每次渲染都重新算一遍；② 名字像变量、用法像函数，容易和状态混在一起。

`computed` 就是给这条路补上「**缓存**」和「**不带括号**」两件事。

### 1.2 组合式写法：传一个函数进去

```js
import { ref, computed } from 'vue'

const count = ref(1)
const double = computed(() => count.value * 2)
```

三件事一次说清：

| 问题 | 答案 | 不这样会怎样 |
|---|---|---|
| 传什么进去 | 一个**无参函数**（getter） | 传值进去（`computed(count.value * 2)`）→ 算出来就固定了，永远是旧值 |
| 它返回什么 | **一个 ref**（`ComputedRef`） | 当成普通数字用 → 拿到的是对象 |
| 谁调用那个函数 | Vue，在你**读**它的时候 | — |

**为什么必须传函数？** 因为要「延迟执行」。传 `count.value * 2` 是**立刻求值**，把 `2` 这个数字交给 `computed`，它再怎么缓存也救不回来。传函数等于把「怎么算」交出去，Vue 想什么时候算就什么时候算。

**C# 对照**：这就是 `Func<T>` 和 `T` 的区别。

```csharp
computed(() => count.Value * 2)   // ← Func<int>，延迟求值
computed(count.Value * 2)         // ← int，立即求值
```

你在 C# 里不会把 `Func<int>` 和 `int` 搞混，因为编译器不让你过。JS 里 `() => 2` 和 `2` 都能当参数传，**这一条只能靠脑子记**。

### 1.3 返回的是 ref —— 所以它守 ref 的规矩

```js
const double = computed(() => count.value * 2)

console.log(double)          // ComputedRefImpl { ... }  ← 一个对象
console.log(double.value)    // 2                       ← 值在这里
```

```html
<template>
  <p>{{ double }}</p>        <!-- ✅ 模板顶层自动解包 -->
</template>
```

| 位置 | 写法 |
|---|---|
| `<script setup>` 里读 | `double.value` |
| 当参数传出去 | `double`（传引用）或 `double.value`（传值） |
| 模板顶层 | `double` |
| 模板里嵌在普通对象中 | 要 `.value`（同上一篇 2.4 的规则） |

⚠️ **这是本轮第一个高频错**：脚本里写 `if (double > 10)` —— `double` 是个对象，对象和数字比较永远是 `false`，**不报错**。

> **收敛点**：上一篇说「组合式里凡是返回 ref 的函数都长得一样」。`computed` 就是第一个例子。后面你会遇到的 `useRouter()` 返回值、`toRefs()`、Pinia 的 `storeToRefs()`，全是同一套规矩。

### 1.4 缓存：和 methods 的分水岭

这是 `computed` 唯一不可替代的价值。做个对照实验：

```js
const count = ref(1)
const other = ref(0)

const byComputed = computed(() => { console.log('computed 算了'); return count.value * 2 })
const byMethod   = ()  =>            { console.log('method 算了');  return count.value * 2 }
```

```html
<p>{{ byComputed }} / {{ byMethod() }}</p>
<button @click="other++">改个无关的 other</button>
```

点按钮，控制台只会打印 `method 算了`。**`computed` 没动。**

| | 触发重算的条件 | 结果 |
|---|---|---|
| `computed` | **依赖变了**（`count` 变了） | 不重算，直接返回缓存 |
| 普通函数 | **每次渲染**都会重新调用 | 白算 |
| `watch` 回调 | 只有你指定的源变 | 是副作用，不是取值的 |

**所以选型规则只有一句**：

> **要「一个值」，用 `computed`；要「做一件事」，用 `watch`。**

`computed` 里写 `console.log`、发请求、改别的状态 —— 全是错位。它的定位是 getter，不是事件处理器。

### 1.5 可写计算属性：用对象形式

只读版传函数，可写版传**对象**：

```js
const firstName = ref('张')
const lastName  = ref('三')

const fullName = computed({
  get: () => firstName.value + lastName.value,
  set: (val) => {
    firstName.value = val.slice(0, 1)
    lastName.value  = val.slice(1)
  },
})

fullName.value = '李四'      // ← 触发 set，反推回两个 ref
```

**什么时候真需要它？** 只在「一个值可以双向绑定，但它背后不是一个变量」时。典型是 `v-model` 绑一个需要拆装的字段。

**绝大多数情况不需要。** 可写计算属性是「反向数据流」，调试时从 `fullName` 找不到是谁改的。**默认只读，需要时再开。**

### 1.6 三条禁令

| 禁令 | 违反后 |
|---|---|
| 不能在里面发请求 / 改别的状态 | 缓存让副作用只在「第一次」跑，或者跑多次你数不清 |
| 不能是 async | `computed(async () => ...)` 返回的是 **Promise 的 ref**，模板渲染成 `[object Promise]` |
| 只读版不能赋值 | 开发环境警告，值不变（见静默失败 #1） |

⚠️ 第二条展开：`computed` 的 getter 必须**同步返回一个值**。异步场景要配 `watch` + 一个 `ref` 装结果，这是 146 集之后的活。

---

## 2. watch（146）🔥

### 2.1 从「字段名」到「来源」

选项式监听长这样：

```js
export default {
  data() { return { count: 0 } },
  watch: {
    count(newVal, oldVal) { console.log(newVal, oldVal) },   // ← 键是字符串
    'user.name'(n, o) { },                                    // ← 路径字符串
  },
}
```

**问题：键是字符串。** 字符串在编译期不指向任何东西 —— 写错 `cout` 只是「监听了不存在的字段」，**不报错，也不执行**。而且字符串没法表达「我要监听这个表达式的计算结果」。

组合式把它换成三种**真正的值**：

```js
import { watch } from 'vue'

watch(count, (n, o) => {})                    // ① 一个 ref
watch(state, (n, o) => {})                    // ② 一个 reactive 对象
watch(() => state.count, (n, o) => {})        // ③ 一个 getter 函数
```

**这是本轮最重要的范式切换**：从「声明一个字符串给框架解析」变成「把一个值交给框架」。**写错立刻是类型错误，不再是静默失效**。

**C# 对照**：选项式像 `PropertyChanged += (s, e) => { if (e.PropertyName == "count") }` —— 靠**字符串比对**；组合式像强类型的事件订阅。

### 2.2 三种来源的差别，全部在这里

| 来源 | 写法 | 触发条件 | `oldValue` |
|---|---|---|---|
| ref（基本类型） | `watch(count, cb)` | `count.value` 变化 | ✅ 有旧值 |
| ref（值是对象） | `watch(objRef, cb)` | 只在整个 `.value` 被替换时 | ✅ 有 |
| ref（值是对象）+ `deep` | `watch(objRef, cb, {deep:true})` | 内部任意字段变 | ⚠️ 新旧相同 |
| reactive 对象 | `watch(state, cb)` | **自动深度**，任意字段变 | ⚠️ **新旧相同** |
| getter | `watch(() => state.a, cb)` | `a` 变化（精确） | ✅ 有旧值 |

**为什么 reactive 对象的 oldValue 拿不到？** 因为它就是**同一个 Proxy**。Vue 传给你的两个参数指向同一块内存，你改的就是它。想看旧值得自己存：

```js
let old = state.count
watch(() => state.count, (n) => { console.log(old, n); old = n })
```

**为什么 `watch(state)` 会自动深度？** 因为 `state` 本身就是响应式对象，Vue 无法判断你想浅还是深，只好全部遍历。**代价是性能** —— 大对象深监听的开销是真金白银。

### 2.3 两个最常用配置

```js
watch(count, cb, {
  immediate: true,    // ← 立即执行一次，此时 oldValue 是 undefined
  deep: true,         // ← 强制深度遍历
})
```

| 配置 | 用在哪 | 坑 |
|---|---|---|
| `immediate` | 监听源要「先跑一次」才能初始化数据 | 回调里若用 `oldValue` 会拿到 `undefined` |
| `deep` | 监听 ref 包的对象内部字段 | oldValue 失效；大对象有性能成本 |
| `flush: 'post'` | 回调里要读 DOM | 默认 `'pre'`（组件更新前），此时 DOM 还是旧的 |

**`flush` 这条现在只需知道存在。** 记住一句话：**watch 回调默认在 DOM 更新前执行**，要读新 DOM 得加 `flush: 'post'`，或者干脆改用 `onUpdated`。

### 2.4 精确监听：为什么要写 getter

课程里最容易看漏的一句：**监听对象的某个属性，必须用函数包一下**。

```js
watch(state.count, cb)         // ❌ 警告：Invalid watch source: 0
watch(() => state.count, cb)   // ✅ 普通数字，精确监听
watch('[state.count]', cb)     // ❌ 那是 Vue2 的字符串语法，这里不认
```

第一个为什么错？`state.count` 读出来是 `0`，一个数字。**`watch` 收到的是「0 这个值」，不是「state.count 这个位置」**。所以 Vue 只能警告：

```
[Vue warn] Invalid watch source: 0. A watch source can only be a getter/effect
function, a ref, a reactive object, or an array of these types.
```

**这条把 2.1 那句话反过来证明了**：组合式传的是**值**，所以想监听「位置」，就必须传一个**每次读都能读到那个位置的函数**。

> **C# 对照**：`() => state.count` 有点像 `Expression<Func<int>>`（表达式树）—— 传的是「怎么取」，而不是「取到的结果」。区别是 Vue 真的每次去调它，C# 是拿去解析。

### 2.5 同时监听多个

```js
watch([count, () => state.name], ([newCount, newName], [oldCount, oldName]) => {
  console.log(newCount, newName)
})
```

**数组进 → 数组出**，顺序一一对应。任一个变就触发。

### 2.6 watchEffect：不要来源的版本

```js
import { watchEffect } from 'vue'

watchEffect(() => {
  console.log('count 变了', count.value)   // ← 读了谁就监听谁，自动
})
```

| | `watch` | `watchEffect` |
|---|---|---|
| 依赖怎么来 | **你显式指定** | **自动收集**（回调里读过谁就是谁） |
| 首次执行 | 默认不执行（要 `immediate`） | **立刻执行一次** |
| 能拿 oldValue | ✅ | ❌ |
| 什么时候用 | 依赖明确、要对比新旧 | 一串逻辑依赖多个源、只要「变了就重跑」 |

⚠️ **`watchEffect` 的暗面**：依赖是「跑起来才知道」的。回调里有个 `if (flag.value) { use(a.value) }` —— `flag` 为 false 时 `a` 根本没被读，**`a` 就不在依赖表里**。这种「有条件读取」会让依赖时有时无，行为很难预测。**依赖明确时优先 `watch`。**

### 2.7 停止监听

```js
const stop = watch(count, cb)
stop()                         // ← 手动停
```

**组件卸载时，setup 里注册的 watch 会自动停止**（`<script setup>` 的 effect scope 管理）。手动 `stop()` 只用在「条件性停止」的场景，比如某个弹窗关掉后不想再监听了。

---

## 3. 生命周期函数（147）

### 3.1 六个钩子，两个消失

选项式有 8 个，组合式只有 6 个 —— 少的那两个不是忘了：

| 选项式 | 组合式 | 说明 |
|---|---|---|
| `beforeCreate` | — | **被 `setup` 取代** |
| `created` | — | **被 `setup` 取代** |
| `beforeMount` | `onBeforeMount` | |
| `mounted` | `onMounted` | |
| `beforeUpdate` | `onBeforeUpdate` | |
| `updated` | `onUpdated` | |
| `beforeUnmount` | `onBeforeUnmount` | |
| `unmounted` | `onUnmounted` |

**为什么 `created` 消失了？** 因为 `setup` 的执行时机**就是** `beforeCreate` 和 `created` 之间那一格 —— 函数体跑完，`created` 该干的事也就干完了。**它在位置上就是 `created`，所以不需要第二个名字。**

```js
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  console.log('DOM 挂好了')
})

onUnmounted(() => {
  clearInterval(timer)          // ← 收尾
})
```

**用法就是一个 import + 一个函数调用，没有对象、没有键名。** 这也是组合式最舒服的一点：**什么时候挂的看代码顺序就行**，不用在 `data` / `methods` / `mounted` 之间跳。

### 3.2 必须同步注册 —— 这条会静默失效

**钩子函数必须在 `setup` 的同步执行阶段调用。** 放进异步回调里就废了：

```js
onMounted(() => {})                 // ✅ 同步

setTimeout(() => {
  onMounted(() => {})               // ❌ 警告 + 永不执行
}, 0)

async function init() {
  await fetch('/api')
  onMounted(() => {})               // ❌ 同上
}
```

警告原文：

```
[Vue warn] onMounted is called when there is no active component instance to be
associated with. Lifecycle injection APIs can only be used during execution of
setup(). If you are using async setup(), make sure to register lifecycle hooks
before the first await statement.
```

**为什么？** 钩子注册靠「当前正在创建哪个组件实例」这个全局变量。`setup` 执行期间它指向你，`setup` 一结束它就被清空。异步回调跑起来时，Vue 已经不知道这个钩子该挂给谁了。

**注意最后一句**：`async setup()` 里，`await` 之前注册有效，`await` 之后无效。**要写异步初始化，把钩子注册提到 `await` 之前。**

### 3.3 可以注册多次

选项式里 `mounted` 只能写一个。组合式可以写多个，**按注册顺序执行**：

```js
onMounted(() => console.log('A'))
onMounted(() => console.log('B'))
// 输出：A  B
```

**实际价值**：组合函数（`useXxx()`）内部可以自己注册钩子，调用方完全不用知道。这是「逻辑按功能聚合」的前提 —— 项目第 8 步拆组件时会用到。

### 3.4 时机图（和选项式对照）

```
setup()  ← 等价于 beforeCreate + created
   ↓
onBeforeMount   ← DOM 还没生成
   ↓
onMounted       ← DOM 已挂载（可以拿 ref 操作元素）
   ↓
onBeforeUpdate  ← 数据变了，DOM 还没更新
   ↓
onUpdated       ← DOM 已更新
   ↓
onBeforeUnmount ← 组件还活着，还能访问 DOM
   ↓
onUnmounted     ← 已销毁，DOM 没了，定时器/监听器必须在这里清
```

| 想在钩子里干什么 | 用哪个 |
|---|---|
| 发请求拿初始数据 | `onMounted`（或干脆 setup 顶层，见下） |
| 操作 DOM / 初始化第三方库 | `onMounted` |
| 读更新后的 DOM | `onUpdated`（或 `watch` + `flush:'post'`） |
| 清 `setInterval` / 移除事件监听 / 断开 WebSocket | **`onUnmounted`** |

⚠️ **`onUnmounted` 这一格是必须记住的**。`setInterval` 不清，组件销毁后回调还在跑，每次都往一个已经不存在的 DOM 上写东西 —— 控制台不报错，内存一直涨。

---

==二：格式==

## 1. 速查表

| API | 签名 | 返回 | 记忆点 |
|---|---|---|---|
| `computed(fn)` | 无参 getter | `ComputedRef` | 传**函数**不是值；返回 **ref** |
| `computed({get,set})` | 对象 | `ComputedRef` | 可写版，慎用 |
| `watch(source, cb, opts)` | 来源 + 回调 | `stop` 函数 | 来源是**值**：ref / reactive / getter / 数组 |
| `watchEffect(fn)` | 只要回调 | `stop` 函数 | 自动收依赖，**立即跑一次** |
| `onMounted(fn)` | 回调 | — | **同步**注册、可注册多次 |
| `onUnmounted(fn)` | 回调 | — | 清理定时器/监听器的唯一正确位置 |
| `onBeforeUpdate(fn)` | 回调 | — | DOM 更新前 |
| `onUpdated(fn)` | 回调 | — | DOM 更新后 |

## 2. 三大 API 横向对比（选型就靠这张）

| 我要… | 用 | 不用 |
|---|---|---|
| 根据状态算出**一个值** | `computed` | `watch` + 手动赋值 |
| 状态变了**做一件事**（请求/打点/改别的状态） | `watch` | `computed` |
| 拿**新旧值对比** | `watch` | `watchEffect` |
| 一串逻辑依赖**多个源**、只要重跑 | `watchEffect` | 一串 `watch` |
| 组件挂载后**操作 DOM** | `onMounted` | `watch` + `flush` |
| 组件销毁前**收尾** | `onUnmounted` | `beforeDestroy`（Vue2 名，这里没有） |

**一句话分界**：`computed` 有返回值，`watch` 没有。**有返回值的不能有副作用，没返回值的不能当值用。**

---

==三：代码==

## 1. computed 三连（一个文件跑完）

```html
<script setup>
import { ref, computed } from 'vue'

const price = ref(100)
const num   = ref(2)

// ① 只读：依赖变了才重算
const total = computed(() => price.value * num.value)

// ② 对照：普通函数，每次渲染都算
const totalByFn = () => price.value * num.value

// ③ 可写：反推回两个源
const full = computed({
  get: () => `${price.value}-${num.value}`,
  set: (v) => { const [p, n] = v.split('-'); price.value = +p; num.value = +n },
})
</script>

<template>
  <p>{{ total }} / {{ totalByFn() }}</p>
  <p>{{ full }}</p>
  <input v-model="full" />
</template>
```

**验证点**：在 `total` 里加一行 `console.log`，改 `price` 会打印，改别的（比如新增一个无关 ref）不会。

## 2. watch 四种来源对照（最容易错的一组）

```js
import { reactive, ref, watch } from 'vue'

const state = reactive({ count: 0, user: { name: 'a' } })
const list  = ref([1, 2, 3])

// ✅ 精确监听某个属性 —— 必须用 getter
watch(() => state.count, (n, o) => console.log('count', o, '→', n))

// ⚠️ 监听整个 reactive 对象 —— 自动深度，但 oldValue === newValue
watch(state, (n, o) => console.log('同一个对象?', n === o))   // true

// ⚠️ 监听 ref 包的对象 —— 默认只看「整个 value 被换掉」
watch(list, () => console.log('list.value 被替换'))
// list.value.push(4)  → 不触发
// list.value = [9]    → 触发

// ✅ 想听内部变化，加 deep
watch(list, () => console.log('list 内部变了'), { deep: true })
```

## 3. 生命周期 + 定时器清理（项目第 4 步预演）

```html
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const now = ref('')
let timer = null                     // ← 用普通变量，不需要响应式

onMounted(() => {
  timer = setInterval(() => { now.value = new Date().toLocaleTimeString() }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)               // ← 不清，组件没了它还在跑
  timer = null
})
</script>

<template><p>{{ now }}</p></template>
```

**为什么 `timer` 不用 `ref`？** 它不参与渲染，改成 `ref` 反而多一层 `.value` 和一次无意义的依赖收集。**只有「模板要看的东西」才需要响应式。**

---

==四：总结==

## 1. 一句话记住三个

- **`computed` 是「带缓存的 getter，返回 ref」**；算值用它，做事用 `watch`。
- **`watch` 的来源是值不是名字**：想监听「位置」就传 getter `() => obj.a`。
- **生命周期钩子必须同步注册**，`onUnmounted` 是清理资源的唯一正确位置。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| `computed` 入参 | 一个**无参函数**（getter），不是值 |
| `computed` 返回 | **一个 ref**，脚本 `.value`，模板自动解包 |
| 缓存失效条件 | **依赖变了**才重算；和渲染次数无关 |
| 只读 computed 赋值 | 开发警告 `computed value is readonly`，值不变 |
| `watch` 三种来源 | ref / reactive 对象 / getter 函数（+ 数组） |
| reactive 对象被 watch | **自动 deep**，且 `newValue === oldValue` |
| 监听对象属性 | **必须** `() => obj.a`；写 `obj.a` 会报 Invalid watch source |
| `immediate` 的 oldValue | `undefined` |
| `watch` vs `watchEffect` | 显式来源 vs 自动收集；后者**立即执行**、拿不到旧值 |
| 消失的两个钩子 | `beforeCreate` / `created` → 被 **`setup`** 取代 |
| 钩子注册时机 | **setup 同步阶段**，`await` 之后注册无效 |

## 3. ⭐ 收敛时刻

**这一轮把 143-144 留下的三个悬念一次结清：**

**① 上一篇说「组合式里返回 ref 的函数都长得一样」→ `computed` 是第一个实证**

`ref()` 返回 ref，`computed()` 也返回 ref。所以「脚本 `.value` / 模板自动解包」这条规则**一套通吃**。你现在应该能回答：为什么 `computed` 不能让模板写 `{{ double.value }}` —— 因为它已经被解包了，`.value` 是 `undefined`。

**② 上一篇的「不包就没有响应式」→ 解释 `watch` 为什么监听不到解构出来的值**

```js
const { count } = state        // ← 普通数字
watch(count, cb)               // ← Vue 只会警告 Invalid watch source
```

**不是 `watch` 的毛病，是 `count` 从解构那一行起就不是响应式的了。** 你上次改不动页面、这次监听不到，是同一个根因。

**③ Vue--02 的「计算属性有缓存，methods 没有」→ 现在知道缓存怎么来的**

Vue2 的 `computed` 靠 `dirty` 标记 + 依赖的 `Dep` 通知。Vue3 换成 **effect 的调度器**：依赖变了就把这个 computed 标脏，下次读才重算。**机制换了，行为一模一样** —— 这也是为什么你的旧知识在组合式里依然成立。

**④ 选项式的三个配置项 → 三个函数**

| 选项式 | 组合式 | 变化点 |
|---|---|---|
| `computed: { double() {} }` | `computed(() => ...)` | 键名消失，返回 ref |
| `watch: { count(n, o) {} }` | `watch(count, (n, o) => ...)` | 字符串键 → 真实来源 |
| `mounted() {}` | `onMounted(fn)` | 配置项 → 函数调用 |

**这一行「配置项 → 函数调用」是 Vue3 组合式的总纲**：`props`/`emits` 变成 `defineProps`/`defineEmits`，`provide/inject` 变成 `provide()`/`inject()`，`components` 变成直接 `import`。**你后面三篇会反复见到同一个动作。**

## 4. 静默失败清单

组合式的坑大多不报错。这一轮的清单：

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | 给只读 computed 赋值 | 开发警告 `Write operation failed: computed value is readonly`，值不变 | 生产环境连警告都没有 |
| 2 | 脚本里 `if (double > 10)` | 永远 `false` | `double` 是对象，比较的是引用 |
| 3 | `computed(count.value * 2)` | 永远是第一次的值 | 传的是值不是函数，没有重新求值的机会 |
| 4 | `computed(async () => ...)` | 模板显示 `[object Promise]` | getter 必须同步返回值 |
| 5 | `watch(state.count, cb)` | 警告 `Invalid watch source: 0` | 传的是值，不是位置 |
| 6 | `watch(state, cb)` 想拿旧值 | `newValue === oldValue` 恒为 true | 同一个 Proxy，被改了就没有旧值 |
| 7 | `watch(list, cb)` 后 `list.value.push()` | 不触发 | ref 默认不深度，要 `deep` 或 getter |
| 8 | `watch` 用了 `immediate` 又读 `oldValue` | 第一次是 `undefined` | 没有「上一次」 |
| 9 | 钩子写在 `setTimeout` / `await` 之后 | 控制台警告 + **永不执行** | 没有活动实例，不知道挂给谁 |
| 10 | `setInterval` 忘了在 `onUnmounted` 里清 | 控制台零报错，内存持续涨 | 组件没了，定时器还活着 |
| 11 | watch 回调里改自己监听的源 | 同一 tick 内反复触发 | 循环依赖，要么加判断，要么改用 computed |

**第 5 条和第 7 条是重灾区。** 工程上怎么防：

- **监听对象属性一律写箭头函数**，形成肌肉记忆 —— `watch(() => x.y, cb)` 永远正确，`watch(x.y, cb)` 永远不；
- 用 TS 的项目里，`watch` 的来源写错**类型会报**（`WatchSource<T>` 不接受 `number`），这是 TS 少数真能救你的地方；
- `setInterval` / `addEventListener` 和对应的清理**写在相邻两行**里，别分开 —— 分开就一定会忘其中一半。

**这不是 bug，是代价。** `computed` / `watch` 都是普通函数，编译器不知道你传进去的是「值」还是「位置」，只能靠 Volar 插件和你自己的书写习惯守。

## 5. C# 类比可用度

| C# / .NET 侧 | Vue3 侧 | 可用度 | 注意 |
|---|---|:--:|---|
| `Lazy<T>`（只算一次） | `computed` | ⭐⭐ | 形似但不同：`Lazy` 算完**永不失效**，`computed` 依赖变了**会重算** |
| 属性 getter 里每次重算 | 普通函数 | ⭐⭐⭐ | 完全同构 |
| `Func<T>` vs `T` | `computed(() => x)` vs `computed(x)` | ⭐⭐⭐ | **最容易理解的一个对照** |
| `PropertyChanged` 事件订阅 | `watch` | ⭐⭐⭐ | 都是「变了通知」，但 Vue 自动传新旧值、自动清理 |
| `FileSystemWatcher` | `watch` 的副作用定位 | ⭐⭐⭐ | 都是「观察外部变化 → 做事」，且都要 `Dispose` |
| `IDisposable.Dispose()` | `onUnmounted` | ⭐⭐⭐ | **完全同构**：资源必须显式释放 |
| `IHostedService.StartAsync` | `onMounted` | ⭐⭐ | 时机类似，但 Vue 里可以注册多个、顺序执行 |
| `INotifyPropertyChanged` 的手工 `RaisePropertyChanged` | `watchEffect` 自动收集 | ⭐ | **.NET 没有自动依赖收集**，这个差别是本质的 |
| `event` + `-=` 取消订阅 | `watch` 返回的 `stop` 函数 | ⭐⭐ | 语义同，但 Vue 卸载时**自动**停 |

**用法建议**：把 `computed` 想成「**带失效机制的 `Lazy<T>`**」，把 `onUnmounted` 想成「**`Dispose()`**」——这两个类比最省脑子，也最不容易错。`watchEffect` 别硬套 .NET，它是 Vue 独有的模型。

## 6. 解锁边界

**本轮新解锁**

- `computed`：只读版 / 可写版（`get`/`set`）两种签名，返回 `ComputedRef`，缓存机制
- `watch`：三种来源（ref / reactive / getter）+ 数组多源，`immediate` / `deep` / `flush` 三个配置，`stop` 返回值
- `watchEffect`：自动依赖收集、立即执行、与 `watch` 的五条差异
- 生命周期 6 个钩子，`beforeCreate`/`created` 被 `setup` 取代的**原因**
- 钩子必须同步注册（含 `async setup` 的 `await` 边界）、可重复注册

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| `defineProps` / `defineEmits`、`setup(props, ctx)` 的参数 | Vue3--04（148） |
| 模板引用 `ref="xxx"`、`defineExpose` | Vue3--04（149） |
| `provide` / `inject`、`defineOptions` / `defineModel` | Vue3--05（150-152） |
| `onActivated` / `onDeactivated`（keep-alive 专用） | 课程未讲，用时单开 |
| `onErrorCaptured` / `onRenderTracked` 等调试钩子 | 课程未讲，用时单开 |
| `watch` 的 `once: true`、`onWatcherCleanup` | Vue 3.4/3.5 新增，**课程没讲**，你项目 3.5 可用但先别用 |
| `shallowRef` / `shallowReactive` / `markRaw` | 课程未讲，性能优化时单开 |
| `effectScope`（watch 自动清理的原理） | 课程未讲 |
| Pinia | Pinia--01（153-155） |

⚠️ **术语撞车登记**（本轮新增一条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `computed` | Vue2 的**配置项键名** | Vue3 的**导入函数** | 看有没有 `import { computed }` |
| `watch` | 同上 | 同上，还多一个 `watchEffect` 兄弟 | 组合式里**必须 import**，不 import 直接 `watch(...)` 会是 `ReferenceError` —— 这条至少会报错，算好运 |

## 7. 下一轮预告

**Vue3--04 = 148-149：组合式下的父传子、子传父、模板引用、`defineExpose`。**

这两集是「组合式怎么写组件通信」，和第 1 篇那个 `setup(props, context)` 的参数直接接上。

关键看点：

- `defineProps` / `defineEmits` 是**编译宏**，不是普通函数 —— 不用 import，不能在 `if` 里写，也不能赋给变量后传递。这和你之前学的所有 API 都不一样，**它更像是编译器的指令**。
- 父传子的值**是只读的**。想在子组件里改，要么 emit 出去让父组件改，要么本地复制一份 —— 这条在 Vue2 里就有，但组合式里「只有一个 props 参数、没有 `this.$props`」会让越界更明显。
- `defineExpose` 回答的是「`<script setup>` 默认**全部封闭**」，父组件拿不到子组件的任何东西 —— 这正好和 148 之前「顶层绑定全暴露给模板」形成一个**内外反差**，值得单独记一笔。

⚠️ **建议新开对话**：下一篇是「编译宏」，和这两集的「运行时函数」不是一个层级的东西，混在一个对话里容易把宏也当函数用。

**项目侧顺序提醒**：第 3 步（输入框 + 发送）只需要 `v-model`；第 4 步（气泡 + 定时器）**本篇已经给全了**（`watch` + `onUnmounted` + 上面那段定时器代码），可以直接动手。第 5 步（设置面板）会用到 `computed` 做派生显示，第 8 步拆组件才需要 148-149。**所以现在做第 3、4 步正好，不用等下一篇。**
