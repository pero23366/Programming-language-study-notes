# JS--进阶篇 07 · `find` / `every` / `some` 与 `Array.from` · 字符串常见方法 · 渲染赠品案例

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **170 / 171 / 172** 集
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。
> **说明**：172 是实操课（🧪），**没有新语法** → 按老规矩讲**架构套路**，不逐行讲代码。

---

==一：概念==

## 1. `find` / `some` / `every`：三个会"提前停"的方法（170）

**先看没有它们的世界长什么样**：

```js
// 找一个元素：手写循环 + break
let target = null;
for (let i = 0; i < arr.length; i++) {
  if (arr[i].id === 3) { target = arr[i]; break; }
}

// 判断"是不是全都满足"：手写循环 + 标志位
let allOk = true;
for (let i = 0; i < arr.length; i++) {
  if (arr[i].price <= 0) { allOk = false; break; }
}
```

两段都是"看着数组走，一旦确定就提前停"。**`find` / `some` / `every` 就是把这套套路收掉。**

| 方法 | 返回什么 | 什么时候停 | LINQ 对应 |
|---|---|---|---|
| **`find(回调)`** | **第一个**满足的元素；找不到 → **`undefined`** | 找到第一个就停 | `FirstOrDefault` |
| **`findIndex(回调)`** | **下标**；找不到 → **`-1`** | 同上 | `FindIndex` |
| **`some(回调)`** | 布尔 —— **有一个**满足就是 `true` | 找到第一个就停 | **`Any`** |
| **`every(回调)`** | 布尔 —— **全部**满足才是 `true` | 遇到第一个不满足就停 | **`All`** |

⭐ **本集最重要的规律：这四个都会"短路"（提前停）。**

> 上一轮说过 `forEach` **不能 `break`**。**`find` / `some` / `every` 就是用来补上这个能力的** —— 凡是"找到就不要再算了"的需求，答案都在这里，而不是 `forEach` + 标志位。

⚠️ **两条静默陷阱**：

1. **`findIndex` 找不到返回 `-1`，而 `-1` 是真值**：
   ```js
   if (arr.findIndex(function (x) { return x.id === 99; })) {
     console.log('找到了');     // ← 永远会进来！因为 -1 是真值
   }
   ```
   **正确写法**：`if (arr.findIndex(...) !== -1)`。

2. **空数组是"空真 / 空假"**：
   ```js
   [].every(function () { return false; });   // true   ← 全部满足？一个都没有，算真
   [].some(function () { return true; });     // false
   ```
   这是数学上的约定（**空集的全称命题为真**），C# 的 `All` / `Any` 也一样 —— **两边一致，不是 JS 的怪癖**。

⚠️ **另一个差异**：C# 的 `FirstOrDefault` 对**值类型**会返回 `default`（比如 `0`）；**JS 一律返回 `undefined`**。所以判断"找到没有"要用 `=== undefined`。

## 2. `Array.from`：把"伪数组"转成"真数组"（170）

**先说什么是伪数组**：它有 `length`、有数字下标，看起来像数组，**但没有数组的方法**（没有 `map` / `filter` / `forEach`）。

```js
document.querySelectorAll('div');   // NodeList —— 有 length、能下标访问，但（老浏览器）没有数组方法
arguments;                          // 函数里的实参集合 —— 典型伪数组
```

```js
const nodes = document.querySelectorAll('div');
Array.from(nodes).forEach(function (node) { ... });   // 转成真数组后就能用了
```

⚠️ **`Array.from` 和上一轮学的 `[...伪数组]` 是一回事** —— 都能转。两个区别：

1. **`Array.from` 还能带第二个参数**（映射函数），等价于"转完顺手 map 一下"：
   ```js
   Array.from([1, 2, 3], function (n) { return n * 2; });   // [2, 4, 6]
   ```
2. `[...x]` 要求 `x` **可迭代**（有 `Symbol.iterator`）；`Array.from` 的要求更宽，只要有 `length` 就行

