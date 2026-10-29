==零：补充==

> **这一节回答四个问题：这七节课里哪些是"新知识"、哪些是"旧知识换个场景"？缓存到底在解决一件什么事？为什么老师说服务器端响应缓存"鸡肋"？你现在该不该给自己的图书系统加缓存？**

## 它解决什么问题

**这批七节课，其实是两件毫不相干的事被塞进了一个批次。**

| 节 | 主题 | 对你来说 | 真实难度 |
|---|---|---|---|
| P117 | ASP.NET Core 中依赖注入的使用 | **旧知识 + 新场景** | ★（概念你早会了，缺的是"Web 里 Scope 长什么样"） |
| P118 | 各项目自己进行服务的注册 | **新知识**（工程习惯） | ★★（不难，但把项目从"一个文件"变成"一堆库"的分水岭） |
| P119 | 性能优化万金油：缓存 | **新概念** | ★★（概念简单，判断难） |
| P120 | 客户端响应缓存 | **新知识**（HTTP 头） | ★★★（六个指令 + 协商缓存，全是细节） |
| P121 | 鸡肋的服务器端响应缓存 | **新知识**（且是"反面教材"） | ★（学的是"为什么不该用"） |
| P122 | 内存缓存 | **新知识**（`IMemoryCache`） | ★★★（真正每天都要用的那个） |
| P123 | 缓存的过期时间策略 | **新知识**（最容易埋雷的地方） | ★★★（过期策略选错 = 线上事故） |

所以真正的学习重心只有三块：

```
① DI 在 Web 里多出来的那一条规则：Scope = 一次 HTTP 请求
② 缓存的两种"位置"：存在浏览器（响应缓存） vs 存在服务器内存（IMemoryCache）
③ 缓存的唯一难点：什么时候让它失效
```

**第 ① 块的价值**：你早就写过 `builder.Services.AddScoped<...>()`，但你有没有想过——**为什么 `BookContext` 必须是 Scoped，写成 Singleton 会怎样？** 这个"会怎样"就是 P117 的全部内容。答不上来，说明你只是背下了三种生命周期，没理解它和 Web 的关系。

**第 ② ③ 块的价值**：这是你第一次接触"**用正确性换速度**"。前面 100 多集学的都是"怎么让结果正确"，从这里开始，你要学"怎么主动让结果不那么正确一点点，换来 100 倍速度"。

## 没有它会怎样

**先看没有 DI 的 Web 世界：**

```csharp
// 每个 Action 里手写 new —— 没有 DI 的世界
public IActionResult Get(long id)
{
    var ctx = new BookContext();        // ① 连接串写死
    var logger = new ConsoleLogger();   // ② 想换成写文件，要改 30 个地方
    var cache = new MemoryCache();      // ③ 每个请求 new 一个缓存 = 缓存等于没有
    ...
}
```

- ① **连接串写死**：测试环境和生产环境没法切换
- ② **依赖换了要改所有调用点**：日志从控制台换成 NLog，你改 30 个 Controller
- ③ 最致命：**每个请求 `new` 一个缓存对象，生命周期和请求一样长 → 缓存刚写进去，请求就结束了，下一次请求是新的空缓存**。这不是"缓存没生效"，这是"你根本没做缓存"

**再看没有缓存的世界：**

你项目里的 `GET api/query/stats/by-category` 是一条 `GROUP BY` 聚合查询。假设它耗时 **80ms**：

| 场景 | 单次耗时 | 1000 QPS 下数据库要扛 |
|---|---|---|
| 无缓存 | 80ms | **每秒 1000 条聚合查询** → 数据库 CPU 打满 |
| 内存缓存 5 分钟 | 80ms 首次，之后 ~0.05ms | **每 5 分钟 1 条** → 数据库几乎空闲 |

**1600 倍的差距，代码只多了 5 行。**

这就是为什么缓存被叫做"性能优化万金油"——**索引要改表结构、异步要改代码结构、加机器要花钱，只有缓存是"加几行代码就能快两个数量级"**。

## 它在整个生态里的位置

**DI 不是一个"功能"，它是整栋楼的地基。** 你在 ASP.NET Core 里用到的每一件事，本质都是"往容器里注册一个东西"：

```csharp
builder.Services.AddControllers();          // 注册 MVC 的一整套服务
builder.Services.AddDbContext<BookContext>();// 注册 DbContext（Scoped）
builder.Services.AddOpenApi();              // 注册 OpenAPI 文档生成器
builder.Services.AddResponseCaching();      // 注册响应缓存（本批 P121）
builder.Services.AddMemoryCache();          // 注册内存缓存（本批 P122）
builder.Services.AddAuthentication();       // 注册认证（批次 17）
builder.Services.AddSignalR();              // 注册 SignalR（批次 19）
```

**你之前觉得这些 `AddXxx()` 是"魔法开关"，其实它们全是在往同一个字典里塞 `(接口 → 实现, 生命周期)`。** 理解了这个字典，框架就没有魔法了。

**缓存也不是孤立的一招，它在"性能优化四板斧"里排第二：**

| 顺序 | 手段 | 代价 | 效果 |
|---|---|---|---|
| 1 | **加索引 / 改 SQL** | 改表结构，写操作变慢 | 10–100 倍 |
| 2 | **加缓存** | 数据可能陈旧，要处理失效 | 100–1000 倍 |
| 3 | 异步 / 批量 | 改代码结构 | 2–5 倍 |
| 4 | 加机器 / 分库分表 | **花钱** | 线性增长 |

**注意顺序：缓存排在"改 SQL"后面。** 一条没走索引的查询，加缓存只是"把一条烂 SQL 的结果存起来"——第一次照样慢，而且数据一改就得重跑那条烂 SQL。

## 对你个人的实际意义

**（1）这是你第一次学"会出错的正确性"。**

前面学的 LINQ、EF Core、REST，全都是"写对了就是对的"。缓存不一样：**缓存写对了，结果也可能是错的**——用户改了书名，页面上还是旧名字，因为缓存没失效。

这是工程师和学生的分界线。学生追求"跑通"，工程师要回答"它什么时候会是错的"。这批课里 P123 的过期策略，就是这个问题的一半答案。

**（2）你一个人做独立游戏的服务端，缓存是你唯一的"免费扩容"。**

独立开发者请不起 DBA、买不起高配服务器。一个玩家列表接口，加索引 + 加缓存，能从"20 人在线就卡"变成"200 人在线不卡"——**不用多花一分钱，只多写 10 行代码**。

**（3）位置感：学完这批，你已经能解释"网站为什么扛得住"。**

| 你现在能回答的问题 | 在哪一批学的 |
|---|---|
| 请求进来怎么找到方法的 | 批次 09 |
| 接口为什么长这样（REST） | 批次 10 |
| 接口该返回什么、怎么传参 | 批次 11 |
| 前后端怎么连起来 | 批次 12 |
| **对象什么时候创建、什么时候销毁** | **本批 P117** |
| **为什么同一个接口第二次快 1000 倍** | **本批 P119–P123** |

**这六个问题串起来，就是一个后端工程师的"完整世界观"。** 剩下的认证、中间件、DDD，都是往这个骨架上挂东西。

## 诚实的话：什么时候用不上（缓存的第一守则）

**你这批最大的风险不是学不会，是学完到处乱加缓存。**

先把这句话刻在脑子里：

> **缓存的第一守则：不加缓存，是默认状态；加缓存，需要理由。**

**不该加缓存的四种情况：**

| 情况 | 为什么不该加 | 你的项目里对应哪个 |
|---|---|---|
| 数据量小到全表 5 行 | 查一次 2ms，缓存也是 0.05ms，**省了 1.95ms，多了失效逻辑** | `GET api/query/books`（5 本书） |
| 数据每次都不一样 | 缓存命中率 0%，纯负担 | 随机推荐、验证码 |
| 数据必须绝对实时 | 缓存 = 主动引入"脏数据" | 余额、库存扣减前的判断 |
| 写多读少 | 每次写都要让缓存失效，不划算 | 日志表 |

**该加缓存的三种情况：**

| 情况 | 判据 | 你的项目里对应哪个 |
|---|---|---|
| 读多写少 + 计算贵 | 查询耗时 > 50ms，且改动频率 < 每分钟一次 | `stats/by-category`、`stats/by-author` |
| 结果在一段时间内是"可接受的旧" | 业务能容忍"最多旧 1 分钟" | 首页图书列表、分类下拉框 |
| 外部调用慢且额度有限 | 第三方 API 有频率限制 | 后面可能要接的翻译 / 支付查询 |

**所以对你现在的图书系统，正确答案是：**

- `stats/by-category` / `stats/by-author` → **值得加**（GROUP BY + 双表，改成 30 秒缓存毫无感知）
- `books/{id}` 单本详情 → **可以加**（读多写少，30 秒）
- `books` 列表分页 → **看情况**（参数组合太多，缓存键会爆炸）
- `books/price-up` 涨价 → **绝对不能加**（写操作）

**这一段不是让你现在就去加，是让你学完之后，看到任何一个接口都能在 3 秒内判断"该不该加"。** 这个判断力，比会写 `GetOrCreateAsync` 值钱得多。

---

==一：概念==

## P117 · 1. Web 里的 DI 到底多了什么

**你在 Part2 学的是"DI 这个设计模式"，P117 讲的是"DI 装进 ASP.NET Core 之后，多出来的三条规则"。**

| | Part2 里你学的（控制台） | P117 要补的（Web） |
|---|---|---|
| 谁创建容器 | 你自己 `new ServiceCollection()` + `BuildServiceProvider()` | **框架启动时自己建**，你只往 `builder.Services` 里塞 |
| 谁创建 Scope | **没人**。所以你写的 Scoped 和控制台里 Transient 表现一样 | **框架每个 HTTP 请求建一个** |
| 谁释放对象 | 你 `using` | **框架在请求结束时自动 Dispose** |
| 出了错会怎样 | 你自己看异常 | **框架有作用域校验，Concurrent 时直接抛异常** |

**第一条规则：容器由框架持有，你只能"注册"，不能"自己取"。**

```csharp
var builder = WebApplication.CreateBuilder(args);   // ① 建宿主 + 建容器
builder.Services.AddScoped<IBookService, BookService>();  // ② 只做登记
var app = builder.Build();                          // ③ 容器冻结（之后不能再注册）
app.Run();                                          // ④ 开始接请求，每个请求开一个 Scope
```

| 符号 | 它是什么 | 谁创建 | 能不能不写 |
|---|---|---|---|
| `WebApplication.CreateBuilder(args)` | 静态方法，创建一个"应用构建器"。内部已经帮你 `new ServiceCollection()` 并把日志、配置、环境、Kestrel 都注册好了 | 你调用 | 不能。整个应用的入口 |
| `builder.Services` | 类型是 `IServiceCollection`，本质是 `List<ServiceDescriptor>`，**就是个登记表** | 框架 | 不能。所有 `AddXxx` 都作用在它上面 |
| `builder.Build()` | 把登记表变成真正的 `ServiceProvider`（容器）。**之后 `builder.Services` 再改就不生效了** | 你调用 | 不能 |
| `app.Run()` | 启动 Kestrel 监听端口，进入"请求循环" | 你调用 | 不能 |

> **一句话**：`builder.Services` 是"菜单"，`Build()` 之后就是"已经开火的厨房"，改菜单没用了。

**第二条规则：请求进来时，框架做四件事。**

```
① 收到一个 HTTP 请求
② 创建一个 IServiceScope（就是"作用域"）
③ 这个请求里所有 Scoped / Transient 服务都从这个 Scope 拿
④ 响应写完之后，Dispose 这个 Scope → 里面所有 IDisposable 的服务被释放
```

**这就是你项目里 `BookContext` 每次请求都是新对象、用完自动关连接的全部原因。** 你没写过一行 `using`，是框架替你做的。

**第三条规则：`HttpContext.RequestServices` 就是这个请求的 Scope。**

```csharp
app.Use(async (ctx, next) =>
{
    var svc = ctx.RequestServices.GetRequiredService<IBookService>();  // 取的是"本次请求"的那个
    await next();
});
```

**但注意**——这是服务定位器写法，后面第 7 节会讲为什么它危险。

## 2. Scope 的唯一来源：一次 HTTP 请求

**很多人以为"Scoped = 每个类一个实例"，这是错的。Scoped 的准确含义是"每个 Scope 一个实例"，而在 Web 里，Scope 的产生者只有框架的请求管线。**

**Scope 的边界在哪里？看这张图：**

```
应用启动 ────────────────────────────────────────────────────►
   │
   ├── Root Provider（根容器，Singleton 住在这里，永不释放）
   │
   ├── 请求 1 ──► Scope A ──► Scoped 实例 a1 ──► 响应结束 ▶ Dispose
   │
   ├── 请求 2 ──► Scope B ──► Scoped 实例 b1 ──► 响应结束 ▶ Dispose
   │
   └── 请求 3 ──► Scope C ──► Scoped 实例 c1 ──► 响应结束 ▶ Dispose
```

| 生命周期 | 实例数（1000 个请求） | 从哪拿 | 什么时候释放 |
|---|---|---|---|
| Singleton | **1** | Root Provider | 应用关闭时 |
| Scoped | **1000**（每请求 1 个） | 当前请求的 Scope | 请求结束时 |
| Transient | **可能上万**（每次 `Get` 都新建） | 当前 Scope（但仍新建） | **跟着"取它的那个 Scope"一起释放** |

**Transient 那一行是重点，也是最多人搞错的地方：**

> Transient 服务的实例是"每次要就新建"，但它**被谁创建就挂在谁身上**。如果在 Scope 里取的，请求结束时会一起释放；如果在 Root 里取的（单例构造时取的），**它就变成事实上的单例，永不释放**——这叫"捕获依赖"（Captive Dependency），第 5 节细讲。

## 3. 验证：同一请求内两次拿到的是同一个对象吗

**光看文字记不住，跑一次。**

```csharp
// 三个"探针"服务，各自记录自己的唯一 ID
public class ProbeTransient { public Guid Id { get; } = Guid.NewGuid(); }
public class ProbeScoped    { public Guid Id { get; } = Guid.NewGuid(); }
public class ProbeSingleton { public Guid Id { get; } = Guid.NewGuid(); }
```

```csharp
// Program.cs
builder.Services.AddTransient<ProbeTransient>();
builder.Services.AddScoped<ProbeScoped>();
builder.Services.AddSingleton<ProbeSingleton>();
```

```csharp
[ApiController]
[Route("api/lifetime")]
public class LifetimeController : ControllerBase
{
    private readonly ProbeTransient _t1;
    private readonly ProbeTransient _t2;   // 构造函数里注两次
    private readonly ProbeScoped _s1;
    private readonly ProbeSingleton _g1;
    private readonly IServiceProvider _sp;  // 为了手动再取一次

    public LifetimeController(ProbeTransient t1, ProbeTransient t2,
                              ProbeScoped s1, ProbeSingleton g1, IServiceProvider sp)
    {
        _t1 = t1; _t2 = t2; _s1 = s1; _g1 = g1; _sp = sp;
    }

    [HttpGet]
    public object Get()
    {
        var t3 = _sp.GetRequiredService<ProbeTransient>();
        var s2 = _sp.GetRequiredService<ProbeScoped>();
        return new
        {
            Transient_c1 = _t1.Id, Transient_c2 = _t2.Id, Transient_get = t3.Id,
            Scoped_c1 = _s1.Id, Scoped_get = s2.Id,
            Singleton = _g1.Id
        };
    }
}
```

**✅ 预期结果（我实测过，连续请求两次）：**

| 字段 | 同一次请求内 | 两次请求之间 |
|---|---|---|
| `Transient_c1` vs `Transient_c2` | **不相等**（构造两个参数 → 两个新实例） | 全不一样 |
| `Transient_c1` vs `Transient_get` | **不相等** | 全不一样 |
| `Scoped_c1` vs `Scoped_get` | **相等**（同一 Scope 复用） | **两次请求不相等** |
| `Singleton` | 恒定 | **恒定不变** |

**这三行结果，就是三种生命周期的全部区别。** 记不住定义没关系，记住这三行：

```
Transient：连同一个构造函数里注两次都不一样
Scoped   ：同一请求内不管注几次/手动取几次，都是同一个
Singleton：重启之前永远是同一个
```

> **`IServiceProvider` 是什么？** 容器的"对外接口"，只有两个方法：`GetService(Type)`（找不到返回 `null`）和 `GetRequiredService<T>()`（找不到抛异常）。你把它注进 Controller，就等于拿到了"这个请求的容器钥匙"——能开任何门，所以危险（见第 7 节）。
>
> **`GetRequiredService<T>()` 是什么？** `IServiceProvider` 的扩展方法（在 `Microsoft.Extensions.DependencyInjection` 命名空间）。名字里的 Required 就是"必须有"，没有就抛 `InvalidOperationException`。**平时优先用它，不要用 `GetService`**——因为 `GetService` 返回 `null` 之后，你会在十行之后得到一个 `NullReferenceException`，排查成本高得多。

## 4. 五个注入点（框架在不同位置给你送对象）

**同样是"注进去"，但五个位置的规则完全不一样，这是 P117 最容易考的地方。**

| 位置 | 怎么写 | 能注什么 | 陷阱 |
|---|---|---|---|
| **Controller 构造函数** | `public XController(ISvc svc)` | 任意生命周期 | 一次请求只构造一次，字段要 `readonly` |
| **Action 方法参数** | `public IActionResult Get([FromServices] ISvc svc)` | 任意 | 会污染方法签名，少用 |
| **中间件构造函数** | `public MyMw(ISingleton s)` | **只能注 Singleton** | 构造函数在启动时跑一次，注 Scoped 会抛校验异常 |
| **中间件 `InvokeAsync` 参数** | `public async Task InvokeAsync(HttpContext ctx, IScoped s)` | 任意（走请求 Scope） | 这是中间件里注 Scoped 的**唯一正确方式** |
| **Filter** | 构造函数（配 `[ServiceFilter]`）或 `context.HttpContext.RequestServices` | 构造函数只能 Singleton | 想在 Filter 里用 Scoped，要么用 `[ServiceFilter(typeof(X))]`，要么当"服务定位器" |

