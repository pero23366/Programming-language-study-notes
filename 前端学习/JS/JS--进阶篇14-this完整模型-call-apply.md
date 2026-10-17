# JS--进阶篇 14 · this 完整模型 · call · apply

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **192 / 193 / 194** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **本轮定位**：**`this` 完整模型 —— 全课最大的差异点**。⏳ 从第 ⑮ 轮挂到现在的账，这一轮结清。

---

==一：概念==

## 1. `this` 完整模型（192）🔥🔥

### 1.1 先说清楚：`this` 和 C# 的 `this` 是两个东西

| | C# | JS |
|---|---|---|
| `this` 是什么 | **当前实例**（一个确定的东西） | **一个"指向谁"的指针** |
| 什么时候确定 | **编译期**就定死了 | **运行期**，由**调用方式**决定 |
| 同一个方法里的 `this` | **永远是同一个实例** | ⚠️ **取决于你怎么调用它** |

**C# 里 `this` 是"我是谁"；JS 里 `this` 是"谁在叫我"。** 这是根本区别。

⭐ **所以 JS 有一条唯一的、能解释一切的核心规则：**

> **`this` 由"函数**怎么被调用**"决定，不由"函数**写在哪**"决定。**

### 1.2 ⭐⭐ 一句能解决 90% 情况的记法

> **看函数名前面有没有"点" ——**
> **点前面是谁，`this` 就是谁；**
> **没有点，`this` 就是 `window`（严格模式下是 `undefined`）。**

```js
const obj = {
  name: '张三',
  say: function () { console.log(this.name); }
};

obj.say();          // '张三'   ← 点名前面是 obj → this 就是 obj
```

```js
function fn() { console.log(this); }
fn();               // window   ← 没有点 → this 是 window
```

**`new` 是唯一的特例**：`new Fn()` 时，即使没有"点"，`this` 也是**新造出来的那个对象**（因为 `new` 的第 ③ 步就是"让 `this` 指向新对象"，回扣 165）。

### 1.3 五种调用场景（本轮最该记的表）

```js
// ① 直接调用 —— 没有点
function f1() { console.log(this); }
f1();                                  // window（严格模式 undefined）

// ② 作为对象的方法 —— 有点，点前是 obj
const obj = { name: '张三', say: function () { console.log(this.name); } };
obj.say();                             // '张三'

// ③ 作为构造函数 —— new 是特例
function F3() { this.tag = '我是新对象'; }
const o3 = new F3();                   // this 是 o3（新对象）
console.log(o3.tag);                   // '我是新对象'

// ④ 事件回调 —— 浏览器帮你把 this 绑成"触发事件的元素"
document.querySelector('#btn').addEventListener('click', function () {
  console.log(this);                   // <button id="btn">  ← 就是那个按钮
});

// ⑤ 定时器 / 数组方法的回调 —— 没有人帮你绑，回到"没有点"的情况
setTimeout(function () { console.log(this); }, 0);   // window
[1, 2].forEach(function () { console.log(this); });  // window
```

⭐ **同样一个 `this`，五种结果。** 所以判断 `this` 的方法不是"看代码上下文"，而是**"看它被调用的那一刻，名字前面是什么"**。

**④ 和 ⑤ 值得单独说**：`addEventListener` **主动**把 `this` 绑成了元素（这是它的约定）；而 `setTimeout` / `forEach` **不绑**，所以回调里的 `this` 回到"没有点"的默认值。**同一个函数，绑给谁调用，`this` 就听谁的。**

### 1.4 箭头函数：**没有自己的 `this`**，直接用外层的

```js
const obj = {
  name: '张三',
  say: function () {
    const inner = () => {
      console.log(this.name);      // '张三' ← 拿到的是外层的 this（obj）
    };
    inner();
  }
};
obj.say();
```

**箭头函数不参与上面那套规则** —— 它**不产生自己的 `this`**，而是**顺着作用域链，拿定义它时外层函数的 `this`**。

