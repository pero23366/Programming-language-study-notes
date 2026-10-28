==一：概念==

> 本篇覆盖 **P85–P86**：批量删除/新增/修改/插入、全局查询筛选器。
> 这两节是一条线：**P85 讲"绕过跟踪器、一条 SQL 改一万行"，P86 讲"给所有查询偷偷加一个 WHERE"**，
> 合起来正好是软删除的完整实现。
> 环境：你练习项目的真实配置 —— **.NET 10 / EF Core 10.0.13 / SqlServer 提供程序 / LocalDB 库 `BookDemo`**，
> 实体 `Book`（`long Id` / `Title` / `double Price` / `PubTime` / `AuthorId` / `ReviewerId?` / `CategoryId?`）。
> 起点：你 `BooksController` 里**已经有** `bulk-slow` 和 `bulk-fast` 两个接口（`POST /api/books/bulk-slow`、`/bulk-fast`），
> 本篇就是把这两个接口背后的原理讲透，再补上删除、插入、事务和筛选器。

---

# P85　如何批量删除、新增、修改、插入

**核心结论：`ExecuteUpdate` / `ExecuteDelete` 把 LINQ 翻译成一条 `UPDATE` / `DELETE` 直接下发数据库，
中途**不加载任何数据、不经过跟踪器**。这是 EF Core 7 才有的能力，你现在用的 10 完全支持。**

## 先看你已有的两个接口，慢在哪

```csharp
// bulk-slow：查 → 循环改 → SaveChanges
var books = await _ctx.Books.Where(b => b.Price > 100).ToListAsync();  // ①
foreach (var b in books) b.Price *= 1.1;                               // ②
await _ctx.SaveChangesAsync();                                         // ③
```

```csharp
// bulk-fast：一条 SQL
int rows = await _ctx.Books
    .Where(b => b.Price > 100)
    .ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, b => b.Price * 1.1));
```

差在三件事上，**跟"循环"本身一点关系都没有**：

| 阶段 | `bulk-slow` 做了什么 | `bulk-fast` |
|---|---|---|
| ① 查 | 把所有 `Price > 100` 的行**全部传回客户端**（哪怕只改一列），每行建一个对象、一份快照、一条 `EntityEntry` | 一条 `SELECT` 都不发 |
| ② 改 | 内存里逐个改属性（这一步其实不慢） | 什么都不做 |
| ③ 存 | `SaveChanges` 要**逐属性比对快照**，然后**每条一个 UPDATE 语句**（EF 会把它们打包成批，但 SQL 语句还是 N 条，数据库要执行 N 次） | 一条 `UPDATE ... WHERE` |
| 网络往返 | 至少 2 次（查一次、写 N/42 次） | 1 次 |

> 这就是为什么 `bulk-slow` 改 5000 行要好几秒，而 `bulk-fast` 只要几十毫秒——**差的是"数据有没有过一遍客户端"**。

## `ExecuteDelete` / `ExecuteUpdate` 到底是什么

它俩是 `IQueryable<T>` 上的**扩展方法**（`RelationalQueryableExtensions`），不是 `DbSet` 的方法——所以你能接任意 LINQ 条件：

```csharp
// 删：LINQ 决定"删哪些"，EF 直接翻译成 DELETE
await _ctx.Books.Where(b => b.Price < 10).ExecuteDeleteAsync();
```
```sql
DELETE FROM [b]
FROM [Books] AS [b]
WHERE [b].[Price] < 10.0
```

```csharp
// 改：还要说"改成什么"，用 SetProperty
await _ctx.Books.Where(b => b.Price < 10)
    .ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, 20.0));
```
```sql
UPDATE [b]
SET [b].[Price] = @__p_0
FROM [Books] AS [b]
WHERE [b].[Price] < 10.0
```

`SetProperty` 的第二个参数有**两种形态**，这是本节最需要记住的语法点：

| 形态 | 写法 | 生成的 SET |
|---|---|---|
| 给常量（值） | `SetProperty(b => b.Price, 20.0)` | `SET [Price] = @p0` |
| 引用当前值（lambda） | `SetProperty(b => b.Price, b => b.Price * 1.1)` | `SET [Price] = [Price] * @p0` |

多个字段就链式往下接：

```csharp
await _ctx.Books.Where(b => b.Price > 100)
    .ExecuteUpdateAsync(s => s
        .SetProperty(b => b.Price, b => b.Price * 0.9)
        .SetProperty(b => b.Title, b => b.Title + "（促销）"));
```
```sql
UPDATE [b]
SET [b].[Price] = [b].[Price] * @__p_0,
    [b].[Title] = [b].[Title] + N'（促销）'
FROM [Books] AS [b]
WHERE [b].[Price] > 100.0
```

两个方法都**返回受影响行数**（`int`），不是 void。这个返回值有两个用处：显示"影响了多少条"，以及自己做并发检查（下面讲）。

## 三条铁律（背下来，会踩的都是它们）

### 铁律一：立即执行，不需要 `SaveChanges`

调用那一刻 SQL 就发出去了。**它不排队、不攒批、不参与"最后一起来保存"。** 连着调三次就是三次独立往返：

