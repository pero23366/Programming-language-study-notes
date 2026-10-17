==一：概念==
**分组选择器（并集选择器）** 和**链接伪类选择器**。前者帮你“批量处理”相同样式的元素，后者则让你能精确控制链接在**未访问、已访问、鼠标悬停、点击**这四种不同状态下的外观[](https://www.bilibili.com/opus/1198084636212723721?from=search#3)。
### 批量处理与状态切换

- **分组选择器（并集选择器）**：当页面上有多个不同元素需要应用**完全相同**的样式时，用逗号 `,` 把它们的选择器连接起来，一次性声明，避免重复写代码。它就像一个“集体声明”，把 `div`、`p`、`span` 等选择器“组团”[](https://developer.aliyun.com/article/978838#1)。
    
- **链接伪类选择器**：专门用来定义 `<a>` 标签在不同交互状态下的样式。它用冒号 `:` 表示，核心有四种状态，你需要记住它们的**书写顺序（LVHA）**[](https://blog.csdn.net/weixin_44524703/article/details/121071964#3)
==二：格式==
### 核心语法与规则

**1. 分组选择器（并集选择器）**

- **语法**：`选择器1, 选择器2, 选择器3 { 属性: 值; }`
    
- **关键点**：选择器之间必须用**英文逗号 `,`** 分隔，通常建议每个选择器独占一行，便于阅读[](https://blog.csdn.net/weixin_44524703/article/details/121071964#3)。
    

**2. 链接伪类选择器**  
链接的四种状态及对应的伪类如下，**书写顺序必须遵循 LVHA 原则（LoVe HAte）**，否则样式可能被覆盖而失效：

|状态|伪类|说明|
|---|---|---|
|**L**ink|`a:link`|未访问过的链接|
|**V**isited|`a:visited`|已访问过的链接|
|**H**over|`a:hover`|鼠标悬停在链接上|
|**A**ctive|`a:active`|鼠标按下但未松开时|

> **实际开发建议**：通常只需要设置 `a`（基础样式）和 `a:hover`（悬停样式）即可满足大部分需求，无需将四种状态全部写全[](https://blog.csdn.net/weixin_44524703/article/details/121071964#3)。
==三：代码==
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>分组选择器与链接伪类</title>
    <link rel="stylesheet" href="../CSS/分组和链接伪类.css">
</head>
<body>
    <h1>分组选择器与链接伪类选择器</h1>

    <!-- 1. 分组选择器演示 -->
    <div class="box1">我是div，我和p、span一起被分组选中了。</div>
    <p>我是p，我和div、span一起被分组选中了。</p>
    <span>我是span，我和div、p一起被分组选中了。</span>

    <hr>

    <!-- 2. 链接伪类演示 -->
    <a href="#" class="link-demo">点我试试（未访问）</a>
    <a href="https://www.baidu.com" class="link-demo" target="_blank">点我试试（已访问）</a>
    <a href="#" class="link-demo">鼠标悬停试试</a>
</body>
</html>
```
```css
/* 全局初始化 */
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

/* ========== 1. 分组选择器 ========== */
/* 一次性为 div, p, span 设置相同样式 */
div, p, span {
    color: #4D6BFE;
    font-size: 18px;
    line-height: 1.8;
    margin-bottom: 10px;
    padding: 10px;
    border-left: 4px solid #4D6BFE;
    background-color: #eef2ff;
}

/* ========== 2. 链接伪类选择器 ========== */
/* 基础样式：所有链接的默认外观 */
.link-demo {
    display: inline-block;
    margin: 5px 10px 5px 0;
    padding: 8px 16px;
    font-size: 16px;
    text-decoration: none;
    border-radius: 6px;
    transition: all 0.3s;
}

/* 1. :link - 未访问的链接 */
.link-demo:link {
    color: #333;
    background-color: #e0e0e0;
    border: 1px solid #ccc;
}

/* 2. :visited - 已访问的链接 */
.link-demo:visited {
    color: #999;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
}

/* 3. :hover - 鼠标悬停 */
.link-demo:hover {
    color: #fff;
    background-color: #4D6BFE;
    border: 1px solid #4D6BFE;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(77, 107, 254, 0.3);
}

/* 4. :active - 鼠标按下 */
.link-demo:active {
    color: #fff;
    background-color: #3a5bd9;
    border: 1px solid #3a5bd9;
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(77, 107, 254, 0.2);
}
```
==四：总结==
- **分组选择器**：用逗号 `,` 连接多个选择器，为它们设置**相同样式**，减少代码重复，是常用的“集体声明”技巧[](https://developer.aliyun.com/article/978838#1)。
    
- **链接伪类选择器**：用 `:` 表示，针对链接的四种状态设置样式，**必须按 LVHA 顺序书写**（`:link` → `:visited` → `:hover` → `:active`），否则样式可能不生效。
    
- **实际开发**：通常只写 `a`（基础样式）和 `a:hover`（悬停样式）就足够了[](https://blog.csdn.net/weixin_44524703/article/details/121071964#3)。