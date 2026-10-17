# JS--C# → JS 类比地图（可用度速查）

> 用法：写 JS 时冒出"这个和 C# 的 XX 一样吧"的念头，先来这张表查一眼。
> 覆盖范围：JS 基础篇 + 应用篇 Web APIs 已讲部分（第 1-123 集）。
> 权威来源：MDN（MDN）。本表是**教学判断**，不是规范。

## 可用度图例

| 标记 | 含义 | 建议 |
|---|---|---|
| ✅ | **直接迁移** —— 概念、写法、坑都一致 | 放心照搬，省下理解成本 |
| ⚠️ | **形似神不同** —— 能借思路，必须改细节 | 借它开路，但立刻记住差异栏 |
| ❌ | **彻底失效** —— 旧概念会主动误导你 | 不要类比，从零重建 |

---

## 一、总表

| C# 里的东西 | JS 对应物 | 可用度 | 差在哪 | 讲于 |
|---|---|---|---|---|
| `var x = 1;` / 类型声明 | `let` / `const` | ⚠️ | JS 无类型标注；`const` 锁的是**绑定**不是内容 | 基础篇 |
| 强类型 + 编译器检查 | （无） | ❌ | 全靠运行时爆炸；拼错名字一句提示都没有 | 全篇 |
| `List<T>` 索引访问 | 数组 | ⚠️ | 无泛型、可混装类型；`length` 可写 | 基础篇 |
| `list.First()` / `FirstOrDefault()` | `querySelector` | ⚠️ | JS **一律** `FirstOrDefault` 语义：找不到返回 `null`，**不抛** | ② |
| `List` 的 `foreach` | `for` 循环（伪数组也用它） | ⚠️ | `querySelectorAll` 返回的**不是真数组**，没有 `push` / `map` | ② |
| `label.Text = "..."` | `el.innerText` | ✅ | 可读可写；`innerHTML` 会当 HTML 解析（XSS） | ③ |
| `control.BackColor = ...` | `el.style.backgroundColor` | ⚠️ | 连字符转小驼峰；**值必须带单位**；只写行内样式，读不到 CSS 里的值 | ⑤ |
| 控件属性赋值 | `el.src` / `el.disabled` | ⚠️ | 布尔属性必须写真布尔；`class`→`className`、`for`→`htmlFor` | ④ |
| `control.Tag` | `el.dataset.xxx` | ⚠️ | 可挂多个、有名字；值**全是字符串**；连字符转驼峰 | ⑧ |
| `button.Click += Handler;` | `addEventListener('click', fn)` | ✅ | **真正的正面对应**：本质都是往列表里 `+=` | ⑩ |
| `button.Click -= Handler;` | `removeEventListener('click', fn)` | ⚠️ | 要求**同一函数引用** + **同一 `capture` 标志**，不匹配则**静默失败** | ⑰ |
| `void H(object sender, EventArgs e)` | `function (e) {}` | ⚠️ | **只有一个参数**；"sender" 藏在 `e.target` 里 | ⑭ |
| `Timer` / `DispatcherTimer` | `setInterval` / `setTimeout` | ⚠️ | **单线程**，回调排队，所以"每 1 秒"实际是"**至少** 1 秒" | ⑨ |
| 委托 / 事件类型 | 回调函数 | ⚠️ | 没有多播委托类型这种东西，函数就是一等值 | ⑨⑩ |
| `MouseEnter` / `MouseLeave` | `mouseenter` / `mouseleave` | ✅ | 一一对应 | ⑪ |
| `MouseMove` | `mousemove` | ⚠️ | 频率极高，每次触发都排一个回调，里面别做重活 | ⑪ |
| `textBox.Enter` / `Leave` | `focus` / `blur` | ⚠️ | `focus` / `blur` **不冒泡**（要 `focusin` / `focusout`）；**不可取消** | ⑫ |
| `KeyDown` / `KeyUp` | `keydown` / `keyup` | ✅ | 一一对应；`keypress` 已废弃 | ⑬ |
| `e.KeyCode`（枚举） | `e.key`（字符串） | ⚠️ | 用 `e.key === 'Enter'`，别再用废弃的 `keyCode === 13` | ⑬ |
| `null` | `null` / `undefined` | ⚠️ | **两个"空"**：`null` = 查了没有；`undefined` = 这个名字/变量不存在 | ⑭ |
| `FormClosingEventArgs.Cancel = true` / `KeyPressEventArgs.Handled` | `e.preventDefault()` | ✅ | 真对应（"我处理了，你别执行原动作"）。⚠️ 但 **WPF 的 `e.Handled` 是坑**：它把"拦传播"和"拦默认"**打包成一件事**，DOM 拆成了两个独立开关 | ⑲ |
| `Form.Load` 事件 | `DOMContentLoaded` / `load` | ⚠️ | C# 只有一个 `Load`；DOM 分成"**DOM 好了**"（document 上）和"**资源齐了**"（window 上）两个事件 | ⑳ |
| `MouseEventArgs.X / Y`（相对控件客户区） | `e.offsetX / offsetY` | ⚠️ | 参照系对得上，但 DOM 的 `offsetX` 跟的是 **`e.target`**——点到子元素上参照点就换了 | ㉑ |
| `Control.ClientSize.Width` | `el.clientWidth` | ✅ | 一对一，都是"客户区"、都**不含边框** | ㉑ |
| `Control.Width`（含边框） | `el.offsetWidth` | ⚠️ | 含边框 + 内边距 + 滚动条；且是**整数**，要小数用 `getBoundingClientRect()` | ㉑ |
| `Control.Left / Top`（相对父容器） | `el.offsetLeft / offsetTop` | ❌ | **相对 `offsetParent`**（最近的有定位祖先），**不是父元素**——这条会主动误导你 | ㉑ |
| `DateTime.Now` | `new Date()` | ⚠️ | **两处错位**：① `getMonth()` 返回 **0-11**（C# 是 1-12）；② `Day` 一词两边指不同东西——JS `getDate()` 是"几号"、**`getDay()` 是"星期几"** | ㉒ |
| `DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()` | `Date.now()` / `d.getTime()` | ✅ | 都是**毫秒**、都以 **1970-01-01 UTC** 为起点 —— 干净的一对 | ㉓ |
| `DateTime.Ticks` | （无对应物） | ❌ | 起点是**公元 1 年**、单位是 **100 纳秒**（1 毫秒 = 10 000 ticks）。**起点和单位都不同，不能直接换算**；要对齐必须显式转 `ToUnixTimeMilliseconds()` | ㉓ |
| `Stopwatch` / 遍历 `List<T>` 时删除会抛 `InvalidOperationException` | `Date.now()` 相减 / 遍历 `childNodes` 时删除 | ⚠️ | **JS 完全不拦**：`childNodes` 是实时列表，边遍历边删会**每隔一个漏一个且不报错**；`Date.now()` 精度还会被浏览器取整 | ㉓㉔ |
| `XmlNode.ParentNode` / `ChildNodes` / `FirstChild` / `NextSibling` | `parentNode` / `childNodes` / `firstChild` / `nextSibling` | ✅ | 接口同源（都是 W3C DOM 那套），命名近乎逐字相同 —— 全篇最白送的一段 | ㉔ |
| `XmlDocument`（默认 `PreserveWhitespace = false`） | DOM（**没有这个开关**） | ⚠️ | C# 帮你把空白文本节点丢掉了；**DOM 一律保留**，所以 `childNodes` 里夹着一堆换行 —— 想只要标签得改用 `children` | ㉔ |
| `new Button()` + `Controls.Add(btn)` | `createElement` + `appendChild` | ✅ | 都是"造出来还得挂进容器"。差别只有一处：DOM 的 `appendChild` 对**已在树中**的节点是**移动**，不是复制 | ㉕ |
| `Controls.Insert(index, ctrl)` | `父.insertBefore(new, ref)` | ⚠️ | 一个用**下标**，一个用**参考节点**；且 DOM **没有 `insertAfter`** | ㉕ |
| `Controls.Remove(ctrl)` | `父.removeChild(el)` / `el.remove()` | ✅ | `removeChild` 会**返回被删的节点**，且 MDN 明确：**它保留 `EventListener`，而 `cloneNode` 不保留** | ㉕ |
| `MemberwiseClone()`（浅拷贝） | `cloneNode(false)` | ⚠️ | 浅拷贝只带壳（**文本子节点不跟着走**）；且**不复制 `addEventListener` 的监听器**、**会复制 `id`** | ㉕ |
| Windows 把触摸"提升"成鼠标事件 | touch 事件 **+** `click` 双触发 | ⚠️ | WinForms 只给你提升后的鼠标事件；DOM 把原始触摸也一并给你 → **两套都绑，一次点击跑两遍** | ㉖ |
| NuGet 装包 + `new Xxx(options)` | CDN 引库 + `new Swiper('.swiper', {...})` | ✅ | 思路一致（引依赖 → 固定结构 → 传配置对象）。差别：**没有编译期检查，配置项拼错静默失效** | ㉗ |
| **多态 / 虚方法** | **事件委托** | ⚠️ | 见下 §二，**形似神不同** | ⑱ |
| **事件（`event` 关键字）** | **DOM 事件** | ❌ | C# 事件**没有传播路径**，DOM 有捕获/冒泡 | ⑯ |
| **`this`** | **`this`** | ❌ | C# 编译期定死；JS **运行期由"谁调用"决定** | ⑮ |

