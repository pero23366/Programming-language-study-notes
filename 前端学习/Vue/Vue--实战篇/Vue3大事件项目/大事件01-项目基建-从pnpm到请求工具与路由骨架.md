# 大事件01 · 项目基建：从 pnpm 到「能发请求的空壳」

> **对应课程**：159-167（黑马 `BV1HV4y1a7n4`，9 集 / 约 2 小时 18 分）
> **读法**：这是「Vue3 大事件项目」第 1 篇，也是**唯一一篇不写业务代码的笔记**。9 集里没有一个页面、没有一条业务逻辑，但项目已经能跑、能发请求、能记住登录状态。
> **本轮定位**：**先把工作台搭好，再动手做产品。** 一句话概括这 9 集 —— 你在给自己造一台机床，还没开始加工零件。

---

==一：概念==

## 1. 大事件是什么，为什么它是 Vue3 主线的收官（159）🔥

### 1.1 先看清这个项目的位置

你之前做过一个「小兔鲜」商城（Vue--12~19，106-139 集）。那是 **Vue2 + vuex + vant + 移动端**。

大事件是 **Vue3 + Pinia + Element Plus + PC 后台**。**不是换个皮肤重做一遍**，是四件工具同时换代：

| 维度 | 小兔鲜（Vue2） | 大事件（Vue3） | 差别本质 |
|---|---|---|---|
| 语言 | JS | **TS** | 接口返回值有类型，写错在编辑器里就红 |
| 状态 | vuex（mutations / actions / getters） | **Pinia**（就是函数 + ref） | 少了三套模板代码 |
| UI 库 | vant（移动端） | **Element Plus**（PC 后台） | 表格、分页、抽屉这些「后台件」只有桌面库有 |
| 写法 | 选项式（`data` / `methods` / `computed`） | **组合式（`<script setup>`）** | `this` 消失，逻辑可以按功能聚在一起 |

**所以这 9 集真正在练的是**：**在你已经会的 Vue2 工程化流程上，把四个零件换成 Vue3 版本**。你不需要学「怎么建前端项目」，你需要学「Vue3 的建法哪里不一样」。

### 1.2 项目最后长什么样（先看终点，再走）

```
登录页 / 注册页
   ↓ 登录成功拿到 token
首页（layout：左侧菜单 + 顶部用户信息 + 右侧内容区）
   ├── 文章管理（列表 / 分页 / 搜索 / 新增 / 编辑 / 删除）
   ├── 文章分类（列表 / 新增 / 编辑 / 删除）
   └── 个人中心（资料 / 头像 / 密码）  ← 190-197 集，本轮不含
```

**看这个结构能推出三件事**，它们直接决定了这 9 集要搭什么：

1. 「登录后才能进首页」→ 需要 **token + 路由守卫**
2. 「很多页面都要发请求、都要带 token」→ 需要 **请求工具封装**
3. 「很多页面长得一样（标题 + 右上按钮 + 内容）」→ 需要 **组件封装**（第 174 集才做，先把地基留好）

### 1.3 三个角色先认清（不然会看懵）

| 角色 | 是什么 | 谁维护 |
|---|---|---|
| **前端项目** | 你要写的 Vue3 项目 | 你 |
| **后端接口** | 课程给的线上地址 `http://big-event-vue-api-t.itheima.net` | 黑马，你只调 |
| **接口文档** | 每个接口的方法 / 路径 / 参数 / 返回 | 课程资料里 |

⚠️ **这只后端不是你写的**。它是别人已经跑起来的服务 —— 这一点和你做 DesktopPet（自己写 ASP.NET Core）完全不同。好处是不用管数据库，坏处是**它的返回格式是固定的，你的前端必须迁就它**。这个「迁就」会在第 166 集变成一堆代码。

---

## 2. pnpm 与创建项目（159）

### 2.1 pnpm 到底解决什么问题

**没有 pnpm 的世界**：你用 npm 装了 10 个项目，每个项目都装一份 vue、一份 vite、一份 axios。这 10 份内容**完全一样**，但躺在 10 个 `node_modules` 里，占 10 份磁盘。

**pnpm 的做法**（两步，缺一不可）：

1. **全局仓库（content-addressable store）**：所有包装一次，按内容哈希存到磁盘上一个公共位置（Windows 一般是 `~/.pnpm-store`）。
2. **硬链接（hard link）**：项目的 `node_modules` 里放的不是文件副本，而是**指向仓库文件的链接**。

**结果**：10 个项目还是 10 个 `node_modules`，但磁盘上只有一份真实文件。

| | npm | pnpm |
|---|---|---|
| 磁盘占用 | 每个项目一份 | 全局一份 + 硬链接 |
| 装包速度 | 慢（复制） | 快（建链接） |
| 幽灵依赖 | **有**（能 import 没声明的包） | **没有**（`node_modules` 是扁平的假象，实际严格按声明） |
| 命令 | `npm install` | `pnpm install`（`pnpm i`） |

**「幽灵依赖」值得多说一句**，因为你以后一定会遇到：npm 的 `node_modules` 是**平铺**的，你装了 A，A 依赖 B，B 就也被摊平在顶层 —— 于是你**没装 B 也能 `import B`**。哪天 A 升级换了依赖，你的代码突然崩。pnpm 不给这个便利，**没声明就是不能 import**。

**C# 对照**：pnpm ≈ **NuGet 的全局包缓存（`~/.nuget/packages`）+ 项目里只放引用**。你 `dotnet add package` 时，磁盘上也只存一份 dll，`.csproj` 里只有一条 `<PackageReference>`。**pnpm 就是 JS 世界的这个模型** —— 而 npm 更像「把 dll 复制进 bin 目录」。

### 2.2 创建命令

```bash
pnpm create vue@latest
```

**这条命令会问你一堆问题**，本质是在往项目里塞开关：

| 选项 | 本项目选 | 选了会怎样 |
|---|:--:|---|
| TypeScript | ✅ | 生成 `.ts`，多出 `tsconfig.json` |
| JSX | ❌ | — |
| Vue Router | ✅ | 装 router，生成 `src/router/` |
| Pinia | ✅ | 装 pinia，生成 `src/stores/` |
| Vitest / E2E | ❌ | 课程不做单测 |
| **ESLint** | ✅ | 生成 lint 配置（第 160 集要改） |
| **Prettier** | ✅ | 生成格式化配置（第 160 集要改） |

**为什么这个项目选 TS 而不是 JS？** 不是因为「TS 更高级」，而是因为**这个项目要跟别人的接口打交道**。接口返回什么字段、什么类型，用 TS 你写 `res.data.list` 时编辑器能提示；用 JS 只能靠文档和记忆。**接口越多，TS 的收益越大** —— 这正是后台项目的常态。

