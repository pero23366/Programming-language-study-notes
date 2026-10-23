# Vue--01 · Vue 是什么 · 实例与响应式

> **对应课程**：002-007 集（第 1 天开头 6 集，约 59 分钟）
> **读法**：全文贯穿 **Vue ↔ C# / EF Core / 原生 JS** 对照 —— 读者是资深 C# 后端，前端已学完 JS/TS，只讲差异与坑。
> **本轮定位**：这 6 集只解决一个问题 —— **响应式是什么，以及它会怎么骗你**。这是全课程地基，宁可慢。
> **前置补丁**：无。本轮用单文件 HTML + 本地 `vue2.js`，不需要 npm、不需要构建工具。

---

==一：概念==

## 1. 没有 Vue 的世界（集 003）

**先用你已经踩过的坑开题。** JS 进阶篇你写过一段"渲染列表"的代码，当时最大的收获是这句：

> **忘调 `render()`，页面就是不动，而且不报错。**

那就是命令式的全部代价。

### 1.1 同一个需求，两种写法

需求：一个能加待办的列表 + 计数。**实验 01** 左右并排跑着，点两边的按钮看差别。

| | 原生 JS（命令式） | Vue（声明式） |
|---|---|---|
| 你有几份"真相" | **两份**：`count` 数组 + DOM 树 | **一份**：`data` |
| 谁保证两者一致 | 你手写的 `render()` | 框架 |
| 忘了会怎样 | 界面不同步，**不报错** | 不存在"忘"这回事 |
| 加一个字段要改几处 | 数据 + `render()` + HTML 模板 | 数据 + 模板 |
| 代码在描述什么 | **怎么改**（先清空、再循环、再 append） | **要什么**（列表长这样） |

> **一句话**：命令式是你开车，声明式是你告诉司机去哪儿。

### 1.2 为什么这个区别在"列表 + 频繁更新"上会放大

单次渲染看不出差距。但当你需要在"数据变了之后同步界面"的地方有 20 处时：

- 命令式：20 处都得记得调 `render()`，且每处都要考虑"是局部改还是全量重绘"
- 声明式：20 处都只是赋值，剩下的框架算

这就是 Vue 存在的理由。**不是让你少写代码，是让你少写"同步逻辑"。**

---

## 2. Vue 是什么（集 003）

### 2.1 官方定义，翻译成人话

**"渐进式 JavaScript 框架"** —— 渐进式的意思是：你可以只用它渲染一个角落，也可以拿它做一个完整应用。没有"必须全家桶才能用"的门槛。

它给你的核心能力就两条：

| 能力 | 含义 | 对应你熟悉的什么 |
|---|---|---|
| **声明式渲染** | 你描述界面"长什么样"，框架负责改 DOM | XAML + 数据绑定 |
| **响应式** | 数据变了，依赖它的界面自动更新 | `INotifyPropertyChanged` + Binding |

### 2.2 🔵 撞名警告：两个"响应式"

| | Vue 的响应式 | Rx.NET / Reactive Extensions |
|---|---|---|
| 英文 | reactivity | reactive programming |
| 解决什么 | **数据 → 视图**的单向同步 | **事件流**的组合与变换 |
| 核心机制 | 拦截属性读写（`defineProperty` / `Proxy`） | `IObservable<T>` + 操作符链 |
| 你能类比的 | EF Core 的变更追踪 | LINQ to Events |

> 你在 .NET 里听到"响应式"想到 Rx，是**完全不同的东西**。Vue 这门课从头到尾说的都是前一个。
> 中文翻译把它们撞在一起了，这不是你的问题。

### 2.3 Vue 的位置：它到底解决什么问题

**先给结论：Vue 不是抽象层，是同步层。** 它不解决"多态"那种"调用方与实现解耦"，它解决的是"**数据变了，界面怎么跟着变**"。

**Vue 之于 DOM = EF Core 之于数据库。** 这个类比是准的：

| | 手写 ADO.NET | EF Core | | 手写 DOM | Vue |
|---|---|---|---|---|---|
| 谁写同步代码 | 你 | 框架 | | 你 | 框架 |
| 怎么表达意图 | 拼 SQL 字符串 | LINQ / 改实体属性 | | `createElement` + `appendChild` | 模板 |
| 变更追踪 | 无 | ChangeTracker 快照对比 | | 无 | getter/setter（V2）/ `Proxy`（V3） |
| 忘记同步的后果 | 数据库和内存对象不一致 | 不存在 | | 界面和数据不一致 | 不存在（除 §5 的边界） |

