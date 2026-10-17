# JS--进阶篇 04 · 列表渲染 · `filter` 筛选 · 创建对象的多种方式

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **161 / 162 / 163** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **说明**：161 / 162 是实操课（🧪），161 **没有新语法** → 按老规矩讲**架构铁律**，不逐行讲代码；162 解锁 **`filter`**。

---

==一：概念==

## 1. 列表渲染：数据驱动走第二遍（161）

上一阶段（第 133 集）你已经学过"数据驱动的四条铁律"，当时渲染的是一张学生信息表。**161 集就是把同一套流程用到"列表"上**。

**先把渲染函数的骨架画出来**：

```
① 拿到数据（一个数组）
② 用 map 把「每条数据」翻译成「一段 HTML 字符串」
③ 用 join('') 把这一堆字符串缝成一整块
④ 一次性覆盖到容器的 innerHTML 上
```

**四条铁律（必须背下来，写错一条页面就出怪）**：

| 铁律 | 不遵守会怎样 |
|---|---|
| **① 数据是唯一真相，DOM 只是它的投影** | 去改 DOM 而不改数据 → 数据和界面对不上 |
| **② 渲染函数是"覆盖"，不是"追加"** | 用 `innerHTML +=` → 渲染两次页面上就出现两份 |
| **③ 字符串先拼完，最后一次性写入** | 在循环里 `+= innerHTML` → 每轮都触发一次页面重排（"高频操作别做重活"的又一面） |
| **④ 渲染函数只负责渲染** | 算数据、筛数据在外面做完，**当参数传进来** |

⭐ **第 ④ 条是本集最关键的设计**：把渲染函数写成 `render(list)` —— **接收一个数组参数**，而不是让它自己去读外面的全局变量。

```js
function render(list) { ... }     // ✅ 谁进来就画谁
function render()    { ... }      // ✗ 只能画那一份写死的数据
```

**为什么非要这样写**：因为下一集的"筛选"，结果就靠这个参数喂进来。**161 和 162 是靠这个接口缝在一起的。**

## 2. `filter`：本轮唯一的新 API（162）

**先看没有 `filter` 的世界长什么样**：

```js
const result = [];
for (let i = 0; i < goods.length; i++) {
  if (goods[i].price >= 2000) {
    result.push(goods[i]);
  }
}
```

三行代码，只做一件事：**按条件筛**。而且这段"套路"你每筛一次就要抄一遍。

```js
const result = goods.filter(function (item) {
  return item.price >= 2000;
});
```

**↔ LINQ 的 `Where`** ✅ —— 你已经写过 `.Where(x => x.Price >= 2000)`，这就是同一件事换了个名字。

三条要点：

1. 回调返回 `true` → **留下**；返回 `false` → **丢掉**
2. 回调参数顺序和 `forEach` 一样：`(元素, 下标, 原数组)` —— **元素在前**
3. ⭐ **返回一个全新的数组，原数组一个元素都不动**

第 3 条是它和"`for` + `push`"最大的区别 —— 也是它比手写循环更值钱的地方：**你可以拿着 `goods` 反复筛，`goods` 始终是完整的那一份。**

## 3. 筛选 + 渲染：一个最小闭环（162）

162 集做的事，一句话就能概括：

> **用户点一下按钮 → 按条件筛出数据 → 交给渲染函数重画。**

```js
btn.addEventListener('click', function () {
  const chosen = goods.filter(function (item) {
    return item.price >= 2000;
  });
  render(chosen);            // ← 把筛完的结果直接喂进去
});
```

⭐ **这里是本轮的收敛点**：上一阶段学的"数据驱动四条铁律"，到这一集第一次有了**真实用途** —— 不是"把同一份数据重画一遍"，而是"**换一份数据再画一遍**"。这两件事难度差得很远。

> **这就是 Vue / React 替你干的事** —— 数据一变，自动重画。
> 你手写这一遍，是为了理解框架在替你做什么。

## 4. 创建对象的多种方式（163）

**先看没有"多种方式"的世界长什么样**：前面你一直只有字面量一种。要造 100 个同结构的用户，就得把

```js
{ name: '张三', age: 18 }
```

这段结构抄 100 遍 —— 哪天要把 `age` 改叫 `userAge`，你得改 100 处。**"批量造同结构的对象"这个需求，逼出了后三种写法。**

