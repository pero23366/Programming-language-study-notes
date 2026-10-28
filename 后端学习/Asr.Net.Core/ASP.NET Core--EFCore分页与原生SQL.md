==一：概念==

> 本篇覆盖 **P76–P81**：分页查询、IQueryable 到底占不占内存、EF Core 的异步方法、三种原生 SQL 写法。
> 这六节都在回答同一个问题：**"查询离开 EF 的舒适区之后，边界在哪里？"**
> 前置：沿用上一篇的 `QueryDemo` 项目（`T_Books` / `T_Authors` / `T_Comments` / `T_Tags`）。
> 版本说明：主线按 **EF Core 6** 可用的 API 讲；EF Core 7/8 的新写法会在各节末尾单独标出，你实际写项目时多半用得上。

---

# P76　分页查询

**`Skip` / `Take` 翻译成 SQL Server 的 `OFFSET / FETCH`，分页在数据库里完成，不是内存里切片。**

```csharp
int page = 2, size = 10;

var list = await ctx.Books
    .OrderBy(b => b.Id)                       // 必须
    .Skip((page - 1) * size)
    .Take(size)
    .ToListAsync();

var total = await ctx.Books.CountAsync();      // 总条数要单独查
```
```sql
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime], [b].[AuthorId]
FROM [T_Books] AS [b]
ORDER BY [b].[Id]
OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY
```

**四条规矩**

| 规矩 | 不遵守会怎样 |
|---|---|
| `Take`/`Skip` 前**必须有 `OrderBy`** | EF 会补 `ORDER BY (SELECT 1)` 让 SQL 合法，但**行序不确定**，可能出现"同一条数据在第 1 页和第 2 页都出现"；同时触发警告 `RowLimitingOperationWithoutOrderByWarning` |
| 分页必须在**所有** `Where`/`Include` 之后 | 先 `Take` 再 `Where`，筛的是"前 10 条里的"，不是"全表里的前 10 条" |
| 不能先 `ToList()` 再 `Skip` | `ctx.Books.ToList().Skip(10)` = 全表进内存，再切片 |
| 参数要自己校验 | `Skip(-10)` 会生成 `OFFSET -10`，SQL Server 直接报错 |

**总条数必须单独查**，而且要在**同一份筛选条件**上查，否则页码和列表对不上：

```csharp
IQueryable<Book> q = ctx.Books.Where(b => b.Price > 50);   // 同一份条件

var total = await q.CountAsync();                                     // SQL #1
var items = await q.OrderBy(b => b.Id).Skip(0).Take(10).ToListAsync(); // SQL #2
```
**这是一次分页两趟数据库往返**，正常现象。EF 不能把 `COUNT(*)` 和当前页数据合成一条 SQL（`COUNT(*) OVER()` 得写原生 SQL）。

**大偏移量会变慢 —— 这是分页唯一的性能坑**

`OFFSET 100000 ROWS` 的语义是"**读出来、丢掉前 10 万行、返回第 100001 行开始的数据**"。数据库仍然扫了 10 万行，只是不返回。

| 方案 | 写法 | 特点 |
|---|---|---|
| 偏移分页（`Skip/Take`） | `.Skip(100000).Take(10)` | 简单，能跳页；越往后越慢 |
| 键集分页（keyset） | `.Where(b => b.Id > lastId).OrderBy(b => b.Id).Take(10)` | 恒定速度（走索引），只能"下一页"，不能跳到第 N 页 |

> 键集分页的原理：不用"跳过多少行"，而是用"从哪个值之后开始"。`WHERE Id > @lastId ORDER BY Id` 能直接走索引定位，与位置无关。**无限滚动的列表就用这个**，不必用 `Skip`。

**封装一个分页结果**（真实项目里都这么干）：
```csharp
public record PagedResult<T>(long Total, IReadOnlyList<T> Items);
```
> `record` 是 C# 9 的语法：编译器自动生成构造函数、只读属性、`Equals`/`GetHashCode`/`ToString`。这里用它当一个不可变的返回载体，比手写 5 行属性干净。

---

# P77　IQueryable 是一次性把数据都加载到内存吗

**答案是：`IQueryable` 本身零数据。但"一次加载多少"取决于你怎么消费它，不取决于它。**

分三层看：

| 阶段 | 内存里有什么 |
|---|---|
| 定义查询（`Where`/`OrderBy`/`Skip`…） | **只有表达式树**。一条 SQL 都没发，一条数据都没有 |
| `ToListAsync()` / `ToArray()` | 结果**全部**装进 `List`。几万行就是几万个对象 |
| `await foreach`（不 `ToList`） | **流式**：EF 用 `DbDataReader` 一行一行读，读完一行交给你处理，不攒整个列表 |

**第三层是很多人的认知盲区**：不 `ToList` 的遍历是流式的。

```csharp
// 流式：内存里同时只有当前这一行（外加跟踪器里累积的实体）
await foreach (var b in ctx.Books.AsAsyncEnumerable())
{
    if (b.Price > 60) break;          // 提前退出，剩下的行根本不会读
}
```

**但是有两个"但是"**

