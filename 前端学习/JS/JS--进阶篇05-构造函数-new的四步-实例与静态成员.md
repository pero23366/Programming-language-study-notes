# JS--进阶篇 05 · 构造函数 · `new` 的四步 · 实例成员与静态成员

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **164 / 165 / 166** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> ⭐ **本轮是整座原型链大厦的地基**（176-186 全靠 165 那四步撑着）。

---

==一：概念==

## 1. 构造函数：一个"撞车"的名字（164）

**先说清楚为什么需要它。** 上一集的工厂函数已经能批量造对象了：

```js
function createUser(uname, age) {
  return { uname: uname, age: age };
}
```

但它造出来的对象**没有"出身"**。看 Console 输出：

```js
const a = createUser('张三', 18);
const b = new User('张三', 18);

console.log(a);      // { uname: '张三', age: 18 }        ← 就是个普通对象
console.log(b);      // User { uname: '张三', age: 18 }   ← 前面带着 User 字样
```

⭐ **前面那个 `User` 就是"出身标记"** —— 这是构造函数和工厂函数最直观的差别，也是"为什么还要多一种造对象的方式"的答案。

⚠️ **但这里有一个必须切开的撞车：JS 的"构造函数"不是 C# 的构造函数。**

| | C# | JS |
|---|---|---|
| 构造函数长在哪 | **写在类里面**：`class User { public User(...) {} }` | **独立存在的一个普通函数** |
| 有没有"类 / 类型" | 有，编译期真实存在 | ❌ **完全没有**。`User` 只是一个函数名，**不是类型** |
| `new User()` 检查什么 | 编译期检查类型、参数个数、可访问性 | **只做固定的 4 步流程，什么都不检查** |
| 能不能 `new` 任意函数 | ❌ 只能 `new` 类 | ✅ **任何函数都能 `new`** |

**最后一行最能说明问题**：

```js
function f(a, b) { this.x = a; }
const o = new f(1, 2);      // 合法！
console.log(o);             // f { x: 1 }
```

C# 里你没法 `new` 一个普通方法。**JS 的 `new` 不看"你是谁"，只看"你怎么被调用"。** 所以"构造函数"这个词在 JS 里描述的**不是一种身份，而是一种用法**。

⚠️ **唯一会报错的情况**：**箭头函数不能 `new`**（它没有 `prototype`，会抛 `TypeError`）。这是少数"当场出声"的地方。

## 2. `new` 干的那四步（165）⭐⭐ 必须背下来

**先看没有这四步的世界长什么样** —— 就是上一轮那个坑：

```js
function User(uname) { this.uname = uname; }
User('张三');                 // 忘了 new
console.log(window.uname);    // '张三'  ← 泄漏到全局了
```

`this` 为什么没有指向新对象？因为**"指向新对象"这件事不是自动发生的，它是 `new` 做的四步之一**。

**`new` 的四步**：

| 步骤 | 做什么 | 不做会怎样 |
|---|---|---|
| **① 创建一个新的空对象** | 先在内存里造好一个干净的对象 | —— |
| **② 把新对象的原型指向构造函数的 `prototype`** | 建立"这个对象属于谁"的链接 | 实例拿不到共享的方法（第 178 集展开） |
| **③ 让构造函数里的 `this` 指向这个新对象** | 所以 `this.uname = ...` 才写到新对象上 | **`this` 还是 `window` → 属性泄漏成全局变量**（上一轮的坑） |
| **④ 执行函数体，最后返回这个新对象** | 不需要你写 `return` | —— |

⭐ **第 ② 步是整座原型链大厦的第一块砖。** 这一集你只需要记住"有这么一步，它把新对象和构造函数的 `prototype` 连起来了"—— 具体细节在 **178（`prototype`）和 181（`__proto__`）**两集展开，现在不用深挖。

**第 ④ 步有个隐藏的坑**：`new` 的返回值**可以被你手动 `return` 顶掉，而且分两种情况**：

```js
function A() { this.x = 1; return { y: 2 }; }   // return 一个对象
console.log(new A());        // { y: 2 }   ← 新对象被顶掉了

function B() { this.x = 1; return 100; }        // return 一个基本类型
console.log(new B());        // B { x: 1 } ← 返回被忽略，安安静静
```

**返回对象 → 顶掉；返回基本类型 → 被忽略。** 两种情况都不报错。所以铁律是：**构造函数里永远不要写 `return`。**

## 3. 实例成员 与 静态成员（166）

**这一集的概念和 C# 完全一致 ✅** —— 只是要知道 JS 怎么写。

| | 挂在谁身上 | 怎么访问 | 叫什么 |
|---|---|---|---|
| **实例成员** | 每个**实例**对象 | `user.uname` | 实例属性 / 方法 |
| **静态成员** | **构造函数本身** | `User.species` | 静态属性 / 方法 |

JS 写静态成员的方式是**直接给函数加属性**：

```js
function User(uname) { this.uname = uname; }   // 实例成员写在 this 上
User.species = '人类';                          // 静态成员写在函数上
```

⭐ **为什么能这么写？因为 JS 里"函数也是对象"。** C# 里方法不是对象，所以没有"给方法挂属性"这回事。