⭐ **这就是 157 集那句"箭头函数没有自己的 `this`"的完整解释** —— 它其实是**让 `this` 变成了一个"普通变量"**（去外层作用域找），和找 `count` 那种变量**一模一样**（回扣 154 闭包）。

**收口句（第 157 集说过一次，现在你能真正理解了）：**

> **箭头函数 = 闭包 + 简写 + 没有自己的 `this` / `arguments` / `prototype`。**

### 1.5 ⭐⭐ 结清挂账：`const self = this` 到底为什么需要

**看这段你写过的代码（第 184-186 集的模态框）：**

```js
this.el.addEventListener('click', function (e) {   // ← 普通函数
  self.close();                                    // ← 为什么不用 this？
});
```

**因为按照 1.2 的规则** —— `addEventListener` 调用这个回调时，**把 `this` 绑成了"被点击的元素"**（场景 ④）。**这个回调里的 `this` 是那个 `div`，不是模态框实例**，所以 `this.close()` 会出错。

**解法就是先把 `this` 存一份**：

```js
const self = this;                                 // ⭐ 存下"外面的 this"（那个实例）
this.el.addEventListener('click', function (e) {
  self.close();                                    // 用保下来的 self
});
```

**`self` 只是个变量名** —— 按照作用域链，回调里能读到它（回扣 154 闭包），而且它**存的是外层那个 `this`，不会变**。

**⭐ 而更简洁的现代解法是箭头函数：**

```js
this.el.addEventListener('click', (e) => {
  this.close();                                    // 箭头函数不改变 this，直接用外层的 ✅
});
```

**`const self = this` 是"箭头函数出现之前"的通用解法。** 现在你两种都懂了 —— **而且知道为什么老代码里满地都是 `self` / `that` / `_this`**（它们全是同一套东西的不同命名）。

### 1.6 ⚠️ 三个最常见的坑

**① 把方法"摘下来"单独调用，`this` 就丢了**

```js
const obj = {
  name: '张三',
  say: function () { console.log(this.name); }
};

const fn = obj.say;      // 只是把函数"赋值"出来
fn();                    // undefined ← 因为现在是"没有点"的直接调用
```

⭐ **函数不会"记得"自己属于谁** —— 它只在被调用的那一刻看"前面有没有点"。

⚠️ **这个坑在 `setTimeout` / `forEach` 里极常见**：

```js
setTimeout(obj.say, 100);        // ⚠️ 定时器调用它，没有点 → this 是 window → undefined
setTimeout(function () { obj.say(); }, 100);   // ✅ 这样就对了
```

**② 箭头函数用在"需要 `this` 指当前元素"的地方**

```js
document.querySelector('#btn').addEventListener('click', () => {
  this.style.color = 'red';      // ⚠️ this 不是按钮 → 点击没反应，且不报错
});
```

**（这条在 157 集出现过，现在你知道原因了。）**

**③ 在 `prototype` 的方法里用箭头函数**

```js
User.prototype.bad = () => { console.log(this.uname); };   // ⚠️ this 不是实例
```

**（这条在 178 集出现过，同一个原因。）**

⭐ **这三条其实是同一件事的三种表现：`this` 只看"怎么被调用"，而箭头函数根本不参与这个规则。**

---

## 2. `call`（193）

### 2.1 它是干什么的

**`call` 让你手动指定"这一次调用，`this` 是谁"。**

```js
function fn(a, b) {
  console.log(this.name, a, b);
}

const obj = { name: '张三' };

fn.call(obj, 1, 2);      // '张三' 1 2   ← ⭐ this 被强行指定成 obj
```

**语法：`函数.call(this要指向谁, 参数1, 参数2, ...)`**

**行为**：**立刻执行**这个函数，`this` 就是你传的第一个参数。

### 2.2 它和普通调用是同一个函数，只是"调用方式不同"

```js
fn();              // this = window
fn.call(obj);      // this = obj      ← 只是换了个"点名的方式"
```