```csharp
await _ctx.Books.Where(b => b.Id == 1).ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, 1));
await _ctx.Books.Where(b => b.Id == 2).ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, 2));
// ↑ 已经是两条 SQL、两次往返了，不能合并
```

> 官方限制里明确写了："Multiple invocations of these methods cannot be batched. Each invocation performs its own roundtrip."

### 铁律二：完全绕过跟踪器，跟踪器不会同步

这是**最容易出事故**的一条。看这个顺序：

```csharp
var b = await _ctx.Books.FirstAsync(x => x.Id == 1);      // 查出来，Price = 59.8，快照也是 59.8
await _ctx.Books.ExecuteUpdateAsync(                       // 库里所有书 Price + 1
    s => s.SetProperty(x => x.Price, x => x.Price + 1));

Console.WriteLine(b.Price);                                // 还是 59.8！内存里的对象没变

b.Price += 2;                                              // 内存 61.8
await _ctx.SaveChangesAsync();                             // 拿旧快照 59.8 比对，判定"改成了 61.8"
```

**结果库里是 61.8，不是 62.8。** `ExecuteUpdate` 加的那个 1 被 `SaveChanges` 覆盖掉了。

原因：`ExecuteUpdate` 压根没告诉跟踪器"我改了这行"，跟踪器手里的快照还是 59.8，它老老实实按自己的账本把 61.8 写回去。官方文档的原话是 **"EF's change tracker is not updated"**，并建议 **"avoid mixing both tracked SaveChanges modifications and untracked modifications"**。

**结论：同一个 DbContext 实例里，别一边用 `ExecuteUpdate/Delete` 一边用 `SaveChanges` 改同一批数据。** 非要混，改完先 `_ctx.ChangeTracker.Clear()`。

### 铁律三：不隐含事务

每次 `ExecuteUpdate` / `ExecuteDelete` 都是**自己一个独立事务**（autocommit）。两个操作之间出事，第一个已经落库了：

```csharp
await _ctx.Books.Where(...).ExecuteUpdateAsync(...);   // ← 这条已经提交了
await _ctx.Books.Where(...).ExecuteDeleteAsync(...);   // ← 这条失败了
// 结果：第一步生效，第二步没做，数据处于中间状态
```

要"要么全做要么全不做"，得自己开事务：

```csharp
await using var tx = await _ctx.Database.BeginTransactionAsync();
try
{
    await _ctx.Books.Where(b => b.Price < 10).ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, 10.0));
    await _ctx.Books.Where(b => b.AuthorId == 3).ExecuteDeleteAsync();
    await tx.CommitAsync();
}
catch
{
    await tx.RollbackAsync();
    throw;
}
```

> `BeginTransactionAsync` 返回 `IDbContextTransaction`，`await using` 保证连接释放时事务也结束。
> 注意：事务期间**不能**在另一个线程上用同一个 ctx 查数据（P78 那条"一个 ctx 不许并发"照样管用）。

## `ExecuteDelete` 的另一个隐藏坑：跟踪器里的"僵尸"

```csharp
var b = await _ctx.Books.FirstAsync(x => x.Id == 6);   // 跟踪器里有它，State = Unchanged
await _ctx.Books.Where(x => x.Id == 6).ExecuteDeleteAsync();   // 库里删了，跟踪器不知道

b.Price = 100;                  // 改一下
await _ctx.SaveChangesAsync();  // 尝试 UPDATE 一行已经不存在的记录 → 影响 0 行
```
```
Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException:
  The database operation was expected to affect 1 row(s), but actually affected 0 row(s)
```

**"预期影响 1 行，实际 0 行"** 是并发异常的固定文案。它这里的意思不是并发，是**你删的那行，跟踪器以为还在**。

## 五个限制（官方列出的，别硬试）

| 限制 | 说明 / 绕法 |
|---|---|
| **只能改和删，不能插入** | 插入还得 `Add`/`AddRange` + `SaveChanges`（批量插入见下文） |
| **`SetProperty` 里不能引用导航属性** | `SetProperty(b => b.Price, b => b.Author.Id)` 会报错。要算关联值就先 `Select` 投影再改：`.Select(b => new { b, Avg = b.Comments.Average(...) }).ExecuteUpdateAsync(s => s.SetProperty(x => x.b.Price, x => x.Avg))` |
| 多次调用不能合并成一批 | 每次一个往返 |
| 一次只能改**一张表** | `UPDATE ... FROM` 也只有一个目标表 |
| 只支持关系型数据库提供程序 | Cosmos 之类的用不了 |

## 批量插入：EF Core 没有"一条 SQL 插一万行"

插入是 `ExecuteUpdate/Delete` 覆盖不到的，只能走 `AddRange` + `SaveChanges`。但这条路也不是完全没优化：

**EF Core 会自动把多条 INSERT 打包成一批（batching）**

| 参数 | 默认值 | 含义 |
|---|---|---|
| `MinBatchSize` | **4** | 少于 4 条语句时不分批（分批反而更慢） |
| `MaxBatchSize` | **42** | 一次往返最多带 42 条语句，超了就再来一趟 |

