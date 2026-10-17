# JS--进阶篇 13 · 深拷贝（手写递归） · JSON 与 lodash · 异常处理

> **对应课程**：黑马《前端 JavaScript 入门到精通全套视频教程》BV1Y84y1L7Nn 第 **189 / 190 / 191** 集
> **说明**：**第 188 集（递归函数）跳过** —— 递归你早学过，本轮的 189 直接就用它。
> **读法**：全文贯穿 **JS ↔ C#/.NET 对照** —— 读者是资深 C#/.NET 学习者，只讲差异与坑。

---

==一：概念==

## 1. 深拷贝 · 手写递归（189）

### 1.1 先回到上一轮那个没解决的 bug

```js
const defaultConfig = { theme: 'light', size: { width: 300, height: 200 } };

const config = { ...defaultConfig };   // 浅拷贝
config.size.width = 500;
console.log(defaultConfig.size.width); // 500  ⚠️ 默认配置被改坏了
```

**浅拷贝只保护第一层，`size` 那一层是共用的。** 深拷贝要解决的就是"**每一层都复制一份新的**"。

### 1.2 核心思路：**递归 + 判断类型**

**一句话**：**遇到基本类型就返回它本身；遇到对象/数组，就造一个新的，然后逐个属性再走一遍同样的逻辑。**

```js
function deepClone(value) {
  // ① 不是对象（包括 null）→ 基本类型，直接返回
  if (value === null || typeof value !== 'object') return value;

  // ② 是数组就造数组，是对象就造对象
  const result = value instanceof Array ? [] : {};

  // ③ 逐个属性递归下去
  Object.keys(value).forEach(function (key) {
    result[key] = deepClone(value[key]);
  });

  return result;
}
```

**逐行读一遍：**

| 行 | 在干什么 |
|---|---|
| `typeof value !== 'object'` | 数字 / 字符串 / 布尔 / `undefined` / 函数 → **直接返回**（基本类型不用复制） |
| `value === null` | ⚠️ **单独判**，因为 `typeof null` 也是 `'object'`（JS 的一个著名历史遗留） |
| `value instanceof Array ? [] : {}` | **是数组就得造数组**，不能造对象（回扣 183 的 `instanceof`） |
| `Object.keys(...).forEach(...)` | 遍历自己的属性（168 + 160 学过的组合） |
| `result[key] = deepClone(value[key])` | **递归**：每个属性再走一遍同样的判断 |

### 1.3 它是怎么"深"下去的

```
deepClone({ theme:'light', size:{ width:300 } })
   │
   ├─ theme → 'light'  → 不是对象 → 直接返回
   │
   └─ size  → 是对象 → 再调一次 deepClone
                          │
                          ├─ width → 300 → 直接返回
                          └─ 造出一个新的 { width: 300 }   ← ⭐ 新的！
```

**每一层都会新建一个容器**，所以内外都断开了：

```js
const a = { theme: 'light', size: { width: 300 } };
const b = deepClone(a);

console.log(b === a);                 // false  ✅ 外层独立
console.log(b.size === a.size);       // false  ✅ 内层也独立（浅拷贝这里是 true）
```

**上一轮那个 `defaultConfig` 的 bug，到这里就修好了。**

### 1.4 ⭐ C# 对照：思路完全一样

```csharp
public static T DeepClone<T>(T obj) {
    // 递归 + 逐字段复制 —— 和 JS 的逻辑一一对应
}
```

**"递归 + 判断类型 + 每层新建容器"这个思路，C# 和 JS 是同一套。** 唯一的差别是 JS 里更简单（不用管泛型、不用反射）。

⚠️ 但要注意：**C# 里你多半不会手写它** —— 要么用 `record` 的 `with`、要么用序列化、要么用第三方库。**JS 也一样，手写是为了理解原理**（190 会给出更省事的方案）。

### 1.5 ⚠️ 手写版的三个局限（知道就行）

