==一：概念==

**这一节到底在学什么**

P63 把表和表"连"好了，但有一个默认行为必须记住：

> **查询实体时，导航属性一律不加载。** `book.Author` 是 `null`，`author.Books` 是空集合 —— 而且**不报错**。

程序跑得通、数据也在库里，只是你拿不到。所以这一节的全部内容就是：**怎么让导航属性有值**。

---

**三种加载方式**

| 方式 | 英文名 | 触发时机 | 写法 | SQL 数量 | 用在哪 |
|---|---|---|---|---|---|
| **预加载** | Eager Loading | 主查询时一起查 | `Include(...)` | 1 条（带 JOIN） | 绝大多数场景 |
| **显式加载** | Explicit Loading | 你写代码手动补 | `Entry(a).Collection(x=>x.Books).Load()` | 2 条 | 有条件才补，如"点了展开才查" |
| **延迟加载** | Lazy Loading | 第一次访问属性时自动查 | 不写代码，靠 `virtual` + 代理 | N+1 条 | 不推荐，容易失控 |

一句话记：**能预加载就预加载**，另外两个只在"事后才知道要不要"时用。

---

**预加载的本质：改写 SQL，不是发两次查询**

`Include` 把两张表 `LEFT JOIN` 起来，一次返回：

```sql
SELECT a.Id, a.Name, b.Id, b.Title, b.Price, b.AuthorId
FROM Authors AS a
LEFT JOIN Books AS b ON a.Id = b.AuthorId
```

EF 拿到这张"宽表"后，在内存里**按主键去重**，重组回 `Author` 对象和它下面的 `Books` 集合。这个机制叫**标识解析（identity resolution）**。

---

**预加载的副作用：数据膨胀**

JOIN 会让主体数据重复。一个作者 10 本书，作者的 `Name` 就被传输 10 次；100 个作者 × 100 本书 = 10000 行。

EF Core 5 提供 `AsSplitQuery()`：拆成多条简单 `SELECT`。**省带宽，但多几次数据库往返**。

| 查 100 个作者及其书 | 产生的 SQL |
|---|---|
| `ToList()` 后访问 `.Books` | 1 条，全是空集合 |
| `Include(a => a.Books)` | 1 条（LEFT JOIN，宽表） |
| `Include(...).AsSplitQuery()` | 2 条（作者 1 条 + 书 1 条） |
| 显式加载循环 | 1 + N 条 |
| 延迟加载 | 1 + N 条（N+1 问题） |

---

**符号逐个拆解（本节新增的全部 API，第一次出现必须讲清）**

| 符号 | 是什么 | 谁调用它 | 不写会怎样 |
|---|---|---|---|
| `Include(expr)` | `IQueryable<T>` 的**扩展方法**，声明"把这个导航属性一起查" | 你的 LINQ 链 | 导航属性为空/null，且不报错 |
| `ThenInclude(expr)` | 接在 `Include` 后，**沿上一层继续往下带** | 链式调用 | 只能带一层，再深就断 |
| `AsSplitQuery()` | 扩展方法，**把单条 JOIN 拆成多条 SELECT** | 链式调用 | 笛卡尔积膨胀，行数翻倍 |
| `Entry(entity)` | `DbContext` 的方法，**拿到实体的跟踪入口** `EntityEntry` | 显式加载起点 | 无法对已查出的实体补刀 |
| `Collection(expr)` | `EntityEntry` 的方法，指向**集合导航** | `Entry` 之后 | — |
| `Reference(expr)` | 同上，指向**引用导航**（单个对象） | `Entry` 之后 | — |
| `Load()` | 执行并填充，同步；异步版 `LoadAsync()` | 你调用 | 属性仍是空 |
| `Query()` | 返回 `IQueryable`，可再筛选再 `Load` | 需要条件时 | 只能全量加载 |
| `IsLoaded` | 布尔属性，标记"这个导航是否已加载过" | 自己判断 | 可能重复查询 |
| `virtual` | C# 修饰符：**允许子类重写** | 延迟加载代理类重写它 | 代理无法拦截访问 → 延迟加载失效 |
| `UseLazyLoadingProxies()` | `DbContextOptionsBuilder` 的方法，**启用延迟加载代理** | `AddDbContext` 里配 | 光加 `virtual` 也不生效 |
| `Microsoft.EntityFrameworkCore.Proxies` | **独立的 NuGet 包**，代理功能不在主包 | 你 `dotnet add package` | 编译报找不到方法 |
| `AsNoTracking()` | 扩展方法，**查询结果不进变更跟踪**（P83 详讲） | 只读查询时 | 多占内存、多花跟踪开销 |

==二：格式==

**1. 一 → 多：主体带出所有子**
```csharp
ctx.Authors.Include(a => a.Books)
```