所以你 `AddRange` 插 5000 条，实际是 **⌈5000 / 42⌉ = 120 次往返**，每次带 42 条 `INSERT`。这已经比 5000 次往返快了两个数量级，**但仍是 5000 条 INSERT 语句**，数据库要执行 5000 次。

想再快，只有换路子：

| 方案 | 原理 | 代价 |
|---|---|---|
| `AddRange` + `SaveChanges`（默认） | 分批的普通 INSERT | 5000 条 INSERT，120 次往返；**能拿到自增 Id、能触发 SaveChanges 事件** |
| `EFCore.BulkExtensions`（第三方包） | 走 `SqlBulkCopy`（SQL Server 的批量导入通道） | 快一个数量级；但**默认绕过跟踪器**，且要注意包版本与 EF Core 主版本对齐 |
| 原生 SQL（`ExecuteSqlRaw` + 表值参数 / `MERGE`） | 一条语句插一批 | 最快、最可控；但要自己拼 SQL、自己防注入 |

> 课里提到的 `Zack.EFCore.Batch` 是杨中科自己写的库，在 EF Core 7 **之前**用 `BatchDeleteAsync` / `BatchUpdateAsync` 补上了这块短板。你现在用 EF Core 10，**优先用原生 `ExecuteDelete/ExecuteUpdate`，不要为了这个再引第三方包**。

## EF Core 10 新东西：`ExecuteUpdateAsync` 收普通 lambda 了

EF Core 7–9 里，`ExecuteUpdateAsync` 的参数是**表达式树**（`Expression<Func<SetPropertyCalls<T>, SetPropertyCalls<T>>>`），意味着**里面不能写 `if`**，想按条件动态加 `SetProperty` 只能手搓表达式树（那正是批次 07 的内容，非常痛苦）。

EF Core 10 放开了：

```csharp
// 想更新 Views；如果 nameChanged 为 true，顺便改 Name
await _ctx.Books.ExecuteUpdateAsync(s =>
{
    s.SetProperty(b => b.Price, 88.0);

    if (nameChanged)                                   // ← EF10 才能这么写
    {
        s.SetProperty(b => b.Title, "新标题");
    }
});
```

你的项目正是 EF Core 10，**这条可以直接用**，不用再等学完表达式树。

---

# P86　全局查询筛选器

**一句话：给实体配一个"永远生效的 WHERE"，从此所有查询、`Include`、`ExecuteUpdate/Delete` 都会自动带上它——这就是软删除的地基。**

## 从"真删"到"打个标记"

传统删除 = `DELETE`，数据没了，想恢复只能靠备份。**软删除**是另一种思路：加一个标记列，删除时只把标记改成 true，查询时永远排除它们。

```csharp
public class Book
{
    // ...原有属性
    public bool IsDeleted { get; set; }        // 软删除标记
}
```

```csharp
// BookContext.OnModelCreating 里
modelBuilder.Entity<Book>().HasQueryFilter(b => !b.IsDeleted);
```

就这两行。之后：

```csharp
var list = await _ctx.Books.ToListAsync();
```
```sql
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime],
       [b].[AuthorId], [b].[ReviewerId], [b].[CategoryId], [b].[IsDeleted]
FROM [Books] AS [b]
WHERE [b].[IsDeleted] = CAST(0 AS bit)      -- ← 你没写，EF 加的
```

**筛选器会叠加在这三个地方**，这点必须清楚：

| 场景 | 会不会带筛选器 |
|---|---|
| 普通 LINQ 查询（`ToList` / `First` / `Count` / `Any`…） | **会** |
| `Include` 出来的导航实体（如果被 Include 的类型自己也有筛选器） | **会** |
| `ExecuteUpdate` / `ExecuteDelete`（因为它就是 `IQueryable`） | **会** |

第三条是最妙的地方：软删除可以直接这么写——

```csharp
await _ctx.Books.Where(b => b.Id == 6)
    .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDeleted, true));
```
```sql
UPDATE [b]
SET [b].[IsDeleted] = CAST(1 AS bit)
FROM [Books] AS [b]
WHERE [b].[Id] = @__id_0 AND [b].[IsDeleted] = CAST(0 AS bit)
--                            ↑ 筛选器自动跑到 WHERE 里了
```

注意 `WHERE` 里多了 `IsDeleted = 0`：**已经删过的书不会再被"删"一次**，天然幂等。

## `IgnoreQueryFilters()`：我要看全部

```csharp
var all = await _ctx.Books.IgnoreQueryFilters().ToListAsync();
```
```sql
SELECT ... FROM [Books] AS [b]        -- 没有 WHERE IsDeleted 了
```

回收站、后台管理、数据校对都得用它。

> 注意：`IgnoreQueryFilters()` 是**整个查询生效**的——它不区分"只想忽略软删除"还是"想忽略别的"。EF Core 10 之前一个实体只能有一个筛选器，所以也没有"部分忽略"的需求。现在有了，见下。

## EF Core 10：给筛选器起名字

EF Core 10 之前，一个实体**只能有一个**筛选器——写第二个会覆盖第一个（这坑很隐蔽，配置了租户过滤又配置软删除，结果只剩一个）。

EF Core 10 引入**命名筛选器**（named query filters），多个筛选器可以共存，也能只忽略其中某一个：

