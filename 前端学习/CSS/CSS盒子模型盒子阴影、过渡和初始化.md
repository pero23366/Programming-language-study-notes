==一：概念==
- **盒子阴影（`box-shadow`）**：CSS3 新增属性，给盒子添加阴影效果，让页面有层次感。阴影**不占用空间，不影响盒子排列**。
    
- **过渡（`transition`）**：让 CSS 属性的变化从“瞬间完成”变成“逐渐过渡”，使页面更动感、更平滑。
    
- **CSS 初始化**：为项目设定统一的基准样式，清除浏览器默认样式带来的差异，是每个项目开始时的标准动作。
==二：格式==
**. 盒子阴影**

```css

box-shadow: h-shadow v-shadow blur spread color inset;
```

|参数|含义|是否必填|
|---|---|---|
|`h-shadow`|水平阴影位置，允许负值|**必填**|
|`v-shadow`|垂直阴影位置，允许负值|**必填**|
|`blur`|模糊距离|可选|
|`spread`|阴影尺寸|可选|
|`color`|阴影颜色|可选|
|`inset`|内阴影，**不写即为外阴影**|可选|

注意：默认是外阴影（outset），但**不能写这个单词**，否则阴影无效。

**2. 过渡**

```css

transition: 要过渡的属性 花费时间 运动曲线 何时开始;

顺序不可改变，常用写法是 `transition: all 0.5s;`。
```

**3. CSS 初始化**（项目标配）

```css

*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
```

清除所有标签的内外边距，并统一使用 CSS3 盒子模型。
==三：代码==
**HTML 结构**

```html

<body>
    <div class="card">
        <h3>卡片标题</h3>
        <p>鼠标悬停看看效果</p>
    </div>
</body>
```

**CSS 样式**

```css

/* ========== CSS 初始化 ========== */
*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    padding: 50px;
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
/* ========== 卡片基础样式 ========== */
.card {
    width: 300px;
    height: 180px;
    padding: 20px;
    background-color: #fff;
    border-radius: 10px;
    margin: 0 auto;
    text-align: center;
    /* 过渡：所有属性变化耗时 0.3 秒，缓动效果 */
    transition: all 0.3s ease;
}
.card h3 {
    margin-bottom: 10px;
    color: #333;
}
.card p {
    color: #666;
    font-size: 14px;
}
/* ========== 悬停时添加阴影 + 上浮 ========== */
.card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    transform: translateY(-5px);
}

```
**关键观察**：鼠标放上去，卡片会**平滑地浮起并出现阴影**，移开后又平滑地恢复。这就是 `transition` 加上 `box-shadow` 的配合效果。
==四：总结==

|知识点|核心要点|
|---|---|
|**盒子阴影**|`box-shadow: h v blur spread color inset;`，外阴影不写 `outset`|
|**过渡**|`transition: 属性 时间 曲线 延迟;`，谁做过渡给谁加|
|**CSS 初始化**|`*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }`|
