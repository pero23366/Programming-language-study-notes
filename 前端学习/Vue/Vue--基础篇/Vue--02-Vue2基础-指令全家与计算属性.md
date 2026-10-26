# Vue--02 · Vue2 基础（002-035 集）：指令全家 · 计算属性 · 侦听器

> **对应课程**：002-035 集（第 1 天 + 第 2 天，约 10.5 小时）
> **读法**：每个语法点按「是什么 → 怎么写 → 为什么这么设计 → C# 对照 → 常见错法」拆开，代码只留最短片段。
> **本轮定位**：这 35 集是 **Vue 的模板能力全集**。学完它，Vue 能表达的东西你就都会了；后面 160 集讲的全是"怎么组织"，不是"还能写什么"。
> **前置**：V1（响应式、`new Vue`、`{{ }}`）已过。

---

==一：概念==

## 0. 这 35 集的地图

| 段落 | 集号 | 干什么 | 产出 |
|---|---|---|---|
| 第 1 天（上） | 003-007 | Vue 是什么 / 实例 / 插值 / **响应式** | 认知地基 |
| 第 1 天（中） | 008-019 | **九个指令** + 波仔的学习之旅 / 小黑的书架 | 模板能力 |
| 第 1 天（下） | 020-022 | 小黑记事本（增删改查全流程） | 第一个综合案例 |
| 第 2 天（上） | 024-026 | 修饰符 / `v-bind` 玩 class / `v-model` 覆盖所有表单 | 细节补齐 |
| 第 2 天（中） | 027-030 | **计算属性** + 成绩案例 | 第一个"逻辑层"概念 |
| 第 2 天（下） | 031-034 | **watch** + 水果购物车 | 第二个"逻辑层"概念 |

> 一句话概括这 35 集：**把"数据"变成"界面"，再从"数据"里算出"派生数据"。**

---

## 1. 指令是什么（008 集）

### 1.1 定义

**指令 = 写在 HTML 标签上的、以 `v-` 开头的特殊属性。** 只有 Vue 认识它，浏览器不认识。

```html
<p v-if="ok">看得见我</p>
```

浏览器看到 `v-if` 会当成一个无意义的自定义属性忽略掉。Vue 在接管这个元素时，把它**编译**成真正的 JS 逻辑。

### 1.2 三条铁律

| # | 规则 | 违反了会怎样 |
|---|---|---|
| 1 | **只能写在标签上**，不能写在 `{{ }}` 里 | 原样输出成文字 |
| 2 | **值是 JS 表达式**，不是字符串（除非你想传字符串） | `v-if="false"` 是布尔假；`v-if="'false'"` 是非空字符串 = 真 |
| 3 | **引号里不要加 `{{ }}`** | `v-text="{{ msg }}"` 会输出 `{{ msg }}` 这六个字符 |

> 第 2 条是最容易踩的：`v-if="'false'"` 加了一层引号，就从"假"变成了"真"。
> 因为**外层双引号是 HTML 的字符串边界，里层单引号才是 JS 的字符串**。

### 1.3 与 C# 的定位差异

C# 里没有"指令"这个层次。最接近的心智是：**指令是"把某个 DOM 操作的意图"声明在标记上**。

你在原生 JS 里写 `el.classList.add('hidden')`，是在**命令**某一次操作；
写 `v-show="!ok"`，是在**声明**这个元素与 `ok` 的关系。前者是一次性的，后者是持续的。

---

## 2. `v-html`（008 集）

### 2.1 语法

```html
<div v-html="htmlString"></div>
```

把字符串**当作 HTML 解析**后插入。等价于 `el.innerHTML = str`。

对比 `{{ }}`：插值是**文本**，`v-html` 是**结构**。

```js
data: { a: '<b>粗</b>' }
```
```html
<p>{{ a }}</p>     <!-- 页面显示字面量 <b>粗</b> -->
<p v-html="a"></p> <!-- 页面显示加粗的「粗」 -->
```

### 2.2 ⚠️ 它是个安全漏洞入口

`innerHTML` 会把字符串里的 `<script>`、`<img onerror=...>` 都执行。

```js
data: { userInput: '<img src=x onerror="alert(document.cookie)">' }
```
```html
<div v-html="userInput"></div>   <!-- 弹窗，Cookie 被读走 -->
```

