# JS--进阶篇 09 · 两种编程思想 · 构造函数封装的问题 · 原型对象 prototype

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **176 / 177 / 178** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **本轮定位**：**进入 Day 3 · 原型 —— 全课最硬的一座山的第一集**。178 是整段课程的分水岭。

---

==一：概念==

## 1. 两种编程思想（176）—— ⚡ 你早已通透，只补一个钩子

| | 面向过程 | 面向对象 |
|---|---|---|
| 拆解问题的单位 | **步骤**（第一步、第二步……） | **对象**（谁在做事） |
| 数据和操作的关系 | 分开存放 | **绑在一起**（数据 + 行为同住一个对象） |
| 典型写法 | 一堆函数串起来 | 造对象 → 调它的方法 |

你写过 C#，这一节对你**没有任何新东西**。所以这一集我只留一个**钩子**，它是接下来 176-186 那一整座山的主线：

> ⚠️ **JS 的"面向对象"和 C# 的，不是同一个东西。**
>
> - **C#** 是 **class-based**：先写 `class`，类是**模板**，实例是"类的产物"；类还是编译期存在的**类型**。
> - **JS** 是 **prototype-based**：**课程里根本没有 `class`**。对象与对象之间靠**"原型"链接**，实例的方法是从原型那里**借**来的。
>
> 两条路都能实现"封装"，但**内部机制完全不同**。你在 C# 里建立的那套"类 / 实例 / 继承"直觉，到 JS 里会**一半对、一半错**。这一轮之后就是在拆这个。

## 2. 构造函数实现封装，以及它的问题（177）🔥

**"封装"在 JS 里长什么样** —— 把**数据**和**行为**都放进构造函数：

```js
function User(uname, age) {
  this.uname = uname;          // 数据
  this.age = age;
  this.eat = function () {     // 行为 ← 也挂在 this 上
    console.log(this.uname + ' 在吃饭');
  };
}

const u1 = new User('张三', 18);
const u2 = new User('李四', 20);
u1.eat();      // 张三 在吃饭
```

能跑，看起来挺好。**但这行代码有一个看不见的问题。**

### ⚠️ 问题：每个实例都重复创建了一遍方法

**先做这个自证实验**（本轮最关键的实验）：

```js
console.log(u1.eat === u2.eat);   // false  ← 注意这个 false
```

`===` 比对象，比的是**是不是同一个对象**（C# 里的 `ReferenceEquals`）。结果是 `false` ——

> **说明 `u1` 和 `u2` 手里的 `eat` 是两个完全不同的函数对象。**
> 也就是说：**你 `new User()` 多少次，就造了多少个一模一样的 `eat` 函数。**

1000 个用户，就是 **1000 份** `eat` 函数的副本。**它们代码一字不差，却各占一块内存。**

### ⭐ 为什么 C# 程序员从来不用操心这件事

这是本轮最值得记的一个对比：

| | C# | JS |
|---|---|---|
| 方法代码存在哪 | **类型的方法表**里，**只有一份** | 你把它写在哪，它就存在哪 |
| 实例里存什么 | **只有字段**（数据） | `this.eat = ...` → **每个实例各存一份函数对象** |
| 会不会重复 | **不会**，天生共享 | **会**，而且你毫无察觉 |

**C# 里 `u1.Eat()` 和 `u2.Eat()` 调用的是同一份代码** —— 因为方法属于**类型**，不属于实例。所以 C# 里你**根本不需要**任何"共享机制"，它是语言免费送给你的。

**JS 这里，共享是要你自己动手争取的。** 这就是下面 178 的由来。

> ⭐ **根本原因**：**JS 里函数是"值"（一等公民）**。`this.eat = function () {}` 就是**在给每个新对象赋一个函数值** —— 跟 `this.age = 18` 赋值一模一样，只不过值恰好是个函数。既然它是值，就会**被复制**。

## 3. 原型对象 `prototype`（178）🔥🔥 —— 全课的分水岭

**177 的问题是：方法被重复创建。**
**178 的答案是：把方法搬到一个"公共仓库"里，所有实例共享同一份。**

这个"公共仓库"，就是**构造函数身上的一个内置属性** —— `prototype`。

```js
function User(uname, age) {
  this.uname = uname;                    // 数据：每个实例各不相同 → 放 this
  this.age = age;
}

// ⭐ 行为：所有实例都一样 → 搬到 prototype 上，只此一份
User.prototype.eat = function () {
  console.log(this.uname + ' 在吃饭');
};

const u1 = new User('张三', 18);
const u2 = new User('李四', 20);

u1.eat();                          // 张三 在吃饭
u2.eat();                          // 李四 在吃饭
console.log(u1.eat === u2.eat);    // true  ← 同一个函数对象！⭐
```

