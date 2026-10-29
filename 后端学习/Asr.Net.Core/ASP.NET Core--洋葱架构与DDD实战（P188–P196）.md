==零：补充==

> **这一篇（P188–P196）回答两个问题：这些概念到底怎么装进一个真实项目的目录里？九节课的最后一课要说什么？**

## 它解决什么问题

**前八批你学了：聚合、值对象、领域服务、领域事件、outbox、MediatR……**

**然后你想动手，第一个问题就卡住了：**

```
这些类放哪个文件夹？
Domain 能不能引用 EF Core？
仓储接口放 Domain 还是 Infrastructure？
DbContext 算哪一层？
Web 层能不能直接 new 一个 DbContext？
```

**这一批就是答案。而且答案是"能被编译器强制执行的"** —— 不是靠约定俗成、不是靠代码评审。

## 没有它会怎样

### 现场一：所有代码在一个项目里

**最常见的"三层架构"真相：**

```
BookShop.Web/
├── Controllers/
├── Services/          ← 业务规则在这
├── Models/            ← 实体也在这
├── Data/
│   └── BookContext.cs
└── Program.cs
```

**问题不是"不好看"，是没有任何东西阻止你：**

| 看起来很自然，实际是灾难 | 后果 |
|---|---|
| Controller 里直接 `_ctx.Books.Where(...)` | 业务规则开始往 Controller 跑 |
| `Book.cs` 里写 `[Required]` + `[Column(TypeName="decimal(18,2)")]` | 实体被数据库细节污染 |
| Service 里 `using Microsoft.EntityFrameworkCore` | 换个 ORM 要重写所有业务 |
| 单元测试 `new BookService(ctx)` | 必须连数据库 |

### 现场二：想给业务规则写测试，发现做不到

**贫血 + 单项目的典型测试：**

```csharp
[Fact]
public void 库存不足不能借()
{
    // 40 行准备工作：new DbContextOptions、UseSqlite(":memory:")、
    // EnsureCreated、造数据、SaveChanges...
}
```

**分层之后：**

```csharp
[Fact]
public void 库存不足不能借()
{
    var book = new Book("x", new Money(10m), 1, AuthorId.From(1));
    Assert.Throws<InvalidOperationException>(() => book.Deduct(2));
}
```

**一行，零数据库，一毫秒。**

> **这才是分层的真正收益：不是"结构好看"，是"业务逻辑终于可以脱离数据库存在"。**

### 现场三：换个数据库，发现要改业务代码

**如果 `Book.cs` 里有这些：**

```csharp
[Table("Books")]
[Column(TypeName = "decimal(18,2)")]
public decimal Price { get; set; }

[NotMapped]
public string Display => $"{Title} - {Price}";
```

**那你的领域模型已经和 SQL Server 绑死了。** 换 Sqlite、换 MongoDB、甚至换 ORM，都要动 `Book.cs`——**而 `Book.cs` 本该是最稳定的东西**。

## 它在生态里的位置

**三个名词经常被混用，其实说的是一件事的三个侧面：**

| 名词 | 强调什么 | 层数 |
|---|---|---|
| **分层架构**（Layered） | 代码按职责分几层 | 3~4 层 |
| **洋葱架构**（Onion） | **依赖方向向内**，领域在中心 | 4 层（Domain 在最里） |
| **整洁架构**（Clean） | 同上，用例（Use Case）显式成层 | 4~5 层 |
| **六边形架构**（Hexagonal） | 端口与适配器，强调"内外对称" | 内外两圈 |

**它们的关系（一句话）：**

> **洋葱、整洁、六边形是同一个思想的三个流派：把业务放中间，把技术放外面，让依赖只指向里面。**

```
        ┌─────────────────────────────────────┐
        │  表现层 / 适配器（Web、Console、MQ）   │  ← 最外层，什么都能引
        │   ┌───────────────────────────────┐  │
        │   │  基础设施（EF Core、Redis）     │  │  ← 实现内层定义的接口
        │   │   ┌─────────────────────────┐  │  │
        │   │   │  应用层（用例编排）       │  │  │  ← 只依赖 Domain
        │   │   │   ┌───────────────────┐  │  │  │
        │   │   │   │  领域层（纯业务）  │  │  │  │  ← 零依赖
        │   │   │   └───────────────────┘  │  │  │
        │   │   └─────────────────────────┘  │  │
        │   └───────────────────────────────┘  │
        └─────────────────────────────────────┘
               依赖方向：只能从外指向内 ↙
```

## 对你的实际意义

**分层对你游戏服务端的价值，和 Web 后端一样，甚至更直接。**

| 你的游戏 | 分层后长什么样 |
|---|---|
| 战斗公式、伤害计算 | `Game.Domain`（纯 C#，能单测，能脱离服务器跑） |
| 存档、战斗、交易 | `Game.Domain` 的聚合根 |
| MySQL / Redis / 消息队列 | `Game.Infrastructure` |
| "玩家点攻击"这个用例 | `Game.Application`（取角色→调战斗→存档→发事件） |
| WebSocket / HTTP 网关 | `Game.Gateway`（表现层） |

**最实际的收益：战斗公式可以在控制台里跑，不需要起服务器、不需要连数据库。**

```csharp
// 这样一个测试，比"起服务器打一遍"快一万倍
var dmg = new DamageCalculator().Calculate(attacker, defender, skill);
Assert.Equal(120, dmg);
```

**而如果你的伤害计算写在 `CombatController` 里，你永远写不了这个测试。**

## 什么时候其实用不上

### 判据一：项目文件数 < 30 → 别分四层

**四层架构的固定成本：**

| 成本 | 量 |
|---|---|
| 4 个 csproj 文件 | 每个 20 行 |
| 项目间接口 | 仓储接口 + UoW 接口 + 事件接口 ≈ 6 个 |
| 依赖注入注册 | 20 行 |
| **每次改一个功能要动的项目数** | **2~4 个** |

**如果你的项目只有 20 个类，这套东西的"结构感"远超它的价值。**

### 判据二：只有一个开发者，且不会换数据库 → 分两层就够

**最小可行分层：**

```
MyApp.Web       （Controller + Service + DbContext）
MyApp.Domain    （实体 + 值对象 + 规则，零依赖）
```

**这样你已经拿到了 80% 的收益：**
- ✅ 业务逻辑能脱离数据库单测
- ✅ 领域模型不被 EF 污染
- ❌ 没有"换 ORM 只改一层"的能力（但你本来也不会换）

### 判据三：这个模块就是 CRUD → 别给它建聚合，也别为它单独分层

**`Category`、`Publisher` 这种表，直接 `_ctx.Categories.ToListAsync()` 就行。** 分层是为了保护"复杂业务"，不是为了让每个表都有仓储。

### 判据四：你在"学架构"阶段 → 分四层，但别上微服务

**分层是免费的（只是文件位置），微服务不是（要运维）。**

**学习期做单体四层，是最优解。**

---

==一：概念==

## P188 · 1. 什么是洋葱架构（整洁架构）

### 这一节要解决的问题

**"分层"到底是分什么？为什么有的分层是对的，有的是假的？**

### 核心规则只有一条

> **依赖方向必须向内：外层可以依赖内层，内层绝不能依赖外层。**

**为什么这一条就够了：**

| 如果 Domain 依赖 EF Core | 后果 |
|---|---|
| 换 ORM | 改 Domain |
| 单元测试 | 要引用 EF Core 程序集 |
| 复用领域模型（比如放到客户端/游戏端） | 拖一堆数据库依赖 |

| 如果 Domain 零依赖 | 后果 |
|---|---|
| 换 ORM | Domain 一行不改 |
| 单元测试 | `new` 出来就能测 |
| 领域模型可以编译成任何目标 | 甚至能给 Unity/Godot 用 |

### 四层的职责（每一层"允许知道什么"）

| 层 | 名字 | 允许知道 | **不允许知道** |
|---|---|---|---|
| 中心 | **Domain 领域层** | 业务概念、不变式 | 数据库、HTTP、框架、DI 容器 |
| 次内 | **Application 应用层** | Domain + 用例流程 | EF Core、HTTP、具体外部服务 |
| 次外 | **Infrastructure 基础设施层** | EF Core、Redis、MQ、文件系统 | HTTP 请求上下文（严格说） |
| 最外 | **Presentation 表现层** | 一切（组合根） | 业务规则 |

**关键理解：Infrastructure 依赖 Application，不是反过来。**

```
Application 定义接口   IBookRepository
                              ↑ 实现
Infrastructure 提供实现 BookRepository

→ 依赖方向：Infrastructure → Application（向内）✔
```

**这就是"依赖倒置"（Dependency Inversion）：内层定义接口，外层实现接口。**

### 一个反直觉但很重要的点

**Infrastructure 层"引用"Application，但运行时"被"Application 调用。**

```
编译期依赖：Infrastructure ──引用──> Application
运行期调用：Application ──调用──> Infrastructure（通过接口）

两者方向相反 → 这就是"倒置"
```

**这也解释了为什么 DI 容器必须放在最外层（组合根）：** 只有它同时认识"接口"和"实现"。

### 洋葱 / 整洁 / 六边形 三者对照

| 概念 | 中心是什么 | 层数 | 特点 |
|---|---|---|---|
| **洋葱架构**（Jeffrey Palermo, 2008） | Domain Model | 4 | 以"领域模型"为核 |
| **整洁架构**（Robert C. Martin, 2012） | Entities + Use Cases | 4~5 | 显式分出"用例层" |
| **六边形架构**（Alistair Cockburn, 2005） | Domain | 内外两圈 | 强调"端口/适配器"对称 |
| **本课程的分层** | Domain | 4 | 差不多是洋葱架构的落地版 |

**你不需要纠结用哪个。** 它们唯一的共同要求就是"依赖向内"，剩下的是命名差异。

### 一张"能不能引用"的判定表

| 从 → 到 | Domain | Application | Infrastructure | Web |
|---|---|---|---|---|
| **Domain** | — | ❌ | ❌ | ❌ |
| **Application** | ✅ | — | ❌ | ❌ |
| **Infrastructure** | ✅ | ✅ | — | ❌ |
| **Web** | ✅（透传） | ✅ | ✅ | — |

**注意 `Infrastructure → Web` 是 ❌。** 基础设施层不该知道"HTTP 请求"这回事。

---

## P189 · 2. DDD 实战 · 项目分层

### 这一节要解决的问题

**具体建几个项目、叫什么名、谁引用谁？**

### 目录结构（本篇实测用的真实结构）

