# Vue--05 · 异步更新 · 自定义指令 · 插槽（060-071 集）

> **对应课程**：060-071 集（第 5 天，约 3 小时）｜061 是课程介绍，直接跳
> **读法**：每个语法点按「是什么 → 怎么写 → 为什么 → C# 对照 → 常见错法」拆开，代码只留最短片段。
> **本轮定位**：前四轮解决"组件怎么拆、怎么通信"。这一轮解决第三件事——**组件怎么变成别人能直接拿去用的东西**。
> **前置**：Vue--04（props / emit / 组件 v-model / provide-inject）已过。

---

==一：概念==

## 0. 这一轮在解决什么

组件通信解决的是"**我这个组件**怎么跟别的组件说话"。但真正值钱的组件是另一种：**别人不需要改我的源码，就能把它用成自己想要的样子**。

这一轮四个主题，其实是同一个目标的三块拼图：

| 问题 | 这一轮给的答案 | 集号 |
|---|---|---|
| 数据改了，DOM 到底什么时候变？ | **异步更新队列** | 060 |
| 给元素挂一段"行为"，不想每次都写一堆 JS | **自定义指令** | 062-063 |
| 组件骨架一样、内容不一样，怎么复用 | **插槽** | 064-067 |
| 能不能写出 `<my-tag>` `<my-table>` 这种乐高块 | 上面两个的综合 | 068-071 |

> 一句话预告：**`$nextTick` 是"渲染是异步的"这个事实的补丁；自定义指令是"DOM 操作"的复用；插槽是"结构"的复用。**

---

## 1. 异步更新队列（060 集）🔥

### 1.1 先看现象

```js
methods: {
  add() {
    this.count++
    console.log(this.$el.textContent)   // ← 打印出来的还是旧数字
  }
}
```

**`this.count` 已经是新值了，但 `this.$el` 里还是旧的。**

### 1.2 为什么

Vue 不是"你一改 `data`，它立刻去改 DOM"。它做的是：

```
this.count++  ──┐
this.msg = '' ──┼──> 全部塞进一个「待更新队列」（同一个 watcher 只留一个）
this.list.push()┘                    │
                                     ▼
                          本轮同步代码跑完
                                     │
                                     ▼
                    微任务（Promise.then）→ 一次性刷新 DOM
```

三条关键事实：

| 事实 | 含义 |
|---|---|
| 更新是**批量**的 | 一次事件里改 100 次，DOM 只刷 1 次 |
| 刷新时机在**本轮同步代码之后** | 所以你 `log` 的那一刻，DOM 还没动 |
| 队列是**去重**的 | 同一个 watcher 改 5 次，只排 1 次 |

### 1.3 ⭐ C# 对照：EF Core 的 ChangeTracker（这个类比很准）

```csharp
user.Name = "A";
user.Age  = 20;
user.City = "上海";
// 到这一行为止，一条 SQL 都没发
await db.SaveChangesAsync();   // ← 现在才一起发出去
```

| EF Core | Vue |
|---|---|
| 改实体属性 → 只标记 `Modified` | 改 `data` → 只标记 watcher 待更新 |
| 多次修改不产生 SQL | 多次修改不产生 DOM 操作 |
| `SaveChanges()` 统一提交 | 微任务里统一 patch |
| 提交前读数据库还是旧值 | `$nextTick` 前读 DOM 还是旧值 |

**这不是巧合。** 两边都是同一个设计动机：**「一次改动的代价太贵，所以攒着一起做」**——数据库那边贵在 IO，DOM 这边贵在重排重绘。

### 1.4 一条推论（很重要）

**既然批量，你就不能假设"我改了 → 它马上变了"。** 凡是「改完立刻要读 DOM」的地方，全都要等：

| 典型场景 | 你要读什么 |
|---|---|
| 滚动到底部 | `el.scrollTop = el.scrollHeight` ← 要先有新内容 |
| 输入框自动聚焦 | `input.focus()` ← 要先有那个 input |
| 测量元素高度（做动画/虚拟滚动） | `el.offsetHeight` |
| 拿到 `v-if` 刚变成 true 的元素 | `ref` 刚才有值 |

> **你项目里就有原版例子**：`TS/ui.ts` 的 `addMessage()` 是先 `append` 再算 `scrollTop`——
> 手写 DOM 时"插进去就存在"，所以一行就够。换成 Vue 的 `v-for` 之后，新节点**这一轮结束才会出现**，
> 直接读 `scrollHeight` 会得到旧高度，表现是"消息多了，但滚动条差一截"。这就是第 2 步要 `$nextTick` 的原因。

---

## 2. `$nextTick`（060 集）

### 2.1 是什么

> **把回调排到"这一轮 DOM 更新之后"再执行。**

```js
this.$nextTick(() => {
  // 这里 DOM 已经是最新的
})
```

`next` 指的不是"下一帧"，而是**"下一次 DOM 刷新之后"**。

### 2.2 两种写法