| 局限 | 说明 |
|---|---|
| **循环引用会爆栈** | `a.self = a;` → 递归无限下去 → `RangeError: Maximum call stack size exceeded` |
| **`Date` / `RegExp` 会被"降级"** | `instanceof Date` 走的是 `{}` 分支 → 变成一个**空对象**，日期信息丢了 |
| **函数不会被真正复制** | `typeof function` 是 `'function'`，会走"直接返回" → 两个对象**共用同一个函数**（一般没问题，最多算近似） |

**生产代码里要处理这些，就得一层层加判断**（`instanceof Date` 就新建 `new Date(...)`）。**但课程范围内不用做到那一步** —— 知道边界在哪就行，真要用复杂对象时，用 190 的方案。

### 1.6 一个更稳的写法：`Array.isArray`

```js
const result = Array.isArray(value) ? [] : {};   // ✅ 比 instanceof 更稳
```

183 集说过：**`instanceof` 跨窗口会失效**（不同窗口的 `Array.prototype` 不是同一个）。所以判断"是不是数组"**优先用 `Array.isArray`**。

⭐ **这是 `Array.isArray` vs `instanceof Array` 的实战结论**：**判数组，一律用 `Array.isArray`。**

## 2. 深拷贝 · `JSON` 方法与 lodash（190）

### 2.1 ⭐ `JSON.parse(JSON.stringify(x))` —— 一行搞定

```js
const b = JSON.parse(JSON.stringify(a));
console.log(b === a);              // false ✅
console.log(b.size === a.size);    // false ✅ 内层也独立了
```

⭐ **这就是你学过的"序列化 → 反序列化"**（第 11 轮 Web APIs 里讲过 `JSON.stringify` / `parse`）：

```
对象  ──JSON.stringify──►  一串文本  ──JSON.parse──►  全新的对象
                            （文本没有"引用"，只有内容）
```

**关键洞察**：**文本里不存在"引用"这个概念**。序列化成字符串的那一刻，所有的对象层级都被拍平成了文字；再 parse 回来，**自然是一个全新的、没有任何共享的对象**。

**这条路天然就"深"** —— 因为它压根不是复制，是**重建**。

### 2.2 ⚠️⚠️ 但它会丢东西 —— 这是本集的重点

**`JSON` 只认识"能被 JSON 表示的东西"**，其他一律在 `stringify` 阶段被处理掉：

| 你的数据 | 经过 `JSON` 方法后 | 后果 |
|---|---|---|
| `undefined` | **整个属性消失** | 丢字段，**无报错** |
| 函数 | **整个属性消失** | 丢方法，**无报错** |
| **`Date` 对象** | **变成字符串** `"2026-10-16T..."` | ⚠️ **类型变了！** 之后 `.getFullYear()` 直接报错 |
| `NaN` / `Infinity` | 变成 `null` | 数值静默变 null |
| `RegExp` | 变成 `{}` | 正则丢了 |
| **循环引用** | **直接抛 `TypeError`** | 这是唯一"会出声"的 |
| 原型上的属性和方法 | 全部丢弃 | 只剩自有属性（回扣 178：方法在原型上，本来就带不走） |

⭐ **最阴的是 `Date` 那条**：数据"看起来还在"（打开控制台能看到一个 ISO 时间字符串），**但类型已经悄悄从 `Date` 变成了 `string`**。等你在别的地方调 `.getTime()` 时才炸 —— **而且炸的地方离出错的地方很远。**

**自证实验：**

```js
const a = { when: new Date(), fn: function () {}, u: undefined, n: NaN };
const b = JSON.parse(JSON.stringify(a));

console.log(b.when instanceof Date);   // false ⚠️ 不是日期了，是字符串
console.log(typeof b.fn);              // 'undefined'（属性直接没了）
console.log('u' in b);                 // false（属性直接没了）
console.log(b.n);                      // null
```

### 2.3 lodash 的 `_.cloneDeep`

