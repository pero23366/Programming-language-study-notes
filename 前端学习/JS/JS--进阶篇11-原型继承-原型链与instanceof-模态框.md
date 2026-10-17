# JS--进阶篇 11 · 原型继承 · 原型链与 instanceof · 模态框构造函数

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **182 / 183 / 184** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **本轮定位**：原型山的高潮。**182 是整段最容易误迁移 C# 直觉的一集。**
> ⚠️ **本轮有一笔挂账**：父构造函数的**属性**初始化，标准做法是 `Person.call(this, ...)`，但 **`call` 要到 193 集才学** —— 见 §1.4。

---

==一：概念==

## 1. 原型继承（182）

### 1.1 先看"没有继承"的世界长什么样

有两个构造函数，它们**有一部分方法完全相同**：

```js
function Person(uname, age) {
  this.uname = uname;
  this.age = age;
}
Person.prototype.sayHi = function () { console.log('我是 ' + this.uname); };

function Student(uname, age, score) {
  this.uname = uname;
  this.age = age;
  this.score = score;
}
Student.prototype.sayHi = function () { console.log('我是 ' + this.uname); };   // ← 抄一遍
Student.prototype.exam = function () { console.log('我在考试'); };
```

**`sayHi` 抄了一遍。** 以后 `Person` 改了 `sayHi`，`Student` 的这份**不会跟着变** —— 两个真相源，老问题（第 08 轮的三层分离里也见过）。

**继承要解决的，就是"让 `Student` 免抄、还能自动跟着改"。**

### 1.2 JS 的继承 = 把两条原型链接起来

**只要做一件事**：让 `Student.prototype` 的 `__proto__` 指向 `Person.prototype`。

```js
function Person(uname, age) {
  this.uname = uname;
  this.age = age;
}
Person.prototype.sayHi = function () { console.log('我是 ' + this.uname); };

function Student(uname, age, score) {
  this.uname = uname;      // ⚠️ 这里先手动写，原因见 1.4
  this.age = age;
  this.score = score;
}

// ⭐ 关键的两行：把两条链接起来
Student.prototype = Object.create(Person.prototype);   // Student.prototype 的原型 → Person.prototype
Student.prototype.constructor = Student;              // ⚠️ 顺手修回 constructor（回扣 180）

// 现在可以给 Student 加自己的方法
Student.prototype.exam = function () { console.log('我在考试'); };

// ═══ 验证 ═══
const s = new Student('张三', 18, 95);
s.exam();        // 我在考试     ← 自己的
s.sayHi();       // 我是 张三     ← 借来的！（Person.prototype 上的）
```

**`s` 自己找不到 `sayHi`，顺着链找到了 `Person.prototype.sayHi`。** 这就是继承 —— **"一条更长的查找链"。**

### 1.3 ⭐⭐ 最重要的一张表：C# 继承 vs JS 继承

| | C# | JS |
|---|---|---|
| **谁继承谁** | **类**继承**类**（`class Student : Person`） | **对象**链接**对象**（`Student.prototype.__proto__` → `Person.prototype`） |
| **什么时候定下来** | **编译期**就定死了 | **运行期**，随时能改（`setPrototypeOf`） |
| **有没有"类型"** | 有，`Person` 是编译期的类型，`is` 由运行时校验 | **没有类型**，只有一条对象链 |
| **改父类会影响谁** | 重新编译后所有子类都变 | **立刻**影响所有实例（连已经造出来的也是） |
| **能不能多继承** | 可以（接口 / 多接口） | **不行**，一个对象只有一个 `__proto__`（单链） |
| **父类的"字段"** | 子类实例里有那块内存 | ⚠️ **不会自动出现** —— 所以要手动 `this.uname = uname`（见 1.4） |

⭐ **一句话**：**C# 的继承是"类型系统"里的一条声明；JS 的继承是"对象之间的一条链接"。** 前者编译期结算，后者运行期生效。

**具体一点，"运行期生效"是什么意思？**

```js
const s = new Student('张三', 18, 95);      // 先造出来
Person.prototype.newThing = function () {};  // 事后给父原型加一个方法
s.newThing();                                // ✅ 立刻能用 —— 因为查找是"用到时才顺着链走"
```

在 C# 里，一个已经编译好的程序不会因为"你事后改了父类"而改变行为。**JS 会。** 这既是它的灵活，也是它的风险。

### 1.4 ⚠️ 挂账：父构造函数的**属性**怎么办？

