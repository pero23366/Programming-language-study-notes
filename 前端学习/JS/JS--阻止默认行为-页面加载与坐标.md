# 第 7 轮 · 阻止默认行为 · 页面加载与滚动 · 坐标与尺寸

> 覆盖第 **109-112 集**（应用篇 Day3）。
> 速查底座：[`JS--事件速查表-绑定与常见事件.md`](./JS--事件速查表-绑定与常见事件.md)、[`./JS--元素尺寸与坐标速查表.md`](./JS--元素尺寸与坐标速查表.md)
> 上一课：[`JS--事件阶段与监听器注册.md`](./JS--事件阶段与监听器注册.md)（事件阶段与"注册"的澄清）
> 权威来源：MDN（见 MDN 各节外链）

---

## ==一：概念==

### ⑲ 阻止默认行为 —— 三种「拦截」是三个独立开关

一次事件有四个阶段，能插手的地方有三处。**关键认知：它们互不相干。**

| 你想拦的东西 | 用哪个 | 它**不**管什么 |
|---|---|---|
| 事件**还给不给祖先** | `e.stopPropagation()` | 浏览器的默认动作 |
| 同一元素上**后面的监听器** | `e.stopImmediatePropagation()` | 传播、默认动作 |
| 浏览器的**默认动作** | `e.preventDefault()` | **事件照常继续传播** |

MDN 对 `preventDefault` 的定义：告诉用户代理「此事件被显式处理，它**默认的动作**（例如页面滚动、链接跳转或粘贴文本）不应该照常执行」。紧接着一句是关键：**「此事件仍会继续传播」**。

**⚠️ C# 类比在这里会误导你**：WPF 的 `e.Handled = true` **同时**阻止路由继续传播 **和** 阻止默认处理——一件事打包。DOM 把它**拆成两个开关**。所以"点了链接不跳转、但父容器上的监听器照样收到"完全合法。

**两个使 `preventDefault` 失效的情况**：
- **事件不可取消**。MDN：「对于不可取消的事件……调用 `preventDefault()` 是没有任何效果的」；用 `Event.cancelable` 检查。回连 ⑫：`focus` / `blur` **不可取消**。
- **监听器是 passive 的**。MDN：「如果被动监听器调用 `preventDefault()`，则不会发生任何事情，并且可能会生成控制台警告」。

**有效的时机**：MDN：「**在事件流的任何阶段**调用 `preventDefault()` 都会取消事件」——捕获阶段调也有效。

**真 C# 对标**：WinForms 的 `FormClosingEventArgs.Cancel = true` / `KeyPressEventArgs.Handled`——"我处理了，你别执行原动作"。这个可以直接迁移。

### ⑳ 页面加载：`DOMContentLoaded` vs `load`

| | `DOMContentLoaded` | `load` |
|---|---|---|
| 触发时机 | HTML 解析完 + **延迟脚本**执行完 | **所有依赖资源**（图片/样式/子框架）加载完 |
| 绑在哪个对象 | **`document`** | **`window`** |
| 冒泡 | 否 | 否 |
| 可取消 | **不可取消** | **不可取消** |

MDN 对 `DOMContentLoaded`：「**它不会等待图片、子框架和异步脚本等其他内容完成加载。**」
MDN 对 `load`：「在整个页面及所有依赖资源如样式表和图片都已完成加载时触发。」

**⭐ MDN 点名的常见错误**：「有一个常见的错误就是在 `DOMContentLoaded` 事件更合适时使用了 `load` 事件。」
→ 判断法：**只是要操作元素 → `DOMContentLoaded`；真需要图片的真实宽高 → 才用 `load`。**

**`load` 的一个特殊备注**（MDN）：「**所有以 `load` 命名的事件都不会传递到 `Window` 上**……相关的 `load` 事件必须**直接绑定到 `window`** 上。」

**三种解法对照**（解第 ② 轮那个"script 放 head 拿不到元素"的坑）：

| 解法 | 写法 | 评价 |
|---|---|---|
| 放 `</body>` 前 | —— | 简单，脚本大时首屏慢 |
| 包进事件 | `document.addEventListener('DOMContentLoaded', fn)` | 本集主角 |
| `defer` 属性 | `<script defer src="x.js">` | 现代做法，`DOMContentLoaded` 正好等它 |

**⭐ 真坑：监听器加晚了 → 回调永不执行。** MDN：「在你的脚本有机会运行前，`DOMContentLoaded` 可能就已经被触发。所以你在决定添加一个事件监听器前最好先检查一下。」
`document.readyState` 三值：`'loading'` → `'interactive'`（≈DOMContentLoaded）→ `'complete'`（≈load）。