```js
// ① 回调式（课程里用的，Vue2 主流）
this.$nextTick(() => { this.scrollToBottom() })

// ② await 式（Vue2.1+ / Vue3 都支持，推荐）
await this.$nextTick()
this.scrollToBottom()
```

第二种能 `await`，是因为 `$nextTick` **返回一个 Promise**。项目里写 `<script setup>` 就用这个。

### 2.3 ⚠️ 它不是"等一会儿"

```js
this.$nextTick(() => {...})   // ✅ 等渲染
setTimeout(() => {...}, 0)    // ⚠️ 等宏任务，可能等过头，也可能时序对不上
```

`$nextTick` 用的是**微任务**，比 `setTimeout(0)` 早。而且它保证的是"**渲染已完成**"这个语义，`setTimeout` 只保证"至少过了一个宏任务"，两者不是一回事。

### 2.4 什么时候用（就这四类）

| 场景 | 记法 |
|---|---|
| 改完数据要**量尺寸 / 读位置** | 读 DOM |
| 改完数据要**滚动 / 聚焦** | 动 DOM 的"状态" |
| `v-if` 刚变成 true，要拿里面的元素 | 抢新节点 |
| 想在渲染完成后做一次副作用（打日志、调三方库） | 收尾 |

**其余情况一律不需要。** 判断标准很简单：**回调里有没有 `el.xxx`。** 没有就不该用。

---

## 3. 自定义指令 · 基础（062 集）

### 3.1 它是什么

你已经用过一堆内置指令：`v-if` `v-for` `v-model` `v-show`。

**自定义指令 = 你自己造一个 `v-xxx`，把"一段固定的 DOM 操作"打包进去。**

```html
<input v-focus>
```

`v-focus` 要干的事，其实就是：

```js
const el = document.querySelector('input')
el.focus()
```

区别是：**指令写一次，任何元素挂上就生效**，而且元素被创建/更新/销毁时，Vue 会替你在正确的时机调你。

### 3.2 全局注册

```js
Vue.directive('focus', {
  inserted(el) { el.focus() }
})
```

**三段拆开看：**

| 部分 | 是什么 |
|---|---|
| `Vue.directive` | 注册指令的 API（全局） |
| `'focus'` | 指令名，用的时候写 `v-focus`（**不带 `v-`**） |
| `{ inserted(el) {...} }` | 钩子对象，Vue 在特定时机调它 |

### 3.3 五个钩子（Vue2）

| 钩子 | 什么时候调 | 调几次 |
|---|---|---|
| `bind` | 指令第一次绑到元素上 | 1 次 |
| `inserted` | 元素被插入父节点时 | 1 次 |
| `update` | 所在组件 VNode 更新时 | 多次 |
| `componentUpdated` | 组件 VNode 和子 VNode 都更新完 | 多次 |
| `unbind` | 解绑 | 1 次 |

**实际 90% 的指令只用两个：`inserted` 和 `update`。**

> ⚠️ `inserted` 是"**父节点存在**"就调，不保证已经插进 document。要量尺寸/拿 `getBoundingClientRect`，
> 用 `inserted` 偶尔会拿到 0 —— 保险一点扔进 `nextTick`。

### 3.4 钩子收到的参数

```js
Vue.directive('demo', {
  inserted(el, binding) {
    // el      → 被绑定的真实 DOM 元素
    // binding → 一个对象
  }
})
```

`binding` 里常用的四个：

| 字段 | 对应写法 | 值 |
|---|---|---|
| `value` | `v-demo="msg"` | `msg` 的值 |
| `oldValue` | 同上 | 上一次的值（`update` 里才有用） |
| `arg` | `v-demo:left` | `'left'` |
| `modifiers` | `v-demo.foo.bar` | `{ foo: true, bar: true }` |

### 3.5 ⚠️ 命名不要带 `v-`

```js
Vue.directive('v-focus', {...})   // ❌
```
用的时候会变成 `v-v-focus`。**注册时写裸名 `focus`。**

### 3.6 什么时候该用，什么时候别用

| 场景 | 用指令? |
|---|---|
| 自动聚焦、拖拽、复制、点击外部关闭、权限隐藏 | ✅ 典型 |
| 封装第三方库的初始化（图表、地图） | ✅ |
| 只是改样式 | ❌ 写 CSS |
| 只是想根据条件显示 | ❌ `v-if` / `v-show` |
| **要改数据** | ❌ 用 `@click` + 方法 |

> **铁律：指令是"操作 DOM"的复用，不是"处理逻辑"的复用。** 指令里出现 `this.xxx = ...` 就该停下来。

---

## 4. 自定义指令 · 封装 `v-loading`（063 集）

### 4.1 需求

请求期间，在元素上盖一层半透明遮罩 + 转圈。

### 4.2 骨架

```js
Vue.directive('loading', {
  inserted(el, binding) { toggle(el, binding.value) },
  update(el, binding)   { toggle(el, binding.value) }
})
```

**为什么两个钩子都要写**——这是本节的坑，见 4.4。

### 4.3 核心是"用 `binding.value` 当开关"

