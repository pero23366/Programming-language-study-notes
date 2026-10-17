==一：概念==
### 用CSS给文字“穿衣服”

之前你学的选择器是“找到谁”，现在学的字体样式就是“让它变成什么样”。CSS字体属性用于定义**字体系列、大小、粗细、文字样式（如斜体）和颜色**。这节课会把这些属性逐个拆解，让你能精确控制页面上每一个文字的视觉效果。
==二：格式==
### **字体样式核心属性清单**

|属性|作用|常见值|注意事项|
|---|---|---|---|
|**`color`**|文字颜色|英文单词（`red`）、十六进制（`#FF0000`）、RGB|三种写法都可用[](https://blog.csdn.net/weixin_42771853/article/details/128241735#1)|
|**`font-family`**|字体系列|`"Microsoft YaHei", Arial, sans-serif`|多个字体用逗号隔开，按优先级从左到右依次尝试；带空格的字体名要加引号[](https://cloud.tencent.com.cn/developer/article/2209845?from=15425&frompage=seopage#1)[](https://www.e-com-net.com/article/1357491509892558848.htm#1)|
|**`font-size`**|字号大小|`16px`、`20px`|单位通常是`px`，一定要写单位；建议给`body`指定一个明确的基础字号，不要依赖浏览器默认值[](https://blog.csdn.net/weixin_42771853/article/details/128241735#1)|
|**`font-weight`**|字体粗细|`normal`(默认)、`bold`、`400`、`700`|数字后面**不加单位**；`400`等同于`normal`，`700`等同于`bold`[](https://blog.csdn.net/weixin_42771853/article/details/128241735#1)|
|**`font-style`**|字体风格|`normal`(默认)、`italic`(斜体)|开发中很少主动给文字加斜体，反而常把`<em>`、`<i>`标签改为`normal`[](https://blog.csdn.net/weixin_42771853/article/details/128241735#1)|
|**`text-decoration`**|文本装饰线|`none`、`underline`(下划线)、`line-through`(删除线)|`none`最常用，用来去掉`<a>`标签默认的下划线|
==三：代码==
```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>字体样式练习</title>
    <link rel="stylesheet" href="../CSS/字体样式.css">
</head>
<body>
    <h1>CSS字体样式大练兵</h1>
    <p class="color-demo">1. 我是用颜色属性控制的文字，现在我是红色。</p>
    <p class="family-demo">2. 我用了font-family，优先使用微软雅黑，没有就回退到Arial。</p>
    <p class="size-demo">3. 我用了font-size，我的字号是24px。</p>
    <p class="weight-demo">4. 我用了font-weight: 700，所以我加粗了。</p>
    <p class="style-demo">5. 我用了font-style: italic，所以我变斜了。</p>
    <a href="#" class="decoration-demo">6. 我本来有下划线，但被text-decoration: none去掉了。</a>
    <hr>
    <p class="font-shorthand">7. 我用了font简写属性，一行代码搞定所有字体样式。</p>
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
}

/* 1. 文字颜色 */
.color-demo {
    color: red;
}

/* 2. 字体系列：从左到右依次尝试 */
.family-demo {
    font-family: "Microsoft YaHei", Arial, sans-serif;
}

/* 3. 字号大小 */
.size-demo {
    font-size: 24px;
}

/* 4. 字体粗细：700 = bold */
.weight-demo {
    font-weight: 700;
}

/* 5. 字体风格：italic = 斜体 */
.style-demo {
    font-style: italic;
}

/* 6. 文本装饰：去掉下划线 */
.decoration-demo {
    text-decoration: none;
    color: #4D6BFE;
    font-weight: bold;
}

/* 7. font 简写属性 */
.font-shorthand {
    /* 顺序：font-style font-weight font-size/line-height font-family */
    font: italic 700 20px/1.8 "Microsoft YaHei", Arial, sans-serif;
    color: #333;
}
```
==四：总结==
- **`color`**：三种写法（英文单词、十六进制、RGB）都能用，十六进制最常用。
    
- **`font-family`**：写多个字体名做“备胎”，按优先级从左到右依次匹配。
    
- **`font-size`**：必须带单位（`px`），建议给`body`一个明确的基准字号。
    
- **`font-weight`**：`400`=正常，`700`=加粗，数字后**不加单位**。
    
- **`font-style`**：`italic`是斜体，但开发中更常用`normal`去取消斜体标签的默认样式。
    
- **`text-decoration`**：`none`最常用，专门用来去掉`<a>`标签的下划线。
    
- **`font`简写**：必须按`font-style font-weight font-size/line-height font-family`的顺序，其中**`font-size`和`font-family`不能省略**[](https://blog.csdn.net/weixin_42771853/article/details/128241735#1)。