⚠️ **版本提醒**：课程录制于 2023 年 7 月，用的是 **create-vue 早期版本**。你现在跑 `pnpm create vue@latest` 拿到的是**新版本**，有两处会不一样：

| 位置 | 课程（2023） | 现在（2026） |
|---|---|---|
| ESLint 配置 | `.eslintrc.cjs`（旧格式） | `eslint.config.js`（**flat config**，数组格式） |
| husky | v8 | **v9**（`pre-commit` 脚本写法变了，见 4.3） |

**这两处不必纠结**，照本篇 3.3 / 4.3 的新写法走就行，功能完全一样。

### 2.3 装完先跑一次

```bash
cd 项目目录
pnpm i          # 装依赖（create 时如果跳过了会自动装）
pnpm dev        # 启动
```

⚠️ **别接 `| head`**。`pnpm dev` 是常驻进程，管道被关掉时 vite 会跟着退出，你会以为「启动失败」。

---

## 3. ESLint + Prettier：一个管对错，一个管好看（160）

### 3.1 先把两个工具切开（这是最容易混的一对）

| | ESLint | Prettier |
|---|---|---|
| 管什么 | **代码对不对**（用了未定义变量、`v-for` 少 key、`==` 滥用） | **代码长什么样**（缩进几个空格、要不要分号、单引号还是双引号） |
| 会不会改逻辑 | **会**（`no-unused-vars` 会建议删代码） | **绝不**（它只动空白和符号） |
| 能不能修 | `--fix` | `--write` |
| 类比 | 编译器 / 代码分析器 | 排版器 |

**没有这套东西的世界**：三个人提交三种风格 —— A 用 2 空格双引号加分号，B 用 4 空格单引号不加分号，C 混着来。**每次 code review 的 diff 里一半是格式噪音**，真正的逻辑改动被淹掉。

### 3.2 为什么它俩必须「调解」一次

**它们都想管同一件事**：换行和空格。

ESLint 里有一条规则叫 `max-len`（一行最多多少字符），Prettier 也想按 `printWidth` 折行。**两边打架 → 你按 A 格式化，B 报错；按 B 改，A 又报错**。

**解法**：装 `eslint-config-prettier`，它干的事非常单一 —— **把 ESLint 里所有「和 Prettier 冲突的格式规则全部关掉」**。

```js
// eslint.config.js（flat config，2026 年的样子）
import prettierConfig from '@vue/eslint-config-prettier'
export default [
  /* ...vue 官方那几条... */
  prettierConfig,      // ← 必须放最后，它负责「关规则」
]
```

**记住这个分工**：**格式的事全交给 Prettier，ESLint 只管代码质量。** 一旦你开始纠结「这该 ESLint 管还是 Prettier 管」，看它动的是不是**逻辑** —— 动逻辑归 ESLint，动空白归 Prettier。

### 3.3 Prettier 只改三行就够

```json
// .prettierrc.json
{
  "semi": false,          // 行尾不加分号
  "singleQuote": true,    // 用单引号
  "printWidth": 100       // 一行超过 100 字符折行
}
```

**为什么课程选 `semi: false`？** 因为 Vue 生态（尤雨溪那套工具）默认不加分号。**这不是「哪个更好」的技术问题，是「跟社区对齐」的工程选择** —— 你在别人的项目里协作，风格跟着项目走，别跟项目打。

⚠️ **JS 里省略分号有一个真坑**（你在 JS 篇学过，这里只提醒）：以 `(`、`[`、`` ` `` 开头的行会被拼到上一行。**Prettier 会自动在最前面加一个 `;` 保护**，所以只要用 Prettier 就不用自己想这事。

### 3.4 两个命令

```bash
pnpm lint       # 只检查，不改
pnpm format     # Prettier 全部格式化
pnpm lint --fix # ESLint 能修的自己修
```

**日常节奏**：写代码 → 保存（编辑器如果配了 format on save 就自动格式化了）→ 提交前跑一次 `pnpm lint`。

---

## 4. husky：让「不合规的代码」进不了仓库（161）

### 4.1 没有 husky 的世界

前面那套 ESLint + Prettier **全靠人自觉**。真实情况是：

```
张三：改完了，git commit -m "fix"  →  push
李四拉下来：满屏红波浪线，跑 pnpm lint 报了 47 个错
李四：……谁改的？
```

**问题不在工具，在「执行时机」**。工具是**手动**跑的，而人一定会在赶时间时跳过它。

**husky 的思路非常朴素**：**把检查绑到 git 的钩子上**。git 本身就有钩子（hooks）机制 —— 在 `.git/hooks/` 下有 `pre-commit`、`pre-push` 这些脚本，git 在对应时机自动执行。**但 `.git/` 目录不进版本库**，所以钩子没法共享给团队。

husky 干的就一件事：**把钩子脚本放到项目里（`.husky/` 目录）并提交**，然后让 git 去那里找。

### 4.2 装上

```bash
pnpm dlx husky-init && pnpm install     # 课程写法（husky v8）
npx husky init                           # husky v9 的新写法
```

`pnpm dlx` = 「临时下载并执行，不装到项目里」，等价于 `npx`。

装完你会看到：

```
.husky/
  └── pre-commit        ← 这个文件就是钩子脚本
```

### 4.3 pre-commit 里写什么

**课程（v8）写法**：

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
```

**husky v9 之后**，上面两行废了（`_/husky.sh` 不再需要），直接写命令：

```sh
npx lint-staged
```

⚠️ **如果你照课程抄了那两行**，新版会报 `_/husky.sh: No such file or directory`，钩子失效 —— **而 git commit 依然成功**。这是典型的静默失败：**你以为在检查，其实什么都没检查**。

### 4.4 lint-staged：为什么不能直接 `pnpm lint`

**因为太慢。** `pnpm lint` 检查**整个项目**，一个中型项目要十几秒 —— 每次 commit 都等十几秒，人就会开始 `--no-verify` 跳过钩子。

**lint-staged 的取舍**：只检查**这次提交涉及的文件**（暂存区里的）。

```json
// package.json
"lint-staged": {
  "*.{js,ts,vue}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

**注意顺序**：先 `eslint --fix`（改逻辑问题）再 `prettier --write`（排版）。反了的话，Prettier 排好版 ESLint 又给改回去。

**`--no-verify` 是什么**：`git commit --no-verify` 可以跳过所有钩子。**它是逃生口，不是常规操作** —— 只在「线上炸了要立刻 hotfix 但 lint 卡住」时才用。

### 4.5 这套流程的完整链路

```
你 git commit
   ↓ husky 的 pre-commit 触发
