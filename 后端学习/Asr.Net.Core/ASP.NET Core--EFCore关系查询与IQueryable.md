==一：概念==

> 本篇覆盖 **P71–P75**：基于关系的复杂查询、IEnumerable 与 IQueryable 的分工、客户端评估、延迟执行、IQueryable 复用。
> 这五节是一条线，别拆开理解：**导航属性怎么用（71）→ 为什么能被翻译成 SQL（72）→ 翻译不了会怎样（73）→ 什么时候才真的发 SQL（74）→ 怎么把查询当模板反复用（75）。**

---

# P71　基于关系的复杂查询

**一句话**：`Include` 只决定"**带回内存哪些数据**"，`Where / OrderBy / Select` 里出现的导航属性会自动变成 `JOIN / EXISTS / 子查询` —— **过滤条件永远不需要 `Include`**。

这是新手最大的误区：以为"要根据作者名筛书，得先 `Include(b => b.Author)`"。不用。`Include` 加在 `Where` 前面，SQL 一点都不会少，只是多带回了整行作者数据。

```csharp
// 你以为要这样
var a = await ctx.Books.Include(b => b.Author)
                       .Where(b => b.Author.Name == "杨中科")
                       .ToListAsync();

// 其实这样完全一样，而且更快（不多查作者的书）
var b = await ctx.Books.Where(b => b.Author.Name == "杨中科").ToListAsync();
```

生成的 SQL：
```sql
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[AuthorId]
FROM [T_Books] AS [b]
INNER JOIN [T_Authors] AS [a] ON [b].[AuthorId] = [a].[Id]
WHERE [a].[Name] = N'杨中科'
```

**JOIN 的类型由外键可空性决定**（不是你能随手控制的）：

| 关系 | 生成的 JOIN | 后果 |
|---|---|---|
| 外键非空（`long AuthorId`） | `INNER JOIN` | 没有作者的书查不出来（本来也不可能存在） |
| 外键可空（`long? ReviewerId`） | `LEFT JOIN` | 没审稿人的书还在，`b.Reviewer.Name == "x"` 对它是 false |

---

**六种关系查询，六种翻译结果**

| 需求 | LINQ 写法 | 翻译成什么 SQL |
|---|---|---|
| 按对方的属性筛选（N→1） | `Where(b => b.Author.Name == "x")` | `INNER JOIN` + `WHERE` |
| 按对方的属性筛选（1→N） | `Where(a => a.Books.Any(b => b.Price > 50))` | `EXISTS (子查询)` |
| 按子集合的**数量**筛选 | `Where(b => b.Comments.Count > 1)` | `(SELECT COUNT(*) FROM ...) > 1` |
| 按子集合**为空**筛选 | `Where(b => !b.Comments.Any())` | `NOT EXISTS (...)` |
| 多对多筛选 | `Where(b => b.Tags.Any(t => t.Name == "C#"))` | `EXISTS` + 中间表 |
| 投影里带统计 | `Select(a => new { a.Name, Cnt = a.Books.Count() })` | 相关子查询（**不是** `GROUP BY`） |

> 注意最后一行：导航集合上的 `Count()` / `Sum()` 是"**每行算一次子查询**"，不是分组聚合。想用 `GROUP BY` 得写 `GroupBy()`（P76 之后讲）。
>
> 另一个高频点：`Select` 里只取需要的列（`new { b.Title, b.Author.Name }`）会生成**只 SELECT 两列的 SQL**，比 `Include` 拉整行小得多。**只读场景优先投影，而不是 Include。**

---

# P72　有了 IEnumerable 还要 IQueryable 干什么

**这是面试必考题，也是后面所有性能问题的根源。先记住一句话：**

> **`IEnumerable<T>` 拿着委托（`Func`），只能在内存里跑；`IQueryable<T>` 拿着表达式树（`Expression<Func>`），能读懂结构、翻译成 SQL。**

**委托 `Func` 与 表达式树 `Expression<Func>` 的差别**

```csharp
Func<Book, bool> f = b => b.Price > 50;                  // 编译后的 IL，只有 CPU 认得
Expression<Func<Book, bool>> e = b => b.Price > 50;      // 一棵数据结构，能拆开看
```

| 对比 | `Func<Book,bool>` | `Expression<Func<Book,bool>>` |
|---|---|---|
| 本质 | 一个方法指针（已编译的 IL） | 一棵树：`GreaterThan(MemberAccess(Price), Constant(50))` |
| 能读出"比较了哪个属性、和什么值比"吗 | 不能，IL 反解等于反编译 | 能，遍历 `Body.Left` / `Body.Right` 就行 |
| 谁在消费它 | 你的 CPU（`foreach` 里执行） | EF Core 的查询翻译器（生成 SQL） |
| 打个比方 | 一盘做好的菜 | 一张菜谱 |