**2. 多 → 一：子带出主体**
```csharp
ctx.Books.Include(b => b.Author)
```

**3. 多级：往下两层**
```csharp
ctx.Authors.Include(a => a.Books).ThenInclude(b => b.Tags)
```

**4. 带过滤的 Include（EF Core 5+）**
```csharp
ctx.Authors.Include(a => a.Books.Where(b => b.Price > 50))
```

**5. 拆分查询**
```csharp
ctx.Authors.Include(a => a.Books).AsSplitQuery()
```

**6. 显式加载**
```csharp
ctx.Entry(author).Collection(a => a.Books).Load();    // 集合导航
ctx.Entry(book).Reference(b => b.Author).Load();      // 引用导航
```

**7. 显式加载 + 条件**
```csharp
ctx.Entry(author).Collection(a => a.Books).Query()
   .Where(b => b.Price > 50).Load();
```

**8. 延迟加载开关（Program.cs）**
```csharp
builder.Services.AddDbContext<BookContext>(opt =>
    opt.UseSqlServer(connStr).UseLazyLoadingProxies());
```
```csharp
// 实体：导航属性必须 virtual
public virtual List<Book> Books { get; set; } = new();
```

==三：代码==

**场景**：沿用图书管理系统（`Book` 1:N `Author`，P63 已配好）。目标：亲眼看到"不写 `Include` 是空集合，写了才有数据"。

**第 1 步：造一对多数据**
```csharp
[HttpPost("seed-relation")]
public async Task<ActionResult<object>> SeedRelation()
{
    var author = new Author
    {
        Name = "杨中科",
        Books = new List<Book>
        {
            new() { Title = "C# 入门",        Price = 49,  PubTime = DateTime.Today.AddDays(-100) },
            new() { Title = "EF Core 深入",    Price = 89,  PubTime = DateTime.Today.AddDays(-50) },
            new() { Title = "ASP.NET Core 实战", Price = 129, PubTime = DateTime.Today }
        }
    };

    _ctx.Authors.Add(author);       // 只 Add 作者，书自动跟进来（图遍历）
    await _ctx.SaveChangesAsync();  // 外键 AuthorId 自动回填

    return Ok(new { 作者Id = author.Id, 书数量 = author.Books.Count });
}
```
输出：`{ "作者Id": 1, "书数量": 3 }`

> **外键是 EF 自动回填的**：先 `INSERT Authors` 拿自增 Id，再把它写进三条 `INSERT Books`。你从没给 `AuthorId` 赋值，它却对了。

**第 2 步：不写 Include（现象复现）**
```csharp
[HttpGet("no-include")]
public async Task<ActionResult<object>> NoInclude()
{
    var authors = await _ctx.Authors.ToListAsync();
    var a = authors.First();
    return Ok(new
    {
        a.Name,
        书数量 = a.Books.Count,                              // 0
        第一本书 = a.Books.FirstOrDefault()?.Title ?? "(null)"
    });
}
```
输出：`{ "Name": "杨中科", "书数量": 0, "第一本书": "(null)" }`

控制台日志里只有一条 SQL，**没有 JOIN**：
```sql
SELECT [a].[Id], [a].[Name] FROM [Authors] AS [a]
```

**第 3 步：加上 Include（一 → 多）**
```csharp
[HttpGet("with-include")]
public async Task<ActionResult<object>> WithInclude()
{
    var authors = await _ctx.Authors.Include(a => a.Books).ToListAsync();
    return Ok(authors.Select(a => new
    {
        a.Name,
        书数量 = a.Books.Count,
        书目 = a.Books.Select(b => b.Title)
    }));
}
```
输出：`{ "Name": "杨中科", "书数量": 3, "书目": ["C# 入门","EF Core 深入","ASP.NET Core 实战"] }`

SQL 变成：
```sql
SELECT [a].[Id], [a].[Name], [b].[Id], [b].[Title], [b].[Price], [b].[PubTime], [b].[AuthorId]
FROM [Authors] AS [a]
LEFT JOIN [Books] AS [b] ON [a].[Id] = [b].[AuthorId]
ORDER BY [a].[Id]
```

**第 4 步：多 → 一方向**
```csharp
var books = await _ctx.Books
    .Include(b => b.Author)
    .Where(b => b.Price > 100)
    .ToListAsync();

foreach (var b in books)
    Console.WriteLine($"{b.Title} —— {b.Author?.Name}");
```
输出：`ASP.NET Core 实战 —— 杨中科`

**第 5 步：显式加载（事后补刀）**
```csharp
var author = await _ctx.Authors.FirstAsync(a => a.Name == "杨中科");
Console.WriteLine(author.Books.Count);          // 0

await _ctx.Entry(author).Collection(a => a.Books).Load();
Console.WriteLine(author.Books.Count);          // 3
```
注意：**必须用同一个 `DbContext` 实例查出来的实体**，换一个上下文 `Entry` 找不到它。