上面那个 `Student` 里，`this.uname = uname` 是**我手动抄的**。这不合理 —— 父类的属性为什么要子类抄？

**标准写法是借父构造函数来执行一遍**：

```js
function Student(uname, age, score) {
  Person.call(this, uname, age);   // ⭐ 让 Person 在"我这个实例"上执行一次
  this.score = score;
}
```

**但 `call` 是第 193 集的内容 —— 本课程这里还没学到。**

所以：

| 时间点 | 属性继承怎么写 |
|---|---|
| **现在（182 阶段）** | 手动 `this.uname = uname; this.age = age;` ✅ 能用，就是啰嗦 |
| **学到 193 之后** | 改成 `Person.call(this, uname, age);` —— **就这一行的差别** |

⭐ **这不是回避，是排序**：**原型继承解决的是"方法怎么共享"，而"属性怎么复用"是另一件事（涉及 `this`，所以排在 `this` 完整模型那一轮）。** 现在手动写，功能完全正确；学到 193 再回来改。**笔记里把这段标出来，到时你自然会对上。**

### 1.5 ⚠️ 两个必须避开的写法

**① `Student.prototype = Person.prototype` —— 这是"共享"，不是"继承"**

```js
Student.prototype = Person.prototype;   // ❌ 大错
Student.prototype.exam = function () {};
```

**`Person.prototype` 和 `Student.prototype` 现在是同一个对象** —— 你给 `Student` 加的方法，**`Person` 的实例也能用了**。两个构造函数的原型被搅在一起，**后患无穷，而且当场不报错**。

| 正确的（继承） | 错误的（共享） |
|---|---|
| `Student.prototype = Object.create(Person.prototype)` | `Student.prototype = Person.prototype` |
| 各是各的对象，中间有链接 | **同一个对象**，互相污染 |

**判断方法**：`Student.prototype === Person.prototype` 应该是 **`false`**。如果是 `true`，你就写错了。

**② 别忘了修 `constructor`**

```js
Student.prototype = Object.create(Person.prototype);
Student.prototype.constructor = Student;   // ⚠️ 这行不写，Student 实例的 constructor 会指向 Person
```

**这就是 180 集那个坑的第二次出现** —— `Object.create(...)` 造出来的新对象也没有 `constructor`。

### 1.6 `Object.create` 是什么（一句话够用版）

```js
Object.create(某对象);   // 造一个「新空对象」，并把它的 __proto__ 指向「某对象」
```

**它等价于"先造空对象，再设 `__proto__`"**：

```js
const o = {};
o.__proto__ = Person.prototype;      // 等价于 ↓
const o2 = Object.create(Person.prototype);
```

**标准写法用 `Object.create`**（因为直接改 `__proto__` 是历史遗留做法，181 集说过）。

## 2. 原型链（183）🔥

### 2.1 一条完整的链长什么样

```js
function Person() {}
const p = new Person();

// 从 p 出发，一层层往上：
p.__proto__                        === Person.prototype
p.__proto__.__proto__              === Object.prototype      ← 再上一层是所有对象共同的"祖宗"
p.__proto__.__proto__.__proto__    === null                  ← 链到头了
```

**画出来就是：**

```
   实例 p
     │ __proto__
     ▼
   Person.prototype          ← 放 sayHi 等共享方法
     │ __proto__
     ▼
   Object.prototype          ← 放 toString / hasOwnProperty 等（所有对象都有）
     │ __proto__
     ▼
   null                      ← 链的终点
```

⭐ **`toString()` 为什么会存在？** —— 因为**任何对象顺着链往上都能找到 `Object.prototype.toString`。** 你从没给 `p` 写过 `toString`，但它就是有。**你现在用的每一个内置方法（`hasOwnProperty`、`valueOf`……）都是这么来的。**

### 2.2 查找规则：找不到就往上，一路到 `null`

```js
const p = new Person();

p.sayHi();          // ① p 自己有吗？→ 没有
                    // ② 顺着 __proto__ 到 Person.prototype → 有！执行
p.toString();       // ① p 没有 → ② Person.prototype 没有 → ③ Object.prototype 有！执行
p.不存在的东西();    // ① ② ③ 都没有 → ④ 到 null → 返回 undefined
                    //    ⚠️ 然后你把它当函数调用了 → 才报 TypeError
```

⚠️ **注意最后一行**：找不到本身**不报错**，返回 `undefined`；**报错是因为你试图调用 `undefined`**。这两个是两件事，别混。