```csharp
modelBuilder.Entity<Book>()
    .HasQueryFilter("SoftDelete", b => !b.IsDeleted)
    .HasQueryFilter("Tenant", b => b.CategoryId != null);   // 举例，实际可换成租户 Id 判断
```

```csharp
// 只忽略软删除，租户筛选器照样生效
var deleted = await _ctx.Books.IgnoreQueryFilters(["SoftDelete"]).ToListAsync();
```

| 写法 | EF Core 版本 | 语义 |
|---|---|---|
| `HasQueryFilter(expr)` | 全版本 | 配一个无名筛选器（**只能有一个**） |
| `HasQueryFilter("Name", expr)` | **EF Core 10+** | 配一个命名筛选器，可与其它共存 |
| `IgnoreQueryFilters()` | 全版本 | 忽略所有筛选器 |
| `IgnoreQueryFilters(["Name"])` | **EF Core 10+** | 只忽略指定名字的筛选器 |

你的项目是 EF Core 10.0.13，**命名筛选器现在就能用**。哪怕暂时只有一个筛选器，也建议起个名字——将来加租户过滤时不用回头改。

## 四个必须知道的坑

**坑 1：查不到 ≠ 不存在**

软删除之后，`FirstAsync(b => b.Id == 6)` 抛 `InvalidOperationException`（序列不含元素），`FindAsync(6)` 返回 `null`，`CountAsync()` 少一个。**所有"这条数据去哪了"的疑问，先看筛选器。**

尤其是 `FindAsync`：它先查跟踪器、再查库，两条路都受筛选器影响。

**坑 2：唯一索引仍然会撞**

软删除的行**还在表里**。如果 `Title` 上有唯一索引，你"删掉"了《C# 入门》，再想插入一本同名的——直接 `UNIQUE KEY` 冲突，而界面上你根本看不到那本书。

> 两种解法，推荐第一种：
>
> | 方案 | 写法（Fluent API） | 特点 |
> |---|---|---|
> | **过滤唯一索引**（推荐） | `entity.HasIndex(b => b.Title).IsUnique().HasFilter("[IsDeleted] = 0")` | 只对"未删除"的行做唯一检查，可以无限次软删同名 |
> | 联合唯一索引 | `entity.HasIndex(b => new { b.Title, b.IsDeleted }).IsUnique()` | 简单，但**只能容忍一条已删除的同名记录**——删第二个同名照样撞 |
>
> 这是软删除最经典的后续麻烦，写之前先想好索引怎么建。

**坑 3：必需导航 + 筛选器 → 模型校验警告**

你项目里 `BookDetail.BookId` 是必填（`Book` 是必需的一端）。给 `Book` 加筛选器之后，启动时会看到一条 `ModelValidation` 警告，大意是：

> Entity 'Book' has a global query filter defined and is the required end of a relationship with the entity 'BookDetail'.
> This may lead to unexpected results when the required entity is filtered out.

意思是：`Book` 被过滤掉了，但 `BookDetail` 还在，`Include` 时会出现"详情存在、书不存在"的怪状态。

消除办法有三个，按推荐度排：

| 办法 | 说明 |
|---|---|
| 给 `BookDetail` 也加同样的筛选器 | `HasQueryFilter(d => !d.Book.IsDeleted)` —— 需要导航，且会引入新警告，慎用 |
| 把关系改成可选 | `BookId` 改成 `long?` + `IsRequired(false)`，语义上承认"详情可以没有书" |
| 接受它 | 软删除场景下这个警告通常是噪音，但要清楚它的含义 |

**坑 4：外键约束不会因为筛选器消失**

`BookDetail` 对 `Book` 的外键还在。软删除了 `Book`，`BookDetail` 依然指着它——**这是好事**（数据完整），但意味着你**不能**随手用 `ExecuteDelete` 真删 `Book`，外键会拦你。软删除和真删除在数据库层面完全是两回事。

---

==二：格式==

## P85　批量操作 API 速查

**删除**
```csharp
int rows = await _ctx.Books.Where(b => b.Price < 10).ExecuteDeleteAsync();
```

**修改（常量）**
```csharp
int rows = await _ctx.Books.Where(b => b.Price < 10)
    .ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, 20.0));
```

**修改（引用当前值）**
```csharp
int rows = await _ctx.Books.Where(b => b.Price > 100)
    .ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, b => b.Price * 1.1));
```

**多个字段**
```csharp
await _ctx.Books.Where(b => b.Price > 100).ExecuteUpdateAsync(s => s
    .SetProperty(b => b.Price, b => b.Price * 0.9)
    .SetProperty(b => b.Title, b => b.Title + "（促销）")
    .SetProperty(b => b.PubTime, DateTime.Today));
```
> 注意第一个 `SetProperty` 的第二个参数是 lambda（`b => ...`），第三个是常量（`DateTime.Today`）——两种形态可以混着用。

**EF Core 10：带条件的动态拼装**
```csharp
await _ctx.Books.Where(b => b.AuthorId == 1).ExecuteUpdateAsync(s =>
{
    s.SetProperty(b => b.Price, b => b.Price * 1.1);
    if (promotion)
    {
        s.SetProperty(b => b.Title, b => b.Title + "🔥");
    }
});
```

