### 🎯 一、概念：用定位实现“悬浮”与“压盖”

轮播图的图片、箭头和圆点处于不同的“图层”。**父容器（`.banner`）设置相对定位（`position: relative;`）作为定位参考点；箭头和圆点设置绝对定位（`position: absolute;`），脱离文档流，自由移动到父容器内的任何位置**[](https://hanshuliang.blog.csdn.net/article/details/130153097)。核心法则依然是 **“子绝父相”**。

### 📐 二、格式：箭头与圆点的定位写法

**1. 左右箭头**  
父容器 `.banner` 设置 `position: relative;` 和 `overflow: hidden;`[](https://hanshuliang.blog.csdn.net/article/details/130153097)。箭头用 `<a>` 标签，设置 `position: absolute;`，通过 `top`、`left`、`right` 微调位置[](https://blog.csdn.net/qq_65046523/article/details/141396274)。

**2. 圆点指示器**  
父容器 `.banner` 设置 `position: relative;`。圆点容器 `.circle` 设置 `position: absolute;`，通过 `bottom`、`right` 固定在右下角[](https://blog.csdn.net/qq_65046523/article/details/141396274)。每个圆点由 **大圆（`<li>`）套小圆（`<i>`）** 构成，选中态通过 `.current` 类切换样式。

### 💻 三、代码：小兔鲜轮播图定位实战

**1. HTML 结构** (在入口模块的 `.wrapper` 中，分类菜单 `.category` 下方添加)：

```html

<!-- 轮播图区域 -->
<div class="banner">
    <!-- 图片列表 -->
    <ul class="pic">
        <li><a href="#"><img src="./uploads/banner1.png" alt=""></a></li>
        <li><a href="#"><img src="./uploads/banner2.png" alt=""></a></li>
        <li><a href="#"><img src="./uploads/banner3.png" alt=""></a></li>
    </ul>
    <!-- 左右箭头 -->
    <a href="#" class="prev"></a>
    <a href="#" class="next"></a>
    <!-- 圆点指示器 -->
    <ol class="circle">
        <li></li>
        <li></li>
        <li class="current"></li>
    </ol>
</div>
```

**2. CSS 样式** (在 `index.css` 的入口模块部分添加)：

```css

/* 轮播图容器 - 父相 */
.banner {
    position: relative;   /* 给箭头和圆点提供定位参考 */
    height: 500px;
    overflow: hidden;     /* 隐藏超出容器的图片 */
    flex: 1;              /* 如果与分类菜单并排，可用 flex 分配剩余宽度 */
}
.banner .pic {
    display: flex;        /* 图片横向排列 */
    width: 3720px;        /* 3张图 × 1240px */
}
.banner .pic img {
    width: 100%;
    height: 500px;
    object-fit: cover;
}
/* 左右箭头 - 子绝 */
.prev, .next {
    position: absolute;   /* 脱离文档流，悬浮在图片上 */
    top: 50%;             /* 垂直方向居中 */
    transform: translateY(-50%);
    width: 45px;
    height: 45px;
    background-color: rgba(0, 0, 0, 0.2); /* 半透明黑色背景 */
    border-radius: 50%;   /* 圆形按钮 */
    background-image: url(../images/sprites.png); /* 精灵图 */
}
.prev { left: 260px; background-position: 14px -60px; }  /* 左箭头 */
.next { right: 10px; background-position: -23px -60px; } /* 右箭头 */
/* 圆点指示器 - 子绝 */
.banner .circle {
    position: absolute;   /* 固定在轮播图右下角 */
    bottom: 17px;
    right: 16px;
    display: flex;        /* 圆点横向排列 */
}
.banner .circle li {      /* 大圆 */
    width: 22px;
    height: 22px;
    margin-left: 8px;
    border-radius: 50%;
    /* background-color: transparent; 默认透明 */
}
.banner .circle i {       /* 小圆 */
    display: block;       /* 行内元素转块级，才能设宽高 */
    margin: 4px;          /* 小圆与大圆的内间距 */
    width: 14px;
    height: 14px;
    background-color: rgba(255, 255, 255, 0.5); /* 半透明白色 */
    border-radius: 50%;
}
/* 选中态 */
.banner .circle .current {
    background-color: rgba(255, 255, 255, 0.5); /* 大圆半透明背景 */
}
.banner .circle .current i {
    background-color: #fff; /* 小圆变白 */
}
```

**3. 关键点说明**

- **箭头定位**：`top: 50%; transform: translateY(-50%);` 是让箭头垂直居中的经典写法[](https://www.php.cn/faq/3196695.html#1)。
    
- **圆点结构**：采用“大圆套小圆”的巧妙设计。`<li>` 是大圆，默认透明；`<i>` 是小圆，默认半透明。选中时，给 `<li>` 加半透明背景，同时让 `<i>` 变成纯白，形成层次感。
    
- **精灵图**：箭头图标用 `background-position` 从精灵图中切出，具体坐标需根据你的 `sprites.png` 用 F12 调试[](https://juejin.cn/post/7161410136299290654#2)。
    

### 💎 四、总结

|元素|父元素（相对定位）|子元素（绝对定位）|定位要点|
|---|---|---|---|
|**左右箭头**|`.banner`|`.prev` / `.next`|`top: 50%; transform: translateY(-50%);`|
|**圆点指示器**|`.banner`|`.circle`|`bottom` + `right` 固定在右下角|
|**选中态圆点**|`.circle li`|`.circle .current`|大圆加半透明背景，小圆变纯白|

**核心口诀**：父元素用 `relative` 占位并提供参考，子元素用 `absolute` 脱离文档流自由定位。用 F12 调试 `top`、`left` 等数值，观察箭头和圆点位置的变化。