# JS--事件流 · 解绑 · 事件委托

> **本课目标**：说清事件传播的三个阶段、`removeEventListener` 的匹配规则，并能用事件委托把"每个子元素各绑一次"改写成"只在父元素绑一次"。
> **为什么学它**：这是全篇**最能拉开水平**的一轮。⑯ 是原理，⑱ 是那原理带来的最大红利 —— 后面做评论列表 / 购物车 / TODO，全都靠它。
> **对应视频**：第 105-107 集（应用篇 Day3）
> **主源**：MDN [事件冒泡](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Event_bubbling)（含"事件捕获""事件委托"两节）、[`removeEventListener()`](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/removeEventListener)、[`stopPropagation()`](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/stopPropagation)

---

==一：概念==

### 事件流 = 一次"绕树走全程"

事件不是"从元素直接送到监听器"，而是**沿整条祖先链走一趟**：

```
① 捕获阶段    由外向内   document → div → button      （只有 capture: true 的监听器在这里触发）
② 目标阶段    到达目标   真正被点的那个元素
③ 冒泡阶段    由内向外   button → div → document      （默认的所有监听器都在这里）
```

MDN 对冒泡的原文：「事件**从被点击的最里面的元素冒泡而出**。」
MDN 对捕获的原文：「先在**最小嵌套**元素上发生，然后在连续更多的嵌套元素上发生，直到达到目标。」
MDN 的关键结论：「**默认情况下，几乎所有的事件处理程序都是在冒泡阶段注册的**。」

### 对标 C#：这一轮类比失效

| C#（WinForms） | DOM |
|---|---|
| `button.Click` —— **没有任何传播路径** | 沿树传播：捕获 → 目标 → 冒泡 |
| 订阅了就触发，仅此而已 | 同一事件**在每个祖先上依次触发** |
| 想"父容器统一处理" → 只能手动转发 | 冒泡让父容器**天然**能接住子元素的事件 |

⚠️ **唯一例外**：WPF 的**路由事件**（`PreviewMouseDown` = 隧道/捕获，`MouseDown` = 冒泡，`e.Handled = true` ≈ 截断传播）。WinForms 完全没有这套东西。

### `stopPropagation()` 只干一件事

MDN 原文：「阻止**捕获和冒泡阶段**中当前事件的进一步传播。但是，它**不能防止任何默认行为的发生**；例如，对链接的点击仍会被处理。」
还有一句容易漏：「它**也不能阻止附加到相同元素的相同事件类型的其他事件处理器**」（想拦那个要用 `stopImmediatePropagation()`）。

| 想做 | 用什么 |
|---|---|
| 拦传播（不让祖先收到） | `e.stopPropagation()` |
| 拦默认行为（链接跳转 / 表单提交） | `e.preventDefault()`（⑲ 讲） |
| 连同元素上的其他监听器一起拦 | `e.stopImmediatePropagation()` |

### `removeEventListener` 的匹配规则

MDN 原文：「若传入的参数**不能用于确定当前注册过的任何一个事件监听器**，该函数**不会起任何作用**。」
MDN 原文：「唯一需要 `removeEventListener()` 检测的是 `capture` / `useCapture` 标志。**这个标志必须与 `removeEventListener()` 的对应标志匹配**。」

⚠️ 官方警告：「同一个事件监听器分别为捕获和冒泡注册过一次，**这两个版本的监听器需要分别移除**。」

| 解绑写法 | 结果 |
|---|---|
| `removeEventListener('click', handlerB)` | ✅ 有效（同一引用 + 同一 `capture`） |
| `removeEventListener('click', function () {})` | ❌ **无效且不报错** |
| `addEventListener('click', fn, true)` 后用 `removeEventListener('click', fn)` | ❌ 无效（`capture` 不匹配） |
| `addEventListener('click', fn, { once: true })` | 触发一次后**自动解绑** |

**什么时候真需要解绑**：定时器里绑的事件 / 只需生效一次的动作 / 单页应用切页面。其余情况（元素本身会被删除、绑在长期存在的元素上）通常不用管。

### 事件委托 —— ⑯ + ⑭ 的合体

MDN 原文：「在它们的**父元素上设置事件监听器**，让发生在它们身上的事件**冒泡到它们的父元素上**，而不必在每个子元素上单独设置事件监听器。」
MDN 备注：「我们使用 `event.target` 来获取事件的**目标元素**（最里面的元素）。如果我们想访问**处理这个事件的元素**（容器），可以使用 `event.currentTarget`。」

| 做法 A：每个 li 各绑一次 | 做法 B：事件委托（只绑 ul） |
|---|---|
| ×N 个监听器 | ×1 个监听器 |
| 新增元素**必须手动再绑** | 新增元素**自动生效** |
| 逻辑散落 N 处 | 逻辑只有一处 |

---

==二：格式==

**捕获（很少用，但要知道）**

