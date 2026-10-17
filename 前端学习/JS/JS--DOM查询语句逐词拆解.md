# JS--DOM 查询语句逐词拆解

> **本课目标**：把 `const username = document.querySelector('#username');` 这一行，拆到每个字符都说得清。
> **为什么先拆这一行**：它是整个 Web APIs 的**最小完整样本** —— 取（查询）+ 存（变量），后面所有操作都接在它后面。这一行读通，剩下 70 集基本是它的变体。
> **对应视频**：第 79-81 集（应用篇 Day1）
> **主源**：MDN [`document.querySelector()`](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelector)、[`const`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/const)

---

==一：概念==

### 这行代码在干什么

一句话：**在页面里找到 id 为 `username` 的那个元素，并给它起一个 JS 里叫 `username` 的名字。**

它由三种东西组成，缺一不可：

| 层 | 部件 | 作用 |
|---|---|---|
| 存 | `const username =` | 起个名字，装住引用 |
| 找 | `document.querySelector(...)` | 用 CSS 选择器在整棵树里捞第一个 |
| 参 | `'#username'` | 选择器字符串，**`#` 不能省** |

### 逐词拆解（9 个部件）

**① `const`** —— 声明关键字：块级作用域，**绑定不可改**。

- 对标 C#：像 `readonly` 的「不许重新赋值」，但作用在**局部变量**上；C# 局部变量层面没有完全等价物。
- MDN 原话：「`const` 声明创建了一个对值的**不可变引用**……是创建不可变的**绑定**，而不是不可变的值。」
- 坑：`const obj = {}` 之后 `obj.a = 1` **完全合法**。锁的是「这个名字指向谁」。
- 这里为什么用它：元素只取一次，之后不会换成别的元素（第 78 集「const 优先」的编码约定）。

**② `username`** —— 变量名，**我起的**。

- ⚠️ 最容易绕晕的点：左边的 `username` 和右边引号里的 `#username` **没有任何语法关系**，只是人为好读取了同一个名字。你完全可以写 `const el = document.querySelector('#username')`，效果一模一样。
- 命名规则同 C#；差异：JS 允许 `_` 和 `$`，且**严格区分大小写**（`username` ≠ `userName`）。而 DOM 里属性名偏偏经常是驼峰 —— 所以大小写写错，是最常见的 `null` 来源。

**③ `=`** —— 赋值运算符。

- 这里**不是**「复制了一份元素」，是**把那个对象的引用交给了这个名字**。
- 所以后面 `username.innerText = 'x'` 改的是**页面上那个真元素**。
- 对标 C#：引用类型赋值 —— 你已熟。

**④ `document`** —— 全局对象，整棵 DOM 树的入口。

- MDN 原话：「`Document` 接口表示任何在浏览器中载入的 Web 页面，并作为 Web 页面内容的**入口**，也就是 DOM 树。」
- 从哪来：浏览器自动提供，挂在 `window` 上（`window.document`），**你不需要声明它**。这就是基础篇第 56 集说的「全局」的味道。
- ⚠️ 大小写：小写 `document` 是**实例**（当前页面）；大写 `Document` 是**构造函数 / 接口**（类型）。别混。

**⑤ `.`** —— 成员访问运算符，和 C# 的 `.` 完全一样：`对象.成员`。

**⑥ `querySelector`** —— 方法名：query（查询）+ Selector（选择器）。

- 挂在 `document` 上 → 在**整篇文档**范围里找。
- 同名的还挂在**元素**上：`box.querySelector('li')` → 只在 `box` 的**后代**里找。名字一样，范围不同。
- 返回值：**第一个**匹配的元素（按文档顺序、深度优先先序遍历）；找不到 → **`null`**。
- 参数必须是**合法 CSS 选择器字符串**，否则抛 `SYNTAX_ERR`（这是它唯一会抛异常的情况）。

**⑦ `( )`** —— 调用运算符，括号里是参数。

**⑧ `'#username'`** —— 一个字符串，内容是 **CSS 选择器**。

- `#` 是 CSS 的 **id 选择器**前缀。
- ⚠️ **`#` 不能省**：`querySelector('username')` 会被当成**标签名**选择器，去找 `<username>` 标签 → 几乎必然 `null`。
- 必须加**引号**（选择器是字符串）。
- 对比：`getElementById('username')` 才是不带 `#` 的那个 —— 因为它名字里就写了 `ById`。

**⑨ `;`** —— 语句结束符。JS 里可省（浏览器自动补），但建议写。

### 整句翻译

> 声明一个名叫 `username` 的常量，把「当前页面里 id 为 `username` 的第一个元素」这个对象的引用交给它。

### 这个「名字」后面可能装的是什么

| 情况 | `username` 的值 | 下一行会怎样 |
|---|---|---|
| 找到了 | `Element` 对象 | `username.innerText = '...'` 正常生效 |
| 没找到（选择器写错 / 元素还没渲染） | `null` | 报 `TypeError: Cannot read properties of null` |

---

==二：格式==

