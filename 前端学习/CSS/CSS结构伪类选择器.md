==一：概念==
之前学的选择器是靠类名或标签名找元素。而结构伪类选择器，是靠**元素在父元素里的排列位置**来选[](https://www.bilibili.com/opus/1198084636212723721?from=search#3)。

它主要解决两类问题：

- **选中特定位置**：比如选中列表里的**第一个**、**最后一个**、或**第n个**元素。
    
- **选中规律位置**：比如选中**所有奇数行**或**所有偶数行**，常用来给表格或长列表做“隔行变色”，提升可读性。
==二：格式==
**1. 基本语法**

```text

选择器:伪类名(参数) { 属性: 值; }

注意冒号 `:` 前后不要加空格。
```

**2. 常用结构伪类**

| 伪类                 | 作用                           | 示例                   |
| ------------------ | ---------------------------- | -------------------- |
| `:first-child`     | 选中父元素下的**第一个**子元素            | `li:first-child`     |
| `:last-child`      | 选中父元素下的**最后一个**子元素           | `li:last-child`      |
| `:nth-child(n)`    | 选中父元素下**第n个**子元素（索引从**1**开始） | `li:nth-child(2)`    |
| `:nth-child(odd)`  | 选中**所有奇数**位置子元素（1,3,5...）    | `tr:nth-child(odd)`  |
| `:nth-child(even)` | 选中**所有偶数**位置子元素（2,4,6...）    | `tr:nth-child(even)` |
==三：代码==
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>结构伪类选择器</title>
    <link rel="stylesheet" href="../CSS/结构伪类.css">
</head>
<body>
    <h1>结构伪类选择器练习</h1>

    <ul class="demo-list">
        <li>我是第1个 li</li>
        <li>我是第2个 li</li>
        <li>我是第3个 li</li>
        <li>我是第4个 li</li>
        <li>我是第5个 li</li>
    </ul>

    <table class="demo-table">
        <tr><th>姓名</th><th>年龄</th></tr>
        <tr><td>小明</td><td>18</td></tr>
        <tr><td>小红</td><td>19</td></tr>
        <tr><td>小刚</td><td>20</td></tr>
        <tr><td>小美</td><td>21</td></tr>
    </table>
</body>
</html>
```
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

/* ========== 1. 列表：选中特定位置 ========== */
.demo-list {
    list-style: none;
    width: 400px;
    margin: 0 auto 40px;
}

.demo-list li {
    padding: 10px 20px;
    margin-bottom: 5px;
    background-color: #fff;
    border-radius: 5px;
}

/* 选中第1个 li */
.demo-list li:first-child {
    background-color: #ffd662;
    font-weight: bold;
}

/* 选中第3个 li */
.demo-list li:nth-child(3) {
    background-color: #28bed0;
    color: #fff;
}

/* 选中最后一个 li */
.demo-list li:last-child {
    background-color: #259666;
    color: #fff;
}

/* ========== 2. 表格：隔行变色 ========== */
.demo-table {
    width: 500px;
    margin: 0 auto;
    border-collapse: collapse;
    background-color: #fff;
    border-radius: 8px;
    overflow: hidden;
}

.demo-table th,
.demo-table td {
    padding: 12px 20px;
    text-align: center;
    border-bottom: 1px solid #eee;
}

.demo-table th {
    background-color: #4D6BFE;
    color: #fff;
}

/* 偶数行（2,4,6...）变色 */
.demo-table tr:nth-child(even) {
    background-color: #eef2ff;
}

/* 鼠标悬停整行高亮 */
.demo-table tr:hover {
    background-color: #dde9ec;
}
```
==四：总结==

- **`:first-child`**：选**第一个**子元素。
    
- **`:last-child`**：选**最后一个**子元素。
    
- **`:nth-child(n)`**：选**第n个**子元素（索引从**1**开始）。
    
- **`:nth-child(odd/even)`**：选**奇数行/偶数行**，是实现**表格隔行变色**的标准写法。
    
- **注意**：`nth-child` 计算的是**所有兄弟元素**的位置，不会跳过不同标签的元素。