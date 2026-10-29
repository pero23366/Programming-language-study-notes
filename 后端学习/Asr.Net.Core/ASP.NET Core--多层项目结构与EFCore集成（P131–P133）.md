==零：补充==

> **这一篇（P131–P133）回答一个问题：项目什么时候该从"一个文件夹"变成"一个解决方案"？变了之后配置、DbContext、迁移分别放哪？**

## 它解决什么问题

**你现在所有代码在一个项目里：**

```
ASP.NET Core--图书管理系统/
├── Controllers/     ← 接口层
├── Models/          ← 实体 + DTO 混在一起
├── Data/BookContext.cs  ← 数据访问
├── Migrations/
└── Program.cs
```

**这个结构在 30 个类以内是**最好**的：打开就能看到全貌，不用跳项目。**

**但它有三个天花板：**

| # | 天花板 | 具体表现 |
|---|---|---|
| 1 | **依赖方向失控** | Controller 直接 `new` 仓储、直接写 SQL、直接调第三方 API——**没有任何地方拦得住** |
| 2 | **无法复用** | 想把"图书业务"给一个控制台工具/定时任务用？**得把整个 Web 项目复制过去**（连带 Kestrel、Controller、静态文件） |
| 3 | **编译变慢 + 谁都能改谁** | 100 个类之后，改一行数据访问要重新编译整个 Web 项目；团队里谁都能 `using` 任何东西 |

**拆项目的本质，是"用项目边界强行约束依赖方向"——编译不过，就是不允许。**

```
Web  ──►  Core  ◄──  Infra
（接口）  （业务）    （数据）
```

**箭头是"能 using，能引用"的方向。注意 Core 谁都不引用——它是"圆心"。**

## 没有它会怎样（三条真实后果）

**后果一：业务逻辑长在 Controller 里。**

```csharp
[HttpPost("books")]
public async Task<IActionResult> Create(BookDto dto)
{
    if (dto.Price < 0) return BadRequest();                 // 校验
    var exists = await _ctx.Books.AnyAsync(b => b.Title == dto.Title);  // 业务规则
    if (exists) return Conflict();
    _ctx.Books.Add(new Book { ... });                        // 数据访问
    await _ctx.SaveChangesAsync();
    SendEmailToAuthor(dto.AuthorId);                         // 副作用
    return Ok();
}
```

**这段代码没法被"定时导入图书"复用**，因为它和 HTTP 绑死了（`IActionResult`、`BadRequest`）。

**后果二：换数据库/换 ORM 时无处下刀。**

**后果三：一个库变三个之后，连接串开始乱飞。**

```
Web 里硬编码一个连接串
Infra 里从 IConfiguration 读一个
某个静态工具类里又 new 了一个 DbContext（没传 options）
```

**这就是 P131「配置系统综合案例」要解决的：让配置只有一个来源、每层只读自己那段。**

## 它在整个生态里的位置

**这张图是后面所有批次的地基（批次 15 之后会一直用）：**

```
┌────────────────────────────────────────────────┐
│ Web（宿主）                                     │
│  Program.cs / Controllers / Filters / 中间件    │
│  只认识 Core 的接口，不知道 EF Core、不知道 SQL  │
└───────────────┬────────────────────────────────┘
                │ 引用
┌───────────────▼────────────────────────────────┐
│ Core（业务）                                    │
│  实体 / 业务接口 / DTO / 领域规则 / 异常类型     │
│  ★ 不引用 EF Core，不引用 ASP.NET Core          │
└───────────────▲────────────────────────────────┘
                │ 引用（反向：Infra 依赖 Core）
┌───────────────┴────────────────────────────────┐
│ Infra（基础设施）                                │
│  DbContext / 实体配置 / 仓储实现 / 第三方 SDK    │
└────────────────────────────────────────────────┘
```

**为什么 Infra 也指向 Core，而不是 Core 指向 Infra？**

> **因为"业务"不该知道"数据存在哪"。** 业务说"我要保存一本书"，而不是"我要执行一条 INSERT"。
> **接口定义在 Core（`IBookRepository`），实现在 Infra（`EfBookRepository`）——这就是依赖倒置。**

**这也解释了为什么 `AddDbContext` 必须写在 Infra：** 它是"数据访问的注册"，Web 不该知道 EF Core 存在。

## 对你个人的实际意义

**（1）这是"能交给别人看"的最低标准。**

一个单文件夹的 Web 项目，别人（面试官、合作者、你自己半年后）打开会问："业务逻辑在哪？"——**三层结构让这个问题有答案。**

**（2）对你的独立游戏服务端，拆三层是"省未来时间"的投资。**

游戏服务端典型会有：HTTP 接口（登录、存档、排行）+ 定时任务（结算、清理）+ 后台工具（发奖励）。

**这三者都要用"业务逻辑 + 数据库"。** 如果业务逻辑长在 Controller 里，定时任务就只能复制粘贴一遍——**改一处漏一处，这是线上事故的温床。**

**（3）位置感：这是"从写功能到做项目"的分界线。**

| 你之前做的事 | 本质 |
|---|---|
| 写接口、连数据库、加缓存、管配置 | **填内容** |
| 拆项目、定依赖方向、批量注册 | **定结构** |

**结构定对了，后面所有功能都是"往里塞"；结构定错了，每加一个功能都在还债。**

## 诚实的话：什么时候**不要**拆

**这条一定要讲，因为网上教程恨不得让你一上来就拆六层。**

| 情况 | 该怎么做 |
|---|---|
| 学习 / 练习 / 一次性小工具 | **单项目**，别拆。拆了只会让你在两个窗口间跳来跳去 |
| 类 < 30 个，只有一个客户端 | 单项目 + 文件夹分组（`Controllers/` `Services/` `Data/`）足够 |
| 还没跑通业务就想着"以后要扩展" | **典型过度设计**。先让它跑起来，等真的出现"两个宿主复用业务"时再拆 |
| 团队 1 人，项目 1 个月就完 | 单项目，别浪费在搬迁上 |

**判断标准只有一条：**

> **当你发现"同一段业务逻辑要被第二个宿主（定时任务/控制台/另一个 API）调用"时，才是拆的时机。**
> **在那之前，文件夹分组就够了——它和三层结构在"可读性"上的差距，远小于你搬迁花掉的时间。**

---

==一：概念==

## P131 · 1. 三层怎么切（按"依赖方向"切，不按"文件类型"切）

**新手最容易犯的错，是按文件类型拆：`Entities` 一个项目、`Services` 一个项目、`Controllers` 一个项目。**

**这叫"按形状分层"，结果是每个项目都依赖其他所有项目，绕成一团。**

**正确的切法只有一条标准：按"谁能引用谁"切。**