**要处理 `Date`、循环引用这些，自己写太累 —— 用现成库。** 最常用的是 lodash：

```html
<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
```

```js
const b = _.cloneDeep(a);      // 一行，且把 Date / RegExp / 循环引用都处理了
```

⭐ **它和我们手写那个 `deepClone` 是一回事，只是把各种边界情况都补全了** —— 你可以把它理解成"**189 那个函数，加上 Date / RegExp / 循环引用的判断**"。

⚠️ **引入第三方库的代价**（工程视角）：

| 代价 | 说明 |
|---|---|
| 体积 | 完整 lodash 不小（虽然可以只引 `lodash.clonedeep` 这个单函数包） |
| 依赖 | 多一个外部依赖，多一个更新/安全的负担 |
| **很多项目里不用** | 因为 `JSON` 方法已经够应付 90% 的场景 |

⭐ **实战选型（要记住这个判断）**：

| 场景 | 用什么 |
|---|---|
| 数据只有基本类型 / 数组 / 普通对象（**没有 `Date`、函数、循环引用**） | **`JSON.parse(JSON.stringify(x))`** —— 够用、零依赖 |
| 有 `Date` / 特殊对象 / 循环引用 | **`_.cloneDeep`**，或用更现代的 **`structuredClone(x)`** |
| 想真正理解原理 | 手写一遍 189 那个函数 |

> 💡 **补充一个现代方案**：浏览器现在有原生的 **`structuredClone(x)`**，能处理 `Date` / 循环引用，**不用引任何库**。**本课程没有它（那时还没普及），但你以后写代码时会遇到 —— 见到它不用惊讶，它就是"浏览器自带的 `_.cloneDeep`"。**

## 3. 异常处理（191）

### 3.1 语法：和 C# 几乎一样

```js
try {
  // 可能出错的代码
  const data = JSON.parse('这不是 json');
  console.log(data);
} catch (e) {
  // 出错了走这里
  console.log('出错了：', e.message);
} finally {
  // 不论成功失败都走这里
  console.log('无论如何都会执行');
}
```

⭐ **`try` / `catch` / `finally` 三个块、执行顺序、语义 —— 和 C# 完全一致，可以直接迁移。**

### 3.2 ⚠️ 但有四个差异，每个都会让 C# 程序员愣一下

**① JS 没有"受检异常"**

C# 里 `File.ReadAllText(...)` 会抛 `IOException`，**编译器强制你处理它**（要么 try，要么在方法签名上声明）。**JS 完全没有这套** —— 任何函数都可能抛任何东西，编辑器不会提醒你。**你得靠经验记住"哪些操作会抛"。**

**② `throw` 可以扔任意值（连一个字符串都行）**

```js
throw '出错了';              // ✅ 合法！
throw 404;                   // ✅ 合法！
throw { code: 500 };         // ✅ 合法！
throw new Error('出错了');    // ✅ 这才是推荐写法
```

**C# 里 `throw` 只能抛 `Exception` 及其子类**（`throw "abc"` 编译不过）。**JS 什么都不管。**

⚠️ **这直接导致一个坑**：

```js
try {
  throw '出错了';          // 扔的是字符串
} catch (e) {
  console.log(e.message);   // undefined  ← 字符串没有 message 属性，而且不报错
}
```

**`e` 不一定是 `Error` 对象** —— 所以 `e.message` / `e.name` 都可能是 `undefined`。**这是 JS 异常处理里最需要注意的一点。**

⭐ **对应的工程纪律：`throw` 时永远写 `new Error('...')`。** 这样接住的人才有 `message` / `name` / 堆栈可用。（这也是所有 JS 规范里的一条。）

**③ `catch` 不写类型（也不做类型匹配）**

```js
// C#：catch (FormatException e) —— 写错类型就接不住
try { ... } catch (e) { ... }        // JS：所有异常都进这一个 catch
```

**JS 只有一个 `catch`**，没有"按类型分别 catch"的语法。要区分类型，**得在 `catch` 里面自己判断**：

