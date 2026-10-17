










### 🎯 一、概念：从“一维”到“二维”

如果说Flex布局是**一维布局**（一次只能控制一个方向，要么水平，要么垂直），那么Grid布局就是**二维布局**，它能**同时控制行和列**，像在纸上画表格一样，精准地划分网页的每一个区域。

Grid布局的核心是**父容器**和**子项目**的配合：

- **父容器**：通过 `display: grid;` 开启网格布局[](https://mdn.org.cn/en-US/docs/Learn/CSS/CSS_layout/Grids)。
    
- **网格线**：构成网格的水平和垂直线，是定位的基准。
    
- **网格轨道**：两条相邻网格线之间的空间，就是行或列。
    
- **网格单元**：行和列交叉形成的最小单元格。
    

### 📐 二、格式：核心语法

**1. 定义网格容器**

```css

.container {
    display: grid; /* 开启网格布局 */
}
```

仅设置 `display: grid` 后，子元素会变成单列垂直排列，和普通块级元素一样[](https://mdn.org.cn/en-US/docs/Learn/CSS/CSS_layout/Grids)。

**2. 定义列和行**

- **`grid-template-columns`**：定义列的数量和宽度。
    
- **`grid-template-rows`**：定义行的数量和高度。
    

```css

.container {
    display: grid;
    grid-template-columns: 200px 200px 200px; /* 三列，每列200px */
}
```

P84 会重点介绍 **`fr` 单位**，它表示网格容器中**可用空间的一部分**，用于灵活地调整行和列的大小[](https://mdn.org.cn/en-US/docs/Learn/CSS/CSS_layout/Grids)。

```css

.container {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr; /* 三列，宽度比例为 1:2:1 */
}

```
**3. 定义间距**

- **`gap`**：定义行和列之间的间隙。也可以分别用 `row-gap` 和 `column-gap`。
    

```css

.container {
    display: grid;
    gap: 20px; /* 行和列的间距都是20px */
}
```

**4. 重复函数**

- **`repeat()`**：简化重复的列或行定义。
    

```css

.container {
    display: grid;
    /* 等同于 1fr 1fr 1fr */
    grid-template-columns: repeat(3, 1fr);
}
```

### 💻 三、代码：在项目中实战

**1. HTML 结构**

```html

<div class="grid-container">
    <div class="item">1</div>
    <div class="item">2</div>
    <div class="item">3</div>
    <div class="item">4</div>
    <div class="item">5</div>
    <div class="item">6</div>
</div>
```

**2. CSS 样式**

```css

.grid-container {
    display: grid;
    /* 定义一个三列网格，列宽比例为 1:2:1 */
    grid-template-columns: 1fr 2fr 1fr;
    /* 行高自动 */
    grid-template-rows: auto;
    /* 行和列的间距为 20px */
    gap: 20px;
    background-color: #f5f5f5;
    padding: 20px;
}
.item {
    background-color: #4D6BFE;
    color: #fff;
    font-size: 24px;
    text-align: center;
    padding: 20px;
    border-radius: 8px;
}
```

**3. 运行效果**  
打开页面，你会看到一个三列的网格，列宽比例是 **1:2:1**，中间列最宽。每个格子之间有 20px 的间距，6 个数字块会自动填充到网格中。

### 💎 四、总结

|知识点|核心要点|
|---|---|
|**二维布局**|同时控制行和列，适合整体页面架构或复杂模块。|
|**`display: grid`**|开启网格布局，子元素变为网格项目。|
|**`grid-template-columns`**|定义列的数量和宽度。|
|**`grid-template-rows`**|定义行的数量和高度。|
|**`fr` 单位**|表示可用空间的比例，用于灵活分配宽度。|
|**`gap`**|定义网格的行列间距，取代了传统的 `margin` 调整。|
|**`repeat()` 函数**|简化重复的网格轨道定义|