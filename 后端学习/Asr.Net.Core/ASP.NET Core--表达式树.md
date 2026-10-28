==零：补充==

> **这一节回答三个问题：这功能为什么存在？没有它会怎样？你什么时候真的会用到它？**

## 它有解决什么问题

你写 `b => b.Price > 50` 的时候，其实写了一个**lambda 表达式**。编译器看到它，有两种翻译方式：

| 目标类型 | 编译成什么 | 能不能执行 | 能不能被"读懂" |
|---|---|---|---|
| `Func<Book, bool>` | 一段 **IL 方法**（委托） | ✅ 能直接 `func(book)` | ❌ 别人只能调用它，看不见里面写了什么 |
| `Expression<Func<Book, bool>>` | 一棵**对象树**（`BinaryExpression`、`MemberExpression`…） | ❌ 不能直接调用 | ✅ 可以遍历、改写、翻译 |

**问题就出在第二列的"能不能被读懂"。**

EF Core 要把你的 C# 代码变成 SQL。它不可能读 IL（那是编译后的机器级指令，还原成 `WHERE Price > 50` 几乎不可能）。它只能读**数据结构**——而表达式树就是"把你的 lambda 拆成一个个组件摆在你面前"：

```
b => b.Price > 50
        ↓ 被拆成
LambdaExpression
  └── GreaterThan (BinaryExpression)
        ├── MemberAccess  → ParameterExpression("b").Price
        └── Constant      → 50
```

有了这棵树，EF 才能从左到右看一遍，然后拼出：

```sql
WHERE [b].[Price] > 50.0
```

**这就是表达式树的全部意义：把"代码"变成"可以被程序检视的数据"。** 没有它，ORM 只能做"表名和类名的映射"，做不了"把任意 LINQ 翻译成 SQL"。

## 没有它会怎样

这不是一个"可选的高级特性"，你每天都在用它，只是没意识到：

| 你写的代码 | 背后要的是什么 |
|---|---|
| `_ctx.Books.Where(b => b.Price > 50)` | `Queryable.Where(IQueryable, Expression<Func<T,bool>>)` |
| `_ctx.Books.OrderBy(b => b.Title)` | 同样参数是 `Expression<Func<T,TKey>>` |
| `_ctx.Books.Select(b => new { b.Id, b.Title })` | `Expression<Func<T,TResult>>` |
| `_ctx.Books.Include(b => b.Author)` | `Expression<Func<T,object>>` |

**如果这些参数换成 `Func`**，编译器会用 `Enumerable.Where`，行为立刻变成：**把整张表读进内存，然后在内存里过滤**。不报错、不警告、结果还正确——只是慢了三个数量级。这是最阴险的一类 bug。

所以表达式树的第一个实际用途是：**让你看得懂"为什么这里慢了"**。凡是 `IQueryable` 链上的方法，参数几乎全是 `Expression<...>`；一旦你看到 `AsEnumerable()` 或者误传 `Func`，链条就断了，SQL 就没了。

## 它在整个生态里的位置

表达式树不是 EF 专属的玩具，它是 .NET 里"元编程"的公共基础设施：

| 库 | 用表达式树干什么 |
|---|---|
| **EF Core / LINQ to SQL** | 把 LINQ 翻译成 SQL |
| **LinqKit（PredicateBuilder）** | 动态拼接查询条件（本篇 P93 手写它的核心） |
| **AutoMapper** | `CreateMap<Book, BookDto>()` 内部用表达式树生成映射代码 |
| **FluentValidation / 各种校验框架** | `RuleFor(x => x.Title).NotEmpty()` 靠表达式树拿到属性名 |
| **ASP.NET Core 的模型绑定** | `[FromBody]` 的部分校验、`TryValidateModel` |
| **MongoDB .NET Driver** | 把 LINQ 翻译成 BSON 查询 |
| **Mock 框架（Moq）** | `mock.Setup(x => x.Get(1))` 记录"调用时该匹配什么参数" |

## 对你的实际意义

**第一，它是面试高频题。** "`Expression<Func<T>>` 和 `Func<T>` 有什么区别"几乎是 EF 岗位的必问项，标准答案是"一个是数据结构、一个是可执行委托"。本篇 P90 就是把这个答案展开。

**第二，它能解释你以后会遇到的报错。** 比如：

```
System.InvalidOperationException: The LINQ expression 'b => b.Title.Contains(__keyword_0)'
could not be translated. Either rewrite the query in a form that can be translated...
```

看到这种错误，如果你知道"EF 是遍历表达式树找可翻译的节点"，就明白问题出在"某个节点它不认识"，而不是"EF 坏了"。

**第三，动态查询的边界在哪里，你得心里有数。** P94–P95 会讲"按前端条件动态拼查询"，而 P96 会告诉你：**90% 的这类需求，用 `if` 拼 `IQueryable` 就够了，根本不需要手搓表达式树。** 手搓是最后手段，不是首选。

## 诚实的话

这一批（P90–P96）内容偏"底层"，你在日常业务里**几乎不会**手写 `Expression.Parameter`。

那为什么还要学？

因为它是一把标尺：**它告诉你 LINQ 的能力边界在哪**。你知道 `Where` 的参数是表达式树，就明白了为什么 `Where(b => MyHelper(b))` 翻译不了、为什么 `Where(b => b.Price > localVar)` 可以（变量被捕获成常量）、为什么 `AsEnumerable()` 之后一切都变成内存操作。

这些判断力，比会背 `Expression.Call` 的签名值钱得多。

---

==一：概念==

> 本篇覆盖 **P90–P96**：表达式树的全部内容——它是什么、怎么看、怎么造、怎么简化、怎么动态化、以及**为什么最好别造**。
> 环境：练习项目 **.NET 10 / EF Core 10.0.13 / SqlServer / LocalDB `BookDemo`**，实体 `Book`，DTO `BookListItem`。
> 承接：P72（IEnumerable vs IQueryable）讲的是"接口不同"，这一批讲的是**"为什么接口必须不同"**。

---

# P90　什么是表达式树，Expression 和 Func 的区别

**一句话：`Func` 是"能执行的代码"，`Expression<Func>` 是"描述这段代码的数据结构"，前者是黑盒，后者可以拆开看、改、翻译。**

## 同一行 lambda，两种命运

```csharp
Func<Book, bool> func = b => b.Price > 50;
Expression<Func<Book, bool>> expr = b => b.Price > 50;
```

**长得一模一样，编译结果完全不同：**

| | `Func<Book,bool>` | `Expression<Func<Book,bool>>` |
|---|---|---|
| 本质 | 委托，指向一个编译器生成的**方法** | 一棵由 `Expression` 对象组成的**树** |
| 能不能调用 | `func(book)` ✅ | `expr(book)` ❌ 编译不过（它没有 `Invoke` 语义） |
| 想执行怎么办 | 直接调 | `expr.Compile()(book)`（先编译成委托，有开销） |
| 能不能打印出内容 | ❌（`ToString()` 只给类型名） | ✅ `expr.ToString()` → `b => (b.Price > 50)` |
| 能不能被程序分析 | ❌ 是 IL，无法还原语义 | ✅ 遍历 `NodeType`、`Body`、`Parameters` |
| 谁需要它 | `Enumerable.Where`（LINQ to Objects） | `Queryable.Where`（EF、LINQ to SQL） |