EF Core 拿到菜谱，就知道"`Price` 对应 `[Price]` 列、`>` 对应 `>`、`50` 是个参数"，于是拼出 `WHERE [Price] > @p0`。你给它一盘菜，它只能吃，没法还原成菜谱。

**`IQueryable<T>` 继承自 `IEnumerable<T>`** —— 这是所有坑的源头：

```
IEnumerable<T>
  └── IQueryable<T>        ← 多了 Expression / Provider / ElementType 三个属性
```

所以 `IQueryable` 能赋给 `IEnumerable` 变量（编译期合法），但**扩展方法的选择看变量的静态类型**：

```csharp
IQueryable<Book> q = ctx.Books.Where(b => b.Price > 50);  // Queryable.Where → SQL 带 WHERE
IEnumerable<Book> e = ctx.Books;
e.Where(b => b.Price > 50);                               // Enumerable.Where → 全表拉回来再筛
```

编译器在 `IQueryable<T>` 变量上优先匹配 `Queryable.Where`（参数是 `Expression<>`，更具体）；在 `IEnumerable<T>` 变量上只能匹配 `Enumerable.Where`（参数是 `Func<>`）。**这一步在编译期就决定了，运行时无法挽回。**

**几个关键差异**

| 维度 | `IEnumerable<T>` | `IQueryable<T>` |
|---|---|---|
| 执行位置 | 客户端内存 | 数据库（首次遍历时） |
| 参数类型 | `Func<T,bool>` | `Expression<Func<T,bool>>` |
| `Where` 之后再 `Where` | 内存里多叠一层循环 | SQL 里多一个 `AND` |
| 能调用自定义 C# 方法吗 | 能 | **不能**（翻译不了就报错，P73） |
| 数据量 | 多少数据就搬多少到内存 | 只搬结果 |
| 分界线 | `AsEnumerable()` / `ToList()` / `AsQueryable()` | 同左（反向） |

> **`AsEnumerable()` 不执行查询**，它只是把类型换成 `IEnumerable`，让后续方法走 `Enumerable` 版本。真正执行发生在**第一次遍历**（`foreach` / `ToList`）时。所以 `ctx.Books.AsEnumerable().Where(...)` 的 SQL 是 `SELECT * FROM T_Books`（没有 WHERE），筛在内存里做。

---

# P73　客户端评估有时候也很可爱

**EF Core 3.0 起，"翻译不了就悄悄在内存里补一刀"的能力被取消了**，改成一刀切：**报错**。

错误原文长这样：
```
System.InvalidOperationException: The LINQ expression 'DbSet<Book>()
    .Where(b => __ToChineseNumber_0(b.Price) > 3)' could not be translated.
Either rewrite the query in a form that can be translated, or switch to client evaluation
explicitly by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable', 'ToList', or 'ToListAsync'.
```
**报错本身就是在教你**：要么改成能翻译的写法，要么明确写 `AsEnumerable()` 表示"我认了，剩下的在内存里做"。

**哪些"看起来像 C# 方法"的，其实能翻译**

| C# 写法 | 翻译成 |
|---|---|
| `b.Title.Contains("EF")` | `[Title] LIKE N'%EF%'` |
| `b.Title.StartsWith("C")` | `[Title] LIKE N'C%'` |
| `b.Title.ToLower() == "ef core"` | `LOWER([Title]) = N'ef core'` |
| `b.Title.Length > 5` | `LEN([Title]) > 5` |
| `Math.Abs(b.Price) > 10` | `ABS([Price]) > 10` |
| `b.PubTime.Year == 2026` | `DATEPART(year, [PubTime]) = 2026` |
| `new[] { 1, 2, 3 }.Contains(b.Id)` | `[Id] IN (1, 2, 3)` |
| `EF.Functions.Like(b.Title, "%EF%")` | `[Title] LIKE N'%EF%'`（显式要求走 LIKE） |

**哪些一定翻译不了**

| 写法 | 为什么 |
|---|---|
| 自定义静态方法 `MyHelper.Check(b.Title)` | EF 不认识这个方法，映射不到 SQL 函数 |
| 自定义扩展方法 `b.Title.IsValidPhone()` | 同上 |
| `b.GetHashCode() % 2 == 0` | 同上 |
| 正则 `Regex.IsMatch(b.Title, "^C")` | SQL Server 没有正则函数 |
| 引用"不可翻译"的第三方类型 | 同上 |

**"有时也很可爱"的场景**：最后一步确实需要 C# 逻辑（比如用正则、用复杂算法），这时候**先缩小、再拉到内存**：

```csharp
// 错：全表拉进内存，8 万条数据在客户端筛
var bad = ctx.Books.ToList().Where(b => Regex.IsMatch(b.Title, "^C#"));

// 对：先用 SQL 能表达的条件把范围压到最小，再内存处理
var good = ctx.Books.Where(b => b.Price > 50)
                    .AsEnumerable()          // 分界线：从这里开始客户端
                    .Where(b => Regex.IsMatch(b.Title, "^C#"))
                    .ToList();
```
**判断准则：`AsEnumerable()` 左边尽量"重"（用 SQL 条件砍掉绝大部分数据），右边才允许"任性"（用 C# 逻辑）。**