---

## 二、专项：多态 vs 事件委托

**像的部分**：都用"一个共同的上层"统一处理——`Animal a = new Dog()` 用基类看待子类；`ul.addEventListener(...)` 用父元素接住所有 `li`。

**三条根本区别**：

| 维度 | C# 多态 | 事件委托 |
|---|---|---|
| **"上"是什么** | is-a **继承链**（编译期的**类型**关系） | **包含树**（运行期的**物理**结构） |
| **谁做分派** | CLR 查虚表，**语言自动** | **你手写** `if (e.target.tagName !== 'LI')` |
| **到达几个目标** | 恰好一个 `override` | **每个祖先都会依次执行**（一对多） |

`<button>` **不是** `<body>` 的子类。DOM 里的"父"是**容器**，不是"基类"。这一条分清，多态的错觉就散了。

**准确的 C# 对标不是多态，而是 WPF 路由事件**（C# 世界唯一有"传播"概念的地方）：

| WPF | DOM |
|---|---|
| `PreviewMouseDown`（隧道，由外向内） | 捕获阶段 `{ capture: true }` |
| `MouseDown`（冒泡，由内向外） | 冒泡阶段（默认） |
| `e.OriginalSource` | `e.target` |
| `e.Source` | `e.currentTarget` |
| `e.Handled = true` | `e.stopPropagation()` |

