### 🎯 一、概念：像报纸一样分栏

**多列布局**是CSS3新增的一种布局方式，专门用于将**连续的内容**（通常是长文本或一系列小元素）自动分割成**多个等宽的列**，就像报纸排版一样[](https://juejin.cn/post/7589146208225361956#1)。

它的核心特征是**内容连续流动**：浏览器会先填满第一列，再填第二列，依次类推，并自动平衡各列高度，让它们尽可能等高[](https://mdn.org.cn/en-US/docs/Web/CSS/Layout_cookbook/Column_layouts)。

**适用场景**：长篇文章、新闻列表、产品介绍等需要“分栏阅读”的内容。

**不适用场景**：如果你需要对每个列单独设置样式、单独控制位置，那应该用**Grid**或**Flex**[](https://mdn.org.cn/en-US/docs/Web/CSS/Layout_cookbook/Column_layouts)。多列布局无法单独定位某一列[](https://mdn.org.cn/en-US/docs/Web/CSS/Layout_cookbook/Column_layouts)。

### 📐 二、格式：核心属性

**1. `column-count`：指定列数**

```css

.container {
    column-count: 3; /* 内容分成3列 */
}

```
**2. `column-gap`：列间距**

```css

.container {
    column-count: 3;
    column-gap: 20px; /* 列与列之间间隔20px */
}
```

**3. `column-rule`：列间分隔线**

```css

.container {
    column-count: 3;
    column-gap: 20px;
    column-rule: 1px solid #ccc; /* 列之间画一条灰色细线 */
}
```

分隔线**不占用宽度**，它只是视觉上的装饰。

**4. `break-inside: avoid`：防止元素被拆散**

```css

.card {
    break-inside: avoid; /* 该元素不允许被拆分到两列 */
}
```

当一个卡片（如商品卡片）出现在多列布局中时，浏览器默认可能把它“拦腰截断”，一半在第一列底部，一半在第二列顶部。加上这行代码就能避免[](https://m.yisu.com/zixun/986407.html)。

### 💻 三、代码：小兔鲜项目中的多列布局

**1. HTML 结构**

```html

<div class="news">
    <h3>新鲜好物推荐</h3>
    <div class="news-list">
        <div class="news-item">新鲜好物1</div>
        <div class="news-item">新鲜好物2</div>
        <div class="news-item">新鲜好物3</div>
        <div class="news-item">新鲜好物4</div>
        <div class="news-item">新鲜好物5</div>
        <div class="news-item">新鲜好物6</div>
    </div>
</div>
```

**2. CSS 样式**

```css

.news {
    width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #fff;
    border-radius: 8px;
}
.news h3 {
    font-size: 20px;
    margin-bottom: 15px;
    color: #333;
}
/* 核心：多列布局 */
.news-list {
    column-count: 3;              /* 分成3列 */
    column-gap: 20px;             /* 列间距 */
    column-rule: 1px solid #e0e0e0; /* 列间分隔线 */
}
.news-item {
    break-inside: avoid;          /* 防止被拆散到两列 */
    padding: 10px;
    margin-bottom: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;
    font-size: 14px;
    color: #666;
}

```
**3. 效果**  
打开页面，6个 `.news-item` 会被**自动分成3列，每列2个**，列与列之间有灰色分隔线。如果调整浏览器窗口宽度，列数不变（因为 `column-count` 是固定的），但每列宽度会自动调整。

### 💎 四、总结

|属性|作用|关键点|
|---|---|---|
|**`column-count`**|指定列数|固定列数，列宽自动计算|
|**`column-gap`**|列间距|列与列之间的空隙|
|**`column-rule`**|列间分隔线|不占宽度，仅视觉装饰|
|**`break-inside: avoid`**|防止元素被拆散|加在**子元素**上，保护卡片不被截断|

**与 Flex / Grid 的区别**：

- **Flex**：一维布局，适合“一排按钮/卡片”
    
- **Grid**：二维布局，适合“整体页面架构”
    
- **多列布局**：专门处理“**连续内容的分栏**”，像报纸一样，内容自动流动，无法单独定位某一列