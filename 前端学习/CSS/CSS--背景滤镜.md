==一：概念==

`backdrop-filter` 是 CSS 的一个属性，它用于对元素**背后**的区域应用图形效果，最经典的用法就是实现“毛玻璃效果”。

它和我们之前学的 `filter` 有一个关键区别：

- **`filter`**：作用于元素**自身**，让元素自己变模糊、变灰。
    
- **`backdrop-filter`**：作用于元素**背后的区域**，让透过元素看到的内容变模糊，而元素本身（比如文字）保持清晰。[](https://m.yisu.com/zixun/1090201.html#1)
    

要看到效果，元素或它的背景必须是**透明或半透明**的。

==二：格式==

**1. 基本语法**

css

选择器 {
    backdrop-filter: 滤镜函数(参数);
    -webkit-backdrop-filter: 滤镜函数(参数); /* 兼容 Safari */
}

`backdrop-filter` 支持的滤镜函数和 `filter` 完全一样，常用的有 `blur()`（模糊）、`brightness()`（亮度）、`saturate()`（饱和度）等，可以多个函数组合使用。

**2. 实现毛玻璃效果的“三要素”**[](https://m.yisu.com/zixun/1090201.html#1)

- **背景内容**：页面或父容器需要有一个背景图或有内容的背景，用来被模糊。
    
- **半透明背景**：元素本身要有半透明背景色，比如 `background: rgba(255, 255, 255, 0.15);`，否则看不到背后的模糊效果。
    
- **背景模糊**：核心属性 `backdrop-filter: blur(12px);`。
    

**3. 兼容性**  
现代浏览器支持良好，但为了兼容旧版 Safari，建议同时写上 `-webkit-backdrop-filter`。[](https://raw.githubusercontent.com/jerrylususu/bookmark-summary/4c3e392aa4b8c27936966c703f9316bd8ace1931/202502/2025-02-16-next-level-frosted-glass-with-backdrop-filter-%E2%80%A2-josh-w.-comeau.md)[](https://m.yisu.com/zixun/1090201.html#1)

==三：代码==

**HTML (`backdrop-filter.html`)**

html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>背景滤镜 - 毛玻璃效果</title>
    <link rel="stylesheet" href="./CSS/backdrop-filter.css">
</head>
<body>
    <div class="background">
        <div class="glass-card">
            <h2>毛玻璃卡片</h2>
            <p>背后的内容会被模糊处理</p>
        </div>
    </div>
</body>
</html>

**CSS (`CSS/backdrop-filter.css`)**

css

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
/* 1. 背景容器：提供被模糊的内容 */
.background {
    width: 100%;
    height: 100vh;
    background: url('https://picsum.photos/1200/800') center/cover no-repeat;
    display: flex;
    justify-content: center;
    align-items: center;
}
/* 2. 毛玻璃卡片 */
.glass-card {
    width: 320px;
    padding: 40px;
    /* 半透明背景，让背后的模糊透出来 */
    background: rgba(255, 255, 255, 0.15);
    /* 核心：背景模糊 */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px); /* 兼容 Safari */
    /* 增强玻璃质感的细节 */
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    color: #fff;
    text-align: center;
}
.glass-card h2 {
    margin-bottom: 10px;
}

==四：总结==

|知识点|核心要点|
|---|---|
|**作用对象**|模糊的是元素**背后**的内容，不是元素自身|
|**核心属性**|`backdrop-filter: blur(数值);`|
|**三要素**|有背景内容 + 元素半透明背景 + `backdrop-filter`|
|**兼容性**|同时写 `-webkit-backdrop-filter` 兼容 Safari|
|**常见坑**|父元素若设置了 `filter`、`opacity` 或 `transform`，可能导致 `backdrop-filter` 失效[](https://m.yisu.com/zixun/1090201.html#1)|
|**经典应用**|iOS 风格的毛玻璃导航栏、卡片、弹窗|