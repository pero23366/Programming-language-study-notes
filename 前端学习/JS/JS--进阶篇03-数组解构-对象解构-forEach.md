# JS--进阶篇 03 · 数组解构 · 对象解构 · `forEach`

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **158 / 159 / 160** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。

---

==一：概念==

## 1. 解构：一行把"拆开取值"写掉

**先看没有解构的世界长什么样**：

```js
const arr = [1, 2, 3];
const a = arr[0];
const b = arr[1];
const c = arr[2];

const user = { name: '张三', age: 18 };
const name = user.name;
const age = user.age;
```

六行代码，做的其实是同一件事：**把容器里的东西挨个搬到变量里**。而且这种写法有个隐蔽的毛病 —— **`arr[0]` 这种"按下标取"写在业务代码里，读的人根本不知道 0 代表什么**。

**解构就是把这件事压成一行，并且让"名字"出现在左边**：

```js
const [a, b, c] = [1, 2, 3];        // 数组解构
const { name, age } = user;          // 对象解构
```

## 2. 数组解构：按下标对应

```js
const [a, b, c] = [1, 2, 3];        // a=1  b=2  c=3
const [, , third] = [1, 2, 3];      // 用空位跳过：third=3
const [first, ...rest] = [1, 2, 3]; // first=1  rest=[2,3]
const [x = 10] = [];                // 默认值：x=10
let p = 1, q = 2;
[p, q] = [q, p];                    // 交换：不用临时变量
```

⭐ **`[first, ...rest]` 里的 `...` 就是上一轮学的剩余参数** —— 同一个符号、同一个"把剩下的都收起来"的含义，只是这次写在**解构的左边**。

⚠️ **两个坑**：

1. **右边必须是可迭代的**。`const [a] = null;` → `TypeError: null is not iterable`
2. ⭐ **数量对不上不报错**：`const [a, b, c] = [1, 2];` → `c` 是 `undefined`，**一声不响**。这是解构最危险的地方 —— **写错位置不会报错，只会悄悄给你一个 `undefined`**

**C# 对照**：C# 有**元组解构** `var (a, b) = (1, 2);`，也可以用 `Deconstruct` 扩展方法拆自己的类型 —— 概念完全通 ✅。

| | C# | JS |
|---|---|---|
| 靠什么对应 | 位置 ✅ | 位置 |
| 数量对不上 | **编译期报错** | ⚠️ 给 `undefined`，**不报错** |
| 类型 | 解构出来类型确定 | 无类型，随便 |

**这是本集最该记住的差异**：C# 的元组解构是**编译期检查**的，JS 是**运行期按下标取**。

## 3. 对象解构：按名字对应

```js
const user = { name: '张三', age: 18, city: '北京' };

const { name, age } = user;              // 按名字取
const { name: userName } = user;         // 改名：userName = '张三'
const { age = 20 } = user;               // 默认值（只在 undefined 时生效）
const { name, ...rest } = user;          // 剩余：rest = { age:18, city:'北京' }
const { info: { score } } = user;        // 嵌套
```

⭐ **`{ 源属性名: 目标变量名 }`** —— **冒号后面才是新变量名**。这个方向最容易记反，记忆锚：**左边是"从对象里找什么"，右边是"存到哪儿"**。

**对象解构和数组解构的根本区别**：

| | 数组解构 | 对象解构 |
|---|---|---|
| 靠什么对应 | **下标 / 位置** | **属性名** |
| 属性顺序有关吗 | 有关 | ❌ **完全无关** |
| 可以少取几个吗 | 可以，但只能从后面少 | ✅ 想取哪个取哪个 |

**对象解构最大的实战用途：解构函数参数**。

```js
function showUser({ name, age }) {
  console.log(name, age);
}
showUser({ name: '张三', age: 18, city: '北京' });   // 多传的 city 自动忽略
```