npx lint-staged
   ↓ 拿到「暂存区里改了的 .js/.ts/.vue」
对每个文件跑 eslint --fix → prettier --write
   ↓
有修不了的错？ → 退出码非 0 → commit 被拒绝
全过了？       → commit 成功
```

**这条链路的价值**：**「不合格的代码进不了仓库」从约定变成了物理限制**。这是工程化里唯一靠得住的做法 —— 不要相信自觉，要相信闸门。

---

## 5. 调整目录：为什么默认结构不能用（162）

### 5.1 create-vue 给的默认结构

```
src/
├── assets/
├── components/
├── router/
├── stores/
├── views/
├── App.vue
└── main.ts
```

**看着挺整齐，问题在「项目变大之后」**：

| 问题 | 后果 |
|---|---|
| `views/` 是**平的** | 20 个页面全堆一层，`ArticleManage.vue`、`ArticleChannel.vue`、`LoginPage.vue` 挤在一起 |
| **没有 `api/` 层** | 请求代码写在组件里，同一个接口在 3 个地方各写一遍 |
| **没有 `utils/`** | 日期格式化、上传辅助这些函数不知道该放哪，最后塞进组件 |

### 5.2 调整后的结构（这就是「分层」）

```
src/
├── api/            ← 所有接口调用，一个业务一个文件
│   ├── article.js
│   ├── user.js
│   └── ...
├── assets/         ← 静态资源
├── components/     ← 全局可复用组件（PageContainer、ChannelSelect、抽屉封装）
├── router/         ← 路由表
├── stores/         ← Pinia 仓库（user.js）
├── utils/          ← 请求工具 request.js、辅助函数
├── views/          ← 页面，按业务分子目录
│   ├── login/
│   ├── layout/
│   ├── article/
│   └── user/
├── App.vue
└── main.ts
```

**关键的两条新增**：

**① `api/` 层 —— 把「怎么请求」和「怎么展示」切开**

```js
// api/user.js
export const loginAPI = ({ username, password }) =>
  request.post('/api/login', { username, password })
```

组件里只剩 `const res = await loginAPI(form)`。**好处**：接口路径改了，只改这一个文件；组件里看不到 `'/api/login'` 这种字符串。

**② `views/` 按业务分子目录**

不是为了好看，是为了**「相关的文件放在一起」**。`views/article/` 下放 `ArticleManage.vue`、`ArticleChannel.vue`、`components/`（本页专用的子组件），你改「文章」这个功能时不用在 20 个文件里跳。

**C# 对照**（这次对得上）：

| 后端分层 | 前端对应 | 职责 |
|---|---|---|
| Controller | `views/` | 接参数、返回结果 |
| Service | `api/` | 调外部服务（这里是调 HTTP 接口） |
| Repository / DbContext | `utils/request.js` | 统一的连接层（加 header、统一错误处理） |
| Model / DTO | `stores/`、TS 的 `interface` | 数据形状 |

**注意有个错位**：前端的 `api/` **不是** Service —— 它没有业务逻辑，只是「接口清单」。真正的业务逻辑在 `views/` 的组件里（或者以后抽 `composables/`）。**所以别把前端 api 层想得太重，它就是一张表。**

---

## 6. VueRouter4 的语法：从 `new` 到 `create`（163）

### 6.1 三处变了

| | Vue Router 3（Vue2） | Vue Router 4（Vue3） |
|---|---|---|
| 创建 | `new VueRouter({ routes })` | `createRouter({ routes })` |
| 模式 | `mode: 'history'` | **单独的 history 函数** |
| 挂载 | `new Vue({ router })` | `app.use(router)` |
| 守卫的 next | 必须调 `next()` | **可以 return**（新写法，见篇 2） |

**为什么从 `new` 改成 `create`？** 因为 Vue3 不再「一个应用只有一个全局配置」。`createRouter()` 返回一个独立实例，**同一页面可以有多个 router 实例**（微前端、测试时特别有用）。`new VueRouter` 那种写法背后有个全局单例的影子。

### 6.2 history 三种模式，现在要显式选

```ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),   // ← 就是原来的 mode: 'history'
  routes,
})
```

| 函数 | URL 长相 | 原理 | 什么时候用 |
|---|---|---|---|
| `createWebHistory()` | `site.com/article/manage` | HTML5 History API（`pushState`） | **本项目**，要好看的 URL |
| `createWebHashHistory()` | `site.com/#/article/manage` | `location.hash` | 不用配服务端时（纯静态托管） |
| `createMemoryHistory()` | 看不到 | 存在内存里 | SSR / 测试 |

⚠️ **`createWebHistory` 的唯一代价，必须记住**：`site.com/article/manage` 这个路径**服务端并不存在**。用户直接访问或刷新时，浏览器会真的向服务器要这个路径 → **404**。

**解法（部署时做，本地 vite 已经帮你做了）**：让服务端把所有未匹配的路径都返回 `index.html`。

```nginx
# nginx 的标准配法
location / {
  try_files $uri $uri/ /index.html;
}
```

**这不是 bug，是 history 模式的固有要求**。你选了好看的 URL，就得让服务器配合。hash 模式之所以「不用配」，就是因为它把路由信息放在 `#` 后面 —— **`#` 后面的东西浏览器根本不会发给服务器**。

### 6.3 两个 `router-view`（嵌套路由的物理体现）

这 9 集只配路由，不写页面，但**嵌套结构必须在脑子里先立起来**：

```html
<!-- App.vue -->
<router-view />          <!-- 第一层：/login、/reg、/（layout） -->
```

```html
<!-- LayoutContainer.vue -->
<el-container>
  <el-aside>菜单</el-aside>
  <el-main>
    <router-view />      <!-- 第二层：/article/manage、/article/channel -->
  </el-main>
</el-container>
```

**两层 router-view 是嵌套路由的本质**：`/` 匹配到 layout，layout 里的 router-view 再匹配子路由。**换子页面时，layout（菜单、头像）不重新渲染** —— 这就是后台项目为什么一定要嵌套路由。

---

## 7. Element Plus 按需引入（164）

### 7.1 先看「全量引入」的代价

```ts
// 全量引入（别这么干）
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
app.use(ElementPlus)
```

**问题**：Element Plus 有 80+ 个组件，你只用了 15 个，但打包时**全打进去**。CSS 也是全量（约 300KB）。首屏加载白白多等几百毫秒。

**这就是「按需引入」要解决的**：只把你**真的用到**的组件和样式打进去。

