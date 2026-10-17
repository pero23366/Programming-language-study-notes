==一：概念==
### 状态感知与“凭空造物”

- **表单选择器（状态伪类）**：专门针对表单元素（如输入框、按钮）的**当前状态**来选样式[](https://www.bilibili.com/opus/1198084636212723721?from=search#3)。比如，复选框被选中了、输入框被禁用了，或者正在输入时，都可以用不同的样式来给用户反馈[](https://mdn.org.cn/en-US/docs/Learn/Forms/UI_pseudo-classes)。
    
- **伪元素选择器**：它让你能用CSS**创建并选择**元素中原本不存在的“虚拟部分”[](https://www.e-com-net.com/article/1699891150082617344.htm#1)。最常用的是 `::before` 和 `::after`，它们能在元素内容的前后**插入新的内容或装饰**，而不需要改动HTML结构[](https://www.e-com-net.com/article/1699891150082617344.htm#1)。
==二：格式==
**1. 表单选择器（伪类）**

- `:checked`：选中**被选中的**复选框或单选按钮。
    
- `:disabled`：选中**被禁用的**表单元素。
    
- `:enabled`：选中**当前可用**的表单元素。
    
- `:focus`：选中**获得焦点**的元素（比如鼠标点击了输入框）。
    
- `:valid` / `:invalid`：根据输入内容是否**符合验证规则**来选中[](https://mdn.org.cn/en-US/docs/Learn/Forms/UI_pseudo-classes)。
    

**2. 伪元素选择器**

- `::before`：在元素内容的**前面**插入内容[](https://www.e-com-net.com/article/1699891150082617344.htm#1)。
    
- `::after`：在元素内容的**后面**插入内容[](https://www.e-com-net.com/article/1699891150082617344.htm#1)。
    
- **关键规则**：`::before` 和 `::after` 必须配合 `content` 属性使用，即使不插入文字，也必须写成 `content: "";`[](https://www.e-com-net.com/article/1699891150082617344.htm#1)。
==三：代码==
基于你现在的项目结构，新建 `前端/HTML/表单和伪元素.html`，并在 `前端/CSS/` 目录下新建 `表单和伪元素.css`。

**1. HTML 结构 (`前端/HTML/表单和伪元素.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>表单选择器与伪元素</title>
    <link rel="stylesheet" href="../CSS/表单和伪元素.css">
</head>
<body>
    <h1>表单选择器与伪元素选择器</h1>
    <!-- 1. 表单状态伪类 -->
    <form class="demo-form">
        <label>
            <input type="checkbox" checked> 我已阅读并同意协议
        </label>
        <label>
            <input type="checkbox"> 订阅邮件通知
        </label>
        <br><br>
        <input type="text" placeholder="点击我试试" class="demo-input">
        <input type="text" placeholder="我是禁用状态" disabled class="demo-input">
    </form>
    <!-- 2. 伪元素 ::before / ::after -->
    <div class="quote-box">
        这是一段需要添加引号装饰的文字。
    </div>
    <div class="star-list">
        <div>前端基础</div>
        <div>CSS布局</div>
        <div>JavaScript</div>
    </div>
</body>
</html>
```

**2. CSS 样式 (`前端/CSS/表单和伪元素.css`)**

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
/* ========== 1. 表单状态伪类 ========== */
.demo-form {
    width: 400px;
    margin: 0 auto 40px;
    padding: 20px;
    background-color: #fff;
    border-radius: 10px;
}
.demo-form label {
    display: block;
    margin-bottom: 10px;
}
/* 被选中的复选框：文字变绿加粗 */
input:checked + span {
    color: #259666;
    font-weight: bold;
}
/* 获得焦点的输入框：边框变蓝，发光 */
.demo-input:focus {
    border-color: #4D6BFE;
    outline: none;
    box-shadow: 0 0 8px rgba(77, 107, 254, 0.4);
}
/* 被禁用的输入框：背景变灰，不可点击 */
.demo-input:disabled {
    background-color: #e0e0e0;
    cursor: not-allowed;
    color: #999;
}
/* ========== 2. 伪元素选择器 ========== */
.quote-box {
    width: 400px;
    margin: 0 auto 40px;
    padding: 20px;
    background-color: #eef2ff;
    border-left: 5px solid #4D6BFE;
    font-size: 16px;
    line-height: 1.8;
    color: #333;
}
/* 在引用文字前后添加装饰性引号 */
.quote-box::before {
    content: "“";
    font-size: 30px;
    color: #4D6BFE;
    font-weight: bold;
}
.quote-box::after {
    content: "”";
    font-size: 30px;
    color: #4D6BFE;
    font-weight: bold;
}
/* 在列表项前面插入星号 */
.star-list {
    width: 300px;
    margin: 0 auto;
}
.star-list div {
    padding: 8px 0;
    font-size: 18px;
    color: #333;
}
.star-list div::before {
    content: "★ ";
    color: #ffd662;
    font-weight: bold;
}
```
==四：总结==
- **表单选择器**：通过 `:checked`、`:disabled`、`:focus` 等伪类，根据表单元素的**实时状态**改变样式，增强交互反馈。
    
- **伪元素选择器**：用 `::before` 和 `::after` 在元素前后**插入内容或装饰**，**必须配合 `content` 属性**，不写内容也要写 `content: "";`。
    
- **核心价值**：表单选择器让用户操作有反馈，伪元素选择器让HTML更干净，不需要为了装饰而多加标签。