**`scroll` 事件**：
- 绑 **`window`**（整个页面滚动）或绑**有滚动条的元素**。
- 读页面滚动距离用 **`document.documentElement.scrollTop`**（老教程的 `document.body.scrollTop` 不通用）。
- **和 `mousemove` 一样是高频事件**（回连 ⑪）——里面别做重活。
- 经典用途：回顶按钮、导航吸顶、滚动加载。

### ㉑ 鼠标坐标三兄弟

| 属性 | 从哪量起 |
|---|---|
| `offsetX` / `offsetY` | **`e.target` 的左内边（padding edge）** |
| `clientX` / `clientY` | **视口**左上角 |
| `pageX` / `pageY` | **整个文档**左上角（含滚动） |

- MDN（`offsetX`）：「规定了事件对象与**目标节点**的内填充边（padding edge）在 X 轴方向上的偏移量。」
- MDN（`clientX`）：「提供了事件发生时应用程序**视口**内的水平坐标（**而不是页面中的坐标**）。例如，单击视口的左边缘时，**无论页面是否水平滚动**，都会触发一个 `clientX` 值为 `0` 的鼠标事件。」
- MDN（`pageX`）：「相对于**整个文档**的 x（水平）坐标……**考虑任何页面的水平方向上的滚动**。举个例子，如果页面向右滚动 200px……鼠标点击距离窗口左边 100px 的位置，`pageX` 所返回的值将是 **300**。」

**C# 对标**：`MouseEventArgs.X / Y`（相对控件客户区）↔ `offsetX / offsetY`；`Cursor.Position`（相对屏幕）↔ `screenX / screenY`。

**⚠️ 最大的坑**：`offsetX` 量的是相对 **`e.target`**——**真正被点的那个元素**，不是 `e.currentTarget`。回连 ⑭：`li` 里套 `span`，点在 `span` 上时 `offsetX` 相对 `span`，**不是相对 `li`**。

### ㉑ 元素尺寸三兄弟

| 属性 | 含什么 | 不含什么 |
|---|---|---|
| `offsetWidth` | **边框 + 内边距 + 滚动条** | 外边距、伪元素 |
| `clientWidth` | **内边距** | **边框**、外边距、滚动条 |
| `scrollWidth` | 内容**实际**宽度（含溢出部分） | 边框、外边距 |

MDN（`offsetWidth`）：「以**整数**形式返回元素的布局宽度……包括任何**边框、内边距**和垂直滚动条（如果已渲染）。它**不包括伪元素**」；「如果元素被隐藏……则返回 `0`」。
MDN（`clientWidth`）：「对于**内联元素以及没有 CSS 样式的元素为 0**；否则，它是元素内部的宽度。该属性包括**内边距**，但**不包括边框、外边距和垂直滚动条**」；「该属性值会被**四舍五入**为一个整数。如果你需要一个小数值，可使用 `element.getBoundingClientRect()`」；另有特例：在根元素 `<html>` 上返回**视口宽度**。

**C# 对标**：`Control.ClientSize.Width` ↔ `clientWidth`（都是"客户区"、都**不含边框**）；`Control.Width` ↔ `offsetWidth`。

**`scrollTop`**：MDN「**可以获取或设置**元素内容从其顶部边缘滚动的像素数」→ **可读可写**。Safari 橡皮筋回弹会出现**负值**；`flex-direction: column-reverse` 时也可能为负。

---

## ==二：格式==

```js
// ⑲ 三种拦截
e.preventDefault();                 // 拦默认动作，不影响传播
e.stopPropagation();                // 截断传播，不影响默认动作
e.stopImmediatePropagation();       // 截断同元素其余监听器
if (e.cancelable) { /* 才值得拦 */ }

// ⑳ 页面加载
document.addEventListener('DOMContentLoaded', function () { });
window.addEventListener('load', function () { });
if (document.readyState === 'loading') { /* 还没好 */ }

// ⑳ 滚动
window.addEventListener('scroll', function () {
  const top = document.documentElement.scrollTop;
});

// ㉑ 鼠标坐标
e.offsetX;  e.clientX;  e.pageX;
e.offsetY;  e.clientY;  e.pageY;

// ㉑ 元素尺寸与位置
el.offsetWidth;  el.clientWidth;  el.scrollWidth;
el.offsetLeft;   el.offsetTop;    el.offsetParent;
el.scrollTop = 0;                   // 可写 → 滚到顶部
el.getBoundingClientRect();          // 要小数用这个
```

---

## ==三：代码==

### 1. 三种拦截互不干扰