| 项目 | 放什么 | 允许引用 | 禁止引用 |
|---|---|---|---|
| **Core** | 实体、业务接口、DTO、领域异常 | **什么都不引用**（最多引用 `Microsoft.Extensions.*` 抽象包） | EF Core、ASP.NET Core、任何 SDK |
| **Infra** | `DbContext`、实体配置、仓储实现、第三方 SDK 封装 | Core | Web |
| **Web** | `Program.cs`、Controller、Filter、中间件 | Core + Infra | — |

**判断一个类该放哪，问三个问题：**

```
① 它需要在浏览器/HTTP 之外被复用吗？
   需要 → Core（业务）或 Infra（数据）

② 它提到 EF Core / SqlClient / HttpClient 吗？
   提到 → Infra

③ 它提到 Controller / IActionResult / HttpContext 吗？
   提到 → Web

三个都是"否" → Core
```

**⚠️ 一个现实中的例外：很多团队让 Core 引用 `Microsoft.EntityFrameworkCore`（为了用 `IQueryable` 或 `[Key]` 特性）。**

**这是权衡，不是错误：**

| 做法 | 优点 | 缺点 |
|---|---|---|
| **Core 完全不引 EF** | 最干净，换 ORM 只改 Infra | 要写一堆 Repository 接口，查询表达能力受限 |
| **Core 引 EF 的抽象包** | 方便（能用 `DbSet` 的抽象、`IQueryable`） | 业务层被 ORM 绑住 |

**我的建议：学习阶段用第一种（逼自己想清楚"业务到底需要什么操作"）；真实项目用第二种（省事）。**

## P131 · 2. 配置树的形状：每层只读自己那段

**拆项目之后，配置最容易出的问题不是"读不到"，是"到处都在读"。**

```csharp
// ❌ 三个项目里都在读配置
// Web/BookController.cs
var ttl = _config.GetValue<int>("Cache:TtlSeconds");
// Infra/BookRepository.cs
var conn = _config.GetConnectionString("Default");
// Core/PriceCalculator.cs
var rate = _config.GetValue<double>("Price:TaxRate");
```

**问题：你没法回答"配置里哪些键是还被用着的"——删一个键之前得全仓库搜字符串。**

**正确做法：配置只在"注册阶段"读，业务代码只接收强类型对象。**

```
Program.cs（Web）
   │  ① 读配置 → 绑成 Options → 注册进容器
   ▼
AddBookStoreCore(config)   ← Core 的注册入口，只读 Core 需要的段
AddBookStoreInfra(config)  ← Infra 的注册入口，只读连接串 / 重试次数
   │
   ▼
业务类只吃 IOptions<T> / 构造函数参数，不碰 IConfiguration
```

**于是配置树可以按"谁负责"分块：**

```json
{
  "ConnectionStrings": {
    "Default": "Data Source=design.db",       // Infra 读
    "Redis": "localhost:6379"                  // Infra 读
  },
  "Cache":  { "StatsTtlSeconds": 300 },         // Core（缓存策略是业务决定）
  "Pricing":{ "TaxRate": 0.06 },                // Core
  "Jwt":    { "Issuer": "bookstore", "ExpireMinutes": 120 },  // Web（认证是入口的事）
  "Logging":{ ... },                            // 框架读
  "AllowedHosts": "*"                           // 框架读
}
```

**一张"谁读哪段"的表（写进团队文档，能省掉 90% 的"这配置干嘛的"）：**

| 配置段 | 谁读 | 为什么放这一层 |
|---|---|---|
| `ConnectionStrings` | **Infra** | 只有数据层知道连哪 |
| `Cache` | **Core** | "缓存多久"是业务规则（产品决定能不能忍 5 分钟旧数据） |
| `Pricing` / 业务参数 | **Core** | 纯业务 |
| `Jwt` / `Cors` / `RateLimit` | **Web** | 入口/协议层的东西 |
| `Logging` / `AllowedHosts` | 框架 | 不归你管 |

## P131 · 3. 配置在层之间怎么传（一条铁律）

**铁律：只往下传 `IConfiguration`，不要传"读好的值"。**

```csharp
// ✅ 正确：Core/Infra 的注册方法接收 IConfiguration，自己读自己需要的段
public static IServiceCollection AddBookStoreCore(
    this IServiceCollection services, IConfiguration configuration)
{
    services.AddOptions<PricingOptions>()
        .Bind(configuration.GetSection("Pricing"))
        .ValidateOnStart();                        // ← 校验也在这里做

    services.TryAddScoped<IPriceCalculator, PriceCalculator>();
    return services;
}
```

```csharp
// ❌ 错误：Web 层把所有值都读好，一长串参数传下去
builder.Services.AddBookStoreCore(
    taxRate: builder.Configuration.GetValue<double>("Pricing:TaxRate"),
    currency: builder.Configuration["Pricing:Currency"] ?? "CNY",
    maxDiscount: builder.Configuration.GetValue<double>("Pricing:MaxDiscount"));
```

| 为什么不能传值 | 说明 |
|---|---|
| **加一个配置项 = 改三处** | Core 加参数 → Web 改调用 → 测试改 mock |
| **校验位置错** | 校验逻辑散在 Web 里，Core 自己去别的宿主里跑就没人校验 |
| **暴露了 Core 的细节** | Web 需要知道 Core 有哪些配置项，等于 Core 的内部结构泄漏 |

> **一句话：`IConfiguration` 是"配置的入口"，不是"配置的值"。传入口，让每层自己伸手取。**

## P131 · 4. 完整案例：一套配置，两个宿主（这是 P131 的真正价值）

**场景：同一个"图书业务"，既要给 Web API 用，也要给一个定时任务（每天凌晨导出报表）用。**

```csharp
// ── Web/Program.cs ──
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddBookStoreInfra(builder.Configuration)     // 数据 + 缓存实现
    .AddBookStoreCore(builder.Configuration);     // 业务
builder.Services.AddControllers();
```

```csharp
// ── Worker/Program.cs（控制台/定时任务）──
var builder = Host.CreateApplicationBuilder(args);   // ★ 注意不是 WebApplication

builder.Services
    .AddBookStoreInfra(builder.Configuration)         // 同一套注册
    .AddBookStoreCore(builder.Configuration);
builder.Services.AddHostedService<ExportJob>();
```

| 关键点 | 说明 |
|---|---|
| `Host.CreateApplicationBuilder` | 控制台宿主的构建器，**配置系统完全一样**（也有 appsettings + 环境变量） |
| 三个 `AddXxx` 一行不改 | **这就是拆项目的收益**：宿主换了，业务装配不变 |
| `IConfiguration` 都从各自的 builder 来 | 控制台里没有 `ASPNETCORE_ENVIRONMENT`，用 `DOTNET_ENVIRONMENT` |

> **`Host.CreateApplicationBuilder` 是什么？** 通用主机构建器（`Microsoft.Extensions.Hosting`），提供和 Web 一样的 DI、配置、日志、生命周期，**只是不挂 Kestrel**。定时任务、控制台工具、消息队列消费者都用它。

