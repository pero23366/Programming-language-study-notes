==一：概念==
### 用CSS控制文本的“排兵布阵”

这节课主要围绕**水平对齐、首行缩进和行间距**这三个属性展开。它们和上节课的字体样式（颜色、大小、粗细）不同，字体样式改变的是文字本身的“长相”，而文本布局改变的是文字与文字之间、文字与容器之间的**空间关系**。

- **`text-align`**：控制文字在水平方向上如何对齐。
    
- **`text-indent`**：控制段落的第一行空出多少距离。
    
- **`line-height`**：控制每一行文字的高度，也就是行与行之间的“呼吸感”。
==二：格式==
### 文本布局核心属性清单

| 属性                    | 作用            | 常见值                                   | 注意事项                                                        |
| --------------------- | ------------- | ------------------------------------- | ----------------------------------------------------------- |
| **`text-align`**      | 设置**水平对齐**方式  | `left`(默认)、`center`、`right`、`justify` | `justify`是两端对齐，让左右边缘都整齐，适合长段落。                              |
| **`text-indent`**     | 设置**首行缩进**    | `2em`、`20px`                          | **`em`** 是相对单位，1em等于当前字体大小的1个字符宽度。所以`2em`就是缩进两个汉字，这是最常用的写法。 |
| **`line-height`**     | 设置**行间距**（行高） | `1.5`、`2`、`30px`                      | **无单位数字是最佳实践**。它代表字体大小的倍数，如`1.5`表示行高是字体大小的1.5倍。             |
| **`text-decoration`** | 设置**文本装饰线**   | `none`、`underline`、`line-through`     | 上节课已经学过，`none`常用来去掉链接的下划线。                                  |
|                       |               |                                       |                                                             |
**小技巧**：单行文本要实现**垂直居中**，有一个经典技巧：**让`line-height`的值等于盒子的`height`值**。比如盒子高度是100px，设置`line-height: 100px;`，文字就会在垂直方向完美居中
==三：代码==
### 在你的项目中实战

在你现有的 `前端/HTML/` 目录下新建一个 `文本布局.html`，并在 `前端/CSS/` 目录下新建 `文本布局.css`。

**1. HTML 结构 (`前端/HTML/文本布局.html`)**：

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文本布局练习</title>
    <link rel="stylesheet" href="../CSS/文本布局.css">
</head>
<body>
    <h1>CSS 文本布局大练兵</h1>
    <div class="box">
        <p>这是一段默认左对齐的文本，没有任何特殊设置，浏览器会按照默认的规则排列。</p>
    </div>
    <div class="box center">
        <p>这段文字被水平居中了。</p>
    </div>
    <div class="box right">
        <p>这段文字被右对齐了。</p>
    </div>
    <div class="box indent">
        <p>这是一段设置了首行缩进的文字。中文排版有个好习惯，就是段落开头空两格。使用 text-indent: 2em; 就能轻松实现，而且 2em 会随着字体大小自动调整，非常方便。</p>
        <p>你看，第二段的开头也自动缩进了两格，这就是CSS带来的便利。</p>
    </div>
    <div class="box lineheight">
        <p>这段文字的行高比较大，看起来更加透气、舒服，适合长时间阅读。行高设置过小，文字会显得非常拥挤。使用无单位的 line-height，可以让行高始终与字体大小保持一个稳定的比例关系。</p>
    </div>
    <div class="vertical-center">
        我是单行文字，我垂直居中了！
    </div>
</body>
</html>
```

**2. CSS 样式 (`前端/CSS/文本布局.css`)**：

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
/* 每个练习模块的基础样式 */
.box {
    width: 500px;
    margin: 0 auto 20px; /* 水平居中，底部留间距 */
    padding: 20px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
}
/* 1. 水平对齐 */
.center {
    text-align: center;
}
.right {
    text-align: right;
}
/* 2. 首行缩进 */
.indent p {
    text-indent: 2em;
    color: #555;
}
/* 3. 行高 */
.lineheight p {
    line-height: 1.8;
    color: #555;
}
/* 4. 单行文本垂直居中 */
.vertical-center {
    height: 100px;
    line-height: 100px; /* 行高 = 盒子高度，实现垂直居中 */
    text-align: center;
    background-color: #4D6BFE;
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    border-radius: 8px;
}
```
==四：总结==
这节课的核心是 **“通过控制空间关系来提升阅读体验”**：

- **`text-align`**：让文字在水平方向上归位。
    
- **`text-indent: 2em`**：养成中文段落首行缩进的好习惯。
    
- **`line-height`**：给文字留出呼吸的空间，**推荐使用无单位数字**。
    
- **`line-height = height`**：实现单行文字垂直居中的经典技巧。