### 🎯 一、概念：四种对齐属性，两个维度

Grid 布局的对齐属性分为两组，分别控制**整个网格**在容器中的位置，以及**单个项目**在其网格区域内的位置。

**1. 控制整个网格的位置（写在容器上）**  
当网格轨道没有填满容器时，这两个属性可以移动整个网格。

- **`justify-content`**：控制网格在容器**水平方向**（行内轴）的对齐方式。它管理的是所有列轨道组成的整体在容器内的位置[](https://mdn.org.cn/en-US/docs/Web/CSS/CSS_box_alignment/Box_alignment_in_grid_layout)。
    
- **`align-content`**：控制网格在容器**垂直方向**（块轴）的对齐方式。它管理的是所有行轨道组成的整体在容器内的位置[](https://mdn.org.cn/en-US/docs/Web/CSS/CSS_box_alignment/Box_alignment_in_grid_layout)。
    

**2. 控制项目在网格区域内的位置（写在容器或项目上）**  
当项目比其所在的网格区域小时，这些属性可以决定它“待在格子里的哪个角落”[](https://mdn.org.cn/en-US/docs/Web/CSS/CSS_box_alignment/Box_alignment_in_grid_layout)。

- **`justify-items`**：设置**所有项目**在各自网格区域内的**水平**对齐方式。
    
- **`align-items`**：设置**所有项目**在各自网格区域内的**垂直**对齐方式。
    
- **`justify-self` / `align-self`**：写在**单个项目**上，用于覆盖父容器设置的 `justify-items` / `align-items`，实现“个性化”对齐[](https://mdn.org.cn/en-US/docs/Web/CSS/CSS_box_alignment/Box_alignment_in_grid_layout)。
    

### 📝 二、格式：核心语法与取值

所有对齐属性都支持以下核心取值：

- `start` / `end`：靠起始边或结束边对齐。
    
- `center`：居中。
    
- `stretch`（默认）：拉伸填满整个网格区域。如果项目有固定宽高，则此值无效。
    
- `space-between` / `space-around` / `space-evenly`：仅在 `justify-content` 和 `align-content` 上有效，用于分配轨道间的额外空间。
    

### 💻 三、代码：小兔鲜项目对齐实战

下面模拟一个“商品卡片”网格，展示如何用对齐属性实现不同的布局效果。

**1. HTML 结构**

```html

<div class="grid-container">
    <div class="card">1</div>
    <div class="card special">2</div>
    <div class="card">3</div>
    <div class="card">4</div>
    <div class="card">5</div>
</div>
```

**2. CSS 样式：对比不同对齐效果**

```css

.grid-container {
    display: grid;
    width: 600px;
    height: 400px;
    /* 定义3列，每列150px，总宽450px，容器剩余150px空间 */
    grid-template-columns: repeat(3, 150px);
    grid-template-rows: repeat(2, 100px);
    gap: 20px;
    border: 2px solid #333;
    margin: 50px auto;
    background-color: #f5f5f5;
    
    /* --- 实验一：控制整个网格的位置 --- */
    /* 水平方向：轨道整体居中 */
    justify-content: center; 
    /* 垂直方向：轨道整体靠上 */
    align-content: start; 
    
    /* --- 实验二：控制项目在网格内的位置 --- */
    /* 所有项目在格子内水平居中 */
    justify-items: center; 
    /* 所有项目在格子内垂直居中 */
    align-items: center; 
}
.card {
    width: 80px;
    height: 60px;
    background-color: #4D6BFE;
    color: #fff;
    font-size: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
}
/* --- 实验三：单个项目的个性化对齐（覆盖容器设置） --- */
.special {
    /* 在格子内靠右下角 */
    justify-self: end; 
    align-self: end; 
    background-color: #27ba9b;
}

```
**效果解析**：

- 整个 450px 宽的网格在 600px 的容器中**水平居中**了（`justify-content: center`）。
    
- 网格整体**靠上**对齐（`align-content: start`）。
    
- 所有卡片都在自己的格子内**水平垂直居中**（`justify-items` / `align-items: center`）。
    
- 只有2号卡片（`special`）覆盖了父容器的设置，在自己的格子内**靠右下角**对齐。
    

### 💎 四、总结

|属性|作用对象|控制维度|记忆口诀|
|---|---|---|---|
|**`justify-content`**|整个网格|水平（行内轴）|**内容**整体水平对齐|
|**`align-content`**|整个网格|垂直（块轴）|**内容**整体垂直对齐|
|**`justify-items`**|所有项目|水平|**项目**在格子内水平对齐|
|**`align-items`**|所有项目|垂直|**项目**在格子内垂直对齐|
|**`justify-self`**|单个项目|水平|单个项目**自己**水平对齐|
|**`align-self`**|单个项目|垂直|单个项目**自己**垂直对齐|

**核心口诀**：**`content` 管整体，`items` 管所有，`self` 管自己。`justify` 管水平，`align` 管垂直。**