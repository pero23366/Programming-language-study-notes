==一：概念==
**EF Core 到底是什么**

一句话：**EF Core 是"LINQ 表达式"到"ADO.NET 命令"的翻译官**。它自己不实现网络协议、不自己连数据库，底层照样是 ADO.NET。

**一次查询的完整链路（7 步）**

```
① LINQ 表达式          ctx.Books.Where(b => b.Price > 50)
        ↓ 编译成表达式树（不是委托！）
② 表达式树             Expression<Func<Book,bool>>
        ↓ 查询翻译器（QueryTranslationPreprocessor / SqlTranslator）
③ SQL 字符串 + 参数    SELECT [b].[Id],... FROM [T_Books] AS [b] WHERE [b].[Price] > @__p_0
        ↓ 交给 Provider 的 ADO.NET 实现
④ DbCommand            Microsoft.Data.SqlClient.SqlCommand
        ↓ DbConnection 打开连接
⑤ 数据库执行           SQL Server 解析、执行、返回结果集
        ↓ DbDataReader 逐行读取
⑥ 物化（Materialization）  把每行数据反射塞进 new Book()
        ↓ 存入 ChangeTracker
⑦ 跟踪（Tracking）     记录原始值，之后属性一变就能被 DetectChanges 发现
```

**理解这条链的三个推论**

1. **"EF Core 慢"九成不是 ORM 的锅，是第 ③ 步生成的 SQL 差**。所以第 6 节（看 SQL）比什么都重要。
2. **第 ⑥ 步是反射**，这是 EF 比 Dapper 慢的主要原因之一（Dapper 用预编译 IL / 直接读列序号）。数据量大时差距明显。
3. **第 ⑦ 步是有成本的**。只读场景用 `AsNoTracking()` 把这一步砍掉，性能立刻提升（见 3-34）。

**`SaveChanges()` 内部在干什么**

```
① DetectChanges      —— 遍历跟踪的所有实体，比对当前值和原始值
② 生成命令           —— 新增→INSERT，修改→UPDATE（只更新变化的列），删除→DELETE
③ 排序               —— 按外键依赖排：先插主表再插子表，删除反过来
④ 打包执行           —— 一批命令尽量合并往返（受 MaxBatchSize 控制）
⑤ 回填               —— 自增主键值写回实体，状态从 Added/Modified 改为 Unchanged
⑥ 事务               —— 整批在一个事务里，任一失败全部回滚
```
> 这就是为什么"忘记 `SaveChanges()` 数据就没了"—— 前 5 步全在内存里。

==二：格式==
**EF Core 帮你做的事（你写）**
```csharp
List<Book> list = await ctx.Books.Where(b => b.Price > 50).ToListAsync();
```

**EF Core 背后真正执行的（ADO.NET，你平时不写）**
```csharp
using DbConnection conn = ctx.Database.GetDbConnection();   // 【关键】从 EF 手里借出连接
await conn.OpenAsync();

using DbCommand cmd = conn.CreateCommand();
cmd.CommandText = "SELECT [Id],[Title],[Price] FROM [T_Books] WHERE [Price] > @p0";
var p = cmd.CreateParameter();
p.ParameterName = "@p0";
p.Value = 50.0;
cmd.Parameters.Add(p);

using DbDataReader reader = await cmd.ExecuteReaderAsync();
var list = new List<Book>();
while (await reader.ReadAsync())
{
    list.Add(new Book
    {
        Id    = reader.GetInt64(0),
        Title = reader.GetString(1),
        Price = reader.GetDouble(2)
    });
}
```

**参数化为什么必须有**
```csharp
// ✅ EF 生成参数的 SQL，天然防注入
WHERE [b].[Title] = @__title_0

// ❌ 字符串拼接，注入风险
"SELECT * FROM T_Books WHERE Title = '" + title + "'"
```

==三：代码==
**实验：亲眼看到"EF 到底把 LINQ 变成了什么"**

