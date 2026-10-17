# JS--进阶篇 12 · 模态框 open 与 close 封装 · 原型段小结 · 浅拷贝

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **185 / 186 / 187** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **本轮定位**：185-186 **原型这一段的收尾**；187 **进入 Day 4（拷贝 / this / 防抖节流）**。

---

==一：概念==

## 1. 模态框的 `open` / `close`（185-186）—— 🧪 实操，讲架构

### 1.1 把两个方法写完整

上一轮（184）搭好了骨架，这一轮把它补成能用的：

```js
function Modal(title, content) {
  this.title = title;
  this.content = content;
  this.isOpen = false;                      // ⭐ 状态：会不会显示，由它说了算

  this.el = document.createElement('div');
  this.el.className = 'modal';
  this.el.innerHTML =
    '<div class="modal-box">' +
      '<h4>' + this.title + '</h4>' +
      '<p>' + this.content + '</p>' +
      '<button class="closeBtn">关闭</button>' +
    '</div>';
  document.body.appendChild(this.el);
}

// ⭐ open：只是把状态改成 true，再把"状态"同步到 DOM 上
Modal.prototype.open = function () {
  this.isOpen = true;
  this.el.classList.add('show');
};

// ⭐ close：同理
Modal.prototype.close = function () {
  this.isOpen = false;
  this.el.classList.remove('show');
};
```

**CSS 负责"显示成什么样"（含过渡动画）：**

```css
.modal { position: fixed; inset: 0; background: rgba(0,0,0,.5);
         display: flex; align-items: center; justify-content: center;
         opacity: 0; visibility: hidden; transition: opacity .25s; }
.modal.show { opacity: 1; visibility: visible; }
```

### 1.2 ⭐ 这一轮最该看懂的一点：**方法里没有"这一个弹窗"的硬编码**

```js
Modal.prototype.open = function () {
  this.isOpen = true;              // this ← 谁调用就是谁
  this.el.classList.add('show');
};
```

**`open` 里没有出现任何具体的弹窗变量** —— 全靠 `this`。所以：

```js
const m1 = new Modal('提示', '第一个');
const m2 = new Modal('警告', '第二个');

m1.open();    // 只有 m1 弹出来
m2.close();   // 只影响 m2
```

⭐ **这就是 178 集那次"数据放 `this`、方法放 `prototype`"分离的实战回报**：

| 东西 | 住哪 | 效果 |
|---|---|---|
| `this.title` / `this.isOpen` / `this.el` | **每个实例各一份** | 两个弹窗互不干扰 |
| `open` / `close` | **原型上一份** | 不管造多少个弹窗，这两个函数只有一份 |

**如果你把 `open` 写在构造函数里（挂 `this` 上），功能也能跑** —— 但每造一个弹窗就多存两份函数。**现在你知道为什么不该那样写。**

### 1.3 加两个真实产品里一定会有的行为

```js
// ① 点遮罩层 或 点关闭按钮 → 关掉（事件委托到自己的元素上）
const self = this;                     // ⚠️ 保 this，原因 192 集讲
this.el.addEventListener('click', function (e) {
  if (e.target === self.el || e.target.className === 'closeBtn') {
    self.close();
  }
});
```

```js
// ② Esc 键关掉 —— 但只关"当前打开的那个"
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && self.isOpen) {
    self.close();
  }
});
```

⚠️ **注意 `&& self.isOpen`** —— 不加这个判断，**每个弹窗实例都会各自监听一次 Esc**，你有 3 个弹窗，按一下 Esc 就三个都关。**这类"每个实例都绑了全局事件"的问题，是组件化的典型陷阱。**

### 1.4 ⭐⭐ 原型这一段（176-186）的完整收获

**十一集，其实只讲了一件事：JS 怎么组织"数据 + 行为"。**

