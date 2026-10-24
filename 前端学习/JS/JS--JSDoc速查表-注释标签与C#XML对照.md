# JSDoc 速查 · 注释标签与 C# XML 对照

> 定位：这套东西**不是 JavaScript 的语言特性**，是一套「写在注释里的约定」。
> 与 C# 的关系：**JSDoc ≈ C# 的 `///` XML 文档注释**，一个标签对一条 XML 标签，几乎是照着做的。
> 权威来源：jsdoc.app（JSDoc 3 官方站）+ TypeScript 官方「JSDoc 支持」文档（TS 是 JSDoc 事实上的第二个消费者，VS Code 的智能提示就走它）。

---

## 1. 先立一句话：它是什么，不是什么

**是**：一种结构化注释，让**编辑器**能给你补全、参数名、悬停说明；让**文档工具**能生成 API 文档。

**不是**：

| 你以为它管 | 实际它不管 |
|---|---|
| 传错类型会报错 | ❌ 运行期完全不检查，传字符串给 `{number}` 照跑 |
| `@private` 能挡住访问 | ❌ 运行时照样 `obj._secret` 拿得到 |
| `@readonly` 能防改 | ❌ 赋值照样成功（要真防只能 `Object.freeze`） |
| `@deprecated` 会拦住调用 | ❌ 只是编辑器画删除线，CI 不拦 |

**根因**：C# 的 `private` / `readonly` / `[Obsolete]` 是**编译器**在执行；JS **没有编译器**，浏览器也不读注释。

> ⭐ 所以：**这 17 个标签，没有一个在运行时生效。** 管事的只有编辑器和文档生成器。

**唯一能让它"开始管事"的开关**见 §5（`// @ts-check`）。

---

## 2. 一个完整的 JSDoc 块长什么样

```js
/**
 * 按用户 id 查用户，找不到返回 null。
 * @param {number} id 用户 id，必须为正整数
 * @param {Object} [options] 可选参数（方括号 = 可选）
 * @param {boolean} [options.withRoles=false] 是否带出角色
 * @returns {Promise<User|null>} 用户对象；不存在时为 null
 * @throws {TypeError} id 不是数字时抛出
 * @example
 * const u = await findUser(1);
 * console.log(u.name);
 * @see https://example.com/docs/user
 * @since 1.2.0
 */
async function findUser(id, options) { /* ... */ }
```

**记住三条**：

- 开头必须 `/**` —— **两个星号**。一个星号 `/*` 是普通注释，编辑器不认。
- 每行以 ` * ` 开头（星号对齐，纯排版，但 JSDoc 解析器按行吃，别乱断）。
- 标签顺序惯例：描述 → `@param` → `@returns` → `@throws` → `@example` → `@see` → `@author/@since`。

---

## 3. 17 个标签 × C# XML 对照（主线表）

| # | JSDoc | 干什么 | C# XML / 语法对应 | ⚠️ 关键差异 |
|---|---|---|---|---|
| 1 | `@param {T} name 说明` | 参数类型 + 名称 + 说明 | `<param name="name">说明</param>` | C# 类型写在**签名**里，注释不必写类型；JSDoc 的 `{T}` 是**唯一**的类型来源 |
| 2 | `@returns {T} 说明` | 返回值类型 + 说明 | `<returns>说明</returns>` | 同上；无返回值写 `{void}`（对应 `void` / `Task`） |
| 3 | `@type {T}` | 给**变量/常量**标注类型 | `int x = 0;` 里的 `int` | JS 声明处没有位置写类型，只能靠这行补 |
| 4 | `@typedef {Object} Name` | 给自定义对象类型**起个名** | `class Name { }` / `record` / `interface` | ⚠️ 它**只活在注释里**：不能 `new`、`typeof` 拿不到、运行时不存在 |
| 5 | `@property {T} field 说明` | 描述 4 的字段 | class 里的属性声明 | 与 `@typedef` / `@namespace` 搭配使用；**单独写没意义** |
| 6 | `@callback Name` | 给**函数类型**起名 | `delegate` / `Func<T>` / `Action` | 等价于「`@typedef` 的函数版」；同样只在注释里 |
| 7 | `@template T` | 声明泛型类型参数 | `<T>` / `where T : class` | 声明在注释里，**实参靠调用处推断**；约束只能写近似形式 |
| 8 | `@deprecated 说明` | 标记已废弃 | `[Obsolete("说明")]` | C# 编译**直接给警告**；JSDoc 只有编辑器删除线，构建不拦 |
| 9 | `@example` | 用法示例（悬停时显示） | `<example>` | 完全一致，都只在文档里出现 |
| 10 | `@throws {T} 说明` | 可能抛出的异常 | `<exception cref="T">说明</exception>` | ⭐ **两个语言都没有受检异常** → 两边都是纯文档，谁也没法强制 |
| 11 | `@description` / `@desc` | 显式写描述 | `<summary>` | **同一标签的两个名字**（`@desc` 是缩写）。⚠️ 块开头第一段文字**本身**就是默认描述，显式写它通常是为了把描述放到标签后面，或写多段 |
| 12 | `@see 目标` | 相关链接 | `<seealso cref="X"/>` / `<see href="..."/>` | JSDoc 还能写 `{@link 目标}` 内联进说明文字里 |
| 13 | `@author 名字` | 作者 | `<author>` | 一致 |
| 14 | `@since 版本` | 起始版本 | ❌ **无标准对应**（惯例在 `<remarks>` 里手写） | C# 没有 since 标签，这是 JSDoc 更顺手的一处 |
| 15 | `@private` / `@public` | 可见性 | `private` / `public` | ⚠️⚠️ **完全不改变运行时可访问性**，只影响编辑器提示与文档输出。另外 `@public` 默认是**空操作**，要配 `--access public` 才生效 |
| 16 | `@readonly` | 只读 | `readonly` | ⚠️ 官方措辞是 "intended to be read-only"（**意图**）；赋值照成功 |
| 17 | `@enum {T}` | 枚举 | `enum` | JS 没有枚举。实际做法是 `Object.freeze({...})` 再用 `@enum` 标注；`@enum {string}` 在 TS 里更好用 |

