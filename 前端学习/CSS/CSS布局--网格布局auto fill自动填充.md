### 🎯 一、概念：让网格自己“聪明”起来

`auto-fill` 是 `repeat()` 函数的一个关键字，用于实现**响应式网格布局**。它的核心是：**让浏览器根据容器宽度，自动计算出一行能放多少个指定尺寸的网格项，并尽可能多地创建列**。

- **工作原理**：当 `repeat()` 的第一个参数是 `auto-fill` 时，浏览器会计算容器宽度下最多能容纳多少个指定尺寸的列，然后“自动填充”这么多列，哪怕没有足够的内容去填充它们，也会保留这些空列（空轨道）。
    
- **与 `auto-fit` 的区别**（这是关键点）：
    
    - **`auto-fill`**：**保留空轨道**。如果容器宽度足够，比如能放4列，但只有3个元素，那么第4列会作为空白列保留，元素不会拉伸。
        
    - **`auto-fit`**：**折叠空轨道**。如果容器能放4列但只有3个元素，`auto-fit` 会把多余的空白列折叠掉，让现有的3个元素**拉伸以填满整行**，视觉效果更饱满。
        

### 📐 二、格式：核心语法与规则

`auto-fill` 必须与 `minmax()` 函数配合使用才有效。

**1. 基本语法**

```css

grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));

- **`minmax(200px, 1fr)`**：表示每列的最小宽度是 `200px`，最大宽度是 `1fr`（即平均分配剩余空间）。
    
- 浏览器会计算：在容器宽度下，能放下多少个至少 `200px` 宽的列。比如容器宽 `850px`，能放下 `4` 个 `200px`（加上间隙），那就创建 `4` 列，每列宽度平均分配剩余空间。
    

```
**2. 与固定尺寸的区别**

- `repeat(auto-fill, 100px)`：列宽固定 `100px`，**不会拉伸**，可能留下无法填满的空隙。
    
- `repeat(auto-fill, minmax(200px, 1fr))`：列宽在 `200px` 到 `1fr` 之间**弹性变化**，能更好地利用空间。
    

### 💻 三、代码：在项目中实战

新建 `auto-fill.html`，创建一个响应式卡片网格：

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>auto-fill 自动填充</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        /* 父容器：网格容器 */
        .grid-container {
            display: grid;
            /* 核心：自动填充，每列最小 200px，最大 1fr */
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
            width: 90%;
            max-width: 1200px;
            margin: 50px auto;
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 12px;
        }
        /* 子项目：卡片 */
        .card {
            background-color: #4D6BFE;
            color: #fff;
            font-size: 18px;
            text-align: center;
            padding: 40px 20px;
            border-radius: 8px;
            transition: all 0.3s;
        }
        .card:hover {
            background-color: #3a5bd9;
            transform: translateY(-5px);
        }
    </style>
</head>
<body>
    <div class="grid-container">
        <div class="card">1</div>
        <div class="card">2</div>
        <div class="card">3</div>
        <div class="card">4</div>
        <div class="card">5</div>
        <div class="card">6</div>
    </div>
</body>
</html>
```

**运行效果**：

- 在**大屏幕**上，一行可能显示 4 个或 5 个卡片。
    
- 在**中等屏幕**上，一行显示 3 个。
    
- 在**手机**上，一行显示 1 个或 2 个。
    
- **无需写任何媒体查询**，网格列数会自动根据屏幕宽度调整。
    

### 💎 四、总结

|知识点|核心要点|
|---|---|
|**`auto-fill` 的作用**|让浏览器根据容器宽度自动计算列数，实现响应式布局。|
|**必须配合 `minmax()`**|`minmax(200px, 1fr)` 设定每列的最小和最大宽度。|
|**与 `auto-fit` 的区别**|`auto-fill` 保留空轨道（可能留白），`auto-fit` 折叠空轨道（元素拉伸）。|
|**适用场景**|商品列表、卡片网格、图库等需要自适应列数的场景。|