```html
<!DOCTYPE html>
<html>
<body>
  <a id="link" href="https://example.com">点了不会跳</a>
  <p id="log">试试点链接</p>

  <script>
    const link = document.querySelector('#link');
    const log = document.querySelector('#log');

    link.addEventListener('click', function (e) {
      e.preventDefault();                    // 默认动作没了
      log.innerText = '链接被拦下了';
      // 但没写 stopPropagation → 这个 click 仍会冒泡到 document
    });

    document.addEventListener('click', function (e) {
      console.log('document 照样收到，target =', e.target.tagName);   // A
    });
  </script>
</body>
</html>
```

### 2. 表单用 `submit` 而不是按钮的 `click`

```js
form.addEventListener('submit', function (e) {
  e.preventDefault();                 // 阻止刷新页面
  const input = document.querySelector('input[name="keyword"]');
  console.log('要提交的是：' + input.value);   // 真实项目：这里去发接口
});
```

⚠️ **为什么不用按钮的 `click`**：用户**按回车**也能提交表单，那时不会有 `click`。

### 3. `DOMContentLoaded` 解掉"script 放 head"的坑

```html
<script>
  // ✗ console.log(document.querySelector('#box'));   // null
  document.addEventListener('DOMContentLoaded', function () {
    console.log('能查了：', document.querySelector('#box'));
    console.log('readyState =', document.readyState);   // 'interactive'
  });
</script>
```

### 4. 三套坐标一次打出来

```js
box.addEventListener('mousemove', function (e) {
  console.log('offsetX=' + e.offsetX + ' clientX=' + e.clientX + ' pageX=' + e.pageX);
});
```

---

## ==四：总结==

1. **三个拦截是三个独立开关** —— `stopPropagation` 管传播、`stopImmediatePropagation` 管同元素后续监听器、`preventDefault` 管默认动作。**`preventDefault` 不影响传播**（和 WPF 的 `e.Handled` 打包行为不同）。
2. `preventDefault` 对**不可取消**的事件（`focus` / `blur`）和 **passive** 监听器都无效，且**静默失效**。表单要用 **`submit`** 事件而不是按钮 `click`。
3. **`DOMContentLoaded`（document，只等 DOM）** vs **`load`（window，等全部资源）**。MDN 点名"该用前者时用了后者"是常见错误。三种解法：放 `body` 末尾 / 包事件 / `defer`。
4. **监听器加晚了回调永不执行** → 用 `document.readyState` 先检查。
5. `scroll` 绑 `window`，用 **`document.documentElement.scrollTop`** 读距离；**高频事件，别做重活**。
6. **三套坐标的差别只在"从哪量起"**：`offsetX` 从 `e.target` 左内边、`clientX` 从视口、`pageX` 从文档。**`offsetX` 跟的是 `e.target` 不是 `currentTarget`**。
7. **尺寸三兄弟**：`offsetWidth` 含边框、`clientWidth` 不含边框（= C# 的 `ClientSize`）、`scrollWidth` 含溢出。三者都是**整数**；要小数用 `getBoundingClientRect()`。`display: none` 时全 0；内联元素 `clientWidth` 为 0。
8. `offsetLeft/offsetTop` 相对 **`offsetParent`**（最近的有定位祖先），**不是**父元素。`scrollTop` **可读可写**。

---

## 动手练习

做一个「回到顶部」按钮，要求：

1. 页面拉高到 1500px，右下角固定一个按钮；
2. 按钮一开始**隐藏**，页面滚动超过 300px 时用 `classList` 显示出来，否则隐藏；
3. 点按钮让页面滚回顶部（提示：`document.documentElement.scrollTop = 0`）；
4. 再加一个链接，点击时**不跳转**但把它的 `href` 打到控制台。

**只用本轮学的东西**：`scroll` 事件、`classList`、`preventDefault`、`scrollTop`。

---

## 原文引用

- [`Event.preventDefault()` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/preventDefault)
- [`Document: DOMContentLoaded` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/DOMContentLoaded_event)
- [`Window: load` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/load_event)
- [`MouseEvent.offsetX` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/offsetX) ｜ [`clientX`](https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/clientX) ｜ [`pageX`](https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/pageX)
- [`Element.clientWidth` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/clientWidth) ｜ [`HTMLElement.offsetWidth`](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/offsetWidth)
- [`Element.scrollTop` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollTop)

---

**有不清楚的地方，直接问。** 我是你的老师，任何一处卡住都值得停下来问清楚——尤其是 ⑲「两个开关」和 ㉑「三套坐标」，这两处是后面所有综合案例（放大镜、吸顶导航、拖拽）的地基。
