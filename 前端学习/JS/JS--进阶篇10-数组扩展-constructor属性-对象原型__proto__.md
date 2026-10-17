# JS--进阶篇 10 · 数组扩展案例 · constructor 属性 · 对象原型 `__proto__`

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **179 / 180 / 181** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **本轮定位**：原型山的中段。**181 会把上一轮故意留的那个问题答上。**

---

==一：概念==

## 1. 数组扩展案例（179）—— 🧪 实操，但藏着一个工程禁忌

"求最大值和求和"本身很简单，`reduce` 早就学过了：

```js
const nums = [3, 7, 2, 9, 5];

// 求和
const sum = nums.reduce(function (acc, n) { return acc + n; }, 0);

// 求最大值
const max = nums.reduce(function (acc, n) { return n > acc ? n : acc; });
```

⚠️ 注意求最大值那次 **`reduce` 没给初始值** —— 因为它用的是"第一个元素当起点"的规则（第 169 集）。**如果给了 `0`，数组全是负数时最大值会错成 `0`**。（这也是 169 那个坑的实战版。）

**但课程这一集的重点不是这个，而是"扩展"** —— 用刚学的 `prototype`，给**数组**也加一个方法：

```js
// ⭐ 往数组的原型上加方法 —— 所有数组都能用
Array.prototype.sum = function () {
  return this.reduce(function (acc, n) { return acc + n; }, 0);
};

const nums = [3, 7, 2];
nums.sum();          // 12   ← nums 自己身上没有 sum，但顺着原型找到了
```

**这里 `this` 就是调用它的那个数组** —— 和 178 讲的一样，`this` 由"谁调用"决定。

### ⚠️ 但是：生产环境请**不要**这么干

这是本轮第一个要点。**往 `Array.prototype` 上加方法叫"污染内置原型"**：

| 后果 | 说明 |
|---|---|
| **影响所有数组** | 不管是不是你写的，全站每个数组都多了一个 `sum` |
| **可能撞名** | 将来 JS 标准加了个新的 `Array.prototype.sum`，或者某个库加了不一样的 `sum` → **冲突，且难排查** |
| **`for...in` 会遍历到它** | 别人遍历数组属性时会多出一个 `sum`（**静默出错**） |

### ⭐ C# 的扩展方法：目的相同，安全性完全不同

| | C# 扩展方法 | JS 往原型上加 |
|---|---|---|
| 怎么写 | `static int Sum(this List<int> list)` | `Array.prototype.sum = function () {}` |
| 住在哪 | **一个静态类里**，是**外挂** | **改掉了内置类型本身** |
| 影响范围 | **只有 using 了那个命名空间**的文件才看得见 | **全站、全局、所有数组** |
| 会不会冲突 | 差点（有作用域） | 会，**而且没有任何隔离** |
| 能否撤销 | 不引入就没影响 | **一旦加上，这一页就摘不掉** |

⭐ **结论：C# 的扩展方法是"给类型加个外部功能，类型本身没被碰"；JS 是"你直接改了这个类型"。** 前者安全，后者危险。

> **工程上的正确做法**：需要这种工具，写成**普通函数** `sum(arr)` 或者放进你自己的工具对象 `myUtils.sum(arr)`。**永远别碰 `Array.prototype` / `Object.prototype`。**
> （这是所有 JS 团队的头几条规矩之一。你以后看别人代码，见到改内置原型的，基本可以直接怀疑它的质量。）

## 2. `constructor` 属性（180）⭐

**先看它是什么**：

```js
function User(uname) { this.uname = uname; }

console.log(User.prototype.constructor === User);   // true
```

**每个 `prototype` 对象天生带一个 `constructor` 属性，指回它所属的构造函数。** 这是引擎给的，你什么都不用做。

**作用：从实例反推出"我是谁造的"**

```js
const u = new User('张三');
console.log(u.constructor);              // [Function: User]
console.log(u.constructor === User);     // true
```

⭐ 为什么 `u` 自己身上没有 `constructor`，却能读到？—— **和 `eat` 一样，顺着链接去 `User.prototype` 那里找到的。**（这正是 181 要说的事。）