### 7.2 靠两个插件自动做

```bash
pnpm i element-plus
pnpm i -D unplugin-vue-components unplugin-auto-import
```

```ts
// vite.config.ts
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver()] }),   // ← 管 JS 里的 ElMessage 这类
    Components({ resolvers: [ElementPlusResolver()] }),   // ← 管模板里的 <el-button>
  ],
})
```

**两个插件分工必须分清**（这是最容易混的一处）：

| 插件 | 管什么 | 举例 |
|---|---|---|
| `unplugin-vue-components` | **模板里的标签** | `<el-button>` → 自动 `import { ElButton }` |
| `unplugin-auto-import` | **JS 里的函数** | `ElMessage.success()` → 自动 `import { ElMessage }` |

**为什么必须两个？** 因为 `ElMessage` 不是标签，是**函数调用**。模板插件看不见它。

### 7.3 三个坑（都会静默失败）

**坑 1 — 样式没进来**

按需引入只管**组件**，`ElMessage` 这种「函数式组件」的样式要额外处理。`ElementPlusResolver` 的 `importStyle` 默认会处理，但如果你发现 Message 弹出来没样式（白底黑字），就是这里断了。

**坑 2 — 自动引入让编辑器不认识**

`unplugin-auto-import` 会生成 `auto-imports.d.ts`，`unplugin-vue-components` 会生成 `components.d.ts`。**这两个文件必须提交到 git**，否则别人拉下来 TS 全红。

**坑 3 — `ElMessage` 在 `utils/request.js` 里用不了**

自动引入**只对 `.vue` 文件生效**。你在 `utils/request.js` 里写 `ElMessage.error(...)`，TS 会报「找不到名称」。**解决：手动 import**。

```js
// utils/request.js
import { ElMessage } from 'element-plus'
```

⚠️ **这个坑会在第 166 集立刻撞上**（响应拦截器里要弹错误消息）。现在记住就行：**`.vue` 里可以省 import，`.js` / `.ts` 里必须写**。

---

## 8. Pinia 用户仓库 + 持久化（165）

### 8.1 这个仓库只存两样东西

```js
// stores/user.js
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref({})

  const setUser = (t, info) => { token.value = t; userInfo.value = info }
  const removeUser = () => { token.value = ''; userInfo.value = {} }

  return { token, userInfo, setUser, removeUser }
}, {
  persist: true,        // ← 持久化，见 8.3
})
```

**为什么只要这两样？**

| 数据 | 为什么要进 store |
|---|---|
| `token` | **请求拦截器要用它**（每个请求都加 header），而且路由守卫要用它 |
| `userInfo` | 顶部头像/昵称要显示，多个页面要用 |

**其余数据（文章列表、分类列表）不进 store** —— 它们只在各自页面用，页面关了就该丢。**Pinia 不是「什么都往里塞」，是「跨页面共享且要活着的才塞」。**

**setup 式写法**（课程用的就是这种）：`defineStore` 第二个参数是**一个函数**，里面就是你写惯了的 `ref` / `computed` / 普通函数，最后 `return` 出去。**你没学新东西，只是换了个容器装**。

### 8.2 三个箭头函数，为什么不用 `function`

`setUser` / `removeUser` 是**方法**，不是组件逻辑。仓库里的方法是「被别处调用的」，用箭头函数写更短，也不涉及 `this`。**（Pinia 里根本没有 `this`，这点和 vuex 不一样。）**

### 8.3 持久化：刷新页面 token 就没了怎么办

**问题**：`ref('')` 存在**内存**里。F5 刷新 → 内存清空 → token 变回空字符串 → 路由守卫把你踢回登录页。**用户每刷新一次就要重新登录一次。**

**解法**：`pinia-plugin-persistedstate`，它把 store 里的 state 自动写进 `localStorage`，初始化时再读回来。

```js
// main.ts
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)     // ← 必须在 app.use(pinia) 之前
app.use(pinia)
```

然后 store 的第三个参数 `{ persist: true }` 就生效了。

⚠️ **版本差异（必看）**：这个插件 v4 开始，配置键从 `paths` 改成了 `pick`。

```js
persist: { pick: ['token'] }    // v4+
persist: { paths: ['token'] }   // v3 及以前
```

**只持久化 `token` 就够了** —— `userInfo` 每次进首页会重新请求（第 173 集）。**别把用户信息也存 localStorage**：那是「别人在浏览器里能读到的明文」，虽然这个项目无所谓，但习惯要正。

### 8.4 `localStorage` vs `sessionStorage` vs `cookie`

| | 存活 | 谁能读 | 什么时候用 |
|---|---|---|---|
| `localStorage` | **永久**（除非手动清） | 同源的所有 JS | **本项目 token** |
| `sessionStorage` | 关闭标签页就没 | 同源的所有 JS | 一次性的表单草稿 |
| `cookie` | 可设过期 | 会自动带给服务器 | 老式 Session 认证 |

**为什么 token 不放 cookie？** 因为这是前后端分离 —— token 是**前端自己**放在 `Authorization` 头里的，不需要浏览器自动带。cookie 那套是「后端渲染」时代的做法。

**安全提醒（一句话）**：`localStorage` 里的 token 会被 XSS 偷走。**真正安全的做法是 httpOnly cookie**，但那要求后端配合。**这个项目是教学项目，用 localStorage 是常规做法，但你要知道它的代价。**

---

## 9. 请求工具设计（166）🔥 本轮最重要的一集

### 9.1 先算一笔账：不封装会怎样

项目有 **20+ 个接口**。如果不封装，每个组件里都这么写：

```js
const res = await axios.get('http://big-event-vue-api-t.itheima.net/api/category', {
  headers: { Authorization: window.localStorage.getItem('token') }
})
if (res.data.code === 0) { list.value = res.data.data } else { alert(res.data.message) }
```

**4 个问题，每个都是「改一处要改 20 处」**：

| 问题 | 后果 |
|---|---|
| baseURL 写死 20 遍 | 换服务器 → 改 20 个文件 |
| token 拼 20 遍 | 改存储方式 → 改 20 个文件 |
| `code === 0` 判断 20 遍 | 后端改协议 → 改 20 个文件 |
| 错误提示 20 遍 | 想统一改成 toast → 改 20 个文件 |

**封装的本质**：把这四件事**各收进一个地方**。

### 9.2 三步封装

**第一步：`axios.create` 建一个「有默认值」的实例**

```js
// utils/request.js
import axios from 'axios'

const baseURL = 'http://big-event-vue-api-t.itheima.net'
const request = axios.create({ baseURL, timeout: 10000 })
```