**第 6 步：显式加载 + 条件**
```csharp
var author = await _ctx.Authors.FirstAsync(a => a.Name == "杨中科");
var q = _ctx.Entry(author).Collection(a => a.Books).Query().Where(b => b.Price > 60);
await q.LoadAsync();

Console.WriteLine(author.Books.Count);   // 2（89 和 129）
```
坑：`Query()` 只筛**这次加载进来的**，本地已经有的 3 本还在。想只要 2 本，得先 `author.Books.Clear()`。

**第 7 步：延迟加载（要装包）**
```bash
dotnet add package Microsoft.EntityFrameworkCore.Proxies
```
```csharp
// Program.cs
opt.UseSqlServer(connStr).UseLazyLoadingProxies();
```
```csharp
// 实体
public virtual List<Book> Books { get; set; } = new();
```
```csharp
var author = await _ctx.Authors.FirstAsync();
Console.WriteLine(author.Books.Count);   // 不需要 Include，自动查 3
```
打开日志会看到：先一条 `SELECT Authors`，访问 `.Books` 时又一条 `SELECT Books` —— 这就是 **N+1**。

**第 8 步：AsSplitQuery 对比行数**

同一份数据分别用两种方式查，看返回行数：
```csharp
// 一条 JOIN：返回 3 行（3 本书），但作者 "杨中科" 重复 3 次
var joinRows = _ctx.Authors.Include(a => a.Books).ToQueryString();

// 两条查询：作者 1 行 + 书 3 行
var splitRows = _ctx.Authors.Include(a => a.Books).AsSplitQuery().ToQueryString();
```
再把作者 × 书的规模放大（10 个作者各 100 本书）：
- JOIN 方式：**1000 行**返回
- 拆分方式：作者 **10 行** + 书 **1000 行**

数据量级一样时，拆分不占优势；但**每行里的作者字段重复传输**才是真正的浪费。

==四：总结==

**一页速查**

| 要点 | 结论 |
|---|---|
| 默认行为 | 导航属性**不加载**，为空且不报错 |
| 预加载 API | `Include` / `ThenInclude`，本质是 SQL `LEFT JOIN` |
| 显式加载 API | `Entry().Collection()/Reference().Load()` |
| 延迟加载前提 | 装 `Proxies` 包 + `UseLazyLoadingProxies()` + 导航 `virtual` |
| 一 → 多方向 | `Include(a => a.Books)` |
| 多 → 一方向 | `Include(b => b.Author)` |
| 带条件带子集合 | `Include(a => a.Books.Where(...))`（EF Core 5+） |
| 数据膨胀的解药 | `AsSplitQuery()` |
| N+1 问题来源 | 延迟加载 / 循环里显式加载 |
| 只读查询 | 加 `AsNoTracking()` |

**五个易错点**

1. **`Include` 后的 `Where` 筛的是主体，不是子集合**

   ```csharp
   ctx.Authors.Include(a => a.Books).Where(a => a.Books.Any(b => b.Price > 100))
   ```
   结果：作者被筛出来了，但他的 `Books` 仍然是**全部**书。想筛子集合必须 `Include(a => a.Books.Where(...))`。

2. **`ThenInclude` 的 lambda 参数类型会变**

   接在上一层之后，`b` 是 `Book` 不是 `Author`；而且**只能链一层**，再深要继续 `ThenInclude`。

3. **WebAPI 里用延迟加载会炸序列化**

   `System.Text.Json` 序列化 `Author` → 遍历 `Books` → 每本书又遍历 `Author` → 报：
   `A possible object cycle was detected`。
   所以 WebAPI 里基本不用延迟加载，用 `Include` + DTO（或单向导航，P66）。

4. **`Include` 写在 `Select` 后面无效**

   `Select` 一旦投影成新对象，`Include` 被忽略（因为你不在查实体了）。正确做法：在 `Select` 里直接投影导航属性。

5. **显式加载换了 `DbContext` 就失效**

   `Entry(entity)` 只在**跟踪着这个实体的那个上下文**里有效。控制器里每次请求一个 `DbContext`，跨请求拿到的实体无法补刀。

**记忆口诀**

> **导航默认不加载，不报错，只给你空集合。**
> **一发命中用 Include，一条 JOIN 全带回；两层再加 ThenInclude。**
> **事后补刀靠 Entry，Collection 管集合、Reference 管单个。**
> **懒加载要装包、要 virtual、要开代理，方便但会 N+1 还炸 JSON。**
> **Join 太胖就 AsSplitQuery，只取几列就 Select 投影。**