### ⚠️ 这个属性最著名的坑：整体赋值 `prototype` 会把它弄丢

```js
function User(uname) { this.uname = uname; }

// ❌ 整体替换 —— 把引擎给的那个 prototype 换掉了
User.prototype = {
  eat: function () { console.log('吃'); }
};

console.log(User.prototype.constructor === User);   // false ← 丢了！
```

**那个新对象 `{ eat: ... }` 是你用字面量造的，它天生**没有** `constructor`。** 引擎给的原型对象才带。

**所以 178 集那句"别整体赋值"的真正原因在这里。** 如果非要整体赋值，**必须手动补回来**：

```js
User.prototype = {
  constructor: User,                    // ⭐ 手动补
  eat: function () { console.log('吃'); }
};
```

### ⚠️ 第二个坑：`constructor` 可以被改，所以它**不是可靠的类型检查**

```js
const u = new User('张三');
u.constructor = Object;              // 公然改掉，没人拦你
console.log(u.constructor === User); // false ← 已经不是了，而且不报错
```

**`constructor` 只是一个普通属性，可写、可改。** 所以：

| | C# | JS |
|---|---|---|
| 拿到"我是什么类型" | `obj.GetType()` | `obj.constructor` |
| 能不能伪造 | **不能**，运行时保证 | **能**，随便赋值 |
| 可靠性 | ⭐ 可靠 | ❌ **不可靠** |

**那可靠的替代是什么？** —— **`instanceof`**（183 集）。**它就是为这件事准备的。**

> ⚠️ **所以 180 的结论是**：`constructor` 值得知道、偶尔用来**调试**很方便，但**不要用它做类型判断**。真正的判断交给 183 的 `instanceof`。

## 3. 对象原型 `__proto__`（181）🔥 —— 上一轮那个问题的答案

**先把上一轮留着的问题原样搬过来**：

> `u1` 自己身上明明没有 `eat`，为什么 `u1.eat()` 能调到？

**答案：因为每个实例身上有一个隐藏属性 `__proto__`，它指向创建它的构造函数的 `prototype`。**

```js
const u1 = new User('张三');

console.log(u1.__proto__ === User.prototype);   // true  ⭐
```

**两个 `===` 合在一起看，就是完整的"双向确认"**：

```js
User.prototype.constructor === User;      // true   仓库 → 自己是谁的
u1.__proto__ === User.prototype;          // true   实例 → 仓库在哪
```

⭐ **这就是 165 集 `new` 第 ② 步的真相**：`new` 在建好空对象之后，把它的 `__proto__` 指向了构造函数的 `prototype`。**当时只说"有这么一步"，现在这一集把它的名字交出来了。**

### ⭐⭐ 本轮最重要的一张表：`prototype` vs `__proto__`

**这两个名字是最容易混的一对**，务必分清：

| | `prototype` | `__proto__` |
|---|---|---|
| **住在谁身上** | **函数**（准确说：构造函数） | **对象 / 实例**（函数也有，因为函数也是对象） |
| **它的值是什么** | 一个对象 —— 叫"**原型对象**" | 一个对象 —— 就是它的**原型** |
| **指向哪** | 指向那个共享方法仓库 | 指向**它自己**的仓库（即构造函数的 `prototype`） |
| **谁有它** | 只有（普通）**函数**有 | **几乎所有对象**都有 |
| **干什么用** | `new` 时被当作模板 | **查找属性时顺着它往上走** |
| **记法** | "我是函数，我的仓库在这" | "我是对象，我的仓库在哪" |

**一句话区分**：**`prototype` 是"函数给出去的"，`__proto__` 是"对象指向进来的"。** 一个从上层往下指，一个从下层往上指。

### 查找规则：实例上没有，就顺着 `__proto__` 往上找

```js
const u1 = new User('张三');

u1.eat();
// ① u1 自己身上有 eat 吗？   → 没有（只有 uname）
// ② 顺着 u1.__proto__ 找    → 到了 User.prototype
// ③ 那里有 eat 吗？          → 有！执行它，this 是 u1
```

**这就是 178 留下的那条路的全貌。** 178 讲的是"**仓库里有什么**"，181 讲的是"**怎么走到仓库**"。两条腿合起来，原型机制才完整。

