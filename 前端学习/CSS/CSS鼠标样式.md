### 🎯 一、概念：鼠标指针的“表情”

`cursor` 属性用于定义鼠标指针在**特定元素上**时的显示样式[](http://mdn.org.cn/en-US/docs/Web/CSS/cursor)。它就像鼠标的“表情”，能提前告诉用户当前区域可以执行什么操作，比如点击、拖动或输入文本[](https://blog.csdn.net/black_cat7/article/details/154834950?ops_request_misc=elastic_search_misc&request_id=2d678ea833bc1615af1a14a8c5fb3e14&utm_term=%e9%bc%a0%e6%a0%87%e6%8c%87%e9%92%88%e6%a0%b7%e5%bc%8f#1)。

**常见取值速查表**：

|值|效果|典型用途|
|---|---|---|
|`default`|默认箭头|普通元素|
|`pointer`|手型|按钮、链接|
|`text`|文本输入光标|输入框、文本区域|
|`move`|移动十字箭头|可拖拽元素|
|`not-allowed`|禁止符号|禁用按钮|
|`wait`|等待/加载|加载中的页面|
|`help`|带问号的箭头|帮助提示|
|`grab` / `grabbing`|抓取/抓取中|拖拽交互[](https://blog.csdn.net/black_cat7/article/details/154834950?ops_request_misc=elastic_search_misc&request_id=2d678ea833bc1615af1a14a8c5fb3e14&utm_term=%e9%bc%a0%e6%a0%87%e6%8c%87%e9%92%88%e6%a0%b7%e5%bc%8f#1)|
|`crosshair`|十字光标|精准定位|
|`zoom-in` / `zoom-out`|放大/缩小|图片查看器|

### 📐 二、格式：语法与自定义

**1. 基本语法**

```css

选择器 {
    cursor: 关键字值;
}

例如 `button { cursor: pointer; }` 能让按钮悬停时变成手型[](https://developer.aliyun.com/article/1660742)。
```

**2. 自定义光标**  
可以使用 `url()` 加载自定义图片，**必须**以关键字值作为最终备选方案[](http://mdn.org.cn/en-US/docs/Web/CSS/cursor)：

```css

.custom {
    cursor: url('custom.cur'), auto;
}

- 推荐使用 `.cur` 或 `.ico` 格式，图片**建议小于 32x32 像素**[](https://developer.aliyun.com/article/1660742)。
    
- 可以为 URL 指定热点坐标（如 `url(cursor.png) 4 12, auto`），但支持度不一[](http://mdn.org.cn/en-US/docs/Web/CSS/cursor)。
    
```

### 💻 三、代码：小兔鲜项目实战

**1. 按钮和链接**：添加 `cursor: pointer;`，让用户知道可以点击。

```css

.btn, .nav a, .more {
    cursor: pointer;
}
```

**2. 禁用状态**：添加 `cursor: not-allowed;`，提示用户不可操作。

```css

.btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
```

**3. 拖拽交互**：使用 `grab` 和 `grabbing` 组合。

```css

.draggable {
    cursor: grab;
}
.draggable:active {
    cursor: grabbing;
}
```

这个技巧在 3D 展示或拖拽排序场景中能显著提升体验[](https://blog.csdn.net/black_cat7/article/details/154834950?ops_request_misc=elastic_search_misc&request_id=2d678ea833bc1615af1a14a8c5fb3e14&utm_term=%e9%bc%a0%e6%a0%87%e6%8c%87%e9%92%88%e6%a0%b7%e5%bc%8f#1)。

### 💎 四、总结

|知识点|核心要点|
|---|---|
|**作用**|提前告知用户元素上可执行的操作，提升交互体验。|
|**常用值**|`pointer`（手型）、`text`（文本）、`move`（移动）、`not-allowed`（禁止）。|
|**自定义**|`url()` 加载图片，**必须**以关键字（如 `auto`）作为最终备选。|
|**最佳实践**|只在对的位置使用恰当的指针，不要滥用以免造成困惑[](https://css-tricks.com/next-level-css-styling-for-cursors/?utm_source=tailwindweekly.com&utm_medium=referral&utm_campaign=tailwind-weekly-190-cursor-styling-text-balancing-and-dev-friendly-knowledge-tools-for-easter)。|