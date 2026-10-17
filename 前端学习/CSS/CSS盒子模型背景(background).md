==一：概念==
### 盒子的“墙纸”与“装饰画”

你可以把 `background` 理解为给盒子（`div`、`p` 等）刷墙漆、贴墙纸。它由多个子属性组成，可以设置**背景颜色、背景图片、平铺方式、图片位置、图像固定**等[](https://jishuzhan.net/article/1748552023088828417#1)。
==二：格式==
### 核心属性与语法

**1. 背景颜色 `background-color`**  
定义元素的背景颜色，默认值是 `transparent`（透明）[](https://jishuzhan.net/article/1748552023088828417#1)。

```css

background-color: #f5f5f5; /* 十六进制 */
background-color: rgba(0, 0, 0, 0.3); /* 半透明黑色 */
```

**2. 背景图片 `background-image`**  
描述元素的背景图像，常用于 logo、装饰性小图片或超大的背景图[](https://jishuzhan.net/article/1748552023088828417#1)。

```css

background-image: url(./images/bg.png); /* 注意路径不要加引号 */
```

**3. 背景平铺 `background-repeat`**  
控制背景图片是否平铺以及如何平铺[](https://jishuzhan.net/article/1748552023088828417#1)。

- `repeat`：默认，沿 x 轴和 y 轴平铺。
    
- `no-repeat`：不平铺，只显示一张。
    
- `repeat-x`：只沿 x 轴平铺。
    
- `repeat-y`：只沿 y 轴平铺。
    

**4. 背景位置 `background-position`**  
改变图片在背景中的位置，接受方位名词（`left`、`right`、`top`、`bottom`、`center`）或精确单位（`px`、`%`）[](https://jishuzhan.net/article/1748552023088828417#1)。

- **方位名词**：两个值不分先后，`left top` 和 `top left` 效果一致；如果只写一个，另一个默认居中[](https://jishuzhan.net/article/1748552023088828417#1)。
    
- **精确单位**：第一个值一定是 x 坐标，第二个是 y 坐标；如果只写一个数值，该值一定是 x 坐标，另一个默认垂直居中[](https://jishuzhan.net/article/1748552023088828417#1)。
    
- **混合单位**：第一个值是 x 坐标，第二个是 y 坐标[](https://jishuzhan.net/article/1748552023088828417#1)。
    

**5. 背景附着 `background-attachment`**  
设置背景图像是否固定或随页面其余部分滚动，可用于实现视差滚动效果[](https://jishuzhan.net/article/1748552023088828417#1)。

```css

background-attachment: scroll; /* 默认，随页面滚动 */
background-attachment: fixed;  /* 固定，不随页面滚动 */

```
**6. 背景复合写法 `background`**  
将背景属性合并简写，约定顺序为：`背景颜色 背景图片地址 背景平铺 背景图像滚动 背景图片位置`[](https://jishuzhan.net/article/1748552023088828417#1)。

```css

background: #f5f5f5 url(./images/bg.png) no-repeat fixed center;
```

**7. 背景色半透明**  
使用 `rgba()` 设置背景色半透明，注意必须写 4 个值[](https://www.bilibili.com/opus/715684964950081543#1)。

```css

background: rgba(0, 0, 0, 0.3);
```
==三：代码==
**HTML 结构**

```html

<body>
    <div class="box1">背景颜色</div>
    <div class="box2">背景图片（不平铺，居中）</div>
    <div class="box3">背景图片（平铺）</div>
    <div class="box4">背景复合写法</div>
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
div {
    width: 500px;
    height: 200px;
    margin-bottom: 30px;
    text-align: center;
    line-height: 200px;
    font-size: 20px;
    color: #333;
    border: 2px solid #ddd;
}
/* 1. 背景颜色 */
.box1 {
    background-color: #ffd662;
}
/* 2. 背景图片：不平铺，居中 */
.box2 {
    background-color: #eef2ff;
    background-image: url(https://picsum.photos/100/100);
    background-repeat: no-repeat;
    background-position: center center;
}
/* 3. 背景图片：平铺 */
.box3 {
    background-color: #eef2ff;
    background-image: url(https://picsum.photos/100/100);
    background-repeat: repeat;
}
/* 4. 背景复合写法 */
.box4 {
    /* 顺序：颜色 图片地址 平铺 滚动 位置 */
    background: #259666 url(https://picsum.photos/100/100) no-repeat fixed center;
    color: #fff;
}
```
==四：总结==

- **背景颜色**：`background-color`，默认透明。
    
- **背景图片**：`background-image: url()`，路径不要加引号。
    
- **平铺**：`background-repeat`，常用 `no-repeat` 不平铺。
    
- **位置**：`background-position`，方位名词或精确坐标。
    
- **附着**：`background-attachment`，`fixed` 可做视差滚动。
    
- **复合写法**：`background: 颜色 图片 平铺 滚动 位置;`，顺序没有强制要求，但按约定写更清晰。
    
- **半透明**：`background: rgba(0, 0, 0, 0.3);`，必须写 4 个值。