## P132 · 1. 为什么 `DbContext` 必须放 Infra

**它不是"习惯问题"，是"依赖方向问题"。**

```csharp
// 如果 DbContext 放在 Core：
namespace BookStore.Core;          // ← Core
public class BookContext : DbContext   // ← 需要 using Microsoft.EntityFrameworkCore
```

**结果：Core 必须引用 `Microsoft.EntityFrameworkCore`。**

| 后果 | 具体影响 |
|---|---|
| Core 不再是"纯业务" | 换 ORM 要改 Core（等于没拆） |
| **Core 的单元测试要拖一个 ORM** | 测一个价格计算，得引 EF Core 包 |
| **Web 也能看到 DbContext** | Controller 可以直接 `_ctx.Books` 写 LINQ —— 于是"业务层"形同虚设 |

**最后一条最致命：拆项目的目的是"让 Web 无法绕过业务层"，而 DbContext 放在 Core 就等于把后门留在中间。**

## P132 · 2. csproj 的引用与包，该放哪（这张表照着抄）

**项目引用（`<ProjectReference>`）：**

```
Web   ──►  Core
Web   ──►  Infra
Infra ──►  Core
Core  ──►  （无）
```

**建这一套的命令（我实测跑通的原文）：**

```bash
dotnet new sln -n BookStore
dotnet new classlib -o src/BookStore.Core
dotnet new classlib -o src/BookStore.Infra
dotnet new web     -o src/BookStore.Web

dotnet sln add src/BookStore.Core src/BookStore.Infra src/BookStore.Web
dotnet add src/BookStore.Infra reference src/BookStore.Core
dotnet add src/BookStore.Web   reference src/BookStore.Core src/BookStore.Infra
```

**包引用（`<PackageReference>`）：**

| 包 | 放哪 | 为什么 |
|---|---|---|
| `Microsoft.EntityFrameworkCore.SqlServer`（或 Sqlite） | **Infra** | 数据库驱动只有数据层知道 |
| `Microsoft.EntityFrameworkCore.Design` | **Infra + Web** | 见下面 P132 · 5，**这是最容易漏的一条** |
| `Microsoft.Extensions.DependencyInjection.Abstractions` | **Core** | 写 `AddXxx(this IServiceCollection)` 需要 |
| `Microsoft.Extensions.Options` / `Configuration.Abstractions` | **Core** | 用 `IOptions<T>` / `IConfiguration` 需要 |
| `Microsoft.AspNetCore.*` | **Web** | Web SDK 自带 |
| FluentValidation / AutoMapper 等 | 看情况 | 校验放 Core，映射看用在哪 |

> **`PrivateAssets="all"` 是什么意思？** `Microsoft.EntityFrameworkCore.Design` 装进去时默认带这个标记，意思是"这个包**不传递给引用我的项目**"。因为设计时工具只在开发机需要，不该进生产产物。**副作用：即使 Infra 装了 Design，Web 作为启动项目也拿不到它**——这就是下面那个错误的根因。

## P132 · 3. `DbContext` 注册写在 Infra，连接串从 Web 传进来

```csharp
// ── Infra/ServiceCollectionExtensions.cs ──
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BookStore.Infra;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddBookStoreInfra(
        this IServiceCollection services, IConfiguration configuration)
    {
        var conn = configuration.GetConnectionString("Default")
                   ?? throw new InvalidOperationException("缺少 ConnectionStrings:Default");

        services.AddDbContext<BookContext>(opt => opt.UseSqlite(conn));

        return services;
    }
}
```

```csharp
// ── Web/Program.cs ──
builder.Services.AddBookStoreInfra(builder.Configuration);
```

| 细节 | 为什么 | 我实测的结果 |
|---|---|---|
| `AddDbContext<T>` 注册的生命周期 | **Scoped**（每请求一个） | 与上一批一致 |
| 连接串在**第一次解析 DbContext** 时读一次 | 换库要重启（正确设计） | — |
| 连接串从 `IConfiguration` 取，不硬编码 | 环境切换靠环境变量 | 换成 `design.db` 后接口立刻生效 |

**⚠️ 注意 `UseSqlite(conn)` 里 `conn` 是"相对路径"（`Data Source=design.db`）时，落盘位置取决于"工作目录"。**

**我实测：`dotnet run` 在 `src/BookStore.Web` 目录下启动，数据库文件就生成在 `src/BookStore.Web/design.db`。** 换到别处启动，就会在别处生成一个新的空库——**这是"为什么我的数据不见了"的经典原因。**

## P132 · 4. 迁移命令的三件套：`-p` / `-s` / `-o`（实测）

**单项目时你写的是 `dotnet ef migrations add Init`。多项目时必须告诉工具三件事：**

```bash
dotnet ef migrations add Init \
  -p src/BookStore.Infra \      # Project：迁移文件生成到哪个项目
  -s src/BookStore.Web   \      # Startup：用哪个项目的宿主来构建 DI 容器
  -o Migrations                 # OutputDir：迁移文件放在项目的哪个子目录
```

| 参数 | 全称 | 作用 | 不给会怎样 |
|---|---|---|---|
| `-p` | `--project` | **迁移文件写到哪** | 默认当前目录的项目 |
| `-s` | `--startup-project` | **从哪个项目启动**（读它的配置、DI） | 默认等于 `-p` |
| `-o` | `--output-dir` | 迁移文件放哪个子目录 | 默认项目根 |

**✅ 实测结果（迁移文件确实落在 Infra）：**

```
./src/BookStore.Infra/Migrations/20261029135534_Init.cs
./src/BookStore.Infra/Migrations/20261029135534_Init.Designer.cs
```

**为什么必须 `-s` 指向 Web？** 因为设计时需要**构建设置**：它要执行 `Program.cs` 的 "注册部分"（不真正 Run），拿到 DI 容器，再从容器里取 `BookContext` 和它的连接串。**`-p` 指向的 Infra 是个类库，没有 `Program.cs`，构不出容器。**

## P132 · 5. 两个必踩的错误（实测原文，看到就知道怎么改）

**错误 1：启动项目没装 Design 包。**

```
$ dotnet ef migrations add Init -p src/BookStore.Infra -s src/BookStore.Web
Build started...
Build succeeded.
Your startup project 'BookStore.Web' doesn't reference Microsoft.EntityFrameworkCore.Design.
This package is required for the Entity Framework Core Tools to work.
Ensure your startup project is correct, install the package, and try again.
```

| 要素 | 说明 |
|---|---|
| **为什么 Infra 装了还报** | Design 带 `PrivateAssets="all"`，**不传递**给 Web |
| **解法** | `dotnet add src/BookStore.Web package Microsoft.EntityFrameworkCore.Design` |
| **注意** | 装完再跑，**必须先 `Build succeeded`**——编译不过时，EF 工具不会执行任何逻辑 |

