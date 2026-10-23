==一：概念==
**同一句 LINQ，三个数据库三种 SQL**

你写的是：
```csharp
ctx.Books.Where(b => b.Title.Contains("C#")).OrderBy(b => b.Price).Take(10).ToList();
```

但真正发到数据库的可能是：

| 数据库 | 生成的 SQL（节选） |
|---|---|
| SQL Server | `SELECT TOP(@__p_0) ... FROM [T_Books] AS [b] WHERE [b].[Title] LIKE @__p_1 ORDER BY [b].[Price]` |
| MySQL | ``SELECT ... FROM `T_Books` AS `t` WHERE `t`.`Title` LIKE @__p_1 ORDER BY `t`.`Price` LIMIT @__p_0`` |
| SQLite | `SELECT ... FROM "T_Books" AS "t" WHERE "t"."Title" LIKE @__p_1 ORDER BY "t"."Price" LIMIT @__p_0` |

**结论：LINQ 是跨库的"普通话"，SQL 是各地的"方言"，EF Core 的 Provider 就是翻译官。**

**为什么这件事必须知道**

1. **换库不是零成本**：`EF.Functions.Like`、自定义函数、类型映射、大小写敏感性都可能变。
2. **同一段代码在两个库上性能不同**：SQL Server 的 `OFFSET/FETCH` 深分页天然慢，MySQL 的 `LIMIT` 也一样慢，但优化手法不同。
3. **面试常问**："你换过数据库吗，踩了什么坑？" —— 答案就在这里。
4. **原生 SQL 是"方言"，不可移植**：`ExecuteSqlRaw` 里的 SQL 换库就得重写。

**方言差异清单（真实会踩到的）**

| 能力 | SQL Server | MySQL | SQLite |
|---|---|---|---|
| **标识符引用** | `[列]` | `` `列` `` | `"列"` |
| **分页** | `OFFSET ... FETCH NEXT` / `TOP` | `LIMIT ... OFFSET` | `LIMIT ... OFFSET` |
| **字符串拼接** | `+` | `CONCAT()` | `||` |
| **取当前时间** | `GETDATE()` | `CURRENT_TIMESTAMP` | `datetime('now')` |
| **字符串长度** | `LEN()` | `CHAR_LENGTH()` | `length()` |
| **`Contains` 翻译** | `LIKE '%x%'` | `LIKE '%x%'` | `instr(...) > 0` |
| **自增主键** | `IDENTITY(1,1)` | `AUTO_INCREMENT` | `AUTOINCREMENT` |
| **生成 GUID** | `NEWID()` | `UUID()` | **客户端生成**（无内置函数） |
| **布尔类型** | `bit` | `tinyint(1)` | `INTEGER` |
| **大小写敏感** | 默认**不敏感**（看排序规则） | 取决于 collation | 取决于 collation |

> 最容易翻车的是**大小写**：SQL Server 上 `"c#"` 能查到 `"C#"`，换成 PostgreSQL 就查不到。代码在本机好好的，上线换库就废了。

==二：格式==
**1. 换库只改一行（这是 EF Core 最大的价值）**
```csharp
opt.UseSqlServer(connStr);    // → Microsoft.EntityFrameworkCore.SqlServer
opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr));   // → Pomelo.EntityFrameworkCore.MySql
opt.UseSqlite(connStr);       // → Microsoft.EntityFrameworkCore.Sqlite
opt.UseNpgsql(connStr);       // → Npgsql.EntityFrameworkCore.PostgreSQL
```

**2. 用 `ToQueryString()` 对比方言（学习时必做）**
```csharp
Console.WriteLine(ctx.Books.Where(b => b.Price > 50).OrderBy(b => b.Id).Skip(20).Take(10)
                           .ToQueryString());
```

**3. 写跨库安全代码的三条规则**
```csharp
// ① 大小写不敏感比较：别依赖数据库排序规则，自己转小写
.Where(b => b.Title.ToLower().Contains(keyword.ToLower()))

// ② 模糊查询：用 EF.Functions.Like 明确表达（各 Provider 都实现了）
.Where(b => EF.Functions.Like(b.Title, $"%{keyword}%"))

// ③ 不用数据库特有函数；非要用的，抽成接口/分支
```
```csharp
// ④ 日期处理别写 DateTime.Now 参与查询条件，用参数传进来
var start = DateTime.Today;                     // ✅ 客户端算好，当参数
// .Where(b => b.PubTime >= start)
```

==三：代码==
**场景：同一个 LINQ，在三个 Provider 下的真实翻译**

**第 1 步：写一个与 Provider 无关的查询**
```csharp
public static IQueryable<Book> BuildQuery(DbContext ctx, string keyword) =>
    ctx.Set<Book>()
       .Where(b => b.Title.Contains(keyword))
       .OrderByDescending(b => b.PubTime)
       .Skip(20)
       .Take(10);
```