### 2.3 三个一眼看出链的式子

```js
// 普通对象
({}).__proto__              === Object.prototype

// 数组
[].__proto__                === Array.prototype
[].__proto__.__proto__      === Object.prototype        ← 数组也是对象

// 函数
function f() {}
f.__proto__                 === Function.prototype      ← 函数也是对象（回扣 166）
```

⭐ **`[].__proto__.__proto__ === Object.prototype`** 这一行很值得停一下：**数组方法在 `Array.prototype`，通用对象方法在更上面一层 —— 所以数组既能 `map` 又能 `toString`。** 这条链是"分层"的。

### 2.4 ⭐ 收敛时刻：178 → 181 → 182 → 183 是一条线

```
178  prototype        仓库里放什么
181  __proto__        怎么走到仓库
182  继承             把两条链接起来，走到更远的仓库
183  原型链           「一层层往上走到 null」的全过程
```

**四集其实是同一件事的四个切面。** 你现在应该能一句话说清整个机制了：

> **对象身上有个 `__proto__` 指向它的原型；找属性时先找自己，找不到就顺着 `__proto__` 往上，一层层找，直到 `null`；构造函数身上的 `prototype` 就是"它的实例们的原型"。**

**这句话说完，原型这一整段就算过去了。**

## 3. `instanceof`（183）⭐

### 3.1 怎么用

```js
const s = new Student('张三', 18, 95);

console.log(s instanceof Student);    // true
console.log(s instanceof Person);     // true   ← 子类的实例，也算父类的"实例"
console.log(s instanceof Object);     // true   ← 链上还有 Object
console.log(s instanceof Array);      // false
```

**它问的是："在我的原型链上，有没有出现 `XXX.prototype`？"**

```js
// 内部逻辑（理解用，不要真这么写）
s instanceof Student    // 顺着 s 的链往上走，看有没有遇到 Student.prototype
```

### 3.2 ⭐ 它才是可靠的类型判断（回扣 180）

180 集说过 `constructor` **可被改、不可靠**。`instanceof` 为什么可靠？

```js
// 用 constructor 判断 —— 别人改一下就失效
const s = new Student('张三', 18, 95);
s.constructor = Object;
console.log(s.constructor === Student);    // false ← 误判，且不报错

// 用 instanceof 判断 —— 改 constructor 不影响它
console.log(s instanceof Student);         // true  ← 依然正确
```

⭐ **因为它看的不是"某个属性写着什么"，而是"链上真实存在什么"。** 属性可以骗人，**链不会**（除非你直接把链改了）。

### 3.3 ⚠️ 它也不是"绝对可靠" —— 两种情况会失效

**① 跨窗口 / 跨 iframe 会失效**

不同窗口有**各自独立的 `Object.prototype` / `Array.prototype`**。所以一个窗口的数组，在另一个窗口里 `instanceof Array` 会是 **`false`**。

**② 原型链可以被改**

```js
Object.setPrototypeOf(s, Person.prototype);   // 把链换掉
console.log(s instanceof Student);            // false ← 已经不是了
```

**链改了，判定就变了** —— 这也正是 1.3 说的"C# 编译期定死、JS 运行期可改"的具体后果。

### 3.4 C# 对照

| | C# | JS |
|---|---|---|
| 判断"是不是某类型" | `obj is Person` | `obj instanceof Person` |
| 依据什么 | **运行时的类型信息**（编译期确定） | **运行期顺着原型链找** |
| 能不能被绕过 | 不能（除非用反射做危险操作） | **能**，改链 / 跨窗口就行 |
| 子类实例算不算父类 | ✅ 算 | ✅ 算 |

⭐ **概念上 `instanceof` ↔ `is`，可以放心类比；但要知道 JS 这边是"用一条可变的链"实现的，所以有跨窗口那个坑。**

---

## 4. 模态框构造函数（184）—— 🧪 实操，讲架构

这一集没有新语法，它的价值是**第一次把"一个 UI 组件"封装成一个构造函数**。骨架：

```js
function Modal(title, content) {
  // ① 数据：把内容存成自己的属性
  this.title = title;
  this.content = content;
  // ② 造 DOM：也存成自己的属性（这样方法才能操作它）
  this.el = document.createElement('div');
  // ...填充内容...
  document.body.appendChild(this.el);
}

// ③ 行为：挂在原型上
Modal.prototype.open = function () { this.el.style.display = 'block'; };
Modal.prototype.close = function () { this.el.style.display = 'none'; };

const m = new Modal('提示', '你好');
m.open();
```