> `AsEnumerable()` 和 `ToList()` 在这里效果相似，差别是：`ToList()` 立刻查库并把结果装进 `List<T>`；`AsEnumerable()` 只换类型，查库推迟到真正遍历时。

---

# P74　IQueryable 的延迟执行

**`IQueryable` 描述的是"查询"，不是"结果"。定义它的时候一条 SQL 都不发。**

```csharp
var q = ctx.Books.Where(b => b.Price > 50);   // 此刻日志里没有任何 SQL
```

只有遇到**终结方法（terminal operator）**才真的查库：

| 类型 | 方法 | 说明 |
|---|---|---|
| 取集合 | `ToList` / `ToListAsync` / `ToArray` / `ToDictionary` | 全量物化 |
| 取单条 | `First` / `FirstOrDefault` / `Single` / `SingleOrDefault` / `FindAsync` | `First` 会加 `TOP(1)` |
| 算标量 | `Count` / `LongCount` / `Any` / `All` / `Sum` / `Max` / `Min` / `Average` | 只 SELECT 一个值 |
| 隐式执行 | `foreach` / `await foreach` | 遍历即执行 |
| 不是终结方法 | `Where` / `OrderBy` / `Select` / `Skip` / `Take` / `Include` / `GroupBy` | 只是往表达式树上加节点 |

**两个由延迟执行带来的坑**

**坑一：同一个 `IQueryable` 执行 N 次 = 发 N 条 SQL。**
```csharp
var q = ctx.Books.Where(b => b.Price > 50);
var cnt = q.Count();        // SQL #1：SELECT COUNT(*)
var list = q.ToList();      // SQL #2：SELECT ...
foreach (var b in q) { }    // SQL #3：SELECT ...（又来一遍）
```
日志里清清楚楚三条。**要复用结果就先 `ToList()` 拿到内存数据，别再重复枚举 `IQueryable`。**

**坑二：闭包变量在执行时才求值（延迟执行的时间差）。**
```csharp
double min = 50;
var q = ctx.Books.Where(b => b.Price > min);   // 表达式树里存的是"变量 min"，不是 50
min = 100;                                     // 改了个值
var list = q.ToList();                         // 真正执行时才读 min → 用 100
```
日志里参数是 `@__min_0='100'`。这就是"查询定义"和"查询执行"之间那段时间差带来的结果。写分页、写动态筛选时特别容易踩。

> 反过来利用它：延迟执行正是"条件可以随意叠加"的前提 —— 你可以在 `ToList()` 之前反复 `Where`，最后只发一条 SQL。

---

# P75　IQueryable 的复用

**`IQueryable` 可以当"查询模板"存起来，反复叠加条件、反复执行** —— 它不是一次性的数据容器，只是一棵可继续生长的表达式树。

```csharp
// 一个"查询骨架"
IQueryable<Book> BuildQuery(string? keyword, double? minPrice)
{
    var q = ctx.Books.AsQueryable();                    // 起点
    if (!string.IsNullOrWhiteSpace(keyword))
        q = q.Where(b => b.Title.Contains(keyword));
    if (minPrice.HasValue)
        q = q.Where(b => b.Price >= minPrice.Value);
    return q;
}

var q1 = BuildQuery("EF", null);            // WHERE Title LIKE '%EF%'
var q2 = BuildQuery(null, 50);              // WHERE Price >= 50
var q3 = BuildQuery("EF", 50);              // WHERE Title LIKE ... AND Price >= 50
```
**每个分支只往表达式树上加一个节点，最终拼成一条 SQL。**这就是分页、多条件筛选、后台管理列表的标准实现方式。

**复用时的五条纪律**

| 纪律 | 说明 |
|---|---|
| 分页放在**最后** | `Where` / `OrderBy` 全部加完之后再 `Skip` / `Take`，否则分的是"中间结果" |
| `Skip` 必须跟 `OrderBy` | 否则 SQL Server 的 `OFFSET` 没有排序依据，EF 会警告 `RowLimitingOperationWithoutOrderByWarning`，分页结果不稳定 |
| 复用 ≠ 缓存 | 执行两次就是两条 SQL，想要快照就 `ToList()` |
| 不能跨越 `DbContext` 生命周期 | `using` 结束再执行 → `ObjectDisposedException`（表达式树引用着已释放的上下文） |
| `Include` 可以叠加 | 重复 `Include` 同一个导航不会报错，但也别这么写 |

```csharp
// 页面 1 / 页面 2 共用同一个骨架
var page1 = await baseQuery.OrderBy(b => b.Id).Skip(0).Take(10).ToListAsync();
var page2 = await baseQuery.OrderBy(b => b.Id).Skip(10).Take(10).ToListAsync();
```

