==一：概念==
### 什么是浮动？

浮动（`float`）属性用于创建浮动框，将其移动到一边，直到左边缘或右边缘触及包含块或另一个浮动框的边缘[](https://blog.csdn.net/PancrasG/article/details/114262800#1)。它的核心特性是**脱离标准文档流（脱标）**，元素会“浮”起来，不再占据原来的位置[](https://blog.csdn.net/2502_90388158/article/details/159731228#1)[](https://blog.csdn.net/PancrasG/article/details/114262800#1)。

- **设计初衷**：最初是为了实现**图文环绕**效果，比如让文字环绕在图片周围。
    
- **曾经的用途**：后来被广泛用于**多列布局**，让多个块级元素能在同一行内排列[](https://developer.aliyun.com/article/1533065)。
    
- **关键特征**：
    
    - **脱标**：浮动元素会脱离文档流，其原来的位置会被其他非浮动元素占据[](https://developer.aliyun.com/article/1264977#1)。
        
    - **一行排列与顶端对齐**：多个浮动元素会在一行内显示，并且顶部对齐[](https://blog.csdn.net/PancrasG/article/details/114262800#1)。
        
    - **具有行内块特性**：任何元素添加浮动后，都会变得像行内块元素一样，可以设置宽高[](https://blog.csdn.net/PancrasG/article/details/114262800#1)。
==二：格式==
### 浮动的语法与清除

**基本语法**：通过 `float` 属性来定义浮动，常用属性值有 `left`、`right` 和 `none`（默认值，不浮动）[](https://blog.csdn.net/2502_90388158/article/details/159731228#1)[](https://blog.csdn.net/PancrasG/article/details/114262800#1)。

```css

选择器 {
    float: left; /* 向左浮动，或 right 向右浮动，或 none 不浮动 */
}
```

**为什么要清除浮动？**  
当一个父元素内的所有子元素都浮动时，子元素脱离了文档流，父元素无法被撑开，会出现**高度塌陷**（父元素高度为0）[](https://developer.aliyun.com/article/1264977#1)。这会影响后续元素的排版，所以需要“清除浮动”带来的影响[](https://blog.csdn.net/PancrasG/article/details/114262800#1)。

**清除浮动的方法**（核心是使用 `clear` 属性）：

|方法|做法|优缺点|
|---|---|---|
|**额外标签法**|在浮动元素末尾添加一个空标签（如 `<div>`），并设置 `clear: both;`[](https://blog.csdn.net/2502_90388158/article/details/159731228#1)|简单，但会增加无意义的HTML标签[](https://developer.aliyun.com/article/1264977#1)|
|**父级添加overflow**|给父元素设置 `overflow: hidden;` 或 `auto;`[](https://blog.csdn.net/2502_90388158/article/details/159731228#1)[](https://developer.aliyun.com/article/1264977#1)|代码简洁，但可能隐藏掉需要溢出的内容[](https://developer.aliyun.com/article/1264977#1)|
|**伪元素清除法**|给父元素添加 `::after` 伪元素来清除浮动[](https://developer.aliyun.com/article/1533065)|**推荐使用**，符合语义化，是现代的通用方案[](https://developer.aliyun.com/article/1264977#1)|

**现代清除浮动的写法（Clearfix）：**

```css

.clearfix::after {
    content: "";
    display: block;
    clear: both;
}
```
==三：代码==
**HTML 结构**

```html

<body>
    <!-- 1. 图文环绕效果 -->
    <div class="wrap">
        <img src="https://picsum.photos/150/150" alt="示例图片">
        <p>这是一段文字，它将会环绕在图片的周围。浮动最初的设计目的就是为了实现这种图文混排的效果。通过给图片设置 float: left，文字就会自动流动到图片的右侧。这是一段文字，它将会环绕在图片的周围。浮动最初的设计目的就是为了实现这种图文混排的效果。</p>
    </div>
    <hr>
    <!-- 2. 父元素高度塌陷演示 -->
    <div class="parent">
        <div class="child"></div>
        <div class="child"></div>
    </div>
    <p>上面的父元素高度塌陷了，下面的文字会跑上来。</p>
</body>
```

**CSS 样式**

```css

* { margin: 0; padding: 0; box-sizing: border-box; }
body { padding: 30px; font-family: "Microsoft YaHei", Arial, sans-serif; }
/* 1. 图文环绕 */
.wrap img {
    float: left;      /* 图片向左浮动 */
    margin-right: 15px;
    width: 150px;
}
/* 2. 父元素高度塌陷 */
.parent {
    background-color: #eee;
    border: 2px solid #ccc;
    /* 解决方案：给父元素添加以下代码清除浮动 */
    /* overflow: hidden; */ 
}
.parent .child {
    float: left;       /* 子元素浮动，父元素会高度塌陷 */
    width: 100px;
    height: 100px;
    background-color: #4D6BFE;
    margin: 10px;
}

```
> **验证**：打开页面，你会看到文字环绕在图片周围。同时，因为 `.child` 元素浮动，`.parent` 的高度会塌陷，你可以在开发者工具（F12）中观察 `.parent` 的高度确实为0。给 `.parent` 加上 `overflow: hidden;` 或 `clearfix` 后，高度就会恢复正常。
==四：总结==

### 为什么浮动被“放弃”了？

浮动被弃用，最根本的原因不是它不能用，而是 **Flexbox 布局实在太方便了**[](https://developers.gmo.jp/technology/23724/)。

- **代码更简洁**：用Flexbox实现水平居中、平均分布等，往往只需要一行 `justify-content` 或 `align-items` 代码，而用浮动可能需要计算宽度、清除浮动等一堆操作[](https://developers.gmo.jp/technology/23724/)。
    
- **功能更强大**：Flexbox 天生就是为“一维布局”设计的，控制排列、对齐、间距、伸缩都极其灵活，而浮动在这些方面表现得很“笨拙”。
    
- **维护性更好**：Flexbox 的布局是“显式”的，你告诉浏览器怎么排就怎么排。而浮动的“脱离文档流”特性常常会引发意想不到的布局问题，需要不断清除浮动。
    

所以，你的学习重心可以放在后面的 **Flexbox（弹性盒子）** 和 **Grid（网格）** 布局上。浮动作为一段历史，了解它为何被淘汰，能让你更深刻地体会到现代布局方案的优越性。