**C# 对照**：**C# 里没有"伪数组"这个概念** —— 集合类型永远是明确的集合类型（数组 / `List<T>` / `IEnumerable<T>`），能用什么方法编译期就知道。**这是 JS 特有的一层麻烦**，本质上是因为 JS 的"数组"和"像数组的东西"界限模糊。

⭐ **一条能省很多事的实用结论**：`document.querySelectorAll` 返回的 NodeList 在**现代浏览器里已经有 `forEach`**了，所以简单的遍历不用转；但要用 `filter` / `map` / `reduce`，还是得先 `Array.from`。

## 3. 字符串常见方法（171）

分三类记比记 15 个方法名清楚：

**① 查找 / 判断**

```js
'abcdef'.includes('cd')       // true
'abcdef'.startsWith('ab')     // true
'abcdef'.endsWith('ef')       // true
'abcdef'.indexOf('cd')        // 2     找子串位置
'abcdef'.lastIndexOf('c')     // 2
```

**② 截取 / 变形**

```js
'abcdef'.slice(1, 4)          // 'bcd'   从 1 到 4（不含 4）
'abcdef'.slice(-3)            // 'def'   负数＝从末尾算
'abcdef'.substring(4, 1)      // 'bcd'   顺序反了会自动交换
'abcdef'.substr(1, 3)         // 'bcd'   第二个参数是「长度」（已废弃）
'abcdef'.split('')            // ['a','b','c','d','e','f']
'  x  '.trim()                // 'x'
'abc'.toUpperCase()           // 'ABC'
'abc'.replace('b', 'X')       // 'aXc'  ⚠️ 只换第一个
'abc'.replaceAll('b', 'X')    // 全部替换
'5'.padStart(3, '0')          // '005'
```

**③ 拼接**：`concat` —— 但直接用 `+` 或模板字符串更清楚，基本用不上。

⭐ **本集最该带走的差异：JS 没有 `StringComparison`。**

在 C# 里你习惯这样写：

```csharp
str.Contains("abc", StringComparison.OrdinalIgnoreCase)   // 忽略大小写
str.StartsWith("Ab", StringComparison.OrdinalIgnoreCase)
```

**JS 里没有这个参数** —— `includes` / `startsWith` / `endsWith` **全部区分大小写**，忽略大小写只能自己来：

```js
str.toLowerCase().includes('abc');     // 只能这么写
```

⭐ **第二个差异：JS 没有"文化敏感比较"。**

- JS 的 `<` `>` `sort()` 比字符串，是**按 UTF-16 码点逐位比** —— `'A'`(65) 排在 `'a'`(97) 前面，所以**大写全排在小写前面**
- **中文排序不是拼音**：`['张三', '李四', '王五'].sort()` 是按码点，不是按拼音 —— 要按拼音得用 `'张三'.localeCompare('李四', 'zh-CN')`
- C# 的 `string.Compare` 默认**就是文化敏感的**，`ToUpper()` 也有文化参数

⚠️ **一个必须记住的坑**：`replace` **默认只替换第一个**（这条在正则那一轮已经说过一次，这里再确认一遍）。要全替换用 **`replaceAll`**，或者正则加 `g`。

✅ 和 C# 一致的部分：**字符串是不可变的** —— 所有方法都**返回新字符串**，不改原来的那个。（这一条和 C# 一模一样，可以放心迁移。）

## 4. 渲染赠品案例（172）—— 实操课，无新语法

这一集的价值不在于新 API，而在于**把这一段的工具串起来**。骨架还是老的四步：

```
① 数据（数组）
② filter 筛出要展示的
③ map 翻成 HTML 字符串 → join('') 缝起来
④ innerHTML = 覆盖写入
```

**本集唯一值得单独记的"套路"**：**筛选条件不止一个时，把它写成一个"要不要它"的判断，而不是堆 if**。

```js
const result = list.filter(function (item) {
  return item.price >= min && item.price <= max && item.stock > 0;
});
```

`filter` 的回调**天然就是"要不要它"这个问题** —— 多个条件用 `&&` 连起来就行，**不需要嵌套 if，也不需要 `continue`**。

---

==二：格式==

## 1. 四个方法速查

