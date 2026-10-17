# 第 8 轮 · Date 日期对象 · 时间戳 · 查找节点

> 覆盖第 **116-119 集**（应用篇 Day4）。
> 速查底座：[`./JS--日期与时间戳速查表.md`](./JS--日期与时间戳速查表.md)（本轮新建）、[`JS--DOM速查表-查询与改内容.md`](./JS--DOM速查表-查询与改内容.md)（本轮就地扩写 §8）
> 上一课：[`JS--阻止默认行为-页面加载与坐标.md`](./JS--阻止默认行为-页面加载与坐标.md)
> 权威来源：MDN（见 MDN 各节外链）

---

## ==一：概念==

### ㉒ `Date` 日期对象 —— 唯一的坎是"编号错位"

**对标 C#**：`new Date()` ↔ `DateTime.Now`。

**四种造法**：

| 形式 | 含义 |
|---|---|
| `new Date()` | 现在这一刻 |
| `new Date(1792022400000)` | 毫秒时间戳 |
| `new Date('2026-10-15')` | 字符串（**仅有日期的按 UTC 解析**） |
| `new Date(2026, 9, 15)` | 年、**月份索引**、日（**本地时区**） |

**⚠️ 两条错位，必须背下来：**

**① 编号错位 —— `getMonth()` 返回 `0-11`。**
MDN：「`getMonth()` 方法根据本地时间，返回一个指定的日期对象的月份，为**基于 0 的值（0 表示一年中的第一月）**。」返回值「0 代表一月份，1 代表二月份……」。
→ 要显示给人看，**一律 `getMonth() + 1`**。十月在 JS 里是 `9`，在 C# 里是 `10`。
→ `new Date(2026, 9, 15)` 里的 `9` 就是十月 —— **构造和读取对称地错位，两边都错就"看起来对了"，这是最危险的形态。**

**② 命名错位 —— `Day` 这个词被用在了不同地方。**

| 你想拿 | JS | C# |
|---|---|---|
| 年 | `getFullYear()` | `.Year` |
| 月（0-11） | `getMonth()` | `.Month`（1-12） |
| **几号** | **`getDate()`**（1-31） | `.Day` |
| **星期几** | **`getDay()`**（0=周日） | `.DayOfWeek` |
| 时 / 分 / 秒 | `getHours()` / `getMinutes()` / `getSeconds()` | 同名 |

→ ✅ **一个好消息**：`getDay()` 的 `0 = 周日` 与 C# 的 `DayOfWeek.Sunday == 0` **碰巧一致**。
→ ⚠️ JS 的 `getYear()` **已废弃**，用 `getFullYear()`。

**字符串解析的 UTC / 本地分裂**（MDN 原文）：
> 仅有日期的字符串（例如 `"1970-01-01"`）被视为 **UTC**，而日期时间的字符串（例如 `"1970-01-01T12:00"`）被视为**本地时间**。因此，我们也建议你**确保这两种类型的输入格式是一致的**。

**非法输入不报错**：MDN —— 传入无效日期字符串时「会返回一个 `Date` 对象，其 `toString()` 方法返回字面量字符串 **`Invalid Date`**」。检查办法：`isNaN(d.getTime())`。
**两个空值的分裂**（回连 ⑭）：
- `new Date(null)` → **1970-01-01**（`null` 被转成 `0`）
- `new Date(undefined)` → **`Invalid Date`**（转成 `NaN`）

**格式化三连**（数字补零要自己写）：

```js
d.toLocaleDateString()   // '2026/10/15'
d.toLocaleTimeString()   // '20:18:19'
d.toLocaleString()       // '2026/10/15 20:18:19'
```

⚠️ **别用它拼固定格式**：输出跟随用户系统的语言/区域，同一页面在不同电脑上不一样。C# 的 `ToString("yyyy-MM-dd")` 那种确定性，JS 原生没有。

### ㉓ 时间戳 —— 单位和起点，两处都跟 C# 不同

MDN（`getTime()`）：「返回一个数值，表示从 **1970 年 1 月 1 日 0 时 0 分 0 秒（UTC）** 距离该日期对象所代表时间的**毫秒数**。」
MDN（`Date.now()`）：静态方法，「**必须以 `Date.now()` 的形式**来使用」；返回值「自 UNIX 纪元开始（1970 年 1 月 1 日 00:00:00 (UTC)）到当前时间的**毫秒数**」。

**同一时刻、三种数法：**

