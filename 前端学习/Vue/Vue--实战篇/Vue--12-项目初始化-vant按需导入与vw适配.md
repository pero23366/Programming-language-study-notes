# Vue--12 · 项目初始化 · vant 按需导入 · postcss vw 适配

> **对应课程**：106-108（黑马 `BV1HV4y1a7n4`，3 集 / 约 1 小时 1 分）
> **读法**：这一轮是**开新项目**，前 20 分钟在点鼠标（创建 + 清理），真正要理解的是两件事：**为什么组件库必须按需引入**、**vw 到底把 px 换成了什么**。
> **本轮定位**：从"学 API"切换到"做项目"。106 建壳、107 装 UI 库、108 装适配——三件事做完，后面 109-139 全在这个壳里长出来。
> **跳过了 Vue--11（100-105 购物车案例）**：那 6 集是把 091-099 的 vuex 用一遍，没有新概念；你直接进商城项目，遇到的组合问题一样会来（而且更真实）。
> **前置**：Vue--08（`vue create` 自定义创建）、Vue--06（路由）、Vue--10（vuex 分模块）。

---

==一：概念==

## 1. 重建一个"商城"壳子（106）

### 1.1 为什么不能接着用上一个项目

上一个项目（`lint-demo` / `vuex-demo`）是为学 vuex 建的，里面塞满了实验代码。商城项目要的是**干净起点**，而且要多勾两个特性。

| 需求 | 上一个项目有吗 |
|---|---|
| 路由 | 可能没勾 |
| Vuex | 有了 |
| **Less** | 不一定有 |
| **移动端适配** | 完全没有 |
| 干净的 `views/` | 塞满了实验页 |

**结论：重新 `vue create` 一个。** 项目名建议 `vue-shop` 或 `hm-shop`（课程叫 `hm_shop` / `toutiao` 一类的，无所谓）。

### 1.2 这一轮该勾什么（和 Vue--08 的差别）

| 选项 | 选 | 和 Vue--08 的差别 |
|---|---|---|
| Babel | ✅ | 同 |
| TypeScript | ❌ | 同 |
| Router | ✅ | 同，但这次**history 模式**必须 `Y` |
| Vuex | ✅ | 同 |
| **CSS Pre-processors** | ✅ **Less** | 上次可勾可不勾，这次**必须**（vant 主题定制要用） |
| Linter / Formatter | ✅ Standard | 同 |
| 单元测试 / E2E | ❌ | 同 |

后面四个问题照旧：`2.x` → `history: Y` → `Standard` → `Lint on save` → `dedicated` → 不存预设。

### 1.3 清理默认内容（14 分钟里大半在这）

生成的项目自带一个示例页（`views/HomeView.vue` + `components/HelloWorld.vue`）。**全删掉，只留骨架**：

| 文件 | 怎么处理 |
|---|---|
| `src/components/HelloWorld.vue` | **删** |
| `src/views/HomeView.vue` | 内容清空，只留 `<template><div>首页</div></template>` |
| `src/views/AboutView.vue` | 可删（路由表里也要删对应项） |
| `src/router/index.js` | 只留一个 `/` 指向 Home |
| `src/App.vue` | 只留 `<router-view/>` |
| `src/assets/logo.png` | 删 |

`App.vue` 清理后长这样（**注意 Standard 风格**）：

```html
<template>
  <div id="app">
    <router-view/>
  </div>
</template>
```

> ⚠️ **删组件要连带删路由**：`router/index.js` 里 `import AboutView` 那行不删，会报 `Failed to resolve component` 或直接编译失败。

### 1.4 别忘 viewport meta

`public/index.html` 的 `<head>` 里要有这一行（Vue CLI 默认已生成）：

```html
<meta name="viewport" content="width=device-width,initial-scale=1.0">
```

**没有它，vw 会算错。** 因为在没有 viewport 声明的移动浏览器里，视口宽度默认是 980px 左右，`1vw` 就变成了 9.8px 而不是 3.75px。