好处是**参数不靠位置靠名字**，调用时顺序随便，还自带"文档"作用。

⚠️ **三个坑**：

1. `const { name } = null;` → `TypeError: Cannot destructure property 'name' of null`（和数组解构一样，右边不能是 `null`/`undefined`）
2. ⭐ **不加 `let` / `const` 时，行首的 `{` 会被当成代码块**：
   ```js
   { name } = user;      // ✗ SyntaxError（被当成块语句）
   ({ name } = user);    // ✅ 包一层圆括号
   ```
3. ⭐ **解构出来的是"值拷贝"（浅的）**：
   ```js
   const { name } = user;
   name = '李四';                 // 不影响 user.name
   ```
   但如果属性本身是**对象**，复制的是**引用** —— 改里面还是会串（这里和第 187 浅拷贝接上）。

**C# 对照**：↔ C# 的 `Deconstruct` / `record` 的 `with` 表达式 ✅ 概念接近。差异是 C# 靠**方法 + 编译期**，JS 靠**属性名在运行期取**，取不到就给 `undefined`。

## 4. `forEach`：给每个元素都做一遍

**先看没有 `forEach` 的世界长什么样**：

```js
for (let i = 0; i < arr.length; i++) {
  console.log(arr[i], i);
}
```

你其实只关心"对每个元素做点什么"，却被迫管三个东西：下标 `i`、边界 `arr.length`、访问方式 `arr[i]`。

```js
arr.forEach(function (item, index) {
  console.log(item, index);
});
```

⭐ **回调参数顺序：`(元素, 下标, 原数组)`** —— **第一个是元素**，不要记反。

**↔ C# 的 `List<T>.ForEach`，概念几乎完全一致** ✅：

```csharp
list.ForEach(item => Console.WriteLine(item));   // C#
```
```js
arr.forEach(item => console.log(item));          // JS（箭头函数本轮已解锁）
```

⚠️ **⭐ 本集最大的坑：`forEach` 中途没法 `break` / `return` 跳出。**

```js
[1, 2, 3, 4, 5].forEach(function (item) {
  if (item === 3) return;      // 你以为"到 3 就停"？
  console.log(item);           // 实际输出 1 2 4 5
});
```

**`return` 在里面只等于 `continue`** —— 它结束的是"这一次回调"，不是整个循环。

**对比 C#**：语言级的 `foreach` 能 `break` / `continue` / `return`；但 `List<T>.ForEach` 传进去的那个 Action 里 **`return` 同样只等于 `continue`，也同样没法 `break`**（C# 想中断只能抛异常）。**所以这不是 JS 的锅，是"把回调交给别人循环"这种设计的固有代价。**

⚠️ 另外两条：

1. **`forEach` 的返回值永远是 `undefined`** —— 不能链式调用，也不能 `const r = arr.forEach(...)` 去接结果。想"边遍历边收集"要用 `map`
2. **`forEach` 遍历时新增的元素不会被访问**（遍历长度在开始时确定）

---

==二：格式==

## 1. 数组解构速查

```js
const [a, b] = [1, 2];                  // 基本
const [, , c] = [1, 2, 3];              // 跳位（空位占位）
const [x, ...rest] = [1, 2, 3];         // 剩余
const [x = 1, y = 2] = [10];            // 默认值 → x=10, y=2
const [m, [n, o]] = [1, [2, 3]];        // 嵌套
let p = 1, q = 2; [p, q] = [q, p];      // 交换
```

## 2. 对象解构速查

```js
const { a, b } = obj;                   // 基本（按名字）
const { a: newName } = obj;             // 改名：{ 源属性: 新变量名 }
const { a = 1 } = obj;                  // 默认值（只在 undefined 生效）
const { a: x = 1 } = obj;               // 改名 + 默认值
const { a, ...rest } = obj;             // 剩余（rest 是新对象）
const { a: { b } } = obj;               // 嵌套
function f({ a, b }) {}                 // 参数解构 ← 实战最常用
({ a } = obj);                          // 不加声明的赋值式，必须包圆括号
```

