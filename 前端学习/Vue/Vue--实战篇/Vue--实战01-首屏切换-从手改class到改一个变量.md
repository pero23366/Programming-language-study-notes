# Vue--实战01 · 首屏切换：从"手改 class"到"改一个变量"

> **对应**：项目改造第 1 步（`Vue/App.vue`）／课程 002-007 + 140-143（重排后）
> **读法**：全部对照 `TS/ui.ts` 的原有实现讲，只讲"改了什么、为什么必须这么改"。
> **本轮定位**：第一次在真实项目里用 Vue。只碰 4 个 API，但已经踩到 2 个真坑。
> **前置**：V1（响应式是什么）已过；项目原版能跑。

---

==一：概念==

## 1. 改之前：状态藏在哪？

**这是整轮最值得记住的一句**：原生 TS 版本里，**"现在在哪一屏"这个状态没有变量**，它藏在一个元素的 class 里。

```ts
// TS/ui.ts —— 状态 = #pet 上有没有 hidden 这个类
export function showPet(): void {
  dom.home.classList.add('hidden')
  dom.pet.classList.remove('hidden')
}

export function showHome(): void {
  dom.pet.classList.add('hidden')
  dom.home.classList.remove('hidden')
}
```

想知道"现在在哪一屏"，得去问 DOM：

```ts
function whereAmI() {
  return dom.pet.classList.contains('hidden') ? 'home' : 'pet'
}
```

> **这就是问题所在**：状态存在 DOM 里，而 DOM 是**结果**，不是**真相**。
> 你想知道状态，只能读结果反推。一旦有 3 处代码都能改这个 class，你就必须保证它们逻辑一致 —— 而没有任何机制替你保证。

## 2. 改之后：状态搬进变量

```ts
// Vue/App.vue
const screen = ref<'home' | 'pet'>('home')
```

```html
<main    v-show="screen === 'home'" class="home">  ... </main>
<section v-show="screen === 'pet'"  class="pet">   ... </section>
```

三件事同时变了：

| | 原版 | Vue 版 |
|---|---|---|
| 状态存在哪 | DOM 的 class 里 | `screen` 这个变量 |
| 谁改 DOM | 你（`classList.add/remove`） | Vue（`v-show` 的幕后实现） |
| 谁触发 | 点击回调里调用 `showPet()` | 改 `screen` 的值 |
| 想知道状态 | 读 DOM 反推 | `screen.value`，直接读 |
| 新增一屏要改几处 | 每个函数各加一行 + HTML 加一个 section | 模板加一个 `<section v-show>` |

> ⭐ 用你熟的东西类比：**这就是"把状态从 UI 控件里搬进 ViewModel"**。
> 原生 JS 那种写法相当于把 `isLoggedIn` 存在"登录按钮是否变成了退出按钮"里 ——
> 能跑，但任何新功能都得先反向解析 UI。

## 3. 🔵 `ref` 是撞名：和 C# 的 `ref` 毫无关系

| | C# `ref` | Vue `ref()` |
|---|---|---|
| 是什么 | 参数修饰符，**按引用传参** | **函数**，造一个响应式容器 |
| 作用 | 让方法能改调用方的变量 | 让一个值被 Vue 追踪 |
| 取值 | 直接用 | **`.value`**（JS 里）/ 模板里自动解包 |

**没有可比性。** Vue 取名 `ref` 是因为它返回的是"引用对象"（reference），跟 C# 那个关键字纯属撞车。

## 4. 🔴🔴 `.value` 的不对称（本轮第一个必背）

```ts
const screen = ref<'home' | 'pet'>('home')

// JS / TS 里 —— 必须 .value
screen.value = 'pet'
console.log(screen.value)

// 模板里 —— 不要 .value
// <main v-show="screen === 'home'">
```

**为什么会这样**：`ref()` 返回的不是那个值，是一个对象：

```ts
// 大致长这样（简化）
{ value: 'home', __v_isRef: true }
```

模板编译时，Vue 发现 `screen` 是个 ref，会自动帮你取 `.value`（这叫"自动解包"）。而你在 `<script>` 里操作的是**那个对象本身**，必须自己取。