---

## 2. vant：为什么用，怎么按需（107）

### 2.1 组件库解决什么

商城里 80% 的界面元素是"别人写过一万遍"的：按钮、单元格、搜索框、轮播、数字输入框、弹出层、Toast。

| 自己写 | 用组件库 |
|---|---|
| 每个组件的交互细节都要处理（点击态、禁用、无障碍） | 直接用 |
| 视觉风格要自己统一 | 自带设计规范 |
| 移动端手势（滑动、回弹）要自己写 | 自带 |
| **体积可控** | **可能很大**（这也是按需引入存在的理由） |

**vant** 是有赞开源的移动端组件库。版本配对必须先记住：

| Vue 版本 | vant 版本 | 安装 |
|---|---|---|
| **Vue 2** | **Vant 2** | `npm i vant@latest-v2 -S` |
| Vue 3 | Vant 3 / 4 | `npm i vant` |

> 🔴 装错版本的典型症状：`import Vant from 'vant'` 报 `Cannot read property 'version' of undefined`，或者 `Vue.use(Vant)` 之后组件全不渲染。**本课程全程 Vue2 → Vant 2。**

### 2.2 全量引入：三行，但代价很大

```js
import Vant from 'vant'
import 'vant/lib/index.css'
Vue.use(Vant)
```

三行搞定，所有组件可用。**问题在体积**：

| 方案 | 打包后（gzip 前） | 用到的组件 |
|---|---|---|
| 全量引入 | **约 500KB+**（JS + CSS 全带上） | 你只用了 5 个 |
| 按需引入 | 约 50-80KB（只带你用的） | 5 个 |

**多出来的 400 多 KB 全是没用的组件。** 移动端用户 4G 下多等 1-2 秒，转化率就掉——这不是洁癖，是成本。

### 2.3 按需引入：靠 Babel 插件在"编译期"改写 import

**① 装插件**

```bash
npm i babel-plugin-import -D
```

**② 改 `babel.config.js`**

```js
module.exports = {
  presets: ['@vue/cli-plugin-babel/preset'],
  plugins: [
    ['import', { libraryName: 'vant', libraryDirectory: 'es', style: true }, 'vant']
  ]
}
```

**③ 正常写 import，插件帮你改**

```js
import { Button, Cell } from 'vant'
Vue.use(Button)
Vue.use(Cell)
```

插件在编译时把上面这行改写成：

```js
import Button from 'vant/es/button'
import 'vant/es/button/style/index'
// Cell 同理
```

**这就是"按需"的全部机制**：你写的是"库级 import"，插件翻译成"文件级 import"。

### 2.4 🔴 为什么必须配这个插件

因为**`import { Button } from 'vant'` 默认并不省体积**。

```
ES 模块的 tree-shaking（摇树优化）能删掉没用到的导出
   ↓ 但前提是：包本身就是 ES 模块，且 sideEffects 声明干净
vant 的 lib/ 是 CommonJS 产物 → 摇不动
vant 的 es/ 是 ES 模块产物  → 能摇，但要构建工具真的按 ESM 处理
```

**实际结果**：不配插件时，Webpack 打进来的是 `vant/lib/index.js`（全量 CJS），体积跟全量引入几乎一样。

> **这就是"按需引入"这个词最容易误会的点**：你以为 `import { Button }` 就是按需了，**其实按需是靠 `babel-plugin-import` 这个插件实现的**，不是靠 ES 模块语法。

### 2.5 三个必看细节

**① 配置项 `libraryDirectory: 'es'`** —— 指向 ESM 目录。写 `'lib'` 也能跑，但 `lib` 是 CJS，等于白配。

**② `style: true`** —— 自动引入该组件的样式。少了它，组件能渲染但**没有样式**（挤成一团），**不报错**。

**③ 第三个参数 `'vant'`** —— 插件实例的唯一标识。**没有它，多个库同时用这个插件时会互相覆盖配置。**

