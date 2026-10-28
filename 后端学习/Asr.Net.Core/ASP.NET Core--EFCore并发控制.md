==一：概念==

> 本篇覆盖 **P87–P89**：悲观并发控制、乐观并发控制（并发令牌）、乐观并发控制（RowVersion）。
> 这三节是一个闭环：**先看清"并发到底会丢什么"（丢失更新），再给两种解法——先锁住（悲观）、
> 提交时校验（乐观），乐观又分"自己维护令牌"和"数据库自动生成版本"两种实现。**
> 环境：练习项目 **.NET 10 / EF Core 10.0.13 / SqlServer / LocalDB `BookDemo`**，实体 `Book`。
> 承接：P84 结尾留的那个坑——"不查询直接改会覆盖别人刚提交的数据"，这批把它彻底解决。
>
> **版本说明**：本篇只讲 P87–P89。**P90（表达式树入门）挪到下一批**，和 P91–P96 连着讲完，
> 因为它是另一个大主题的开头，单独放在这里会和后面的进阶断了线。

---

# 先看清敌人：丢失更新（Lost Update）

所有并发控制方案都是为了解决同一个场景：

```
时间 →
用户 A：读 Price=100 ────────────── 改成 110 ── 提交 ✅
用户 B：        读 Price=100 ─────────────────── 改成 120 ── 提交 ✅
                                              ↑
数据库最终是 120。A 改的 110 消失了。
```

**A 的修改不是被"覆盖"了，是被 B 用"旧世界里算出来的新值"整个替换掉了。** B 读的时候是 100，它以为世界还是 100，于是把 120 写下去——它根本不知道中间有人动过。

这跟"两个线程改同一个变量"是同一类问题，只是发生在数据库和应用之间。

| 方案 | 思路 | 一句话 |
|---|---|---|
| **悲观**（P87） | 我改之前先锁住，别人等我 | 假设冲突一定会发生 |
| **乐观**（P88/P89） | 不加锁，提交时检查"我读到的值还在不在" | 假设冲突很少发生 |

> 官方文档对两者的表述很精准：乐观并发 "takes no locks, but arranges for the data modification to **fail on save** if the data has changed since it was queried"；
> 悲观则是 "lock data up-front and only then proceed to modify it"。

---

# P87　悲观并发控制

**一句话：在事务里用 `UPDLOCK` 把那一行锁住，别人读到锁就排队等着，直到我提交或回滚。**

## EF Core 没有现成的"行锁" API

这是首先要接受的现实：**EF Core 不提供 `ForUpdate()` 之类的方法**。它把"加锁"这件事完全交给数据库，你只能通过**原生 SQL 的锁提示**去做。

| 数据库 | 加行锁的写法 |
|---|---|
| SQL Server | `SELECT * FROM [Books] WITH (UPDLOCK, ROWLOCK) WHERE [Id] = @id` |
| MySQL | `SELECT * FROM Books WHERE Id = ? FOR UPDATE` |
| PostgreSQL | `SELECT * FROM "Books" WHERE "Id" = @id FOR UPDATE` |
| SQLite | **没有行锁**（整库锁），悲观并发在它上面没法精细做 |

在 EF Core 里，SQL Server 的写法就是 `FromSqlInterpolated` + 事务：

```csharp
await using var tx = await _ctx.Database.BeginTransactionAsync();

var book = await _ctx.Books
    .FromSqlInterpolated($"SELECT * FROM [Books] WITH (UPDLOCK, ROWLOCK) WHERE [Id] = {id}")
    .SingleAsync();
// ↑ 从这一刻起，别的会话想读/改这一行（带锁的读）就得等

book.Price += 10;
await _ctx.SaveChangesAsync();

await tx.CommitAsync();      // ← 锁在这里才释放
```

**三个锁提示的作用域，一张表说清：**

| 提示 | 作用 | 不加会怎样 |
|---|---|---|
| `UPDLOCK` | 读的时候持**更新锁**，让别人不能同时拿到更新锁 | 两个事务都读到旧值，各自去改 → 还是丢失更新 |
| `ROWLOCK` | 锁**行级**，不升级成页锁/表锁 | 可能锁住整页甚至整表，别人全被卡住 |
| `HOLDLOCK`（可选） | 锁持有到事务结束（等价 `SERIALIZABLE` 的读） | 某些隔离级别下读完就放锁，等于没锁 |

> 你可能会想：`UPDLOCK` 到底锁的是"读"还是"写"？答案是：它把这次**读**申请的锁升级成"我准备写"的锁，于是别的会话想拿同样的锁就得排队。这是 SQL Server 上实现"读-改-写"原子性的标准手法。

## 两条铁律（比语法更重要）

**铁律一：必须包在事务里。** 锁的生命周期跟事务绑定，`Commit` / `Rollback` 才释放。不加事务，语句一执行完锁就没了，白做：

