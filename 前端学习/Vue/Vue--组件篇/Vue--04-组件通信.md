# Vue--04 · 组件通信（048-059 集）

> **对应课程**：048-059 集（第 4 天后半，约 4 小时）｜047 是课程介绍，可跳
> **读法**：每个语法点按「是什么 → 怎么写 → 为什么 → C# 对照 → 常见错法」拆开，代码只留最短片段。
> **本轮定位**：**这是 Vue 最重要的一轮。** 前一轮把代码装进了组件，这一轮解决"组件之间怎么传数据"——没有它，组件就只是一堆互不相干的文件。
> **前置**：Vue--03（组件、生命周期、局部注册）已过。

---

==一：概念==

## 0. 组件拆开之后，问题就来了（050 集）

上一轮你把页面拆成了组件。但拆完立刻出现三个问题：

| 关系 | 问题 | 解决方案 |
|---|---|---|
| 父 → 子 | 父组件的数据怎么给子组件用？ | **`props`** |
| 子 → 父 | 子组件里发生了事，怎么告诉父组件？ | **`$emit` 自定义事件** |
| 兄弟 / 跨层 | 两个不相干的组件怎么共享数据？ | `provide/inject`（小范围）/ Vuex·Pinia（大范围） |

**这三条就是全部。** 后面学的乱七八糟的 API，都是这三条的变种。

> 一句话记住方向：**数据往下流（props），事件往上抛（emit）。**
> 这是"单向数据流"，也是 React 和 Vue 唯一完全一致的设计。

---

## 1. `scoped`：样式为什么会冲突（048 集）

### 1.1 问题

组件化之后，两个组件可能都写了 `.title`：

```css
/* A 组件 */
.title { color: red }
```

```css
/* B 组件 */
.title { color: blue }
```

**后加载的覆盖前面的**，A 组件的标题变成蓝色。这就是"样式污染"。

### 1.2 解决

```html
<style scoped>
.title { color: red }
</style>
```

加了 `scoped`，Vue 编译时会做两件事：

1. 给这个组件的所有元素加一个唯一属性：`<h2 data-v-7ba5bd90>`
2. 给所有选择器加上属性选择器：`.title[data-v-7ba5bd90] { color: red }`

于是样式只在"带这个属性的元素"上生效。

### 1.3 ⚠️ `scoped` 的三个坑

| 现象 | 原因 | 解法 |
|---|---|---|
| 子组件的根元素被父组件的 scoped 样式影响了 | 父组件的 scoped 会**同时作用于子组件的根元素** | 这是设计如此，不是 bug |
| 想改子组件内部的样式，写了没反应 | 子组件内部的元素没有父组件的 `data-v-xxx` | 用 `:deep(.cls)` 穿透 |
| 动态生成的内容（`v-html`）样式失效 | 那些元素没有 `data-v` 属性 | 同上，用 `:deep()` 或全局样式 |

```css
/* 穿透到子组件内部 */
:deep(.child-title) { color: red }
```

> C# 对照：`scoped` 有点像 **命名空间**——把类名关在自己的作用域里。
> 但它不是真隔离（编译后还是全局 CSS），只是靠属性选择器提高优先级。

---

## 2. `props`：父 → 子（051 集）🔥

### 2.1 两种写法

```js
// ① 数组：只能声明名字，没有其他约束
props: ['title', 'count']

// ② 对象：能声明类型、默认值、是否必填、自定义校验
props: {
  title: String,
  count: { type: Number, default: 0 },
  list: { type: Array, required: true }
}
```

**实际项目一律用对象写法。** 数组写法只在教学 demo 里出现。

### 2.2 完整的验证选项

| 选项 | 作用 | 例子 |
|---|---|---|
| `type` | 类型检查（不通过只警告） | `String` / `Number` / `Array` / `Object` / `Function` |
| `default` | 默认值 | `default: 0`；对象/数组**必须写成函数** `default: () => []` |
| `required` | 必填（不传就警告） | `required: true` |
| `validator` | 自定义校验函数，返回布尔 | `validator: v => v > 0` |

> ⚠️ `default` 的坑：对象和数组必须用**工厂函数**返回，写成 `default: []` 会让所有实例共享同一个数组。
> 这和上一轮"组件的 `data` 必须是函数"是**同一个原因**——共享引用。