| 但是 | 后果 |
|---|---|
| **变更跟踪会累积** | 即使流式读，EF 也会把每个实体放进 `DbContext` 的跟踪器（保证"同一行只返回一个对象"）。读 10 万行 = 内存里 10 万个对象，直到 ctx 释放。**大结果集必须加 `AsNoTracking()`** |
| **`Include` 集合时不能真流式** | 要组装"一篇文章带 N 条评论"的对象图，EF 必须把相关行都读齐才能拼。所以带集合 `Include` 的查询，内部会缓冲 |

**所以"一次性"这个说法要修正为**：

> **数据量由"你的消费方式"决定：`ToList` 一次全拿；`foreach` 一行一行拿；但如果开了跟踪或带集合 `Include`，内存照样会涨。**

```csharp
// 危险：ToList 拿 50 万行
var all = await ctx.Books.ToListAsync();

// 好一点：流式 + 不跟踪，内存不会随行数线性增长
await foreach (var b in ctx.Books.AsNoTracking().AsAsyncEnumerable())
{
    Process(b);
}
```
> `AsAsyncEnumerable()` 把 `IQueryable<T>` 变成 `IAsyncEnumerable<T>`，供 `await foreach` 用。没有它就不能 `await foreach` 一个 `IQueryable`。

---

# P78　EF Core 中的异步方法

**EF Core 的异步是"真异步"**：底层是 ADO.NET 的异步 IO（`DbDataReader.ReadAsync`），等的是网络/磁盘，不占线程。

这就是 Part2 异步编程那一章的落地：**同步版查库会阻塞一个线程池线程在干等；异步版把线程还回去干别的活。**

**每个终结方法都有 `Async` 版本**

| 同步 | 异步 |
|---|---|
| `ToList()` | `ToListAsync()` |
| `First()` / `FirstOrDefault()` | `FirstAsync()` / `FirstOrDefaultAsync()` |
| `Single()` / `SingleOrDefault()` | `SingleAsync()` / `SingleOrDefaultAsync()` |
| `Count()` / `LongCount()` | `CountAsync()` / `LongCountAsync()` |
| `Any()` / `All()` | `AnyAsync()` / `AllAsync()` |
| `Sum/Max/Min/Average` | `SumAsync/MaxAsync/...` |
| `SaveChanges()` | `SaveChangesAsync()` |
| `ExecuteSqlRaw()` | `ExecuteSqlRawAsync()` |
| `FromSqlRaw(...).ToList()` | `FromSqlRaw(...).ToListAsync()` |

**`Where` / `OrderBy` / `Select` 没有 `Async` 版本** —— 因为它们不执行，只往表达式树上加节点。**只有终结方法需要异步。**

**必踩的坑：同一个 `DbContext` 不支持并发操作**

```csharp
// 错：两条查询在同一个 ctx 上并行
var t1 = ctx.Books.CountAsync();
var t2 = ctx.Authors.CountAsync();
await Task.WhenAll(t1, t2);
```
```
System.InvalidOperationException: A second operation was started on this context instance
before a previous operation completed. This is usually caused by different threads concurrently
using the same instance of DbContext.
```
**原因**：`DbContext` 不是线程安全的，它内部维护一个连接、一个跟踪器、一个状态机。并发查询会撞在一起。

**三种改法**：
```csharp
// 1) 串行（最常见，也够了）
var c1 = await ctx.Books.CountAsync();
var c2 = await ctx.Authors.CountAsync();

// 2) 真要并行 → 各用各的 ctx（注意：连接池要够）
await Task.WhenAll(
    Task.Run(async () => { using var c = new DemoContext(); await c.Books.CountAsync(); }),
    Task.Run(async () => { using var c = new DemoContext(); await c.Authors.CountAsync(); })
);

// 3) 合并成一条 SQL（能用就不要并行）
var stat = await ctx.Books.GroupBy(b => 1).Select(g => new { Books = g.Count() }).FirstAsync();
```

**另外两条纪律**

| 别做 | 原因 |
|---|---|
| `.Result` / `.Wait()` 等异步方法 | 阻塞线程，和异步的初衷相反；在有同步上下文的场景（WPF/WinForm）会死锁 |
| 在 `foreach` 里 `await` 单条查询（N+1） | 100 条数据 = 101 次往返。要么 `Include` 一次拿，要么批量查（`Where(b => ids.Contains(b.Id))`） |

**流式异步遍历**：
```csharp
await foreach (var b in ctx.Books.AsNoTracking().AsAsyncEnumerable())
{
    Console.WriteLine(b.Title);
}
```

---

# P79　执行非查询原生 SQL（`ExecuteSqlRaw` / `ExecuteSqlInterpolated`）

**"非查询"指的是不返回实体、只改数据**：`UPDATE` / `DELETE` / `INSERT`。

```csharp
// 方式一：占位符 {0}，参数化（安全）
var rows = await ctx.Database.ExecuteSqlRawAsync(
    "UPDATE T_Books SET Price = Price * 1.1 WHERE AuthorId = {0}", authorId);

// 方式二：内插字符串，EF 自动转成参数（同样安全，推荐）
var rows2 = await ctx.Database.ExecuteSqlInterpolatedAsync(
    $"UPDATE T_Books SET Price = Price * 1.1 WHERE AuthorId = {authorId}");
Console.WriteLine($"影响 {rows2} 行");
```

