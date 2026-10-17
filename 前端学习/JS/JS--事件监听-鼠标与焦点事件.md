# JS--事件监听 · 鼠标与焦点事件

> **本课目标**：学会"订阅"页面事件，并能说清 `addEventListener` 与 `onclick` 的本质差别、`mouseenter` 与 `mouseover` 的差别、`focus` 与 `focusin` 的差别。
> **为什么学它**：Web APIs 篇前 3 轮都是"我主动去改页面"；从这一轮开始变成"页面来通知我"。**单线程 + 回调队列**这套机制真正的用武之地就在这——事件处理函数就是回调。
> **对应视频**：第 93-98 集（应用篇 Day1-Day2）
> **主源**：MDN [`addEventListener()`](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener)、[`mouseenter` 事件](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/mouseenter_event)、[`focus` 事件](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/focus_event)、[`blur` 事件](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/blur_event)

---

==一：概念==

### 事件三要素

一次事件监听由三部分组成，缺一不可：

| 部分 | 写法 | 一句话 |
|---|---|---|
| 事件源 | `btn` | 哪个元素被监听 |
| 事件类型 | `'click'` | **大小写敏感的字符串**，不带 `on` |
| 处理函数 | `function () {}` | 触发时由**浏览器**调用 |

### `addEventListener` 的本质是 `+=`

对标 C#——**这是正面对应，不是"像"**：

| C# | JS |
|---|---|
| `button.Click += Handler;` | `btn.addEventListener('click', Handler);` |
| `button.Click -= Handler;` | `btn.removeEventListener('click', Handler);` |
| 事件 + 委托 + 订阅者列表 | 事件类型 + 回调 + 监听器列表 |

记住这个直觉，后面所有"行为差异"都能自己推出来：

- `addEventListener` → 往**列表**里加，加几个都行，按注册顺序执行。
- `onclick = fn` → 给**一个属性**赋值，只有一个位置，后来的挤掉先来的。
- 两者**互不干扰**：`onclick` 和 `addEventListener` 是两套机制，设了 `onclick` 不会清掉已注册的监听器。

### 事件名清单（本轮涉及的）

| 类别 | 事件名 | 冒泡 | 备注 |
|---|---|---|---|
| 鼠标 | `click` | 是 | 按下 + 松开 |
| | `dblclick` | 是 | 双击 |
| | `mousedown` / `mouseup` | 是 | 按下 / 松开 |
| | `mouseenter` / `mouseleave` | **否** | 只在元素边界触发，≈ CSS `:hover` |
| | `mouseover` / `mouseout` | **是** | 进子元素也会触发；第 ⑰ 个知识点细讲 |
| | `mousemove` | 是 | 触发极频繁 |
| | `contextmenu` | 是 | 右键 |
| 焦点 | `focus` | **否** | 获得焦点；**不可取消** |
| | `blur` | **否** | 失去焦点；**不可取消** |
| | `focusin` | **是** | 同 focus，但会冒泡 |
| | `focusout` | **是** | 同 blur，但会冒泡 |

### 三个"差别"是本课的全部价值

| 对比 | 结论 |
|---|---|
| `addEventListener` vs `onclick` | 前者挂列表（可多个、按顺序），后者改属性（只留最后一个）|
| `mouseenter` vs `mouseover` | 前者不冒泡、只认自己边界；后者冒泡、进子元素也触发 |
| `focus` vs `focusin` | 前者不冒泡（所以做不了委托），后者冒泡 |

---

==二：格式==

**骨架**

```js
const 元素 = document.querySelector('选择器');
元素.addEventListener('事件类型字符串', 处理函数);
```

**三种变体**

```js
// ① 匿名函数：写起来快，但解绑不了
btn.addEventListener('click', function () { /* ... */ });

// ② 具名函数：要解绑就必须这样写（解绑要求同一个引用）
function handler() { /* ... */ }
btn.addEventListener('click', handler);
btn.removeEventListener('click', handler);     // 传的必须是同一个引用

// ③ 第三个参数：选项对象
btn.addEventListener('click', handler, { once: true });   // 触发一次后自动解绑
btn.addEventListener('focusin', handler, { capture: true }); // 捕获阶段触发（⑯ 细讲）
```