## 3. `forEach` 格式与三个替代方案

```js
arr.forEach(function (item, index, array) { /* ... */ });
arr.forEach((item, index) => { /* ... */ });      // 箭头函数已解锁，更常用
```

| 你想干的事 | 该用什么 |
|---|---|
| 每个元素都做一遍，不需要结果 | `forEach` ✅ |
| 需要**中途停下**（找到就不要了） | **普通 `for` 循环**（`for...of` / `some` / `find` 等 170 集后再用） |
| 需要**把结果收集成新数组** | `map`（已解锁） |
| 需要**筛出一部分** | `filter`（162 集解锁） |

---

==三：代码==

## 1. 数组解构：位置对位置

```js
// 基本 + 跳位 + 剩余
const nums = [10, 20, 30, 40, 50];
const [first, , third, ...others] = nums;
console.log(first, third, others);       // 10 30 [40, 50]

// 默认值：只有 undefined 才触发
const [x = 100, y = 200] = [1];
console.log(x, y);                       // 1 200

// ⚠️ 坑演示：数量对不上不报错
const [a, b, c] = [1, 2];
console.log(a, b, c);                    // 1 2 undefined  ← 一声不响

// 交换变量：不用临时变量
let p = 1, q = 2;
[p, q] = [q, p];
console.log(p, q);                       // 2 1
```

## 2. 对象解构：按名字取

```js
const user = { name: '张三', age: 18, city: '北京' };

const { name, city } = user;             // 顺序随便，只取要的
console.log(name, city);                 // 张三 北京

const { name: userName, age: userAge = 0 } = user;   // 改名 + 默认值
console.log(userName, userAge);          // 张三 18

const { name: n2, ...rest } = user;      // 剩余
console.log(n2, rest);                   // 张三 { age: 18, city: '北京' }

// ⭐ 实战最常用：解构函数参数
function renderCard({ title, price, tag = '无标签' }) {
  console.log(title, price, tag);
}
renderCard({ title: '手机', price: 2999, extra: '多余字段会被忽略' });

// ⚠️ 坑 1：右边不能是 null / undefined
try {
  const { a } = null;
} catch (e) {
  console.log(e.name, e.message);        // TypeError ...
}

// ⚠️ 坑 2：解构出来的是"值拷贝"（浅）
const { name: copyName } = user;
console.log(copyName);                   // 张三 —— 改它不影响 user.name

const u2 = { info: { score: 1 } };
const { info } = u2;
info.score = 99;
console.log(u2.info.score);              // 99 ← 对象属性复制的是引用
```

## 3. `forEach` 的两种意图，两种结果

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>forEach</title></head>
<body>
  <ul id="list"></ul>

  <script>
    const arr = [1, 2, 3, 4, 5];

    // ① 回调参数顺序：元素在前、下标在后
    arr.forEach((item, index) => {
      console.log('第 ' + index + ' 个是 ' + item);
    });

    // ② ⭐ return 只跳过这一次，不是跳出循环
    const printed = [];
    arr.forEach((item) => {
      if (item === 3) return;        // 以为"到 3 就停"？
      printed.push(item);            // 实际 1 2 4 5 全都进来了
    });
    console.log(printed);            // [1, 2, 4, 5]

    // ③ 真要在 3 就停 → 用普通 for
    const stopped = [];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === 3) break;       // ✅ 这个才真的停
      stopped.push(arr[i]);
    }
    console.log(stopped);            // [1, 2]

    // ④ forEach 没有返回值
    const r = arr.forEach((item) => item * 2);
    console.log(r);                  // undefined  ← 想收集得用 map

    // ⑤ 渲染场景（上一阶段学过的 DOM 操作 + 本轮的 forEach）
    const list = document.querySelector('#list');
    const fruits = ['苹果', '香蕉', '葡萄'];
    fruits.forEach((fruit) => {
      list.innerHTML += '<li>' + fruit + '</li>';
    });
  </script>