> ⚠️ 这个不对称没有优雅解释，只能记住。它是 Vue3 新手第一大 bug 源：
> - 写 `screen = 'pet'` → **改的是常量，直接报错**（TS 会拦住，算走运）
> - 写 `if (screen === 'home')` → **永远 false**，因为对象不等于字符串。**这条不报错。**
> - 在 `console.log` 里看到 `{ value: 'home' }` 而不是 `'home'` → 就是忘了 `.value`
>
> **工程防护**：见到 ref 变量在 JS 里被当普通值用，先怀疑漏了 `.value`。

## 5. 🟡 这里为什么用 `v-show` 不用 `v-if`

`v-if` 是"删掉/重建 DOM"，`v-show` 是"留着，改 `display:none`"。

| | `v-if` | `v-show` |
|---|---|---|
| DOM | 销毁 / 重建 | 一直在，改 display |
| 首次开销 | 小（不渲染） | 大（先渲染再藏） |
| 切换开销 | 大（重建组件、丢状态） | 小（改个样式） |
| 适合 | 条件很少变（如权限、登录态） | **频繁切换** |
| 生命周期 | 触发 `mounted`/`unmounted` | **不触发** |

本项目这两屏：结构都很大（舞台里还有设置面板），而且用户会来回切 → **`v-show` 更合适**。
如果它是"未登录看不到某个按钮"这种，就该用 `v-if`。

> 判据一句话：**"切回来还要不要保留它的状态"** —— 要，用 `v-show`。

## 6. ⚠️ 与项目原有 `.hidden` 的冲突

你的 `CSS/base.css` 里有：

```css
.hidden { display: none !important; }
```

`!important` 的优先级高于内联样式。而 `v-show` 的实现是给元素加**内联** `style="display:none"`。

两者不冲突（都藏），但**冲突在"显示时"**：如果元素带着 `.hidden` 类，`v-show` 设成显示也顶不过 `!important`。

**所以 Vue 版把 `class="pet hidden"` 里的 `hidden` 去掉了**，只用 `v-show` 管显隐。这是迁移时最容易漏的一处 —— 漏了就是"点进去一片空白，也不报错"。

---

==二：格式==

## 1. 本轮用到的 4 个 API

| API | 作用 | 类比 |
|---|---|---|
| `createApp(App).mount('#app')` | 创建应用并挂到 DOM | `new Vue({el})`（Vue2） |
| `ref<T>(init)` | 造一个响应式容器，`.value` 读写 | C# 的 `Observable<T>` 味道，但更轻 |
| `v-show="expr"` | 表达式为假时 `display:none` | — |
| `@click="fn"` | 绑点击事件，`@` 是 `v-on:` 的简写 | `addEventListener` 的声明式版 |

## 2. 原版 → Vue 版 · 函数级对照

| 原版（`TS/ui.ts`） | Vue 版 | 说明 |
|---|---|---|
| `dom.home.classList.add('hidden')` | `<main v-show="screen !== 'home'">` | 改 class → 绑表达式 |
| `dom.pet.classList.remove('hidden')` | `<section v-show="screen === 'pet'">` | 同上 |
| `dom.createPetBtn.addEventListener('click', ...)` | `@click="enterPet"` | 事件绑定 |
| `showPet()` 里顺带 `showBubble()` | **暂时没做** | 第 4 步处理 |
| `showHome()` 里顺带 `closeSettings()` / `clearInput()` | **暂时没做** | 第 5、3 步处理 |
| `must<T>('#home')` 这一整套 `dom` 对象 | **整块消失** | Vue 不再靠 querySelector 找元素 |

> 注意最后一行：`ui.ts` 开头那 47 行 `dom` 对象（40 个 `must()` 调用），在 Vue 版里**一个都不需要**。
> 这不是"换个写法"，是**整类代码消失了**。

## 3. 迁移检查清单

每迁一个控件，对着过一遍：

- [ ] 模板里那个 `id` 删掉了吗？（`id` 是待迁移标记）
- [ ] 原来的 `.hidden` 类去掉了、换成 `v-show` 了吗？
- [ ] 原来 JS 里改它的那行代码删了吗？（不删就是两套逻辑打架）
- [ ] 图片/资源路径是不是从 `./` 改成了 `../`？（见 §三.2）
- [ ] 在浏览器里点一遍，行为跟原版一致吗？

## 4. 两个入口的对照关系

| | 原版 | Vue 版 |
|---|---|---|
| 入口 | `index.html` | `pet-vue.html` |
| 脚本 | `TS/main.ts`（9 个模块） | `Vue/main.ts` → `App.vue` |
| 样式 | `CSS/*.css` | **同一个** `CSS/*.css` |
| 组件 | 无（直接写 HTML） | `App.vue`（单文件组件） |