> **`Compile()` 是把树变回委托的唯一方式**，代价是一次动态编译（毫秒级）。所以表达式树"能执行"是假象——它得先变回代码。EF 从来不需要执行它，EF 只需要读它。

## 为什么 EF 只能用表达式树

EF Core 拿到 `Expression<Func<Book,bool>>` 之后做的事，本质是**树的遍历 + 模式匹配**：

| 树节点 | EF 翻译成 |
|---|---|
| `ParameterExpression("b")` | 表别名 `[b]` |
| `MemberExpression(b, "Price")` | 列 `[b].[Price]` |
| `ConstantExpression(50)` | 参数 `@__p_0` |
| `BinaryExpression(GreaterThan)` | `>` |
| `MethodCallExpression(string.Contains)` | `LIKE '%...%'` |
| `BinaryExpression(AndAlso)` | `AND` |

**这张对照表就是"LINQ to SQL"的全部秘密。** 树上的每个节点类型都有对应的翻译规则；遇到没有规则的（比如你自己的方法 `MyHelper(b)`），就抛"could not be translated"。

## 接口的分水岭（P72 的另一面）

```csharp
// IEnumerable<T> 上的 Where —— 参数是 Func
public static IEnumerable<T> Where<T>(this IEnumerable<T> source, Func<T, bool> predicate);

// IQueryable<T> 上的 Where —— 参数是 Expression
public static IQueryable<T> Where<T>(this IQueryable<T> source, Expression<Func<T, bool>> predicate);
```

**参数类型的不同，是"能不能翻译成 SQL"的技术根因。** 不是设计者随便选的——`Enumerable` 要执行，所以收委托；`Queryable` 要翻译，所以收表达式树。

## 一个必须亲手踩的坑：传 `Func` 不报错，但会全表加载

```csharp
Func<Book, bool> func = b => b.Price > 50;

var bad = _ctx.Books.Where(func).ToList();     // ← 编译通过！
// 注意这里不能写 .ToListAsync()：返回类型已经变成 IEnumerable<Book> 了
```

为什么？因为 `DbSet<Book>` **同时实现了 `IQueryable<Book>` 和 `IEnumerable<Book>`**。`func` 是 `Func`，匹配不上 `Queryable.Where` 的 `Expression` 参数，编译器就退而求其次选了 `Enumerable.Where`。

结果：**EF 发一条不带 `WHERE` 的 `SELECT * FROM Books`，把整张表读进内存，再在内存里过滤。**

**而且没有任何警告。** EF 的"禁止客户端评估"机制管不到这里——因为你压根没走 `Queryable` 管道，EF 根本不知道自己被绕过了。

这就是本篇开头说的"最阴险的 bug"：结果正确、日志里有 SQL、只是慢。对比一下：

| 写法 | 生成的 SQL | 内存 |
|---|---|---|
| `Where(b => b.Price > 50)` | `SELECT ... WHERE [Price] > 50.0` | 只有匹配的行 |
| `Where(func)` | `SELECT ...`（**没有 WHERE**） | **整张表 + 全部跟踪** |

---

# P91　查看表达式树的结构

**一句话：把树打出来看一遍，比看十页文档管用——`NodeType` 告诉你"这是个什么操作"，`ToString()` 告诉你"它长什么样"。**

## `Expression` 家族的层级

```
Expression（抽象基类）
├── LambdaExpression        整棵树的根：参数 + 体
│   └── Expression<TDelegate>
├── BinaryExpression        二元运算：>、==、&&、+
├── MemberExpression        访问成员：b.Price、b.Author.Name
├── ConstantExpression      常量：50、"C#"
├── ParameterExpression     参数：b
├── MethodCallExpression    方法调用：b.Title.Contains("x")
├── UnaryExpression         一元运算：!x、类型转换 Convert
├── NewExpression           new 对象
├── MemberInitExpression    new 对象 + 属性赋值（动态投影用这个）
└── ...
```

## 三个最常用的成员

```csharp
Expression<Func<Book, bool>> expr = b => b.Price > 50 && b.Title.Contains("C#");

expr.NodeType        // Lambda
expr.Body            // 整棵 "((b.Price > 50) AndAlso b.Title.Contains("C#"))" 子树
expr.Parameters[0]   // ParameterExpression，Name = "b"，Type = Book
expr.ToString()      // "b => ((b.Price > 50) AndAlso b.Title.Contains(\"C#\"))"
```

**`NodeType` 是翻译器的分派依据**，EF 里就是一串 `switch (node.NodeType)`。常用的几个值：

| `NodeType` | 对应 C# 写法 |
|---|---|
| `Lambda` | `b => ...` |
| `Parameter` | `b` |
| `MemberAccess` | `b.Price` |
| `Constant` | `50`、`"C#"` |
| `GreaterThan` / `LessThan` / `Equal` / `NotEqual` | `>`、`<`、`==`、`!=` |
| `AndAlso` / `OrElse` | `&&` / `\|\|`（**短路**，注意不是 `And`/`Or`） |
| `Call` | `b.Title.Contains("x")` |
| `Convert` | `(double)b.Id` 这种类型转换 |

## 用 `ExpressionVisitor` 把树打出来

`ExpressionVisitor` 是 .NET 内置的**树遍历器**：它对每种节点都有一个 `VisitXxx` 虚方法，你重写哪个就介入哪种节点。只在 `Visit` 上动手就能打印整棵树：

```csharp
public class TreePrinter : ExpressionVisitor
{
    private int _depth;

    public override Expression? Visit(Expression? node)      // ← Visit 是 public，不能写 protected
    {
        if (node is null) return null;

        Console.WriteLine($"{new string(' ', _depth * 2)}{node.NodeType,-16} : {node}");
        _depth++;
        var result = base.Visit(node);       // 继续往下走
        _depth--;
        return result;
    }
}
```

调用：`new TreePrinter().Visit(expr);`

```
Lambda           : b => ((b.Price > 50) AndAlso b.Title.Contains("C#"))
  AndAlso        : ((b.Price > 50) AndAlso b.Title.Contains("C#"))
    GreaterThan  : (b.Price > 50)
      MemberAccess : b.Price
        Parameter  : b
      Constant     : 50
    Call         : b.Title.Contains("C#")
      MemberAccess : b.Title
        Parameter  : b
      Constant     : "C#"
```

**这棵树就是 EF 看到的全部内容。** 你现在应该能理解为什么它能翻译成 SQL，也能猜到为什么自定义方法翻译不了——因为它的节点是 `Call`，而 `Call` 的翻译规则只认识一小撮已知方法（`string.Contains`、`Math.Abs`、`EF.Functions.Like`…），你自己的方法它不认识。

---

# P92　通过代码动态构造表达式树

**一句话：用 `Expression` 的工厂方法，一个节点一个节点把树搭起来。能跑，但写起来很痛苦——这一节的痛苦正是 P93 存在的理由。**

## 目标：拼出 `b => b.Title.Contains("C#") && b.Price > 50`

先看 C# 一行能写完的东西，用工厂方法要写多少：