**最容易写错的四种写法**

| 你写的 | 实际发生 | 结果 |
|---|---|---|
| `addEventListener('onclick', fn)` | 监听一个叫 `onclick` 的类型 | **永远不触发**，且不报错 |
| `addEventListener('clik', fn)` | 类型名拼错 | 同上，静默失败 |
| `addEventListener('Click', fn)` | 大小写不匹配 | 同上，静默失败 |
| `addEventListener('click', fn())` | 立刻执行 `fn`，把返回值传进去 | 监听器是 `undefined` |

---

==三：代码==

### ① 挂多个 + 解绑

```html
<!DOCTYPE html>
<html>
<body>
  <button id="btn">点我</button>
  <p id="log">还没点</p>

  <script>
    const btn = document.querySelector('#btn');
    const log = document.querySelector('#log');

    // 挂第一个
    btn.addEventListener('click', function () {
      log.innerText = '被点了';
      console.log('A 执行');
    });

    // 同一事件挂第二个 —— 具名函数，方便之后解绑
    function handlerB() {
      console.log('B 执行');
    }
    btn.addEventListener('click', handlerB);

    // 点一下，控制台顺序：A 执行 → B 执行（按注册顺序）

    // 解绑：必须传同一个引用
    // btn.removeEventListener('click', handlerB);       // 有效
    // btn.removeEventListener('click', function () {}); // 无效：这是另一个函数

    // 反面教材：onclick 是属性赋值，再写一次就覆盖自己
    btn.onclick = function () { console.log('onclick 那条'); };
    // 注意：它不会冲掉上面 addEventListener 挂的两个。
    // 点一下会看到三行日志 —— 但再写一次 btn.onclick = ...，前一个 onclick 就没了。
  </script>
</body>
</html>
```