**工程规则：`v-html` 只能喂"你自己产生的、或可信后端返回并已过滤的" HTML，绝不能喂用户输入。**

> 对比：`{{ }}` 之所以安全，是因为它走 `textContent`，字符串里的一切都被当文字。**这正是当初 `addMessage` 用 `textContent` 而不是 `innerHTML` 的原因。**

---

## 3. 条件渲染：`v-show` / `v-if` / `v-else-if`（009-010 集）

### 3.1 语法

```html
<p v-if="score >= 90">优</p>
<p v-else-if="score >= 60">及格</p>
<p v-else>不及格</p>
```

三个必须**紧挨着**写，中间不能插别的元素，否则 `v-else` 找不到配对（不会报错，只是不生效）。

### 3.2 🔴 `v-if` 和 `v-show` 的差别（全课程最高频考点）

| | `v-if` | `v-show` |
|---|---|---|
| DOM 里还有吗 | **没有**（真删了） | 有，`display:none` |
| 切换开销 | 大（销毁 / 重建） | 小（改个样式） |
| 首次开销 | 小（假就不渲染） | 大（先渲染再藏） |
| 组件生命周期 | 触发 `created`/`mounted`/`destroyed` | **不触发** |
| 内部状态 | **丢失**（重建后是新的） | 保留 |

**三个判据**：

1. **切回来还要不要原来的状态？** 要 → `v-show`（比如用户在输入框里打的字）
2. **切换频繁吗？** 频繁 → `v-show`（比如 tab 切换）
3. **一开始就大概率不显示吗？** 是 → `v-if`（省一次渲染，比如权限控制的按钮）

> 一句话：**`v-if` 管"存不存在"，`v-show` 管"看不看得见"。**

### 3.3 🔴 `v-if` 和 `v-for` 不要写在同一个元素上

```html
<!-- ❌ 别这么写 -->
<li v-for="item in list" v-if="item.done">{{ item.name }}</li>
```

问题在于**优先级**：

| 版本 | 谁先执行 | 后果 |
|---|---|---|
| Vue 2 | `v-for` 先 | `v-if` 里能拿到 `item`，能跑 |
| Vue 3 | **`v-if` 先** | `v-if` 里**拿不到 `item`**，直接报错 |

正确写法是套一层，或者先用 `computed` 过滤（见 §9.3）：

```html
<li v-for="item in doneList" :key="item.id">{{ item.name }}</li>
```

> 这个差异让"Vue2 能跑的代码搬到 Vue3 就崩"。**养成习惯：两个永远不写在一起。**

---

## 4. 事件绑定：`v-on`（011-013 集）

### 4.1 三种写法

```html
<!-- ① 内联：逻辑极短 -->
<button v-on:click="count++">+1</button>

<!-- ② 调方法：逻辑超过一行 -->
<button v-on:click="add">+1</button>

<!-- ③ 简写（实际项目全用它） -->
<button @click="add">+1</button>
```

`v-on:` 的简写是 `@`。`v-bind:` 的简写是 `:`（下一节）。

### 4.2 🔴 加不加括号，语义完全不同

```html
<button @click="add">A</button>      <!-- 传的是"函数本身"，事件对象自动作为参数 -->
<button @click="add()">B</button>    <!-- 立刻调用，拿不到事件对象 -->
<button @click="add(1)">C</button>   <!-- 传参 1，事件对象丢了 -->
```

**三个都要用怎么办？** Vue 给了个特殊变量 `$event`：

```html
<button @click="add(1, $event)">C+</button>
```

> 这是 JS 的固有机制，不是 Vue 的发明：`@click="add"` 相当于 `el.onclick = add`；
> `@click="add()"` 相当于 `el.onclick = () => add()` —— 后者当然拿不到事件。

### 4.3 `methods` 里的 `this` 为什么能用

```js
new Vue({
  data: { count: 0 },
  methods: {
    add() { this.count++ }   // this 指向实例
  }
})
```

Vue 会在初始化时**把 `methods` 里每个函数的 `this` 绑定到实例上**（内部做了一次 `bind`）。