```js
function toggle(el, on) {
  el.style.position = 'relative'   // 遮罩要绝对定位，父级得是定位上下文
  let mask = el.querySelector('.my-loading')
  if (on && !mask) { /* 创建遮罩并 append */ }
  if (!on && mask) { mask.remove() }
}
```

**思路一句话：指令自己不存状态，状态永远来自 `binding.value`。**（又是"单一数据源"，从第 1 轮讲到现在的同一条原则。）

### 4.4 🔴 坑：`inserted` 只跑一次

```html
<div v-loading="isLoading">   <!-- isLoading 从 false → true，指令不会重跑 inserted -->
```

`inserted` 是"元素插进 DOM 时"，**只调一次**。之后 `isLoading` 变了，Vue 调的是 **`update`**。

**所以只写 `inserted` 的 `v-loading` 会出现：第一次能显示，之后再也不会变。** 而且不报错。

> 这是本轮第一个静默失败。判断方法：**只要指令依赖一个会变的值，就必须同时写 `update`。**

---

## 5. 插槽是什么（064 集）

### 5.1 没有插槽的世界

```html
<!-- MyBtn.vue：我想让"按钮里写什么"由调用者决定 -->
<button class="btn">这里写死什么，调用者就只能用什么</button>
```

要支持不同内容，只能开一堆 props：

```html
<MyBtn text="删除" icon="trash" />
```

**一旦内容变成"一段结构"（图标 + 文字 + 徽标 + 换行），props 就崩了。** props 能传数据，传不了**模板**。

### 5.2 默认插槽

子组件里留个坑：

```html
<!-- MyBtn.vue -->
<button class="btn">
  <slot></slot>
</button>
```

父组件这么用：

```html
<MyBtn>
  <span>🗑</span> 删除
</MyBtn>
```

`<slot>` 就是一个**占位符**：父组件写在组件标签中间的**全部内容**，会替换到 `<slot>` 的位置。

> **所以插槽是"传模板"的机制**，和 props（传数据）是两条不同的通道。

### 5.3 🔴 编译位置决定作用域（本轮最容易错的一条）

```html
<!-- 父组件 -->
<MyBtn>{{ msg }}</MyBtn>
```

这里的 `{{ msg }}` 用的是**父组件**的 `msg`，不是 `MyBtn` 内部的。

**因为那段模板是在父组件里编译的**——Vue 编译时就已经把 `msg` 解析成"父组件作用域里的 msg"了。

| 写在哪 | 作用域属于谁 |
|---|---|
| `<MyBtn>...</MyBtn>` 中间 | **父组件** |
| `MyBtn.vue` 文件里 | 子组件 |

**推论**：子组件内部的数据，父组件在插槽里**默认拿不到**。这正是作用域插槽要解决的问题（§8）。

---

## 6. 后备内容（065 集）

### 6.1 写法

```html
<slot>默认文字</slot>
```

`<slot>` 标签**中间写的内容**就是后备内容（fallback）。

```html
<!-- 父组件没给内容 -->
<MyBtn></MyBtn>        <!-- 渲染：默认文字 -->
<!-- 父组件给了 -->
<MyBtn>删除</MyBtn>    <!-- 渲染：删除 -->
```

### 6.2 ⭐ C# 对照：`virtual` 方法的默认实现

```csharp
public virtual string Label() => "默认文字";   // 子类不 override 就用这个
```

| C# | Vue |
|---|---|
| `abstract` 方法 | 没有后备内容的 `<slot>` |
| `virtual` 方法带默认体 | `<slot>默认文字</slot>` |
| 子类 `override` | 父组件传入内容 |

**几乎一模一样。** 这样理解比"插槽有个默认值"要准确得多——它是**继承 + 覆写**的关系，不是"参数有默认值"。

---

## 7. 具名插槽（066 集）

### 7.1 一个问题：多个坑怎么办

组件里有三个位置要填（头部、主体、底部）：

```html
<div class="card">
  <slot></slot>   <!-- 三个 slot 都这么写，父组件给的内容会全塞进每一个？ -->
</div>
```

**不会全塞进去，但你也无法控制哪个内容进哪个坑。** 所以需要给坑起名。

### 7.2 子组件：给坑起名

```html
<div class="card">
  <slot name="header"></slot>
  <slot></slot>              <!-- 没写 name 的 = 默认插槽，名叫 default -->
  <slot name="footer"></slot>
</div>
```

### 7.3 父组件：指定进哪个坑

```html
<Card>
  <template #header>标题</template>
  <p>主体内容</p>
  <template #footer>底部</template>
</Card>
```

| 写法 | 说明 |
|---|---|
| `#header` | `v-slot:header` 的简写，Vue2.6+ |
| `<template #header>` | **必须用 `<template>` 包**，不能直接写 `<div #header>` |
| 没包 `<template>` 的内容 | 进默认插槽 |

### 7.4 ⚠️ 三个坑

