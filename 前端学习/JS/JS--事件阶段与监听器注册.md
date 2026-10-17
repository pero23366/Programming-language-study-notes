# JS--事件阶段与监听器"注册"

> **本课目标**：彻底分清「注册监听器」和「监听器在哪个阶段被调用」是两件事；并知道绑在**目标元素自己**身上的监听器属于**目标阶段**，不受 `capture` 影响。
> **为什么学它**：这是 ⑯ 事件流里唯一容易卡住的地方 —— 一旦把"注册时机"和"触发阶段"混成一件事，`capture` 那个参数就永远想不通，事件委托为什么会成立也就跟着糊。
> **对应视频**：第 105 集（应用篇 Day3，事件流一节）
> **主源**：MDN [`addEventListener()`](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener)（`useCapture` 参数 + 那条"目标阶段"备注）、MDN [事件冒泡](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Event_bubbling)

---

==一：概念==

### 一句话里塞了两个时间点

「在冒泡阶段**注册**」这种说法把两件事压成了一句，必须拆开：

| 词 | 指什么时候 | 说明 |
|---|---|---|
| **注册** | 写下 `addEventListener(...)` 那一行**代码执行**的瞬间 | 一瞬间完事；跟"写在第几行 / 什么时候执行"无关 |
| **冒泡阶段** | 将来事件**真的发生**时，这个监听器**被调用的时机** | 这才是 `capture` 参数管的事 |

**准确说法**：这个监听器**会在事件传播到冒泡阶段时被调用**。

### 为什么会有"选哪个阶段"这个问题

因为事件会沿着祖先链**来回各走一趟**（下行 + 上行）。监听器挂在**祖先**上时，浏览器路过它两次 —— 所以必须问一句：你要我在**下行**叫你，还是**上行**叫你？

不回答 → 默认**上行（冒泡）**。MDN：「如果没有指定，`useCapture` 默认为 `false`。」

选冒泡当默认的理由：**内层先响，外层再收尾**（点按钮按钮先处理；点空白才是外层的事）。

### ⚠️ 核心：绑在"目标自己"身上的监听器不在这个选择题里

MDN 备注原文：

> 对于事件目标上的事件监听器来说，事件会处于"**目标阶段**"，而不是冒泡阶段或者捕获阶段。捕获阶段的事件监听器会在任何非捕获阶段的事件监听器之前被调用。

两条推论：

1. **绑在被点的那个元素自己身上 → 目标阶段**，既不是捕获也不是冒泡。
2. 给它传 `capture: true` **不会**让它"提前几层"触发；只在**同一元素**上同时有传 `true` 的和默认的时，传 `true` 的排前面。

### 自己就能推的判断法

> **问：这个元素是不是"事件发生的那一个"？**
> - **是** → 目标阶段，`capture` 参数基本没影响。
> - **不是（它是祖先）** → 传 `true` 在下行趟被叫；不传在上行趟被叫。

### 对照：`capture` 的两种取值

| 写法 | 绑在**祖先**上时 | 绑在**目标**上时 |
|---|---|---|
| `addEventListener(t, fn)`（默认）| 冒泡阶段（上行趟）被调用 | 目标阶段 |
| `addEventListener(t, fn, true)` | 捕获阶段（下行趟）被调用 | 目标阶段（只是排在同元素的非捕获监听器前面）|

### 只有两种场合需要 `capture: true`

1. 想在事件**到达子元素之前**先手截住（拦截类需求）。
2. 想在**祖先**上接住**不冒泡**的事件 —— `focus` / `blur` / `mouseenter` / `mouseleave`。
   → 这就是"`focus` 做不了事件委托"的**第二个解法**（第一个解法是改用 `focusin`）。

---

==二：格式==

```js
// 默认：绑在祖先上 → 冒泡阶段（上行趟）被调用
元素.addEventListener('click', 处理函数);

// 显式捕获：绑在祖先上 → 捕获阶段（下行趟）被调用
元素.addEventListener('click', 处理函数, true);
元素.addEventListener('click', 处理函数, { capture: true });   // 完整写法

// 用捕获接住不冒泡的事件（focus 的替代解法）
父容器.addEventListener('focus', 处理函数, true);
```

**执行顺序速记**（三层：外层容器 outer > 中间 div > 按钮 btn，点 btn）

| 模式 | 顺序 |
|---|---|
| 默认（全不传 capture）| `btn`（目标）→ `div`（冒泡）→ `outer`（冒泡）|
| 全传 `capture: true` | `outer`（捕获）→ `div`（捕获）→ `btn`（目标）|

⚠️ 注意两张表里 **`btn` 都在"目标阶段"**，它只是**位置**在前还是在后变了 —— 变的是两个祖先谁先谁后。

---

==三：代码==

### ① 亲手验证"顺序会整个反过来"

```html
<!DOCTYPE html>
<html>
<body>
  <div id="outer">
    <div id="inner">
      <button id="btn">点我</button>
    </div>
  </div>

  <script>
    const outer = document.querySelector('#outer');
    const inner = document.querySelector('#inner');
    const btn   = document.querySelector('#btn');

    // 想验证另一种模式，把下面所有 addEventListener 的第三个参数都补上 true
    outer.addEventListener('click', function () { console.log('outer'); });
    inner.addEventListener('click', function () { console.log('inner'); });
    btn.addEventListener('click',   function () { console.log('btn（目标）'); });

    // 默认模式点 btn，控制台：
    //   btn（目标）
    //   inner
    //   outer
  </script>
</body>
</html>
```

