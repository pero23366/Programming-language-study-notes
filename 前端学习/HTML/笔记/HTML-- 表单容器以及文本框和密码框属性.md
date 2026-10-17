**概念**：`<form>` 是表单容器，`<input>` 是输入控件。`type` 属性决定输入类型。

**格式**：

- `<input type="text">`：文本框
    
- `<input type="password">`：密码框
    
- `<input type="submit">`：提交按钮
    

**代码**：



<form action="/submit" method="post">
    <input type="text" name="username" placeholder="用户名">
    <input type="password" name="password" placeholder="密码">
    <input type="submit" value="登录">
</form>

```html

<form action="/submit" method="post">
    <input type="text" name="username" placeholder="用户名">
    <input type="password" name="password" placeholder="密码">
    <input type="submit" value="登录">
</form>
```

**总结**：`name` 属性用于提交数据，`placeholder` 是提示文字。