```csharp
// ① 参数：b
var param = Expression.Parameter(typeof(Book), "b");

// ② b.Title
var titleProp = Expression.Property(param, nameof(Book.Title));

// ③ "C#"
var keywordConst = Expression.Constant("C#");

// ④ b.Title.Contains("C#")  ← 方法要拿 MethodInfo，还要指定参数类型
var containsMethod = typeof(string).GetMethod(nameof(string.Contains), new[] { typeof(string) })!;
var containsCall = Expression.Call(titleProp, containsMethod, keywordConst);

// ⑤ b.Price
var priceProp = Expression.Property(param, nameof(Book.Price));

// ⑥ 50.0  ← 注意：必须是 double，不能写 50（int）
var priceConst = Expression.Constant(50.0);

// ⑦ b.Price > 50.0
var greaterThan = Expression.GreaterThan(priceProp, priceConst);

// ⑧ 用 && 连起来
var andAlso = Expression.AndAlso(containsCall, greaterThan);

// ⑨ 包成 lambda
var lambda = Expression.Lambda<Func<Book, bool>>(andAlso, param);
```

**九步。** 对应的工厂方法：

| 想要 | 工厂方法 | 注意 |
|---|---|---|
| 参数 | `Expression.Parameter(type, name)` | `name` 只是显示用 |
| 属性 | `Expression.Property(param, "Price")` | 属性名是字符串，**没有编译期检查** |
| 常量 | `Expression.Constant(value)` | **类型必须精确匹配**，`50` 是 int，配 double 属性会抛异常 |
| 方法调用 | `Expression.Call(instance, methodInfo, args)` | `methodInfo` 要自己 `GetMethod`，参数类型数组也要写对 |
| 比较 | `Expression.GreaterThan / LessThan / Equal / NotEqual` | 两边类型必须一致，否则先 `Expression.Convert` |
| 逻辑 | `Expression.AndAlso / OrElse / Not` | 用 `AndAlso`（短路）不要用 `And`（不短路） |
| 包 lambda | `Expression.Lambda<TDelegate>(body, params)` | 泛型参数决定返回类型 |
| 类型转换 | `Expression.Convert(expr, targetType)` | 属性是 `long` 要比 `int`，先转 |

## 三个当场就会撞上的坑

**坑 1：类型必须一模一样**

```csharp
var priceConst = Expression.Constant(50);          // int
var gt = Expression.GreaterThan(priceProp, priceConst);
// InvalidOperationException: The binary operator GreaterThan is not defined
// for the types 'System.Double' and 'System.Int32'.
```

写成 `Expression.Constant(50.0)`，或者 `Expression.Convert(Expression.Constant(50), typeof(double))`。

**坑 2：`GetMethod` 可能返回 null**

`typeof(string).GetMethod("Contains", new[] { typeof(string) })` 在参数类型写错时返回 `null`，然后 `Expression.Call(null, ...)` 会抛一个很难懂的 `ArgumentNullException`。**这是表达式树最难调试的地方：错误发生的位置和出错的原因隔了很远。**

**坑 3：拼两个现成的 lambda 会炸**

```csharp
Expression<Func<Book, bool>> a = b => b.Price > 50;
Expression<Func<Book, bool>> c = b => b.Title.Contains("C#");

var bad = Expression.AndAlso(a.Body, c.Body);   // 运行时抛异常
```

原因：`a.Body` 里的 `b` 和 `c.Body` 里的 `b` 是**两个不同的 `ParameterExpression` 实例**（虽然名字都叫 "b"）。表达式树要求"参数必须在自己的作用域里"，拼在一起就变成"变量 b 未定义"。

**正确做法是先统一参数**——这就是 P93 要解决的核心问题。

---

# P93　让动态构建表达式树更简单

**一句话：写一个 `And` 扩展方法，内部用 `ExpressionVisitor` 把两个 lambda 的参数换成同一个，然后拼起来。这就是 LinqKit `PredicateBuilder` 的原理。**

## 先解决参数不一致

需要一个"把树里的参数 A 全换成参数 B"的访问器：

```csharp
public class ParameterReplacer : ExpressionVisitor
{
    private readonly ParameterExpression _from;
    private readonly ParameterExpression _to;

    public ParameterReplacer(ParameterExpression from, ParameterExpression to)
    {
        _from = from;
        _to = to;
    }

    protected override Expression VisitParameter(ParameterExpression node)
        => node == _from ? _to : base.VisitParameter(node);
}
```

> 关键在 `node == _from`：`ParameterExpression` 的 `==` 是**引用比较**（它没有重写 `Equals`），所以只有"同一个实例"才会被替换。这正是我们要的——名字相同但实例不同的参数，各自替换各自的。

## 再封装成 `And` / `Or`

```csharp
public static class ExpressionExtensions
{
    public static Expression<Func<T, bool>> And<T>(
        this Expression<Func<T, bool>> left,
        Expression<Func<T, bool>> right)
    {
        var param = Expression.Parameter(typeof(T), "x");        // 新的统一参数

        var leftBody  = new ParameterReplacer(left.Parameters[0],  param).Visit(left.Body)!;
        var rightBody = new ParameterReplacer(right.Parameters[0], param).Visit(right.Body)!;

        return Expression.Lambda<Func<T, bool>>(
            Expression.AndAlso(leftBody, rightBody), param);
    }

    public static Expression<Func<T, bool>> Or<T>(
        this Expression<Func<T, bool>> left,
        Expression<Func<T, bool>> right)
    {
        var param = Expression.Parameter(typeof(T), "x");
        var leftBody  = new ParameterReplacer(left.Parameters[0],  param).Visit(left.Body)!;
        var rightBody = new ParameterReplacer(right.Parameters[0], param).Visit(right.Body)!;
        return Expression.Lambda<Func<T, bool>>(
            Expression.OrElse(leftBody, rightBody), param);
    }
}
```

现在可以像拼字符串一样拼条件了：

```csharp
Expression<Func<Book, bool>> expr =
    ((Expression<Func<Book, bool>>)(b => b.Price > 50))
        .And(b => b.Title.Contains("C#"));
```

> 那个难看的强转是因为 `And` 是扩展方法，`b => ...` 单独写出来时编译器不知道要转成 `Expression` 还是 `Func`。实际用的时候通常从变量起步，不用强转。

## 为什么这不只是个语法糖

对比一下三件事的难度：

| 需求 | 手搓（P92） | 用 `And`（P93） |
|---|---|---|
| 加一个条件 | 8~9 行，要 `GetMethod`、要对齐类型 | 1 行 |
| 条件里带导航属性 `b.Author.Name` | 要 `Expression.Property(Expression.Property(param,"Author"),"Name")` | `b => b.Author.Name == "张三"` |
| 改成"或" | 改 `AndAlso` 为 `OrElse`，中间的树全不变 | `.Or(...)` |
| 出错时 | 报"参数类型不匹配"，不知道哪一步 | 通常就是 lambda 本身写错了 |

**`And` 的价值在于：你把"能写 C# 的地方"留给了 C#，只在"必须拼装"的地方用表达式树。** 这是 P96 观点的伏笔——能用 lambda 就别用工厂方法。

---

# P94　让动态构建表达式树"动态"起来

**一句话：把 `And` 放进 `if` 里，按请求参数一个一个往上叠。这就是"动态查询"——但要先想清楚，你是不是真的需要它。**