**逐个说清为什么。**

**（1）Controller 构造函数：最标准，也最该只用这个。**

```csharp
[ApiController]
[Route("api/query")]
public class QueryController : ControllerBase
{
    private readonly BookContext _ctx;      // readonly：防止在 Action 里被改成别的
    public QueryController(BookContext ctx) => _ctx = ctx;
}
```

> **`readonly` 是什么？** C# 修饰符，表示"这个字段只能在声明处或构造函数里赋值"。在这里的作用是**防止你（或三个月后的你）在 Action 里写 `_ctx = null`**——那种 bug 查起来要命。所有注入字段都该是 `readonly`。

**（2）Action 参数 `[FromServices]`：能不用就不用。**

```csharp
[HttpGet("stats")]
public IActionResult Stats([FromServices] IMemoryCache cache) { ... }
```

> **`[FromServices]` 是什么？** MVC 的绑定特性，告诉模型绑定器"这个参数不要从 URL/Body 里找，去 DI 容器里取"。
>
> **为什么不推荐？** Controller 构造函数已经能注了，方法参数注入会让"这个 Action 依赖什么"变得不透明——你看构造函数就能知道全貌，看方法签名要看十个方法。

**（3）中间件构造函数：这里有个坑，几乎人人踩。**

```csharp
// ❌ 错误写法
public class MyMiddleware
{
    private readonly BookContext _ctx;   // 编译能过，运行会炸
    public MyMiddleware(RequestDelegate next, BookContext ctx) { _ctx = ctx; }
    public async Task InvokeAsync(HttpContext ctx) { ... }
}
```

**为什么炸？** 中间件的构造函数**只在应用启动时执行一次**（中间件实例本身是"准单例"，整个应用就一个）。而你注进来的是 Scoped——等于"单例抓着 Scoped"，开发环境启动时就会抛：

```
System.InvalidOperationException: Cannot consume scoped service 'BookContext'
from singleton 'MyMiddleware'.
```

```csharp
// ✅ 正确写法：Scoped 放到 InvokeAsync 的参数里
public class MyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<MyMiddleware> _logger;   // Singleton，构造函数注没问题

    public MyMiddleware(RequestDelegate next, ILogger<MyMiddleware> logger)
    { _next = next; _logger = logger; }

    // 这个方法的参数是"每次请求"由框架从当前 Scope 解析的
    public async Task InvokeAsync(HttpContext ctx, BookContext db)
    {
        _logger.LogInformation("path={Path}", ctx.Request.Path);
        await _next(ctx);
    }
}
```

> **`RequestDelegate` 是什么？** 一个委托，签名是 `Task (HttpContext)`，代表"管线里的下一站"。中间件调 `await _next(ctx)` 就是把请求交给下一个中间件。**这是第 16 批（P138–143）的主题**，这里只需要记住一条：**中间件构造函数 = 启动时一次；InvokeAsync 参数 = 每请求一次。**

**（4）Filter：构造函数只能注 Singleton，因为 Filter 是"特性"（Attribute）的实例。**

```csharp
public class MyFilter : IActionFilter
{
    private readonly IMemoryCache _cache;   // 只能 Singleton（IMemoryCache 正好是 Singleton）
    public MyFilter(IMemoryCache cache) => _cache = cache;

    public void OnActionExecuting(ActionExecutingContext ctx)
    {
        // 想在这里用 Scoped 服务？只有两条路：
        // ① 服务定位器：ctx.HttpContext.RequestServices.GetRequiredService<BookContext>()
        // ② 用 [ServiceFilter(typeof(MyFilter))] 让框架从容器创建这个 Filter
    }
    public void OnActionExecuted(ActionExecutedContext ctx) { }
}
```

> **`IActionFilter` 是什么？** MVC 的"动作筛选器"接口，在 Action 执行前后插入逻辑（打日志、开事务、限流）。**第 15 批（P134–137）专门讲。** 这里只记一句：**Filter 的生命周期取决于你怎么挂它**——`[ServiceFilter]` 从容器拿（能注 Scoped），直接 `[MyFilter]` 是 `new` 出来的（构造函数不能有参数）。

**（5）BackgroundService / 定时任务：Scope 必须自己开。**

```csharp
public class CleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;   // 注工厂，不注 Scoped
    public CleanupService(IServiceScopeFactory f) => _scopeFactory = f;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();      // 自己开一个 Scope
            var db = scope.ServiceProvider.GetRequiredService<BookContext>();
            // ... 干活
            await Task.Delay(TimeSpan.FromMinutes(10), ct);
        }
    }
}
```

> **`IServiceScopeFactory` 是什么？** 容器的"作用域工厂"，只有一个方法 `CreateScope()`，返回一个 `IServiceScope`（里面带一个独立的 `ServiceProvider`，Dispose 它就释放里面所有 Scoped 服务）。
>
> **为什么后台服务必须用它？** 因为后台服务是 Singleton，**它没有"请求"这回事，也就没有框架给的 Scope**。而 `DbContext` 是 Scoped 且**非线程安全**——直接注进来会变成"一个生命周期无限长的 DbContext"，缓存实体越来越多、内存泄漏、并发时直接抛 `InvalidOperationException: A second operation started on this context`。

## 5. Captive Dependency：单例抓着 Scoped 不放

**这是 DI 里唯一一个"能过编译、能过测试、上线三个月后爆内存"的错误。**

```csharp
// ❌ 经典错误：单例里存一个 Scoped
public class BookCacheService    // 注册成 Singleton
{
    private readonly BookContext _db;    // Scoped
    public BookCacheService(BookContext db) { _db = db; }

    public async Task<List<Book>> GetAllAsync() => await _db.Books.AsNoTracking().ToListAsync();
}
```

**会发生什么（按严重程度排）：**

| 后果 | 具体表现 | 为什么 |
|---|---|---|
| ① **DbContext 变成永生的** | 内存只涨不降 | 单例永不释放，它持有的 DbContext 也不会释放，`ChangeTracker` 里实体越积越多 |
| ② **数据永远陈旧** | 新加的书查不到 | 那个 DbContext 是"应用启动那一刻"的，它的 `ChangeTracker` 不刷新，`AsNoTracking` 也救不了缓存层的陈旧（这是 second-level 意义上的问题：跟踪视图不更新） |
| ③ **并发时直接崩** | `A second operation was started on this context` | DbContext 不是线程安全的，两个请求同时用它 = 同一个连接上两条命令 |
| ④ **数据串台** | 用户 A 看到用户 B 的数据 | 同上，两个请求共享同一个跟踪器 |

**框架会拦你吗？分环境：**

| 环境 | `ValidateScopes` | 结果 |
|---|---|---|
| Development | **默认 true** | 启动/首次解析时抛 `InvalidOperationException: Cannot consume scoped service ... from singleton ...` |
| Production | 默认 false | **不报错，静默运行**，直到出事故 |

> **`ValidateScopes` 是什么？** `ServiceProviderOptions` 的一个开关，开启后容器在"单例向 Scoped 要东西"时会检查并抛异常。`WebApplicationBuilder` 在 Development 环境自动开启它——**所以你在 VS 里 F5 会立刻看到这个错，而线上不会。这是"本地好好的，上线就炸"的一大来源。**

**正确做法三选一：**

```csharp
// 方案 A：把服务也改成 Scoped（最常见）
builder.Services.AddScoped<IBookCacheService, BookCacheService>();

// 方案 B：单例不持有 DbContext，每次调用开一个 Scope
public class BookStatsService   // Singleton
{
    private readonly IServiceScopeFactory _f;
    public BookStatsService(IServiceScopeFactory f) => _f = f;

    public async Task<int> CountAsync()
    {
        using var scope = _f.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BookContext>();
        return await db.Books.CountAsync();
    }
}

// 方案 C：单例只依赖 Singleton（IMemoryCache、ILogger、IConfiguration 都是）
public class HotConfigService   // Singleton
{
    private readonly IMemoryCache _cache;   // Singleton，安全
    public HotConfigService(IMemoryCache cache) => _cache = cache;
}
```

**一张"谁能注进谁"的表（背下来）：**

| 消费者 \ 被依赖 | Singleton | Scoped | Transient |
|---|---|---|---|
| **Singleton** | ✅ 安全 | ❌ **捕获依赖（事故）** | ⚠️ 变相单例（等于把 Transient 用成 Singleton） |
| **Scoped** | ✅ 安全 | ✅ 安全 | ✅ 安全 |
| **Transient** | ✅ 安全 | ⚠️ 取决于取它的地方 | ✅ 安全 |

> **口诀：只能往"活得久"里注"活得久"的。单例只能注单例。**

## 6. 一个接口多个实现：最后注册的赢、IEnumerable、Keyed Service

**三种处理"多实现"的姿势，用途完全不同。**

**（1）`GetRequiredService<IX>()` 只返回最后一个注册的。**

```csharp
builder.Services.AddScoped<INotifier, EmailNotifier>();
builder.Services.AddScoped<INotifier, SmsNotifier>();   // 后注册

// 解析
var n = sp.GetRequiredService<INotifier>();   // 拿到 SmsNotifier
```

> **这是个隐藏坑**：你在两个不同的扩展方法里都注册了 `INotifier`，谁赢取决于 `Program.cs` 里调用的先后顺序。**排查这类 bug 的办法：看注册顺序，不看代码逻辑。**

**（2）`IEnumerable<IX>` 拿到全部，按注册顺序。**

```csharp
var all = sp.GetServices<INotifier>();   // [EmailNotifier, SmsNotifier]

// 典型用法：责任链 / 插件
foreach (var n in all) await n.SendAsync(msg);
```

> **`GetServices<T>()` 是什么？** `IServiceProvider` 的扩展方法，返回 `IEnumerable<T>`，包含所有注册过的实现（没有就返回空集合，不抛异常）。**这是"多实现"唯一推荐的用法**——你的 `LayeredConfigReader` 案例（Part2 的综合案例 3）就是靠它。

**（3）Keyed Service（.NET 8+）：按名字取。**

```csharp
// 注册：带一个 key
builder.Services.AddKeyedScoped<IPayService, AliPayService>("alipay");
builder.Services.AddKeyedScoped<IPayService, WeChatPayService>("wechat");

// 用：特性指定 key
public class PayController : ControllerBase
{
    [HttpGet("pay")]
    public IActionResult Pay([FromKeyedServices("alipay")] IPayService pay) => Ok(pay.Name);
}

// 或者手动取
var wechat = sp.GetRequiredKeyedService<IPayService>("wechat");
```

> **`AddKeyedScoped<TService,TImpl>(object key)` 是什么？** .NET 8 新增的注册方式，在"接口→实现"之外再加一个"名字"。**以前要做这件事，只能写工厂 + `Dictionary` 或者自己包一层 `Func<string, IPayService>`，现在框架原生支持。**
>
> **什么时候用？** 支付渠道、短信渠道、多数据库连接、多语言模板——**同一个接口、多套实现、运行时按业务参数选**。这时候用 `IEnumerable` 太重（你要自己遍历匹配），用 key 最直接。

## 7. 服务定位器在 Web 里为什么格外危险

**你在 Part2 学过"服务定位器是反模式"，但 Web 里它有额外的杀伤力：`HttpContext.RequestServices` 太好拿了。**

```csharp
// ❌ 反模式：Controller 里到处 RequestServices
public class BookController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var db = HttpContext.RequestServices.GetRequiredService<BookContext>();
        var log = HttpContext.RequestServices.GetRequiredService<ILogger<BookController>>();
        var cfg = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        ...
    }
}
```

**四条罪状（第 4 条是 Web 特有的）：**

| # | 罪状 | 后果 |
|---|---|---|
| 1 | **依赖隐身** | 看构造函数不知道这个类依赖什么，改一个服务影响面无法评估 |
| 2 | **无法单元测试** | 测试时要构造一个假的 `HttpContext` + 假容器，成本是构造函数的 10 倍 |
| 3 | **错误延迟到运行时** | `GetRequiredService` 少注册一个服务 → 运行到那一行才抛，而不是启动时 |
| 4 | **生命周期逃逸** | 在 Singleton 里存下 `HttpContext` 或 `RequestServices` → 相当于捕获了整个请求，**这是内存泄漏的头号原因** |

**第 4 条的典型案发现场：**

```csharp
// ❌ 单例里存 HttpContext
public class AuditService   // Singleton
{
    private HttpContext? _ctx;
    public void SetContext(HttpContext ctx) => _ctx = ctx;   // 每次请求调一下
    // 结果：最后一个请求的 HttpContext 被永久持有，
    //       里面还挂着那个请求的 Scope、DbContext、响应流……
}
```

**所以记住一条铁律：**

> **`HttpContext` 和 `IServiceProvider` 都不许存进字段。** 要用就当场用，用完就丢。
> 唯一例外：`IHttpContextAccessor`（专门为"必须跨类拿 HttpContext"设计的，比如日志中间件），它内部用 `AsyncLocal`，不持有引用。

```csharp
// 确实需要在别处拿 HttpContext 时，用这个
builder.Services.AddHttpContextAccessor();

public class CurrentUserService
{
    private readonly IHttpContextAccessor _accessor;
    public CurrentUserService(IHttpContextAccessor a) => _accessor = a;
    public string? UserId => _accessor.HttpContext?.User?.FindFirst("sub")?.Value;
}
```

> **`IHttpContextAccessor` 是什么？** 一个只有 `HttpContext? HttpContext { get; set; }` 一个属性的接口。它的实现用 `AsyncLocal<HttpContextHolder>` 存储——**`AsyncLocal` 是"随异步流传递的变量"，每个请求一条独立的流，所以 A 请求读不到 B 请求的值，也不会阻止 GC。**
>
> **为什么默认没注册？** 因为它有性能成本（AsyncLocal 的读写比普通字段慢），框架不想让所有人白付这个钱。**用之前记得 `AddHttpContextAccessor()`，忘了就是运行时 `null`。**

## P118 · 8. 为什么"各项目自己注册"

**前七节讲的是"怎么用容器"，这一节讲的是"注册代码该放在哪个文件"。**

**先看你现在的问题。** 你的 `Program.cs` 只有 5 行注册，还行。但如果项目长大：

```csharp
// Program.cs —— 半年后的样子（真实项目就是这样烂掉的）
builder.Services.AddDbContext<BookContext>(...);
builder.Services.AddScoped<IBookService, BookService>();
builder.Services.AddScoped<IAuthorService, AuthorService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IPayService, AliPayService>();
builder.Services.AddScoped<ISmsService, SmsService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<IExcelExportService, ExcelExportService>();
// ... 还有 80 行
```

**三个具体问题：**

| 问题 | 表现 |
|---|---|
| **`Program.cs` 变成垃圾场** | 200 行注册代码，找不到业务逻辑在哪 |
| **层与层之间产生反向依赖** | `Web` 项目要 `using` 每一个类库的每一个实现类 → 类库改个类名，Web 项目编译失败 |
| **类库无法复用** | 想把 `BookStore.Core` 拿到另一个项目用，得手动抄一遍注册代码，还得记得抄全 |

**这就是 P118 要解决的事：让每个库自己管自己的注册。**

```
BookStore.Web          ← 只知道调 AddBookStore()，不知道里面有啥
   │
   ├── BookStore.Core     ← 有自己的 AddBookStoreCore()
   ├── BookStore.Infra    ← 有自己的 AddBookStoreInfra(config)
   └── BookStore.Api      ← 有自己的 AddBookStoreApi()
```

**好处（按你实际的收益排）：**

1. **`Program.cs` 回到 10 行**，一眼看完应用由哪几块组成
2. **加一个新模块 = 加一行 `AddXxx()`**，不用翻 200 行找位置
3. **类库自带"安装说明书"**，别人（或三个月后的你）拿到这个库，看一眼扩展方法就知道怎么用
4. **`internal` 类可以被注册**——因为注册代码在库内部，能看见 `internal` 类型。这是**真正的封装收益**

## 9. 扩展方法模式（这是 P118 的核心）

**模式只有三步，但每一步都有讲究。**

**第一步：在类库里写静态类 + 静态方法，`this IServiceCollection`。**

```csharp
// BookStore.Core/ServiceCollectionExtensions.cs
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BookStore.Core;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// 注册 Core 层所有服务。Web 项目只需要调这一行。
    /// </summary>
    public static IServiceCollection AddBookStoreCore(
        this IServiceCollection services,
        IConfiguration configuration)          // ← 需要配置就传进来，不要在里面 new
    {
        services.AddScoped<IBookService, BookService>();
        services.AddScoped<IAuthorService, AuthorService>();

        // 需要配置的，用 Options 模式（批次 14 的 P129 详讲）
        services.Configure<CacheOptions>(configuration.GetSection("Cache"));

        return services;   // ← 必须返回，才能链式调用
    }
}
```

| 符号 | 含义 | 为什么必须 |
|---|---|---|
| `static class` | 静态类，不能实例化 | 扩展方法必须定义在**非嵌套的静态类**里 |
| `this IServiceCollection services` | 扩展方法的第一个参数加 `this` | 这样就能写 `builder.Services.AddBookStoreCore(cfg)`，像原生方法一样 |
| `IConfiguration configuration` | 把配置从外面传进来 | 类库**不该自己读 `appsettings.json`**（它不知道宿主用哪个配置文件） |
| `return services` | 返回同一个集合 | 支持 `services.AddA().AddB()` 链式写法 |