```js
try {
  undefinedFunction();          // 会抛 ReferenceError
} catch (e) {
  if (e instanceof TypeError) {
    console.log('类型错误');
  } else if (e instanceof ReferenceError) {
    console.log('引用了不存在的东西');
  } else {
    console.log('别的错误：', e.name);
  }
}
```

**④ `catch` 的参数可以省略**（ES2019 起）

```js
try { ... } catch { console.log('出错了'); }   // 不需要那个 e 时可以省掉
```

### 3.3 JS 的内置错误类型（就这几个）

| 类型 | 什么时候出现 |
|---|---|
| `Error` | 通用；**你自己 `throw new Error()` 就这个** |
| `TypeError` | **类型用错了** —— 最常见：调用 `undefined`、读 `null` 的属性 |
| `ReferenceError` | 引用了一个不存在的变量（⚠️ 包括 TDZ 那个坑，第 155 集） |
| `RangeError` | 数值超范围（⚠️ **递归爆栈也是它**） |
| `SyntaxError` | 语法错误 —— **一般是引擎在解析时就抛的，`try` 基本接不住** |

⚠️ **`SyntaxError` 那条要特别记**：它发生在**代码被解析的时候**，而 `try` 是**运行的时候**才生效。所以：

```js
try {
  eval('这是 语法 错误');     // 只有 eval 里的语法错误才可能被接住
} catch (e) { ... }

// 但你在文件里直接写语法错误 —— 整个文件根本不会运行，try 也没用
```

⭐ **对比 C#**：C# 有完整的 `Exception` 继承树（几十个类型），**JS 只有这 5 个左右**。所以 JS 里判断"这是什么错"往往更粗糙 —— **大多数时候你只能看 `e.message` 的文本**。

### 3.4 `debugger` —— JS 独有的断点开关

```js
function calc(a, b) {
  debugger;              // ⭐ 执行到这一行，浏览器会暂停，自动打开调试器
  return a / b;
}
```

⭐ **这是 JS 特有的**：**断点写进代码里**，不需要在 IDE 里点。

⚠️ **但上线前一定要删掉** —— 忘了删的话，**F12 打开着的人，页面会莫名其妙卡在那**。（这也是一个静默问题：没开调试器的人完全没感觉，开了的人才卡。）

| | C# | JS |
|---|---|---|
| 断点在哪设 | **IDE 里点**（`Debugger.Break()` 也能写代码里） | **`debugger` 写在代码里**，或 DevTools 里点 |

---

==二：格式==

## 1. 深拷贝三种方案速查

```js
// ① 手写递归 —— 理解原理用
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  const result = Array.isArray(value) ? [] : {};
  Object.keys(value).forEach(function (key) {
    result[key] = deepClone(value[key]);
  });
  return result;
}

// ② JSON 方法 —— 数据简单时最省事（零依赖）
const copy = JSON.parse(JSON.stringify(obj));

// ③ lodash —— 数据复杂（有 Date / 循环引用）时用
const copy = _.cloneDeep(obj);

// ④ 现代原生方案（课程外，但你会遇到）
const copy = structuredClone(obj);
```

## 2. 选型判断（照着问自己）

| 问自己 | 答案 → 选哪个 |
|---|---|
| 数据里有 `Date` / 函数 / `undefined` / 循环引用吗？ | **有** → 别用 JSON 方法 |
| 有循环引用，或要连 `Date` 一起复制？ | 用 `_.cloneDeep` 或 `structuredClone` |
| 只有普通对象 / 数组 / 基本类型？ | **`JSON.parse(JSON.stringify())` 就够了** |

## 3. 异常处理模板

```js
try {
  // 可能出错的代码
} catch (e) {
  // ⚠️ e 不一定是 Error 对象 —— 自己抛的时候一定要 throw new Error()
  console.log(e.name, e.message);

  // 要区分类型，自己判
  if (e instanceof TypeError) { ... }
} finally {
  // 一定会执行（和 C# 一样）
}

throw new Error('出错了');    // ⭐ 抛，永远这么写
debugger;                    // ⭐ 断点（上线前删）
```