## 需求：一个万能的搜索接口

```csharp
[HttpGet("search")]
public async Task<ActionResult<object>> Search(
    string? keyword, double? minPrice, double? maxPrice, long? authorId)
{
    Expression<Func<Book, bool>> expr = b => true;          // 起点：永真

    if (!string.IsNullOrWhiteSpace(keyword))
        expr = expr.And(b => b.Title.Contains(keyword));

    if (minPrice.HasValue)
        expr = expr.And(b => b.Price >= minPrice.Value);

    if (maxPrice.HasValue)
        expr = expr.And(b => b.Price <= maxPrice.Value);

    if (authorId.HasValue)
        expr = expr.And(b => b.AuthorId == authorId.Value);

    var list = await _ctx.Books.Where(expr).Take(20).ToListAsync();
    return Ok(new { 条件数 = /* ... */, 条数 = list.Count, 数据 = list });
}
```

生成的 SQL 会**只带实际传了的条件**——这才是动态查询的核心价值：不是"在内存里筛",而是"**让 SQL 本身按需变化**"。

## 但是：同样的需求，`if` 拼 `IQueryable` 就够了

```csharp
var q = _ctx.Books.AsQueryable();

if (!string.IsNullOrWhiteSpace(keyword)) q = q.Where(b => b.Title.Contains(keyword));
if (minPrice.HasValue)                   q = q.Where(b => b.Price >= minPrice.Value);
if (maxPrice.HasValue)                   q = q.Where(b => b.Price <= maxPrice.Value);
if (authorId.HasValue)                   q = q.Where(b => b.AuthorId == authorId.Value);

var list = await q.Take(20).ToListAsync();
```

**完全等价，而且一行表达式树都没写。** 因为 `IQueryable` 本身是**累积的**：每次 `.Where(...)` 返回一个新的 `IQueryable`，条件会累加成 `WHERE ... AND ...`（这就是 P74 讲的"延迟执行"和 P75 讲的"可复用"）。

而且你已经用过这种方式了——`QueryController.GetBooks` 里的 `BuildQuery(...)` 就是 `if` 拼 `IQueryable`。

**那 P94 到底什么时候才用得上？**

| 场景 | 为什么必须用表达式树 |
|---|---|
| 通用仓储 `IRepository<T>.GetAsync(Expression<Func<T,bool>> where)` | 方法参数类型就是表达式，你只能传表达式 |
| 需要**先构造、后传递**（跨方法、跨层） | `IQueryable` 不好跨层传（它是查询对象，不是"条件"） |
| 组合已有的表达式变量（`And`/`Or`） | `IQueryable` 只能 `And`（连续 `.Where`），**不能 `Or`** |
| 把条件存起来复用（缓存/审计） | 表达式树是可序列化的数据 |

> **最容易踩的对比点：`IQueryable` 只能"且"，表达式树可以"或"。**
> 连续 `.Where(a).Where(b)` 等于 `a AND b`，想做 `a OR b` 只能 `q.Where(x => a(x) || b(x))` 一次写完——如果你的条件数是运行时决定的，就必须用表达式树拼 `OrElse`。

---

# P95　不用 Emit 生成 IL 代码实现 Select 的动态化

**一句话：动态投影（"前端要哪几列就只查哪几列"）以前要靠 `Reflection.Emit` 生成类型，现在用 `Expression.MemberInit` 就够了——但仍有边界。**

## 需求：只查用户要的列

前端传 `?fields=Id,Title`，后端只 `SELECT Id, Title`，不要 `Price` / `PubTime`。这在大表 + 大字段（比如 `Summary` 2000 字）的场景下是真实需求。

**难点在 `Select` 的签名**：

```csharp
public static IQueryable<TResult> Select<TSource, TResult>(
    this IQueryable<TSource> source,
    Expression<Func<TSource, TResult>> selector);
```

`TResult` 是**泛型参数**，编译期必须确定。你不能写"返回一个运行时才知道类型的东西"——除非用一个**预先定义的 DTO**。

## 正解：预定义 DTO + `MemberInit`

你项目里已经有 `BookListItem`（`Id` / `Title` / `Price` / `AuthorName` / `CategoryName`），正好当载体：

```csharp
[HttpGet("dynamic-select")]
public async Task<ActionResult<object>> DynamicSelect(string fields = "Id,Title")
{
    var wanted = fields.Split(',', StringSplitOptions.RemoveEmptyEntries)
                       .Select(f => f.Trim())
                       .ToHashSet(StringComparer.OrdinalIgnoreCase);

    var param = Expression.Parameter(typeof(Book), "b");

    var bindings = new List<MemberBinding>();
    foreach (var name in wanted)
    {
        var dtoProp = typeof(BookListItem).GetProperty(name);
        var srcProp = typeof(Book).GetProperty(name);
        if (dtoProp is null || srcProp is null) continue;      // 忽略非法字段

        bindings.Add(Expression.Bind(
            dtoProp,
            Expression.Property(param, srcProp)));              // Id = b.Id
    }

    var body = Expression.MemberInit(
        Expression.New(typeof(BookListItem)),                   // new BookListItem
        bindings);                                              // { Id = ..., Title = ... }

    var selector = Expression.Lambda<Func<Book, BookListItem>>(body, param);

    var list = await _ctx.Books.AsNoTracking().Select(selector).Take(5).ToListAsync();
    return Ok(list);
}
```

`?fields=Id,Title` 生成的 SQL：

```sql
SELECT TOP(5) [b].[Id], [b].[Title]
FROM [Books] AS [b]
```

**只查了两列。** 换成 `?fields=Id,Title,Price` 就多一列，SQL 跟着变——这就是"动态投影"。

## 关键节点：`MemberInit`

| 节点 | 对应 C# | 工厂方法 |
|---|---|---|
| `New` | `new BookListItem()` | `Expression.New(type)` |
| `MemberInit` | `new BookListItem { Id = b.Id, Title = b.Title }` | `Expression.MemberInit(newExpr, bindings)` |
| `Bind` | `Id = b.Id`（一条赋值） | `Expression.Bind(propertyInfo, valueExpr)` |

**`MemberInit` 是动态投影的标准姿势**，因为 EF 能把它翻译成"只 SELECT 这些列"，而不是"先全部查出来再赋值"。

## 为什么以前要用 Emit

如果 DTO 也**不能预定义**（比如"完全由用户配置决定字段"的内容管理平台），就得在运行时**动态创建类型**——那才需要 `Reflection.Emit` 去写 IL 定义一个新类。

| 方案 | 要 Emit 吗 | 代价 |
|---|---|---|
| 预定义 DTO + `MemberInit` | ❌ 不需要 | 字段集合是 DTO 属性的子集（够用 99%） |
| 运行时动态类型 | ✅ 需要 | 极难调试、无法静态检查、EF 未必能翻译、序列化还要额外配置 |
| 直接返回 `Dictionary<string,object>` | ❌ | EF Core 5+ 支持 `Select(b => new Dictionary<...>)` 有限，且丢失类型安全 |

**结论：除非你在做低代码平台，否则不要碰 Emit。** 杨中科这一节的重点其实是"别被 Emit 吓住，表达式树能解决大部分动态需求"。