这跟你在 C# 里给类写方法、方法里访问 `this.Count` 是一个体验 —— 但机制不同：C# 是编译器保证，Vue 是运行时 `bind`。

> 反过来说：**用箭头函数写 methods 会坏掉**，因为箭头函数不认 `bind`，`this` 会指向外层（通常是 `window`）。
> 这不是 Vue 的坑，是 JS 箭头函数的规则。

---

## 5. 属性绑定：`v-bind`（014、025 集）

### 5.1 为什么需要它

`{{ }}` 只能用在**文本位置**。标签的**属性**里不能用：

```html
<a href="{{ url }}">链接</a>   <!-- ❌ 原样输出 "{{ url }}" -->
<a v-bind:href="url">链接</a>  <!-- ✅ -->
<a :href="url">链接</a>        <!-- ✅ 简写，实际都用这个 -->
```

**原因**：`{{ }}` 是文本插值，浏览器在解析标签属性时，Vue 还没来得及介入。

### 5.2 能绑的类型

| 绑什么 | 例子 |
|---|---|
| 普通字符串属性 | `:href` `:src` `:title` `:placeholder` |
| 布尔属性 | `:disabled` `:checked` `:readonly` |
| 布尔属性（显式表） | `:disabled="flag"`，`flag` 为假时**属性整个消失**，不是 `disabled="false"` |
| 对象属性 | `:class` `:style`（特殊语法，见下） |
| 自定义属性 | `:data-id="x"` |

> ⚠️ 布尔属性那里有个经典坑：HTML 里 `disabled="false"` 依然是**禁用**的（属性存在即生效）。
> 所以必须用 `v-bind` 让整个属性消失，而不能手写字符串。

### 5.3 `:class` 的三种写法（025 集）

```html
<!-- ① 字符串：适合整体切换 -->
<div :class="isActive ? 'active' : ''">

<!-- ② 对象：适合多类名各自独立开关（最常用） -->
<div :class="{ active: isActive, 'text-red': hasError }">

<!-- ③ 数组：适合多个来源组合 -->
<div :class="['base', isActive ? 'active' : '']">
```

**和静态 class 共存**：`class="btn"` 和 `:class="{active: x}"` 会**合并**，不覆盖。

```html
<div class="btn" :class="{ active: isActive }">
<!-- 结果：class="btn active" -->
```

> ⚠️ ② 的写法里，**带横线的类名必须加引号**：`{'text-red': x}`。
> 不加引号，JS 会把它当成 `text - red`（减法），直接报错。

---

## 6. 列表渲染：`v-for`（016-018 集）

### 6.1 语法

```html
<!-- 数组 -->
<li v-for="(item, index) in list" :key="item.id">{{ index }} - {{ item.name }}</li>

<!-- 对象 -->
<li v-for="(value, key) in obj" :key="key">{{ key }}: {{ value }}</li>

<!-- 数字（从 1 开始，不是 0） -->
<span v-for="n in 5" :key="n">{{ n }}</span>
```

**注意参数顺序**：数组是 `(值, 下标)`，对象是 `(值, 键)`。想反了不报错，只是拿到的都是 `undefined`。

### 6.2 🔴🔴 `:key` 到底是什么（018 集，本段唯一必须停的点）

**先说结论：`:key` 是给 Vue 的 diff 算法用的"身份标识"。**

当列表变化时，Vue 不会重建整个列表，而是**逐项比对**：这个位置上的新旧节点，是不是"同一个东西"？

- 是同一个 → **复用** DOM，只更新变化的部分
- 不是 → 销毁旧的，创建新的

`key` 就是判断"是不是同一个东西"的依据。

### 6.3 用 `index` 当 key 会怎样

假设列表是三个输入框，每个都能打字：

```
列表：[A, B, C]，index 作 key → key 分别是 0, 1, 2
```

现在**在头部插入**一项 X：

```
新列表：[X, A, B, C]，index 作 key → key 依然从 0 开始
```

Vue 的视角：

| index | 旧值 | 新值 | 判断 | 动作 |
|---|---|---|---|---|
| 0 | A | X | key 相同 → 是同一个 | **复用 A 的 DOM**，只把文字改成 X |
| 1 | B | A | key 相同 → 是同一个 | **复用 B 的 DOM** |
| 2 | C | B | key 相同 → 是同一个 | **复用 C 的 DOM** |