**第二步：Web 项目里只调一行。**

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddBookStoreInfra(builder.Configuration)   // 数据访问层
    .AddBookStoreCore(builder.Configuration)    // 业务层
    .AddBookStoreApi();                         // 控制器/过滤器

builder.Services.AddControllers();

var app = builder.Build();
app.MapControllers();
app.Run();
```

**第三步：命名约定（微软官方 SDK 全在用这个约定）。**

| 约定 | 例子 | 说明 |
|---|---|---|
| 方法名 `Add<模块名>` | `AddBookStoreCore` | 一眼知道注册哪块 |
| 文件名 `ServiceCollectionExtensions.cs` | 固定 | 和官方源码保持一致，找起来方便 |
| 返回值 `IServiceCollection` | 固定 | 链式调用 |
| 只注册，**不做 IO** | 不要在里面连数据库 | `Build()` 之后才该有 IO；注册阶段连库会让启动变慢、且无法测试 |

## 10. 程序集扫描：一行注册一批

**`AddScoped<IBookService, BookService>()` 写 50 遍太蠢。规律很明显：接口名是 `I` + 实现名。那就让代码自己找。**

```csharp
public static IServiceCollection AddServicesFromAssembly(
    this IServiceCollection services, Assembly assembly)
{
    // 找到所有"非抽象、非接口、名字以 Service 结尾"的类
    var types = assembly.GetTypes()
        .Where(t => t is { IsClass: true, IsAbstract: false }
                    && t.Name.EndsWith("Service"));

    foreach (var impl in types)
    {
        // 实现类实现的所有接口
        var interfaces = impl.GetInterfaces()
            .Where(i => i.Name == "I" + impl.Name);   // 只配对自己的那个接口

        foreach (var i in interfaces)
            services.AddScoped(i, impl);               // 非泛型重载：传 Type

        if (!interfaces.Any())
            services.AddScoped(impl);                  // 没有接口就自己注册自己
    }

    return services;
}
```

| 符号 | 含义 | 不写会怎样 |
|---|---|---|
| `Assembly` | 一个已加载的程序集（.dll）。`typeof(X).Assembly` 拿当前库，`Assembly.GetExecutingAssembly()` 拿当前执行的 | 不知道去哪找类型 |
| `assembly.GetTypes()` | 返回这个程序集里**所有**类型（含 `internal`、编译器生成的 `<>c` 等） | — |
| `t is { IsClass: true, IsAbstract: false }` | C# 9 的属性模式：一次判断两个条件 | 写成 `t.IsClass && !t.IsAbstract` 也一样，但模式匹配更短 |
| `impl.GetInterfaces()` | 返回这个类实现的所有接口（**包括继承来的**） | 会把 `IDisposable` 也匹配进来，所以必须用 `i.Name == "I" + impl.Name` 过滤 |
| `services.AddScoped(Type, Type)` | 非泛型重载，参数是 `Type` 对象 | 泛型重载编译期就要写死类型，扫描做不到 |

**扫描的代价（诚实说）：**

| 优点 | 代价 |
|---|---|
| 加一个 Service 类自动生效，不改 `Program.cs` | **启动变慢**（反射遍历所有类型），项目大了能到几百毫秒 |
| 注册代码不会漏 | **隐式魔法**：新人看不到 `AddScoped` 在哪，排查"为什么这个接口有两个实现"很痛苦 |
| 团队约定统一 | 命名不规范就扫不到（比如 `BookRepo` 结尾不是 `Service`） |

> **我的建议**：**小项目（<30 个服务）手写注册，清晰可控；大项目（>50 个）用扫描，但要配"命名规范 + 启动日志打印注册表"**。别为了少写 20 行代码，把可读性搞没。

## 11. 注册冲突的三种处理（Add / TryAdd / Replace）

**`AddScoped` 是无脑追加。同一个接口注册两次，不会报错，只是"最后赢"。这在类库场景会出大事。**

**场景：你的 `BookStore.Core` 注册了 `ICacheService → MemoryCacheService`，业务方想换成 Redis。他调了 `AddScoped<ICacheService, RedisCacheService>()`，但顺序在前——结果还是内存缓存。而且没有任何报错。**

**三个工具，专门解决这个：**

```csharp
using Microsoft.Extensions.DependencyInjection.Extensions;   // 扩展方法都在这个命名空间

// ① TryAdd：不存在才加（类库的标准写法）
services.TryAddScoped<ICacheService, MemoryCacheService>();

// ② Replace：替换第一个匹配的注册
services.Replace(ServiceDescriptor.Scoped<ICacheService, RedisCacheService>());

// ③ RemoveAll：删掉所有匹配的，再自己加
services.RemoveAll<ICacheService>();
services.AddScoped<ICacheService, RedisCacheService>();
```

| 方法 | 行为 | 用在哪 |
|---|---|---|
| `TryAddScoped` | 已有同 `ServiceType` 的注册就**跳过** | **类库内部**（`AddXxx()` 里），保证不覆盖宿主的配置 |
| `Replace` | 删掉**第一个**同 `ServiceType` 的，插入新的 | 宿主想"换掉类库的默认实现" |
| `RemoveAll<T>` | 删掉**所有**同 `ServiceType` 的 | 有多个实现要全部清掉时 |

> **`ServiceDescriptor` 是什么？** 注册表里的一行，包含三个字段：`ServiceType`（接口）、`ImplementationType`（实现）、`Lifetime`（生命周期）。`AddScoped` 内部就是 `services.Add(new ServiceDescriptor(...))`。**知道这一点，"替换注册"就不神秘了——无非是操作 `List<ServiceDescriptor>`。**

**✅ 类库写法的标准答案：**

```csharp
public static IServiceCollection AddBookStoreCore(this IServiceCollection services, IConfiguration cfg)
{
    // 一律用 TryAdd：宿主已经注册过的，说明他有意覆盖，我们不要抢
    services.TryAddScoped<IBookService, BookService>();
    services.TryAddScoped<IAuthorService, AuthorService>();

    // 但要"保证存在"的（比如缓存），用 AddMemoryCache 的幂等版本
    services.AddMemoryCache();   // 这个内部就是 TryAdd，重复调安全

    return services;
}
```

> **为什么 `AddMemoryCache()` 重复调安全？** 因为框架源码里用的是 `services.TryAdd(ServiceDescriptor.Singleton<IMemoryCache, MemoryCache>())`。**微软自己写类库时就在用 `TryAdd`，这就是约定。**

---

## P119 · 1. 缓存到底是什么

**一句话：缓存 = 把"算一次很贵"的结果，存在"取一次很便宜"的地方。**

**用你的项目算一遍账。**

```csharp
// 你的 stats/by-category：GROUP BY 聚合 + 分类字典查询
var rows  = await _ctx.Books.GroupBy(b => b.CategoryId)...ToListAsync();   // 一次往返 + 聚合
var names = await _ctx.Categories.AsNoTracking().ToDictionaryAsync(...);  // 又一次往返
```

| 成本项 | 每次请求都要付 | 缓存后 |
|---|---|---|
| 网络往返（应用 ↔ 数据库） | 2 次，约 1–3ms | **0** |
| SQL 解析 + 执行计划缓存查找 | 每次 | 0 |
| `GROUP BY` 聚合计算 | 数据量越大越慢 | 0 |
| 反序列化成对象 | 每次 | 0 |
| **合计（5 本书）** | **约 3–8ms** | **约 0.02ms** |
| **合计（50 万本书）** | **约 80–300ms** | **约 0.02ms** |

**注意第一行和最后一行：数据量小的时候，缓存省的是"几毫秒"，看起来没意义；数据量大的时候，缓存省的是"两个数量级"。**

**这就是为什么"该不该加缓存"永远要看数据规模，而不是看代码好不好看。**

**三个术语（后面会反复用）：**

| 术语 | 含义 | 你的目标 |
|---|---|---|
| **命中（Hit）** | 要的数据在缓存里，直接返回 | 越高越好 |
| **未命中（Miss）** | 不在，得回源计算并写回缓存 | 越低越好 |
| **命中率** | 命中次数 / 总请求数 | **低于 50% 的缓存基本是在添乱** |

> **为什么命中率低就是添乱？** 因为每次未命中，你要付"查缓存 + 回源 + 写缓存"三份成本，比不加缓存还慢。**一个缓存键设计得不好的接口，加上缓存后 TTFB 从 80ms 变 85ms，还多了"数据陈旧"的 bug。这就是典型的负优化。**

## 2. 缓存的五个位置（先搞清"存在哪"，再谈怎么存）

**同一份数据，可以被存在五个地方，越靠前越快、越不可控：**

```
① 浏览器本地        ② CDN 边缘节点      ③ 反向代理(Nginx)     ④ 应用进程内存      ⑤ 数据库查询缓存
   （用户电脑）        （离用户最近）        （自己的服务器）        （你的 .NET 进程）     （SQL Server 内部）

   最快 <──────────────────────────────────────────────────────────────────────► 最慢
   最不可控 <───────────────────────────────────────────────────────────────────► 最可控
```

| 位置 | 谁在管 | 你能控制吗 | 本批哪节讲 |
|---|---|---|---|
| ① 浏览器 | 用户的浏览器 | **只能"建议"**（发响应头，用户可以无视） | **P120 客户端响应缓存** |
| ② CDN | 云厂商 | 通过响应头 + CDN 配置 | 不深入（属于运维） |
| ③ Nginx | 你自己（或运维） | 配置文件 | P121 结尾提一句 |
| ④ 应用内存 | **你的代码**（`IMemoryCache`） | **完全可控** | **P122 / P123** |
| ⑤ 数据库 | SQL Server | 基本不用管 | — |

**这张表解释了一件重要的事：为什么"客户端响应缓存"和"内存缓存"是两节完全不同的课。**

> **P120 讲的是"求浏览器帮忙"，你只能发个响应头建议它，它不听你也没辙（用户按 Ctrl+F5 就绕过）。**
> **P122 讲的是"自己动手"，完全可控，但也完全由你负责（过期、失效、内存占用）。**

## 3. 缓存的三个必答问题

**任何缓存方案，你必须能回答这三个问题。答不上来就不该加缓存。**

| # | 问题 | 答错的后果 | 本批哪节回答 |
|---|---|---|---|
| ① | **存什么**（缓存键怎么设计） | 键太粗 → 数据串台；键太细 → 命中率 0 | P122 第 6 节 |
| ② | **存多久**（TTL 多长） | 太长 → 数据陈旧；太短 → 白干 | **P123 第 4 节** |
| ③ | **怎么失效**（数据变了怎么办） | 用户改了书名，页面还是旧的 | P123 第 6 节 |

**新手最容易只回答 ②，然后被 ③ 打脸。** 记住：

> **缓存不是"存数据"，是"承诺数据在 T 时间内不变"。** 你写 `Duration = 3600`，等于向用户承诺"这个数据一小时内不会变"——**这个承诺是业务决定，不是技术决定。**

**举个必须问业务的例子：**

| 接口 | 能承诺多久 | 谁来决定 |
|---|---|---|
| 图书分类列表 | 1 小时 | 运营：分类一天改一次 |
| 图书详情 | 5 分钟 | 产品：书名改了延迟 5 分钟能接受吗？ |
| 库存数量 | **0 秒** | 业务：不能接受 |
| 首页销量排行 | 10 分钟 | 产品：排名晚 10 分钟无所谓 |

**所以"缓存时间设多少"这个问题，正确答案永远是"问产品"，不是"看代码"。**

## 4. 缓存能省多少（三个真实量级）

| 场景 | 不加缓存 | 加缓存 | 倍数 |
|---|---|---|---|
| 聚合统计（你的 by-category） | 80ms | 0.02ms | **4000×** |
| 单条详情（books/{id}） | 3ms | 0.02ms | 150× |
| 第三方 API（限额 100 次/天） | 每天第 101 次直接失败 | 缓存后只用 1 次 | **从"不可用"到"可用"** |

**第三种才是缓存最狠的用法**：不是"更快"，是"**从不能用变成能用**"。以后你接翻译 API、地图 API、支付回调验签，都会遇到这个场景。

## P120 · 1. HTTP 缓存的两套机制（这是全批最该背下来的一张图）

**浏览器缓存不是"一个"东西，是"两套"机制，逻辑完全不同：**

```
                          浏览器收到请求
                                │
                    ┌───────────┴───────────┐
                    │  有没有缓存副本？      │
                    └───────────┬───────────┘
                        没有 │        │ 有
                            ▼        ▼
                        直接请求   ┌──────────────────┐
                        服务器     │ 副本还在"保鲜期"吗？│  ← 靠 max-age / Expires 判断
                                  └──────┬───────────┘
                              在期内 │            │ 已过期
                                    ▼            ▼
                            ★ 直接用它        ┌─────────────────┐
                            （不发请求）      │ 发"验证请求"：   │  ← 靠 ETag / Last-Modified
                            Strong Cache     │ If-None-Match   │
                            "强缓存"          └────────┬────────┘
                                                       ▼
                                            ┌──────────────────────┐
                                            │ 服务器：没变 → 304    │  ← 协商缓存
                                            │ 服务器：变了 → 200 + 新内容│
                                            └──────────────────────┘
```

| 机制 | 靠什么头 | 结果 | 省了什么 | 还发请求吗 |
|---|---|---|---|---|
| **强缓存**（Strong） | `Cache-Control: max-age=60`、`Expires` | `200 (from disk cache)` / `200 (from memory cache)` | **带宽 + 请求数 + 服务器负载** | **不发** |
| **协商缓存**（Conditional） | `ETag` / `Last-Modified` + `If-None-Match` / `If-Modified-Since` | `304 Not Modified`（无 body） | **带宽（省 body），不省请求** | **发，但要回 304** |

> **很多人以为"304 就等于强缓存"，这是错的。** 304 说明**浏览器还是发了请求**，服务器还是查了一次数据库/读了文件，只是没把 body 传回来。**它省的是带宽，不是 CPU。**

**这就是为什么静态资源要设"一年 max-age + 文件名带 hash"**（`app.a3f9c1.js`）：
- 有 hash → 文件内容变了文件名就变 → **不需要协商**，反正 URL 不一样
- 所以可以放心设 `max-age=31536000, immutable` → **一年内一次请求都不发**

## 2. `Cache-Control` 六个指令，逐个拆

**`Cache-Control` 是 HTTP/1.1 的缓存控制头，值是一个逗号分隔的指令列表**，例如：

```
Cache-Control: public, max-age=60, s-maxage=600, must-revalidate
```

**课程讲的六个核心指令：**

| # | 指令 | 字面意思 | 真实语义（这是关键） | 记忆要点 |
|---|---|---|---|---|
| 1 | `max-age=60` | 最大存活 60 秒 | 从**响应生成那一刻**算起，60 秒内副本"新鲜"，可以直接用 | **相对的秒数**，不是时间点 |
| 2 | `s-maxage=600` | shared 的 max-age | **只对共享缓存**（CDN、代理、Nginx）有效，且**覆盖 max-age** | s = **shared**。浏览器看 `max-age`，CDN 看 `s-maxage` |
| 3 | `no-cache` | 不要缓存 | **❌ 完全不是"不缓存"**！是"**可以存，但每次用之前必须问服务器**" | **名字骗了所有人**。它 = 强制协商缓存 |
| 4 | `no-store` | 不要存储 | **真的完全不存**，连硬盘都不写。每次都是全新的 | **真正的不缓存**。涉密数据用它 |
| 5 | `private` | 私有的 | 只允许**浏览器（终端）**存，**CDN / 代理不许存** | 带用户信息的响应必须用这个 |
| 6 | `public` | 公开的 | **谁都能存**，包括 CDN 和代理 | 和 `private` 互斥，公用的静态资源用它 |

**再补三个你一定会遇到的（课程没细讲，但别当没见过）：**

| 指令 | 语义 | 典型用法 |
|---|---|---|
| `must-revalidate` | 过期后**必须**回服务器验证，不许用过期副本凑合 | 价格、库存这类不能"凑合"的 |
| `immutable` | **在有效期内，连"用户按刷新"都不发请求** | 带 hash 的静态资源 |
| `stale-while-revalidate=30` | 过期后 30 秒内，**先返回旧副本**，同时后台去拿新的 | 极致追求速度的列表页 |

**`no-cache` vs `no-store`，用一张表彻底分开：**

| | `no-cache` | `no-store` |
|---|---|---|
| 浏览器存不存？ | **存** | **不存** |
| 下次用之前 | 发请求问"变了吗"（可 304） | 发请求要全新的（必 200 + body） |
| 省带宽吗 | 省（304 无 body） | 不省 |
| 省 CPU 吗 | **不省**（服务器还是处理了请求） | 不省 |
| 用在哪 | 首页 HTML、需要"实时但可以不重新下载"的 JSON | **身份证号、验证码、支付信息** |

> **一句口诀：**
> **`no-cache` = 能存但要问；`no-store` = 连存都别存。**
> **`private` = 只给浏览器；`public` = 大家随便存。**

## 3. 一个真实请求的完整时间线

**用你的图书列表接口走一遍：**

```
第一次访问  GET /api/query/books                    ← 浏览器无副本
            ← 200 OK
              Cache-Control: public,max-age=60
              ETag: "abc123"
              { 5 本书的数据 }              下载 body，存进磁盘缓存

30 秒后再访问（还在 max-age 内）
            ★ 不发请求，直接用磁盘副本
            DevTools 显示：200 (from disk cache)  Size: (disk cache)

90 秒后再访问（超过 max-age，进入协商阶段）
            GET /api/query/books
            If-None-Match: "abc123"         ← 把上次的 ETag 带回给服务器
            ← 304 Not Modified              ← 服务器说"没变"
            Size: 0 B                       ← 无 body，只有头

