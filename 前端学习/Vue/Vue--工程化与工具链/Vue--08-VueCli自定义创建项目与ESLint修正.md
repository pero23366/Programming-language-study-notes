# Vue--08 · VueCli 自定义创建项目 · ESLint 手动与自动修正

> **对应课程**：088-090（黑马 `BV1HV4y1a7n4`，3 集 / 约 38 分钟）
> **读法**：这一轮没有一行"Vue 语法"。全是**工具链**——脚手架、代码检查、自动修复。代码块只留能复现现象的最短片段。
> **本轮定位**：补 Vue--03 的工程化缺口。Vue--03 你知道了"代码要变成目录结构"，但目录是**手工搭**的；这一轮把"谁来生成这个目录"和"谁来管代码风格"补上。**088 解决"项目怎么来"，089-090 解决"项目里代码该长什么样"。**
> **前置**：Vue--03（工程化与组件注册）。**后续**：Vue--09 起的 vuex 全都跑在这个脚手架里，所以这一轮的命令你必须能自己敲出来。

---

==一：概念==

## 1. 脚手架：为什么不手工搭（088）

### 1.1 手搭项目缺什么

Vue--03 里你的"工程化"是这样的：`npm init -y` → 装 `vue` → 手写一个 `index.html` + 一个 `main.js`。能跑，但缺四样东西：

| 缺的东西 | 后果 |
|---|---|
| 模块打包（webpack） | `.vue` 文件浏览器不认识，要靠工具编译 |
| 语法降级（Babel） | 你写的新语法在旧浏览器里直接报错 |
| 开发服务器（dev-server） | 改完要手动刷新，没有热更新 |
| 代码检查（ESLint） | 缩进、引号、分号全凭个人手感，多人协作没法统一 |

**这四样每样都有配置，加起来十几个文件、几百行配置。** 你现在的目标不是学 webpack 配置，所以标准答案是：**用官方脚手架 `@vue/cli` 一次生成好，你只写业务代码。**

> ⚠️ 术语先切开：**Vue CLI**（命令行工具，生成项目）≠ **Vue**（框架本体）≠ **vue-cli-service**（生成出来的项目里那个跑 dev/build 的脚本）。三者名字像，职责完全不同。

### 1.2 `vue create` 的三条路

```
vue create 项目名
```

敲下去后会让你选预设，只有三类：

| 选项 | 含义 | 什么时候选 |
|---|---|---|
| `Default ([Vue 3] babel, eslint)` | 只装 Babel + ESLint，没有路由和状态 | 写 demo |
| `Default ([Vue 2] babel, eslint)` | 同上，Vue2 版 | 写 demo |
| `Manually select features` | **自选特性** | **学 vuex / 做商城，选这个** |

课程 088 讲的"自定义创建"就是第三条。**为什么必须自定义**：后面 091 起的 vuex、109 起的路由，都要在创建时就勾上，否则还得手工 `npm i` + 手工接线。

> 🔴 项目名不能带大写字母。`vue create VueDemo` 会直接拒绝——npm 包名规范不允许大写。

### 1.3 逐项选什么

勾选界面（空格选中、回车确认）：

```
? Check the features needed for your project:
 ◉ Babel
 ◯ TypeScript
 ◯ Progressive Web App (PWA) Support
 ◉ Router
 ◉ Vuex
 ◉ CSS Pre-processors
 ◉ Linter / Formatter
 ◯ Unit Testing
 ◯ E2E Testing
```

| 选项 | 课程怎么选 | 为什么 |
|---|:--:|---|
| Babel | ✅ 必选 | 把 ES6+ 降级成浏览器能跑的代码 |
| TypeScript | ❌ | 你学过 TS，但**课程这条线是 JS**；开了 TS 后面每集都要多讲类型，节奏会崩 |
| Router | ✅ | 109 起要写多页面 |
| Vuex | ✅ | 091 起整章都是它 |
| CSS Pre-processors | ✅ | 选 **Less**，后面 vant 主题定制要用 |
| Linter / Formatter | ✅ | 就是 089-090 的主角 |
| 单元测试 / E2E | ❌ | 另一个领域，本课程不涉及 |