| 坑 | 现象 |
|---|---|
| `#header` 直接写在普通标签上 | 编译报错，`v-slot` 只能用在 `<template>` 或组件标签上 |
| 名字大小写 | HTML 属性会被转小写，`#Header` 找不到 `name="Header"` |
| 内容顺序 | 具名插槽的顺序由**子组件模板里 `<slot>` 的位置**决定，父组件写的前后不影响 |

> 最后一条很容易记反：**位置由"坑在哪"决定，不由"你写在哪"决定。**

---

## 8. 作用域插槽（067 集）🔥🔥

### 8.1 它解决的问题

回到 §5.3 的结论：**父组件在插槽里拿不到子组件的数据。**

但有些需求天生就是要"**子组件有数据，父组件决定怎么显示**"：

```html
<MyTable :data="list">
  <!-- 父组件想说：每一行的"操作"这一列，渲染成三个按钮 -->
  <!-- 但"这一行是哪一行"这个信息，在 MyTable 内部 -->
</MyTable>
```

**这是唯一一条"数据从子往父、结构从父往子"的通道。** 前面学的 `props`（父→子）和 `$emit`（子→父）都拼不出来。

### 8.2 语法（分两半看）

**子组件：把数据"挂"在 slot 上，像传 props 一样**

```html
<slot :row="item" :index="i"></slot>
```

`item` / `i` 是子组件作用域里的变量。**它们被绑定成 slot 的属性**，等待父组件来取。

**父组件：用一个对象接住**

```html
<MyTable :data="list">
  <template #default="{ row, index }">
    {{ index }} - {{ row.name }}
  </template>
</MyTable>
```

`#default="{ row }"` 是 `v-slot:default="scope"` 的解构写法，等价于：

```html
<template #default="scope">
  {{ scope.row.name }}
</template>
```

> **记忆法**：`<slot :row="item">` 就是"**子组件往父组件递了一个 props 包**"；
> `<template #default="{ row }">` 就是"**父组件接住这个包并解构**"。
> 方向反了，但 props 的语法完全一样。

### 8.3 用 `my-table` 感受一下（071 集就是这个）

子组件只负责"画表格骨架"，不负责"每一格长什么样"：

```html
<!-- MyTable.vue -->
<table>
  <tr v-for="(item, i) in data" :key="i">
    <td v-for="(val, key) in item" :key="key">
      <!-- 默认：直接显示值 -->
      <slot :row="item" :key2="key">{{ val }}</slot>
    </td>
  </tr>
</table>
```

父组件要自定义某一列时，就在插槽里判断：

```html
<MyTable :data="list">
  <template #default="{ row, key2 }">
    <button v-if="key2 === 'op'">删除</button>
    <span v-else>{{ row[key2] }}</span>
  </template>
</MyTable>
```

**这就是"表格组件"能被复用的根本原因**：表格的结构是死的（子组件管），每格的内容是活的（父组件管）。

### 8.4 ⭐ 收敛时刻：插槽 = 模板方法模式

前面 §6.2 已经点了一次 `virtual`。把四个插槽特性一次对上：

| 插槽 | 面向对象 | 关系 |
|---|---|---|
| `<slot>` | `abstract` 方法 | 必须由子类实现 |
| `<slot>默认</slot>` | `virtual` 带默认体 | 不 override 就用它 |
| 具名插槽（多个 `name`） | 多个抽象方法 | 一个组件有多个扩展点 |
| **作用域插槽** | **钩子方法带参数** | **父类把内部数据当参数传给子类的实现** |

```csharp
// 作用域插槽 ≈ 这个
protected abstract void RenderRow(Row row, int index);
```

**子组件 = 父类（`MyTable` 定义骨架），父组件的插槽内容 = 子类（提供实现），`row` = 那个参数。**

一句话：**插槽不是"往洞里塞东西"，是"框架留给你实现的方法"。**

---

## 9. `my-tag` 组件封装（068-070 集）

三集做一个东西，正好把前面的知识串起来：

| 集 | 做什么 | 用到 |
|---|---|---|
| 068 | 创建组件、搭结构（`span` + `input`） | 组件注册 |
| 069 | 点击 `span` 进编辑、失焦/回车退出 | `v-if` / `v-show` / `@blur` / `@keyup.enter` |
| 070 | 让父组件能用 `v-model` 绑值 | `props: ['value']` + `$emit('input')` |

### 9.1 068：结构长什么样

```html
<div class="my-tag">
  <span v-if="!isEdit" @click="isEdit = true">{{ value }}</span>
  <input v-else v-model="editValue" @blur="isEdit = false" />
</div>
```

**关键设计**：`span` 和 `input` **同时只存在一个**（`v-if`/`v-else`），不是用 `display:none` 藏起来。

> 为什么？因为要"点一下就能直接输入"，`v-if` 让 input **新建**，配合 `v-focus`（§3.2 的指令）
> 或 `$nextTick` + `el.focus()` 才能拿到焦点。用 `v-show` 也行，但要额外手动 `focus()`。

### 9.2 069：显示隐藏的两种选择