```csharp
// 错的：没有事务，锁等于没加
var book = await _ctx.Books
    .FromSqlInterpolated($"SELECT * FROM [Books] WITH (UPDLOCK) WHERE [Id] = {id}")
    .SingleAsync();
book.Price += 10;
await _ctx.SaveChangesAsync();     // 这中间别人照样能插进来
```

**铁律二：事务里不能有耗时操作。** 锁着行的那几秒，所有碰这行的人都卡在数据库里等。如果你在事务里调 HTTP 接口、发邮件、等用户确认——那就是把整张表当人质。

## 四个代价

| 代价 | 说明 |
|---|---|
| **阻塞** | 别人等你，接口的响应时间从毫秒变秒级甚至超时 |
| **死锁** | A 锁了 1 号行等 2 号，B 锁了 2 号行等 1 号 → 数据库挑一个杀掉（报 `死锁 victim`） |
| **不跨请求** | 事务不能跨 HTTP 请求存活。用户"打开编辑页 → 十分钟后保存"这种场景，悲观锁根本做不到 |
| **锁粒度难控** | 提示写错就升级成表锁，整个表都动不了 |

## 什么时候才该用它

悲观锁不是"过时技术"，它在**临界区很短、且必须强一致**的场景下依然是最优解：

| 适合 | 不适合 |
|---|---|
| 库存扣减（`UPDATE Stock SET Count = Count - 1` 这种反而该用 `ExecuteUpdate` 的原子性） | Web 表单编辑（用户思考时间不可控） |
| 账户余额转账（一个事务里改两行，必须原子） | 跨多个服务的流程（锁不了别人的库） |
| 生成流水号 / 取号器 | 高并发读多写少的表 |

> 注意区分：**"数值自减"这类操作根本不需要锁**，一条 `UPDATE ... SET Count = Count - 1`（或 `ExecuteUpdate`）本身就是原子的，数据库保证不会丢。锁是为了保护"读出来 → 在应用里算 → 写回去"这种跨语句的逻辑。

---

# P88　乐观并发控制：并发令牌

**一句话：不动数据库的锁，而是给 UPDATE 的 `WHERE` 加一个条件——"这行的 X 列必须还是我读到时的值"，影响 0 行就抛异常。**

## 原理：把"检查"塞进 WHERE

没有并发令牌时，EF 生成的 UPDATE 只按主键定位：

```sql
UPDATE [Books] SET [Price] = @p0
OUTPUT 1
WHERE [Id] = @p1
```

**只要主键对得上就写，不管这行有没有被别人改过。** 这就是丢失更新的技术原因。

配了并发令牌之后：

```sql
UPDATE [Books] SET [Price] = @p0, [Version] = @p1
OUTPUT 1
WHERE [Id] = @p2 AND [Version] = @p3      -- ← @p3 是我读到时的旧版本号
```

现在这条 UPDATE 的含义变成：**"如果这行还是我认识的那个版本，就改；否则一行都别动。"**

如果中间被别人改过，`Version` 已经变了，`WHERE` 匹配不到 → 影响 0 行 → EF 检查"预期 1 行、实际 0 行"→ 抛 `DbUpdateConcurrencyException`。

**整套机制就靠"受影响行数是 0"这一个信号。** 这也解释了 P84 那个坑：`ExecuteDelete` 删掉了行，`SaveChanges` 的 UPDATE 影响 0 行，抛的正是这个异常——**哪怕你没配任何并发令牌**。

## 怎么配：`IsConcurrencyToken()`

```csharp
public class Book
{
    // ...
    public int Version { get; set; }        // 普通 int 列，自己维护
}
```

```csharp
// BookContext.OnModelCreating
entity.Property(b => b.Version).IsConcurrencyToken();
```

| API | 作用 |
|---|---|
| `IsConcurrencyToken()` | 把这个列标记为并发令牌：参与 `WHERE` 校验 |
| `IsConcurrencyToken(false)` | 取消标记 |
| `[ConcurrencyCheck]` 特性 | 等价的 Data Annotations 写法 |

**注意：令牌列自己也要在 `SET` 里更新**（`SET [Version] = @p1`），否则每次校验都拿同一个值，第二次必然冲突。这就是"应用管理令牌"要手动递增/换新值的原因：

```csharp
var book = await _ctx.Books.FirstAsync(b => b.Id == 1);
book.Price += 10;
book.Version++;                  // ← 必须自己动，忘了就永远冲突
await _ctx.SaveChangesAsync();
```

> 用 `Guid` 当令牌更省心一点：`book.Version = Guid.NewGuid();` —— 不用管递增，换个新值就行。官方文档给的就是这个例子（`[ConcurrencyCheck] public Guid Version`）。

## 冲突发生后：三套值

异常抛出来的时候，内存里和数据库里有**三套值**，理解它们才能正确处理：

| 名称 | 是什么 | 怎么拿 |
|---|---|---|
| **Current values** | 我**想写进去**的值（内存里改完的） | `entry.CurrentValues` |
| **Original values** | 我**最初读出来**的值（快照） | `entry.OriginalValues` |
| **Database values** | 数据库**现在**的值（别人改完的） | `await entry.GetDatabaseValuesAsync()` |