---

==三：代码==

## 1. 深拷贝的完整对照实验（189 + 190）

```js
// ═══ 准备一份"有嵌套 + 有各种类型"的数据 ═══
const origin = {
  name: '张三',
  address: { city: '北京', detail: { street: '长安街' } },
  tags: ['前端', 'JS'],
  when: new Date(),
  fn: function () { return 1; },
  missing: undefined,
  notNumber: NaN
};

// ═══ ① 手写递归版 ═══
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  const result = Array.isArray(value) ? [] : {};
  Object.keys(value).forEach(function (key) {
    result[key] = deepClone(value[key]);
  });
  return result;
}

const hand = deepClone(origin);
console.log(hand === origin);                     // false
console.log(hand.address === origin.address);     // false ✅ 内层也独立了
console.log(hand.tags === origin.tags);           // false ✅ 数组也独立了
console.log(hand.address.detail === origin.address.detail);  // false ✅ 再深一层也独立

// ⚠️ 局限：Date 被"降级"成一个空对象了
console.log(hand.when);                           // {}  ← 日期信息丢了

// ═══ ② JSON 方法 ═══
const json = JSON.parse(JSON.stringify(origin));
console.log(json === origin);                     // false
console.log(json.address.detail === origin.address.detail);  // false ✅

// ⚠️ 局限：丢东西
console.log(json.when instanceof Date);           // false ← 变成字符串了！
console.log(typeof json.when);                    // 'string'
console.log('fn' in json);                        // false ← 函数整个没了
console.log('missing' in json);                   // false ← undefined 也没了
console.log(json.notNumber);                      // null  ← NaN 变 null

// ═══ ③ 循环引用：手写版爆栈，JSON 版报错 ═══
const risky = { name: '循环' };
risky.self = risky;
// deepClone(risky);                       // ⚠️ RangeError: 爆栈
try {
  JSON.parse(JSON.stringify(risky));       // ⚠️ TypeError: Converting circular structure
} catch (e) {
  console.log('接住了：', e.name, e.message);
}
```

## 2. 异常处理的四个差异演示（191）

```js
// ═══ ① throw 可以扔任何东西 ═══
try {
  throw '我是一个字符串';       // C# 里这行编译不过
} catch (e) {
  console.log(typeof e);        // 'string'
  console.log(e.message);       // undefined ⚠️ 没有 message，且不报错
}

// ═══ ② 永远 throw new Error ═══
try {
  throw new Error('我是一个正经的错误');
} catch (e) {
  console.log(e.name);          // 'Error'
  console.log(e.message);       // '我是一个正经的错误'  ✅ 有东西可读
}

// ═══ ③ 没有"按类型 catch"，要自己判 ═══
function risky(flag) {
  if (flag === 1) return undefinedFn();        // ReferenceError
  if (flag === 2) return null.name;            // TypeError
  throw new Error('自定义');
}

[1, 2, 3].forEach(function (flag) {
  try {
    risky(flag);
  } catch (e) {
    if (e instanceof ReferenceError)      console.log('引用了不存在的东西');
    else if (e instanceof TypeError)      console.log('类型用错了');
    else                                  console.log('其他：', e.message);
  }
});

// ═══ ④ finally 一定会执行（和 C# 一样）═══
try {
  return 1;                    // 注意：return 也拦不住 finally
} finally {
  console.log('我依然会执行');
}
```

## 3. 实战：把上一轮那个配置 bug 修好

```js
const defaultConfig = { theme: 'light', size: { width: 300, height: 200 } };

function createPanel(userOptions) {
  // ⭐ 换成深拷贝（这份数据都是普通对象，JSON 方法够用）
  const config = JSON.parse(JSON.stringify(defaultConfig));
  Object.assign(config, userOptions);

  config.size.width = 500;
  return config;
}

createPanel({});
console.log(defaultConfig.size.width);   // 300 ✅ 默认配置没被改坏！
```