**④ 改完 `babel.config.js` 必须重启 `npm run serve`** —— 和 Vue--08 §5 说的 `vue.config.js` 一个道理，热更新不重读 babel 配置。

### 2.6 注册：`Vue.use` 还是局部注册

```js
// 方式一：全局注册（Vue.use(Button) 后，任何组件都能用 <van-button>）
Vue.use(Button)
```

```js
// 方式二：局部注册（只在这个组件用）
components: { [Button.name]: Button }
```

| | 全局 `Vue.use` | 局部 `components` |
|---|---|---|
| 写法 | 简单 | 每个文件都要写 |
| 体积 | 一样（按需后只多这一份） | 一样 |
| 适合 | **商城项目**（到处都用） | 只在一处用的重组件 |

**课程用全局注册。** 注意 `Vue.use(Button)` 是在 `main.js` 里写的——**但那样 `main.js` 会变长**。工程上常见的做法是建 `src/utils/vant.js` 集中注册，`main.js` 里一行 `import './utils/vant'`。

> ⚠️ **漏了 `Vue.use` 的后果**：模板里写 `<van-button>按钮</van-button>`，页面**什么都不显示**（浏览器把未知标签当普通行内元素，`van-button` 里没内容就看不见），控制台只有一行警告：
> `[Vue warn]: Unknown custom element: <van-button>`
> **这是本项目最高频的"静默失败"。**

### 2.7 函数式组件的特殊之处

`Toast` / `Dialog` / `Notify` 这类**不写在模板里**的组件，用法不同：

```js
import { Toast } from 'vant'
Toast('提示内容')
```

**它们同样需要 `style: true` 才能带样式**，但**不需要 `Vue.use`**（除非你要 `this.$toast` 这种写法）。112 会专门讲 Toast，这里只要知道"vant 有两种组件形态"。

---

## 3. vw 适配：px 到底该换成什么（108）

### 3.1 问题在哪

设计稿是 **375px 宽**（iPhone 6/7/8 的逻辑宽度）。你在 CSS 里照抄：

```css
.box { width: 375px; height: 100px; }
```

在 **iPhone 14 Pro Max（430px 宽）** 上：卡片只占 375/430 = **87%**，右边留白 55px。
在 **iPhone SE（320px 宽）** 上：卡片 **溢出**，横向滚动条出现。

**你要的不是"375 个像素"，是"整个屏幕宽"。** 所以单位必须跟着屏幕变。

### 3.2 三种方案

| 方案 | 怎么做 | 优点 | 缺点 |
|---|---|---|---|
| **固定 px** | 照抄设计稿 | 简单 | 大小屏比例全错 |
| **rem + JS** | 用 JS 算 `html` 的 `font-size`，CSS 写 `rem` | 兼容老浏览器 | 要跑一段 JS，首屏可能闪一下 |
| **vw** | CSS 原生单位，`1vw = 视口宽度的 1%` | 纯 CSS、无 JS、无闪动 | 老浏览器不支持（iOS 8 以下） |

**课程选 vw**，理由就是第三条：**不用 JS**。

### 3.3 vw 是什么

```
视口宽度 = 100vw
设计稿宽 375px → 100vw
所以 1px → 100/375 vw ≈ 0.26667vw
```

**换算不用你算**，`postcss-px-to-viewport` 在编译时自动改：

```css
/* 你写的 */      .box { width: 375px; }
/* 编译后 */      .box { width: 100vw; }
```

### 3.4 配置

**① 装插件**

```bash
npm i postcss-px-to-viewport -D
```

**② 建 `postcss.config.js`（项目根）**

```js
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,
      unitPrecision: 5,
      minPixelValue: 1
    }
  }
}
```

**③ 重启 `npm run serve`**（postcss 配置也是启动时读的）