**它和前面几轮的连续性**（值得点名）：

| 前面学的 | 在这里 |
|---|---|
| 面向对象 / 封装（176-178） | **一个组件 = 数据 + 行为，装进一个构造函数** |
| 数据 / 方法分开放（178） | `this.title`（数据）、`Modal.prototype.open`（方法） |
| 三层分离（第 08 轮） | 组件自己的"数据"是 `this.title` / `this.isOpen`，**DOM 只是它的投影** |
| 数据驱动（第 08 轮） | `open()` 其实是"改状态 → 重画"，只是这里用 `style.display` 代替了 `innerHTML` |

⭐ **这就是"用面向对象写组件"的起点。** 你以后用的每一个 UI 组件库（Swiper、Bootstrap 的 Modal……），内部都是这个结构 —— 只是它们还多了配置项合并、事件系统、链式调用等等。**外壳再复杂，骨架就是这一集这十几行。**

⚠️ **一个务实的提醒**：这个写法（构造函数 + 原型）在今天的**业务代码**里已经很少手写了，因为框架（Vue / React）把它包掉了。**但组件库的底层依然是它**，读懂它是你以后能看懂库源码的前提。

---

==二：格式==

## 1. 继承模板（背下这四行）

```js
function 子类(参数...) {
  // 父类属性：现在手动写，学到 193 后改成 父类.call(this, ...)
  this.xxx = ...;
  // 自己的属性
}

子类.prototype = Object.create(父类.prototype);   // ⭐ 接链
子类.prototype.constructor = 子类;                // ⭐ 修 constructor

子类.prototype.自己的方法 = function () { ... };   // 加自己的方法
```

## 2. 三个自证式（写完继承立刻验）

```js
const s = new 子类(...);

s instanceof 子类        // true
s instanceof 父类        // true   ← 说明链接上了
子类.prototype === 父类.prototype   // false  ← 必须是 false！true 说明你写成"共享"了
```

## 3. `instanceof` vs `constructor` 速查

| | `instanceof` | `constructor` |
|---|---|---|
| 写法 | `x instanceof Person` | `x.constructor === Person` |
| 依据 | **原型链** | **一个普通属性** |
| 能被改吗 | 改链才行 | **随便改** |
| 该用谁 | ✅ **用这个** | 调试时看看 |

---

==三：代码==

## 1. 完整的继承链实验（182 + 183 的核心）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>原型继承与原型链</title></head>
<body>
  <script>
    // ═══ 父：Person ═══
    function Person(uname, age) {
      this.uname = uname;
      this.age = age;
    }
    Person.prototype.sayHi = function () {
      console.log('我是 ' + this.uname);
    };

    // ═══ 子：Student ═══
    function Student(uname, age, score) {
      this.uname = uname;          // ⚠️ 暂时手动（193 集改成 Person.call(this, ...)）
      this.age = age;
      this.score = score;
    }
    Student.prototype = Object.create(Person.prototype);   // ⭐ 接链
    Student.prototype.constructor = Student;               // ⭐ 修回

    Student.prototype.exam = function () { console.log('我在考试'); };

    // ═══ 验证 ═══
    const s = new Student('张三', 18, 95);

    s.exam();      // 我在考试      ← 自己的方法
    s.sayHi();     // 我是 张三      ← 从 Person.prototype 借来的 ⭐

    // ——— 链的形状 ———
    console.log(s.__proto__ === Student.prototype);                  // true
    console.log(s.__proto__.__proto__ === Person.prototype);         // true  ← 两条链接上了
    console.log(s.__proto__.__proto__.__proto__ === Object.prototype);// true
    console.log(s.__proto__.__proto__.__proto__.__proto__);          // null  ← 链的终点

    // ——— instanceof ———
    console.log(s instanceof Student);   // true
    console.log(s instanceof Person);    // true   ← 子类实例也算父类的
    console.log(s instanceof Object);    // true
    console.log(s instanceof Array);     // false

    // ——— 父类的方法，父类实例也能用（说明没被污染）———
    const p = new Person('李四', 40);
    p.sayHi();                           // 我是 李四
    console.log(p instanceof Student);   // false ← Person 不是 Student，正确

    // ═══ ⚠️ 反例：写成"共享"会怎样 ═══
    function Bad() {}
    Bad.prototype = Person.prototype;              // ❌ 同一个对象！
    console.log(Bad.prototype === Person.prototype);  // true  ← 危险信号
    Bad.prototype.hacked = function () { console.log('污染了'); };
    p.hacked();                                    // 污染了  ← Person 的实例被殃及！
  </script>
