==一：概念==
### 一行顶五行的“语法糖”

`font` 是 CSS 中一个非常强大的**简写属性（Shorthand Property）**。它就像是 C# 里的**对象初始化器**，可以让你在一条语句里完成多个属性的赋值。

在之前的课程中，你可能需要这样写：

```css

p {
    font-style: italic;
    font-weight: 700;
    font-size: 20px;
    line-height: 1.8;
    font-family: "Microsoft YaHei", sans-serif;
}

```
而使用 `font` 简写，你只需要写一行：

```css

p {
    font: italic 700 20px/1.8 "Microsoft YaHei", sans-serif;
}
```

这两段代码**完全等价**，但后者更简洁，也更符合工程化开发的规范[](https://cloud.tencent.cn/developer/article/2624083?policyId=1003#2)。
==二：格式==
### 必须牢记的书写顺序

`font` 简写属性有严格的书写顺序，**顺序错误会导致整条规则失效**。标准格式如下：

```css

font: font-style font-variant font-weight font-size/line-height font-family;
```

你可以把它理解为一条**流水线**，必须按顺序传递参数。

|组成部分|是否必填|说明|
|---|---|---|
|**`font-style`**|可选|字体样式，如 `italic`（斜体）、`normal`（正常）|
|**`font-variant`**|可选|小型大写字母，如 `small-caps`，初学阶段极少使用，可忽略|
|**`font-weight`**|可选|字体粗细，如 `bold`、`700`（数字后不加单位）|
|**`font-size/line-height`**|**必填**|字号和行高，**必须用 `/` 连接**，如 `20px/1.8`|
|**`font-family`**|**必填**|字体族，**必须放在最后**|

**必须遵守的规则**：

1. `font-style`、`font-variant`、`font-weight` **必须写在 `font-size` 之前**。
    
2. `line-height` 必须紧跟 `font-size`，用 `/` 分隔。
    
3. `font-family` 必须**放在最后**。
    
4. **`font-size` 和 `font-family` 是必填项**，省略会导致整条 `font` 属性失效[](https://www.w3cschool.cn/m/cssref/pr-font-font.html)。
==三：代码==
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>font 简写属性练习</title>
    <link rel="stylesheet" href="../CSS/font简写.css">
</head>
<body>
    <h1>font 简写属性大练兵</h1>

    <p class="full-shorthand">
        完整简写：斜体、加粗、20px、行高1.8、微软雅黑
    </p>

    <p class="simple-shorthand">
        简化简写：正常样式、正常粗细、18px、行高1.5、宋体
    </p>

    <p class="shorthand-weight">
        数字粗细简写：700 代表加粗，16px、行高2、Arial
    </p>
</body>
</html>
```
```css
/* 全局初始化 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    padding: 30px;
    background-color: #f5f5f5;
}

h1 {
    text-align: center;
    margin-bottom: 30px;
    color: #333;
}

/* 1. 完整简写：包含 font-style 和 font-weight */
.full-shorthand {
    font: italic 700 20px/1.8 "Microsoft YaHei", sans-serif;
    color: #333;
}

/* 2. 简化简写：省略 font-style 和 font-weight，使用默认值 normal / 400 */
.simple-shorthand {
    font: 18px/1.5 "SimSun", serif;
    color: #666;
}

/* 3. 数字粗细简写：font-weight 用数字表示 */
.shorthand-weight {
    font: 700 16px/2 Arial, sans-serif;
    color: #4D6BFE;
}
```
==四：总结==
`font` 简写属性的核心要点：

- **顺序固定**：`font-style` → `font-weight` → `font-size/line-height` → `font-family`。
    
- **`font-size` 和 `font-family` 必填**，其他属性如果省略，会自动使用默认值（`font-style: normal`、`font-weight: 400` 等）[](https://cloud.tencent.cn/developer/article/2624083?policyId=1003#2)。
    
- **`line-height` 必须跟在 `font-size` 后面**，用 `/` 连接，如 `20px/1.8`。
    
- **`color` 不能简写**，必须单独写。
    
- **工程化建议**：在实际项目中，推荐给 `body` 设置一个全局的 `font` 简写，然后其他元素通过继承获得基础字体，再局部覆盖需要变化的属性，这样代码最简洁。.