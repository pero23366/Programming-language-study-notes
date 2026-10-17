==一：概念==
**过渡（`transition`）** 是CSS3中一项极具颠覆性的特性，它能让元素从一种样式**平滑地、渐渐地**变化到另一种样式，而不是瞬间跳变[](https://blog.csdn.net/weixin_42771853/article/details/128386529#2)[](http://www.chinadongda.com/j/?weixin_42771853/article/details/128386529#2)。

它最大的价值在于：**不需要Flash动画，也不需要JavaScript**，仅靠CSS就能为页面添加动感效果，极大地提升用户体验[](http://www.chinadongda.com/j/?weixin_42771853/article/details/128386529#2)。你之前在小兔鲜项目里做的“卡片悬停上浮”和“导航悬停变色”，底层就是它在起作用。
==二：格式==
`transition` 是一个复合属性，它的标准语法顺序如下[](https://blog.csdn.net/weixin_42771853/article/details/128386529#2)[](http://www.chinadongda.com/j/?weixin_42771853/article/details/128386529#2)：

css

transition: 要过渡的属性 花费时间 运动曲线 何时开始;

|参数|含义|是否必填|说明|
|---|---|---|---|
|**要过渡的属性**|指定哪个CSS属性参与过渡|可选|写 `all` 代表所有属性都过渡；也可以写 `width`、`background-color` 等具体属性|
|**花费时间**|过渡持续多久|**必填**|单位是**秒（s）**，如 `0.5s`，**必须写单位**|
|**运动曲线**|过渡的速度变化|可选|默认是 `ease`（先快后慢），可以省略不写|
|**何时开始**|过渡延迟多久开始|可选|单位是**秒（s）**，默认是 `0s`，可以省略不写|

**关键口诀：谁做过渡给谁加。** 这行代码要写在**即将发生变化的元素本身**上，而不是写在 `:hover` 里面[](https://blog.csdn.net/weixin_42771853/article/details/128386529#2)[](http://www.chinadongda.com/j/?weixin_42771853/article/details/128386529#2)。
==三：代码==
下面是一个模拟小兔鲜商品卡片的练习，用到 `transition` 和 `:hover` 配合，实现悬停时**上浮 + 阴影**的平滑效果。

**1. HTML 结构**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>过渡练习</title>
    <link rel="stylesheet" href="./CSS/transition-practice.css">
</head>
<body>
    <div class="card">
        <div class="card-img"></div>
        <h3>新鲜好物</h3>
        <p>产地直供，新鲜直达</p>
    </div>
</body>
</html>

```
**2. CSS 样式**

```css

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    padding: 50px;
    background-color: #f5f5f5;
}
.card {
    width: 280px;
    background-color: #fff;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    cursor: pointer;
    /* 核心：过渡写在这里，谁变化给谁加 */
    transition: all 0.3s ease;
}
/* 悬停时：上浮 + 阴影 */
.card:hover {
    transform: translateY(-10px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}
.card-img {
    width: 100%;
    height: 150px;
    background-color: #eef2ff;
    border-radius: 8px;
    margin-bottom: 15px;
}
.card h3 {
    font-size: 18px;
    color: #333;
    margin-bottom: 8px;
}
.card p {
    font-size: 14px;
    color: #999;
}

**3. 效果说明**

- 鼠标悬停前：卡片静态，无阴影。
    
- 鼠标悬停时：卡片**平滑地**向上移动 10px，同时阴影**渐渐浮现**，整个过程持续 0.3 秒。
    
- 鼠标移开：卡片**平滑地**回到原位，阴影消失。
    
```

如果把 `transition` 那行代码删掉，卡片依然会上浮和出现阴影，但会**瞬间完成**，非常生硬。
==四：总结==

| 知识点      | 核心要点                        |
| -------- | --------------------------- |
| **作用**   | 让属性变化平滑过渡，提升交互体验            |
| **语法**   | `transition: 属性 时间 曲线 延迟;`  |
| **必填项**  | **花费时间必须写单位（s）**            |
| **常用值**  | `all 0.3s ease` 是最常用的组合     |
| **书写位置** | **写在变化元素本身**，不写在 `:hover` 里 |
| **搭配使用** | 最常和 `:hover` 配合，实现悬停动效      |
