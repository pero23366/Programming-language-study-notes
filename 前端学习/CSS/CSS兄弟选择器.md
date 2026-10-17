==一：概念==
之前学的后代选择器（空格）和子代选择器（`>`）是在找“父子关系”。而兄弟选择器，找的是**同一个父元素下、处于同一层级的“兄弟”元素**。

它分为两种：

- **相邻兄弟选择器**：只选中**紧挨着**目标元素后面的**那一个**兄弟元素。
    
- **通用兄弟选择器**：选中目标元素后面的**所有**同级兄弟元素。
==二：格式==
### 符号决定范围

兄弟选择器通过特定符号连接两个选择器：

|选择器|符号|写法示例|含义|
|---|---|---|---|
|**相邻兄弟选择器**|**`+`**|`div + p`|选中 `div` **紧挨着的下一个** `p` 兄弟[](https://cloud.tencent.com.cn/developer/article/1680272?policyId=1004#1)|
|**通用兄弟选择器**|**`~`**|`div ~ p`|选中 `div` **后面的所有** `p` 兄弟[](https://cloud.tencent.com.cn/developer/article/1680272?policyId=1004#1)|

> **注意**：CSS 的兄弟选择器**只能向后找，不能向前找**。也就是说，它只能选中目标元素**后面**的兄弟[](https://cloud.tencent.com.cn/developer/article/1680272?policyId=1004#1)。
==三：代码==
```html

<body>
    <div class="header">
        <p>头部里的p</p>
    </div>
    <div class="nav">
        <h3>导航标题</h3>
        <p>我是紧挨着h3的p（相邻兄弟）</p>
        <p>我是h3后面的第二个p（通用兄弟）</p>
        <p>我是h3后面的第三个p（通用兄弟）</p>
    </div>
    <div class="main">
        <p>主体里的普通p</p>
        <span>主体里的span</span>
        <p>span后面的p</p>
    </div>
```
```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* 1. 相邻兄弟选择器：只选中 h3 紧挨着的下一个 p */
h3 + p {
    color: red;
    font-weight: bold;
    background-color: #ffe0e0;
    padding: 5px;
}

/* 2. 通用兄弟选择器：选中 h3 后面的所有 p */
h3 ~ p {
    border-left: 4px solid orange;
    padding-left: 10px;
    margin-top: 5px;
}

/* 3. 对比：span 后面的 p 会被 span + p 选中吗？ */
span + p {
    color: blue;
    font-style: italic;
}
```
**效果分析**：

- `h3 + p`：只有“我是紧挨着h3的p”会变红加粗。
    
- `h3 ~ p`：所有在 `h3` 后面的 `p`（包括变红的那一个）都会加上左边的橙色竖线。
    
- `span + p`：只有“span后面的p”会变蓝倾斜。
==四：总结==
兄弟选择器帮你解决“在同一个爸爸下面，谁紧挨着谁，谁又在谁后面”的问题：

- **`+`**：只找**紧挨着**的那个兄弟。
    
- **`~`**：找**后面所有**符合条件的兄弟。
    
- 两个符号都**只能向后找**，不能向前找。