数据变了，再访问
            GET /api/query/books
            If-None-Match: "abc123"
            ← 200 OK，新的 ETag: "def456"
            { 新数据 }                      ← 更新本地副本
```

**注意第三段和第一段：`304` 那条的 Size 是 0 B，但 State 依然是 200 的绿色**——**这就是"协商缓存省的是带宽，不省请求"的直观证据。**

## 4. `[ResponseCache]` 特性怎么映射成响应头（我实测了）

**这一节最有价值的不是"怎么写"，是"写出来究竟发了什么头"。** 我在 .NET 10 上起了一个最小项目，逐个端点用 `curl` 抓头，结果如下（全部是实测，不是抄文档）：

**实验代码：**

```csharp
[ApiController]
[Route("rc")]
public class RCController : ControllerBase
{
    [HttpGet("p1")] [ResponseCache(Duration = 60)]
    public string P1() => "p1";

    [HttpGet("p2")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    public string P2() => "p2";

    [HttpGet("p3")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Client)]
    public string P3() => "p3";

    [HttpGet("p4")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.None)]
    public string P4() => "p4";

    [HttpGet("p5")] [ResponseCache(NoStore = true)]
    public string P5() => "p5";

    [HttpGet("p6")] [ResponseCache(Location = ResponseCacheLocation.Any)]   // 故意不写 Duration
    public string P6() => "p6";

    [HttpGet("p7")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any, VaryByHeader = "User-Agent")]
    public string P7() => "p7";

    [HttpGet("p8")] [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "*" })]
    public string P8() => "p8";
}
```

**✅ 实测结果（`curl -D -` 抓的响应头）：**

| # | 写法 | 实际响应头 | 说明 |
|---|---|---|---|
| p1 | `Duration=60` | `Cache-Control: public,max-age=60` | **不写 Location ≈ Any**（不是 None！） |
| p2 | `Duration=60, Location=Any` | `Cache-Control: public,max-age=60` | 和 p1 一模一样 |
| p3 | `Duration=60, Location=Client` | `Cache-Control: private,max-age=60` | Client → `private` |
| p4 | `Duration=60, Location=None` | `Cache-Control: no-cache,max-age=60` | **None → `no-cache`，不是 `no-store`** |
| p5 | `NoStore=true` | `Cache-Control: no-store` | 只有 no-store，没有 max-age |
| p6 | `Location=Any`，无 Duration | **HTTP 500** | 见下面的异常 |
| p7 | `VaryByHeader="User-Agent"` | `Cache-Control: public,max-age=60` + `Vary: User-Agent` | 多出一个 Vary 头 |
| p8 | `VaryByQueryKeys`，未开中间件 | **HTTP 500** | 见下面的异常 |

**两条 500 的完整异常信息（也是实测抓的）：**

```
p6 → System.InvalidOperationException:
     If the 'NoStore' property is not set to true, 'Duration' property must be specified.

p8 → System.InvalidOperationException:
     'VaryByQueryKeys' requires the response cache middleware.
```

**这两个异常非常有教学价值：**

- **p6**：`[ResponseCache]` **必须给 `Duration`**（除非 `NoStore=true`）。因为不给 duration 它就不知道 `max-age` 填多少，干脆不干活直接抛。**这是"编译能过、运行时 500"的典型，只有 curl 一下才发现。**
- **p8**：`VaryByQueryKeys` 需要**响应缓存中间件**（P121 的主角）才生效。**没有中间件，这个属性不是"没用"，是直接炸。**

**`[ResponseCache]` 的三个属性，逐个说清：**

| 属性 | 类型 | 作用 | 不写会怎样 |
|---|---|---|---|
| `Duration` | `int`（秒） | 映射成 `max-age` | **除非 NoStore=true，否则运行时报错**（上面实测） |
| `Location` | `ResponseCacheLocation` 枚举 | `Any` / `Client` / `None` → `public` / `private` / `no-cache` | 默认 `None`，但**不写时实际输出 `public`**（实测 p1）。**行为反直觉，建议永远显式写** |
| `NoStore` | `bool` | 输出 `no-store` | 默认 `false` |
| `VaryByHeader` | `string` | 加 `Vary: xxx` 头 | 默认 `null`，不加 Vary |
| `VaryByQueryKeys` | `string[]` | 让缓存按查询串区分 | 默认 `null`。**只在响应缓存中间件下有效** |

> **`ResponseCacheAttribute` 是什么？** `Microsoft.AspNetCore.Mvc` 命名空间里的特性，本质是 MVC 的一个**筛选器**（`ResponseCacheFilter`），在 Action 执行后往响应头里写 `Cache-Control`。**它只写头，不缓存任何东西**——真正缓存的是**浏览器**（或 P121 的中间件）。
>
> **`ResponseCacheLocation` 枚举是什么？** 三个值代表"缓存允许存在哪里"：`Any`（公共地方都能存）、`Client`（只有客户端）、`None`（不允许缓存，必须回源验证）。**它只是给 `Cache-Control` 取的一个"别名"，因为头里的写法太难记。**

**手写响应头（不用特性，任何场景都能用）：**

```csharp
[HttpGet("p9")]
public string P9()
{
    Response.Headers.CacheControl = "public,max-age=120";
    return "p9";
}
```

**✅ 实测输出：`Cache-Control: public,max-age=120`**

> **为什么有时候必须手写？** 因为 `[ResponseCache]` 只能表达式"整个响应用一个固定值"。而 `s-maxage`、`stale-while-revalidate`、`immutable` 这些指令，**特性根本没给你属性**——只能手拼字符串。
>
> **`Response.Headers["Cache-Control"]` 和 `Response.Headers.CacheControl` 有什么区别？** 后者是强类型扩展（在 `Microsoft.AspNetCore.Http` 里，通过 `IHeaderDictionary` 的扩展属性访问），本质是 `Response.Headers["Cache-Control"] = value` 的语法糖。**用哪个都行，写错了字符串不会报错——这是它唯一的缺点。**

## 5. `Vary`、`private`、`public` 的三个真实坑

**坑 1：带用户信息的接口忘了 `private` → 用户 A 看到用户 B 的数据。**

```csharp
// ❌ 危险
[HttpGet("my-books")]
[ResponseCache(Duration = 60)]     // → public,max-age=60
public async Task<IActionResult> MyBooks() { ... }   // 但里面读的是当前登录用户！
```

**为什么危险？** `public` 意味着 **CDN / 公司代理 / 任何中间缓存都可以存**。第一个用户 A 请求完，代理把"用户 A 的我的图书"存起来，**接下来 60 秒内所有访问这个 URL 的人都拿到 A 的数据**。

```csharp
// ✅ 正确
[HttpGet("my-books")]
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Client)]   // → private
// 或者干脆
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]    // → no-store
```

**判断标准：这个响应里有没有任何一个字节是"因用户而异"的？有 → 必须 `private` 或 `no-store`。**

**坑 2：`Vary` 忘了写 → 中英文/桌面手机拿到同一份。**

`Vary` 的意思是"**这个响应的内容会根据这些请求头变化，缓存时请把这些头也算进缓存键**"。

```csharp
// 你的接口返回的语言取决于 Accept-Language
[HttpGet("books")]
[ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any, VaryByHeader = "Accept-Language")]
// → Vary: Accept-Language
```

**不写会怎样：** 第一个中文用户请求完，缓存里存了中文版本，**英文用户来了也拿到中文**。

| 常见 Vary 值 | 为什么 | 不写的后果 |
|---|---|---|
| `Accept-Language` | 多语言站点 | 语言串台 |
| `Accept-Encoding` | gzip / br 压缩不同 | 压缩格式错乱（通常服务器自动处理） |
| `User-Agent` | 移动端返回精简版 | 手机拿到 PC 版 |
| `Cookie` | **不要用**！Cookie 几乎每个请求都不同 → 缓存命中率 0 | —— |

**坑 3：`public` + `Authorization` 头 → 共享缓存默认拒绝存。**

HTTP 规范规定：**带 `Authorization` 头的请求，共享缓存（CDN/代理）默认不许缓存响应**，除非你显式写 `public` 或 `s-maxage`。

**这个规则经常被误解成"加了认证就不能缓存"，其实不是。** 正确做法：

```csharp
// 公共数据（所有登录用户看到的都一样）→ 可以缓存，但必须显式 public
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
// 显式 public 后，共享缓存才愿意存"带认证的公共数据"
```

**但你项目现在**（`UseAuthorization()` 已开、还没接认证）**其实没这问题。等批次 17 接了 JWT 之后再回来看这一段。**

## 6. 前端 `fetch` 与缓存（你做前后端分离一定会遇到）

**浏览器缓存是"默认开启"的，这意味着你的 `fetch` 可能拿到**上一次的旧数据**，然后你会以为是后端 bug。**

| 场景 | 你应该写的 | 为什么 |
|---|---|---|
| 普通列表 / 详情（可以旧一点） | `fetch(url)`（默认） | 让浏览器按响应头自己决定 |
| 用户点了"刷新"按钮 | `fetch(url, { cache: 'no-cache' })` | **绕过强缓存，但仍可 304**（省带宽） |
| 提交后立刻要最新数据 | `fetch(url, { cache: 'no-store' })` | 完全绕过缓存 |
| 离线可用 / 资源文件 | `fetch(url, { cache: 'force-cache' })` | 有就用，不管新旧 |
| **调试时怀疑缓存** | `fetch(url, { cache: 'reload' })` | 跳过缓存但会更新缓存 |

**三种 `fetch` 缓存模式和 `Cache-Control` 的关系：**

| fetch cache 值 | 会读本地副本吗 | 会发请求吗 | 会更新本地副本吗 |
|---|---|---|---|
| `default` | 按响应头 | 按响应头 | 是 |
| `no-store` | ❌ 不读 | ✅ 必发 | ❌ 不写 |
| `no-cache` | 读，但必须验证 | ✅ 必发（带 If-None-Match） | 是 |
| `reload` | ❌ 不读 | ✅ 必发（不带验证头） | 是 |
| `force-cache` | ✅ 有就用 | 没有才发 | 是 |

**你项目里最实用的一条：调试接口时永远加这个。**

```js
// 开发期：别让浏览器缓存烦你
const res = await fetch(`/api/query/books?page=${page}`, { cache: 'no-store' });
```

> **DevTools 网络面板的三个标识，见到要认识：**
> - `200 (from memory cache)` — 从**内存**里拿的（同一个标签页内，最快）
> - `200 (from disk cache)` — 从**硬盘**里拿的（跨标签页、跨重启）
> - `304 Not Modified` — **发请求了**，服务器说没变
>
> **看到前两个，说明你的强缓存生效了；看到第三个，说明协商缓存生效了；看到 200 且 Size 是真实大小，说明每次都在回源。**

## P121 · 1. 服务器端响应缓存怎么开

**两行代码，就这两行：**

```csharp
builder.Services.AddResponseCaching();   // ① 注册服务
...
app.UseResponseCaching();                // ② 挂到管线上（必须在 MapControllers 之前）
app.MapControllers();
```

**它的工作原理：**

```
请求进来
   │
   ▼
UseResponseCaching 中间件
   │  ① 这个请求"可缓存"吗？（GET/HEAD？没有 Authorization？没有 Cookie？…）
   │  ② 可缓存 → 去内存字典里找 (method + path + 查询串) 的副本
   │        ├── 找到 → 直接把副本写回响应，★ 后面的管线和 Controller 都不执行
   │        └── 没找到 → 放行
   ▼
Controller 执行，产生响应
   │
   ▼
中间件看响应头：有 Cache-Control: public,max-age>0 吗？状态码是 200 吗？有 Set-Cookie 吗？
   │  都满足 → 把整个响应（头 + body）复制一份存进内存
   ▼
返回给客户端
```

**关键点：它是"用空间换时间"的中间件，缓存在 .NET 进程的堆内存里。**

| 配置项（`ResponseCachingOptions`） | 默认值 | 含义 |
|---|---|---|
| `SizeLimit` | **100 MB** | 整个缓存最多占多少内存 |
| `MaximumBodySize` | **64 MB** | 单个响应最大多大（超过就不缓存） |
| `UseCaseSensitivePaths` | `false` | 路径是否大小写敏感 |

## 2. 它到底能缓存什么（我用七种场景实测了）

**课程说它"鸡肋"，但没给出证据。我把它当黑盒测了一遍，结论如下（.NET 10 实测）：**

**测试方法：接口返回"当前时间戳"，调用两次，看时间戳是否相同。相同 = 命中缓存，不同 = 未缓存。**

| # | 场景 | 实测结果 | 结论 |
|---|---|---|---|
| c1 | 普通 GET + `public,max-age=60` | 两次时间戳**相同** | ✅ **会缓存** |
| c2 | 有查询串 `?a=1` / `?a=2`，配了 `VaryByQueryKeys="*"` | `a=1` 和 `a=2` 返回**不同**内容 | ✅ 按查询串分开缓存 |
| c3 | 有查询串 `?a=1` / `?a=2`，**没配** `VaryByQueryKeys` | **`a=2` 返回了 `a=1` 的内容** | ❌ **串数据！这是最致命的坑** |
| c4 | 响应里写 `Set-Cookie` | 两次时间戳**不同** | ❌ 不缓存 |
| c5 | POST 请求 | 两次时间戳**不同** | ❌ 不缓存（只支持 GET/HEAD） |
| c6 | 返回 404 | 两次时间戳**不同** | ❌ 不缓存（**只有 200 才进**） |
| c7 | `no-store` 的接口 | 两次时间戳**不同** | ✅ 尊重 no-store（不缓存） |
| c8 | 请求带 `Authorization` 头 | 两次时间戳**不同** | ❌ **不缓存**（认证请求一律跳过） |
| c9 | 请求带 `Cookie` 头（无 Authorization） | **拿到了 c1 早先缓存的那份** | ❌ **会命中"别人的"缓存** |

**c3 和 c9 这两行，是我认为最重要的两个发现，逐条解释：**

**c3：不写 `VaryByQueryKeys`，查询串被忽略。**

```
GET /rc2/c3?a=1  → 缓存写入 key = "/rc2/c3"（查询串没进 key！）
GET /rc2/c3?a=2  → 命中 key "/rc2/c3" → 返回 a=1 的数据
```

**这意味着：如果你的分页接口 `?page=1` 和 `?page=2` 都没配 `VaryByQueryKeys`，第二页会返回第一页的数据。** 这不是"性能问题"，这是**功能性 bug**，而且只在开了中间件的服务器上出现——本地单测完全测不出来。

**c9：缓存键里没有 Cookie，所以"没登录的请求"会命中"登录用户的缓存"。**

```
1. 匿名请求 /rc2/c1  → 缓存写入（key 只有路径）
2. 带 Cookie 请求 /rc2/c1 → 命中同一份 → 拿到"匿名那份"
```

**反过来说更可怕：如果第一个请求是登录用户 A，第二个是登录用户 B（都带 Cookie、都没有 Authorization 头），B 会拿到 A 的数据。** 现实中的老系统大量用 Cookie + Session 认证，**正好落在这个坑里**。

## 3. 老师为什么说它"鸡肋"（七条理由，逐条对证据）

**"鸡肋" = 食之无味，弃之可惜。它确实能用，但在真实架构里几乎总被别的东西替代。**

| # | 理由 | 我实测到的证据 | 有多致命 |
|---|---|---|---|
| 1 | **只支持 GET/HEAD** | c5：POST 完全不缓存 | 中（查询接口够用） |
| 2 | **只缓存 200** | c6：404 不缓存 | 低（可以接受） |
| 3 | **带 Authorization / Set-Cookie 一律不缓存** | c4、c8 | **高**（现代 API 全带 JWT） |
| 4 | **默认忽略查询串，必须手动配 `VaryByQueryKeys`** | c3：`a=2` 拿到 `a=1` | **致命**（会串数据，且难发现） |
| 5 | **缓存键不含 Cookie，会跨用户命中** | c9 | **致命**（数据越权） |
| 6 | **只在单进程内存里：重启即失、多实例各存各的** | 无 API 可查，但设计如此 | **高**（一上负载均衡就废） |
| 7 | **没有任何"主动失效"的 API** | 翻遍 `IResponseCache`/中间件，找不到 Remove | **致命**（数据改了只能等 TTL） |

**第 6 条展开：为什么"多实例"直接判死刑。**

```
无缓存的部署（3 台服务器）：
   用户 → 负载均衡 → 服务器 1/2/3，每次可能不同，但结果一致

开了 ResponseCaching 的部署（3 台服务器）：
   用户 → 负载均衡 → 服务器 1（缓存了旧数据）
                    → 服务器 2（缓存了另一份旧数据）
                    → 服务器 3（刚重启，没缓存）
   ★ 同一个用户刷新 3 次，可能看到 3 个不同版本
   ★ 更糟：你在服务器 1 上改了数据，服务器 2 的缓存还在，用户看到的就是"改了没生效"
```

**第 7 条展开：这是"鸡肋"的核心理由。**

`IMemoryCache` 有 `Remove(key)`，你能主动删。**`ResponseCaching` 中间件没有任何删除接口**——它把缓存藏在内部，你连 key 长什么样都不知道。

**所以：只要你的数据会变（几乎所有的都会变），你就只能靠 `max-age` 到期。** 而 `max-age` 短了没意义，长了就是"改了不生效"。

**这就是它叫"鸡肋"的真正原因：**

> **一个你无法主动失效的缓存，在业务系统里等于"定时炸弹"。**
> 它适合"永远不变"的资源（图片、字体、JS），而这些资源**根本不需要用中间件缓存**——静态文件中间件和 CDN 早就做了，而且做得更好。

## 4. .NET 7+ 的 `OutputCache`：不是鸡肋的版本

**老师讲的是 `ResponseCaching`（.NET Core 1.0 时代的设计）。.NET 7 加了 `OutputCache`，补上了"能失效"这个致命短板。**

```csharp
// ① 注册
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(b => b.Expire(TimeSpan.FromSeconds(30)));   // 默认策略
    options.AddPolicy("books", b => b
        .Expire(TimeSpan.FromSeconds(60))
        .SetVaryByQuery("page", "pageSize", "keyword")   // 按这些查询参数区分★
        .Tag("books"));                                   // ★ 打标签，方便批量失效
});

