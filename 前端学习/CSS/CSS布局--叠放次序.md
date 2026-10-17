### 🎯 一、概念：给盒子分配“楼层”

当多个定位盒子（`position` 不为 `static`）在页面同一位置重叠时，默认情况下，写在 HTML 后面的盒子会压住前面的。但很多时候，我们需要**人为控制**谁显示在最上面。

`z-index` 就是用来控制这个**层叠次序（Z轴）** 的。你可以把它想象成给每个盒子分配一个“楼层号”，楼层号越大的盒子，就显示在越上面。[](https://www.e-com-net.com/article/1752145958189154304.htm#1)[](https://www.e-com-net.com/article/1701115356095000576.htm#1)

**核心规则：**[](https://www.e-com-net.com/article/1752145958189154304.htm#1)[](https://www.e-com-net.com/article/1701115356095000576.htm#1)

- **只对定位元素生效**：`z-index` 只对有 `position` 属性（`relative`、`absolute`、`fixed`、`sticky`）的元素有效，标准流和浮动元素无效。
    
- **数值越大越靠上**：`z-index` 的值是一个整数（正整数、负整数或0），数值越大，盒子在 Z 轴上的层级越高，就越显示在前面。默认值是 `auto`。
    
- **数值相同，后来者居上**：如果两个定位盒子的 `z-index` 值相同，那么**在 HTML 中后书写的盒子**会压住先书写的盒子。
    
- **数字后不加单位**：`z-index` 的值是纯数字，不能带 `px` 等单位。
    

### 📐 二、格式：语法与规则

**1. 基本语法**

css
```
选择器 {
    position: relative;  /* 或 absolute / fixed / sticky */
    z-index: 1;          /* 数值越大，层级越高 */
}
```

**2. 不同布局方式的默认层级**  
在不设置 `z-index` 的情况下，不同布局方式的元素有默认的层级关系：  
**标准流 < 浮动 < 定位**  
也就是说，定位的盒子默认会在浮动的盒子上方，浮动的盒子默认会在标准流的盒子上方。

### 💻 三、代码：小兔鲜项目实战

**1. HTML 结构：三个重叠的盒子**

```html

<div class="box1">盒子1</div>
<div class="box2">盒子2</div>
<div class="box3">盒子3</div>
```

**2. CSS 样式：通过 z-index 控制层叠顺序**

```css

/* 基础样式：三个盒子都绝对定位，并设置大小、颜色和位置 */
.box1, .box2, .box3 {
    position: absolute;
    width: 200px;
    height: 200px;
    color: #fff;
    font-size: 24px;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
}
/* 盒子1：z-index 最小，在最底层 */
.box1 {
    top: 50px;
    left: 50px;
    background-color: #4D6BFE; /* 蓝色 */
    z-index: 1;
}
/* 盒子2：z-index 最大，在最顶层 */
.box2 {
    top: 100px;
    left: 100px;
    background-color: #27ba9b; /* 绿色 */
    z-index: 3;
}
/* 盒子3：z-index 居中，在中间层 */
.box3 {
    top: 150px;
    left: 150px;
    background-color: #e74c3c; /* 红色 */
    z-index: 2;
}
```

**3. 代码解析**

- 虽然 `.box1` 在 HTML 中写在最前面，但它的 `z-index` 是 `1`，所以它在最底层。
    
- `.box3` 的 `z-index` 是 `2`，它在中间层。
    
- `.box2` 的 `z-index` 是 `3`，虽然它在 HTML 中排在第二，但它的层级最高，所以它显示在最上面。
    

### 💎 四、总结

|知识点|核心要点|
|---|---|
|**`z-index` 作用**|控制定位元素的**层叠次序**，数值越大越靠上。|
|**生效前提**|**必须搭配 `position` 属性**（`relative`、`absolute`、`fixed`、`sticky`）使用。|
|**数值规则**|可以是正数、负数或 0，**数字后面不加单位**。|
|**相同值处理**|`z-index` 相同时，**HTML 中后写的元素**会压住先写的元素。|
|**默认层级**|不设置 `z-index` 时，默认层级：**定位 > 浮动 > 标准流**。|