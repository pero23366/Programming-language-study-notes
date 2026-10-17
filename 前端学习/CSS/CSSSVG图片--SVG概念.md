==一：概念==

**SVG（Scalable Vector Graphics，可缩放矢量图形）** 是一种基于 XML 的**矢量图形**格式，专门用于在网页上绘制二维图形。

它和我们平时用的 JPG、PNG 有本质区别：

- **PNG/JPG（位图）**：由一个个像素点拼成，放大会模糊、出现马赛克。
    
- **SVG（矢量图）**：用**数学公式**（点、线、曲线）描述图形，无论放大多少倍，边缘永远清晰锐利。
    

**SVG 的核心优势**：

1. **不失真**：矢量图形，无限缩放。
    
2. **体积小**：纯文本（XML），代码量小，可压缩。
    
3. **可编程**：因为它是 DOM 的一部分，可以用 CSS 改变颜色、大小，用 JavaScript 添加交互和动画（你刚学的描边动画就是典型案例）。
    

==二：格式==

在 HTML 中使用 SVG 主要有**两种方式**：

**方式一：作为图片引入（简单，但无法用 CSS 操控内部）**

html

<img src="./images/icon.svg" alt="图标">

**方式二：内联 SVG（推荐，可用 CSS 和 JS 控制）**  
直接写在 HTML 里，像一个普通的标签一样：

html

<svg width="100" height="100" viewBox="0 0 100 100">
    <!-- 图形写在这里 -->
</svg>

**核心概念：`viewBox`（视口/坐标系）**  
`viewBox="0 0 100 100"` 定义了 SVG 的**内部坐标系**：左上角是 `(0,0)`，宽度 `100`，高度 `100`。里面的所有图形都基于这个坐标系来绘制，外面的 `width` 和 `height` 只是决定最终显示多大。

**常见的基础图形标签**：

- `<circle>`：圆形（`cx`, `cy`, `r`）
    
- `<rect>`：矩形（`x`, `y`, `width`, `height`, `rx`）
    
- `<line>`：直线（`x1`, `y1`, `x2`, `y2`）
    
- `<path>`：路径（最强大，用 `d` 属性描述复杂图形）
    
- `<polygon>`：多边形
    

**常用样式属性**：

- `fill`：填充颜色
    
- `stroke`：描边颜色
    
- `stroke-width`：描边宽度
    

==三：代码==

**HTML (`svg-basic.html`)**

html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>SVG基础练习</title>
    <link rel="stylesheet" href="./CSS/svg-basic.css">
</head>
<body>
    <!-- 内联 SVG，可以像普通标签一样用 CSS 控制 -->
    <svg class="icon" width="200" height="200" viewBox="0 0 100 100">
        <!-- 1. 圆形：圆心(30,30)，半径20 -->
        <circle class="circle" cx="30" cy="30" r="20" />
        <!-- 2. 矩形：左上角(60,10)，宽30，高30，圆角5 -->
        <rect class="rect" x="60" y="10" width="30" height="30" rx="5" />
        <!-- 3. 路径：画一条折线（M=移动到，L=画线到） -->
        <path class="path" d="M 10 80 L 50 50 L 90 80" />
    </svg>
</body>
</html>

**CSS (`CSS/svg-basic.css`)**

css

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background-color: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}
/* 用 CSS 控制 SVG 内部的样式 */
.circle {
    fill: #4D6BFE;          /* 填充蓝色 */
    stroke: #333;           /* 描边黑色 */
    stroke-width: 2;        /* 描边粗细 */
}
.rect {
    fill: #27ba9b;          /* 填充绿色 */
    stroke: none;           /* 不描边 */
}
.path {
    fill: none;             /* 路径不填充 */
    stroke: #e74c3c;        /* 描边红色 */
    stroke-width: 3;
    stroke-linecap: round;  /* 线条端点为圆头 */
    stroke-linejoin: round; /* 拐角圆滑 */
}

==四：总结==

|知识点|核心要点|
|---|---|
|**本质**|基于 XML 的矢量图形，用数学公式描述形状，无限放大不失真|
|**使用方式**|内联 `<svg>` 标签（可用 CSS/JS 控制）或 `<img>` 引入（无法控制内部）|
|**`viewBox`**|定义 SVG 内部坐标系，`viewBox="0 0 100 100"` 表示 100x100 的坐标系|
|**基础图形**|`<circle>`、`<rect>`、`<line>`、`<path>`（最强大）、`<polygon>`|
|**样式控制**|`fill`（填充）、`stroke`（描边）、`stroke-width`（描边宽度）|
|**在项目中的用途**|Logo、图标、复杂插图、动画（如刚学的 `stroke-dashoffset` 描边动画）|