```
Original(100) ──我改──> Current(110)
                              ↑ 我要写这个
Database(120)  ← 别人已经改成这个
```

`GetDatabaseValuesAsync()` 会**再发一条 SELECT** 去读当前值——这也是为什么它要 `await`，而且返回 `PropertyValues?`（`null` 表示这行已经被删了）。

## 三种处理策略

官方给的标准流程是：**catch → 用 `ex.Entries` 找出冲突的实体 → 刷新 `OriginalValues` 为数据库值 → 重试**。落到业务上就是三种选择：

| 策略 | 谁赢 | 代码 | 适用 |
|---|---|---|---|
| **数据库胜** | 放弃我的修改 | `await entry.ReloadAsync();` | 后台任务、幂等操作（重读一遍按新值重算） |
| **客户端胜** | 覆盖别人的 | `entry.OriginalValues.SetValues(dbValues);` 然后重试 `SaveChanges` | 管理员强制修改、我的数据更权威 |
| **抛给用户** | 都不赢，让人决定 | 返回 409 + 数据库当前值，前端提示"这行已被他人修改" | 表单编辑（**Web 项目最常用**） |

**"客户端胜"为什么是这么写的**：把 `OriginalValues` 刷成"数据库现在的值"，下次 `SaveChanges` 生成的 `WHERE [Version] = @p1` 就对得上了——**校验通过，我的 `CurrentValues` 顺利写进去**。本质是"承认我看到了最新版本，但我要覆盖它"。

**"数据库胜"为什么用 `ReloadAsync()`**：它连内存里的对象一起覆盖成数据库的值，`CurrentValues` 和 `OriginalValues` 都归位，等于"我这次改的作废"。

## 一个必须知道的边界：并发控制只管 `SaveChanges`

| 操作 | 会不会做并发校验 |
|---|---|
| `SaveChanges`（UPDATE / DELETE） | **会**（有令牌就带 `WHERE`，没令牌也靠"影响 0 行"兜底） |
| `ExecuteUpdate` / `ExecuteDelete` | **不会**——上一批讲过，它绕开跟踪器，EF 不知道你的原值 |
| 插入 | 不做并发校验（主键冲突是另一类异常，不是 `DbUpdateConcurrencyException`） |

想在 `ExecuteUpdate` 上做并发控制，得**自己把令牌写进 `Where`**，然后判断返回行数：

```csharp
int rows = await _ctx.Books
    .Where(b => b.Id == id && b.Version == expectedVersion)
    .ExecuteUpdateAsync(s => s
        .SetProperty(b => b.Price, newPrice)
        .SetProperty(b => b.Version, expectedVersion + 1));

if (rows == 0) throw new Exception("这行已被别人修改");
```

官方文档里专门有一节讲这个用法（"you can still use ... by checking the number of rows affected"）。

---

# P89　乐观并发控制：RowVersion

**一句话：把并发令牌交给数据库维护——SQL Server 的 `rowversion` 列，每次 UPDATE 自动变一个值，你不用管递增、也不会忘。**

## 为什么还需要 RowVersion

P88 的 `int Version` + `Version++` 有个致命弱点：**靠人记得写。** 团队里只要有一个人漏了 `Version++`，这个实体的并发保护就形同虚设——而且不报错，只是悄悄失效。

`rowversion` 把这件事交给数据库：

```csharp
public class Book
{
    // ...
    public byte[] RowVersion { get; set; } = null!;      // 注意类型是 byte[]，不是 int
}
```

```csharp
// 方式一：Fluent API
entity.Property(b => b.RowVersion).IsRowVersion();

// 方式二：Data Annotations（[Timestamp] 在 System.ComponentModel.DataAnnotations 命名空间）
[Timestamp]
public byte[] RowVersion { get; set; } = null!;
```

`IsRowVersion()` 实际上等于三件事：映射成 SQL Server 的 `rowversion` 类型 + `ValueGeneratedOnAddOrUpdate()`（值由数据库生成）+ `IsConcurrencyToken()`（参与 WHERE 校验）。

## `rowversion` 是什么

| 特性 | 说明 |
|---|---|
| 类型 | SQL Server 专有的 8 字节二进制（`rowversion` 是 `timestamp` 的别名，**跟时间没关系**） |
| 生成 | 每次 INSERT / UPDATE 由数据库自动赋值，全库单调递增 |
| 唯一 | 全库唯一（不是每张表各自从 1 开始） |
| 一个表只能有一个 | 想保护更多信息请用应用管理令牌 |
| 只读 | 你改它没用，数据库会覆盖你的值 |

因为它是**二进制**，所有涉及它的读写都是 `byte[]`，打印时要转：

```csharp
Console.WriteLine(Convert.ToBase64String(book.RowVersion));   // "AAAAAAAAB9E="
```

## 它和 P84 的 `OUTPUT` 有什么关系

P84 里 `SaveChanges` 生成的 UPDATE 结尾是 `OUTPUT 1`——那是为了拿"影响了几行"。**配上 RowVersion 之后就变了：**

