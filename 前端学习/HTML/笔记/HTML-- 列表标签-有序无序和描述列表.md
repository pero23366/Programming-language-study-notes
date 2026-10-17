**概念**：HTML 提供三种列表：**无序列表** `<ul>`、**有序列表** `<ol>`、**描述列表** `<dl>`。[](https://www.bilibili.com/opus/1198084636212723721?from=search#1)

**格式**：

- `<ul>` 和 `<ol>` 只能包含 `<li>`。
    
- `<dl>` 包含 `<dt>`（术语）和 `<dd>`（描述）。
    

**代码**：

```html

<ul>
    <li>苹果</li>
    <li>香蕉</li>
</ul>
<ol>
    <li>第一步</li>
    <li>第二步</li>
</ol>
```
```html
<dl>
    <dt>HTML</dt>
    <dd>超文本标记语言</dd>
</dl>
```

**总结**：列表让内容整齐有序，`<li>` 里可以放其他 HTML 元素。