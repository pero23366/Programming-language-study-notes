# JS--进阶篇 15 · bind · 防抖 · 节流

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **195 / 196 / 197** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **本轮定位**：**从第 ⑮ 轮起学的"高级函数"这一路，在这一轮看到一个漂亮的收束** —— 防抖 / 节流是闭包、`this`、`apply`、`setTimeout` 的联合应用。

---

==一：概念==

## 1. `bind`（195）

### 1.1 它和 `call` / `apply` 的区别只有一条：不立刻执行

```js
function say() { console.log(this.name); }
const obj = { name: '张三' };

// call / apply：立刻执行
say.call(obj);          // '张三'   ← 当场就打印了

// bind：返回一个新函数，等你自己调用
const bound = say.bind(obj);
console.log(typeof bound);   // 'function'  ← 是个函数，但还没执行
bound();                     // '张三'      ← 现在才执行
```

⭐ **一句话记住：`call` / `apply` 是"现在就做"；`bind` 是"给你一个**记住了 `this` 的函数**"。**

### 1.2 三者对照表（要背）

| | `call` | `apply` | `bind` |
|---|---|---|---|
| **是否立即执行** | ✅ 立即 | ✅ 立即 | ❌ **返回新函数** |
| **参数怎么传** | 一个个列 | 数组 | 一个个列（**也可以预设**） |
| **返回值** | 函数的返回值 | 函数的返回值 | **一个绑好 `this` 的新函数** |
| **典型用途** | 借用方法执行一次 | 参数在数组里 | **把函数交给别人调用时保住 `this`** |

⭐ **记忆锚**：**c**all / **a**pply → "**执行**"；**b**ind → "**绑定**（留着以后用）"。

### 1.3 它最实用的场景：把方法交给别人调用时保住 `this`

这正是 192 集那个问题的第三种解法：

```js
// ① 箭头函数（现代写法）
this.el.addEventListener('click', (e) => { this.close(); });

// ② 存一份（老代码通用写法）
const self = this;
this.el.addEventListener('click', function (e) { self.close(); });

// ③ bind（195 集）
this.el.addEventListener('click', this.close.bind(this));   // ⭐ 直接绑好
```

**第 ③ 种在原理上最直白**：`this.close.bind(this)` 先造出一个"**`this` 已经固定成实例的 `close`**"，然后把这个新函数交给 `addEventListener`。**不管它后来被谁调用，里面的 `this` 都已经锁死了。**

**同理，定时器里也能用：**

```js
setTimeout(obj.say.bind(obj), 100);     // ✅ 保住了
setTimeout(obj.say, 100);               // ⚠️ this 丢了 → undefined
```

### 1.4 第二个用处：预设参数（偏函数）

`bind` **除了绑 `this`，还能把参数也一起"冻"进去**：

```js
function add(a, b, c) { return a + b + c; }

const addOne = add.bind(null, 1);      // 把 a 固定成 1；this 用不上，给 null
console.log(addOne(2, 3));             // 6   ← 1 + 2 + 3
console.log(addOne(10, 20));           // 31
```

⭐ **这就像"提前填好几个参数的坑，剩下的等以后来填"。** 这个用法在 C# 里对应**部分应用**（手动包一层 Lambda），但 C# 没有语言级的 `bind`。

⚠️ **注意 `bind` 出来的函数，`this` 是"锁死"的**：

```js
const bound = say.bind(obj);
bound.call(other);          // ⚠️ 再用 call 也改不回来了 —— 依然是 obj
```

**`bind` 是终局的** —— 这一点和 `call` / `apply`（每次都能改）不同。

---

## 2. 防抖（debounce）（196）

### 2.1 先看没有它的问题

```js
// 搜索框：每敲一个字就发一次请求
input.addEventListener('input', function () {
  // 用户打"javascript"十个字母 → 发了 10 次请求，前 9 次全是废的
});
```

**还有：窗口 `resize`（拖一下触发几十次）、按钮连点（下单两次）、滚动加载。**

⭐ **这些场景的共同点：事件被触发得太密，但真正有意义的只有"最后一次"（或"每隔一段一次"）。**

### 2.2 定义（用电梯打比方）

