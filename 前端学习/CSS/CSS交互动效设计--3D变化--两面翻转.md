==一：概念==
### 理解“两面翻转”的3D逻辑

要做一个“两面翻转的盒子”，需要三个关键角色的配合：

- **舞台（`body` 或外层容器）**：提供 `perspective`（视距），决定你观察3D效果的“距离”，值越小透视感越强[](https://blog.csdn.net/weixin_64875217/article/details/127942248)。
    
- **翻转盒子（`.box`）**：**核心容器**。必须设置 `transform-style: preserve-3d;`，让里面的子盒子保留3D空间，否则会被“拍扁”[](https://blog.csdn.net/weixin_64875217/article/details/127942248)。
    
- **前后两面（`.front` 和 `.back`）**：**背靠背**贴合。`.front` 正面朝前，`.back` 需要预先 `rotateY(180deg)` 翻过去，让它的正面也朝前
==二：格式==
- **`perspective`**：加在父元素上，设置3D透视距离（如 `400px`）[](https://blog.csdn.net/weixin_64875217/article/details/127942248)。
    
- **`transform-style: preserve-3d`**：加在翻转容器上，让子元素保留3D效果。
    
- **`backface-visibility: hidden`**：加在正反面上，**隐藏元素背面**，防止翻转时看到“镜面字”[](https://cloud.tencent.com.cn/developer/article/2237385?policyId=1004)。
    
- **`transform: rotateY(180deg)`**：用于`.back`的初始翻转，以及`.box`的悬停翻转[](https://blog.csdn.net/weixin_64875217/article/details/127942248)。
==三：代码==
**HTML (`flip-box.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>两面翻转的盒子</title>
    <link rel="stylesheet" href="./CSS/flip-box.css">
</head>
<body>
    <div class="box">
        <div class="front">正面</div>
        <div class="back">反面</div>
    </div>
</body>
</html>

```
**CSS (`CSS/flip-box.css`)**

```css

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    /* 1. 舞台：设置视距，产生3D透视效果 */
    perspective: 800px;
    background-color: #f5f5f5;
}
.box {
    position: relative;
    width: 300px;
    height: 300px;
    margin: 100px auto;
    /* 2. 翻转容器：保留子元素的3D空间 */
    transform-style: preserve-3d;
    /* 3. 过渡：让翻转平滑 */
    transition: transform 0.6s;
    cursor: pointer;
}
/* 4. 悬停翻转：整体绕Y轴旋转180度 */
.box:hover {
    transform: rotateY(180deg);
}
.front, .back {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    font-size: 30px;
    color: #fff;
    text-align: center;
    line-height: 300px;
    /* 5. 隐藏背面，防止翻转时看到反字 */
    backface-visibility: hidden;
}
.front {
    background-color: #4D6BFE; /* 正面：蓝色 */
}
.back {
    background-color: #e74c3c; /* 反面：红色 */
    /* 6. 预先翻转180度，使其正面朝向屏幕外 */
    transform: rotateY(180deg);
}
```
==四：总结==