```csharp
// EF Core：改对象属性，UPDATE 由框架生成
var user = await db.Users.FirstAsync(u => u.Id == 1);
user.Name = "小美";              // 没有 SqlCommand，没有 ExecuteNonQuery
await db.SaveChangesAsync();     // ← 唯一的显式提交点
```

```js
// Vue：改数据属性，DOM 由框架更新
this.name = '小美';              // 没有 createElement，没有 appendChild
                                 // ← 连 SaveChanges 都没有：赋值那一刻就同步了
```

> ⭐ **本轮最重要的一句**：`Object.defineProperty` 把每个属性换成 getter/setter，
> 等价于 EF Core 在实体属性上装的那个"变更追踪器"。下一节把这 15 行摊开给你看。
>
> 📌 附注：WPF 里也有同类机制（数据绑定 + `INotifyPropertyChanged`）。**没深用过 WPF 完全不影响本课**，
> 后面所有内容都只依赖 C#、EF Core 和原生 JS。

### 2.4 🔵 别把它想成"多态"

你这个类比值得正面回答，因为它是**错的**，而且错得很有代表性。

多态解决的是"**调用方不关心具体实现**"：

```csharp
interface IPayment { void Pay(decimal amount); }
// 调用方只写 payment.Pay(100)，不知道也不关心是微信还是支付宝
```

Vue 里**没有"接口"这一层**。组件确实可以替换（同一个位置放不同组件），但那是次要副作用，不是核心。

| | 多态 | Vue |
|---|---|---|
| 解决的问题 | 调用方与实现**解耦** | 状态与视图**同步** |
| 靠什么实现 | 虚方法表 / 接口分派 | 拦截属性读写 |
| 不用它会怎样 | 到处 `if (type == "微信")` | 到处手写 DOM 操作 |
| **还能不能写出来** | 能，用 switch 硬写 | **能**，用原生 JS 写 |

**判据在这里**：如果 Vue 是"多态"，那离开它你就写不出页面。事实是你用原生 JS 写得出来 —— **只是累**。

> **累 = 同步成本，不是抽象缺失。** 框架卖的是"省掉手写同步"，不是"提供一种新的抽象能力"。

---

## 3. 创建一个实例（集 004）

### 3.1 最小可运行结构

```html
<div id="app">{{ msg }}</div>

<script src="../lib/vue2.js"></script>
<script>
  new Vue({
    el: '#app',              // 挂载点：Vue 接管这个元素内部
    data: {                  // 状态：界面要用的所有数据
      msg: 'Hello Vue'
    }
  });
</script>
```

三件事，一一对应：

| 写法 | 是什么 | C# 里对应 |
|---|---|---|
| `el: '#app'` | **挂载点**，Vue 接管这个 DOM 的内部 | 类似 `DbContext` 的作用域：一段被接管的区域 |
| `data: {}` | **状态**，唯一的真相来源 | 被追踪的实体对象 |
| `new Vue({...})` | **实例**，把上面两者连起来的对象 | `DbContext` 实例：持有状态 + 提供操作入口 |

### 3.2 🔵 撞名：「实例」不是普通对象

C# 的 `new Foo()` 出来的是一个普通对象。Vue 的 `new Vue()` 出来的是一个**带响应式系统和渲染能力的 ViewModel**。

控制台自证（**实验 01** 已内建，F12 看输出）：

```js
const vm = document.querySelector('#app').__vue__;
Object.keys(vm).slice(0, 8)
// → ['_uid', '_isVue', '$options', '_renderProxy', '_self', '$parent',
//    '$root', '$children', ...]
```

- 带 `$` 前缀的是**公开 API**（`$data` / `$el` / `$options` / `$set`）
- 带 `_` 前缀的是**内部实现**（`_data` / `_uid` / `_renderProxy`）—— 不要碰
- `__vue__` 是 Vue2 挂在 DOM 元素上的反向引用，**只用于调试**

### 3.3 实例代理了 data