### 2.3 🔴🔴 props 是只读的（本轮最重要的一条）

```js
props: ['count'],
methods: {
  add() { this.count++ }     // ❌ 控制台警告：Avoid mutating a prop directly
}
```

**能跑，但会警告，而且父组件的值不会变。**

### 2.4 为什么不允许改

因为 `props` 是**父组件数据的引用**。子组件改了它，就等于"绕过父组件改了父组件的数据"。

数据流会变成这样：

```
父组件 data.count ──props──> 子组件 props.count
        ↑                            │
        └──────── 子组件直接改 ───────┘   ← 这就有两条路径能改同一个值
```

**两条路径能改同一个值 = 你永远不知道是谁改的。** 这是所有 UI 框架都要禁掉的事（React 也是）。

### 2.5 想改怎么办

**方案 A：让父组件改（最标准）**

```js
// 子组件：不自己改，喊一声
methods: { add() { this.$emit('update-count', this.count + 1) } }
```
```html
<!-- 父组件：接住事件，改自己的数据 -->
<Child :count="count" @update-count="count = $event" />
```

**方案 B：复制一份自己的数据**

```js
data() { return { localCount: this.count } }   // 只在初始化时读一次
```
适合"父组件的值只是初始值，之后子组件自己管"。

**方案 C：`:value` + `@input` 组成 v-model**（见 §4）

> **判断标准**：这个值到底是"父组件的"，还是"子组件自己的"？
> 是父的 → 方案 A；是子自己的、只是借父的初值 → 方案 B。

### 2.6 单向数据流还有一个名字：`props` 不能当"双向绑定"用

很多人第一次见 `v-model` 会以为"props 可以双向"。不是的——`v-model` 是两个单向拼的（`v-bind` + `v-on`），不是"props 双向"。

---

## 3. `$emit`：子 → 父

### 3.1 语法

```js
// 子组件：抛事件（事件名 + 参数）
this.$emit('add-item', item)

// 父组件：接事件
```
```html
<Child @add-item="handleAdd" />
```
```js
methods: { handleAdd(item) { this.list.push(item) } }
```

### 3.2 事件名规范

| 写法 | 用在哪 |
|---|---|
| `kebab-case`（`add-item`） | **推荐**，HTML 里不区分大小写 |
| `camelCase`（`addItem`） | 在 JS 里 emit 时能用，但模板里接收要写回 kebab |

**统一用 kebab-case，省一半麻烦。**

### 3.3 三个容易搞混的点

| 点 | 说明 |
|---|---|
| 事件名是**字符串**，不是变量 | `this.$emit('add')` 不是 `this.$emit(add)` |
| 多个参数可以传 | `this.$emit('change', a, b)` → 父组件 `@change="fn"` 里 `fn(a, b)` |
| 原生事件怎么办 | `@click.native="fn"`（Vue2）才能监听组件根元素的原生点击 |

> ⚠️ 最后一条坑很深：给组件写 `@click` 监听的是**自定义事件**，不是 DOM 点击。
> 想监听到真实点击，Vue2 要加 `.native`；**Vue3 已经删掉 `.native` 了**，改成在组件里显式 `emit`。

---

## 4. 组件上的 `v-model`（057 集）🔥

### 4.1 先回忆：`v-model` 在表单上是什么

```html
<input v-model="msg">
```
等价于：
```html
<input :value="msg" @input="msg = $event.target.value">
```

### 4.2 在组件上，它是同一回事

```html
<!-- 父组件这么写 -->
<MyInput v-model="msg" />
```

```js
// 相当于
<MyInput :value="msg" @input="msg = $event" />
```

所以 `MyInput` 组件内部要**做两件事才对得上**：

```js
// ① 声明一个叫 value 的 prop（v-model 默认约定用 value 这个名字）
props: ['value'],
methods: {
  // ② 值变了，emit 一个叫 input 的事件
  onInput(e) { this.$emit('input', e.target.value) }
}
```

**这就是"组件支持 v-model"的全部秘密：`value` prop + `input` 事件。**

### 4.3 只有一个 `v-model` 的局限