```js
元素.addEventListener('click', 处理函数, true);               // 简写
元素.addEventListener('click', 处理函数, { capture: true });   // 完整写法（推荐）
```

**解绑**

```js
元素.removeEventListener('click', 具名函数);          // 同一引用 + 同一 capture 才有效
元素.addEventListener('click', 处理函数, { once: true });  // 一次性，浏览器自动解绑
```

**事件委托骨架**

```js
父元素.addEventListener('click', function (e) {
  if (e.target.tagName !== 'LI') { return; }   // ① 身份检查（必做）
  // ② e.target 就是要操作的那个孩子，直接用
  e.target.classList.add('hot');
});
```

**谁做不了委托（不冒泡的事件）**

| 事件 | 能委托吗 | 替代品 |
|---|---|---|
| `focus` / `blur` | ❌ 不冒泡 | **`focusin` / `focusout`** |
| `mouseenter` / `mouseleave` | ❌ 不冒泡 | 用 `mouseover` 代替（但要接受性能代价）|
| `click` / `keydown` / `mousemove` | ✅ 会冒泡 | — |

---

==三：代码==

### ① 三段传播，一次看清顺序

```html
<!DOCTYPE html>
<html>
<body>
  <div id="outer">外层 div
    <div id="inner">内层 div
      <button id="btn">按钮</button>
    </div>
  </div>

  <script>
    const outer = document.querySelector('#outer');
    const inner = document.querySelector('#inner');
    const btn   = document.querySelector('#btn');

    // 三层都绑冒泡阶段（默认）
    outer.addEventListener('click', function () { console.log('3 outer 冒泡'); });
    inner.addEventListener('click', function () { console.log('2 inner 冒泡'); });
    btn.addEventListener('click',  function () { console.log('1 btn   冒泡'); });

    // 再绑一层捕获
    document.addEventListener('click', function () { console.log('0 document 捕获'); }, true);

    // 点按钮，控制台顺序：
    //   0 document 捕获   ← 先由外向内（只有传了 capture 的在这里触发）
    //   1 btn   冒泡      ← 到达目标
    //   2 inner 冒泡      ← 再由内向外
    //   3 outer 冒泡
  </script>
</body>
</html>
```

### ② `stopPropagation` 的实战场景（MDN 那个弹窗）

```html
<!DOCTYPE html>
<html>
<body>
  <div id="box">
    <video id="video" width="200" controls></video>
  </div>

  <script>
    const box   = document.querySelector('#box');
    const video = document.querySelector('#video');

    // 点盒子里的空白处 → 隐藏盒子
    box.addEventListener('click', function () {
      box.style.display = 'none';
    });

    // ⚠️ 不阻止传播的话：点视频也会"点到盒子"，于是视频刚开始播就又隐藏了
    video.addEventListener('click', function (e) {
      e.stopPropagation();
      video.play();
    });
  </script>
</body>
</html>
```

