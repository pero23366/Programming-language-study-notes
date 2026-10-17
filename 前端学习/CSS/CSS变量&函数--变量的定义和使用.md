==一：概念==

CSS变量，官方名称叫 **CSS自定义属性**，它允许你在样式表中定义可复用的值，并在任意地方通过 `var()` 函数引用。[](https://mdn.org.cn/en-US/docs/Web/CSS/Using_CSS_custom_properties)

它的核心思想是**“一处定义，多处引用”**。比如一个主色调 `#4D6BFE`，可能在几十个地方用到，用变量定义一次，以后想改颜色，只改这一个地方，全站同步更新。[](https://mdn.org.cn/en-US/docs/Web/CSS/Using_CSS_custom_properties)

CSS变量和 Sass/Less 变量最大的不同在于：**CSS变量是浏览器原生支持的，在运行时生效，可以动态修改**。这意味着你可以用 JavaScript 实时改变变量的值，整个页面的样式会立刻响应——这就是“一键换肤”的底层原理。[](https://sass-lang.com.cn/documentation/variables/)[](https://developer.aliyun.com/article/1667604)

==二：格式==

**1. 定义变量：以 `--` 开头**

css

:root {
    --main-color: #4D6BFE;
    --font-size: 16px;
}

`--` 是固定前缀，后面跟变量名（区分大小写）。`:root` 选择器代表根元素 `<html>`，在它里面定义的变量是**全局作用域**，整个页面都能用。[](https://mdn.org.cn/en-US/docs/Web/CSS/Using_CSS_custom_properties)[](https://developer.aliyun.com/article/1635304#1)

**2. 使用变量：`var()` 函数**

css

.box {
    color: var(--main-color);
    font-size: var(--font-size);
}

`var()` 括号里写变量名，浏览器会自动替换成对应的值。[](https://mdn.org.cn/en-US/docs/Web/CSS/var)

**3. 回退值：变量未定义时的备胎**

css

color: var(--main-color, #999); /* 如果 --main-color 没定义，就用 #999 */

第二个参数是可选的回退值，当变量未定义时生效。[](https://mdn.org.cn/en-US/docs/Web/CSS/var)

**4. 局部作用域**  
在任意选择器内定义的变量，只在该元素及其后代中有效。[](https://developer.aliyun.com/article/1635304#1)

css

.card {
    --card-bg: #fff;
    background: var(--card-bg);
}
.card p {
    color: var(--main-color);  /* 仍可用全局变量 */
}

==三：代码==

**HTML (`css-variable.html`)**

html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>CSS变量练习</title>
    <link rel="stylesheet" href="./CSS/css-variable.css">
</head>
<body>
    <div class="card">
        <h3>卡片标题</h3>
        <p>用CSS变量控制颜色和间距</p>
    </div>
    <div class="card special">
        <h3>特殊卡片</h3>
        <p>局部覆盖了变量</p>
    </div>
    <button class="btn">切换主题</button>
</body>
</html>

**CSS (`CSS/css-variable.css`)**

css

/* 1. 全局变量：定义在 :root 上 */
:root {
    --main-color: #4D6BFE;
    --text-color: #333;
    --card-bg: #fff;
    --radius: 12px;
    --gap: 20px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background-color: #f5f5f5;
    padding: 50px;
    font-family: "Microsoft YaHei", Arial, sans-serif;
    transition: background-color 0.3s;
}
.card {
    width: 300px;
    padding: var(--gap);
    margin-bottom: var(--gap);
    background-color: var(--card-bg);
    border: 2px solid var(--main-color);
    border-radius: var(--radius);
    color: var(--text-color);
    transition: all 0.3s;
}
/* 2. 局部作用域：覆盖全局变量 */
.special {
    --main-color: #27ba9b;  /* 只在这个卡片内生效 */
    --card-bg: #f0fdf8;
}
.btn {
    padding: 10px 24px;
    background-color: var(--main-color);
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s;
}
/* 3. JavaScript 切换主题（通过修改 :root 上的变量） */
body.dark {
    --text-color: #eee;
    --card-bg: #1a1a1a;
    --main-color: #65d9ff;
    background-color: #121212;
}

**配套 JavaScript（切换主题）**

html

<script>
    document.querySelector('.btn').addEventListener('click', () => {
        document.body.classList.toggle('dark');
    });
</script>

点击按钮，整个页面的颜色会**瞬间切换**，所有用了变量的地方同步变化。

==四：总结==

|知识点|核心要点|
|---|---|
|**定义方式**|以 `--` 开头，如 `--main-color: #4D6BFE;`|
|**使用方式**|`var(--变量名)`，可带回退值 `var(--x, 默认值)`|
|**全局变量**|定义在 `:root` 上，全文档可用|
|**局部变量**|定义在任意选择器内，只对该元素及后代生效，可覆盖全局|
|**与 Sass 的区别**|CSS变量是浏览器原生支持的，运行时生效，可被 JS 动态修改|
|**典型用途**|主题切换、统一颜色/间距管理、组件级样式定制|