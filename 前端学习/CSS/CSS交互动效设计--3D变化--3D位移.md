==一：概念==
### 让元素在三维空间里移动

之前学的 `translate(x, y)` 只能在**平面**上左右上下移动。现在加了 **Z 轴**，元素可以**朝着你的眼睛“飞出来”**，或者**往屏幕里面“退回去”**。

3D位移用到的核心函数：

- **`translate3d(x, y, z)`**：三个方向同时移动。
    
- **`translateZ(z)`**：只沿 Z 轴移动（朝向你或远离你）。
    
- **`translateX(x)` / `translateY(y)`**：和2D一样，水平/垂直移动。
    

**Z 轴的正负方向**：

- **正值**：元素朝着观察者（你）移动，视觉上**变大**（离你更近）。
    
- **负值**：元素远离观察者，视觉上**变小**（离你更远）。
    
- **前提**：必须有 `perspective` 才能看到“近大远小”的效果，否则 Z 轴移动在视觉上毫无变化。
==二：格式==
```css

/* 单独控制 Z 轴 */
.box { transform: translateZ(100px); }
/* 三个方向同时控制 */
.box { transform: translate3d(50px, 50px, 100px); }
/* 写在父元素上，产生透视效果 */
.parent { perspective: 800px; }
```

> **关键规则**：`translateZ` 必须配合父元素的 `perspective` 才能“看见”效果。没有 `perspective`，Z 轴移动等于白写。
==三：代码==
**HTML (`3d-translate.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>3D位移练习</title>
    <link rel="stylesheet" href="./CSS/3d-translate.css">
</head>
<body>
    <div class="container">
        <div class="box box1">translateZ<br>正面朝你</div>
        <div class="box box2">translateZ<br>往后缩</div>
        <div class="box box3">translate3d<br>三轴移动</div>
    </div>
</body>
</html>

```
**CSS (`CSS/3d-translate.css`)**

```css

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background-color: #f5f5f5;
    padding: 100px;
}
.container {
    display: flex;
    gap: 50px;
    justify-content: center;
    /* 舞台：设置视距，让Z轴移动可见 */
    perspective: 800px;
}
.box {
    width: 150px;
    height: 150px;
    background-color: #4D6BFE;
    color: #fff;
    font-size: 14px;
    text-align: center;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.8s;
    cursor: pointer;
}
/* 1. Z轴正方向：朝观察者移动，视觉上变大 */
.box1:hover {
    transform: translateZ(150px);
}
/* 2. Z轴负方向：远离观察者，视觉上变小 */
.box2:hover {
    transform: translateZ(-150px);
}
/* 3. 三轴同时移动：向右、向下、向前 */
.box3:hover {
    transform: translate3d(50px, 50px, 150px);
}
```
==四：总结==

用 Live Server 打开，鼠标依次悬停在三个方块上，观察：

|方块|效果|关键点|
|---|---|---|
|**box1**|方块“飞”向你的脸，看起来变大|`translateZ(150px)`|
|**box2**|方块“退”进屏幕里，看起来变小|`translateZ(-150px)`|
|**box3**|方块向右下移动，同时向屏幕外飞出|`translate3d(50px, 50px, 150px)`|

### 💡 自己改一改试试

|改动|改哪里|
|---|---|
|让 box1 飞得更远|`.box1` 改成 `translateZ(300px)`|
|把 `perspective` 删掉|观察 Z 轴移动是不是失效了|
|把 `perspective` 改成 `200px`|透视感变得非常夸张|
|让 box3 向屏幕里飞|`translate3d(50px, 50px, -150px)`|