**结果**：文字全对，但**输入框里已经打的字错位了** —— 每个 DOM 的"内部状态"（光标、输入内容、勾选状态）跟着 DOM 走，不跟着数据走。

> 这就是"静默失败"的典型：**看起来是对的，交互是错的。**
> 用 `item.id` 作 key，插入 X 时 key 为 `'x'`，Vue 一眼看出"这是个新东西"，会新建节点，其余保持不动。

### 6.4 什么时候 `index` 可以接受

只有一种情况：**列表是纯静态展示，永远不插入/删除/排序，且每一项没有内部状态。**

否则一律用业务 id。**找不到 id 就先造一个**（`let nextId = 1`，见项目里的 `addMessage`）。

### 6.5 Vue3 里还有个额外好处

Vue2 用 `index` 作 key 在"只删除末尾"时碰巧不出错，所以很多人以为没问题；
Vue3 的 diff 算法更激进，错误会更早暴露。**这不是 Vue3 变差了，是不再掩盖问题。**

---

## 7. 表单双向绑定：`v-model`（019、026 集）

### 7.1 它是什么

`v-model` 让"数据"和"表单控件的值"双向同步：

```html
<input v-model="msg">
<p>{{ msg }}</p>
```

打字 → `msg` 变；改 `msg` → 输入框变。

### 7.2 🔵 它只是个语法糖

**`v-model` 不是新机制，是下面这行的简写**：

```html
<input :value="msg" @input="msg = $event.target.value">
```

等价于：**`v-bind` 负责"数据 → 视图"，`v-on` 负责"视图 → 数据"**。两件事拼起来叫"双向"。

> 理解这一点，后面 Vue3 的 `v-model` 用在组件上、`.sync` 修饰符、`defineModel`，全都能自己推出来。
> 所谓"双向绑定"从来不是一种特殊能力，是**两个单向**叠在一起。

### 7.3 不同控件的差异（026 集）

Vue 会根据元素类型自动选正确的取值方式：

| 控件 | 取值的属性 | 绑定的是 |
|---|---|---|
| `<input type="text">` | `value` | 字符串 |
| `<textarea>` | `value` | 字符串（**注意：不能用 `{{ }}` 写在标签中间**） |
| `<input type="checkbox">` 单个 | `checked` | **布尔** |
| `<input type="checkbox">` 多个 | `checked` | **数组**（选中的 value 集合） |
| `<input type="radio">` | `checked` | 选中的那个 `value` |
| `<select>` | `value` | 选中项的 `value` |

```html
<input type="checkbox" v-model="hobbies" value="唱"> 唱
<input type="checkbox" v-model="hobbies" value="跳"> 跳
<!-- hobbies 是数组，勾选后变成 ['唱', '跳'] -->
```

> ⚠️ 复选框多选必须写 `value`，否则数组里塞的是 `null`。这个不报错。

---

## 8. 修饰符（024 集）

**修饰符 = 用 `.` 加在指令后面的小开关**，用来改指令的默认行为。

### 8.1 事件修饰符

| 修饰符 | 作用 | 等价于原生 |
|---|---|---|
| `.prevent` | 阻止默认行为 | `e.preventDefault()` |
| `.stop` | 阻止冒泡 | `e.stopPropagation()` |
| `.once` | 只触发一次 | `{ once: true }` |
| `.self` | 只有点自己才触发（点子元素不算） | 手动判断 `e.target === e.currentTarget` |

```html
<a href="https://x.com" @click.prevent="go">不会跳转</a>
<form @submit.prevent="submit">回车不刷新页面</form>
```

> `@submit.prevent` 是实际项目里出现频率最高的一个 —— **表单默认提交会让整个页面刷新**，Vue 是单页应用，一刷新状态全没了。

### 8.2 表单修饰符（配合 `v-model`）

| 修饰符 | 作用 |
|---|---|
| `.trim` | 自动去首尾空格 |
| `.number` | 转成数字（转不了就原样返回字符串） |
| `.lazy` | 从 `input` 事件改成 `change`（失焦才同步） |

```html
<input v-model.trim="name">
<input v-model.number="age">
```