---

==三：代码==

## 1. 实际落地的四个文件

```
vite.config.ts        加 vue 插件（只影响 .vue，不动 TS 版）
pet-vue.html          新入口，只留一个 <div id="app">
Vue/main.ts           createApp(App).mount('#app')
Vue/App.vue           整个页面结构 + screen 状态
```

`vite.config.ts` 只有这一句是关键：

```ts
import vue from '@vitejs/plugin-vue'
export default defineConfig({ plugins: [vue()] })
```

**为什么要单独建文件**：Vue 的 `.vue` 是自定义格式，Vite 原生不认识，得靠插件转换。

## 2. 踩到的第一个真坑：图片 404

```html
<img src="./image/idle-1.png" />   <!-- ❌ 桌宠形象变成 alt 文字 -->
<img src="../image/idle-1.png" />  <!-- ✅ -->
```

**原因**：在 `index.html` 里写的 `./image/x.png`，是**浏览器**按"HTML 所在目录"解析的。
但写在 `.vue` 里，Vite 会把它当成**模块引用**，按**当前 .vue 文件所在目录**解析 —— 于是去 `Vue/image/` 找，找不到。

**工程防护**：`.vue` 里所有本地资源路径，先想清楚是"相对组件"还是"相对项目根"。
更稳的写法是放 `public/` 下用绝对路径 `/image/x.png`，那样在哪都不会错。

> 这个坑**不报错**，只在页面角落显示一个破图标 + alt 文字。属于典型静默失败。

## 3. 验证方式

```bash
npm run dev
# 原版：  http://localhost:5173/index.html
# Vue 版：http://localhost:5173/pet-vue.html
```

两个页面来回切，行为应该一致：
1. 首屏显示"生成桌宠" → 点它进舞台
2. 舞台显示对话框 + 桌宠 + 底部控件 → 点 ✕ 回首屏
3. **Vue 版里，除这两个按钮外的控件点了都没反应**（还没接线，第 2-7 步依次补）

> ⚠️ 一个可自证点：在 Vue 版里打开 F12，用 Vue Devtools 的 Components 面板选中 `App`，
> 能看到 `screen` 这个变量。**在面板里双击把它改成 `pet`，页面会立刻切到舞台** ——
> 这比看代码更能说明"界面是状态的投影"。

---

==四：总结==

## 1. 一句话记住三个

1. **状态要从 DOM 搬进变量** —— class 是结果，不是真相。
2. **`ref` 在 JS 里要 `.value`，在模板里不要** —— 这个不对称不报错，只出错。
3. **`v-show` 保留 DOM，`v-if` 销毁 DOM** —— 判据是"切回来还要不要状态"。

## 2. ⭐⭐ 本轮要背的

| 要背 | 内容 |
|---|---|
| 最小启动 | `createApp(App).mount('#app')` |
| 声明响应式 | `const x = ref<类型>(初值)` |
| 读/写 | JS：`x.value`；模板：`x` |
| 条件显示 | `v-show="布尔表达式"` |
| 事件 | `@click="函数名"`（`@` = `v-on:`） |
| 单文件组件 | `<script setup>` + `<template>`，一个 `.vue` = 一个组件 |

## 3. ⭐ 收敛时刻

**这一步同时用到了三个不同"阶段"的知识**，而它是从项目需求里长出来的：

| 用到的 | 原本排在哪一轮 | 为什么会提前 |
|---|---|---|
| 响应式 / `ref` | V10（组合式 API） | 项目里没有理由写 Vue2 的 `data(){}`，直接上组合式 |
| `v-show` / `@click` | V2（指令） | 第一屏切换就要用 |
| 组件 / `.vue` 文件 | V5（工程化） | 不拆文件就没法写 Vue |

> **这就是"项目驱动"和"课程驱动"的真正区别**：
> 课程是**先学零件再组装**，项目是**先要一个能跑的东西，缺什么补什么**。
> 顺序被打乱了，但每个知识点出现时都有上下文 —— 这比"先学 15 集指令再用"记得牢。

## 4. 静默失败清单