```
DddSln/
├── DddSln.sln
└── src/
    ├── Ddd.Domain/                 ← 零依赖
    │   ├── Domain.cs               （实体、值对象、强类型 Id、事件）
    │   ├── IBookRepository.cs      （仓储接口）
    │   ├── IUnitOfWork.cs          （工作单元接口）
    │   └── LendingPolicy.cs        （领域服务）
    │
    ├── Ddd.Application/            ← 只引用 Domain
    │   ├── BookAppService.cs       （应用服务 / 用例）
    │   └── IDomainEventPublisher.cs（事件发布接口）
    │
    ├── Ddd.Infrastructure/         ← 引用 Domain + Application + EF Core
    │   ├── BookShopContext.cs      （DbContext + 映射）
    │   ├── BookRepository.cs
    │   ├── AuthorRepository.cs
    │   ├── UnitOfWork.cs
    │   └── EventPublisher.cs
    │
    └── Ddd.Web/                    ← 引用 Application + Infrastructure（组合根）
        └── Program.cs
```

### 实测的 csproj 引用关系（真实输出）

```
--- src/Ddd.Domain/Ddd.Domain.csproj
（空的，没有 ProjectReference，没有 PackageReference）

--- src/Ddd.Application/Ddd.Application.csproj
"..\Ddd.Domain\Ddd.Domain.csproj"

--- src/Ddd.Infrastructure/Ddd.Infrastructure.csproj
"..\Ddd.Domain\Ddd.Domain.csproj"
"..\Ddd.Application\Ddd.Application.csproj"
"Microsoft.EntityFrameworkCore.Sqlite"

--- src/Ddd.Web/Ddd.Web.csproj
"..\Ddd.Application\Ddd.Application.csproj"
"..\Ddd.Infrastructure\Ddd.Infrastructure.csproj"
```

**画成图：**

```
        Ddd.Web
       ↙       ↘
Ddd.Application  Ddd.Infrastructure
       ↓          ↓        ↓
       └──→ Ddd.Domain ←───┘
                 ↑
           （零依赖，纯 C#）
```

**箭头含义：A → B 表示 A 引用 B。所有箭头最终都指向 Domain。**

### 实测：分层是"编译器强制"的，不是"约定"

**这是本篇最重要的一条。我做了两个故意写错的实验。**

#### 实验 1：在 Domain 里 `using Microsoft.EntityFrameworkCore`

```csharp
// src/Ddd.Domain/EfLeakDemo.cs（故意写的）
using Microsoft.EntityFrameworkCore;   // ← 领域层想用 EF

namespace Ddd.Domain;

public class EfLeakDemo
{
    public DbContext? Ctx { get; set; }
}
```

**编译结果：**

```
error CS0234: 命名空间"Microsoft"中不存在类型或命名空间名"EntityFrameworkCore"
              (是否缺少程序集引用?)
error CS0246: 未能找到类型或命名空间名"DbContext"
              (是否缺少 using 指令或程序集引用?)
```

| 结论 | 说明 |
|---|---|
| **Domain 根本引用不到 EF Core** | 因为它没装那个包，也没引用装了的项目 |
| **想"偷偷依赖"必须先改 csproj** | 而改 csproj 会被代码评审看到 |
| **这是最硬的架构约束** | 比任何"文档约定"都硬 |

> **这就是分层的真正价值：它不是"建议你别这么写"，而是"你写不出来"。**

#### 实验 2：把 `AuthorId` 传给需要 `BookId` 的方法

```csharp
// src/Ddd.Web/WrongIdDemo.cs（故意写的）
await repo.GetAsync(new AuthorId(1));    // GetAsync 的签名是 GetAsync(BookId id)
```

**编译结果：**

```
error CS1503: 参数 1: 无法从"Ddd.Domain.AuthorId"转换为"Ddd.Domain.BookId"
```

**这条放到 P195 讲，但它证明同一件事：类型系统能替你挡住错误。**

### 实测：运行时 Domain 到底引用了哪些程序集

```csharp
var domainAsm = typeof(Book).Assembly;
foreach (var r in domainAsm.GetReferencedAssemblies())
    Console.WriteLine(r.Name);
```

**输出：**

```
=== 一、分层验证：Domain 层的程序集引用 ===
  Ddd.Domain 引用的程序集：
    - System.Collections
    - System.Linq
    - System.Runtime
  是否引用 EF Core：False
  结论：✔ 领域层完全不知道自己会被 EF Core 持久化
  Ddd.Application 是否引用 EF Core：False
  Ddd.Infrastructure 是否引用 EF Core：True
```

| 层 | 引用 EF Core |
|---|---|
| `Ddd.Domain` | **False**（只有 3 个 System 程序集） |
| `Ddd.Application` | **False** |
| `Ddd.Infrastructure` | **True** |

> **`Domain` 只有 3 个 System 程序集引用 —— 这就是"纯业务"的物理证据。**
>
> 它不知道什么叫数据库、什么叫 HTTP、什么叫依赖注入。它只是一堆有规则的 C# 类。

### 每个项目里放什么（清单）

| 项目 | 放 | 不放 |
|---|---|---|
| **Domain** | 实体、值对象、强类型 Id、聚合根、领域事件（`record`）、领域服务、仓储接口、UoW 接口 | `[Table]` `[Column]` `[Key]`、`DbContext`、`HttpContext`、`ILogger`、任何 NuGet 包 |
| **Application** | 应用服务（一个方法一个用例）、用例 DTO、外部服务接口（`IEmailSender`） | 业务规则（在 Domain）、EF Core、Controller |
| **Infrastructure** | `DbContext` + 映射配置、仓储实现、UoW 实现、外部服务实现、迁移文件 | 业务规则、HTTP 上下文 |
| **Web** | Controller / 最小 API、Filter、DI 注册（组合根）、`appsettings.json` | 业务规则、直接操作 DbContext |

---

## P190 · 3. DDD 实战 · 领域模型的实现

### 这一节要解决的问题

**Domain 里那些类，具体怎么写？**

### 完整代码（本篇实测跑通的版本）

```csharp
namespace Ddd.Domain;

// ---------- 强类型 Id ----------
public readonly record struct BookId(long Value)
{
    public static BookId From(long v) => new(v);
    public static BookId Empty => default;
    public bool IsEmpty => Value == 0;
    public override string ToString() => Value.ToString();
}

public readonly record struct AuthorId(long Value)
{
    public static AuthorId From(long v) => new(v);
    public override string ToString() => Value.ToString();
}

// ---------- 值对象 ----------
public record Money(decimal Amount, string Currency = "CNY")
{
    public Money Add(Money other) =>
        other.Currency != Currency
            ? throw new InvalidOperationException($"币种不同：{Currency} vs {other.Currency}")
            : this with { Amount = Amount + other.Amount };

    public override string ToString() => $"{Amount:0.00} {Currency}";
}

// ---------- 领域事件 ----------
public record BookBorrowedEvent(BookId BookId, int Count, DateTime OccurredAt);

// ---------- 聚合根 ----------
public class Book
{
    public BookId Id { get; private set; }
    public string Title { get; private set; } = "";
    public Money Price { get; private set; } = new(0m, "CNY");
    public int Stock { get; private set; }
    public AuthorId AuthorId { get; private set; }

    private readonly List<object> _events = new();
    public int EventCount => _events.Count;
    public IReadOnlyList<object> DequeueEvents()
    {
        var copy = _events.ToList();
        _events.Clear();
        return copy;
    }

    private Book() { }                                  // EF Core 用

    public Book(string title, Money price, int stock, AuthorId authorId)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("书名不能为空");
        if (stock < 0) throw new ArgumentException("库存不能为负");
        if (price.Amount < 0) throw new ArgumentException("价格不能为负");
        if (authorId.Value == 0) throw new ArgumentException("必须指定作者");

        Title = title;
        Price = price;
        Stock = stock;
        AuthorId = authorId;
    }

    public void Deduct(int count)
    {
        if (count <= 0) throw new ArgumentException("数量必须大于 0");
        if (count > Stock) throw new InvalidOperationException($"库存不足（{Stock} < {count}）");
        Stock -= count;
        _events.Add(new BookBorrowedEvent(Id, count, DateTime.Now));
    }
}
```

### 三个值得注意的设计决策

#### 决策 1：`Id` 是强类型，但 `private set` 依然能用

```csharp
public BookId Id { get; private set; }
```

**EF Core 物化时怎么给它赋值？** 靠 P176 讲过的机制：直接写 backing field，不走 setter。**实测通过（下面 P195 有数据）。**

#### 决策 2：`_events` 用 `List<object>`，不用泛型约束

```csharp
private readonly List<object> _events = new();
```

**为什么不用 `List<IDomainEvent>`？**

| 方案 | 优点 | 缺点 |
|---|---|---|
| `List<object>` | 零依赖，Domain 不用引入任何接口 | 类型不安全（其实还好） |
| `List<IDomainEvent>` | 有约束 | Domain 要定义 `IDomainEvent` 接口（多一个东西） |
| 每个事件一个字段 | 简单 | 加事件要改类 |

**小项目用 `object` 完全够。** 想更严格就加个 `IDomainEvent` 标记接口——都在 Domain 内部，不违反依赖规则。

#### 决策 3：校验放在构造函数和领域方法里，**不放在属性 setter**

```csharp
// ❌ 不要这样
public int Stock
{
    get => _stock;
    set { if (value < 0) throw ...; _stock = value; }   // EF 物化时也会走 setter → 遇到脏数据直接炸
}

// ✅ 这样
public int Stock { get; private set; }
public void Deduct(int n) { if (n > Stock) throw ...; Stock -= n; }
```

| 为什么 | 说明 |
|---|---|
| setter 校验会在**读库时**也执行 | 库里有一条 `Stock = -1` 的脏数据 → 整个查询抛异常（批次 22 实测过构造函数校验也拦不住原生 SQL，但 setter 校验更糟） |
| 校验应该在"改"的时候做 | 而不是"赋值"的时候 |

### Domain 里不能出现的四类东西

| 不能出现 | 为什么 | 替代 |
|---|---|---|
| `[Table]` / `[Column]` / `[Key]` | 数据库细节 | 映射写在 Infrastructure 的 `OnModelCreating` |
| `using Microsoft.EntityFrameworkCore` | 依赖外层 | 编译期就做不到（实测 CS0234） |
| `ILogger<T>` | 基础设施关注点 | 领域事件 + 外层记录 |
| `HttpContext` / `IActionResult` | 表现层 | 应用层转成 DTO |

> **注意最后一条：领域方法不返回 `IActionResult`，也不返回带 HTTP 状态码的对象。**
>
> **它要么返回值/结果对象，要么抛异常。HTTP 是外层的事。**

---

## P191 · 4. DDD 实战 · 领域服务的实现

### 这一节要解决的问题

**"这条规则同时依赖两个聚合"——代码长什么样？**

### 本篇的领域服务

