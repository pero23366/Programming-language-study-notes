==一：概念==
### Flex 的“坐标系”

Flex 布局的所有排列规则，都基于这两条相互垂直的轴：

- **主轴（Main Axis）**：子元素**默认排列的方向**。它由 `flex-direction` 属性决定，默认是水平方向（从左到右）。
    
- **交叉轴（Cross Axis）**：与主轴**垂直**的轴。如果主轴是水平的，交叉轴就是垂直的。
    

> **关键点**：主轴的方向不是固定的，它由 `flex-direction` 控制。一旦主轴方向改变，交叉轴也会跟着改变[](https://juejin.cn/post/7037030116655890468#1)。
%%有主轴才有交叉轴%%
==二：格式==
### 控制方向与对齐

**1. `flex-direction`：定义主轴方向**

|属性值|效果|
|---|---|
|`row`|主轴水平，从左到右（**默认值**）[](https://lynxjs.org/3.9/zh/api/css/properties/flex-direction.html)|
|`row-reverse`|主轴水平，从右到左[](https://lynxjs.org/3.9/zh/api/css/properties/flex-direction.html)|
|`column`|主轴垂直，从上到下[](https://lynxjs.org/3.9/zh/api/css/properties/flex-direction.html)|
|`column-reverse`|主轴垂直，从下到上[](https://lynxjs.org/3.9/zh/api/css/properties/flex-direction.html)|

**2. `justify-content`：控制子元素在主轴上的对齐方式**

- `flex-start`（默认）、`flex-end`、`center`、`space-between`、`space-around`[](https://juejin.cn/post/7037030116655890468#1)。
    

**3. `align-items`：控制子元素在交叉轴上的对齐方式（单行）**

- `flex-start`、`flex-end`、`center`、`stretch`（默认）[](https://juejin.cn/post/7037030116655890468#1)。
    

**4. `align-content`：控制多行在交叉轴上的整体对齐（多行）**

- 仅当子元素换行（`flex-wrap: wrap`）时生效[](https://juejin.cn/post/7037030116655890468#1)。
==三：代码==
### 演示主轴与交叉轴

新建 `flex-axes.html` 和 `flex-axes.css`。

**HTML 结构**

```html

<div class="container">
    <div class="item">1</div>
    <div class="item">2</div>
    <div class="item">3</div>
</div>
```

**CSS 样式**

```css

* { margin: 0; padding: 0; box-sizing: border-box; }
body { padding: 50px; background-color: #f5f5f5; }
.container {
    height: 300px;
    background-color: #eef2ff;
    border: 2px dashed #4D6BFE;
    display: flex;
    /* 1. 改变主轴方向（可修改此处观察效果） */
    flex-direction: row; /* 可改为 column、row-reverse、column-reverse */
    /* 2. 主轴对齐 */
    justify-content: center;
    /* 3. 交叉轴对齐（单行） */
    align-items: center;
}
.item {
    width: 80px;
    height: 80px;
    margin: 0 10px;
    background-color: #4D6BFE;
    color: #fff;
    font-size: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
}html

<div class="container">
    <div class="item">1</div>
    <div class="item">2</div>
    <div class="item">3</div>
</div>
```

**验证方法**：打开页面，三个蓝色方块在容器正中间。把 `flex-direction` 改成 `column`，你会看到方块变成垂直排列，主轴变成了垂直方向，`justify-content` 控制的是垂直方向的对齐，`align-items` 控制的是水平方向的对齐。
==四：总结==

|知识点|核心要点|
|---|---|
|**主轴**|由 `flex-direction` 决定，子元素默认沿它排列|
|**交叉轴**|垂直于主轴，方向随主轴改变|
|**主轴对齐**|`justify-content`|
|**交叉轴对齐（单行）**|`align-items`|
|**交叉轴对齐（多行）**|`align-content`（需配合 `flex-wrap: wrap`）|