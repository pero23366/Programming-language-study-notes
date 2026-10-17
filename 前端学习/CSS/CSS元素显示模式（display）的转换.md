==一：概念==
### 元素的三副面孔

在 CSS 中，每个 HTML 元素都有默认的“显示模式”，决定了它在页面上的排版行为。你可以通过 `display` 属性，让元素在三副面孔之间自由切换：

- **块级元素（`block`）**：霸道总裁，**独占一行**，可以设置宽高，默认宽度是父容器的 100%。代表标签有 `<div>`、`<h1>`、`<p>` 等。
    
- **行内元素（`inline`）**：小家碧玉，**与其他元素同行排列**，但**无法设置宽高**，宽度由内容撑开。代表标签有 `<span>`、`<a>` 等。
    
- **行内块元素（`inline-block`）**：完美结合体，**既可同行排列，又可设置宽高**。代表标签有 `<img>`、`<input>` 等。
==二：格式==
### `display` 的核心语法

```css

选择器 {
    display: block;        /* 转为块级元素 */
    display: inline;       /* 转为行内元素 */
    display: inline-block; /* 转为行内块元素 */
    display: none;         /* 隐藏元素，不占位置 */
}
```

**案例展示**：这个案例通常是一个“导航栏”或“侧边栏”的制作，通过将 `<a>` 标签（默认行内元素）转换为 `block` 或 `inline-block`，来扩大点击范围，实现更灵活的排版。
==三：代码==
### 动手切换显示模式

新建 `前端/HTML/显示模式.html` 和 `前端/CSS/显示模式.css`。

**HTML 结构**

```html

<body>
    <h1>元素显示模式转换</h1>
    <!-- 1. 块级元素 -->
    <div class="box block-demo">块级元素</div>
    <div class="box block-demo">块级元素</div>
    <!-- 2. 行内元素 -->
    <span class="box inline-demo">行内元素</span>
    <span class="box inline-demo">行内元素</span>
    <!-- 3. 行内块元素 -->
    <span class="box inline-block-demo">行内块元素</span>
    <span class="box inline-block-demo">行内块元素</span>
    <!-- 4. 转换：把行内元素 a 转为块级/行内块 -->
    <a href="#" class="block-link">块级链接（点击范围大）</a>
    <a href="#" class="inline-block-link">行内块链接</a>
</body>
```

**CSS 样式**

```css

* { margin: 0; padding: 0; box-sizing: border-box; }
body { padding: 30px; background-color: #f5f5f5; font-family: "Microsoft YaHei", Arial, sans-serif; }
.box { padding: 20px; color: #fff; text-align: center; margin-bottom: 10px; }
/* 1. 块级元素：独占一行 */
.block-demo { background-color: #4D6BFE; }
/* 2. 行内元素：同行排列，但无法设置宽高 */
.inline-demo { background-color: #259666; }
.inline-demo:hover { width: 200px; } /* 不会生效 */
/* 3. 行内块元素：同行排列，且可设置宽高 */
.inline-block-demo { 
    display: inline-block; 
    width: 150px; 
    height: 60px; 
    line-height: 60px; 
    background-color: #ffd662; 
    color: #333;
    margin-right: 10px;
}
/* 4. 核心转换：让 a 标签拥有块级特性 */
.block-link {
    display: block;
    width: 300px;
    height: 50px;
    line-height: 50px;
    background-color: #7e31b1;
    color: #fff;
    text-align: center;
    text-decoration: none;
    border-radius: 8px;
    margin-bottom: 10px;
}
.inline-block-link {
    display: inline-block;
    padding: 10px 30px;
    background-color: #e74c3c;
    color: #fff;
    text-decoration: none;
    border-radius: 8px;
}

```
**验证方法**：用浏览器打开，你会看到 `.block-demo` 上下排列，`.inline-demo` 并排但宽高无效，`.inline-block-demo` 并排且宽高生效。最后两个 `<a>` 标签，一个变成了占满一行的“大按钮”，一个变成了可同行排列的“小按钮”。
==四：总结==

| 模式                 | 是否独占一行 | 能否设置宽高 | 典型标签           |
| ------------------ | ------ | ------ | -------------- |
| **`block`**        | ✅ 是    | ✅ 可以   | `div`、`p`、`h1` |
| **`inline`**       | ❌ 否    | ❌ 不可以  | `span`、`a`     |
| **`inline-block`** | ❌ 否    | ✅ 可以   | `img`、`input`  |

- **核心口诀**：`block` 独占一行，`inline` 同行但无宽高，`inline-block` 同行且有宽高。
    
- **实战意义**：让 `<a>` 标签 `display: block` 是制作导航栏的经典手法，能有效扩大点击区域。
    
- **下一步**：下一章将进入 **Flex 布局**，它是现代网页排版的主力，而 `display: flex` 正是其入口。