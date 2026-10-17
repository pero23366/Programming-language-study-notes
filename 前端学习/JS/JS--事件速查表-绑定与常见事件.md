# JS--事件速查表 · 绑定与常见事件

> 覆盖第 93-122 集（应用篇 Day2-Day5）。本表随进度向后延伸。  
> 权威来源：MDN —— [`addEventListener()`](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener)、[`preventDefault()`](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/preventDefault)、[`DOMContentLoaded`](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/DOMContentLoaded_event)、[`load`](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/load_event)、[`mouseenter`](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/mouseenter_event)、[`focus`](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/focus_event)、[`blur`](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/blur_event)。有分歧以 MDN 为准。  
> 配套详解：[`JS--事件监听-鼠标与焦点事件.md`](./JS--事件监听-鼠标与焦点事件.md)、[`JS--键盘事件-事件对象与this.md`](./JS--键盘事件-事件对象与this.md)、[`JS--事件流-解绑与事件委托.md`](./JS--事件流-解绑与事件委托.md)、[`JS--事件阶段与监听器注册.md`](./JS--事件阶段与监听器注册.md)  
> 尺寸与坐标另见 [`JS--元素尺寸与坐标速查表.md`](./JS--元素尺寸与坐标速查表.md)（或在资料库同目录）。

## 1. 绑定与解绑

```js
元素.addEventListener('事件类型', 处理函数);              // 挂（本质 = C# 的 +=）
元素.addEventListener('事件类型', 处理函数, { once: true }); // 触发一次后自动解绑
元素.removeEventListener('事件类型', 处理函数);            // 解绑（本质 = C# 的 -=）
```

| 写法                                                 | 本质        | 能挂几个             |
| -------------------------------------------------- | --------- | ---------------- |
| `元素.addEventListener('click', fn)`                 | 往**列表**里加 | 多个，按**注册顺序**依次执行 |
| `元素.onclick = fn`                                  | 给**属性**赋值 | 只留最后一个（后者覆盖前者）   |
| `元素.addEventListener('click', fn, { once: true })` | 同上，一次性    | 一个，触发后自动移除       |

- `onclick`（属性）与 `addEventListener`（列表）**互不干扰**，设了前者不会清掉后者。
- `addEventListener` 返回 **`undefined`** —— 不像 `setInterval` 给 id，没有"靠返回值解绑"这条路。

## 2. 三要素与事件类型

| 部分   | 例子               | 要点                        |
| ---- | ---------------- | ------------------------- |
| 事件源  | `btn`            | 哪个元素被监听                   |
| 事件类型 | `'click'`        | **不带 `on`**；**大小写敏感**的字符串 |
| 处理函数 | `function () {}` | 由**浏览器**调用；**别写成 `fn()`** |

## 3. 事件名 + 冒泡属性（本轮涉及）

| 事件名                         | 冒泡    | 可取消   | 何时触发                   |
| --------------------------- | ----- | ----- | ---------------------- |
| `click`                     | 是     | 是     | 按下并松开                  |
| `dblclick`                  | 是     | 是     | 双击                     |
| `mousedown` / `mouseup`     | 是     | 是     | 按下 / 松开                |
| `mousemove`                 | 是     | 是     | 在元素上移动（触发**极频繁**）      |
| `mouseenter` / `mouseleave` | **否** | 否     | 只在自己边界进出各一次            |
| `mouseover` / `mouseout`    | **是** | 是     | 进**子元素**也会触发           |
| `contextmenu`               | 是     | 是     | 右键                     |
| `focus` / `blur`            | **否** | **否** | 获得 / 失去焦点              |
| `focusin` / `focusout`      | **是** | 否     | 同上，只是会冒泡               |
| `keydown`                   | 是     | 是     | 按下键（功能键也算）             |
| `keyup`                     | 是     | 是     | 松开键                    |
| ~~`keypress`~~              | —     | —     | ⚠️ **已废弃**，用 `keydown` |

能获得焦点的元素：`input` / `textarea` / `select` / `button` / 带 `href` 的 `a` / 任何带 `tabindex` 的元素。

## 4. 三个"差别"（本课全部价值）

| 对比                              | 结论                                         |
| ------------------------------- | ------------------------------------------ |
| `addEventListener` vs `onclick` | 前者挂列表（多个、按顺序）；后者改属性（只留最后一个）                |
| `mouseenter` vs `mouseover`     | 前者不冒泡、只认自己边界 → **做 hover 用它**；后者冒泡、进子元素也触发 |
| `focus` vs `focusin`            | 前者不冒泡 → **做不了事件委托**；后者可以                   |

