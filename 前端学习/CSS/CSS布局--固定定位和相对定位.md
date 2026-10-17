### 🎯 一、概念：两种定位，两种“粘”法

**固定定位 (`fixed`)** 和 **粘性定位 (`sticky`)** 都能让元素在页面滚动时“粘”在某个位置，但它们的“粘”法完全不同。

- **固定定位 (`fixed`)**：**“焊死”在屏幕上**。元素**相对于浏览器可视窗口**定位，无论页面怎么滚动，它都纹丝不动地待在指定位置。可以想象成屏幕上的一个“贴纸”，和页面内容无关，通常用于**导航栏、悬浮的“返回顶部”按钮、侧边广告**等。[](https://raw.githubusercontent.com/echo-cool-coding/cool-coding/refs/heads/main/docs/web/css/5-css-layout-basics/4-css-fixed-positioning.mdx#1)[](https://hanshuliang.blog.csdn.net/article/details/130104233)
    
- **粘性定位 (`sticky`)**：**“聪明”的粘性**。它是**相对定位 (`relative`) 和固定定位 (`fixed`) 的结合体**。元素在滚动到设定的阈值之前，像普通元素一样跟随页面滚动（相对定位）；一旦滚动到阈值位置，它就会“粘”住，表现得像固定定位。[](https://developer.aliyun.com/article/916206#1)
    

### 📐 二、格式：核心语法与关键点

**1. 固定定位 (`fixed`)**

- **语法**：`position: fixed;` 配合 `top`、`right`、`bottom`、`left` 设定位置。
    
- **核心特点**：
    
    - **脱离文档流**：元素从原来的位置“拿走”，不再占据空间，可能会和后面的元素重叠。[](https://raw.githubusercontent.com/echo-cool-coding/cool-coding/refs/heads/main/docs/web/css/5-css-layout-basics/4-css-fixed-positioning.mdx#1)
        
    - **定位基准**：永远是**浏览器可视窗口**（Viewport），和父元素没有关系。[](https://hanshuliang.blog.csdn.net/article/details/130104233)
        

**2. 粘性定位 (`sticky`)**

- **语法**：`position: sticky;` **必须**配合 `top`、`bottom`、`left` 或 `right` 其中之一（阈值），否则和相对定位没区别。[](https://developer.aliyun.com/article/897051)
    
- **核心特点**：
    
    - **不脱离文档流**：元素在“粘”住之前，仍然占据原来的空间。
        
    - **定位基准**：粘住后，相对于**浏览器可视窗口**定位。
        
    - **作用范围**：只在**父元素的范围内**生效。当父元素完全滚出视口后，粘性效果也会消失。
        

### 💻 三、代码：小兔鲜项目实战

以下代码可以直接放入你的小兔鲜项目中进行测试。

**1. 固定定位实战：侧边栏“返回顶部”按钮**

- **HTML**：在 `<body>` 标签末尾（`</body>` 前）加入。
   ``` 
    html
    
    <a href="#" class="back-to-top">↑</a>
   ```
    
- **CSS**：在 `common.css` 中添加。
    
    ```css
    
    .back-to-top {
        position: fixed; /* 固定定位 */
        bottom: 50px;    /* 距离底部50px */
        right: 50px;     /* 距离右侧50px */
        width: 45px;
        height: 45px;
        background-color: #27ba9b; /* 小兔鲜品牌绿 */
        color: #fff;
        text-align: center;
        line-height: 45px;
        border-radius: 50%;
        font-size: 20px;
        z-index: 999; /* 确保在最上层 */
    }
    
    ```

**2. 粘性定位实战：商品详情页的“吸顶导航”**

- **HTML**：结构示意，可放在任意长内容之前。
    
   ``` html
    
    <div class="product-nav">
        <ul>
            <li>商品介绍</li>
            <li>规格参数</li>
            <li>售后保障</li>
        </ul>
    </div>
   ```
    <div class="product-content">
        <!-- 大量商品详情内容 -->
    </div>
    
- **CSS**：
    
  ```  css
    
    .product-nav {
        position: sticky; /* 粘性定位 */
        top: 0;           /* 粘在视口顶部 */
        background-color: #fff;
        z-index: 100;     /* 确保在内容之上 */
        border-bottom: 1px solid #eee;
    }
    .product-nav ul {
        display: flex;
        justify-content: space-around;
        padding: 15px 0;
    }
    .product-content {
        /* 大量内容，撑开页面以便滚动测试 */
        height: 1500px;
        padding-top: 20px;
    }
  ```
    

### 💎 四、总结

|特性|固定定位 (`fixed`)|粘性定位 (`sticky`)|
|---|---|---|
|**定位基准**|**浏览器视口**|**浏览器视口**（粘住后）|
|**是否脱离文档流**|**是**（不占空间）|**否**（占空间）|
|**生效条件**|设置 `position: fixed;` 即可|**必须**设置 `top`/`bottom` 等阈值|
|**作用范围**|**整个浏览器窗口**|**仅在父元素范围内**|
|**典型应用**|悬浮按钮、侧边广告|吸顶导航、表格吸顶表头|