| 写法 | 行为 | 适合 |
|---|---|---|
| `v-if` / `v-else` | 元素**销毁重建**，输入框里的临时状态丢失 | 编辑/展示这样**互斥**的两种形态 |
| `v-show` | 元素一直在，只是 `display:none` | 频繁切换、要保持内部状态 |

**`my-tag` 选 `v-if`**：编辑态和展示态是两套完全不同的东西，没必要都留着。

### 9.3 070：接上 `v-model`

```js
props: ['value'],          // ① v-model 默认约定：prop 名叫 value
methods: {
  onBlur() {
    this.$emit('input', this.editValue)   // ② 值变了 emit 一个叫 input 的事件
    this.isEdit = false
  }
}
```

父组件：

```html
<MyTag v-model="tagText" />
```

**这两行就是"组件支持 v-model"的全部秘密**（Vue--04 §4 已经推过一次，这里落地）。

> ⚠️ 别自己再定义一个 `isEdit` 的 prop 叫 `value`——名字撞了会出怪事。
> 一个组件只有一个 `value`，就是给 `v-model` 用的。

---

## 10. `my-table` 组件封装（071 集）

### 10.1 拆解：一个表格组件要收什么

| 输入 | 类型 | 谁决定 |
|---|---|---|
| 数据 | `props: { data: Array }` | 父组件 |
| 列有哪些 | `props: { columns: Array }` 或从第一条数据推 | 父组件 |
| 每一格怎么显示 | **作用域插槽** | 父组件 |

### 10.2 为什么"每一格"必须用作用域插槽

因为**子组件不知道父组件想要什么**：可能是文本、可能是链接、可能是三个按钮。

```html
<!-- 子组件只做一件事：把 row 递出去 -->
<td v-for="col in columns" :key="col">
  <slot :row="row" :col="col">{{ row[col] }}</slot>
</td>
```

`{{ row[col] }}` 是**后备内容**（§6）——父组件不管，就显示原始值。**一个字都没多写，默认行为就有了。**

### 10.3 三个特性同时出现在这几行里

```html
<slot :row="row" :col="col">{{ row[col] }}</slot>
```

| 部分 | 用的特性 |
|---|---|
| `:row` `:col` | 作用域插槽（往下递数据） |
| `{{ row[col] }}` | 后备内容（默认实现） |
| 在 `<td v-for>` 里 | 默认插槽 + 列表渲染 |

**能一眼看出这行里叠了三层机制，说明这一轮真的通了。**

---

==二：格式==

## 1. 插槽速查

```html
<!-- 子组件 -->
<slot></slot>                         <!-- 默认插槽 -->
<slot>后备内容</slot>                  <!-- 带默认值 -->
<slot name="header"></slot>           <!-- 具名插槽 -->
<slot :row="item" :index="i"></slot>  <!-- 作用域插槽：往外递数据 -->
```

```html
<!-- 父组件 -->
<Child>内容</Child>                                  <!-- 填默认插槽 -->
<Child><template #header>标题</template></Child>      <!-- 填具名插槽 -->
<Child><template #default="{ row }">...</template></Child>  <!-- 接作用域数据 -->
```

## 2. 指令速查

```js
// 全局
Vue.directive('focus', {
  inserted(el)        { el.focus() },              // 进 DOM 时
  update(el, binding) { /* binding.value 变了 */ } // 值变了
})

// 局部（组件内）
directives: {
  focus: { inserted(el) { el.focus() } }
}
```

```html
<input v-focus>
<div v-loading="isLoading"></div>
<div v-demo:left.foo="msg"></div>   <!-- arg=left, modifiers={foo:true}, value=msg -->
```

## 3. `$nextTick` 速查

```js
this.$nextTick(() => { ... })   // 回调式
await this.$nextTick()          // Promise 式（推荐）
```

## 4. Vue2 → Vue3 对照（本项目会用到的）

| 场景 | Vue2（课程） | Vue3 组合式（你项目） |
|---|---|---|
| 等渲染 | `this.$nextTick(fn)` | `await nextTick()` （`import { nextTick } from 'vue'`） |
| 全局指令 | `Vue.directive('x', {...})` | `app.directive('x', {...})` |
| 指令钩子名 | `bind` / `inserted` / `update` / `unbind` | `created` / `mounted` / `updated` / `unmounted` |
| 局部指令 | `directives: { x }` | `<script setup>` 里 `const vX = {...}`（**约定 `v` 前缀**） |
| 插槽（子） | `<slot name="a">` | 完全一样 |
| 插槽（父） | `<template #a>` | 完全一样 |

> ⚠️ **Vue3 的指令钩子改名了**，`inserted` → `mounted`、`unbind` → `unmounted`。
> 课程讲的是 Vue2 名字，项目里写 Vue3 要对上这张表。
>
> ⚠️ Vue3 `<script setup>` 里局部指令靠**命名约定**：变量名 `vFocus` 自动对应 `v-focus`。

## 5. 本轮 API 总表