⚠️ MDN 对 `mouseover` 的明确结论：「由于层次结构很深，发送到 `mouseover` 事件可能相当多，并导致严重的性能问题。在这种情况下，**最好是监听 `mouseenter` 事件**。」

## 5. 重复绑定与解绑

| 场景                              | 结果                   |
| ------------------------------- | -------------------- |
| 同一函数引用绑两次                       | **只算一次**（不会重复添加）     |
| 两个内容完全相同的**匿名函数**               | **算两个**（都会执行，循环里也一样） |
| `removeEventListener` 传的不是同一个引用 | **解绑失败，且不报错**        |

**实践规则**：需要在循环里绑事件、或之后要解绑 → **一律用具名函数**。

## 6. 静默失败排查表（这一节最省命）

| 你写的                               | 实际发生                | 结果               |
| --------------------------------- | ------------------- | ---------------- |
| `addEventListener('onclick', fn)` | 监听一个叫 `onclick` 的类型 | 永不触发，无报错         |
| `addEventListener('clik', fn)`    | 类型名拼错               | 永不触发，无报错         |
| `addEventListener('Click', fn)`   | 大小写不匹配              | 永不触发，无报错         |
| `addEventListener('click', fn())` | 立刻执行，传的是返回值         | 监听器是 `undefined` |

**排查顺序**：`console.log` 确认处理函数**根本没进来** → 再逐字符核对事件名（拼写 / 大小写 / 有没有多写 `on`）。

## 7. 保命常识

1. **`focus` / `blur` 不可取消** —— 对它们调 `preventDefault()` 无效（事件自带的属性说了算，不是你想取消就能取消）。
2. **`blur` 里别写 `alert()`** —— `alert` 抢焦点 → 元素失焦 → 又触发 `blur`，会自我循环。
3. **`blur` 之后的 `document.activeElement` 在不同浏览器行为不同**（Firefox / Chrome 往往设成 `body`），别依赖它。
4. **方法是 `el.focus()`，事件是 `focus`** —— 一个是动作，一个是通知。
5. **`mouseenter` + `mouseleave` ≈ CSS `:hover`** —— 纯 CSS 能做到的悬停效果，别用 JS。
6. **`mousemove` 是性能雷区** —— 每次触发都往任务队列排一个回调（第 90 集单线程机制），里面别做重活。

## 8. 键盘事件（第 99 集）

| 事件             | WinForms   | 说明                                 |
| -------------- | ---------- | ---------------------------------- |
| `keydown`      | `KeyDown`  | **用这个**。功能键（Shift / Ctrl / 方向键）也触发 |
| ~~`keypress`~~ | `KeyPress` | ⚠️ **已废弃**（MDN「过时事件」），高度依赖硬件       |
| `keyup`        | `KeyUp`    | 松开                                 |



| 属性          | 值   | 说明                                                  |
| ----------- | --- | --------------------------------------------------- |
| `e.key`     | 字符串 | **推荐**。`'a'` / `'Enter'` / `'ArrowUp'` / `'Escape'` |
| `e.code`    | 字符串 | **物理按键位置**，忽略键盘布局：`'KeyY'` / `'Space'`              |
| `e.keyCode` | 数字  | ⚠️ **已废弃**（MDN「过时属性」）。`13` = 回车                     |
| `e.repeat`  | 布尔  | 是否"按住不放"引发的自动重复                                     |

- **`key` vs `code`**：QWERTY 上按 "Y" 那个**位置**，`code` 返回 `"KeyY"`，即使用户用 QWERTZ 布局（实际打出 "Z"）。→ 语义判断用 `key`；游戏 WASD 这种物理位置用 `code`。
- **全局快捷键绑 `document`** —— 键盘事件只发给**有焦点**的元素，绑在 `div` 上多半没反应。
- **按住不放会持续触发 `keydown`** → 要"只执行一次"就 `if (e.repeat) { return; }`。
- ⭐ **处理文本输入别用键盘事件，用 `input` 事件** —— MDN 明确建议。原因：中文输入法 / 粘贴 / 手写板都不给 `keydown`。

## 9. 事件对象 `e`（第 100-101 集）

**来源**：浏览器收到交互 → **新建一个 `Event` 对象** → 调用你的处理函数 → 把它当**第一个（唯一）实参**塞进去。