**四种方式，按出现顺序**：

| 方式 | 写法 | 什么时候用 |
|---|---|---|
| **① 字面量** | `const u = { name: '张三', age: 18 };` | **绝大多数情况，默认就用它** |
| **② `new Object()`** | `const u = new Object(); u.name = '张三';` | 等价于 `{}`。历史写法，**别用** |
| **③ 工厂函数** | `function createUser(n, a) { return { name: n, age: a }; }` | 需要批量造同结构对象时 |
| **④ 构造函数** | `function User(n, a) { this.name = n; this.age = a; }` + `new User(...)` | **下一集（164/165）的主角** |

**③ 和 ④ 的区别，是本集的全部重点**：

| | ③ 工厂函数 | ④ 构造函数 |
|---|---|---|
| 怎么造对象 | `return` 一个**对象字面量** | 把属性挂到 **`this`** 上 |
| 怎么调用 | **直接调用** `createUser('张三', 18)` | **必须加 `new`** `new User('张三', 18)` |
| 命名约定 | 小驼峰 `createUser` | ⭐ **首字母大写** `User` |
| 要不要写 `return` | 必须写 | **不写**（写了反而会顶掉 `new` 造出来的对象） |

⚠️ **构造函数最大的坑：忘了 `new`，它就变成了一个普通的函数调用。**

`this` 不再指向新对象，而是指向 `window`（非严格模式）。于是你写的属性**凭空挂到了全局对象上**，而且**一声不响**：

```js
function User(uname, age) {
  this.uname = uname;     // 有 new：this = 那个新对象
  this.age = age;         // 没 new：this = window ← 属性全泄漏成全局变量
}
User('张三', 18);         // 忘了 new
console.log(window.uname);   // '张三'   ← 没有任何报错
```

⚠️ 有趣的是：**严格模式下这一行反而会报错**（`this` 是 `undefined`，给 `undefined` 加属性直接 `TypeError`）。所以"早点报错"这件事，JS 又是靠严格模式才补上的。

**C# 对照**：

| JS | C# | 档 |
|---|---|---|
| 对象字面量 | 匿名类型 `new { }` / 对象初始化器 | ✅ 概念通 |
| 工厂函数 | 静态工厂方法 `User.Create(...)` | ✅ 思路一致 |
| 构造函数 + `new` | 构造函数 + `new` | ⚠️ **名字撞车** |

⚠️ **名字撞车的警告**：**JS 的"构造函数"不是 C# 的构造函数。** 它就是一个**普通函数** —— 没有类、没有类型声明、没有编译器为你生成任何东西。它只是在被 `new` 调用时，**临时扮演**"造对象"的角色。**这个撞车是 164 / 165 两集的主题，下一轮专门拆。**

---

==二：格式==

## 1. 列表渲染的固定骨架

```js
// 数据
const goods = [
  { id: 1, name: '小米', price: 1999 },
  { id: 2, name: '华为', price: 3999 }
];

// 渲染函数：接收数组，覆盖式写入
function render(list) {
  const html = list
    .map(function (item) {
      return '<div class="item">' +
               '<h3>' + item.name + '</h3>' +
               '<p>￥' + item.price + '</p>' +
             '</div>';
    })
    .join('');
  document.querySelector('.list').innerHTML = html;
}

render(goods);        // 第一次渲染
```

四条纪律，对着代码看：
- `render(list)` —— **要参数**（不是读全局）
- `.map(...)` —— 把数据翻译成字符串
- `.join('')` —— ⚠️ **必须传空字符串**，不传会默认用逗号连起来
- `innerHTML = html` —— **是 `=`，不是 `+=`**

## 2. `filter` 速查

```js
arr.filter(function (item, index, array) { return 布尔; });
arr.filter((item) => item.price >= 2000);        // 箭头函数（已解锁）

// 组合用法
goods.filter((item) => item.price >= 2000).length;               // 筛出来几个
goods.filter((item) => item.name.indexOf('小') > -1);             // 按名字筛
render(goods.filter((item) => item.price >= 2000));              // 筛 + 画
```

**和已学方法的横向对照**：

| 你想干什么 | 方法 | LINQ 对应 |
|---|---|---|
| 每个都处理一遍 | `forEach` | `List<T>.ForEach` |
| 把每个**变成**另一个 | `map` | `Select` |
| 把一部分**留下** | **`filter`** | **`Where`** |
| 把一堆**合成一个值** | `reduce`（169） | `Aggregate` |