这是理解后面一切的前提：

```js
vm.msg          // ← 能读到，等价于 vm.$data.msg
vm.msg = 'x'    // ← 能写，等价于 vm.$data.msg = 'x' 且触发更新
```

Vue2 初始化时会把 `data` 的每个 key **代理到实例上**（`proxy(vm, '_data', key)`）。
所以你写 `this.msg` 而不是 `this.$data.msg`。

> ⚠️ 只有 `data` 里**声明过**的 key 会被代理。`this.foo = 1` 赋值一个没声明的属性，**不会**变成响应式（这是 §5.1 那条坑的近亲）。

### 3.4 一个页面多个实例

技术上可以（`el` 指向不同元素），但**实际项目不会这么写** —— 后面组件化（V5）就是把这件事标准化。现在知道"能"即可。

---

## 4. 插值表达式（集 005）

### 4.1 基本形态

```html
<div id="app">
  <p>{{ msg }}</p>                     <!-- 变量 -->
  <p>{{ 1 + 2 }}</p>                   <!-- 运算 → 3 -->
  <p>{{ msg.toUpperCase() }}</p>       <!-- 方法调用 -->
  <p>{{ ok ? '是' : '否' }}</p>        <!-- 三元 -->
</div>
```

### 4.2 🔴 只能放「表达式」，不能放「语句」

这是**唯一**一个要背的语法规则：

| 能放（表达式，有返回值） | 不能放（语句，无返回值） |
|---|---|
| `{{ a + b }}` | `{{ if (a) { ... } }}` ❌ |
| `{{ list.length }}` | `{{ for (let i...) }}` ❌ |
| `{{ fn(x) }}` | `{{ let y = 1 }}` ❌ 声明 |
| `{{ a ? 'x' : 'y' }}` | `{{ a = 1 }}` ❌ 赋值（能跑，但绝不该写） |

> 你在 C# 里区分 `expression` 和 `statement` 是本能，这里完全一样。
> 模板本质上就是**一个求值表达式的位置**，不是一个代码块。

### 4.3 🔵 撞名：插值 ≠ C# 字符串插值

| | C# `$"Hello {name}"` | Vue `{{ name }}` |
|---|---|---|
| 求值时机 | **执行到这一行时，一次** | **每次依赖变化时，重新求值** |
| 结果 | 一个字符串 | 一个会变的 DOM 文本节点 |

C# 的插值字符串是不可变的快照；Vue 的 `{{ }}` 是一条**活的**依赖订阅。这个差别是下一节的入口。

### 4.4 ⚠️ 两个现在就要知道的坑

1. **`{{ }}` 放在 HTML 属性里无效**
   ```html
   <a href="{{ url }}">链接</a>   <!-- ❌ 原样输出字符串 "{{ url }}" -->
   ```
   属性要用 `v-bind`，**V2 才讲**。现在只需要知道"属性上不能用插值"。

2. **首屏闪烁**（网络慢时能看见 `{{ msg }}` 原文一闪）
   原因是 HTML 先渲染、Vue 后接管。Vue 提供了 `v-cloak` 指令解决，**属于 V2 范围，现在不用**。

---

## 5. 响应式特性（集 006）🔥 本轮核心

### 5.1 先看它怎么工作：手写 15 行

**实验 02** 里没有一行 Vue 代码，但它实现了"改数据界面自己变"。核心就这一段：

```js
function observe(obj) {
  Object.keys(obj).forEach(function (key) {
    let val = obj[key];                    // ← 用闭包藏住"真值"

    Object.defineProperty(obj, key, {
      get: function () {
        console.log('[get] ' + key);       // ← 读的时候被拦
        return val;
      },
      set: function (next) {
        console.log('[set] ' + key + ': ' + val + ' → ' + next);
        val = next;
        render();                          // ← 写的时候被拦，顺手刷界面
      }
    });
  });
}
```

**这就是 Vue2 响应式的全部秘密**：遍历 `data` 的每个 key，用 `Object.defineProperty` 换成访问器属性。

- `val` 为什么放在闭包里？因为一旦 `defineProperty` 接管了 `obj[key]`，你没法再从 `obj[key]` 里取到原始值 —— 会无限递归调用 `get`。
- 这就是 C# 里手写 `private string _name;` 那个字段的角色。**`val` 就是 backing field。**