```js
arr.find(function (item) { return 条件; });          // 元素 | undefined
arr.findIndex(function (item) { return 条件; });     // 下标 | -1
arr.some(function (item) { return 条件; });          // true 只要有 1 个满足
arr.every(function (item) { return 条件; });         // true 必须全部满足
```

**怎么选**：

| 你的问题 | 用 |
|---|---|
| 有没有一个"符合条件的东西"？拿来用 | `find` |
| 它在第几个？ | `findIndex` |
| 是不是**至少有一个**满足？ | `some` |
| 是不是**全都**满足？ | `every` |
| 每个都要处理一遍，不停 | `forEach` |

## 2. `Array.from` 速查

```js
Array.from(伪数组);                       // 转成真数组
Array.from(伪数组, function (x) { ... }); // 转完顺手 map
[...伪数组];                              // 等价的另一种写法（要求可迭代）
```

## 3. 字符串方法速查

```js
// 判断
s.includes(sub) / s.startsWith(sub) / s.endsWith(sub)   // 全是布尔，都区分大小写

// 位置
s.indexOf(sub)          // 找不到返回 -1
s.lastIndexOf(sub)

// 截取（三个签名，语义不同！）
s.slice(开始, 结束)      // 结束位置，不含；支持负数
s.substring(开始, 结束)  // 不支持负数；顺序反了自动交换
s.substr(开始, 长度)     // ⚠️ 第二个参数是长度；已废弃，别用

// 变形
s.split(分隔符)          // → 数组
s.trim() / s.trimStart() / s.trimEnd()
s.toUpperCase() / s.toLowerCase()
s.replace(旧, 新)        // ⚠️ 只换第一个
s.replaceAll(旧, 新)     // 全部
s.padStart(总长, 填充) / s.padEnd(总长, 填充)
s.concat(其他)           // 不如直接用 +
```

## 4. 筛选 + 渲染的骨架（172）

```js
function render(list) {                      // ① 要参数，不读全局
  const html = list.map(function (item) {    // ② map 翻字符串
    return '<div>' + item.name + '</div>';
  }).join('');                               // ③ join 缝整块
  document.querySelector('.list').innerHTML = html;   // ④ 覆盖写入
}

render(goods.filter(function (g) {           // 换一份数据，重画
  return g.price >= 100 && g.stock > 0;
}));
```

---

==三：代码==

## 1. `find` / `some` / `every` 的短路（170）

```js
const nums = [10, 5, 3, 28];
const cond = function (n) { return n >= 4; };

// find：找到第一个就停
console.log(nums.find(cond));        // 10     ← 只检查了第 1 个

// some：有就行，找到就停
console.log(nums.some(cond));        // true

// every：遇到不满足就停（第 3 个 3 不满足）
console.log(nums.every(cond));       // false  ← 只检查到第 3 个

// forEach 对照：没有 break，全部跑完
nums.forEach(function (n) { console.log('跑了', n); });   // 10 5 3 28

// ⚠️ 坑 1：findIndex 的 -1 是真值
console.log(nums.findIndex(function (n) { return n === 99; }));   // -1
if (nums.findIndex(function (n) { return n === 99; })) {
  console.log('你会看到这行 —— 因为 -1 是真值');
}
if (nums.findIndex(function (n) { return n === 99; }) !== -1) {
  console.log('这行才对');
}

// ⚠️ 坑 2：空数组的 every 是 true、some 是 false（数学约定，C# 也一样）
console.log([].every(function () { return false; }));   // true
console.log([].some(function () { return true; }));     // false
```

## 2. `Array.from`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>Array.from</title></head>
<body>
  <p>第一段</p>
  <p>第二段</p>
  <p>第三段</p>

  <script>
    const nodes = document.querySelectorAll('p');

    // ⚠️ 伪数组：能 forEach（现代浏览器），但用不了 filter / map / reduce
    nodes.forEach(function (n) { console.log('伪数组可以用 forEach：', n.textContent); });

    // 转成真数组 → 数组方法全都能用
    const arr = Array.from(nodes);
    console.log(arr.map(function (n) { return n.textContent; }));   // ['第一段','第二段','第三段']

    // 第二种写法（要求可迭代）
    console.log([...nodes].length);                                 // 3

    // Array.from 的第二参数 = 转完顺手 map
    console.log(Array.from([1, 2, 3], function (n) { return n * 2; }));   // [2, 4, 6]

    // 经典用途：造一个定长的数字数组
    console.log(Array.from({ length: 5 }, function (v, i) { return i; })); // [0,1,2,3,4]
  </script>