一个组件只能有一个 `v-model`（因为只能用 `value` 和 `input` 这两个名字）。

**Vue3 解决了**：

```html
<!-- Vue3：可以多个，用参数区分 -->
<UserForm v-model:name="name" v-model:age="age" />
```
```ts
// 子组件：用 defineModel（Vue 3.4+）
const name = defineModel<string>('name')
```

> 📌 `defineModel` 是 152 集的内容。现在只知道"Vue2 只能一个，Vue3 可以多个"即可。

---

## 5. `ref` 和 `$refs`：直接访问（059 集）

### 5.1 用法

```html
<p ref="title">标题</p>
<Child ref="child" />
```
```js
mounted() {
  this.$refs.title.textContent = '改了'      // 拿到 DOM 元素
  this.$refs.child.someMethod()             // 拿到组件实例
}
```

### 5.2 能拿到什么

| 加在什么上 | `$refs.xxx` 是什么 |
|---|---|
| 普通元素 | **DOM 元素** |
| 组件 | **组件实例**（能调它的方法、读它的 data） |
| 加了 `v-for` 的元素 | **数组** |

### 5.3 ⚠️ 三个坑

| 坑 | 原因 |
|---|---|
| `mounted` 之前 `$refs` 是 `undefined` | 元素还没渲染（回到上一轮的生命周期） |
| `v-if="false"` 的元素拿不到 | 它根本没渲染 |
| `v-for` 里的 ref 拿到数组，但顺序不保证 | 靠 ref 定位列表项本身就不可靠，应该用数据 |

### 5.4 什么时候该用，什么时候是坏味道

**该用**：聚焦输入框、测量元素尺寸、调第三方图表库、播放音视频。

**坏味道**：用 `$refs` 去**改另一个组件的状态**。

```js
this.$refs.child.count = 100     // ❌ 绕过了 props/emit 的规矩
```

这等于把"单向数据流"撕开一个洞。**能用 props/emit 解决的，就不要用 refs。**

> 你的项目里已经有例子：`TS/ui.ts` 的 `focusInput()` 就是"操作 DOM"，在 Vue 里应该用 `ref` 拿到输入框再 `.focus()`。

---

## 6. `provide` / `inject`：跨层传递（056 集）

### 6.1 解决什么问题

爷爷组件要给孙子组件传数据。用 props 要一层层传：

```
A → B → C → D     每一层都得声明一遍 props，只为透传
```

`provide/inject` 让 A 直接给 D：

```js
// A（祖先）
provide() { return { theme: 'dark' } }

// D（后代，任意层级）
inject: ['theme']
```

### 6.2 🔵 和 ASP.NET Core 的 DI 不是一回事（必须切开）

| | Vue 的 provide/inject | ASP.NET Core DI |
|---|---|---|
| 谁提供 | 组件树上的祖先 | 容器统一注册 |
| 怎么找 | **沿组件树往上找最近的一个** | 按注册的类型/生命周期解析 |
| 有没有容器 | **没有** | 有 |
| 生命周期 | 跟随组件创建/销毁 | Singleton / Scoped / Transient |
| 能不能自动注入到构造函数 | 不能（是配置项 `inject`） | 能 |
| 主要用途 | 透传配置、主题、当前用户 | 服务解耦、可测试 |

**最大的区别：Vue 没有容器。** 它只是"沿着父链往上找"，找不到就是 `undefined`（可以给默认值）。

### 6.3 ⚠️ 它不适合传"会变的数据"

`provide` 的值默认**不是响应式**的（Vue2）。改了祖先的数据，后代拿到的 `inject` 不会更新。

要用响应式对象：

```js
provide() { return { state: this.someReactiveObject } }   // 传对象，不要传原始值
```

> **经验法则**：`provide/inject` 适合"几乎不变的东西"（主题、配置、当前登录用户）。
> 频繁变化的状态用 Pinia。

---

## 7. 事件总线（055 集）—— Vue2 遗物

### 7.1 它是什么

用一个空的 Vue 实例当中介，谁都能往上发、谁都能听：

```js
// 建一个全局的"广播站"
const bus = new Vue()
Vue.prototype.$bus = bus

// A 组件发
this.$bus.$emit('say', 'hello')

// B 组件听
this.$bus.$on('say', msg => console.log(msg))
```

