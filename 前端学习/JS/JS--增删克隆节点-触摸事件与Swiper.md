# 第 9 轮 · 增加 / 克隆 / 删除节点 · 移动端触摸 · Swiper

> 覆盖第 **120-123 集**（应用篇 Day5）。
> 速查底座：[`JS--DOM速查表-查询与改内容.md`](./JS--DOM速查表-查询与改内容.md)（本轮就地扩写 §8）、[`JS--事件速查表-绑定与常见事件.md`](./JS--事件速查表-绑定与常见事件.md)（本轮就地扩写 §16）、[`./JS--CSharp类比可用度地图.md`](./JS--CSharp类比可用度地图.md)
> 上一课：[`JS--日期与时间戳-查找节点.md`](./JS--日期与时间戳-查找节点.md)
> 权威来源：MDN（见 MDN 各节外链）；Swiper 官方文档 <https://swiperjs.com/get-started>

---

## ==一：概念==

### ㉕ 增加 / 克隆 / 删除节点 —— 「造」和「挂」是两步

**对标 C#：这一集几乎一一对应。**

| C# WinForms | DOM |
|---|---|
| `new Button()` —— 对象有了，界面还没有 | `document.createElement('li')` |
| `this.Controls.Add(btn)` | `父.appendChild(li)` |
| `Controls.Insert(index, ctrl)` | `父.insertBefore(li, ref)`（DOM 用**参考节点**而不是下标） |
| `Controls.Remove(ctrl)` | `父.removeChild(li)` |

**核心认知**：`createElement` 造出来的节点是**游离的**——在内存里，但不在文档树上，所以页面上什么都看不见。**必须再插一次。** 新手最常见的 bug 就是只造不插。

**MDN 原话（`appendChild`）**：
> 「将一个节点**附加到指定父节点的子节点列表的末尾处**。如果将被插入的节点**已经存在于当前文档的文档树中**，那么 `appendChild()` 只会将它**从原先的位置移动到新的位置**……这意味着，**一个节点不可能同时出现在文档的不同位置**。」

→ **`appendChild` 是「移动」，不是「复制」**。想把一个已有节点再放一份，必须先 `cloneNode()`。

**插入落点只有三种**（没有 `insertAfter`）：

```js
父.appendChild(child);                 // 末尾
父.insertBefore(child, refNode);       // refNode 之前
父.insertBefore(child, null);          // = appendChild（MDN：refNode 不是可选参数）
```

MDN：「**没有 `insertAfter()` 方法。可以通过将 `insertBefore` 方法与 `Node.nextSibling` 结合使用来模拟实现。**」

**删除：两种写法差一个返回值**

| 写法 | 调用者 | 返回 |
|---|---|---|
| `el.remove()` | 元素自己 | `undefined`（不用先拿父元素） |
| `父.removeChild(el)` | 父元素 | **被删掉的那个节点** |

MDN 关于 `removeChild` 的一句话，把 ⑩ 和本集缝在了一起：
> 「只要对被移除的子节点保持引用，它仍然存在于内存中，但**不再是 DOM 的一部分**……**与 `Node.cloneNode()` 不同，返回值保留了与其关联的 `EventListener` 对象。**」

**`removeChild` 是会老实报错的少数 API**：参数不是它的子节点 → `NotFoundError`；参数是 `null` → `TypeError`。

### 克隆：`cloneNode(deep)`

**MDN 原话**：
> 「克隆一个节点会复制它的**所有属性及其对应的值，包括内联事件监听器**。它**不会**复制通过 `addEventListener()` 添加的事件监听器，或赋值给元素属性的事件处理器（例如 `node.onclick = someFunction`）。」
> 「如果为 `true`，则节点**及其整个子树**，包括可能存在于 `Text` 子节点中的文本，也会被复制。如果为 `false`，则**仅复制节点本身**。」
> 「克隆的节点**没有父节点**，并且在被添加到文档中其他节点之前，**不会**成为文档的一部分。」

⚠️ 注意那个「属性 vs 监听器」的分裂 —— 又回到第 ④ 轮那条线：`<li onclick="...">`（HTML **属性**）会被复制；`el.onclick = fn`（**property 赋值**）不会。

**MDN 的官方警告**：「`cloneNode()` **可能会导致文档中出现重复的元素 ID**！」→ 克隆出来的节点如果会留在同一文档里，**必须改掉 id**。

### ㉖ 移动端触摸事件 —— 三个列表、一个必背的坑

| 事件 | 时机 |
|---|---|
| `touchstart` | 手指落下（一次） |
| `touchmove` | 滑动中（**反复触发，频率不可依赖**） |
| `touchend` | 手指离开 |
| `touchcancel` | 被系统打断（弹窗 / 划出屏幕 / 触点超限） |

| 列表 | 装的是 |
|---|---|
| `e.touches` | 此刻**还在平面上**的所有触点 |
| `e.targetTouches` | 上面那些里，**起始于当前元素**的 |
| `e.changedTouches` | **本次事件里状态发生变化**的触点 |

