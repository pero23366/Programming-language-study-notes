==一：概念==

**逐帧动画**是一种通过快速连续播放一系列静态画面来制造运动幻觉的技术，就像小时候玩的“翻页动画书”。

在 CSS 里，普通的 `animation` 是**平滑过渡**的（比如 `rotate(0deg)` 到 `rotate(360deg)`），而逐帧动画需要的是**跳跃式变化**。这时就必须用到 `steps()` 函数。

- **核心原理**：将动画的时间切分成**多个等长的时间段**，在每个时间段内，画面保持不动，直到时间段结束，才**瞬间跳跃**到下一帧。
    
- **典型搭档**：逐帧动画通常配合 **精灵图（Sprite Sheet）** 使用。精灵图里横向排列了动画的每一帧，通过改变 `background-position` 来“切”出不同的画面。
    
- **`steps(n, end)` vs `steps(n, start)`**：
    
    - `steps(n, end)`（默认）：先显示当前帧，停留一个时间段，再跳下一帧。
        
    - `steps(n, start)`：立刻跳到下一帧，然后停留一个时间段。
==二：格式==
**1. `steps()` 语法**

```css

animation: 动画名称 持续时间 steps(步数, 跳跃位置) 播放次数;

```
**2. 逐帧动画标准写法**

```css

/* 第一步：定义关键帧，移动背景图的位置 */
@keyframes 动画名称 {
    0% {
        background-position: 0 0; /* 第一帧 */
    }
    100% {
        background-position: -总宽度 0; /* 移动到最后 */
    }
}
/* 第二步：在元素上调用动画 */
.元素 {
    width: 单帧宽度;
    height: 单帧高度;
    background: url(精灵图路径) no-repeat;
    animation: 动画名称 持续时间 steps(帧数) infinite;
}
```

- `-总宽度` = 单帧宽度 × 总帧数。
==三：代码==
**HTML (`sprite-animation.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>逐帧动画练习</title>
    <link rel="stylesheet" href="./CSS/sprite-animation.css">
</head>
<body>
    <div class="walker"></div>
</body>
</html>
```
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>逐帧动画练习</title>
    <link rel="stylesheet" href="./CSS/sprite-animation.css">
</head>
<body>
    <div class="walker"></div>
</body>
</html>

**CSS (`CSS/sprite-animation.css`)**

```css

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background-color: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}
.walker {
    width: 256px;            /* 只显示一帧的宽度 */
    height: 256px;
    background: url(../uploads/sprite.png) no-repeat;
    
    /* 核心：0.6秒内播放6帧，无限循环 */
    animation: walk 0.6s steps(6, end) infinite;
}
@keyframes walk {
    0% {
        background-position: 0 0;           /* 第一帧 */
    }
    100% {
        background-position: -1536px 0;     /* 移动到最后（256px × 6帧 = 1536px）*/
    }
}
```
==四：总结==

| 知识点         | 核心要点                                       |
| ----------- | ------------------------------------------ |
| **核心函数**    | `steps(n, end/start)`，把时间切分成 n 段，每段跳跃一次    |
| **配合对象**    | 精灵图（Sprite Sheet）配合 `background-position`  |
| **关键规则**    | `steps()` 里的步数必须与精灵图中的总帧数一致                |
| **与平滑动画区别** | 平滑动画（`linear`）是连续渐变；逐帧动画（`steps`）是“一卡一卡”跳变 |
| **典型场景**    | 人物行走、图标动画、打字机效果、Loading 中的帧动画              |