`axios.create` 和直接用 `axios` 的差别：**前者是「一张空白配置单」，后者是「全局默认单」**。`axios.create` 出来的实例可以有自己的拦截器，不影响别处。

**第二步：请求拦截器 —— 自动带 token**

```js
import { useUserStore } from '@/stores/user'

request.interceptors.request.use((config) => {
  const userStore = useUserStore()          // ← 注意：写在函数里面！
  if (userStore.token) {
    config.headers.Authorization = userStore.token
  }
  return config
})
```

⚠️ **这里有一个必须理解的坑：`useUserStore()` 为什么不能写在模块顶层？**

```js
// ❌ 错法
const userStore = useUserStore()             // 模块顶层
request.interceptors.request.use((config) => {
  config.headers.Authorization = userStore.token
})
```

**原因**：`request.js` 在 `main.ts` 里被 import 时，**pinia 可能还没 `app.use()`**。`useUserStore()` 在没有激活的 pinia 实例时会抛 `getActivePinia() was called but there was no active Pinia`。

**能不能跑，取决于 import 顺序** —— 而 import 顺序是**别的文件的书写顺序**决定的。今天能跑，明天你在 `main.ts` 顶部加一行 import 就可能崩。**这种「靠顺序活着」的代码必须改掉。**

**规则：`useXxxStore()` 永远在「要用的那一刻」调用，不在模块加载时调用。**

**C# 对照**：这就是**不要在静态构造函数里解析 `IServiceProvider`**。静态构造函数执行时机不受你控制，容器可能还没建好。正确做法是**注入 `IServiceProvider`，用的时候再 `GetService()`**。

```csharp
// C# 的对应写法
public class MyService
{
    private readonly IServiceProvider _sp;      // 只存容器，不存服务
    public MyService(IServiceProvider sp) => _sp = sp;
    public void Do() => _sp.GetRequiredService<IFoo>().Run();   // 用的时候才取
}
```

**同一条原则，两种语言**：**延迟到「确定环境就绪」的那一刻再解析。**

**第三步：响应拦截器 —— 统一拆包 + 统一报错**

```js
import { ElMessage } from 'element-plus'          // .js 文件里必须手动 import

request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data
    if (code === 0) return data                    // ← 只把 data 交出去
    ElMessage.error(message || '服务异常')
    return Promise.reject(new Error(message))
  },
  (error) => {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
    } else {
      ElMessage.error(error.response?.data?.message || '网络异常')
    }
    return Promise.reject(error)
  }
)
```

### 9.3 「只返回 data」这个决定，改变了后面所有代码

**没封装时**，业务层拿到的是 axios 的 response：

```js
const res = await request.get('/api/category')
console.log(res.data.data)      // res.data 是后端 body，res.data.data 才是列表
```

**封装后**（拦截器里 `return data`），业务层拿到的是**后端 body 里的 `data` 字段**：

```js
const res = await getCategoryAPI()
console.log(res)                // 直接就是列表
```

**⚠️ 这是最容易让人懵的一处**：看课程时你会觉得「怎么一会儿 `res.data` 一会儿 `res`」。**判断方法只有一条 —— 看当前代码在哪个时代**：

| 位置 | 拿到的 res 是什么 |
|---|---|
| 组件里（经过我们封装的 request） | **后端 body 的 `data`** |
| 拦截器内部 `(response) => {}` | **axios 的 response**（`response.data` 才是 body） |

**记这一条**：**拦截器的参数是「axios 的 response」，拦截器的返回值是「业务数据」。中间那层壳被你自己拆了。**

### 9.4 为什么这里要 `Promise.reject`

```js
if (code === 0) return data
return Promise.reject(...)      // ← 关键
```

**如果只 `return undefined` 会怎样？**

```js
const res = await getListAPI()
list.value = res.data           // ← 报错：Cannot read properties of undefined
```

**更糟的情况**：`res` 是 `undefined` 但你写了 `res?.data`，于是**界面静默地保持空白，一个报错都没有**。

**`Promise.reject` 的作用**：让 `await` **抛出异常**，走到业务层的 `catch`，或者（如果不写 catch）在控制台留下明显的红色堆栈。**宁可炸，不要静默。**

**这是你这条学习线上反复出现的一条暗线**：**JS 世界里「不报错」往往比「报错」危险。** 拦截器的错误分支，你要主动把它做成「会炸」的。

### 9.5 完整的 `request.js` 长什么样

```js
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const baseURL = 'http://big-event-vue-api-t.itheima.net'
const request = axios.create({ baseURL, timeout: 10000 })

// 请求：带 token
request.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) config.headers.Authorization = userStore.token
  return config
})

// 响应：拆包 + 报错 + 401 处理
request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data
    if (code === 0) return data
    ElMessage.error(message || '服务异常')
    return Promise.reject(new Error(message))
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.message
    ElMessage.error(status === 401 ? '登录已过期' : msg || '网络异常')
    return Promise.reject(error)
  }
)

export default request
```

**这 25 行是整个项目后面 30 个接口的地基。** 后面每一集 `await xxxAPI()` 能那么短，全靠它。

---

## 10. 路由设计与配置（167）

### 10.1 路由表就是「页面的地图」

```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/login/LoginPage.vue') },
    { path: '/reg',   component: () => import('@/views/login/RegisterPage.vue') },
    {
      path: '/',
      component: () => import('@/views/layout/LayoutContainer.vue'),
      redirect: '/article/manage',                 // ← 访问 / 时自动跳走
      children: [
        { path: '/article/manage',  component: () => import('@/views/article/ArticleManage.vue') },
        { path: '/article/channel', component: () => import('@/views/article/ArticleChannel.vue') },
      ],
    },
  ],
})

export default router
```

### 10.2 三个细节

**① 全部用 `() => import(...)`（懒加载）**

```js
component: () => import('@/views/login/LoginPage.vue')    // ✅
component: LoginPage                                       // ❌ 直接 import
```

**差别**：直接 import → 所有页面打进**同一个 js 文件**，首屏要下载全部代码。`() => import()` → **每个页面单独一个 chunk**，访问到才下载。

**这就是「路由级代码分割」**，打包后你会看到 `LoginPage-abc123.js`、`ArticleManage-def456.js` 这种文件。

**② `redirect` 的作用**

访问 `/` 时，`/` 匹配到 layout，但 layout 的 `<router-view>` 里**没有内容**（子路由没匹配）。所以必须 redirect 到一个默认子路由。**不写 redirect 就是「进了后台但右边一片空白」**。

**③ `@/` 是什么**