```sql
UPDATE [Books] SET [Price] = @p0
OUTPUT INSERTED.[RowVersion]                      -- ← 不只是 1 了，要把新版本号读回来
WHERE [Id] = @p1 AND [RowVersion] = @p2
```

**`OUTPUT INSERTED.[RowVersion]`**：数据库改完这行，立刻把新的版本号送回 EF，EF 拿它更新内存里的对象和快照。这样下一次 `SaveChanges` 又有了正确的原值。

INSERT 也一样，`SaveChanges` 生成的是：
```sql
INSERT INTO [Books] (...)
OUTPUT INSERTED.[Id], INSERTED.[RowVersion]       -- ← 自增 Id 和版本号一起读回
VALUES (...)
```

> 回头看你之前看到的 `OUTPUT 1`：**没有并发令牌时只需要"数行数"，有令牌时才需要"读回值"**。这两处正好能对上。

## 三种方案横向对比

| | 悲观锁（P87） | 并发令牌（P88） | RowVersion（P89） |
|---|---|---|---|
| 加锁 | **加**（UPDLOCK） | 不加 | 不加 |
| 冲突检测时机 | 读的时候就阻塞 | 保存时（影响 0 行） | 保存时（影响 0 行） |
| 谁维护令牌 | — | **应用代码**（`Version++`） | **数据库**自动 |
| 忘写的后果 | — | 保护悄悄失效 | 不存在这个问题 |
| 跨请求可用 | ❌ 事务活不到那时 | ✅ | ✅ |
| 并发性能 | 差（阻塞） | 好 | 好 |
| 用户体验 | 卡住等待 | 提交时报冲突，可提示 | 同左 |
| 数据库支持 | 各库语法不同 | 全部支持 | **SQL Server / MySQL 等有；SQLite 没有** |

> ⚠️ 你项目里**同时引了 Sqlite 和 SqlServer 两个包**（csproj 里都有）。如果哪天切到 Sqlite 做测试，
> `rowversion` 是不存在的（官方文档明确写了 "some databases don't support these at all (e.g. SQLite)"），
> 这时候只能退回 P88 的**应用管理令牌**（比如 `Guid`）。

---

==二：格式==

## P87　悲观锁的写法

**SQL Server（行锁 + 事务）**
```csharp
await using var tx = await _ctx.Database.BeginTransactionAsync();

var book = await _ctx.Books
    .FromSqlInterpolated($"SELECT * FROM [Books] WITH (UPDLOCK, ROWLOCK) WHERE [Id] = {id}")
    .SingleAsync();

// ...业务处理

await _ctx.SaveChangesAsync();
await tx.CommitAsync();
```

| 锁提示 | 含义 |
|---|---|
| `WITH (UPDLOCK)` | 拿更新锁，别人不能同时拿 |
| `WITH (ROWLOCK)` | 只锁行，别升级成页/表锁 |
| `WITH (UPDLOCK, ROWLOCK, HOLDLOCK)` | 更严格，锁到事务结束 |

**MySQL / PostgreSQL**
```csharp
.FromSqlInterpolated($"SELECT * FROM Books WHERE Id = {id} FOR UPDATE")
```

## P88　并发令牌的配置与处理

**配置**
```csharp
// Fluent API
entity.Property(b => b.Version).IsConcurrencyToken();

// 或 Data Annotations
[ConcurrencyCheck]
public int Version { get; set; }
```

**维护令牌值（应用管理）**
```csharp
book.Version++;                                  // int 递增
// 或
book.Version = Guid.NewGuid();                   // Guid 换新值
```

**官方标准处理骨架**
```csharp
var saved = false;
while (!saved)
{
    try
    {
        await _ctx.SaveChangesAsync();
        saved = true;
    }
    catch (DbUpdateConcurrencyException ex)
    {
        foreach (var entry in ex.Entries)
        {
            var proposed = entry.CurrentValues;                        // 我想写的
            var database = await entry.GetDatabaseValuesAsync();       // 库里现在的

            if (database is null)
            {
                // 这行已经被别人删了
                throw;
            }

            // TODO: 在这里决定每个属性留哪个值
            // proposed["Price"] = ...;

            entry.OriginalValues.SetValues(database);                  // 刷新原值，绕过下一次校验
        }
    }
}
```

**三种策略的写法对照**

| 策略 | 代码 |
|---|---|
| 数据库胜 | `await entry.ReloadAsync();` |
| 客户端胜 | `entry.OriginalValues.SetValues(await entry.GetDatabaseValuesAsync());` 然后重试 `SaveChanges` |
| 抛给用户 | 自己读 `databaseValues` 里的值，返回 409 + 当前数据 |

**不用跟踪器时的并发控制**
```csharp
int rows = await _ctx.Books
    .Where(b => b.Id == id && b.Version == expectedVersion)
    .ExecuteUpdateAsync(s => s
        .SetProperty(b => b.Price, newPrice)
        .SetProperty(b => b.Version, expectedVersion + 1));
if (rows == 0) { /* 冲突 */ }
```

