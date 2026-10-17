==一：概念==

**`clip-path`** 是 CSS 中一个用来“裁剪”元素的属性。你可以把它想象成一把**剪刀**，按照你画好的形状，把元素多余的部分剪掉，只留下形状内部的内容。

它的核心原理是：**定义一个裁剪路径，路径内部的内容显示，路径外部的内容被隐藏**。这样，原本只能显示为矩形的元素，就能被裁剪成圆形、三角形、多边形等任意形状。[](https://mdn.org.cn/en-US/docs/Web/CSS/CSS_masking/Clipping)

==二：格式==

`clip-path` 最常用的值是 **基本形状函数**，直接在括号里写参数即可：

**1. `circle()` —— 圆形**

```css

clip-path: circle(半径 at 圆心位置);
/* 示例：以元素中心为圆心，裁剪出一个半径为50%的圆 */
clip-path: circle(50% at center);
```

**2. `ellipse()` —— 椭圆**

```css

clip-path: ellipse(x半径 y半径 at 圆心位置);
/* 示例：横向半径60%，纵向半径40% */
clip-path: ellipse(60% 40% at center);

```
**3. `inset()` —— 内嵌矩形**

```css

clip-path: inset(上 右 下 左 round 圆角);
/* 示例：从四边向内收缩20px，并带10px圆角 */
clip-path: inset(20px round 10px);
```

**4. `polygon()` —— 多边形（最灵活）**

```css

clip-path: polygon(x1 y1, x2 y2, x3 y3, ...);
/* 示例：一个菱形（四个顶点） */
clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
```

坐标从元素**左上角**为起点 `(0,0)`，右下角为 `(100%,100%)`，按顺序连接各个顶点即可。

==三：代码==

**HTML (`clip-path-practice.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>clip-path 裁剪练习</title>
    <link rel="stylesheet" href="./CSS/clip-path-practice.css">
</head>
<body>
    <div class="box circle-demo">圆形</div>
    <div class="box ellipse-demo">椭圆</div>
    <div class="box polygon-demo">多边形</div>
</body>
</html>
```

**CSS (`CSS/clip-path-practice.css`)**

```css

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    background-color: #f5f5f5;
    display: flex;
    gap: 30px;
    justify-content: center;
    align-items: center;
    height: 100vh;
}
.box {
    width: 200px;
    height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 20px;
    font-weight: bold;
}
/* 1. 圆形：以中心为圆心，半径50% */
.circle-demo {
    background-color: #4D6BFE;
    clip-path: circle(50% at center);
}
/* 2. 椭圆：横向半径60%，纵向半径40% */
.ellipse-demo {
    background-color: #27ba9b;
    clip-path: ellipse(60% 40% at center);
}
/* 3. 多边形：一个五角星形状 */
.polygon-demo {
    background-color: #e74c3c;
    clip-path: polygon(
        50% 0%,      /* 顶部顶点 */
        61% 35%,     /* 右上内凹点 */
        98% 35%,     /* 右侧顶点 */
        68% 57%,     /* 右下内凹点 */
        79% 91%,     /* 右下顶点 */
        50% 70%,     /* 底部中心内凹点 */
        21% 91%,     /* 左下顶点 */
        32% 57%,     /* 左下内凹点 */
        2% 35%,      /* 左侧顶点 */
        39% 35%      /* 左上内凹点 */
    );
}

```
==四：总结==

|知识点|核心要点|
|---|---|
|**`clip-path` 的作用**|按指定形状裁剪元素，只显示形状内部区域|
|**`circle()`**|圆形，参数为 `半径 at 圆心`|
|**`ellipse()`**|椭圆，参数为 `x半径 y半径 at 圆心`|
|**`inset()`**|内嵌矩形，从四边向内收缩，可加 `round` 做圆角|
|**`polygon()`**|多边形，用坐标点定义任意形状，最灵活|
|**坐标规则**|左上角 `(0,0)`，右下角 `(100%,100%)`，按顺序连接顶点|
|**注意事项**|被裁剪掉的部分**不占空间**，但元素本身的大小和位置不变|