> 面试常追问："`IQueryable` 会不会把数据一次性都加载到内存？" —— **不会**。它本身只有表达式树和 Provider 引用，零数据。真正加载发生在终结方法。这个问题 P77 会单独再讲一遍（配上 `AsEnumerable()` 的对比）。

---

**本节新增符号逐个拆解**

| 符号 | 是什么 | 谁调用它 | 不写会怎样 |
|---|---|---|---|
| `IEnumerable<T>` | 接口：能被 `foreach` 遍历的序列，**内存数据** | `List<T>`、数组都实现它 | — |
| `IQueryable<T>` | 接口：**可翻译的查询描述**，继承 `IEnumerable<T>`，多出 `Expression`/`Provider`/`ElementType` | `DbSet<T>` 实现它 | 无法延迟执行、无法翻译 |
| `Expression<TDelegate>` | 泛型类：把 lambda 当**数据结构**而非代码 | `Queryable` 系列方法的参数 | 传 `Func` 会走内存执行 |
| `Func<T,TResult>` | 委托类型：已编译的方法引用 | `Enumerable` 系列方法的参数 | — |
| `AsQueryable()` | 把 `IEnumerable` 包成 `IQueryable`（内存集合上用它只是换类型，翻译能力来自 provider） | 你显式调用 | — |
| `AsEnumerable()` | 把 `IQueryable` 包成 `IEnumerable`，**从这里开始客户端求值** | 你显式调用 | 无法调用自定义 C# 方法 |
| `ToList()` / `ToListAsync()` | 终结方法：立刻执行 SQL 并物化 | 你显式调用 | 表达式树永远不执行 |
| `Count()` / `Any()` / `Sum()` | 终结方法；也**可以是**聚合运算（在 `Select` 里作为子查询） | 看位置 | — |
| `EF.Functions.Like(x, pattern)` | 显式指定翻译为 `LIKE`，避免 `Contains` 的转义歧义 | 你在 `Where` 里 | 用 `Contains` 也行，但含 `%` `_` 时行为不同 |
| `Skip(n)` / `Take(n)` | 分页，翻译成 `OFFSET n ROWS FETCH NEXT m ROWS ONLY` | 链式调用 | 全量返回 |
| `NodeType` | `Expression` 的属性，表示这棵子树的运算类型（`GreaterThan` 等） | 想看表达式树结构时 | — |

==二：格式==

**P71 · 关系查询模板**
```csharp
// N→1：用对方的属性筛，不需要 Include
ctx.Books.Where(b => b.Author.Name == "杨中科");

// 1→N：用子集合筛（EXISTS）
ctx.Authors.Where(a => a.Books.Any(b => b.Price > 50));

// 子集合数量（COUNT 子查询）
ctx.Books.Where(b => b.Comments.Count > 1);

// 子集合为空（NOT EXISTS）
ctx.Books.Where(b => !b.Comments.Any());

// 多对多（EXISTS + 中间表）
ctx.Books.Where(b => b.Tags.Any(t => t.Name == "C#"));

// 投影里带统计（相关子查询）
ctx.Authors.Select(a => new { a.Name, Cnt = a.Books.Count(), Total = a.Books.Sum(b => b.Price) });

// 排序用子集合（同样不需要 Include）
ctx.Books.OrderByDescending(b => b.Comments.Count).Take(5);
```

**P72 · 三种写法一眼看穿**
```csharp
IQueryable<Book> q1 = ctx.Books.Where(b => b.Price > 50);      // SQL 带 WHERE（正确）
IEnumerable<Book> e = ctx.Books;
var q2 = e.Where(b => b.Price > 50);                            // 全表 + 内存筛（退化）
var q3 = ctx.Books.ToList().Where(b => b.Price > 50);           // 全表 + 内存筛（显式退化）
```

**P73 · 先缩小再客户端**
```csharp
ctx.Books.Where(b => b.Price > 50)                // SQL 环节尽量狠
        .AsEnumerable()                            // 分界线
        .Where(b => Regex.IsMatch(b.Title, "^C#")) // C# 环节随意
        .ToList();
```

**P74 · 延迟执行与闭包**
```csharp
var q = ctx.Books.Where(b => b.Price > min);   // 不执行
min = 100;                                      // 改动会影响结果
var list = q.ToList();                          // 此刻才执行，读到 100
```

**P75 · 动态查询骨架**
```csharp
IQueryable<Book> q = ctx.Books.AsQueryable();
if (kw is not null)  q = q.Where(b => b.Title.Contains(kw));
if (min is not null) q = q.Where(b => b.Price >= min);
if (max is not null) q = q.Where(b => b.Price <= max);

var total = await q.CountAsync();                                  // 总数（同一骨架）
var page  = await q.OrderBy(b => b.Id).Skip(skip).Take(size)       // 分页必须最后
                   .ToListAsync();
```

==三：代码==