| 集 | 收获 |
|---|---|
| 176 | 面向对象 = 拆"对象"；⚠️ **但 JS 的面向对象 ≠ C# 的**（无 `class`） |
| 177 | 方法挂 `this` → **每个实例一份**（`===` 是 `false`） |
| 178 | 方法搬 `prototype` → **全家共享一份**（`===` 是 `true`）。**记法：不一样的放 `this`，一样的放 `prototype`** |
| 179 | 能扩展内置原型，**但工程上永远别碰** |
| 180 | `constructor` 指回构造函数；**可被改，不能用来判类型** |
| 181 | `__proto__` = 实例指向仓库的那条路 |
| 182 | 继承 = **把两条原型链接起来**（不是 C# 那种类继承） |
| 183 | 原型链 = **一层层往上走到 `null`**；`instanceof` 才是可靠判断 |
| 184-186 | **实战**：一个组件 = 数据 + 行为装进构造函数 |

⭐ **一句话收口**（你要能自己说出来）：

> **数据住在实例自己身上，方法住在原型上被大家共享；找属性时先找自己，找不到就顺着 `__proto__` 一层层往上，直到 `null`。**

### 1.5 ⚠️ 一个务实的提醒

**这套写法（构造函数 + 原型）在今天的手写业务代码里已经很少见了** —— 因为 Vue / React 把它包掉了。

**但它没有被淘汰，而是下沉了**：

- 你用的**每一个组件库**（Swiper、Bootstrap、各类 UI 库）内部都是它
- **框架自己**也是用它写的
- **读源码、写库、面试**，全都绕不开

> **所以：业务里你多半不手写它，但你必须能读懂它。** 这就是这 11 集的意义。

## 2. 浅拷贝（187）🔥 —— 进入 Day 4

### 2.1 ⚠️⚠️ 第一件事：`obj2 = obj1` **根本不是拷贝**

```js
const obj1 = { name: '张三', age: 18 };
const obj2 = obj1;              // ⚠️ 这不是"复制一份"

obj2.name = '李四';
console.log(obj1.name);         // '李四'  ← obj1 也被改了！
```

⭐ **`obj2 = obj1` 只是"给同一个对象起了第二个名字"**（两个变量指向**同一个**内存）。**一个对象，两个名字，改哪个都改的是它。**

**自证实验**：

```js
console.log(obj1 === obj2);     // true  ← 是同一个对象！
```

### 2.2 ⭐ 但这不是 JS 的坑 —— C# 一模一样

**这一点很重要**，因为它是你可能会觉得"JS 真不规范"的地方之一：

```csharp
var a = new List<int> { 1, 2, 3 };
var b = a;               // ← 引用赋值
b.Add(4);
Console.WriteLine(a.Count);   // 4 ← a 也变了！和 JS 完全一样
```

**C# 里 `class` 是引用类型，赋值也是"两个名字指向同一个对象"。** 你早就知道这件事。

**那为什么在 JS 里踩得更频繁？** 两个原因：

| 原因 | 说明 |
|---|---|
| **对象的出场率高** | JS 里 `{}` / `[]` 遍地都是（配置、参数、返回值），C# 里你会明确写 `new List<int>()`，心里有"这是个引用"的提醒 |
| **基本类型也长得很像** | `let a = 1; let b = a;` 是**真拷贝**；`let a = {}; let b = a;` 是**共享** —— 两行代码长得一样，行为相反 |

⭐ **所以正确的说法是**：**"引用类型的赋值是共享"是 C# 和 JS 共同的性质，不是 JS 的毛病。** 你要建立的反射是：**看到 `=` 两边都是对象/数组，先问一句"我是不是只起了个新名字？"**

### 2.3 浅拷贝：真的复制出一份新的

```js
const obj1 = { name: '张三', age: 18 };

// 两种写法，等价
const obj2 = { ...obj1 };                 // 展开运算符（第 156 集学过）
const obj3 = Object.assign({}, obj1);     // Object.assign（第 168 集学过）

obj2.name = '李四';
console.log(obj1.name);     // '张三'  ← 现在 obj1 不受影响了 ✅
console.log(obj1 === obj2); // false   ← 是两个不同的对象了 ✅
```