**第 2 步：三个 Provider 分别输出 SQL**

```csharp
using Microsoft.EntityFrameworkCore;

class Program
{
    static void Main()
    {
        var keyword = "C#";

        // ---- SQL Server ----
        var optSqlServer = new DbContextOptionsBuilder<DemoContext>()
            .UseSqlServer("Server=.;Database=D;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        using (var ctx = new DemoContext(optSqlServer))
            Console.WriteLine("=== SQL Server ===\n" + BuildQuery(ctx, keyword).ToQueryString());

        // ---- SQLite ----
        var optSqlite = new DbContextOptionsBuilder<DemoContext>()
            .UseSqlite("Data Source=demo.db")
            .Options;
        using (var ctx = new DemoContext(optSqlite))
            Console.WriteLine("\n=== SQLite ===\n" + BuildQuery(ctx, keyword).ToQueryString());

        // ---- MySQL ----
        var myConn = "Server=localhost;Database=D;User=root;Password=123456";
        var optMySql = new DbContextOptionsBuilder<DemoContext>()
            .UseMySql(myConn, ServerVersion.AutoDetect(myConn))
            .Options;
        using (var ctx = new DemoContext(optMySql))
            Console.WriteLine("\n=== MySQL ===\n" + BuildQuery(ctx, keyword).ToQueryString());
    }
}
```

**第 3 步：观察输出的差异（这就是本节的全部重点）**

```sql
=== SQL Server ===
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime]
FROM [T_Books] AS [b]
WHERE [b].[Title] LIKE @__keyword_0
ORDER BY [b].[PubTime] DESC
OFFSET @__p_1 ROWS FETCH NEXT @__p_2 ROWS ONLY

=== SQLite ===
SELECT "b"."Id", "b"."Title", "b"."Price", "b"."PubTime"
FROM "T_Books" AS "b"
WHERE instr("b"."Title", @__keyword_0) > 0
ORDER BY "b"."PubTime" DESC
LIMIT @__p_2 OFFSET @__p_1

=== MySQL ===
SELECT `b`.`Id`, `b`.`Title`, `b`.`Price`, `b`.`PubTime`
FROM `T_Books` AS `b`
WHERE `b`.`Title` LIKE CONCAT('%', @__keyword_0, '%')
ORDER BY `b`.`PubTime` DESC
LIMIT @__p_2 OFFSET @__p_1
```

**三处关键差异，逐个说清**

| 差异点 | 说明 |
|---|---|
| **分页语法** | SQL Server 用 `OFFSET/FETCH`（2012 才支持），MySQL/SQLite 用 `LIMIT/OFFSET` |
| **`Contains` 的翻译** | SQL Server/MySQL 用 `LIKE`，SQLite 用 `instr()>0`。**语义等价，但 LIKE 的前置 `%` 会让索引失效** |
| **MySQL 的 LIKE** | 参数化时被包成 `CONCAT('%', @p, '%')`，所以 MySQL 上 `Contains` 一定全表扫 |

**第 4 步：用 `EF.Functions.Like` 统一写法（可控性更强）**

```csharp
var q = ctx.Set<Book>().Where(b => EF.Functions.Like(b.Title, $"%{keyword}%"));
```
三个 Provider 都会老老实实翻译成 `LIKE`，行为一致，**换库时更可预测**。

**第 5 步：踩一次大小写坑（记忆最深）**

```csharp
// 库里有一条 Title = "C# 入门"
var n1 = await ctx.Books.CountAsync(b => b.Title.Contains("c#"));   // SQL Server: 1，PostgreSQL: 0
```
```csharp
// 跨库安全写法
var n2 = await ctx.Books.CountAsync(b => b.Title.ToLower().Contains("c#"));
```
> 注意：`ToLower()` 会让索引失效（`LOWER(Title)` 不是索引列）。**正确做法是给列建函数索引，或者干脆统一存储小写**。

==四：总结==

| 要点 | 结论 |
|---|---|
| **本质** | LINQ 跨库，SQL 有方言，Provider 负责翻译 |
| **换库成本** | 换 `UseXxx` 一行；但方言差异（分页/字符串/日期/大小写/自增）要逐个验证 |
| **必做验证** | 换库后跑一遍 `ToQueryString()`，人工复核 SQL |
| **原生 SQL** | 是方言，**不可移植**，换库必须重写 |
| **跨库安全写法** | `EF.Functions.Like`、日期用参数、大小写显式处理、不调数据库特有函数 |
| **同一个 Provider** | 不同大版本翻译也可能变（EF Core 6/7/8 有差异），升级后要回归 |

**记忆口诀：**

> **LINQ 是普通话，SQL 是方言，Provider 是翻译官。**
> **换库改一行，验证靠 ToQueryString。**
> **分页、拼接、时间、大小写、自增 —— 五处方言必查。**