</body>
</html>
```

## 3. 字符串方法的四个对照实验（171）

```js
// ① 三种截取签名，同一个结果 —— 语义完全不同
const s = 'abcdef';
console.log(s.slice(1, 4));       // 'bcd'  结束位置 4（不含）
console.log(s.substring(4, 1));   // 'bcd'  顺序反了自动交换
console.log(s.substr(1, 3));      // 'bcd'  从 1 开始取 3 个

console.log(s.slice(-3));         // 'def'  负数从末尾算
console.log(s.substring(-3));     // 'abcdef'  ← 负数被当成 0！

// ② replace 只换第一个
console.log('a-b-c'.replace('-', '+'));      // 'a+b-c'  ⚠️
console.log('a-b-c'.replaceAll('-', '+'));   // 'a+b+c'

// ③ includes 区分大小写（JS 没有 StringComparison）
console.log('Hello'.includes('hello'));                    // false
console.log('Hello'.toLowerCase().includes('hello'));      // true

// ④ 中文排序不是拼音
console.log(['张三', '李四', '王五'].sort());               // 按 Unicode 码点，与拼音无关
console.log('张三'.localeCompare('李四', 'zh-CN'));          // 按拼音/语言规则比较
```

## 4. 赠品案例：多条件筛选 + 渲染（172）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>赠品筛选</title></head>
<body>
  <button data-min="0">全部</button>
  <button data-min="100">满 100</button>
  <button data-min="500">满 500</button>
  <div class="list"></div>

  <script>
    const goods = [
      { name: '手机', price: 2999, stock: 5, gift: '贴膜' },
      { name: '耳机', price: 199, stock: 0, gift: '无' },
      { name: '手表', price: 899, stock: 3, gift: '表带' },
      { name: '充电器', price: 59, stock: 20, gift: '无' }
    ];

    const list = document.querySelector('.list');

    function render(arr) {
      list.innerHTML = arr.map(function (item) {
        return '<div>' + item.name + ' ￥' + item.price
             + ' 赠品：' + item.gift + '</div>';
      }).join('');
    }

    document.body.addEventListener('click', function (e) {
      if (e.target.tagName !== 'BUTTON') return;
      const min = Number(e.target.dataset.min);

      // ⭐ 多个条件就用 && 连起来 —— 不用嵌套 if，也不用 continue
      const chosen = goods.filter(function (g) {
        return g.price >= min && g.stock > 0;
      });

      render(chosen);

      // 顺带用上本集的新方法
      console.log('有货的有几个：', chosen.length);
      console.log('是不是都带赠品：', chosen.every(function (g) { return g.gift !== '无'; }));
      console.log('第一个满 500 的：', goods.find(function (g) { return g.price >= 500; }));
    });

    render(goods.filter(function (g) { return g.stock > 0; }));
  </script>
</body>
</html>
```

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 170 | **`find` / `some` / `every` 会提前停** —— 它们补上了 `forEach` 不能 `break` 的那块空白 |
| 171 | 字符串方法分三类；**JS 没有 `StringComparison`**，忽略大小写得自己 `toLowerCase()` |
| 172 | 多条件筛选就用 `&&` 连在 `filter` 的回调里 —— **不用嵌套 if，也不用 `continue`** |

## 2. ⭐ 收敛时刻：`forEach` 那个坑，到这里正式补上了

回顾这四轮建立起来的"数组方法家族"：

