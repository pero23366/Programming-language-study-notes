==一：概念==
**为什么"看 SQL"是 EF Core 学习的分水岭**

上一节已经确认：EF Core 的性能问题 99% 出在"生成的 SQL 好不好"。所以**能不能一眼看到 EF 生成了什么 SQL，直接决定你能不能优化它**。

不会看 SQL 的人：写 `Where(b => b.Title.Contains("C#"))` → 觉得慢 → 猜 → 换写法 → 还是慢。
会看 SQL 的人：看到 `LIKE N'%C#%'` 全表扫描 → 立刻知道要加索引或换全文检索。

**EF Core 提供的 4 种查看方式**

| 方式 | 用在哪 | 特点 |
|---|---|---|
| `LogTo(Console.WriteLine, ...)` | 控制台程序、调试 | **最快，一行搞定** |
| `UseLoggerFactory(...)` | 需要接 ILogger 体系 | 可控输出目标、可分级 |
| `ToQueryString()` | 想**只看 SQL 不执行** | 不产生任何数据库往返 |
| `appsettings.json` 里调日志等级 | ASP.NET Core 项目 | 改配置即可，不改代码 |

**必须知道的两个开关**

- `EnableSensitiveDataLogging()`：默认日志里的参数值被打码成 `@__p_0='?'`。开了才会显示真实值。**只能在开发环境开**，因为它会把用户密码、手机号打进日志。
- `EnableDetailedErrors()`：出错时给出更详细的异常信息（比如哪一列映射失败）。

**ASP.NET Core 里日志分类的名字（背下来）**

```
Microsoft.EntityFrameworkCore.Database.Command     ← SQL 语句就在这个分类下
Microsoft.EntityFrameworkCore.Query                ← 查询翻译过程（含警告）
Microsoft.EntityFrameworkCore.Update               ← SaveChanges 的语句
```

==二：格式==
**1. 最简：LogTo 打控制台**
```csharp
protected override void OnConfiguring(DbContextOptionsBuilder opt)
{
    opt.UseSqlServer(connStr)
       .LogTo(Console.WriteLine, LogLevel.Information)   // 关键行
       .EnableSensitiveDataLogging();                     // 显示参数真实值
}
```

**2. 接 ILoggerFactory（自定义输出）**
```csharp
using var loggerFactory = LoggerFactory.Create(b =>
{
    b.AddConsole().SetMinimumLevel(LogLevel.Information);
});

opt.UseSqlServer(connStr)
   .UseLoggerFactory(loggerFactory)
   .EnableSensitiveDataLogging()
   .EnableDetailedErrors();
```

**3. 只看 SQL 不执行**
```csharp
string sql = ctx.Books.Where(b => b.Price > 50).ToQueryString();
Console.WriteLine(sql);
```

**4. ASP.NET Core 里改配置（不改代码）**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
```

**5. 只关心 SQL，屏蔽其他噪音**
```csharp
opt.LogTo(Console.WriteLine,
          new[] { RelationalEventId.CommandExecuted },   // 只订阅"命令已执行"事件
          LogLevel.Information);
```

==三：代码==
**场景：三种方式各跑一遍，对比输出**

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public class DemoContext : DbContext
{
    public DbSet<Book> Books => Set<Book>();

    private readonly bool _useLoggerFactory;

    public DemoContext(bool useLoggerFactory = false) => _useLoggerFactory = useLoggerFactory;

    protected override void OnConfiguring(DbContextOptionsBuilder opt)
    {
        const string connStr =
            "Server=.;Database=DemoDb;Trusted_Connection=True;TrustServerCertificate=True";

        if (_useLoggerFactory)
        {
            var factory = LoggerFactory.Create(b =>
                b.AddConsole().SetMinimumLevel(LogLevel.Information));

            opt.UseSqlServer(connStr)
               .UseLoggerFactory(factory)
               .EnableSensitiveDataLogging()
               .EnableDetailedErrors();
        }
        else
        {
            opt.UseSqlServer(connStr)
               .LogTo(Console.WriteLine, LogLevel.Information)
               .EnableSensitiveDataLogging();
        }
    }
}
```