### ② 直接对比：目标元素上的监听器不受 capture 影响

```js
// 同一个按钮，一个传 true 一个不传 —— 它俩都在"目标阶段"触发
btn.addEventListener('click', function () { console.log('A：不传 capture'); }, false);
btn.addEventListener('click', function () { console.log('B：capture = true'); }, true);

// 点一下，控制台先出 B 再出 A。
// 原因不是"B 在捕获阶段"，而是 MDN 那句：
// "捕获阶段的事件监听器会在任何非捕获阶段的事件监听器之前被调用"
```

### ③ `capture: true` 的实战用途：接住不冒泡的 focus

```html
<!DOCTYPE html>
<html>
<body>
  <div id="form">
    <input placeholder="第一个">
    <input placeholder="第二个">
  </div>

  <script>
    const form = document.querySelector('#form');

    // focus 不冒泡 —— 默认写法在父容器上收不到
    // form.addEventListener('focus', function () { console.log('收不到'); });

    // 解法一：改用会冒泡的 focusin
    // form.addEventListener('focusin', function (e) { console.log('focusin:', e.target); });

    // 解法二：留在 focus 上，但走捕获趟（下行时祖先也会被路过）
    form.addEventListener('focus', function (e) {
      console.log('捕获趟接到 focus:', e.target.placeholder);
    }, true);
  </script>
</body>
</html>
```

---

==四：总结==

### 1. 必须记住的 6 条

1. **"注册"是代码执行那一刻的动作；"在冒泡阶段"说的是将来被调用的时机** —— 两者无关，别混。
2. **`capture` 参数管的是"在哪个阶段被调用"，不是"在哪登记"。**
3. **绑在目标元素自己身上 → 目标阶段**，既非捕获也非冒泡；`capture` 基本无影响（只决定同元素内的先后）。
4. **只有绑在祖先上时，阶段差异才看得出来**：下行趟（捕获）vs 上行趟（冒泡）。
5. **默认 = 冒泡 = 上行趟**；这也是**事件委托能成立**的前提。
6. **需要 `capture: true` 就两种情况**：先手拦截、以及在祖先上接住不冒泡的事件。

### 2. 要改掉的 C# 直觉

| C# 直觉 | JS 实际 |
|---|---|
| 订阅了就完事，没有"什么时候"可选项 | 祖先元素上的监听器**要选下行趟还是上行趟** |
| 「注册」和「触发」都跟事件绑定在一起 | 两者是**不同时间点**：注册是现在，触发是将来 |
| 事件在元素上触发，就那么一下 | 事件**经过**祖先两次，所以祖先上的监听器可能被叫两次（挂两遍的话）|

### 3. 自测三题（先自己想，再看答案）

1. 监听器只绑在按钮自己身上，把 `capture` 从 `false` 改成 `true`，点击顺序会变吗？
2. 想让外层容器在用户点到里面的输入框**之前**先做一件事，用什么写法？
3. 事件委托为什么要求监听器绑在**祖先**上，而不是每个子元素各绑一次？

<br>

**答案**

1. **不会变**。按钮是事件目标，它的监听器在**目标阶段**触发；`capture` 只影响"同一元素上捕获类监听器排前面"这个顺序。
2. `外层.addEventListener('click', fn, true)` —— 走**捕获趟**（下行），在事件到达输入框之前外层就被路过。
3. 因为委托**依赖冒泡**：子元素上发生的事件要**上行**经过父元素，父元素上那唯一一个监听器才收得到。**这正是"默认在冒泡阶段触发"的现实意义**。

### 4. 动手练习

用 F12 亲手把两种模式都跑一遍（比读十遍有用）：

- 复制本课"代码 ①"那段，先按默认跑，记下顺序：`btn → inner → outer`
- 把三个 `addEventListener` **全部**加上第三个参数 `true`，再跑，记下顺序：`outer → inner → btn`
- 然后把 `btn` 那一个**改回默认**（去掉 `true`），再跑一次，观察 `btn` 跑到哪儿去了 —— 你会亲眼确认它是"目标阶段"，位置由两个祖先决定
- 最后把 `capture: true` 全删除，只留 `inner` 上挂两遍（一遍 `true`、一遍默认），看它俩谁先出

### 5. 下一步

- 接着学：第 109-112 集 —— 阻止默认行为 / 页面加载与滚动事件 / `client`·`offset` 坐标家族
- 速查表：[`JS--事件速查表-绑定与常见事件.md`](./JS--事件速查表-绑定与常见事件.md)（第 11 节）
- 上一课：[`JS--事件流-解绑与事件委托.md`](./JS--事件流-解绑与事件委托.md)
- **有不清楚的地方直接问我。** 我是你的老师，可以随时追问任何细节 —— 别自己憋着。

---

**建议读一遍原文**：MDN [`addEventListener()`](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener) 里 `useCapture` 参数**下面那条"目标阶段"备注** —— 就两行字，但它是这一课的全部依据。