| 配置项 | 值 | 干什么 |
|---|---|---|
| `viewportWidth` | **375** | **设计稿宽度**，唯一的必填项 |
| `unitPrecision` | 5 | 换算后保留 5 位小数 |
| `minPixelValue` | 1 | **小于等于 1px 不转换**（保住 1px 边框） |
| `unitToConvert` | `'px'` | 要转换的单位（默认 px） |
| `propList` | `['*']` | 哪些属性转（`['*']` 全转，`['width','height']` 只转这两个） |
| `selectorBlackList` | `['.ignore']` | 这些选择器**不转** |
| `mediaQuery` | `false` | 媒体查询里的 px 要不要转 |
| `exclude` | `/node_modules/` | 哪些文件跳过 |

### 3.5 🔴 `minPixelValue: 1` 为什么必须给

```css
.border { border: 1px solid #eee; }
```

不设 `minPixelValue` 时，`1px` 会被转成 `0.26667vw`：

| 设备宽度 | 0.26667vw 实际是 | 结果 |
|---|---|---|
| 375px | 1px | 正常 |
| 320px | 0.85px | 浏览器渲染成 **0 或极淡** |
| 430px | 1.15px | 略粗 |

**手机上的"1px 边框消失"有一半是这个原因。** 设 `minPixelValue: 1` 就是让 `≤1px` 的保持不动。

### 3.6 🔴 一个课程没说的坑：autoprefixer 可能被顶掉

Vue CLI 内置了 **autoprefixer**（根据 `.browserslistrc` 自动加 `-webkit-` 前缀）。**你在项目根建了 `postcss.config.js`，它就以这个文件为准**，内置的那份不再叠加。

结果：**你写的 `display: flex` 不再自动补 `-webkit-box` 之类的前缀**，而且**不报错、不提示**。

| 现象 | 原因 |
|---|---|
| 样式在新手机上正常，老机型错位 | 前缀丢了 |
| `postcss.config.js` 加了插件后，别的 CSS 行为变了 | 同上 |

**处方**：需要前缀就在文件里补上：

```js
plugins: {
  'postcss-px-to-viewport': { viewportWidth: 375, minPixelValue: 1 },
  autoprefixer: {}
}
```

> `autoprefixer` 是 Vue CLI 已装的依赖，直接 require 名字即可。**课程没讲这一条，因为课上机型新；你自己做项目时留意。**

### 3.7 哪些 px 不该转

| 场景 | 怎么办 |
|---|---|
| 1px 边框 | `minPixelValue: 1` |
| 第三方库的样式（vant 自带） | vant 是按 375 设计的，转不转都行；转错反而怪 → 可 `exclude: /node_modules/` |
| 某个元素必须固定大小 | `selectorBlackList: ['.no-vw']` |
| 单行跳过 | 部分版本支持 `/* px-to-viewport-ignore-next */` 注释，**版本差异大，别依赖** |

---

==二：格式==

## 1. 三步命令

```bash
vue create vue-shop          # ① 勾 Router/Vuex/Less/Lint + Vue2 + history
npm i vant@latest-v2 -S      # ② UI 库
npm i babel-plugin-import postcss-px-to-viewport -D
```

## 2. 两个配置文件模板

**`babel.config.js`**

```js
module.exports = {
  presets: ['@vue/cli-plugin-babel/preset'],
  plugins: [
    ['import', { libraryName: 'vant', libraryDirectory: 'es', style: true }, 'vant']
  ]
}
```

**`postcss.config.js`**

```js
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,
      unitPrecision: 5,
      minPixelValue: 1
    },
    autoprefixer: {}
  }
}
```

## 3. `main.js` 收口

```js
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './utils/vant'          // ← 集中注册 vant 组件

Vue.config.productionTip = false
new Vue({ router, store, render: h => h(App) }).$mount('#app')
```

## 4. 报错 / 异常对照

