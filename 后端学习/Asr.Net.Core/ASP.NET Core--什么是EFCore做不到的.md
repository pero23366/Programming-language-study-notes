==一：概念==
**为什么要专门讲"EF Core 做不到什么"**

因为新手最容易犯的错，是**把所有 SQL 需求硬塞进 LINQ**。结果写出又长又慢、翻译不出来的表达式，最后得出"EF Core 性能差"的错误结论。

真实结论是：**EF Core 擅长"增删改查",不擅长"数据加工"**。前者占业务代码的 80%，后者占 20% —— 那 20% 就该老实写 SQL。

**EF Core 明确做不好 / 做不了的 7 件事**

| # | 场景 | 为什么不行 | 正确做法 |
|---|---|---|---|
| 1 | **复杂报表、多表聚合、窗口函数** | 翻译器表达不出 `ROW_NUMBER() OVER`、`PIVOT`、递归 CTE | 原生 SQL / 视图 / 存储过程 |
| 2 | **大批量增删改** | 默认逐条生成语句，10 万条 = 10 万次往返 | `ExecuteUpdate/ExecuteDelete`（EF7+）、`ExecuteSqlRaw`、`EFCore.BulkExtensions` |
| 3 | **SQL 精细调优** | 无法加查询提示 `WITH (NOLOCK)`、`OPTION (RECOMPILE)` | 原生 SQL |
| 4 | **数据库特有语法** | `MERGE`、`FOR XML`、`OPENJSON`、GEOGRAPHY 高级操作 | 原生 SQL |
| 5 | **跨库/跨服务器 Join** | 一个 DbContext 只对应一个库 | 同实例可用 `[schema].[db].[table]` 写原生 SQL；跨实例用中间层 |
| 6 | **大数据量 ETL / 数据迁移** | 物化 + 跟踪的内存开销爆炸 | `SqlBulkCopy` / Dapper / 专用 ETL 工具 |
| 7 | **动态表名/动态列名** | 表名在表达式树里是常量，运行时改不了 | 拼 SQL（**白名单校验，防注入**） |

**容易误判的两条**

- ❌ "EF Core 不能做复杂查询" —— 错。**多表 Join、分组、子查询它都行**，不行的是"分析型 SQL"（窗口函数、递归、行列转换）。
- ❌ "用了 EF Core 就不能写 SQL" —— 错。**两者共存是标准做法**。同一个连接、同一个事务里混着写完全合法。

**选型口诀**

> **写数据用 EF，算数据用 SQL。**
> **CRUD 归 ORM，报表归 Dapper。**

==二：格式==
**1. 官方推荐的批量操作（EF Core 7+，不加载实体直接执行）**
```csharp
// 批量改：一条 UPDATE 搞定，不查出来、不跟踪
await ctx.Books.Where(b => b.Price > 100)
               .ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, b => b.Price * 1.1));

// 批量删：一条 DELETE
await ctx.Books.Where(b => b.Price < 10).ExecuteDeleteAsync();
```

**2. 原生 SQL 三种写法（第 3-30~3-32 节详讲）**
```csharp
// 非查询（UPDATE/DELETE/DDL）
await ctx.Database.ExecuteSqlRawAsync("UPDATE T_Books SET Price = Price * 1.1 WHERE Price > 100");

// 查询映射到实体
var books = await ctx.Books.FromSqlRaw("SELECT * FROM T_Books WHERE Price > 100").ToListAsync();

// 任意查询（映射到任意类型，不参与跟踪）
var rows = await ctx.Database.SqlQueryRaw<BookStat>(
    "SELECT AuthorId, COUNT(*) AS Cnt FROM T_Books GROUP BY AuthorId").ToListAsync();
```

**3. 混用 Dapper（推荐组合：EF 管写、Dapper 管读）**
```csharp
using Dapper;
// 复用 EF 的连接，保证在同一事务里
var conn = ctx.Database.GetDbConnection();
var stats = await conn.QueryAsync<BookStat>(
    "SELECT AuthorId, COUNT(*) Cnt, AVG(Price) AvgPrice FROM T_Books GROUP BY AuthorId");
```

