**HTML 结构 (`前端/HTML/淘宝卡片.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>淘宝卡片</title>
    <link rel="stylesheet" href="../CSS/淘宝卡片.css">
</head>
<body>
    <div class="goods">
        <img class="goods-img" src="https://picsum.photos/200/200" alt="商品图片">
        <div class="goods-title">这是一件商品标题，可能会很长很长很长很长很长很长很长很长很长</div>
        <div class="goods-price">¥1999</div>
    </div>
</body>
</html>

```
**CSS 样式 (`前端/CSS/淘宝卡片.css`)**

```css

/* 1. 全局初始化 */
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
/* 2. 卡片容器 */
.goods {
    width: 234px;
    height: 300px;
    background-color: #fff;
    padding: 20px;
    text-align: center;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin: 0 auto;
    transition: all 0.3s ease;
}
/* 3. 卡片悬停效果 */
.goods:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    transform: translateY(-5px);
}
/* 4. 商品图片 */
.goods-img {
    width: 160px;
    height: 160px;
    object-fit: cover;
    margin-bottom: 10px;
}
/* 5. 商品标题 - 核心技巧：文本溢出省略 */
.goods-title {
    font-size: 14px;
    color: #333;
    line-height: 25px;
    margin-bottom: 5px;
    
    /* 文本溢出省略三件套 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
/* 6. 商品价格 */
.goods-price {
    font-size: 14px;
    color: #ffa500;
    font-weight: bold;
```