## P89　RowVersion 的写法

| 想做的事 | 写法 |
|---|---|
| 声明属性 | `public byte[] RowVersion { get; set; } = null!;` |
| 配置（Fluent） | `entity.Property(b => b.RowVersion).IsRowVersion();` |
| 配置（特性） | `[Timestamp] public byte[] RowVersion { get; set; }` |
| 显示 | `Convert.ToBase64String(book.RowVersion)` |
| 手动比较 | `book.RowVersion.SequenceEqual(other)` |

> **不要写 `entity.Property(b => b.RowVersion).IsConcurrencyToken()`** —— 那样只是"参与 WHERE 校验"，
> 但**不会**让数据库自动生成新值。必须用 `IsRowVersion()`（或 `[Timestamp]`），
> 它才同时包含 `ValueGeneratedOnAddOrUpdate`。

---

==三：代码==

**准备**：新建 `Controllers/ConcurrencyController.cs`，路由 `api/concurrency`。
关键点：注入 **`DbContextOptions<BookContext>`**，这样才能在同一个请求里手动 new 出第二个 DbContext ——
**模拟"两个用户各有一个连接"必须用两个 ctx 实例**（同一个 ctx 里 IdentityMap 会返回同一个对象，根本冲突不起来）。

```csharp
using ASP.NET_Core__图书管理系统.Data;
using ASP.NET_Core__图书管理系统.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ASP.NET_Core__图书管理系统.Controllers;

[ApiController]
[Route("api/concurrency")]
public class ConcurrencyController : ControllerBase
{
    private readonly BookContext _ctx;
    private readonly DbContextOptions<BookContext> _options;   // 用来 new 出"另一个用户"的 ctx

    public ConcurrencyController(BookContext ctx, DbContextOptions<BookContext> options)
    {
        _ctx = ctx;
        _options = options;
    }
}
```

> `DbContextOptions<BookContext>` 是 `AddDbContext` 顺手注册进 DI 的，直接注入即可。

## Step 1：先制造一次丢失更新

```csharp
[HttpPost("lost-update/{id:long}")]
public async Task<ActionResult<object>> LostUpdate(long id)
{
    await using var ctxA = new BookContext(_options);      // 模拟用户 A 的连接
    await using var ctxB = new BookContext(_options);      // 模拟用户 B 的连接

    // 两个人都读到同一个旧值
    var a = await ctxA.Books.FirstAsync(b => b.Id == id);
    var b = await ctxB.Books.FirstAsync(b => b.Id == id);
    double original = a.Price;

    // A 先改先提交
    a.Price = original + 10;
    await ctxA.SaveChangesAsync();

    // B 基于"它读到的旧值"算，然后提交 —— 把 A 的 +10 抹掉
    b.Price = original + 20;
    await ctxB.SaveChangesAsync();

    var final = await _ctx.Books.AsNoTracking()
        .Where(x => x.Id == id).Select(x => x.Price).FirstAsync();

    return Ok(new
    {
        原价 = original,
        A改成 = original + 10,
        B改成 = original + 20,
        数据库最终 = final,
        结论 = final == original + 20 ? "A 的修改被丢弃（丢失更新）" : "意外"
    });
}
```
```
{ "原价": 49, "A改成": 59, "B改成": 69, "数据库最终": 69, "结论": "A 的修改被丢弃（丢失更新）" }
```
> 数字随你库里当前的价格变化，关键是**最终值 = B 算的那个，A 的 +10 不见了**。

**这就是敌人。** 下面三种方案都要让它变成"要么排队、要么报错"。

## Step 2（P87）：悲观锁 —— 让 B 排队等着

```csharp
[HttpPost("pessimistic/{id:long}")]
public async Task<ActionResult<object>> Pessimistic(long id, double delta, int holdMs = 0)
{
    await using var tx = await _ctx.Database.BeginTransactionAsync();

    var sw = System.Diagnostics.Stopwatch.StartNew();

    var book = await _ctx.Books
        .FromSqlInterpolated($"SELECT * FROM [Books] WITH (UPDLOCK, ROWLOCK) WHERE [Id] = {id}")
        .SingleAsync();

    long waited = sw.ElapsedMilliseconds;      // 等了多久才拿到锁

    if (holdMs > 0) await Task.Delay(holdMs);  // 模拟"业务处理很慢"，故意占着锁

    book.Price += delta;
    await _ctx.SaveChangesAsync();
    await tx.CommitAsync();                    // ← 锁在这里释放

    return Ok(new { Id = id, 新价格 = book.Price, 等待锁毫秒 = waited });
}
```

**验证阻塞**：开两个终端，先发一个占着锁 8 秒的，再立刻发第二个：

```bash
# 终端 1（先执行，会卡 8 秒）
curl -X POST "http://localhost:5018/api/concurrency/pessimistic/1?delta=10&holdMs=8000"

# 终端 2（紧接着执行，会一直等）
curl -X POST "http://localhost:5018/api/concurrency/pessimistic/1?delta=20&holdMs=0"
```