| 来源 | 单位 | 起点 | 和 JS 的关系 |
|---|---|---|---|
| `Date.now()` / `getTime()` | **毫秒** | 1970-01-01 UTC | —— |
| Unix 时间戳（多数后端 / PHP） | **秒** | 1970-01-01 UTC | `毫秒 ÷ 1000` |
| C# `DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()` | 毫秒 | 1970-01-01 UTC | ✅ **完全一致，干净的一对** |
| C# `DateTime.Ticks` | **100 纳秒** | **公元 1 年 1 月 1 日** | ❌ 起点和单位都不同，**不能直接换算** |

→ **1 毫秒 = 10 000 ticks。** 要在后端给前端时间戳，用 `ToUnixTimeMilliseconds()`，别给 `Ticks`。

**⭐ 前后端联调第一颗雷：秒 / 毫秒差 1000 倍。**
判别技巧：**10 位数 = 秒，13 位数 = 毫秒。** 症状通常是"日期跑到 1970 年"或"跑到几万年以后"。

**精度会被浏览器降低**（MDN 专门一节）：「为了提供针对**定时攻击和指纹追踪**的保护，`Date.now()` 的精度可能会根据浏览器的高级设置项目而被**取整**。在 Firefox 中……在 Firefox 60 中，则被取整至 **2 毫秒**；……启用 `privacy.resistFingerprinting` 后，精度将为 **100 毫秒**。」
→ 所以 `Date.now()` **不能用来做高精度性能测量**（那是 `Performance.now()` 或 `console.time` 的活），做倒计时、算天数完全够用。

**时区不参与**：`new Date(0)` 在中国显示 `1970-01-01 08:00:00`（UTC+8）——**数字是 0，显示出来却是 8 点**。

**⭐ 倒计时的铁律：用「目标 − 现在」算，不要"每秒减 1"。**
因为 `setInterval` 的实际间隔 **≥ 1000ms**（第 90 集的单线程队列）。用时间戳相减，页面卡多久结果都还是对的。

### ㉔ 查找节点 —— 两套指针（"节点轨" / "元素轨"）

**✅ 这一段是 C# 最白送的一节**：HTML DOM 与 XML DOM 接口同源，命名近乎逐字相同。

| C# `XmlNode` | DOM | |
|---|---|---|
| `node.ParentNode` | `el.parentNode` | ✅ |
| `node.ChildNodes` | `el.childNodes` | ✅ |
| `node.FirstChild` / `LastChild` | `el.firstChild` / `lastChild` | ✅ |
| `node.NextSibling` / `PreviousSibling` | `el.nextSibling` / `previousSibling` | ✅ |

**而唯一的落差，正是第 ① 轮那句"树里不只有标签"：**

| 你想做的事 | 节点轨（含文本 / 注释） | 元素轨（只含标签） |
|---|---|---|
| 父 | `parentNode` | `parentElement` |
| 所有子 | `childNodes` → `NodeList` | `children` → `HTMLCollection` |
| 第一个 / 最后一个子 | `firstChild` / `lastChild` | `firstElementChild` / `lastElementChild` |
| 下一个 / 上一个兄弟 | `nextSibling` / `previousSibling` | `nextElementSibling` / `previousElementSibling` |

MDN（`childNodes`）：
> 只读属性返回一个**实时**的 `NodeList`，其中包含给定元素的**所有**子节点……子节点**包括元素节点、文本节点和注释节点**。
> **备注：** 浏览器会在文档中插入文本节点，用于表示源标记中的**空白字符**。因此，例如通过 `Node.childNodes[0]` 获取的节点，**可能指向的是一个空白文本节点**，而不是作者原本想获取的实际元素节点。
> 需要注意的是，`childNodes` 包含*所有*子节点……**如果只想获取元素节点的集合，请改用 `Element.children`。**

**⭐ 默认规则（现在定下来，以后照着走）：**
> **除非明确要处理文字，一律走「元素轨」**：`children` / `firstElementChild` / `nextElementSibling` / `parentElement`。

**⚠️ 为什么 C# 里你从没被空白节点坑过？**
因为 `XmlDocument` 默认 `PreserveWhitespace = false`，**语言帮你把空白丢掉了**。DOM 没有这个开关，一律保留。**这是"语言兜底 vs 自己兜底"的又一处落差。**

**四条坑：**

1. **`childNodes` 是实时的（live）。** MDN：「`NodeList` 是**实时的**，这意味着每当有新的子节点被添加或移除时，其内容都会**随之更新**」；「多次调用 `childNodes` 会返回*同一个* `NodeList`」。
   → **边遍历边删，会每隔一个漏掉一个**，且**不报错**。
   → 🔁 C# 里遍历 `List<T>` 时删除会抛 `InvalidOperationException`，**运行时帮你拦住了**；JS 不拦。
   → 要清空子元素：`while (el.firstChild !== null) { el.removeChild(el.firstChild); }`