**错误 2：不给 `-s`，把类库当启动项目。**

```
$ dotnet ef migrations add Bad -p src/BookStore.Infra
Build started...
Build succeeded.
Unable to create a 'DbContext' of type 'BookContext'.
The exception 'Unable to resolve service for type
'Microsoft.EntityFrameworkCore.DbContextOptions`1[BookStore.Infra.BookContext]'
while attempting to activate 'BookStore.Infra.BookContext'.' was thrown while attempting to create an instance.
For the different patterns supported at design time, see https://go.microsoft.com/fwlink/?linkid=851728
```

**读这句话的方法：** 它说"造不出 `BookContext`，因为没有人给它 `DbContextOptions<BookContext>`"——**翻译成白话就是"没有宿主，所以没人调用 `AddDbContext` 帮你准备 options"**。

| 报错关键词 | 真实含义 | 解法 |
|---|---|---|
| `doesn't reference ... Design` | 启动项目缺设计时包 | 给启动项目装 Design |
| `Unable to resolve service for type 'DbContextOptions<>'` | **没有宿主**（在类库里跑） | 加 `-s`，或写 `IDesignTimeDbContextFactory` |
| `No DbContext was found in assembly` | 该程序集里没有 DbContext | 检查 `-p` 指向对不对 |
| `Unable to create a 'DbContext'` + 连接串相关 | 配置没读到 | 检查 `-s` 项目里的 appsettings |

## P132 · 6. `IDesignTimeDbContextFactory`：什么时候必须写

**它是"给 `dotnet ef` 专用的工厂"——让工具在没有宿主的情况下也能造出 `DbContext`。**

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BookStore.Infra;

public class BookContextFactory : IDesignTimeDbContextFactory<BookContext>
{
    public BookContext CreateDbContext(string[] args)
    {
        // ★ 设计时拿不到 Web 的配置系统（这是独立进程），连接串要自己解决
        var conn = Environment.GetEnvironmentVariable("BOOK_DB")
                   ?? "Data Source=design.db";

        var options = new DbContextOptionsBuilder<BookContext>()
            .UseSqlite(conn)
            .Options;

        return new BookContext(options);
    }
}
```

**✅ 实测：加上这个工厂之后，`dotnet ef migrations add Bad2 -p src/BookStore.Infra`（不给 `-s`）成功执行。**

**但它带来一个更隐蔽的问题（这也是我实测发现的）：**

> **工厂的优先级高于宿主。** 一旦存在 `IDesignTimeDbContextFactory`，`dotnet ef` 就**用它**造上下文，**不再走 Web 的 `Program.cs` + appsettings**。

**证据（我的实测）：**

| 配置 | 值 |
|---|---|
| `appsettings.json` 里的连接串 | `Data Source=book.db` |
| 工厂里的默认连接串 | `Data Source=design.db` |
| 执行 `dotnet ef database update -p src/BookStore.Infra -s src/BookStore.Web` 之后 | **生成的是 `src/BookStore.Web/design.db`**（工厂赢了） |

**所以：**

| 情况 | 要不要写工厂 |
|---|---|
| 迁移需要在**设计时**做（`migrations add`）且启动项目是 Web | **不用写**（走宿主 + appsettings 最省心） |
| 启动项目是类库/没有 `Program.cs` | **必须写** |
| 想让迁移**连的库**和运行时不同（比如迁移到本地、运行时连测试库） | 写，但要清楚**它会覆盖宿主配置** |
| 你在 CI 里跑迁移，没有 appsettings | 写，从环境变量读连接串 |

> **`IDesignTimeDbContextFactory<T>` 是什么？** `Microsoft.EntityFrameworkCore.Design` 包里的接口，只有一个方法 `CreateDbContext(string[] args)`。**它只在 `dotnet ef` 执行时被调用，运行时完全不参与。**

## P132 · 7. 实体配置放 Infra（`IEntityTypeConfiguration` + 程序集扫描）

**你在 EF Core 那批学过 `OnModelCreating` 里写 `modelBuilder.Entity<Book>(...)`。多项目下，那些配置类应该**全部搬到 Infra**，然后用一行扫进来。**

```csharp
// ── Infra/Configurations/BookConfiguration.cs ──
using BookStore.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infra.Configurations;

public class BookConfiguration : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("Books");
        builder.Property(b => b.Title).HasMaxLength(200).IsRequired();
        builder.HasIndex(b => b.Title);
    }
}
```

```csharp
// ── Infra/BookContext.cs ──
public class BookContext : DbContext
{
    public BookContext(DbContextOptions<BookContext> options) : base(options) { }
    public DbSet<Book> Books => Set<Book>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ★ 一行扫完当前程序集里所有 IEntityTypeConfiguration
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BookContext).Assembly);
    }
}
```

| 收益 | 说明 |
|---|---|
| `OnModelCreating` 不会变成 500 行 | 一个配置类管一个实体 |
| 配置跟着实体走 | 加实体只加文件，不改 `DbContext` |
| 只在 Infra 里出现 EF API | Core 的实体保持"纯 POCO" |

> **`ApplyConfigurationsFromAssembly(Assembly)` 是什么？** `ModelBuilder` 的扩展方法，扫描指定程序集里所有实现 `IEntityTypeConfiguration<T>` 的非抽象类，逐个调用 `Configure`。**注意它只扫"当前程序集"，跨程序集要分别调。**

## P132 · 8. Core 该不该引用 EF Core（诚实说）

**我上面说"不引"，但真实项目里大量是引的。两种做法的边界在哪：**

| 做法 | 什么时候合适 | 代价 |
|---|---|---|
| **Core 不引 EF** | 业务规则复杂、需要单元测试、可能要换存储 | 要写 Repository 接口，复杂查询要么拼表达式树，要么在 Infra 写专有方法 |
| **Core 引 `Microsoft.EntityFrameworkCore`** | 中小项目、团队小、查询复杂 | "业务层"会慢慢变成"查询层"，Controller 也能绕过 |

**我的建议（对你）：**

> **学习阶段先按"不引"写一遍**，你会被迫想清楚"业务到底需要哪几个操作"。
> **真实项目里允许 Core 引用 EF 的抽象**，但**守住一条**：把 `DbSet` 包在业务方法里，别把 `IQueryable` 直接返回给 Controller（否则分页/筛选/排序全跑到 Web 层去了）。

## P133 · 1. 什么情况下会有"多个 DbContext"

**不是"一个大库拆成多个上下文"，而是这些真实场景：**

| 场景 | 例子 | 要不要拆上下文 |
|---|---|---|
| **多个物理库** | 业务库 + 日志库 + 用户库 | ✅ 拆（各连各的） |
| **读写分离** | 主库写、从库读 | ✅ 拆（读写各一个上下文） |
| **模块隔离** | 订单模块 / 库存模块各自独立演进 | ✅ 可以拆 |
| **同一个库，只是想知道"这块表归谁"** | 图书 / 作者 / 分类 | ❌ **别拆**（一个上下文 + 配置类就够） |

**⚠️ 最后一个最常见也最容易被搞错：同一个数据库里，拆多个 DbContext 会带来"跨上下文事务"的麻烦（`TransactionScope` 或共享连接），收益却很小。**

**我实测的这套是"两个库两个上下文"（业务库 + 日志库），这是最典型的拆分理由。**

## P133 · 2. 手写注册 vs 批量注册

```csharp
// 手写：3 个上下文写 3 行（清楚，但加第 10 个就要改 Program）
services.AddDbContext<BookContext>(o => o.UseSqlite(cfg.GetConnectionString("Book")!));
services.AddDbContext<LogContext>(o => o.UseSqlite(cfg.GetConnectionString("Log")!));
services.AddDbContext<UserContext>(o => o.UseSqlite(cfg.GetConnectionString("User")!));
```

| 维度 | 手写 | 批量（反射） |
|---|---|---|
| 可读性 | ✅ 一眼看到全部 | ❌ 看不到具体注册了谁 |
| 加新上下文 | 改 `Program.cs` | ✅ 自动生效 |
| 排查问题 | ✅ 直接看 | ❌ 要读扫描逻辑 |
| 启动耗时 | 快 | 慢一点（反射遍历类型） |
| 适合 | **≤ 3 个** | **≥ 5 个，且命名/连接串有约定** |

**结论：3 个以内手写；超过 5 个且命名有规律，才值得上反射。**

## P133 · 3. 反射批量注册（实测可跑，代码在第三节 3.4）

**核心思路只有两步：**

```
① 扫描程序集，找出所有"继承 DbContext 且非抽象"的类型
② 对每个类型：造一个 DbContextOptions<T>，再反射 new 出实例，注册成 Scoped
```

**难点在于"泛型类型在运行时才知道"—— `AddDbContext<T>` 是泛型方法，反射调用要 `MakeGenericMethod`，参数还是个 lambda，非常难拼。**

**我用的替代方案（更简单、实测通过）：直接用 `Activator` 造 options，然后注册一个工厂委托。**

```csharp
var optionsType = typeof(DbContextOptions<>).MakeGenericType(ctxType);
var builderType = typeof(DbContextOptionsBuilder<>).MakeGenericType(ctxType);