> ⭐ 对照你天天在写的 C# 自动属性 —— 编译器展开后长这样：
> ```csharp
> public string Name { get; set; }
>
> // 上面一行编译器实际生成的是：
> private string _name;                    // ← 就是那个 val
> public string Name {
>     get { return _name; }
>     set { _name = value; }               // ← Vue 只在这里多插了一句 render()
> }
> ```
> **一模一样。** `defineProperty` 干的事就是"在 setter 里多插一句通知"，
> 区别只是属性是运行时生成的（动态语言没有编译期）。

### 5.2 但它有边界 —— 三个拦不到的地方

`defineProperty` 只能拦**"对象上已经存在的 key 的读写"**。于是：

| 你想做的事 | 写法 | Vue2 拦得到吗 | 为什么 |
|---|---|---|---|
| 改已有属性 | `vm.msg = 'x'` | ✅ | 这个 key 装过 getter/setter |
| **改数组下标** | `vm.arr[0] = 'x'` | ❌ | 下标不是 key，是数组索引 |
| **给对象加新属性** | `vm.user.age = 18` | ❌ | 新 key 从没被 `defineProperty` 处理过 |
| 数组 `push` / `splice` | `vm.arr.push(1)` | ✅ | Vue2 **改写了 7 个数组方法**来补通知 |

**实测输出**（`autotest.html` 跑出来的，可自己复现）：

```
[V2-1] data.arr 是访问器属性?      get=function set=function
[V2-2] data.__ob__ 存在?          true
[V2-3] arr.push 是否被劫持?       是（Vue 改写过）
[V2-4] arr[0]="X" 后 数据=X 界面=a    → ❌ 不响应
[V2-5] $set(arr,0,"Y") 后     界面=Y  → 响应
[V2-6] user.age=18 后 数据=18 界面=-  → ❌ 不响应
[V2-7] $set(user,"email") 后 界面=a@b.c → 响应
[V2-8] 先手赋过 age 再 $set(age) 界面=18 → ❌ 不响应
```

### 5.3 🔴🔴 `$set` 也救不了的情况（本轮最狠的坑）

第 8 行值得单独说。它暴露了一个**顺序依赖，而且没有任何警告**：

```js
vm.user.age = 18;                    // ① 界面不动，但 age 这个 key 已经真的挂到对象上了
Vue.set(vm.user, 'age', 18);         // ② 你以为这下能救了 —— 还是不动
```

为什么？看 `$set` 的源码第一句：

```js
function set(target, key, val) {
  if (Array.isArray(target) && ...) { ... }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;               // ← key 已存在，直接赋值，不发通知
    return val;
  }
  // 只有走到这里才 defineReactive + ob.dep.notify()
}
```

`$set` 的假设是"这个 key 没被观察过"。你一旦手赋过值，它就以为早就观察过了，直接赋值了事。

> **工程上怎么防**：新增字段一律**在 `data` 里先声明**（哪怕先给 `undefined`、`null`、`''`）。
> 只要声明过，它就装了 setter，后续赋值全部响应。这条规则能消灭 90% 的"新增属性不响应"。
>
> 这不是 Vue 的 bug，是 `defineProperty` 这个机制的代价：**它只能拦"已知的 key"**。

### 5.4 交互实验：Vue2 vs Vue3 并排看

**实验 03** 左边 Vue2、右边 Vue3，同一批操作。

| 操作 | Vue2 | Vue3 |
|---|---|---|
| `arr[0] = 'X'` | ❌ 不响应 | ✅ 响应 |
| `user.age = 18`（新增 key） | ❌ 不响应 | ✅ 响应 |
| 救场手段 | `$set`，且有 §5.3 的顺序坑 | **不需要** |

原因一句话：

| | Vue2 | Vue3 |
|---|---|---|
| 机制 | `Object.defineProperty` | `Proxy` |
| 拦住什么 | **已存在的属性读写** | **对对象的任何操作**（读、写、新增、删除、`in`） |
| 新增 key | 拦不到，要 `$set` | 天然拦得到 |
| 数组下标 | 拦不到，要改写数组方法 | 天然拦得到 |
| 代价 | 初始化时递归遍历整个对象 | 惰性，访问到才包 Proxy |