> **防抖：事件触发后开始计时，**等待 N 毫秒**。如果这期间又触发了，就**重新计时**。只有真正"停下来"之后，才执行一次。**

**电梯门就是这个逻辑** —— 有人进进出出，门就一直不关；**等没人了再关。**

⭐ **一句话记忆**：**防抖 = 只认最后一次。**

### 2.3 实现

```js
function debounce(fn, delay) {
  let timer = null;                          // ⭐ 闭包：这个变量会一直活着

  return function (...args) {                // 返回一个新函数（事件回调）
    if (timer) clearTimeout(timer);          // ① 上次的还没到点？取消它
    timer = setTimeout(() => {               // ② 重新起一个计时
      fn.apply(this, args);                  // ③ 时间到了，真正执行
    }, delay);
  };
}

// 用法
const search = debounce(function (e) {
  console.log('发请求：', this.value);
}, 500);

input.addEventListener('input', search);
```

### 2.4 ⭐ 逐行拆开看 —— 这里用到的全是你学过的东西

| 代码 | 这是什么 | 哪一集学的 |
|---|---|---|
| `let timer = null;` + 内部函数用它 | **闭包** | 154 |
| `return function (...) {...}` | 返回函数 | 154 / 157 |
| `clearTimeout` / `setTimeout` | 定时器与取消 | Web APIs（定时器那一轮） |
| `...args` | 剩余参数 | 156 |
| `fn.apply(this, args)` | 指定 `this` 执行，参数是数组 | **194（上一轮刚学）** |
| 里面用箭头函数 `() => {}` | 不改变 `this` | 192（上一轮刚学） |

⭐⭐ **`timer` 必须是"返回的那个函数外面"的变量** —— 因为**每次事件触发调用的是同一个 `timer`**，才能"取消上一次"。**如果 `let timer` 写在返回的函数里面，那每次调用都是新的 `timer`，永远取消失败** —— 防抖就变成了"延迟执行"，功能全废，**而且不报错**。

**这个细节是防抖的灵魂**，也是闭包最漂亮的一次应用：**一个变量，活在所有调用之间。**

### 2.5 ⚠️ 为什么要 `fn.apply(this, args)`，不能直接 `fn()`？

**因为要保住 `this` 和参数**：

```js
// ❌ 如果写成这样
timer = setTimeout(function () {
  fn();                                    // this 丢了（定时器回调里是 window）
}, delay);                                 // 参数也丢了

// ✅ 正确
timer = setTimeout(() => {
  fn.apply(this, args);                    // 箭头函数拿外层 this；args 是当初的参数
}, delay);
```

⚠️ **注意这里有个容易忽略的点**：`this` 和 `args` 都来自 **"返回的那个函数"被调用时**的现场（也就是 `input.addEventListener` 触发时）。**如果内层用普通函数，`this` 就变成 `window` 了** —— 所以要么用箭头函数，要么先把 `const self = this` 存下来。

### 2.6 需要注意的边界

| 边界 | 说明 |
|---|---|
| **参数和 `this` 要透传** | 见上面 2.5，不透传就是静默出错 |
| **`timer` 的位置** | 必须在返回函数**外面**（2.4 那条） |
| **"等待期间的触发会被丢弃"** | 这是设计如此 —— 但**如果用户打两下就停手 500ms，两次输入只发一次请求**，**这是要靠体验验证的**，必要时得加"立即执行"版本（课程没要求） |

## 3. 节流（throttle）（197）

### 3.1 定义（用游戏 CD 打比方）

> **节流：不管你在这一段时间里触发了多少次，**每 N 毫秒最多执行一次**。**

**就像游戏技能的冷却时间（CD）** —— 你狂按技能键，但它**每隔 3 秒才响应一次**，其余按键全部被忽略。

⭐ **一句话记忆**：**节流 = 每隔一段执行一次。**

### 3.2 实现（时间戳版）

```js
function throttle(fn, interval) {
  let last = 0;                          // ⭐ 上一次执行的时间戳（闭包）

  return function (...args) {
    const now = Date.now();              // 现在的时间戳
    if (now - last >= interval) {        // 距离上次够久了吗？
      last = now;                        // ① 记下这次的时间
      fn.apply(this, args);              // ② 执行
    }
    // 不够久 → 什么也不做（这一次被"节流"掉了）
  };
}

// 用法：滚动时每 500ms 最多执行一次
window.addEventListener('scroll', throttle(function () {
  console.log('scroll 位置：', window.scrollY);
}, 500));
```