| 写法 | 参数化 | 说明 |
|---|---|---|
| `ExecuteSqlRaw("... WHERE Id = {0}", id)` | 是 | `{0}` 是**占位符**，不是 `string.Format`。EF 会把它变成 `@p0` 参数 |
| `ExecuteSqlRaw($"... WHERE Id = {id}")` | **否** | 内插字符串先被拼成普通 string，`id` 已经变成文本 → **SQL 注入入口**。这是最常见的误用 |
| `ExecuteSqlInterpolated($"... WHERE Id = {id}")` | 是 | 接收 `FormattableString` 而不是 `string`，能拿到"哪部分是值"，转成参数 |

> 关键区别在**参数类型**：`ExecuteSqlInterpolated` 的参数是 `FormattableString`（编译器为内插字符串生成的特殊类型，能拆出"格式串 + 参数组"）；`ExecuteSqlRaw` 的参数是 `string`，已经是拼好的文本，无法还原。**写原生 SQL 一律优先 `...Interpolated`。**

**三个必须知道的行为**

| 行为 | 说明 |
|---|---|
| **返回值是受影响行数** | `int`，可以直接判"改到没有" |
| **立即执行，不需要 `SaveChanges`** | 它不是"挂起变更"，是直接发 SQL |
| **绕过变更跟踪** | 数据库里的值变了，但 `DbContext` 里已跟踪的实体**还是旧值** |

第三条是最隐蔽的坑：
```csharp
var book = await ctx.Books.FirstAsync(b => b.Id == 1);       // 跟踪，Price=49
await ctx.Database.ExecuteSqlRawAsync(
    "UPDATE T_Books SET Price = 99 WHERE Id = 1");            // 数据库改了
Console.WriteLine(book.Price);                                // 还是 49！

var again = await ctx.Books.FirstAsync(b => b.Id == 1);       // 还是 49！
```
**第二次查询不会再读库**，EF 看到"这个主键已经在跟踪器里"，直接返回内存中的那个实例（这叫**标识解析** identity resolution）。要看到新值，必须：

```csharp
ctx.ChangeTracker.Clear();                                    // 清空跟踪器（EF Core 5+）
var fresh = await ctx.Books.AsNoTracking().FirstAsync(b => b.Id == 1);  // 99
```
> `ChangeTracker.Clear()` 会丢弃所有跟踪状态。**已经改过但没保存的对象会一起丢掉**，用之前确认没有未保存的改动。

**EF Core 7+ 更该用的写法**（类型安全、能组合 `Where`）：
```csharp
await ctx.Books.Where(b => b.AuthorId == authorId)
               .ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, b => b.Price * 1.1));

await ctx.Books.Where(b => b.Price < 10).ExecuteDeleteAsync();
```
> 这两个是**批量操作**，一条 SQL 改 N 行，比"查出来逐个改再 `SaveChanges`"快几个数量级。但它们**同样绕过跟踪**，改完记得 `ChangeTracker.Clear()`。

---

# P80　执行实体相关查询原生 SQL（`FromSqlRaw` / `FromSqlInterpolated`）

**返回的是实体，所以能继续接 LINQ —— 但要满足三个硬条件。**

```csharp
// 方式一：占位符
var books = await ctx.Books
    .FromSqlRaw("SELECT * FROM T_Books WHERE Price > {0}", 50)
    .ToListAsync();

// 方式二：内插（推荐）
var books2 = await ctx.Books
    .FromSqlInterpolated($"SELECT * FROM T_Books WHERE Price > {min}")
    .Where(b => b.Title.Contains("EF"))     // 继续接 LINQ，合法
    .OrderBy(b => b.Price)
    .ToListAsync();
```
`books2` 生成的 SQL：
```sql
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime], [b].[AuthorId]
FROM (
    SELECT * FROM T_Books WHERE Price > @p0     -- 你写的原生 SQL 变成子查询
) AS [b]
WHERE [b].[Title] LIKE N'%EF%'
ORDER BY [b].[Price]
```
**EF 把你写的 SQL 包成子查询，再把后续 LINQ 翻译在外层。**这是"原生 SQL + LINQ 混用"的实现原理。

**三个硬条件**

| 条件 | 违反的报错 |
|---|---|
| **SQL 必须返回实体的全部映射列** | `The required column 'PubTime' was not present in the results of a 'FromSql' operation` |
| **列名必须和数据库里的列名一致**（不是属性名，虽然通常相同） | 同上，或该属性为默认值 |
| **表名写数据库里的真名**（`T_Books`，不是 `Book`） | `Invalid object name 'Book'` |

第一条最容易踩：`SELECT Id, Title FROM T_Books` 不行，`Book` 类有 5 个映射列，少一个就报错。**要部分列就用投影（`Select`）或 P81 的方式，别用 `FromSql`。**

**能组合与不能组合**