> `.number` 的坑：`v-model.number` 输入 `"abc"` 得到的是字符串 `"abc"`，不是 `NaN`。
> 它只做"能转就转"，不保证结果一定是数字。

---

## 9. 计算属性 `computed`（027-030 集）🔥

### 9.1 它解决什么问题

需求：显示"名字 + 性别"，且随输入变化。

**方案 A：模板里写表达式**
```html
<p>{{ firstName + ' ' + lastName }}</p>
```
问题：复杂逻辑不能写（模板里只能放表达式），且没法复用。

**方案 B：`methods`**
```js
methods: { fullName() { return this.first + this.last } }
```
```html
<p>{{ fullName() }}</p>
```
问题：**每次重新渲染都会执行一遍**，哪怕依赖没变。

**方案 C：`computed`**
```js
computed: { fullName() { return this.first + this.last } }
```
```html
<p>{{ fullName }}</p>    <!-- 注意：不加括号 -->
```
**依赖不变就不重算。**

### 9.2 🔴🔴 缓存（028 集）—— 这是 `computed` 存在的唯一理由

可自证：在函数里加一行 `console.log`，然后点别的按钮让页面重渲染。

```js
computed: {
  total() { console.log('computed 执行'); return this.price * this.count }
},
methods: {
  total2() { console.log('method 执行'); return this.price * this.count }
}
```

| 操作 | `computed` 打印次数 | `methods` 打印次数 |
|---|---|---|
| 首次渲染 | 1 | 1 |
| 改 `count`（是依赖） | +1 | +1 |
| 改**不相关**的字段触发重渲染 | **0** | **+1** |
| 模板里引用 3 次 | 1（只算一次） | **3 次** |

**这就是"缓存"**：`computed` 把结果存起来，依赖没变就直接返回。

### 9.3 什么时候用哪个

| 场景 | 用 |
|---|---|
| 从现有数据**算出**一个新值 | `computed` |
| 需要传参 | `methods` |
| 有副作用（请求、改别的数据） | `methods` 或 `watch` |
| 只是想过滤列表 | `computed` |

```js
// 典型：列表过滤，用 computed
computed: {
  doneList() { return this.list.filter(x => x.done) }
}
```

> C# 对照：`computed` 最像**带缓存和依赖追踪的只读属性**。
> `methods` 像普通方法。`IQueryable` 的"延迟执行"是另一个方向的类比，不要混。

### 9.4 完整写法：get + set（029 集）

不写 `set` 时，`computed` 是**只读**的 —— 直接赋值会警告且无效。

需要可写时：

```js
computed: {
  fullName: {
    get() { return this.first + ' ' + this.last },
    set(val) { const [a, b] = val.split(' '); this.first = a; this.last = b }
  }
}
```

**什么时候需要**：某个值既要"算出来"，又要"能反推回源数据"（比如日期区间、全选/反选）。

```js
// 全选：get 由子项算出，set 把子项全改掉
allChecked: {
  get() { return this.list.every(x => x.checked) },
  set(v) { this.list.forEach(x => x.checked = v) }
}
```

> ⚠️ `get` 里**不能改别的响应式数据**，否则会无限循环。这是 Vue 会警告的少数情况之一。

---

## 10. 侦听器 `watch`（031-033 集）

### 10.1 和 `computed` 的分工

| | `computed` | `watch` |
|---|---|---|
| 目的 | **算出一个值** | **值变了做一件事** |
| 有没有返回值 | 有 | 没有 |
| 典型用途 | 显示派生数据 | 发请求、存本地、操作 DOM、改别的状态 |
| 能不能异步 | 不能（要同步返回） | 能 |

**一句话**：**`computed` 关心"变成什么"，`watch` 关心"变了之后干什么"。**

### 10.2 简写

```js
watch: {
  keyword(newVal, oldVal) {
    console.log('从', oldVal, '变成', newVal)
  }
}
```

名字必须和要监听的数据**同名**。

### 10.3 完整写法：`deep` 和 `immediate`（033 集）

```js
watch: {
  user: {
    handler(newVal) { /* ... */ },
    deep: true,        // 监听对象内部属性的变化
    immediate: true    // 初始化时立刻执行一次
  }
}
```

**`deep` 的坑**：监听一个对象，改它里面的属性，**不加 `deep` 根本不触发**。