- MDN：「事件监听器**仅仅接受事件对象这一个自动传入的参数**，并且它的**返回值还会被忽略**。」
- **形参必须写**，名字随意；不写就拿不到（`e is not defined`）。

| C#                                         | JS                              |
| ------------------------------------------ | ------------------------------- |
| `void Handler(object sender, EventArgs e)` | `function (e) {}`               |
| `sender` 与 `e` 是**两个**形参                   | 只有 `e`；"sender" 藏在 `e.target` 里 |
| 形参类型写死                                     | 只有名字，没有类型                       |
| `e.Handled = true` 标记已处理                   | 返回值被忽略                          |

| 成员                        | 是什么                                     |
| ------------------------- | --------------------------------------- |
| `e.type`                  | 事件类型字符串                                 |
| `e.target`                | **真正触发**的那个（最深的）元素，**会变**               |
| `e.currentTarget`         | **绑监听器**的那个元素，**不变**；**出了处理函数是 `null`** |
| `e.preventDefault()`      | 阻止默认行为（§14）                             |
| `e.stopPropagation()`     | 阻止冒泡（§11）                               |
| `e.clientX` / `e.offsetX` | 鼠标坐标（鼠标事件专有）                            |
| `e.key` / `e.code`        | 键盘按键（键盘事件专有）                            |

**⭐ 核心：`e.target` ≠ `e.currentTarget`。** 监听器绑在 `ul` 上、点到某个 `li` 时：`e.target` 是那个 `li`，`e.currentTarget` 是 `ul`。MDN：「`event.target` 属性可以用于实现**事件委托**」。

**两种"几乎一样"的报错要分清**

| 报错                                   | 含义        | 病根                  |
| ------------------------------------ | --------- | ------------------- |
| `... of **null** (reading 'x')`      | 查的元素不存在   | `querySelector` 没查到 |
| `... of **undefined** (reading 'x')` | 这个名字压根没定义 | 忘了写形参 `e`           |

**`return false` 的三种处境**

| 写法                                                       | 阻止默认行为？          |
| -------------------------------------------------------- | ---------------- |
| `addEventListener('click', function(){ return false; })` | **否** —— 返回值被忽略  |
| `onclick="return false"`（HTML 属性）                        | **是** —— 另一套机制   |
| `e.preventDefault()`                                     | **是** —— 唯一该用的写法 |

## 10. `this`（第 102 集）

MDN：「当使用 `addEventListener()` 为一个元素注册事件的时候，**事件处理器里的 `this` 值是该元素的引用**。其与传递给句柄的 event 参数的 **`currentTarget` 属性的值一样**。」

```
e.target         →  真正触发的那个（会变）
e.currentTarget  →  绑监听器的那个（不变）
this             →  永远 === e.currentTarget
```

| C#                       | JS                                     |
| ------------------------ | -------------------------------------- |
| `this` = **编译期定死**的当前实例  | `this` = **运行期"谁调用我"** 决定              |
| 写在 `Form1` 里就一定是 `Form1` | 浏览器调用方式 ≈ `元素.处理函数(e)` → 所以 `this` 是元素 |

- **够用版规则**：写事件处理函数时，`this` 就是绑定监听器的那个元素。其余的（对象方法 / 独立函数 / `call`·`apply`·`bind`）**属进阶篇 Day3-4**，别提前扩散。
- **实战建议：能用 `e.currentTarget` 就别用 `this`** —— `this` 依赖调用方式（抽出去复用就可能变），且箭头函数没有自己的 `this`，用 `e.currentTarget` 以后不用改。

## 11. 事件流（第 105 集）

```
① 捕获阶段  由外向内  document → div → button    ← 绑在祖先 + capture:true 的监听器在这触发
② 目标阶段  到达目标  真正被点的那个元素          ← 绑在目标自己身上的监听器在这触发（不论 capture）
③ 冒泡阶段  由内向外  button → div → document    ← 绑在祖先 + 默认的监听器在这触发
```

- MDN：「事件**从被点击的最里面的元素冒泡而出**。」
- MDN：「**默认情况下，几乎所有的事件处理程序都是在冒泡阶段注册的**。」（⚠️ 这句只管**祖先**上的监听器，见下）
- MDN：捕获「先在**最小嵌套**元素上发生，然后在连续更多的嵌套元素上发生，直到达到目标」。
- **冒泡无法关闭**，只能在处理器里截断。