## 3. 四种创建对象的写法

```js
// ① 字面量（默认就用它）
const u1 = { name: '张三', age: 18 };

// ② new Object()（等价于 {}，别用）
const u2 = new Object();
u2.name = '张三';

// ③ 工厂函数（直接调用）
function createUser(name, age) {
  return { name: name, age: age };
}
const u3 = createUser('张三', 18);

// ④ 构造函数（首字母大写 + 必须 new）
function User(name, age) {
  this.name = name;
  this.age = age;
}
const u4 = new User('张三', 18);
```

---

==三：代码==

## 1. 列表渲染 + 渲染两次的教训（161）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>列表渲染</title></head>
<body>
  <button id="renderOnce">渲染一次</button>
  <button id="renderTwice">错误的写法：用 += </button>
  <div class="list"></div>

  <script>
    const goods = [
      { id: 1, name: '小米', price: 1999 },
      { id: 2, name: '华为', price: 3999 },
      { id: 3, name: '苹果', price: 5999 },
      { id: 4, name: '红米', price: 999 }
    ];

    // ✅ 正确：覆盖式渲染
    function render(list) {
      const html = list.map(function (item) {
        return '<div class="item">'
             +   '<h3>' + item.name + '</h3>'
             +   '<p>￥' + item.price + '</p>'
             + '</div>';
      }).join('');
      document.querySelector('.list').innerHTML = html;
    }

    // ✗ 错误示范：追加式渲染，点两次就出现两份
    function renderAppend(list) {
      let html = '';
      list.forEach(function (item) {
        html += '<div class="item"><h3>' + item.name + '</h3></div>';
      });
      document.querySelector('.list').innerHTML += html;
    }

    document.querySelector('#renderOnce').addEventListener('click', function () {
      render(goods);
    });
    document.querySelector('#renderTwice').addEventListener('click', function () {
      renderAppend(goods);
    });
  </script>
</body>
</html>
```

**自证实验**：先点「正确的写法」两次 → 还是 4 条；再点「错误的写法」两次 → 变成 8 条。**这就是铁律 ②。**

## 2. 筛选 + 重画（162）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>筛选商品</title></head>
<body>
  <button data-max="all">全部</button>
  <button data-max="2000">2000 元以下</button>
  <button data-max="5000">5000 元以下</button>
  <div class="list"></div>

  <script>
    const goods = [
      { id: 1, name: '小米', price: 1999 },
      { id: 2, name: '华为', price: 3999 },
      { id: 3, name: '苹果', price: 5999 },
      { id: 4, name: '红米', price: 999 }
    ];

    const list = document.querySelector('.list');

    function render(arr) {
      list.innerHTML = arr.map(function (item) {
        return '<div class="item">' + item.name + ' ￥' + item.price + '</div>';
      }).join('');
    }

    // 事件委托：一套监听管所有按钮（上一阶段学过）
    document.body.addEventListener('click', function (e) {
      if (e.target.tagName !== 'BUTTON') return;

      const max = e.target.dataset.max;
      const chosen = (max === 'all')
        ? goods
        : goods.filter(function (item) { return item.price <= Number(max); });

      render(chosen);                 // ← 同一个渲染函数，换一份数据
    });

    render(goods);                    // 首次渲染
  </script>
</body>
</html>
```

**看点**：`render` 一个字没改，只是**喂进去的数组变了**。这就是"数据驱动"的全部威力。

## 3. 四种创建对象 + 忘加 `new` 的事故现场（163）

```js
// ① 字面量
const u1 = { name: '张三', age: 18 };
console.log('①', u1);

// ② new Object()（不推荐）
const u2 = new Object();
u2.name = '张三';
console.log('②', u2);

// ③ 工厂函数：直接调用
function createUser(name, age) {
  return { name: name, age: age };
}
const u3 = createUser('张三', 18);
console.log('③', u3);

// ④ 构造函数：必须加 new
function User(uname, age) {
  this.uname = uname;
  this.age = age;
}
const u4 = new User('李四', 20);
console.log('④', u4);              // User { uname: '李四', age: 20 }

// ⚠️ 事故现场：忘了 new
User('王五', 30);                  // 忘了 new —— 没有任何报错
console.log('window.uname =', window.uname);   // '王五' ← 泄漏到全局了！
console.log('window.age =', window.age);       // 30

// ⚠️ 严格模式下同一行会报错（好事）
function StrictUser(uname) {
  'use strict';
  this.uname = uname;
}
try {
  StrictUser('赵六');              // TypeError: Cannot set properties of undefined
} catch (e) {
  console.log('严格模式：', e.name);
}
```