**逻辑非常简单：记下"上次执行的时间"，来一次就比一比 —— 够久了就执行并更新时间，不够久就当没发生。**

⚠️ **注意 `let last = 0` 的初值是 `0`** —— 这是为了让**第一次触发**时 `now - 0` 必然大于等于 `interval`，所以**第一次一定会执行**。（如果初值写成 `Date.now()`，第一次反而会被拦掉。）

### 3.3 ⭐⭐ 防抖 vs 节流（本轮最重要的一张表）

| | **防抖（debounce）** | **节流（throttle）** |
|---|---|---|
| **一句话** | **只认最后一次** | **每隔一段一次** |
| 触发 10 次（间隔很短） | **最终只执行 1 次**（在停下来之后） | **大约每隔 N 毫秒执行 1 次** |
| 使用的判据 | "**还在动吗？**" | "**距离上次过了多久？**" |
| 类比 | **电梯门**（一直有人就不关） | **游戏技能 CD**（狂按也只响应一次） |
| 典型场景 | **搜索框输入**（打完再搜） | **滚动 / 鼠标移动 / 拖拽**（要持续有反馈） |
| 如果拖了很久 | 一直不执行，**直到你停手** | **沿途一直在执行**，只是稀疏 |

⭐ **怎么选？看你是要"最终结果"还是"过程中的反馈"**：

- **输入框搜索** → 你只关心**最后打了什么** → **防抖**
- **滚动加载 / 拖拽位置** → 你需要**过程中的持续反馈**，但不想太密 → **节流**

## 4. C# 对照

| JS 的做法 | C# 对应 | 档 |
|---|---|---|
| `bind` | 无直接对应（可用 Lambda 手动包一层） | ❌ **JS 特有** |
| `call` / `apply` | 无对应 | ❌ JS 特有 |
| 防抖 / 节流 | **Rx 的 `Throttle` / `Debounce`**（Reactive Extensions） | ⚠️ **概念一致，工具不同**；C# 里原生没有 |
| `setTimeout` | `Task.Delay` / `Timer` | ⚠️ 概念近，用法不同 |

⭐ **本轮的价值**：**防抖 / 节流不是 JS 特有的概念**（Rx 里就有），**但 JS 里因为你手写，是最能检验"我是不是真的懂了闭包和 `this`"的题目。**

---

==二：格式==

## 1. `call` / `apply` / `bind` 速查

```js
fn.call(this是谁, 参数1, 参数2);          // 立即执行，参数一个个列
fn.apply(this是谁, [参数1, 参数2]);       // 立即执行，参数在数组里
const f = fn.bind(this是谁, 参数1);       // 不执行，返回绑好 this 的新函数
f(参数2);                                 // 现在才执行
```

## 2. 保住 `this` 的三种写法（本轮补齐）

```js
// ① 箭头函数
el.addEventListener('click', (e) => { this.close(); });

// ② 存一份
const self = this;
el.addEventListener('click', function (e) { self.close(); });

// ③ bind
el.addEventListener('click', this.close.bind(this));
```

⭐ **推荐度：① > ③ > ②**（① 最短，③ 意图最明确，② 是历史写法但兼容性最好）。

## 3. 防抖模板（照抄）

```js
function debounce(fn, delay) {
  let timer = null;                    // ⚠️ 必须在返回函数外面
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);            // ⚠️ this 和 args 都要透传
    }, delay);
  };
}
```

## 4. 节流模板（照抄）

```js
function throttle(fn, interval) {
  let last = 0;                        // ⚠️ 初值 0 才能让第一次执行
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}
```

---

==三：代码==

## 1. `bind` 的三种用法实验（195）