```
[V3-1] arr[0]="X" 后 数据=X 界面=X  → 响应
[V3-2] user.age=18 后 界面=18       → 响应
[V3-3] reactive 对象是 Proxy?      是（内部有 __v_raw）
```

> ⭐ **收敛时刻**：这三行就是你后面"为什么要学 Vue3"（V10 第 140 集）的标准答案。
> 课程会用 5 分钟讲这个理由，你现在已经用实验证过了。

### 5.5 那为什么还要先学 Vue2？

不是因为"历史包袱"，是因为两个具体原因：

1. **`defineProperty` 是可见的，`Proxy` 是隐形的。** 你现在能指着 `Object.getOwnPropertyDescriptor` 的返回值说"这就是拦截"。
   `Proxy` 看不到这些，它是一个黑盒。
2. **存量项目全是 Vue2。** 你搜到的答案、公司里的老代码、绝大多数中文教程，都是这套写法。

> 心法：**用 Vue2 学原理，用 Vue3 写代码。**

---

## 6. Vue Devtools（集 007）

**装它，别跳过。** 浏览器扩展：Vue.js devtools（Vue2 和 Vue3 都支持）。

打开 F12 会多一个 **Vue** 面板：

| 面板 | 用途 |
|---|---|
| **Components** | 组件树 —— 点任一节点，右侧能看它的 `data`、`props`、`computed` |
| **直接改值** | 在面板里双击改 `data` 的值，**页面立刻响应** —— 不用改代码就能验证"这是不是响应式的" |
| **Vuex / Pinia 面板** | 后面 V9/V10 看状态用 |
| **Timeline** | 事件与渲染耗时（用得少） |

> 一个实用技巧：**怀疑某个字段不响应时，用 Devtools 面板改它。**
> 面板改得动 → 是代码里改的方式不对（比如走了 `$set` 的顺序坑）；
> 面板也改不动 → 这个字段压根没进响应式系统（没在 `data` 里声明）。

---

==二：格式==

## 1. 速查表：Vue2 最小 API（本轮范围）

| 写法                               | 作用             | 备注                       |
| -------------------------------- | -------------- | ------------------------ |
| `new Vue({ el, data, methods })` | 创建实例           | `methods` 下一轮讲           |
| `el: '#app'`                     | 挂载点，CSS 选择器    | 接管该元素**内部**              |
| `data: { }`                      | 状态，响应式的源头      | 根实例用对象；组件里必须是函数（V6）      |
| `{{ 表达式 }}`                      | 插值，输出到文本节点     | **不能放语句**                |
| `Vue.set(obj, key, val)`         | 给对象补一个响应式新 key | 等价 `vm.$set`             |
| `Vue.set(arr, index, val)`       | 改数组某个下标并通知     | 等价 `arr.splice(i,1,val)` |
| `vm.$data`                       | 原始 data 对象     | 读它能看到 `__ob__`           |
| `vm.$el`                         | 实例根 DOM        |                          |
| `vm.$set`                        | 实例上的 `Vue.set` |                          |

**控制台自证口令**（复制粘贴就能跑）：

```js
const vm = document.querySelector('#app').__vue__;
Object.getOwnPropertyDescriptor(vm.$data, 'msg');   // 看 get/set 是不是 function
!!vm.$data.__ob__;                                  // true = 被观察过
vm.arr.push === Array.prototype.push;               // false = 被 Vue 改写过
vm.msg = '新值';                                     // 看界面是否立刻变
```

## 2. Vue ↔ C# 对照表（本轮部分）

| Vue | C# / .NET | 迁移度 | 关键差异 |
|---|---|---|---|
| `data` | 被 EF 追踪的实体 | ⚪ | Vue 自动装 getter/setter，EF 靠快照 |
| 响应式 | **EF Core `ChangeTracker`** | ⭐ 最准 | 都是"改对象 → 框架同步到存储" |
| `render()`（自动） | `SaveChangesAsync()` | 🟡 | Vue 自动提交，EF 要显式调 |
| `new Vue({el, data})` | `DbContext` 实例 | 🟡 | 都持有状态 + 提供操作入口 |
| `{{ expr }}` | LINQ 查询表达式 | 🟡 | 都声明"要什么"，不写"怎么取" |
| `data` 里声明字段 | 实体类定义属性 | ⚪ | 差异：实体可带行为，`data` 只放数据 |
| `Object.defineProperty` 拦截 | 自动属性的 backing field | ⚪ | 一个运行时生成，一个编译期生成 |
| `Vue.set` | 反射 `PropertyInfo.SetValue` | ❌ | 形似神不似：反射改值，`$set` 装拦截器 |
| `$set` 的顺序坑 | 无对应 | 🆕 | 动态类型 + 运行时拦截独有 |

