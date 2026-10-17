==一：概念==
**HTML（超文本标记语言）**

- **HTML 是什么**：它是一种用来告知浏览器如何组织页面的**标记语言**，由一系列标签组成，简单说，学习 HTML 就是学习标签的用法[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)。
    
- **HTML 文档是什么**：你之前写的那段 `<!DOCTYPE html>...` 代码，就是一个完整的 HTML 文档结构。它包含了**根元素 `<html>`、头部 `<head>` 和主体 `<body>`** 三大核心部分[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)。
    


==二：格式==
```html
<!DOCTYPE html>

<html lang="zh-CN">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>我的第一个前端网页</title>

</head>

<body>

    <h1>Hello，前端！</h1>

    <p>我学完了 C#，现在开始学 HTML 了。</p>

</body>

</html>

- **`<!DOCTYPE html>`**：文档类型声明，告诉浏览器当前页面使用 **HTML5 规范**编写[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)。
    
- **`<html lang="zh-CN">`**：根元素，包裹页面所有内容。`lang` 属性声明网页主要语言，`zh-CN` 代表中文，帮助浏览器和搜索引擎正确处理内容[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)。
    
- **`<head>`**：头部元素，包含供机器处理的**元数据**（而非直接展示给用户的信息）[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)。
    
- **`<meta charset="UTF-8">`**：字符集声明，**必须加**，否则中文可能乱码[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)。
    
- **`<meta name="viewport" ...>`**：移动端适配声明，确保网页在手机等设备上以最佳状态呈现[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)。
    
- **`<title>`**：设置页面标题，显示在浏览器标签页上[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)。
    
- **`<body>`**：主体元素，页面中**所有可见内容**都放在这里。
```

==三：代码==
```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的第一个网页</title>
</head>
<body>
    <h1>Hello，前端！</h1>
    <p>我学完了 C#，现在开始学 HTML 了。</p>
</body>
</html>
```
==四：总结==

这一集是 HTML 的**“第一课”**，核心任务不是学复杂标签，而是搞懂**“HTML 文档长什么样，每一部分是干什么的”**。学完这集，你就有了一个规范的 HTML5 骨架模板，以后写任何页面都从这个模板开始。