services.AddScoped(ctxType, _ =>
{
    var builder = (DbContextOptionsBuilder)Activator.CreateInstance(builderType)!;
    builder.UseSqlite(conn);
    return Activator.CreateInstance(ctxType, builder.Options)!;
});
```

**✅ 实测结果（两个上下文都能解析，连接串都正确）：**

```json
{
  "bookContext": "BookContext",
  "bookContext连接": "Data Source=design.db",
  "logContext": "LogContext",
  "logContext连接": "Data Source=design.db",
  "书库能连": true,
  "日志库能连": true
}
```

## P133 · 4. 批量注册的三个局限（必须知道，否则会掉坑）

| # | 局限 | 影响 |
|---|---|---|
| 1 | **`dotnet ef` 认不出** | 迁移时工具问"哪个 DbContext？"——它扫的是**类型**，不受影响；但 `--context` 名字要写对 |
| 2 | **拿不到 `AddDbContext` 的附加能力** | 比如 `AddDbContextPool`（连接池）、`IDbContextFactory<T>`、`EnableSensitiveDataLogging` 的便捷配置 |
| 3 | **`Activator.CreateInstance` 有性能成本 + 反射在裁剪/AOT 下会失效** | 每次请求新建，一般可接受；AOT 发布要小心 |

> **所以我的实践建议是：用反射"发现"类型，但仍然调官方的 `AddDbContext`**（用 `MakeGenericMethod` + 手拼 `Action<DbContextOptionsBuilder>` 的表达式）。**代码复杂，但保留了框架的全部能力。** 如果嫌麻烦，就手写——**3 行不值得为了"优雅"折腾两小时。**

## P133 · 5. `IDbContextFactory<T>`：什么时候需要"自己造上下文"

**`AddDbContext` 注册的是 Scoped——一个请求一个。但有两类代码"没有请求"：**

| 场景 | 问题 |
|---|---|
| **后台定时任务**（`BackgroundService`） | 没有请求 Scope，注不进 Scoped 的 DbContext |
| **并行查询** | 一个 DbContext 不能并发（`A second operation started on this context`），需要多个实例 |

```csharp
// 注册
builder.Services.AddDbContextFactory<BookContext>(opt => opt.UseSqlite(conn));

// 使用（注意：不用 await using，工厂返回的是"池化实例"，Dispose 只是归还）
public class ExportJob
{
    private readonly IDbContextFactory<BookContext> _factory;
    public ExportJob(IDbContextFactory<BookContext> f) => _factory = f;

    public async Task RunAsync()
    {
        using var db = await _factory.CreateDbContextAsync();   // ★ 每次自己造
        var books = await db.Books.AsNoTracking().ToListAsync();
    }
}
```

| API | 生命周期 | 用在哪 |
|---|---|---|
| `AddDbContext<T>` | Scoped | **Controller / 普通业务** |
| `AddDbContextFactory<T>` | Singleton 工厂 | **后台任务 / 并行 / Blazor Server** |
| `AddPooledDbContextFactory<T>` | 池化 | 高频创建 + 性能敏感 |

> **`IDbContextFactory<T>` 是什么？** 只有 `CreateDbContext()` / `CreateDbContextAsync()` 两个方法的接口。**它把"创建上下文"这件事本身变成了一个可注入的服务**——于是没有请求 Scope 的代码也能拿到 DbContext。
>
> **⚠️ 不要在同一个 `DbContext` 上并发。** 需要并行就 `CreateDbContextAsync()` 造两个。

---

==二：格式==

## P131 · Core 层的注册入口

```csharp
// BookStore.Core/ServiceCollectionExtensions.cs
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BookStore.Core;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddBookStoreCore(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<PricingOptions>()
            .Bind(configuration.GetSection("Pricing"))
            .ValidateOnStart();

        services.TryAddScoped<IPriceCalculator, PriceCalculator>();
        services.TryAddScoped<IBookService, BookService>();

        return services;
    }
}
```

## P131 · Infra 层的注册入口

```csharp
// BookStore.Infra/ServiceCollectionExtensions.cs
public static IServiceCollection AddBookStoreInfra(
    this IServiceCollection services, IConfiguration configuration)
{
    var conn = configuration.GetConnectionString("Default")
               ?? throw new InvalidOperationException("缺少 ConnectionStrings:Default");

    services.AddDbContext<BookContext>(opt => opt.UseSqlite(conn));
    services.TryAddScoped<IBookRepository, EfBookRepository>();

    return services;
}
```

## P132 · 三层 csproj 的引用关系

```xml
<!-- BookStore.Infra.csproj -->
<ItemGroup>
  <ProjectReference Include="..\BookStore.Core\BookStore.Core.csproj" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="10.0.13" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.13">
    <PrivateAssets>all</PrivateAssets>
  </PackageReference>
