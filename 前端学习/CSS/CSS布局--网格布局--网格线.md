### 🎯 一、概念：网格的“坐标轴”

网格线是构成网格的**水平和垂直分割线**。你可以把它们想象成坐标轴，网格中的每个单元格都由这些线交叉划分出来。

- **数量规则**：在一个有N列的网格中，会有**N+1条**垂直网格线；同理，有M行的网格，会有**M+1条**水平网格线。
    
- **编号规则**：网格线的编号从**1**开始。在从左到右的语言（如中文、英文）中，**列线1**位于网格的最左侧，**行线1**位于最顶部。编号方向遵循文档的书写方向。
    
- **负号编号**：网格线还支持从**末尾倒数**的负数编号。例如，`-1`代表最后一条网格线，`-2`代表倒数第二条，以此类推。这在创建从右侧或底部开始定位的布局时非常方便。
    

### 📐 二、格式：核心语法与属性

基于网格线的定位，核心是使用以下属性来指定一个网格项的**起始线**和**结束线**。

**1. 单独指定起始和结束线**
```
css

.item {
    grid-column-start: 1;   /* 列起始线 */
    grid-column-end: 3;     /* 列结束线 */
    grid-row-start: 2;      /* 行起始线 */
    grid-row-end: 4;        /* 行结束线 */
}
```

**2. 简写属性（推荐）**

- **`grid-column`**：是 `grid-column-start` 和 `grid-column-end` 的简写。
    
- **`grid-row`**：是 `grid-row-start` 和 `grid-row-end` 的简写。
    

```css

.item {
    /* 从第1条列线开始，到第3条列线结束（跨2列） */
    grid-column: 1 / 3;
    /* 从第2条行线开始，到第4条行线结束（跨2行） */
    grid-row: 2 / 4;
}
```

> **注意**：`grid-column` 和 `grid-row` 的简写使用斜杠 `/` 分隔起始和结束值，斜杠前后建议加一个空格。

**3. 使用 `span` 关键字**  
`span` 关键字可以让你指定网格项**跨越的轨道数量**，而无需关心具体的结束线编号。

```css

.item {
    grid-column: 2 / span 2; /* 从第2条列线开始，跨越2个列轨道 */
    grid-row: 1 / span 3;    /* 从第1条行线开始，跨越3个行轨道 */
}

```
**4. 具名网格线**  
你可以在定义网格时，用方括号 `[]` 为网格线命名，这样定位会更直观，尤其在响应式布局中修改线编号时非常有用。

```css

/* 在定义网格时命名线 */
.container {
    display: grid;
    grid-template-columns: [sidebar-start] 200px [sidebar-end main-start] 1fr [main-end];
}
/* 使用线名进行定位 */
.item {
    grid-column: sidebar-start / main-end;
}

```
### 💻 三、代码：在项目中实战

下面创建一个 3列 × 2行 的网格，并演示如何基于网格线定位。

**1. HTML 结构**
```
html

<div class="grid-container">
    <div class="item item1">1</div>
    <div class="item item2">2</div>
    <div class="item item3">3</div>
    <div class="item item4">4</div>
</div>
```

**2. CSS 样式**

```css

.grid-container {
    display: grid;
    /* 定义3列，宽度相等 */
    grid-template-columns: repeat(3, 1fr);
    /* 定义2行，高度相等 */
    grid-template-rows: repeat(2, 150px);
    /* 网格线之间的间距 */
    gap: 10px;
    background-color: #f5f5f5;
    padding: 20px;
}
.item {
    background-color: #4D6BFE;
    color: #fff;
    font-size: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
}
/* item1 从第1条列线到第3条列线，跨越2列 */
.item1 {
    grid-column: 1 / 3;
    background-color: #e74c3c;
}
/* item2 从第3条列线开始，跨越1列 */
.item2 {
    grid-column: 3 / 4;
    background-color: #27ba9b;
}
/* item3 从第1条行线到第2条行线，占据第一行第一列 */
.item3 {
    grid-column: 1 / 2;
    grid-row: 2 / 3;
    background-color: #ffa500;
}
/* item4 自动填充到剩余位置（第二行第二列） */

**3. 运行效果**

- **item1** 会占据第一行的前两列（从列线1到列线3）。
    
- **item2** 会占据第一行的第三列（从列线3到列线4）。
    
- **item3** 会占据第二行的第一列（从行线2到行线3）。
    
- **item4** 会自动放置在第二行的第二列。
    

```
### 💎 四、总结

|知识点|核心要点|
|---|---|
|**网格线**|网格的水平和垂直分割线，是定位的基准。N列有N+1条垂直线，M行有M+1条水平线。|
|**编号规则**|从1开始，从左到右、从上到下编号。也支持负数编号（从末尾倒数）。|
|**定位属性**|`grid-column` 和 `grid-row`，使用斜杠 `/` 分隔起始和结束线。|
|**跨越轨道**|使用 `span` 关键字指定跨越的轨道数量。|
|**具名网格线**|在定义网格时用 `[]` 为线命名，使定位更直观，利于响应式修改。|