```csharp
namespace Ddd.Domain;

public class LendingPolicy
{
    private readonly IAuthorRepository _authors;

    public LendingPolicy(IAuthorRepository authors) => _authors = authors;

    public async Task<(bool ok, string? reason)> CheckAsync(Book book, CancellationToken ct = default)
    {
        var author = await _authors.GetAsync(book.AuthorId, ct);
        if (author is null) return (false, "作者不存在");
        if (string.IsNullOrWhiteSpace(author.Name)) return (false, "作者信息不完整");
        return (true, null);
    }
}
```

### 三个设计细节

#### 细节 1：它依赖的是**仓储接口**，不是 `DbContext`

```csharp
private readonly IAuthorRepository _authors;   // ✅ 接口在 Domain
```

**如果写成 `BookShopContext`：**

```csharp
private readonly BookShopContext _ctx;   // ❌ 编译不过（Domain 引用不到 EF）
```

**所以"依赖倒置"在分层架构里是自动的** —— 你想违反都做不到。

#### 细节 2：它返回结果，不抛异常

```csharp
public async Task<(bool ok, string? reason)> CheckAsync(...)
```

| 风格 | 适用 |
|---|---|
| 返回 `(bool, reason)` | "这条规则可能不通过，且不通过是正常业务情况" |
| 抛领域异常 | "这条规则被违反说明调用方写错了" |

**`LendingPolicy` 属于前者**（借书被拒是正常业务）；**`Book.Deduct(999)` 属于后者**（调用方没先检查）。

#### 细节 3：它没有状态

```csharp
public class LendingPolicy      // 只有只读字段，没有可变状态
{
    private readonly IAuthorRepository _authors;
}
```

**领域服务必须无状态。** 如果它有状态，说明"状态该放在聚合里"。

### 领域服务 vs 应用服务：代码对比

```csharp
// ---------- 领域服务：业务判断 ----------
public class LendingPolicy
{
    public async Task<(bool ok, string? reason)> CheckAsync(Book book, ...)
    {
        // 只判断，不改状态，不管事务，不管日志
    }
}

// ---------- 应用服务：编排 ----------
public class BookAppService
{
    public async Task<(bool ok, string? reason)> LendAsync(BookId id, int count, ...)
    {
        var book = await _books.GetAsync(id, ct);       // ① 取
        if (book is null) return (false, "图书不存在");

        var check = await _policy.CheckAsync(book, ct); // ② 领域服务
        if (!check.ok) return (false, check.reason);

        book.Deduct(count);                             // ③ 聚合根
        await _uow.SaveChangesAsync(ct);                // ④ 事务
        foreach (var e in book.DequeueEvents())         // ⑤ 事件
            await _publisher.PublishAsync(e, ct);

        return (true, null);
    }
}
```

**一眼能看出区别：领域服务里没有一个技术名词，应用服务里全是技术动作。**

---

## P192 · 5. DDD 实战 · 基础设施的实现

### 这一节要解决的问题

**`DbContext`、映射、仓储，具体怎么写？**

### DbContext + 映射（本篇实测版本）

```csharp
using Ddd.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ddd.Infrastructure;

public class BookShopContext : DbContext
{
    private readonly string _path;
    public BookShopContext(string path) => _path = path;

    public DbSet<Book> Books => Set<Book>();
    public DbSet<Author> Authors => Set<Author>();

    protected override void OnConfiguring(DbContextOptionsBuilder o)
        => o.UseSqlite($"Data Source={_path}");

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Book>(e =>
        {
            e.ToTable("Books");

            // ---------- 强类型 Id 的映射 ----------
            e.HasKey(x => x.Id);
            e.Property(x => x.Id)
             .HasConversion(id => id.Value, v => new BookId(v))   // BookId <-> long
             .ValueGeneratedOnAdd();                             // 仍然自增

            e.Property(x => x.AuthorId)
             .HasConversion(id => id.Value, v => new AuthorId(v)); // 强类型外键

            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Title).IsUnique();

            // ---------- 值对象 ----------
            e.ComplexProperty(x => x.Price, p =>
            {
                p.Property(m => m.Amount).HasColumnName("Price_Amount").HasPrecision(18, 2);
                p.Property(m => m.Currency).HasColumnName("Price_Currency").HasMaxLength(3);
            });

            e.Ignore(x => x.EventCount);          // 事件数量不是数据库字段
        });

        b.Entity<Author>(e =>
        {
            e.ToTable("Authors");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasConversion(id => id.Value, v => new AuthorId(v)).ValueGeneratedOnAdd();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
        });
    }
}
```

### 逐行拆解：`HasConversion`

```csharp
e.Property(x => x.Id)
 .HasConversion(id => id.Value, v => new BookId(v))
```

| 部分 | 类型 | 作用 |
|---|---|---|
| `HasConversion(...)` | 扩展方法 | 声明"这个属性的 C# 类型 ≠ 数据库类型" |
| `id => id.Value` | `Expression<Func<BookId, long>>` | **写库**：`BookId` → `long` |
| `v => new BookId(v)` | `Expression<Func<long, BookId>>` | **读库**：`long` → `BookId` |

**注意它是 `Expression` 不是 `Func`** —— 所以 EF 能分析它（跟 P180 的表达式树一个原理）。

### 逐行拆解：`ValueGeneratedOnAdd`

```csharp
.ValueGeneratedOnAdd();
```

| 作用 | 不加会怎样 |
|---|---|
| 告诉 EF"这个值由数据库生成" | EF 会把你传的 `BookId(0)` 当成真实主键写进去 → 所有行都是 0 |

**实测证明它生效了：**

```
插入两本书：Id1 = 1（Value=1），Id2 = 2（Value=2）
→ 自增主键配合 ValueConverter 依然生效（ValueGeneratedOnAdd）
```

### 仓储实现（关键：**不 SaveChanges**）

```csharp
public class BookRepository : IBookRepository
{
    private readonly BookShopContext _ctx;
    public BookRepository(BookShopContext ctx) => _ctx = ctx;

    public Task<Book?> GetAsync(BookId id, CancellationToken ct = default)
        => _ctx.Books.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(Book book, CancellationToken ct = default)
        => await _ctx.Books.AddAsync(book, ct);

    public async Task<IReadOnlyList<Book>> ListAsync(CancellationToken ct = default)
        => await _ctx.Books.OrderBy(x => x.Id).ToListAsync(ct);
}
```

**三个设计点：**

| 点 | 说明 |
|---|---|
| **没有 `SaveChanges`** | 保存是工作单元的职责（P193 实测为什么） |
| **没有 `UpdateAsync`** | 跟踪查询后改属性，`SaveChanges` 自动生成 UPDATE |
| **没有 `IQueryable` 返回值** | 返回 `IReadOnlyList`，防止调用方在仓储外面拼查询 |

**最后一条经常被忽略：**

```csharp
// ❌ 返回 IQueryable → 应用层可以随意拼 SQL 语义
public IQueryable<Book> Query() => _ctx.Books;
// 调用方：repo.Query().Where(x => x.Title.Contains("a")).Skip(100000)  // 谁都能拼

// ✅ 返回具体集合 / 明确的方法
public Task<IReadOnlyList<Book>> ListByAuthorAsync(AuthorId id, ...);
```

> **仓储一旦返回 `IQueryable`，它就不是仓储了，是一个 `DbContext` 的马甲。**

### 映射配置该写在哪：三个选择

| 方式 | 代码 | 适用 |
|---|---|---|
| **`OnModelCreating` 里内联** | 上面那样 | 小项目，实体少 |
| `IEntityTypeConfiguration<T>` 分文件 | `class BookConfig : IEntityTypeConfiguration<Book>` | **推荐**（实体多了以后） |
| 特性标注在实体上 | `[Table]` `[Column]` | ❌ 污染 Domain（分层架构里禁止） |

**分文件的写法：**

```csharp
public class BookConfig : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> e) { /* 同上 */ }
}

// OnModelCreating 里
b.ApplyConfigurationsFromAssembly(typeof(BookShopContext).Assembly);
```

| 好处 | 说明 |
|---|---|
| 每个实体一个文件 | 500 行的 `OnModelCreating` 会变成灾难 |
| 自动扫描 | `ApplyConfigurationsFromAssembly` 一句搞定 |

---

## P193 · 6. DDD 实战 · 工作单元的实现

### 这一节要解决的问题

**`IUnitOfWork` 到底要不要写？它和 `DbContext` 什么关系？**

### 最诚实的答案

> **`DbContext` 本身就是一个完整的工作单元。`IUnitOfWork` 只是一层"接口包装"，价值在于"让应用层不认识 EF Core"。**

**实测证明应用层确实不认识 EF Core：**

```
Ddd.Application 是否引用 EF Core：False
```

**所以 `IUnitOfWork` 的唯一作用是：让 `BookAppService` 里可以写 `await _uow.SaveChangesAsync()` 而不需要 `using Microsoft.EntityFrameworkCore`。**

### 实现

```csharp
// Domain 里定义接口
namespace Ddd.Domain;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

// Infrastructure 里实现
namespace Ddd.Infrastructure;

public class UnitOfWork : IUnitOfWork
{
    private readonly BookShopContext _ctx;
    public UnitOfWork(BookShopContext ctx) => _ctx = ctx;

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _ctx.SaveChangesAsync(ct);
}
```

**就这么几行。** 它的价值不在代码，在"依赖方向"。

### 实测：工作单元到底解决了什么

**我做了两个对照实验，用"同名图书的唯一索引冲突"制造失败。**

#### 反例：两个仓储各自 `SaveChanges`（两个独立事务）

```csharp
var a = new Book("工作单元A", new Money(10m), 1, authorId);
await books.AddAsync(a);
await ctx.SaveChangesAsync();                    // ① 第一次提交

var b = new Book("工作单元A", new Money(20m), 1, authorId);   // 同书名 → 唯一索引冲突
await books.AddAsync(b);
try { await ctx.SaveChangesAsync(); }            // ② 第二次提交失败
catch (Exception ex) { ... }
```

**实测输出：**

```
反例 · 两个仓储各自 SaveChanges（两个独立事务）
  ① 提交成功，《工作单元A》已进库
  ② 失败：SQLite Error 19: 'UNIQUE constraint failed: Books.Title'.
  库里《工作单元A》有 1 本 → ①已提交无法回滚，数据处于「半成功」状态
```

| 结果 | 说明 |
|---|---|
| ① 成功 | 第一本书进库了 |
| ② 失败 | 第二本没进 |
| **库里 1 本** | **数据处于"半成功"状态** |

**这就是最典型的"部分成功"：一个用例应该"要么都成、要么都不成"，结果成了半个。**

#### 正例：一次 `SaveChanges`（一个事务）

```csharp
await books.AddAsync(new Book("工作单元B", new Money(10m), 1, authorId));
await books.AddAsync(new Book("工作单元B", new Money(20m), 1, authorId));  // 同批冲突
try { await uow.SaveChangesAsync(); }            // 一次提交，包含两条
catch (Exception ex) { ... }
```

