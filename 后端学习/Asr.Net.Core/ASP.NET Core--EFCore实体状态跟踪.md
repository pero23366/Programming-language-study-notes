==一：概念==

> 本篇覆盖 **P82–P84**：EF Core 如何知道实体变了、AsNoTracking 优化、实体状态跟踪的妙用。
> 这三节围绕**同一个对象**——`ChangeTracker`（变更跟踪器）——讲了三个递进的问题：
> **它怎么发现变化（原理）→ 关掉它能省什么（优化）→ 能不能反过来用（用法）。**
> 前置：沿用上一篇的 `QueryDemo` 项目（`T_Books` / `T_Authors` / `T_Comments` / `T_Tags`）。
> 版本说明：主线按 **EF Core 6** 可用的 API 讲，EF Core 7/8 的新写法单独标出。

---

# P82　EF Core 如何知道实体数据变了

**因为它偷偷存了一份"原值快照"，`SaveChanges` 前把当前值和快照逐属性比一遍。**

这一节要回答三个具体问题：

1. 我只改了 `Title`，凭什么生成的 UPDATE 只有 `SET Title = @p0`？
2. 我改完属性还没 `SaveChanges`，为什么再查一次拿到的就是新值？
3. 我 `new` 一个 `Book{Id=1}` 扔给 EF，为什么它什么都不做？

答案全在下面三层机制里。

## 第一层：IdentityMap（标识映射）

`DbContext` 内部有一张表，记录着**「这个实体类型 + 这个主键」对应哪个对象实例**。

| 现象 | 原因 |
|---|---|
| 同一个 ctx 里，`Id=1` 的书查两次，`ReferenceEquals(b1, b2)` 是 `true` | 第二次查询在 IdentityMap 里命中，直接返回已有实例 |
| 第二次查询**照样发了 SQL**，但读回来的行被丢掉 | EF 不知道你有没有改过内存里的值，所以还是得查；查到同一主键时，用跟踪器里的实例，**不覆盖它的属性** |
| 改了 `b1.Title`，再查 `Id=1`，拿到的 `b2.Title` 是改后的值 | 就是同一个对象，改的是内存，跟数据库无关 |

> 这条是理解 P82 的钥匙：**EF 跟踪的是"对象"，不是"行"**。数据库只是它读数据的地方，`SaveChanges` 之前，你改的一切都只活在内存里。

## 第二层：快照（Snapshot）

实体第一次进入跟踪器时（`ctx.Books.First()` 查出、或 `Attach`/`Update` 手动挂上），EF 会**把每个属性的值复制一份**存进 `EntityEntry`，这份副本叫快照，通过 `Entry(entity).OriginalValues` 能读到。

| 你访问的 | 拿到的是什么 |
|---|---|
| `book.Title` | **当前值**（内存对象上的属性） |
| `ctx.Entry(book).CurrentValues["Title"]` | 当前值（走 `PropertyValues` 包装） |
| `ctx.Entry(book).OriginalValues["Title"]` | **快照值**（查询那一刻数据库里的值） |
| `ctx.Entry(book).Property(b => b.Title).OriginalValue` | 同上，强类型写法 |

快照是**每个被跟踪的实体一份**。查 5000 条书，内存里就有 5000 份快照——这是 P83 要优化掉的东西。

## 第三层：DetectChanges（变更检测）+ EntityState

比对"当前值"和"快照值"，算出每个属性的 `IsModified`，再推出整个实体的 `EntityState`。

**`EntityState` 只有五个值，全部要背下来：**

| 状态 | 含义 | `SaveChanges` 会做什么 |
|---|---|---|
| `Detached` | 游离。**不在跟踪器里**，EF 完全不管它 | 什么都不做（静默忽略） |
| `Unchanged` | 在跟踪器里，当前值 == 快照值 | 什么都不做 |
| `Added` | 新实体，数据库里还没有 | `INSERT` |
| `Modified` | 有属性值变了 | `UPDATE`，**只 SET 变了的列** |
| `Deleted` | 标记为删除 | `DELETE`，只按主键 |

**状态流转图（打印出来贴墙上）：**

```
          查出来 / Attach            改属性 + DetectChanges
Detached ──────────────────> Unchanged ─────────────────────> Modified
    │                            │                                │
    │  Add()                     │ Remove()                       │ SaveChanges
    ↓                            ↓                                ↓
  Added ────SaveChanges────> Deleted ────SaveChanges──────> Unchanged（重新快照）
    │                            │
    └────SaveChanges─────────────┘
              ↓
          Unchanged
```

**`DetectChanges()` 什么时候被调用？**

| 时机 | 说明 |
|---|---|
| `SaveChanges()` / `SaveChangesAsync()` 开头 | **必跑一次**，所以你不用手动调 |
| `ChangeTracker.Entries()` / `Entries<T>()` | 内部先跑一次**全量**检测，所以从它拿到的是最新状态 |
| `ctx.Entry(book)` / `ctx.Entry<Book>(book)` | 内部调 `entry.DetectChanges()`，只检测**这一个**实体（比全量便宜得多） |
| 你手动调 `ctx.ChangeTracker.DetectChanges()` | 想全量检查一遍时用 |

