# JS--元素尺寸与坐标速查表

> 覆盖第 **112 集**（应用篇 Day3）。与 [`JS--DOM速查表-查询与改内容.md`](./JS--DOM速查表-查询与改内容.md)（怎么查元素）、[`JS--事件速查表-绑定与常见事件.md`](./JS--事件速查表-绑定与常见事件.md)（事件怎么来）配套。
> 权威来源：MDN（见 MDN 各节外链）。⚠️ 本节数字全部为**整数**，要小数用 `getBoundingClientRect()`。

---

## 1. 鼠标 / 事件坐标：差别只在「从哪量起」

| 属性 | 原点 | 量到哪 | 何时用 |
|---|---|---|---|
| `e.offsetX` / `offsetY` | **`e.target` 的左内边（padding edge）** | 鼠标点 | 元素**内部**的相对位置：画板、拖拽、自定义滑条 |
| `e.clientX` / `clientY` | **视口**左上角 | 鼠标点 | 固定在**屏幕**上的东西：跟随鼠标的浮层、自定义右键菜单 |
| `e.pageX` / `pageY` | **整个文档**左上角 | 鼠标点 | 跟**内容**绑定的位置：随页面滚动的标记、批注 |
| `e.screenX` / `screenY` | **物理屏幕**左上角 | 鼠标点 | 极少用（≈ C# 的 `Cursor.Position`） |

**三者的关系式**（只有 X 轴写出来，Y 同理）：

```js
pageX === clientX + 页面水平滚动距离      // 页面没横向滚动时，两者相等
offsetX === 鼠标点 - e.target 的 padding edge    // 依赖 e.target，会随目标元素变
```

**MDN 原话**：
- `offsetX`：「规定了事件对象与**目标节点**的**内填充边（padding edge）**在 X 轴方向上的偏移量。」
- `clientX`：「提供了事件发生时应用程序**视口**内的水平坐标（**而不是页面中的坐标**）。例如，单击视口的左边缘时，**无论页面是否水平滚动**，都会触发一个 `clientX` 值为 `0` 的鼠标事件。」
- `pageX`：「相对于**整个文档**的 x 坐标……**考虑任何页面的水平方向上的滚动**。举个例子，如果页面向右滚动 200px 并出现了滚动条……鼠标点击距离窗口左边 100px 的位置，`pageX` 所返回的值将是 **300**。」

**候选 C# 对标**：`MouseEventArgs.X / Y`（相对控件**客户区**）↔ `offsetX / offsetY`。

### ⭐ 本节最容易踩的一个

**`offsetX` 量的是相对 `e.target`（真正被点的那个元素），不是 `e.currentTarget`。**

`<li>` 里嵌了 `<span>`，点在 `span` 上 → `offsetX` 相对 **`span`**。想拿「相对 `li` 的坐标」，得自己减或用 `getBoundingClientRect()`。

---

## 2. 元素尺寸：三个宽度差在「含不含边框」

| 属性 | 含边框 | 含内边距 | 含滚动条 | 含溢出内容 | 备注 |
|---|---|---|---|---|---|
| `el.offsetWidth` | **是** | 是 | 是 | 否 | 布局宽度，`display:none` 时为 **0** |
| `el.clientWidth` | **否** | 是 | **否** | 否 | **内联元素为 0**；`<html>` 上是**视口宽度** |
| `el.scrollWidth` | 否 | — | — | **是** | 内容实际宽度（含被滚出去的部分） |

**MDN 原话**：
- `offsetWidth`：「以**整数**形式返回元素的布局宽度……包括任何**边框、内边距**和垂直滚动条（如果已渲染）。它**不包括伪元素**（如 `::before` 或 `::after`）的宽度。」「如果元素被隐藏……则返回 **0**。」
- `clientWidth`：「对于**内联元素以及没有 CSS 样式的元素为 0**；否则，它是元素内部的宽度。该属性包括**内边距（padding）**，但**不包括边框（border）、外边距（margin）和垂直滚动条**（如果存在）。」「该属性值会被**四舍五入**为一个整数。如果你需要一个小数值，可使用 `element.getBoundingClientRect()`。」

**C# 对标 —— 一对一，可以直接迁移**：