**方式 1：LogTo 的输出（最常用）**
```csharp
using var ctx = new DemoContext();
var list = await ctx.Books.Where(b => b.Title.Contains("C#")).ToListAsync();
```
```
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (18ms) [Parameters=[@__title_0='%C#%' (Size = 4000)],
      CommandType='Text', CommandTimeout='30']
      SELECT [b].[Id], [b].[Title], [b].[Price]
      FROM [T_Books] AS [b]
      WHERE [b].[Title] LIKE @__title_0
```
**逐行读它**：
- `18ms` → 这条 SQL 耗时，超过 100ms 就要警惕
- `Parameters=[@__title_0='%C#%']` → 参数被参数化了（防注入）；开 `EnableSensitiveDataLogging` 才看得到 `%C#%`
- `LIKE @__title_0` → `Contains` 被翻译成 `LIKE`，前置 `%` **用不上索引**

**方式 2：ToQueryString（不执行，纯看 SQL）**
```csharp
var query = ctx.Books.Where(b => b.Price > 50 && b.Title.StartsWith("C#"));
Console.WriteLine(query.ToQueryString());
var sql = query.ToQueryString();
Console.WriteLine("--- SQL ---");
Console.WriteLine(sql);
Console.WriteLine("--- 还没执行，数据库一条连接都没开 ---");
```
```
SELECT [b].[Id], [b].[Title], [b].[Price]
FROM [T_Books] AS [b]
WHERE ([b].[Price] > 50.0) AND ([b].[Title] LIKE N'C#%')
```
> **`ToQueryString` 的最大价值**：`IQueryable` 是延迟执行的，你可以在**真正查库之前**把 SQL 打出来检查，尤其在拼接动态查询条件时特别有用。

**方式 3：ASP.NET Core 里靠配置开日志**

`Program.cs`：
```csharp
builder.Services.AddDbContext<DemoContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default"))
       .EnableSensitiveDataLogging()   // 只建议 Development 环境
       .EnableDetailedErrors());
```
`appsettings.Development.json`：
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
```
运行后控制台就直接出现 `Executed DbCommand`。

**实战：用 SQL 发现 N+1 查询**

```csharp
// 你以为查 1 次，实际查了 N+1 次
var authors = await ctx.Authors.Take(10).ToListAsync();      // 1 次
foreach (var a in authors)
{
    var books = await ctx.Books.Where(b => b.AuthorId == a.Id).ToListAsync();  // 10 次
}
```
日志里会看到 **11 条 `Executed DbCommand`** —— 这就是 N+1 问题的肉眼证据。改成 `Include` 后只剩 1 条（或 2 条）。

==四：总结==

| 方式 | 代码 | 适用场景 |
|---|---|---|
| `LogTo(Console.WriteLine, LogLevel.Information)` | 一行 | 控制台调试，**首选** |
| `UseLoggerFactory(...)` | 3~5 行 | 要接 ILogger、要控输出目标 |
| `ToQueryString()` | 一行 | **不执行**只想看 SQL、检查动态查询 |
| `appsettings.json` 日志等级 | 0 行代码 | ASP.NET Core 生产排错 |

**三个必知开关**

| 开关 | 作用 | 注意 |
|---|---|---|
| `EnableSensitiveDataLogging()` | 显示参数真实值 | **仅开发环境**，会泄露隐私数据 |
| `EnableDetailedErrors()` | 更详细的异常 | 仅开发环境 |
| `LogTo(..., new[]{RelationalEventId.CommandExecuted}, ...)` | 只订阅指定事件 | 屏蔽日志噪音 |

**记忆口诀：**

> **要快用 LogTo，要净用 ToQueryString，要生产用配置文件。**
> **参数是问号？加 EnableSensitiveDataLogging。**