> **源码依据**（EF Core `DbContext.Entry<TEntity>`）：
> ```csharp
> var entry = EntryWithoutDetectChanges(entity);
> TryDetectChanges(entry);          // → entry.DetectChanges()，受 AutoDetectChangesEnabled 控制
> return entry;
> ```
> 所以 `ctx.Entry(b).State` 拿到的是**检测后**的状态，改完属性马上读就是 `Modified`——这个"立刻能读到"，是 `Entry()` 顺手帮你做了检测，不是状态自己会实时更新。
>
> 反过来说：**状态是惰性计算的，赋值不会瞬间触发任何逻辑。** 真正能把它变成"永远算不出来"的开关是 `ChangeTracker.AutoDetectChangesEnabled = false`（坑 4 讲）。

## 四个必须现在搞清的坑

**坑 1：`new` 出来的实体是 `Detached`，`SaveChanges` 静默忽略**

```csharp
var b = new Book { Id = 1, Title = "新标题" };   // State = Detached
ctx.SaveChanges();                                // 一条 SQL 都没有，不报错
```

`Detached` 的实体 EF 根本不知道它存在。要让它参与，得先 `Attach` / `Update` / `Add`（P84 讲）。

**坑 2：改了属性不 `SaveChanges`，数据库没变，但内存变了**

```csharp
var b = await ctx.Books.FirstAsync(x => x.Id == 1);
b.Title = "改过但没保存";        // 数据库里还是旧的
```

这是"看起来成功了，其实什么都没发生"的经典事故现场。**EF 不会自动保存**，它连定时器都没有。

**坑 3：UPDATE 只 SET 变了的列——这只在"查出来再改"的路径上成立**

| 你怎么拿到实体的 | UPDATE 的 SET 列表 |
|---|---|
| `First()` 查出来再改 → `SaveChanges` | **只含改过的列**（快照比对的功劳） |
| `new` 一个 + `Update()` / `State = Modified` | **全部列**（没快照可比，全标脏） |
| `Attach` + 精确指定 `IsModified` | 只有你指定的列 |

第二种是 P84 的重点，也是最容易把数据改烂的地方。

**坑 4：关掉 `AutoDetectChangesEnabled`，改了属性 `SaveChanges` 也不认**

```csharp
ctx.ChangeTracker.AutoDetectChangesEnabled = false;   // 有人为了"性能优化"这么干
var b = await ctx.Books.FirstAsync(x => x.Id == 1);
b.Title = "改了，但永远不会保存";
await ctx.SaveChangesAsync();                          // 连 SaveChanges 都不检测了
```

这个开关一关，`SaveChanges` 和 `Entry()` 都**不再自动检测**，你必须自己在合适的时机调 `ctx.ChangeTracker.DetectChanges()`。极少数"一次改几千个实体"的场景会有人关它来省扫描，代价是必须自己接管整条检测链路——**知道有这回事即可，不要主动去关**。

---

# P83　优化之 AsNoTracking

**跟踪不是白送的：快照占内存，`DetectChanges` 要扫描，IdentityMap 要维护哈希表。只读查询把这套全关掉。**

## 跟踪到底贵在哪

| 开销 | 具体是什么 | 什么时候疼 |
|---|---|---|
| **快照内存** | 每个实体一份原值副本 | 查几万行做导出/列表 |
| **EntityEntry 对象** | 每个实体一个跟踪条目（含状态、关系、原始值） | 同上，内存翻倍起步 |
| **`DetectChanges` 扫描** | `SaveChanges` 前遍历**所有**被跟踪实体，逐属性比对 | 跟踪器里有几千个实体时，`SaveChanges` 本身变慢 |
| **IdentityMap 查表** | 每行都要按「类型+主键」查一次哈希表 | 大结果集时的常数开销 |

关键是：**只读场景（列表页、导出、报表、下拉框）这四样全是纯浪费**——你根本不会改这些实体。

## `AsNoTracking()`：一行搞定

```csharp
var books = await ctx.Books.AsNoTracking().ToListAsync();
```

返回的实体**不进跟踪器、没有快照**。代价是四条副作用，每条都能咬人：

| 副作用 | 表现 | 怎么办 |
|---|---|---|
| **改了不保存** | 改完 `SaveChanges` 一条 SQL 都没有，**不报错** | 只读查询才用；要改就 `AsTracking()` 或去掉 |
| **同一行查两次是两个对象** | `ReferenceEquals(b1, b2)` 为 `false`，改 `b1` 不影响 `b2` | 想"同一实例"就别用；或自己建字典去重 |
| **`Include` 集合时会产生重复对象** | 一个作者带 3 本书，`Include` 后作者出现 3 个不同实例 | `AsNoTrackingWithIdentityResolution()`（EF Core 5+） |
| **和跟踪查询的实体并存** | 跟踪器里已经有一个 `Id=1`，你再 `AsNoTracking` 查，得到的是**第二个**对象；改它不会保存 | 一个方法里别混着用 |

**重复对象那条展开说**，因为它是最隐蔽的：

```csharp
// 一个作者有 3 本书，按书查、带作者
var books = await ctx.Books.Include(b => b.Author).AsNoTracking().ToListAsync();
// books[0].Author != books[1].Author（虽然是同一个作者！）
```