==三：代码==
**场景 A：EF 能做的复杂查询（别误会它不行）**

```csharp
// 多表 Join + 分组 + 聚合 + 子查询：全部能翻译成 SQL
var result = await ctx.Books
    .Where(b => b.Price > 50)
    .GroupBy(b => b.Author.Name)
    .Select(g => new
    {
        Author = g.Key,
        Count  = g.Count(),
        Max    = g.Max(b => b.Price)
    })
    .OrderByDescending(x => x.Count)
    .ToListAsync();
```
生成的 SQL 完全正常（`GROUP BY` + `JOIN` + `ORDER BY`）。**这就是"能"的边界内**。

**场景 B：EF 做不到的报表（排名 + 环比）**

需求：每个作者的书按价格排名，取前 3 本。

```csharp
// ❌ 硬写 LINQ：翻译不出来
// var q = ctx.Books.GroupBy(b => b.AuthorId)
//     .Select(g => g.OrderBy(b => b.Price).Take(3));   // 抛 InvalidOperationException
```
```csharp
// ✅ 原生 SQL + 窗口函数
public class RankedBook
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }
    public int Rnk { get; set; }
}

var top3 = await ctx.Database.SqlQueryRaw<RankedBook>(@"
    SELECT Id, Title, Price, Rnk FROM (
        SELECT Id, Title, Price,
               ROW_NUMBER() OVER (PARTITION BY AuthorId ORDER BY Price DESC) AS Rnk
        FROM T_Books
    ) t WHERE t.Rnk <= 3").ToListAsync();
```
> `ROW_NUMBER() OVER` 就是 EF 翻译不出来的东西。**这种时候不要跟 EF 较劲**。

**场景 C：批量更新的性能差距（真实数字观感）**

```csharp
// ❌ 慢：1 万条 = 先查 1 万条进内存 + 逐条 UPDATE
var books = await ctx.Books.Where(b => b.Price > 100).ToListAsync();
foreach (var b in books) b.Price *= 1.1;
await ctx.SaveChangesAsync();

// ✅ 快：一条 SQL
await ctx.Books.Where(b => b.Price > 100)
               .ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, b => b.Price * 1.1));
```
实测量级：1 万条时 `SaveChanges` 大约几秒到十几秒，`ExecuteUpdate` 在 100 毫秒级。**差 1~2 个数量级**。

**场景 D：动态表名（唯一需要拼字符串的地方）**

```csharp
// 表名不能参数化，只能拼接 → 必须白名单
private static readonly HashSet<string> AllowedTables = new() { "T_Books", "T_Authors" };

public async Task<List<object>> QueryAsync(string table)
{
    if (!AllowedTables.Contains(table))
        throw new ArgumentException("非法表名");
    // 用 FromSql + FormattableString，EF 会把参数部分参数化，表名部分原样拼接
    return await ctx.Database.SqlQueryRaw<object>($"SELECT * FROM [{table}]").ToListAsync();
}
```

==四：总结==

| EF Core 擅长 | EF Core 不擅长 |
|---|---|
| 单表/多表 CRUD | 窗口函数、递归 CTE、PIVOT |
| Join、分组、聚合、子查询 | 百万级批量增删改 |
| 关系导航（Include） | 查询提示、索引提示 |
| 事务、并发控制 | 跨库 Join |
| 变更跟踪（自动算差异） | 动态表名/列名 |

**四条行动准则**

1. **能用 LINQ 表达清楚的，就用 LINQ** —— 可维护性远高于拼 SQL。
2. **翻译不出来的，果断下原生 SQL** —— 别用 `AsEnumerable()` 硬转内存过滤（那是把 1 万行数据搬到 C# 里筛）。
3. **批量操作用 `ExecuteUpdate/Delete`**（EF7+），老版本用 `ExecuteSqlRaw` 或批量扩展库。
4. **复杂报表模块单独抽出，用 Dapper/SQL 写**，和 EF 共用连接和事务。

**记忆口诀：**

> **写数据用 EF，算数据用 SQL。**
> **翻译不出来就下 SQL，别把数据搬到内存里筛。**