**实测输出：**

```
正例 · 一次 SaveChanges（一个事务，要么全成功要么全失败）
  失败：SQLite Error 19: 'UNIQUE constraint failed: Books.Title'.
  库里《工作单元B》有 0 本 → 一个事务，一条都没进（干净回滚）
```

| 结果 | 说明 |
|---|---|
| 两条一起提交 | 同一个事务 |
| 冲突 → 全回滚 | **库里 0 本** |
| 数据一致 | 干净 |

### 由此得出的三条规则

| 规则 | 原因 |
|---|---|
| **一个用例只调一次 `SaveChanges`** | 多次调用 = 多个事务 = 可能部分成功 |
| **仓储绝不自己 `SaveChanges`** | 否则你无法控制事务边界 |
| **不跟踪的查询（`AsNoTracking`）不能用于写操作** | 改了不会保存（批次 22 实测） |

### `IUnitOfWork` 要不要暴露事务控制

**有些实现会加：**

```csharp
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}
```

| 什么时候需要 | 说明 |
|---|---|
| 一个用例跨多个 `SaveChanges` | 少见（说明用例划分有问题） |
| 需要显式隔离级别 | `BeginTransaction(IsolationLevel.Serializable)` |
| 需要"先查库确认再提交" | 可以用，但注意锁 |

**大多数情况下：不需要。** `SaveChanges` 自带隐式事务（批次 21/23 实测过），够用了。

---

## P194 · 7. DDD 实战 · 应用层的实现

### 这一节要解决的问题

**应用服务的代码到底长什么样？它和 Controller 怎么分工？**

### 一个用例 = 一个方法

```csharp
namespace Ddd.Application;

public class BookAppService
{
    private readonly IBookRepository _books;
    private readonly IUnitOfWork _uow;
    private readonly LendingPolicy _policy;
    private readonly IDomainEventPublisher _publisher;

    public BookAppService(IBookRepository books, IUnitOfWork uow,
                          LendingPolicy policy, IDomainEventPublisher publisher)
        => (_books, _uow, _policy, _publisher) = (books, uow, policy, publisher);

    // ---------- 用例 1：新增图书 ----------
    public async Task<BookId> CreateAsync(string title, decimal price, int stock,
                                          AuthorId authorId, CancellationToken ct = default)
    {
        var book = new Book(title, new Money(price), stock, authorId);
        await _books.AddAsync(book, ct);
        await _uow.SaveChangesAsync(ct);
        return book.Id;
    }

    // ---------- 用例 2：借出 ----------
    public async Task<(bool ok, string? reason)> LendAsync(BookId id, int count,
                                                          CancellationToken ct = default)
    {
        var book = await _books.GetAsync(id, ct);
        if (book is null) return (false, "图书不存在");

        // 跨聚合规则 → 领域服务
        var check = await _policy.CheckAsync(book, ct);
        if (!check.ok) return (false, check.reason);

        // 聚合内规则 → 聚合根（领域异常 → 应用层结果）
        try { book.Deduct(count); }
        catch (InvalidOperationException ex) { return (false, ex.Message); }

        await _uow.SaveChangesAsync(ct);              // 事务边界

        // 提交之后再派发
        foreach (var e in book.DequeueEvents())
            await _publisher.PublishAsync(e, ct);

        return (true, null);
    }
}
```

**实测输出：**

```
=== 五、应用服务的完整用例（借书）===
  目标：《呐喊》库存 5
  借 2 本 → ok=True，事件发布器收到 1 条
    【事件】BookBorrowed：BookId=1, Count=2, At=01:12:31
  借 999 本 → ok=False，原因：库存不足（3 < 999）
  现在库存 = 3
```

### 应用服务的五个特征（对照检查你的代码）

| 特征 | 本篇代码 | 违反会怎样 |
|---|---|---|
| 方法名是**用例名** | `CreateAsync` / `LendAsync` | 写成 `UpdateAsync` 说明你在做 CRUD 搬运 |
| **不写业务判断** | 只有一个 `if (book is null)`（技术判断） | 写了 `if (book.Stock > 0)` 就是漏掉了聚合 |
| **负责事务** | 只有一个 `_uow.SaveChangesAsync()` | 多个 = 多个事务 |
| **负责派发事件** | 保存后派发 | 不派发 = 事件永远躺在内存里 |
| **不返回 IActionResult** | 返回 `(bool, reason)` / `BookId` | 返回 HTTP 概念 = 应用层被 Web 绑死 |

### Controller / AppService / DomainService 三层分工（实战判据）

| 你手上这段代码 | 该放哪 |
|---|---|
| `ModelState.IsValid` 判断 | Controller |
| `int page` 参数校验 | Controller 或 Filter |
| `if (book is null) return NotFound()` | Controller（把 `(false, "图书不存在")` 转成 404） |
| `if (book.Stock > 0) book.Stock--` | **`Book.Deduct()`** 里 |
| `if (作者不存在) return fail` | **`LendingPolicy`** 里（跨聚合） |
| `await _ctx.SaveChangesAsync()` | AppService |
| `_logger.LogInformation("借书成功")` | AppService 或 事件 handler |
| `[Authorize]` | Controller |
| `return Ok(dto)` | Controller |

### Controller 该多薄？给个具体标准

```csharp
[HttpPost("{id}/lend")]
public async Task<IActionResult> Lend(long id, int count)
{
    var r = await _app.LendAsync(new BookId(id), count);
    return r.ok ? Ok() : BadRequest(r.reason);
}
```

| 行数 | 判断 |
|---|---|
| **≤ 5 行** | ✅ 健康 |
| 6~15 行 | ⚠️ 有判断逻辑漏到表现层了 |
| > 15 行 | ❌ 业务逻辑在 Controller 里 |

> **这条标准很粗暴，但非常准。** 你的 Controller 超过 15 行的那个方法，里面一定藏着本该在 Domain 的规则。

### 应用层的 DTO 转换

**Domain 对象不该直接返回给前端：**

```csharp
// ❌ 直接把实体序列化返回
return Ok(book);      // 会带出内部字段、触发延迟加载、暴露领域结构

// ✅ 转 DTO
return Ok(new BookDto { Id = book.Id.Value, Title = book.Title, Price = book.Price.Amount });
```

| 为什么 | 说明 |
|---|---|
| 领域模型会变 | 一变就破坏 API 契约 |
| 强类型 Id 序列化是 `{"Value":1}` | 必须转（P195 实测） |
| 可能有循环引用 | 导航属性互相指 |

**转换放哪：**

| 位置 | 适用 |
|---|---|
| AppService 里转 | 简单项目 |
| Web 层（`ToDto()` 扩展） | 应用层保持纯粹 |
| AutoMapper / Mapster | 实体多、字段多 |

---

## P195 · 8. EF Core 中使用强类型 Id

> **本节是收官技术点，也是本篇实测数据最密集的一节。**

### 这一节要解决的问题

**`long bookId, long authorId` —— 你会不会把这两个参数传反？**

### 先看问题

```csharp
public Task<Book?> GetByAuthorAsync(long authorId);     // 你写的方法
public Task<Book?> GetAsync(long bookId);               // 你写的另一个方法

// 三个月后，某个调用点
var book = await repo.GetByAuthorAsync(bookId);         // ← 传错了，编译通过
```

**运行结果：查不到数据，或者查到了别人的数据。** 而且这种 bug 极难发现——**两个都是 `long`，日志里看着都像 ID。**

### 强类型 Id 解决什么

```csharp
public readonly record struct BookId(long Value);
public readonly record struct AuthorId(long Value);

public Task<Book?> GetByAuthorAsync(AuthorId authorId);
public Task<Book?> GetAsync(BookId bookId);

var book = await repo.GetByAuthorAsync(bookId);         // ← 编译失败
```

**实测编译错误：**

```
error CS1503: 参数 1: 无法从"Ddd.Domain.AuthorId"转换为"Ddd.Domain.BookId"
```

**这是本篇第二条编译期证据：类型系统替你挡住了"传错参数"这类 bug。**

### `record struct` 的四个实测行为

```
BookId.From(1) == BookId.From(1) → True
BookId.From(1).Equals(BookId.From(1)) → True
default(BookId).IsEmpty → True（未保存实体的 Id 是 0，跟 long 一样）
```

| 结论 | 说明 |
|---|---|
| `record struct` 默认**按值相等** | 不需要手写 `Equals`/`GetHashCode` |
| 可以做 `Dictionary` 的 key | 哈希一致 |
| **零值 = 未保存** | 跟 `long` 一样有"0 表示还没入库"的约定 |

### 为什么用 `record struct` 而不是 `class`

| 类型 | 内存 | 相等 | 可空 | 推荐 |
|---|---|---|---|---|
| `class BookId` | 堆分配、GC 压力 | 要手写 | 引用可空 | ❌ |
| `record BookId` | 堆分配（引用类型） | 自动 | 引用可空 | ⚠️ 可用但有 GC |
| **`readonly record struct BookId`** | **栈上、零 GC** | **自动** | 值类型（`BookId?` 才有 null） | ✅ **推荐** |

**ID 会被大量创建（每次查询参数、每个实体），所以值类型明显更好。**

### EF Core 映射：`HasConversion` 三个要素

```csharp
e.Property(x => x.Id)
 .HasConversion(id => id.Value, v => new BookId(v))   // ① 转换器
 .ValueGeneratedOnAdd();                             // ② 自增
```

| 要素 | 作用 | 漏了会怎样 |
|---|---|---|
| ① `HasConversion` | `BookId` ↔ `long` | EF 报"无法映射 BookId" |
| ② `ValueGeneratedOnAdd` | 主键由数据库生成 | 所有行主键都是 0（冲突） |
| ③ 外键也要配转换器 | `AuthorId` → `long` | 外键类型映射失败 |

**实测结果：**

```
插入两本书：Id1 = 1（Value=1），Id2 = 2（Value=2）
→ 自增主键配合 ValueConverter 依然生效（ValueGeneratedOnAdd）

GetAsync(BookId(2)) → 找到《彷徨》
```

| 结论 | 说明 |
|---|---|
| 自增主键正常 | `Id1=1, Id2=2` |
| **强类型 Id 查询能翻译成 SQL** | `Where(x => x.Id == id)` → `WHERE Id = 2` |
| 外键 `AuthorId` 也正常 | 一对多关系照常用 |

### 坑一：JSON 序列化会变成 `{"Value":1}`

**实测（这是最容易上线才发现的坑）：**

```
默认序列化：{"Id":{"Value":7,"IsEmpty":false},"Name":"样例"}
加自定义转换器：{"Id":7,"Name":"样例"}
反序列化回来：Id = 7（Value=7）
```