没有 IdentityMap，EF 拼对象图时每行都 new 一个 `Author`。如果代码里 `books[0].Author.Name = "xxx"` 想"顺手改一下作者"，另外两个还是旧名字——而且全都不保存。

`AsNoTrackingWithIdentityResolution()` 会在**单次查询内部**维护一个临时 IdentityMap 去重，既不跟踪、又不重复。开销比 `AsNoTracking` 略高一点，但仍然远低于跟踪。

## 全局关跟踪：把规则反过来写

真实项目里 90% 的查询是只读的，一个接口一个接口地加 `AsNoTracking` 会漏。**更好的做法是全局默认关掉，需要跟踪的地方单独开：**

```csharp
// Program.cs / DbContext 的 OnConfiguring
optionsBuilder.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
```

```csharp
// 需要改数据的地方，显式加回来
var book = await ctx.Books.AsTracking().FirstAsync(b => b.Id == 1);
book.Title = "改一下";
await ctx.SaveChangesAsync();          // 正常保存
```

| 配置 | 语义 |
|---|---|
| `QueryTrackingBehavior.TrackAll`（默认） | 查询默认跟踪 |
| `QueryTrackingBehavior.NoTracking` | 查询默认不跟踪 |
| `AsNoTracking()` | 这个查询不跟踪（不管全局怎么设） |
| `AsTracking()` | 这个查询跟踪（全局 NoTracking 时的救命稻草） |
| `AsNoTrackingWithIdentityResolution()` | 不跟踪 + 单查询内去重 |

> 全局 NoTracking 模式下**最大的坑**：`First()` 查出来改属性 → `SaveChanges` 静默无效。所以团队里用这个配置，一定配套"写操作必须显式 `AsTracking`"的规范，否则新人第一次改数据就会怀疑人生。

## 什么时候**不能**用 `AsNoTracking`

| 场景 | 原因 |
|---|---|
| 查完要改再保存 | 不跟踪 = 改了不保存 |
| 同一方法里要拿"同一实例"保证引用相等 | 每次 new 新对象 |
| 依赖"查出来的实体自动进 IdentityMap 做去重" | 没 IdentityMap |
| 需要 `Entry(entity).State` 做状态判断 | 实体根本不在跟踪器里，`Entry` 返回 `Detached` |

---

# P84　实体状态跟踪的妙用

**既然状态可以手动指定，那就能"不查询直接改、不查询直接删"——省一次 SELECT，但代价是可能把整行覆盖成默认值。**

## 三个手动挂载的 API

| API | 挂进跟踪器后状态 | 生成的 SQL |
|---|---|---|
| `ctx.Books.Attach(b)` | `Unchanged` | 无（认为和库里一致） |
| `ctx.Books.Update(b)` | `Modified`（**所有属性标脏**） | `UPDATE`，**SET 全部列** |
| `ctx.Books.Remove(b)` | `Deleted` | `DELETE`，按主键 |
| `ctx.Entry(b).State = EntityState.Modified` | 同上，等价 `Update` | 同上 |

## 用法一：不查询直接改（省一次 SELECT）

普通写法是两条 SQL：

```csharp
var book = await ctx.Books.FirstAsync(b => b.Id == 1);   // SQL #1：SELECT
book.Title = "新标题";
await ctx.SaveChangesAsync();                            // SQL #2：UPDATE
```

只改一个字段，第一条 SELECT 纯属浪费。改成：

```csharp
var stub = new Book { Id = 1, Title = "新标题" };
ctx.Books.Attach(stub);                                       // 挂进跟踪器，State = Unchanged
ctx.Entry(stub).Property(b => b.Title).IsModified = true;     // 只把 Title 标脏
await ctx.SaveChangesAsync();
```
```sql
UPDATE [T_Books] SET [Title] = @p0
WHERE [Id] = @p1;
```

一次往返搞定，而且 SET 里只有 `Title`——这就是"只知道 Id 就改一个字段"的正确写法。

> `stub` 这个词在仓储模式里很常见，意思是一个"占位实体"：只填主键（和要改的字段），其余全是默认值。它存在的唯一目的就是让 EF 知道"要改哪一行"。
>
> **`Attach` 的前提是主键有值。** 如果你 `new Book { Title = "x" }` 不填 `Id` 就 `Attach`，EF 会拿 `Id = 0` 去 `WHERE [Id] = 0`，影响 0 行 → 抛 `DbUpdateConcurrencyException`（"预期影响 1 行，实际 0 行"）。想新增就该用 `Add()`，别用 `Attach()`。

## 用法二：`Update()` 为什么会把数据改烂

```csharp
var stub = new Book { Id = 1, Title = "新标题" };
ctx.Books.Update(stub);            // 所有属性标脏！
await ctx.SaveChangesAsync();
```
```sql
UPDATE [T_Books]
SET [Title] = @p0, [Price] = @p1, [PubTime] = @p2, [AuthorId] = @p3
WHERE [Id] = @p4;
-- @p1 = 0, @p2 = '0001-01-01 00:00:00', @p3 = 0
```

**`Price` 被写成 `0`，`PubTime` 被写成 `0001-01-01`，`AuthorId` 被写成 `0`（外键直接炸）。** 因为 `stub` 没赋值的属性都是 CLR 默认值，而 `Update` 把它们全部当成"你改成了默认值"。