**同一个自证实验，加了 `prototype` 之后从 `false` 变成了 `true`。** 这一行 `true`，就是整个原型机制存在的理由。

### 记法：「每个实例不一样的放 this，所有实例一样的放 prototype」

| 放哪 | 什么东西 | 为什么 |
|---|---|---|
| `this.xxx = ...` | **属性 / 数据**（名字、年龄、数量……） | 每个实例**各不相同**，必须各存各的 |
| `User.prototype.xxx = ...` | **方法**（行为 / 函数） | 所有实例**完全一样**，一份就够 |

⭐ 这就是 JS 里"封装"的标准姿势，也是你以后会看到的**几乎所有**构造函数写法。

### ⚠️ 关键澄清：`prototype` 到底是什么？

| 问题 | 答案 |
|---|---|
| `User.prototype` 是什么？ | **一个属性**，挂在 `User` 这个**函数对象**上 |
| 它的值是什么？ | **一个对象**（这就是"原型对象"这个名字的来源） |
| 谁在用它？ | `new User()` 时，`new` 的**第 ② 步**会把新对象的内部链接指向它（165 集那四步里的第二步） |
| 实例怎么用到它？ | 实例自己**没有** `eat`，但顺着链接**找到了** `User.prototype.eat` —— 这条"顺着找"的路，**179-183 才讲** |

⭐ **165 集那个"只告知存在、不展开"的第 ② 步，到这一集兑现了。**

### ⭐⭐ 收敛时刻：166 那句"函数也是对象"，答案在这里

回顾这条线是怎么长出来的：

```
JS 里函数也是对象（166）
   └─► 所以能给函数挂属性（166 里的静态成员，就是这么来的）
        └─► 而 prototype 也只是「挂在函数上的一个内置属性」（178）
             └─► new 的第 ② 步用它建立链接（165）
                  └─► 实例顺着链接找到共享的方法（181 → 183 原型链）
```

**从第 166 集埋下的那句话，到这一集终于长出了第一根枝干。**

如果你当时觉得"函数也是对象"只是一句定义，现在能感到它的重量了 —— **`prototype` 之所以存在，仅仅因为"函数是个对象，对象上可以有属性"。**

### ⚠️ 三个必须小心的点

**① 千万别整体赋值 `User.prototype`**

```js
User.prototype = { eat: function () {} };   // ⚠️ 不推荐 —— 会把原本的 constructor 弄丢
User.prototype.eat = function () {};        // ✅ 一个个挂，安全
```

`prototype` 这个对象是**引擎给你的**，它天生带一个 `constructor` 属性指回构造函数。你整体替换成一个新对象，那个 `constructor` 就没了。（`constructor` 是 180 集的主题，现在先按规矩来。）

**② `prototype` 上的方法里，`this` 依然指向实例**

```js
User.prototype.eat = function () {
  console.log(this.uname);      // ✅ 能拿到，this 指向调用者（u1 / u2）
};
```

因为 **`this` 由"怎么被调用"决定**（第 157 轮讲箭头函数时立住了）—— `u1.eat()` 里 `this` 就是 `u1`。**方法住在哪，不影响 `this`。**

**⚠️ 但千万别在 `prototype` 上写箭头函数** —— 箭头函数没有自己的 `this`（157 集），它会**去外层找**，拿到的是 `window` 之类的东西，`this.uname` 就是 `undefined`，**而且不报错**。

**③ `prototype` 不是"构造函数独有"的 —— 是"函数都有"**

任何普通函数天生就有 `prototype` 属性（箭头函数没有）。**不是构造函数特殊，是所有函数都长这样**，只是你只在写构造函数时才用它。

---

==二：格式==

## 1. 两版写法对照（记住右边那版）

```js
// ❌ 旧版：方法挂在 this 上 —— 每个实例一份
function User(uname, age) {
  this.uname = uname;
  this.age = age;
  this.eat = function () { console.log(this.uname + ' 在吃饭'); };   // ← 重复创建
}

// ✅ 新版：数据放 this，方法搬 prototype —— 全实例共享一份
function User(uname, age) {
  this.uname = uname;
  this.age = age;
}
User.prototype.eat = function () { console.log(this.uname + ' 在吃饭'); };
```

## 2. 什么放哪儿（决策表）

