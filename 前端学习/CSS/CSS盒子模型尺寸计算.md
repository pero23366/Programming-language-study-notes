==一：概念==
**盒子模型的实际尺寸计算**，以及如何用 `box-sizing` 属性来控制这个计算方式。这是前端布局中一个非常关键的概念，能帮你解决“为什么我设的宽度和实际占的不一样”这类问题。

### 两种“盒模型”

在CSS中，一个盒子的总宽度由 **`width` + `padding` + `border`** 组成（外边距 `margin` 是盒子与盒子之间的距离，不包含在盒子自身尺寸内）[](https://blog.51cto.com/u_15829196/5756010#1)。但根据 `box-sizing` 属性的不同，计算方式分为两种：

- **标准盒模型 (`content-box`)**：这是**默认值**。你设置的 `width` 和 `height` 只代表**内容区**的大小。盒子的**实际总宽度**还需要额外加上 `padding` 和 `border`。
    
- **怪异盒模型 (`border-box`)**：你设置的 `width` 和 `height` 就是**盒子的最终大小**。`padding` 和 `border` 会被“挤”在内部，从内容区中扣除，因此内容区会自动变小。
==二：格式==
### 尺寸计算公式

**1. 标准盒模型 (`content-box`) 计算公式**

- **盒子实际宽度** = `width` + `padding-left` + `padding-right` + `border-left` + `border-right`
    
- **盒子实际高度** = `height` + `padding-top` + `padding-bottom` + `border-top` + `border-bottom`
    

**2. 怪异盒模型 (`border-box`) 计算公式**

- **盒子实际宽度** = `width`（`padding` 和 `border` 包含在内）
    
- **盒子实际高度** = `height`（`padding` 和 `border` 包含在内）
    

**3. `box-sizing` 属性语法**

```css

box-sizing: content-box; /* 标准盒模型，默认值 */
box-sizing: border-box;  /* 怪异盒模型，推荐使用 */
```
==三：代码==
**HTML 结构**

```html

<body>
    <div class="box content-box">标准盒模型</div>
    <div class="box border-box">怪异盒模型</div>
</body>
```

**CSS 样式**

```css

* {
    margin: 0;
    padding: 0;
}
body {
    padding: 30px;
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
.box {
    width: 200px;
    height: 100px;
    padding: 20px;
    border: 5px solid #4D6BFE;
    background-color: #eef2ff;
    margin-bottom: 20px;
    text-align: center;
    line-height: 100px;
    font-size: 16px;
    color: #333;
}
/* 1. 标准盒模型（默认）：宽度会被撑大 */
.content-box {
    box-sizing: content-box;
    /* 实际宽度 = 200 + 20*2 + 5*2 = 250px */
}
/* 2. 怪异盒模型：宽度就是设置的宽度 */
.border-box {
    box-sizing: border-box;
    /* 实际宽度 = 200px，内容区被压缩为 150px */
}

```
**验证方法**：用浏览器打开后，按 `F12`，分别选中两个盒子，在右侧的**盒模型图**中观察。`.content-box` 的实际宽度是 **250px**，而 `.border-box` 的实际宽度是 **200px**。
==四：总结==

- **标准盒模型 (`content-box`)**：`width` 只是内容宽度，**`padding` 和 `border` 会撑大盒子**，导致实际尺寸与设定值不符。
    
- **怪异盒模型 (`border-box`)**：`width` 就是盒子最终宽度，**`padding` 和 `border` 被包含在内**，内容区自动缩小，尺寸可控性更强。
    
- **推荐做法**：在CSS初始化时，全局设置 `box-sizing: border-box;`，让所有元素的尺寸计算方式统一，**这是现代前端开发的标准做法**[](https://mdn.org.cn/en-US/docs/Web/CSS/box-sizing?redirectlocale=en-US&redirectslug=CSS%2Fbox-sizing)。
    
- **记忆口诀**：**标准盒模型“越加越大”，怪异盒模型“里外一致”。**