| 情况 | 能否接 LINQ |
|---|---|
| 普通 `SELECT ... FROM 表 WHERE ...` | 能（包成子查询） |
| 带 `JOIN` / `GROUP BY` 的 `SELECT` | 能（只要结果列匹配实体） |
| 存储过程 `EXEC ProcName` | **不能**。报 `'FromSql' or 'SqlQuery' was called with non-composable SQL and with a query composing over it` |
| SQL 里有 `ORDER BY` 之后又接 `OrderBy` | 能，但你写的 `ORDER BY` 变成子查询内部排序，外层重新排序会覆盖它（等于白写） |

**参数化的三种传法**
```csharp
// 1) 占位符 + 参数数组
ctx.Books.FromSqlRaw("SELECT * FROM T_Books WHERE Price > {0} AND AuthorId = {1}", 50, 1);

// 2) 内插字符串（推荐，参数名可读）
ctx.Books.FromSqlInterpolated($"SELECT * FROM T_Books WHERE AuthorId = {authorId}");

// 3) 显式 DbParameter（需要指定类型/方向时）
var p = new SqlParameter("@aid", authorId);
ctx.Books.FromSqlRaw("SELECT * FROM T_Books WHERE AuthorId = @aid", p);
```
> `SqlParameter` 来自 `Microsoft.Data.SqlClient`（EF Core 用的 SQL Server 驱动）。注意不是 `System.Data.SqlClient`（那是 .NET Framework 时代的老包，类型不兼容）。

---

# P81　执行任意原生 SQL 查询（结果不是实体）

需求：`SELECT AuthorId, COUNT(*) AS Cnt FROM T_Books GROUP BY AuthorId` —— 结果既不是 `Book` 也不是任何实体。三条路。

**路线一：无键实体（EF Core 3.0+，最"EF 味"）**

先声明一个只读形状，并告诉 EF"它没有主键、不对应真实表"：
```csharp
public class AuthorStat
{
    public long AuthorId { get; set; }
    public int Cnt { get; set; }
}

// OnModelCreating 里
modelBuilder.Entity<AuthorStat>().HasNoKey();     // 无主键 → 不能被跟踪、不能增删改
```
```csharp
var stats = await ctx.Set<AuthorStat>()
    .FromSqlRaw("SELECT AuthorId, COUNT(*) AS Cnt FROM T_Books GROUP BY AuthorId")
    .ToListAsync();
```
- **列名必须匹配属性名**（这里是 `AuthorId` / `Cnt`，用 `AS` 保证）。
- 依然可组合 LINQ（`.Where(s => s.Cnt > 1)`）。
- `HasNoKey()` 之后这个类型只能查，`Add`/`Update` 会报错。

**路线二：`Database.SqlQuery<T>`（EF Core 7+）**

不用建实体，直接投影到任意类型：
```csharp
// EF Core 7：标量类型要求列别名是 Value
var counts = await ctx.Database
    .SqlQuery<int>($"SELECT COUNT(*) AS Value FROM T_Books GROUP BY AuthorId")
    .ToListAsync();

// EF Core 8：支持任意列名映射到属性
var rows = await ctx.Database
    .SqlQuery<AuthorStat>($"SELECT AuthorId, COUNT(*) AS Cnt FROM T_Books GROUP BY AuthorId")
    .ToListAsync();
```
> EF Core 7 里 `SqlQuery<T>` 对**原始类型**（`int`/`string`/`Guid`…）强制要求列名 `Value`，这是它当时的限制；EF Core 8 放开成按属性名匹配，并加了 `SqlQueryRaw`（配合动态拼的条件）。

**路线三：ADO.NET 兜底（任何版本都能用）**

```csharp
var conn = ctx.Database.GetDbConnection();
if (conn.State != System.Data.ConnectionState.Open)
    await conn.OpenAsync();

await using var cmd = conn.CreateCommand();
cmd.CommandText = "SELECT AuthorId, COUNT(*) FROM T_Books GROUP BY AuthorId";

await using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    long authorId = reader.GetInt64(0);       // 按序号取，注意类型
    int cnt = reader.GetInt32(1);
    Console.WriteLine($"{authorId} -> {cnt}");
}
```

| 符号 | 是什么 | 注意 |
|---|---|---|
| `GetDbConnection()` | 拿到 EF 正在用的那个 `DbConnection` 对象 | 就是同一个连接，事务也在一起 |
| `CreateCommand()` | 造一个 `DbCommand` | 用完必须释放（`await using`） |
| `ExecuteReaderAsync()` | 执行并返回 `DbDataReader` | 只能顺序读，读完一行 `ReadAsync` 前进一行 |
| `GetInt64(0)` / `GetInt32(1)` | 按**列序号**取值 | 序号从 0 开始；类型不对会抛 `InvalidCastException` |

**这条路的特点**：完全绕开 EF —— 没有跟踪、没有翻译、没有实体，拿到的是原始值。**代价是没有类型安全，列顺序和类型全靠你自己记。**

**三条路怎么选**

