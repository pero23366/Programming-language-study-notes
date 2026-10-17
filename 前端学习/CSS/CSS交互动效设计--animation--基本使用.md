==一：概念==
### 什么是CSS动画？

CSS动画（Animation）是CSS3中最具颠覆性的特性之一。与之前学的 `transition`（过渡）只能实现**简单状态变化**不同，动画可以通过 `@keyframes` 定义多个关键帧，精确控制元素在动画过程中的**每一步状态**，实现更复杂、更精细、可循环播放的动画效果[](https://blog.csdn.net/zyx210603/article/details/135980390#1)。

**核心区别**：

- **过渡（transition）**：需要触发（如 `:hover`），只能从 A 状态变到 B 状态，**不能循环**。
    
- **动画（animation）**：不需要触发，页面加载即可自动播放，可设置多个关键帧，**可无限循环**。
==二：格式==
### 两步走

制作动画分为两步：**先定义动画，再调用动画**[](https://blog.csdn.net/zyx210603/article/details/135980390#1)。

**第一步：用 `@keyframes` 定义动画**

`@keyframes` 用来定义动画序列，通过百分比（如 `0%`、`25%`、`100%`）来规定变化发生的时间点[](https://mdn.org.cn/en-US/docs/Web/CSS/@keyframes)。

```css

@keyframes 动画名称 {
    0% { /* 开始状态 */ }
    50% { /* 中间状态 */ }
    100% { /* 结束状态 */ }
}

> **提示**：`from` 等价于 `0%`，`to` 等价于 `100%`[](https://blog.csdn.net/zyx210603/article/details/135980390#1)。
```

**第二步：用 `animation` 属性调用动画**

定义好动画后，需要在**要执行动画的元素**上通过 `animation` 属性来调用[](https://blog.csdn.net/zyx210603/article/details/135980390#1)。

```css

.元素 {
    animation: 动画名称 持续时间 运动曲线 延迟时间 播放次数 播放方向 结束状态;
}
```
==三：代码==

**TML (`animation-practice.html`)**

```html

<!DOCTYPE html>
```
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>动画练习</title>
    <link rel="stylesheet" href="./CSS/animation-practice.css">
</head>
<body>
    <div class="box"></div>
</body>
</html>

**CSS (`CSS/animation-practice.css`)**

```css

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    padding: 50px;
    background-color: #f5f5f5;
}
/* 第一步：定义动画 */
@keyframes move {
    0% {
        transform: translate(0, 0);
    }
    25% {
        transform: translate(300px, 0);
    }
    50% {
        transform: translate(300px, 300px);
    }
    75% {
        transform: translate(0, 300px);
    }
    100% {
        transform: translate(0, 0);
    }
}
.box {
    width: 100px;
    height: 100px;
    background-color: #4D6BFE;
    border-radius: 8px;
    /* 第二步：调用动画 */
    animation-name: move;
    animation-duration: 4s;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
}
```
==四：总结==


### 常用属性速查

| 属性                              | 作用      | 常用值                                      |
| ------------------------------- | ------- | ---------------------------------------- |
| **`animation-name`**            | 指定动画名称  | 与 `@keyframes` 的名称一致                     |
| **`animation-duration`**        | 动画持续时间  | `2s`（**必须写单位**）                          |
| **`animation-timing-function`** | 速度曲线    | `ease`（默认）、`linear`、`ease-in`、`ease-out` |
| **`animation-delay`**           | 延迟开始时间  | `0s`（默认）、`1s`                            |
| **`animation-iteration-count`** | 播放次数    | `1`（默认）、`infinite`（无限循环）                 |
| **`animation-direction`**       | 播放方向    | `normal`（默认）、`alternate`（往返交替）           |
| **`animation-fill-mode`**       | 动画结束后状态 | `forwards`（保持在结束状态）、`backwards`、`both`   |
| **`animation-play-state`**      | 播放/暂停   | `running`（默认）、`paused`                   |

| 知识点                | 核心要点                                   |
| ------------------ | -------------------------------------- |
| **两步走**            | 先用 `@keyframes` 定义动画，再用 `animation` 调用 |
| **`@keyframes`**   | 用百分比（`0%`~`100%`）定义动画的各个阶段             |
| **`animation` 简写** | `动画名 时长 曲线 延迟 次数 方向 结束状态`              |
| **无限循环**           | `animation-iteration-count: infinite;` |
| **与过渡的区别**         | 动画可自动播放、可循环、可多关键帧；过渡需触发、只能两状态          |