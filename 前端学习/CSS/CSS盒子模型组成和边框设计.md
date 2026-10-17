==一：概念==
**盒子模型（Box Model）**，它是CSS布局的基石。你可以把网页上的每个HTML元素都看作一个矩形的“盒子”，而盒子模型就是定义这个盒子**由内到外**由哪几部分构成，以及如何设置它的边框[](https://cloud.tencent.com.cn/developer/article/1746927?policyId=1003#1)。
==二：格式==
### 边框（Border）的三要素与写法

边框是这节课的重点，它由三个属性组成[](https://cloud.tencent.com.cn/developer/article/1746927?policyId=1003#1)[](https://blog.csdn.net/weixin_42771853/article/details/128386366#1)：

| 属性                 | 作用    | 常见值                                                   |
| ------------------ | ----- | ----------------------------------------------------- |
| **`border-width`** | 边框的粗细 | 单位 `px`，如 `1px`                                       |
| **`border-style`** | 边框的样式 | `solid`(实线，最常用)、`dashed`(虚线)、`dotted`(点线)、`none`(无边框) |
| **`border-color`** | 边框的颜色 | 颜色值，如 `red`、`#FF0000`                                 |

**两种常用写法**：

1. **复合写法（推荐）**：一行代码设置所有边框。
    
    ```css
    
    border: 1px solid #333; /* 顺序：宽度 样式 颜色，顺序可换 */
    ```
    
2. **分开写法**：单独设置某一条边。
    
    ```css
    
    border-top: 2px dashed red;    /* 只设置上边框 */
    border-left: 5px solid blue;   /* 只设置左边框 */
    ```
==三：代码==
### 动手画一个带边框的盒子

在你的项目中新建 `前端/HTML/盒子模型.html` 和 `前端/CSS/盒子模型.css`。

**HTML 结构**

```html

<body>
    <div class="box">我是一个盒子</div>
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
.box {
    width: 300px;
    height: 150px;
    background-color: #eef2ff;
    
    /* 1. 复合写法：一次性设置四条边框 */
    border: 3px solid #4D6BFE;
    
    /* 2. 分开写法：用层叠性单独覆盖上边框 */
    /* border-top: 5px dashed red; */
    
    /* 内容居中，方便观察 */
    text-align: center;
    line-height: 150px;
    font-size: 20px;
    color: #333;
    
    /* 让盒子水平居中 */
    margin: 0 auto;
}
```
==四：总结==
- **盒子模型**由**内容、内边距、边框、外边距**四部分组成。
    
- **边框**由**宽度、样式、颜色**三要素构成，`border: 1px solid #333;` 是最高效的复合写法。
    
- **边框会影响盒子大小**：一个 `width: 300px` 的盒子，加上 `border: 3px` 后，实际占据的宽度是 `300 + 3 + 3 = 306px`[](https://blog.csdn.net/weixin_42771853/article/details/128386366#1)。
    
- **表格细线边框**：给表格设置 `border-collapse: collapse;` 可以合并相邻单元格的边框，让表格线条更简洁[](https://blog.csdn.net/weixin_42771853/article/details/128386366#1)。