| 场景 | 用哪个 |
|---|---|
| 报表形状固定、想复用 LINQ | 无键实体 + `FromSqlRaw` |
| EF Core 7+ 项目，临时查一点东西 | `Database.SqlQuery<T>` |
| 存储过程返回多结果集 / 极复杂 SQL / 老项目 | ADO.NET 兜底 |
| 只是想改数据，不要结果 | `ExecuteSqlRaw` / `ExecuteSqlInterpolated`（P79） |

---

**本节新增符号逐个拆解**

| 符号 | 是什么 | 谁调用它 | 不写会怎样 |
|---|---|---|---|
| `Skip(n)` / `Take(n)` | 分页，翻译成 `OFFSET n ROWS FETCH NEXT m ROWS ONLY` | 链式调用 | 全量返回 |
| `OFFSET / FETCH` | SQL Server 的分页语法 | 数据库执行 | 没有它只能靠 `TOP` 取前 N 条 |
| `ToListAsync()` | 异步终结方法，返回 `Task<List<T>>` | 你 `await` 它 | 用同步 `ToList()` 阻塞线程 |
| `AsAsyncEnumerable()` | 把 `IQueryable<T>` 转成 `IAsyncEnumerable<T>` | 配 `await foreach` | 不能异步流式遍历 |
| `AsNoTracking()` | 查询结果不进跟踪器（P83 详讲） | 链式调用 | 大结果集内存持续上涨 |
| `ExecuteSqlRaw(sql, args)` | 执行非查询 SQL，返回受影响行数 | `ctx.Database` 上调用 | — |
| `ExecuteSqlInterpolated($"...")` | 同上，但参数来自 `FormattableString`，**自动参数化** | `ctx.Database` 上调用 | 用 `Raw` + 内插 = 注入风险 |
| `FormattableString` | 编译器为内插字符串生成的特殊类型，能拆出"格式串 + 参数" | `ExecuteSqlInterpolated` / `FromSqlInterpolated` 的参数类型 | 参数会退化成拼好的文本 |
| `FromSqlRaw(sql, args)` | 用原生 SQL 查**实体**，返回 `IQueryable<T>`，可继续组合 | `DbSet<T>` 上调用 | 只能写 LINQ |
| `FromSqlInterpolated($"...")` | 同上，自动参数化 | `DbSet<T>` 上调用 | — |
| `HasNoKey()` | 声明该实体无主键（只读查询用） | `OnModelCreating` 里 | 无键类型不被允许 `Add`/`Update`，且会报"需要主键" |
| `SqlQuery<T>(sql)` | EF Core 7+：查任意类型，返回 `IQueryable<T>` | `ctx.Database` 上调用 | 只能用无键实体或 ADO.NET |
| `GetDbConnection()` | 取 EF 底层连接对象 | `ctx.Database` 上调用 | 无法用 ADO.NET 兜底 |
| `ChangeTracker.Clear()` | 清空跟踪器，让后续查询重新读库 | `ctx` 上调用 | 原生 SQL 改的数据看不到 |

==二：格式==

**P76 · 分页三种写法**
```csharp
// 1) 偏移分页（能跳页）
var items = await q.OrderBy(b => b.Id).Skip((page - 1) * size).Take(size).ToListAsync();
var total = await q.CountAsync();

// 2) 键集分页（恒定速度，只能翻下一页）
var items2 = await ctx.Books.Where(b => b.Id > lastId).OrderBy(b => b.Id).Take(size).ToListAsync();

// 3) 分页结果封装
public record PagedResult<T>(long Total, IReadOnlyList<T> Items);
```

**P77 · 控制内存的三种消费方式**
```csharp
var all = await ctx.Books.ToListAsync();                                    // 全量物化
await foreach (var b in ctx.Books.AsNoTracking().AsAsyncEnumerable()) { }    // 流式
var page = await ctx.Books.OrderBy(b => b.Id).Skip(0).Take(20).ToListAsync(); // 分页
```

**P78 · 异步方法对照**
```csharp
await ctx.Books.ToListAsync();
await ctx.Books.FirstOrDefaultAsync(b => b.Id == 1);
await ctx.Books.CountAsync();
await ctx.Books.AnyAsync(b => b.Price > 100);
await ctx.SaveChangesAsync();
await ctx.Database.ExecuteSqlRawAsync("DELETE FROM T_Comments WHERE BookId = {0}", 5);
```

**P79 · 非查询原生 SQL**
```csharp
// 推荐：参数化
await ctx.Database.ExecuteSqlInterpolatedAsync(
    $"UPDATE T_Books SET Price = Price * {ratio} WHERE AuthorId = {authorId}");

// 改动行数在返回值里
var n = await ctx.Database.ExecuteSqlRawAsync("DELETE FROM T_Comments WHERE BookId = {0}", bookId);
```

**P80 · 查实体**
```csharp
var q = ctx.Books
    .FromSqlInterpolated($"SELECT * FROM T_Books WHERE Price > {min}")
    .Where(b => b.Title.Contains("EF"))          // 继续组合
    .OrderBy(b => b.Price);
```