### ⚠️ 三个必须知道的事

**① `__proto__` 的写法其实"不标准"**

`__proto__`（两边各两个下划线）是**历史遗留**的写法，虽然所有浏览器都支持，但它**不推荐在正式代码里用**。标准写法是两个方法：

```js
Object.getPrototypeOf(u1);        // 拿原型  ←  等价于 u1.__proto__
Object.setPrototypeOf(u1, obj);   // 改原型  ←  等价于 u1.__proto__ = obj（且更慢）
```

**课程用 `__proto__` 是为了教学直观**（能直接看到箭头）。**你自己写代码时，用 `Object.getPrototypeOf`。**

⚠️ **`setPrototypeOf` 慎用** —— 改一个对象的原型会让引擎的性能优化失效，是"慢操作"。**设计时定好，别运行时乱改。**

**② 它不是一个"你写上去的属性"**

你从来没有写过 `u1.__proto__ = ...`，但它就是存在 —— 因为这是**引擎在建对象时自动建立并维护**的内部机制，不是某个对象各自存的一份数据。

**所以你可以读它、可以照它推理，但不要把它当成"一个普通的、我随便就能改的字段"**（这也是它为什么有标准的 `Object.getPrototypeOf` 写法）。

**③ 这条链还能继续往上走**

```js
console.log(u1.__proto__.__proto__ === Object.prototype);   // true
```

`User.prototype` 自己也是一个对象，它也有 `__proto__`，指向 `Object.prototype`。**这条"一层层往上"的路，就叫原型链** —— **183 集的主题**。这一轮只需要知道"有这条链，并且能往上走"。

---

==二：格式==

## 1. 一张图记住三个属性的关系

```js
function User(uname) { this.uname = uname; }     // ① 构造函数（函数对象）
User.prototype.eat = function () {};             // ② 原型对象（仓库）

const u1 = new User('张三');                     // ③ 实例

// ═══ 三个自证 ═══
console.log(User.prototype.constructor === User);   // true  ← 仓库认领主人
console.log(u1.__proto__ === User.prototype);       // true  ← 实例指向仓库
console.log(u1.constructor === User);               // true  ← 实例"继承"来的 constructor
```

## 2. 数据、方法、链接：分别住在哪

| 东西 | 住哪 | 怎么读它 |
|---|---|---|
| 数据（`uname` / `age`） | **实例自己身上** | `u1.uname` |
| 方法（`eat` / `sayHi`） | **`User.prototype` 上** | `u1.eat()`（顺链接找到） |
| `constructor` | **`User.prototype` 上** | `u1.constructor` |
| 实例指向仓库的链接 | **实例身上** | `u1.__proto__` 或 `Object.getPrototypeOf(u1)` |

## 3. 别踩的两个格式坑

```js
// ❌ 整体赋值会丢 constructor
User.prototype = { eat: function () {} };

// ✅ 要么一个个挂
User.prototype.eat = function () {};

// ✅ 要么整体赋值时手动补回 constructor
User.prototype = {
  constructor: User,
  eat: function () {}
};
```

---

==三：代码==

## 1. 完整的三方关系实验（180 + 181 的核心）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>constructor 与 __proto__</title></head>
<body>
  <script>
    function User(uname) {
      this.uname = uname;
    }
    User.prototype.eat = function () {
      console.log(this.uname + ' 在吃饭');
    };

    const u1 = new User('张三');
    const u2 = new User('李四');

    // ═══ ① 实例 → 仓库（__proto__）═══
    console.log(u1.__proto__ === User.prototype);        // true
    console.log(u2.__proto__ === User.prototype);        // true
    console.log(u1.__proto__ === u2.__proto__);          // true ← 两个实例指向同一个仓库

    // ═══ ② 仓库 → 构造函数（constructor）═══
    console.log(User.prototype.constructor === User);    // true

    // ═══ ③ 实例"继承"来的 constructor ═══
    console.log(u1.constructor === User);                // true
    console.log(u1.constructor === u2.constructor);      // true

    // ═══ ④ 标准写法（等价，但更规范）═══
    console.log(Object.getPrototypeOf(u1) === User.prototype);   // true

    // ═══ ⑤ 链还能往上走（183 集主题）═══
    console.log(u1.__proto__.__proto__ === Object.prototype);    // true

    // ═══ ⑥ ⚠️ constructor 可以被改，所以不能当类型检查 ═══
    u1.constructor = Object;
    console.log(u1.constructor === User);                // false ← 改了就是改了，不报错
  </script>
