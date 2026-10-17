==一：概念==

**SVG描边动画**，就是让SVG图形的线条像被一笔一画“画”出来一样，产生动态绘制的效果。

它的核心原理是利用 `stroke-dasharray` 和 `stroke-dashoffset` 这两个属性，给描边“做手脚”。

- **`stroke-dasharray`**：把原本实心的线条变成**虚线**。它的值定义了虚线的“线段长度”和“间隔长度”。[](https://cloud.tencent.com.cn/developer/article/2415304?policyId=1004#1)
    
- **`stroke-dashoffset`**：控制虚线图案的**起始偏移量**。它决定虚线从路径的哪个位置开始画。[](https://developer.aliyun.com/article/1513355#1)
    

**关键技巧**：把 `stroke-dasharray` 和 `stroke-dashoffset` 都设置为**大于等于路径总长度的值**。这样，虚线中“线段”的部分就会因为偏移量太大而被完全推出可见区域，路径看起来就是**完全空白的**。然后，通过动画让 `stroke-dashoffset` 逐渐变为 `0`，虚线就会慢慢“移动”进来，从而产生线条被绘制的动画效果。[](https://egghead.io/lessons/css-use-css-animation-to-draw-svg)[](https://developer.aliyun.com/article/1513355#1)

==二：格式==

**1. 核心属性与动画写法**

```css

.path {
    fill: none;                /* 去掉默认的黑色填充 */
    stroke: #f40;              /* 描边颜色 */
    stroke-width: 10;          /* 描边宽度 */
    stroke-linecap: round;     /* 描边端点为圆头 */
    stroke-dasharray: var(--l);/* 虚线长度 = 路径总长度 */
    stroke-dashoffset: var(--l);/* 偏移量 = 路径总长度，使线条不可见 */
    animation: stroke 2s forwards; /* 应用动画，结束后保持状态 */
}
@keyframes stroke {
    to {
        stroke-dashoffset: 0;  /* 最终偏移量归零，线条完全显示 */
    }
}
```

[](https://developer.aliyun.com/article/1513355#1)[](https://developer.aliyun.com/article/1441029#1)

**2. 获取路径总长度**  
在 CSS 中无法直接得知路径有多长，需要用 JavaScript 动态获取：

```javascript

const path = document.querySelector('.path');
const length = path.getTotalLength(); // 获取路径总长度
path.style.setProperty('--l', length); // 将长度赋值给 CSS 变量 --l

```
[](https://developer.aliyun.com/article/1513355#1)

==三：代码==

**HTML (`svg-draw.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>SVG描边动画</title>
    <link rel="stylesheet" href="./CSS/svg-draw.css">
</head>
<body>
    <svg class="icon" viewBox="0 0 1024 1024" width="300" height="300">
        <!-- 一个简单的圆形路径 -->
        <circle class="path" cx="512" cy="512" r="400" />
    </svg>
    <script>
        const path = document.querySelector('.path');
        const length = path.getTotalLength();
        path.style.setProperty('--l', length);
    </script>
</body>
</html>
```

**CSS (`CSS/svg-draw.css`)**

```css

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background-color: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}
.path {
    fill: none;
    stroke: #4D6BFE;
    stroke-width: 20;
    stroke-linecap: round;
    stroke-dasharray: var(--l);
    stroke-dashoffset: var(--l);
    animation: stroke 3s ease-in-out forwards;
}
@keyframes stroke {
    to {
        stroke-dashoffset: 0;
    }
}
```

==四：总结==

|知识点|核心要点|
|---|---|
|**核心属性**|`stroke-dasharray`（定义虚线）和 `stroke-dashoffset`（控制偏移）|
|**关键技巧**|将两个属性都设为路径总长度，使线条初始不可见|
|**动画原理**|让 `stroke-dashoffset` 从总长度逐渐减小到 `0`，线条被“画”出来|
|**获取路径长度**|必须通过 JavaScript 的 `getTotalLength()` 方法动态获取|
|**动画控制**|`animation-fill-mode: forwards;` 让线条在动画结束后保持绘制完成的状态|
|**应用场景**|Logo 绘制动画、签名动画、加载进度条等|