</body>
</html>
```

## 2. `instanceof` 比 `constructor` 可靠（回扣 180）

```js
const s = new Student('张三', 18, 95);

// ❌ constructor 可以被改
s.constructor = Object;
console.log(s.constructor === Student);   // false ← 误判
console.log(s instanceof Student);        // true  ← 依然正确 ✅

// ⚠️ 但 instanceof 也有失效的两处
console.log('abc' instanceof String);     // false ← 基本类型没有原型链可走
console.log([1,2] instanceof Array);      // true  ← 对象才行

Object.setPrototypeOf(s, Person.prototype);   // 把链换掉
console.log(s instanceof Student);        // false ← 改链就失效了
```

## 3. 模态框组件（184 的骨架）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Modal</title>
  <style>
    .modal { position: fixed; inset: 0; background: rgba(0,0,0,.5);
             display: none; align-items: center; justify-content: center; }
    .modal-box { background: #fff; padding: 24px; border-radius: 8px; min-width: 260px; }
    .modal-box h4 { margin: 0 0 12px; }
  </style>
</head>
<body>
  <button id="openBtn">打开弹窗</button>

  <script>
    function Modal(title, content) {
      // 数据
      this.title = title;
      this.content = content;
      this.isOpen = false;

      // 造 DOM（存成属性，方法才能操作它）
      this.el = document.createElement('div');
      this.el.className = 'modal';
      this.el.innerHTML =
        '<div class="modal-box">' +
          '<h4>' + this.title + '</h4>' +
          '<p>' + this.content + '</p>' +
          '<button class="closeBtn">关闭</button>' +
        '</div>';
      document.body.appendChild(this.el);

      // 事件：委托到自己的元素上（回扣第 08 轮）
      const self = this;
      this.el.addEventListener('click', function (e) {
        if (e.target.className === 'closeBtn' || e.target === self.el) {
          self.close();
        }
      });
    }

    // 行为：挂在原型上（一份，共享）
    Modal.prototype.open = function () {
      this.isOpen = true;
      this.el.style.display = 'flex';      // DOM 是 isOpen 的投影
    };
    Modal.prototype.close = function () {
      this.isOpen = false;
      this.el.style.display = 'none';
    };

    const m = new Modal('提示', '这是一个用构造函数写的弹窗。');
    document.querySelector('#openBtn').addEventListener('click', function () { m.open(); });
  </script>
</body>
</html>
```

> ⚠️ 注意代码里的 `const self = this;` —— **这是为了在普通函数回调里保住 `this`**。用箭头函数也能解决（箭头函数不改变 `this`），**但"为什么需要这么做"要到 192 集才讲得透。先用 `self` 这个最原始的办法，它是所有老代码里的通用写法。**

## 动手小练习（不留超纲作业）

写一组 `Animal` / `Dog`：

1. `Animal` 构造函数存 `name`，`Animal.prototype.speak` 打印 `'... 叫了一声'`
2. `Dog` 继承 `Animal`，加一个自己的方法 `fetch()`
3. 打印这五个式子，确认**前四个是 `true`、最后一个是 `false`**：

```js
d instanceof Dog                       // true
d instanceof Animal                    // true
d instanceof Object                    // true
d.speak === Animal.prototype.speak     // true   方法确实是借来的
Dog.prototype === Animal.prototype     // false  ⚠️ 必须是 false
```

**最后一个式子最值得盯** —— 它就是你有没有把"继承"写成"共享"的分水岭。

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 182 | JS 的继承 = **把两条原型链接起来**（`子.prototype = Object.create(父.prototype)`），**不是 C# 那种类继承** |
| 183 | 属性查找 = **先自己，再顺 `__proto__` 一层层往上，直到 `null`**；这就是原型链 |
| 183 | **`instanceof` 靠"链上有没有"判断，所以比 `constructor` 可靠**（回扣 180） |
| 184 | 一个 UI 组件 = **数据 + 行为装进构造函数**，DOM 是状态的投影 |

## 2. ⭐⭐ 本轮要背的：继承模板四行

```js
子类.prototype = Object.create(父类.prototype);   // 接链
子类.prototype.constructor = 子类;                // 修回
子类.prototype.方法 = function () {};              // 加方法
// 属性：现在手动写，193 集改成 父类.call(this, ...)
```