### 3.1 再补 6 个高频（你表里没列，但一定会遇到）

| JSDoc | 一句话 | 备注 |
|---|---|---|
| `@param {...number} nums` | 剩余参数 | 对应 C# 的 `params int[]` |
| `@param {string} [name='无名']` | **可选参数**（方括号） | 方括号 = 可选，`=` 后写默认值。**最容易漏的语法** |
| `@augments Parent`（旧名 `@extends`） | 声明继承 | 对应 `class Child : Parent` |
| `@this {HTMLElement}` | 指定函数体里 `this` 的类型 | 呼应进阶篇第 14 轮「`this` 由调用方式决定」——这里是给编辑器一个**假定** |
| `@fileoverview` / `@module` | 文件级说明 | 写在文件**最顶上**，不属于任何函数 |
| `@type {import('./user.js').User}` | 从别的模块引类型 | 相当于 JSDoc 版的 `using` / `import` |

---

## 4. 类型表达式：`{...}` 里到底能写什么

| 想表达 | JSDoc 写法 | C# 对应 | 备注 |
|---|---|---|---|
| 数字 | `{number}` | `double` | ⭐ **JS 没有 int / double 之分**，全是一个数 |
| 字符串 | `{string}` | `string` | |
| 布尔 | `{boolean}` | `bool` | |
| 任意 | `{*}` | `object` / `dynamic` | 等于放弃检查 |
| 可空 | `{?string}` | `string?` | `?` 在**类型前**，允许 `null` |
| 非空 | `{!string}` | 无对应 | 表示一定不是 `null` |
| 联合类型 | `{(string\|number)}` | ❌ 无语言内对应 | JS 的常态，C# 得靠基类或 `object` |
| 字面量集合 | `{('left'\|'right')}` | `enum` | 做"只能取这几个值"最省事 |
| 数组 | `{string[]}` 或 `{Array<string>}` | `string[]` | |
| 数组的数组 | `{number[][]}` | `int[][]` | |
| 字典/映射 | `{Object<string, number>}` | `Dictionary<string, int>` | |
| 函数 | `{function(string): boolean}` | `Func<string, bool>` | |
| 箭头写法 | `{(a: number) => number}` | `Func<int, int>` | TS 语法，JSDoc 也吃 |
| 对象结构 | `{{name: string, age: number}}` | 匿名类型 `new { Name = ..., Age = ... }` | 一行临时描述，不打算复用 |
| 已命名的自定义类型 | `{User}`（先 `@typedef` 过） | `User` | |
| Promise | `{Promise<User>}` | `Task<User>` | ⭐ 名字都一样 |
| 无返回 | `{void}` | `void` | |
| 剩余参数 | `{...number}` | `params int[]` | 只能用在 `@param` |
| 指定 `this` | `{this:Window}` | ❌ 无对应 | |

---

## 5. ⭐ 唯一能让它"真的管事"的开关：`// @ts-check`

这是整份速查表**最该记住的一条**。

```js
// @ts-check          ← 文件第一行（必须是注释形式）
```