// ② 挂管线（在 UseRouting 之后、MapControllers 之前）
app.UseOutputCache();
app.MapControllers();

// ③ 用
[HttpGet("books")]
[OutputCache(PolicyName = "books")]
public async Task<IActionResult> GetBooks(...) { ... }
```

**关键差异（和 `ResponseCaching` 对比）：**

| | `ResponseCaching`（P121 老师讲的） | `OutputCache`（.NET 7+） |
|---|---|---|
| 命名空间 | `Microsoft.AspNetCore.ResponseCaching` | `Microsoft.AspNetCore.OutputCaching` |
| 按查询串区分 | 要手写 `VaryByQueryKeys`，忘了就串数据 | **`SetVaryByQuery("*")` 或列参数名**，API 更安全 |
| **主动失效** | ❌ **没有** | ✅ **`IOutputCacheStore.EvictByTagAsync("books")`** |
| 存储位置 | 只支持内存 | **可换 Redis**（`AddStackExchangeRedisOutputCache`） |
| 缓存键包含 | 路径 + 你配的 Vary 项 | **默认含方法 + 路径 + 查询串（更符合直觉）** |
| 管线上位置 | `UseResponseCaching` | `UseOutputCache`（必须在 `UseRouting` 之后） |

**主动失效长这样（这才是能上生产的版本）：**

```csharp
[HttpPost("books")]
public async Task<IActionResult> Create(BookDto dto, [FromServices] IOutputCacheStore store)
{
    _ctx.Books.Add(...);
    await _ctx.SaveChangesAsync();

    // ★ 一键干掉所有带 "books" 标签的缓存 —— ResponseCaching 做不到这件事
    await store.EvictByTagAsync("books", default);

    return Ok();
}
```

> **`IOutputCacheStore` 是什么？** 输出缓存的"存储后端"抽象，核心方法就两个：`GetAsync(key)` / `SetAsync(...)`，外加一个 `EvictByTagAsync(tag)`。**换成 Redis 时你只改注册那一行，业务代码不动**——这就是"抽象成接口"的价值。
>
> **`EvictByTagAsync` 是什么？** 按"标签"批量删缓存。你在策略里 `.Tag("books")` 打标记，所有命中这个策略的响应缓存都带同一个标签，**写操作后一次性清掉全部相关缓存**。

**⚠️ 但注意：`OutputCache` 也不是银弹。** 它同样默认缓存在进程内存，同样在多实例下"各存各的"——**要多实例共享，必须换成 Redis**（`AddStackExchangeRedisOutputCache`）。**这一点在批次 14 的 P127（分布式缓存）会讲透。**

> **一句话对比：**
> **`ResponseCaching` = 只写头 + 只读内存 + 不能失效 → 鸡肋。**
> **`OutputCache` = 能配策略 + 能打标签 + 能主动失效 + 能换 Redis → 可用。**
> **你的新项目直接用 `OutputCache`，不要用 `ResponseCaching`。**

## 5. 现实中缓存该放在哪

**一张"该放哪"的决策表，比任何理论都好用：**

| 数据特征 | 放哪 | 用什么实现 |
|---|---|---|
| 图片、JS、CSS、字体（内容不变） | **CDN + 浏览器** | 文件名带 hash + `max-age=31536000, immutable` |
| 全站公共、变化极少（分类树、字典表） | **Nginx / CDN**（`proxy_cache`） | `s-maxage=3600` |
| 单次查询贵、结果集小、允许旧几十秒 | **应用内存** | `IMemoryCache`（P122） |
| 多实例要共享同一份 | **Redis** | `IDistributedCache`（批次 14） |
| 必须绝对实时（余额、库存） | **哪都别放** | 直接查库 + 索引 |

**为什么"应用内存"永远排在"Nginx"后面？**

因为**一个缓存键在 Nginx 上只存 1 份，在 10 台应用服务器上要存 10 份**，而且这 10 份的过期时间、内容可能都不一样（就是上面第 6 条说的问题）。

> **工程上的朴素原则：能靠外层的，不要靠内层的。** 缓存能放在 CDN 就别放 Nginx，能放 Nginx 就别放应用内存，能放应用内存就别每次都查库。

---

## P122 · 1. `IMemoryCache` 是什么

**一句话：一个"带过期时间的、线程安全的、就放在你自己进程堆里的 `ConcurrentDictionary`"。**

**它在你项目里的位置：**

```
你的 .NET 进程
├── 堆内存
│   ├── 你的对象
│   ├── EF Core 的 ChangeTracker
│   └── ★ IMemoryCache 里的字典（键 → 值 + 过期信息）
└── 线程池
```

```csharp
builder.Services.AddMemoryCache();     // 就这一行
```

**注册之后，`IMemoryCache` 就是一个 Singleton**（注意：这是 P117 的知识点——它活得和应用一样久，所以它能真正"跨请求"缓存）。

| 服务 | 生命周期 | 谁注册的 | 能跨请求吗 |
|---|---|---|---|
| `BookContext` | Scoped | 你 `AddDbContext` | ❌ |
| `IMemoryCache` | **Singleton** | `AddMemoryCache()` | ✅ |
| `ILogger<T>` | Singleton | 框架 | ✅ |
| `IConfiguration` | Singleton | 框架 | ✅ |

> **这张表回答了你在上一批留下的第一个问题：为什么 `BookContext` 每请求一个、`IMemoryCache` 全局一个？**
> 因为 DbContext 有状态（ChangeTracker），共享会串数据、会并发崩；`IMemoryCache` 设计上就是线程安全 + 带过期，天然可以共享。**"能不能共享"取决于"有没有请求级状态"，不取决于"重不重"。**

## 2. 五个 API（够用一辈子）

```csharp
public interface IMemoryCache : IDisposable
{
    bool TryGetValue(object key, out object? value);   // ① 取，取不到返回 false
    ICacheEntry CreateEntry(object key);               // ② 创建条目（底层用，日常不用）
    void Remove(object key);                           // ③ 删
}
```

**注意：接口上只有三个方法。你天天用的 `Set` / `Get` / `GetOrCreate` 全是扩展方法**（在 `CacheExtensions` 里）。这就是为什么你 `using Microsoft.Extensions.Caching.Memory;` 之后就能用。

| API | 签名 | 行为 | 什么时候用 |
|---|---|---|---|
| `TryGetValue` | `bool TryGetValue(object key, out object? value)` | 有就 true，没有就 false。**不抛异常** | 想自己控制"没有时怎么办" |
| `TryGetValue<T>` | `bool TryGetValue<T>(object key, out T? value)` | 泛型版，省一次强转 | **日常首选** |
| `Set` | `T? Set<T>(object key, T value)` / 带 `MemoryCacheEntryOptions` 重载 | 有则覆盖，无则新增 | 简单地"存一下" |
| `Get<T>` | `T? Get<T>(object key)` | 没有返回 `default` | 少用（无法区分"没缓存"和"缓存了 null"） |
| **`GetOrCreate<T>`** | `T GetOrCreate<T>(object key, Func<ICacheEntry, T> factory)` | 有就返回，没有就**执行工厂并缓存** | **最常用** |
| **`GetOrCreateAsync<T>`** | `Task<T> GetOrCreateAsync<T>(object key, Func<ICacheEntry, Task<T>> factory)` | 异步版 | **Web 里首选**（里面要查库） |
| `Remove` | `void Remove(object key)` | 删掉，**立刻失效** | 写操作后主动清缓存 |

**最常用的三个，写成一句话：**

```csharp
// ① 最简单的"存"
_cache.Set("books:all", list);

// ② 带过期
_cache.Set("books:all", list, TimeSpan.FromMinutes(5));

// ③ 查不到就查库并缓存（★ 99% 的场景用这个）
var list = await _cache.GetOrCreateAsync("books:all", async entry =>
{
    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
    return await _ctx.Books.AsNoTracking().ToListAsync();
});
```

> **`GetOrCreateAsync<T>` 的工厂参数为什么是 `Func<ICacheEntry, Task<T>>` 而不是 `Func<Task<T>>`？**
> 因为**过期策略必须在"创建条目的那一刻"设**。框架把 `ICacheEntry` 递给你，让你顺手配过期时间——这是"一次调用干两件事"的设计。**如果你只用 `Func<Task<T>>` 重载，就没法设置过期时间，条目会永远不过期（因为默认没有过期）**——这是个很隐蔽的坑。

## 3. `ICacheEntry` 的七个属性（过期策略全在这）

```csharp
public interface ICacheEntry : IDisposable
{
    object Key { get; }
    object? Value { get; set; }
    DateTimeOffset? AbsoluteExpiration { get; set; }             // ① 绝对时间点
    TimeSpan? AbsoluteExpirationRelativeToNow { get; set; }      // ② 从现在起多久
    TimeSpan? SlidingExpiration { get; set; }                    // ③ 滑动窗口
    long? Size { get; set; }                                     // ④ 占多少"尺寸"
    CacheItemPriority Priority { get; set; }                     // ⑤ 内存紧张时先删谁
    IList<IChangeToken> ExpirationTokens { get; }                // ⑥ 外部信号触发失效
    IList<PostEvictionCallbackRegistration> PostEvictionCallbacks { get; } // ⑦ 被删时回调
}
```

| 属性 | 类型 | 作用 | 典型值 |
|---|---|---|---|
| `AbsoluteExpiration` | `DateTimeOffset?` | **到期时间点**。设成过去的时间 = 立刻失效 | `DateTimeOffset.Now.AddHours(1)` |
| `AbsoluteExpirationRelativeToNow` | `TimeSpan?` | 从现在起多久到期（**和上面二选一**，更常用） | `TimeSpan.FromMinutes(5)` |
| `SlidingExpiration` | `TimeSpan?` | **多久没人访问就失效**，每次访问续期 | `TimeSpan.FromMinutes(20)` |
| `Size` | `long?` | 条目"尺寸"（单位你自己定：字节/条数/权重都行） | `1` 或 `json.Length` |
| `Priority` | `CacheItemPriority` | `Low` / `Normal` / `High` / `NeverRemove` | 重要数据用 `High` |
| `ExpirationTokens` | 集合 | 挂一个 `IChangeToken`，它"变了"条目就失效 | 配置文件变更、`CancellationToken` |
| `PostEvictionCallbacks` | 集合 | 条目被淘汰时回调（诊断/清理副作用） | 打印淘汰原因 |

> **`IChangeToken` 是什么？** 一个"变更通知"抽象：`HasChanged`（是否已变）+ `RegisterChangeCallback(...)`（变了叫我）。`IOptionsMonitor`、文件监视、`CancellationToken` 都能包装成它。**它的价值：让缓存"随外部资源变化自动失效"，不用你手动 `Remove`。** 批次 14 的配置热更新会再用到。

## 4. 三条硬边界（决定它能不能用）

**这三条是你选型时必须先回答的：**

| # | 边界 | 后果 | 什么时候必须换 Redis |
|---|---|---|---|
| 1 | **进程内**：数据在你自己进程的堆里 | 多实例部署时，每台机器各存一份 | **部署 > 1 个实例** |
| 2 | **重启即失**：进程一死，缓存全没 | 重启后第一波请求全部回源（可能打崩数据库） | 不能接受"冷启动冲击" |
| 3 | **占你自己的内存**：抢的是应用的内存 | 缓存太多 → GC 压力 → 甚至 OOM | 缓存数据 > 几百 MB |

**第 1 条的具体表现：**

```
3 台服务器，各存各的：
   请求 → 服务器 1（缓存了"图书列表 v1"）
   请求 → 服务器 2（缓存了"图书列表 v2"）
   用户刷新 3 次，看到 3 个版本 ← 这就是"缓存不一致"的来源

Redis 方案：
   3 台服务器 → 同一个 Redis → 只有一份缓存 → 永远一致
```

**第 2 条的具体表现（这个最容易被忽视）：**

```
应用重启（发版 / 崩溃 / IIS 回收）
   ↓
缓存全空
   ↓
假设你的首页有 500 QPS，缓存命中时数据库 10 QPS
   ↓
重启后 10 秒内：500 QPS 全打到数据库（每台实例都是）
   ↓
数据库连接池耗尽 → 全部 500 错误 ← "雪崩"
```

> **这叫"缓存雪崩"（P125 的主题）。** 现在只需要知道：**内存缓存的"重启即失"不是小毛病，是架构上的风险点。** 缓存的预热、分批过期、限流，都是为它准备的。

## 5. `SizeLimit` 与"压缩淘汰"（一个我实测过的坑）

**默认情况下，`IMemoryCache` 没有容量上限**——你能塞多少塞多少，直到进程 OOM。

想设上限：

```csharp
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = 1024;                    // 总"尺寸"上限
    options.CompactionPercentage = 0.25;         // 超限时一次性清掉 25%
    options.ExpirationScanFrequency = TimeSpan.FromMinutes(1);  // 每分钟扫一次过期项
});
```

**⚠️ 但我实测到一个必须知道的坑：一旦设了 `SizeLimit`，每个条目都必须显式给 `Size`，否则直接抛异常。**

**实测代码：**

```csharp
builder.Services.AddMemoryCache(o => o.SizeLimit = 100);

_c.Set("a", "v");    // 没给 Size
```

**实测结果：**

```
System.InvalidOperationException:
Cache entry must specify a value for Size when SizeLimit is set.
   at Microsoft.Extensions.Caching.Memory.MemoryCache.SetEntry(CacheEntry entry)
```

**而给了 `Size` 就正常：**

```csharp
_c.Set("b", "v", new MemoryCacheEntryOptions { Size = 10 });   // ✅ 成功
```

**这条异常来自 `MemoryCache.SetEntry`，只要开了上限就一定抛。所以：**

| 你设了 `SizeLimit` 吗 | 必须做的事 |
|---|---|
| 没设（默认） | 什么都不用管，`Set(key, value)` 就行 |
| 设了 | **每一个 `Set` / 每一个 `GetOrCreate` 里都要给 `Size`**，漏一个就 500 |

**"尺寸"的单位是自定义的**（框架不知道你存的是 byte 还是条数）：

```csharp
// 方案 A：按"条数"算（简单，够用）
entry.Size = 1;

// 方案 B：按"字节"算（精确，但要自己估）
entry.Size = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(value).Length;
```

> **`CompactionPercentage` 是什么？** 超限时"一次性压缩多少比例"。0.25 表示超限后立刻删掉 25% 的条目。**为什么不精确删到刚好不超？** 因为精确删要每次比较所有条目，成本 O(n)；批量删是 O(1) 摊还——**性能优先于精确度，这是缓存的通用取舍。**

## 6. 缓存键的设计（这一节决定你的缓存会不会串数据）

**缓存键就是"这份数据是谁"。键设计错了，缓存会变成 bug 制造机。**

**❌ 三种典型错误：**

```csharp
// 错误 1：键太粗 —— 分页的参数没进键
_cache.Set("books", page1Data);    // 用户翻到第 2 页 → 还是第 1 页的数据

// 错误 2：键太细 —— 把"当前时间"塞进键
_cache.Set($"books:{DateTime.Now:HHmmss}", data);   // 每秒一个新键，命中率 0，内存爆掉

// 错误 3：键不带"版本" —— 表结构改了，旧缓存还在
_cache.Set("books:all", oldShapeData);   // 你给 Book 加了字段，缓存里的还是旧对象
```

**✅ 正确的键设计：`模块:实体:维度=值:...:版本`**

```csharp
// 分页 + 筛选：把所有影响结果的参数都放进去（顺序固定！）
string BuildKey(int page, int pageSize, string? keyword)
    => $"query:books:p{page}:s{pageSize}:kw={keyword ?? "-"}:v3";

// 单条详情
string BuildKey(long id) => $"query:book:id={id}:v3";

// 统计报表
const string StatsByCategoryKey = "query:stats:by-category:v3";
```

| 要点 | 为什么 |
|---|---|
| **所有影响结果的参数都要进键** | 漏一个就串数据（= P121 的 c3 那个坑，只是发生在你自己的代码里） |
| **参数顺序固定** | 否则 `p1:s10` 和 `s10:p1` 是两个键，命中率减半 |
| **空值要有占位符**（`kw=-`） | 否则 `kw=null` 和 `kw=`（空串）会撞键 |
| **结尾带版本号 `v3`** | 改了数据结构/逻辑，改个数字就让全部旧缓存自然作废，**不用写清理代码** |
| **键要短** | 键本身占内存；用 `s10` 而不是 `pageSize=10` |

> **`v3` 这个技巧的真实价值**：你上线改了 `BookListItem` 的结构，如果缓存里还是旧结构，反序列化会炸或者字段全空。**改个版本号，所有旧键立刻"不存在"**，等它们自然过期就行。**这是最便宜的"缓存迁移"方案。**

## 7. 线程安全与"缓存击穿"（`GetOrCreate` 的一个隐藏事实）

**`IMemoryCache` 本身是线程安全的**（内部用 `ConcurrentDictionary` + 锁）。但——

**`GetOrCreate` 不是"原子"的：工厂可能被并发执行多次。**

```
100 个线程同时请求 key = "stats:by-category"
        ↓