| 现象 | 根因 | 处方 |
|---|---|---|
| `Unknown custom element: <van-button>` | 忘 `Vue.use(Button)` | 注册 |
| 组件有、但样式全无（挤成一团） | `style: true` 漏了 | 补配置 + 重启 |
| 改了 babel/postcss 配置无效 | 没重启 dev-server | `Ctrl+C` 重启 |
| `Cannot read property 'version' of undefined` | vant 版本配错 | Vue2 → `vant@latest-v2` |
| 1px 边框在某些机型消失 | 被转成 `0.26vw` | `minPixelValue: 1` |
| 页面在手机上整体缩放异常 | 缺 viewport meta | 补 `<meta name="viewport">` |
| 打包体积没变小 | 没配 `babel-plugin-import`，或 `libraryDirectory: 'lib'` | 改 `'es'` |

---

==三：代码==

## 1. 实验 A：看着体积变一次

**① 先不配插件**，只写 `import { Button } from 'vant'`，`npm run build`，记下 `dist/js/` 总大小。

**② 配上 `babel-plugin-import`**，重新 build，再记一次。

**③ 期望**：第二条数字明显小（差 300KB 上下）。

> 这一条比任何说明都有说服力：**"按需引入"不是语法糖，是构建期改写。**

## 2. 实验 B：`style: true` 漏了的后果

**① 把 `style: true` 改成 `style: false`**，重启

**② 页面放一个 `<van-button type="primary">按钮</van-button>`**

**③ 观察**：按钮**还在**，但没颜色、没圆角、没内边距——**变成一行裸文字，且控制台无报错**。

**④ 改回来** → 恢复正常。**记住这个"有结构没皮肤"的形态**，以后一眼能认出来。

## 3. 实验 C：看 px 被改成了什么

**① `views/HomeView.vue` 里写**

```css
.box { width: 375px; height: 100px; background: #f00; }
```

**② 重启，浏览器 DevTools 看这个元素**

```
width: 100vw;      ← 375px 被换掉了
height: 26.66667vw;
```

**③ 把窗口拉宽**（或 DevTools 切设备）：盒子跟着屏幕一起变宽，**始终占满整屏**。

## 4. 实验 D：`minPixelValue` 的作用

**① 加上 `border: 1px solid #000`**，`minPixelValue` 先注释掉

**② DevTools 里看** → `border-width: 0.26667vw`

**③ 恢复 `minPixelValue: 1`** → `border-width: 1px`（原样保留）

## 5. 实验 E：封装一个 vant 注册文件

**`src/utils/vant.js`**

```js
import Vue from 'vue'
import { Button, Cell, CellGroup, Search } from 'vant'

[Button, Cell, CellGroup, Search].forEach(c => Vue.use(c))
```

**`main.js`** 只加一行 `import './utils/vant'`

**好处**：以后每多用一个组件，只改这一个文件；`main.js` 永远三行导入。

---

==四：总结==

## 1. 一句话记住三个

- **按需引入靠 `babel-plugin-import` 在编译期改写 import**，不是靠你写 `import { Button }`。
- **`style: true` 决定"有没有皮肤"，`Vue.use` 决定"存不存在"**——两个都能静默漏。
- **vw 把设计稿宽度当 100vw**，`viewportWidth: 375` 就是告诉插件"我的稿子多宽"。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 版本配对 | Vue2 → **`vant@latest-v2`** |
| 按需三件套 | 装 `babel-plugin-import` + 配 `babel.config.js` + 写 `import { X } from 'vant'` |
| 关键配置 | `libraryDirectory: 'es'`、`style: true`、第三参数 `'vant'` |
| 注册 | `Vue.use(Button)` → `<van-button>` |
| 漏注册的症状 | `Unknown custom element: <van-button>` |
| 漏 `style` 的症状 | 组件在、样式无、**不报错** |
| 适配选型 | **vw**：纯 CSS、不用 JS |
| 核心换算 | 设计稿 375 → `1px = 100/375vw ≈ 0.26667vw` |
| 必配项 | `viewportWidth: 375` + **`minPixelValue: 1`** |
| 改配置后 | **必须重启 dev-server** |
| 隐藏坑 | 自建 `postcss.config.js` 会顶掉内置 autoprefixer |

