核心是**CSS精灵技术（CSS Sprites）**，也叫“雪碧图”，是一种通过将多个小图标合并成一张大图，以减少网页请求次数、提升加载速度的经典优化技术[](https://baike.baidu.com/item/CSS%E9%9B%AA%E7%A2%A7#1)。
==一：概念==
### 概念：把多个图标“拼”成一张大图

**核心思想**：浏览器每加载一张图片，就需要向服务器发送一次HTTP请求。如果网页上有很多小图标，就会产生大量请求，拖慢页面加载速度[](https://cloud.tencent.cn/developer/article/2271802?from=15425#1)。

**解决方案**：把这些小图标**拼合到一张大图上**，然后用CSS的`background-position`属性，像开“窗口”一样，只显示大图中需要的那一小块[](https://baike.baidu.com/item/CSS%E9%9B%AA%E7%A2%A7#1)。

**生活类比**：这就像去超市买东西，分开买10件商品需要跑10趟，把它们装进一个大袋子，一趟就能拎回家。
==二：格式==
### 核心属性与坐标计算

CSS精灵技术主要依赖以下属性[](https://blog.csdn.net/artist123abbb/article/details/144982064?ops_request_misc=elastic_search_misc&request_id=12b0b04a0bdf6ee91a4bd96a59c24bf8&biz_id=&utm_medium=distribute.pc_search_result.none-task-special_column-2~all~ElasticSearch~search_v2-13-12824072-null-null.142%5Ev102%5Epc_search_result_base2&utm_term=%E6%88%91%E4%BB%AC%E4%B8%80%E8%B5%B7%E5%AD%A6%E5%89%8D%E7%AB%AF#1)：

```css

.box {
    width: 图标宽度;
    height: 图标高度;
    background: url(精灵图路径) no-repeat -x坐标 -y坐标;
}
```

**坐标计算规则**（关键）：

- 精灵图的**左上角是坐标原点（0, 0）**。
    
- 图标在精灵图中的位置是**正坐标**，但设置`background-position`时，需要**取负值**，将图片向左、向上移动，使目标图标对齐到盒子的左上角[](https://cloud.tencent.cn/developer/article/2271802?from=15425#1)。
    
- **口诀**：向左移动多少像素，`x`写负多少；向上移动多少像素，`y`写负多少。
==三：代码==
### 动手实现精灵图

在你的项目中新建 `前端/HTML/精灵图.html` 和 `前端/CSS/精灵图.css`。你需要一张包含多个图标的精灵图（这里用 `https://picsum.photos/300/100` 模拟一张横向排列了3个100x100图标的精灵图）。

**HTML 结构**

```html

<body>
    <div class="icon icon1"></div>
    <div class="icon icon2"></div>
    <div class="icon icon3"></div>
</body>

```
**CSS 样式**

```css

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
  
/* 所有图标的公共样式 */
.icon {
    width: 100px;               /* 每个图标宽度为 100px */
    height: 100px;              /* 每个图标高度为 100px */
    background-image: url(https://picsum.photos/300/100); /* 精灵图 */
    background-repeat: no-repeat;
    margin-bottom: 20px;
    border: 2px solid #ddd;
}
/* 第1个图标：位于精灵图左上角 (0, 0) */
.icon1 {
    background-position: 0 0;
}
/* 第2个图标：位于精灵图 (100, 0) 位置 */
/* 需要向左移动100px，所以 x 为 -100px */
.icon2 {
    background-position: -100px 0;
}
/* 第3个图标：位于精灵图 (200, 0) 位置 */
/* 需要向左移动200px，所以 x 为 -200px */
.icon3 {
    background-position: -200px 0;
}

**验证方法**：打开页面，你会看到3个100x100的盒子，分别显示了精灵图从左到右的三个部分。按`F12`，选中 `.icon2`，在 `Styles` 面板中修改 `background-position` 的值，可以实时观察图标的变化。
```
==四：总结==

|知识点|核心要点|
|---|---|
|**核心目的**|减少HTTP请求次数，提升页面加载速度|
|**核心属性**|`background-image` + `background-position`|
|**坐标规则**|精灵图左上角为(0,0)，目标图标的位置坐标取**负值**[](https://cloud.tencent.cn/developer/article/2271802?from=15425#1)|
|**适用范围**|主要针对**小背景图片**，如导航栏图标、按钮背景等[](https://blog.csdn.net/artist123abbb/article/details/144982064?ops_request_misc=elastic_search_misc&request_id=12b0b04a0bdf6ee91a4bd96a59c24bf8&biz_id=&utm_medium=distribute.pc_search_result.none-task-special_column-2~all~ElasticSearch~search_v2-13-12824072-null-null.142%5Ev102%5Epc_search_result_base2&utm_term=%E6%88%91%E4%BB%AC%E4%B8%80%E8%B5%B7%E5%AD%A6%E5%89%8D%E7%AB%AF#1)|
|**注意事项**|精灵图维护成本较高，更新图标需要重新生成整张大图[](https://developer.aliyun.com/article/1567216)|

**⚠️ 注意事项**：

- 精灵图技术在现代前端开发中，已逐渐被**字体图标（iconfont）** 和 **SVG Sprite** 取代，因为后者在维护性和灵活性上更有优势。
    
- 但如果遇到需要**位图（PNG/JPG）** 的场景（如照片、复杂插画），精灵图依然是一个有效的优化手段。