| 现象 | 说明 |
|---|---|
| 默认输出 `{"Value":7,"IsEmpty":false}` | `record struct` 的所有公共属性都被序列化 |
| **前端拿到的 id 不是一个数字** | `data.id` 是对象而不是 `7` |
| 还多了一个 `IsEmpty` | 你算出来的属性也被序列化了 |
| 解法：自定义 `JsonConverter` | 或者用 `[JsonConverter]` 特性标注 |

**转换器（本篇实测版本）：**

```csharp
public class BookIdJsonConverter : JsonConverter<BookId>
{
    public override BookId Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => new(reader.GetInt64());

    public override void Write(Utf8JsonWriter writer, BookId value, JsonSerializerOptions options)
        => writer.WriteNumberValue(value.Value);
}
```

**注册方式（三选一）：**

```csharp
// ① 全局
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new BookIdJsonConverter()));

// ② 只标在某几个属性上
[JsonConverter(typeof(BookIdJsonConverter))]
public BookId Id { get; set; }

// ③ 标在类型上（需要 .NET 7+ 的 [JsonConverter] on type）
[JsonConverter(typeof(BookIdJsonConverter))]
public readonly record struct BookId(long Value);
```

> **推荐 ③：一次标注，所有地方都生效。** 但要写在 Domain 里 → 引入 `System.Text.Json` 的依赖（在 `System.Text.Json` 是 BCL 的一部分，不算污染，可以接受）。

**如果你不想在 Domain 里引 `System.Text.Json`：** 那就在 Application 层做 DTO 转换，`BookDto.Id` 用 `long`。**这其实是更干净的做法**（领域模型不外露）。

### 坑二：`default(BookId)` 和"未保存"的歧义

```csharp
default(BookId).IsEmpty → True
```

| 场景 | 问题 |
|---|---|
| 新建实体，`Id = default` | 和"Id 真的是 0"无法区分 |
| 判空 `if (id == null)` | 值类型永远不为 null（除非 `BookId?`） |

**解法：**

```csharp
// 用显式的 IsEmpty / Empty
if (id.IsEmpty) return (false, "无效的图书 Id");

// 或者接口参数用可空
public Task<Book?> GetAsync(BookId? id, ...)   // 过度设计，不推荐
```

### 坑三：强类型 Id 和 `dynamic` / 反射 / ORM 工具

| 工具 | 问题 |
|---|---|
| Dapper | 要自己写参数转换（`new { Id = id.Value }`） |
| 老版本 AutoMapper | 可能映射不出来（要 `Value` → `Id` 的转换） |
| 数据库迁移工具 | 迁移文件里会写 `long`，正常 |
| Swagger / OpenAPI | 会显示成对象（要配 `MapType`） |

**这些都不致命，但每一个都要单独处理。** 所以：

> **强类型 Id 的代价是"每个边界都要配一次转换"（JSON、Dapper、Swagger、前端类型定义）。**
>
> **收益是"编译期挡住传错参数 + 代码可读性"。**

### 什么时候值得上强类型 Id

| 情况 | 建议 |
|---|---|
| 实体超过 10 个，且外键多 | ✅ 值得（传错参数的概率高） |
| 团队 > 2 人 | ✅ 值得（别人看不出你的 `long` 是什么） |
| 只有 3~5 个实体 | ⚠️ 可上可不上（成本/收益接近） |
| 项目要接 Dapper / 多 ORM | ❌ 配置成本高 |
| 短期项目 / 学习项目 | ❌ 先跑通再说 |

### 四种强类型 Id 实现方式对比

| 方式 | 代码 | 优点 | 缺点 |
|---|---|---|---|
| **`readonly record struct`** | `record struct BookId(long Value)` | 零 GC、自动相等、最简洁 | 每个 Id 一个类型（要写 N 个） |
| `record`（引用类型） | `record BookId(long Value)` | 同上，但是堆分配 | GC 压力 |
| 泛型基类 | `struct Id<T> { long Value; }` + `BookId : Id<Book>` | 少写代码 | 类型系统变绕，EF 映射麻烦 |
| 源码生成器（Source Generator） | 加 `[StronglyTypedId]` 自动生成 | 最省事 | 引第三方库，调试困难 |

**本篇用第一种：最直白，最容易理解。**

```csharp
// N 个 Id 就是一个模板复制 N 次
public readonly record struct BookId(long Value)
{
    public static BookId From(long v) => new(v);
    public static BookId Empty => default;
    public bool IsEmpty => Value == 0;
    public override string ToString() => Value.ToString();
}
```

---

## P196 · 9. 这不是最后一节课

### 这一节要解决的问题

**196 集学完了，然后呢？**

### 先把 196 集串成一张网

**你学过的所有东西，其实是五个同心圆：**

```
                    ┌─────────────────────────────────┐
                    │  ⑤ 架构（能看懂别人的项目）        │
                    │   洋葱 / DDD / 分层 / 微服务       │
                    │  ┌───────────────────────────┐  │
                    │  │  ④ 工程化（能上线）         │  │
                    │  │  DI / 配置 / 日志 / 缓存     │  │
                    │  │  中间件 / Filter / 校验      │  │
                    │  │  认证授权 / SignalR / 发布   │  │
                    │  │  ┌─────────────────────┐  │  │
                    │  │  │  ③ 数据（能存）      │  │  │
                    │  │  │  EF Core 全系列      │  │  │
                    │  │  │  LINQ / IQueryable   │  │  │
                    │  │  │  表达式树 / 并发     │  │  │
                    │  │  │  ┌───────────────┐  │  │  │
                    │  │  │  │ ② Web（能对外）│  │  │  │
                    │  │  │  │ MVC / WebAPI  │  │  │  │
                    │  │  │  │ REST / 状态码 │  │  │  │
                    │  │  │  │ ┌───────────┐ │  │  │  │
                    │  │  │  │ │① C#（能写）│ │  │  │  │
                    │  │  │  │ │ 异步/LINQ  │ │  │  │  │
                    │  │  │  │ │ 泛型/委托  │ │  │  │  │
                    │  │  │  │ │ record/语法│ │  │  │  │
                    │  │  │  │ └───────────┘ │  │  │  │
                    │  │  │  └───────────────┘ │  │  │  │
                    │  │  └─────────────────────┘  │  │
                    │  └───────────────────────────┘  │
                    └─────────────────────────────────┘
```

**五个圆的关系：**

| 层 | 如果这层不牢 | 表现 |
|---|---|---|
| ① C# | 上层全是"抄来的代码" | 看不懂为什么这么写 |
| ② Web | 能跑但接口设计混乱 | 前端天天问你返回什么 |
| ③ 数据 | 性能问题、数据不一致 | 表越加越多、查询越来越慢 |
| ④ 工程化 | 本地能跑，线上就炸 | 出问题查不到原因 |
| ⑤ 架构 | 能写，但改不动 | 加个需求要动 8 个文件 |

### 把 196 集映射到你手上的笔记

| 阶段 | 集数 | 对应笔记 |
|---|---|---|
| **Part1/Part2 地基** | P1–P49 | `异步编程`系列、`依赖注入`系列（DI 概念/生命周期/注册/容器/服务定位器/综合案例 1~3）、`配置系统`系列、`日志系统`系列 |
| **① EF Core 深水区** | P50–P101 | `EFCore` 系列（迁移、关系映射、IQueryable、分页与原生 SQL、实体状态跟踪、批量操作、并发控制）、`表达式树`、`C#新语法` |
| **② Web API 与工程化** | P102–P143 | `Web项目骨架与MVC`、`WebAPI与REST`、`REST落地四件事`、`前后端分离实战`、`Web中的DI与缓存入门`、`缓存三大问题`、`配置集成与机密`、`多层项目结构与EFCore集成`、`Filter全解`、`中间件全解` |
| **③ 认证授权与实时通信** | P144–P165 | `标识框架与JWT基础`、`JWT撤回与托管服务与校验`、`SignalR全解`、（P165 发布：**待补**） |
| **④ 架构与 DDD** | P166–P194 | `DDD概念与领域模型`、`DDD三件套`、`充血模型与值对象落地`、`领域事件落地与消息队列`、`洋葱架构与DDD实战`（本篇） |
| **⑤ 收尾** | P195–P196 | 强类型 Id（本篇 P195）、本篇 P196 |

### 你现在能做什么（客观位置）

**这不是安慰，是清单。**

| 能力 | 能不能 |
|---|---|
| 从零建一个 ASP.NET Core Web API 项目 | ✅ |
| 设计数据库表 + EF Core 迁移 | ✅ |
| 写符合 REST 的接口（状态码/分页/筛选/错误格式） | ✅ |
| 做登录鉴权（JWT + 刷新 + 撤回） | ✅ |
| 加缓存（内存 + 分布式 + 三大问题防护） | ✅ |
| 写中间件 / Filter / 自定义校验 | ✅ |
| 实时推送（SignalR + 认证 + 多实例） | ✅ |
| 看懂一个 DDD 项目的目录结构 | ✅ |
| 写充血模型 + 值对象 + 聚合并用 EF Core 落地 | ✅ |
| 用领域事件解耦 + outbox 保证不丢 | ✅ |
| 部署到服务器 | ⚠️ **只差 P165** |
| 性能调优（索引、分页、N+1、缓存穿透） | ✅ 知道原理，缺实战 |
| 高并发 / 分布式事务 | ⚠️ 知道概念，没做过 |
| 微服务拆分 | ⚠️ 知道判据，没实操 |

### 接下来三条路，选一条

#### 路 A：立刻做项目（推荐给现在的你）

**理由：你现在缺的不是知识，是"把知识串起来用过一次"的经验。**

| 项目 | 难度 | 能覆盖哪些知识 |
|---|---|---|
| 给 DesktopPet 加真实后端 | ⭐ | DI、配置、日志、EF Core、WebAPI、SignalR（聊天） |
| 图书管理系统做完（补登录 + 分页 + 缓存 + 部署） | ⭐⭐ | 全链路，尤其 P165 发布 |
| 自己的游戏服务端 | ⭐⭐⭐ | 全部 + 性能 + 实时 |
| 一个小型 SaaS（多人协作的某个工具） | ⭐⭐⭐⭐ | 全部 + 多租户 + 权限 |

**建议：先做完图书管理系统（补 P165 发布），再做 DesktopPet 后端。** 前者已经有代码基础，成本最低；后者是你的兴趣所在，能撑住你走远。

#### 路 B：深入某个方向

| 方向 | 该补什么 | 适合谁 |
|---|---|---|
| **性能 / 高并发** | 压测（JMeter/k6）、索引优化、Redis 实战、消息队列 | 想做后端专家 |
| **云原生** | Docker、K8s、CI/CD、可观测性 | 想去大厂 |
| **前端 + 全栈** | React/Vue 深入、TS | 想独立做产品 |
| **游戏后端** | 帧同步、状态同步、匹配、反外挂 | **你的目标** |
| **架构** | 微服务实操、事件驱动、CQRS | 想走架构师 |

