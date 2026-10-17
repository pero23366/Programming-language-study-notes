==一：概念==
### 选择器是 CSS 的“瞄准镜”

CSS 规则由 **选择器** 和 **声明块** 两部分组成[](https://cloud.tencent.cn/developer/article/2209845?policyId=1004#1)[](https://www.shuzhiduo.com/A/pRdBNpBedn/#1)。选择器的作用就是**找到你想要美化的那个（些）标签**[](https://www.shuzhiduo.com/A/pRdBNpBedn/#1)。基础选择器主要有四种：

- **标签选择器**：直接使用 HTML 标签名，能选中页面中**所有**这类标签，适合做全局基础设置，但无法差异化选择[](https://cloud.tencent.cn/developer/article/2209845?policyId=1004#1)。
    
- **类选择器**：通过 `.类名` 来定义，需要在 HTML 标签中用 `class="类名"` 来调用。**这是开发中最常用、最灵活的选择器**，可以给多个标签赋予同一个类名，实现批量样式设置[](https://cloud.tencent.cn/developer/article/2209845?policyId=1004#1)。
    
- **ID 选择器**：通过 `#id名` 来定义，在 HTML 标签中用 `id="id名"` 来调用。ID 在一个页面中必须是**唯一**的，类似身份证号，通常配合 JavaScript 使用，不推荐用它来设置样式[](https://www.cnblogs.com/destiny-2015/p/15440838.html#1)。
    
- **通配符选择器**：用 `*` 表示，能选中页面中**所有**元素。主要用在 CSS 初始化中清除默认的 `margin` 和 `padding`，开发中极少用于其他场景[](https://www.cnblogs.com/destiny-2015/p/15440838.html#1)。
==二：格式==
在 CSS 文件中，选择器的写法遵循固定格式：

```css

选择器 {
    属性名: 属性值;
    属性名: 属性值;
}
```

- **标签选择器**：`标签名 { ... }`
    
- **类选择器**：`.类名 { ... }`
    
- **ID 选择器**：`#id名 { ... }`
    
- **通配符选择器**：`* { ... }`
    

**书写建议**：推荐使用展开格式，选择器和大括号之间保留一个空格，冒号后面也保留一个空格，代码更清晰易读[](https://cloud.tencent.cn/developer/article/2209845?policyId=1004#1)[](https://www.shuzhiduo.com/A/pRdBNpBedn/#1)。
==三：代码==
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>基础选择器练习</title>
    <style>
        /* 1. 标签选择器：选中所有 p 标签 */
        p {
            color: blue;
        }
        /* 2. 类选择器：选中 class="highlight" 的标签 */
        .highlight {
            background-color: yellow;
        }
        /* 3. ID选择器：选中 id="unique" 的标签 */
        #unique {
            font-size: 24px;
        }
        /* 4. 通配符选择器：清除所有标签默认边距 */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
    </style>
</head>
<body>
    <p>我是普通的段落，被标签选择器选中，颜色是蓝色。</p>
    <p class="highlight">我带有 class，被类选择器选中，背景变黄了。</p>
    <p id="unique">我带有 id，被 ID 选择器选中，字体变大了。</p>
    <div>div 也会被通配符选择器清除默认边距。</div>
</body>
</html>
```
==四：总结==