</ItemGroup>

<!-- BookStore.Web.csproj -->
<ItemGroup>
  <ProjectReference Include="..\BookStore.Core\BookStore.Core.csproj" />
  <ProjectReference Include="..\BookStore.Infra\BookStore.Infra.csproj" />
  <!-- ★ 启动项目也要装 Design，否则 dotnet ef 报错 -->
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.13">
    <PrivateAssets>all</PrivateAssets>
  </PackageReference>
</ItemGroup>
```

## P132 · 迁移命令三件套

```bash
# 生成迁移（文件落到 Infra 的 Migrations 目录）
dotnet ef migrations add Init -p src/BookStore.Infra -s src/BookStore.Web -o Migrations

# 应用到数据库（连接串来自 Web 的 appsettings / 环境变量）
dotnet ef database update -p src/BookStore.Infra -s src/BookStore.Web

# 撤销上一次迁移（还没 database update 时）
dotnet ef migrations remove -p src/BookStore.Infra -s src/BookStore.Web

# 列出所有迁移及是否已应用
dotnet ef migrations list -p src/BookStore.Infra -s src/BookStore.Web

# 生成 SQL 脚本（生产环境别直接 update，用脚本）
dotnet ef migrations script -p src/BookStore.Infra -s src/BookStore.Web -o deploy.sql
```

## P132 · 设计时工厂骨架

```csharp
public class BookContextFactory : IDesignTimeDbContextFactory<BookContext>
{
    public BookContext CreateDbContext(string[] args)
    {
        var conn = Environment.GetEnvironmentVariable("BOOK_DB") ?? "Data Source=design.db";
        var options = new DbContextOptionsBuilder<BookContext>().UseSqlite(conn).Options;
        return new BookContext(options);
    }
}
```

## P132 · 实体配置扫描（一行）

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(BookContext).Assembly);
}
```

## P133 · 批量注册骨架（实测可跑）

```csharp
public static IServiceCollection AddAllDbContexts(
    this IServiceCollection services, IConfiguration configuration, Assembly assembly)
{
    foreach (var ctxType in assembly.GetTypes()
                 .Where(t => t is { IsClass: true, IsAbstract: false }
                             && typeof(DbContext).IsAssignableFrom(t)))
    {
        var shortName = ctxType.Name.EndsWith("Context")
            ? ctxType.Name[..^"Context".Length] : ctxType.Name;

        var conn = configuration.GetConnectionString(shortName)
                   ?? configuration.GetConnectionString("Default")
                   ?? throw new InvalidOperationException($"缺少 {shortName} 的连接串");

        var builderType = typeof(DbContextOptionsBuilder<>).MakeGenericType(ctxType);

        services.AddScoped(ctxType, _ =>
        {
            var b = (DbContextOptionsBuilder)Activator.CreateInstance(builderType)!;
            b.UseSqlite(conn);
            return Activator.CreateInstance(ctxType, b.Options)!;
        });
    }
    return services;
}
```

## P133 · `IDbContextFactory` 骨架（后台任务用）

```csharp
builder.Services.AddDbContextFactory<BookContext>(opt => opt.UseSqlite(conn));

public class ExportJob
{
    private readonly IDbContextFactory<BookContext> _factory;
    public ExportJob(IDbContextFactory<BookContext> f) => _factory = f;

    public async Task RunAsync()
    {
        using var db = await _factory.CreateDbContextAsync();
        // ...
    }
}
```

---

==三：代码==

## 3.1 从零搭三层（我实测跑通的完整命令）

```bash
mkdir BookStore && cd BookStore

# ① 解决方案 + 三个项目
dotnet new sln -n BookStore
dotnet new classlib -o src/BookStore.Core
dotnet new classlib -o src/BookStore.Infra
dotnet new web     -o src/BookStore.Web

# ② 加进解决方案
dotnet sln add src/BookStore.Core src/BookStore.Infra src/BookStore.Web

# ③ 引用关系（注意方向！）
dotnet add src/BookStore.Infra reference src/BookStore.Core
dotnet add src/BookStore.Web   reference src/BookStore.Core src/BookStore.Infra

# ④ 包（Infra 装 EF；Web 也要装 Design，否则迁移报错）
dotnet add src/BookStore.Infra package Microsoft.EntityFrameworkCore.Sqlite --version 10.0.13
dotnet add src/BookStore.Infra package Microsoft.EntityFrameworkCore.Design --version 10.0.13
dotnet add src/BookStore.Web   package Microsoft.EntityFrameworkCore.Design --version 10.0.13

# ⑤ 验证结构
find . -name "*.csproj" | sort
```

**跑完得到的目录：**

```
BookStore/
├── BookStore.sln
└── src/
    ├── BookStore.Core/     ← 实体 + 接口 + Options
    ├── BookStore.Infra/    ← DbContext + 配置 + 仓储实现
    └── BookStore.Web/      ← Program.cs + Controllers
```

## 3.2 Core 层（业务，不引用 EF）

```csharp
// ── Core/Book.cs ──
namespace BookStore.Core;

public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = "";
    public double Price { get; set; }
}
```

```csharp
// ── Core/IBookRepository.cs ──
namespace BookStore.Core;

public interface IBookRepository
{
    Task<List<Book>> GetAllAsync(CancellationToken ct = default);
    Task<Book?> GetByIdAsync(long id, CancellationToken ct = default);
    Task AddAsync(Book book, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
```

```csharp
// ── Core/PricingOptions.cs ──
namespace BookStore.Core;

public class PricingOptions
{
    public double TaxRate { get; set; } = 0.06;
    public double MaxDiscount { get; set; } = 0.5;
}
```

```csharp
// ── Core/IBookService.cs + BookService.cs ──
namespace BookStore.Core;

public interface IBookService
{
    Task<List<Book>> ListAsync(CancellationToken ct = default);
    Task<Book> CreateAsync(string title, double price, CancellationToken ct = default);
}

public class BookService : IBookService
{
    private readonly IBookRepository _repo;
    private readonly PricingOptions _pricing;

    public BookService(IBookRepository repo,
                       Microsoft.Extensions.Options.IOptionsSnapshot<PricingOptions> pricing)
    { _repo = repo; _pricing = pricing.Value; }

    public Task<List<Book>> ListAsync(CancellationToken ct = default) => _repo.GetAllAsync(ct);

    public async Task<Book> CreateAsync(string title, double price, CancellationToken ct = default)
    {
        if (price < 0) throw new ArgumentOutOfRangeException(nameof(price), "价格不能为负");
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("书名不能为空", nameof(title));

        var book = new Book { Title = title.Trim(), Price = price * (1 + _pricing.TaxRate) };
        await _repo.AddAsync(book, ct);
        await _repo.SaveChangesAsync(ct);
        return book;
    }
}
```