⭐ **顺带解开一个悬念**：回过头看第 ② 步里的 `User.prototype` —— 它其实**就是挂在函数对象上的一个属性**。**函数是对象 → 所以能挂属性 → `prototype` 只是其中一个内置的属性。** 176-186 那整座山，就是从这句话开始爬的。

⚠️ **两者互不可见，而且都是静默的**：

```js
const u = new User('张三');
console.log(u.species);      // undefined  ← 实例看不到静态成员
console.log(User.uname);     // undefined  ← 构造函数看不到实例成员
```

C# 里写这两行**编译不过**（"对象引用对于非静态的字段要求"）；JS 里**都是 `undefined`**。

⚠️ **静态方法里的 `this` 指向构造函数本身**，不是实例：

```js
User.introduce = function () { console.log(this === User); };  // true
```

---

==二：格式==

## 1. 构造函数的标准写法（四行模板）

```js
function User(uname, age) {      // ① 首字母大写（约定，不是语法）
  this.uname = uname;            // ② 实例成员挂在 this 上
  this.age = age;
}                                // ③ 不写 return
User.species = '人类';            // ④ 静态成员挂在函数上

const u = new User('张三', 18);   // ⑤ 调用时必须加 new
```

**五条纪律**：
- **首字母大写** —— 这是给你自己看的警报：看到大写开头就该想起 `new`
- **属性挂 `this`**，不要写在函数外面的变量上
- **不写 `return`**
- 静态成员用 `User.xxx = ...` 挂
- **调用必加 `new`**

## 2. `new` 四步速查

```
new User('张三')
   │
   ├─ ① 造一个空对象          {}
   ├─ ② 把它和 User.prototype 连起来   ← 原型链的第一块砖（178/181 展开）
   ├─ ③ 让函数里的 this 指向它
   └─ ④ 跑完函数体，返回这个对象
```

**反过来记更容易**：忘了 `new`，就等于**跳过 ①②④，只执行 ③ 的反面** —— `this` 保持原样（`window`），属性全落到全局。

## 3. 实例成员 / 静态成员速查

```js
function User(uname) {
  this.uname = uname;               // 实例成员
}
User.species = '人类';               // 静态成员
User.introduce = function () {       // 静态方法
  console.log('我是 ' + this.species);
};

const u = new User('张三');
u.uname;            // '张三'       ✅ 实例成员：实例能访问
u.species;          // undefined   ❌ 实例访问不到静态成员（静默）
User.uname;         // undefined   ❌ 构造函数访问不到实例成员（静默）
User.species;       // '人类'       ✅ 静态成员：构造函数能访问
User.introduce();   // '我是 人类'  ✅ 静态方法里的 this = User 本身
```

---

==三：代码==

## 1. 工厂函数 vs 构造函数：Console 里看得出差别

```js
// 工厂函数
function createUser(uname, age) {
  return { uname: uname, age: age };
}

// 构造函数
function User(uname, age) {
  this.uname = uname;
  this.age = age;
}

const a = createUser('张三', 18);
const b = new User('张三', 18);

console.log(a);   // { uname: '张三', age: 18 }
console.log(b);   // User { uname: '张三', age: 18 }
                  // ↑ 这个前缀就是"出身标记"
```

**自证实验**：把两行 `console.log` 并排看 —— **`b` 前面多了一个 `User`**。这不是类型，是这个对象"记得自己是从哪个构造函数来的"。

## 2. 四步的完整验证 + `return` 顶掉

```js
function User(uname) {
  this.uname = uname;
  // 第 ④ 步：这里隐式 return 新对象
}

const u = new User('张三');
console.log(u);                  // User { uname: '张三' }

// 演示第 ④ 步的坑
function A() { this.x = 1; return { y: 2 }; }
function B() { this.x = 1; return 100; }
console.log('return 对象：', new A());     // { y: 2 }    ← 新对象被顶掉
console.log('return 基本类型：', new B());  // B { x: 1 }  ← 被忽略，没报错

// 演示箭头函数不能 new
const ArrowUser = (uname) => { this.uname = uname; };
try {
  new ArrowUser('张三');          // TypeError: ArrowUser is not a constructor
} catch (e) {
  console.log('箭头函数不能 new：', e.name);
}
```

## 3. 实例成员 / 静态成员 + 那两条静默的 `undefined`

```js
function User(uname) {
  this.uname = uname;              // 实例成员
}
User.species = '人类';              // 静态成员：直接挂在函数上
User.introduce = function () {
  console.log('我属于 ' + this.species);   // this === User
};

const u1 = new User('张三');
const u2 = new User('李四');

// 实例成员：每个实例各有一份
console.log(u1.uname, u2.uname);   // 张三 李四

// 静态成员：只有构造函数上那一份
console.log(User.species);         // '人类'
User.introduce();                  // '我属于 人类'

// ⚠️ 两条静默的 undefined（C# 里这两行编译不过）
console.log('实例看不到静态：', u1.species);   // undefined
console.log('函数看不到实例：', User.uname);   // undefined

// ⚠️ 小坑：别给函数加名叫 name 的属性
// User.name 是函数自带的名字（'User'），你加的会顶掉它
```