## 3. 实测输出（可复现）

```bash
# 断言脚本（改动后可重跑）
msedge --headless=new --disable-gpu --allow-file-access-from-files \
  --virtual-time-budget=5000 --dump-dom autotest.html
```

完整输出见 §5.2 / §5.4。三张关键结论：

1. Vue2 的 `data` 每个 key 都变成了访问器属性，且挂着一个 `__ob__` 观察者
2. Vue2 拦不到"新增 key"和"数组下标"，`$set` 能补，但**先手赋过值就补不上**
3. Vue3 的 `Proxy` 两个都拦得到，不需要 `$set`

## 4. 判断表：什么时候该怀疑响应式

| 症状 | 先查什么 |
|---|---|
| 改了数据界面不动 | ① 这个 key 在 `data` 里声明过吗？② 是不是走的下标/新增 key？ |
| 数组改了不动 | 用的是 `arr[i] = x` 还是 `push/splice`？ |
| 用 `$set` 也不动 | 之前是不是手赋过这个 key？→ §5.3 |
| Devtools 里能看到值变了，界面没变 | 值变了但没通知 → 就是没走 setter |
| 页面一闪出现 `{{ msg }}` 原文 | 首屏闪烁，`v-cloak`，V2 |

---

==三：代码==

## 1. 三个配套演示

全部在 `D:\学习笔记\学习\编程\前端学习\Vue\代码演示\01-响应式V1\`，**双击 HTML 就能跑**（本地 `lib\vue2.js` / `lib\vue3.js`，不依赖网络）。

| 文件 | 看什么 | 配合哪一节 |
|---|---|---|
| `01-命令式vs声明式.html` | 左右并排点按钮，感受"两份真相" vs "一份真相" | §1.1 |
| `02-手写响应式.html` | 30 行纯 JS 实现响应式，日志区实时打印 `[get]` / `[set]` / `[render]` | §5.1 |
| `03-响应式的边界.html` | Vue2 / Vue3 并排，同一批操作看谁响应 | §5.3 §5.4 |

**实验 02 的正确看法**：点"改名字"，然后盯着日志区 —— 你会看到

```
[set] name: 小黑 → 小美
[get] name ← 读真值 "小美"
[get] age  ← 读真值 18
[render] 视图已同步 → 小美 / 18
```

`set` 触发 `render`，`render` 里读 `name` 和 `age` 又各触发一次 `get`。
**这就是"依赖收集"的雏形**：谁在 `render` 里读了，谁就是依赖。Vue3 的 `track`/`trigger` 就是把这套做严谨了。

## 2. 手写响应式的完整代码（可独立跑）

```html
<!DOCTYPE html>
<html><body>
<p>名字：<span id="v"></span></p>
<button onclick="state.name = '小美'">改名字</button>
<pre id="log"></pre>

<script>
const state = { name: '小黑', age: 18 };
const log = (s) => document.getElementById('log').textContent += s + '\n';
const view = document.getElementById('v');

function render() { view.textContent = state.name; }

function observe(obj) {
  Object.keys(obj).forEach(function (key) {
    let val = obj[key];
    Object.defineProperty(obj, key, {
      get() { log('[get] ' + key); return val; },
      set(next) { log('[set] ' + key + ': ' + val + ' → ' + next); val = next; render(); },
      enumerable: true,
      configurable: true
    });
  });
}