| C# | DOM |
|---|---|
| `Control.ClientSize.Width`（客户区，不含边框） | `el.clientWidth` |
| `Control.Width`（含边框） | `el.offsetWidth` |
| `Control.Left / Top`（相对父容器客户区） | `el.offsetLeft / offsetTop`（⚠️ 见下节差异） |

### 一句话选择

> **量内容包括溢出的 → `scrollWidth`；量"能看到的内容区" → `clientWidth`；量"整个盒子占多大" → `offsetWidth`。**

---

## 3. 元素位置：`offsetLeft` 不是相对父元素

| 属性 | 相对谁 |
|---|---|
| `el.offsetLeft` / `offsetTop` | **`el.offsetParent`** —— 最近的一个「**有定位**」的祖先（`position` 不是 `static`）；一路找不到就到 `<body>` |
| `el.offsetParent` | 上面那个祖先元素（只读） |

⚠️ **这是最容易搞错的一条**：父元素**没有** `position` 时，`offsetLeft` 会**跳过它**，一路往上找。想拿"相对直接父元素"的位置，**不要用 `offsetLeft`**。

---

## 4. 滚动

| 想读 / 写什么 | 用什么 |
|---|---|
| 某个**有滚动条元素**滚了多少 | `el.scrollTop` / `el.scrollLeft`（**可读可写**） |
| **整个页面**滚了多少 | `document.documentElement.scrollTop`（老教程写 `document.body.scrollTop`，不通用） |
| 让页面回到顶部 | `document.documentElement.scrollTop = 0` |
| 让元素滚到指定位置 | `el.scrollTop = 100` |

**MDN 原话**（`scrollTop`）：「属性**可以获取或设置**元素内容从其顶部边缘滚动的像素数。」

**两个边界情况**（MDN 明说）：
- **Safari 的橡皮筋回弹**会把 `scrollTop` 更新到最大滚动位置之外 → **可能出现负值**（Chrome / Firefox 不会）。
- `flex-direction: column-reverse` 且内容向上增长时，`scrollTop` 也可能为**负**。

→ 实践：判断"是否滚到顶部"写 `top <= 0`，或者干脆用 `window.scrollY`。

---

## 5. 最容易写错的六行

| ✗ 常写错 | ✓ 正确 | 为什么 |
|---|---|---|
| `document.body.scrollTop` | `document.documentElement.scrollTop` | 前者不通用 |
| 「点到 `span`，`offsetX` 相对 `li`」 | 相对 **`span`（= `e.target`）** | `offsetX` 跟 `target`，不是 `currentTarget` |
| `el.offsetWidth` 当"内容宽度" | 内容是 `scrollWidth` | `offsetWidth` 含边框和滚动条 |
| 用 `offsetWidth` 做动画插值 | `getBoundingClientRect()` | 前者是**整数**，会抖动 |
| 隐藏元素上量 `offsetWidth` | 先让它渲染出来 | `display:none` 时返回 **0** |
| `span.clientWidth` 取宽度 | 内联元素用 `getBoundingClientRect()` | 内联元素 `clientWidth` 为 **0** |

---

## 6. 课程外补充（知道有就行）

- **`el.getBoundingClientRect()`** —— 返回**浮点数**精确值，且是**相对视口**的（含 `top/left/width/height`）。需要小数或需要"相对视口"时用它。⚠️ 本课程未讲，属课外。
- **`window.scrollY`** —— 页面垂直滚动距离的另一种读法，比 `scrollTop` 更直观。
- **`el.scrollIntoView()`** —— 直接让元素滚进视野。
- **`el.scrollTo({ top: 0, behavior: 'smooth' })`** —— 平滑滚动（要传对象参数）。
- **`el.clientLeft` / `clientTop`** —— 等于边框宽度，很少用。

---

## 相关

- 事件怎么来、怎么拦：[`JS--事件速查表-绑定与常见事件.md`](./JS--事件速查表-绑定与常见事件.md)
- 元素怎么查、怎么改：[`JS--DOM速查表-查询与改内容.md`](./JS--DOM速查表-查询与改内容.md)
- C# 类比可用度：[`JS--CSharp类比可用度地图.md`](./JS--CSharp类比可用度地图.md)
- 详解课：[`./JS--阻止默认行为-页面加载与坐标.md`](./JS--阻止默认行为-页面加载与坐标.md)

> 本表随进度**就地扩写**，不要另建新表。