**再加一个警报式**：`子类.prototype === 父类.prototype` **必须是 `false`**。

## 3. ⭐ 收敛时刻：178 → 181 → 182 → 183 是一条线

| 集 | 讲的是 |
|---|---|
| 178 | 仓库里**放什么** |
| 181 | **怎么走到**仓库 |
| 182 | 把**两条链接起来**，走到更远的仓库 |
| 183 | **一层层往上走到 `null`** 的全过程 |

**一段话说完整套机制：**

> 对象身上有个 `__proto__` 指向它的原型；找属性先找自己，找不到就顺着 `__proto__` 一层层往上，直到 `null`；构造函数的 `prototype` 就是"它的实例们的原型"；把子构造函数的 `prototype` 的 `__proto__` 指向父的 `prototype`，就实现了继承。

**这句话能自己说出来，原型这一整段就过关了。**

## 4. 静默失败清单（本轮 5 条，4 条不报错）

| 你写的 | 实际发生 |
|---|---|
| `子.prototype = 父.prototype` | 写成"共享"，两边互相污染，**无报错** |
| 忘了 `constructor: 子` | 子类实例的 `constructor` 指向父类，**无报错** |
| 忘了手动写父类属性 | `this.uname` 是 `undefined`，**无报错** |
| 用 `constructor` 做类型判断 | 可被改，误判，**无报错** |
| 对象上找不到的属性 | 返回 `undefined`，**不报错**（报错的是"把它当函数调了"） |

**会报错的一条**：`Object.create(null)` 之后链到头，访问任何属性都是 `undefined`；而 `Object.setPrototypeOf` 传非法值 → `TypeError`。

## 5. C# 类比可用度（本轮新增）

| JS 的做法 | C# 对应 | 档 |
|---|---|---|
| `子.prototype = Object.create(父.prototype)` | `class 子 : 父` | ❌ **机制完全不同**：C# 是类继承 + 编译期；JS 是对象链接 + 运行期 |
| `instanceof` | `is` | ⚠️ **概念同源**，但 JS 靠可变的原型链 → 跨窗口会失效 |
| `constructor` 判断类型 | `obj.GetType()` | ❌ **C# 不可伪造，JS 可随便改** |
| 父类方法自动继承 | 继承父类方法 | ⚠️ **C# 自动（方法表）；JS 要靠链走到** |
| 父类"字段"要手动初始化 | 子类构造函数里 `base(...)` | ⚠️ **JS 得用 `call`（193 集），现在只能手动抄** |
| 一个对象只有一个 `__proto__` | 单继承 + 多接口 | ⚠️ **JS 连接口都没有，是纯单链** |
| 事后往原型加方法，已有实例立刻能用 | （无对应） | ❌ **C# 编译后不可能** |

⭐ **本轮的核心差异一句话**：**C# 的继承写在"类型的声明"里，编译期结算；JS 的继承是"对象之间的一条链"，用到时才走、随时可改。**

## 6. 解锁边界（本轮变更）

**新解锁**
- ✅ **`Object.create(原型)`** —— ES5 标准写法，原型继承绕不开，本轮起可用
- ✅ **`instanceof`** —— 可靠类型判断

**⚠️ 本轮的挂账（下次要接）**
- ⏳ **父类属性继承的正确写法 `父类.call(this, ...)`** —— 需要 `call`，**193-195 集才学**。**到时回来把 182 的示例改成标准版。**
- ⏳ **`this` 在回调里为什么需要 `const self = this`** —— 192 集讲透。

**仍然锁着**
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` ← **课程内永不解锁**

## 7. 下一轮预告

第 **185 / 186 / 187** 集：

| 集 | 内容 |
|---|---|
| 185 | 综合案例 · 模态框 `open` 方法封装 — 🧪 |
| 186 | 综合案例 · `close` 封装以及小结 — 🧪（**原型这一段的收尾**） |
| 187 | **浅拷贝** — 🔥 ↔ C# 浅拷贝 ✅ 你懂 |

⚠️ **185-186 是 184 那个模态框的下半场**（把 `open` / `close` 写完整），仍是实操 → 讲架构。
⚠️ **187 起进入 Day 4（拷贝 / this / 防抖节流）**，从那以后**不再有原型相关的内容**。⚠️ 187 有一个 JS 特有的坑要先打预防针：**`obj2 = obj1` 连浅拷贝都不是，那是"两个名字指向同一个对象"** —— 这一条你迟早会踩。