`@` 是 vite 配的别名，指向 `src/`。`@/views/...` = `src/views/...`。

**好处**：`../../../../views` 这种相对路径在地狱深处会数错层。`@/` 从根算起，**永远不用数**。

配置在 `vite.config.ts`（create-vue 已经配好了，你不用动）：

```ts
resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }
```

⚠️ **`@` 只在构建工具（vite）里有效，Node 不认识它**。所以在 `.js` 文件里 `import` 用 `@/` 没问题（因为走了 vite），但如果哪天你写 node 脚本直接跑，就会报「找不到模块」。

---

==二：格式==

## 1. 速查表：这 9 集装出来的四件套

### 1.1 工具链

| 工具 | 一句话作用 | 命令 |
|---|---|---|
| **pnpm** | 包管理，全局仓库 + 硬链接 | `pnpm i` / `pnpm add x` / `pnpm dlx x` |
| **ESLint** | 查代码**对不对** | `pnpm lint` / `pnpm lint --fix` |
| **Prettier** | 管代码**好不好看** | `pnpm format` |
| **husky** | 把检查绑到 git 钩子 | 自动（`.husky/pre-commit`） |
| **lint-staged** | 只查暂存区文件 | 自动（被 pre-commit 调） |
| **unplugin-auto-import** | 自动 import **JS 里**的 API | 构建时 |
| **unplugin-vue-components** | 自动 import **模板里**的组件 | 构建时 |

### 1.2 关键文件 & 一行说明

| 文件 | 干什么 |
|---|---|
| `vite.config.ts` | 别名 `@`、Element Plus 按需插件 |
| `.prettierrc.json` | 三个格式开关 |
| `eslint.config.js` | 代码规则 + prettier 调解 |
| `.husky/pre-commit` | 提交前执行 `npx lint-staged` |
| `src/utils/request.js` | axios 实例 + 两个拦截器 |
| `src/stores/user.js` | token / userInfo + 方法 + persist |
| `src/router/index.js` | 路由表（两层 router-view） |
| `src/api/*.js` | 接口清单，一个业务一个文件 |

### 1.3 package.json 里会长出来的字段

```json
{
  "scripts": { "dev": "vite", "build": "run-p type-check build-only", "lint": "eslint . --fix" },
  "lint-staged": { "*.{js,ts,vue}": ["eslint --fix", "prettier --write"] }
}
```

---

==三：代码==

## 1. 最小可验证实验：拦截器到底改了什么

**目的**：亲眼看到「拦截器的参数是 response，返回值是 data」这件事。

**做法**：不装 Element Plus、不建路由，只用 axios 跑一次，把中间那层壳打印出来。

```js
// test-interceptor.mjs   （node test-interceptor.mjs）
import axios from 'axios'

const inst = axios.create({ baseURL: 'https://jsonplaceholder.typicode.com' })

inst.interceptors.response.use((response) => {
  console.log('① 拦截器收到的类型：', Object.keys(response))
  console.log('② response.data 是：', response.data)
  return response.data                      // ← 只把 body 交出去
})

const res = await inst.get('/todos/1')
console.log('③ 业务层拿到的：', res)
console.log('④ 业务层还能拿到 status 吗：', res.status)   // undefined
```

**你应该看到**：

```
① 拦截器收到的类型： [ 'data', 'status', 'statusText', 'headers', 'config', 'request' ]
② response.data 是： { userId: 1, id: 1, title: 'delectus aut autem', completed: false }
③ 业务层拿到的： { userId: 1, id: 1, title: 'delectus aut autem', completed: false }
④ 业务层还能拿到 status 吗： undefined
```

**④ 是这一集的关键结论**：一旦拦截器 `return response.data`，**业务层就再也看不到 HTTP 状态码、响应头、config 了**。

**这是个 trade-off**：

| | 好处 | 代价 |
|---|---|---|
| 拦截器拆包 | 30 个接口的调用都短了 6 个字符 | 需要状态码的地方（下载文件、看响应头）拿不到 |

**工程上的取舍**：大部分接口只要 body，**少数需要的特殊接口就「另开一个不拆包的实例」**，别为了个别情况污染通用实例。

## 2. 换掉 baseURL 只改一个地方 —— 验证封装的收益

```js
// ❌ 封装前：20 个文件里各有一份
axios.get('http://big-event-vue-api-t.itheima.net/api/category')

// ✅ 封装后：改一处，全局生效
// utils/request.js
const baseURL = 'http://big-event-vue-api-t.itheima.net'
```

**你可以自己试**：把 `baseURL` 改成一个错的地址，跑项目 —— **所有接口同时报「网络异常」，而且只改了一个字符**。这就叫「收口」。

**判据**：**如果一个知识/字符串在项目里出现超过 3 次，就该被提到一个变量里。** 这句话能解决 80% 的「维护性」问题。

## 3. 验证 persist 真的在工作

```js
// 浏览器控制台
localStorage.getItem('user')      // 登录后会看到 {"token":"...","userInfo":{...}}
```

然后 F5 刷新，在控制台执行：

```js
JSON.parse(localStorage.getItem('user')).token     // 还在
```

**这一步是本篇唯一「能看到效果」的地方** —— 前 8 集都是配置文件，只有 persist 和拦截器能被眼睛验证。

---

==四：总结==

## 1. 一句话记住三个

1. **ESLint 管对错，Prettier 管好看**，`eslint-config-prettier` 负责让它们不打架。
2. **husky 把「检查」从自觉变成闸门**，`lint-staged` 让它只查改过的文件 —— 否则没人受得了。
3. **请求工具封装的是「四件重复的事」**：baseURL、token、拆包、报错。少一样都不叫封装。

## 2. ⭐⭐ 本轮要背的

| 内容 | 答案 |
|---|---|
| `pnpm` 快的原理 | 全局 store + **硬链接**，不复制文件 |
| pnpm 比 npm 严格在哪 | **没有幽灵依赖**（没声明就不能 import） |
| ESLint vs Prettier 分工 | 逻辑 vs 排版；`prettier --write` **绝不改逻辑** |
| 为什么要 `eslint-config-prettier` | 关掉 ESLint 里和 Prettier 冲突的**格式规则**，且必须放**最后** |
| husky 的原理 | 把 git hooks 脚本放进 **`.husky/`** 并提交进仓库 |
| lint-staged 为什么必要 | 全量检查太慢 → 人会 `--no-verify` 跳过 |
| `createRouter` 的 history | **必须是三个函数之一**：`createWebHistory` / `createWebHashHistory` / `createMemoryHistory` |
| history 模式的代价 | 刷新 404 → 服务端要 `try_files ... /index.html` |
| 按需引入的两个插件 | `unplugin-vue-components`（模板）+ `unplugin-auto-import`（JS 函数） |
| 为什么 `ElMessage` 在 `.js` 里要手动 import | 自动引入**只对 `.vue` 生效** |
| `useUserStore()` 写哪里 | **函数内部**，不能写模块顶层（pinia 还没激活） |
| 拦截器返回 `data` 之后 | 业务层拿不到 `status` / `headers` |
| 拦截器为什么要 `Promise.reject` | 让 `await` **抛异常**，避免静默 `undefined` |
| 两层 `router-view` | App.vue（第一层）+ layout（第二层），换子页时 layout 不重渲染 |
| `@/` 是谁认的 | **vite 的 alias**，不是 Node |