observe(state);
render();
</script>
</body></html>
```

**这段代码留了两个缺口**：

1. 只处理了第一层。`state.user.name` 改了不会响应 —— 因为 `user` 是个对象，`val` 里的属性没被 `observe`。
2. 没有依赖收集。不管界面用不用 `age`，改 `age` 都会 `render()`。

> 这两个缺陷正好对应 Vue 的两块核心：**递归观察** 和 **依赖收集**。课程不会讲它们的实现，但你现在的直觉比"背 API"值钱。

---

==四：总结==

## 1. 一句话记住三个

1. **Vue 只有一份真相：`data`。界面是它的投影，不需要你手动同步。**
2. **响应式不是魔法，是把每个属性换成 getter/setter，写的时候顺手刷界面。**
3. **`defineProperty` 只能拦"已知的 key"—— 新增属性、数组下标它看不见，这是 Vue2 的边界，也是 Vue3 存在的理由。**

## 2. ⭐⭐ 本轮要背的

| 要背 | 内容 |
|---|---|
| 最小实例 | `new Vue({ el: '#app', data: { } })` |
| 插值规则 | `{{ }}` 里只能放**表达式**，不能放语句 |
| 属性不能用插值 | `<a href="{{ x }}">` ❌ → 要 `v-bind`（V2） |
| 响应式三件套自证 | `Object.getOwnPropertyDescriptor` / `__ob__` / `arr.push === Array.prototype.push` |
| 两条边界 | 数组下标赋值 ❌、给对象加新 key ❌ |
| 两条补救 | `push/splice` ✅、`$set` ✅（仅限该 key 从未存在过） |
| 顺序坑 | 先手赋过值的 key，`$set` 补不上 —— **新增字段一律在 `data` 里先声明** |

## 3. ⭐ 收敛时刻

**"响应式"这一个概念，一次性解释了你在 JS 那边踩过的三个坑：**

| JS 那边的坑 | Vue 这边是同一件事 |
|---|---|
| 忘调 `render()` → 界面不同步 | 响应式就是"自动调 render" |
| `arr[i] = x` 改了但"看起来没改" | Vue2 也拦不到，是同一类看漏 |
| 为什么要用 `let` 而不是直接改对象 | 截获赋值 = 一切响应式的前提 |

以及它**预告**了后面三大块：

- V3 的 `computed` = "依赖变了自动重算"，依赖收集的正式版
- V10 的 `ref`/`reactive` = `Proxy` 版响应式 + 组合式写法
- V11 的 Pinia = 把"一份响应式状态"提升到全局

> **一句话**：后面 200 集讲的都是"这份响应式状态怎么组织"，而不是"响应式是什么"。
> 地基就这 6 集。

## 4. 静默失败清单（本轮）

| 现象 | 真实原因 | 检查手法 |
|---|---|---|
| 改数组下标，界面不动 | `defineProperty` 拦不到下标 | `vm.arr.push === Array.prototype.push` → false 说明改动过 |
| 加新属性，界面不动 | 新 key 没装 setter | Devtools 里看有没有这个字段 |
| `$set` 也不动 | key 之前被手赋过值，`$set` 走了直接赋值分支 | 先 `delete` 再 `$set`，或从一开始就在 `data` 声明 |
| `{{ }}` 在属性里原样输出 | 属性不支持插值 | 页面上直接看到 `{{ }}` 字样 |
| 首屏闪 `{{ msg }}` | HTML 先渲染、Vue 后接管 | 刷新时盯一眼 |
| `this.foo = 1` 不响应 | `foo` 没在 `data` 里声明，没被代理 | `Object.keys(vm.$data)` 里没有它 |

> 全部**不报错**。Vue2 这些坑连 warning 都没有，这比 JS 那边更隐蔽 ——
> 判据依然是那句：**别问"会不会报错"，问"行为是不是我想要的"。**

## 5. C# 类比可用度

> ⚠️ **2026-10-23 修正**：原表以 WPF 为主锚点，前提错了 —— 用户 WPF 只是"用到哪查到哪"，
> 不是 MVVM 熟手。主锚点已改为 **EF Core / 类 / LINQ**，WPF 只作附注。

| 类比 | 档位 | 说明 |
|---|---|---|
| 响应式 ↔ **EF Core ChangeTracker** | ⭐⭐⭐ | 都是"改对象，框架负责同步到存储" |
| `val` 闭包 ↔ 自动属性的 backing field | ⭐⭐⭐ | 结构一模一样 |
| `render()` ↔ `SaveChangesAsync()` | ⭐⭐ | 但 Vue 是**自动提交**，EF 要你显式调 |
| `{{ }}` ↔ **LINQ 查询表达式** | ⭐⭐ | 都声明"要什么"，不写"怎么取" |
| `new Vue({el,data})` ↔ `DbContext` | ⭐⭐ | 都持有当前状态 + 提供操作入口 |
| `data` ↔ 实体类 | ⭐⭐ | 差异：Vue 的 data 纯数据无行为，行为在 `methods` |
| 组件（V5）↔ 类 | ⭐⭐⭐ | 封装 + 复用，V5 展开 |
| "响应式" ↔ Rx 响应式 | ❌ | **完全不同**，见 §2.2 |
| `Vue.set` ↔ 反射设属性 | ❌ | 形似神不似：反射改值，`$set` 是**装拦截器** |
| `$set` 顺序坑 ↔ ？ | ❌ | 动态类型 + 运行时拦截独有 |
| 响应式 ↔ WPF `INotifyPropertyChanged` | 🟡 附注 | 机制同类，但**不必强求理解**，不影响本课 |

## 6. 解锁边界

**✅ 本轮新解锁（可以用）**

- `new Vue({ el, data })`、`vm.$data`、`vm.$el`
- `{{ 表达式 }}` 插值（文本位置）
- `Object.defineProperty` 在响应式语境下的用法
- `Vue.set` / `vm.$set`
- `__ob__`、`Object.getOwnPropertyDescriptor` 的自证用法
- Vue Devtools 的 Components 面板

**🔒 仍锁着（没讲，别用别猜）**

| 类别 | 具体 |
|---|---|
| **指令** | `v-if` / `v-show` / `v-for` / `v-on` / `v-bind` / `v-model` / `v-html` —— **V2 全讲** |
| **配置项** | `methods` / `computed` / `watch` / 生命周期钩子 —— V3-V4 |
| **组件** | 组件注册、`props`、`$emit`、插槽 —— V5-V7 |
| **工程化** | npm、Vite、`.vue` 单文件组件、`import` —— V5（届时补模块化） |
| **路由 / 状态** | vue-router、Vuex、Pinia —— V8-V10 |
| **Vue3** | `createApp` / `setup` / `ref` / `reactive` / 组合式 API —— V10 |
| **Vue2 遗留** | `v-cloak`、`filters`、`$on/$off` 事件总线、`.sync` —— 不单独讲，遇到再说 |

> 本轮 **只** 解锁了"实例 + 插值 + 响应式"这一小块。**属性绑定、条件渲染、循环、事件全部还在锁里**，
> 所以上面三个实验里没有任何一个 `v-` 指令（除了 `03` 里为了演示 Vue3 用了一次 `{{ }}`）。
> 这是故意的：先把"响应式"这个地基单独夯一遍，下一轮再一次把指令铺开。

## 7. 下一轮预告（V2 · 008-022 集）

**指令全家，15 集 3.2 小时。**

| 内容 | 对你的预判 |
|---|---|
| `v-show` / `v-if` / `v-else-if` | 🟡 概念极简（藏起来 vs 删掉），几乎没有前置门槛 |
| `v-on` 三种写法 + 传参 | 🟡 类比 C# 事件订阅，但传参与修饰符有坑 |
| `v-bind` | 🟡 类比"s绑定到值"，但能绑任意属性、能绑对象 |
| `v-for` + `:key` | 🔴 **唯一必须停的地方**（`:key` 用 index 会列表错乱） |
| `v-model` | 🟡 双向绑定的概念不新，但**修饰符 + 组件上的用法**有坑 |
| `v-html` | 🟡 等同于 `innerHTML` —— **有 XSS 风险**，配一句工程防护 |

> ⚠️ 注意：这张表**不再标"白送"**。之前把 WPF 当白送区的判断是错的 —— 你的 WPF 只是"用到哪查到哪"。

**并轮判据**（V2 开始时我会出这两道题）：

1. `v-if` 和 `v-show` 在"元素还在不在 DOM 里"这件事上有什么区别？各自适合什么场景？
2. `v-for` 的 `:key` 如果用数组下标，会出什么问题？（说得出具体场景才算过）

两题全对 → 跳过 V2 直接进 V3；错一道 → 只讲错的那个。