| 你想放的 | 放哪 | 判断依据 |
|---|---|---|
| 名字、年龄、价格、数量…… | `this.xxx = ...` | 每个实例**值不同** |
| 方法（`eat` / `run` / `total`） | `User.prototype.xxx = ...` | 所有实例**代码相同** |
| 和实例无关的常量、工具 | `User.xxx = ...`（静态，166 集） | 属于**构造函数本身**，不属于实例 |

## 3. 检查一个函数的 `prototype`

```js
function User(n) { this.n = n; }

console.log(typeof User.prototype);                 // 'object'    ← 它是个对象
console.log(User.prototype.constructor === User);   // true        ← 天生指回自己
User.prototype.say = function () {};
console.log(typeof User.prototype.say);             // 'function'  ← 挂上去了
```

---

==三：代码==

## 1. 最重要的对照实验：`===` 的 false 和 true

```js
// ═══ 版本 A：方法挂在 this 上（177 的问题）═══
function UserA(uname) {
  this.uname = uname;
  this.eat = function () { console.log(this.uname + ' 在吃饭'); };
}

// ═══ 版本 B：方法挂在 prototype 上（178 的答案）═══
function UserB(uname) {
  this.uname = uname;
}
UserB.prototype.eat = function () { console.log(this.uname + ' 在吃饭'); };

const a1 = new UserA('张三');
const a2 = new UserA('李四');
const b1 = new UserB('张三');
const b2 = new UserB('李四');

console.log(a1.eat === a2.eat);   // false  ← 两份不同的函数对象（各占一块内存）
console.log(b1.eat === b2.eat);   // true   ← 同一份，被两个实例共享

// 但两种写法的「调用效果」一模一样 —— 问题只在内存里，肉眼看不见
a1.eat();   // 张三 在吃饭
b2.eat();   // 李四 在吃饭
```

⭐ **`===` 的这两个结果，就是本轮的总结论。** 内存里的浪费是看不见的，只能用 `===` 让它现形。

## 2. 完整示例：数据 + 方法

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>原型对象</title></head>
<body>
  <script>
    function User(uname, age) {
      this.uname = uname;                    // 数据 → this
      this.age = age;
    }

    User.prototype.sayHi = function () {     // 方法 → prototype（只有一份）
      console.log('大家好，我是 ' + this.uname + '，今年 ' + this.age);
    };
    User.prototype.growUp = function () {    // 也能改实例自己的数据
      this.age++;
    };

    const u1 = new User('张三', 18);
    const u2 = new User('李四', 20);

    u1.sayHi();               // 大家好，我是 张三，今年 18
    u1.growUp();
    u1.sayHi();               // 大家好，我是 张三，今年 19   ← 改的是 u1 自己的 age

    u2.sayHi();               // 大家好，我是 李四，今年 20   ← u2 没受影响

    console.log(u1.sayHi === u2.sayHi);   // true  ← 方法共享
    console.log(u1.age);                  // 19    ← 数据各存各的
    console.log(u2.age);                  // 20
  </script>
</body>
</html>
```

**这一份同时演示了两件事**：**方法共享**（`sayHi` 只有一份）、**数据独立**（改 `u1.age` 不影响 `u2`）。**这就是"哪些放 this、哪些放 prototype"的实感。**

## 3. ⚠️ 反面教材：`prototype` 上挂箭头函数

```js
function User(uname) {
  this.uname = uname;
}

// ❌ 箭头函数没有自己的 this —— 它去外层（这里是全局）找 this
User.prototype.bad = () => {
  console.log(this.uname);      // undefined  ← 不报错！
};

// ✅ 老老实实写普通函数
User.prototype.good = function () {
  console.log(this.uname);      // 张三
};