### 7.2 为什么 Vue3 删了它

**因为没法追踪。** 任何人发、任何人收，出问题只能靠全局搜索字符串。

Vue3 里 `$on` / `$off` / `$once` 全被移除。替代方案：

| 需求 | 替代 |
|---|---|
| 少量跨组件通信 | `provide/inject` |
| 全局状态 | Pinia |
| 真正的事件总线 | `mitt` 这类第三方库（10 行代码） |

> **这一集只需要知道"它曾经存在、为什么被删"**，不用练。面试会问。

---

## 8. `.sync` 修饰符（058 集）—— 被 `v-model` 取代

### 8.1 它解决什么

想给子组件传一个"可以改"的值，但又不想写 `@update-count` 这么长：

```html
<!-- Vue2 的 .sync -->
<Child :count.sync="count" />
```

等价于：
```html
<Child :count="count" @update:count="count = $event" />
```

子组件里：
```js
this.$emit('update:count', newVal)
```

### 8.2 Vue3 里怎么办

**`.sync` 被删了，能力合并进 `v-model`**：

```html
<!-- Vue3：v-model 加参数，就是 .sync 的替代 -->
<Child v-model:count="count" />
```

> 所以现在记两个东西就够：**`v-model`（默认绑 value/input）+ `v-model:xxx`（绑指定名称）**。
> `.sync` 只在读老代码时遇到。

---

==二：格式==

## 1. `props` 速查

```js
props: {
  // 只声明类型
  title: String,

  // 类型 + 默认值
  count: { type: Number, default: 0 },

  // 对象/数组的默认值必须是工厂函数
  list: { type: Array, default: () => [] },

  // 必填
  id: { type: [String, Number], required: true },

  // 自定义校验
  age: { type: Number, validator: v => v >= 0 && v <= 150 }
}
```

## 2. 通信方式总表

| 方向 | 方式 | 特点 | 何时用 |
|---|---|---|---|
| 父 → 子 | `props` | 单向、只读 | **默认选择** |
| 子 → 父 | `$emit` | 子喊一声 | 子组件发生了事 |
| 双向 | `v-model` / `v-model:xxx` | props + emit 的糖 | 表单类组件的值 |
| 父 → 子（直接调） | `$refs` | 命令式、绕过数据流 | 聚焦、测量、调三方库 |
| 跨层 | `provide/inject` | 沿父链找，无容器 | 主题、配置、当前用户 |
| 全局 | Vuex / Pinia | 集中管理 | 大量共享状态 |

## 3. Vue2 → Vue3 对照（重要）

| 场景 | Vue2（课程写的） | Vue3 组合式（你项目写的） |
|---|---|---|
| 声明 props | `props: ['a']` | `const props = defineProps<{ a: string }>()` |
| 声明 emits | `emits: ['x']` | `const emit = defineEmits<{ x: [v: string] }>()` |
| 抛事件 | `this.$emit('x', v)` | `emit('x', v)` |
| 拿 DOM | `this.$refs.box` | `const box = ref(null)` + `box.value` |
| 暴露给父组件 | 默认全暴露 | **必须 `defineExpose({ fn })`** |
| v-model | `value` + `input` | `defineModel()` |
| 事件总线 | `$bus.$emit` | 已删除 |
| `.sync` | `:x.sync` | `v-model:x` |

> ⚠️ **Vue3 的 `$refs` 默认拿不到子组件的东西**，因为 `<script setup>` 默认是封闭的。
> 子组件必须显式 `defineExpose({ someMethod })`，父组件才调得到。
> 这是 Vue3 相对 Vue2 的一个"变严"的地方。

## 4. Vue ↔ C# 对照

| Vue | C# / .NET | 档位 | 说明 |
|---|---|---|---|
| `props` | 构造函数参数 / 只读属性 | ⭐⭐⭐ | 都是"从外部传进来" |
| props 只读 | `readonly` 字段 | ⭐⭐⭐ | 子组件不能改 |
| `$emit` | 回调委托 / `event` | ⭐⭐⭐ | 子通知父 |
| `v-model` | 无对应（两个单向拼的） | 🟡 | 概念上像双向绑定，机制不是 |
| `$refs` | 直接持有对象引用 | ⭐⭐⭐ | 绕过接口直接调 |
| `provide/inject` | DI 容器 | 🔵 | **撞名，Vue 没有容器** |
| `scoped` | 命名空间 | ⭐⭐ | 收紧作用域 |
| 事件总线 | 全局静态事件 | ⭐⭐ | 能用但没法追踪，Vue3 删了 |