## 3. ⭐ 收敛时刻

**这一轮把三件事接上了：**

**① Vue--08 的 `vue create` → 这次是"带着需求勾选"**

Vue--08 你是照着课程勾的，这次你该能自己回答"为什么必须勾 Less""为什么 history 要 Y"——**history 模式在 109 的路由设计里会直接决定地址长什么样**。

**② Vue--09~10 的模块化 → 有了"utils"这个位置**

`src/utils/vant.js` 是个新东西：**它不是组件、不是页面、不是 store，而是"配置的收口处"**。后面 111 的 `api/`、15 轮的 `utils/auth.js` 都是同一类文件。**项目越大，"收口"越多。**

**③ Vue--03 的"工程化" → 现在完整了**

`vue create` 生成结构 → 107 装 UI 库 → 108 装适配 → 这三步之后，**你的项目第一次具备了"能交给别人接着写"的状态**。

**④ 顺带解释了一个老疑问：为什么 CSS 里写 px 还能适配**

因为**你写的 px 在编译后根本不存在了**。这和 TypeScript 编译掉类型、Babel 编译掉新语法是同一件事：**源码不是产物。** 你在 Vue--08 学的 lint、这一轮学的 postcss，都工作在同一层——**构建管道**。

## 4. 静默失败清单

这一轮全是"**页面坏了但不报错**"：

| # | 做法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | 忘 `Vue.use(Button)` | 页面空白 + 一行 `Unknown custom element` | 组件没注册 |
| 2 | `style: true` 漏了 | 组件在、没样式、**无报错** | 样式没引入 |
| 3 | 改了 `babel.config.js` 不重启 | 配置不生效，像没改过 | 启动时读一次 |
| 4 | `libraryDirectory: 'lib'` | 体积没降 | `lib` 是 CJS |
| 5 | 按需插件第三参数漏写 | 单库没事，多库时配置互覆盖 | 唯一标识 |
| 6 | 装了 `vant`（4.x）配 Vue2 | 一堆 `undefined` | 版本不配 |
| 7 | `minPixelValue` 没设 | 1px 边框部分机型消失 | 被转成 0.27vw |
| 8 | 自建 `postcss.config.js` | 前缀静默消失 | 顶掉内置 autoprefixer |
| 9 | 缺 viewport meta | vw 全算错（1vw≈9.8px） | 默认视口宽 980 |
| 10 | `selectorBlackList: ['.ignore']` 写错类名 | 那个元素照样被转 | 黑名单是**精确前缀匹配** |

**第 2 条和第 8 条最阴**：一个让 UI "裸奔"，一个让兼容性悄悄退化，**都不报错**。

**工程上怎么防**：

- vant 组件注册**集中到一个文件**，漏了只查一处；
- 首次跑起来就**逐个组件看外观**，别等到写十个页面才发现"全局没样式"；
- `postcss.config.js` **一次写全**（含 autoprefixer），别反复改；
- 用 `npm run build` 的产物大小做**回归基线**——体积突变 300KB 就说明按需失效了。

**这不是 bug，是代价**：前端构建是**多段管道串联**（babel → postcss → webpack），每段配置错都表现为"结果不对"而不是"过程报错"。**学会看产物（DevTools 的 computed style、dist 的体积）比会写配置更重要。**

## 5. C# 类比可用度