**第二个可用的锚点：异常沿调用栈向上传播。** 抛出点 → 逐层向上 → 每层都能插手，中途拦下就停。唯一差别：异常**默认被某一层 `catch` 就止住**，事件冒泡是**每层都会执行**（除非有人截断）。

---

## 三、专项：`this` 为什么不能照搬

| | C# | JS |
|---|---|---|
| 何时确定 | **编译期**，就是当前实例 | **运行期**，由"谁调用"决定 |
| `this` 在哪写死 | 写在哪个类里就是哪个类 | 写在哪个函数里都**不代表什么** |
| 事件处理函数里 | —— | `this === e.currentTarget`（浏览器调用它时就等于"元素.函数()"） |
| 抽出去复用 | 无影响 | **可能变**（独立调用 → `window`，严格模式 → `undefined`） |

这一条更接近 C# 的 `dynamic` 动态绑定，而不是多态——多态是"看**对象的实际类型**选实现"，`this` 是"看**调用方式**定值"。

**实战结论**：能用 `e.currentTarget` 就别用 `this`。理由：① `this` 依赖调用方式，抽函数复用就会变；② 进阶篇的箭头函数**没有自己的 `this`**，现在养成 `this` 的习惯到时候全得改。

---

## 四、可以放心借过来的东西

| 你的 C# 经验 | 在 JS 里的落点 |
|---|---|
| JSON 序列化 / 反序列化 | `JSON.parse` / `JSON.stringify`（第 131 集） |
| LINQ 扩展方法链 | 数组高阶方法 `map` / `filter`（**进阶篇**才讲，到时直接对标） |
| 断点 / 日志窗口 | F12 Console ≈ `ILogger`；Network 面板 ≈ 看自己的 HTTP 接口 |
| `Task` / `async` | Promise / `async`（⚠️ **这门 200 集课程内没有，需另行补**） |
| 依赖注入、Controller、路由 | 后端那半你已有；前端这半最终要去调它 |

---

## 五、一条别混淆的名字

| 名字 | 指什么 |
|---|---|
| **Web API**（无 s） | HTTP 接口，Controller + 路由 + JSON —— 你「后端学习」那 62 篇 |
| **Web APIs**（有 s） | 浏览器给 JS 的一整套内置能力：DOM / BOM / 定时器 / 存储 / 正则 —— 第 77-150 集 |

两者唯一的关系：**前端这半边最终调用你后端那半边**。

---

## 相关

- 详情课：同目录课程笔记（`JS--` 开头的几篇）、`JS--DOM速查表-查询与改内容.md`、`JS--事件速查表-绑定与常见事件.md`
- Gaps：本表 ⚠️ 项会随进度**就地扩写**——不要另建新表。

---

## 六、一条已经反复出现的"元规律"

回头看总表，❌ 和 ⚠️ 集中在三类地方：

1. **编译期能替你挡住的**（强类型、`InvalidOperationException`）—— JS 全都推到运行期，且**多半静默**。
2. **配置 / 名字写错**（事件名、配置项、`getMonth` 的编号）—— C# 编译不过或抛异常，JS **什么都不说**。
3. **同一个词指不同东西**（`Day`、`this`、`class`）—— 靠记忆，没有编译器提醒。

所以你在 JS 里该养成的第一习惯不是"写得对"，而是**"先确认它真的执行了"**：`console.log` 打点、F12 看 Console、Network 看请求。这就是本表最实用的一条。
