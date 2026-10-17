### 🎯 一、概念：控制网格项的“流动方向”

`grid-auto-flow` 是 Grid 布局中一个非常重要的属性，它决定了**没有显式指定位置的网格项**，会自动以什么顺序填充到网格中。

默认情况下，网格项会**按行填充**（从左到右，一行填满后换下一行）。但通过 `grid-auto-flow`，你可以改变这个规则，让它**按列填充**，或者让网格自动“见缝插针”地填补空隙。

**四种取值：**

|值|效果|
|---|---|
|`row`（默认）|按行填充，逐行从左到右排列|
|`column`|按列填充，逐列从上到下排列|
|`row dense`|按行填充，**紧密模式**：小项目会回头填补前面留下的空隙|
|`column dense`|按列填充，**紧密模式**：小项目会回头填补前面留下的空隙|

**理解“dense（紧密模式）”的关键：**  
在普通模式下，如果某个网格项因为跨列/跨行而占用了较大空间，后面较小的网格项不会“回头”去填补之前留下的空隙，只会继续往后排。而加上 `dense` 后，浏览器会尝试**回头填补所有能塞进去的空隙**，让网格更紧凑，但**可能会改变项目的视觉顺序**。

### 📐 二、格式：核心语法

```css

.container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-flow: row;        /* 按行填充（默认） */
    /* grid-auto-flow: column; */   /* 按列填充 */
    /* grid-auto-flow: row dense; */ /* 按行紧密填充 */
    /* grid-auto-flow: column dense; */ /* 按列紧密填充 */
}
```

### 💻 三、代码：对比四种模式

**1. HTML 结构**

```html

<div class="grid-container">
    <div class="item item1">1</div>
    <div class="item item2">2</div>
    <div class="item item3">3</div>
    <div class="item item4">4</div>
    <div class="item item5">5</div>
</div>
```

**2. CSS 样式**

```css

.grid-container {
    display: grid;
    /* 3列，每列等宽 */
    grid-template-columns: repeat(3, 1fr);
    /* 每行高度 100px */
    grid-auto-rows: 100px;
    /* 间距 */
    gap: 10px;
    background-color: #f5f5f5;
    padding: 20px;
    /* 核心：自动填充模式 */
    grid-auto-flow: row; /* 默认，按行填充 */
}
/* item1 跨越2列 */
.item1 {
    grid-column: span 2;
}
/* item4 跨越2列 */
.item4 {
    grid-column: span 2;
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
```

**3. 对比四种模式的效果**

|模式|效果|
|---|---|
|**`row`（默认）**|item1 占2列，item2 补第3列。item3 换行到第2行第1列。item4 占2列，但第2行只剩2列，放不下 item4，所以 item4 换到第3行，第2行第2、3列被留空，item5 填第2行第2列。|
|**`column`**|网格项按列从上到下填充，列数不变，但填充顺序变成先填满第一列，再填第二列。|
|**`row dense`**|item4 会“回头”填补第2行第2、3列的空隙，item5 再往后排。网格变得**更紧凑，没有留白**。|
|**`column dense`**|按列填充时，小项目回头填补列中的空隙。|

### 💎 四、总结

|知识点|核心要点|
|---|---|
|**`grid-auto-flow: row`**|默认值，按行从左到右、从上到下填充。|
|**`grid-auto-flow: column`**|按列从上到下、从左到右填充。|
|**`grid-auto-flow: row dense`**|按行填充，小项目回头填补空隙，网格更紧凑。|
|**`grid-auto-flow: column dense`**|按列填充，小项目回头填补空隙。|
|**使用场景**|当网格项大小不一致，希望自动填充不留空白时，用 `dense`。|