**场景**：控制台项目 `QueryDemo`。三张实体：`Author` 1:N `Book`、`Book` 1:N `Comment`、`Book` M:N `Tag`（多对多用上一节学的隐式中间表）。
每一步都打印 SQL，**用眼睛确认"我以为的"和"实际发生的"是否一致**。

**第 0 步：建项目 + 包**
```bash
dotnet new console -n QueryDemo
cd QueryDemo
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
```

**第 1 步：实体**
```csharp
// Models/Author.cs
public class Author
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<Book> Books { get; set; } = new();
}

// Models/Book.cs
public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }
    public DateTime PubTime { get; set; }

    public long AuthorId { get; set; }            // 非空 → INNER JOIN
    public Author Author { get; set; } = null!;

    public List<Comment> Comments { get; set; } = new();
    public List<Tag> Tags { get; set; } = new();
}

// Models/Comment.cs
public class Comment
{
    public long Id { get; set; }
    public string Content { get; set; } = string.Empty;

    public long BookId { get; set; }
    public Book Book { get; set; } = null!;
}

// Models/Tag.cs
public class Tag
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<Book> Books { get; set; } = new();
}
```

**第 2 步：DbContext（注意 `LogTo` 是这一节最重要的一行）**
```csharp
public class DemoContext : DbContext
{
    public DbSet<Author> Authors => Set<Author>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Tag> Tags => Set<Tag>();

    protected override void OnConfiguring(DbContextOptionsBuilder opt)
    {
        opt.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=QueryDemo;Trusted_Connection=True;TrustServerCertificate=True")
           .LogTo(Console.WriteLine, LogLevel.Information)     // 打印 SQL ← 全靠它验证
           .EnableSensitiveDataLogging();                       // 让日志里能看到参数值
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Book>(e =>
        {
            e.ToTable("T_Books");
            e.Property(b => b.Title).HasMaxLength(100).IsRequired();

            e.HasOne(b => b.Author)
             .WithMany(a => a.Books)
             .HasForeignKey(b => b.AuthorId);

            e.HasMany(b => b.Tags)                     // 多对多，隐式中间表（P70）
             .WithMany(t => t.Books)
             .UsingEntity(j => j.ToTable("T_Books_Tags"));
        });

        modelBuilder.Entity<Author>(e => e.ToTable("T_Authors"));
        modelBuilder.Entity<Comment>(e => e.ToTable("T_Comments"));
        modelBuilder.Entity<Tag>(e => e.ToTable("T_Tags"));
    }
}
```
```bash
dotnet ef migrations add Init
dotnet ef database update
```

**第 3 步：灌数据（一次建完整张关系图）**
```csharp
using var ctx = new DemoContext();
if (!await ctx.Authors.AnyAsync())
{
    var yang = new Author { Name = "杨中科" };
    var li   = new Author { Name = "李四" };
    var wang = new Author { Name = "王五" };

    var tags = new List<Tag>
    {
        new() { Name = "C#" }, new() { Name = "EF Core" }, new() { Name = "入门" }
    };
    ctx.Tags.AddRange(tags);

    ctx.Books.AddRange(
        new Book { Title = "C# 入门", Price = 49, PubTime = new(2025, 3, 1), Author = yang,
                   Tags = { tags[0], tags[2] },
                   Comments = { new() { Content = "好书" }, new() { Content = "通俗" } } },
        new Book { Title = "EF Core 实战", Price = 69, PubTime = new(2025, 8, 1), Author = yang,
                   Tags = { tags[1] }, Comments = { new() { Content = "深" } } },
        new Book { Title = "日语初级", Price = 39, PubTime = new(2026, 1, 1), Author = li },
        new Book { Title = "算法图解", Price = 89, PubTime = new(2024, 5, 1), Author = wang,
                   Tags = { tags[2] }, Comments = { new() { Content = "图多" }, new() { Content = "清晰" } } }
    );

    await ctx.SaveChangesAsync();
}
```
> `Tags = { tags[0], tags[2] }` 是集合初始化器，等价于先 `new()` 再 `Add`。因为 `Book.Tags` 已经写了 `= new()`，所以可以这么简写。

**第 4 步（P71）：六个关系查询，逐个看 SQL**
```csharp
Console.WriteLine("=== 1. 用作者名筛书，不要 Include ===");
var q1 = ctx.Books.Where(b => b.Author.Name == "杨中科");
Console.WriteLine(q1.ToQueryString());     // 直接看 SQL，不用执行

Console.WriteLine("=== 2. 有 50 元以上书的作者（EXISTS） ===");
Console.WriteLine(ctx.Authors.Where(a => a.Books.Any(b => b.Price > 50)).ToQueryString());

Console.WriteLine("=== 3. 评论数大于 1 的书（计数子查询） ===");
Console.WriteLine(ctx.Books.Where(b => b.Comments.Count > 1).ToQueryString());

Console.WriteLine("=== 4. 一条评论都没有的书（NOT EXISTS） ===");
Console.WriteLine(ctx.Books.Where(b => !b.Comments.Any()).ToQueryString());

Console.WriteLine("=== 5. 打了 C# 标签的书（多对多 EXISTS） ===");
Console.WriteLine(ctx.Books.Where(b => b.Tags.Any(t => t.Name == "C#")).ToQueryString());

Console.WriteLine("=== 6. 每个作者的书数与总价（相关子查询） ===");
Console.WriteLine(ctx.Authors
    .Select(a => new { a.Name, Cnt = a.Books.Count(), Total = a.Books.Sum(b => b.Price) })
    .ToQueryString());
```
> **`ToQueryString()` 是本节最实用的 API**：它返回即将执行的 SQL（含参数占位），**不执行查询**。调 SQL 之前先用它自检，比看控制台日志快得多。