---

==三：代码==

## 1. 一个完整的父子通信例子

```js
// 子组件 Child.vue
export default {
  props: { count: { type: Number, required: true } },
  emits: ['update-count'],
  template: `
    <div>
      <span>{{ count }}</span>
      <button @click="$emit('update-count', count + 1)">+1</button>
    </div>
  `
}
```

```js
// 父组件
export default {
  components: { Child },
  data() { return { n: 0 } },
  template: `<Child :count="n" @update-count="n = $event" />`
}
```

**注意三处**：`:count` 传进去、`@update-count` 接回来、`$event` 是 emit 的第二个参数。

## 2. 小黑记事本组件版的拆法（052-054 集）

| 组件 | 收什么 props | 发什么事件 |
|---|---|---|
| 列表容器 | `list` | `del`（删哪一条） |
| 输入框 | — | `add`（新增的内容） |
| 底部统计 | `list` | `clear`（清空） |

**规律**：**props 都是"数据"，emit 都是"动作"。**
子组件不关心数据从哪来、动作之后发生什么，它只负责"显示 + 喊"。

> 这就是"展示组件"和"容器组件"的分工，React 里叫 presentational / container。
> 你的项目第 8 步拆组件时用的是同一个思路。

## 3. 你项目里的对照

现在 `Vue/App.vue` 里 `messages` 和 `addMessage` 都在根组件。第 8 步拆成组件后：

```
App.vue                ← 持有 messages，负责 addMessage
├── ChatPanel.vue      ← props: messages；emit: send
│   └── MessageItem.vue ← props: message
└── InputBar.vue       ← emit: send（把用户输入抛上去）
```

**数据往下（props），事件往上（emit），`App.vue` 是唯一改数据的地方。**

---

==四：总结==

## 1. 一句话记住三个

1. **数据往下流（props），事件往上抛（emit）—— 这就是"单向数据流"。**
2. **props 不能改。想改就 emit 让父组件改，或者复制一份自己管。**
3. **组件上的 `v-model` = `value` prop + `input` 事件，是两个单向拼出来的。**

## 2. ⭐⭐ 本轮要背的

| 要背 | 内容 |
|---|---|
| props 对象写法 | `{ type, default, required, validator }` |
| 数组/对象默认值 | 必须 `default: () => []` |
| 子改父 | `this.$emit('事件名', 数据)` + 父组件 `@事件名` |
| 事件名规范 | 一律 kebab-case |
| 组件 v-model 的两个约定 | `value` prop + `input` 事件 |
| `$refs` 三种情况 | 元素→DOM、组件→实例、`v-for`→数组 |
| `provide/inject` | 沿父链找，没有容器，默认不响应式 |
| Vue3 的 `defineExpose` | 不写它，父组件拿不到子组件的方法 |

## 3. ⭐ 收敛时刻

**这一轮把"组件树"从一棵静态结构，变成了一个能运转的数据系统。**

把三条通信路径叠上一轮的知识，整个应用是这样的：

```
        App.vue（唯一持有全局数据的地方）
         │  props ↓        ↑ emit
    ┌────┴────┐      ┌────┴────┐
  ChatPanel  │      │  InputBar │
    │ props ↓│      │↑ emit     │
  MessageItem└──────┘          │
                                │
        数据一路向下 ←───────────┘
        事件一路向上 ────────────→
```

**关键洞察**：`props` 只能往下，`emit` 只能往上。所以"两个深层的兄弟组件要共享数据"，只能把数据**提升到它们最近的共同祖先**（这叫"状态提升"）。

**当你发现要提升的层级越来越深，就该用 Vuex/Pinia 了** —— 那是 091 / 153 集的事。

## 4. 静默失败清单（本轮）