| C# / .NET 侧 | 前端侧 | 可用度 | 注意 |
|---|---|:--:|---|
| DevExpress / HandyControl / AntDesign Blazor | vant | ⭐⭐⭐ | 都是"整套 UI 控件" |
| NuGet 引整个包 vs 引子包 | 全量 vs 按需引入 | ⭐⭐ | .NET 靠拆包，前端靠编译期改写 |
| MSBuild 的 Target 管道（编译 → 复制 → 打包） | babel → postcss → webpack | ⭐⭐⭐ | 都是多段串联，**任一段错都只表现为产物异常** |
| WPF 的 `Grid` 星号比例 `*` / `2*` | vw 按比例撑满 | ⭐⭐ | 目标一致：跟着容器变 |
| `Application.Resources` 里注册样式 | `style: true` 引入组件样式 | ⭐⭐ | 都"不引就没皮肤" |
| `#if DEBUG` 条件编译 | `process.env.NODE_ENV` 分支 | ⭐⭐ | 都按环境裁剪 |
| `Directory.Build.props`（集中配置） | `utils/vant.js`（集中注册） | ⭐⭐⭐ | 都是"配置收口到一处" |

**用法建议**：把 `postcss-px-to-viewport` 理解成 **MSBuild 里的一个 `Target`**：你写的 CSS 是"源文件"，它跑在编译期，产物里已经没有 px 了。

**C# 里没有的东西**：**tree-shaking**。.NET 引一个包就是整个程序集，不会因为"只用了其中一个类"而变小（有 ILLink/剪裁，但那是另一套机制，且有反射失效风险）。**前端的按需引入靠的是"改写 import 路径"，这才是它必须装插件的根本原因。**

## 6. 解锁边界

**本轮新解锁**

- 商城项目的 `vue create` 勾选组合（Router + Vuex + **Less** + Standard，history 模式）
- 项目初始化清理：`App.vue` / `router/index.js` / `views/` 三处要一起改
- viewport meta 与 vw 的关系（**没有它就全算错**）
- vant 版本配对（Vue2 → Vant 2）
- 全量引入 vs 按需引入的真实体积差；`babel-plugin-import` 的改写机制
- 三个关键配置：`libraryDirectory: 'es'` / `style: true` / 第三参数 `'vant'`
- 组件注册两种粒度；函数式组件（Toast 类）的特殊用法
- vw 原理与换算；`postcss-px-to-viewport` 的 8 个配置项
- `minPixelValue: 1` 与 1px 边框
- **自建 `postcss.config.js` 顶掉 autoprefixer** 这个隐藏坑

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| vant 主题定制（Less 变量覆盖） | 课程未讲；用到时查 `@import '~vant/lib/index.less'` |
| `Toast` 的完整用法 | **Vue--14（112）** |
| 路由设计 + 一级路由配置 | **Vue--13（109）** |
| 登录页静态布局 + 图形验证码 | **Vue--13（110）** |
| axios 封装 / 响应拦截器 | Vue--14（111-115） |
| token 存 vuex / storage | Vue--15（116-119） |
| rem 方案 / flexible.js | 课程未用，知道有这条路线即可 |
| `postcss-pxtorem` | 同上（它的配置项和 vw 版几乎一样） |

⚠️ **术语撞车登记**（本轮新增两条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `vw` | CSS 视口宽度单位 | VW 汽车品牌 / 虚拟机 | 看上下文，CSS 里就是单位 |
| `style` | HTML 属性 | `babel-plugin-import` 的开关 | `style: true` 里是"要不要带样式文件" |

## 7. 下一轮预告

**Vue--13（109-110，2 集 / 约 1 小时 17 分）：路由设计 + 登录页静态布局 + 图形验证码**

下一轮开始真正写页面：

- **109（32 分钟）** 一级路由配置 + 二级路由的目录规划（`views/layout/` + `views/login/`）——注意这是你第一次遇到**"嵌套路由 + 布局组件"**；
- **110（45 分钟）** 登录页静态布局 + **图形验证码**（用 canvas 画、或调接口拿 base64）。110 是纯体力活，但它是 111 起"接口封装"的靶子。

开跑之前请确认：

1. 项目能 `npm run serve`，页面只有一个空白的 `router-view`；
2. `<van-button>` 能显示成**有样式的按钮**（不是裸文字）；
3. DevTools 里 `375px` 已经变成 `100vw`。

**建议开新对话**——110 那 45 分钟的布局代码量大，跟这一轮的配置文件不是一类东西。
