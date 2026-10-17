# JS--DOM 速查表 · 查询与改内容

> 覆盖第 79-89 集（应用篇 Day1）+ 第 118-119 集（**查找节点，§7**）+ 第 120-121 集（**增 / 克隆 / 删节点，§8** —— 从"改内容"延伸到"改结构"）。本表是本工作区的**速查底座**，后续每一课都会引用它。
> 权威来源：MDN（见 MDN 各节外链）。有分歧以 MDN 为准。

## 1. 选择器 → JS 写法（第 80 集）

| 目的 | 写法 | 返回 | 找不到时 |
|---|---|---|---|
| 按 id 抓一个 | `document.querySelector('#box')` | 第一个匹配的 `Element` | `null` |
| 按 class 抓一个 | `document.querySelector('.item')` | 同上 | `null` |
| 抓一堆 | `document.querySelectorAll('li')` | **伪数组**（NodeList） | 空列表 |
| 选择器分组 | `document.querySelectorAll('ul, ol')` | 伪数组 | 空列表 |
| 老写法·按 id | `document.getElementById('box')` | `Element` | `null` |
| 老写法·按标签 | `document.getElementsByTagName('li')` | **动态集合** | 空集合 |

**要点**

- 参数是**字符串**，且必须是**合法 CSS 选择器**；非法选择器抛 `SYNTAX_ERR`（唯一会抛异常的情况）。
- 返回的是**文档顺序里第一个**匹配项（深度优先先序遍历）。
- `querySelector` / `querySelectorAll` 也挂在**元素**上：`box.querySelector('li')` 只在 `box` 的**后代**里找。
- `querySelectorAll` 返回的伪数组：有 `length`、有下标、能 `for` 循环，但**没有 `push` / `map`**。

## 2. 一行代码逐词拆解

```js
const username = document.querySelector('#username');
```

| 词 | 它是什么 | 一句话 |
|---|---|---|
| `const` | 声明关键字 | 声明**绑定不可改**的块级变量；锁绑定不锁内容 |
| `username` | 标识符 | 我给这个元素起的**名字**；和 HTML 里的 id 只是习惯上取同名 |
| `=` | 赋值运算符 | 把右边的**引用**交给左边这个名字（不是复制元素） |
| `document` | 全局对象 | 当前页面的 DOM 树入口；浏览器自动提供，不需声明 |
| `.` | 成员访问 | 同 C#：`对象.成员` |
| `querySelector` | 方法 | query（查询）+ Selector（选择器） |
| `( )` | 调用运算符 | 括号里是参数 |
| `'#username'` | 字符串（CSS 选择器） | `#` 是 id 选择器前缀，**不能省** |
| `;` | 语句结束符 | 可省，建议写 |

**整句翻译**：声明一个名叫 `username` 的常量，把「当前页面里 id 为 `username` 的第一个元素」这个对象的引用交给它。

## 3. 最容易写错的六行

| 你写的 | 实际发生 | 结果 |
|---|---|---|
| `querySelector('#username')` | 按 id 找 | 元素 / `null` |
| `querySelector('username')` | 找 `<username>` **标签** | `null`（几乎必然） |
| `querySelector('.username')` | 找 class 是 username 的 | 元素 / `null` |
| `querySelector('#userName')` | 大小写不匹配 | `null` |
| `getElementById('#username')` | 找 id **字面值**是 `#username` 的 | `null` |
| `querySelectorAll('#username')` | 返回伪数组，不是元素 | `.innerText` 失效 |

## 4. attribute vs property（第 82、88 集）

同一个名字，在 HTML 上和 DOM 对象上**不是一回事**。

| | 读法 | 特点 |
|---|---|---|
| property | `el.href` / `el.value` | **当前值**；`src` / `href` 读出来是补全后的绝对地址 |
| attribute | `el.getAttribute('href')` | 你**写在 HTML 里**的原样字符串 |

- 想看用户刚敲进输入框的内容 → `el.value`（property）
- 想看 HTML 里写死的那串 → `el.getAttribute('value')`（attribute）

## 5. 改内容 / 改样式的选择顺序（第 81、83-85 集）

1. **能写 CSS 类就写类** → `classList.add` / `remove` / `toggle` / `contains`
2. 只塞文字 → `innerText`（读文本更稳的是 `textContent`）
3. 要塞 HTML 结构 → `innerHTML`（⚠️ 内容来自用户 = XSS 入口）
4. 真正动态算出来的值（坐标、进度、随机色）→ `style.xxx`
5. ⚠️ `className = '...'` 是**整串替换**，会抹掉原有的类 —— 祖传 bug 第一名

**`style` 的两个硬规矩**：CSS 连字符转小驼峰（`background-color` → `backgroundColor`，`float` → `cssFloat`）；值必须是**带单位的字符串**（`'200px'`）。

## 6. 数据挂在元素上（第 89 集）

| HTML | JS 读 | JS 写 |
|---|---|---|
| `data-id="101"` | `el.dataset.id` | `el.dataset.id = '102'` |
| `data-user-name="张三"` | `el.dataset.userName` | `el.dataset.userName = '李四'` |

规则：去掉 `data-`，剩下的连字符转小驼峰。`dataset` 里**全是字符串**。
⚠️ `el.dataset['user-name']` 是错的（那等价于 `data-user--name`）。