---

# P96　尽量避免使用动态构建表达式树

**一句话：表达式树是"给框架作者用的 API"，不是"业务代码的日常工具"。能写 lambda 就别拼树。**

## 五条劝退理由

| 理由 | 具体表现 |
|---|---|
| **没有编译期检查** | 属性名写成 `"Prcie"`，编译通过，运行时抛异常 |
| **调试地狱** | 报错说"二元运算符参数不匹配"，但你不知道是哪一步拼错了 |
| **可读性崩塌** | 一段 `Expression.Call` 拼装代码，三个月后自己都看不懂 |
| **性能开销** | 构造树 + EF 翻译树，比直接用 lambda 慢（虽然通常可忽略） |
| **容易漏掉边界** | null 检查、类型转换、空集合——手搓时全靠自己记得 |

## 优先级的四层阶梯

**遇到"条件要动态"的需求，按这个顺序选，从上往下：**

| 优先级 | 方案 | 适用 |
|---|---|---|
| ① **`if` 拼 `IQueryable`** | `var q = _ctx.Books; if (...) q = q.Where(...);` | **90% 的场景**。只能"且"，够用 |
| ② **`EF.Property<T>(entity, "Name")`** | `q.Where(b => EF.Property<string>(b, fieldName) == value)` | 字段名是字符串变量，但不需要拼整棵树 |
| ③ **`And` / `Or` 扩展（P93）** | 需要"或"、或条件要跨层传递 | 通用仓储、复杂筛选器 |
| ④ **动态 LINQ（`System.Linq.Dynamic.Core`）** | `q.Where("Price > @0", 50)` | 字符串来自配置/前端，愿意承担注入风险 |
| ⑤ **手搓 `Expression` 工厂（P92）** | 上面都不行 | 框架层、极少 |

**`EF.Property` 值得单独说**，它是"按字符串访问属性"的官方逃生口：

```csharp
// 按前端传的字段名排序（不需要拼表达式树）
string sortField = "Price";
q = q.OrderBy(b => EF.Property<double>(b, sortField));

// 按字段名过滤
q = q.Where(b => EF.Property<string>(b, "Title").Contains("C#"));
```

它翻译成正常的 SQL 列引用，**类型不对会在运行时抛异常**（因为泛型参数是你指定的），但至少不用拼树。

## 什么时候"必须"用

| 场景 | 为什么绕不开 |
|---|---|
| 通用仓储 / 规约模式（Specification） | 方法签名就是 `Expression<Func<T,bool>>`，你只能造表达式 |
| 多租户 / 软删除的全局筛选器 | `HasQueryFilter(Expression<Func<T,bool>>)` 参数类型定死 |
| 动态 `Include`（按字符串路径） | 需要 `Expression<Func<T,object>>` |
| 需要 `OR` 组合的运行时可变量条件 | `IQueryable` 只能 `AND` |
| 表达式要缓存/序列化/跨进程传 | 树是数据，`IQueryable` 不是 |

## 一句话总结这一节

> **先问"我能不能用 `if` 拼出来"，能就别往下走。**
> 你在 `QueryController.BuildQuery` 里已经用对了——那就是最优解，不需要改。

---

==二：格式==

## P90　两种写法的声明与转换

```csharp
Func<Book, bool> func = b => b.Price > 50;                  // 委托
Expression<Func<Book, bool>> expr = b => b.Price > 50;      // 表达式树

Delegate d = expr.Compile();                                 // 树 → 委托
Func<Book, bool> f = expr.Compile();                         // 泛型版

Expression<Func<Book, bool>> back = Expression.Lambda<Func<Book, bool>>(expr.Body, expr.Parameters);
```

| 想做什么 | 写法 |
|---|---|
| 从 `Expression` 拿委托 | `expr.Compile()` |
| 从委托拿 `Expression` | **做不到**（IL 无法还原成树） |
| 判断参数类型 | `typeof(Expression<Func<Book,bool>>)` |

## P91　查看结构的三个入口

```csharp
expr.NodeType          // 根节点类型（几乎总是 Lambda）
expr.Body              // 树的主体
expr.Parameters        // 参数列表
expr.ToString()        // 人类可读的形式
```

**自定义遍历器的最小骨架**
```csharp
public class MyVisitor : ExpressionVisitor
{
    public override Expression? Visit(Expression? node)        // ← public，不是 protected
    {
        // 进来时：node 是当前节点
        var result = base.Visit(node);     // 继续往下
        // 出去时：result 是（可能被替换后的）节点
        return result;
    }

    // 只想处理某一种节点就重写对应的 VisitXxx
    protected override Expression VisitBinary(BinaryExpression node) { ... }
    protected override Expression VisitMember(MemberExpression node) { ... }
    protected override Expression VisitParameter(ParameterExpression node) { ... }
    protected override Expression VisitMethodCall(MethodCallExpression node) { ... }
}
```

## P92　工厂方法速查

| 想要 | 工厂方法 | 示例 |
|---|---|---|
| 参数 | `Expression.Parameter(type, name)` | `Expression.Parameter(typeof(Book), "b")` |
| 常量 | `Expression.Constant(value)` | `Expression.Constant(50.0)` |
| 属性 | `Expression.Property(instance, "Name")` | `Expression.Property(param, "Price")` |
| 字段 | `Expression.Field(instance, "name")` | 少见 |
| 方法调用 | `Expression.Call(instance, method, args)` | 见下 |
| 比较 | `Expression.Equal / NotEqual / GreaterThan / LessThan / GreaterThanOrEqual / LessThanOrEqual` | `Expression.GreaterThan(p, c)` |
| 逻辑 | `Expression.AndAlso / OrElse / Not` | `Expression.AndAlso(a, b)` |
| 算术 | `Expression.Add / Subtract / Multiply / Divide` | |
| 类型转换 | `Expression.Convert(expr, type)` | `Expression.Convert(x, typeof(double))` |
| 三元 | `Expression.Condition(test, ifTrue, ifFalse)` | 对应 `?:` |
| 数组/集合包含 | `Expression.Call(Enumerable.Contains...)` 或 `Expression.NewArrayInit` | 麻烦，优先用 `EF.Functions` |
| 组装 lambda | `Expression.Lambda<TDelegate>(body, params)` | `Expression.Lambda<Func<Book,bool>>(body, param)` |

**`GetMethod` 的安全写法**
```csharp
var mi = typeof(string).GetMethod(nameof(string.Contains), new[] { typeof(string) })
         ?? throw new InvalidOperationException("找不到 string.Contains(string)");
```

## P93　`And` / `Or` 扩展的完整签名

```csharp
public static Expression<Func<T, bool>> And<T>(this Expression<Func<T, bool>> left, Expression<Func<T, bool>> right);
public static Expression<Func<T, bool>> Or<T> (this Expression<Func<T, bool>> left, Expression<Func<T, bool>> right);
public static Expression<Func<T, bool>> Not<T>(this Expression<Func<T, bool>> expr);
```

| 现成的库 | 说明 |
|---|---|
| `LinqKit`（`PredicateBuilder`） | 最经典，`PredicateBuilder.New<T>()` + `.And()` / `.Or()`，还支持 `Expand()` |
| `System.Linq.Dynamic.Core` | 字符串转表达式：`q.Where("Price > @0", 50)` |
| `Sieve` / `OData` | 把 URL 查询参数自动转成表达式 |