**从 187 埋下的那个 bug，到这里正式解决。**

> ⚠️ 注意这里能安全用 JSON 方法的前提是：**`defaultConfig` 里没有 `Date` / 函数 / `undefined`**。**如果有，就得换 `_.cloneDeep` 或 `structuredClone`。** —— 这正是 2.2 那张表要你记住的。

## 动手小练习（不留超纲作业）

1. **给 `deepClone` 加上 `Date` 的处理**：在里面加一个判断 —— 如果 `value instanceof Date`，就 `return new Date(value)`（复制出一个新日期）。
2. **然后用它拷贝一份含 `Date` 的对象**，打印：
   - `copy.when instanceof Date` → 应该是 `true`
   - `copy.when === origin.when` → 应该是 `false`（是新对象）

**做完你就手写出了一个"能处理 `Date` 的深拷贝"** —— 而 lodash 的 `_.cloneDeep` 无非是把这个思路做到了极致。

---

==四：总结==

## 1. 一句话记住三个

| 集 | 一句话 |
|---|---|
| 189 | 深拷贝 = **遇到基本类型就返回；遇到对象/数组就新建一个，逐属性递归** |
| 190 | `JSON.parse(JSON.stringify(x))` 是"序列化重建"，**天然就深**，但会**丢 `undefined`/函数、把 `Date` 变成字符串** |
| 191 | `try`/`catch`/`finally` 与 C# 一致；⚠️ **但 JS 没有受检异常、能扔任意值、`e` 不一定是 `Error`** |

## 2. ⭐⭐ 本轮要背的三句

**① 深拷贝的判断标准只有一条：`b.嵌套 === a.嵌套` 是不是 `false`。**

**② `JSON` 方法会丢东西，最阴的是 `Date`** —— 它**不报错**，只是把类型从 `Date` 悄悄换成 `string`，等你在别处调用日期方法时才炸，**而且炸的位置离出错的位置很远**。

**③ `throw` 时永远写 `new Error('...')`。**

因为 JS 允许扔任意值（连字符串都行），**所以 `catch (e)` 里的 `e` 不保证有 `message`**。**规范从"抛的人"开始守。**

## 3. ⭐ 收敛时刻：187 → 189/190 是一条线

| 集 | 讲的是 |
|---|---|
| 187 | 浅拷贝**只保护第一层**，并留下那个"配置被改坏"的 bug |
| 189 | **手写递归把每一层都复制** —— 原理 |
| 190 | **`JSON` 方法一行搞定** —— 够用、零依赖；但要知道它的边界 |

**从"发现问题"到"理解原理"到"用顺手工具"，这一条线走完了。**

## 4. ⚠️ 顺带一条很重要的连续性

**191 和前面一整段对上了。** 回看你在这些集里踩过的东西 —— **它们全都是"异常"眼里的典型案例**：

| 集 | 当时那个静默失败 | 191 之后怎么看它 |
|---|---|---|
| 164 | 构造函数忘 `new` → 属性泄漏到 `window` | **严格模式下当场 `TypeError`**，可以 `try` 接住 |
| 170 | `findIndex` 找不到返回 `-1` | ⚠️ **不是异常**，得自己判 |
| 178 | `prototype` 上写箭头函数 → `this` 是 `undefined` | ⚠️ **不是异常**，`undefined` 不抛错 |
| 189 | 循环引用 → 递归无限 | **`RangeError`**（爆栈）—— **终于有个会出声的了** |

⭐ **这张表其实在说一件事**：**JS 里绝大多数错误是"静默失败"，异常机制只覆盖了其中一小块。** 所以 `try` 不是万能兜底 —— **真正的防线还是"写的时候就别写错"。**

## 5. 静默失败清单（本轮 4 条，全都不报错）

