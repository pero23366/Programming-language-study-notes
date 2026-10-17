==一：概念==
 **CSS 的三大特性：层叠性、继承性、优先级**。它们是 CSS 规则解决冲突、组织样式的底层逻辑。理解这三点，你就明白浏览器到底听谁的，写 CSS 时就不会再“莫名失效”。

### 🎯 概念：浏览器听谁的？

- **层叠性**：解决**样式冲突**。给同一个元素设置多个相同属性时，浏览器按“就近原则”决定用哪个，后面写的会覆盖前面的[](https://cloud.tencent.cn/developer/article/2267621?policyId=1004#1)。
    
- **继承性**：解决**代码复用**。子元素会自动继承父元素与**文字相关**的样式（如 color、font-、text-、line-）[](https://developer.aliyun.com/article/1172652)。
    
- **优先级**：当**不同选择器**选中同一元素时，按“权重”高低决定用谁的样式。选择器越具体，权重越高[](https://blog.csdn.net/qq_43701213/article/details/132667337#1)。
==二：格式==
**1. 层叠性**

```css

/* 后写的生效，最终颜色为 pink */
div { color: red; }
div { color: pink; }
```

**2. 继承性**

```css

/* p 会继承 div 的文字颜色和大小 */
div { color: pink; font-size: 14px; }

> **注意**：`a` 标签的 `color` 和 `text-decoration`、`h1~h6` 的 `font-size` 不会继承，需要单独设置[](https://developer.aliyun.com/article/1172652)。
```

**3. 优先级（权重）**  
CSS 用**四位数字 `(行内, id, 类, 标签)`** 来比较权重，**数位之间没有进制**（如 0,0,0,5 + 0,0,0,5 = 0,0,0,10，而不是 0,0,1,0）[](https://cloud.tencent.cn/developer/article/1134469?from=15425&frompage=seopage)。

|选择器|权重|
|---|---|
|继承 / `*`|0,0,0,0|
|标签选择器|0,0,0,1|
|类选择器 / 伪类|0,0,1,0|
|ID 选择器|0,1,0,0|
|行内样式 `style`|1,0,0,0|
|`!important`|∞|

> **关键原则**：复合选择器的权重是**叠加**的。例如 `ul li` 的权重是 0,0,0,2[](https://blog.csdn.net/qq_43701213/article/details/132667337#1)。
==三：代码==
**HTML 结构**



```html
<body>
    <div class="box" id="test" style="color: orange;">
        <h2>标题</h2>
        <p>测试文字</p>
        <a href="#">链接</a>
    </div>
</body>
```

**CSS 样式**

```css

/* 1. 继承性：body 的文字属性被后代继承 */
body {
    color: #333;
    font-size: 16px;
}
/* 2. 层叠性：同一个 div 写两次，后者覆盖前者 */
div {
    background-color: #eee;
}
div {
    background-color: #ddd;
}
/* 3. 优先级：不同选择器竞争，ID 权重最高（行内除外） */
#test {
    color: #4D6BFE;      /* 权重 (0,1,0,0) */
}
.box {
    color: #259666;      /* 权重 (0,0,1,0) */
}
div {
    color: #ffd662;      /* 权重 (0,0,0,1) */
}
/* 4. 行内样式优先级高于 ID 选择器 */
/* 最终文字颜色为行内的 orange */
/* 5. a 标签不继承父级颜色，需要单独设置 */
a {
    color: #e74c3c;
    text-decoration: none;
}
/* 6. 权重叠加示例 */
div p {
    color: purple;       /* (0,0,0,2) */
}
.box p {
    color: coral;        /* (0,0,1,1) -> 权重更高，生效 */
}
```
==四：总结==

- **层叠性**：同样式、同权重，**后写的赢**（就近原则）。
    
- **继承性**：**文字相关**属性自动传给子元素（`color`、`font-`、`text-`、`line-`）；`a`、`h1~h6` 需单独设置。
    
- **优先级**：**权重高的赢**。权重计算为 **`(行内, ID, 类, 标签)`** 四位数叠加，**没有进制**。
    
- **实用口诀**：**继承最低，通配为零；标签一，类十；ID 百，行内千；`!important` 无穷大。**