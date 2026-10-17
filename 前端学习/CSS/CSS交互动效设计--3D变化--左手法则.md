==一：概念==
### 从2D到3D，引入“左手法则”

之前学的2D转换是在一个平面（屏幕）上操作，而3D转换引入了**Z轴**，让元素可以在一个立体空间里进行旋转、平移和缩放。

理解3D旋转的关键，是掌握一个简单的方向判断规则：**左手法则**。

- **3D坐标系**：X轴水平向右，Y轴垂直向下，Z轴垂直于屏幕指向观察者[](https://developer.aliyun.com/article/1393385#1)。Z轴的正方向就是**指向你的眼睛**。
    
- **左手法则**：伸出左手，**大拇指指向某个坐标轴的正方向，四指弯曲的方向就是该轴上旋转的正方向**（即角度为正值时的旋转方向）[](https://hanshuliang.blog.csdn.net/article/details/132264880)。
    

> **通俗理解**：
> 
> - 绕 **X轴** 旋转（`rotateX`）：大拇指指向右（X轴正方向），四指弯曲方向是**向前翻转**。
>     
> - 绕 **Y轴** 旋转（`rotateY`）：大拇指指向下（Y轴正方向），四指弯曲方向是**向右翻转**。
>     
> - 绕 **Z轴** 旋转（`rotateZ`）：大拇指指向自己（Z轴正方向），四指弯曲方向是**顺时针旋转**（和2D旋转一致）。
>
==二：格式==
### 3D旋转的语法

3D旋转通过 `rotateX()`、`rotateY()`、`rotateZ()` 或 `rotate3d()` 函数实现。

```css

/* 绕X轴旋转45度 */
.box { transform: rotateX(45deg); }
/* 绕Y轴旋转-60度（逆时针） */
.box { transform: rotateY(-60deg); }
/* 绕Z轴旋转90度（顺时针） */
.box { transform: rotateZ(90deg); }
/* 绕自定义轴(1,1,0)旋转30度 */
.box { transform: rotate3d(1, 1, 0, 30deg); }

`rotate3d(x, y, z, angle)` 中，x、y、z是0到1之间的数字，用来指定旋转轴的方向[](https://hanshuliang.blog.csdn.net/article/details/132264880)。
```

> **⚠️ 重要**：要让3D旋转产生“近大远小”的立体感，必须给**父元素**添加 `perspective` 属性（视距），通常取值800~1200px[](https://developer.aliyun.com/article/1393385#1)[](https://developer.aliyun.com/article/1538948)。
==三：代码==
### 小练习

创建一个3D旋转练习，包含4个方块，分别演示绕X轴、Y轴、Z轴旋转以及综合旋转。

**HTML (`3d-rotate.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>3D旋转练习</title>
    <link rel="stylesheet" href="./CSS/3d-rotate.css">
</head>
<body>
    <div class="container">
        <div class="box box1">rotateX</div>
        <div class="box box2">rotateY</div>
        <div class="box box3">rotateZ</div>
        <div class="box box4">综合</div>
    </div>
</body>
</html>
```

**CSS (`CSS/3d-rotate.css`)**

```css

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    background-color: #f5f5f5;
    padding: 50px;
}
.container {
    display: flex;
    gap: 30px;
    justify-content: center;
    perspective: 1000px; /* 父元素添加视距，产生3D透视效果 */
}
.box {
    width: 120px;
    height: 120px;
    background-color: #4D6BFE;
    color: #fff;
    font-size: 16px;
    text-align: center;
    line-height: 120px;
    border-radius: 8px;
    transition: all 0.8s; /* 过渡，让旋转平滑发生 */
    cursor: pointer;
}
/* 绕X轴旋转：向前翻转 */
.box1:hover {
    transform: rotateX(180deg);
}
/* 绕Y轴旋转：向右翻转（翻书效果） */
.box2:hover {
    transform: rotateY(180deg);
}
/* 绕Z轴旋转：平面内顺时针旋转（与2D旋转一致） */
.box3:hover {
    transform: rotateZ(90deg);
}
/* 综合旋转：同时绕X轴和Y轴旋转 */
.box4:hover {
    transform: rotateX(45deg) rotateY(45deg);
}
```
==四：总结==

| 知识点               | 核心要点                         |
| ----------------- | ---------------------------- |
| **3D坐标系**         | X轴水平向右，Y轴垂直向下，Z轴指向观察者（屏幕外）。  |
| **左手法则**          | 左手大拇指指向轴的正方向，四指弯曲方向即为旋转的正方向。 |
| **`rotateX()`**   | 绕X轴旋转，像翻日历一样向前/向后翻转。         |
| **`rotateY()`**   | 绕Y轴旋转，像翻书一样向左/向右翻转。          |
| **`rotateZ()`**   | 绕Z轴旋转，效果和2D的 `rotate()` 一致。  |
| **`perspective`** | 加在**父元素**上，产生“近大远小”的透视感。     |
