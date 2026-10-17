# JS--进阶篇 06 · 基本包装类型 · `Object` 静态方法 · `reduce`

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **167 / 168 / 169** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。

---

==一：概念==

## 1. 基本包装类型：字符串字面量为什么能调方法（167）

**先问一个你从来没问过的问题**：`'abc'` 是**基本类型**（值类型），它身上不该有属性、也不该有方法。可下面这两行你从第一天写到现在：

```js
'abc'.length           // 3
'abc'.toUpperCase()    // 'ABC'
```

**它在哪？**

**JS 的答案**：在你**调用方法的那一瞬间**，引擎悄悄做三件事：

| 瞬间 | 发生什么 |
|---|---|
| ① **包装** | 把 `'abc'` 临时包成一个 `String` 对象 |
| ② **调用** | 在这个临时对象上执行 `toUpperCase()` |
| ③ **丢弃** | 调用完，这个临时对象**立刻被扔掉**（没人引用它） |

**这就是 C# 的装箱 / 拆箱** ⭐ —— 你学过，所以这一集基本是白送：

```csharp
int i = 1;
object o = i;          // 装箱：值类型 → 引用类型
int j = (int)o;        // 拆箱：引用类型 → 值类型
```

JS 做的是**同一件事**，但有两个关键差异：

| | C# | JS |
|---|---|---|
| 什么时候发生 | **你必须显式写**（赋给 `object`） | **隐式自动**，你写不出来，也看不见 |
| 装箱对象活多久 | 你持有引用，**想留多久留多久** | **一瞬间**，用完立刻丢弃 |
| 有没有专门的类型 | 有 `Nullable<T>` | ❌ 没有 |
| 能不能拿装箱对象比 | `1.Equals(o)` 有讲究 | `new String('abc') === 'abc'` → **false**（对象 ≠ 基本值） |

**JS 的三种包装类型**：`String` / `Number` / `Boolean` —— 对应的就是三种基本值。

⚠️ **本集最大的坑：绝对不要用 `new String()` / `new Number()` / `new Boolean()`**

```js
const flag = new Boolean(false);
if (flag) {
  console.log('进来了');     // ← 会进来！因为 flag 是一个"对象"
}
```

**对象永远是真值**（哪怕它包着 `false`）。这是静默失败的教科书案例：**读代码完全看不出问题，跑起来行为是反的**。

⚠️ 第二个坑：**因为是"临时"的，所以给它加属性没用**

```js
'abc'.customProp = 1;
console.log('abc'.customProp);   // undefined  ← 写到了一个马上被扔掉的对象上
```

**工程上怎么防**：**永远只用字面量** —— `'abc'` / `1` / `true`。`new Boolean(...)` 这种写法在任何正经代码里都不该出现。

## 2. `Object` 的三个静态方法（168）

```js
const user = { name: '张三', age: 18, city: '北京' };

Object.keys(user);     // ['name', 'age', 'city']      ← 属性名的数组
Object.values(user);   // ['张三', 18, '北京']          ← 属性值的数组

Object.assign(目标, 源1, 源2);   // 把后面几个的属性「倒进」第一个，并返回第一个
```

⭐ **`assign` 的记忆锚：它 = "把后面的倒进第一个"。目标永远在第一个位置。**

三个最常见的用法：

```js
Object.assign({}, user);            // 拷一份（浅拷贝）
Object.assign(user, { age: 20 });   // ⚠️ 改了 user 本身！
Object.assign({}, user, { city: '上海' });   // 拷一份并覆盖 city
```

⭐ **顺带把上一轮的展开运算符接上**：`Object.assign({}, obj)` 和 `{ ...obj }` **是同一件事** —— 都是浅拷贝一层。

**C# 对照**：

| JS | C# | 档 |
|---|---|---|
| `Object.keys(obj)` | 反射 `GetProperties()` 取名字 / `Dictionary.Keys` | ✅ 概念通 |
| `Object.values(obj)` | `Dictionary.Values` | ✅ 概念通 |
| `Object.assign(...)` | 无直接对应（最像 AutoMapper 的扁平映射） | ⚠️ 差异 |