⭐ **这正好印证 1.2 的规则**：`this` 由"怎么调用"决定 —— **`call` 就是"硬指定调用方式"的那个工具**。

**所以你可以说**：**`fn.call(obj)` 等价于"让 `obj` 临时成为 `this` 来执行 `fn`"。**

### 2.3 ⭐⭐ 结清第二笔挂账：原型继承的标准写法

**回想 182 集那个"手抄父类属性"的丑陋写法**：

```js
function Student(uname, age, score) {
  this.uname = uname;      // ⚠️ 当时只能手动抄
  this.age = age;
  this.score = score;
}
```

**现在有了 `call`，可以改成标准版了：**

```js
function Person(uname, age) {
  this.uname = uname;
  this.age = age;
}
Person.prototype.sayHi = function () { console.log('我是 ' + this.uname); };

function Student(uname, age, score) {
  Person.call(this, uname, age);   // ⭐ 让 Person 在"我这个实例"上执行一次
  this.score = score;              // 自己的属性
}
Student.prototype = Object.create(Person.prototype);
Student.prototype.constructor = Student;

const s = new Student('张三', 18, 95);
console.log(s.uname, s.age, s.score);   // 张三 18 95  ← 父类属性自动就有了
```

**逐字读那句话：`Person.call(this, uname, age)`**

| 部分 | 含义 |
|---|---|
| `Person` | 要执行的那个函数 |
| `.call` | "我指定 `this` 来调用" |
| `this` | **让 `Person` 里的 `this` 指向"我"（正在被 `new` 的那个实例）** |
| `uname, age` | 传给 `Person` 的参数 |

⭐ **它的意思就是**：**"用我的 `this`，跑一遍父构造函数"** —— 于是 `Person` 里那两行 `this.uname = uname` 写的就是**我的属性**。

**这就是继承里"父类属性初始化"的标准答案。** 182 那笔账，到此结清。

### 2.4 C# 对照

**C# 里没有对应概念** —— 因为 C# 的 `this` 是编译期确定的，**根本不存在"临时换一个 `this`"这种事**。

最接近的说法：像"**显式指定委托的接收者**"。但机制完全不同，**别硬套**。

⚠️ **`call` / `apply` / `bind` 这三个是 JS 独有的** —— 它们之所以需要存在，**正是因为 JS 的 `this` 是"运行期看调用方式"决定的**。

## 3. `apply`（194）

### 3.1 和 `call` 只差一个细节：参数怎么传

```js
fn.call(thisArg, 参数1, 参数2, 参数3);      // 参数一个个列出来
fn.apply(thisArg, [参数1, 参数2, 参数3]);   // ⭐ 参数打包成数组
```

| | `call` | `apply` |
|---|---|---|
| `this` 怎么传 | 第一个参数 | **一样** |
| 参数怎么传 | **一个一个列** | **一个数组** |
| 记忆 | **c**all → **c**omma（逗号分隔） | **a**pply → **a**rray（数组） |

⭐ **把它们当成同一个方法的两种传参写法就行** —— 作用完全一样，都是"指定 `this` 并立刻执行"。

### 3.2 它最有名的用处：让"只收散装参数"的函数吃一个数组

```js
Math.max(1, 5, 3);                     // 5 —— 但它只收散装的参数
Math.max([1, 5, 3]);                   // NaN ⚠️ 传数组不行

// 老办法：用 apply 把数组"摊开"
Math.max.apply(null, [1, 5, 3]);       // 5 ✅
```

**为什么第一个参数是 `null`？** 因为 `Math.max` **不需要 `this`** —— 随便给一个占位就行（用 `null` 是惯例）。

### 3.3 ⭐ 但现在有更好的写法：直接用展开运算符

```js
Math.max(...[1, 5, 3]);                // 5 ✅ 又短又清楚
```

**你第 156 集学的展开运算符，正好干的就是这件事。** 所以：

> **`apply` 那个"摊开数组"的经典用法，今天已经基本被展开运算符取代了。**

