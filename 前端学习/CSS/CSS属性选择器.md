==一：概念==
**属性选择器**，它让你能根据 HTML 元素上**是否包含某个属性**，或**属性的值是什么**，来精准地选中元素并设置样式。
### 根据“属性”来选元素

之前学的类选择器（`.class`）和 ID 选择器（`#id`），本质上也是在利用 HTML 的 `class` 和 `id` 属性来选元素。而**属性选择器**把这种能力**泛化**了，它允许你使用**任何 HTML 属性**（如 `type`、`value`、`href`、`title` 等）来作为选择条件。

它主要解决这类问题：

- **精准定位**：比如，你想选中所有 `type="text"` 的输入框，或者所有 `href` 以 `https` 开头的链接。
    
- **无需额外类名**：当 HTML 结构固定且属性唯一时，可以直接用属性选择器，不用再手动添加类或 ID[](https://blog.csdn.net/weixin_43339892/article/details/122396893)。
==二：格式==
### 核心语法与常用写法

属性选择器的基本语法是：**`选择器[属性名 操作符 属性值]`**，其中方括号 `[]` 是它的标志。

以下是几种核心写法：

| 写法                  | 示例                       | 含义                                                                                                                                           |
| ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **`[attr]`**        | `input[value]`           | 选中**所有包含** `value` 属性的 `<input>` 元素，不管值是什么[](https://mdn.org.cn/en-US/docs/Learn/CSS/Building_blocks/Selectors/Attribute_selectors)          |
| **`[attr=value]`**  | `input[type="text"]`     | 选中 `type` 属性**完全等于** `"text"` 的 `<input>` 元素[](https://mdn.org.cn/en-US/docs/Learn/CSS/Building_blocks/Selectors/Attribute_selectors)        |
| **`[attr^=value]`** | `div[class^="icon"]`     | 选中 `class` 属性值**以** `"icon"` **开头**的 `<div>` 元素[](https://mdn.org.cn/en-US/docs/Learn/CSS/Building_blocks/Selectors/Attribute_selectors)     |
| **`[attr$=value]`** | `section[class$="data"]` | 选中 `class` 属性值**以** `"data"` **结尾**的 `<section>` 元素[](https://mdn.org.cn/en-US/docs/Learn/CSS/Building_blocks/Selectors/Attribute_selectors) |
| **`[attr*=value]`** | `div[class*="cd"]`       | 选中 `class` 属性值中**包含** `"cd"` 的 `<div>` 元素[](https://mdn.org.cn/en-US/docs/Learn/CSS/Building_blocks/Selectors/Attribute_selectors)           |

> **注意**：属性选择器的权重（优先级）**等同于类选择器**，都是 `(0,0,1,0)`[](https://blog.csdn.net/weixin_43339892/article/details/122396893)。
==三：代码==
基于你现在的项目结构，新建 `前端/HTML/属性选择器.html` 和 `前端/CSS/属性选择器.css`。

**1. HTML 结构 (`前端/HTML/属性选择器.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>属性选择器练习</title>
    <link rel="stylesheet" href="../CSS/属性选择器.css">
</head>
<body>
    <h1>属性选择器练习</h1>
    <!-- 1. [attr] 和 [attr=value] -->
    <div class="demo-section">
        <h2>1. 基础属性选择器</h2>
        <input type="text" value="我是文本框">
        <input type="password" value="123456">
        <input type="text" disabled>
    </div>
    <!-- 2. 子字符串匹配选择器 -->
    <div class="demo-section">
        <h2>2. 子字符串匹配</h2>
        <div class="icon-home">首页图标</div>
        <div class="icon-user">用户图标</div>
        <div class="banner-data">数据区域</div>
        <div class="user-data">用户数据</div>
        <div class="product-cd">光盘产品</div>
    </div>
</body>
</html>
```

**2. CSS 样式 (`前端/CSS/属性选择器.css`)**

```css

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    padding: 30px;
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
h1 {
    text-align: center;
    margin-bottom: 30px;
    color: #333;
}
.demo-section {
    width: 500px;
    margin: 0 auto 30px;
    padding: 20px;
    background-color: #fff;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
h2 {
    font-size: 18px;
    color: #555;
    margin-bottom: 15px;
    border-left: 4px solid #4D6BFE;
    padding-left: 10px;
}
/* ========== 1. 基础属性选择器 ========== */
/* 选中所有带有 value 属性的 input */
input[value] {
    border: 2px solid #4D6BFE;
    padding: 5px;
}
/* 精确选中 type="text" 的 input */
input[type="text"] {
    background-color: #eef2ff;
}
/* ========== 2. 子字符串匹配选择器 ========== */
/* 选中 class 以 "icon" 开头的 div */
div[class^="icon"] {
    color: red;
    font-weight: bold;
}
/* 选中 class 以 "data" 结尾的 div */
div[class$="data"] {
    color: blue;
    text-decoration: underline;
}
/* 选中 class 中包含 "cd" 的 div */
div[class*="cd"] {
    color: coral;
    font-style: italic;
}

```
==四：总结==
- **`[attr]`**：选中**包含**该属性的所有元素，不管值是什么。
    
- **`[attr=value]`**：精确匹配属性值。
    
- **`[attr^=value]`**：匹配属性值**开头**。
    
- **`[attr$=value]`**：匹配属性值**结尾**。
    
- **`[attr*=value]`**：匹配属性值**包含**。
    
- **权重**：与类选择器相同，为 `(0,0,1,0)`。