⭐ **必背**：**`touchend` 时 `e.touches` 是空的**（手指已经离开平面）。要拿"刚抬起的那个点"，必须读 **`changedTouches`**。MDN：「已经被从触摸平面上移除的触点，可以在 `changedTouches` 属性定义的 `TouchList` 中找到。」

**`preventDefault()` 在触摸事件上默认拦不住**（回连 ⑲ 的 passive 那一条）。MDN 原话：
> 「Chrome 是例外，从版本 56 开始，Chrome 中 `touchstart` 和 `touchmove` 的 `passive` 选项的**默认值就是 `true`**，调用 `preventDefault()` **无效**。如果要重写这个行为，简单地将 `passive` 选项设置成 `false` 就行。」

**别用 touch 事件替代 `click`**。MDN：「很值得注意的是，**在很多情况下，触摸事件和鼠标事件会一起触发**」——两套都绑，一次点击逻辑会跑两遍。触摸事件只留给"鼠标表达不了的操作"（滑动、拖拽、多指手势）。

**对标 C#**：WinForms 里你没写过触摸代码，是因为 Windows 把触摸**"提升（promotion）"成鼠标事件**。浏览器是同一思路的加强版：触摸也会触发 `click`，只是把原始那套也一并给了你。

### ㉗ Swiper —— 第一个第三方库

**身份**：不是 Web API，是别人写好的 JS 库（对标 C# 的 NuGet 包）。**用库不需要读懂源码**（它内部用了 `class` 语法，进阶篇才学），按文档配即可。

**三层固定结构**（类名一个字都不能改）：

```html
<div class="swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide">…</div>
  </div>
</div>
```

**Swiper 官方文档明确提示**：「we may need to add some custom styles to **set Swiper size**」→ **忘了给 `.swiper` 设 `width` / `height`，页面上一片空白**（内部是绝对定位，容器高度会塌成 0）。

**⭐ 它的内部原料，你这一轮刚全学过**：`touchstart/move/end`（跟手）→ `pageX` 差值 + `style.transform`（位移）→ `setTimeout`（自动播放）→ `createElement` / `cloneNode`（动态加项、克隆首尾）→ 事件委托（分页器）。**"会用库"与"看懂库"之间的差距，不是神秘知识，只是这一层的组装。**

---

## ==二：格式==

```js
// ── 增 ──
const li = document.createElement('li');   // 造（游离态，页面看不到）
li.innerText = '内容';
li.dataset.id = 101;                       // 挂数据（⑧）
父.appendChild(li);                         // 挂到末尾
父.insertBefore(li, ref);                   // 挂到 ref 之前；ref 传 null = 末尾

// ── 克 ──
const copy = 源.cloneNode(true);            // ⭐ 一定写 true；不写 = 空壳
copy.id = '';                               // ⚠️ 克隆会复制 id，必须改掉
父.appendChild(copy);

// ── 删 ──
el.remove();                                // 删自己，返回 undefined
const dead = 父.removeChild(el);            // 删子节点，返回它本身（事件还在！）

// ── 触摸 ──
el.addEventListener('touchmove', fn, { passive: false });   // 要拦默认行为必须这样写
const t = e.touches[0];          // 坐标：t.clientX/Y、t.pageX/Y、t.screenX/Y（同 ㉑）
const t2 = e.changedTouches[0];  // ⭐ touchend 里只能用这个

// ── 库 ──
const swiper = new Swiper('.swiper', { loop: true, autoplay: { delay: 2000 } });
```

---

## ==三：代码==

### 1）增 + 移动 + 删（一个文件跑完）

```html
<!DOCTYPE html>
<html>
<body>
  <ul id="list">
    <li>已有的第一项</li>
    <li>已有的第二项</li>
  </ul>
  <button id="add">加一项</button>
  <button id="move">把第一项挪到末尾</button>
  <p id="log">看 Console 和列表</p>

  <script>
    const list = document.querySelector('#list');
    const log  = document.querySelector('#log');
    let n = 3;

    document.querySelector('#add').addEventListener('click', function () {
      const li = document.createElement('li');   // ① 造（还看不见）
      li.innerText = '第 ' + n + ' 项';
      li.dataset.id = n;
      list.appendChild(li);                      // ② 挂（这才出现在页面）
      log.innerText = '现在有 ' + list.children.length + ' 项';
      n++;
    });

    // ⭐ 证据：项数不变，第一项跑到最后 —— appendChild 是「移动」
    document.querySelector('#move').addEventListener('click', function () {
      list.appendChild(list.firstElementChild);
    });

    // 删：全程只有这一个监听器（事件委托）
    list.addEventListener('click', function (e) {
      if (e.target.tagName === 'BUTTON') {        // 假设每行里有个按钮
        e.target.parentElement.remove();          // 删自己那一行
      }
    });
  </script>
</body>
</html>
```