```csharp
using Microsoft.EntityFrameworkCore;

public class DemoContext : DbContext
{
    public DbSet<Book> Books => Set<Book>();

    protected override void OnConfiguring(DbContextOptionsBuilder opt)
    {
        opt.UseSqlServer("Server=.;Database=DemoDb;Trusted_Connection=True;TrustServerCertificate=True");
        // 第 ⑥ 步 = 把 SQL 打到控制台，本篇最有用的一行
        opt.LogTo(Console.WriteLine, Microsoft.Extensions.Logging.LogLevel.Information);
    }
}

public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }
}

class Program
{
    static async Task Main()
    {
        using var ctx = new DemoContext();

        var list = await ctx.Books
            .Where(b => b.Price > 50 && b.Title.Contains("C#"))
            .OrderByDescending(b => b.Price)
            .Take(10)
            .ToListAsync();

        Console.WriteLine($"共 {list.Count} 条");
    }
}
```

**控制台输出（这就是第 ③ 步的真面目）**
```
Executed DbCommand (23ms) [Parameters=[@__p_0='50', @__p_1='%C#%'], CommandType='Text', CommandTimeout='30']
SELECT TOP(@__p_2) [b].[Id], [b].[Title], [b].[Price]
FROM [T_Books] AS [b]
WHERE ([b].[Price] > @__p_0) AND ([b].[Title] LIKE @__p_1)
ORDER BY [b].[Price] DESC
```
**看到 `LIKE` 和 `TOP` 就说明翻译成功了** —— `Contains` 被翻译成 `LIKE '%C#%'`，`Take(10)` 被翻译成 `TOP(10)`。

**实验二：验证"连接是 ADO.NET 的"**

```csharp
using var ctx = new DemoContext();
var conn = ctx.Database.GetDbConnection();
Console.WriteLine($"类型：{conn.GetType().FullName}");
Console.WriteLine($"连接串：{conn.ConnectionString}");
```
输出：
```
类型：Microsoft.Data.SqlClient.SqlConnection
连接串：Server=.;Database=DemoDb;...
```
> 铁证：EF Core 给的连接对象就是 `Microsoft.Data.SqlClient.SqlConnection`，和手写 ADO.NET 用的是同一个类。

**实验三：绕过 EF，直接在同一连接上跑原生 SQL**

```csharp
await ctx.Database.OpenConnectionAsync();         // 借连接
var cmd = ctx.Database.GetDbConnection().CreateCommand();
cmd.CommandText = "SELECT COUNT(*) FROM T_Books WHERE Price > 100";
var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
await ctx.Database.CloseConnectionAsync();        // 还连接
Console.WriteLine($"售价大于 100 的书有 {count} 本");
```

==四：总结==

| 环节 | 谁负责 | 说明 |
|---|---|---|
| LINQ → 表达式树 | C# 编译器 | `IQueryable` 上的 Lambda 变表达式树，不是委托 |
| 表达式树 → SQL | EF Core 查询翻译器 | 这一步决定性能，翻译不出来会抛异常或退化成客户端评估 |
| SQL → 数据库 | **ADO.NET**（`Microsoft.Data.SqlClient`） | EF Core 不自带驱动，靠 Provider |
| 结果 → 实体 | EF Core 物化 | 反射 + `DbDataReader` |
| 变化检测 | ChangeTracker | `SaveChanges()` 时统一 `DetectChanges` |
| 事务 | EF Core | 一次 `SaveChanges` = 一个事务，失败全回滚 |

**三个结论**

1. **EF Core ≠ 数据库驱动**。它是 ORM 层，下面永远是 ADO.NET + Provider。想换库，换 Provider 就行。
2. **性能问题先看生成的 SQL**（第 ③ 步），再看跟踪（第 ⑦ 步），最后才怪 EF 本身。
3. **原生 SQL 不冲突**：`ctx.Database.GetDbConnection()` 让你能在同一条连接、同一个事务里混写原生 SQL。

**记忆口诀：**

> **LINQ 变表达式树，表达式树变 SQL，SQL 交给 ADO.NET，结果物化回实体。**
> **慢先看 SQL，再看跟踪。**