> `LinqKit` 的 `Expand()` 是为了一种特殊情况：EF Core 3 之后，**"嵌套的表达式调用"**（在 lambda 里调另一个返回表达式的函数）默认不能翻译，要先 `Expand()` 把它摊平。你现在用 `And` 拼接是直接合并 body，不涉及这个问题。

## P94　动态拼接的两套写法对照

```csharp
// ① if 拼 IQueryable（首选，只能 AND）
var q = _ctx.Books.AsQueryable();
if (cond1) q = q.Where(...);
if (cond2) q = q.Where(...);

// ② 表达式树 + And（需要跨层传 / 需要 OR）
Expression<Func<Book, bool>> expr = b => true;
if (cond1) expr = expr.And(...);
if (cond2) expr = expr.And(...);
var list = await _ctx.Books.Where(expr).ToListAsync();
```

## P95　动态投影的三个节点

```csharp
var body = Expression.MemberInit(
    Expression.New(typeof(BookListItem)),
    Expression.Bind(dtoProp1, valueExpr1),
    Expression.Bind(dtoProp2, valueExpr2));

var selector = Expression.Lambda<Func<Book, BookListItem>>(body, param);
```

## P96　按字符串访问属性（不用拼树）

```csharp
using Microsoft.EntityFrameworkCore;      // EF.Property 在这个命名空间

q.Where(b => EF.Property<string>(b, fieldName) == value);
q.OrderBy(b => EF.Property<double>(b, sortField));
```

---

==三：代码==

**准备**：新建 `Controllers/ExpressionController.cs`，路由 `api/expr`。只需要注入 `BookContext`。
辅助类 `ExpressionExtensions` 和 `ParameterReplacer` 放 `Common/` 下。

## Step 1（P90）：同一行 lambda，两种命运

```csharp
[HttpGet("func-vs-expression")]
public ActionResult<object> FuncVsExpression()
{
    Func<Book, bool> func = b => b.Price > 50;
    Expression<Func<Book, bool>> expr = b => b.Price > 50;

    var book = new Book { Id = 1, Title = "测试", Price = 60 };

    return Ok(new
    {
        能直接调用 = func(book),                       // True
        表达式转字符串 = expr.ToString(),               // b => (b.Price > 50)
        Compile后才能调用 = expr.Compile()(book),       // True
        节点类型 = expr.NodeType.ToString(),            // Lambda
        参数名 = expr.Parameters[0].Name,               // "b"
        参数类型 = expr.Parameters[0].Type.Name         // Book
    });
}
```
```
{
  "能直接调用": true,
  "表达式转字符串": "b => (b.Price > 50)",
  "Compile后才能调用": true,
  "节点类型": "Lambda",
  "参数名": "b",
  "参数类型": "Book"
}
```

## Step 2（P90）：亲眼看到"传 Func 会全表加载"

```csharp
[HttpGet("func-trap")]
public ActionResult<object> FuncTrap()      // 注意：不是 async，因为链上已经没有异步方法了
{
    Func<Book, bool> func = b => b.Price > 50;

    var sw = System.Diagnostics.Stopwatch.StartNew();
    // 注意：这里不能再写 .ToListAsync()——Where(func) 返回的是 IEnumerable，
    // 只能同步 ToList()。这一点本身就是线索：它已经不在 IQueryable 世界了。
    var list = _ctx.Books.Where(func).ToList();
    sw.Stop();

    return Ok(new
    {
        条数 = list.Count,
        耗时毫秒 = sw.ElapsedMilliseconds,
        提醒 = "去日志里看 SQL，你会发现它没有 WHERE"
    });
}
```
日志：
```sql
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime],
       [b].[AuthorId], [b].[ReviewerId], [b].[CategoryId]
FROM [Books] AS [b]                     -- ← 没有 WHERE！
```

**这就是"能编译、结果对、但慢"的典型。** 对比一下正确写法：

```csharp
var good = await _ctx.Books.Where(b => b.Price > 50).ToListAsync();
```
```sql
SELECT ... FROM [Books] AS [b]
WHERE [b].[Price] > 50.0                -- ← 有 WHERE
```

> 注意：`Where(func)` 走的是 `Enumerable.Where`，**EF 的"客户端评估警告"不会触发**，因为整个查询根本没进 EF 的翻译管道。这类问题只能靠自己看 SQL 发现。

## Step 3（P91）：把树打印出来

**3.1 辅助类**
```csharp
// Common/TreePrinter.cs
using System.Linq.Expressions;

namespace ASP.NET_Core__图书管理系统.Common;

public class TreePrinter : ExpressionVisitor
{
    private int _depth;
    private readonly List<string> _lines = new();

    public override Expression? Visit(Expression? node)        // ← public，不是 protected
    {
        if (node is null) return null;
        _lines.Add($"{new string(' ', _depth * 2)}{node.NodeType,-16} : {node}");
        _depth++;
        var result = base.Visit(node);
        _depth--;
        return result;
    }

    public List<string> Print(Expression expr)
    {
        Visit(expr);
        return _lines;
    }
}
```

**3.2 接口**
```csharp
[HttpGet("tree")]
public ActionResult<object> Tree()
{
    Expression<Func<Book, bool>> expr = b => b.Price > 50 && b.Title.Contains("C#");
    var lines = new TreePrinter().Print(expr);
    return Ok(new { 表达式 = expr.ToString(), 树 = lines });
}
```
```
{
  "表达式": "b => ((b.Price > 50) AndAlso b.Title.Contains(\"C#\"))",
  "树": [
    "Lambda           : b => ((b.Price > 50) AndAlso b.Title.Contains(\"C#\"))",
    "  AndAlso        : ((b.Price > 50) AndAlso b.Title.Contains(\"C#\"))",
    "    GreaterThan  : (b.Price > 50)",
    "      MemberAccess : b.Price",
    "        Parameter  : b",
    "      Constant     : 50",
    "    Call         : b.Title.Contains(\"C#\")",
    "      MemberAccess : b.Title",
    "        Parameter  : b",
    "      Constant     : \"C#\""
  ]
}
```

**把 `Price` 改成 `Price.ToString()` 再看一次树**，你会看到节点从 `MemberAccess` 变成 `Call`，再想想 EF 认不认识 `double.ToString()`——这就是"为什么有些写法翻译不了"的答案。

## Step 4（P92）：手搓一遍，体会痛苦