所有线程都发现"缓存里没有"
        ↓
★ 100 个线程同时执行工厂（100 次 GROUP BY 查询）★
        ↓
只有最后一个 Set 生效，其他 99 次的查询结果被丢弃
```

**这就是"缓存击穿"（P124 的主题）。它的危害不是"数据错"，是"数据库在缓存失效的瞬间被 100 个并发查询打爆"。**

**三种解法（先知道，下一批细讲）：**

| 方案 | 做法 | 代价 |
|---|---|---|
| **加锁**（单例锁 / `SemaphoreSlim`） | 只有第一个线程查库，其他等它写缓存 | 并发度降低，要防死锁 |
| **逻辑过期** | 缓存里存"过期时间字段"，过期后异步刷新，先返回旧数据 | 实现复杂 |
| **热点数据永不过期 + 后台刷新** | 定时任务主动刷 | 需要后台服务（批次 18 讲） |

**现在只需要记住一句：`GetOrCreate` 保证"最终有一份缓存"，不保证"工厂只执行一次"。**

## P123 · 1. 绝对过期 vs 滑动过期

**两种策略，语义完全不同：**

| | 绝对过期（Absolute） | 滑动过期（Sliding） |
|---|---|---|
| 语义 | **从"写入那一刻"算，到点就死** | **从"最后一次访问"算，多久没人碰就死** |
| 属性 | `AbsoluteExpirationRelativeToNow` | `SlidingExpiration` |
| 有人一直访问会怎样 | **照样到期** | **永远不到期** |
| 像什么 | 牛奶的保质期（印在盒子上） | 酒店房间（有人住就不退） |
| 适合 | 数据有明确"新鲜度"要求 | 数据"用了就还有用"（会话、字典表） |
| 风险 | 无（最安全） | **可能永不释放** |

```csharp
// 绝对过期：5 分钟后一定失效，不管被访问多少次
_cache.Set(key, value, TimeSpan.FromMinutes(5));

// 滑动过期：20 分钟没人访问才失效
_cache.Set(key, value, new MemoryCacheEntryOptions
{
    SlidingExpiration = TimeSpan.FromMinutes(20)
});
```

> **注意 `_cache.Set(key, value, TimeSpan)` 这个重载是"绝对过期"，不是"存活 5 分钟且可续期"。** 很多人误以为是滑动——**因为重载长得太像了，这是 API 设计的一个坑。**

## 2. 滑动过期的"永不过期"陷阱（我实测了）

**这是 P123 最重要的一个现象，我用 2 秒的滑动窗口验证了一遍：**

```csharp
[HttpGet("slide")]
public string Slide()
{
    var v = _cache.GetOrCreate("s", entry =>
    {
        entry.SlidingExpiration = TimeSpan.FromSeconds(2);   // 2 秒没人访问就过期
        return "born " + DateTime.Now.ToString("HH:mm:ss.fff");
    });
    return v!;
}
```

**✅ 实测（每 1.5 秒访问一次，共 4 次）：**

| 第几次 | 时间间隔 | 返回内容 | 说明 |
|---|---|---|---|
| 1 | — | `born 19:59:53.637` | 首次创建 |
| 2 | 1.5s | `born 19:59:53.637` | **还是同一个**（续期了） |
| 3 | 1.5s | `born 19:59:53.637` | 还是同一个 |
| 4 | 1.5s | `born 19:59:53.637` | 还是同一个 |
| 5 | **停 4 秒** | `born 20:00:02.507` | **终于过期重建** |

**结论：只要访问间隔 < 滑动窗口，这份数据就永远不会过期。** 4 次访问跨度 **4.5 秒**，早就超过 2 秒的窗口，但它一次都没死。

**为什么这是陷阱？**

| 场景 | 后果 |
|---|---|
| 首页热数据用滑动过期 | **永远不刷新** → 用户永远看到"三个月前"的首页 |
| 用户会话用滑动过期 | 正常（这就是想要的效果） |
| 缓存内存用滑动过期 | **热点 key 永不释放**，内存只涨不降 |

**这条和"缓存穿透/雪崩"是同一类问题的两面：**

> **滑动过期适合"用一次还该继续留着"的数据（会话、字典），绝不适合"必须定期刷新"的数据（列表、报表）。**
> **后者必须用绝对过期，或者"滑动 + 绝对上限"（下一节）。**

## 3. 组合：滑动续期 + 绝对上限（最稳的写法）

**`MemoryCacheEntryOptions` 允许两个一起设，语义是：**

> **"每次访问都续期，但无论如何不超过这个绝对时间点。"**

```csharp
var options = new MemoryCacheEntryOptions
{
    SlidingExpiration = TimeSpan.FromMinutes(5),                     // 5 分钟没人用 → 死
    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)          // 无论如何 1 小时后 → 死
};
```

**效果（用时间轴看）：**

```
写入 ────────────────────────────────────────────────────────►
 │  访问   访问   访问        访问   ← 每次访问把"死亡线"往后推
 ▼    ▼     ▼      ▼           ▼
 0   3min  6min   9min       40min        60min
                                      ▲
                                      └── 绝对上限到了，强制死
```

**这就是"会话缓存""热点数据缓存"的标准写法：**

| 数据 | SlidingExpiration | AbsoluteExpirationRelativeToNow | 理由 |
|---|---|---|---|
| 用户会话 | 30 分钟 | **12 小时** | 活跃就续，但最多一天必须重新登录 |
| 图书详情 | 10 分钟 | **1 小时** | 热门书不重复查库，但一小时必须看到新数据 |
| 分类字典 | 30 分钟 | **6 小时** | 字典极少变，但也不能永远不刷 |

> **口诀：滑动管"冷热"，绝对管"新旧"。** 只写滑动 → 永远不刷新；只写绝对 → 冷数据占着内存不走。**两个一起才是完整答案。**

## 4. 过期时间该设多长（用公式，不拍脑袋）

**别猜。用一个可算的公式：**

```
TTL ≈ (能容忍的最大陈旧时间) × 0.5
```

**为什么乘 0.5？** 因为最坏情况下，数据刚改完、缓存刚写完，**下一次刷新要等满一个 TTL**。所以 TTL 必须比"业务能忍的上限"小一半。

| 业务要求 | 能忍的最大陈旧 | TTL 取值 |
|---|---|---|
| 图书列表（改书名延迟可接受） | 10 分钟 | **5 分钟** |
| 分类字典（一天改一次） | 60 分钟 | **30 分钟** |
| 销量排行（老板要看实时） | 5 分钟 | **2 分钟** |
| 库存（不能忍） | 0 | **不缓存** |

**第二个约束：命中率。TTL 太短，命中率就崩。**

| 接口 QPS | TTL | 缓存条目平均存活 | 命中率（粗略） |
|---|---|---|---|
| 10 QPS | 5 分钟 | 300 次访问后被淘汰 | **> 99%** |
| 0.1 QPS（10 秒一次） | 30 秒 | 3 次访问后淘汰 | **~66%** |

**规律：`TTL × QPS` 就是"一个缓存条目能服务多少次请求"。这个乘积 < 3，缓存基本没用。**

> **所以低频接口（比如"后台管理页的统计"）加缓存是没意义的**——你设 5 分钟 TTL，5 分钟内可能一次访问都没有，每次都是未命中。**这就是"该不该加缓存"的判断公式：`QPS × TTL > 3` 才值得加。**

## 5. 淘汰原因 `EvictionReason`（诊断必备）

**条目"消失"有五种原因，分清才能对症下药：**

```csharp
entry.PostEvictionCallbacks.Add(new PostEvictionCallbackRegistration
{
    EvictionCallback = (key, value, reason, state) =>
        Console.WriteLine($"key={key} 被淘汰，原因={reason}")
});
```

| `EvictionReason` | 触发条件 | 说明 |
|---|---|---|
| `Expired` | 到期 | 正常，说明 TTL 在干活 |
| `Removed` | 你调了 `Remove(key)` | 正常，主动失效 |
| `Replaced` | 同一个 key 被 `Set` 覆盖 | 正常，更新 |
| `Capacity` | 超出 `SizeLimit` 被压缩掉 | ⚠️ **容量不够，说明要么调大上限，要么键设计有问题** |
| `TokenExpired` | `ExpirationTokens` 里的信号变了 | 正常，外部驱动失效 |
| `None` | 没原因（极少） | 忽略 |

> **`PostEvictionCallbackRegistration` 是什么？** 一个"回调注册"对象，只有 `EvictionCallback`（`Action<object key, object? value, EvictionReason reason, object? state>`）和 `State` 两个字段。**这是你观察缓存行为的唯一窗口——线上排查"缓存为什么没了"，全靠它。**
>
> **⚠️ 回调是在后台线程异步执行的**，不要在回调里做耗时操作，也不要指望它同步执行完。

**实践中最有用的用法：把 `Capacity` 打到日志里。**

```csharp
if (reason == EvictionReason.Capacity)
    _logger.LogWarning("缓存容量不足，key={Key} 被淘汰", key);
```

**看到这条日志变多，说明你的缓存正在"自我拆台"——刚存进去就被挤掉，命中率可能接近 0。**

## 6. 缓存与数据库的一致性：Cache-Aside 四种写法

**这是缓存的"最后一公里"，也是面试最爱问的。**

**四种写法，按"错误率"从高到低排：**

| # | 写法 | 顺序 | 问题 | 评价 |
|---|---|---|---|---|
| 1 | 先删缓存，再更新数据库 | `Remove → UPDATE` | 删完还没更新完，读请求又把**旧值**读回缓存 → **缓存里永久是旧值** | ❌ 最差 |
| 2 | **先更新数据库，再删缓存** | `UPDATE → Remove` | 极端并发下仍可能脏（但概率极低） | ✅ **业界标准** |
| 3 | 先更新数据库，再更新缓存 | `UPDATE → Set` | 两个写请求并发，**后更新数据库的可能先更新缓存** → 缓存永久错 | ❌ 不推荐 |
| 4 | 延迟双删 | `Remove → UPDATE → (等 500ms) → Remove` | 能修补写法 1 的窗口，但要多删一次 | ⚠️ 补丁，非首选 |

**为什么"先更新数据库再删缓存"是标准答案？看这个时序：**

```
写法 2（正确）
时间 →
请求A(写)：UPDATE 数据库(新值) ────────► Remove 缓存
请求B(读)：          │ 读到旧值(可能) │ 写回缓存(旧值!) ← 有空窗
                     ▼                ▼
                 这个空窗里 B 可能把旧值写进缓存
                 但 A 的 Remove 在 B 之后执行 → 旧值被删掉 ✅
```

```
写法 1（错误）
请求A(写)：Remove 缓存 ─────────────► UPDATE 数据库(新值)  ← 间隔很长
请求B(读)：      │ 未命中，查库(旧值) │
                 ▼                    ▼
              B 把旧值写进缓存，而 A 的 UPDATE 已经完成
              → ★ 缓存里永久是旧值，再也删不掉了 ★
```

**关键洞察：**

> **"删缓存"要放在"更新数据库之后"，因为"删"是幂等且轻量的操作，越晚做越安全。**
> **而"更新缓存"（写法 3）会出现"两个写请求乱序"的问题，因为更新缓存不是幂等的。**

**落到你的代码里（`price-up` 那个接口）：**

```csharp
[HttpPost("books/price-up")]
public async Task<IActionResult> PriceUp(long? authorId, double percent)
{
    await _ctx.Books.Where(...).ExecuteUpdateAsync(s => s.SetProperty(...));  // ① 先改库

    _cache.Remove("query:stats:by-category:v3");    // ② 再删缓存
    _cache.Remove("query:stats:by-author:v3");
    // 或者用 P121 讲的 tag 批量失效（OutputCache）

    return Ok();
}
```

**⚠️ 但注意：删缓存只能删"你知道的键"。** 如果键里带分页参数（`p1:s10`、`p2:s10`…），你根本枚举不完。**这时候两种解法：**

| 解法 | 做法 | 代价 |
|---|---|---|
| **版本号法**（简单粗暴） | 键里带 `v3`，写操作后把版本号改成 `v4`（存内存里） | 所有旧键立刻作废，但旧键要等 TTL 才释放内存 |
| **短 TTL 兜底**（最省事） | TTL 设短（30 秒），接受"最多旧 30 秒" | 业务要能忍 |

> **实务建议：分页/筛选类接口，别做精确失效，直接"短 TTL + 版本号"。** 精确失效的复杂度会吃掉缓存带来的所有收益。

## 7. 抖动（jitter）——下一批"雪崩"的伏笔

**问题：如果你有 100 个缓存条目，都在同一时刻写入，TTL 都是 5 分钟，会发生什么？**

```
00:00  100 个条目同时写入
05:00  ★ 100 个条目同时过期 ★
05:00  100 个请求同时回源 → 数据库瞬间承受 100 倍压力
```

**这叫"缓存雪崩"（P125）。最便宜的解法：给 TTL 加随机抖动。**

```csharp
// 基础 5 分钟，上下浮动 20%（4–6 分钟）
var jitter = Random.Shared.Next(-60, 60);   // ±60 秒
var ttl = TimeSpan.FromMinutes(5) + TimeSpan.FromSeconds(jitter);
entry.AbsoluteExpirationRelativeToNow = ttl;
```

**效果：**

```
无抖动：  05:00 05:00 05:00 05:00 ... ← 同一秒全部过期
有抖动：  04:12 04:37 05:03 05:41 ... ← 分散在一分钟内，数据库压力摊平
```

> **`Random.Shared` 是什么？** .NET 6 新增的**线程安全**的全局 `Random` 实例。**以前必须 `new Random()` 存成静态字段并加锁，否则并发时可能返回全 0；现在直接用 `Random.Shared` 就行。**（这是个很容易被考的小知识点。）

**这一节只需要记住结论，P125 会完整展开雪崩、穿透、击穿三个问题及其解法。**

---

==二：格式==

## P117 · 服务注册骨架（三种生命周期 + 工厂重载）

```csharp
// Program.cs —— 注册阶段，只登记不做 IO
var builder = WebApplication.CreateBuilder(args);

// ① 类注册自己（无接口）
builder.Services.AddSingleton<ProbeSingleton>();

// ② 接口 → 实现（最常用）
builder.Services.AddScoped<IBookService, BookService>();
builder.Services.AddTransient<IReportBuilder, ReportBuilder>();

// ③ 工厂重载：需要手工装配时用
builder.Services.AddScoped<IBookService>(sp =>
{
    var ctx = sp.GetRequiredService<BookContext>();
    var cache = sp.GetRequiredService<IMemoryCache>();      // Singleton，随便拿
    return new BookService(ctx, cache);
});

// ④ 开放泛型：一个注册服务所有 T
builder.Services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));

// ⑤ 注册"已存在的实例"（单例，必须自己管生命周期）
var cfg = new CacheOptions { TtlSeconds = 60 };
builder.Services.AddSingleton(cfg);

// ⑥ Keyed Service（.NET 8+）
builder.Services.AddKeyedScoped<IPayService, AliPayService>("alipay");

var app = builder.Build();   // ← 之后 builder.Services 再改就不生效了
```

## P117 · 注入骨架（五个位置各一份）

```csharp
// ① Controller 构造函数（首选）
public class BookController : ControllerBase
{
    private readonly IBookService _svc;
    public BookController(IBookService svc) => _svc = svc;
}

// ② Action 参数（少用）
[HttpGet] public IActionResult A([FromServices] IMemoryCache cache) => Ok();

// ③ 中间件：构造函数只注 Singleton
public class TimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TimingMiddleware> _log;
    public TimingMiddleware(RequestDelegate next, ILogger<TimingMiddleware> log)
    { _next = next; _log = log; }

    // Scoped 只能放这里
    public async Task InvokeAsync(HttpContext ctx, BookContext db)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        await _next(ctx);
        _log.LogInformation("{Path} {Ms}ms", ctx.Request.Path, sw.ElapsedMilliseconds);
    }
}
// 注册：app.UseMiddleware<TimingMiddleware>();

// ④ Filter：构造函数只能 Singleton，或改用 [ServiceFilter]
public class MyFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext ctx)
    {
        var db = ctx.HttpContext.RequestServices.GetRequiredService<BookContext>();  // Scoped 只能这样拿
    }
    public void OnActionExecuted(ActionExecutedContext ctx) { }
}

// ⑤ 后台服务：用 IServiceScopeFactory 自己开 Scope
public class Worker : BackgroundService
{
    private readonly IServiceScopeFactory _f;
    public Worker(IServiceScopeFactory f) => _f = f;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var scope = _f.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BookContext>();
        // ...
    }
}
```

## P118 · 各项目自己注册（扩展方法）

```csharp
// BookStore.Core/ServiceCollectionExtensions.cs
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BookStore.Core;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddBookStoreCore(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.TryAddScoped<IBookService, BookService>();
        services.TryAddScoped<IAuthorService, AuthorService>();
        services.Configure<CacheOptions>(configuration.GetSection("Cache"));
        return services;
    }
}
```

```csharp
// Program.cs —— 三行搞定整个应用
builder.Services
    .AddBookStoreInfra(builder.Configuration)
    .AddBookStoreCore(builder.Configuration)
    .AddBookStoreApi();
```

## P118 · 程序集扫描骨架

```csharp
public static IServiceCollection AddServicesFromAssembly(
    this IServiceCollection services, Assembly assembly, string suffix = "Service")
{
    foreach (var impl in assembly.GetTypes()
                 .Where(t => t is { IsClass: true, IsAbstract: false } && t.Name.EndsWith(suffix)))
    {
        var faces = impl.GetInterfaces().Where(i => i.Name == "I" + impl.Name).ToArray();
        if (faces.Length == 0) services.TryAddScoped(impl);
        foreach (var f in faces) services.TryAddScoped(f, impl);
    }
    return services;
}
```

## P120 · `[ResponseCache]` 三种 Location

```csharp
// ① 公共数据（所有人一样）：public,max-age=60
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]