### ⚠️ 11.1 「注册」≠「触发阶段」（最容易卡住的一点）

| 词        | 指什么时候                                              |
| -------- | -------------------------------------------------- |
| **注册**   | 写下 `addEventListener(...)` 那一行**代码执行**的瞬间 —— 一瞬间完事 |
| **冒泡阶段** | 将来事件**真的发生**时，监听器**被调用的时机**                        |

准确说法是「这个监听器**会在事件传播到冒泡阶段时被调用**」。`capture` 管的是**触发时机**，不是登记在哪、写在第几行。

### ⚠️ 11.2 目标元素不在这个选择题里

MDN 备注原文：「对于**事件目标**上的事件监听器来说，事件会处于"**目标阶段**"，而不是冒泡阶段或者捕获阶段。捕获阶段的事件监听器会在任何非捕获阶段的事件监听器之前被调用。」

| 写法                              | 绑在**祖先**上 | 绑在**目标自己**上              |
| ------------------------------- | --------- | ------------------------ |
| `addEventListener(t, fn)`       | 冒泡阶段（上行趟） | **目标阶段**                 |
| `addEventListener(t, fn, true)` | 捕获阶段（下行趟） | **目标阶段**（仅排在同元素非捕获监听器之前） |

**判断法**：问"这个元素**是不是事件发生的那一个**？"是 → 目标阶段，`capture` 基本无影响；不是（祖先）→ 传 `true` 走下行趟，不传走上行趟。

**顺序速记**（outer > div > btn，点 btn）：默认 `btn → div → outer`；全传 `true` 则 `outer → div → btn`。两张表里 **`btn` 始终是目标阶段**，变的只是两个祖先谁先。

**只有两种场合需要 `capture: true`**：① 想在事件**到达子元素之前**先手截住；② 在祖先上接住**不冒泡**的事件（`focus` / `blur` / `mouseenter`）—— 这是 `focus` 做委托的第二个解法（第一个是改用 `focusin`）。

**开捕获**

```js
元素.addEventListener('click', fn, true);               // 简写
元素.addEventListener('click', fn, { capture: true });    // 完整写法（推荐）
```

**`stopPropagation()` 只干一件事** —— MDN：「阻止**捕获和冒泡阶段**中当前事件的进一步传播。但是，它**不能防止任何默认行为的发生**」，「它**也不能阻止附加到相同元素的相同事件类型的其他事件处理器**」。

| 想做             | 用什么                            |
| -------------- | ------------------------------ |
| 拦传播（不让祖先收到）    | `e.stopPropagation()`          |
| 拦默认行为（跳转 / 提交） | `e.preventDefault()`（§14）      |
| 连同元素上的其他监听器一起拦 | `e.stopImmediatePropagation()` |

⚠️ **C# 对比**：WinForms 的事件**没有任何传播路径**，这一轮类比失效。唯一例外是 WPF 路由事件（`Preview*` = 捕获，`e.Handled` ≈ 截断）。

## 12. 解绑的完整匹配规则（第 106 集）

MDN：「若传入的参数**不能用于确定当前注册过的任何一个事件监听器**，该函数**不会起任何作用**。」（= **静默失败**）  
MDN：「唯一需要 `removeEventListener()` 检测的是 `capture` / `useCapture` 标志。**这个标志必须与 `removeEventListener()` 的对应标志匹配**，但是其他的值不需要。」

| 解绑写法                                                       | 结果                    |
| ---------------------------------------------------------- | --------------------- |
| `removeEventListener('click', handlerB)`                   | ✅ 同一引用 + 同一 `capture` |
| `removeEventListener('click', function () {})`             | ❌ 无效且**不报错**          |
| `addEventListener(..., true)` 后 `removeEventListener(...)` | ❌ `capture` 不匹配       |
| `addEventListener(..., { once: true })`                    | 触发一次后**浏览器自动解绑**      |

⚠️ 官方警告：同一函数分别为捕获和冒泡注册过一次，**两个版本必须分别移除**。

**真需要解绑的场景**：定时器里绑的事件 / 只需生效一次的动作 / 单页应用切页面。其余（元素本身会被删除、绑在长期存在的元素上）通常不用管。

## 13. 事件委托（第 107 集）

MDN：「在它们的**父元素上设置事件监听器**，让发生在它们身上的事件**冒泡到它们的父元素上**，而不必在每个子元素上单独设置事件监听器。」  
MDN 备注：用 `event.target` 取**目标元素**（最里面的），用 `event.currentTarget` 取**处理事件的元素**（容器）。