### ③ 事件委托完整版（含动态新增元素）

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    ul { list-style: none; padding: 0; }
    li { padding: 8px; border: 1px solid #ccc; margin-bottom: 4px; cursor: pointer; }
    li.hot { background-color: orange; }
  </style>
</head>
<body>
  <ul id="list">
    <li data-id="101">小王</li>
    <li data-id="102">小李</li>
    <li data-id="103">小张</li>
  </ul>
  <button id="add">加一个新人</button>
  <p id="log">点谁试试</p>

  <script>
    const list = document.querySelector('#list');
    const log  = document.querySelector('#log');

    // ⭐ 监听器只绑一个，绑在父元素 ul 上
    list.addEventListener('click', function (e) {
      // ① 身份检查：点到 li 之间的间隙时 e.target 是 ul 自己
      if (e.target.tagName !== 'LI') { return; }

      // ② 靠 data- 属性认出是哪一个（上一轮的知识点）
      log.innerText = '你点了 ' + e.target.dataset.id + ' 号 ' + e.target.innerText;

      // ③ 直接操作它
      e.target.classList.add('hot');
    });

    // ④ 动态新增的元素自动就能用 —— 一个新监听器都不用加
    let nextId = 104;
    document.querySelector('#add').addEventListener('click', function () {
      const li = document.createElement('li');
      li.dataset.id = nextId;
      li.innerText = '新人 ' + nextId;
      nextId++;
      list.appendChild(li);
    });
  </script>
</body>
</html>
```

### ④ 对比：做法 A 在"动态新增"上直接失效

```js
// 做法 A：初始化时给每个 li 绑
const items = document.querySelectorAll('li');
for (let i = 0; i < items.length; i++) {
  items[i].addEventListener('click', function () {
    items[i].classList.add('hot');
  });
}
// ⚠️ 之后新 append 进来的 li，一个监听器都没有 —— 点了没反应
// ⚠️ 而且这段代码在进阶篇还会暴露"循环 + 闭包"的问题（到时再讲）
```

---

==四：总结==

### 1. 必须记住的 8 条

1. **事件沿树走全程**：捕获（由外向内）→ 目标 → 冒泡（由内向外）。
2. **绑在祖先上的监听器默认在冒泡阶段触发**，要捕获必须传 `{ capture: true }`。
   ⚠️ 但**绑在目标元素自己身上**的监听器属于**目标阶段**（既非捕获也非冒泡），`capture` 对它几乎无影响 —— 详见 [`JS--事件阶段与监听器注册.md`](./JS--事件阶段与监听器注册.md)。
3. **冒泡无法关闭**，只能在处理器里用 `e.stopPropagation()` 截断。
4. **`stopPropagation()` 不拦默认行为**（那是 `preventDefault()`），也**不拦同一元素上的其他监听器**（那是 `stopImmediatePropagation()`）。
5. **`removeEventListener` 要求同一引用 + 同一个 `capture`**；不匹配就**静默失败**。
6. **事件委托 = 监听器绑父元素 + 靠冒泡 + 用 `e.target` 认人。**
7. **委托的最大红利：动态新增的元素自动生效。**
8. **不冒泡的事件（`focus` / `blur` / `mouseenter` / `mouseleave`）做不了委托** → 焦点委托要用 `focusin` / `focusout`。

### 2. 要改掉的 C# 直觉

| C# 直觉 | JS 实际 |
|---|---|
| 事件只在订阅者身上触发一次 | 事件会**沿祖先链走一趟**，一路上的监听器都可能触发 |
| 事件模型没有"传播"概念 | 捕获 / 目标 / 冒泡是**硬事实**，冒不冒泡要逐个事件查表 |
| 不需要"阻止传播"（因为本来就没有） | `stopPropagation` 是常用工具，但要小心它**破坏委托** |
| 解绑传"同一个方法"就行 | 还要求 **`capture` 标志一致**，否则静默失败 |

### 3. 自测三题（先自己想，再看答案）

1. 一个 `ul` 里套着 `li`，`li` 里套着 `span`。委托绑在 `ul` 上，用户点到了 `span`，`e.target` 是谁？`e.currentTarget` 是谁？
2. 给 `input` 绑了 `focus`，想在父容器上做委托统一接住 —— 能行吗？不行的话怎么改？
3. 子元素处理器里写了 `e.stopPropagation()`，父元素上的委托监听器还会执行吗？

<br>

**答案**

1. `e.target` 是最里面那个 `span`；`e.currentTarget` 是 `ul`。**注意这里是委托的第一个坑** —— 拿到 `span` 你需要再判断/上溯，所以官方示例里都先做一层身份检查。
2. **不行** —— `focus` 不冒泡，事件不会往上走到父容器。改用 **`focusin`**（会冒泡），或给 `addEventListener` 传 `{ capture: true }` 趁捕获阶段在父容器上截住。
3. **不会执行。** `stopPropagation` 把后续传播整个截断了，事件根本到不了父元素 —— 这正是"委托"和"阻止传播"互相冲突的地方。

### 4. 动手练习

做一个"点击高亮 + 可删除"的标签列表（**全程只能有一个监听器**）：

- `ul` 里放 5 个 `li`，每个 `li` 里带一个"×"按钮（或者就用 `li` 本身当删除）
- **监听器只绑在 `ul` 上**
- 点 `li` 的正文部分 → 切换 `hot` 类（`classList.toggle`）
- 点 `×` → 把那个 `li` 从列表里删掉（`remove()`）
- 再加一个"新增标签"按钮，新增的 `li` **必须立刻能点、能删**（不许给新元素补绑监听器）
- 提示：靠 `e.target.tagName` 区分"点的是 `li` 还是里面的 `×`"

做完这题，你已经能自己写"评论列表""购物车行删除"这类组件的事件层了。

### 5. 下一步

- 接着学：第 109-112 集 —— 阻止默认行为 / 页面加载与滚动事件 / `client`·`offset` 家族
- 速查表：[`JS--事件速查表-绑定与常见事件.md`](./JS--事件速查表-绑定与常见事件.md)
- 补充课（**强烈建议紧接着看**）：[`JS--事件阶段与监听器注册.md`](./JS--事件阶段与监听器注册.md) —— 讲清"目标元素上的监听器其实在目标阶段"，这是本课最容易卡住的地方
- 上一课：[`JS--键盘事件-事件对象与this.md`](./JS--键盘事件-事件对象与this.md)
- **有不清楚的地方直接问我。** 我是你的老师，可以随时追问任何细节 —— 别自己憋着。

---

**建议读一遍原文**：MDN [事件冒泡](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Event_bubbling) —— 页面里的"视频播放器示例"就是本课图 ② 那个场景，演示代码可以直接在浏览器里改着玩，是理解 `stopPropagation` 最快的方式。