**那 `apply` 还有用吗？** 有，但**它的主战场退化成了"指定 `this` 并执行"**（和 `call` 相同）—— **纯"摊数组"的需求，一律用 `...`。**

**所以实战建议**：

| 需求 | 用什么 |
|---|---|
| 指定 `this` 执行，参数少 / 好列举 | **`call`** |
| 指定 `this` 执行，参数本来就在数组里 | **`apply`** |
| 只是想把数组"摊开"当参数 | **`fn(...arr)`** ← 绝大多数情况用这个 |

---

==二：格式==

## 1. 判断 `this` 的速查表

| 调用方式 | `this` 是谁 |
|---|---|
| `fn()` | `window`（严格模式 `undefined`） |
| `obj.fn()` | **`obj`**（点前面那个） |
| `a.b.c.fn()` | **`a.b.c`**（**最后一个点**前面的） |
| `new Fn()` | **新造出来的对象**（特例） |
| `元素.addEventListener('click', fn)` | **那个元素**（浏览器帮你绑的） |
| `setTimeout(fn, ...)` | `window`（没人帮你绑） |
| **箭头函数（任何情况）** | **不看调用方式，直接拿外层的** |

⭐ **一句记法**：**看函数名前面有没有点；有点 → 点前面是谁就是谁；没点 → `window`。`new` 和箭头函数是两个特例。**

## 2. `call` / `apply` 速查

```js
函数.call(this是谁, 参数1, 参数2);        // 参数一个个列
函数.apply(this是谁, [参数1, 参数2]);     // 参数放在数组里

// 不需要 this 时，第一个参数给 null（惯例）
Math.max.apply(null, arr);

// 原型继承里初始化父类属性
父类.call(this, 参数...);
```

## 3. 保住 `this` 的三种写法（按推荐度排）

```js
// ① ⭐ 箭头函数（现代写法，最简洁）
this.el.addEventListener('click', (e) => { this.close(); });

// ② 存一份（老代码里的通用写法）
const self = this;
this.el.addEventListener('click', function (e) { self.close(); });

// ③ bind（195 集学）
this.el.addEventListener('click', this.close.bind(this));
```

---

==三：代码==

## 1. 五种调用场景的完整实验（192）

```js
// ═══ ① 直接调用 ═══
function f1() { console.log('① 直接调用 →', this === window ? 'window' : this); }
f1();                                   // ① 直接调用 → window

// ═══ ② 方法调用 ═══
const obj = {
  name: '张三',
  say: function () { console.log('② 方法调用 →', this.name); }
};
obj.say();                              // ② 方法调用 → 张三

// ═══ ③ 构造函数 ═══
function F3() { this.tag = '新对象'; }
const o3 = new F3();
console.log('③ new →', o3.tag);         // ③ new → 新对象

// ═══ ④ 事件回调（浏览器帮你绑）═══
document.querySelector('body').addEventListener('click', function () {
  console.log('④ 事件回调 →', this.tagName);   // ④ 事件回调 → BODY
  // ⚠️ 现在 this 就是 body 那个元素，不是别的
});

// ═══ ⑤ 定时器 / 数组回调（没人帮你绑）═══
setTimeout(function () { console.log('⑤ 定时器 →', this === window ? 'window' : this); }, 0);

// ═══ ⑥ 箭头函数：不吃这一套 ═══
const obj2 = {
  name: '李四',
  say: function () {
    const inner = () => console.log('⑥ 箭头函数 →', this.name);
    inner();
  }
};
obj2.say();                             // ⑥ 箭头函数 → 李四  ← 拿的是外层的 this

// ═══ ⑦ 最经典的坑：方法被"摘下来" ═══
const detached = obj.say;
// detached();                          // ⚠️ undefined —— 因为现在是"没有点"的调用

// 对比：套一层就好了
setTimeout(function () { obj.say(); }, 100);    // ✅ 张三
// setTimeout(obj.say, 100);                    // ⚠️ undefined
```

## 2. 挂账结清：原型继承的标准写法（182 → 193）