**显式事务包住多个操作**
```csharp
await using var tx = await _ctx.Database.BeginTransactionAsync();
await _ctx.Books.Where(...).ExecuteUpdateAsync(...);
await _ctx.Books.Where(...).ExecuteDeleteAsync();
await tx.CommitAsync();
```

**批量插入（三种粒度）**
```csharp
// ① 默认：AddRange + SaveChanges（EF 自动分批，SQL Server 每批 ≤42 条）
_ctx.Books.AddRange(list);
await _ctx.SaveChangesAsync();

// ② 调大每批的条数（默认 MinBatchSize=4 / MaxBatchSize=42）
optionsBuilder.UseSqlServer(conn, o => o.MaxBatchSize(100));

// ③ 走 SqlBulkCopy（需引 EFCore.BulkExtensions 包）
await _ctx.BulkInsertAsync(list);
```

**混用时的隔离**
```csharp
await _ctx.Books.ExecuteUpdateAsync(...);
_ctx.ChangeTracker.Clear();          // 丢掉所有旧快照，避免 SaveChanges 覆盖
```

## P86　全局查询筛选器 API 速查

| 想做的事 | 写法 |
|---|---|
| 配筛选器（全版本） | `modelBuilder.Entity<Book>().HasQueryFilter(b => !b.IsDeleted)` |
| 配命名筛选器（EF10+） | `modelBuilder.Entity<Book>().HasQueryFilter("SoftDelete", b => !b.IsDeleted)` |
| 查询时忽略全部 | `.IgnoreQueryFilters()` |
| 查询时只忽略某个（EF10+） | `.IgnoreQueryFilters(["SoftDelete"])` |
| 软删除（推荐） | `.Where(...).ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDeleted, true))` |
| 恢复 | `.IgnoreQueryFilters().Where(b => b.Id == 6).ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDeleted, false))` |

> 恢复一定要带 `IgnoreQueryFilters()`：不带的话，`WHERE` 里会有 `IsDeleted = 0`，而你要恢复的那行正好是 1，**匹配不到，影响 0 行**——而且不报错。

**筛选器的位置：只能在 `OnModelCreating` 里**

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    modelBuilder.Entity<Book>().HasQueryFilter("SoftDelete", b => !b.IsDeleted);
}
```

> 筛选器是**模型配置**，编译进模型缓存，不是每次查询传参。所以筛选器条件里**引用的值必须是"模型构建时能算出来的"**——比如 DbContext 上的一个属性（多租户场景的 `CurrentTenantId`）。
>
> 反例（别写）：`HasQueryFilter(b => b.Price > someLocalVariable)` —— 局部变量在模型构建时就固定了，不会随请求变化。

---

==三：代码==

**前提**：练习项目 `BookContext` / LocalDB `BookDemo`，已开 `LogTo` 看 SQL。每步单独跑，**先看耗时和 SQL，再看结果**。

## Step 1（P85）：先量一下你已有的两个接口

```http
POST http://localhost:5018/api/books/bulk-slow
POST http://localhost:5018/api/books/bulk-fast
```
```
# bulk-slow（数字是示意，你测出来的会不一样，把两个数字记下来做对比）
{ "影响行数": 1832, "耗时毫秒": 2864 }