**⚠️ 关于 `User.name` 的坑**：函数自带一个 `name` 属性（值就是函数名）。给它写 `User.name = '张三'` 会覆盖掉，而且**不报错**。静态成员别用 `name` / `length` / `call` 这些"函数本来就有的名字"。

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 164 | **JS 的"构造函数"就是一个普通函数**，没有类、没有类型；`new` 不看你是谁，只看你怎么被调用 |
| 165 | **`new` 就干四件事**：造空对象 → 连原型 → `this` 指向它 → 返回它 |
| 166 | 实例成员挂 `this`，静态成员挂**函数本身**；**因为"函数也是对象"** |

## 2. ⭐ 收敛时刻一：163 的坑到 165 才真正被解释

上一轮那个"忘加 `new` 属性泄漏到 `window`"，当时只能说"因为 `this` 指向了 `window`"。**现在你知道为什么了**：

> **`this` 指向新对象不是自动的，它是 `new` 的第 ③ 步。** 没有 `new`，就没有第 ③ 步 —— `this` 保持默认值（非严格模式是 `window`，严格模式是 `undefined`）。

**163 的现象，165 给出机制。** 这是这一轮最重要的闭合。

## 3. ⭐ 收敛时刻二：`prototype` 从哪来？答案是"函数也是对象"

166 说静态成员可以直接挂在函数上（`User.species = ...`）。那么 `new` 第 ② 步里的 `User.prototype` **是什么？**

> **它就是挂在同一个函数对象上的另一个属性 —— 只不过这个是 JS 预置的。**

所以整条线是这样的：

```
JS 里函数也是对象
   → 所以能给函数挂属性
       → 静态成员就是这么来的（166）
       → 而 prototype 也是挂在函数上的一个属性（178）
           → new 的第 ② 步用它建立链接
               → 实例顺着这条链接找到共享的方法（181）
                   → 沿着这条链一直往上找 = 原型链（183）
```

**176-186 那七集，整座山都是从"函数也是对象"这一句长出来的。** 下一轮（177/178）开始正式爬 —— 而 178 讲 `prototype` 时，你会想起今天这句话。

## 4. 静默失败清单（本轮 6 条，5 条不报错）

| 你写的 | 实际发生 |
|---|---|
| `User('张三')` 忘加 `new` | 属性泄漏成全局变量，**无报错** |
| 构造函数里 `return { y: 2 }` | 新对象被顶掉，**无报错** |
| 构造函数里 `return 100` | 返回被忽略，**无报错** |
| `u.species`（实例读静态） | `undefined`，**无报错** |
| `User.uname`（静态读实例） | `undefined`，**无报错** |
| `User.name = '张三'` 覆盖函数名 | 顶掉内置 `name`，**无报错** |

**唯一会报错的是：箭头函数加 `new`（`TypeError`）。**

**工程上怎么防**：
- 构造函数**首字母大写**（给自己看的警报）
- 构造函数里**永不写 `return`**
- 静态成员**避开 `name` / `length` / `call` / `apply` / `bind`** 这些函数本来就有的名字

## 5. C# 类比可用度（本轮新增）

| JS | C# | 档 |
|---|---|---|
| 构造函数（`function User(){}` + `new`） | 构造函数 | ⚠️ **名字撞车** —— 概念相似，但 JS 没有类 |
| `new` 的四步 | `new` 由编译器和运行时完成 | ⚠️ C# 里你**看不见**这四步；JS 里必须知道 |
| 任何函数都能 `new` | 只能 `new` 类 | ❌ 差异 |
| 实例成员 | 实例成员 | ✅ 概念完全一致 |
| 静态成员 | `static` 成员 | ✅ 概念完全一致 |
| 静态成员挂在"函数对象"上 | 静态成员属于"类" | ⚠️ JS 的载体是函数对象 |
| 访问不存在的成员 → `undefined` | 编译期报错 | ❌ **JS 静默** |

## 6. 解锁边界（本轮变更）

**新解锁**
- ✅ **构造函数 + `new`**（能自己造"带出身"的对象了）

**仍然锁着**
- ❌ `prototype` 的用法（178）· `__proto__`（181）· 原型链 · `instanceof`（183）—— **本轮只"知道它存在"，不用它**
- ❌ `reduce`（169）· `find` / `every`（170）· `Array.from`（170）
- ❌ `class` 语法糖 · Promise · `async/await` · 模块化 · `?.` · `??` ← **课程内永不解锁**

## 7. 下一轮预告

第 **167 / 168 / 169** 集：**基本包装类型** → **`Object` 静态方法** → **数组 `reduce`**。

⚠️ 其中 **167 是你理解起来会最快的一集** —— 它讲的是"**为什么字符串字面量能调方法**"，对应 C# 的**装箱 / 拆箱**。你学过装箱，这一集基本是白送。
⚠️ **169 的 `reduce` ↔ LINQ 的 `Aggregate`**，是本轮唯一的"新工具"，也是"把一堆值合成一个值"的最终答案。
