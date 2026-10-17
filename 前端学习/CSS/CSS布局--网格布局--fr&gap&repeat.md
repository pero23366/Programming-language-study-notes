### 🎯 一、概念：三个工具，各司其职

- **`fr` 单位 (Fraction)**：表示网格容器中**可用空间的一部分**。它只在分配**剩余空间**时起作用，会先扣除固定尺寸和间隙，再按 `fr` 的比例分配。
    
- **`gap` 属性**：用于设置网格行与列之间的**间隙**，取代了传统用 `margin` 手动调整间距的方式。它是 `row-gap` 和 `column-gap` 的简写[](https://mdn.org.cn/en-US/docs/Web/CSS/gap)。
    
- **`repeat()` 函数**：用于**简化重复的轨道定义**。比如要创建 12 个等宽的列，不必写 12 遍 `1fr`，用 `repeat(12, 1fr)` 即可。
    

### 📐 二、格式：语法与规则

**1. `fr` 单位**

```css

grid-template-columns: 1fr 2fr 1fr; /* 三列，宽度比例为 1:2:1 */
```

`fr` 单位专门用于分配网格的剩余空间。例如 `grid-template-columns: 200px 1fr 2fr;` 会先扣除 `200px` 的固定宽度，再将剩余空间按 `1:2` 分配给后两列。

**2. `gap` 属性**

```css

gap: 20px;          /* 行和列的间距都是 20px */
gap: 20px 10px;     /* 行间距 20px，列间距 10px */

`gap` 属性适用于 Grid、Flex 和多列布局[](https://mdn.org.cn/en-US/docs/Web/CSS/gap)。在 Grid 中，间隙会像一条有尺寸的网格线一样，占据空间但不能放置内容[](https://mdn.org.cn/en-US/docs/Glossary/Gutters)。
```

**3. `repeat()` 函数**

```css

grid-template-columns: repeat(3, 1fr); /* 等同于 1fr 1fr 1fr */

第一个参数是**重复次数**，第二个参数是**要重复的轨道列表**。`repeat()` 函数不能嵌套使用。它还可以配合 `auto-fill` 或 `auto-fit` 实现响应式布局，例如 `repeat(auto-fill, minmax(200px, 1fr))`。

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
    /* 三列，宽度比例为 1:2:1 */
    grid-template-columns: 1fr 2fr 1fr;
    /* 行高自动 */
    grid-template-rows: auto;
    /* 行和列的间距均为 20px */
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
**3. 进阶示例：使用 `repeat()` 和 `auto-fit` 实现响应式卡片布局**

```css

.responsive-grid {
    display: grid;
    /* 自动填充列：每列最小 200px，剩余空间按 1fr 分配 */
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}
```

这段代码会让浏览器根据容器宽度自动决定每行放几个 200px 宽的列，剩余空间再由 `1fr` 均分，实现“一列变多列”的响应式效果。

### 💎 四、总结

|知识点|核心要点|
|---|---|
|**`fr` 单位**|表示剩余空间的比例，会先扣除固定尺寸和 `gap`，再按比例分配。|
|**`gap` 属性**|设置网格行/列间距，`gap: 行间距 列间距;`。|
|**`repeat()`**|简化重复定义，`repeat(次数, 轨道尺寸)`。|
|**组合使用**|`repeat(3, 1fr)` 是定义等宽列的标准写法。|
|**响应式技巧**|`repeat(auto-fit, minmax(200px, 1fr))` 可实现自动填充的响应式网格。|