⭐ **`Object.assign({}, obj)` 就是 `{...obj}`** —— 这两件事在 168 集已经说过一次。**注意第一个参数 `{}` 不能省**：`Object.assign(obj, x)` 是**改 `obj`**，不是拷贝。

### 2.4 ⚠️ 但"浅"是什么意思？只复制第一层

```js
const obj1 = {
  name: '张三',
  address: { city: '北京' }        // ← 这一层是对象
};

const obj2 = { ...obj1 };          // 浅拷贝

console.log(obj2 === obj1);              // false ← 外层是新的 ✅
console.log(obj2.address === obj1.address);  // true  ← ⚠️ 内层还是同一个！

obj2.address.city = '上海';
console.log(obj1.address.city);    // '上海'  ← 第一层保护了，第二层没保护住
```

**"浅拷贝"= 只把第一层复制出一份新的；里面嵌套的对象，复制的还是"引用"。**

```
浅拷贝之后：

obj1 ──┐
       ├──► { name: '张三', address: ──┐    ← 外层是新的一份
obj2 ──┘                              │
                                      ▼
                              { city: '北京' }   ← 内层两个名字共用同一个！
```

⭐ **C# 对照**：这就是 C# 的**浅拷贝**（`MemberwiseClone()`）—— **概念完全一致，你熟**。C# 里浅拷贝后，两个对象的引用类型字段也指向同一个对象。

**那要连里面也复制呢？** —— **深拷贝**，那是 **189 / 190** 的内容（手写递归 + `JSON.parse(JSON.stringify())`）。

### 2.5 三层对照表（本轮最该记住的）

| 写法 | 名字 | 外层 | 内层（嵌套对象） |
|---|---|---|---|
| `const b = a;` | **赋值**（不是拷贝！） | **同一个** | 同一个 |
| `const b = { ...a };` | **浅拷贝** | ✅ 新的 | ⚠️ **还是同一个** |
| 递归复制每一层 | **深拷贝** | 新的 | ✅ 新的（189/190 学） |

⚠️ **判据永远是那个 `===`**：

```js
b === a                      // false 说明外层是新的（做到了浅拷贝）
b.address === a.address      // true  说明内层还共用（浅拷贝的边界）
```

---

==二：格式==

## 1. 模态框组件模板（185-186）

```js
function 组件名(配置...) {
  // ① 数据存成自己的属性
  this.xxx = ...;
  this.状态 = false;

  // ② 造 DOM，也存成属性
  this.el = document.createElement('div');
  // ...填充...
  document.body.appendChild(this.el);

  // ③ 事件（需要保 this 时用 self，193 集后可换 bind）
  const self = this;
  this.el.addEventListener('click', function (e) { ... });
}

// ④ 行为挂原型
组件名.prototype.open  = function () { this.状态 = true;  this.el.classList.add('show'); };
组件名.prototype.close = function () { this.状态 = false; this.el.classList.remove('show'); };
```

⭐ **三处判断标准**：

| 放哪 | 什么 | 判据 |
|---|---|---|
| 构造函数里 `this.xxx` | 每个实例**不同**的数据 | `title` / `isOpen` / `el` |
| `prototype.xxx` | 所有实例**相同**的行为 | `open` / `close` |
| 构造函数里绑事件 | **必须绑在实例自己的元素上** | 别往 `document` 上乱绑（会重复） |

## 2. 浅拷贝速查

```js
const copy = { ...原对象 };                  // 对象
const copy = [...原数组];                    // 数组
const copy = Object.assign({}, 原对象);       // ⚠️ 第一个 {} 不能省
```

## 3. 三种"看起来都是赋值"的行为对照