第二个请求的响应里 `等待锁毫秒` 会是 **8000 左右**——它真的在数据库里排队。而 `数据库最终` 会是 `原价+10+20`，**一分没丢**。

> 如果第二个请求报 `Command timeout`，说明等待超过 30 秒（默认命令超时）。把 `holdMs` 调小即可。

## Step 3（P88）：加并发令牌并迁移

**3.1 加属性**
```csharp
public class Book
{
    // ...原有属性
    public int Version { get; set; }        // 并发令牌
}
```

**3.2 配置**
```csharp
// BookContext.OnModelCreating → modelBuilder.Entity<Book>(entity => { ... })
entity.Property(b => b.Version).IsConcurrencyToken();
```

**3.3 迁移**
```bash
cd "D:/code/编程语言学习/后端/练习/ASP.NET Core--图书管理系统/ASP.NET Core--图书管理系统"
dotnet ef migrations add AddBookVersion
dotnet ef database update
```
```csharp
migrationBuilder.AddColumn<int>(
    name: "Version",
    table: "Books",
    type: "int",
    nullable: false,
    defaultValue: 0);          // 老数据全部从 0 开始，没问题
```

**3.4 先正常改一次，看 SQL**
```csharp
[HttpPost("optimistic-ok/{id:long}")]
public async Task<ActionResult<object>> OptimisticOk(long id, double delta)
{
    var book = await _ctx.Books.FirstAsync(b => b.Id == id);
    book.Price += delta;
    book.Version++;                          // ← 别忘了
    await _ctx.SaveChangesAsync();
    return Ok(new { 新价格 = book.Price, 新版本 = book.Version });
}
```
```sql
UPDATE [Books] SET [Price] = @p0, [Version] = @p1
OUTPUT 1
WHERE [Id] = @p2 AND [Version] = @p3
```
**`WHERE` 里多了 `[Version] = @p3`，这就是全部的秘密。**

## Step 4（P88）：制造冲突

```csharp
[HttpPost("optimistic-conflict/{id:long}")]
public async Task<ActionResult<object>> OptimisticConflict(long id)
{
    await using var ctxA = new BookContext(_options);
    await using var ctxB = new BookContext(_options);

    var a = await ctxA.Books.FirstAsync(b => b.Id == id);
    var b = await ctxB.Books.FirstAsync(b => b.Id == id);
    int originalVersion = a.Version;

    // A 先成功
    a.Price += 10;
    a.Version++;
    await ctxA.SaveChangesAsync();

    // B 拿着过期的 Version 去改
    b.Price += 20;
    b.Version++;
    try
    {
        await ctxB.SaveChangesAsync();
        return Ok(new { 结果 = "居然成功了？" });
    }
    catch (DbUpdateConcurrencyException ex)
    {
        var entry = ex.Entries.Single();
        var dbValues = await entry.GetDatabaseValuesAsync();

        return Ok(new
        {
            结果 = "捕获并发冲突",
            我的原始值_价格 = entry.OriginalValues["Price"],
            我想写的值_价格 = entry.CurrentValues["Price"],
            数据库现在的值_价格 = dbValues?["Price"],
            我的原始版本 = entry.OriginalValues["Version"],
            数据库现在的版本 = dbValues?["Version"],
            原始版本号 = originalVersion
        });
    }
}
```
```
{
  "结果": "捕获并发冲突",
  "我的原始值_价格": 49,
  "我想写的值_价格": 69,
  "数据库现在的值_价格": 59,     ← A 改完的
  "我的原始版本": 0,
  "数据库现在的版本": 1,
  "原始版本号": 0
}
```

**三套值一次全看到了：** 我想写 69（基于旧价 49），数据库已经是 59，版本从 0 变成 1。

## Step 5（P88）：三种策略各写一遍

```csharp
[HttpPost("resolve/{id:long}/{mode}")]
public async Task<ActionResult<object>> Resolve(long id, string mode)
{
    await using var ctxA = new BookContext(_options);
    await using var ctxB = new BookContext(_options);

    var a = await ctxA.Books.FirstAsync(b => b.Id == id);
    var b = await ctxB.Books.FirstAsync(b => b.Id == id);

    a.Price += 10; a.Version++;
    await ctxA.SaveChangesAsync();                 // A 先赢

    b.Price += 20; b.Version++;
    try
    {
        await ctxB.SaveChangesAsync();
        return Ok(new { 模式 = mode, 结果 = "无冲突" });
    }
    catch (DbUpdateConcurrencyException ex)
    {
        var entry = ex.Entries.Single();

        switch (mode)
        {
            case "database-wins":
                await entry.ReloadAsync();                     // 我的修改作废，内存归数据库
                return Ok(new { 模式 = mode, 最终价格 = entry.Entity is Book bk ? bk.Price : 0 });

            case "client-wins":
                var dbValues = await entry.GetDatabaseValuesAsync();
                entry.OriginalValues.SetValues(dbValues!);     // 原值刷新成库里的
                await ctxB.SaveChangesAsync();                 // 再试一次，这次能过
                return Ok(new { 模式 = mode, 最终价格 = b.Price });

            default:
                var now = await entry.GetDatabaseValuesAsync();
                return Conflict(new
                {
                    模式 = "throw-to-user",
                    说明 = "这行已被他人修改",
                    服务器当前价格 = now?["Price"],
                    你的价格 = entry.CurrentValues["Price"]
                });
        }
    }
}
```
```sql
-- database-wins 里 ReloadAsync 发的
SELECT TOP(2) [b].[Id], ..., [b].[Version]
FROM [Books] AS [b]
WHERE [b].[Id] = @__p_0

-- client-wins 第二次 SaveChanges 发的（Version 已经是 1 了，能对上）
UPDATE [Books] SET [Price] = @p0, [Version] = @p1
OUTPUT 1
WHERE [Id] = @p2 AND [Version] = @p3
```