**P81 · 查任意结果**
```csharp
// 无键实体
var stats = await ctx.Set<AuthorStat>()
    .FromSqlRaw("SELECT AuthorId, COUNT(*) AS Cnt FROM T_Books GROUP BY AuthorId")
    .ToListAsync();

// EF Core 8
var rows = await ctx.Database.SqlQuery<AuthorStat>(
    $"SELECT AuthorId, COUNT(*) AS Cnt FROM T_Books GROUP BY AuthorId").ToListAsync();

// ADO.NET
await using var cmd = ctx.Database.GetDbConnection().CreateCommand();
cmd.CommandText = "SELECT COUNT(*) FROM T_Books";
var count = (int)(await cmd.ExecuteScalarAsync())!;
```

==三：代码==

**前提**：沿用上一篇的 `QueryDemo`（`Book` / `Author` / `Comment` / `Tag`，表 `T_Books` / `T_Authors` / `T_Comments` / `T_Tags`）。下面每一步单独跑一段，看日志里的 SQL。

**第 1 步（P76）：分页，先看 SQL 再看结果**
```csharp
int page = 2, size = 2;

Console.WriteLine("=== 偏移分页的 SQL ===");
Console.WriteLine(ctx.Books.OrderBy(b => b.Id).Skip((page - 1) * size).Take(size).ToQueryString());

var total = await ctx.Books.CountAsync();
var items = await ctx.Books.OrderBy(b => b.Id).Skip((page - 1) * size).Take(size).ToListAsync();
Console.WriteLine($"共 {total} 条，第 {page} 页：{string.Join("、", items.Select(b => b.Title))}");
```
```sql
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime], [b].[AuthorId]
FROM [T_Books] AS [b]
ORDER BY [b].[Id]
OFFSET 2 ROWS FETCH NEXT 2 ROWS ONLY
```
输出：
```
共 4 条，第 2 页：日语初级、算法图解
```

**第 2 步（P76）：去掉 `OrderBy`，看它怎么"偷偷补"**
```csharp
Console.WriteLine(ctx.Books.Skip(2).Take(2).ToQueryString());
```
```sql
SELECT [b].[Id], ...
FROM [T_Books] AS [b]
ORDER BY (SELECT 1)
OFFSET 2 ROWS FETCH NEXT 2 ROWS ONLY
```
`ORDER BY (SELECT 1)` 是 EF 为了让 SQL 合法硬塞的 —— SQL Server 的 `OFFSET` 语法**要求**有 `ORDER BY`，而你没给，所以它随便塞一个。**它等于"随便排"**。分页加这个，第 2 页和第 1 页可能取到同一条数据。日志里还会出现警告：
```
warn: Microsoft.EntityFrameworkCore.Query.RowLimitingOperationWithoutOrderByWarning
      The query uses a row limiting operator ('Skip'/'Take') without an 'OrderBy' operator.
```
> 注意区分：只有 `Take(2)`（没有 `Skip`）时，EF 会简化成 `SELECT TOP(2)`，`TOP` 不要求 `ORDER BY`，所以不会塞这一行 —— **但"取哪 2 条"依然不确定**，警告照样出现。

**第 3 步（P76）：键集分页，对比速度**
```csharp
long lastId = 0;
for (int i = 0; i < 3; i++)
{
    var batch = await ctx.Books.AsNoTracking()
        .Where(b => b.Id > lastId)
        .OrderBy(b => b.Id)
        .Take(2)
        .ToListAsync();

    if (batch.Count == 0) break;
    lastId = batch[^1].Id;                       // ^1 = 最后一个元素
    Console.WriteLine($"第 {i + 1} 批：{string.Join("、", batch.Select(b => b.Title))}");
}
```
```sql
SELECT TOP(2) [b].[Id], ...
FROM [T_Books] AS [b]
WHERE [b].[Id] > @__lastId_0
ORDER BY [b].[Id]
```
> 注意生成的是 `TOP(2)` 而不是 `OFFSET/FETCH`：**没有 `Skip` 时 EF 用 `TOP`**，`OFFSET` 只在有 `Skip` 时才需要。所以键集分页的 SQL 比偏移分页更简单、更快。
>
> `batch[^1]` 是 C# 8 的"从末尾索引"语法，`^1` = 倒数第一个，等价于 `batch[batch.Count - 1]`。

**第 4 步（P77）：流式遍历，看"什么时候才真的读"**
```csharp
Console.WriteLine("=== 开始流式遍历 ===");
int n = 0;
await foreach (var b in ctx.Books.AsNoTracking().AsAsyncEnumerable())
{
    Console.WriteLine($"读到：{b.Title}");
    if (++n >= 2) break;                          // 只读 2 行就退出
}
Console.WriteLine("=== 提前退出 ===");
```
日志现象：SQL 只发一条 `SELECT ... FROM T_Books`（**没有 `TOP`**），但代码只消费了 2 行就 `break`。**剩下的行没有被读进内存** —— 这就是流式。

**第 5 步（P77）：换成 `ToList`，同样的数据全进内存**
```csharp
var all = await ctx.Books.AsNoTracking().ToListAsync();
Console.WriteLine($"内存里现在有 {all.Count} 个对象（全部）");
```
> 用 `AsNoTracking()` 是为了排除跟踪器的影响。去掉它，`all` 和跟踪器各存一份引用，内存翻倍（P83 详细讲）。

