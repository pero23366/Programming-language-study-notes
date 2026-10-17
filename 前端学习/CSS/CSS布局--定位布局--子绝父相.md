==一：概念==
### 用定位实现“悬浮”与“压盖”

在标准流和浮动布局搞不定的地方，比如“搜索框里的放大镜图标”、“购物车右上角的数字角标”或“压在轮播图上的分类菜单”，就需要用定位来解决。

核心法则 **“子绝父相”**：

- **父元素**：设置 `position: relative;`，作为定位参考点，同时保留自己在标准流中的位置。
    
- **子元素**：设置 `position: absolute;`，脱离标准流，在父元素内自由移动。
==二：格式==
### 核心语法

```css

/* 父元素 */
.parent { position: relative; }
/* 子元素 */
.child { position: absolute; top: 0; left: 0; }
```
==三：代码==
**1. 搜索框的放大镜图标**

```html

<div class="search">
    <i class="iconfont icon-search"></i>
    <input type="text" placeholder="搜一搜">
</div>
```

```css

.search {
    position: relative; /* 父相 */
    border-bottom: 2px solid #e7e7e7;
}
.search i {
    position: absolute; /* 子绝 */
    top: 7px;
    left: 1px;
    font-size: 21px;
    color: #ccc;
}
.search input {
    width: 172px;
    height: 30px;
    padding-left: 30px; /* 为图标预留空间 */
    border: none;
    outline: none;
}

> 图标脱离标准流，不影响输入框排版，通过 `top` 和 `left` 精确调整位置[](https://blog.csdn.net/2302_80010151/article/details/153186409#1)。
```

**2. 购物车右上角的数字角标**

```html

<div class="car">
    <span>2</span>
    <i class="iconfont icon-cart-full"></i>
</div>

css

.car {
    position: relative; /* 父相 */
}
.car span {
    position: absolute; /* 子绝 */
    top: 0;
    left: 0; /* 用 left 而非 right，数字变大时不会向左挤 */
    padding: 2px 6px;
    background-color: #E26237;
    font-size: 14px;
    color: #fff;
    border-radius: 10px;
}

> 数字角标需要“压”在购物车图标的右上角，用 `padding` 撑开盒子，而不是固定宽高[](https://blog.csdn.net/2302_80010151/article/details/153186409#1)。

```
**3. 入口模块：分类菜单压在轮播图上**

```html

<div class="entry">
    <div class="wrapper">
        <div class="category">...</div>
        <div class="banner">...</div>
    </div>
</div>

```
```css

.entry .wrapper {
    position: relative; /* 父相：为分类菜单提供参考 */
    height: 500px;
    background: url(../uploads/banner1.png) no-repeat center / cover;
}
.category {
    position: absolute; /* 子绝：悬浮在轮播图上 */
    left: 0;
    top: 0;
    width: 250px;
    height: 500px;
    background-color: rgba(0, 0, 0, 0.42); /* 半透明背景，透出后方轮播图 */
}

> 分类菜单像半透明的玻璃，轻轻贴在海报左边，让轮播图完整占据 1240px 全宽，画面更大气[](https://blog.csdn.net/2302_80010151/article/details/152923143#1)。
```

**4. 轮播图的左右箭头和圆点指示器**

```html

<div class="banner">
    <ul class="pic">...</ul>
    <a href="#" class="prev"></a>
    <a href="#" class="next"></a>
    <ol class="circle">
        <li></li>
        <li></li>
        <li></li>
    </ol>
</div>
```

```css

.banner {
    position: relative; /* 父相 */
    overflow: hidden; /* 隐藏超出容器的图片 */
}
.prev, .next {
    position: absolute; /* 子绝：箭头悬浮在左右两侧 */
    top: 50%;
    transform: translateY(-50%);
    width: 45px;
    height: 45px;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 50%;
}
.prev { left: 260px; }
.next { right: 10px; }
.banner .circle {
    position: absolute; /* 子绝：圆点固定在右下角 */
    bottom: 17px;
    right: 16px;
    display: flex;
}
.banner .circle li {
    width: 22px; /* 大圆 */
    height: 22px;
    margin-left: 8px;
    border-radius: 50%;
}
.banner .circle i {
    display: block; /* 行内元素转块级，才能设宽高 */
    margin: 4px; /* 小圆与大圆的内间距 */
    width: 14px; /* 小圆 */
    height: 14px;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
}
.banner .circle .current { /* 选中态：大圆半透明背景 */
    background-color: rgba(255, 255, 255, 0.5);
}
.banner .circle .current i { /* 选中态：小圆变白 */
    background-color: #fff;
}

> 箭头用 `top: 50%; transform: translateY(-50%);` 实现垂直居中。圆点指示器采用“大圆套小圆”结构，选中态通过 `.current` 类控制[](https://blog.csdn.net/m0_74745356/article/details/130885795)。
```
==四：总结==

|场景|父元素（相对定位）|子元素（绝对定位）|
|---|---|---|
|**搜索框图标**|`.search`|`.search i`|
|**购物车角标**|`.car`|`.car span`|
|**分类菜单**|`.entry .wrapper`|`.category`|
|**轮播图箭头/圆点**|`.banner`|`.prev` / `.next` / `.circle`|

**核心口诀**：**父元素用 `relative` 占位并提供参考，子元素用 `absolute` 脱离标准流自由定位。** 把代码跑起来，用 F12 调试 `top`、`left` 等数值，观察图标位置的变化。有哪里不生效，随时截图发我~