```csharp
[HttpPost("hand-build")]
public async Task<ActionResult<object>> HandBuild()
{
    // 拼 b => b.Title.Contains("C#") && b.Price > 50
    var param = Expression.Parameter(typeof(Book), "b");

    var titleProp = Expression.Property(param, nameof(Book.Title));
    var containsMethod = typeof(string).GetMethod(nameof(string.Contains), new[] { typeof(string) })!;
    var containsCall = Expression.Call(titleProp, containsMethod, Expression.Constant("C#"));

    var priceProp = Expression.Property(param, nameof(Book.Price));
    var greaterThan = Expression.GreaterThan(priceProp, Expression.Constant(50.0));

    var body = Expression.AndAlso(containsCall, greaterThan);
    var lambda = Expression.Lambda<Func<Book, bool>>(body, param);

    var list = await _ctx.Books.AsNoTracking().Where(lambda).ToListAsync();

    return Ok(new { 表达式 = lambda.ToString(), 条数 = list.Count });
}
```
```
{ "表达式": "b => (b.Title.Contains(\"C#\") AndAlso (b.Price > 50.0))", "条数": 1 }
```
```sql
SELECT ... FROM [Books] AS [b]
WHERE [b].[Price] > 50.0 AND [b].[Title] LIKE N'%C#%'
```
> 注意 `Contains` 被翻译成了 **`LIKE`**——这就是"节点 → SQL"对照表在起作用。

**故意犯错一次**，把 `50.0` 改成 `50`：
```
InvalidOperationException: The binary operator GreaterThan is not defined for the types
'System.Double' and 'System.Int32'.
```
**这个异常信息不会告诉你是哪一行拼错了。** 这就是"调试地狱"的味道。

## Step 5（P93）：用 `And` 扩展，同样的事一行搞定

**5.1 参数替换器**
```csharp
// Common/ParameterReplacer.cs
using System.Linq.Expressions;

namespace ASP.NET_Core__图书管理系统.Common;

public class ParameterReplacer : ExpressionVisitor
{
    private readonly ParameterExpression _from;
    private readonly ParameterExpression _to;

    public ParameterReplacer(ParameterExpression from, ParameterExpression to)
    {
        _from = from;
        _to = to;
    }

    protected override Expression VisitParameter(ParameterExpression node)
        => node == _from ? _to : base.VisitParameter(node);
}
```

**5.2 `And` / `Or` 扩展**
```csharp
// Common/ExpressionExtensions.cs
using System.Linq.Expressions;

namespace ASP.NET_Core__图书管理系统.Common;

public static class ExpressionExtensions
{
    public static Expression<Func<T, bool>> And<T>(
        this Expression<Func<T, bool>> left, Expression<Func<T, bool>> right)
    {
        var param = Expression.Parameter(typeof(T), "x");
        var leftBody  = new ParameterReplacer(left.Parameters[0],  param).Visit(left.Body)!;
        var rightBody = new ParameterReplacer(right.Parameters[0], param).Visit(right.Body)!;
        return Expression.Lambda<Func<T, bool>>(Expression.AndAlso(leftBody, rightBody), param);
    }

    public static Expression<Func<T, bool>> Or<T>(
        this Expression<Func<T, bool>> left, Expression<Func<T, bool>> right)
    {
        var param = Expression.Parameter(typeof(T), "x");
        var leftBody  = new ParameterReplacer(left.Parameters[0],  param).Visit(left.Body)!;
        var rightBody = new ParameterReplacer(right.Parameters[0], param).Visit(right.Body)!;
        return Expression.Lambda<Func<T, bool>>(Expression.OrElse(leftBody, rightBody), param);
    }
}
```

**5.3 用起来**
```csharp
[HttpPost("and-build")]
public async Task<ActionResult<object>> AndBuild()
{
    Expression<Func<Book, bool>> expr = b => true;
    expr = expr.And(b => b.Price > 50);
    expr = expr.And(b => b.Title.Contains("C#"));

    var list = await _ctx.Books.AsNoTracking().Where(expr).ToListAsync();
    return Ok(new { 表达式 = expr.ToString(), 条数 = list.Count });
}
```
```sql
SELECT ... FROM [Books] AS [b]
WHERE [b].[Price] > 50.0 AND [b].[Title] LIKE N'%C#%'
```
**和 Step 4 手搓生成的 SQL 完全一样，代码从 9 行变成 2 行。**

## Step 6（P94）：动态查询，两种写法对比

**6.1 表达式树版**
```csharp
[HttpGet("search-expr")]
public async Task<ActionResult<object>> SearchExpr(
    string? keyword, double? minPrice, double? maxPrice, long? authorId)
{
    Expression<Func<Book, bool>> expr = b => true;
    int conditions = 0;

    if (!string.IsNullOrWhiteSpace(keyword))
    { expr = expr.And(b => b.Title.Contains(keyword)); conditions++; }

    if (minPrice.HasValue)
    { expr = expr.And(b => b.Price >= minPrice.Value); conditions++; }

    if (maxPrice.HasValue)
    { expr = expr.And(b => b.Price <= maxPrice.Value); conditions++; }

    if (authorId.HasValue)
    { expr = expr.And(b => b.AuthorId == authorId.Value); conditions++; }

    var list = await _ctx.Books.AsNoTracking().Where(expr).Take(20).ToListAsync();
    return Ok(new { 条件数 = conditions, 表达式 = expr.ToString(), 条数 = list.Count });
}
```

**6.2 `if` 拼 `IQueryable` 版**
```csharp
[HttpGet("search-iqueryable")]
public async Task<ActionResult<object>> SearchIQueryable(
    string? keyword, double? minPrice, double? maxPrice, long? authorId)
{
    var q = _ctx.Books.AsNoTracking();      // 已经是 IQueryable<Book>
    int conditions = 0;

    if (!string.IsNullOrWhiteSpace(keyword)) { q = q.Where(b => b.Title.Contains(keyword)); conditions++; }
    if (minPrice.HasValue) { q = q.Where(b => b.Price >= minPrice.Value); conditions++; }
    if (maxPrice.HasValue) { q = q.Where(b => b.Price <= maxPrice.Value); conditions++; }
    if (authorId.HasValue) { q = q.Where(b => b.AuthorId == authorId.Value); conditions++; }

    var list = await q.Take(20).ToListAsync();
    return Ok(new { 条件数 = conditions, 条数 = list.Count });
}
```

**两个接口的 SQL 应该完全一致。** 那为什么还要有 6.1？因为 6.2 有个硬伤：

```csharp
// 想要 "价格<20 或者 价格>200" —— IQueryable 拼不出来（连续 Where 只能 AND）
q = q.Where(b => b.Price < 20);
q = q.Where(b => b.Price > 200);     // 结果：空集（小于20 且 大于200）

// 表达式树可以
expr = expr.Or(b => b.Price < 20).Or(b => b.Price > 200);
```

**这就是 P94 的真正价值：不是"能动态",而是"能表达 OR"。**

## Step 7（P95）：动态投影，只查要的列

```csharp
[HttpGet("dynamic-select")]
public async Task<ActionResult<object>> DynamicSelect(string fields = "Id,Title")
{
    var wanted = fields.Split(',', StringSplitOptions.RemoveEmptyEntries)
                       .Select(f => f.Trim())
                       .ToHashSet(StringComparer.OrdinalIgnoreCase);

    var param = Expression.Parameter(typeof(Book), "b");
    var bindings = new List<MemberBinding>();
    var used = new List<string>();

    foreach (var name in wanted)
    {
        var dtoProp = typeof(BookListItem).GetProperty(name);
        var srcProp = typeof(Book).GetProperty(name);
        if (dtoProp is null || srcProp is null) continue;

        bindings.Add(Expression.Bind(dtoProp, Expression.Property(param, srcProp)));
        used.Add(name);
    }

    if (bindings.Count == 0)
        return BadRequest(new { 说明 = "没有合法字段" });

    var body = Expression.MemberInit(Expression.New(typeof(BookListItem)), bindings);
    var selector = Expression.Lambda<Func<Book, BookListItem>>(body, param);

    var list = await _ctx.Books.AsNoTracking().Select(selector).Take(5).ToListAsync();

    return Ok(new { 选用字段 = used, 条数 = list.Count, 数据 = list });
}
```