### 2）模板克隆（含必须做的两件事）

```js
const tpl  = document.querySelector('#tpl');   // 页面上藏好的模板节点
const list = document.querySelector('#list');

const li = tpl.cloneNode(true);   // ① 一定要传 true
li.id = '';                       // ② 克隆复制了 id，必须清掉
li.innerText = '新的一行';
list.appendChild(li);             // ③ 克隆出来的节点没有父节点，必须自己挂

// ④ 事件：克隆不带 addEventListener 的监听器
//    → 要么在这里手动绑一次，要么（推荐）在 list 上用事件委托
```

### 3）移动端跟手滑动（触摸四件套）

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    .box { width: 200px; height: 200px; background-color: #eee; }
  </style>
</head>
<body>
  <div class="box" id="box"></div>
  <p id="log">在手机上用手指划这个方块</p>

  <script>
    const box = document.querySelector('#box');
    const log = document.querySelector('#log');

    box.addEventListener('touchstart', function (e) {
      log.innerText = '落下：' + e.touches.length + ' 个手指';
    }, { passive: false });

    box.addEventListener('touchmove', function (e) {
      const t = e.touches[0];
      log.innerText = 'pageX=' + Math.round(t.pageX) + '  pageY=' + Math.round(t.pageY);
      e.preventDefault();                       // 拦住页面跟着滚
    }, { passive: false });

    box.addEventListener('touchend', function (e) {
      const t = e.changedTouches[0];             // ⭐ touchend 时 touches 已空
      log.innerText = '抬起于 pageX=' + Math.round(t.pageX);
    });
  </script>
</body>
</html>
```

---

## ==四：总结==

### 一句话版

- **㉕**：「造」和「挂」是两步；`appendChild` 是**移动**不是复制；`cloneNode()` **丢监听器**，而 `removeChild` 的**返回值保留监听器**。
- **㉖**：`touchend` 必须读 `changedTouches`；要 `preventDefault` 必须 `{ passive: false }`；别拿 touch 替代 `click`。
- **㉗**：库的用法 = **固定结构 + 尺寸 + 脚本顺序 + 配置对象**；内部原料你都会了。

### 自测三题（做完再往下看）

1. `list.appendChild(list.firstElementChild)` 执行一次，列表**长度**和**内容**分别怎么变？为什么？
2. 用 `cloneNode(true)` 克隆出来的 `li` 插进页面后"点了没反应"，两个可能原因是什么？
3. 手机上滑动时页面跟着滚，你已经写了 `e.preventDefault()` 却没用——最可能漏了什么？

<details>
<summary>答案</summary>

1. **长度不变，第一项跑到最后。** `appendChild` 对已在文档中的节点只做**移动**（MDN：一个节点不可能同时出现在文档的两个位置）。
2. ① **监听器不跟着克隆走**（`addEventListener` 绑的不会复制）→ 该用事件委托或手动绑；② `e.target` 其实不是你克隆的那个元素（可能点在子元素上）→ 需要身份检查。顺带检查 id 是否重复了。
3. 漏了 **`{ passive: false }`**。Chrome 56+ 里 `touchstart` / `touchmove` 的 `passive` 默认是 `true`，此时 `preventDefault()` **不产生任何效果**，还可能弹控制台警告。

</details>

### 动手练习（串起 5 个知识点）

做一个**待办清单**，硬性要求：

- 输入框回车添加（`createElement` + `appendChild`，**禁止 `innerHTML +=`**）
- 每项右边一个"×"，点击删除（`remove()`）
- **全程只允许一个监听器**，绑在 `ul` 上（事件委托）
- 新项由隐藏模板 `cloneNode(true)` 生成，生成后**必须改掉 id**

### 有疑问就问

我是你的老师，这一课里任何一句不清楚（尤其是"为什么 appendChild 是移动"、"克隆为什么丢事件"），直接问，别攒着。

### 相关

- 上一课：[`JS--日期与时间戳-查找节点.md`](./JS--日期与时间戳-查找节点.md)
- 底座：`JS--DOM速查表-查询与改内容.md` §7（节点两条轨）+ §8（增/克隆/删）、`JS--事件速查表-绑定与常见事件.md` §16（触摸）
- 一手来源：[MDN `appendChild`](https://developer.mozilla.org/zh-CN/docs/Web/API/Node/appendChild)、[`insertBefore`](https://developer.mozilla.org/zh-CN/docs/Web/API/Node/insertBefore)、[`cloneNode`](https://developer.mozilla.org/zh-CN/docs/Web/API/Node/cloneNode)、[`removeChild`](https://developer.mozilla.org/zh-CN/docs/Web/API/Node/removeChild)、[触摸事件](https://developer.mozilla.org/zh-CN/docs/Web/API/Touch_events)、[Swiper 官方文档](https://swiperjs.com/get-started)