| 你的意图 | JS | LINQ 对应 | 会提前停吗 |
|---|---|---|---|
| 每个都做一遍，**不要结果** | `forEach` | `List.ForEach` | ❌ **不能** |
| 每个**变成**另一个 | `map` | `Select` | ❌ |
| **留下**一部分 | `filter` | `Where` | ❌ |
| **合成一个值** | `reduce` | `Aggregate` | ❌ |
| **找第一个符合条件的** | **`find`** | `FirstOrDefault` | ✅ 找到就停 |
| **有没有符合条件的** | **`some`** | `Any` | ✅ 找到就停 |
| **是不是全都符合** | **`every`** | `All` | ✅ 不满足就停 |
| 它在第几个 | `findIndex` | `FindIndex` | ✅ |

**第 160 集那个"`forEach` 里 `return` 只等于 `continue`"的坑，答案就在这一集。** 当时只能说"想中途停就用普通 `for`"；**现在你可以说"想中途停，看你要的是哪一种，然后选 `find` / `some` / `every`"** —— 这才算真正补上。

## 3. 静默失败清单（本轮 5 条，4 条不报错）

| 你写的 | 实际发生 |
|---|---|
| `if (arr.findIndex(...))` | **`-1` 是真值**，条件永远成立，**无报错** |
| `'abc'.replace('b', 'X')` 想全换 | 只换了第一个，**无报错** |
| `'Hello'.includes('hello')` | `false`（JS 没有忽略大小写的参数），**无报错** |
| `arr.sort()` 想按拼音排中文 | 按 Unicode 码点排，**无报错** |
| `s.substring(-3)` 以为是"最后 3 个" | 负数被当成 0，返回整个字符串，**无报错** |

**会报错的一条**：`Array.from(null)` → `TypeError`。

## 4. 工程上怎么防

- 判 `findIndex` 的返回值，**永远写 `!== -1`**（别直接当条件）
- 全替换用 **`replaceAll`**，不要用 `replace`
- 忽略大小写比较，**写成 `.toLowerCase().includes(...)`** —— 把 `toLowerCase` 当成 JS 版的 `StringComparison.OrdinalIgnoreCase`
- 中文排序/比较**用 `localeCompare`**，不要靠 `sort()` 的默认行为
- 截取字符串**优先 `slice`**（支持负数、语义直观），**不要用 `substr`**（已废弃）

## 5. C# 类比可用度（本轮新增）

| JS | C# | 档 |
|---|---|---|
| `find` | `FirstOrDefault` | ✅ 概念同源（值类型默认值的差异） |
| `some` / `every` | `Any` / `All` | ✅ **完全一致**（含空集约定、含短路） |
| `findIndex` / 返回 `-1` | `FindIndex` / `IndexOf` 也返回 `-1` | ✅ 一致 |
| `Array.from` | 无对应（C# 没有伪数组） | ❌ **JS 特有** |
| `includes` / `startsWith` | `Contains` / `StartsWith` | ⚠️ **JS 没有 `StringComparison`** |
| `slice(开始, 结束)` | `Substring(开始, 长度)` | ❌ **第二个参数语义相反** |
| `replace` | `Replace`（全部） | ❌ **JS 默认只换第一个** |
| `sort()` 默认比较 | `string.Compare`（文化敏感） | ❌ **JS 按码点，中文不是拼音** |
| 字符串不可变 | `string` 不可变 | ✅ 完全一致 |

## 6. 解锁边界（本轮变更）

**新解锁**
- ✅ **`find` / `findIndex` / `some` / `every`**
- ✅ **`Array.from`**
- ✅ **`replaceAll` / `padStart` / `padEnd` / `trimStart` / `trimEnd` / `localeCompare`**

**仍然锁着**
- ❌ `prototype` / `__proto__` / 原型链 / `instanceof`（176-183）—— **从下一轮开始正式开讲**
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` ← **课程内永不解锁**

## 7. 下一轮预告

第 **173 / 174 / 175** 集：**购物车案例 · 渲染数据模块** → **数据处理模块** → **合计模块**。

⚠️ 这三集是**同一案例的三个模块**，是 Day 2 的综合演练，也是**"数据层 / 渲染层 / 计算层"三层分离的第一次完整示范**。
⚠️ 老规矩：**没有新语法就讲架构**。这一轮的重点是"**模块怎么切、层与层之间传什么**" —— 这是从"会写函数"跨到"会组织代码"的一步。