**第 6 步（P78）：异步方法的三种坑**
```csharp
// 坑 1：同一个 ctx 并行查询 → 直接抛异常
try
{
    var t1 = ctx.Books.CountAsync();
    var t2 = ctx.Authors.CountAsync();
    await Task.WhenAll(t1, t2);
}
catch (InvalidOperationException ex)
{
    Console.WriteLine($"[坑1] {ex.Message[..60]}...");
}

// 坑 2：用 .Result 阻塞（别这么写，这里只是演示）
var cnt = ctx.Books.CountAsync().GetAwaiter().GetResult();
Console.WriteLine($"[坑2] 能跑，但线程被阻塞了：{cnt}");

// 正确：串行 await
var c1 = await ctx.Books.CountAsync();
var c2 = await ctx.Authors.CountAsync();
Console.WriteLine($"[正确] 书 {c1} 本，作者 {c2} 人");
```
```
[坑1] A second operation was started on this context instance before a previous ...
```

**第 7 步（P79）：非查询 SQL，并亲眼看到"跟踪器不刷新"**
```csharp
var book = await ctx.Books.FirstAsync(b => b.Id == 1);
Console.WriteLine($"改之前：{book.Title} = {book.Price}");

var affected = await ctx.Database.ExecuteSqlInterpolatedAsync(
    $"UPDATE T_Books SET Price = {99.0} WHERE Id = {book.Id}");
Console.WriteLine($"影响 {affected} 行");

Console.WriteLine($"跟踪器里的对象：{book.Price}");                        // 还是旧值
var again = await ctx.Books.FirstAsync(b => b.Id == 1);                   // 不再读库
Console.WriteLine($"再查一次：{again.Price}");                             // 还是旧值

ctx.ChangeTracker.Clear();                                                // 清空跟踪
var fresh = await ctx.Books.AsNoTracking().FirstAsync(b => b.Id == 1);
Console.WriteLine($"清空跟踪后：{fresh.Price}");                           // 99
```
输出：
```
改之前：C# 入门 = 49
影响 1 行
跟踪器里的对象：49
再查一次：49
清空跟踪后：99
```
**三段"还是 49"就是标识解析在起作用**：EF 认为"这个主键我管着，别再覆盖我的对象"。

**第 8 步（P79）：注入风险对比（只看 SQL，别真跑）**
```csharp
string name = "x' OR 1=1 --";

// 危险写法：内插字符串先被拼成普通 string，再交给 Raw
string sql = $"DELETE FROM T_Comments WHERE Content = '{name}'";
Console.WriteLine(sql);      // 拼出来是：DELETE FROM T_Comments WHERE Content = 'x' OR 1=1 --'
                             // 结果：整张表被删空（-- 后面的引号被注释掉了）

// 正确写法：Interpolated 拿的是 FormattableString，能识别"哪部分是值"
Console.WriteLine(ctx.Books
    .FromSqlInterpolated($"SELECT * FROM T_Books WHERE Title = {name}")
    .ToQueryString());
```
上面正确写法生成的 SQL：
```sql
SELECT * FROM T_Books WHERE Title = @p0
-- 参数 @p0 = 'x'' OR 1=1 --'（作为一个普通字符串值，不是 SQL 片段）
```
**参数化之后，引号和 `--` 都只是"值里的字符"，不再有语法意义。**这就是防注入的全部原理。所以 `ExecuteSqlInterpolated` 和 `FromSqlInterpolated` 接的都是 `FormattableString`（能拆），而 `...Raw` 接的是 `string`（已经拼死，救不回来）。

**第 9 步（P80）：`FromSql` 少一列会报错**
```csharp
try
{
    // 故意少选 PubTime
    var bad = await ctx.Books.FromSqlRaw("SELECT Id, Title, Price, AuthorId FROM T_Books").ToListAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"[报错] {ex.Message}");
}
```
```
The required column 'PubTime' was not present in the results of a 'FromSql' operation.
```
改成 `SELECT * FROM T_Books` 就好。**`SELECT *` 在 `FromSql` 里反而是对的**（虽然一般的 SQL 规范不建议，因为这里是"要喂给实体完形"）。

**第 10 步（P80）：原生 SQL + LINQ 组合**
```csharp
var mixed = ctx.Books
    .FromSqlInterpolated($"SELECT * FROM T_Books WHERE Price > {40}")
    .Where(b => b.Title.Contains("C#"))
    .OrderBy(b => b.Price);

Console.WriteLine(mixed.ToQueryString());
var result = await mixed.ToListAsync();
Console.WriteLine($"{result.Count} 条：{string.Join("、", result.Select(b => b.Title))}");
```
```sql
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime], [b].[AuthorId]
FROM (
    SELECT * FROM T_Books WHERE Price > @p0
) AS [b]
WHERE [b].[Title] LIKE N'%C#%'
ORDER BY [b].[Price]
```