```js
data: { user: { name: '小黑' } }
watch: { user() { ... } }          // ❌ 改 user.name 不触发
watch: { user: { deep: true } }    // ✅ 触发
```

原因：`watch` 默认比较的是**引用**。`user.name = 'x'` 没有换引用，所以 Vue 认为"没变"。

> ⚠️ 但注意：**这不影响界面更新**。`deep` 只影响 `watch` 是否被通知，响应式本身照样工作。
> 很多人的困惑来自把这两件事混在一起。

**`immediate` 的用途**：进页面就要跑一次（比如用默认关键词查一次列表），不用在 `mounted` 里再写一遍。

### 10.4 什么时候不该用 `watch`

如果目的是"算出一个值"，用 `computed`。用 `watch` 去改另一个数据来实现派生，是反模式：

```js
// ❌ 能用 computed 就别用 watch
watch: { price() { this.total = this.price * this.count } }

// ✅
computed: { total() { return this.price * this.count } }
```

> 前者有三个问题：多维护一个状态、初始化时不会自动算、容易漏掉某个依赖。

---

==二：格式==

## 1. 指令总表（003-035 全集）

| 指令 | 简写 | 作用 | 值类型 |
|---|---|---|---|
| `v-text` | — | 设文本 | 表达式 |
| `v-html` | — | 设 HTML（⚠️ XSS） | 表达式 |
| `v-show` | — | `display:none` | 布尔 |
| `v-if` / `v-else-if` / `v-else` | — | 增删 DOM | 布尔 |
| `v-on` | `@` | 绑事件 | 函数 / 表达式 |
| `v-bind` | `:` | 绑属性 | 任意 |
| `v-for` | — | 循环 | 数组 / 对象 / 数字 |
| `v-model` | — | 双向绑定 | 任意可写数据 |
| `v-cloak` | — | 防首屏闪烁（配合 CSS） | 无值 |

## 2. 易混对照表

| 组 | 左边 | 右边 | 一句话分清 |
|---|---|---|---|
| 1 | `v-if` | `v-show` | 删不删 DOM |
| 2 | `{{ }}` | `v-html` | 文本 vs 结构（安全 vs 危险） |
| 3 | `computed` | `methods` | 有缓存 vs 每次都跑 |
| 4 | `computed` | `watch` | 算值 vs 做事 |
| 5 | `@click="fn"` | `@click="fn()"` | 传函数 vs 立刻调用 |
| 6 | `:class="'a'"` | `:class="{a: x}"` | 固定 vs 按条件 |
| 7 | `v-model` | `:value` + `@input` | 同一个东西，前者是糖 |
| 8 | `:key="item.id"` | `:key="index"` | 身份 vs 位置 |

## 3. Vue ↔ C# 对照

| Vue | C# / .NET | 档位 | 说明 |
|---|---|---|---|
| `v-for` | LINQ `Select` | ⭐⭐⭐ | 都是"把集合映射成另一种形态" |
| `computed` | 带缓存的只读属性 | ⭐⭐⭐ | 依赖不变不重算 |
| `methods` | 普通方法 | ⭐⭐⭐ | 每次调用都执行 |
| `watch` | `PropertyChanged` 订阅 / EF 拦截器 | ⭐⭐ | 都是"变了之后做事" |
| `v-model` | 双向绑定 | ⭐⭐ | 本质是两个单向 |
| `v-html` | `Html.Raw()` | ⭐⭐⭐ | **都是"信任输入"的开关，都有 XSS 风险** |
| `:key` | 无直接对应 | 🆕 | 虚拟 DOM diff 独有 |
| `v-if` 的优先级坑 | 无 | 🆕 | — |

---

==三：代码==

## 1. 三个案例的套路（不是抄代码）

这 35 集安排了 3 个案例 + 2 个综合案例，它们的结构是同一个模板：

| 步骤 | 做什么 | 对应知识点 |
|---|---|---|
| 1 | 把数据放进 `data` | 响应式 |
| 2 | 用 `{{ }}` / `v-for` 把数据渲染出来 | 插值 / 列表 |
| 3 | 用 `@click` 接住交互 | 事件 |
| 4 | 在 `methods` 里改数据 | 改状态 |
| 5 | 界面自动更新 | **不用写任何 DOM 代码** |