```js
function Person(uname, age) {
  this.uname = uname;
  this.age = age;
}
Person.prototype.sayHi = function () { console.log('我是 ' + this.uname); };

function Student(uname, age, score) {
  // ⭐ 182 集时这里只能手动抄两行，现在改成一行
  Person.call(this, uname, age);
  this.score = score;
}

Student.prototype = Object.create(Person.prototype);
Student.prototype.constructor = Student;
Student.prototype.exam = function () { console.log('我在考试'); };

const s = new Student('张三', 18, 95);

console.log(s.uname, s.age, s.score);    // 张三 18 95   ← 父类属性自动有了 ✅
s.sayHi();                               // 我是 张三     ← 父类方法也借来了
s.exam();                                // 我在考试      ← 自己的方法

// 为什么这行能行？因为 Person.call(this, ...) 里的 this 就是这个新实例
console.log(s instanceof Person);        // true
```

## 3. `call` / `apply` / 展开的对照（193 + 194）

```js
function introduce(prefix, suffix) {
  console.log(prefix + this.name + suffix);
}
const p = { name: '张三' };

// ═══ call：参数一个个列 ═══
introduce.call(p, '我是', '，很高兴认识你');        // 我是张三，很高兴认识你

// ═══ apply：参数放在数组里 ═══
introduce.apply(p, ['我是', '，很高兴认识你']);      // 一样的结果

// ═══ 同一个函数，普通调用 —— this 就丢了 ═══
// introduce('我是', '！');                         // undefined！ ← this.name 拿不到

// ═══ 数组摊开：apply 的老用法 vs 展开运算符 ═══
const nums = [3, 9, 2, 7];
console.log(Math.max.apply(null, nums));            // 9   ← 老写法
console.log(Math.max(...nums));                     // 9   ← ✅ 现在用这个
```

## 动手小练习（不留超纲作业）

1. **给模态框换掉 `self`**：把 185-186 那个模态框里的 `const self = this;` 删掉，**改用箭头函数**，功能应该完全一样。
2. **然后做一个实验**：把事件回调改回 `function (e) { this.close(); }`（删掉 `self`），点一下试试 —— **看控制台报什么错**，理解"`this` 变成了被点击的元素"。

**做完这两个，`this` 这一轮就真的落地了。**

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 192 | **`this` 由"怎么被调用"决定** —— 看函数名前面有没有点；**箭头函数不吃这套，直接用外层的** |
| 193 | **`call` 手动指定 `this` 并立刻执行**；⭐ **`父类.call(this, ...)` 是原型继承的标准写法** |
| 194 | **`apply` 和 `call` 只差传参形式**（数组）；它的"摊数组"用处**已被展开运算符取代** |

## 2. ⭐⭐ 本轮要背的：判断 `this` 的那句话

> **看函数名前面有没有"点" —— 点前面是谁，`this` 就是谁；没有点，`this` 就是 `window`（严格模式 `undefined`）。**
> **两个特例：`new`（`this` 是新对象）、箭头函数（不看调用方式，用外层的）。**

## 3. ⭐ 收敛时刻：这一轮把三条线接到了同一个点上

| 前面哪一集 | 当时的话 | 192 给出的解释 |
|---|---|---|
| **157** | "箭头函数没有自己的 `this`" | **它不参与 `this` 的规则，直接去外层拿** —— 和找普通变量一样 |
| **178** | "`prototype` 上别写箭头函数" | **箭头函数的 `this` 不是实例，拿不到数据** |
| **184-186** | "`const self = this` 保 this" | **因为 `addEventListener` 把回调的 `this` 绑成了元素** |
| **182** | "父类属性只能手动抄"（挂账） | **`Person.call(this, ...)` 一行解决** |

⭐ **四集里看起来不相干的四个点，全部指向同一条规则：`this` 只看"怎么被调用"。**

**而这也解释了为什么 `call` / `apply` / `bind` 这三个方法只在 JS 里有** —— **C# 的 `this` 编译期就定死了，根本不需要"手动换 `this`"这种工具。**