| 你的目的 | 正确写法 | 验尸式 |
|---|---|---|
| 我要**另一个名字**指向同一份 | `const b = a;` | `b === a` → `true` |
| 我要**外层是新的** | `const b = { ...a };` | `b === a` → `false` |
| 我要**连里面也是新的** | 深拷贝（189） | `b.address === a.address` → `false` |

---

==三：代码==

## 1. 完整的模态框（185 + 186）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Modal 组件</title>
  <style>
    .modal { position: fixed; inset: 0; background: rgba(0,0,0,.45);
             display: flex; align-items: center; justify-content: center;
             opacity: 0; visibility: hidden; transition: opacity .25s; }
    .modal.show { opacity: 1; visibility: visible; }
    .modal-box { background: #fff; padding: 24px 28px; border-radius: 10px;
                 min-width: 260px; transform: translateY(-12px); transition: transform .25s; }
    .modal.show .modal-box { transform: translateY(0); }
    .modal-box h4 { margin: 0 0 10px; }
    .modal-box p  { margin: 0 0 16px; color: #555; }
  </style>
</head>
<body>
  <button id="btn1">打开提示</button>
  <button id="btn2">打开警告</button>

  <script>
    function Modal(title, content) {
      this.title = title;
      this.content = content;
      this.isOpen = false;

      this.el = document.createElement('div');
      this.el.className = 'modal';
      this.el.innerHTML =
        '<div class="modal-box">' +
          '<h4>' + this.title + '</h4>' +
          '<p>'  + this.content + '</p>' +
          '<button class="closeBtn">关闭</button>' +
        '</div>';
      document.body.appendChild(this.el);

      // 点遮罩 / 点关闭按钮 → 关
      const self = this;
      this.el.addEventListener('click', function (e) {
        if (e.target === self.el || e.target.className === 'closeBtn') {
          self.close();
        }
      });

      // Esc 键 → 关（⚠️ 只关打开着的那个）
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && self.isOpen) {
          self.close();
        }
      });
    }

    Modal.prototype.open = function () {
      this.isOpen = true;
      this.el.classList.add('show');
    };
    Modal.prototype.close = function () {
      this.isOpen = false;
      this.el.classList.remove('show');
    };

    // ⭐ 两个实例，互不干扰
    const m1 = new Modal('提示', '这是第一个弹窗。');
    const m2 = new Modal('警告', '这是第二个弹窗。');

    document.querySelector('#btn1').addEventListener('click', function () { m1.open(); });
    document.querySelector('#btn2').addEventListener('click', function () { m2.open(); });

    // —— 自证：两个实例的数据是分开的 ——
    m1.open();
    console.log(m1.isOpen, m2.isOpen);          // true false  ← 互不影响
    console.log(m1.open === m2.open);           // true        ← 方法却是共享的
  </script>
</body>
</html>
```

**最后两行同时打印出的 `true false` 和 `true`，就是 178 那条规矩的最终验证** —— **数据隔离、方法共享。**

## 2. 浅拷贝的三段对照实验（187）

```js
// ═══ ① 赋值 ≠ 拷贝 ═══
const a1 = { name: '张三', tags: ['前端'] };
const a2 = a1;                       // 只是起了个新名字
a2.name = '李四';
console.log(a1.name);                // '李四'  ⚠️ 原对象也被改了
console.log(a1 === a2);              // true    ← 同一个对象

// ═══ ② 浅拷贝：外层是新的 ═══
const b1 = { name: '张三', tags: ['前端'] };
const b2 = { ...b1 };
b2.name = '李四';
console.log(b1.name);                // '张三'  ✅ 外层保护住了
console.log(b1 === b2);              // false   ✅ 是两个对象了

// ═══ ③ 但内层还是共用的 ═══
console.log(b1.tags === b2.tags);    // true    ⚠️ 数组还是同一个
b2.tags.push('后端');
console.log(b1.tags);                // ['前端', '后端']  ⚠️ 原对象被牵连