| 现象 | 真实原因 |
|---|---|
| 改了 props，页面没变，控制台只有警告 | props 只读，改了不生效（父组件的值没变，重新渲染又覆盖回来） |
| 子组件 emit 了，父组件没反应 | 事件名大小写不匹配（`addItem` vs `add-item`） |
| 给组件写 `@click` 没反应 | 那不是 DOM 点击，是自定义事件，要 `.native`（Vue2）或显式 emit（Vue3） |
| `$refs.box` 是 `undefined` | 在 `mounted` 之前访问，或元素被 `v-if` 掉了 |
| Vue3 里 `$refs.child.method()` 报错 | 子组件没写 `defineExpose` |
| `props` 的数组默认值，多个实例共享 | `default: []` 写成了直接值，要用工厂函数 |
| `provide` 的值改了，后代没更新 | 传的是原始值，默认不响应式 |
| `scoped` 写的样式对子组件内部无效 | 子组件元素没有父组件的 `data-v-xxx`，要 `:deep()` |
| 事件总线越用越乱，找不到谁发的 | 这就是 Vue3 删掉它的原因 |

## 5. C# 类比可用度

| 类比 | 档位 | 说明 |
|---|---|---|
| props ↔ 构造函数参数 | ⭐⭐⭐ | 都从外部传 |
| props 只读 ↔ `readonly` | ⭐⭐⭐ | 不能改 |
| `$emit` ↔ 回调/事件 | ⭐⭐⭐ | 子通知父 |
| `$refs` ↔ 持有对象引用 | ⭐⭐⭐ | 绕过接口直接调 |
| `scoped` ↔ 命名空间 | ⭐⭐ | 收紧作用域 |
| `provide/inject` ↔ DI | 🔵 | **最大的区别：Vue 没有容器** |
| 事件总线 ↔ 全局静态事件 | ⭐⭐ | 都不推荐 |

## 6. 解锁边界

**✅ 本轮新解锁**

`scoped` / `:deep()` / `props`（含验证选项）/ `$emit` / 组件上的 `v-model` /
`$refs` / `provide` + `inject` / 事件总线（认读）/ `.sync`（认读）
Vue3 对照：`defineProps` / `defineEmits` / `defineExpose` / `v-model:xxx`

**🔒 仍锁着**

| 类别 | 具体 | 何时解 |
|---|---|---|
| 插槽 | `<slot>` / 具名插槽 / 作用域插槽 | 064-067 集（第 5 天） |
| `$nextTick` | DOM 更新后的时机 | 060 集 |
| 自定义指令 | `Vue.directive` | 062-063 集 |
| 路由 | vue-router | 072 集起 |
| 状态管理 | Vuex / Pinia | 091 / 153 集 |
| `defineModel` | Vue3 的 v-model 语法糖 | 152 集 |
| 组合式全面 | `setup` / `reactive` / 生命周期函数 | 140 集起 |

> ⚠️ 你项目里已经在用 `ref` / `onMounted` 这类组合式 API，但 `defineProps` / `defineEmits` **还没用过**——
> 第 8 步拆组件时会第一次用。到时候按本轮的 §3 对照表写即可。

## 7. 下一步（060-071 集 · 插槽与自定义指令）

**这一轮之后，你就具备了"写一个可复用组件库"的完整能力。**

| 集 | 内容 | 难度 |
|---|---|---|
| 060 | Vue 异步更新 和 `$nextTick` | 🔴 **必须停**（DOM 更新是异步的） |
| 061 | 第 5 天课程介绍 | ⏭ 可跳 |
| 062-063 | 自定义指令（含封装 `v-loading`） | 🟡 会用即可 |
| 064-067 | **插槽四件套**（默认/后备内容/具名/作用域） | 🔴 作用域插槽必须停 |
| 068-070 | `my-tag` 组件封装 | 🟡 综合 |
| 071 | `my-table` 组件封装 | 🟡 综合 |

**并轮判据**（开始前先回答）：

1. 改完 `data` 之后立刻读 `this.$el` 的尺寸，拿到的是新值还是旧值？为什么？
2. 作用域插槽解决的是什么问题——"父组件往子组件里塞结构"，还是"子组件往外递数据"？

两题全对 → 压缩到 2.5 小时（跳过 062-063 的实现细节、071 只看思路）。