| API | 作用 | 一句话 |
|---|---|---|
| 异步更新队列 | 攒着一起刷 DOM | 改完立刻读 DOM = 旧值 |
| `$nextTick` / `nextTick` | 等渲染完 | 回调里有 `el.xxx` 才需要 |
| `Vue.directive` | 注册指令 | 名字不带 `v-` |
| `inserted` / `update` | 指令的两个主力钩子 | 依赖会变的值 → 必须写 `update` |
| `binding.value` | 指令拿到的值 | 状态永远来自这里 |
| `<slot>` | 占位、传模板 | 作用域属于**父组件** |
| 后备内容 | `<slot>默认</slot>` | = `virtual` 的默认实现 |
| 具名插槽 | `name` + `#name` | 位置由坑决定 |
| 作用域插槽 | `<slot :row="x">` + `#default="{ row }"` | 子→父递数据 + 父→子递结构 |

---

==三：代码==

## 1. 完整可跑实验

存成 `Vue/代码演示/02-插槽与指令/01-本轮全部.html`，`lib/vue2.js` 用现成的本地副本，双击即跑。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>060-071 实验</title>
  <script src="../lib/vue2.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; }
    .box { border: 1px solid #ddd; padding: 10px; margin: 12px 0; }
    .card { border: 2px solid #4a90d9; padding: 8px; }
    .card__header { background: #eef4fc; padding: 4px; }
    .card__footer { background: #f6f6f6; padding: 4px; font-size: 12px; }
    .mask { position: absolute; inset: 0; background: rgba(255,255,255,.7);
            display: flex; align-items: center; justify-content: center; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #ddd; padding: 4px 8px; }
  </style>
</head>
<body>

<div id="app">
  <!-- ═══ ① 异步更新 与 $nextTick ═══ -->
  <div class="box">
    <p>DOM 里的数字：<b ref="num">{{ count }}</b></p>
    <button @click="change">+1（立刻读 DOM）</button>
    <p style="color:#c00">{{ log }}</p>
  </div>

  <!-- ═══ ② 自定义指令 v-loading ═══ -->
  <div class="box">
    <div v-loading="loading" style="min-height:80px; position:relative">
      这块区域会在 loading 时被盖住
    </div>
    <button @click="fakeRequest">{{ loading ? '请求中…' : '发一个假请求' }}</button>
  </div>

  <!-- ═══ ③ 具名插槽 + 后备内容 ═══ -->
  <div class="box">
    <my-card>
      <template #header>自定义标题</template>
      这里是主体内容（默认插槽）
      <!-- 不给 footer，看后备内容 -->
    </my-card>
  </div>

  <!-- ═══ ④ 作用域插槽：my-table ═══ -->
  <div class="box">
    <my-table :data="users">
      <!-- 父组件决定"操作"这一列长什么样 -->
      <template #default="{ row, col }">
        <button v-if="col === 'op'" @click="del(row)">删除</button>
        <span v-else>{{ row[col] }}</span>
      </template>
    </my-table>
  </div>
</div>

<script>
// ═══ ② v-loading：inserted + update 都写 ═══
Vue.directive('loading', {
  inserted(el, binding) { toggleMask(el, binding.value) },
  update(el, binding)   { toggleMask(el, binding.value) }
})

function toggleMask(el, on) {
  const old = el.querySelector('.mask')
  if (on && !old) {
    const mask = document.createElement('div')
    mask.className = 'mask'
    mask.textContent = '加载中…'
    el.appendChild(mask)
  } else if (!on && old) {
    old.remove()
  }
}

// ═══ ③ 具名插槽组件 ═══
Vue.component('my-card', {
  template: `
    <div class="card">
      <div class="card__header"><slot name="header">默认标题</slot></div>
      <div><slot></slot></div>
      <div class="card__footer"><slot name="footer">—— 默认页脚 ——</slot></div>
    </div>
  `
})

// ═══ ④ 作用域插槽组件 ═══
Vue.component('my-table', {
  props: { data: Array },
  data() { return { cols: ['name', 'age', 'op'] } },
  template: `
    <table>
      <tr><th v-for="c in cols" :key="c">{{ c }}</th></tr>
      <tr v-for="(row, i) in data" :key="i">
        <td v-for="c in cols" :key="c">
          <slot :row="row" :col="c">{{ row[c] }}</slot>
        </td>
      </tr>
    </table>
  `
})

new Vue({
  el: '#app',
  data: {
    count: 0,
    log: '',
    loading: false,
    users: [
      { name: '小沃', age: 3, op: '' },
      { name: '阿七', age: 5, op: '' }
    ]
  },
  methods: {
    // ① 对比：立刻读 是旧值，nextTick 里读 是新值
    change() {
      this.count++
      const now = this.$refs.num.textContent
      this.$nextTick(() => {
        const later = this.$refs.num.textContent
        this.log = `立刻读：${now} ｜ nextTick 里读：${later}`
      })
    },
    fakeRequest() {
      if (this.loading) return
      this.loading = true
      setTimeout(() => { this.loading = false }, 1500)
    },
    del(row) {
      this.users = this.users.filter(u => u !== row)
    }
  }
})
</script>
</body>
</html>
```

> **实测输出**（点一次「+1」）：`立刻读：0 ｜ nextTick 里读：1`
>
> 同一个 `$refs.num`，同一行代码，隔了一个 `$nextTick` 就从 `0` 变成 `1`。
> **这就是本轮唯一必须亲眼看一次的现象**——看完这一行，`$nextTick` 就再也不会忘。

## 2. 项目里的落点

| 本轮知识 | 落到 `DesktopPet` 哪一步 |
|---|---|
| `$nextTick` | **第 2 步**：消息列表滚动到底（原版 `TS/ui.ts` 是 `append` 后直接算 `scrollTop`） |
| `$nextTick` | **第 4 步**：气泡自动收起后重新计算位置 |
| `v-loading` | **第 6 步**：「测试 Key」按钮请求期间盖遮罩 |
| 作用域插槽 | **第 8 步**：`ChatPanel` 把每条 `message` 递给 `App.vue`，由父组件决定气泡长什么样 |
| 具名插槽 | **第 8 步**：`SettingsPanel` 的「形象 / 人设 / API」三段，可以用具名插槽拆 |
| `my-tag` 的编辑态切换 | **第 6 步**：「提示词可直接手改」的交互思路同源 |

> 第 8 步拆组件时，`ChatPanel.vue` 大概会长这样：
>
> ```html
> <ul class="pet__log">
>   <li v-for="m in messages" :key="m.id">
>     <slot name="message" :message="m">{{ m.text }}</slot>
>   </li>
> </ul>
> ```
>
> 这样「气泡怎么渲染」就交回 `App.vue`，`ChatPanel` 只负责列表和滚动。

---

==四：总结==

## 1. 一句话记住三个

1. **DOM 是异步更新的** —— 改完立刻读，拿到的是旧值，要等 `$nextTick`。
2. **自定义指令是"DOM 操作"的复用** —— 依赖会变的值，就必须写 `update`，只写 `inserted` 会静默失效。
3. **插槽是"结构"的复用，不是"数据"的复用** —— 插槽内容的作用域永远是**父组件**的。

## 2. ⭐⭐ 本轮要背的

| 要背 | 内容 |
|---|---|
| 异步更新的三条事实 | 批量、本轮之后刷、队列去重 |
| `$nextTick` 的判据 | 回调里有没有 `el.xxx`，没有就不用 |
| 指令注册 | `Vue.directive('裸名', { 钩子 })`，**不带 `v-`** |
| 指令两大钩子 | `inserted`（进 DOM 一次）/ `update`（值变了多次） |
| `binding` 四字段 | `value` / `oldValue` / `arg` / `modifiers` |
| 插槽作用域 | `<Child>...</Child>` 中间的内容属于**父组件** |
| 具名插槽写法 | 子：`<slot name="a">`，父：`<template #a>`，**必须包 `<template>`** |
| 作用域插槽写法 | 子：`<slot :row="x">`，父：`<template #default="{ row }">` |
| 后备内容 | `<slot>默认</slot>` = `virtual` 的默认实现 |

## 3. ⭐ 收敛时刻

**这一轮把前四轮的"通信"升级成了"扩展"。**

原来组件之间的关系是**固定的**：父传子（props）、子告父（emit）。这一轮之后，组件可以**留空给外面填**：

```
                     扩展点有三种
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
  数据（props）        结构（插槽）          行为（指令）
    │                     │                     │
 父 → 子              父 → 子（结构）        挂到元素上
                      + 子 → 父（作用域数据）
```

`<slot :row="row">` 这一行是本轮最特殊的一行——**它是整个 Vue 里唯一"数据往上、结构往下"同时发生的地方。**

再往上一层的收敛：**这三种扩展点，本质都是在写"模板方法模式"**：

| 扩展点 | 对应 OOP |
|---|---|
| `props` | 构造参数 |
| `<slot>` | 抽象方法 |
| `<slot>默认</slot>` | 虚方法默认实现 |
| 作用域插槽 | 带参数的钩子方法 |
| 自定义指令 | 附着在方法上的装饰器 / Filter |

**当你能用"模板方法"去理解一个组件库的 API 时，你就不需要文档了。**

## 4. 静默失败清单（本轮）

| 现象 | 真实原因 |
|---|---|
| 改完数据立刻读 `scrollHeight`/`offsetHeight`，是旧值 | 更新是异步的，要 `await nextTick()` |
| `v-loading` 第一次能显示，之后再也不变 | 只写了 `inserted`，值变化走 `update` |
| `v-loading` 的 `loading` 一直是 false，遮罩却显示着 | `binding.value` 读错字段（写成 `binding`） |
| 指令不生效，也没报错 | 注册名带了 `v-`，用的时候变成 `v-v-focus` |
| 插槽里写 `{{ msg }}` 报 undefined | 作用域是父组件的，子组件的 `msg` 拿不到 |
| `#header` 报了编译错误 | `v-slot` 只能写在 `<template>` 或组件标签上 |
| `#Header` 找不到 `name="Header"` | HTML 属性转小写 |
| 作用域插槽解构出来是 `undefined` | 名字和 `<slot :xxx>` 上的不一致（`{ row }` vs `:item="row"`） |
| 插槽内容显示在错误的位置 | 位置由**子组件 `<slot>` 的位置**决定，不是父组件写的顺序 |
| 用 `v-show` 切的 input 拿不到焦点 | 元素一直在，只是 `display:none`，`focus()` 需要 `nextTick` + 显式调 |
| Vue3 里指令写了 `inserted` 不触发 | Vue3 改名成 `mounted` |

## 5. C# 类比可用度

| 类比 | 档位 | 说明 |
|---|---|---|
| 异步更新队列 ↔ EF Core `ChangeTracker` | ⭐⭐⭐ | **几乎完全同构**：攒改动、统一提交、提交前读是旧值 |
| `<slot>` ↔ `abstract` 方法 | ⭐⭐⭐ | 留空由实现方填 |
| `<slot>默认</slot>` ↔ `virtual` 默认实现 | ⭐⭐⭐ | 不覆写就用它 |
| 作用域插槽 ↔ 带参钩子方法 | ⭐⭐⭐ | 框架把内部数据当参数递进来 |
| `props` ↔ 构造参数 | ⭐⭐⭐ | 已在前一轮确认 |
| 自定义指令 ↔ ASP.NET Core Filter | ⭐⭐ | 都是"声明式挂一段行为 + 有生命周期钩子"；只是 Filter 管请求管道，指令管 DOM 元素 |
| `$nextTick` ↔ `Dispatcher.BeginInvoke` | ⭐⭐ | 都是"排到 UI 更新之后"，但 WPF 那个是线程调度，Vue 这个是渲染队列 |

> ⚠️ 自定义指令**不要**类比成 C# 的 `Attribute`。
> `Attribute` 只是贴在代码上的**元数据**，本身不会执行任何行为，要靠反射去读；
> 指令是**真的会跑代码**的。这个类比对不上，会误导。

## 6. 解锁边界

**✅ 本轮新解锁**

异步更新队列 / `$nextTick` / `Vue.directive`（全局 + 局部）/ `inserted` `update` 等钩子 /
`binding` 对象 / 默认插槽 / 后备内容 / 具名插槽 / **作用域插槽** /
`my-tag` 这种"可编辑组件"的封装套路 / `my-table` 这种"数据驱动 + 插槽扩展"的封装套路
Vue3 对照：`nextTick()` / `app.directive` / 钩子改名 / `v` 前缀约定

**🔒 仍锁着**

| 类别 | 具体 | 何时解 |
|---|---|---|
| 路由 | `vue-router`、`router-link`、动态路由 | 072 集起（下一轮） |
| 状态管理 | Vuex / Pinia | 091 / 153 集 |
| `defineModel` | Vue3 的 v-model 语法糖 | 152 集 |
| 组合式全面 | `setup` / `reactive` / 生命周期函数 / `composables` | 140 集起 |
| 组件库 | Element UI / Ant Design Vue 的用法 | 课程不涉及，需要时现查 |
| 异步组件 / `Suspense` | 按需加载 | 课程不涉及 |

> ⚠️ **注意 `Vue.directive` 这个 API 在你项目里用不到。** 项目是 Vue3 + 单文件组件，
> 要写指令得用 `app.directive` 或 `<script setup>` 的 `v` 前缀约定（见 §二.4）。
> 本轮重点是**理解机制**，不是记住 Vue2 的调用方式。

## 7. 下一轮预告（072-0xx 集 · 路由）

**这一轮之后，你已经能写"组件"了。下一轮解决的是"页面"。**

| 集 | 内容 | 难度 |
|---|---|---|
| 072 | 单页应用程序 & 路由介绍 | 🟡 概念 |
| 073 | 路由的基本使用（`router-link` / `router-view`） | 🔴 必须停 |
| 074 | 组件目录存放问题（组件分类） | ⏭ 可跳 |
| 075 | 第 6 天课程介绍 | ⏭ 可跳 |
| 076 | 路由模块封装 | 🟡 |
| 077 | `router-link` 替代 `a` 标签 + 高亮 | 🟡 |

**为什么路由是分水岭**：前面所有代码都是"一个页面里堆组件"。路由一上，**组件树会分裂成多棵树**，然后立刻出现新问题——"两个页面要用同一份数据怎么办？" 那就是 Pinia 的入口。

**并轮判据**（下一轮开始前回答这两题）：

1. 改完 `data` 之后立刻读 `this.$el` 的尺寸，拿到的是新值还是旧值？为什么？
2. 作用域插槽解决的是什么问题——"父组件往子组件里塞结构"，还是"子组件往外递数据"？

两题全对 → 072-077 压缩到 1.5 小时（074、075 直接跳，076 只看思路）。