# bulk-fast
{ "影响行数": 1832, "耗时毫秒": 47 }
```

> 两个接口改的是同一批数据（`Price > 100` 都乘 1.1），所以**必须先跑 slow 再跑 fast**，否则第二次筛出来的行不一样（价格涨了 10%，超过 100 的反而更多）。
> 想重复测，就先把数据改回去（再调一次 fast 把价格除回去不精确，最好直接改数据库或重建数据），或者把两个接口的条件改成同一组固定 Id。

**看日志，数一数 SQL 条数**：`bulk-slow` 会打出一条 `SELECT` + 一大串 `UPDATE`（每条被改的书一句），`bulk-fast` 只有一句 `UPDATE`。两边的"影响行数"应该完全一样——**改的是同一件事，只是路径不同**。

## Step 2（P85）：`ExecuteDelete` —— 一条 SQL 删一批

```csharp
[HttpPost("bulk-delete")]
public async Task<ActionResult<object>> BulkDelete()
{
    var sw = Stopwatch.StartNew();

    int rows = await _ctx.Books
        .Where(b => b.Price < 30 && b.ReviewerId == null)   // 便宜且没审稿人的
        .ExecuteDeleteAsync();

    sw.Stop();
    return Ok(new { 删除行数 = rows, 耗时毫秒 = sw.ElapsedMilliseconds });
}
```
```sql
DELETE FROM [b]
FROM [Books] AS [b]
WHERE [b].[Price] < 30.0 AND [b].[ReviewerId] IS NULL
```
> 注意 `DELETE FROM [b] FROM [Books] AS [b]` 这种"两个 FROM"的写法——它不是笔误，是 SQL Server 上"带别名的删除"的标准语法（第一个 `FROM` 指定别名，第二个 `FROM` 指定表）。
>
> 也注意这条 SQL **有多干净**：没有 `OUTPUT 1`（那是 P84 里 `SaveChanges` 的写法，因为它要逐行读回并发令牌），也没有 `SELECT @@ROWCOUNT`——`ExecuteDelete` 走的是 ADO.NET 的 `ExecuteNonQuery`，行数由驱动直接返回，SQL 里不需要再要一次。

**这一步会真删数据。** 跑之前先确认 `Price < 30` 的书不多，或者先 `GET /api/books` 记下数量。

## Step 3（P85）：亲眼看着跟踪器被"骗"一次

这个实验是本节最重要的，**务必跑**：

```csharp
[HttpPost("bulk-overwrite-demo")]
public async Task<ActionResult<object>> BulkOverwriteDemo()
{
    // ① 查出来，Price 记进快照
    var b = await _ctx.Books.FirstAsync(x => x.Id == 1);
    double before = b.Price;

    // ② 库里所有书 +1（绕过跟踪器）
    await _ctx.Books.ExecuteUpdateAsync(s => s.SetProperty(x => x.Price, x => x.Price + 1));

    // ③ 内存里的对象没有任何变化
    double inMemory = b.Price;

    // ④ 内存改 +2，然后保存
    b.Price += 2;
    await _ctx.SaveChangesAsync();

    // ⑤ 重新查（新上下文才准，这里用 AsNoTracking 绕过跟踪器）
    double inDb = await _ctx.Books.AsNoTracking()
        .Where(x => x.Id == 1).Select(x => x.Price).FirstAsync();

    return Ok(new
    {
        查出来时 = before,
        ExecuteUpdate之后内存里 = inMemory,
        内存改成 = before + 2,
        数据库里实际 = inDb,
        说明 = "如果 ExecuteUpdate 生效了，应该是 before+1+2；实际是 before+2，那次 +1 被覆盖了"
    });
}
```
```
{
  "查出来时": 59.8,
  "ExecuteUpdate之后内存里": 59.8,     ← 跟踪器没收到通知
  "内存改成": 61.8,
  "数据库里实际": 61.8,               ← 不是 62.8，+1 白做了
  "说明": "..."
}
```

**这就是"铁律二"的现场。** 记住这个数字：`+1` 消失了。

## Step 4（P85）：事务包住两步，中途失败能回滚

```csharp
[HttpPost("bulk-transaction")]
public async Task<ActionResult<object>> BulkTransaction()
{
    await using var tx = await _ctx.Database.BeginTransactionAsync();
    try
    {
        int updated = await _ctx.Books
            .Where(b => b.Price < 50)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, b => b.Price * 2));

        // 故意制造异常：Title 有 HasMaxLength(100)，塞 200 个字符会超长
        await _ctx.Books.Where(b => b.Price < 50)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Title, new string('长', 200)));

        await tx.CommitAsync();
        return Ok(new { 更新行数 = updated, 结果 = "成功" });
    }
    catch (Exception ex)
    {
        await tx.RollbackAsync();
        return Ok(new { 结果 = "失败并已回滚", 异常 = ex.GetType().Name, 消息 = ex.Message });
    }
}
```
预期：第二条 UPDATE 抛 `String or binary data would be truncated`（或者 EF 层的长度校验异常），事务回滚，**第一条的 `*2` 也没生效**。

> 把 `BeginTransactionAsync` 去掉再跑一次，你会看到第一步的 `*2` 留在了库里——这就是"不隐含事务"的实际后果。

## Step 5（P85）：批量插入，数一数往返次数

```csharp
[HttpPost("bulk-insert")]
public async Task<ActionResult<object>> BulkInsert(int count = 2000)
{
    var sw = Stopwatch.StartNew();

    var list = Enumerable.Range(1, count).Select(i => new Book
    {
        Title = $"批量书 {i}",
        Price = 10 + i % 100,
        PubTime = DateTime.Today.AddDays(-i % 365),
        AuthorId = 1                       // 必须给外键，否则撞 FOREIGN KEY
    }).ToList();

    _ctx.Books.AddRange(list);             // 只是标记"待插入"，一条 SQL 都没发
    await _ctx.SaveChangesAsync();         // 真正插入，EF 自动分批

    sw.Stop();
    return Ok(new
    {
        插入行数 = list.Count,
        耗时毫秒 = sw.ElapsedMilliseconds,
        理论往返次数 = Math.Ceiling(list.Count / 42.0),
        说明 = "MaxBatchSize 默认 42，所以 2000 条 = 48 次往返，每次 42 条 INSERT"
    });
}
```

日志里数一数 `INSERT INTO [Books]` 出现的次数——**是 2000 次**，但它们被分成了 48 批发出去。**这就是"批处理"和"一条 SQL 插多行"的区别**，不要混淆。

## Step 6（P86）：给 `Book` 加软删除字段并迁移

**6.1 加属性**
```csharp
public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }
    public DateTime PubTime { get; set; }

    public bool IsDeleted { get; set; }        // ← 新增

    // ...原有导航属性不动
}
```

**6.2 加筛选器**
```csharp
// BookContext.OnModelCreating 里，modelBuilder.Entity<Book>(entity => {...}) 的括号内加一行
entity.HasQueryFilter("SoftDelete", b => !b.IsDeleted);
```

**6.3 迁移**（项目目录有两层，注意 `cd`）
```bash
cd "D:/code/编程语言学习/后端/练习/ASP.NET Core--图书管理系统/ASP.NET Core--图书管理系统"
dotnet ef migrations add AddBookIsDeleted
dotnet ef database update
```

迁移生成的内容核心是两行：
```csharp
migrationBuilder.AddColumn<bool>(
    name: "IsDeleted",
    table: "Books",
    type: "bit",
    nullable: false,
    defaultValue: false);