| mode | 最终结果 | 谁的数据活下来 |
|---|---|---|
| `database-wins` | A 的 +10 | A |
| `client-wins` | A 的 +10 然后被 B 的 +20 覆盖（基于旧值 49 算的 69） | B |
| `throw-to-user` | 返回 409，不写 | 都不动 |

> 注意 `client-wins` 的结果是 **69 而不是 79**：B 的 `+20` 是拿**旧价 49** 算的。并发控制只保证"**不悄悄覆盖**"，不保证"**自动合并**"。想合并（49+10+20=79）必须自己在 catch 里重算——那叫"读-改-写重试"，不是加个令牌就有的。

## Step 6（P89）：换成 RowVersion

**6.1 把 `Version` 换成 `RowVersion`**

先把 Step 3 加的 `Version` 删掉（或保留，两者可以共存，但没必要），然后：

```csharp
public class Book
{
    // ...
    public byte[] RowVersion { get; set; } = null!;      // 类型必须是 byte[]
}
```

```csharp
// 把 IsConcurrencyToken 那行换成这条
entity.Property(b => b.RowVersion).IsRowVersion();
```

```bash
dotnet ef migrations add AddBookRowVersion
dotnet ef database update
```
```csharp
migrationBuilder.AddColumn<byte[]>(
    name: "RowVersion",
    table: "Books",
    type: "rowversion",        // ← SQL Server 的行版本类型
    nullable: false);          // 注意：没有 defaultValue，值由数据库自己生成
```

> 注意迁移里**不应该出现 `defaultValue`**：`rowversion` 列不接受默认值，值由数据库为每一行各自生成（加到一个已有表上，老数据每一行都会拿到不同的版本号，这正是你要的）。
> 如果你看到 EF 生成了 `defaultValue: new byte[] { 0, 0, ... }`，把那一行删掉再 `database update`。

**6.2 验证它自动变**

```csharp
[HttpPost("rowversion-demo/{id:long}")]
public async Task<ActionResult<object>> RowVersionDemo(long id)
{
    var book = await _ctx.Books.FirstAsync(b => b.Id == id);

    string before = Convert.ToBase64String(book.RowVersion);

    book.Price += 1;                 // 注意：完全不用管 RowVersion
    await _ctx.SaveChangesAsync();

    string after = Convert.ToBase64String(book.RowVersion);

    return Ok(new
    {
        改之前 = before,
        改之后 = after,
        变了吗 = before != after,
        说明 = "我一行代码都没碰 RowVersion，它自己被数据库改了"
    });
}
```
```
{ "改之前": "AAAAAAAAAKE=", "改之后": "AAAAAAAAAKI=", "变了吗": true, ... }
```

**6.3 看 SQL 的 `OUTPUT` 变了**
```sql
UPDATE [Books] SET [Price] = @p0
OUTPUT INSERTED.[RowVersion]        -- ← 从 OUTPUT 1 变成读回新版本号
WHERE [Id] = @p1 AND [RowVersion] = @p2
```

## Step 7（P89）：RowVersion 的冲突检测

```csharp
[HttpPost("rowversion-conflict/{id:long}")]
public async Task<ActionResult<object>> RowVersionConflict(long id)
{
    await using var ctxA = new BookContext(_options);
    await using var ctxB = new BookContext(_options);

    var a = await ctxA.Books.FirstAsync(b => b.Id == id);
    var b = await ctxB.Books.FirstAsync(b => b.Id == id);
    string versionSeenByB = Convert.ToBase64String(b.RowVersion);

    a.Price += 10;
    await ctxA.SaveChangesAsync();               // A 改完，RowVersion 自动变新

    b.Price += 20;
    try
    {
        await ctxB.SaveChangesAsync();
        return Ok(new { 结果 = "无冲突" });
    }
    catch (DbUpdateConcurrencyException ex)
    {
        var dbValues = await ex.Entries.Single().GetDatabaseValuesAsync();
        byte[] dbVersion = (byte[])dbValues!["RowVersion"]!;

        return Ok(new
        {
            结果 = "捕获并发冲突",
            B看到的版本 = versionSeenByB,
            数据库现在的版本 = Convert.ToBase64String(dbVersion)
        });
    }
}
```