**看点**：普通模式下是**静默泄漏**，严格模式下是**当场报错** —— 同一个错误，两种命运。

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 161 | 渲染函数要写成 **`render(list)`**，**覆盖式写入**（`=` 不是 `+=`）；**数据是唯一真相** |
| 162 | **`filter` ↔ LINQ `Where`**：返回新数组、原数组不动；**筛完把结果喂给 render 就重画了** |
| 163 | 造对象四种方式；**构造函数必须加 `new`**，忘了就静默泄漏到 `window` |

## 2. ⭐ 收敛时刻：161 + 162 缝成了一个闭环

```
数据（数组）
   ↓  filter  ← 条件来自用户操作
筛选后的新数组
   ↓  render(list)
innerHTML  ← DOM 是数据的投影
```

**上一阶段学的"数据驱动四条铁律"，到这一集第一次有了真实用途**：不是把同一份数据重画一遍，而是**换一份数据再画一遍**。

## 3. 本轮的静默失败清单（暗线）

| 你写的 | 实际发生 |
|---|---|
| 循环里 `innerHTML +=` | 页面出现重复内容，**无报错** |
| `filter` 回调忘了写 `return` | 返回**空数组**（`undefined` 是 falsy），**无报错** |
| `arr.filter(...)` 没赋值给 `arr` | 显示的还是全部，**无报错** |
| `new User(...)` 忘了 `new` | 属性泄漏成全局变量，**无报错** |
| `.join()` 忘了传 `''` | 元素之间被逗号连起来，**无报错** |

**五个坑，四个是"不报错但结果不对"。** 这就是为什么这本笔记的每条铁律都值得单独记一行。

**工程上怎么防**：
- 渲染一律 `innerHTML =`（覆盖式），永不 `+=`
- `filter` 的回调**永远用 `return` 起头**
- 构造函数**首字母大写**（这是给你自己看的警报：看到大写开头就该想起 `new`）
- 写 `.join('')` 时先敲引号再敲括号

## 4. C# 类比可用度（本轮新增）

| JS | C# | 档 |
|---|---|---|
| `filter` | LINQ `Where` | ✅ 几乎完全对应 |
| `map` + `join` 拼 HTML | 无对应（C# 里是 Razor / StringBuilder） | ⚠️ 差异 |
| `innerHTML = html` 覆盖式渲染 | 无对应 | ⚠️ 前端特有 |
| 对象字面量 | 匿名类型 / 对象初始化器 | ✅ 概念通 |
| 工厂函数 | 静态工厂方法 `Create(...)` | ✅ 思路一致 |
| 构造函数 + `new` | 构造函数 + `new` | ⚠️ **名字撞车**（下一轮拆） |

## 5. 解锁边界（本轮变更）

**新解锁**
- ✅ **`filter`**

**仍然锁着**
- ❌ `reduce`（169）· `find` / `every`（170）· `some` · `Array.from`（170）
- ❌ 原型 / 构造函数深入 / `this` 完整模型（176-195，**下一轮从 164 的"构造函数"正式开始爬这座山**）
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` ← **课程内永不解锁**

## 6. 下一轮预告

第 **164 / 165 / 166** 集：**构造函数** → **`new` 实例化执行过程** → **实例成员与静态成员**。

⚠️ 下一轮是**Day 2 的核心**，也是 JS 最容易被 C# 直觉带偏的地方：
- **164 名字撞车**：JS 的"构造函数"就是普通函数，没有类、没有类型声明
- **165 四步必须背下来**：① 建空对象 → ② 让它的原型指向构造函数的 `prototype` → ③ 让函数里的 `this` 指向它 → ④ 执行函数体并返回它
- **166 是与 C# 最一致的一集**：实例成员 / 静态成员的概念完全对得上，只学写法

**165 那四步，是整座原型链大厦的地基** —— 后面 176-186 的 `prototype` / `__proto__` / 原型链，全靠它撑着。