| 你写的 | 实际发生 |
|---|---|
| `JSON` 方法拷贝含 `Date` 的对象 | `Date` 变字符串，**当场无报错**，别处调用才炸 |
| `JSON` 方法拷贝含函数/`undefined` 的对象 | 属性静默消失 |
| `catch (e)` 里读 `e.message`，但抛出的是字符串 | `undefined`，**无报错** |
| `debugger` 忘了删 | 开着 F12 的用户页面卡住，其他用户无感 |

**会报错的两条**：循环引用 + `JSON.stringify` → `TypeError`；手写递归遇循环引用 → `RangeError`（爆栈）。

## 6. C# 类比可用度（本轮新增）

| JS 的做法 | C# 对应 | 档 |
|---|---|---|
| 手写递归 `deepClone` | 手写 `DeepClone` | ✅ **思路完全一样** |
| `JSON.parse(JSON.stringify(x))` | 序列化后再反序列化 | ✅ **你会秒懂**（但要注意 `Date` 的处理差异） |
| `_.cloneDeep` | 第三方深拷贝库 / `record` 的 `with` | ⚠️ 概念一致，工具不同 |
| `try` / `catch` / `finally` | `try` / `catch` / `finally` | ✅ **语法语义一致** |
| `throw 'abc'` | ❌ 编译不过（只能抛 `Exception`） | ❌ **JS 特有的宽松** |
| `catch (e)` 不写类型 | `catch (IOException e)` 必须写类型 | ❌ **差异明显** |
| 5 个内置错误类型 | 完整的 `Exception` 继承树 | ❌ **JS 的异常体系非常薄** |
| **没有受检异常** | 有受检异常（编译器强制） | ❌ **差异明显** |
| `debugger` | IDE 断点 / `Debugger.Break()` | ⚠️ JS 是**写进代码**的 |

⭐ **本轮的 C# 迁移结论**：**深拷贝是 ✅ 白送（思路一样）；异常处理是 ⚠️ 半送（语法一样，但"类型体系"和"受检机制"都没有）。**

## 7. 解锁边界（本轮变更）

**新解锁**
- ✅ **`try` / `catch` / `finally` / `throw` / `debugger`**
- ✅ **内置错误类型**（`Error` / `TypeError` / `ReferenceError` / `RangeError` / `SyntaxError`）
- ✅ **`Array.isArray`**（在 1.6 里作为 `instanceof` 的更稳替代引入）
- ✅ **`JSON.parse(JSON.stringify())` 做深拷贝** —— 前提是你已经学过 `JSON`（Web APIs 阶段）
- ⚠️ **`for...in` 仍未解锁** —— 遍历属性一律用 `Object.keys().forEach()`（已学）

**课程外（知道就好，不作要求）**
- 💡 **`structuredClone()`** —— 浏览器原生深拷贝，课程里没有

**仍然锁着**
- ❌ **`call` / `apply` / `bind`**（192-195）—— 下一轮开始
- ❌ `class` · Promise · `async/await` · 模块化 · `?.` · `??` · `for...of` ← **课程内永不解锁**

## 8. 下一轮预告

第 **192 / 193 / 194** 集 —— **`this` 完整模型，全课最大差异点。**

| 集 | 内容 |
|---|---|
| 192 | **普通函数和箭头函数的 `this`** — 🔥🔥 与第 102 集呼应收口 |
| 193 | **`call` 改变 `this` 指向** — 🔥 ⚠️ C# 无对应概念 |
| 194 | **`apply`** — 与 `call` 同源，差别只在传参形式 |

⏳ **三笔挂账中有两笔将在下一轮结清**：

1. **`const self = this` 到底为什么需要** —— **192 集讲透**（模态框里那个写法，终于能解释了）
2. **父类属性继承的 `父类.call(this, ...)`** —— **193 集学完 `call` 就能用**，回头改 182 的示例

⭐ **这是从第 ⑮ 轮就挂着的账**（"`this` 只讲了够用版"）—— **下一轮终于补成完整版**。
