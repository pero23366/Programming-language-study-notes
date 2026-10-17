**概念**：`<label>` 关联表单控件，点击文字也能选中。**字符实体** 用于显示特殊符号。

**格式**：

- `<label for="id">文字</label>` 配合 `<input id="id">`
    
- 字符实体：`&lt;`（<）、`&gt;`（>）、`&amp;`（&）、`&nbsp;`（空格）
    

**代码**：

```html

<label for="username">用户名：</label>
<input type="text" id="username">
<p>使用 &lt; 和 &gt; 来显示尖括号。</p>
```

**总结**：`label` 提升可访问性，字符实体用于显示被 HTML 占用的符号。