> 这是 P84 唯一的致命坑。`Update()` 只适合"整个实体都是我从前端完整拿到的"场景（比如 PUT 全量更新）；**只要实体不完整，就必须用 `Attach` + `IsModified` 精确控制**。

## 用法三：不查询直接删

```csharp
var stub = new Book { Id = 1 };
ctx.Books.Remove(stub);              // 挂上并标 Deleted
await ctx.SaveChangesAsync();
```
```sql
DELETE FROM [T_Books]
WHERE [Id] = @p0;
```

只按主键删，`stub` 其他属性是什么值无所谓——**删除只需要主键**。所以这个用法是安全的（除非配置了并发令牌，那时 `WHERE` 会带上令牌列）。

## 用法四：`OriginalValues` 读原值（审计日志用）

```csharp
var entry = ctx.Entry(book);
var oldTitle = entry.OriginalValues["Title"];        // 快照值
var newTitle = entry.CurrentValues["Title"];         // 当前值
```

真实项目里做"修改记录"就是这么来的：`SaveChanges` 前遍历 `ChangeTracker.Entries()`，挑出 `Modified` 的，对比 `OriginalValues` / `CurrentValues` 写一条日志。

## 用法五：把改动"撤销"掉

| 想要什么 | 写法 |
|---|---|
| 撤销所有未保存的修改 | `ctx.Entry(book).State = EntityState.Unchanged;`（状态回滚，内存值不变，但不会被保存） |
| 用数据库的值覆盖内存 | `await ctx.Entry(book).ReloadAsync();`（再发一次 SELECT，属性回滚到库里的值） |
| 把实体踢出跟踪器 | `ctx.Entry(book).State = EntityState.Detached;` |
| 全部踢出 | `ctx.ChangeTracker.Clear();`（EF Core 5+） |

> `State = Unchanged` 有个反直觉的地方：它只改状态，**不改属性值**。想真回滚得用 `Reload()`。

## 这一节的代价：并发覆盖

不查询直接改，意味着你**没读过那一行**，也就不知道别人这期间改过它。两个后果：

1. **用 `Update()` 全列更新时**，你把"自己没看到的列"也一并写回去——对方刚改的 `Price` 会被你手里的旧值（或默认值）覆盖。
2. **即使只 SET 一列**，你的业务判断也是建立在旧认知上的。比如"把库存减 1"，减之前根本没看到别人已经把它改成 0 了。

> 一个具体的翻车开场：「只知道 Id 就把标题改了」在单机测试里永远正确，上线后某个用户发现自己的修改被莫名回滚——因为你那次 UPDATE 是在他没提交之前读的旧状态上做的。

这就是**批次 06 乐观并发控制（P88–P89）**要解决的问题：给表加一个 `RowVersion` 列，UPDATE 时带上"我读到的版本号"，版本对不上就抛异常。现在只要记住**"不查询直接改有并发风险"**这个结论就行。

---

==二：格式==

## P82　变更跟踪的访问格式

**遍历跟踪器里的所有实体**
```csharp
foreach (EntityEntry entry in ctx.ChangeTracker.Entries())
{
    Console.WriteLine($"{entry.Entity.GetType().Name} → {entry.State}");
}
```

**按类型过滤（常用）**
```csharp
foreach (var entry in ctx.ChangeTracker.Entries<Book>())
{
    Console.WriteLine($"{entry.Entity.Id} {entry.State}");
}
```

**只挑改过的**
```csharp
var modified = ctx.ChangeTracker.Entries<Book>()
    .Where(e => e.State == EntityState.Modified);
```

**手动跑一次检测**
```csharp
ctx.ChangeTracker.DetectChanges();
```

**单个实体的入口**
```csharp
EntityEntry<Book> entry = ctx.Entry(book);
EntityState state       = entry.State;
PropertyEntry<Book, string> p = entry.Property(b => b.Title);
bool isModified         = p.IsModified;
object? oldValue        = p.OriginalValue;
object? newValue        = p.CurrentValue;
```

> `EntityEntry<T>` 是泛型版，`entry.Entity` 直接就是 `T` 类型，不用强转。`PropertyEntry<TEntity, TProperty>` 是属性的强类型包装，`p.CurrentValue` 就是 `TProperty`。

**三个类型的层次关系（`ctx.Entry()` 返回的东西长什么样）**

| 类型 | 代表什么 | 常用成员 |
|---|---|---|
| `EntityEntry` | 一个实体的跟踪条目 | `State`、`Entity`、`CurrentValues`、`OriginalValues` |
| `EntityEntry<T>` | 同上，泛型版 | `Entity` 是 `T` |
| `PropertyEntry` | **一个属性**的跟踪条目 | `IsModified`、`CurrentValue`、`OriginalValue` |
| `PropertyValues` | 整个实体的值集合 | 索引器 `["Title"]`、`SetValues(...)`、`Clone()` |

## P83　不跟踪的写法

| 写法 | 作用 | 位置要求 |
|---|---|---|
| `.AsNoTracking()` | 本查询不跟踪 | `IQueryable` 上任意位置，`ToList` 前 |
| `.AsTracking()` | 本查询强制跟踪 | 同上 |
| `.AsNoTrackingWithIdentityResolution()` | 不跟踪 + 单查询去重（EF Core 5+） | 同上 |
| `UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking)` | 全局默认不跟踪 | `DbContextOptionsBuilder` 上 |

