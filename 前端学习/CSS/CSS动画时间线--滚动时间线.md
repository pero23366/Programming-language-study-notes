==一：概念==

滚动时间线（Scroll Timeline）是 CSS 滚动驱动动画的核心，它让动画的播放进度不再由“时间”驱动，而是由“滚动条的位置”驱动。

- **传统动画**：时间轴是 `DocumentTimeline`，动画随时间自动播放。
    
- **滚动驱动动画**：时间轴与滚动容器绑定。滚动条从顶部到底部的过程，对应动画从 0% 到 100% 的进度。**向下滚动，动画正向播放；向上滚动，动画反向播放；停止滚动，动画暂停。**
    

它主要包含两种时间轴：

|类型|含义|典型场景|
|---|---|---|
|**滚动进度时间线**|与**滚动容器**的滚动位置绑定。滚动条滚到底，动画播完。|阅读进度条、视差背景|
|**视图进度时间线**|与**某个元素**在滚动容器中的可见位置绑定。元素进入视口时触发。|元素进入视口时播放动画、图片延迟显示|

==二：格式==

核心是使用 `animation-timeline` 属性，将动画绑定到时间线上。

**1. 滚动进度时间线**

css

/* 使用 scroll() 函数创建匿名滚动进度时间线 */
.scroll-progress {
    animation: grow 1s linear;
    animation-timeline: scroll(root block); /* root 是滚动容器，block 是垂直轴 */
}

- `scroll()` 的参数：`<scroller>`（如 `root`、`nearest`）和 `<axis>`（如 `block`、`inline`、`x`、`y`）。
    
- 动画的 `duration`（如 `1s`）会被忽略，因为进度完全由滚动决定。
    

**2. 视图进度时间线**

css

/* 使用 view() 函数创建匿名视图进度时间线 */
.reveal {
    animation: fadeIn 1s linear;
    animation-timeline: view(); /* 绑定到元素自身的视图进度 */
    animation-range: entry 0% cover 50%; /* 可选：定义动画生效范围 */
}

- `view()` 默认追踪元素在滚动容器中的可见性变化。
    
- `animation-range` 可以精确控制动画在“进入视口”的哪个阶段开始和结束。
    

==三：代码==

**HTML (`scroll-timeline.html`)**

html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>滚动时间线练习</title>
    <link rel="stylesheet" href="./CSS/scroll-timeline.css">
</head>
<body>
    <!-- 1. 阅读进度条 -->
    <div class="progress-bar"></div>
    <!-- 2. 可滚动的内容区域 -->
    <div class="content">
        <h1>向下滚动查看效果</h1>
        <p>滚动条的位置会控制顶部进度条的宽度。</p>
        <!-- 大量占位内容 -->
        <div style="height: 1500px;"></div>
    </div>
    <!-- 3. 视图进度动画元素 -->
    <div class="reveal-box">滚动到此处时，我会淡入并上浮</div>
    <div style="height: 800px;"></div>
</body>
</html>

**CSS (`CSS/scroll-timeline.css`)**

css

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
/* ========== 1. 滚动进度条 ========== */
.progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background-color: #4D6BFE;
    transform-origin: left;      /* 从左侧开始缩放 */
    transform: scaleX(0);        /* 初始宽度为 0 */
    z-index: 100;
    /* 关键：将动画绑定到根滚动容器的滚动进度 */
    animation: grow linear;
    animation-timeline: scroll(root block);
}
@keyframes grow {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); } /* 滚到底时，宽度撑满 */
}
/* ========== 2. 视图进度动画 ========== */
.content {
    padding: 50px;
}
.reveal-box {
    width: 80%;
    max-width: 600px;
    margin: 100px auto;
    padding: 40px;
    background-color: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
    font-size: 18px;
    color: #333;
    /* 初始状态：透明、下移 */
    opacity: 0;
    transform: translateY(50px);
    /* 关键：绑定到元素自身的视图进度 */
    animation: fadeInUp 1s linear forwards;
    animation-timeline: view();
    animation-range: entry 0% cover 50%; /* 元素进入视口到覆盖 50% 时播放 */
}
@keyframes fadeInUp {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

==四：总结==

|知识点|核心要点|
|---|---|
|**核心属性**|`animation-timeline`，用于指定动画的时间线来源。|
|**两种时间线**|`scroll()` 绑定滚动容器进度；`view()` 绑定元素在视口中的可见进度。|
|**滚动进度时间线**|动画进度 = 滚动条位置。滚动到底，动画播完。|
|**视图进度时间线**|动画进度 = 元素可见程度。元素进入视口时触发。|
|**`animation-range`**|精确控制动画在视图进度中的生效范围（如 `entry 0% cover 50%`）。|
|**浏览器兼容性**|Chrome 115+、Edge 115+ 已支持；Firefox 需开启 flag；Safari 暂不支持，需 polyfill。|
|**优势**|性能优于 JavaScript 滚动监听，动画在主线程外流畅运行。|