// ② 用户私有（浏览器可存，代理不许）：private,max-age=60
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Client)]

// ③ 必须回源验证：no-cache,max-age=60
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.None)]

// ④ 完全不许存：no-store
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]

// ⑤ 按请求头区分：public,max-age=60 + Vary: Accept-Language
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any, VaryByHeader = "Accept-Language")]
```

## P120 · 手写响应头（特性表达不了的指令）

```csharp
[HttpGet("books")]
public IActionResult Get()
{
    // s-maxage 只给 CDN 看，max-age 给浏览器看
    Response.Headers.CacheControl = "public,max-age=60,s-maxage=600,must-revalidate";
    // 静态资源（文件名带 hash）可以激进
    // Response.Headers.CacheControl = "public,max-age=31536000,immutable";
    return Ok(data);
}
```

## P120 · 协商缓存（ETag → 304）骨架

```csharp
[HttpGet("books/{id:long}")]
public async Task<IActionResult> Get(long id)
{
    var dto = await _ctx.Books.Where(b => b.Id == id).Select(...).FirstOrDefaultAsync();
    if (dto == null) return NotFound();

    // 用内容算一个"指纹"（生产环境建议用强哈希 + 只对关键字段算）
    var etag = $"\"{dto.GetHashCode():X}\"";
    Response.Headers.ETag = etag;
    Response.Headers.CacheControl = "public,max-age=60";

    // 浏览器第二次来会带 If-None-Match
    if (Request.Headers.IfNoneMatch == etag)
        return StatusCode(StatusCodes.Status304NotModified);   // ★ 无 body

    return Ok(dto);
}
```

## P121 · ResponseCaching 开启（不推荐新项目用）

```csharp
builder.Services.AddResponseCaching();          // ①
...
app.UseResponseCaching();                       // ② 必须在 MapControllers 之前
app.MapControllers();
```

```csharp
// 必须显式写 VaryByQueryKeys，否则 ?a=1 和 ?a=2 会串数据（实测）
[HttpGet("books")]
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "*" })]
public IActionResult Get(int page = 1) { ... }
```

## P121 · OutputCache 开启（新项目用这个）

```csharp
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(b => b.Expire(TimeSpan.FromSeconds(30)));
    options.AddPolicy("books", b => b
        .Expire(TimeSpan.FromSeconds(60))
        .SetVaryByQuery("page", "pageSize", "keyword")
        .Tag("books"));
});
...
app.UseOutputCache();      // 在 UseRouting 之后、MapControllers 之前
app.MapControllers();
```

```csharp
// 用（Controller 上）
[HttpGet("books")]
[OutputCache(PolicyName = "books")]
public IActionResult Get(...) { ... }

// 主动失效（写操作后）
await store.EvictByTagAsync("books", default);
```

## P122 · `IMemoryCache` 基本用法

```csharp
builder.Services.AddMemoryCache();   // Singleton
```

```csharp
public class BookQueryService
{
    private readonly IMemoryCache _cache;
    private readonly BookContext _ctx;
    public BookQueryService(IMemoryCache cache, BookContext ctx)
    { _cache = cache; _ctx = ctx; }

    // ① TryGetValue + Set（手动控制）
    public async Task<List<Book>> GetAllAsync()
    {
        if (_cache.TryGetValue("books:all:v1", out List<Book>? cached))
            return cached!;

        var list = await _ctx.Books.AsNoTracking().ToListAsync();
        _cache.Set("books:all:v1", list, TimeSpan.FromMinutes(5));
        return list;
    }

    // ② GetOrCreateAsync（推荐）
    public Task<List<Book>> GetAll2Async()
        => _cache.GetOrCreateAsync("books:all:v1", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return await _ctx.Books.AsNoTracking().ToListAsync();
        })!;

    // ③ 主动删
    public void Invalidate() => _cache.Remove("books:all:v1");
}
```

## P122 · 带完整选项的 `Set`

```csharp
_cache.Set(key, value, new MemoryCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5),
    SlidingExpiration = TimeSpan.FromMinutes(2),
    Size = 1,                                     // ★ 设了 SizeLimit 就必须给
    Priority = CacheItemPriority.High,
    PostEvictionCallbacks =
    {
        new PostEvictionCallbackRegistration
        {
            EvictionCallback = (k, v, reason, s) =>
                Console.WriteLine($"{k} 淘汰: {reason}")
        }
    }
});
```

## P123 · 滑动 + 绝对（推荐写法）

```csharp
var options = new MemoryCacheEntryOptions
{
    SlidingExpiration = TimeSpan.FromMinutes(5),        // 5 分钟没人用就死
    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)   // 最多活 1 小时
};
```

## P123 · 带抖动的过期（防雪崩）

```csharp
public static TimeSpan WithJitter(TimeSpan baseTtl, double ratio = 0.2)
{
    var offset = baseTtl.TotalSeconds * ratio;
    var delta = Random.Shared.NextDouble() * 2 * offset - offset;   // [-offset, +offset]
    return baseTtl + TimeSpan.FromSeconds(delta);
}

entry.AbsoluteExpirationRelativeToNow = WithJitter(TimeSpan.FromMinutes(5));
```

## P123 · Cache-Aside（先改库，再删缓存）

```csharp
public async Task UpdatePriceAsync(long id, double price)
{
    await _ctx.Books.Where(b => b.Id == id)
        .ExecuteUpdateAsync(s => s.SetProperty(b => b.Price, price));   // ① 先改库

    _cache.Remove($"query:book:id={id}:v1");                            // ② 再删缓存
    _cache.Remove("query:stats:by-category:v1");
}
```

---

==三：代码==

## 3.1 生命周期实验控制器（完整可跑，10 分钟出结论）

**这是 P117 的实验，比看十遍文字有用。**

**第一步：三个探针服务（新建 `Probes.cs`）**

```csharp
namespace Demo;

public class ProbeTransient { public Guid Id { get; } = Guid.NewGuid(); }
public class ProbeScoped    { public Guid Id { get; } = Guid.NewGuid(); }
public class ProbeSingleton { public Guid Id { get; } = Guid.NewGuid(); }
```

| 符号 | 说明 |
|---|---|
| `Guid.NewGuid()` | 生成一个全局唯一标识，用来判断"是不是同一个对象" |
| `{ get; }` 只读属性 + 初始化器 | 对象一创建就定死 ID，之后改不了 |
| `namespace Demo;` | 文件范围命名空间（P98 学的），整个文件都属于 `Demo` |

**第二步：注册（`Program.cs`）**

```csharp
using Demo;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();

builder.Services.AddTransient<ProbeTransient>();
builder.Services.AddScoped<ProbeScoped>();
builder.Services.AddSingleton<ProbeSingleton>();

var app = builder.Build();
app.MapControllers();
app.Run();
```

**第三步：控制器**

```csharp
using Microsoft.AspNetCore.Mvc;

namespace Demo;

[ApiController]
[Route("api/lifetime")]
public class LifetimeController : ControllerBase
{
    private readonly ProbeTransient _t1;
    private readonly ProbeTransient _t2;      // 故意注两次
    private readonly ProbeScoped _s1;
    private readonly ProbeSingleton _g1;
    private readonly IServiceProvider _sp;

    public LifetimeController(ProbeTransient t1, ProbeTransient t2,
                              ProbeScoped s1, ProbeSingleton g1, IServiceProvider sp)
    {
        _t1 = t1; _t2 = t2; _s1 = s1; _g1 = g1; _sp = sp;
    }

    [HttpGet]
    public object Get()
    {
        var t3 = _sp.GetRequiredService<ProbeTransient>();
        var s2 = _sp.GetRequiredService<ProbeScoped>();

        return new
        {
            Transient_ctor1 = _t1.Id,
            Transient_ctor2 = _t2.Id,
            Transient_manual = t3.Id,
            Scoped_ctor = _s1.Id,
            Scoped_manual = s2.Id,
            Singleton = _g1.Id,
            t1_eq_t2 = _t1.Id == _t2.Id,          // 期望 false
            s_eq = _s1.Id == s2.Id                // 期望 true
        };
    }
}
```

**第四步：连点两次，对照结果**

| 字段 | 第 1 次请求 | 第 2 次请求 | 结论 |
|---|---|---|---|
| `Transient_ctor1` vs `ctor2` | 不同 | 不同 | **每次注入都新建** |
| `Scoped_ctor` vs `Scoped_manual` | **相同** | **不同**（跨请求变了） | **同请求共享，跨请求隔离** |
| `Singleton` | 固定 | **和上次完全相同** | **全应用唯一** |
| `t1_eq_t2` | `false` | `false` | — |
| `s_eq` | `true` | `true` | — |

> **这个实验的价值**：以后别人跟你说"Scoped 是每个请求一个"，你脑子里浮现的是这五列数字，而不是一句背诵。

## 3.2 Captive Dependency 现场（我实测：开发环境**启动就炸**）

**我照下面这样注册，然后 `dotnet run`，应用根本没起来：**

```csharp
public class DepScoped { public Guid Id { get; } = Guid.NewGuid(); }

public class BadSingleton
{
    public DepScoped Dep { get; }
    public BadSingleton(DepScoped dep) => Dep = dep;   // 单例要 Scoped
}

// Program.cs
builder.Services.AddScoped<DepScoped>();
builder.Services.AddSingleton<BadSingleton>();
```

**✅ 实测输出（完整原文）：**

```
Unhandled exception. System.AggregateException: Some services are not able to be constructed
(Error while validating the service descriptor
 'ServiceType: RCacheTest.BadSingleton Lifetime: Singleton ImplementationType: RCacheTest.BadSingleton':
 Cannot consume scoped service 'RCacheTest.DepScoped' from singleton 'RCacheTest.BadSingleton'.)
   at Microsoft.Extensions.DependencyInjection.ServiceLookup.CallSiteValidator.VisitCallSite(...)
   at Microsoft.Extensions.DependencyInjection.ServiceProvider.ValidateService(ServiceDescriptor descriptor)
   at Microsoft.AspNetCore.Builder.WebApplicationBuilder.Build()
   at Program.<Main>$(String[] args) in Program.cs:line 9
```

**注意三点（都很有教学价值）：**

1. **报错发生在 `Build()`**，不是"第一次请求时"——因为开发环境会在建容器时**预校验**所有注册项
2. **异常类型是 `AggregateException`**，里面包着真正的 `InvalidOperationException`——看日志要往里翻
3. **消息里明确指名道姓**：`Cannot consume scoped service 'X' from singleton 'Y'`——**看到这句就知道是捕获依赖，不用猜**

**⚠️ 但同一份代码，把环境切成 Production 就不会报错了：**

```csharp
// 模拟生产环境
ASPNETCORE_ENVIRONMENT=Production dotnet run
```

**为什么？** 因为 `ValidateScopes` 只在 Development 默认开启。**生产环境它不校验，应用正常启动，然后在第一次并发请求时炸 `A second operation was started on this context`，或者内存慢慢涨爆。这就是"本地好好的，上线就炸"的经典形态。**

**三种修复（照抄）：**

```csharp
// 修复 1：消费者也改成 Scoped（最常用）
builder.Services.AddScoped<BadSingleton>();

// 修复 2：消费者保持 Singleton，但通过工厂按需开 Scope
public class FixedSingleton
{
    private readonly IServiceScopeFactory _f;
    public FixedSingleton(IServiceScopeFactory f) => _f = f;

    public Guid GetId()
    {
        using var scope = _f.CreateScope();
        return scope.ServiceProvider.GetRequiredService<DepScoped>().Id;   // 每次新的
    }
}

// 修复 3：换成不依赖 Scoped 的实现（最理想）
public class GoodSingleton
{
    private readonly IMemoryCache _cache;    // Singleton
    public GoodSingleton(IMemoryCache cache) => _cache = cache;
}
```

## 3.3 三层项目注册：`AddBookStore()` 完整骨架（可直接抄）

**目录结构：**

```
BookStore.sln
├── BookStore.Core/          业务层（实体 + 接口 + 服务）
│   └── ServiceCollectionExtensions.cs
├── BookStore.Infra/         数据层（DbContext + EF 配置 + 仓储）
│   └── ServiceCollectionExtensions.cs
└── BookStore.Web/           Web 层（Controller + Program.cs）
    └── Program.cs
```

**`BookStore.Infra/ServiceCollectionExtensions.cs`**

```csharp
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
                   ?? throw new InvalidOperationException("缺少连接串 ConnectionStrings:Default");

        services.AddDbContext<BookContext>(opt => opt
            .UseSqlServer(conn)
            .LogTo(Console.WriteLine, LogLevel.Information)
            .EnableSensitiveDataLogging());

        services.TryAddScoped(typeof(IRepository<>), typeof(EfRepository<>));
        services.AddMemoryCache();   // 缓存属于基础设施，放这一层

        return services;
    }
}
```

**`BookStore.Core/ServiceCollectionExtensions.cs`**

```csharp
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BookStore.Core;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddBookStoreCore(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.TryAddScoped<IBookService, BookService>();
        services.TryAddScoped<IAuthorService, AuthorService>();
        services.TryAddScoped<IStatsService, StatsService>();

        // 配置项用 Options 模式（P129 详讲）
        services.Configure<CacheOptions>(configuration.GetSection("Cache"));

        return services;
    }
}

// 缓存配置的强类型
public class CacheOptions
{
    public int StatsTtlSeconds { get; set; } = 300;
    public int ListTtlSeconds  { get; set; } = 60;
}
```

**`appsettings.json`**

```json
{
  "ConnectionStrings": {
    "Default": "Server=(localdb)\\MSSQLLocalDB;Database=BookDemo;Trusted_Connection=True"
  },
  "Cache": {
    "StatsTtlSeconds": 300,
    "ListTtlSeconds": 60
  }
}
```

**`BookStore.Web/Program.cs`（最终形态，10 行）**

```csharp
using BookStore.Core;
using BookStore.Infra;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddBookStoreInfra(builder.Configuration)    // 数据层
    .AddBookStoreCore(builder.Configuration);    // 业务层

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

**⚠️ 两个必踩的坑（提前说）：**

| 坑 | 现象 | 解法 |
|---|---|---|
| 类库没装 `Microsoft.Extensions.DependencyInjection.Abstractions` | `IServiceCollection` 找不到 | 类库要引这个包（`AddDbContext` 等需要完整包） |
| `using Microsoft.Extensions.DependencyInjection;` 写漏 | 扩展方法 `AddScoped` 找不到 | **扩展方法靠命名空间引入**，不是靠类名 |

## 3.4 给你项目的真实缓存服务（`BookStatsCache`）

**目标：把 `stats/by-category`、`stats/by-author` 加上缓存，改动最小。**

**新建 `Services/BookStatsCache.cs`：**

```csharp
using System.Text.Json;
using ASP.NET_Core__图书管理系统.Data;
using ASP.NET_Core__图书管理系统.Models.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace ASP.NET_Core__图书管理系统.Services;

public class BookStatsCache
{
    private readonly BookContext _ctx;
    private readonly IMemoryCache _cache;
    private readonly ILogger<BookStatsCache> _log;

    // ★ 键常量集中管理，避免手写字符串拼错
    private const string KeyByCategory = "query:stats:by-category:v1";
    private const string KeyByAuthor   = "query:stats:by-author:v1";
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    public BookStatsCache(BookContext ctx, IMemoryCache cache, ILogger<BookStatsCache> log)
    {
        _ctx = ctx; _cache = cache; _log = log;
    }

    public async Task<List<CategoryStat>> GetByCategoryAsync()
    {
        // ① 先查缓存（用泛型版，省一次强转）
        if (_cache.TryGetValue(KeyByCategory, out List<CategoryStat>? cached))
        {
            _log.LogDebug("缓存命中 {Key}", KeyByCategory);
            return cached!;
        }

        // ② 未命中 → 回源（复用你 QueryController 里那段 GROUP BY 逻辑）
        var rows = await _ctx.Books
            .AsNoTracking()                        // ★ 只读查询必须加，省掉跟踪开销
            .GroupBy(b => b.CategoryId)
            .Select(g => new { CategoryId = g.Key, Cnt = g.Count(), Avg = g.Average(b => b.Price), Max = g.Max(b => b.Price) })
            .ToListAsync();

        var names = await _ctx.Categories.AsNoTracking().ToDictionaryAsync(c => c.Id, c => c.Name);

        var result = rows.OrderByDescending(r => r.Cnt).Select(r => new CategoryStat
        {
            CategoryId = r.CategoryId,
            CategoryName = r.CategoryId == null ? "（未分类）"
                         : names.GetValueOrDefault(r.CategoryId.Value, "（分类已删除）"),
            Cnt = r.Cnt,
            AvgPrice = r.Avg,
            MaxPrice = r.Max
        }).ToList();

        // ③ 写缓存
        _cache.Set(KeyByCategory, result, Ttl);
        return result;
    }

    /// <summary>写操作后调用：让统计缓存立刻失效</summary>
    public void Invalidate()
    {
        _cache.Remove(KeyByCategory);
        _cache.Remove(KeyByAuthor);
    }
}
```

| 符号 | 为什么必须写 |
|---|---|
| `AsNoTracking()` | 只读查询不需要跟踪，**省内存 + 快 10–30%**。你项目里 `StatsByCategory` 的第一段查询没加，可以顺手补上 |
| `ILogger<BookStatsCache>` | 泛型日志，`T` 决定日志分类名。**排查"到底命中没命中"全靠它** |
| `TryGetValue<T>(key, out T? value)` | 有返回值就说明命中，**比 `Get<T>()` 好**（`Get` 无法区分"没缓存"和"缓存了 null"） |
| `private const string` | 键写一次，删的时候复用，**不会因为打错字导致删不掉** |
| `_log.LogDebug` | 用 Debug 级别，生产环境默认不输出，**排查时把日志级别调到 Debug 就能看到命中率** |