```js
父元素.addEventListener('click', function (e) {
  if (e.target.tagName !== 'LI') { return; }   // ① 身份检查（必做）
  e.target.classList.add('hot');               // ② 直接操作那个孩子
});
```

| 做法 A：每个子元素各绑一次 | 做法 B：事件委托      |
| -------------- | -------------- |
| ×N 个监听器        | ×1 个监听器        |
| 新增元素**必须手动再绑** | 新增元素**自动生效** ⭐ |
| 逻辑散落 N 处       | 逻辑只有一处         |

**能/不能委托**

| 事件                                | 能委托吗  | 替代                         |
| --------------------------------- | ----- | -------------------------- |
| `click` / `keydown` / `mousemove` | ✅ 会冒泡 | —                          |
| `focus` / `blur`                  | ❌ 不冒泡 | **`focusin` / `focusout`** |
| `mouseenter` / `mouseleave`       | ❌ 不冒泡 | 只能换用 `mouseover`（接受性能代价）   |

**四个坑**

1. `e.target` 可能是 `ul` 自己（点在间隙）或更深的后代（`li` 里的 `span`）→ **必须身份检查**。（更精确的 `e.target.closest('li')` 属进阶篇。）
2. **不冒泡的事件全都不能委托**（回看第 4 节的冒泡列）。
3. 子元素里写 `stopPropagation()` 会**直接掐死父元素的委托**。
4. 孩子们逻辑各异时，硬套委托反而绕 —— 它只适合「一批同类元素 + 同一套逻辑」。

## 14. 三种「拦截」（第 109 集）

**一次事件有四个阶段、三处可插手，而它们互不相干。**

```
① 事件发生 → ② 沿树传播 → ③ 监听器逐个执行 → ④ 浏览器执行默认动作
              ↑ 闸门A          ↑ 闸门B              ↑ 闸门C
```


| 闸门 | 管什么 | **不**管什么 |
|---|---|---|
| `e.stopPropagation()` | 事件**还给不给祖先** | 浏览器的默认动作 |
| `e.stopImmediatePropagation()` | 同一元素上**后面的监听器** | 传播、默认动作 |
| `e.preventDefault()` | 浏览器的**默认动作** | **事件照常继续传播** |

MDN（`preventDefault`）：「告诉用户代理：此事件被显式处理，它**默认的动作**（例如页面滚动、链接跳转或粘贴文本）不应该照常执行。」紧接着：「**此事件仍会继续传播**」。

⚠️ **C# 类比在这里会误导你**：WPF 的 `e.Handled = true` **同时**阻止路由继续传播**和**阻止默认处理——一件事打包。DOM 把它**拆成两个开关**。
✅ 真 C# 对标：WinForms 的 `FormClosingEventArgs.Cancel = true` / `KeyPressEventArgs.Handled`（"我处理了，你别执行原动作"）。

**`preventDefault` 的两个静默失效场景**

| 场景 | MDN 原话 |
|---|---|
| 事件**不可取消** | 「对于不可取消的事件……调用 `preventDefault()` **没有任何效果**」；用 `Event.cancelable` 检查 |
| 监听器是 **passive** | 「不会发生任何事情，并且可能会生成**控制台警告**」 |

回连 §3 的"可取消"列：**`focus` / `blur` 不可取消** → 对它们调 `preventDefault` 是白调。
**有效时机**：MDN「在**事件流的任何阶段**调用 `preventDefault()` 都会取消事件」——捕获阶段调也有效。

**常用落点**

| 目标 | 绑什么事件 | 备注 |
|---|---|---|
| 链接不跳转 | `click` | `e.preventDefault()` |
| 表单不刷新 | **`submit`** | ⚠️ 别绑按钮的 `click`——按回车提交时没有 `click` |
| 禁右键菜单 | `contextmenu` | — |
| 禁选中文字 | `selectstart` | 课程外 |
| 禁拖拽图片 | `dragstart` | 课程外 |

## 15. 页面加载与滚动事件（第 110-111 集）

| | `DOMContentLoaded` | `load` |
|---|---|---|
| 触发时机 | HTML 解析完 + **延迟脚本**执行完 | **所有依赖资源**（图片 / 样式 / 子框架）加载完 |
| 绑在哪个对象 | **`document`** | **`window`** |
| 冒泡 | 否 | 否 |
| 可取消 | **不可取消** | **不可取消** |