**对你的建议：路 A + 「游戏后端」这一条。**

**理由很直接：** 你的终极目标是独立游戏开发。**后端知识对你的价值不是"找一份后端工作"，是"能做出联机游戏"。** 所以不用去追"高并发/微服务"这些大厂技能树，够用就行。

#### 路 C：停下来，先不学新技术

**这条最不被推荐，但对某些人最对。**

**判据：如果你现在"学得很快但做不出东西"，问题不在技术栈，在缺少"完成一件事"的经验。**

**"完成"和"学会"是两种能力。** 学完 196 集说明你能学会；做完一个能给别人用的东西，才说明你能完成。

> **给意义驱动型的你一句实话：** 你不需要再学一个新框架来证明自己。你需要的是让某个东西真的跑起来，有人用，然后被骂，然后改。

### 关于 P165「程序发布」——那个我留着没做的

**这不是遗漏，是刻意的。** 因为发布这件事：

| 特点 | 说明 |
|---|---|
| 80% 是环境相关 | IIS / Nginx / Docker / systemd，你选哪个决定怎么讲 |
| 20% 是通用原则 | 配置分离、健康检查、日志落盘、回滚 |
| **没有真实服务器，讲完就忘** | 纸上谈兵 |

**所以等你真要上线那天，跟我说一声，我按你的实际环境（Windows Server / Linux / Docker / 云平台）单独写一篇。** 那时候讲一遍你就会了，现在讲只是消耗注意力。

### 最后：这套笔记怎么用

| 场景 | 怎么查 |
|---|---|
| 忘了某个 API 怎么写 | 每篇的 `==二：格式==` 段（模板 + 速查表） |
| 遇到某个报错 | 每篇最后的「现象 → 原因 → 解法」表 |
| 想快速回忆一个概念 | 每篇的 `==四：总结==` 段（口诀 + 决策图） |
| 要动手写 | `==三：代码==` 段（可运行完整示例） |
| 想搞清"为什么要这个" | `==零：补充==` 段 |

**这五段的结构是刻意的：**

```
零 = 为什么（决定要不要学）
一 = 是什么（建立概念）
二 = 怎么查（速查）
三 = 怎么写（动手）
四 = 记住什么（复习）
```

> **196 集结束了，但 `ASP.NET Core--后端学习方案.md` 里 P165 还挂着一条。**
>
> **一年后你回头看这套笔记，如果 `==零：补充==` 那段让你觉得"当时想得挺清楚"，那这套东西就没白写。**

---

==二：格式==

## 1. 四层项目模板

```
Solution/
├── src/
│   ├── Xxx.Domain/                 # 零依赖
│   │   ├── Entities/               # 实体、聚合根
│   │   ├── ValueObjects/           # 值对象
│   │   ├── Ids/                    # 强类型 Id
│   │   ├── Events/                 # 领域事件（record）
│   │   ├── Services/               # 领域服务
│   │   └── Abstractions/           # 仓储接口、UoW 接口
│   │
│   ├── Xxx.Application/            # 只引用 Domain
│   │   ├── Services/               # 应用服务（一个用例一个方法）
│   │   ├── Dtos/                   # 用例输入输出
│   │   └── Abstractions/           # 外部服务接口（IEmailSender…）
│   │
│   ├── Xxx.Infrastructure/         # 引用 Domain + Application + 技术包
│   │   ├── Persistence/
│   │   │   ├── XxxContext.cs
│   │   │   ├── Configurations/     # IEntityTypeConfiguration
│   │   │   └── Migrations/
│   │   ├── Repositories/
│   │   ├── UnitOfWork/
│   │   └── External/               # 邮件、支付、MQ 实现
│   │
│   └── Xxx.Web/                    # 引用 Application + Infrastructure
│       ├── Controllers/ 或 Endpoints/
│       ├── Program.cs              # 组合根
│       └── appsettings.json
└── tests/
    ├── Xxx.Domain.Tests/           # 不引用 Infrastructure（业务规则测试）
    └── Xxx.Integration.Tests/      # 引用全部（接口级测试）
```

## 2. csproj 引用速查

| 项目 | ProjectReference | PackageReference |
|---|---|---|
| `Xxx.Domain` | **（无）** | **（无）** |
| `Xxx.Application` | Domain | 可以引 `MediatR`、`FluentValidation` 等纯逻辑库 |
| `Xxx.Infrastructure` | Domain + Application | `Microsoft.EntityFrameworkCore.*`、`StackExchange.Redis`、`RabbitMQ.Client` |
| `Xxx.Web` | Application + Infrastructure | `Swashbuckle`、`Serilog.AspNetCore` |

**命令：**

```bash
dotnet new classlib -o src/Xxx.Domain
dotnet new classlib -o src/Xxx.Application
dotnet new classlib -o src/Xxx.Infrastructure
dotnet new web -o src/Xxx.Web

dotnet add src/Xxx.Application reference src/Xxx.Domain
dotnet add src/Xxx.Infrastructure reference src/Xxx.Domain src/Xxx.Application
dotnet add src/Xxx.Web reference src/Xxx.Application src/Xxx.Infrastructure
dotnet add src/Xxx.Infrastructure package Microsoft.EntityFrameworkCore.SqlServer
```

## 3. 强类型 Id 三件套

```csharp
// ---------- ① 定义（Domain） ----------
public readonly record struct BookId(long Value)
{
    public static BookId From(long v) => new(v);
    public static BookId Empty => default;
    public bool IsEmpty => Value == 0;
    public override string ToString() => Value.ToString();
}

// ---------- ② EF 映射（Infrastructure） ----------
e.Property(x => x.Id)
 .HasConversion(id => id.Value, v => new BookId(v))
 .ValueGeneratedOnAdd();

e.Property(x => x.AuthorId)
 .HasConversion(id => id.Value, v => new AuthorId(v));      // 外键同样要配

// ---------- ③ JSON 转换器 ----------
public class BookIdJsonConverter : JsonConverter<BookId>
{
    public override BookId Read(ref Utf8JsonReader r, Type t, JsonSerializerOptions o) => new(r.GetInt64());
    public override void Write(Utf8JsonWriter w, BookId v, JsonSerializerOptions o) => w.WriteNumberValue(v.Value);
}

// ---------- ④ 查询与相等 ----------
var book = await repo.GetAsync(BookId.From(2));     // 能翻译成 SQL
if (BookId.From(1) == BookId.From(1)) { }           // True（record struct 自动值相等）
if (id.IsEmpty) return (false, "无效 Id");           // 零值判断
```

## 4. 工作单元模板

```csharp
// Domain
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

// Infrastructure
public class UnitOfWork : IUnitOfWork
{
    private readonly ShopContext _ctx;
    public UnitOfWork(ShopContext ctx) => _ctx = ctx;
    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _ctx.SaveChangesAsync(ct);
}
```

**三条使用纪律：**

| 纪律 | 原因 |
|---|---|
| 一个用例只调一次 | 多次 = 多个事务 = 可能部分成功 |
| 仓储里不调 | 否则无法控制边界 |
| 派发事件在提交之后 | 提交前 Id=0、数据没落库 |

## 5. 应用服务模板

```csharp
public class XxxAppService
{
    private readonly IXxxRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly XxxPolicy _policy;              // 领域服务（可选）
    private readonly IDomainEventPublisher _events;

    public Task<Result> DoSomethingAsync(XxxId id, ...)
    {
        // ① 取聚合
        // ② 调领域服务（跨聚合规则）
        // ③ 调聚合根（聚合内规则）
        // ④ 提交工作单元
        // ⑤ 派发事件
        // ⑥ 返回结果（不是 IActionResult）
    }
}
```

## 6. 报错 → 原因 → 解法

| 报错 / 现象 | 原因 | 解法 |
|---|---|---|
| `CS0234: 命名空间"Microsoft"中不存在"EntityFrameworkCore"` | 领域层想用 EF（分层正确！） | 把这段逻辑移到 Infrastructure |
| `CS1503: 无法从 AuthorId 转换为 BookId` | 强类型 Id 传错 | **这是好事**，改成正确的 Id |
| `The property 'Xxx.Id' could not be mapped` | 强类型 Id 没配转换器 | `HasConversion` |
| 所有新行主键都是 0 | 强类型 Id 没配 `ValueGeneratedOnAdd` | 加上 |
| 前端拿到 `{"id":{"value":1}}` | 强类型 Id 默认序列化 | 加 `JsonConverter` 或转 DTO |
| `DefaultIfEmpty` 报错 / `Cannot translate` | 仓储返回 `IQueryable`，调用方拼了不可翻译的表达式 | 仓储返回具体集合或明确方法 |
| 改了实体但没保存 | `AsNoTracking` 或关了自动检测 | 用跟踪查询 / 手动 `DetectChanges` |
| 一个用例部分成功 | 多次 `SaveChanges` | 合成一次 |
| 事件 handler 查不到数据 | 在 `SaveChanges` 之前派发 | 移到之后 |
| `StackOverflowException` | handler 里复用同一个 `DbContext` 保存 | 用 `IDbContextFactory` |
| 测试要连数据库 | 业务逻辑在 Service 而不是实体里 | 把规则搬进聚合根 |
| 换个数据库要改一堆代码 | 实体上有 `[Table]`/`[Column]` | 移到 `IEntityTypeConfiguration` |

## 7. 架构自检清单（10 条）

**做完一个模块，用这 10 条过一遍：**

| # | 检查项 | 不通过说明 |
|---|---|---|
| 1 | Domain 项目的 csproj 里有 `PackageReference` 吗？ | 有 → 依赖泄漏 |
| 2 | Domain 里有 `[Table]` / `[Key]` / `[Column]` 吗？ | 有 → 数据库污染领域 |
| 3 | Application 里有 `using Microsoft.EntityFrameworkCore` 吗？ | 有 → 分层破了 |
| 4 | Controller 里有业务判断（`if stock > 0`）吗？ | 有 → 规则漏到表现层 |
| 5 | 一个用例调了几次 `SaveChanges`？ | > 1 → 部分成功风险 |
| 6 | 仓储里有 `SaveChanges` 吗？ | 有 → 事务边界失控 |
| 7 | 仓储返回 `IQueryable` 吗？ | 是 → 仓储变马甲 |
| 8 | 领域事件在提交**之后**派发吗？ | 之前 → 幽灵事件 |
| 9 | `Book.Stock` 是 `public set` 吗？ | 是 → 规则可被绕过 |
| 10 | 业务规则能在不连数据库的情况下单测吗？ | 不能 → 分层只做了表面 |

---

==三：代码==

## 1. 完整四层骨架（本篇实测跑通的版本）

**这是 `D:\tmp\DddSln` 的真实结构，可以直接抄。**

