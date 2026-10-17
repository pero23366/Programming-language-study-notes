==一：概念==
### 从“单个标签”到“元素关系”

之前你学的 `p`、`.header` 都是基础选择器，只能选中一类标签。但实际开发中，我们经常需要“选中某个盒子里的特定标签”，这就需要用到关系选择器。

它由两个或多个基础选择器通过不同方式组合而成，主要包含四种[](https://zhuanlan.zhihu.com/p/625370779#1)：

- **后代选择器**：选中某元素**所有**后代（儿子、孙子、曾孙…），范围最广[](https://developer.aliyun.com/article/1326786#1)。
    
- **子代选择器**：只选中**最近一级**的子元素（亲儿子），范围更精准[](https://developer.aliyun.com/article/1326786#1)。
    
- **并集选择器**：同时选中多组标签，给它们设置**相同样式**，用于代码复用[](https://developer.aliyun.com/article/1326786#1)。
    
- **交集选择器**：选中**同时满足**多个条件的元素，比如“既是 p 标签，又有 box 类”[](https://zhuanlan.zhihu.com/p/625370779#1)
==二：格式==
不同选择器之间用**特定符号**连接，符号不同，选中的范围就完全不同：

| 选择器       | 符号        | 写法示例           | 含义                                                                              |
| --------- | --------- | -------------- | ------------------------------------------------------------------------------- |
| **后代选择器** | **空格**    | `div p`        | 选中 `div` 里**所有**的 `p`（包括孙子）[](https://developer.aliyun.com/article/1326786#1)   |
| **子代选择器** | **`>`**   | `div > p`      | 只选中 `div` 的**亲儿子** `p`[](https://developer.aliyun.com/article/1326786#1)        |
| **并集选择器** | **`,`**   | `div, p, span` | 同时选中 `div`、`p`、`span` 三种标签[](https://developer.aliyun.com/article/1326786#1)    |
| **交集选择器** | **无符号连写** | `p.box`        | 选中**同时**是 `p` 标签且 `class="box"` 的元素[](https://zhuanlan.zhihu.com/p/625370779#1) |

> **注意**：交集选择器中如果包含标签选择器，标签选择器**必须写在最前面**（如 `p.box` 正确，`.boxp` 错误）[](https://zhuanlan.zhihu.com/p/625370779#1)。
==三：代码==
```html

<body>
    <div class="header">
        <p>头部里的p（我是后代，也是子代）</p>
    </div>
    <div class="nav">
        <a href="#">导航链接</a>
        <p class="active">导航里的p（我是后代，也是子代）</p>
        <div class="sub">
            <p>子盒子里的p（我是后代，但不是子代）</p>
        </div>
    </div>
    <div class="main">
        <p class="active">主体里的p（有active类）</p>
        <p>主体里的普通p</p>
    </div>
    <div class="footer">
        <p>底部里的p</p>
    </div>
</body>
```

然后打开 `前端/CSS/style.css`，清空后写入以下 CSS，**建议逐段添加并保存，在浏览器中观察变化**：

```css

/* 1. 后代选择器：选中 .nav 里所有的 p（包括孙子） */
.nav p {
    color: blue;
    font-weight: bold;
}
/* 2. 子代选择器：只选中 .nav 的亲儿子 p（不包括孙子） */
.nav > p {
    background-color: yellow;
}
/* 3. 并集选择器：同时选中所有 p 和 a，统一基础样式 */
p, a {
    font-family: "Microsoft YaHei", sans-serif;
    text-decoration: none;
    line-height: 1.6;
}
/* 4. 交集选择器：选中同时是 p 且 class="active" 的元素 */
p.active {
    color: red;
    border-left: 4px solid red;
    padding-left: 10px;
}
```

**关键对比**：`.nav p` 会让“子盒子里的p”也变蓝，而 `.nav > p` **只**让“导航里的p”有黄色背景，“子盒子里的p”不受影响。
==四：总结==
关系选择器是 CSS 从“能用”到“精准”的关键一步：

- **空格**选所有后代，**`>`** 只选亲儿子。
    
- **逗号**是“一起选中”，**连写**是“同时满足”。
    
- 记住交集选择器中标签选择器必须写在最前面。