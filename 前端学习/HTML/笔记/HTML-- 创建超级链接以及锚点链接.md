**概念**：`<a>` 标签创建链接。`href` 指定目标地址。**锚点链接** 用于在页面内跳转。[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)

**格式**：

- 普通链接：`<a href="https://example.com">文字</a>`
    
- 锚点链接：`<a href="#id">跳转</a>` 配合目标元素的 `id`。
    

**代码**：

```html

<a href="https://www.baidu.com" target="_blank">百度</a>
<h2 id="section1">第一部分</h2>
<a href="#section1">回到第一部分</a>
```

**总结**：`target="_blank"` 在新窗口打开。锚点链接适合长页面导航。