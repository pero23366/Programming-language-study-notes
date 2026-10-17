==一：概念==

**视图时间线（`view()`）** 是 CSS 滚动驱动动画中的一种时间轴类型。它让动画的播放进度不再由“时间”驱动，而是由**元素在滚动容器中的可见程度**来驱动。[](https://css-tricks.com/creating-scroll-based-animations-in-full-view/)

你可以把它理解为 **CSS 版的 `Intersection Observer`**。当一个元素进入视口时，动画开始；元素完全离开视口时，动画结束。滚动条向下滚，动画正向播放；向上滚，动画反向播放；停止滚动，动画暂停。

**与滚动进度时间线（`scroll()`）的区别**：

- `scroll()` 绑定的是**滚动容器**的滚动位置，适合做阅读进度条。
    
- `view()` 绑定的是**某个元素自身**在滚动容器中的可见程度，适合做“元素进入视口时触发动画”的效果。[](https://www.smashingmagazine.com/2024/12/introduction-css-scroll-driven-animations/?utm_source=cassidoo&utm_medium=email&utm_campaign=we-must-adjust-to-changing-times-and-still-hold)
    

==二：格式==

**1. 基本语法**

css

.element {
    animation: 动画名 linear;          /* 注意：duration 写 auto 或省略 */
    animation-timeline: view();        /* 绑定到元素自身的视图进度 */
}

使用 `view()` 时，`animation-duration` 建议设置为 `auto`，因为动画进度完全由滚动位置决定，时间参数会被忽略。

**2. 核心参数：`view()` 函数**

css

animation-timeline: view(轴, 内缩);

- **轴（可选）**：`block`（默认，垂直方向）、`inline`（水平方向）、`x`、`y`。
    
- **内缩（可选）**：调整“进入/离开视口”的判定边界，值为百分比或 `auto`。
    

**3. 精准控制动画范围：`animation-range`**  
默认情况下，元素从**刚进入视口**到**完全离开视口**的整个过程，对应动画的 0% 到 100%。用 `animation-range` 可以把这个区间缩窄。

常用范围名称：

|名称|含义|
|---|---|
|**`cover`**|整个视图进度范围（从开始进入，到完全离开）|
|**`entry`**|元素**进入**视口的过程|
|**`exit`**|元素**离开**视口的过程|
|**`contain`**|元素**完全在视口内**的范围|

写法格式：`animation-range: 起始范围 起始偏移 结束范围 结束偏移;`

css

/* 元素从刚进入视口到覆盖 50% 时，播放动画 */
animation-range: entry 0% cover 50%;

也可以简写为只写范围名，表示该范围的 0% 到 100%：

css

animation-range: entry;  /* 等价于 entry 0% entry 100% */

==三：代码==

**HTML (`view-timeline.html`)**

html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>视图时间线练习</title>
    <link rel="stylesheet" href="./CSS/view-timeline.css">
</head>
<body>
    <div class="spacer">向下滚动 ↓</div>
    <div class="reveal-card">
        <h3>元素进入视口时浮现</h3>
        <p>滚动到此卡片时，它会淡入并上浮。</p>
    </div>
    <div class="spacer"></div>
    <div class="reveal-card">
        <h3>第二个卡片</h3>
        <p>每个卡片独立触发自己的动画。</p>
    </div>
    <div class="spacer"></div>
    <div class="reveal-card">
        <h3>第三个卡片</h3>
        <p>滚动到它时，它才会开始动画。</p>
    </div>
    <div class="spacer"></div>
</body>
</html>

**CSS (`CSS/view-timeline.css`)**

css

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
.spacer {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    color: #999;
}
/* 卡片初始状态：透明、下移 */
.reveal-card {
    width: 400px;
    margin: 0 auto;
    padding: 30px;
    background-color: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
    opacity: 0;
    transform: translateY(60px);
    /* 关键：绑定到元素自身的视图时间线 */
    animation: revealUp linear forwards;
    animation-timeline: view();
    /* 元素从刚进入视口到覆盖 60% 时，动画播完 */
    animation-range: entry 0% cover 60%;
}
@keyframes revealUp {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

**效果说明**：每个卡片在滚动到**进入视口**的过程中，会从透明且下移的状态，平滑地淡入并上浮到正常位置。滚动条停止时，动画也暂停在当前进度。

==四：总结==

|知识点|核心要点|
|---|---|
|**`view()` 的作用**|让动画进度由**元素在视口中的可见程度**决定，而非时间|
|**核心属性**|`animation-timeline: view();`，配合 `animation-duration: auto;`|
|**`animation-range`**|精准控制动画在“进入/离开/完全可见”哪个区间播放|
|**常用范围**|`entry`（进入）、`exit`（离开）、`cover`（整个范围）|
|**典型场景**|元素滚动到视口时淡入、卡片延迟浮现、图片渐进式展示|
|**兼容性**|Chrome/Edge 115+ 支持，Firefox 需开启 flag，Safari 暂不支持|