```csharp
// 局部
var list = await ctx.Books.AsNoTracking().Where(b => b.Price > 50).ToListAsync();

// 全局（OnConfiguring 或 AddDbContext）
optionsBuilder.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);

// 全局关掉之后，需要跟踪的地方单独开
var one = await ctx.Books.AsTracking().FirstAsync(b => b.Id == 1);
```

## P84　手动控制状态的写法

| 想做的事 | 写法 | SET 的列 |
|---|---|---|
| 整个实体全量更新 | `ctx.Books.Update(entity)` | 全部列 |
| 等价写法 | `ctx.Entry(entity).State = EntityState.Modified;` | 全部列 |
| 挂上但不改 | `ctx.Books.Attach(entity)` | 不产生 UPDATE |
| **只改一个字段** | `Attach` + `Entry().Property(x => x.Prop).IsModified = true` | **只这一列** |
| **只改几个字段** | `Attach` + 多次 `IsModified = true` | 你点名的几列 |
| 只按主键删 | `ctx.Books.Remove(new Book { Id = 1 })` | DELETE 按主键 |
| 取消修改 | `ctx.Entry(entity).State = EntityState.Unchanged` | 不产生 SQL |
| 丢弃内存改动、重读库 | `await ctx.Entry(entity).ReloadAsync()` | 发一次 SELECT |

**精确改一列的完整三行（背下来）**
```csharp
ctx.Books.Attach(stub);
ctx.Entry(stub).Property(b => b.Title).IsModified = true;
await ctx.SaveChangesAsync();
```

> 顺序不能反：**必须先进跟踪器（`Attach`），才能拿到 `Entry` 去标脏**。对 `Detached` 实体直接 `Entry(stub).Property(...).IsModified = true` 会抛 `InvalidOperationException`（提示该实体未被跟踪）。

---

==三：代码==

**前提**：沿用 `QueryDemo` 的 `TestDbContext`（`T_Books` 表，`Book` 有 `Id` / `Title` / `Price` / `PubTime` / `AuthorId`）。已开 `LogTo(Console.WriteLine)` 看 SQL。下面每步单独跑，**先看状态，再看 SQL**。

**第 1 步（P82）：查出来就是 `Unchanged`，而且带着快照**
```csharp
var b1 = await ctx.Books.FirstAsync(b => b.Id == 1);

Console.WriteLine($"State = {ctx.Entry(b1).State}");                       // Unchanged
Console.WriteLine($"快照里的 Title = {ctx.Entry(b1).OriginalValues["Title"]}");
Console.WriteLine($"内存里的 Title = {b1.Title}");
```
```
State = Unchanged
快照里的 Title = C# 入门
内存里的 Title = C# 入门
```

**第 2 步（P82）：改一个属性，`Entry()` 自带的检测就能看出来**
```csharp
b1.Title = "被改过的标题";

// Entry() 内部会调 entry.DetectChanges()，所以这里拿到的是检测后的状态
Console.WriteLine($"State = {ctx.Entry(b1).State}");                              // Modified

var entry = ctx.Entry(b1);
Console.WriteLine($"Title 脏了？{entry.Property(b => b.Title).IsModified}");      // True
Console.WriteLine($"Price 脏了？{entry.Property(b => b.Price).IsModified}");      // False
Console.WriteLine($"快照 Title = {entry.Property(b => b.Title).OriginalValue}");  // 旧值
```
```
State = Modified
Title 脏了？True
Price 脏了？False
快照 Title = C# 入门
```
> 注意 `Price 脏了？False`：**脏不脏是按属性记的，不是整个实体一个 bit**。整体 `State` 只是这些属性标记的汇总。
>
> 也别误会成"状态会实时更新"：是 `Entry()` 帮你跑了一次检测。在 `Entry()` 拿到手之前，那个 `Modified` 根本不存在于任何地方。

**第 3 步（P82）：`SaveChanges` 后，UPDATE 只有一列**
```csharp
await ctx.SaveChangesAsync();
Console.WriteLine($"保存后 State = {ctx.Entry(b1).State}");   // 回到 Unchanged
```
```sql
exec sp_executesql N'SET NOCOUNT ON;
UPDATE [T_Books] SET [Title] = @p0
OUTPUT 1
WHERE [Id] = @p1;',N'@p0 nvarchar(4000),@p1 int',@p0=N'被改过的标题',@p1=1
```
**看到 `SET` 后面只有一个 `[Title]`，这就是快照比对的全部价值。** 保存成功后 EF 会**重新拍一次快照**，所以状态回到 `Unchanged`。