// 想看深层是否共用，永远用这个 ===
console.log(b1.tags === b2.tags);    // true = 共用；false = 真的分开了
```

## 3. 一个真实的踩坑场景（这段最值得看）

```js
const defaultConfig = {
  theme: 'light',
  size: { width: 300, height: 200 }     // ⚠️ 嵌套对象
};

function createPanel(userOptions) {
  const config = { ...defaultConfig };  // 浅拷贝——以为安全了
  Object.assign(config, userOptions);   // 合并用户配置

  config.size.width = 500;              // 改的是谁？
  return config;
}

createPanel({});
console.log(defaultConfig.size.width);  // 500  ⚠️ 默认配置被永久改坏了！
```

⭐ **这就是浅拷贝最常见的翻车现场**：**"配置默认值 + 用户覆盖"**。你明明拷贝了，但因为里面嵌套了一层，**改的其实是那份共享的默认配置**。

**这个 bug 极其难查** —— 第一次调用没事，第二次调用拿到的是被改过的默认值。**要等到 189 集学深拷贝才能真正解决。**

## 动手小练习（不留超纲作业）

1. **给模态框加一个 `toggle()` 方法**：打开着就关、关着就开（用 `this.isOpen` 判断）—— 注意它也要挂在 `prototype` 上。
2. **然后做这个实验**：造两个弹窗 `m1` `m2`，先 `m1.open()`，再 `m2.toggle()`，打印两者的 `isOpen` —— **确认 `m1` 没被影响**（应该是 `true false`）。

**第二个练习的 `true false` 就是你这个组件写对了的证据。**

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 185 | `open` = **改状态 + 同步到 DOM**；方法里**只出现 `this`，不出现具体某个弹窗** |
| 186 | 多个实例**数据隔离、方法共享** —— 这就是 178 那条规矩的回报 |
| 187 | **`b = a` 不是拷贝**，是"给同一个对象起第二个名字"；`{...a}` 才是浅拷贝，**但只保护第一层** |

## 2. ⭐⭐ 本轮要背的

**① 三层对照（判据永远是 `===`）：**

| 写法 | 外层 | 内层 |
|---|---|---|
| `b = a` | **同一个** | 同一个 |
| `b = {...a}` | ✅ 新的（`b === a` 是 `false`） | ⚠️ **还是同一个** |
| 深拷贝（189） | 新的 | ✅ 新的 |

**② 那句纠偏很重要：`b = a` 共享同一个对象，不是 JS 的毛病。**

**C# 里 `var b = a;`（`class`）一模一样。** 区别只在于 **JS 里对象出场率太高**，以及 **`let b = 1`（拷贝）和 `let b = {}`（共享）长得一样**。所以你要建立的反射是：

> **看到 `=` 两边都是对象/数组，先问一句："我是不是只起了个新名字？"**

## 3. ⭐ 两个收敛时刻

**一、原型这一段（176-186）在这里收口了。** 十一集讲的其实是同一件事：**JS 怎么组织"数据 + 行为"**。

**它的最终产物是那个模态框** —— 一个真正的组件，数据在实例上（互不干扰）、方法在原型上（共享一份）。**你以后用的所有组件库，骨架都是它。**

**二、187 和前面一大段悄悄接上了。** 想想这几个地方：

| 哪里 | 当时怎么说的 | 187 给出的答案 |
|---|---|---|
| 156 展开运算符 | "⚠️ 展开是浅拷贝，伏笔 187/189" | **现在兑现了** |
| 159 对象解构 | "解构出来是浅拷贝" | 同上 |
| 168 `Object.assign` | "浅拷贝一层" | 同上 |
| 187 | **为什么"浅"是个问题** | 内层还共用，`===` 能验出来 |

**四集里埋的同一句话，在这一集收网。**

## 4. 静默失败清单（本轮 4 条，全都不报错）

| 你写的 | 实际发生 |
|---|---|
| `const b = a` 以为拷贝了 | 改 `b` 会改到 `a`，**无报错** |
| `{...obj}` 以为完全独立 | 改内层嵌套对象，原对象被牵连，**无报错** |
| 配置合并时浅拷贝默认值 | 默认配置被改坏，**第二次调用才发作**，极难查 |
| 每个弹窗实例都绑一次 `document` 的 keydown | 有 3 个弹窗时，按一下 Esc 全关，**无报错** |

**会报错的一条**：`Object.assign(null, x)` → `TypeError`。

## 5. C# 类比可用度（本轮新增）

| JS 的做法 | C# 对应 | 档 |
|---|---|---|
| `b = a`（对象） | `var b = a;`（引用类型） | ✅ **完全一致**（都是共享引用，**不是 JS 的毛病**） |
| `b = a`（数字 / 字符串） | `var b = a;`（值类型） | ✅ 一致（都是真拷贝） |
| `{...obj}` 浅拷贝 | `MemberwiseClone()` | ✅ **概念一致**（都只保护第一层） |
| `{...obj}` 语法本身 | 无对应 | ⚠️ C# 没有展开运算符（对象初始化器是另一回事） |
| `Object.assign({}, a, b)` | 依次赋值 / 手写合并 | ⚠️ **C# 里得自己写**（或 `with` 表达式） |
| 深拷贝 | 手写 `DeepClone` / 序列化 | ✅ 189/190 会讲到，思路一样 |

⭐ **本轮的 C# 迁移价值**：**"引用类型赋值 = 共享"这条你早就懂，直接搬过来就行**；本轮真正的新东西只有两个 —— **展开运算符这个语法**、和 **"对象在 JS 里太常见"这个概率问题**。

## 6. 解锁边界（本轮变更）

**新解锁**
- ✅ **浅拷贝的两种写法**（`{...obj}` / `Object.assign({}, obj)`）—— 语法本身早就解锁了（156 / 168），**本轮是把它正式定性为"浅拷贝"并讲清边界**

**仍然锁着**
- ❌ **深拷贝**（189 手写递归 / 190 `JSON.parse(JSON.stringify())`）—— ⏳ **本轮那个"配置被改坏"的 bug，真正的解法要到 189 集**
- ❌ **`call` / `apply` / `bind`**（193-195）—— ⏳ 所以模态框里还得用 `const self = this`
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` ← **课程内永不解锁**

