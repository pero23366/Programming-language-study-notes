==一：概念==

**`calc()`** 是 CSS 中一个用于**动态计算属性值**的数学函数。

你可以把它理解成一个**内置在 CSS 里的计算器**。它允许你在样式表中直接进行**加、减、乘、除**四则运算，并把计算结果作为 CSS 属性的值。[](https://mdn.org.cn/en-US/docs/Web/CSS/calc)

它的核心价值在于**“混合计算”**：能将**不同单位**的值组合在一起，例如将百分比 `%` 和固定像素 `px` 相加或相减，这是普通 CSS 值无法做到的。[](https://mdn.org.cn/en-US/docs/Web/CSS/CSS_values_and_units/Using_CSS_math_functions)

==二：格式==

`calc()` 的语法是：`calc(数学表达式)`。

|运算符|说明|空格要求|
|---|---|---|
|**`+`**|加法|**前后必须有空格**[](http://developer.typescripts.org/zh-CN/docs/Web/CSS/calc#1)|
|**`-`**|减法|**前后必须有空格**[](http://developer.typescripts.org/zh-CN/docs/Web/CSS/calc#1)|
|**`*`**|乘法|前后可选，建议加空格|
|**`/`**|除法|除数不能为 `0`[](http://developer.typescripts.org/zh-CN/docs/Web/CSS/calc#1)|

**常见写法示例：**

css

width: calc(100% - 80px);          /* 百分比 减去 像素 */
height: calc(10em + 3px);          /* em 加上 像素 */
font-size: calc(2 * var(--size));  /* 数字 乘以 CSS变量 */
min-height: calc(100vh - 200px);   /* 视口高度 减去 像素 */
padding: calc(50% - 50px);

**一个极易踩坑的细节**：`+` 和 `-` 两边**必须保留空格**。`calc(100%-80px)` 是**无效**的，浏览器会解析失败。[](https://developer.aliyun.com/article/1136926#1)

==三：代码==

**HTML (`calc-practice.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>calc 计算函数练习</title>
    <link rel="stylesheet" href="./CSS/calc-practice.css">
</head>
<body>
    <!-- 场景一：父盒子 100%，子盒子 减去固定宽度 -->
    <div class="parent">
        <div class="child">子盒子宽度 = 100% - 40px</div>
    </div>
    <!-- 场景二：三栏布局，中间自适应 -->
    <div class="three-col">
        <div class="left">左侧 200px</div>
        <div class="center">中间自适应</div>
        <div class="right">右侧 150px</div>
    </div>
    <!-- 场景三：sticky footer 布局 -->
    <div class="layout">
        <header>头部 60px</header>
        <main>主体内容区域</main>
        <footer>底部 80px</footer>
    </div>
</body>
</html>
```

**CSS (`CSS/calc-practice.css`)**

```css

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: "Microsoft YaHei", Arial, sans-serif;
    padding: 30px;
    background-color: #f5f5f5;
}
/* ===== 场景一：子盒子 = 父盒子宽度 - 固定值 ===== */
.parent {
    width: 600px;
    height: 100px;
    background-color: #ddd;
    margin-bottom: 30px;
}
.child {
    width: calc(100% - 40px);   /* 始终比父盒子窄 40px */
    height: 60px;
    margin: 20px auto;
    background-color: #4D6BFE;
    color: #fff;
    text-align: center;
    line-height: 60px;
    border-radius: 8px;
}
/* ===== 场景二：三栏布局，中间自适应 ===== */
.three-col {
    width: 100%;
    height: 120px;
    margin-bottom: 30px;
    display: flex;
}
.three-col .left {
    width: 200px;
    background-color: #27ba9b;
}
.three-col .center {
    /* 中间宽度 = 100% - 左侧 200px - 右侧 150px */
    width: calc(100% - 350px);
    background-color: #e74c3c;
}
.three-col .right {
    width: 150px;
    background-color: #ffa500;
}
.three-col div {
    color: #fff;
    text-align: center;
    line-height: 120px;
    font-size: 14px;
}
/* ===== 场景三：Sticky Footer 布局 ===== */
.layout {
    height: 100vh;
    display: flex;
    flex-direction: column;
}
.layout header {
    height: 60px;
    background-color: #333;
    color: #fff;
    text-align: center;
    line-height: 60px;
}
.layout main {
    /* 主体高度 = 100vh - 头部 60px - 底部 80px */
    min-height: calc(100vh - 140px);
    background-color: #eef2ff;
    text-align: center;
    padding-top: 50px;
}
.layout footer {
    height: 80px;
    background-color: #259666;
    color: #fff;
    text-align: center;
    line-height: 80px;
}
```

**运行效果**：

- **场景一**：子盒子始终比父盒子窄 40px，改变父盒子宽度，子盒子自动跟随。
    
- **场景二**：左侧 200px、右侧 150px 固定，中间自动填满剩余空间。
    
- **场景三**：主体内容至少撑满一屏减去头尾的高度，页面永远没有多余空白。
    

==四：总结==

|知识点|核心要点|
|---|---|
|**`calc()` 的作用**|在 CSS 中进行动态数学计算，混合不同单位|
|**核心优势**|将 `%`、`px`、`em`、`vh`、`vw` 等单位混合运算|
|**运算符**|`+` `-` `*` `/`，支持括号改变优先级|
|**空格规则**|`+` 和 `-` 两边**必须加空格**，否则失效|
|**与 CSS 变量结合**|`calc(var(--size) * 2)`，让计算更灵活|
|**典型场景**|自适应子盒子、三栏布局、Sticky Footer、全屏布局|
|**浏览器兼容性**|自 2015 年 7 月起，所有现代浏览器均支持|
