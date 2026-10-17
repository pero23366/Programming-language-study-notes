==一：概念==
**背景线性渐变**：让背景颜色沿一条直线从一种颜色平滑过渡到另一种颜色，比纯色背景更有层次感。它本质上是一个背景图像，通过 `linear-gradient()` 函数生成[](https://blog.csdn.net/zyx210603/article/details/136061153#1)。

**文字渐变**：让文字本身呈现渐变色彩。CSS 无法直接给文字填充渐变，需要借助“背景裁剪”的思路：先用渐变背景铺满文字所在的盒子，再将背景裁剪成文字的形状，最后让文字本身变透明，露出背后的渐变。
==二：格式==
**1. 背景线性渐变语法**

```css

background: linear-gradient(起始方向, 颜色1, 颜色2, ...);
```

起始方向可以是方位名词（如 `left`、`top`、`left top`）或度数（如 `45deg`）。**如果省略，默认方向是 `top`（从上到下）**[](https://blog.csdn.net/zyx210603/article/details/136061153#1)。

**2. 浏览器私有前缀**  
由于渐变是CSS3早期特性，需要添加私有前缀以保证兼容性：

- `-webkit-`：Chrome、Safari
    
- `-moz-`：Firefox
    
- `-o-`：Opera
    

标准写法放在最后，让支持标准的浏览器优先使用[](https://blog.csdn.net/zyx210603/article/details/136061153#1)。

**3. 文字渐变三步法**

```css

/* 第1步：渐变背景 */
background: linear-gradient(to right, #4D6BFE, #259666);
/* 第2步：将背景裁剪为文字形状 */
-webkit-background-clip: text;
background-clip: text;
/* 第3步：文字本身透明，露出背后的渐变 */
color: transparent;
/* 兼容性写法 */
-webkit-text-fill-color: transparent;

```
其中 `-webkit-background-clip: text` 是关键，它告诉浏览器“只把背景显示在文字笔画范围内”。
==三：代码==
**HTML 结构**

```html
<body>
    <div class="box1">从上到下</div>
    <div class="box2">从左到右</div>
    <div class="box3">对角线渐变（带前缀）</div>
    <div class="box4">多色渐变</div>
    <h1 class="gradient-text">文字渐变效果</h1>
</body>
```

**CSS 样式**

```css

*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    padding: 30px;
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
div {
    width: 500px;
    height: 120px;
    margin-bottom: 25px;
    text-align: center;
    line-height: 120px;
    font-size: 20px;
    color: #fff;
    border-radius: 10px;
}
/* 1. 默认方向：从上到下 */
.box1 {
    background: linear-gradient(#4D6BFE, #259666);
}
/* 2. 从左到右 */
.box2 {
    background: linear-gradient(to right, #ffd662, #e74c3c);
}
/* 3. 对角线渐变（带私有前缀） */
.box3 {
    background: -webkit-linear-gradient(left top, #7e31b1, #4D6BFE);
    background: linear-gradient(to right bottom, #7e31b1, #4D6BFE);
}
/* 4. 多色渐变 */
.box4 {
    background: linear-gradient(to right, #e74c3c, #ffd662, #259666, #4D6BFE);
}
/* ========== 5. 文字渐变 ========== */
.gradient-text {
    font-size: 60px;
    text-align: center;
    /* 第1步：渐变背景 */
    background: linear-gradient(to right, #4D6BFE, #e74c3c, #ffd662);
    /* 第2步：裁剪到文字 */
    -webkit-background-clip: text;
    background-clip: text;
    /* 第3步：文字透明 */
    color: transparent;
    -webkit-text-fill-color: transparent; /* 兼容 WebKit 内核 */
}
```
==四：总结==

|知识点|核心要点|
|---|---|
|**背景线性渐变**|`linear-gradient(方向, 颜色1, 颜色2, ...)`，方向可省略，默认从上到下|
|**私有前缀**|`-webkit-`、`-moz-`、`-o-` 写在标准写法前面|
|**文字渐变**|三步法：`background` 设渐变 + `background-clip: text` 裁剪 + `color: transparent` 透明|
|**兼容性**|文字渐变必须加 `-webkit-` 前缀，主要在 WebKit 内核浏览器（Chrome、Safari）中支持|


- ==🟡普通的 `linear-gradient`，大胆地只写标准写法。==
    
- ==🟡唯独**文字渐变**这个知识点，**死死记住**必须手敲那三行 `-webkit-`，这是前端界少有的、必须手动兼容的“奇葩”。==