## 3. ⭐ 收敛时刻

**这一轮的 9 集，其实在反复做同一件事：把「散落的多份」收成「唯一的一份」。**

回头看：

| 集号 | 重复的东西 | 收口到哪 |
|---|---|---|
| 160 | 三个人的代码风格 | `.prettierrc.json` **一个文件** |
| 161 | 「谁记得跑 lint」 | `.husky/pre-commit` **一个钩子** |
| 162 | 请求代码写在 20 个组件里 | `api/` **一层目录** |
| 164 | 组件的 import 和样式 | `vite.config.ts` **两个插件** |
| 166 | baseURL / token / 拆包 / 报错 | `request.js` **一个文件** |
| 167 | 页面路径写死在 `<a>` 里 | `router/index.js` **一张表** |

**这六件事是同一个动作**：**找到重复，然后把重复搬到一个地方。** 这就是「工程化」的全部内涵 —— 它不是「用高级工具」，是**「消灭重复」这个动作本身**。

**这个模型能解释你之前遇到的所有「为什么」**：

- 为什么组件要封装（第 174 集 `PageContainer`）？→ 5 个页面的标题栏长得一样，重复了。
- 为什么 `api/` 要单独一层？→ `'/api/category'` 这个字符串会在 3 个地方出现。
- 为什么 Pinia 要存在？→ 「当前用户」这个数据 8 个组件都要用。

**反过来，它也能判断「该不该抽」**：**只用一次的东西不要抽。** 这就是为什么 `views/article/` 下的专用子组件放在 `views/article/components/`，而不是 `src/components/` —— **后者是「全项目共用」的位置，放进去就是过早抽象**。

**第二条收敛**：**这 9 集一个业务页面都没有，但你已经在写「生产代码」了。**

对照你做 DesktopPet 时的顺序（先跑通聊天，再迭代），这次是**反过来**的：先搭全套工具链，再写第一个页面。

**哪种对？看项目性质**：

| | 先跑通再补 | 先搭架子再做 |
|---|---|---|
| 适合 | 探索型、需求不确定、**一个人** | 需求明确、**多人协作**、要长期维护 |
| 代价 | 技术债（改起来牵一发动全身） | 前期慢（2 小时没产出任何可见东西） |

**大事件是「企业项目仿真」**，所以走第二条。**你的 DesktopPet 走第一条没错** —— 一个人、需求还在变。**这是个「项目类型决定工程节奏」的判断，不是「哪种更专业」。**

**第三条收敛**：**`useUserStore()` 那个坑，和 `inject` 的那个坑是同一个。**

Vue3--05 里你学过：`inject()` 只能在 `setup` 同步阶段调用，因为它要「当前活动的组件实例」这个全局状态。

`useUserStore()` 也是一样：它要「当前活动的 pinia 实例」这个全局状态。**都在依赖一个「隐式的全局上下文」**。

**这类 API 的共同特征**：**它们看起来像普通函数，其实是「从当前上下文里取值」**。表现就是 —— **换个位置调用就炸，而错误信息跟位置毫无关系**。

**工程上的防法**：**凡是「取上下文」的函数（`inject` / `useStore` / `useRoute` / `useRouter`），一律在「用到它的函数体内」调用。** 这条可以当纪律用。

## 4. 静默失败清单

| # | 写法 | 现象 | 真相 |
|:--:|---|---|---|
| 1 | husky v9 里还写 `. "$(dirname -- "$0")/_/husky.sh"` | **commit 照常成功**，什么都没检查 | v9 删了 `husky.sh`，脚本报错但 git 不拦 |
| 2 | `pnpm lint` 全量检查很慢 → 人开始 `--no-verify` | 闸门形同虚设 | 应该用 `lint-staged` |
| 3 | lint-staged 里 `prettier` 写在 `eslint` **前面** | 排版被 ESLint 改回去 | 顺序必须 `eslint --fix` → `prettier --write` |
| 4 | `eslint.config.js` 里 `prettierConfig` 放**最前** | 冲突规则又回来了，两个工具互相打架 | 它负责「关规则」，必须最后 |
| 5 | `auto-imports.d.ts` / `components.d.ts` 没提交 | 别人拉下来满屏 TS 红 | 生成的类型声明要进 git |
| 6 | `utils/request.js` 里不 import `ElMessage` 直接用 | TS 报「找不到名称」，运行时 `ElMessage is not defined` | 自动引入只对 `.vue` 生效 |
| 7 | `useUserStore()` 写在 `request.js` 模块顶层 | **有时能跑有时炸**（`no active Pinia`） | 取决于 import 顺序 |
| 8 | 拦截器 `return undefined`（而不是 reject） | 组件里 `res.data` 报错，或 `?.` 之后**静默空白** | 错误被吃掉 |
| 9 | 照着「没封装时代」写 `res.data.data` | `undefined`，列表空白 | 拦截器已经拆过一层 |
| 10 | 路由 `/` 忘记写 `redirect` | 进了后台，右边**一片空白** | layout 的 router-view 没内容 |
| 11 | `persist: { paths: [...] }`（v4 装了新版） | 持久化**不生效**，刷新掉登录 | v4 改名 `pick` |
| 12 | `createWebHistory` 部署后刷新 404 | 本地好好的，线上崩 | 服务端没配 fallback |
| 13 | `components.d.ts` 里 `<el-xxx>` 不生效 | 组件**渲染成原始标签**，页面上显示 `<el-button>` 文字 | 插件没识别到，检查 vite.config |

**第 9、10、12 条是三条独立的重灾区**，分别对应「请求」「路由」「部署」三个层面 —— **它们的共同点是：本地都看不出问题。**

**工程上怎么防**：

- **第 9 条**：在 `request.js` 顶部写一行注释 `// 拦截器已 return data，业务层拿到的是 body.data`，比任何文档都有效；
- **第 10 条**：建 layout 时**立刻**写 redirect，别等出问题；
- **第 12 条**：部署前先手动刷新一次深层路由，这是唯一能验证的办法。