**第 4 步（P82）：IdentityMap —— 查两次是同一个对象**
```csharp
var x1 = await ctx.Books.FirstAsync(b => b.Id == 2);
var x2 = await ctx.Books.FirstAsync(b => b.Id == 2);

Console.WriteLine($"同一个实例？{ReferenceEquals(x1, x2)}");        // True
Console.WriteLine($"跟踪器里有几个 Book？{ctx.ChangeTracker.Entries<Book>().Count()}");
```
```
同一个实例？True
跟踪器里有几个 Book？2
```
> 注意第二行是 **2**：`x1`（Id=1，第 1 步查的）和 `x2`（Id=2）。**两次查 Id=2 只产生一个对象**——IdentityMap 在起作用。
>
> `ReferenceEquals(a, b)` 是 `object` 的静态方法，判断两个引用是否指向同一块内存。不能用 `==`，因为 `Book` 没重载 `==` 时 `==` 也是引用比较，但一旦重载过（比如 `record`）语义就变了，**判引用统一用 `ReferenceEquals`**。

**第 5 步（P82）：改了不保存，再查拿到的是内存值**
```csharp
var y1 = await ctx.Books.FirstAsync(b => b.Id == 3);
y1.Title = "只在内存里改的";
// 故意不 SaveChanges

var y2 = await ctx.Books.FirstAsync(b => b.Id == 3);
Console.WriteLine($"y2 看到的是：{y2.Title}");           // 只在内存里改的
Console.WriteLine($"是不是同一个对象：{ReferenceEquals(y1, y2)}");   // True

var fresh = await ctx.Books.AsNoTracking().FirstAsync(b => b.Id == 3);
Console.WriteLine($"AsNoTracking 看到的是：{fresh.Title}");          // 数据库里的旧值
```
```
y2 看到的是：只在内存里改的
是不是同一个对象：True
AsNoTracking 看到的是：C# 入门
```
**这一组输出把 IdentityMap 和"数据库 vs 内存"的关系一次说透**：跟踪查询命中 IdentityMap，返回你改过的那个对象；`AsNoTracking` 绕过 IdentityMap，老老实实读库。

**第 6 步（P82）：`new` 出来的是 `Detached`，SaveChanges 静默忽略**
```csharp
var fake = new Book { Id = 100, Title = "野生实体" };
Console.WriteLine($"State = {ctx.Entry(fake).State}");    // Detached

await ctx.SaveChangesAsync();                              // 没有任何 SQL
Console.WriteLine("SaveChanges 执行完了，但没有一条 SQL");
```

**第 7 步（P83）：`AsNoTracking` —— 两个对象，改了也不保存**
```csharp
var n1 = await ctx.Books.AsNoTracking().FirstAsync(b => b.Id == 4);
var n2 = await ctx.Books.AsNoTracking().FirstAsync(b => b.Id == 4);
Console.WriteLine($"同一个实例？{ReferenceEquals(n1, n2)}");     // False
Console.WriteLine($"State = {ctx.Entry(n1).State}");            // Detached

n1.Price = 999;
await ctx.SaveChangesAsync();                                    // 一条 SQL 都没有
Console.WriteLine("改了，也没报错，但数据库没变");
```

**第 8 步（P83）：`Include` + `AsNoTracking` 的重复对象**
```csharp
var books = await ctx.Books
    .Include(b => b.Author)
    .AsNoTracking()
    .Where(b => b.AuthorId == 1)
    .ToListAsync();

Console.WriteLine($"查了 {books.Count} 本书，作者都是 {books[0].Author.Name}");
Console.WriteLine($"这些 Author 是不是同一个实例：{ReferenceEquals(books[0].Author, books[1].Author)}");
```
```
查了 3 本书，作者都是 杨中科
这些 Author 是不是同一个实例：False
```
> 同一个作者，在内存里变成了 3 个互不相干的对象：**值一样，引用不等**。
>
> 顺带一个陷阱：`books.Select(b => b.Author).Distinct().Count()` 的结果**不可靠**——`Distinct` 走 `Equals`，普通类默认按引用比（得到 3），`record` 或重写过 `Equals` 的类才得到 1。**判"是不是同一实例"永远用 `ReferenceEquals`，别用 `Distinct` 或 `==` 反推。**

**第 9 步（P83）：换成 `WithIdentityResolution`，引用变相等**
```csharp
var books2 = await ctx.Books
    .Include(b => b.Author)
    .AsNoTrackingWithIdentityResolution()
    .Where(b => b.AuthorId == 1)
    .ToListAsync();

Console.WriteLine($"ReferenceEquals：{ReferenceEquals(books2[0].Author, books2[1].Author)}");  // True
```

**第 10 步（P84）：不查询直接改一个字段**
```csharp
// 两条 SQL 的老写法
var full = await ctx.Books.AsTracking().FirstAsync(b => b.Id == 5);   // SQL #1：SELECT
full.Title = "全量写法改的";
await ctx.SaveChangesAsync();                                          // SQL #2：UPDATE 只 SET Title

// 一条 SQL 的新写法
var stub = new Book { Id = 5, Title = "精确写法改的" };
ctx.Books.Attach(stub);
ctx.Entry(stub).Property(b => b.Title).IsModified = true;
await ctx.SaveChangesAsync();                                          // 只有 UPDATE
```
```sql
-- 老写法（查出来再改）
exec sp_executesql N'SET NOCOUNT ON;
UPDATE [T_Books] SET [Title] = @p0
OUTPUT 1
WHERE [Id] = @p1;',N'@p0 nvarchar(4000),@p1 int',@p0=N'全量写法改的',@p1=5

-- 新写法（Attach + IsModified）
exec sp_executesql N'SET NOCOUNT ON;
UPDATE [T_Books] SET [Title] = @p0
OUTPUT 1
WHERE [Id] = @p1;',N'@p0 nvarchar(4000),@p1 int',@p0=N'精确写法改的',@p1=5
```
> 两条 UPDATE 长得一模一样，**区别在 UPDATE 前面有没有那条 SELECT**。省下的就是这一次往返。