## 4. ⏳ 挂账结清情况

| 挂账 | 状态 |
|---|---|
| **`const self = this` 的原理** | ✅ **192 集结清** —— 因为事件回调的 `this` 是元素 |
| **父类属性继承的 `父类.call(this, ...)`** | ✅ **193 集结清** —— 见 §2.3 和代码 §2 |
| 配置浅拷贝的坑 | ✅ **189 集已结清** |

**从第 ⑮ 轮挂着的"`this` 只讲了够用版"，到这一轮正式补成完整版。三笔挂账全部结清。**

## 5. 静默失败清单（本轮 4 条，全都不报错）

| 你写的 | 实际发生 |
|---|---|
| `const fn = obj.say; fn();` | `this` 丢了 → 读到 `undefined`，**无报错** |
| `setTimeout(obj.say, 100)` | 同上，**无报错** |
| 事件回调里用箭头函数又要 `this` 指元素 | `this` 不是元素，**改动没生效，无报错** |
| `prototype` 上的方法写成箭头函数 | `this.uname` 是 `undefined`，**无报错** |

**会报错的一条**：如果 `this` 是 `undefined`（严格模式）而你访问属性 → `TypeError`；但非严格模式下 `this` 是 `window`，**访问不存在的属性只返回 `undefined`，依然不报错**。

## 6. C# 类比可用度（本轮新增）

| JS 的做法 | C# 对应 | 档 |
|---|---|---|
| 普通函数里的 `this` | `this`（当前实例） | ❌ **完全不是一回事**：C# 编译期定死；JS 运行期看调用方式 |
| `obj.fn()` 里 `this` 是 `obj` | 和 C# 一致 | ⚠️ **只是碰巧一致**，别当成规律 |
| `call` / `apply` / `bind` | ❌ **无对应概念** | ⚠️ 最接近的说法是"显式指定委托的接收者"，但机制不同 |
| `const self = this` | ❌ 无对应 | ❌ JS 特有（因为 `this` 会变） |
| 箭头函数"拿外层的 `this`" | Lambda 捕获 `this` 是**捕获当前实例** | ⚠️ **看着像，但 C# 的 Lambda 里 `this` 本来就是确定的** |
| `Math.max.apply(null, arr)` | ❌ 无对应 | ✅ 现在用 `Math.max(...arr)`（156 集学过） |

⭐ **本轮最重要的结论**：**`this` 是 JS 与 C# 差异最深的地方，没有之一。** C# 的 `this` 是"我是谁"，JS 的 `this` 是"谁在叫我"。**这一条如果没转过来，后面所有涉及 `this` 的代码都会读错。**

## 7. 解锁边界（本轮变更）

**新解锁**
- ✅ **`this` 的完整模型**（五种调用场景 + 箭头函数的规则）
- ✅ **`call` / `apply`**

**仍然锁着**
- ❌ **`bind`**（195 集，下一轮）—— 它返回一个"绑定好 `this` 的新函数"，不立即执行
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` · `for...of` ← **课程内永不解锁**

## 8. 下一轮预告

第 **195 / 196 / 197** 集：

| 集 | 内容 |
|---|---|
| 195 | **`bind` 方法以及总结** — 🔥 返回一个绑定好 `this` 的新函数，**不立即执行** |
| 196 | **什么是防抖以及底层实现** — 🔥 高频实战技巧 |
| 197 | **什么是节流以及实现和总结** — 🔥 "限流"思路 |

⚠️ **195 会补上"保住 `this` 的第三种写法"**（`this.close.bind(this)`）—— 二、3 那张表里第三行，下一轮就能补齐。

⚠️ **196-197（防抖 / 节流）是这套课程里少见的"纯实战技巧"**，而且**正好是 `this` 和闭包的联合应用** —— 你会发现前面学的闭包、`this`、`setTimeout` 全都在这两集里汇合。**从第 ⑮ 轮起学的"高级函数"这一路，到那里会看到一个漂亮的收束。**