</body>
</html>
```

## 2. ⚠️ 反面教材：整体赋值 `prototype` 的后果

```js
function User(uname) { this.uname = uname; }

User.prototype = {
  eat: function () { console.log(this.uname + ' 在吃饭'); }
};

const u1 = new User('张三');
u1.eat();                                   // 张三 在吃饭   ← 方法还能用
console.log(User.prototype.constructor === User);   // false ← 但出身没了
console.log(u1.constructor);                // [Function: Object] ← 顺着链找上去，拿到了 Object
```

⭐ **注意最后一行**：`constructor` 丢了之后，`u1.constructor` **没有报错**，而是**顺着链接继续往上找**，一直找到 `Object.prototype.constructor`，于是拿到了 `Object`。

**这就是原型链查找的实感** —— 它是"找不到就继续往上"，**不是"找不到就报错"**。

**正确写法**（要么别整体赋值，要么补回来）：

```js
User.prototype = {
  constructor: User,                        // ⭐ 补回来
  eat: function () { console.log(this.uname + ' 在吃饭'); }
};
console.log(User.prototype.constructor === User);   // true
```

## 3. 179 的数组扩展（看一眼就好，别学）

```js
// ⚠️ 教学示例：往内置原型上加方法
Array.prototype.sum = function () {
  return this.reduce(function (acc, n) { return acc + n; }, 0);
};

console.log([1, 2, 3].sum());     // 6

// ✅ 工程上的正确做法：写成普通函数
function sum(arr) {
  return arr.reduce(function (acc, n) { return acc + n; }, 0);
}
console.log(sum([1, 2, 3]));      // 6
```

**同一个功能，后者不碰任何全局的东西。** 记住这个选择。

## 动手小练习（不留超纲作业）

写一个构造函数 `Book(title, price)`，要求：

1. `title` / `price` 作为数据存在实例上
2. 一个方法 `info()` 挂在 `Book.prototype` 上，打印 `书名 + 价格`
3. 然后打印这三个式子，**确认全是 `true`**：

```js
b1.info === b2.info                        // true  方法共享
b1.__proto__ === Book.prototype            // true  实例指向仓库
Book.prototype.constructor === Book        // true  仓库认领主人
```

**三个 `true` 同时拿到，说明你把这一轮和上一轮的东西连起来了。**
（如果打印出 `false`，多半是你把某个方法挂到 `this` 上了，或者整体赋值过 `Book.prototype`。）

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 179 | 用 `prototype` 能扩展数组，**但别碰内置原型**（C# 的扩展方法是外挂、JS 是改类型） |
| 180 | `prototype` 天生带 `constructor` 指回构造函数；**整体赋值会丢它**，**而且它可被改、不能当类型检查** |
| 181 | 实例身上的 `__proto__` 指向构造函数的 `prototype` —— **178 留的问题在这里答上了** |

## 2. ⭐⭐ 本轮的核心：`prototype` 和 `__proto__` 是"同一个东西的两端"

```
   函数 User ──── .prototype ────►  User.prototype（仓库）
                                          ▲
                                          │  .__proto__
                                          │
   实例 u1   ──────────────────────────────┘