**⏳ 挂账提醒（到对应集数要回来结）**
1. **`父类.call(this, ...)`** —— 193-195 集后，回去改 182 的示例
2. **`const self = this` 的原理** —— 192 集
3. **配置浅拷贝的坑** —— 189 集用深拷贝解决

## 7. 下一轮预告

第 **188 / 189 / 190** 集：

| 集 | 内容 |
|---|---|
| 188 | 递归函数 — 🔁 **你学过递归，跳过**（要用时直接写） |
| 189 | **深拷贝实现** — 🔥 手写递归拷贝 ↔ C# 手写 `DeepClone` ✅ 思路一样 |
| 190 | 利用 lodash 和 JSON 实现深拷贝 — ⚡ `JSON.parse(JSON.stringify(x))` ↔ **你学过的序列化再反序列化** |

⭐ **因为 188 跳过，下一轮实际讲的知识集自动顺延成 189 / 190 / 191**（仍是三个）：

| 讲 | 内容 |
|---|---|
| 189 | **深拷贝**（手写递归） |
| 190 | **深拷贝**（`JSON` 方法 + lodash） |
| 191 | **异常处理** · `throw` / `try` `catch` · `debugger` — ↔ C# 的 `try`/`catch` ✅ 语法几乎一样 |

⚠️ **189 会正式解决本轮那个"配置被改坏"的 bug** —— 这个坑先在你脑子里挂着，下一轮收网。

⚠️ **191 有个 JS 特有的差异值得先知道**：**C# 有"受检异常"、`catch` 必须写具体类型；JS 没有受检异常，而且 `throw` 可以扔任意值 —— 连一个字符串都行。** 这是 C# 程序员会愣一下的地方。