## 5. C# 类比可用度

| C# / .NET 侧 | 前端侧 | 可用度 | 注意 |
|---|---|:--:|---|
| NuGet 全局包缓存 + `PackageReference` | **pnpm** | ⭐⭐⭐ | 几乎是同一个模型：全局一份 + 项目里只放引用 |
| `Directory.Build.props`（统一编译设置） | `vite.config.ts` / `tsconfig.json` | ⭐⭐⭐ | 都是「一处配置对所有文件生效」 |
| EditorConfig / `.editorconfig` | **Prettier** | ⭐⭐⭐ | 同一个东西的两个世界版本，连名字都像 |
| Roslyn 分析器 / `dotnet format` | **ESLint** | ⭐⭐ | ESLint 的规则集更「风格化」，Roslyn 更「语义化」 |
| **Git hooks**（`.git/hooks/pre-commit`） | **husky** | ⭐⭐⭐ | 完全同构，husky 只是解决了「钩子不进版本库」 |
| `HttpClient` 的 `BaseAddress` + `DefaultRequestHeaders` | `axios.create({ baseURL })` + 请求拦截器 | ⭐⭐⭐ | **这就是同一个设计的两次实现** |
| `DelegatingHandler` | **拦截器** | ⭐⭐⭐ | 请求/响应两个方向，包一层再往下传 |
| `IServiceProvider.GetService()` 延迟解析 | 函数内 `useUserStore()` | ⭐⭐⭐ | 「别在静态构造里解析容器」是同一条纪律 |
| ASP.NET Core 中间件管道 | 拦截器 | ⭐⭐ | 形似，但前端只有请求/响应两个钩子，没有管道 |
| `appsettings.json` 的分环境配置 | `.env` / `.env.production` | ⭐⭐⭐ | vite 用 `import.meta.env.VITE_XXX` |
| `try/catch` + 全局异常过滤器 | `Promise.reject` + 拦截器统一报错 | ⭐⭐⭐ | 「不吞异常」的原则完全一致 |

**用法建议**：**`axios.create` + `DelegatingHandler` 这个对照是最高价值的** —— 你已经知道 `HttpClient` 为什么要用 `CreateClient()` 拿一个「配好的实例」，而不是 `new HttpClient()`。**axios 的 `create` 是同一个道理**：预配好的实例，才配得上「复用」这两个字。

## 6. 解锁边界

**本轮新解锁**

- **pnpm**：store / 硬链接 / 严格依赖、`pnpm dlx`
- **create-vue**：交互式选项各是什么、生成的目录结构
- **ESLint + Prettier 分工**与 `eslint-config-prettier` 的调解作用
- **husky + lint-staged**：git hooks 原理、v8/v9 差异、`--no-verify`
- **工程目录分层**：`api/` / `utils/` / `views/按业务分`、`@` 别名
- **Vue Router 4**：`createRouter` / 三个 history 函数、懒加载、`redirect`、两层 `router-view`
- **Element Plus 按需引入**：两个插件的分工、`ElMessage` 在 `.js` 里的例外
- **Pinia setup 式仓库** + `pinia-plugin-persistedstate`（v3/v4 的 `paths`/`pick`）
- **axios 封装**：`create` / 两个拦截器 / 拆包 / 401 分支 / `Promise.reject`
- **「取上下文」类 API 的调用位置纪律**（`useUserStore` 类比 `inject`）

**仍然锁着**

| 内容 | 解锁位置 |
|---|---|
| 表单校验 `rules` / `validator` | 篇 2，第 169 集 |
| `router.beforeEach` 守卫的返回值写法 | 篇 2，第 172 集 |
| `el-table` / `el-dialog` / `el-pagination` / `el-drawer` / `el-upload` | 篇 2-3 |
| 组件封装 + 具名插槽（`PageContainer`） | 篇 2，第 174 集 |
| `v-model` 封装组件（`defineModel`） | 篇 2（复用 Vue3--05） |
| 富文本 `@vueup/vue-quill` | 篇 3，第 187 集 |
| Element Plus 中文国际化（`ElConfigProvider`） | 篇 3，第 180 集 |
| `.env` 环境变量 | 课程没系统讲，用时单开 |
| 打包产物分析 / `vite build` 优化 | 已在小兔鲜（Vue--19）讲过 |

⚠️ **术语撞车登记（本篇新增）**

| 词 | 含义 A | 含义 B | 怎么分 |
|---|---|---|---|
| **hook** | 前端「钩子函数」（`onMounted`） | **git hooks**（husky） | 加 `git` 前缀的是 git 的 |
| **store** | Pinia 仓库 | `localStorage` 这个「存储」 | Pinia 里叫 store，浏览器那个叫 storage |
| **history** | 浏览器的 `window.history` | router 的 `createWebHistory` | 后者**用了**前者 |
| **alias** | C# 的 `using X = Y` | vite 的 `@` 路径别名 | 「路径替换」vs「类型别名」 |
| **拦截器** | axios 的 interceptor | axios **没有** C# 那种「中间件」 | 前端拦截器只有 2 个钩子，不分管道 |

## 7. 下一轮预告

**篇 2 = 168-178（11 集）：注册登录 · layout · 文章分类。**

从「空壳」到「真的能登录、能看到数据」—— 这是项目中**第一次出现可交互的界面**。

关键看点：

- **`el-form` 的校验是本轮的硬骨头**（169 集，5 集里最长的一集 2175 秒）。`rules` 里的 `prop` 一旦和 `model` 字段名对不上，**校验静默不生效** —— 这是 Element Plus 最高频的坑。
- **`router.beforeEach` 的返回值新写法**（172 集）：Vue Router 4 可以 `return '/login'`，不必再 `next('/login')`。**两种写法混用会报错**，你要能一眼分辨。
- **`PageContainer` 封装**（174 集）是**第一次自己设计组件 API**。它用到的具名插槽你在 Vue--05 学过，`defineModel` 你在 Vue3--05 学过 —— **这一集是纯应用，没有新语法**。
- ⚠️ 一个跨篇的坑提前说：**登录后 `ElMessage.success` 可能在拦截器和业务层各弹一次**。等你看到「一次登录弹两次成功」，回来看这句。

**进度提醒**：本篇是**纯基建**，一个字都不能跳。**第 166 集（请求工具）如果没吃透，后面 20 集都会拧巴** —— 因为每一集都在 `await xxxAPI()`，而你判断不出来 `res` 到底是什么。