**第 11 步（P84）：`Update()` 把整行写成默认值（现场翻车）**
```csharp
Console.WriteLine("改之前：");
var before = await ctx.Books.AsNoTracking().FirstAsync(b => b.Id == 6);
Console.WriteLine($"Price={before.Price}, PubTime={before.PubTime}, AuthorId={before.AuthorId}");

var stub2 = new Book { Id = 6, Title = "只用 Update 改标题" };
ctx.Books.Update(stub2);
await ctx.SaveChangesAsync();

Console.WriteLine("改之后：");
var after = await ctx.Books.AsNoTracking().FirstAsync(b => b.Id == 6);
Console.WriteLine($"Price={after.Price}, PubTime={after.PubTime}, AuthorId={after.AuthorId}");
```
```
改之前：
Price=59.8, PubTime=2021/3/1 0:00:00, AuthorId=2
改之后：
Price=0, PubTime=0001/1/1 0:00:00, AuthorId=0
```
```sql
exec sp_executesql N'SET NOCOUNT ON;
UPDATE [T_Books]
SET [Title] = @p0, [Price] = @p1, [PubTime] = @p2, [AuthorId] = @p3
OUTPUT 1
WHERE [Id] = @p4;',
N'@p0 nvarchar(4000),@p1 decimal(18,2),@p2 datetime2(7),@p3 int,@p4 int',
@p0=N'只用 Update 改标题',@p1=0.00,@p2='0001-01-01T00:00:00',@p3=0,@p4=6
```
**`AuthorId=0` 这行是个隐藏炸弹**：如果表上建了外键约束，这条 UPDATE 会直接抛 `FOREIGN KEY 冲突`；如果没有约束，你就得到了一条"孤儿书"。**这个实验务必在你练习库上做一次**，比看十遍文字管用。

**第 12 步（P84）：不查询直接删**
```csharp
var delStub = new Book { Id = 8 };      // 只填主键
ctx.Books.Remove(delStub);
await ctx.SaveChangesAsync();
```
```sql
exec sp_executesql N'SET NOCOUNT ON;
DELETE FROM [T_Books]
OUTPUT 1
WHERE [Id] = @p0;',N'@p0 int',@p0=8
```
> 删除只看主键，`delStub` 其他属性是啥都不影响。**这是三个"不查询"用法里唯一不会翻车的**。

**第 13 步（P84）：撤销修改的两种方式**
```csharp
var z = await ctx.Books.AsTracking().FirstAsync(b => b.Id == 1);
z.Title = "乱改的";

// 方式一：只回滚状态，内存值还在
ctx.Entry(z).State = EntityState.Unchanged;
Console.WriteLine($"State={ctx.Entry(z).State}, 内存里的 Title={z.Title}");  // Unchanged, 乱改的

await ctx.SaveChangesAsync();          // 没有 UPDATE

// 方式二：从库里重读，连内存值一起覆盖
z.Title = "又乱改一次";
await ctx.Entry(z).ReloadAsync();
Console.WriteLine($"Reload 之后的 Title={z.Title}");    // 数据库里的值
```

**第 14 步（P83/P84 合测）：跟踪 vs 不跟踪，量一下差多少**
```csharp
ctx.ChangeTracker.Clear();                            // 先清空，排除前几步留下的实体

var sw = Stopwatch.StartNew();
var tracked = await ctx.Books.ToListAsync();          // 5000 条，全跟踪
sw.Stop();
Console.WriteLine($"跟踪：{sw.ElapsedMilliseconds} ms，跟踪器里 {ctx.ChangeTracker.Entries<Book>().Count()} 个");

ctx.ChangeTracker.Clear();                            // 清空，排除干扰

sw.Restart();
var untracked = await ctx.Books.AsNoTracking().ToListAsync();
sw.Stop();
Console.WriteLine($"不跟踪：{sw.ElapsedMilliseconds} ms，跟踪器里 {ctx.ChangeTracker.Entries<Book>().Count()} 个");
```
```
跟踪：412 ms，跟踪器里 5000 个
不跟踪：168 ms，跟踪器里 0 个
```
> 具体数字随机器和列数变化（属性越多差距越大），**你的实测值自己记下来**。差距的来源是：每行要 new 一个 `EntityEntry`、复制一份快照、插进 IdentityMap 哈希表。
>
> `Stopwatch` 在 `System.Diagnostics` 命名空间，`StartNew()` 创建并启动，`Restart()` 归零重计。别用 `DateTime.Now` 相减测耗时——精度只有 15ms 左右。
>
> `ctx.ChangeTracker.Clear()` 是 EF Core 5+ 的方法，把跟踪器里所有实体踢出去（等于逐个 `Detach`）。EF Core 3 里得手写循环。