⭐ **一条值得记下的思路差异**：C# 的反射是**去读类型的元数据**（类型是编译期就定好的）；JS 的 `Object.keys` **只是去读这个对象自己的属性表** —— 因为在 JS 里，**对象本来就是一张属性表**（还记得第 2 集那句"JS 对象更像可动态增删的字典"吗）。所以 JS 这里根本不需要"反射"这个重武器。

⚠️ **三个坑**：
1. **`assign` 会改第一个参数** —— 想不改就传 `{}`
2. **浅拷贝** —— 嵌套对象还是共享的
3. `Object.keys(null)` → **`TypeError`**（这里会报错，少见的好脾气）

## 3. `reduce`：把一堆值合成一个（169）

**先看没有 `reduce` 的世界长什么样**：

```js
let total = 0;
for (let i = 0; i < arr.length; i++) {
  total = total + arr[i];
}
```

这段代码每一行你都懂，但它把"**要做的事**（加起来）"和"**怎么走数组**（`i`、`length`、`arr[i]`）"混在了一起。**`reduce` 把后一半收走。**

```js
const total = arr.reduce(function (acc, item) {
  return acc + item;
}, 0);
```

**↔ LINQ 的 `Aggregate`** ✅ —— 而且连"不传初始值"这个特性都一模一样：

```csharp
nums.Aggregate(0, (acc, n) => acc + n);   // 给了初始值
nums.Aggregate((acc, n) => acc + n);      // 没给，用第一个元素当起点
```

**回调四个参数**：`(累加器, 当前值, 当前下标, 原数组)` —— **前两个是重点**。

⭐ **初始值是本集唯一需要动脑的地方**：

| | 给了初始值 | 没给初始值 |
|---|---|---|
| `acc` 一开始是什么 | 你给的初始值 | **数组的第一个元素** |
| 从第几个开始遍历 | 第 0 个 | **第 1 个** |
| 空数组的结果 | 返回初始值 | ⚠️ **抛 `TypeError`** |

**四个实用场景**：

```js
// ① 求和
[1, 2, 3, 4].reduce((acc, n) => acc + n, 0);              // 10

// ② 求最大值（不给初始值，用第一个元素当起点）
[10, 5, 28, 3].reduce((max, n) => (n > max ? n : max));    // 28

// ③ 数组 → 对象（按 id 建索引）
const arr = [{ id: 1, name: '小米' }, { id: 2, name: '华为' }];
arr.reduce((acc, item) => { acc[item.id] = item; return acc; }, {});

// ④ 统计出现次数
['a', 'b', 'a'].reduce((acc, c) => {
  acc[c] = (acc[c] || 0) + 1;
  return acc;
}, {});                                                    // { a: 2, b: 1 }
```

⚠️ **`reduce` 的三个坑**：

1. ⭐ **回调忘了写 `return`** → 下一次 `acc` 变成 `undefined` → 最后结果就是 `undefined`，**而且不报错**
2. **空数组 + 没给初始值** → `TypeError: Reduce of empty array with no initial value` —— 这是本课程里**少见的"会出声"**的地方
3. **初始值类型不对**：`reduce((a, n) => a + n, '')` 会在 `'' + 1` 那一刻变成字符串拼接，于是得到 `'1234'` 而不是 `10`

---

==二：格式==

## 1. 基本包装类型速查

```js
'abc'.length          // 3        ← 引擎临时包装后取的
(255).toString(16)    // 'ff'     ← 数字字面量调方法要加括号
true.toString()       // 'true'

typeof 'abc'              // 'string'  ← 基本类型
typeof new String('abc')  // 'object'  ← 包装对象（别用！）

new String('abc') === 'abc'   // false  ← 对象不等于基本值
```

**三条纪律**
- 永远只用字面量：`'abc'` / `1` / `true`
- 看到 `new String` / `new Number` / `new Boolean` 一律删掉
- 数字字面量调方法要加括号：`(255).toString(16)`

## 2. `Object` 方法速查

```js
Object.keys(obj)        // 属性名数组
Object.values(obj)      // 属性值数组

Object.assign(目标, 源...)           // ⚠️ 改「目标」，并返回它
Object.assign({}, obj)               // 浅拷贝（等价于 { ...obj }）
Object.assign({}, a, b)              // 合并，同名后者覆盖前者
```

## 3. `reduce` 速查