实际结果（你可以逐条对照）：
```sql
-- 1
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime], [b].[AuthorId]
FROM [T_Books] AS [b]
INNER JOIN [T_Authors] AS [a] ON [b].[AuthorId] = [a].[Id]
WHERE [a].[Name] = N'杨中科'

-- 3
SELECT [b].[Id], ...
FROM [T_Books] AS [b]
WHERE (SELECT COUNT(*) FROM [T_Comments] AS [c] WHERE [b].[Id] = [c].[BookId]) > 1

-- 4
WHERE NOT EXISTS (SELECT 1 FROM [T_Comments] AS [c] WHERE [b].[Id] = [c].[BookId])

-- 6
SELECT [a].[Name],
       (SELECT COUNT(*) FROM [T_Books] AS [b] WHERE [a].[Id] = [b].[AuthorId]),
       (SELECT COALESCE(SUM([b0].[Price]), 0.0) FROM [T_Books] AS [b0] WHERE [a].[Id] = [b0].[AuthorId])
FROM [T_Authors] AS [a]
```
**重点看第 1 条**：`Include` 一次都没写，`INNER JOIN` 照样在。**筛选条件靠 JOIN 表达，不靠 Include 加载。**

**第 5 步（P72）：同一个需求，三种写法，三条完全不同的 SQL**
```csharp
double min = 50;

Console.WriteLine("--- A. IQueryable：SQL 里带 WHERE ---");
IQueryable<Book> a = ctx.Books.Where(b => b.Price > min);
Console.WriteLine(a.ToQueryString());

Console.WriteLine("--- B. 赋给 IEnumerable 变量：WHERE 丢了 ---");
IEnumerable<Book> e = ctx.Books;                  // 静态类型变成 IEnumerable
var b2 = e.Where(b => b.Price > min);             // 编译器选 Enumerable.Where
Console.WriteLine((b2 as IQueryable<Book>) is null ? "已退化为内存过滤（无 SQL 可看）" : "?");

Console.WriteLine("--- C. ToList 之后再筛：全表 + 内存过滤 ---");
Console.WriteLine(ctx.Books.ToQueryString());      // 就是 SELECT * FROM T_Books
var c2 = ctx.Books.ToList().Where(b => b.Price > min);
```
A 的 SQL：
```sql
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime], [b].[AuthorId]
FROM [T_Books] AS [b]
WHERE [b].[Price] > @__min_0
```
B 和 C 的 SQL 都是 `SELECT ... FROM [T_Books]`（**没有 WHERE**），八万条数据全搬到内存再筛一遍。

> B 是最阴的：代码看着和 A 几乎一样，只是变量声明成了 `IEnumerable<Book>`，性能就从"数据库筛 3 条"变成"网络搬 8 万条"。**Code Review 时要盯 `IEnumerable` 这个声明。**

**第 6 步（P72）：亲眼看表达式树，理解"为什么能翻译"**
```csharp
Expression<Func<Book, bool>> expr = b => b.Price > 50;
Console.WriteLine(expr.Body.NodeType);                    // GreaterThan
Console.WriteLine(expr.Body);                             // (b.Price > 50)
Console.WriteLine(((BinaryExpression)expr.Body).Left);    // b.Price
Console.WriteLine(((BinaryExpression)expr.Body).Right);   // 50

Func<Book, bool> func = b => b.Price > 50;
Console.WriteLine(func);                                  // System.Func`2[Book,System.Boolean]
Console.WriteLine(func.Body);                             // ← 编译不过：委托没有 Body
```
输出：
```
GreaterThan
(b.Price > 50)
b.Price
50
System.Func`2[Book,System.Boolean]
```
**表达式树能一层层拆开，EF 就是靠拆它来生成 SQL；`Func` 只有一句"我是个函数"，拆不出东西。**

