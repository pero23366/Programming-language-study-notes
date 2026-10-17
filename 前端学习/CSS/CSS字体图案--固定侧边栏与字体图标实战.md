==一：概念==
### 固定侧边栏与字体图标实战

这节课的核心是**把字体图标嵌入到一个固定定位的侧边栏中**，让它始终贴在浏览器窗口的右侧，不随页面滚动而移动。

- **固定定位**：`position: fixed;` 让元素脱离文档流，相对于**浏览器窗口**定位，滚动页面时位置不变。实现时需要配合 `top`、`right` 等偏移属性来指定位置。
    
- **字体图标应用**：把 `iconfont` 下载的图标，通过 Font class 方式嵌入到侧边栏的每个菜单项中，让它们既能自由改色、改大小，又能保持矢量清晰度。
==二：格式==
**1. 固定定位语法**

```css

.侧边栏类名 {
    position: fixed;
    right: 0;      /* 贴紧窗口右侧 */
    top: 50%;      /* 垂直方向居中 */
    transform: translateY(-50%); /* 配合 top 实现完美垂直居中 */
}
```

`transform: translateY(-50%)` 是为了修正 `top: 50%` 带来的偏移，让侧边栏真正处于垂直居中位置。

**2. 侧边栏 HTML 结构**  
每个菜单项通常是一个 `<a>` 标签，里面放一个字体图标和一个提示文字。

html

<div class="sidebar">
    <a href="#" class="sidebar-item">
        <i class="iconfont icon-购物车图标"></i>
        <span>购物车</span>
    </a>
    <!-- 更多菜单项... -->
</div>

**3. 字体图标的使用**  
沿用上节课的 Font class 方式：

```html

<link rel="stylesheet" href="../CSS/iconfont/iconfont.css">
<i class="iconfont icon-购物车"></i>
```
==三：代码==
### 淘宝侧边栏完整实现

新建 `前端/HTML/淘宝侧边栏.html` 和 `前端/CSS/淘宝侧边栏.css`。你需要提前从 iconfont 下载好购物车、客服、反馈等图标，并把字体文件放入 `CSS/iconfont/` 文件夹。

**HTML 结构 (`前端/HTML/淘宝侧边栏.html`)**

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>淘宝侧边栏</title>
    <link rel="stylesheet" href="../CSS/淘宝侧边栏.css">
    <link rel="stylesheet" href="../CSS/iconfont/iconfont.css">
</head>
<body>
    <div class="sidebar">
        <a href="#" class="sidebar-item">
            <i class="iconfont icon-gouwuche"></i>
            <span>购物车</span>
        </a>
        <a href="#" class="sidebar-item">
            <i class="iconfont icon-kefu"></i>
            <span>客服</span>
        </a>
        <a href="#" class="sidebar-item">
            <i class="iconfont icon-fankui"></i>
            <span>反馈</span>
        </a>
    </div>
</body>
</html>

```
**CSS 样式 (`前端/CSS/淘宝侧边栏.css`)**

```css

/* 1. 全局初始化 */
*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    height: 2000px; /* 故意撑高页面，方便测试固定定位 */
    background-color: #f5f5f5;
    font-family: "Microsoft YaHei", Arial, sans-serif;
}
/* 2. 侧边栏容器 */
.sidebar {
    position: fixed;       /* 固定定位 */
    right: 0;              /* 贴紧右侧 */
    top: 50%;              /* 垂直方向50% */
    transform: translateY(-50%); /* 修正偏移，实现完美垂直居中 */
    width: 60px;
    background-color: #fff;
    border-radius: 8px 0 0 8px; /* 左侧圆角 */
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    padding: 10px 0;
}
/* 3. 每个菜单项 */
.sidebar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 5px;
    text-decoration: none;
    color: #666;
    font-size: 12px;
    transition: all 0.3s ease;
    border-bottom: 1px solid #f0f0f0;
}
.sidebar-item:last-child {
    border-bottom: none;
}
.sidebar-item:hover {
    color: #ff5000;         /* 淘宝橙 */
    background-color: #fff5f0;
}
/* 4. 字体图标样式 */
.sidebar-item .iconfont {
    font-size: 22px;
    margin-bottom: 5px;
}
/* 5. 文字提示 */
.sidebar-item span {
    font-size: 12px;
}
```
==四：总结==

|知识点|核心要点|
|---|---|
|**固定定位**|`position: fixed;` + `right: 0;` + `top: 50%;` + `transform: translateY(-50%);`|
|**侧边栏结构**|外层 `div.sidebar` 定位，内层用 `<a>` 标签包裹图标和文字|
|**字体图标**|用 Font class 方式 `<i class="iconfont icon-xxx"></i>` 嵌入|
|**悬停效果**|`:hover` 变色 + `transition` 平滑过渡|

**⚠️ 注意事项**：

- `iconfont.css` 和字体文件（`.ttf`、`.woff`、`.woff2`）必须放在同一个文件夹里，路径要写对。
    
- 如果侧边栏图标不显示，按 `F12` 检查控制台是否有 404 报错，确认字体文件路径是否正确。
    
- 页面高度设为 `2000px` 是为了让你能看到滚动效果，实际项目中不需要这个设置。