`?fields=Id,Title`：
```sql
SELECT TOP(5) [b].[Id], [b].[Title]
FROM [Books] AS [b]
```

`?fields=Id,Title,Price`：
```sql
SELECT TOP(5) [b].[Id], [b].[Title], [b].[Price]
FROM [Books] AS [b]
```

**注意没被选中的列真的没查。** 这在 `Summary` 有 2000 字符的时候能省掉大量 IO。

## Step 8（P96）：`EF.Property` —— 大部分"动态字段"其实不需要表达式树

```csharp
[HttpGet("ef-property")]
public async Task<ActionResult<object>> EfProperty(string field = "Price", string? keyword = null)
{
    var q = _ctx.Books.AsNoTracking();      // 已经是 IQueryable<Book>

    // 按字符串排序（不用拼树）
    if (field.Equals("Price", StringComparison.OrdinalIgnoreCase))
        q = q.OrderByDescending(b => EF.Property<double>(b, "Price"));
    else if (field.Equals("Title", StringComparison.OrdinalIgnoreCase))
        q = q.OrderBy(b => EF.Property<string>(b, "Title"));
    else
        q = q.OrderBy(b => b.Id);

    var list = await q.Take(5).ToListAsync();
    return Ok(new { 排序字段 = field, 数据 = list.Select(b => new { b.Id, b.Title, b.Price }) });
}
```
```sql
SELECT TOP(5) ... FROM [Books] AS [b]
ORDER BY [b].[Price] DESC
```

> `EF.Property<T>(entity, "Name")` 的 `T` 是**你声明**的，写成 `EF.Property<string>(b, "Price")` 能编译通过，但运行时 EF 会抛"类型不匹配"。
> 它比手搓表达式树简单，但比 lambda 危险——**能用 lambda 就别用它**。

## Step 9（P96）：一张表决定"要不要拼树"

跑完上面 8 步，你应该能自己判断了。遇到"查询要动态"时，按这个顺序问自己：

| 问题 | 答案 | 方案 |
|---|---|---|
| 条件之间只有"且"吗？ | 是 | **`if` 拼 `IQueryable`，收工** |
| 条件要"或"，但数量固定 | 是 | `q.Where(b => a \|\| b)` 一次写完 |
| 条件要"或"，且数量运行时才知道 | 是 | `And`/`Or` 扩展（P93） |
| 只是字段名是变量（排序/过滤） | 是 | `EF.Property` |
| 条件要缓存/跨层传/存数据库 | 是 | 表达式树（`And` 扩展） |
| 上面都不是 | — | 别拼树 |

---

==四：总结==

**七节一页速查**

| 节 | 一句话结论 | 关键 API |
|---|---|---|
| **P90** 是什么 | `Func` 是可执行代码，`Expression<Func>` 是可检视的数据结构；EF 只能读后者 | `Expression<T>` / `Compile()` |
| **P91** 看结构 | 树由 `NodeType` 标识，`ExpressionVisitor` 递归遍历 | `NodeType` / `ExpressionVisitor` |
| **P92** 手动构造 | `Parameter` / `Property` / `Constant` / `Call` / `AndAlso` / `Lambda` 九步拼一棵树 | `Expression.*` 工厂方法 |
| **P93** 简化 | `And`/`Or` 扩展 + 参数替换，把九步变一行 | `ExpressionVisitor.VisitParameter` |
| **P94** 动态化 | 按请求条件叠 `And`；但 **只能"且"的需求用 `if` 拼 `IQueryable` 就够** | 同上 |
| **P95** 动态投影 | 预定义 DTO + `MemberInit`，实现"只查要的列" | `Expression.New` / `MemberInit` / `Bind` |
| **P96** 别用 | 表达式树是给框架作者用的；业务代码优先 `if` + `IQueryable` + `EF.Property` | `EF.Property<T>` |

**五种"动态查询"方案的优先级**

| 优先级 | 方案 | 能表达 OR | 编译期检查 | 推荐度 |
|---|---|---|---|---|
| ① | `if` 拼 `IQueryable` | ❌ | ✅ | ★★★★★ |
| ② | `q.Where(b => a \|\| b)` 一次写完 | ✅（固定数量） | ✅ | ★★★★★ |
| ③ | `EF.Property<T>` 按字符串取字段 | — | ❌ | ★★★ |
| ④ | `And`/`Or` 扩展（P93） | ✅ | 部分 | ★★★ |
| ⑤ | 手搓 `Expression` 工厂（P92） | ✅ | ❌ | ★ |

**八个易错点**

1. **给 `Queryable` 传 `Func`** → 编译通过，走 `Enumerable.Where`，全表进内存，**没有警告**。
2. **`Expression.Constant(50)` 配 `double` 属性** → "binary operator not defined for Double and Int32"，错误信息不指出哪一行。
3. **`GetMethod` 返回 null 不检查** → `Expression.Call(null, ...)` 抛一个看不出原因的 `ArgumentNullException`。
4. **直接 `Expression.AndAlso(a.Body, b.Body)`** → 两个 `ParameterExpression` 不是同一实例，运行时报"参数不在作用域"。必须先用 `ParameterReplacer` 统一。
5. **`Expression.And` 代替 `AndAlso`** → 不短路，`b.Author.Name != null && b.Author.Name.Length > 0` 这种写法会空引用。
6. **`MemberInit` 里绑定的属性不在 DTO 上** → `Expression.Bind` 抛"属性不属于该类型"。
7. **`EF.Property<string>(b, "Price")`** → 泛型参数写错能编译，运行时报类型不匹配。
8. **在 lambda 里调自己的方法**（`Where(b => MyCheck(b))`）→ 翻译不了；要么改成内联表达式，要么 `AsEnumerable()`（然后全表进内存）。

**记忆口诀**

> **`Func` 是能跑的代码，`Expression` 是能被读的代码；EF 读不懂 IL，所以它只要后者。**
> **`Where` 收 `Expression` 还是 `Func`，决定了它是发 SQL 还是读全表——而且用错了不报错。**
> **树就是节点：`Parameter` 是变量、`MemberAccess` 是列、`Constant` 是参数值、`Binary` 是运算符、`Call` 是函数。**
> **手搓一棵树要九步，每步都可能错；所以能写 lambda 就别用工厂方法。**
> **拼两棵树的第一个坑永远是参数：名字都叫 b，实例不是同一个，必须先替换再合并。**
> **`And` 扩展的真正价值不是"能动态",是"能表达 OR"——`IQueryable` 连续 `Where` 只能"且"。**
> **动态投影靠 `MemberInit` 不是靠 Emit：DTO 预定义好，字段用哪几个运行时决定。**
> **最后一句：90% 的"动态查询"用 `if` 拼 `IQueryable` 就完了，剩下的 10% 里大部分用 `EF.Property`。真需要拼树的场景，比你想的少得多。**