```js
arr.reduce(function (acc, item, index, array) {
  return 下一次的 acc;          // ⚠️ 必须 return
}, 初始值);                     // 初始值可选，但强烈建议给
```

**给不给初始值的判断**：
- 累加、计数、建索引 → **给**（通常是 `0` 或 `{}`）
- 求最值（用第一个元素当起点更自然）→ **可以不**（但要保证数组非空）

---

==三：代码==

## 1. 包装对象的三个实验（167）

```js
// 实验 ① 基本类型居然有方法
console.log('abc'.length);          // 3
console.log('abc'.toUpperCase());   // 'ABC'
console.log(typeof 'abc');          // 'string'    ← 它确实是基本类型

// 实验 ② 包装对象是「另一个东西」，不是基本值
console.log(typeof new String('abc'));      // 'object'
console.log(new String('abc') === 'abc');   // false

// 实验 ③ ⚠️ 最危险的一个：包装对象永远是真值
const flag = new Boolean(false);
console.log(typeof flag);            // 'object'
console.log(flag ? '我进来了' : '没进来');   // '我进来了'  ← 包着 false 也是真！

// 实验 ④ 临时对象留不住属性
'abc'.customProp = 1;
console.log('abc'.customProp);       // undefined
```

**自证实验**：把实验 ③ 的 `new Boolean(false)` 换成字面量 `false`，结果立刻反过来了。**这就是"对象永远真值"的实感。**

## 2. `Object` 方法

```js
const user = { name: '张三', age: 18, city: '北京' };

console.log(Object.keys(user));      // ['name', 'age', 'city']
console.log(Object.values(user));    // ['张三', 18, '北京']

// keys 是「真数组」→ 数组方法全都能用（这是它比 for...in 强的地方）
Object.keys(user).forEach(function (key) {
  console.log(key + ' = ' + user[key]);
});

// assign：目标在前
const copy = Object.assign({}, user);          // 浅拷贝
const merged = Object.assign({}, user, { age: 20, job: '工程师' });
console.log(merged.age);             // 20
console.log(user.age);               // 18  ← 原对象没被动

// ⚠️ 忘了传 {} 的话，原对象会被改
const bad = Object.assign(user, { age: 99 });
console.log(user.age);               // 99  ← user 被改了！而且不报错
console.log(bad === user);           // true  ← assign 返回的是第一个参数

// ⚠️ 浅拷贝的证据
const src = { info: { score: 1 } };
const shallow = Object.assign({}, src);
shallow.info.score = 99;
console.log(src.info.score);         // 99  ← 原对象被改了
```

## 3. `reduce` 的四种用法

```js
// ① 求和：给初始值 0
console.log([1, 2, 3, 4].reduce(function (acc, n) {
  return acc + n;
}, 0));                              // 10

// ② 求最大值：不给初始值，用第一个元素起步
console.log([10, 5, 28, 3].reduce(function (max, n) {
  return n > max ? n : max;
}));                                 // 28

// ③ 数组 → 对象：按 id 建索引
const goods = [
  { id: 1, name: '小米' },
  { id: 2, name: '华为' }
];
const byId = goods.reduce(function (acc, item) {
  acc[item.id] = item.name;
  return acc;                        // ⚠️ 每一轮都要 return acc
}, {});
console.log(byId);                   // { 1: '小米', 2: '华为' }

// ④ 统计出现次数
const words = ['a', 'b', 'a', 'c', 'a'];
const count = words.reduce(function (acc, w) {
  acc[w] = (acc[w] || 0) + 1;
  return acc;
}, {});
console.log(count);                  // { a: 3, b: 1, c: 1 }

// ⚠️ 坑：忘了 return
console.log([1, 2, 3].reduce(function (acc, n) {
  acc + n;                           // 少写了 return
}, 0));                              // undefined  ← 不报错！
```

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 167 | **字符串/数字/布尔都能调方法，是因为引擎在你调用的那一瞬间临时"装箱"了一下，用完就扔** |
| 168 | `Object.keys` / `values` 用来"读属性表"，`Object.assign` **把后面的倒进第一个**（并改掉第一个） |
| 169 | `reduce` **把一堆值合成一个**；**回调必须 `return`**，**初始值给不给要清楚** |

## 2. ⭐ 收敛时刻一：167 把你用了几十集的写法解释掉了