const u = new User('张三');
u.bad();      // undefined   ← 静默失败：什么都不报，就是拿不到
u.good();     // 张三
```

**规则：`prototype` 上的方法，永远写 `function () {}`，不写箭头函数。**

## 动手小练习（不留超纲作业）

给 `User` 构造函数**再挂一个方法** `changeAge(newAge)`，把实例自己的 `age` 改成新值，然后：

1. 打印 `u1.age`、`u2.age` 确认只有 `u1` 变了
2. 打印 `u1.changeAge === u2.changeAge` 确认这个方法**是共享的**

**这两个结果同时成立，就说明你把"数据放 this、方法放 prototype"这条规矩用对了。**

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 176 | 面向过程拆"步骤"，面向对象拆"对象" —— 你都懂；⚠️ **但 JS 的面向对象 ≠ C# 的**（无 `class`、靠原型） |
| 177 | 方法挂在 `this` 上 → **每个实例各造一份**（`u1.eat === u2.eat` 是 `false`） |
| 178 | 方法搬到 `User.prototype` 上 → **全体共享一份**（`===` 变 `true`） |

## 2. ⭐⭐ 本轮要背下来的两条

**① 记法：「每个实例不一样的放 `this`，所有实例一样的放 `prototype`。」**

- 数据（`uname` / `age`）→ `this`
- 方法（`eat` / `sayHi`）→ `User.prototype`

**② `prototype` 是"挂在函数对象上的一个属性，值是一个对象"。**

它的存在理由，一句话：**"函数也是对象，对象上可以有属性"**（166）—— 所以函数能有个 `prototype`，而 `new` 会把新对象的内部链接指向它（165 第 ② 步）。

## 3. ⭐ 收敛时刻

**166 埋的那句话，到这里长出了第一根枝干。**

| 前面学的 | 今天兑现了什么 |
|---|---|
| 166 "函数也是对象" | **`prototype` 就是"函数上的一个属性"** —— 这句话的直接产物 |
| 165 "`new` 的第 ② 步" | 当时只告知存在，**今天知道它指向的就是 `prototype`** |
| 157 "箭头函数没有自己的 `this`" | **直接决定了：`prototype` 上不能写箭头函数** |
| 163 "为什么要有构造函数" | 177/178 补齐了它的**正确写法** |

**四个散点，在这一集汇成一条线。**

## 4. 静默失败清单（本轮 3 条，全都静默）

| 你写的 | 实际发生 |
|---|---|
| 方法挂在 `this` 上 | 每个实例一份副本，**内存浪费，无报错、无提示** |
| `prototype` 上写箭头函数 | 方法里的 `this` 不是实例 → `this.uname` 是 `undefined`，**无报错** |
| `User.prototype = { ... }` 整体替换 | 丢掉天生带的 `constructor`，**当时无报错**，等 180 集才发现问题 |

**本轮没有一条会出声。** 这也是原型这一段最难的地方 —— **它错误的样子和正确的样子，跑起来一模一样。**

## 5. C# 类比可用度（本轮新增）

| JS 的做法 | C# 对应 | 档 |
|---|---|---|
| 构造函数 = 造对象的函数 | `class` 的构造函数 | ⚠️ **名字撞车**（164 集），JS 没有类、没有类型 |
| 数据放 `this` | 实例字段 | ✅ 一致 |
| **方法放 `prototype`** | 实例方法 | ❌ **C# 里方法天然共享（存在类型方法表），根本不需要你操心** |
| 方法挂 `this` 上 = 每实例一份 | （无对应） | ❌ C# 里做不到这种"每实例一份方法"的浪费 |
| 面向对象 = 数据 + 行为 | 面向对象 | ⚠️ **目的一样，机制完全不同**：C# 靠类，JS 靠原型 |

⭐ **本轮最重要的一句话**：**C# 里"方法只存一份"是语言白送的，JS 里得你自己搬到 `prototype` 上。** 这就是为什么 C# 程序员从来不需要理解"原型"这个东西 —— **你现在正在学一个 C# 帮你藏起来的概念。**

## 6. 解锁边界（本轮变更）

**新解锁**
- ✅ **`prototype`（构造函数的原型对象属性）** —— Day 3 正式开山

**仍然锁着**
- ❌ **`__proto__`（181）· 原型继承（182）· 原型链 / `instanceof`（183）** —— 这四集是接下来三轮的内容。**本轮只讲"构造函数身上的 `prototype`"，暂时不深挖"实例那一侧的链接叫什么"。**
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` ← **课程内永不解锁**

## 7. 下一轮预告

第 **179 / 180 / 181** 集：

| 集 | 内容 |
|---|---|
| 179 | 数组扩展案例 · 求最大值和求和 — 🧪 |
| 180 | **`constructor` 属性以及应用** — ⭐ |
| 181 | **对象原型 `__proto__`** — 🔥 实例到底是怎么"找到"共享方法的 |

⚠️ **本轮留了一个明显的问题没答**：`u1.eat()` 为什么能找到 `User.prototype.eat`？`u1` 自己身上明明没有 `eat`。
**181 的 `__proto__` 就是答案** —— 那是"实例那一侧"的链接。178 讲的是"仓库"，181 讲的是"从实例走到仓库的那条路"。**两条腿，缺一条就走不动。**