后面还会连着问四个问题，**这四个决定的是"规则"而不是"功能"**：

| 问题 | 选什么 | 影响 |
|---|---|---|
| `Choose a version of Vue.js` | **2.x** | 选 3.x 的话模板写法全变，跟 091-139 的选项式代码不兼容 |
| `Use history mode for router?` | `Y` | 地址没有 `#`；**代价：生产部署要服务端配 fallback** |
| `Pick a linter / formatter config` | **`ESLint + Standard config`** | 决定 089 那 17 分钟里你被哪些规则骂 |
| `Pick additional lint features` | **`Lint on save`** | 保存即检查，不用手动跑命令 |
| `Where do you prefer placing config` | **`In dedicated config files`** | 配置各自成文件（`.eslintrc.js` 等），别塞 `package.json` |
| `Save this as a preset?` | `N` | 存了下次创建会多一个选项，学习阶段不存 |

> 🔵 **"Standard config" 不是"标准配置"的意思**，它是一个**具体风格流派**（[standardjs](https://standardjs.com)），核心主张：**不要分号、只用单引号、两空格缩进**。另一派 `Airbnb` 的主张正好相反（要分号）。选哪个不影响功能，只影响你以后被哪套规则挑刺。**公司项目里遇到的是哪套，就跟着哪套，不要争论。**

### 1.4 生成出来的东西

`vue create` 跑完，目录长这样（Vue CLI 5 + Vue2）：

```
vuex-demo/
├── public/
│   ├── favicon.ico
│   └── index.html          ← 唯一的 HTML，模板里只有 <div id="app">
├── src/
│   ├── assets/             ← 静态资源（会被 webpack 处理）
│   ├── components/         ← 通用组件
│   ├── views/              ← 页面级组件（配路由用）
│   ├── router/index.js     ← 路由表
│   ├── store/index.js      ← vuex 仓库，091 起在这写
│   ├── App.vue             ← 根组件
│   └── main.js             ← 入口：new Vue + 挂 router + 挂 store
├── .browserslistrc         ← 目标浏览器范围，Babel 按它降级
├── .eslintrc.js            ← ESLint 规则文件，089 改的就是它
├── babel.config.js
├── package.json
└── vue.config.js           ← 默认不生成，需要自己建
```

三个要点：

**① `public/index.html` 里没有 `<script src="main.js">`。** 脚本是 webpack 注入的，你改 HTML 也不会丢。

**② `main.js` 是唯一 `new Vue` 的地方**，后面所有组件都是它的子孙：

```js
new Vue({ router, store, render: h => h(App) }).$mount('#app')
```

**③ `vue.config.js` 默认不存在。** 要改 dev-server 端口、关 lint，得自己建这个文件——这是 089-090 里唯一会碰的配置文件。

### 1.5 三条命令

| 命令 | 实际执行 | 用途 |
|---|---|---|
| `npm run serve` | `vue-cli-service serve` | 起开发服务器（默认 8080），带热更新 |
| `npm run build` | `vue-cli-service build` | 打包到 `dist/`，产物给运维 |
| `npm run lint` | `vue-cli-service lint` | **检查并自动修**，就是 090 讲的 |

> ⚠️ 生成的 `package.json` 里 `lint` 后面**不带 `--fix`**，但 `vue-cli-service lint` 默认就是修复模式。想只看不修，加 `--no-fix`。这一条很多人误以为"要自己加 --fix"。

---

## 2. ESLint 是什么（089）

### 2.1 三个工具，三件不同的事

新手最容易糊成一团，先切开：

| 工具 | 干什么 | 什么时候跑 | 报错算不算失败 |
|---|---|---|---|
| **Babel** | 新语法 → 旧语法 | 构建时 | 语法错才失败 |
| **webpack** | 多文件 → 一个 bundle | 构建时 | 引用找不到才失败 |
| **ESLint** | **读你的源码，按规则挑刺** | 保存时 / `npm run lint` | **规则错可以只警告，不影响运行** |

**关键差别：ESLint 不改变代码行为，它只评价代码长相。** 一份 `if(x==1){alert(1)}` 和一份 `if (x === 1) { alert(1) }` 跑起来一模一样，但 Standard 只会放过后者。

> 所以 ESLint 报错时你的第一反应不该是"程序坏了"，而是"**这行代码不合本项目的规矩**"。程序可能完全正常。

### 2.2 报错信息怎么读

一条典型的 ESLint 报错长这样：

```
error: Missing space before function parentheses (space-before-function-paren)
    at src/views/HomeView.vue:14:23
```

拆成三段看：

| 段 | 内容 | 你可以拿它干什么 |
|---|---|---|
| 位置 | `src/views/HomeView.vue:14:23` | 第 14 行第 23 列 |
| 人话 | `Missing space before function parentheses` | 缺一个空格 |
| **规则名** | `(space-before-function-paren)` | **搜索 / 关掉 / 配置时用这个名字** |

**第三段是重点。** ESLint 有几百条规则，你不可能背完，也不需要。工作流永远是：**看规则名 → 搜"这条规则管什么" → 三选一处方**。

### 2.3 Standard 风格：会把你骂得最狠的十条

| 规则名 | 它要什么 | 反例 → 正例 |
|---|---|---|
| `semi` | **不要分号** | `let a = 1;` → `let a = 1` |
| `quotes` | 单引号 | `"abc"` → `'abc'` |
| `indent` | 2 空格 | 4 空格 → 2 空格 |
| `space-before-function-paren` | 函数名和 `()` 之间**要有空格** | `function foo()` → `function foo ()` |
| `comma-dangle` | 最后一项**不许**加逗号 | `{ a: 1, }` → `{ a: 1 }` |
| `key-spacing` / `comma-spacing` | 冒号后、逗号后要有空格 | `{a:1,b:2}` → `{ a: 1, b: 2 }` |
| `space-infix-ops` | 运算符两侧空格 | `a+b` → `a + b` |
| `eqeqeq` | 必须 `===` | `x == 1` → `x === 1` |
| `no-unused-vars` | 声明了必须用 | `const a = 1` 没用过 → 删掉 |
| `eol-last` | 文件末尾留一个空行 | 文件末尾没换行 → 补上 |

> 🔴 **`space-before-function-paren` 是 Standard 最反直觉的一条。** 一般人的直觉是 `foo()`，Standard 要求 `foo ()`。这不是它写错了，是它真的这么规定。**你会在 089 这集里被它反复打断。**

再补一条 **Vue 专属**的，不在 Standard 里而在 `eslint-plugin-vue` 里：

| 规则名 | 它要什么 | 报错原文 |
|---|---|---|
| `vue/multi-word-component-names` | 组件名必须**至少两个单词** | `Component name "Home" should always be multi-word` |

所以模板里叫 `HomeView.vue` 不叫 `Home.vue`——**这是为了躲 ESLint，不是为了好看**。

> ⚠️ 这条规则在 `eslint-plugin-vue` 8.x 才进入默认规则集（Vue CLI 5 用的就是 8.x）。课程录的时候插件可能是 7.x，所以课上没被这条骂过；**你自己新建项目一定会碰上**。这不是你写错了，是版本比你课新。

### 2.4 三种处方（这一节是本轮的核心）

看到报错，**永远只有三种处理方式**，从优先到谨慎排列：

| 处方 | 怎么做 | 什么时候用 |
|---|---|---|
| **① 改代码**（默认） | 按它要的改 | 99% 的情况 |
| **② 改规则** | `.eslintrc.js` 里把规则降级 | 整套规则跟团队习惯冲突（比如团队坚持要分号） |
| **③ 局部禁用** | 行内注释 / 文件头注释 | 极少数"我知道我违规但我必须这么写" |

**②的写法**——三级开关：

```js
rules: {
  'space-before-function-paren': 'off',   // 完全关掉
  semi: 'warn',                            // 只黄字提示，不红字
  quotes: ['error', 'double']              // 开着，但改成双引号
}
```

| 级别 | 字面量 | 数值 | 效果 |
|---|---|:--:|---|
| 关闭 | `'off'` | 0 | 不检查 |
| 警告 | `'warn'` | 1 | 黄字，**不阻塞** |
| 错误 | `'error'` | 2 | 红字，`npm run build` 会失败 |

**③的写法**——两种粒度：

```js
console.log('调试用')        // eslint-disable-line
/* eslint-disable no-console */   // 这行以下全关
```

> ⚠️ **③ 是逃逸舱口，不是常规操作。** 一个文件里出现三次以上 `eslint-disable`，说明你的规则配错了，回去用②。

### 2.5 🔴 一条必须澄清的误解

**"ESLint 报错 = 项目跑不起来"是错的。**

要分场景：

| 场景 | 报错后 |
|---|---|
| 浏览器里 | **完全不影响**。ESLint 根本不进浏览器 |
| `npm run serve` 且 `lintOnSave` 开着 | 终端打红字，**页面照常运行**（默认只当 warning） |
| `lintOnSave: 'error'` | 终端报错，**页面被 error overlay 盖住** |
| `npm run build` | **会失败**，打不出包 |

**这就是为什么很多人 `npm run serve` 好好的，一提交 CI 就红。** 工程上的做法：**保存时就让 ESLint 修（090），别等 build 时才发现。**

---

## 3. 自动修正：能修什么，不能修什么（090）

### 3.1 一条命令修掉大半

```bash
npm run lint
```

它会：**读所有 `.js` / `.vue` → 按规则检查 → 能自动修的当场改文件 → 修不了的列出来**。

**"当场改文件"意味着你的源码被改写了。** 所以第一次跑之前，确保 git 是干净的（有新文件先提交），否则你分不清哪些改动是 ESLint 干的。

### 3.2 哪些能自动修，哪些不能

这是本节最该背的一张表：

| 类型 | 例子 | 能自动修？ | 为什么 |
|---|---|:--:|---|
| **纯排版** | 分号、引号、缩进、空格、末尾空行 | ✅ | 有唯一正确答案 |
| **可推导的等价改写** | `==` → `===`（同类型时）、多余的 `,` | ✅ | 语义不变 |
| **删掉纯多余的东西** | 未使用的 import | ⚠️ 多半能 | 但删错了会报"变量未定义" |
| **需要人判断的** | 未使用的变量该不该删、组件名怎么起 | ❌ | 工具不知道你的意图 |
| **涉及业务逻辑** | `no-console` 要不要留 | ❌ | 生产环境日志策略是人的事 |

> 🔴 **`no-unused-vars` 是最典型的"修不了"**：它知道 `const a = 1` 没人用，但它**不敢删**——万一你是先写声明、下面还没来得及用呢？所以它只报告，等你动手。

### 3.3 更省事的做法：保存即修

`npm run lint` 是手动触发。日常开发该让编辑器代劳：

**① 装 VS Code 插件 `ESLint`**（Dirk Baeumer 那个，图标是个紫色小勾）

**② 打开设置 `settings.json`，加一行：**

```json
"editor.codeActionsOnSave": { "source.fixAll": true }
```

**③ 保存时发生了什么：**

```
Ctrl+S
  → ESLint 插件读 .eslintrc.js
  → 把"能自动修"的全改掉
  → 剩下的在编辑器里画红线
  → 文件真正写盘
```

| 对比 | `npm run lint` | 保存自动修 |
|---|---|---|
| 触发 | 手动 | 每次 Ctrl+S |
| 范围 | 全项目 | 当前文件 |
| 适合 | 提交前兜底 | 日常写代码 |

> ⚠️ **两个版本的坑**：网上老教程写的是 `"eslint.autoFixOnSave": true`，那是 ESLint 插件 2.x 的配置，**新版已废弃**，写了不生效也不报错。用 `editor.codeActionsOnSave`。
>
> ⚠️ 另一个：`"source.fixAll": true` 会让**所有**提供 fixAll 的扩展都动手（包括 Prettier、TS）。如果只想要 ESLint 修，写 `"source.fixAll.eslint": true`。

### 3.4 `lintOnSave`：要不要让 lint 卡住编译

`vue.config.js` 里的开关：

```js
module.exports = {
  lintOnSave: false   // 关掉保存时的检查
}
```

| 值 | 行为 |
|---|---|
| `true`（默认） | 检查结果当 **warning**，终端提示，**编译继续** |
| `'warning'` | 同上 |
| `'error'` | 提高成 error，**编译失败 + 页面被 overlay 盖住** |
| `false` | 完全不检查 |

**建议：别关。** 关掉之后你写一周脏代码都不会有人提醒，最后 `npm run build` 一次性给你 80 条错误——那时候改起来是灾难。

> 💡 什么时候真的该关：接手一个满身 ESLint 报错的老项目，先 `lintOnSave: false` 让它跑起来，再逐文件 `npm run lint` 收拾。**这是工程手段，不是学习手段。**

---

==二：格式==

## 1. 命令速查

| 目的 | 命令 |
|---|---|
| 生成项目（交互式） | `vue create 项目名` |
| 生成项目（图形界面） | `vue ui` |
| 起开发服务器 | `npm run serve` |
| 打包 | `npm run build` |
| 检查 + 自动修 | `npm run lint` |
| **只检查不修** | `npx vue-cli-service lint --no-fix` |
| 查 ESLint 版本 | `npx eslint -v` |

## 2. `.eslintrc.js` 结构速查

```js
module.exports = {
  root: true,                          // 不再往上找父级配置
  env: { node: true },                 // 声明运行环境（决定哪些全局变量合法）
  extends: ['plugin:vue/essential', '@vue/standard'],  // 继承的规则集
  parserOptions: { parser: '@babel/eslint-parser' },
  rules: {                             // 本地覆盖（优先级最高）
    'no-console': 'off'
  }
}
```

| 字段 | 作用 | 你会不会改 |
|---|---|---|
| `root` | 阻止向上查找配置 | 不动 |
| `env` | 声明 `window` / `process` 等全局变量合法 | 几乎不动 |
| `extends` | 一整套规则（Standard / Airbnb / vue 推荐） | 换流派时才动 |
| `rules` | 逐条覆盖 | **最常动** |

## 3. 报错 → 处方对照

| 报错关键词 | 规则名 | 首选处方 |
|---|---|---|
| `Extra semicolon` | `semi` | 删分号 |
| `Strings must use singlequote` | `quotes` | 换单引号 |
| `Expected indentation of 2 spaces` | `indent` | 改缩进 |
| `Missing space before function parentheses` | `space-before-function-paren` | 加空格 |
| `Unexpected trailing comma` | `comma-dangle` | 删逗号 |
| `'xxx' is defined but never used` | `no-unused-vars` | **手删**（自动修不敢碰） |
| `should always be multi-word` | `vue/multi-word-component-names` | 改文件名/`name` |

---

==三：代码==

## 1. 实验 A：造一个干净项目，再故意弄脏

**① 创建**

```bash
vue create lint-demo
# Manually select features → Babel / Router / Vuex / CSS(Less) / Linter
# Vue 2.x → history:N → Standard → Lint on save → dedicated → 不存预设
cd lint-demo && npm run serve
```

期望：浏览器 8080 打开默认页，终端 `Compiled successfully`。

**② 弄脏 `src/App.vue`**（把 script 段换成下面这样）

```js
export default {
  name: "App",
  data() {
    return { msg: 'hi', unused: 1 };
  },
}
```

**③ 保存，读终端**。会同时出四条（顺序可能不同）：

```
error: Strings must use singlequote (quotes)
error: Extra semicolon (semi)
error: Missing space before function parentheses (space-before-function-paren)
error: 'unused' is defined but never used (no-unused-vars)
```

**④ 关键观察**：刷新浏览器 8080，**页面完全正常**。

> 这就是 2.5 说的：ESLint 报错 ≠ 程序坏了。**问"行为是不是我想要的"，别问"会不会报错"。**

## 2. 实验 B：三种处方，同一份脏代码

**① 处方一：改代码**

```js
export default {
  name: 'App',
  data () {
    return { msg: 'hi' }
  }
}
```

四条全消失。

**② 处方二：改规则**（`.eslintrc.js`）

```js
rules: {
  semi: ['error', 'always']   // 反过来要求必须有分号
}
```

现在 `let a = 1` 会被骂 `Missing semicolon`，`let a = 1;` 才通过——**规则是可配置的，Standard 只是别人的选择**。

**③ 处方三：局部禁用**

```js
const unused = 1   // eslint-disable-next-line no-unused-vars
```

---

## 3. 实验 C：看自动修到底修了什么

**① 先把 git 弄干净**（新建项目自带 git 仓库的话）

```bash
git add -A && git commit -m "新建项目"
```

**② 再弄脏一次，然后**

```bash
npm run lint
git diff
```

**③ 期望结果**：`git diff` 里能看到分号被删、双引号变单引号、`data()` 变 `data ()`；而 `unused` **原样留着**，终端单独列出：

```
error: 'unused' is defined but never used (no-unused-vars)
```

> **这一步是整轮的重点**：自动修只碰"有唯一正确答案"的东西。剩下的必须你自己想。

## 4. 实验 D：`lintOnSave: 'error'` 的区别

**① 建 `vue.config.js`**

```js
module.exports = {
  lintOnSave: 'error'
}
```

**② 重启 `npm run serve`（改配置必须重启）**

**③ 再弄脏一次**

期望：终端红字 + **浏览器整页被黑底红字的 error overlay 盖住**，提示 `Failed to compile`。

把 `'error'` 改回 `true` 重启 → 页面恢复，终端继续打黄字。

> **两种模式的区别就这一句**：`true` 是"提醒你"，`'error'` 是"拦住你"。

## 5. `vue.config.js` 最常用的四行

```js
module.exports = {
  devServer: { open: true, port: 8999 },   // 自动开浏览器 + 换端口
  lintOnSave: true,                        // 保存时提示
  productionSourceMap: false               // 生产不生成 map，产物小一半
}
```

> ⚠️ 改了 `vue.config.js` **必须重启 dev-server**，热更新不会重读这个文件。

---

==四：总结==

## 1. 一句话记住三个

- **脚手架解决"项目怎么来"**：`vue create` 自定义勾选 Router / Vuex / Less / ESLint，一次到位。
- **ESLint 只评价长相，不改行为**：报错 ≠ 程序坏，`npm run serve` 照样跑。
- **自动修只碰"有唯一答案"的排版**：需要判断的（未使用变量、组件命名）永远留给人。

## 2. ⭐⭐ 本轮要背的

| 要背的 | 原文 |
|---|---|
| 自定义入口 | 选 `Manually select features` |
| Vue 版本 | 本课程全程 **2.x** |
| 风格流派 | `ESLint + Standard config`：**不要分号、单引号、2 空格** |
| 最反直觉的规则 | `space-before-function-paren` → `function foo ()` |
| 组件名规则 | `vue/multi-word-component-names` → `HomeView` 不是 `Home` |
| lint 命令 | `npm run lint` **默认就是修复模式**，看检查加 `--no-fix` |
| 保存即修 | `"editor.codeActionsOnSave": { "source.fixAll.eslint": true }` |
| 修不了的代表 | `no-unused-vars` |
| 报错三段 | 位置 / 人话 / **规则名**（规则名才是抓手） |
| 三种处方 | 改代码 > 改规则 > 局部禁用 |

## 3. ⭐ 收敛时刻

**这一轮把两个散点接上了：**

**① Vue--03 的"工程化"从手工变自动**

Vue--03 你是 `npm init` + 手写 `index.html`，那时 `main.js` 里 `new Vue` 是唯一的入口。**现在 `vue create` 生成的 `main.js` 里还是那一行**——变的只是外面多了 webpack 和 Babel。**你没有学新东西，只是不用再手写配置。**

**② Vue--06 的 history 模式，在这里第一次出现在创建选项里**

`Use history mode for router?` 这一问就是 Vue--06 讲的 `createWebHistory` / `mode: 'history'`。当时你只知道"要去掉 `#`"，现在你知道**它是创建项目时就要定的**——后面 109 起写商城，所有跳转都建立在这个选择上。

**③ 前面所有笔记里的代码格式，现在有了出处**

你之前每篇笔记里的代码块，为什么都没写分号、都是单引号？**因为整套笔记跟课程一样按 Standard 风格写。** 现在你知道这不是随手习惯，是一套有名有姓的规则集。

## 4. 静默失败清单

这一轮的坑几乎全是"**不报错但没生效**"：

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | `"eslint.autoFixOnSave": true` | 保存没反应，**零提示** | 插件 2.x 的旧配置，新版已废弃 |
| 2 | 装了 ESLint 插件但项目没装 eslint | 插件不工作，无报错 | 插件只调用项目本地的 eslint，`node_modules` 里没有就不干活 |
| 3 | 改完 `vue.config.js` 不重启 | 配置没生效 | 热更新不重读该文件 |
| 4 | `rules` 里写了但没生效 | 无提示 | `extends` 写在 `rules` 后面也不会覆盖——是**拼写错规则名**，ESLint 会忽略不认识的规则（多数版本只警告） |
| 5 | `lintOnSave: false` | 写一周脏代码没人管 | 直到 `npm run build` 一次性爆 80 条 |
| 6 | 两个 `.eslintrc` 在父子目录 | 规则行为诡异 | ESLint 会**向上合并**配置，`root: true` 就是砍掉这条链 |
| 7 | `npm run lint` 后没看 `git diff` | 以为"只是检查" | 它**真的改了你的文件** |
| 8 | 组件名 `Home` | 报 `multi-word`，你以为是自己写错 | 是插件 8.x 的新默认规则，改 `HomeView` 即可 |

**第 1 条是重灾区**：网上 2020 年以前的教程几乎全是 `eslint.autoFixOnSave`，抄过来就是静默失效。

**工程上怎么防**：

- 新建项目**第一件事**就配保存自动修，别等报错堆起来；
- 跑 `npm run lint` 前先 commit，让它有 diff 可看；
- 团队协作时 `.eslintrc.js` 进 git，`settings.json` 不进 git（那是个人偏好）——这条是惯例，不是强制。

**这不是 bug，是代价**：ESLint 的规则是**字符串匹配 + 语法树分析**，它能判断"这里少个空格"，但不能判断"这个变量该不该留"。所以它永远只能管一半，另一半必须是你自己的判断力。

## 5. C# 类比可用度

| C# / .NET 侧 | 前端侧 | 可用度 | 注意 |
|---|---|:--:|---|
| Roslyn Analyzer / StyleCop | ESLint | ⭐⭐⭐ | 同构：都是"编译期读源码挑刺"，规则可配 |
| `.editorconfig` 的 `severity = none/suggestion/warning/error` | `'off'` / `'warn'` / `'error'` | ⭐⭐⭐ | 三档完全对得上 |
| `dotnet format` | `npm run lint` | ⭐⭐⭐ | 都是"能改的直接改，改不了的报出来" |
| `#pragma warning disable` | `// eslint-disable-next-line` | ⭐⭐⭐ | 局部逃逸舱口，用法一模一样 |
| `Directory.Build.props`（目录级统一配置） | 父目录 `.eslintrc.js` + `root: true` | ⭐⭐ | 机制像，但 ESLint 是**合并**，MSBuild 是**覆盖** |
| CLI 模板 `dotnet new webapi` | `vue create` | ⭐⭐⭐ | 都是脚手架生成一堆配置，你只写业务 |
| NuGet 包 | npm 包 | ⭐⭐ | 都是生态，但 npm 版本地狱严重得多 |
| `Nullable` / `ImplicitUsings` 全局开关 | `env` / `parserOptions` | ⭐ | 都能少写声明，但作用域不同 |

**用法建议**：把 ESLint 当 **StyleCop + `dotnet format` 的合体**。你在 C# 里被 StyleCop 骂过 `SA1000`（关键字后要空格）吗？=`space-before-function-paren` 同一个物种。**换了语言，人的脾气还是那个脾气。**

## 6. 解锁边界

**本轮新解锁**

- `vue create` 自定义创建的完整交互流程与每个选项的后果
- Vue CLI 5 生成的标准目录结构，及 `public/index.html` / `main.js` 的职责
- `serve` / `build` / `lint` 三条命令的真实行为
- ESLint 的定位（linter ≠ 编译器 ≠ 打包器）、报错三段式读法
- Standard 风格十条高频规则 + `vue/multi-word-component-names`
- 三种处方：改代码 / 改规则（off-warn-error 三档）/ 局部禁用
- 自动修的边界（排版能修、判断类不能修）
- `lintOnSave` 四种取值与"报错但能跑"的真相
- `vue.config.js` 的 `devServer` / `lintOnSave` / `productionSourceMap`

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| Less/Sass 语法本体（只勾了预处理器，没讲怎么写） | 课程未单独讲，用到时查 |
| `vue ui` 图形界面 | 课程未讲 |
| webpack 配置细节（`chainWebpack` / 别名 / 分包） | Vue--19（打包优化，134-139） |
| 环境变量 `.env` / `process.env.VUE_APP_*` | Vue--12（106-108 项目初始化） |
| axios 响应拦截器（和 lint 名字里的"拦截"无关） | Vue--14（111-115） |
| Prettier（格式化器，跟 ESLint 分工不同） | 课程未用，用时单开 |
| vuex 全部内容 | **Vue--09（091）起** |
| 移动端 vw 适配（postcss-px-to-viewport） | Vue--12（106-108） |

⚠️ **术语撞车登记**（本轮新增两条）：

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| `lint` | 代码检查 | `npm run lint`（**默认修复**） | 看到命令就想"它会改文件" |
| `Standard` | "标准/规范"（泛指） | **standardjs 这个具体流派** | 大写 S 且带 config 时是流派 |

## 7. 下一轮预告

**Vue--09（091-094，4 集 / 53 分钟）：集中式状态 + vuex 空仓库**

下一轮是本课程真正的分水岭。091 会先把你逼到墙角：**三个页面都要用同一份数据，兄弟组件传不了怎么办**——这个问题你在 Vue--04（组件通信）里只解决了父子，没解决兄弟。092 用 `provide/inject` 试一遍，093 建空仓库，094 打通 `state`。

跑之前先确认两件事：

1. `vue create` 出来的项目能 `npm run serve` 起来；
2. 保存时 ESLint 会自动修（不然 094 之后代码量上来，你会被排版报错淹没）。
