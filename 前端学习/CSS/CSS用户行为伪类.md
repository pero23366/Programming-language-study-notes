==一：概念==
### 感知用户行为的“动态伪类”

之前学的链接伪类（`:link`, `:visited`）是专门针对 `<a>` 标签的。而 `:hover` 和 `:focus` 是更通用的**用户行为伪类**，几乎所有元素都能使用。

- **`:hover`**：当鼠标**悬停**在元素上时，触发样式变化。常用于按钮、链接、卡片等，提供视觉反馈。
    
- **`:focus`**：当元素**获得焦点**时触发。通常用于表单元素（如 `<input>`），当用户点击输入框准备打字时，输入框会高亮显示。
==二：格式==
### 基本语法与书写顺序

- **`:hover` 语法**：`选择器:hover { 属性: 值; }`
    
- **`:focus` 语法**：`选择器:focus { 属性: 值; }`
    
- **书写顺序**：当同时使用链接的多个状态伪类时，必须遵循 **LVHA** 原则（`:link` → `:visited` → `:hover` → `:active`），否则样式可能被覆盖而失效。`:focus` 通常放在 `:hover` 之后。
==三：代码==
**HTML 结构 (`前端/HTML/用户行为伪类.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>用户行为伪类练习</title>
    <link rel="stylesheet" href="../CSS/用户行为伪类.css">
</head>
<body>
    <h1>用户行为伪类练习</h1>
    <!-- 1. :hover 演示：按钮悬停 -->
    <div class="demo-section">
        <h2>1. :hover 悬停效果</h2>
        <button class="btn-hover">把鼠标放上来试试</button>
    </div>
    <!-- 2. :focus 演示：输入框聚焦 -->
    <div class="demo-section">
        <h2>2. :focus 聚焦效果</h2>
        <input type="text" class="input-focus" placeholder="点击我输入文字">
    </div>
    <!-- 3. 组合演示：卡片悬停 -->
    <div class="demo-section">
        <h2>3. 卡片悬停效果</h2>
        <div class="card">
            <h3>卡片标题</h3>
            <p>鼠标悬停在这张卡片上，看看会发生什么变化。</p>
        </div>
    </div>
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
/* ========== 1. :hover 悬停效果 ========== */
.btn-hover {
    padding: 12px 30px;
    font-size: 16px;
    color: #fff;
    background-color: #4D6BFE;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s; /* 让变化平滑过渡 */
}
.btn-hover:hover {
    background-color: #3a5bd9; /* 颜色变深 */
    transform: translateY(-3px); /* 向上浮动 */
    box-shadow: 0 6px 12px rgba(77, 107, 254, 0.4); /* 添加阴影 */
}
/* ========== 2. :focus 聚焦效果 ========== */
.input-focus {
    width: 100%;
    padding: 12px 15px;
    font-size: 16px;
    border: 2px solid #ddd;
    border-radius: 8px;
    outline: none; /* 去掉浏览器默认的聚焦轮廓 */
    transition: all 0.3s;
}
.input-focus:focus {
    border-color: #4D6BFE; /* 边框变蓝 */
    box-shadow: 0 0 8px rgba(77, 107, 254, 0.3); /* 添加发光效果 */
}
/* ========== 3. 卡片悬停效果 ========== */
.card {
    padding: 20px;
    background-color: #f9f9f9;
    border: 2px solid #eee;
    border-radius: 10px;
    transition: all 0.3s;
}
.card:hover {
    border-color: #4D6BFE;
    background-color: #eef2ff;
    transform: scale(1.02); /* 稍微放大 */
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}
.card h3 {
    color: #333;
    margin-bottom: 10px;
}
.card p {
    color: #666;
    line-height: 1.6;
}
```
==四：总结==

- **`:hover`**：鼠标悬停时触发，用于按钮、卡片等元素的交互反馈，常配合 `transition` 让变化更平滑。
    
- **`:focus`**：元素获得焦点时触发，主要用于表单输入框，提示用户当前正在此处输入。
    
- **书写顺序**：链接的多个状态伪类必须遵循 **LVHA** 顺序（`:link` → `:visited` → `:hover` → `:active`）。
    
- **`outline: none`**：在 `:focus` 样式中常用来去掉浏览器默认的聚焦轮廓，再用 `box-shadow` 或 `border-color` 自定义更美观的聚焦效果。