**第 5 步是 Vue 的全部价值。** 你回头看 020-022 的小黑记事本：增、删、统计、清空四个功能，
写了 4 个方法，**没有一个 `createElement`、没有一个 `innerHTML`**（除了清空时可能用 `list = []`）。

## 2. `computed` 缓存的实证代码

```js
new Vue({
  el: '#app',
  data: { price: 10, count: 2, other: 0 },
  computed: {
    total() { console.log('computed'); return this.price * this.count }
  },
  methods: {
    total2() { console.log('method'); return this.price * this.count }
  }
})
```
```html
<p>{{ total }} / {{ total2() }}</p>
<p>{{ total }} / {{ total2() }}</p>
<input v-model.number="other">
```

改 `other`（跟总价无关）→ 控制台只会多出 2 条 `method`，`computed` 一条不增加。

## 3. `watch` 的两种典型用法

```js
// ① 搜索框：输入变了就请求（实际项目会配防抖）
watch: {
  keyword: { handler: 'fetchList', immediate: true }
}
```

```js
// ② 监听对象内部字段
watch: {
  'user.name'(val) { /* 可以直接监听到具体路径，不用 deep */ }
}
```

> 第二条技巧课程没讲：**监听具体路径字符串比 `deep: true` 精确得多**，不会因为对象的其他字段变化而误触发。

---

==四：总结==

## 1. 一句话记住三个

1. **`v-if` 删 DOM，`v-show` 藏 DOM；`computed` 有缓存，`methods` 没有。**
2. **`v-model` 是两个单向拼出来的，不是魔法。**
3. **`:key` 是身份，不是序号 —— 用 index 会在插入时让 DOM 状态错位，而且不报错。**

## 2. ⭐⭐ 本轮要背的

| 要背 | 内容 |
|---|---|
| 两个简写 | `:` = `v-bind`，`@` = `v-on` |
| `v-if` 三兄弟 | 必须紧挨着写 |
| `:class` 对象语法 | `:class="{ active: isActive }"`，带横线的键要加引号 |
| `v-model` 的糖 | `:value` + `@input` |
| 事件传参 | `@click="fn"` 传函数，`@click="fn()"` 立刻调用，要事件对象用 `$event` |
| `computed` 不写括号 | 模板里 `{{ total }}`，不是 `{{ total() }}` |
| `watch` 默认浅比较 | 监听对象内部要 `deep` 或写具体路径 |
| `:key` | 用业务 id，不用 index |

## 3. ⭐ 收敛时刻

这 35 集其实只讲了两件事，但它们把所有零散语法串起来了：

**第一件：数据 → 界面（单向）**

`{{ }}` / `v-bind` / `v-if` / `v-for` 全是这一件事的不同形态 ——
文本、属性、存在与否、重复几次。**它们都不改数据，只负责"显示"。**

**第二件：界面 → 数据（反向）**

`v-on` / `v-model` 是这一件事。`v-model` 只是把"读值 + 写值"两个动作打包。

**而 `computed` / `watch` 是第三条线：数据 → 数据。**

画成一张图就是：

```
        ┌──────────── computed / watch ─────────────┐
        ↓                                          │
     数据  ──────── {{ }} / v-bind / v-if / v-for ──→  界面
        ↑                                          │
        └──────────── v-on / v-model ───────────────┘
```

> **Vue 的全部设计都在管这三条箭头。** 后面 160 集（组件、路由、状态管理）不会加新箭头，
> 只会改变"数据"和"界面"的粒度和归属（从整个页面切到组件，从局部切到全局）。

## 4. 静默失败清单（这 35 集全部）

