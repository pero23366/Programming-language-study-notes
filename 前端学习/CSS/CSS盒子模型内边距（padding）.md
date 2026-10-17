==一：概念==
### 盒子的“缓冲地带”

你可以把盒子模型想象成一个快递盒：

- **内容（Content）**：你要寄送的物品。
    
- **内边距（Padding）**：包裹物品的**泡沫填充物**，让物品不直接接触盒壁[](https://cloud.tencent.com.cn/developer/article/1746927?policyId=1003#1)。
    
- **边框（Border）**：快递盒的硬纸板。
    
- **外边距（Margin）**：两个快递盒之间的距离。
    

内边距的核心作用是**增加内容与边框之间的间距**，让页面元素不显得拥挤，提升视觉舒适度[](https://www.e-com-net.com/article/1724222038714953728.htm#1)。
==二：格式==
**1. 单独设置某一边**

```css

padding-top: 10px;      /* 上内边距 */
padding-right: 20px;    /* 右内边距 */
padding-bottom: 30px;   /* 下内边距 */
padding-left: 40px;     /* 左内边距 */
```

**2. 复合写法（推荐）**  
`padding` 是一个简写属性，可以同时设置四个方向的内边距，遵循**顺时针方向（上 → 右 → 下 → 左）** 的规则[](https://blog.csdn.net/weixin_42771853/article/details/128386366#1)。

|写法|含义|
|---|---|
|`padding: 10px;`|四个方向都是 10px|
|`padding: 10px 20px;`|上下 10px，左右 20px|
|`padding: 10px 20px 30px;`|上 10px，左右 20px，下 30px|
|`padding: 10px 20px 30px 40px;`|上 10px，右 20px，下 30px，左 40px|

> **速记口诀**：`padding` 的复合写法顺序和 `margin` 一样，都是**从上开始，顺时针转一圈**（上 → 右 → 下 → 左）。

**3. 关键影响：`padding` 会撑大盒子**  
给盒子设置 `width` 和 `height` 后，再添加 `padding`，**盒子的实际大小会被撑大**。

例如，一个 `width: 300px; height: 200px;` 的盒子，设置 `padding: 10px;` 后：

- 实际宽度 = `300 + 10 + 10 = 320px`
    
- 实际高度 = `200 + 10 + 10 = 220px`
==三：代码==
**HTML 结构**

```html

<body>
    <div class="box1">没有内边距的盒子</div>
    <div class="box2">有内边距的盒子</div>
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
/* 1. 没有内边距：文字紧贴边框 */
.box1 {
    width: 300px;
    height: 100px;
    background-color: #eef2ff;
    border: 2px solid #4D6BFE;
    margin-bottom: 20px;
    line-height: 100px;
    text-align: center;
}
/* 2. 有内边距：内容与边框之间有了距离 */
.box2 {
    width: 300px;
    height: 100px;
    background-color: #eef2ff;
    border: 2px solid #4D6BFE;
    padding: 20px;               /* 四边内边距都是 20px */
    line-height: 60px;           /* 行高调整为内容区域高度 */
    text-align: center;
}

```
**关键观察**：用浏览器打开后，按 `F12`，选中 `.box2`，在右侧的**盒模型图**中，你会看到**绿色的 padding 区域**——这就是内边距占据的空间。
==四：总结==

- **`adding` 的作用**：设置**内容与边框之间的距离**，增加元素内部的“呼吸感”[](https://developer.aliyun.com/article/1617351?spm=a2c6h.13046898.publish-article.16.30fa6ffaTdVeE3#1)。
    
- **复合写法**：1到4个值，按**顺时针方向（上 → 右 → 下 → 左）** 依次设置。
    
- **核心影响**：`padding` 会**撑大盒子的实际尺寸**。如果希望盒子的总尺寸保持不变，需要从 `width` 或 `height` 中减去相应的 `padding` 值，或者全局使用 `box-sizing: border-box;`。
    
- **典型应用**：导航栏的每个链接、按钮、卡片等内容，通常都会用 `padding` 来撑开内部空间，让点击区域更大、视觉更舒适。