**注意 `BookService` 里没有 `using Microsoft.EntityFrameworkCore`、没有 `IActionResult`——这就是拆层的目的。**

## 3.3 Infra 层（EF 只在这里出现）

```csharp
// ── Infra/BookContext.cs ──
using BookStore.Core;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infra;

public class BookContext : DbContext
{
    public BookContext(DbContextOptions<BookContext> options) : base(options) { }
    public DbSet<Book> Books => Set<Book>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
        => modelBuilder.ApplyConfigurationsFromAssembly(typeof(BookContext).Assembly);
}
```

```csharp
// ── Infra/Configurations/BookConfiguration.cs ──
using BookStore.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infra.Configurations;

public class BookConfiguration : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("Books");
        builder.Property(b => b.Title).HasMaxLength(200).IsRequired();
        builder.HasIndex(b => b.Title);
    }
}
```

```csharp
// ── Infra/EfBookRepository.cs ──
using BookStore.Core;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infra;

public class EfBookRepository : IBookRepository
{
    private readonly BookContext _db;
    public EfBookRepository(BookContext db) => _db = db;

    public Task<List<Book>> GetAllAsync(CancellationToken ct = default)
        => _db.Books.AsNoTracking().OrderBy(b => b.Id).ToListAsync(ct);

    public Task<Book?> GetByIdAsync(long id, CancellationToken ct = default)
        => _db.Books.FirstOrDefaultAsync(b => b.Id == id, ct);

    public async Task AddAsync(Book book, CancellationToken ct = default)
        => await _db.Books.AddAsync(book, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
```

```csharp
// ── Infra/ServiceCollectionExtensions.cs ──
using BookStore.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BookStore.Infra;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddBookStoreInfra(
        this IServiceCollection services, IConfiguration configuration)
    {
        var conn = configuration.GetConnectionString("Default")
                   ?? throw new InvalidOperationException("缺少 ConnectionStrings:Default");

        services.AddDbContext<BookContext>(opt => opt.UseSqlite(conn));
        services.TryAddScoped<IBookRepository, EfBookRepository>();

        return services;
    }
}
```

## 3.4 批量注册（实测代码 + 验证端点）

```csharp
// ── Infra/ServiceCollectionExtensions.cs 追加 ──
using System.Reflection;

public static IServiceCollection AddAllDbContexts(
    this IServiceCollection services, IConfiguration configuration, Assembly assembly)
{
    var contexts = assembly.GetTypes()
        .Where(t => t is { IsClass: true, IsAbstract: false }
                    && typeof(DbContext).IsAssignableFrom(t))
        .ToList();

    foreach (var ctxType in contexts)
    {
        // 约定：BookContext → ConnectionStrings:Book；读不到就用 Default
        var shortName = ctxType.Name.EndsWith("Context")
            ? ctxType.Name[..^"Context".Length]
            : ctxType.Name;

        var conn = configuration.GetConnectionString(shortName)
                   ?? configuration.GetConnectionString("Default")
                   ?? throw new InvalidOperationException($"缺少 {shortName} 或 Default 的连接串");

        var builderType = typeof(DbContextOptionsBuilder<>).MakeGenericType(ctxType);

        services.AddScoped(ctxType, _ =>
        {
            var builder = (DbContextOptionsBuilder)Activator.CreateInstance(builderType)!;
            builder.UseSqlite(conn);
            return Activator.CreateInstance(ctxType, builder.Options)!;
        });
    }

    return services;
}
```

**验证端点（我实测用的就是这段）：**

```csharp
// ── Web/Program.cs ──
using BookStore.Infra;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddAllDbContexts(builder.Configuration, typeof(BookContext).Assembly);
var app = builder.Build();

app.MapGet("/", (BookContext books, LogContext logs) => new
{
    BookContext = books.GetType().Name,
    BookContext连接 = books.Database.GetConnectionString(),
    LogContext = logs.GetType().Name,
    LogContext连接 = logs.Database.GetConnectionString(),
    书库能连 = books.Database.CanConnect(),
    日志库能连 = logs.Database.CanConnect()
});

app.Run();
```

**✅ 实测输出：**

```json
{
  "bookContext": "BookContext",
  "bookContext连接": "Data Source=design.db",
  "logContext": "LogContext",
  "logContext连接": "Data Source=design.db",
  "书库能连": true,
  "日志库能连": true
}
```

> **⚠️ 注意最后两行 `CanConnect() = true` 只能证明"上下文造出来了、连接串对"，不能证明"表存在"。** 要验证表，得跑 `database update` 或者查一次真实数据。

## 3.5 Web 层（薄薄一层）

```csharp
// ── Web/Program.cs ──
using BookStore.Core;
using BookStore.Infra;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddBookStoreInfra(builder.Configuration)
    .AddBookStoreCore(builder.Configuration);

builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.Run();
```

```csharp
// ── Web/Controllers/BooksController.cs ──
using BookStore.Core;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Web.Controllers;

[ApiController]
[Route("api/books")]
public class BooksController : ControllerBase
{
    private readonly IBookService _svc;
    public BooksController(IBookService svc) => _svc = svc;

    [HttpGet]
    public async Task<ActionResult<List<Book>>> Get(CancellationToken ct)
        => Ok(await _svc.ListAsync(ct));

    [HttpPost]
    public async Task<ActionResult<Book>> Create(string title, double price, CancellationToken ct)
        => Ok(await _svc.CreateAsync(title, price, ct));
}
```

**看这个 Controller：没有 `BookContext`、没有 `using Microsoft.EntityFrameworkCore`、没有 SQL。** 这就是三层结构想要的效果——**想绕过业务层直接查库，得先加一个项目引用（评审时一眼能看到）。**

## 3.6 迁移与验证（含报错对照）

```bash
# ① 生成迁移
dotnet ef migrations add Init -p src/BookStore.Infra -s src/BookStore.Web -o Migrations

# ② 应用
dotnet ef database update -p src/BookStore.Infra -s src/BookStore.Web

# ③ 验证：起服务、调接口、看有没有 SQL 报"表不存在"
dotnet run --project src/BookStore.Web
curl --noproxy '*' http://127.0.0.1:5000/api/books
```

| 你看到的报错 | 真实原因 | 一分钟解决 |
|---|---|---|
| `doesn't reference Microsoft.EntityFrameworkCore.Design` | 启动项目没装 Design | 给 Web 装 Design |
| `Unable to create a 'DbContext' of type ... DbContextOptions` | 没给 `-s`，在类库里跑 | 加 `-s src/BookStore.Web` |
| `No DbContext was found in assembly` | `-p` 指错项目 | `-p` 指向放了 DbContext 的项目 |
| `SQLite Error 1: 'no such table: Books'` | 迁移没应用，或连到了另一个库文件 | 跑 `database update`，检查连接串相对路径 |
| 迁移生成了但 `database update` 没反应 | 连的库和你以为的不是一个 | `dotnet ef migrations list -p ... -s ...` 看应用状态 |