从第 1 集开始你就在写 `'abc'.length`、`arr.length`、`str.indexOf(...)`，一直没问过"基本类型哪来的方法"。**167 给了答案，而且这个答案你早就学过 —— 就是 C# 的装箱。**

顺带它还解释了一件小事：**`'abc'.customProp = 1` 为什么无效** —— 因为你写到了一个"马上就被丢掉的对象"上。JS 里的包装对象**没有"长期持有"这一说**，这一点和 C# 的装箱完全不同。

## 3. ⭐ 收敛时刻二：数组方法的家族，到这一集齐了

| 你的意图 | JS | LINQ 对应 |
|---|---|---|
| 每个都做一遍，**不要结果** | `forEach` | `List.ForEach` |
| 每个**变成**另一个 | `map` | `Select` |
| **留下**一部分 | `filter` | `Where` |
| **合成一个值** | `reduce` | `Aggregate` |

**四种意图、四个方法、四个 LINQ 对应物，整整齐齐。** 这张表是"数组方法"这一段的收口 —— 从现在起，你看到"遍历数组"的需求，先问自己是上面哪一种，方法就自动定了。

**一条附带的规律**：`map` / `filter` / `reduce` 都**返回新东西、不改原数组**（"纯"的那一派）；只有 `forEach` 是"做副作用"的。所以"想收集结果"永远不该用 `forEach` + 外部数组。

## 4. 静默失败清单（本轮 6 条，5 条不报错）

| 你写的 | 实际发生 |
|---|---|
| `new Boolean(false)` 当 `if` 条件 | 判为 **true**，**无报错** |
| `'abc'.customProp = 1` | 无效，**无报错** |
| `Object.assign(user, x)` | 改掉了 `user`，**无报错** |
| `Object.assign({}, obj)` 以为是深拷贝 | 嵌套对象仍共享，**无报错** |
| `reduce` 回调忘了 `return` | 结果是 `undefined`，**无报错** |
| `reduce` 初始值类型不对 | 求和变字符串拼接，**无报错** |

**会报错的两条（少见的好脾气）**：`Object.keys(null)` → `TypeError`；空数组 + 无初始值的 `reduce` → `TypeError`。

**工程上怎么防**：
- `new String` / `new Number` / `new Boolean` —— 见到就删
- `Object.assign` 第一个参数**永远传 `{}`**（除非你真想改那个对象）
- `reduce` 的回调**从 `return` 开始写**

## 5. C# 类比可用度（本轮新增）

| JS | C# | 档 |
|---|---|---|
| 基本包装类型（隐式装箱） | 装箱 / 拆箱 | ✅ 概念同源 |
| 包装对象是临时的 | 装箱对象可以长期持有 | ❌ **差异** |
| `Object.keys` / `values` | 反射 / `Dictionary.Keys` / `.Values` | ✅ 概念通 |
| `Object.assign` | 无直接对应 | ⚠️ 差异 |
| `reduce` | LINQ `Aggregate` | ✅ **几乎完全对应**（含"不给初始值"） |

## 6. 解锁边界（本轮变更）

**新解锁**
- ✅ **`Object.keys` / `Object.values` / `Object.assign`**
- ✅ **`reduce`**

**仍然锁着**
- ❌ `find` / `every` / `some` / `Array.from`（170 集，**下一轮就解锁**）
- ❌ `Object.entries`（本课程未涉及，用到再查 MDN）
- ❌ `prototype` / `__proto__` / 原型链 / `instanceof`（176-183）
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` ← **课程内永不解锁**

## 7. 下一轮预告

第 **170 / 171 / 172** 集：**数组 `find`、`every` 与转真数组** → **字符串常见方法** → **渲染赠品案例**。

⚠️ 下一轮是 **Day 2 的收尾**：
- **170 一次解锁三个**：`find` ↔ LINQ `FirstOrDefault`、`every` ↔ `All`、`some` ↔ `Any`，外加 `Array.from` 把伪数组转成真数组
- **171 字符串方法** ↔ C# `string` 的方法群，但要注意 **JS 没有 `StringComparison`、没有文化敏感比较** —— 这是全栈里会真出问题的地方
- **170 一过，数组方法这一段就彻底走完了**