## 7. 查找节点：两条轨（第 118-119 集）

**树里不只有标签** —— 换行、缩进、注释都是节点。所以 DOM 给了两套指针。

| 你想做的事 | **节点轨**（含文本 / 注释） | **元素轨**（只含标签）⭐ 默认用这套 |
|---|---|---|
| 父 | `parentNode` | `parentElement` |
| 所有子 | `childNodes` → `NodeList` | `children` → `HTMLCollection` |
| 第一个 / 最后一个子 | `firstChild` / `lastChild` | `firstElementChild` / `lastElementChild` |
| 下一个 / 上一个兄弟 | `nextSibling` / `previousSibling` | `nextElementSibling` / `previousElementSibling` |

**同一段 HTML，两个长度**：

```html
<ul id="list">
  <li>第一项</li>
  <li>第二项</li>
  <li>第三项</li>
</ul>
```

| 表达式 | 结果 |
|---|---|
| `list.childNodes.length` | **7**（4 个换行文本节点 + 3 个 `li`） |
| `list.children.length` | **3** |
| `list.firstChild` | `#text`（一个换行） |
| `list.firstElementChild` | 第一个 `<li>` |

**四条坑**

1. **`childNodes` 是实时的（live）** —— 边遍历边删会**每隔一个漏一个**，且**不报错**。
   → 清空子元素的标准写法：`while (el.firstChild !== null) { el.removeChild(el.firstChild); }`
   → 🔁 C# 遍历 `List<T>` 时删除会抛 `InvalidOperationException`，**JS 不拦**。
2. **`parentNode` vs `parentElement` 只在根上分岔**：`documentElement.parentNode` = `document`；`parentElement` = `null`（父节点不是元素时）。
3. **兄弟走到头是 `null`**，遍历靠它收尾：`while (node !== null) { …; node = node.nextElementSibling; }`
4. **两套都是伪数组** —— 有 `length`、能下标、能 `for`；**没有 `push` / `map`**。

**`nodeType` 判断节点种类**：`1` 元素 ｜ `3` 文本 ｜ `8` 注释。

**为什么 C# 里没被空白节点坑过**：`XmlDocument` 默认 `PreserveWhitespace = false`，**帮你丢掉了**。DOM 没有这个开关。

## 8. 增 / 克隆 / 删节点（第 120-121 集）

**「造」和「挂」是两步** —— `createElement` 的产物是**游离**的：在内存里，不在文档树上，页面看不见。对标 C#：`new Button()` 之后还得 `Controls.Add(btn)`。

| 目的 | 写法 | 要点 |
|---|---|---|
| 造元素 | `document.createElement('li')` | 游离态，**必须再插一次** |
| 挂到末尾 | `父.appendChild(child)` | 返回被插入的节点；**已在树中 = 移动，不是复制** |
| 挂到某节点之前 | `父.insertBefore(child, ref)` | `ref` 传 `null` = 末尾；**没有 `insertAfter`** |
| 拷一份 | `源.cloneNode(true)` | **必须写 `true`**，不写 = 空壳；克隆出的节点**没有父节点** |
| 删自己 | `el.remove()` | 返回 `undefined`（不用先拿父元素） |
| 由父删 | `父.removeChild(el)` | 返回**被删的节点**；参数不是它的子节点 → `NotFoundError`，传 `null` → `TypeError` |

**克隆的两条硬规矩**（MDN 原文）

1. 「克隆一个节点会复制它的**所有属性及其对应的值，包括内联事件监听器**。它**不会**复制通过 `addEventListener()` 添加的事件监听器，或赋值给元素属性的事件处理器（例如 `node.onclick = someFunction`）。」
   → ⚠️ **克隆出来的元素没有事件**；批量生成元素请用**事件委托**（见 [`JS--事件速查表-绑定与常见事件.md`](./JS--事件速查表-绑定与常见事件.md) §13）。
2. 「`cloneNode()` **可能会导致文档中出现重复的元素 ID**！」→ 克隆后**必须改掉 `id`**。

**⭐ 一句把事件和节点缝起来的话**（MDN 在 `removeChild` 页里说的）：返回值「**与 `Node.cloneNode()` 不同，……保留了与其关联的 `EventListener` 对象**」。
→ **监听器绑在节点实例上，不在 HTML 上**：`cloneNode` 丢事件，`removeChild` 留着事件。

**两条最容易踩的**

| ✗ 常写错 | 后果 | ✓ 正确 |
|---|---|---|
| `list.innerHTML += '<li>x</li>'` | 整个 innerHTML 被重新解析 → **旧监听器全丢、`input` 已输入的值清空** | `createElement` + `appendChild` |
| `cloneNode()` 不传参数 | `false` 是浅拷贝，**拿到空壳**（不报错） | `cloneNode(true)` |
| 循环里一边遍历 `children` 一边删 | `children` 也是**实时**的 → **每隔一个漏一个** | `while (el.firstChild !== null) { el.removeChild(el.firstChild); }` |

## 9. 三条保命常识

1. **`<script>` 写在 `</body>` 前面** —— 否则元素还没被解析，取到 `null`。
2. **`Cannot read properties of null`** = 上一步查询没查到。先查选择器，再查时序。
3. **`innerText` 的值永远是字符串**（`value`、`dataset` 同理）—— 要算数先 `Number()`。
