==一：概念==
### 用“圆”切出“角”

`border-radius` 的本质，就是**用指定半径的圆去“切”掉盒子的四个角**，从而形成圆角效果[](https://www.e-com-net.com/article/1700287260395646976.htm#1)。半径越大，圆角越明显；当半径大到一定程度时，原来的正方形就会被切成一个圆形。

它是CSS3新增的属性，用于设置元素**外边框**的圆角。
==二：格式==
**1. 基本语法**

```css

border-radius: length; /* length 可以是 px，也可以是百分比 */
```

**2. 一个值到四个值的写法**  
`border-radius` 是一个简写属性，后面可以跟 **1到4个值**，遵循**顺时针方向（左上 → 右上 → 右下 → 左下）** 的规则[](https://blog.csdn.net/2502_90388158/article/details/159471576?ops_request_misc=elastic_search_misc&request_id=7190902ba3d77394d61c8bcdd65c2ef4&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~ElasticSearch~search_v2-23-159471576-null-null.142%5Ev102%5Epc_search_result_base3&utm_term=overflow%E3%80%81box-shadow%E3%80%81%E9%BC%A0%E6%A0%87%E6%A0%B7%E5%BC%8F%E3%80%81%E6%8D%A2%E8%A1%8C#2)。

|写法|效果（按上、右、下、左顺序）|
|---|---|
|`border-radius: 10px;`|四个角都是 `10px`|
|`border-radius: 10px 20px;`|左上、右下 `10px`；右上、左下 `20px`|
|`border-radius: 10px 20px 30px;`|左上 `10px`；右上、左下 `20px`；右下 `30px`|
|`border-radius: 10px 20px 30px 40px;`|左上 `10px`；右上 `20px`；右下 `30px`；左下 `40px`|

**3. 单独设置某一个角**

```css

border-top-left-radius: 20px;      /* 左上角 */
border-top-right-radius: 20px;     /* 右上角 */
border-bottom-right-radius: 20px;  /* 右下角 */
border-bottom-left-radius: 20px;   /* 左下角 */

```
[](https://www.e-com-net.com/article/1749151188231667712.htm#1)

**4. 画圆形的“捷径”**  
对于一个**正方形**，只要把 `border-radius` 设置为**边长的一半**（或者直接写 `50%`），就能得到一个**正圆形**[](https://www.e-com-net.com/article/1749151188231667712.htm#1)。对于**长方形**，如果 `border-radius` 设为高度的一半，则会在**左右两端**形成**半圆形**（即胶囊形状）。
==三：代码==
### 动手画出圆角与圆形

在你的项目中新建 `前端/HTML/圆角边框.html` 和 `前端/CSS/圆角边框.css`。

**HTML 结构**

```html

<body>
    <div class="box1">圆角矩形</div>
    <div class="box2">圆形</div>
    <div class="box3">胶囊形</div>
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
    padding: 50px;
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
/* 1. 圆角矩形：四个角都是 40px 的圆角 */
.box1 {
    width: 300px;
    height: 150px;
    background-color: #4D6BFE;
    color: #fff;
    border-radius: 40px;
    margin-bottom: 40px;
    text-align: center;
    line-height: 150px;
    font-size: 18px;
}
/* 2. 正圆形：正方形 + 50% 的圆角 */
.box2 {
    width: 200px;
    height: 200px;
    background-color: #259666;
    color: #fff;
    border-radius: 50%; /* 等价于 100px */
    margin-bottom: 40px;
    text-align: center;
    line-height: 200px;
    font-size: 18px;
}
/* 3. 胶囊形：长方形 + 高度一半的圆角 */
.box3 {
    width: 400px;
    height: 100px;
    background-color: #ffd662;
    color: #333;
    border-radius: 50px; /* 高度 100px 的一半 */
    text-align: center;
    line-height: 100px;
    font-size: 18px;
}
```
==四：总结==
- **核心作用**：用圆角“切”掉盒子的直角，让界面更柔和。
    
- **简写规则**：1到4个值，按**顺时针方向**（左上 → 右上 → 右下 → 左下）依次设置。
    
- **画圆秘诀**：**正方形**设置 `border-radius: 50%` 即可得到**正圆形**；**长方形**设置 `border-radius: 高度的一半` 即可得到**胶囊形**。
    
- **底层原理**：浏览器用指定半径的圆去切角。当半径过大时，浏览器会自动按比例缩小所有圆角，确保它们不会重叠[](https://cloud.tencent.cn/developer/article/1853220?policyId=1003)。