```js
// ═══ ① 只绑 this ═══
function say() { console.log('我是 ' + this.name); }
const obj = { name: '张三' };

const bound = say.bind(obj);
bound();                       // 我是 张三    ← 现在才执行

// ═══ ② 绑 this + 预设参数 ═══
function add(a, b, c) { return a + b + c; }
const addOne = add.bind(null, 1);      // this 用不上，给 null
console.log(addOne(2, 3));             // 6

// ═══ ③ 锁死了，连 call 也改不回来 ═══
const other = { name: '李四' };
bound.call(other);                     // ⚠️ 依然打印"我是 张三"
```

## 2. 防抖的完整演示（196）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>防抖</title></head>
<body>
  <input id="kw" placeholder="试着快速打字，看控制台">
  <p>没有防抖的 input：<span id="rawCount">0</span> 次</p>
  <p>加了防抖的 input：<span id="debCount">0</span> 次</p>

  <script>
    function debounce(fn, delay) {
      let timer = null;
      return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          fn.apply(this, args);
        }, delay);
      };
    }

    const input = document.querySelector('#kw');
    let raw = 0, deb = 0;
    const rawEl = document.querySelector('#rawCount');
    const debEl = document.querySelector('#debCount');

    // ① 不加防抖 —— 每敲一下算一次
    input.addEventListener('input', function () {
      raw++;
      rawEl.textContent = raw;
    });

    // ② 加防抖 —— 停下来 500ms 才算一次
    const realSearch = debounce(function (e) {
      deb++;
      debEl.textContent = deb;
      console.log('真正执行搜索，关键词：', this.value);   // ⭐ this 是 input
    }, 500);

    input.addEventListener('input', realSearch);
  </script>
</body>
</html>
```

**实验方法**：快速打 10 个字 —— 上面那个计数会变成 10，**下面那个只会变成 1**（因为你停下来之后才执行）。**再停一下、再打几个字，下面变成 2。**

## 3. 节流的完整演示（197）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>节流</title>
  <style>
    body { height: 3000px; }
    .bar { position: fixed; top: 10px; right: 10px; background: #eee; padding: 8px 12px; }
  </style>
</head>
<body>
  <div class="bar">滚动执行次数：<span id="count">0</span></div>

  <script>
    function throttle(fn, interval) {
      let last = 0;
      return function (...args) {
        const now = Date.now();
        if (now - last >= interval) {
          last = now;
          fn.apply(this, args);
        }
      };
    }

    let n = 0;
    const countEl = document.querySelector('#count');

    window.addEventListener('scroll', throttle(function () {
      n++;
      countEl.textContent = n;
    }, 500));
  </script>
</body>
</html>
```

**实验方法**：在页面上一直滚 —— **不管滚多久、滚多快，计数每 500ms 才 +1**（而不是每次 `scroll` 事件都 +1，那会是几十上百次）。

**对比着看**：同样的滚动，如果换成**防抖**，那么**你一直滚它一直不执行** —— 直到你**停手**才执行一次。**这就是两者最直观的区别。**

## 动手小练习（不留超纲作业）

**给按钮加"防连点"**：

1. 用防抖把 `#submit` 按钮的点击包起来（延迟 1000ms）
2. 快速点 5 次 —— 控制台应该**只打印 1 次**（说明重的提交被挡掉了）

**进阶版**：换成节流再试一次（间隔 1000ms）—— 快速点 5 次会打印**几次**？想一想为什么和防抖不一样。

（提示：防抖是"停手才执行"，所以你连点时**一次都不会执行**；等你停手 1 秒后，才执行 1 次。这个差别你可以亲手验证。）

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 195 | **`bind` 和 `call`/`apply` 只差一件事：不立即执行，返回一个绑好 `this` 的新函数** |
| 196 | **防抖 = 只认最后一次**（电梯门：一直有人就不关） |
| 197 | **节流 = 每隔一段执行一次**（游戏 CD：狂按也只响应一次） |

## 2. ⭐⭐ 本轮要背的：防抖 vs 节流

| | 防抖 | 节流 |
|---|---|---|
| 一句话 | **只认最后一次** | **每隔一段一次** |
| 触发 10 次 | **只执行 1 次**（停手后） | **大约每 N 毫秒 1 次** |
| 判据 | 还在动吗？ | 距离上次过多久了？ |
| 用在哪 | **搜索框输入** | **滚动 / 拖拽 / 鼠标移动** |