| 现象 | 真实原因 | 怎么发现 |
|---|---|---|
| 点进去一片空白 | `.hidden` 类没删，`!important` 压过了 `v-show` | 看元素上还有没有 `hidden` 类 |
| 图片显示破图标 | `.vue` 里 `./` 路径按组件目录解析 | Network 面板看 404 的路径 |
| 条件永远不成立 | JS 里拿 ref 对象当值比较（漏 `.value`） | `console.log` 出来是 `{value:...}` |
| 改了值界面不动 | 改的是普通变量，不是 `ref` | Devtools 里看不到这个字段 |
| 控制台警告 `Property "xxx" was accessed during render but is not defined` | 模板里用了 `setup` 没返回的变量 | 看警告里的名字 |

> 前三项**都不报错**。第一条尤其阴 —— 页面只是一片空白，控制台干干净净。

## 5. C# 类比可用度

| 类比 | 档位 | 说明 |
|---|---|---|
| 状态从 DOM 搬进变量 ↔ 状态从控件搬进 ViewModel | ⭐⭐⭐ | 同一种重构，动机完全一致 |
| `ref<T>(x)` ↔ 被观察的字段 + 变更通知 | ⭐⭐ | 概念通，Vue 是自动的 |
| `screen.value` ↔ 属性的 getter/setter | ⭐⭐ | 但 `.value` 是显式的，容易漏 |
| `@click` ↔ 事件订阅 | ⭐⭐⭐ | 直接迁移 |
| `v-show` ↔ 控件可见性 | ⭐⭐⭐ | 直接迁移 |
| `ref` ↔ C# `ref` 关键字 | ❌ | **纯撞名**，毫无关系 |
| `v-if` ↔ `?.` 条件访问 | ❌ | 不是一回事 |

## 6. 解锁边界

**✅ 本轮新解锁**

- `createApp` / `mount`、`.vue` 单文件组件、`<script setup lang="ts">`
- `ref<T>()` 及 `.value`
- `v-show`、`@click`（`v-on` 的事件绑定形式）
- Vue Devtools 的 Components 面板（改值看效果）

**🔒 仍锁着**

| 类别 | 具体 | 哪一步解 |
|---|---|---|
| 列表渲染 | `v-for` / `:key` / 数组的响应式 | 第 2 步 |
| 双向绑定 | `v-model` / 修饰符 | 第 3、6 步 |
| 属性绑定 | `v-bind` / `:class` / `:disabled`（只用了 `v-show`，还没用 `:class`） | 第 2-6 步 |
| 侦听 | `watch` / `watchEffect` / `computed` | 第 4、6 步 |
| 生命周期 | `onMounted` / `onUnmounted` | 第 4 步 |
| 组件化 | `props` / `emit` / 插槽 / 组件注册 | 第 8 步 |
| 全局状态 | `provide/inject` / Pinia | 第 9、10 步 |
| 路由 | vue-router（本项目是单页两屏，**可能永远用不上**） | — |
| 其它指令 | `v-if` / `v-html` / `v-for` | 第 2、5 步 |

> 📌 注意最后两行：**这个项目可能根本不需要路由和 Pinia**。
> 单页两屏 + 一个全局 store 就够。**学到什么用什么，不为凑齐技术栈而加复杂度。**

## 7. 下一步预告（第 2 步 · 消息列表）

目标：把 `ui.ts` 里的 `addMessage()` 换成 Vue 的列表渲染。

```ts
// 原版：手搓 <li> 再 append
export function addMessage(text: string, from: BubbleFrom): HTMLLIElement {
  const li = document.createElement('li')
  li.className = `pet__msg pet__msg--${from}`
  li.textContent = text
  dom.chatLog.append(li)
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight
  return li
}
```

```html
<!-- Vue 版：只描述列表长什么样 -->
<li v-for="m in messages" :key="m.id" :class="`pet__msg pet__msg--${m.from}`">{{ m.text }}</li>
```

会讲到的三件事：
1. `v-for` 的 `:key` 为什么不能用 index（这是 V2 唯一要停的点）
2. 数组怎么改才能触发更新（`push` 行、下标赋值不行的历史包袱，Vue3 已修）
3. 自动滚到底：`nextTick` 为什么必须等（DOM 更新是异步批量的）

**并轮判据**（开始第 2 步前先回答）：
1. `v-for` 里 `:key` 用数组下标，在"列表中间插入一项"时会出什么具体问题？
2. 新版列表渲染完之后，`scrollTop = scrollHeight` 为什么要放在 `nextTick` 里，直接写会怎样？
