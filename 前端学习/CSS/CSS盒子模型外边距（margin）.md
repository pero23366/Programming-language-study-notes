==一：概念==
### 盒子的“隔离地带”与“自动居中”

**外边距（`margin`）** 是盒子模型的最外层，用来控制**盒子与盒子之间**的距离[](https://cloud.tencent.com.cn/developer/article/1746927?policyId=1003#1)。它和内边距（`padding`）最大的区别是：`padding` 在边框内部，影响盒子自身大小；而 `margin` 在边框外部，不影响盒子自身大小，只影响它与其他盒子的间距。

而 **`margin: 0 auto;`** 就是让块级盒子**水平居中**的经典写法。它的原理是：当给盒子设置了固定宽度后，左右两边的 `auto` 会**平分父容器的剩余空间**，从而让盒子居中。
==二：格式==
### 设置外边距与居中的方法

**1. 外边距的复合写法**  
`margin` 的简写规则和 `padding` **完全一致**，遵循**顺时针方向（上 → 右 → 下 → 左）**[](https://developer.aliyun.com/article/1347383#1)。

|写法|含义|
|---|---|
|`margin: 10px;`|四个方向都是 10px|
|`margin: 10px 20px;`|上下 10px，左右 20px|
|`margin: 10px 20px 30px;`|上 10px，左右 20px，下 30px|
|`margin: 10px 20px 30px 40px;`|上 10px，右 20px，下 30px，左 40px|

**2. 块级盒子水平居中的两个必要条件**  
要让一个块级盒子在父容器中水平居中，必须**同时满足**以下两点[](https://www.e-com-net.com/article/1724222038714953728.htm#1)：

- 盒子必须设置了**固定宽度**（`width`）。
    
- 盒子的**左右外边距**都设置为 `auto`。
    

**3. 常见的居中写法（三种等价）**

```css

/* 推荐写法：上下外边距为0，左右自动 */
margin: 0 auto;
/* 简写：上下左右都自动（等价，但更简洁） */
margin: auto;
/* 分开写：左右外边距自动 */
margin-left: auto;
margin-right: auto;
```

三种写法效果完全一样，推荐使用第一种 `margin: 0 auto;`，语义最清晰[](https://developer.aliyun.com/article/1347383#1)。

> **⚠️ 注意**：`margin: 0 auto;` 只能让**块级元素**水平居中。如果是**行内元素**或**行内块元素**（如 `span`、`img`），需要给它们的**父元素**添加 `text-align: center;` 来实现水平居中[](https://www.e-com-net.com/article/1724222038714953728.htm#1)。
==三：代码==
**HTML 结构**

```html

<body>
    <div class="parent">
        <div class="child">我是居中的盒子</div>
    </div>
    <div class="box1">盒子1（下外边距 50px）</div>
    <div class="box2">盒子2（上外边距 30px）</div>
</body>
```

**CSS 样式**

```css

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    padding: 30px;
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
/* ========== 1. 水平居中：margin: 0 auto ========== */
.parent {
    width: 500px;
    height: 200px;
    background-color: #eef2ff;
    border: 2px dashed #4D6BFE;
}
.child {
    width: 200px;              /* 必须设置宽度 */
    height: 100px;
    background-color: #4D6BFE;
    color: #fff;
    margin: 0 auto;            /* 左右自动，上下为0 */
    text-align: center;
    line-height: 100px;
    font-size: 16px;
}
/* ========== 2. 外边距合并：相邻兄弟 ========== */
.box1 {
    width: 300px;
    height: 80px;
    background-color: #ffd662;
    margin-bottom: 50px;       /* 下外边距 50px */
    margin-left: 50px;
    text-align: center;
    line-height: 80px;
}
.box2 {
    width: 300px;
    height: 80px;
    background-color: #28bed0;
    margin-top: 30px;          /* 上外边距 30px，但最终间距是 50px */
    margin-left: 50px;
    text-align: center;
    line-height: 80px;
    color: #fff;
}
```
==四：总结==

- **`margin` 复合写法**：与 `padding` 完全一致，顺时针方向（上 → 右 → 下 → 左）。
    
- **水平居中**：块级盒子设置**固定宽度** + `margin: 0 auto;`，左右自动平分剩余空间。
    
- **行内元素居中**：给父元素加 `text-align: center;`。
    
- **外边距合并**：两个**相邻块元素**的**垂直外边距**会合并，取**较大值**，解决方案是**只给一个盒子设置 margin**[](https://developer.aliyun.com/article/1347383#1)。
    
- **嵌套塌陷**：父子元素的上外边距会合并，解决方案是给父元素设置 `overflow: hidden;` 或 `padding` / `border`[](https://cloud.tencent.com.cn/developer/article/2254659?policyId=1003#1)。