**第 7 步（P73）：故意让 EF 翻译不了**
```csharp
static bool IsCheap(double price) => price < 50;   // 自定义方法

// 这一行会抛异常
Console.WriteLine(ctx.Books.Where(b => IsCheap(b.Price)).ToQueryString());
```
```
System.InvalidOperationException: The LINQ expression 'DbSet<Book>()
    .Where(b => IsCheap(b.Price))' could not be translated.
Either rewrite the query in a form that can be translated, or switch to client evaluation
explicitly by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable', 'ToList', or 'ToListAsync'.
```
两种改法：
```csharp
// 改法一：改写成能翻译的表达式（首选）
var ok1 = ctx.Books.Where(b => b.Price < 50).ToList();

// 改法二：接受客户端求值，但先把范围压小
var ok2 = ctx.Books.Where(b => b.Price < 100)     // ← SQL 干活
                   .AsEnumerable()                 // ← 分界线
                   .Where(b => IsCheap(b.Price))   // ← C# 干活
                   .ToList();
```

**第 8 步（P73）：这些"看着像 C# 方法"的，其实能翻译**
```csharp
Console.WriteLine(ctx.Books.Where(b => b.Title.Contains("EF")).ToQueryString());
Console.WriteLine(ctx.Books.Where(b => b.Title.ToLower() == "c# 入门").ToQueryString());
Console.WriteLine(ctx.Books.Where(b => b.Title.Length > 4).ToQueryString());
Console.WriteLine(ctx.Books.Where(b => b.PubTime.Year == 2025).ToQueryString());
Console.WriteLine(ctx.Books.Where(b => new[] { 1L, 2L }.Contains(b.Id)).ToQueryString());
```
```sql
WHERE [b].[Title] LIKE N'%EF%'
WHERE LOWER([b].[Title]) = N'c# 入门'
WHERE LEN([b].[Title]) > 4
WHERE DATEPART(year, [b].[PubTime]) = 2025
WHERE [b].[Id] IN (1.0, 2.0)
```
> 注意 `Contains` → `LIKE '%EF%'`：如果关键词里带 `%` 或 `_`，会被当成通配符，这时候用 `EF.Functions.Like` 也不解决转义问题（要自己 `Escape`）。这是搜索功能里的经典坑。

**第 9 步（P74）：延迟执行的证据**
```csharp
Console.WriteLine("=== 定义查询（下面不该出现任何 SQL） ===");
var q = ctx.Books.Where(b => b.Price > 50);
Console.WriteLine("=== 定义完了，还没执行 ===");

var cnt = q.Count();                        // SQL #1：SELECT COUNT(*)
var list = q.ToList();                      // SQL #2：SELECT ... WHERE Price > 50
var first = q.First();                      // SQL #3：SELECT TOP(1) ... WHERE Price > 50
Console.WriteLine($"count={cnt}, list={list.Count}, first={first.Title}");
```
日志里能数出**三条 SQL**。同一个 `q`，三次执行。

**第 10 步（P74）：闭包变量在执行时才读**
```csharp
double min = 50;
var query = ctx.Books.Where(b => b.Price > min);
min = 100;                                   // 定义之后改值

Console.WriteLine(query.ToQueryString());    // 参数占位是 @__min_0
var result = query.ToList();                 // 执行时读 min → 100
Console.WriteLine($"实际返回 {result.Count} 条（应该是 Price>100 的结果）");
```
日志参数会显示 `@__min_0='100'`。
> 想在定义时"拍死"这个值，就在 lambda 外面先复制一份局部变量，或者直接 `ToList()` 后再改。

**第 11 步（P75）：把查询做成模板，动态拼条件**
```csharp
IQueryable<Book> Build(string? kw, double? minP, double? maxP)
{
    IQueryable<Book> q = ctx.Books.AsQueryable();
    if (!string.IsNullOrWhiteSpace(kw)) q = q.Where(b => b.Title.Contains(kw));
    if (minP.HasValue) q = q.Where(b => b.Price >= minP.Value);
    if (maxP.HasValue) q = q.Where(b => b.Price <= maxP.Value);
    return q;
}

Console.WriteLine(Build("EF", null, null).ToQueryString());      // 只有 Title 条件
Console.WriteLine(Build(null, 50, 80).ToQueryString());          // 只有两个 Price 条件
Console.WriteLine(Build("C#", 40, 60).ToQueryString());          // 三个 AND 串起来
```
第三种输出的 SQL：
```sql
SELECT [b].[Id], ...
FROM [T_Books] AS [b]
WHERE [b].[Title] LIKE N'%C#%' AND [b].[Price] >= 40.0 AND [b].[Price] <= 60.0
```
**条件是在 C# 里 `if` 出来的，SQL 却是干干净净的一条。**这就是 `IQueryable` 复用的全部价值。

**第 12 步（P75）：分页骨架复用 + 两条必须记住的规则**
```csharp
var baseQuery = Build(null, 30, null);       // 骨架

var total = await baseQuery.CountAsync();                                   // 总数
var page1 = await baseQuery.OrderBy(b => b.Id).Skip(0).Take(2).ToListAsync();  // 第 1 页
var page2 = await baseQuery.OrderBy(b => b.Id).Skip(2).Take(2).ToListAsync();  // 第 2 页
Console.WriteLine($"共 {total} 条，第1页 {page1.Count} 条，第2页 {page2.Count} 条");
```
- **规则一**：`OrderBy` + `Skip/Take` 必须在条件全部加完之后。先分页再 `Where`，分的是"中间结果"，页就乱了。
- **规则二**：`Skip` 不带 `OrderBy` 会有警告，分页结果不稳定（数据库不保证顺序）。EF 的警告：`RowLimitingOperationWithoutOrderByWarning`。