**第 15 步（P82）：把自动检测关掉，看状态"瞎掉"的样子**
```csharp
var q = await ctx.Books.AsTracking().FirstAsync(b => b.Id == 7);
Console.WriteLine($"查出来：{ctx.Entry(q).State}");                 // Unchanged

ctx.ChangeTracker.AutoDetectChangesEnabled = false;   // 关掉自动检测
q.Price = 88;
Console.WriteLine($"改了属性但关着检测：{ctx.Entry(q).State}");       // 还是 Unchanged！

ctx.ChangeTracker.DetectChanges();                    // 手动检测一次
Console.WriteLine($"手动检测后：{ctx.Entry(q).State}");               // Modified

ctx.ChangeTracker.AutoDetectChangesEnabled = true;    // 一定要开回来
```
```
查出来：Unchanged
改了属性但关着检测：Unchanged
手动检测后：Modified
```
> 这三行输出证明了一件事：**`EntityState` 不是属性上的标记，是检测那一刻算出来的结论**。不做检测，`Price` 从 59.8 变成 88 这件事在任何地方都不可见——包括 `SaveChanges`（它开头那次检测也被同一个开关挡住了）。
>
> 这就是为什么第 2 步里 `Entry()` 能直接读到 `Modified`：`DbContext.Entry<TEntity>()` 的源码是 `EntryWithoutDetectChanges(entity)` 之后紧跟一句 `TryDetectChanges(entry)`。**EF Core 在替你跑检测，而不是状态自己在更新。**

---

==四：总结==

**三节一页速查**

| 节 | 一句话结论 | 关键 API |
|---|---|---|
| **P82** 怎么知道变了 | IdentityMap 保证同主键同实例；快照存原值；`DetectChanges` 比对出状态；UPDATE 只 SET 脏列 | `Entry()` / `ChangeTracker.Entries()` / `EntityState` |
| **P83** AsNoTracking | 只读查询关跟踪，省快照+扫描+哈希；副作用是改了不保存、实例不唯一 | `AsNoTracking()` / `AsTracking()` / `UseQueryTrackingBehavior` |
| **P84** 状态妙用 | `Attach` + `IsModified` 精确改一列、`Remove` 按主键删；`Update()` 会把没赋值的属性写成默认值 | `Attach` / `Update` / `Remove` / `Property().IsModified` |

**五个状态速查**

| 状态 | 由来 | `SaveChanges` 行为 |
|---|---|---|
| `Detached` | `new` 出来的、被 `Detach`/`Clear` 的 | 忽略（不报错） |
| `Unchanged` | 查询出来、`Attach` 之后 | 忽略 |
| `Added` | `Add()` | `INSERT` |
| `Modified` | 改属性 + 检测、`Update()`、手动设状态 | `UPDATE`（脏列 / 全部列） |
| `Deleted` | `Remove()` | `DELETE`（按主键） |

**UPDATE 的 SET 列表由"你怎么拿到实体"决定**

| 路径 | SET 的列 | 风险 |
|---|---|---|
| 查出来再改 | 只有改过的列 | 无（最优） |
| `Attach` + `Property().IsModified` | 只有你点名的列 | 无（少一次查询） |
| `Update()` / `State = Modified` | **全部列** | **没赋值的属性被写成默认值** |
| `ExecuteUpdate`（EF7+） | 只有你 `SetProperty` 的列 | 无（但绕过跟踪器，跳到 P85） |

**八个易错点**

1. **关掉 `AutoDetectChangesEnabled` 后改属性** → `Entry()` 和 `SaveChanges` 都不再检测，改了永远不保存；要么别关，要么自己调 `DetectChanges()`。
2. **`new Book{Id=1}` 直接 `SaveChanges`** → `Detached`，一条 SQL 都没有，也不报错。
3. **`Update(stub)` 只填了主键和标题** → 其余列被写成 `0` / `0001-01-01` / `null`，外键列直接炸。
4. **`AsNoTracking` 查出来改完保存** → 静默无效，无异常无 SQL。
5. **`AsNoTracking` + `Include` 集合** → 同一父实体变成多个实例，改一个不影响其他，全都不保存。用 `AsNoTrackingWithIdentityResolution()`。
6. **对没 `Attach` 的实体调 `Entry().Property().IsModified`** → 抛 `InvalidOperationException`（实体未被跟踪）。
7. **同一方法里跟踪查询和 `AsNoTracking` 混用** → 同主键两个对象，改哪个都可能不生效。
8. **`State = Unchanged` 当成"撤销修改"** → 只回滚状态不回滚值；要回滚值用 `Reload()`。

**记忆口诀**

> **跟踪靠三样：IdentityMap 认出"同一行"，快照记住"原来的值"，DetectChanges 比出"哪列脏"。**
> **改了没反应属正常，保存之前都在内存里；改了没保存还不算数，EF 不会自己动手。**
> **UPDATE 只改脏列——前提是查出来再改；`Update()` 是全场标脏，没赋值的全变默认值。**
> **只改一列别查库：`Attach` 挂上、`IsModified` 点脏、一次往返搞定。**
> **只删一行别查库：`Remove` 一个只有 Id 的壳，DELETE 只认主键。**
> **只读查询一律 `AsNoTracking`：快照省了、扫描省了、内存省了——但改了绝对不保存。**
> **不查询直接改很快，也很危险：你不知道那一行现在长什么样，这就是并发控制要解决的问题。**
