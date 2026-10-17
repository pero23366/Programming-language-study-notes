==一：概念==
**弹性盒布局**，也叫 Flex 布局，是一种一维布局模型，用来为盒状模型提供最大的灵活性。它的核心思想是：**给父容器开启 Flex 模式，然后由父容器来控制所有子元素的位置和排列方式**[](https://juejin.cn/post/7037030116655890468#1)。

理解 Flex，只需要抓住两个概念：

**1. 弹性容器与弹性项目**  
当你给一个父元素设置 `display: flex;` 后，这个父元素就变成了**弹性容器**，它的**直接子元素**会自动变成**弹性项目**。之后所有排列规则，都是写在父容器身上的[](https://developer.aliyun.com/article/1411503#1)。

**2. 主轴与侧轴**  
Flex 布局把空间分成两个方向：**主轴**和**侧轴**。子元素默认沿着主轴排列，侧轴用来控制垂直方向的对齐。哪个轴是主轴，由 `flex-direction` 决定，默认是水平方向（从左到右）[](https://juejin.cn/post/7037030116655890468#1)。

> **关键一点**：父元素一旦开启 Flex，子元素的 `float`、`clear`、`vertical-align` 都会直接失效[](https://juejin.cn/post/7037030116655890468#1)。
==二：格式==
Flex 的属性分为两类：写在**父容器**上的，和写在**子项目**上的。P58 主要讲父容器属性。

**1. `display: flex;`**  
写在父元素上，开启弹性布局。这是所有 Flex 用法的第一步。

**2. `flex-direction`：控制主轴方向**

|值|效果|
|---|---|
|`row`|从左到右（默认）|
|`row-reverse`|从右到左|
|`column`|从上到下|
|`column-reverse`|从下到上|

**3. `justify-content`：控制子元素在主轴上的对齐方式**

|值|效果|
|---|---|
|`flex-start`|靠主轴起点（默认）|
|`flex-end`|靠主轴终点|
|`center`|主轴居中|
|`space-between`|两端贴边，中间平分|
|`space-around`|每个元素左右间距相等|

**4. `align-items`：控制子元素在侧轴上的对齐方式（单行）**

| 值            | 效果       |
| ------------ | -------- |
| `flex-start` | 靠侧轴起点    |
| `flex-end`   | 靠侧轴终点    |
| `center`     | 侧轴居中     |
| `stretch`    | 拉伸填满（默认） |
==三：代码==
**HTML 结构**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Flex 入门</title>
    <link rel="stylesheet" href="../CSS/flex入门.css">
</head>
<body>
    <div class="container">
        <div class="item">1</div>
        <div class="item">2</div>
        <div class="item">3</div>
    </div>
</body>
</html>
```

**CSS 样式**

```css

*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    padding: 50px;
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
.container {
    height: 300px;
    background-color: #eef2ff;
    border: 2px dashed #4D6BFE;
    /* 核心：开启 Flex 布局 */
    display: flex;
    /* 主轴方向：水平（默认值，可省略） */
    flex-direction: row;
    /* 主轴对齐：子元素在主轴上居中对齐 */
    justify-content: center;
    /* 侧轴对齐：子元素在侧轴上居中对齐 */
    align-items: center;
}
.item {
    width: 80px;
    height: 80px;
    background-color: #4D6BFE;
    color: #fff;
    font-size: 24px;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 10px;
    border-radius: 8px;
}
```

**验证方法**：打开页面，你会看到三个蓝色方块**水平排列**，并且整体在容器的**正中间**（水平和垂直都居中）。你可以注释掉 `display: flex;`，刷新页面，三个方块会变回垂直排列——这就是 Flex 最直观的效果。
==四：总结==

| 知识点       | 核心要点                           |
| --------- | ------------------------------ |
| **开启方式**  | 父元素加 `display: flex;`          |
| **主轴方向**  | `flex-direction`，默认 `row`（水平）  |
| **主轴对齐**  | `justify-content`，控制子元素在主轴上的位置 |
| **侧轴对齐**  | `align-items`，控制子元素在侧轴上的位置（单行） |
| **父子分工**  | 所有属性写在**父容器**上，子元素自动成为弹性项目     |
| **替代了什么** | 替代了浮动布局，不需要再处理高度塌陷和清除浮动        |

Flex 布局的直觉非常强：你不需要再计算每个子元素的宽度和边距，只需要告诉父容器“怎么排、怎么对齐”，剩下的浏览器自动算