**选型的判据**：**你要"最终结果"用防抖，要"过程中的持续反馈"用节流。**

## 3. ⭐⭐ 收敛时刻：从第 ⑮ 轮起的这一路，在这里收束

**防抖这十几行代码里，塞满了你前面学过的东西：**

| 代码 | 是什么 | 学于 |
|---|---|---|
| `let timer = null` 被内部函数读写 | **闭包** | 154 |
| `return function (...) {...}` | 闭包 + 高阶函数 | 154 / 157 |
| `setTimeout` / `clearTimeout` | 定时器 | Web APIs |
| `...args` | 剩余参数 | 156 |
| `fn.apply(this, args)` | 指定 `this` 执行 | **194（上一轮）** |
| `() => {}` 保住 `this` | 箭头函数的词法 `this` | **192（上一轮）** |

⭐ **`timer = null` 放在返回函数外面那一行，是这十几行的灵魂** —— 它让**一个变量活在所有调用之间**。这就是闭包的价值：

> **闭包不是"背定义"，而是"让一个值在多次调用之间活下来"。** 防抖的 `timer`、节流的 `last`，都是同一个用法。

**这也是为什么防抖/节流常被当成面试题** —— 它一次性考了闭包、`this`、`apply`、定时器。**而你现在全都学过了。**

## 4. 静默失败清单（本轮 3 条，全都不报错）

| 你写的 | 实际发生 |
|---|---|
| `let timer` 写在返回函数**里面** | 每次都是新的 `timer`，取消失败 → **防抖退化成"延迟执行"**，功能全废，**无报错** |
| 内层用普通函数而不是箭头函数 | `this` 变成 `window`，`this.value` 是 `undefined`，**无报错** |
| 忘了 `fn.apply` 直接用 `fn()` | 参数和 `this` 都丢了，**无报错** |

⭐ **防抖/节流最麻烦的地方是**：**它写错了通常不报错，只是"行为不对"** —— 而"行为不对"要靠肉眼看控制台计数才能发现。**所以那两个演示页面（三、2 和 三、3）值得真的跑一遍。**

## 5. C# 类比可用度（本轮新增）

| JS 的做法 | C# 对应 | 档 |
|---|---|---|
| `bind` | 无对应（Lambda 手动包一层可以模拟） | ❌ **JS 特有** |
| `call` / `apply` | 无对应 | ❌ JS 特有 |
| 防抖 | Rx 的 `Debounce`（或自己用 `Timer` 实现） | ⚠️ **概念一致，工具不同** |
| 节流 | Rx 的 `Throttle` | ⚠️ 同上 |
| `setTimeout` / `clearTimeout` | `Timer` / `Task.Delay` + `CancellationToken` | ⚠️ 概念近，用法不同 |
| 把定时器句柄存在闭包里 | `CancellationTokenSource` 的持有 | ⚠️ **都是"保存句柄以便取消"** |

## 6. 解锁边界（本轮变更）

**新解锁**
- ✅ **`bind`**

**⚠️ 课程到此，`call` / `apply` / `bind` 三者齐了** —— 至此**"`this` 完整模型"全部学完**。

**仍然锁着**
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` · `for...of` ← **课程内永不解锁**

## 7. 下一轮预告

第 **198 / 199 / 200** 集 —— **这套课程的最后三集：收尾。**

| 集 | 内容 |
|---|---|
| 198 | **节流综合案例 · 记录视频播放时间** — 🧪 实操 |
| 199 | **JavaScript 核心与进阶大结局** — 🔁 听个响 |
| 200 | （课程收尾） |

⚠️ **课程结束了。** 下一轮我会做两件事：① 讲完 198 那个实操案例的架构；② **给整个 200 集做一次完整的收官盘点** —— 从 HTML / CSS / JS 基础到进阶，把这一路学过的所有东西列成一张总图，并**明确标出"这个课程没有覆盖、但你需要单补的空白"**（最关键的一块：**`fetch` / Promise / `async/await`** —— 也就是**"从你自己的 ASP.NET Core 接口取数据"这一步**）。

⭐ **从 77 集到 200 集这一长段，下一轮就走到头了。** 到时候我会给你一份完整的"学完了什么 / 还缺什么 / 下一步该学什么"的清单。