```

- **`User.prototype`** = 从**函数**出发说"我的仓库在这儿"
- **`u1.__proto__`** = 从**实例**出发说"我的仓库在那儿"

**它们是同一个对象的两种指法。** `User.prototype === u1.__proto__` 是 `true` —— **这句话是整座原型山的地基。**

## 3. ⭐ 收敛时刻：上一轮欠的那半个问题，还了

| 上一轮（178）说了什么 | 这一轮（181）补上了什么 |
|---|---|
| `new` 的第 ② 步"把新对象的链接指向 `prototype`" | **那个链接就叫 `__proto__`** |
| 实例"顺着链接找到"共享方法 | **查找顺序：先自己 → 再 `__proto__` → 再往上** |
| `prototype` 是"函数身上的属性" | **`__proto__` 是"对象身上的属性"** —— 一端在函数，一端在对象 |

**178 讲的是"仓库里有什么"，181 讲的是"怎么走到仓库"。两条腿，到这一集合上了。**

顺带把 165 的"第 ② 步"也兑现了 —— **那一步不再是"只告知存在"了，它有了名字。**

## 4. 静默失败清单（本轮 5 条，4 条不报错）

| 你写的 | 实际发生 |
|---|---|
| `Array.prototype.sum = ...` | 全站所有数组被改，**无报错**（可能和将来的标准撞名） |
| `User.prototype = {...}` 整体赋值 | `constructor` 丢了，`u.constructor` 变成 `Object`，**无报错** |
| 用 `u.constructor === User` 做类型判断 | `constructor` 可被改，判断可能失效，**无报错** |
| `reduce` 求最大值给了初始值 `0` | 全负数时结果错成 `0`，**无报错** |
| `Object.setPrototypeOf(u, obj)` 乱改原型 | 能跑，但**性能优化失效**，无报错 |

**会报错的一条**：`Object.getPrototypeOf(null)` → `TypeError`。

## 5. C# 类比可用度（本轮新增）

| JS 的做法 | C# 对应 | 档 |
|---|---|---|
| `Array.prototype.sum = ...` | 扩展方法 `static int Sum(this List<int> l)` | ⚠️ **目的相同，安全性完全相反**（C# 是外挂、有命名空间隔离；JS 是改类型、全局生效） |
| `u.constructor` | `obj.GetType()` | ❌ **C# 的 `GetType()` 不可伪造；JS 的 `constructor` 是个可写属性** |
| `u.__proto__` | （无对应） | ❌ **C# 里实例和类型的关系由运行时掌管，你看不见也改不了** |
| `Object.getPrototypeOf(u)` | （无对应） | ❌ 同上 |
| 属性查找"顺链往上" | 继承链的方法解析 | ⚠️ **概念像，但 C# 是编译期绑定（虚方法用 vtable），JS 是运行期顺链找** |

⭐ **本轮最重要的一句**：**C# 帮你把"实例属于哪个类型"这件事藏得严严实实、且不可篡改；JS 把它摊在明面上，用一个可以随便改的属性来实现。** 这是"灵活"的直接代价 —— 也是为什么 **183 的 `instanceof` 才是可靠答案**。

## 6. 解锁边界（本轮变更）

**新解锁**
- ✅ **`constructor` 属性**
- ✅ **`__proto__`（对象原型）** 与 **`Object.getPrototypeOf` / `Object.setPrototypeOf`**
- ⚠️ **一个刻意的例外**：181 里那句"`__proto__` 不是普通属性"，**只做到"知道有这回事"为止** —— 它背后的机制（属性除了存值还能"触发函数"）课程里没有专门讲，**本学期不展开，也不要求会用**。看到别人代码里有这种属性，认得出来即可。

**仍然锁着**
- ❌ **原型继承（182）· 原型链 / `instanceof`（183）** —— 下一轮
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` ← **课程内永不解锁**

## 7. 下一轮预告

第 **182 / 183 / 184** 集：

| 集 | 内容 |
|---|---|
| 182 | **原型继承** — 🔥 ⚠️ 与 C# 继承机制**完全不同** |
| 183 | **原型链以及 `instanceof` 运算符** — 🔥 变量"顺着链往上找"的全过程 |
| 184 | 综合案例 · 模态框构造函数写法 — 🧪 |

⚠️ **182 是本段最容易把 C# 直觉误迁移的一集。** C# 的继承是"**类**继承**类**、编译期就定死"；JS 的原型继承是"**对象**链接**对象**、运行期还能改"。**同一句"子类继承父类"，在两个语言里说的根本不是一回事。**

⚠️ **183 会了结本轮留下的两个悬念**：① "怎么往上找"的全过程；② `constructor` 不可靠，**`instanceof` 为什么可靠**。