- 在 `.js` 文件顶上写这一行，VS Code 就会**按 TypeScript 的规则检查 JSDoc**：类型不匹配画红波浪线、`@deprecated` 划删除线、`@param` 个数对不上会提示。
- 等价做法：项目根放 `jsconfig.json`，里面 `{ "compilerOptions": { "checkJs": true } }`，全项目生效。
- **没有这个开关时**：JSDoc 只负责「悬停说明 + 参数名补全 + 类型提示」，**不做检查**。

> 换句话说：**JSDoc + `@ts-check` ≈ 一个不用改后缀名的 TypeScript**。
> 这也解释了为什么 TS 能无缝吃 JSDoc —— 它们本来就是同一个团队、同一个类型系统。

⚠️ 两个边界：
1. `@ts-check` 只是**编辑器/构建期**检查，浏览器里依旧没有类型。
2. 打包压缩（terser 等）**默认会把注释全删掉** → 上线产物里 JSDoc 一个字都不剩。所以它 100% 是开发期资产。

---

## 6. 五个坑

| 坑 | 后果 | 怎么防 |
|---|---|---|
| 写成 `/*` 而不是 `/**` | 编辑器完全当普通注释，所有标签失效（**不报错**） | 记住"两个星号才叫文档注释" |
| `@typedef` 了就当有类型 | 运行时 `User` 未定义 → `ReferenceError`（或者根本没这个变量） | 类型只用来写注释，**代码里永远别真去用它** |
| `@param` 名字和形参不一致 | 悬停时参数名对不上，`@ts-check` 下会报 | 改名时同步改注释；`@param` 顺序也应与形参一致 |
| `@private` 当访问控制 | 以为外部调不到，实际一调就通 | JS 真要私有：`#field` 私有字段 / 闭包 |
| `@readonly` 当不可变 | 以为改不了，实际能改 | 真要不可变：`Object.freeze()` / `const`（`const` 只锁绑定） |

**一句话**：所有"以为它拦住了"的地方，JS 都**静默通过** —— 又是那条暗线。

---

## 7. 什么时候写 / 写多少

**值得写**：

- 对外暴露的函数、方法（别人要调你）→ `@param` + `@returns`
- 形状固定的对象 → `@typedef` + `@property`（比一串散落的注释强得多）
- 会被多处复用的回调签名 → `@callback`
- 已经不用但还没删的 API → `@deprecated`（顺手写清替代方案）
- 有坑的边界（可能抛异常、失败返回 `null`）→ `@throws` / `@returns {T|null}`

**不必写**：

- 每个局部变量都标 `@type` —— 噪音
- 一目了然的小函数写三段说明 —— 噪音
- 注释重复代码本身（`@returns {number} 返回数字`）—— 负价值

**判断标准**（和 C# 完全一样）：**读代码的人能不能从签名看出它要什么、给什么、会炸在哪。** 看不出就写，看得出就别写。

---

## C# 类比可用度

| 环节 | 可用度 | 说明 |
|---|---|---|
| `/** */` ↔ `/// <summary>` | ⭐⭐⭐⭐⭐ | 心智完全一样：结构化注释、工具消费、不参与运行 |
| 17 个标签逐条对照 | ⭐⭐⭐⭐⭐ | 几乎一一对应，迁移几乎零成本 |
| `@param` / `@returns` | ⭐⭐⭐⭐ | 差别只在"C# 类型在签名、JS 类型在注释" |
| `@template` ↔ 泛型 | ⭐⭐⭐⭐ | 概念同源，但 JS 的约束写不出来、实参靠推断 |
| `@typedef` ↔ class | ⭐⭐ | ⚠️ **最大的错觉**：C# 的 class 是**真类型**（能 new、能反射、能当值传）；JSDoc 的 typedef 是**一段文字** |
| `@private` / `@readonly` | ⭐ | ⚠️ **反向迁移，必须掐断**：C# 里这两个词是**编译器在执行**，JS 里是**编辑器在画提示**。把 C# 的信任带过来，就是你被坑的那一瞬间 |
| `[Obsolete]` ↔ `@deprecated` | ⭐⭐ | C# 会**编译警告**（CI 能拦），JSDoc 只会画删除线 |
| `@throws` ↔ `<exception>` | ⭐⭐⭐⭐⭐ | 两个语言都**没有受检异常** → 都是纯文档，反而完全一致 |
| `@since` | ⭐⭐⭐⭐⭐ | C# 反而没有标准标签 |

**一句话带走**：

> **JSDoc 是「C# 的 `///` 注释」搬到了 JS，但它背后没有编译器。**
> 想让注释变成约束，加一行 `// @ts-check`；不想加，就别指望它拦住任何人。
