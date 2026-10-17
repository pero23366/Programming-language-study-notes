==一：概念==

`filter` 是 CSS3 的一个属性，用于给元素添加**图形效果**，比如模糊、灰度、亮度调整、颜色偏移等。

你可以把它想象成给元素“戴上一副滤镜眼镜”，让它看起来不一样，但**不影响元素的大小和位置**，只改变视觉效果。

它的核心作用就是：**用一行 CSS 代码，实现原本需要 Photoshop 才能做到的图像处理效果**。

==二：格式==

`filter` 属性的语法是：`filter: 函数(参数);`

可以只用一个函数，也可以用空格隔开同时用多个函数（按声明顺序依次应用）。

**常用函数速查表：**

| 函数                  | 作用         | 示例                              | 常用场景       |
| ------------------- | ---------- | ------------------------------- | ---------- |
| **`blur()`**        | 高斯模糊       | `blur(5px)`                     | 毛玻璃效果、背景虚化 |
| **`brightness()`**  | 亮度调整       | `brightness(80%)`               | 图片变暗/变亮    |
| **`contrast()`**    | 对比度调整      | `contrast(200%)`                | 增强图片层次感    |
| **`grayscale()`**   | 灰度（去色）     | `grayscale(100%)`               | 纪念日网站变灰    |
| **`sepia()`**       | 棕褐色（怀旧）    | `sepia(70%)`                    | 复古风格       |
| **`hue-rotate()`**  | 色相旋转       | `hue-rotate(90deg)`             | 改变整体色调     |
| **`invert()`**      | 颜色反转       | `invert(100%)`                  | 反色效果       |
| **`opacity()`**     | 透明度        | `opacity(30%)`                  | 淡出效果       |
| **`saturate()`**    | 饱和度调整      | `saturate(200%)`                | 颜色更鲜艳/更淡   |
| **`drop-shadow()`** | 投影（保留透明区域） | `drop-shadow(4px 4px 5px #333)` | 给不规则图形加阴影  |

==三：代码==

**HTML (`filter-practice.html`)**

html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>filter 滤镜练习</title>
    <link rel="stylesheet" href="./CSS/filter-practice.css">
</head>
<body>
    <div class="container">
        <div class="card">
            <img src="./uploads/新鲜好物1.png" alt="原图">
            <p>原图</p>
        </div>
        <div class="card">
            <img class="blur" src="./uploads/新鲜好物1.png" alt="模糊">
            <p>blur 模糊</p>
        </div>
        <div class="card">
            <img class="grayscale" src="./uploads/新鲜好物1.png" alt="灰度">
            <p>grayscale 灰度</p>
        </div>
        <div class="card">
            <img class="sepia" src="./uploads/新鲜好物1.png" alt="棕褐色">
            <p>sepia 怀旧</p>
        </div>
        <div class="card">
            <img class="hue" src="./uploads/新鲜好物1.png" alt="色相旋转">
            <p>hue-rotate 色相旋转</p>
        </div>
        <div class="card">
            <img class="invert" src="./uploads/新鲜好物1.png" alt="反色">
            <p>invert 反色</p>
        </div>
    </div>
</body>
</html>

**CSS (`CSS/filter-practice.css`)**

css

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    background-color: #f5f5f5;
    padding: 50px;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
.container {
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    justify-content: center;
}
.card {
    text-align: center;
    background-color: #fff;
    padding: 15px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.card img {
    width: 200px;
    height: 150px;
    object-fit: cover;
    border-radius: 8px;
    transition: filter 0.5s; /* 让滤镜变化有过渡 */
    cursor: pointer;
}
.card img:hover {
    filter: none; /* 鼠标悬停时恢复原图 */
}
.card p {
    margin-top: 10px;
    font-size: 14px;
    color: #666;
}
/* 1. 模糊 */
.blur {
    filter: blur(5px);
}
/* 2. 灰度 */
.grayscale {
    filter: grayscale(100%);
}
/* 3. 棕褐色 */
.sepia {
    filter: sepia(80%);
}
/* 4. 色相旋转 */
.hue {
    filter: hue-rotate(120deg);
}
/* 5. 反色 */
.invert {
    filter: invert(100%);
}

==四：总结==

|知识点|核心要点|
|---|---|
|**`filter` 的作用**|给元素添加图形效果（模糊、灰度、亮度、颜色偏移等）|
|**语法**|`filter: 函数(参数);`，多个函数用空格隔开依次应用|
|**常用函数**|`blur()`、`grayscale()`、`brightness()`、`contrast()`、`sepia()`、`hue-rotate()`、`drop-shadow()`|
|**不影响布局**|滤镜只改变视觉呈现，**不改变元素的大小和位置**|
|**可与 `:hover` 配合**|用 `transition: filter` 让滤镜变化平滑过渡|
|**经典案例**|纪念日网站全站变灰（`grayscale(100%)`）、毛玻璃效果（`blur()`）|