**第 13 步（P75）：跨 DbContext 复用会炸**
```csharp
IQueryable<Book> leaked;
using (var c1 = new DemoContext())
{
    leaked = c1.Books.Where(b => b.Price > 50);   // 表达式树里握着 c1
}
// c1 已 dispose，这里执行会抛 ObjectDisposedException
var boom = leaked.ToList();
```
```
System.ObjectDisposedException: Cannot access a disposed context instance.
```
**结论：`IQueryable` 的生命周期必须短于它所属的 `DbContext`。**想跨层传递就用"参数化的查询条件"，别传 `IQueryable` 出 `using` 块。

==四：总结==

**五节一页速查**

| 节 | 一句话结论 | 关键 API |
|---|---|---|
| **P71** 关系查询 | 导航属性能用在 `Where/OrderBy/Select` 任何位置，自动变 JOIN/EXISTS；**过滤不需要 `Include`** | 导航属性、`Any()`、`Count` |
| **P72** IEnumerable vs IQueryable | `Func` 只能执行，`Expression` 才能翻译；**变量声明成 `IEnumerable` 就退化为内存筛** | `AsQueryable` / `AsEnumerable` / `ToList` |
| **P73** 客户端评估 | 3.0 起翻译不了就报错，要客户端就显式 `AsEnumerable()`；**先缩小再任性** | `AsEnumerable`、`EF.Functions.Like` |
| **P74** 延迟执行 | 定义不发 SQL，终结方法才发；**执行 N 次 = N 条 SQL**；闭包值在执行时读 | `ToList` / `Count` / `First` |
| **P75** 复用 | `IQueryable` 是可生长的表达式树，是动态查询骨架的载体；分页放最后 | `Skip` / `Take` / `ToQueryString` |

**翻译对照总表**

| LINQ | SQL | 备注 |
|---|---|---|
| `Where(b => b.Author.Name == "x")` | `INNER JOIN` + `WHERE` | 外键可空则 `LEFT JOIN` |
| `Where(a => a.Books.Any(...))` | `EXISTS (...)` | 只判断存在，不取数据 |
| `Where(b => !b.Comments.Any())` | `NOT EXISTS (...)` | "没有子记录"的标准写法 |
| `Where(b => b.Comments.Count > 1)` | `(SELECT COUNT(*) ...) > 1` | 每行一次子查询 |
| `Select(a => new { Cnt = a.Books.Count() })` | 相关子查询 | **不是** `GROUP BY` |
| `Contains` / `StartsWith` | `LIKE` | 关键词含 `%` `_` 要小心 |
| `new[]{1,2}.Contains(b.Id)` | `IN (1, 2)` | |
| `Skip(n).Take(m)` | `OFFSET n ROWS FETCH NEXT m ROWS ONLY` | 必须有 `OrderBy` |
| 自定义 C# 方法 | 翻译失败 → 抛异常 | 或显式 `AsEnumerable()` |

**七个易错点**

1. **以为过滤要 `Include`** —— 不用。`Include` 只影响"带回内存的对象是否带上子对象"。
2. **把参数声明成 `IEnumerable<T>`** —— 静态类型决定调 `Enumerable.Where`，SQL 里没有 `WHERE`。**这是最贵的错误。**
3. **`ctx.Books.ToList().Where(...)`** —— 全表拉内存。同理 `AsEnumerable()` 放太早。
4. **同一个 `IQueryable` 反复枚举** —— `Count()` + `ToList()` + `foreach` = 3 次查库。先 `ToList()` 缓存。
5. **改闭包变量后再执行** —— 结果按新值算。要"定死"就先物化。
6. **`Select` 里用 `a.Books.Count()` 以为是分组** —— 那是相关子查询，N 个作者 = N 次子查询。真分组要 `GroupBy`。
7. **`IQueryable` 传出 `using` 块** —— `ObjectDisposedException`。查询的寿命不能长于上下文。

**记忆口诀**

> **导航属性随便用，JOIN 自动来；Include 只管带数据，不管筛。**
> **委托能跑不能读，表达式能读不能跑 —— IQueryable 靠"读"吃饭。**
> **IEnumerable 一接手，SQL 就没了 WHERE。**
> **翻译不了别硬来，AsEnumerable 划条线：左边重、右边随意。**
> **定义不发 SQL，ToList 才发；发几次看你调几次。**
> **条件是 if 出来的，SQL 是一条 —— 这就是 IQueryable 复用的全部价值。**
> **分页永远最后一步，Skip 必须跟 OrderBy。**