| 现象 | 真实原因 |
|---|---|
| `:key` 用 index，插入后输入框内容错位 | diff 按位置复用 DOM，内部状态跟着 DOM 走 |
| `v-if` 和 `v-for` 同级，Vue3 里报 `item is not defined` | Vue3 中 `v-if` 优先级更高，先执行、拿不到 `item` |
| `v-model.number` 输入字母，得到字符串 | 只做"能转就转"，不保证是数字 |
| 多选复选框 v-model 出来是 `[null]` | 忘了写 `value` |
| `:class` 带横线的类名不加引号，报语法错 | JS 把它当减法 |
| `computed` 里直接赋值，没反应 | 没写 `set`，是只读的 |
| `watch` 监听对象内部属性不触发 | 默认比较引用，要 `deep` 或写 `'obj.prop'` |
| `watch` 里改了监听的数据，死循环 | 在 handler 里又赋了同一个值，加判断或改 `computed` |
| `@click="fn()"` 里拿不到 `event` | 立刻调用了，没把事件传进去 → 用 `$event` |
| 布尔属性写 `:disabled="false"` 仍然禁用 | 你写的是静态 `disabled="false"`，得用 `:disabled` |
| `v-else` 不生效 | 中间隔了别的元素，配对失败 |
| `v-html` 弹窗 / 被注入脚本 | 喂了用户输入 |

> 这 12 条**全都不报错**（除了第 2、5 条是编译期错误）。判据还是那句：
> **别问"会不会报错"，问"行为是不是我想要的"。**

## 5. C# 类比可用度

| 类比 | 档位 | 说明 |
|---|---|---|
| `v-for` ↔ LINQ `Select` | ⭐⭐⭐ | 都是映射，都声明"每一项变成什么" |
| `computed` ↔ 带缓存的只读属性 | ⭐⭐⭐ | 依赖不变不重算 |
| `v-html` ↔ `Html.Raw()` | ⭐⭐⭐ | 都是"信任输入"开关 |
| `v-model` ↔ 双向绑定 | ⭐⭐ | 本质是两个单向 |
| `watch` ↔ 事件订阅 | ⭐⭐ | 概念通，触发条件不同（引用 vs 通知） |
| `:key` ↔ ？ | ❌ | 虚拟 DOM diff 独有，C# 的 UI 框架里没有等价物 |
| `v-if` 优先级 | ❌ | 版本差异，无类比 |

## 6. 解锁边界

**✅ 本轮新解锁（Vue2 模板能力全开）**

`v-html` / `v-show` / `v-if` / `v-else-if` / `v-else` / `v-on`（含 `$event` 与传参）/
`v-bind`（含 `:class` 对象与数组语法） / `v-for`（含 `:key`） / `v-model`（含所有表单元素）/
事件修饰符（`.prevent` `.stop` `.once` `.self`） / 表单修饰符（`.trim` `.number` `.lazy`） /
`computed`（简写 + get/set） / `watch`（简写 + `deep` + `immediate`）

**🔒 仍锁着**

| 类别 | 具体 | 何时解 |
|---|---|---|
| 生命周期 | `created` / `mounted` / `beforeDestroy` | 036-038 集（第 3 天） |
| 工程化 | npm / Vite / `.vue` 单文件 / 组件注册 | 040 集起 |
| 组件通信 | `props` / `$emit` / `ref` / `$nextTick` | 048 集起 |
| 插槽 / 自定义指令 | `<slot>` / `Vue.directive` | 060 集起 |
| 路由 / 状态 | vue-router / Vuex | 072 集起 |
| 动画 / 过渡 | `<transition>` | 课程未覆盖，按需 |
| **Vue3 组合式** | `setup` / `ref` / `reactive` / `computed()` / `watch()` | 140 集起 |

> ⚠️ 注意最后一行：**你在项目 `Vue/App.vue` 里已经在用组合式的 `ref` 了**，但课程要到 140 集才讲。
> 这是项目驱动的正常现象 —— 工具先用了，原理后补。

## 7. 下一步（036-038 集 · 生命周期）

3 集约 30 分钟，是第 3 天的开头。内容：

| 集 | 内容 |
|---|---|
| 036 | 生命周期的四个阶段 |
| 037 | 两个例子：初始化渲染、获取焦点 |
| 038 | 小黑记账清单（渲染 + 添加 + 删除） |

**并轮判据**（开始前先回答）：

1. `created` 和 `mounted` 的分界是"DOM 有没有生成"，那么"发请求拿数据"应该放哪个？为什么两个都能放？
2. 想在 `mounted` 里立刻拿到一个 `v-if="false"` 的元素的 DOM，能拿到吗？

两题全对 → 36-38 压缩成一集看，直接进 039 之后的工程化。
错一道 → 只讲错的那个点。