2. **`parentNode` vs `parentElement` 在根上分岔**：`document.documentElement.parentNode` 是 **`document`**（节点，不是元素）；`parentElement` 是 **`null`**。MDN：「如果该元素没有父节点，或者父节点**不是一个 DOM 元素**，则返回 `null`」。**这是"节点 ≠ 元素"唯一一处真实可见的分界。**
3. **走到头是 `null`，不报错**。MDN（`nextSibling`）：「如果指定的节点为最后一个节点，则返回 `null`」→ 遍历兄弟用 `while (node !== null)` 收尾（同 ② 轮 `querySelector` 返回 `null` 的纪律）。
4. **两套都是伪数组**：有 `length`、能下标、能 `for`，**没有 `push` / `map`**（同 ② 轮）。

**`nodeType` 三值**（判断"这个节点是什么"）：`1` 元素、`3` 文本、`8` 注释。

---

## ==二：格式==

```js
// ㉒ 创建
new Date();                            // 现在
new Date(1792022400000);               // 毫秒时间戳
new Date('2026-10-15T00:00:00');       // 字符串（带时间 = 本地）
new Date(2026, 9, 15);                 // 年, 月索引(0-11), 日

// ㉒ 读取
d.getFullYear();                       // 2026
d.getMonth() + 1;                      // 10  ← 必须 +1
d.getDate();                           // 15  ← "几号"是 getDate
d.getDay();                            // 0-6，0 = 周日
d.getHours(); d.getMinutes(); d.getSeconds();

// ㉒ 格式化与检查
d.toLocaleString();                    // '2026/10/15 20:18:19'
isNaN(d.getTime());                    // true → Invalid Date

// ㉓ 时间戳
Date.now();                            // 现在（毫秒）
d.getTime();                           // 该时刻（毫秒）
Math.floor(Date.now() / 1000);         // 转成 Unix 秒

// ㉔ 节点轨（含文本）
el.parentNode;
el.childNodes;            el.firstChild;   el.lastChild;
el.nextSibling;           el.previousSibling;

// ㉔ 元素轨（只含标签）⭐ 默认用这套
el.parentElement;
el.children;              el.firstElementChild;  el.lastElementChild;
el.nextElementSibling;    el.previousElementSibling;

el.firstChild.nodeType;   // 1 元素 / 3 文本 / 8 注释
```

---

## ==三：代码==

### 1. 月份编号错位的现场

```js
const d = new Date(2026, 9, 15);        // 9 = 十月！
console.log(d.getFullYear());           // 2026
console.log(d.getMonth());              // 9      ← 不是 10
console.log(d.getMonth() + 1);          // 10     ← 给人看要 +1
console.log(d.getDate());               // 15
console.log(d.getDay());                // 4 = 周四
```

### 2. 倒计时（时间戳相减版）

```html
<!DOCTYPE html>
<html>
<body>
  <p id="clock">--</p>
  <script>
    const clock = document.querySelector('#clock');
    const target = new Date('2026-12-31T00:00:00').getTime();

    const id = setInterval(function () {
      const rest = Math.floor((target - Date.now()) / 1000);   // 毫秒 → 秒
      if (rest <= 0) {
        clearInterval(id);                  // ⭐ 到点必须停（第 90 集的漏点）
        clock.innerText = '时间到';
        return;
      }
      const day  = Math.floor(rest / 60 / 60 / 24);
      const hour = Math.floor(rest / 60 / 60) % 24;
      const min  = Math.floor(rest / 60) % 60;
      const sec  = rest % 60;
      clock.innerText = day + ' 天 ' + hour + ' 时 ' + min + ' 分 ' + sec + ' 秒';
    }, 1000);
  </script>
</body>
</html>
```

### 3. 两套指针的实测差异

```html
<!DOCTYPE html>
<html>
<body>
  <ul id="list">
    <li id="a">第一项</li>
    <li id="b">第二项</li>
    <li id="c">第三项</li>
  </ul>
  <script>
    const list = document.querySelector('#list');
    const b = document.querySelector('#b');

    console.log(list.childNodes.length);        // 7（含 4 个换行文本节点）
    console.log(list.children.length);          // 3

    console.log(list.firstChild);               // #text
    console.log(list.firstElementChild);        // <li id="a">

    console.log(b.parentNode);                  // <ul>
    console.log(b.nextSibling);                 // #text
    console.log(b.nextElementSibling);          // <li id="c">

    console.log(list.firstChild.nodeType);      // 3
    console.log(list.firstElementChild.nodeType); // 1

    // 遍历所有兄弟（靠 null 收尾）
    let node = list.firstElementChild;
    while (node !== null) {
      console.log(node.innerText);
      node = node.nextElementSibling;
    }
  </script>
</body>
</html>
```

