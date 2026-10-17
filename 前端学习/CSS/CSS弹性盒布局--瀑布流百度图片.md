==一：概念==
瀑布流（Masonry Layout）是一种多列布局，其特点是每个元素的宽度固定，但高度各不相同，元素会像瀑布一样，在列的方向上自然排列，形成错落有致的效果。

和上一篇 Flex 多行布局不同，瀑布流的**核心是“列”**。它不是一行一行地排，而是**一列一列地往下填充**。当第一列填满后，才会去填充第二列。
==二：格式==
实现瀑布流的核心是 `column-count`（列数）和 `column-gap`（列间距）这两个属性。

**1. 父容器：设置列数**

```css

.container {
    column-count: 3;    /* 将容器分成 3 列 */
    column-gap: 16px;   /* 列与列之间的间距 */
}
```

**2. 子元素：防止被截断**

```css

.item {
    break-inside: avoid; /* 防止元素被分割到两列中 */
    margin-bottom: 16px; /* 元素之间的垂直间距 */
}
```

**关键规则**：`break-inside: avoid;` 必须加在子元素上。如果不加，一个内容块可能会被从中间“切断”，一半在第一列底部，另一半在第二列顶部，这会破坏瀑布流的视觉效果。
==三：代码==
**HTML 结构**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>瀑布流百度图片</title>
    <link rel="stylesheet" href="../CSS/瀑布流.css">
</head>
<body>
    <div class="waterfall">
        <div class="item" style="height: 150px; background-color: #4D6BFE;">1</div>
        <div class="item" style="height: 200px; background-color: #259666;">2</div>
        <div class="item" style="height: 100px; background-color: #ffd662;">3</div>
        <div class="item" style="height: 250px; background-color: #7e31b1;">4</div>
        <div class="item" style="height: 180px; background-color: #e74c3c;">5</div>
        <div class="item" style="height: 120px; background-color: #28bed0;">6</div>
        <div class="item" style="height: 220px; background-color: #ff5000;">7</div>
        <div class="item" style="height: 160px; background-color: #4caf50;">8</div>
        <div class="item" style="height: 140px; background-color: #9c27b0;">9</div>
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
    padding: 30px;
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
/* 父容器：多列布局 */
.waterfall {
    width: 600px;
    margin: 0 auto;
    column-count: 3;    /* 核心：分成 3 列 */
    column-gap: 16px;   /* 列间距 */
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
}
/* 子元素：每个图片卡片 */
.item {
    break-inside: avoid; /* 核心：防止被截断 */
    margin-bottom: 16px; /* 行间距 */
    border-radius: 8px;
    color: #fff;
    font-size: 24px;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
}
```
==四：总结==