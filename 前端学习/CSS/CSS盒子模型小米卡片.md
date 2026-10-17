**HTML 结构 (`前端/HTML/小米卡片.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>小米卡片</title>
    <link rel="stylesheet" href="../CSS/小米卡片.css">
</head>
<body>
    <div class="goods">
        <img class="goods-img" src="https://cdn.cnbj0.fds.api.mi-img.com/b2c-miapp-a1/T1aWd_BsVT1RXrhCrK.jpg" alt="小米平衡车">
        <div class="goods-title">九号平衡车</div>
        <div class="goods-subtitle">成人的玩具</div>
        <div class="goods-price">1999元</div>
    </div>
</body>
</html>
```

**CSS 样式 (`前端/CSS/小米卡片.css`)**

```css

/* 1. 全局初始化 */
*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box; /* 核心：使用怪异盒模型，尺寸计算更可控 */
}
body {
    padding: 50px;
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
/* 2. 卡片容器 */
.goods {
    width: 234px;              /* 固定宽度 */
    height: 300px;             /* 固定高度 */
    background-color: #fff;    /* 白色背景 */
    padding: 20px;             /* 内边距 */
    text-align: center;        /* 让内部所有行内元素水平居中 */
    border-radius: 8px;        /* 圆角 */
    box-shadow: 0 2px 8px rgba(0,0,0,0.1); /* 基础阴影 */
    margin: 0 auto;            /* 卡片在页面中水平居中 */
    transition: all 0.3s ease; /* 核心：为悬停效果添加过渡 */
}
/* 3. 卡片悬停效果 */
.goods:hover {
    box-shadow: 0 8px 20px rgba(0,0,0,0.15); /* 阴影变大变柔 */
    transform: translateY(-5px);             /* 向上浮动 */
}
/* 4. 商品图片 */
.goods-img {
    width: 160px;
    height: 160px;
    object-fit: cover; /* 保持图片比例，避免拉伸变形 */
    margin-bottom: 10px;
}
/* 5. 商品标题 - 核心技巧：文本溢出省略 */
.goods-title {
    font-size: 14px;
    color: #333;
    line-height: 25px;
    margin-bottom: 5px;
    
    /* 文本溢出省略三件套 */
    white-space: nowrap;      /* 1. 强制文本在一行显示 */
    overflow: hidden;         /* 2. 隐藏超出容器的部分 */
    text-overflow: ellipsis;  /* 3. 用省略号(...)代替被隐藏的部分 */
}
/* 6. 商品副标题 */
.goods-subtitle {
    font-size: 12px;
    color: #ccc;
    line-height: 30px;
}
/* 7. 商品价格 */
.goods-price {
    font-size: 14px;
    color: #ffa500; /* 醒目的橙色 */
    font-weight: bold;
}
```