### 4. ⚠️ 亲手撞一次 live 列表的陷阱

```js
// ✗ 错误：边遍历边删 → 只删掉一半，且不报错
// const kids = list.childNodes;
// for (let i = 0; i < kids.length; i++) { list.removeChild(kids[i]); }

// ✓ 正确：反复删第一个
while (list.firstChild !== null) {
  list.removeChild(list.firstChild);
}
```

---

## ==四：总结==

1. **`getMonth()` 返回 0-11，给人看必须 `+1`**；`new Date(2026, 9, 15)` 里的 `9` 就是十月 —— **构造和读取对称错位，最容易骗过自己。**
2. **命名错位**：JS 里 `getDate()` 是"几号"、`getDay()` 是"星期几"；C# 里 `.Day` 是"几号"。`getDay()` 的 `0=周日` 和 C# `DayOfWeek.Sunday==0` **碰巧一致**。
3. **字符串解析有 UTC / 本地分裂**：只有日期的按 UTC、带时间的按本地。非法输入给你 **`Invalid Date`** 而不是异常，用 `isNaN(d.getTime())` 检查。`new Date(null)` = 1970，`new Date(undefined)` = `Invalid Date`。
4. **时间戳统一是"从 1970-01-01 UTC 起的毫秒数"**。跟后端对接**第一颗雷是秒/毫秒差 1000 倍**（10 位=秒，13 位=毫秒）。**C# 的 `Ticks` 起点是公元 1 年、单位是 100 纳秒，不能直接换算**——要用 `ToUnixTimeMilliseconds()`。
5. `Date.now()` 的**精度可能被浏览器取整**（Firefox 默认 2ms），**不能做高精度测量**。
6. **倒计时必须用「目标 − 现在」算**，不能"每秒减 1"——因为 `setInterval` 的真实间隔 ≥ 1000ms。**并且到点一定要 `clearInterval`。**
7. **查找节点有两条轨**：`parentNode` / `childNodes` / `firstChild` / `nextSibling`（含文本、注释）vs `parentElement` / `children` / `firstElementChild` / `nextElementSibling`（只含标签）。**默认走元素轨。**
8. **`childNodes` 是实时的**：边遍历边删会**每隔一个漏一个且不报错**。C# 里这种操作会抛异常，**JS 不拦**。
9. **`parentNode` 和 `parentElement` 只在根上分岔**（`documentElement.parentNode` = `document`，`parentElement` = `null`）——"节点 ≠ 元素"唯一可见的分界。
10. 两套都是**伪数组**（无 `push` / `map`）；兄弟走到头是 **`null`**，遍历靠它收尾。`nodeType`：`1` 元素 / `3` 文本 / `8` 注释。

---

## 动手练习

做一个小工具，要求：

1. 页面上显示**今天是几月几号、星期几**（把 `getDay()` 的 0-6 用 `switch` 或数组转成"周日…周六"）；
2. 再算一个**距离今年结束还有多少天**（提示：两个时间戳相减 ÷ 1000 ÷ 60 ÷ 60 ÷ 24，用 `Math.ceil`）；
3. 给一个 `ul`，在控制台打印出**它有几个子节点、几个子元素**，并**只遍历出 `li` 元素**（用元素轨）；
4. 最后按第 4 段那段 `while` 把 `ul` **清空**。

**只用本轮学的东西**：`Date` 的读写方法、`Date.now()`、`children` / `childNodes` / `firstElementChild` / `while` 循环。

---

## 原文引用

- [`Date()` 构造函数 — MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date/Date)
- [`Date.prototype.getMonth()` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date/getMonth)
- [`Date.prototype.getTime()` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime) ｜ [`Date.now()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date/now)
- [`Node.childNodes` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Node/childNodes) ｜ [`Element.children`](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/children)
- [`Node.nextSibling` — MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Node/nextSibling) ｜ [`Node.parentElement`](https://developer.mozilla.org/zh-CN/docs/Web/API/Node/parentElement)

---

**有不清楚的地方，直接问。** 尤其这两处值得停下来确认：㉒ 的「构造和读取对称错位」（最容易骗过自己），以及 ㉔ 的「两条轨到底走哪条」。另外 ⚠️ 第 4 段那个 live 列表陷阱，**强烈建议亲手跑一次**再换成 `children` 感受差别——这类"静默出错"的坑，撞过一次才记得住。