## 3.7 验收清单（拆完对着过一遍）

| # | 检查项 | 通过标准 |
|---|---|---|
| 1 | Core 里没有 `using Microsoft.EntityFrameworkCore` | `grep -r "EntityFrameworkCore" src/BookStore.Core` 无结果 |
| 2 | Core 里没有 `using Microsoft.AspNetCore` | 同上（`grep AspNetCore`） |
| 3 | Web 里没有 `using Microsoft.EntityFrameworkCore` | 有就说明 Controller 在直接操作上下文 |
| 4 | Infra 里没有 `using Microsoft.AspNetCore` | 数据层不该知道 HTTP |
| 5 | 迁移命令不带任何"凭记忆"的参数 | 固定是 `-p Infra -s Web -o Migrations` |
| 6 | 换宿主（控制台）能复用业务 | `Host.CreateApplicationBuilder` 里调同样两个 `AddXxx` 能跑通 |
| 7 | 连接串只有一个来源 | `grep -r "Data Source" --include=*.cs` 只在 Infra 的工厂/注册里出现 |

**第 1–4 条是可以写成脚本卡在 CI 里的**（团队里防"有人图省事直接 using"最有效）。

---

==四：总结==

## 4.1 三节核心结论

| 节 | 一句话结论 |
|---|---|
| **P131** | 配置按"谁负责"分块：连接串归 Infra、业务参数归 Core、认证/跨域归 Web；**层间只传 `IConfiguration`，不传读好的值** |
| **P132** | `DbContext` 必须放 Infra（否则 Web 能绕过业务层）；迁移固定 `-p Infra -s Web`，**启动项目也要装 Design 包** |
| **P133** | ≤3 个上下文手写注册；≥5 个且命名有规律才上反射；**后台任务/并行查询用 `IDbContextFactory`** |

## 4.2 依赖方向表（背下来）

| 项目 | 引用 | 绝不引用 |
|---|---|---|
| Core | （无，最多 `Microsoft.Extensions.*` 抽象） | EF Core、ASP.NET Core |
| Infra | Core | Web |
| Web | Core + Infra | — |

**一句话：箭头永远指向 Core，因为 Core 是圆心。**

## 4.3 迁移命令速查

| 命令 | 用途 |
|---|---|
| `migrations add <名字> -p Infra -s Web -o Migrations` | 生成迁移 |
| `database update -p Infra -s Web` | 应用到库 |
| `migrations list -p Infra -s Web` | 看哪些已应用 |
| `migrations remove -p Infra -s Web` | 撤销最近一次（未应用） |
| `migrations script -p Infra -s Web -o deploy.sql` | **生成 SQL（生产用这个）** |

## 4.4 三个"必须有"的文件

| 文件 | 位置 | 作用 |
|---|---|---|
| `ServiceCollectionExtensions.cs` | Core / Infra 各一个 | 每层自己注册自己 |
| `XxxConfiguration.cs` | Infra/Configurations | 一个实体一个配置类 |
| `BookContextFactory.cs` | Infra（可选） | 设计时造上下文（**会覆盖宿主配置**） |

## 4.5 记忆口诀

```
拆层只看依赖方向：
  Web → Core ← Infra，Core 谁都不引

配置只传入口：
  传 IConfiguration，不传读好的值

DbContext 的身份：
  它是 Infra 的私有财产，Web 不该看见

迁移三件套：
  -p 写文件、-s 找宿主、-o 放子目录

启动项目要 Design：
  PrivateAssets=all 不传递，所以 Web 也得装
```

## 4.6 八个易错点（前两个是我实测踩的）

| # | 易错点 | 后果 | 正确做法 |
|---|---|---|---|
| 1 | **只给 Infra 装 `Design`，启动项目是 Web** | `Your startup project ... doesn't reference Microsoft.EntityFrameworkCore.Design` | **启动项目也要装** |
| 2 | **迁移时不带 `-s`，在类库项目里跑** | `Unable to create a 'DbContext' ... DbContextOptions` | 加 `-s src/BookStore.Web` |
| 3 | 写了 `IDesignTimeDbContextFactory` 又想用 Web 的配置 | **工厂优先级更高**，迁移连到了工厂里那个库（实测：appsettings 写 `book.db`，最后生成的是 `design.db`） | 二选一，别两边都配 |
| 4 | 连接串用相对路径（`Data Source=design.db`） | 从不同目录启动 = 不同库文件（"我的数据不见了"） | 用绝对路径，或确认工作目录 |
| 5 | Core 引了 `Microsoft.EntityFrameworkCore` | 换 ORM 要改业务层，"拆了等于没拆" | Core 只放接口，EF 留在 Infra |
| 6 | 把 `IQueryable` 从 Infra 返回给 Controller | 分页/筛选/排序全跑到 Web 层，业务层被架空 | 返回 `List<T>` 或分页结果 |
| 7 | 同一个库拆了 5 个 DbContext | 跨上下文事务、迁移混乱 | 一个库一个上下文，用配置类分组 |
| 8 | 给 `BackgroundService` 注 Scoped 的 DbContext | 捕获依赖（单例注 Scoped），或"上下文永不释放" | 用 `IDbContextFactory<T>` |

## 4.7 你下一步可以做的三件事

| # | 做什么 | 预期收获 |
|---|---|---|
| 1 | 把你的图书系统按 3.1 的命令拆三层（先别删原项目，新建一份） | 亲手感受"哪些代码搬不动"——搬不动的那些就是耦合 |
| 2 | 拆完后在 Core 里 `grep EntityFrameworkCore` | 如果还有结果，说明业务逻辑没搬干净 |
| 3 | 故意只给 Infra 装 Design，跑一次迁移 | 亲眼看到那个报错，以后一眼认出来 |

## 4.8 留给下一批的问题（P134–P137：Filter）

1. `IExceptionFilter` 能捕获哪些异常？**捕获不到**哪些（模型验证失败？中间件抛的？返回结果时抛的？）
2. `[MyFilter]` 和 `[ServiceFilter(typeof(MyFilter))]` 有什么区别？为什么前者不能注入 Scoped 服务？
3. `ActionFilter` 能在 Action **执行前**短路吗？能把参数改掉吗？
4. "自动事务 Filter" 怎么做到"Action 抛异常就回滚、正常就提交"？如果 Action 返回了 `BadRequest`（没抛异常）要不要回滚？
5. 限流 Filter 和限流中间件，哪个更合适？
6. Filter 和中间件的执行顺序到底谁在外面？（P143 会正面回答，但 P134–P137 是铺垫）

**下一批是 Filter 全解。这一批最容易被讲成"背生命周期顺序"，我会用实测把"到底谁捕获谁"跑出来给你看。**