```

> `defaultValue: false` 保证已有的 1832 条老数据全部 `IsDeleted = 0`，**不会因为新列默认值把老数据全"软删除"掉**。

**6.4 启动时留意那条警告**

因为 `BookDetail.BookId` 是必填，加筛选器后控制台会出现 P86 坑 3 说的 `ModelValidation` 警告。**看到它不要慌，先确认自己理解了它的含义**，再决定要不要处理。

## Step 7（P86）：验证筛选器到底加在哪

```csharp
[HttpGet("filter-check")]
public async Task<ActionResult<object>> FilterCheck()
{
    int visible = await _ctx.Books.CountAsync();                             // 带筛选器
    int total = await _ctx.Books.IgnoreQueryFilters().CountAsync();          // 不带
    return Ok(new { 可见 = visible, 总行数含已删 = total });
}
```
```
{ "可见": 1832, "总行数含已删": 1832 }
```

再跑一次 `GET /api/books`，看日志里的 SQL：

```sql
SELECT [b].[Id], [b].[Title], [b].[Price], [b].[PubTime],
       [b].[AuthorId], [b].[ReviewerId], [b].[CategoryId], [b].[IsDeleted]
FROM [Books] AS [b]
WHERE [b].[IsDeleted] = CAST(0 AS bit)
ORDER BY [b].[Price] DESC
```
**`WHERE` 是你没写的**。同时注意 `SELECT` 里也多了 `[b].[IsDeleted]` —— 实体多了一列，所有查询都会带上它。

## Step 8（P86）：软删除 + 恢复的完整闭环

```csharp
[HttpPost("soft-delete/{id:long}")]
public async Task<ActionResult<object>> SoftDelete(long id)
{
    int rows = await _ctx.Books
        .Where(b => b.Id == id)
        .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDeleted, true));

    return rows == 0
        ? NotFound(new { 说明 = "没找到，或者已经被软删除过了" })
        : Ok(new { 已软删除 = id, 影响行数 = rows });
}

[HttpPost("soft-restore/{id:long}")]
public async Task<ActionResult<object>> SoftRestore(long id)
{
    int rows = await _ctx.Books
        .IgnoreQueryFilters()                                    // ← 必须！
        .Where(b => b.Id == id)
        .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDeleted, false));

    return rows == 0
        ? NotFound(new { 说明 = "这个 id 不存在" })
        : Ok(new { 已恢复 = id, 影响行数 = rows });
}
```
```sql
-- soft-delete 生成的
UPDATE [b] SET [b].[IsDeleted] = CAST(1 AS bit)
FROM [Books] AS [b]
WHERE [b].[Id] = @__id_0 AND [b].[IsDeleted] = CAST(0 AS bit)