**改 `Program.cs` 一行：**

```csharp
builder.Services.AddMemoryCache();
builder.Services.AddScoped<BookStatsCache>();
```

**改 `QueryController`（最小改动）：**

```csharp
private readonly BookStatsCache _stats;                 // 加字段
public QueryController(BookContext ctx, BookStatsCache stats) { _ctx = ctx; _stats = stats; }

[HttpGet("stats/by-category")]
public async Task<ActionResult<List<CategoryStat>>> StatsByCategory()
    => Ok(await _stats.GetByCategoryAsync());           // 三行变一行
```

**改 `price-up`（写操作后失效）：**

```csharp
[HttpPost("books/price-up")]
public async Task<ActionResult<object>> PriceUp(long? authorId = null, double percent = 10)
{
    // ... 原来的涨价逻辑 ...

    _stats.Invalidate();    // ★ 加了这一行，涨价后统计立刻是新的
    return Ok(new { affected, percent });
}
```

> **这就是"缓存落地"的完整闭环**：读的时候 `TryGetValue → 回源 → Set`，写的时候 `Remove`。**少了最后那步 Remove，你的统计就会"永远差 5 分钟"。**

## 3.5 带抖动的缓存帮助类（批次 14 的预告版）

**这是 P123 的实战封装。批次 14 的 P126 会写更完整的版本，但你现在就可以用这个。**

```csharp
using Microsoft.Extensions.Caching.Memory;

namespace ASP.NET_Core__图书管理系统.Services;

public static class CacheExtensions
{
    /// <summary>
    /// 取缓存；没有就执行工厂并缓存。自动给 TTL 加 ±20% 抖动，防止集体过期。
    /// </summary>
    public static async Task<T> GetOrCreateWithJitterAsync<T>(
        this IMemoryCache cache,
        string key,
        TimeSpan baseTtl,
        Func<Task<T>> factory,
        double jitterRatio = 0.2)
    {
        if (cache.TryGetValue(key, out T? cached) && cached is not null)
            return cached;

        var value = await factory();

        cache.Set(key, value, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = WithJitter(baseTtl, jitterRatio)
        });

        return value;
    }

    private static TimeSpan WithJitter(TimeSpan ttl, double ratio)
    {
        var offset = ttl.TotalSeconds * ratio;                    // 0.2 → ±20%
        var delta = Random.Shared.NextDouble() * 2 * offset - offset;
        return ttl + TimeSpan.FromSeconds(delta);
    }
}
```

**用法：**

```csharp
var stats = await _cache.GetOrCreateWithJitterAsync(
    "query:stats:by-author:v1",
    TimeSpan.FromMinutes(5),
    () => _ctx.Books.AsNoTracking().GroupBy(...).Select(...).ToListAsync());
```

**为什么 `cached is not null` 这个判断要留着？**

因为**如果工厂返回过 `null`，缓存里就真的存了一个 `null`**（我实测过：`GetOrCreate` 存 null 之后，泛型和非泛型的 `TryGetValue` **都返回 `true`**）。留着这个判断，可以让"缓存了 null"也当作未命中处理——**这正是批次 14 "缓存穿透"要讨论的取舍。**

> **⚠️ 这个帮助类仍然不是线程安全的**：100 个并发未命中 → 100 次工厂调用。**P124 的"缓存击穿"和 P126 的封装会解决它。**

## 3.6 响应缓存实验室（复现我上面所有实测结论）

**把这套代码建到一个空项目里，10 分钟能亲眼看到 P120/P121 的所有行为。**

**① 项目（`dotnet new web`）+ `Program.cs`：**

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddResponseCaching();        // ← 注释掉这两行，p8 会 500
var app = builder.Build();
app.UseResponseCaching();                     // ← 注释掉这两行，c3 会串数据
app.MapControllers();
app.Run();
```

**② `CacheLabController.cs`（P120 响应头实验）：**

```csharp
using Microsoft.AspNetCore.Mvc;

namespace Lab;

[ApiController]
[Route("rc")]
public class CacheLabController : ControllerBase
{
    [HttpGet("p1")] [ResponseCache(Duration = 60)]
    public string P1() => "p1";

    [HttpGet("p3")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Client)]
    public string P3() => "p3";

    [HttpGet("p4")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.None)]
    public string P4() => "p4";

    [HttpGet("p5")] [ResponseCache(NoStore = true)]
    public string P5() => "p5";

    [HttpGet("p6")] [ResponseCache(Location = ResponseCacheLocation.Any)]   // 无 Duration → 500
    public string P6() => "p6";

    [HttpGet("p7")] [ResponseCache(Duration = 60, VaryByHeader = "User-Agent")]
    public string P7() => "p7";

    [HttpGet("p8")] [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "*" })]
    public string P8() => "p8";
}
```

**③ `MiddlewareLabController.cs`（P121 中间件实验，用时间戳判定命中）：**

```csharp
using Microsoft.AspNetCore.Mvc;

namespace Lab;

[ApiController]
[Route("rc2")]
public class MiddlewareLabController : ControllerBase
{
    private static string Now() => DateTime.Now.ToString("HH:mm:ss.fff");

    [HttpGet("c1")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    public string C1() => $"c1 {Now()}";

    [HttpGet("c2")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "*" })]
    public string C2(string? a) => $"c2 a={a} {Now()}";

    [HttpGet("c3")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]   // ★ 没配 VaryByQueryKeys
    public string C3(string? a) => $"c3 a={a} {Now()}";

    [HttpGet("c4")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    public string C4() { Response.Cookies.Append("probe", "1"); return $"c4 {Now()}"; }

    [HttpPost("c5")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    public string C5() => $"c5 {Now()}";

    [HttpGet("c6")] [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    public IActionResult C6() => NotFound($"c6 {Now()}");
}
```

**④ 验证脚本（Git Bash 直接跑，`5099` 换成你的端口）：**

```bash
B=http://127.0.0.1:5099

echo "== P120: 响应头 =="
for p in p1 p3 p4 p5 p6 p7 p8; do
  echo "--- $p"; curl -s -D - -o /dev/null "$B/rc/$p" | grep -i "^HTTP\|^cache-control\|^vary"
done

echo "== P121: 命中判定（看时间戳）=="
echo "c1 两次:"; curl -s "$B/rc2/c1"; echo; curl -s "$B/rc2/c1"; echo
echo "c3 不同查询串:"; curl -s "$B/rc2/c3?a=1"; echo; curl -s "$B/rc2/c3?a=2"; echo
echo "c4 带 Set-Cookie:"; curl -s "$B/rc2/c4"; echo; curl -s "$B/rc2/c4"; echo
echo "c5 POST:"; curl -s -X POST "$B/rc2/c5"; echo; curl -s -X POST "$B/rc2/c5"; echo
echo "c6 404:"; curl -s "$B/rc2/c6"; echo; curl -s "$B/rc2/c6"; echo

echo "== P121: 认证/来源影响 =="
echo "带 Authorization:"; curl -s -H "Authorization: Bearer x" "$B/rc2/c1"; echo
echo "带 Cookie:"; curl -s -H "Cookie: a=1" "$B/rc2/c1"; echo
```

> **⚠️ Windows 上 `curl` 一定要加 `--noproxy '*'`**（你机器上有坏代理，不加会 502）。脚本里我省略了，你跑的时候补上。

**这个实验室的三个"必须亲眼看到"的瞬间：**

| # | 看到什么 | 你会明白什么 |
|---|---|---|
| 1 | `p6`、`p8` 返回 **500** | 特性不是"写错了没用"，是**直接炸** |
| 2 | `c3?a=2` 返回 **`a=1` 的数据** | 响应缓存的键**默认不含查询串**，这是功能性 bug |
| 3 | 带 `Cookie` 的请求拿到**匿名请求的那份** | 缓存键**不含 Cookie**，会跨用户命中 |

## 3.7 把这一批应用到你项目：一次改完（20 分钟）

**按顺序做，每步都能单独验证。**

| # | 改什么 | 文件 | 验证方式 |
|---|---|---|---|
| 1 | 加 `AddMemoryCache()` + `AddScoped<BookStatsCache>()` | `Program.cs` | 启动不报错 |
| 2 | 新建 `BookStatsCache` | `Services/BookStatsCache.cs` | 编译通过 |
| 3 | `QueryController` 注入它，`StatsByCategory` 改成委托调用 | `Controllers/QueryController.cs` | 第一次调用后，第二次立刻返回（控制台看 EF 日志有没有第二次 SQL） |
| 4 | `PriceUp` 末尾加 `_stats.Invalidate()` | 同上 | 涨价后再查统计，**数字变了**（说明失效生效） |
| 5 | 给统计接口加 `[ResponseCache(Duration=10, Location=Client)]` | 同上 | 浏览器 DevTools 看 `Cache-Control: private,max-age=10` |
| 6 | 故意把 `Invalidate()` 注释掉，再涨价一次 | — | **统计还是旧数字** ← 这就是"忘了失效"的真实后果 |

**第 6 步是这一批最重要的实验。** 它不是"验证你做对了"，而是**让你亲眼看到"缓存错了"长什么样**——以后线上出问题，你能一秒想到这个画面。

---

==四：总结==

## 4.1 七节核心结论

| 节 | 一句话结论 |
|---|---|
| **P117** | Web 里的 Scope 就是"一次 HTTP 请求"，`BookContext` 必须 Scoped；**单例只能注单例** |
| **P118** | 每个类库写一个 `AddXxx(this IServiceCollection)`，`Program.cs` 只负责组合；类库内部用 `TryAdd` |
| **P119** | 缓存不是"变快"，是"**承诺数据在 T 时间内不变**"；这个承诺是业务决定 |
| **P120** | `Cache-Control` 六个指令决定浏览器怎么办：`max-age`（多久）、`no-cache`（要问）、`no-store`（别存）、`private`/`public`（谁能存）、`s-maxage`（CDN 专用） |
| **P121** | 服务器端响应缓存"鸡肋"的核心理由：**不能主动失效** + 键不含查询串/Cookie + 只在单进程 |
| **P122** | `IMemoryCache` 是"进程内的带过期字典"，Singleton；**设了 `SizeLimit` 就必须给每个条目 `Size`**（否则抛异常） |
| **P123** | 过期策略：**滑动管冷热，绝对管新旧**；只写滑动 = 永不刷新；加抖动防集体过期 |

## 4.2 生命周期决策表（贴屏幕）

| 你的服务有"请求级状态"吗 | 用它 |
|---|---|
| 有（DbContext、当前用户、请求上下文） | **Scoped** |
| 没有，且想共享缓存/连接池/配置 | **Singleton** |
| 没有，但很轻且用完就丢 | **Transient**（谨慎，别在循环里解析） |

| 消费者 | 能注 Scoped 吗 |
|---|---|
| Controller / 中间件 `InvokeAsync` 参数 / 后台服务的 Scope 内 | ✅ |
| 中间件构造函数 / Filter 构造函数 / Singleton | ❌（开发环境启动就炸） |

## 4.3 `Cache-Control` 速查表

| 指令 | 浏览器 | CDN/代理 | 何时用 |
|---|---|---|---|
| `max-age=60` | 60 秒内直接用 | 同上 | 常态 |
| `s-maxage=600` | 忽略 | **600 秒**（覆盖 max-age） | 想让 CDN 存更久 |
| `no-cache` | **存，但每次要问** | 同上 | 想省带宽但必须实时 |
| `no-store` | **不存** | 不存 | 敏感数据 |
| `private` | 存 | **不许存** | 用户私有数据 |
| `public` | 存 | 存 | 公共数据 |
| `must-revalidate` | 过期后必须验证 | 同上 | 价格/库存 |
| `immutable` | 有效期内连刷新都不发请求 | — | 带 hash 的静态资源 |

**一句话记：**
```
max-age 定长短，no-cache 是要问，no-store 是别存，
private 给浏览器，public 给大家，s-maxage 只给 CDN。
```

## 4.4 三种"响应缓存"对比

| | `[ResponseCache]`（特性） | `ResponseCaching`（中间件） | `OutputCache`（.NET 7+） |
|---|---|---|---|
| 作用 | **只写响应头**，让浏览器存 | 在服务器内存里存整份响应 | 同左，但能配策略 + 能失效 |
| 服务端缓存了吗 | ❌ 没有 | ✅ 有（进程内存） | ✅ 有（内存/Redis） |
| 能主动失效吗 | — | ❌ **不能** | ✅ `EvictByTagAsync` |
| 默认按查询串区分 | — | ❌ **不能，必须配 `VaryByQueryKeys`** | ✅ `SetVaryByQuery("page")` |
| 多实例共享 | — | ❌ 各存各的 | ✅ 挂 Redis 就行 |
| 该不该用 | ✅ **日常都用**（省浏览器请求） | ❌ **别用** | ✅ **要服务端缓存就用它** |

## 4.5 `IMemoryCache` API 速查

| 想干什么 | 写法 |
|---|---|
| 取 | `cache.TryGetValue<T>(key, out var v)` |
| 存（简单） | `cache.Set(key, value, TimeSpan.FromMinutes(5))` ← **绝对过期** |
| 存（全控） | `cache.Set(key, value, new MemoryCacheEntryOptions { ... })` |
| 取不到就造 | `await cache.GetOrCreateAsync(key, async e => { e.AbsoluteExpirationRelativeToNow = ttl; return await Load(); })` |
| 删 | `cache.Remove(key)` |
| 注册 | `builder.Services.AddMemoryCache()`（Singleton） |

## 4.6 过期策略对照

| 策略 | 配置 | 有人一直访问时 | 适合 |
|---|---|---|---|
| 绝对 | `AbsoluteExpirationRelativeToNow = 5min` | **照样 5 分钟死** | 报表、列表（要新鲜） |
| 滑动 | `SlidingExpiration = 5min` | **永远不死** ⚠️ | 会话、字典 |
| 组合 | 两个都写 | 续期但不超过绝对上限 | **推荐默认** |
| 抖动 | `ttl ± 20%` | — | 防集体过期（雪崩） |

## 4.7 记忆口诀

```
DI 三条线：
  单例只能注单例，Scoped 跟着请求走，Transient 注两次就两个

各项目注册：
  this IServiceCollection + TryAdd + return services

缓存位置：
  浏览器 → CDN → Nginx → 应用内存 → 数据库（越前越快越不可控）

六个指令：
  max-age 定长短，s-maxage 给 CDN
  no-cache 能存但要问，no-store 连存都别存
  private 只给浏览器，public 大家都能存

内存缓存：
  进程内、重启丢、SizeLimit 开了必须给 Size

过期：
  滑动管冷热，绝对管新旧；两个一起写，再加点抖动
```

## 4.8 七个高频易错点（都是实测/踩过的）

| # | 易错点 | 正确做法 |
|---|---|---|
| 1 | `[ResponseCache(Location=Any)]` 忘了写 `Duration` | **运行时 500**：`Duration property must be specified`。要么给 Duration，要么 `NoStore=true` |
| 2 | 以为 `Location=None` 是"不缓存" | 它输出 `no-cache`（**要存但每次问**）。真要禁存用 `NoStore=true` |
| 3 | 开了 `ResponseCaching` 却没配 `VaryByQueryKeys` | **`?a=2` 会返回 `?a=1` 的数据**。新项目请直接改用 `OutputCache` |
| 4 | 给"每个用户不同"的接口用了 `public` | CDN 会把 A 的数据发给 B。**必须 `private` 或 `no-store`** |
| 5 | 设了 `SizeLimit` 但 `Set` 时没给 `Size` | 抛 `Cache entry must specify a value for Size when SizeLimit is set` |
| 6 | 只写 `SlidingExpiration` | **数据永不刷新**（实测：每 1.5 秒访问一次，2 秒滑动的项 4.5 秒都没死）。必须配绝对上限 |
| 7 | 单例注了 Scoped（尤其 `DbContext`） | 开发环境 **`Build()` 就崩**，生产环境静默漏内存/并发崩。用 `IServiceScopeFactory` 或改 Scoped |

## 4.9 你下一步可以做的三件事

| # | 做什么 | 预期收获 |
|---|---|---|
| 1 | 跑一遍 3.1 的生命周期实验，连点两次看五个 ID | "三种生命周期"从背诵变成直觉 |
| 2 | 跑一遍 3.6 的响应缓存实验室，**重点看 `c3?a=2`** | 亲眼见到"缓存串数据"，以后一眼能认出这类 bug |
| 3 | 按 3.7 给你项目加 `BookStatsCache`，然后**故意注释掉 `Invalidate()`** | 亲眼见到"缓存不失效"的后果 |

## 4.10 留给下一批的问题（P124–P130）

1. 缓存失效的那一瞬间，1000 个请求同时打到数据库（**击穿**），除了加锁还有什么办法？
2. 有人故意查 `id=-1`（库里根本没有），每次都绕过缓存直查数据库（**穿透**），怎么防？
3. 所有缓存同时过期（**雪崩**），除了抖动，还要做什么？
4. `IMemoryCache` 和 `IDistributedCache` 的 API 长得像吗？换 Redis 要改多少代码？
5. 分布式缓存为什么必须"先序列化"？序列化会带来什么新问题？
6. 配置里的连接串密码，怎么才能不跟着 GitHub 一起泄露？

**这六个问题是"缓存能上生产"的最后一段路。下一批全部是缓存三大问题 + 分布式缓存 + 配置安全。**