### ② 鼠标：正确的 hover 写法

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .box { width: 200px; height: 100px; background-color: #ddd; }
    .box.hot { background-color: orange; }
    .box .inner { width: 80px; height: 40px; background-color: white; }
  </style>
</head>
<body>
  <div class="box" id="box">
    <div class="inner">子元素</div>
  </div>
  <p id="log">把鼠标移上去试试</p>

  <script>
    const box = document.querySelector('#box');
    const log = document.querySelector('#log');

    // 正确姿势：mouseenter / mouseleave —— 只认自己的边界，被子元素无视
    box.addEventListener('mouseenter', function () {
      box.classList.add('hot');
      log.innerText = '进入父元素';
    });
    box.addEventListener('mouseleave', function () {
      box.classList.remove('hot');
      log.innerText = '离开父元素';
    });

    // 对比：换成 mouseover / mouseout，移到「子元素」上也会让父元素触发
    // box.addEventListener('mouseover', function () { log.innerText = 'over：进子元素也算'; });

    // mousemove：频率极高，只做轻活
    box.addEventListener('mousemove', function (event) {
      log.innerText = 'offsetX=' + Math.round(event.offsetX) + '  offsetY=' + Math.round(event.offsetY);
    });
  </script>
</body>
</html>
```

### ③ 焦点：小米搜索框那套

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .search { width: 300px; height: 34px; border: 1px solid #ccc; color: #999; }
    .search.active { border-color: #ff6700; color: #333; }
  </style>
</head>
<body>
  <input class="search" id="search" value="小米手机">

  <script>
    const search = document.querySelector('#search');

    search.addEventListener('focus', function () {
      search.classList.add('active');
      if (search.value === '小米手机') {
        search.value = '';                  // 占位文字：一聚焦就清掉
      }
    });

    search.addEventListener('blur', function () {
      search.classList.remove('active');
      if (search.value === '') {
        search.value = '小米手机';           // 什么都没填 → 还原
      }
      // ⚠️ 千万别在这写 alert()：它抢焦点 → 又触发 blur → 死循环
    });
  </script>
</body>
</html>
```

### ④ 故意造两个"静默失败"

```js
// 这两个都不报错，页面就是没反应 —— 本轮最该亲手撞一次的错
btn.addEventListener('onclick', function () { console.log('永远不执行'); });
btn.addEventListener('clik',    function () { console.log('也永远不执行'); });
```

**排查顺序**：先 `console.log` 确认处理函数**根本没进来** → 再逐字符核对事件名（拼写 + 大小写 + 有没有多写 `on`）。

---

==四：总结==

### 1. 必须记住的 7 条

1. **`addEventListener('事件类型', 函数)`** —— 类型是**不带 `on`** 的、**大小写敏感**的字符串。
2. **同一事件可挂多个监听器，按注册顺序执行**；`onclick` 是属性赋值，只留最后一个。
3. **同一个函数引用不会重复添加；匿名函数会**（即使代码完全相同）。循环里绑事件请用具名函数。
4. **解绑要求同一个函数引用** —— 匿名函数解绑不了。对标 C# `-=` 也要求同一个委托实例。
5. **事件名写错不报错，只是永远不触发。** 这是本轮最阴的坑。
6. **`mouseenter` / `mouseleave` 不冒泡**（做 hover 用它），**`mouseover` / `mouseout` 冒泡**（深层次结构下会发很多事件，MDN 明确建议改用 mouseenter）。
7. **`focus` / `blur` 不冒泡且不可取消**；要冒泡用 **`focusin` / `focusout`**；`preventDefault` 对它们无效。

### 2. 要改掉的 C# 直觉

| C# 直觉 | JS 实际 |
|---|---|
| 订阅事件就是 `+=`，天然支持多个 | 两套写法并存：`onclick` 只留一个，`addEventListener` 才是 `+=` |
| 事件只有订阅关系，没有传播路径 | DOM 事件有**捕获 → 目标 → 冒泡**三段路径（⑯ 专讲），冒不冒泡要逐个事件查 |
| 所有事件都能取消 | 每个事件自带"可取消性"；`focus` / `blur` 不可取消 |
| 事件名写错，编译器会报错 | **运行时静默失败**，只能靠 `console.log` 排查 |

### 3. 自测三题（先自己想，再看答案）

1. `btn.addEventListener('click', handlerB)` 执行两遍，点一下按钮，`handlerB` 会执行几次？
2. 一个 `div` 里套着一个 `span`，鼠标从外部移到 `span` 上，只给 `div` 绑了 `mouseover`——会不会触发？换成 `mouseenter` 呢？
3. 为什么 `focus` 做不了事件委托，`focusin` 可以？

<br>

**答案**

1. **一次。** 同一个函数引用不会被重复添加（MDN：「如果要绑定的函数或对象已经被添加到列表中，该函数或对象不会被再次添加」）。但如果换成两个内容一模一样的**匿名函数**，就会执行两次。
2. 绑 `mouseover` **会触发**（事件发到最深的 `span`，再冒泡回 `div`）；绑 `mouseenter` **不会**（它不冒泡，也不发送给后代，只在进入 `div` 自己边界时触发一次）。
3. 因为 **`focus` 不冒泡**——事件不会往上走到父容器，父容器上的监听器收不到。`focusin` 会冒泡，所以可以在父容器上统一接住。（另一条路是 `addEventListener` 传 `{ capture: true }`，趁捕获阶段在父容器上截住。）

### 4. 动手练习

做一个"输入框实时跟随"的小页面：

- 页面上一个 `input` 和一个 `p`
- **聚焦**输入框时：`p` 的文字变成"正在输入…"
- **失去焦点**时：`p` 显示输入框里的最终内容
- 再给一个 `div` 加上 `mouseenter` / `mouseleave`，鼠标进出时换背景色（用 `classList`，别忘了第 ⑥ 个知识点的教训）
- 用 F12 的 Console 验证：事件名写错时**一句报错都没有**，页面就是没反应

### 5. 下一步

- 接着学：第 99-102 集 —— 键盘事件 / 事件对象 `event` / 环境对象 `this`
- 速查表：[`JS--事件速查表-绑定与常见事件.md`](./JS--事件速查表-绑定与常见事件.md)
- 上一课：[`JS--DOM查询语句逐词拆解.md`](./JS--DOM查询语句逐词拆解.md)
- **有不清楚的地方直接问我。** 我是你的老师，可以随时追问任何细节 —— 别自己憋着。

---

**建议读一遍原文**：MDN [`addEventListener()`](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener)（尤其"内存问题"和"为什么使用 addEventListener"两节，是 100% 一手资料）。