MDN（`DOMContentLoaded`）：「当 HTML 文档完全解析，且所有**延迟脚本**（`<script defer>` / `type="module"`）下载和执行完毕后，会触发……**它不会等待图片、子框架和异步脚本等其他内容完成加载。**」
MDN（`load`）：「在整个页面及**所有依赖资源**如样式表和图片都已完成加载时触发。」
MDN（`load`）备注：「**所有以 `load` 命名的事件都不会传递到 `Window` 上**……必须在 `window` 上**直接绑定**。」

**⭐ MDN 点名的常见错误**：「有一个常见的错误就是在 `DOMContentLoaded` 事件**更合适时使用了 `load` 事件**。」
→ 判断法：**只是要操作元素 → `DOMContentLoaded`；真需要图片真实宽高 → 才用 `load`。**

**三种解法**（解 §`JS--DOM速查表-查询与改内容.md` 里"script 放 head 拿不到元素"的坑）

| 解法 | 写法 | 评价 |
|---|---|---|
| 放 `</body>` 前 | — | 简单；脚本大时首屏慢 |
| 包进事件 | `document.addEventListener('DOMContentLoaded', fn)` | 本集主角 |
| `defer` 属性 | `<script defer src="x.js">` | 现代做法；`DOMContentLoaded` 正好等它 |

**⭐ 真坑：监听器加晚了 → 回调永不执行。**
MDN：「在你的脚本有机会运行前，`DOMContentLoaded` 可能就已经被触发。所以你在决定添加一个事件监听器前**最好先检查一下**。」
`document.readyState`：`'loading'` → `'interactive'`（≈ `DOMContentLoaded`）→ `'complete'`（≈ `load`）。

**`scroll`**

```js
window.addEventListener('scroll', function () {
  const top = document.documentElement.scrollTop;   // 读页面滚了多少
  document.documentElement.scrollTop = 0;           // 写 → 回到顶部
});
```

- 绑 **`window`**（整页滚动）或绑**有滚动条的元素**。
- 读距离用 **`document.documentElement.scrollTop`**（老教程的 `document.body.scrollTop` 不通用）。
- **和 `mousemove` 一样是高频事件**（回连 §7）——里面别做重活。
- 经典用途：回顶按钮、导航吸顶、滚动加载。

## 16. 触摸事件（第 122 集）

| 事件 | 时机 |
|---|---|
| `touchstart` | 手指落下（触发一次） |
| `touchmove` | 滑动中（**反复触发，频率不可依赖**） |
| `touchend` | 手指离开 |
| `touchcancel` | 被系统打断（弹窗 / 划出屏幕 / 触点超限） |

| 列表 | 装什么 |
|---|---|
| `e.touches` | 此刻**还在平面上**的所有触点 |
| `e.targetTouches` | 上面那些里、**起始于当前元素**的 |
| `e.changedTouches` | **本次事件里状态发生变化**的触点 |

⭐ **必背：`touchend` 时 `e.touches` 是空的** —— 手指已经离开平面，所以"还在平面上的点"自然是 0 个。要拿刚抬起的那个点，必须读 **`changedTouches`**。  
MDN：「已经被从触摸平面上移除的触点，可以在 `changedTouches` 属性定义的 `TouchList` 中找到。」

⚠️ **`preventDefault()` 在触摸事件上默认无效** —— MDN：「Chrome 从版本 56 开始，`touchstart` 和 `touchmove` 的 `passive` 选项的**默认值就是 `true`**，调用 `preventDefault()` **无效**。如果要重写这个行为，简单地将 `passive` 选项设置成 `false` 就行。」
→ 写法：`el.addEventListener('touchmove', fn, { passive: false })`（回连 §14 的 passive 那条）

**坐标**：`Touch` 对象上同样是 `clientX/Y`、`pageX/Y`、`screenX/Y` 三套，规则见 [`JS--元素尺寸与坐标速查表.md`](./JS--元素尺寸与坐标速查表.md) §1。

⚠️ **别用 touch 事件替代 `click`** —— MDN：「很值得注意的是，在很多情况下，**触摸事件和鼠标事件会一起触发**」→ 两套都绑，一次点击逻辑会跑两遍。触摸事件只留给鼠标表达不了的操作（滑动 / 拖拽 / 多指手势）。

**桌面调试**：DevTools → 设备模式（Ctrl+Shift+M），鼠标拖动会被模拟成触摸事件。