**第 11 步（P81）：无键实体查统计**
```csharp
// Models/AuthorStat.cs
public class AuthorStat
{
    public long AuthorId { get; set; }
    public int Cnt { get; set; }
}

// DemoContext.OnModelCreating 里加一行
modelBuilder.Entity<AuthorStat>().HasNoKey();
```
```csharp
var stats = await ctx.Set<AuthorStat>()
    .FromSqlRaw("SELECT AuthorId, COUNT(*) AS Cnt FROM T_Books GROUP BY AuthorId")
    .OrderByDescending(s => s.Cnt)
    .ToListAsync();

foreach (var s in stats) Console.WriteLine($"作者 {s.AuthorId}：{s.Cnt} 本");
```
> 列别名 `AS Cnt` 不能省。SQL 返回的列名要能被 EF 匹配到属性名 `Cnt`，否则该属性是 `0`。

**第 12 步（P81）：ADO.NET 兜底**
```csharp
var conn = ctx.Database.GetDbConnection();
if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();

await using (var cmd = conn.CreateCommand())
{
    cmd.CommandText = "SELECT AuthorId, COUNT(*) AS Cnt FROM T_Books GROUP BY AuthorId ORDER BY Cnt DESC";

    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        Console.WriteLine($"作者 {reader.GetInt64(0)} 写了 {reader.GetInt32(1)} 本");
    }
}
```
```
作者 1 写了 2 本
作者 2 写了 1 本
作者 3 写了 1 本
```
> `await using` 确保 `Dispose`/`DisposeAsync` 被调用（`DbCommand` 和 `DbDataReader` 都实现了 `IAsyncDisposable`）。不释放会一直占着连接的 reader，后续查询可能报"已有打开的 DataReader"。

==四：总结==

**六节一页速查**

| 节 | 一句话结论 | 关键 API |
|---|---|---|
| **P76** 分页 | `Skip/Take` → `OFFSET/FETCH`，必须配 `OrderBy`；大偏移慢，用键集分页 | `Skip` / `Take` / `CountAsync` |
| **P77** 是否一次加载 | `IQueryable` 零数据；`ToList` 才"一次"，`foreach` 是流式；跟踪会累积 | `AsNoTracking` / `AsAsyncEnumerable` |
| **P78** 异步 | 终结方法都有 `Async`；同一 ctx 不能并发；别用 `.Result` | `ToListAsync` / `SaveChangesAsync` |
| **P79** 非查询 SQL | 用 `Interpolated` 别用 `Raw` + 内插；返回受影响行数；**绕过跟踪** | `ExecuteSqlInterpolatedAsync` |
| **P80** 查实体 | `FromSql` 必须返回全部映射列；能继续接 LINQ（包成子查询） | `FromSqlInterpolated` |
| **P81** 查任意结果 | 无键实体 / `SqlQuery<T>`（EF7+）/ ADO.NET 兜底 | `HasNoKey` / `GetDbConnection` |

**三种原生 SQL 的位置对照**

| 想要什么 | 用哪个 | 结果类型 | 能接 LINQ |
|---|---|---|---|
| 改数据，不要结果 | `ExecuteSqlInterpolated` | `int`（行数） | — |
| 查实体 | `FromSqlInterpolated` | `IQueryable<Book>` | 能 |
| 查统计/任意形状 | 无键实体 + `FromSql` | `IQueryable<AuthorStat>` | 能 |
| 查标量/任意类型（EF7+） | `SqlQuery<T>` | `IQueryable<T>` | 能 |
| 存储过程 / 多结果集 | ADO.NET | `DbDataReader` | 不能 |

**八个易错点**

1. **分页不写 `OrderBy`** → EF 塞 `ORDER BY (SELECT 1)`，翻页出现重复或漏数据。
2. **`ToList()` 之后 `Skip`** → 内存分页，等于全表扫描。
3. **`Skip` 传负数** → 数据库报 `OFFSET` 不能为负，接口里要挡 `page < 1`。
4. **`ToList` 拉百万行** → 不是 `IQueryable` 的错，是你让它一次全拿。用 `AsNoTracking` + 流式或分页。
5. **同一 ctx 上 `Task.WhenAll` 两个查询** → `A second operation was started on this context`。
6. **`ExecuteSqlRaw($"...{x}")`** → 字符串已拼好，参数化失效，注入风险。用 `Interpolated`。
7. **原生 SQL 改完立刻查，看到旧值** → 跟踪器不刷新，`ChangeTracker.Clear()` 或 `AsNoTracking`。
8. **`FromSql` 只 SELECT 部分列** → `The required column 'X' was not present`。要么 `SELECT *`，要么改投影。

**记忆口诀**

> **分页三件套：`OrderBy` 在前、`Skip/Take` 在后、`Count` 单查一遍。**
> **偏移分页越翻越慢，键集分页永远一样快。**
> **`IQueryable` 不装数据，`ToList` 才装；`foreach` 是流水线，但跟踪器是个筐，什么都往里装。**
> **终结方法才要 `Async`，一个 ctx 不许并发，`.Result` 是想把线程锁死。**
> **改数据用 `Interpolated`，别用 `Raw` 拼字符串；改完记得清跟踪，不然查出来还是旧的。**
> **查实体要 `SELECT *`，查统计要 `AS` 对齐列名；实在不行下 ADO.NET，代价是没有类型安全。**