### Domain（零依赖）

```csharp
namespace Ddd.Domain;

public readonly record struct BookId(long Value)
{
    public static BookId From(long v) => new(v);
    public static BookId Empty => default;
    public bool IsEmpty => Value == 0;
    public override string ToString() => Value.ToString();
}

public readonly record struct AuthorId(long Value)
{
    public static AuthorId From(long v) => new(v);
    public override string ToString() => Value.ToString();
}

public record Money(decimal Amount, string Currency = "CNY")
{
    public Money Add(Money other) =>
        other.Currency != Currency
            ? throw new InvalidOperationException($"币种不同：{Currency} vs {other.Currency}")
            : this with { Amount = Amount + other.Amount };

    public override string ToString() => $"{Amount:0.00} {Currency}";
}

public record BookBorrowedEvent(BookId BookId, int Count, DateTime OccurredAt);

public class Book
{
    public BookId Id { get; private set; }
    public string Title { get; private set; } = "";
    public Money Price { get; private set; } = new(0m, "CNY");
    public int Stock { get; private set; }
    public AuthorId AuthorId { get; private set; }

    private readonly List<object> _events = new();
    public int EventCount => _events.Count;
    public IReadOnlyList<object> DequeueEvents()
    {
        var copy = _events.ToList();
        _events.Clear();
        return copy;
    }

    private Book() { }

    public Book(string title, Money price, int stock, AuthorId authorId)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("书名不能为空");
        if (stock < 0) throw new ArgumentException("库存不能为负");
        if (price.Amount < 0) throw new ArgumentException("价格不能为负");
        if (authorId.Value == 0) throw new ArgumentException("必须指定作者");
        Title = title; Price = price; Stock = stock; AuthorId = authorId;
    }

    public void Deduct(int count)
    {
        if (count <= 0) throw new ArgumentException("数量必须大于 0");
        if (count > Stock) throw new InvalidOperationException($"库存不足（{Stock} < {count}）");
        Stock -= count;
        _events.Add(new BookBorrowedEvent(Id, count, DateTime.Now));
    }
}

public class Author
{
    public AuthorId Id { get; private set; }
    public string Name { get; private set; } = "";
    private Author() { }
    public Author(string name) => Name = name;
}

public interface IBookRepository
{
    Task<Book?> GetAsync(BookId id, CancellationToken ct = default);
    Task AddAsync(Book book, CancellationToken ct = default);
    Task<IReadOnlyList<Book>> ListAsync(CancellationToken ct = default);
}

public interface IAuthorRepository
{
    Task<Author?> GetAsync(AuthorId id, CancellationToken ct = default);
    Task AddAsync(Author author, CancellationToken ct = default);
}

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public class LendingPolicy
{
    private readonly IAuthorRepository _authors;
    public LendingPolicy(IAuthorRepository authors) => _authors = authors;

    public async Task<(bool ok, string? reason)> CheckAsync(Book book, CancellationToken ct = default)
    {
        var author = await _authors.GetAsync(book.AuthorId, ct);
        if (author is null) return (false, "作者不存在");
        if (string.IsNullOrWhiteSpace(author.Name)) return (false, "作者信息不完整");
        return (true, null);
    }
}
```

### Application（只引用 Domain）

```csharp
using Ddd.Domain;

namespace Ddd.Application;

public interface IDomainEventPublisher
{
    Task PublishAsync(object domainEvent, CancellationToken ct = default);
}

public class BookAppService
{
    private readonly IBookRepository _books;
    private readonly IUnitOfWork _uow;
    private readonly LendingPolicy _policy;
    private readonly IDomainEventPublisher _publisher;

    public BookAppService(IBookRepository books, IUnitOfWork uow,
                          LendingPolicy policy, IDomainEventPublisher publisher)
        => (_books, _uow, _policy, _publisher) = (books, uow, policy, publisher);

    public async Task<BookId> CreateAsync(string title, decimal price, int stock,
                                          AuthorId authorId, CancellationToken ct = default)
    {
        var book = new Book(title, new Money(price), stock, authorId);
        await _books.AddAsync(book, ct);
        await _uow.SaveChangesAsync(ct);
        return book.Id;
    }

    public async Task<(bool ok, string? reason)> LendAsync(BookId id, int count,
                                                          CancellationToken ct = default)
    {
        var book = await _books.GetAsync(id, ct);
        if (book is null) return (false, "图书不存在");

        var check = await _policy.CheckAsync(book, ct);
        if (!check.ok) return (false, check.reason);

        try { book.Deduct(count); }
        catch (InvalidOperationException ex) { return (false, ex.Message); }

        await _uow.SaveChangesAsync(ct);

        foreach (var e in book.DequeueEvents())
            await _publisher.PublishAsync(e, ct);

        return (true, null);
    }
}
```

### Infrastructure（引用 Domain + Application + EF）

```csharp
using Ddd.Application;
using Ddd.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ddd.Infrastructure;

public class BookShopContext : DbContext
{
    private readonly string _path;
    public BookShopContext(string path) => _path = path;

    public DbSet<Book> Books => Set<Book>();
    public DbSet<Author> Authors => Set<Author>();

    protected override void OnConfiguring(DbContextOptionsBuilder o)
        => o.UseSqlite($"Data Source={_path}");

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Book>(e =>
        {
            e.ToTable("Books");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasConversion(id => id.Value, v => new BookId(v)).ValueGeneratedOnAdd();
            e.Property(x => x.AuthorId).HasConversion(id => id.Value, v => new AuthorId(v));
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Title).IsUnique();
            e.ComplexProperty(x => x.Price, p =>
            {
                p.Property(m => m.Amount).HasColumnName("Price_Amount").HasPrecision(18, 2);
                p.Property(m => m.Currency).HasColumnName("Price_Currency").HasMaxLength(3);
            });
            e.Ignore(x => x.EventCount);
        });

        b.Entity<Author>(e =>
        {
            e.ToTable("Authors");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasConversion(id => id.Value, v => new AuthorId(v)).ValueGeneratedOnAdd();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
        });
    }
}

public class BookRepository : IBookRepository
{
    private readonly BookShopContext _ctx;
    public BookRepository(BookShopContext ctx) => _ctx = ctx;

    public Task<Book?> GetAsync(BookId id, CancellationToken ct = default)
        => _ctx.Books.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(Book book, CancellationToken ct = default)
        => await _ctx.Books.AddAsync(book, ct);

    public async Task<IReadOnlyList<Book>> ListAsync(CancellationToken ct = default)
        => await _ctx.Books.OrderBy(x => x.Id).ToListAsync(ct);
}

public class AuthorRepository : IAuthorRepository
{
    private readonly BookShopContext _ctx;
    public AuthorRepository(BookShopContext ctx) => _ctx = ctx;

    public Task<Author?> GetAsync(AuthorId id, CancellationToken ct = default)
        => _ctx.Authors.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(Author author, CancellationToken ct = default)
        => await _ctx.Authors.AddAsync(author, ct);
}

public class UnitOfWork : IUnitOfWork
{
    private readonly BookShopContext _ctx;
    public UnitOfWork(BookShopContext ctx) => _ctx = ctx;
    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _ctx.SaveChangesAsync(ct);
}

public class ConsoleDomainEventPublisher : IDomainEventPublisher
{
    public List<string> Lines { get; } = new();

    public Task PublishAsync(object domainEvent, CancellationToken ct = default)
    {
        if (domainEvent is BookBorrowedEvent e)
            Lines.Add($"【事件】BookBorrowed：BookId={e.BookId.Value}, Count={e.Count}");
        else
            Lines.Add($"【事件】{domainEvent.GetType().Name}");
        return Task.CompletedTask;
    }
}
```

### Web（组合根）

```csharp
using Ddd.Application;
using Ddd.Domain;
using Ddd.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddLogging();
services.AddScoped(_ => new BookShopContext(dbPath));
services.AddScoped<IBookRepository, BookRepository>();
services.AddScoped<IAuthorRepository, AuthorRepository>();
services.AddScoped<IUnitOfWork, UnitOfWork>();
services.AddScoped<LendingPolicy>();
services.AddScoped<IDomainEventPublisher, ConsoleDomainEventPublisher>();
services.AddScoped<BookAppService>();
var sp = services.BuildServiceProvider();
```

**真实 Web 项目里的等价写法：**

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<BookShopContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IBookRepository, BookRepository>();
builder.Services.AddScoped<IAuthorRepository, AuthorRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<LendingPolicy>();
builder.Services.AddScoped<BookAppService>();
builder.Services.AddScoped<IDomainEventPublisher, MediatrEventPublisher>();

var app = builder.Build();

app.MapPost("/books/{id:long}/lend", async (long id, int count, BookAppService svc) =>
{
    var r = await svc.LendAsync(BookId.From(id), count);
    return r.ok ? Results.Ok() : Results.BadRequest(r.reason);
});

app.Run();
```

**注意 Controller / Endpoint 只有 3 行。** 这就是"薄表现层"。

## 2. 强类型 Id 完整实现（4 种写法对比）

```csharp
// ---------- 写法 1：readonly record struct（推荐） ----------
public readonly record struct BookId(long Value)
{
    public static BookId From(long v) => new(v);
    public static BookId Empty => default;
    public bool IsEmpty => Value == 0;
    public override string ToString() => Value.ToString();
}

// ---------- 写法 2：record（引用类型） ----------
public record BookIdRef(long Value)
{
    public static BookIdRef From(long v) => new(v);
}
// 缺点：每次查询参数都堆分配

// ---------- 写法 3：泛型基类 ----------
public readonly record struct Id<T>(long Value);
public readonly record struct BookIdG(long Value) : IComparable<BookIdG>
{
    public int CompareTo(BookIdG other) => Value.CompareTo(other.Value);
}
// 缺点：EF 映射泛型类型麻烦，类型系统绕

// ---------- 写法 4：源码生成器（需第三方库） ----------
// [StronglyTypedId(typeof(long))]
// public partial struct BookId { }
// 优点：一个特性搞定；缺点：引库、调试困难
```

**实测四种写法的相等行为（record struct 与 record 一致）：**

```
BookId.From(1) == BookId.From(1) → True
BookId.From(1).Equals(BookId.From(1)) → True
```

## 3. 本篇实测汇总

**项目：`D:\tmp\DddSln`（net10.0，4 个 csproj，EF Core 10.0.13 + SQLite）**

### 一、分层验证

```
=== 一、分层验证：Domain 层的程序集引用 ===
  Ddd.Domain 引用的程序集：
    - System.Collections
    - System.Linq
    - System.Runtime
  是否引用 EF Core：False
  结论：✔ 领域层完全不知道自己会被 EF Core 持久化
  Ddd.Application 是否引用 EF Core：False
  Ddd.Infrastructure 是否引用 EF Core：True