</body>
</html>
```

**看点**：② 和 ③ 的对比就是本集的全部重点 —— **想"每个都做" 用 `forEach`，想"中途停" 必须 `for`**。

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 158 | 数组解构**按下标**；数量对不上给 `undefined`，**不报错**（C# 会编译不过） |
| 159 | 对象解构**按名字**；`{ 源属性: 新变量名 }` 冒号后才是新名字；顺序无关 |
| 160 | `forEach` **没有 `break`，`return` 只等于 `continue`**；想要返回值得用 `map` |

## 2. ⭐ 收敛时刻一：`...` 现在有三个位置了

| 位置 | 名字 | 含义 |
|---|---|---|
| 函数**形参** | 剩余参数 | 多个实参 → 一个数组 |
| 函数调用 / 字面量**右边** | 展开运算符 | 一个数组 → 多个值 |
| **解构的左边** | 剩余元素 / 剩余属性 | 剩下的 → 一个新容器 |

**三个位置，其实是同一套"剩下的都归我"的逻辑。** 上一轮你只见到两个，这一轮补齐了第三个。

## 3. ⭐ 收敛时刻二：两张"静默失败"的脸

- 数组解构 `const [a, b, c] = [1, 2]` → `c` 是 `undefined`，**不报错**
- `forEach` 里 `return` → 只当 `continue`，**不报错**

两条都是本课程暗线（**静默失败**）的又一例。对比一下 C#：`var (a, b, c) = (1, 2);` 编译不过，`List.ForEach` 里 `return` 也确实是 `continue` —— **一半是 JS 的宽松，一半是"回调式循环"共同的代价**。

**工程上怎么防**：
- 解构时**只解构你确定存在的字段**；不确定就给默认值 `const [a, b, c = 0] = arr;`
- 需要"提前退出"就别用 `forEach`，直接写 `for` + `break`
- 需要"收集结果"就用 `map`，不要用 `forEach` + 外部数组（那是上一阶段的老习惯）

## 4. C# 类比可用度（本轮新增）

| JS | C# | 档 |
|---|---|---|
| 数组解构 | 元组解构 `var (a,b) = ...` | ✅ 概念同源 |
| 数组解构数量对不上 | 编译期报错 | ❌ **JS 不检查** |
| 对象解构 | `Deconstruct` 方法 / record | ✅ 概念接近 |
| 对象解构 `{...rest}` | 无直接对应 | ⚠️ 差异 |
| 参数解构 | C# 没有（只能靠可选参数 / 命名参数） | ⚠️ JS 更灵活 |
| `forEach` | `List<T>.ForEach` | ✅ 几乎完全一致 |
| `forEach` 不能 `break` | `List<T>.ForEach` 也不能 | ⚠️ **两边同病 → 不是 JS 的锅** |
| `forEach` 返回值 | `List<T>.ForEach` 也是 `void` | ✅ 一致 |

## 5. 解锁边界（本轮变更）

**新解锁**
- ✅ **数组解构** `const [a, b] = arr;`
- ✅ **对象解构** `const { a, b } = obj;`

**仍然锁着**
- ❌ `filter`（162 集）· `reduce`（169）· `find` / `every`（170）· `Array.from`（170）
- ❌ `for...of`（本课程未涉及）
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` ← **课程内永不解锁**

## 6. 下一轮预告

第 **161 / 162** 集：**渲染商品案例** · **综合案例 · 筛选商品**（🔁 第 163 集起进入 Day2「构造函数 · 数组方法」）。

⚠️ 这两集是**实操课**，会用到 `filter`（本课程第一次出现筛选）。按老规矩：**综合案例若没有新语法，就讲架构铁律而不逐行讲代码**。
