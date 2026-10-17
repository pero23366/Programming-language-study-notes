==一：概念==

**断点配置**，就是为响应式布局设定“规则切换点”。当浏览器宽度达到某个断点值时，页面的布局或样式就会发生改变，比如从单列变成多列，或者导航栏从完整菜单变成汉堡菜单。

核心思想是**内容优先**：断点不应该由具体设备决定，而应该由**内容在什么宽度下开始“变形”或“错乱”** 来决定。断点设置得越少，代码维护成本越低；设置得越多，布局越精细，但复杂度也越高。[](https://www.hostinger.com/ng/tutorials/css-breakpoints/#1)

==二：格式==

断点配置通过 **`@media` 媒体查询**实现。语法是：

```css

@media (条件) {
  /* 当条件满足时，应用的样式 */
}
```

两种常用写法：

- **`max-width`（向下兼容）**：屏幕宽度**小于等于**某个值时生效。例如 `@media (max-width: 599px) { ... }`。
    
- **`min-width`（向上兼容/移动优先）**：屏幕宽度**大于等于**某个值时生效。例如 `@media (min-width: 768px) { ... }`。
    

**常用断点值**（可参考，但建议根据自己项目的内容来定）：

|场景|典型宽度|说明|
|---|---|---|
|**手机竖屏**|≤ 599px|单列布局，触控优先[](https://cloud.baidu.com/article/5637136#1)|
|**手机横屏/小平板**|600px ~ 767px|可开始出现两列|
|**平板**|768px ~ 1199px|多列布局，信息密度提升[](https://cloud.baidu.com/article/5637136#1)|
|**桌面端**|≥ 1200px|固定最大宽度，多列+侧边栏[](https://cloud.baidu.com/article/5637136#1)|

很多框架会内置自己的断点系统，比如 Bootstrap 默认使用 `576px`、`768px`、`992px`、`1200px`、`1400px`；Tailwind CSS 内置 `640px`、`768px`、`1024px`、`1280px`、`1536px`。[](https://m.w3cschool.cn/tailwind_css/tailwind_css-wzop3paj.html#1)

==三：代码==

**移动优先策略（推荐）**：先写移动端的基础样式（不写媒体查询），再用 `min-width` 逐步向上增强。[](https://cloud.baidu.com/article/5637144#1)

```css

/* ========== 移动端基础样式（默认，所有屏幕生效） ========== */
.container {
    width: 100%;
    padding: 15px;
}
.card {
    width: 100%;
    margin-bottom: 20px;
}
/* ========== 平板断点（≥ 768px） ========== */
@media (min-width: 768px) {
    .container {
        max-width: 720px;
        margin: 0 auto;
    }
    .card {
        display: inline-block;
        width: calc(50% - 10px); /* 两列 */
    }
}
/* ========== 桌面断点（≥ 1200px） ========== */
@media (min-width: 1200px) {
    .container {
        max-width: 1140px;
    }
    .card {
        width: calc(33.33% - 20px); /* 三列 */
    }
}
```

这样写的好处：小屏设备只加载基础样式，性能最优；大屏设备在基础样式上“叠加”增强规则，逻辑清晰。[](https://cloud.baidu.com/article/5637144#1)

**用 CSS 变量统一管理断点值**（注意：CSS变量不能直接用在 `@media` 的条件里，但可以用在样式值中统一间距、字体等）：

```css

:root {
    --space-unit: 8px;
    --space-m: calc(var(--space-unit) * 2);
}
.card {
    padding: var(--space-m);
}
```

Bootstrap 官方也说明：CSS变量可以用于JavaScript读取断点值，但**不能直接用在媒体查询的条件中**。

==四：总结==

|知识点|核心要点|
|---|---|
|**断点作用**|在特定屏幕宽度下切换布局，实现响应式|
|**核心语法**|`@media (min-width/max-width: 值) { ... }`|
|**移动优先**|先写移动端基础样式，再用 `min-width` 逐步增强|
|**断点选择**|遵循“内容优先”，根据内容何时错乱来定，不要盲目模仿设备尺寸|
|**常用参考值**|599px / 768px / 1200px 三档可覆盖大部分场景|
|**CSS变量限制**|不能用在 `@media` 条件中，但可用于统一管理间距、字体等值|
|**实践建议**|断点不要超过 4 个，否则CSS复杂度指数级上升|