```

**csproj 引用关系（实际文件内容）：**

```
Ddd.Domain        → （无）
Ddd.Application   → Ddd.Domain
Ddd.Infrastructure → Ddd.Domain, Ddd.Application, Microsoft.EntityFrameworkCore.Sqlite
Ddd.Web           → Ddd.Application, Ddd.Infrastructure
```

### 二、强类型 Id 作为 EF Core 主键

```
=== 二、强类型 Id 作为 EF Core 主键 ===
  作者 Id = 1（强类型 AuthorId），Value = 1
  插入两本书：Id1 = 1（Value=1），Id2 = 2（Value=2）
  → 自增主键配合 ValueConverter 依然生效（ValueGeneratedOnAdd）
  GetAsync(BookId(2)) → 找到《彷徨》
  BookId.From(1) == BookId.From(1) → True
  BookId.From(1).Equals(BookId.From(1)) → True
  default(BookId).IsEmpty → True（未保存实体的 Id 是 0，跟 long 一样）
  读回《彷徨》的价格 = 45.00 CNY（ComplexProperty 摊平成 Price_Amount/Price_Currency）
```

### 三、JSON 序列化坑

```
=== 三、强类型 Id 的 JSON 序列化 ===
  默认序列化：{"Id":{"Value":7,"IsEmpty":false},"Name":"样例"}
  加自定义转换器：{"Id":7,"Name":"样例"}
  反序列化回来：Id = 7（Value=7）
```

### 四、工作单元对照实验

```
反例 · 两个仓储各自 SaveChanges（两个独立事务）
  ① 提交成功，《工作单元A》已进库
  ② 失败：SQLite Error 19: 'UNIQUE constraint failed: Books.Title'.
  库里《工作单元A》有 1 本 → ①已提交无法回滚，数据处于「半成功」状态

正例 · 一次 SaveChanges（一个事务，要么全成功要么全失败）
  失败：SQLite Error 19: 'UNIQUE constraint failed: Books.Title'.
  库里《工作单元B》有 0 本 → 一个事务，一条都没进（干净回滚）
```

### 五、应用服务完整用例

```
=== 五、应用服务的完整用例（借书）===
  目标：《呐喊》库存 5
  借 2 本 → ok=True，事件发布器收到 1 条
    【事件】BookBorrowed：BookId=1, Count=2, At=01:12:31
  借 999 本 → ok=False，原因：库存不足（3 < 999）
  现在库存 = 3
```

### 六、两条编译期拦截（故意写错验出来的）

```
error CS0234: 命名空间"Microsoft"中不存在类型或命名空间名"EntityFrameworkCore"
              (是否缺少程序集引用?)        ← Domain 想用 EF，编译不过

error CS1503: 参数 1: 无法从"Ddd.Domain.AuthorId"转换为"Ddd.Domain.BookId"
                                          ← 强类型 Id 传错，编译不过
```

## 4. 练习：把练习项目拆成四层（分五步，一次一步）

> **这是整套课程的最后一个练习，也是最有价值的。做完你的图书管理系统就有"企业级骨架"了。**

### Step 1 · 只建两个项目，先把 Domain 抽出来

```
图书管理系统.sln
├── 原项目（不动，先能跑）
└── BookDemo.Domain/          ← 新建 classlib
```

**把 `Book` / `Author` / `Category` / `BookDetail` 移到 Domain，把 csproj 里的 EF 包删掉。**

**验收：`dotnet build` 通过，且 Domain 的 csproj 里没有任何 `PackageReference`。**

### Step 2 · 给每个实体加"行为方法"，把 Service 里的规则搬进去

**先只搬一条最简单的：`Book.Stock` 的增减。**

**验收：编译器报出所有 `book.Stock = ...` 的地方，每一处都有对应的语义化方法。**

### Step 3 · 建 Application 项目，把 Service 改造成 AppService

**方法名改成用例名（`BorrowAsync` / `ReturnAsync`），里面只做编排。**

**验收：AppService 里没有 `using Microsoft.EntityFrameworkCore`。**

### Step 4 · 建 Infrastructure，把 DbContext 和仓储实现搬过去

**配 `IEntityTypeConfiguration`，把 `OnModelCreating` 里的东西分文件。**

**验收：原项目（Web）里只剩 Controller + Program.cs。**

### Step 5 · 给 `Book.Id` 换强类型 Id

**`long Id` → `BookId Id`，配 `HasConversion`。**

**验收：`dotnet ef migrations add StronglyTypedId` 生成的迁移里，列类型仍然是 `INTEGER`（没变），但代码里传错 Id 会编译失败。**

**这一步会引出一个真实问题：现有数据库里的数据怎么办？** 迁移不改变列类型，所以数据不动。**但所有 Controller 里 `long id` 都要改成 `BookId`。** 这个改造量就是你评估"值不值得"的依据。

---

==四：总结==

## 1. 九节知识一张表

| P | 主题 | 一句话核心 |
|---|---|---|
| 188 | 什么是洋葱架构 | 依赖只能向内；Domain 零依赖 |
| 189 | 项目分层 | **分层是编译器强制的，不是约定**（实测 CS0234） |
| 190 | 领域模型实现 | `private set` + 无参构造 + 校验在方法里不在 setter |
| 191 | 领域服务实现 | 依赖仓储接口（不依赖 DbContext）、无状态、返回结果不抛 |
| 192 | 基础设施实现 | 映射写在这层；仓储不 `SaveChanges`、不返回 `IQueryable` |
| 193 | 工作单元实现 | `IUnitOfWork` 只是让应用层不认识 EF；**一个用例一次 Save** |
| 194 | 应用层实现 | 一个用例一个方法；Controller ≤ 5 行 |
| 195 | 强类型 Id | `record struct` + `HasConversion` + `ValueGeneratedOnAdd` + JSON 转换器 |
| 196 | 这不是最后一节课 | 五个同心圆；三条路；**完成 ≠ 学会** |

## 2. 十二条硬结论（全部实测）

1. **`Domain` 项目的程序集引用只有 `System.Collections` / `System.Linq` / `System.Runtime` 三个。** 零 EF、零框架。

2. **在 Domain 里 `using Microsoft.EntityFrameworkCore` 直接编译失败**：`CS0234` + `CS0246`。**分层是编译器强制的。**

3. **把 `AuthorId` 传给需要 `BookId` 的方法，编译失败**：`CS1503`。类型系统挡住了"传错参数"。

4. **`Application` 层也不引用 EF Core**（实测 False），所以 `IUnitOfWork` 的存在是有意义的——它让应用层能提交而不用认识 EF。

5. **强类型 Id 配 `HasConversion` + `ValueGeneratedOnAdd`，自增主键照常工作**：实测 `Id1=1, Id2=2`。

6. **强类型 Id 能翻译成 SQL**：`GetAsync(BookId(2))` → 找到记录。不需要内存过滤。

7. **`record struct` 天生按值相等**：`BookId.From(1) == BookId.From(1)` 为 `True`，零成本。

8. **`default(BookId).IsEmpty` 为 `True`** —— 强类型 Id 和 `long` 一样有"0 表示未保存"的歧义，要显式 `IsEmpty` 判断。

9. **强类型 Id 的 JSON 默认序列化成 `{"Value":7,"IsEmpty":false}`**，必须加 `JsonConverter` 才变成 `7`。**这个坑会在前后端联调时才爆。**

10. **两个仓储各自 `SaveChanges` → 第一个成功了第二个失败了，库里留 1 条（半成功）。**

11. **一次 `SaveChanges` → 冲突后库里 0 条（干净回滚）。** 这就是工作单元的全部价值。

12. **应用服务返回 `(bool, reason)` 而不是 `IActionResult`**，`LendAsync` 借 999 本返回 `ok=False, 原因：库存不足（3 < 999）`，HTTP 状态码由 Controller 决定。

## 3. 决策流程图

```
要建新项目了，怎么分层？
        │
        ▼
有"不能在数据库之外存在的业务规则"吗？
        │
   ┌────┴────┐
  没有        有
   │          │
   ▼          ▼
两层就够：    四层（Domain/App/Infra/Web）
Web + Model      │
（CRUD 用）       ▼
            业务规则多到要单测吗？
                 │
            ┌────┴────┐
            要         不要
            │          │
            ▼          ▼
        四层 + 仓储   三层：
        + UoW      Domain/Infra/Web
                   （不要 Application）

要不要上强类型 Id？
        │
        ▼
实体 > 10 个 且 外键多？
        │
   ┌────┴────┐
   是         不是
   │          │
   ▼          ▼
上（值得）  先不上
   │
   ▼
要接 Dapper / 多 ORM / 老工具链？
   │
   ├─ 是 → 配置成本高，慎重
   └─ 否 → 上，记得配 JSON 转换器
```

## 4. 记忆口诀

```
依赖只准指向内，领域在最中心零依赖；
Domain 不认 EF，不是约定是编译不过；
仓储接口住 Domain，实现住 Infrastructure，方向倒置靠接口；
仓储不 Save，保存交给工作单元；
仓储别返 IQueryable，返了就成马甲；
一个用例一次保存，两次就是半个成功；
应用服务管编排，领域服务管判断，聚合根管不变式；
表现层只做翻译，超过五行就该怀疑；
强类型 Id 用 record struct，零 GC 还自动相等；
HasConversion 加 ValueGeneratedOnAdd，自增照样能跑；
JSON 默认是对象，不加转换器前端懵；
零值就是未保存，IsEmpty 要自己判。
```

## 5. 三句话带走

1. **分层的价值不在"结构好看"，在"业务逻辑终于可以不连数据库就存在"。** 当你能在控制台里 `new Book(...)` 然后跑一条规则测试时，分层才真的生效了 —— 在那之前，它只是几个文件夹。

2. **最好的架构约束是"编译不过"。** 文档会过期、评审会漏、新人会忘，但 `CS0234: 命名空间"Microsoft"中不存在"EntityFrameworkCore"` 每一次都会准时出现。

3. **196 集给你的是"能看懂"，不是"能做成"。** 中间差的那一段，只有做完一个有人用的东西才能补上。**你已经知道该往哪走了，剩下的就是走。**

---

> ## 结课说明
>
> **196 集全部走完（P165「程序发布」按你的意思挂起）。** 这一套笔记一共 **24 批、约 30 篇**，
> 覆盖 Part1–Part6 全部内容，每一篇都是五段式（补充 / 概念 / 格式 / 代码 / 总结），
> 关键结论都标了"实测"，实测代码放在 `D:\tmp\` 下的各个测试项目里。
>
> **还剩一件小事：`ASP.NET Core--后端学习方案.md` 里 P165 那条 checkbox 是空的。**
> 等你真要上线那天，跟我说一声，我按你的实际环境单独补一篇。
>
> **到那时候，这套东西才算真的齐了。**