-- soft-restore 生成的（没有最后那个条件）
UPDATE [b] SET [b].[IsDeleted] = CAST(0 AS bit)
FROM [Books] AS [b]
WHERE [b].[Id] = @__id_0
```

**试一次不带 `IgnoreQueryFilters()` 的恢复**：`rows` 会是 `0`，接口返回 `NotFound`，数据永远回不来——**因为"要恢复的那行"正好被"筛选器"排除了**。这是软删除实现里最经典的自锁。

## Step 9（P86）：EF Core 10 命名筛选器，按名字忽略

目前只有一个筛选器，`IgnoreQueryFilters()` 和 `IgnoreQueryFilters(["SoftDelete"])` 效果一样。但**先把名字加上**，将来加租户过滤时不用改代码：

```csharp
// 已经这么写了（Step 6.2）
entity.HasQueryFilter("SoftDelete", b => !b.IsDeleted);
```

```csharp
[HttpGet("named-filter")]
public async Task<ActionResult<object>> NamedFilter()
{
    int all      = await _ctx.Books.IgnoreQueryFilters().CountAsync();              // 忽略全部
    int onlySoft = await _ctx.Books.IgnoreQueryFilters(["SoftDelete"]).CountAsync();// 只忽略软删除
    int visible  = await _ctx.Books.CountAsync();                                   // 都生效
    return Ok(new { 忽略全部 = all, 只忽略软删除 = onlySoft, 正常查询 = visible });
}
```

想亲眼看到"命名筛选器的价值"，临时加第二个筛选器试一下（测完记得删）：

```csharp
entity.HasQueryFilter("SoftDelete", b => !b.IsDeleted);
entity.HasQueryFilter("PriceGuard", b => b.Price > 0);      // 临时：隐藏脏数据
```
```csharp
var a = await _ctx.Books.IgnoreQueryFilters(["SoftDelete"]).CountAsync();  // 只放开软删除，Price > 0 仍生效
var b = await _ctx.Books.IgnoreQueryFilters(["PriceGuard"]).CountAsync();  // 只放开价格，软删除仍生效
```

> 如果这段代码放在 EF Core 9 上跑，第二个 `HasQueryFilter` 会**静默覆盖**第一个——软删除就失效了，而且不报错。这就是命名筛选器要解决的问题。

---

==四：总结==

**两节一页速查**

| 节 | 一句话结论 | 关键 API |
|---|---|---|
| **P85** 批量操作 | `ExecuteUpdate/Delete` 把 LINQ 翻成一条 SQL 直接下发，不加载数据、不过跟踪器、不隐含事务；插入仍需 `AddRange` + `SaveChanges`（自动分批，SQL Server 每批 ≤42 条） | `ExecuteUpdateAsync` / `ExecuteDeleteAsync` / `SetProperty` |
| **P86** 全局筛选器 | `HasQueryFilter` 给实体配一个永远生效的 WHERE，普通查询、`Include`、`ExecuteUpdate/Delete` 全都会带；EF Core 10 支持命名 + 按名忽略 | `HasQueryFilter` / `IgnoreQueryFilters` |

**三种"批量"方案对照**

| 想做的事 | 方案 | SQL 条数 | 往返次数 |
|---|---|---|---|
| 批量改 | `ExecuteUpdateAsync` | 1 | 1 |
| 批量删 | `ExecuteDeleteAsync` | 1 | 1 |
| 批量插 | `AddRange` + `SaveChanges` | N（每行一条 INSERT） | ⌈N/42⌉ |
| 批量插（极致） | `EFCore.BulkExtensions` / `SqlBulkCopy` | 内部走批量导入通道 | 很少 |

**`ExecuteUpdate/Delete` 的三条铁律**

| 铁律 | 后果 |
|---|---|
| 立即执行 | 不参与 `SaveChanges` 的攒批，连着调三次 = 三次往返 |
| 绕过跟踪器 | 跟踪器里的实体保持旧值；再 `SaveChanges` 会把它的改动**覆盖**掉 `ExecuteUpdate` 的结果 |
| 不隐含事务 | 两个操作之间失败，第一个已经落库；要原子就自己 `BeginTransaction` |

**软删除的完整配方**

1. 实体加 `bool IsDeleted`
2. `HasQueryFilter("SoftDelete", b => !b.IsDeleted)`（起个名）
3. 删除 = `ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDeleted, true))`
4. 恢复 = `IgnoreQueryFilters().Where(...)` + `ExecuteUpdateAsync(... false)`
5. 唯一索引改成**过滤索引** `HasFilter("[IsDeleted] = 0")`，否则软删过的名字还能撞
6. 迁移时确认新列 `defaultValue: false`，别把老数据全删了

**八个易错点**

1. **`ExecuteUpdate` 后直接 `SaveChanges` 同一批实体** → 内存旧值把库里的新值覆盖回去。要么别混，要么 `ChangeTracker.Clear()`。
2. **`ExecuteDelete` 后跟踪器里还留着那个实体** → 后续 `SaveChanges` 抛 `DbUpdateConcurrencyException`（"预期影响 1 行，实际 0 行"）。
3. **以为两个 `ExecuteUpdate` 在一个事务里** → 各管各的，中间失败前面已生效。
4. **`SetProperty` 里写导航属性** → 不支持，先用 `Select` 投影算好再改。
5. **分不清 `SetProperty` 第二个参数是常量还是 lambda** → 写 `20.0` 生成 `SET [Price] = @p0`（**所有行变成同一个值**）；写 `b => b.Price * 1.1` 生成 `SET [Price] = [Price] * @p0`（**每行基于自己的值算**）。想"按行计算"必须用 lambda。
6. **软删除恢复忘了 `IgnoreQueryFilters()`** → `rows = 0`，数据永远回不来，还不报错。
7. **软删除后以为唯一索引没问题** → 行还在表里，同名照样冲突，而界面上看不见。
8. **`HasQueryFilter` 写两个（EF Core 9 及更早）** → 后者覆盖前者，第一个静默失效；EF Core 10 用命名筛选器。

**记忆口诀**

> **查一遍改一遍那是散步，`ExecuteUpdate` 才叫批量：一条 SQL 直接下发，数据不过客户端。**
> **它立刻就走，不等 `SaveChanges`；它不认跟踪器，改了库不告诉你；它不管事务，两步之间失败了前面那条已经落地。**
> **跟踪器和它混着用最危险：旧快照一写，`ExecuteUpdate` 白干。**
> **插入没有捷径，`AddRange` 一次标记、`SaveChanges` 分批发（SQL Server 每批 42 条）——那是"批处理"，不是"一条 SQL 插多行"。**
> **全局筛选器是藏在模型里的 WHERE：你写的每个查询、每个 `Include`、每个 `ExecuteUpdate` 它都跟着。**
> **软删除就是"标记 + 筛选"：删是把它标脏，恢复必须先 `IgnoreQueryFilters`，否则你连自己都找不回来。**
> **筛选器不删数据，所以外键还在、唯一索引还撞、`FindAsync` 还会返回 null——查不到，不等于不存在。**