**和 P88 的代码几乎一样**——这就是 RowVersion 的价值：**业务代码不用改，只是把"人维护令牌"换成"数据库维护令牌"。**

## Step 8（P88/P89）：Web API 里返回 409

真实项目里，冲突应该变成一个明确的状态码，而不是 500：

```csharp
[HttpPost("update-price/{id:long}")]
public async Task<IActionResult> UpdatePrice(long id, double newPrice)
{
    try
    {
        var book = await _ctx.Books.FirstAsync(b => b.Id == id);
        book.Price = newPrice;
        await _ctx.SaveChangesAsync();
        return Ok(new { book.Id, book.Price });
    }
    catch (DbUpdateConcurrencyException)
    {
        return Conflict(new { 说明 = "这条数据已被他人修改，请刷新后重试" });   // 409
    }
}
```

| 状态码 | 语义 | 前端该做什么 |
|---|---|---|
| `409 Conflict` | 并发冲突 | 提示"数据已变更"，重新拉一次详情 |
| `412 Precondition Failed` | 也可以，配合 ETag | 同上 |
| `500` | **错**——这是可预期的业务冲突，不是服务器错误 | 前端什么都做不了 |

> 真正生产级的做法是把 `RowVersion` 经 **ETag** 传给前端，前端改完带上 `If-Match`，服务端比对 —— 这是 HTTP 规范里"乐观并发"的标准姿势，等你学到 Part4 的 REST 会再遇到。

---

==四：总结==

**三节一页速查**

| 节 | 一句话结论 | 关键 API |
|---|---|---|
| **P87** 悲观锁 | 事务里用 `WITH (UPDLOCK, ROWLOCK)` 锁住行，别人排队等；阻塞强一致、代价大、跨不了请求 | `BeginTransaction` + `FromSqlInterpolated` |
| **P88** 并发令牌 | UPDATE 的 `WHERE` 带上原令牌值，影响 0 行就抛异常；令牌要自己维护 | `IsConcurrencyToken()` / `DbUpdateConcurrencyException` / `GetDatabaseValuesAsync` |
| **P89** RowVersion | 把令牌交给数据库自动生成，业务代码不用管维护 | `IsRowVersion()` / `[Timestamp]` / `byte[]` |

**三种方案怎么选**

| 场景 | 选哪个 |
|---|---|
| 表单编辑（用户思考时间长） | **RowVersion + 409** |
| 后台批处理、跨多个请求的修改 | **RowVersion** |
| 库存/余额这种"必须原子"的短临界区 | 不用锁，直接用 `UPDATE SET X = X - 1` 的原子性 |
| 需要在事务里读-算-写、且必须强一致 | 悲观锁（`UPDLOCK`），但要短 |
| 用的是 SQLite | 应用管理令牌（`Guid` / `int`），没有 `rowversion` |

**三套值的对照（冲突处理的核心）**

| | 是什么 | 从哪来 |
|---|---|---|
| `OriginalValues` | 我最初读到的值 | 快照 |
| `CurrentValues` | 我想写进去的值 | 内存对象 |
| `DatabaseValues` | 库里现在的值 | `GetDatabaseValuesAsync()`（会再发一次 SELECT） |

**六个易错点**

1. **在同一个 `DbContext` 里模拟并发** → IdentityMap 返回同一个对象，永远不冲突。必须 new 两个 ctx。
2. **加了 `IsConcurrencyToken` 但忘了更新令牌列** → 第一次能过，之后必然冲突。交给 `RowVersion` 就没这问题。
3. **写 `Property(b => b.RowVersion).IsConcurrencyToken()`** → 只校验、不自动生成，值永远是全 0，必然冲突。要用 `IsRowVersion()`。
4. **以为 `client-wins` 会合并数据** → 它只是"允许覆盖"，B 的值仍是基于旧值算的。要合并得自己重算。
5. **以为 `ExecuteUpdate/Delete` 也有并发保护** → 没有，得自己把令牌写进 `Where` 并检查返回行数。
6. **把并发冲突当成 500** → 它是可预期的业务状态，应该是 409。

**记忆口诀**

> **并发的问题只有一个：你拿着旧世界的地图，在新世界里盖房子。**
> **悲观说"我先锁门"，代价是别人进不来、你也出不去，而且门锁不过一个 HTTP 请求。**
> **乐观说"我不锁门，但门口贴张字条：如果屋子变样了，别动"——字条就是并发令牌。**
> **令牌的本质就是把检查塞进 `WHERE`：`WHERE Id = @p AND Version = @oldVersion`，影响 0 行就是冲突。**
> **冲突之后有三套值：我想写的、我最初读的、库里现在的。处理就是选一个赢，或者问用户。**
> **自己维护令牌早晚有人忘，`RowVersion` 让数据库替你记——所以生产项目基本都用它。**
> **并发控制只管 `SaveChanges`；`ExecuteUpdate` 绕过跟踪器，令牌得你自己写进 `Where`。**
