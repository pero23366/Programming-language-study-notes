==一：概念==
2D变换的核心是 `transform` 属性，它允许你在二维平面上对元素进行**位移、旋转、缩放和倾斜**。它最大的优势是**不影响其他元素的布局**，非常适合用来做各种交互动画。
==二：格式==
`transform` 属性通过一个或多个**变换函数**来定义，多个函数之间用空格隔开。

**1. 位移 `translate()`**

- **语法**：`transform: translate(x, y);` 或 `translateX(x);` / `translateY(y);`
    
- **作用**：改变元素位置，类似定位。参数可以是像素值或百分比（相对于元素自身宽高）。
    
- **示例**：`transform: translate(50px, 100px);` 将元素向右移动50px，向下移动100px。
    

**2. 旋转 `rotate()`**

- **语法**：`transform: rotate(45deg);`
    
- **作用**：让元素在2维平面内顺时针或逆时针旋转。**正数顺时针，负数逆时针**。
    

**3. 缩放 `scale()`**

- **语法**：`transform: scale(x, y);` 或 `scaleX(x);` / `scaleY(y);`
    
- **作用**：控制元素的放大和缩小。参数**不跟单位**，是倍数（大于1放大，小于1缩小）。
    

**4. 倾斜 `skew()`**

- **语法**：`transform: skew(ax, ay);` 或 `skewX(ax);` / `skewY(ay);`
    
- **作用**：让元素沿着 X 轴或 Y 轴方向倾斜一定的角度，创造一种动态的透视效果。
    

**5. 转换中心点 `transform-origin`**

- **语法**：`transform-origin: x y;`
    
- **作用**：设置元素转换（如旋转、缩放）的**基准点**，默认是元素的中心点 `50% 50%`。可以是像素值或方位名词（如 `left top`）。
    

**6. 综合写法**

- 可以同时写多个转换效果：`transform: translate() rotate() scale();`
    
- **顺序非常重要**，会直接影响最终效果。当同时有位移和其他属性时，**必须把位移 `translate` 写在最前面**。
==三：代码==
新建 `2d转换.html`，把鼠标悬停在每个盒子上，感受不同转换效果的区别。

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>2D转换练习</title>
    <style>
        .box {
            width: 100px;
            height: 100px;
            background-color: #4D6BFE;
            margin: 50px;
            transition: all 0.5s; /* 让变化有过渡效果 */
            color: #fff;
            text-align: center;
            line-height: 100px;
        }
        /* 1. 位移 */
        .translate:hover {
            transform: translate(50px, 50px);
        }
        /* 2. 旋转 */
        .rotate:hover {
            transform: rotate(45deg);
        }
        /* 3. 缩放 */
        .scale:hover {
            transform: scale(1.5);
        }
        /* 4. 改变中心点旋转 */
        .origin:hover {
            transform-origin: left top;
            transform: rotate(90deg);
        }
        /* 5. 综合写法 */
        .complex:hover {
            transform: translate(50px, 50px) rotate(45deg) scale(1.2);
        }
    </style>
</head>
<body>
    <div class="box translate">位移</div>
    <div class="box rotate">旋转</div>
    <div class="box scale">缩放</div>
    <div class="box origin">改变中心点</div>
    <div class="box complex">综合</div>
</body>
</html>
```

> **注意**：`transition` 是过渡属性，能让转换效果平滑显示，而不是瞬间完成。它通常和 `transform` 配合使用，**谁做过渡给谁加**。
==四：总结==

2D转换的核心是 **`transform` 属性**，通过它可以让元素**位移、旋转、缩放**。它最大的优势是**不影响其他元素的布局**，非常适合用来做精细的视觉调整和交互动画。