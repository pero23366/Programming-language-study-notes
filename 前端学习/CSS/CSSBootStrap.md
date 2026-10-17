==一：概念==

**Bootstrap 响应式**，是 Bootstrap 框架内置的一套“响应式工具箱”。你不需要从零写 `@media`，它已经帮你把断点、栅格、显示隐藏等规则全部封装好了，你只要在 HTML 里加类名就行。

它主要包括三部分：

1. **栅格系统（Grid System）**：最核心的部分，用 `container` + `row` + `col-*` 三层结构，自动实现多列布局和断点切换。
    
2. **响应式工具类**：控制元素在不同断点下的**显示/隐藏**，如 `d-none d-md-block`（手机隐藏，平板以上显示）。
    
3. **断点前缀**：Bootstrap 的每个断点都有一个缩写前缀，用于栅格列数和工具类。
    

**Bootstrap 5 的断点表**：

|断点缩写|宽度|典型设备|
|---|---|---|
|（无前缀）|< 576px|手机竖屏|
|`sm`|≥ 576px|手机横屏|
|`md`|≥ 768px|平板|
|`lg`|≥ 992px|桌面|
|`xl`|≥ 1200px|大桌面|
|`xxl`|≥ 1400px|超大桌面|
(几乎所有的同一类的范围类似)
==二：格式==

**1. 栅格系统三层结构**

```html

<div class="container">        <!-- 容器：固定宽度或全宽 -->
    <div class="row">           <!-- 行：包裹列 -->
        <div class="col-12 col-md-6 col-lg-4">内容</div>
    </div>
</div>

```
**2. 断点前缀 + 列数**  
`col-{断点}-{占几列}`，Bootstrap 栅格把一行分为 **12 列**。

|写法|含义|
|---|---|
|`col-12`|所有屏幕都占 12 列（一整行）|
|`col-md-6`|平板及以上占 6 列（半行）|
|`col-lg-4`|桌面及以上占 4 列（三分之一行）|

**3. 响应式显示/隐藏工具类**

|类名|效果|
|---|---|
|`d-none`|所有屏幕隐藏|
|`d-block`|所有屏幕显示|
|`d-none d-md-block`|手机隐藏，平板及以上显示|
|`d-md-none`|平板及以上隐藏|

==三：代码==

**HTML (`bootstrap-responsive.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bootstrap响应式练习</title>
    <!-- 引入Bootstrap 5 CSS -->
    <link rel="stylesheet" href="./CSS/bootstrap.min.css">
</head>
<body>
    <!-- 1. 栅格系统：响应式卡片布局 -->
    <div class="container mt-5">
        <div class="row g-4">
            <!-- 手机：全宽；平板：半宽；桌面：三分之一宽 -->
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card p-3 bg-light">卡片1</div>
            </div>
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card p-3 bg-light">卡片2</div>
            </div>
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card p-3 bg-light">卡片3</div>
            </div>
        </div>
    </div>
    <!-- 2. 响应式显示/隐藏 -->
    <div class="container mt-5">
        <p class="d-block d-md-none">你在手机上看到的文字</p>
        <p class="d-none d-md-block">你在平板及以上看到的文字</p>
    </div>
</body>
</html>
```

**运行效果**：

- **手机（< 768px）**：三张卡片竖着排，显示“手机上看到的文字”。
    
- **平板（≥ 768px）**：卡片变成两列，显示“平板及以上看到的文字”。
    
- **桌面（≥ 992px）**：卡片变成三列。
    

==四：总结==

|知识点|核心要点|
|---|---|
|**栅格三层结构**|`container`（容器）→ `row`（行）→ `col-*`（列）|
|**12列制**|一行分 12 列，`col-6` 占一半，`col-4` 占三分之一|
|**断点前缀**|`sm` / `md` / `lg` / `xl` / `xxl`，写在 `col-` 后面|
|**移动优先**|不加前缀的 `col-12` 是所有屏幕的基础，加前缀是“向上增强”|
|**显示隐藏**|`d-none d-md-block`：手机隐藏，平板及以上显示|
|**与你手写断点的区别**|Bootstrap 帮你封装好了断点，你只需加类名，不用写 `@media`|

**一句话总结**：你之前手写的 `@media` 是“手动挡”，Bootstrap 的栅格是“自动挡”——断点、列宽、间距都帮你算好了，你只要记住 `col-{断点}-{列数}` 就行。