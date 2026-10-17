==一：概念==
### 网页布局的本质就是“画盒子”

在 CSS 眼里，网页上所有元素都是矩形的“盒子”[](https://cloud.tencent.com.cn/developer/article/1746927?policyId=1003#1)。所谓的网页布局，其实就是两步：**先利用 CSS 设置好盒子的大小和位置，再把文字、图片等内容放进盒子里**[](https://cloud.tencent.com.cn/developer/article/1746927?policyId=1003#1)。

这节课会用几个大的 `div` 来划分页面的**头部（header）**、**导航（nav）**、**主体（main）** 和**底部（footer）**，这就是一个经典网页的宏观结构[](https://blog.csdn.net/m0_54189068/article/details/156989669#1)。
==二：格式==
### 用盒模型和居中对齐搭建结构

这节课主要围绕“如何摆放盒子”展开，核心是掌握**块级元素的水平居中**和**盒模型的尺寸控制**。

1. **块级元素的水平居中**：对于有固定宽度的块级元素（如 `.nav`、`.main`），要让它在父容器中水平居中，使用 `margin: 0 auto;` 即可[](https://blog.csdn.net/m0_54189068/article/details/156989669#1)。
    
2. **通栏与版心**：
    
    - **通栏**：`header` 和 `footer` 这类元素不设置 `width`（或设为 `100%`），默认就和浏览器一样宽[](https://blog.csdn.net/m0_54189068/article/details/156989669#1)。
        
    - **版心**：`nav` 和 `main` 这类内容区域，通常设置一个固定宽度（如 `1000px`），然后通过 `margin: 0 auto;` 居中[](https://blog.csdn.net/m0_54189068/article/details/156989669#1)。
        
3. **盒模型三要素**：在布局阶段，你主要通过 `width`、`height` 和 `background-color` 来“画出”盒子的轮廓。
==三：代码==
### 用 `div` 和 CSS 画出网页布局

在 HTML 中，用 `div` 标签定义盒子结构，然后在 CSS 中为每个盒子设置样式[](https://blog.csdn.net/m0_54189068/article/details/156989669#1)。

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>画盒子案例</title>
    <style>
        /* 1. 初始化，清除默认的 margin 和 padding */
        * {
            margin: 0;
            padding: 0;
        }
        /* 2. 头部：通栏，与浏览器同宽 */
        .header {
            height: 88px;
            background-color: #ffd662;
        }
        /* 3. 导航栏：固定宽度，水平居中 */
        .nav {
            width: 1000px;
            height: 68px;
            background-color: #28bed0;
            margin: 0 auto; /* 块级元素水平居中的关键 */
        }
        /* 4. 主体：固定宽度，水平居中 */
        .main {
            width: 1000px;
            height: 399px;
            background-color: #dde9ec;
            margin: 0 auto;
        }
        /* 5. 底部：通栏 */
        .footer {
            height: 152px;
            background-color: #259666;
        }
    </style>
</head>
<body>
    <div class="header">头部</div>
    <div class="nav">导航</div>
    <div class="main">主体</div>
    <div class="footer">底部</div>
</body>
</html>
```
==四：总结==

这一课的核心是帮你建立**“网页布局 = 搭建盒子结构”**的思维。你学到的关键技能有两点：

1. **用 `div` 划分区域**：通过语义化的类名（如 `.header`、`.nav`）来规划页面结构。
    
2. **用 `margin: 0 auto` 实现居中**：这是让固定宽度的盒子在页面中水平居中的标准写法[](https://blog.csdn.net/m0_54189068/article/details/156989669#1)。
    

你现在用颜色块代替真实内容，能更纯粹地感受布局结构。接下来你会学习**盒子模型**的详细组成（`border`、`padding`、`margin`），到那时，你就能精确控制盒子的尺寸和间距了[](https://cloud.tencent.com.cn/developer/article/1746927?policyId=1003#1)。