**骨架**

```js
const 变量名 = document.querySelector('CSS选择器字符串');
```

**三种常见变体**

```js
const el   = document.querySelector('.box');    // 抓一个；找不到 → null
const list = document.querySelectorAll('li');   // 抓一堆；返回伪数组，不是真数组
const item = el.querySelector('span');          // 在 el 的后代里找（范围不同，写法相同）
```

**成对记忆：别忘了 `#` 和 `.`**

| 想找什么 | 正确写法 | 典型错法 |
|---|---|---|
| id 是 `box` | `querySelector('#box')` | `getElementById('#box')` |
| class 是 `box` | `querySelector('.box')` | `getElementById('box')` |
| 标签 `div` | `querySelector('div')` | `querySelector('#div')` |

---

==三：代码==

### 把这一行放进一个能跑的页面

```html
<!DOCTYPE html>
<html>
<body>
  <p id="username">原来的文字</p>

  <script>
    // ① 这一行本身
    const username = document.querySelector('#username');
    console.log(username);            // <p id="username">原来的文字</p>

    // ② 证明它是「引用」不是「副本」：改它 = 改页面
    username.innerText = '改过了';
    console.log(document.querySelector('#username').innerText);   // 改过了

    // ③ 三种把人坑哭的写法
    console.log(document.querySelector('username'));    // null —— 少了 #
    console.log(document.querySelector('#userName'));   // null —— 大小写不匹配
    console.log(document.querySelector('.username'));   // null —— 它是 id，不是 class

    // ④ 引用语义：两个名字指向同一个元素
    let a = username;
    a.innerText = 'a 改的';
    console.log(username.innerText);    // 'a 改的' —— 同一个对象
  </script>
</body>
</html>
```

### 故意造一次报错（这一课最值钱的 30 秒）

把 ③ 的第一行改成这样、取消注释：

```js
console.log(document.querySelector('username').innerText);
```

控制台会给你：

```
Uncaught TypeError: Cannot read properties of null (reading 'innerText')
```

**怎么读这行红字**：`querySelector('username')` 返回了 `null`，而在 `null` 上读 `.innerText` 是不可能的。

**见到它就按这个顺序排查**：
1. 选择器是不是少了 `#` 或 `.`？
2. 大小写对不对？
3. 元素是不是**还没渲染出来**（`<script>` 放在 `<head>` 里了）？

---

==四：总结==

### 1. 必须记住的 5 条

1. **`document` 是全局对象**，浏览器自动提供，代表当前页面（小写 = 实例；大写 `Document` = 类型）。
2. **`querySelector` 返回第一个匹配元素；找不到返回 `null`** —— **不抛异常**。C# 的 `First()` 会抛，这里统一是 `FirstOrDefault` 的行为。
3. **参数是字符串形式的 CSS 选择器**；`#` / `.` 不能省；只有非法选择器才抛 `SYNTAX_ERR`。
4. **`=` 交出去的是引用**，改元素属性就是改页面（对标 C# 引用类型赋值）。
5. **`const` 锁绑定不锁内容**，所以 `username.innerText = ...` 完全合法。

### 2. 三个要改掉的 C# 直觉

| C# 直觉 | JS 实际 |
|---|---|
| 找不到会抛异常 | 返回 `null`，等你下一行去炸 |
| 变量类型写死 | 变量能中途换类型（这行恰好存了个元素而已） |
| `readonly` 就等于冻结 | `const` 只锁「这个名字指向谁」 |

### 3. 自测三题（先自己想，再往下看答案）

1. `document.querySelector('box')` 会返回什么？为什么？
2. 把这一行的 `const` 换成 `let`，实际差别是什么？
3. `const el = document.querySelector('#x'); el.innerText = 'hi';` 这两行合不合法？为什么？

<br>

**答案**

1. `null`。少了 `#`，`box` 被当成**标签名**选择器，浏览器去找 `<username>` 那样的 `<box>` 标签 —— 页面里没有。
2. 只差一点：`el` 这个名字**之后能不能被重新赋值**（比如 `el = 另一个元素`）。`const` 不行。其余行为完全一样。
3. 合法。`const` 锁的是「`el` 这个名字指向谁」，不锁它指向的那个元素**对象的内容** —— 改属性是允许的。

### 4. 动手练习

页面上放三个 `<li class="item">`，用 `querySelector` 取到**第一个**，把它的文字改成「我是第一个」，用 F12 验证。
（进阶：再试试 `querySelectorAll('.item')` 拿到伪数组，用 `for` 循环把三个都改掉。）

### 5. 下一步

- 接着学：第 82 集「DOM 修改元素常见属性」
- 速查表：[`JS--DOM速查表-查询与改内容.md`](./JS--DOM速查表-查询与改内容.md)
- **有不清楚的地方直接问我。** 我是你的老师，可以随时追问任何细节 —— 别自己憋着。

---

**建议读一遍原文**：MDN [`document.querySelector()`](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelector)（含「转义特殊字符」一节，属 100% 一手资料）。
