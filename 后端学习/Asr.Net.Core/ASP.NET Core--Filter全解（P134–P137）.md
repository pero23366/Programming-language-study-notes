==零：补充==

> **这一篇（P134–P137）回答一个问题：那些"每个接口都要做、但和业务无关"的事（异常兜底、事务、限流、日志），该写在哪？**

## 它解决什么问题

**你项目里现在的 Controller 长这样（抽象版）：**

```csharp
[HttpPost("books/{id:long}/borrow")]
public async Task<IActionResult> Borrow(long id)
{
    try                                        // ① 异常处理
    {
        _logger.LogInformation("开始借书 {Id}", id);   // ② 日志

        if (_cache.TryGetValue($"borrow:{id}", out _)) // ③ 防重复提交/限流
            return StatusCode(429);

        using var tx = await _ctx.Database.BeginTransactionAsync();  // ④ 事务
        try
        {
            // ... 真正的业务 3 行 ...
            await tx.CommitAsync();
        }
        catch { await tx.RollbackAsync(); throw; }

        return Ok();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "借书失败");
        return StatusCode(500, new { message = "服务器错误" });
    }
}
```

**数一下：①②③④ 加起来 15 行，真正的业务 3 行。**

**更糟的是——你有 20 个接口，这 15 行要抄 20 遍。**

| # | 横切关注点 | 抄 20 遍的后果 |
|---|---|---|
| 1 | 异常兜底 | 有的接口返回 `{message}`，有的返回 `{error}`，前端要写 20 种解析 |
| 2 | 日志 | 有人漏了，出问题查不到 |
| 3 | 限流/防重 | 只在"重要的"接口上有，攻击者专挑没加的那个 |
| 4 | 事务 | **最危险**：漏了一处，数据就写坏了 |

**Filter 就是"把那 15 行从 20 个接口里抽出来，写成一份"。**

## 没有它会怎样（三个真实事故形态）

**事故一：异常格式不统一，前端崩在解析上。**

```js
// 前端统一按 { message } 解析
const err = await res.json();
showToast(err.message);      // 某个接口返回 { error: "..." } → undefined → 弹窗空白
```

**事故二：事务漏了一处。**

```csharp
// 扣库存成功 → 写订单失败（没套事务）→ 库存少了，订单没生成
await _ctx.Books.Where(...).ExecuteUpdateAsync(s => s.SetProperty(b => b.Stock, b => b.Stock - 1));
_ctx.Orders.Add(order);
await _ctx.SaveChangesAsync();     // ← 这一行抛异常，库存已经扣了
```

**事故三：限流加在 Controller 里，然后被绕过。**

```csharp
// 只在 /login 里写了限流
// 但 /register、/reset-password 也是"能枚举用户"的接口 —— 攻击者换一个打
```

**Filter 的价值不是"少写代码"，是"让漏写的可能性下降"。** 加到全局，新接口自动生效。

## 它在整个生态里的位置

**这是理解 Filter 最关键的一张图——它和中间件不是同一层：**

```
请求
 │
 ├─ ① 中间件（Middleware）         ← 整个应用的外壳
 │     UseExceptionHandler / UseAuthentication / UseRateLimiter / UseCors
 │     ★ 拿得到 HttpContext，拿不到 Action 参数
 │     │
 │     ├─ ② 路由（Routing）→ 选中某个 Action
 │     │
 │     ├─ ③ MVC 管线内部 ★ Filter 在这里 ★
 │     │     AuthorizationFilter
 │     │     ResourceFilter
 │     │     模型绑定 / 模型验证
 │     │     ActionFilter（前）
 │     │     ▶ Action 方法
 │     │     ActionFilter（后）
 │     │     ExceptionFilter（出异常时）
 │     │     ResultFilter
 │     │
 │     └─ ④ 响应写回
 │
 └─ 响应
```

| | 中间件 | Filter |
|---|---|---|
| 作用范围 | **所有请求**（含静态文件、404） | **只作用于 MVC 的 Action**（Minimal API 另有端点过滤器） |
| 知道"调用了哪个方法"吗 | ❌ 不知道 | ✅ **知道**（`ActionDescriptor`、参数、返回值） |
| 能做"参数校验/结果加工"吗 | 要自己解析 body | ✅ 天然能 |
| 能改返回值吗 | 只能改响应流 | ✅ 能换 `IActionResult` |

> **一句话：中间件管"请求进出的门"，Filter 管"这次调用本身"。**
> **P143 会专门讲两者的区别（面试必问），这一篇先把 Filter 用熟。**

## 对你个人的实际意义

**（1）这是"代码整洁"里收益最高的一次重构。**

你的 `QueryController` 现在有 8 个接口。**加一个全局异常 Filter + 一个事务 Filter，能删掉几十行重复的 try/catch。**

**（2）对你的游戏服务端，这三样是"上线必需"。**

| Filter | 游戏服务端对应 |
|---|---|
| ExceptionFilter | 玩家操作报错 → 统一返回 `{code, msg}`，**不泄露堆栈** |
| 事务 Filter | 扣道具 + 发奖励 + 写日志，三张表必须一起成功 |
| 限流 Filter | 防刷：抽卡接口、领奖接口、登录接口 |

**（3）位置感：你已经能写"框架级"的代码了。**

| 层次 | 你在哪一批学过 |
|---|---|
| 写业务代码 | 批次 03–06（EF Core） |
| 写接口 | 批次 10–12 |
| 写"给业务用的基础设施"（DI、缓存、配置） | 批次 13–14 |
| **写"给接口用的横切逻辑"（Filter）** | **本篇** |
| 写"给整个应用用的管道"（中间件） | 批次 16 |

**再往后，你写的就不是"功能"，而是"框架"了。**

## 诚实的话：什么时候别用 Filter

**Filter 很容易上瘾，然后写出"三个 Filter 嵌套、调一次接口跑 12 个钩子"的东西。**

| 情况 | 别用 Filter，用什么 |
|---|---|
| **全局异常兜底** | **中间件**（`UseExceptionHandler` / `IExceptionHandler`）——它能兜住 Filter 兜不住的（模型绑定、序列化、Filter 自己抛的） |
| **限流** | .NET 7+ 的 `AddRateLimiter` 中间件（内置、支持分布式、支持队列） |
| **认证** | `UseAuthentication` 中间件，不要自己写 AuthorizationFilter |
| **只是打日志** | 中间件更合适（能拿到完整耗时，包括模型绑定） |
| 单个接口的特殊逻辑 | **直接写在 Action 里**，别为了一处逻辑写个 Filter |

**判断标准：**

> **这段逻辑"对每个 Action 都要做"吗？**
> **是 → Filter（或中间件，看它需不需要知道 Action）。**
> **不是 → 写在业务里。**

---

==一：概念==

## P134 · 1. Filter 的五种阶段与执行顺序（我实测了）

**先看结果，再讲原理。**

**实验代码：一个 ActionFilter 挂两次（Order=1、Order=2）+ 一个 ResultFilter：**

```csharp
[HttpGet("ok")]
[TraceActionFilter(Order = 1)]
[TraceActionFilter(Order = 2)]
[TraceResultFilter]
public string Order() { Trace.Add("★ Action 执行"); return "ok"; }
```

**✅ 实测输出（原文）：**

```
ActionFilter.Executing (Order=1)
ActionFilter.Executing (Order=2)
★ Action 执行
ActionFilter.Executed  (Order=2)
ActionFilter.Executed  (Order=1)
ResultFilter.Executing
ResultFilter.Executed
```

**看出两件事：**

| 现象 | 规则 |
|---|---|
| `Executing` 按 Order **从小到大** | Order=1 在外层（先执行） |
| `Executed` 按 Order **从大到小** | 像"洋葱"，进去的顺序和出来的顺序相反 |

**完整的五种 Filter（按执行先后）：**

| 顺序 | Filter | 接口 | 典型用途 |
|---|---|---|---|
| 1 | **AuthorizationFilter** | `IAuthorizationFilter` | 权限判断（现在用 `[Authorize]` 就够了） |
| 2 | **ResourceFilter** | `IResourceFilter` | **模型绑定之前**就要做的事（缓存整个响应、短路） |
| 3 | **ActionFilter** | `IActionFilter` | 改参数、校验、计时、开事务 |
| 4 | **ExceptionFilter** | `IExceptionFilter` | **只在出异常时**执行 |
| 5 | **ResultFilter** | `IResultFilter` | 加工返回值 / 响应头 |

**⚠️ 还有一个 `IAlwaysRunResultFilter`：即使 Action 被短路，它也会跑。** 适合"无论如何都要加响应头"的场景。

**Order 的完整规则（背这三条）：**

| 规则 | 说明 |
|---|---|
| **Order 小的先执行**（Executing），后结束（Executed） | 同洋葱模型 |
| **不写 Order = 0** | 所以 Order 写负数是"更外层" |
| **同一 Order 时，按 Scope 排** | 全局 → Controller → Action（全局在最外层） |

## P134 · 2. ExceptionFilter 到底能捕获什么（这是本篇最该记住的一节）

**网上很多文章说"ExceptionFilter 能捕获所有异常"——这是错的。我实测了六种情况：**

| # | 异常从哪来 | ExceptionFilter 捕获到了吗 | 客户端拿到 |
|---|---|---|---|
| 1 | **Action 方法里 throw** | ✅ 捕获（`OnException` 被调用） | 过滤器设定的状态码 |
| 2 | **ActionFilter.OnActionExecuting 里 throw** | ✅ **捕获到了** | 500 |
| 3 | **ResultFilter.OnResultExecuting 里 throw** | ❌ **完全没被调用** | 500（服务器兜底） |
| 4 | **模型验证失败（`[ApiController]` 自动 400）** | ❌ **过滤器一个都没跑** | 400（框架生成） |
| 5 | **中间件里 throw** | ❌ 不在 MVC 管线内 | 500 |
| 6 | **响应已开始写之后 throw** | ⚠️ **调用了，但改不了状态码** | **200 + 半截内容** |

**逐条看实测证据。**

**① Action 抛异常 —— 正常捕获：**

```
ActionFilter.Executing (Order=0)
★ Action 抛异常
ActionFilter.Executed  (Order=0)          ← ★ 注意：Executed 还是跑了，能看到 Exception
ExceptionFilter.OnException ← InvalidOperationException
```

**两个细节：**

| 细节 | 意义 |
|---|---|
| `ActionFilter.Executed` **在异常时也会执行** | 所以"事务 Filter"能在 `OnActionExecuted` 里看到 `context.Exception` 并回滚 |
| **`ResultFilter` 没有执行** | 异常过滤器里设置的 `Result` 不会经过 ResultFilter（实测无 RF 行） |

**② ActionFilter 自己抛 —— 也被捕获：**

```
ThrowingActionFilter.Executing → 抛异常
ExceptionFilter.OnException ← InvalidOperationException
```

**注意这里没有 `ThrowingActionFilter.Executed`**——**同一个过滤器的 `Executed` 不会执行**（因为它没成功"进入"）。这一点和 ① 不同：① 里 `Executed` 是别的过滤器跑的。

**③ ResultFilter 抛 —— 捕获不到（实测 trace 只有两行）：**

```
★ Action 执行
ThrowingResultFilter.Executing → 抛异常
```

**为什么？** 因为 ResultFilter 阶段已经在"写响应"的路上了，**异常处理过滤器在它之前就已经退场**。这个异常会直接冒到 MVC 外面，由中间件/服务器兜底。

**④ 模型验证失败 —— 过滤器根本没机会跑：**

```bash
curl -X POST -d '{"name":"","price":1}' /api/t/model
# → HTTP 400 {"title":"One or more validation errors occurred.","errors":{"Name":["Name 必填"]}}
```

**trace 完全为空。** 这说明：**`[ApiController]` 在"模型绑定 + 验证"之后就直接生成了 400，连 ActionFilter 都没执行。**

**这条推翻了很多人（包括我一开始）的想法：**

> **想用 ExceptionFilter 统一处理"参数校验错误"，是行不通的——它压根不会触发。**

**正确做法是 `InvalidModelStateResponseFactory`：**

```csharp
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(kv => kv.Value!.Errors.Count > 0)
            .ToDictionary(kv => kv.Key, kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

        return new BadRequestObjectResult(new { code = 40001, message = "参数校验失败", errors });
    };
});
```

**⑥ 响应已开始后抛 —— 最阴的一个，实测 HTTP 200：**

```csharp
await Response.WriteAsync("已经写给客户端的内容...");
await Response.Body.FlushAsync();       // ★ 一旦 flush，响应头就发出去了
throw new InvalidOperationException("响应开始后的异常");
```

**✅ 实测：**

```
HTTP 200
body: 已经写给客户端的内容...
trace: ExceptionFilter.OnException ← InvalidOperationException   ← 过滤器确实被调了
```

**过滤器跑归跑，但它改不了 200 这个状态码**——因为响应头已经发给客户端了。**用户看到的是"成功的 200 + 半截内容"。**

> **这就是 `Response.HasStarted` 的意义。** 想要"出错就一定返回 500"，就必须**保证出错时还没写过响应**——这也是为什么"全局异常处理放中间件"更稳（它能保证在写响应之前拦住）。

## P134 · 3. 那 ExceptionFilter 还有什么用

**它不是没用，是"用错了地方就废"。三个它真正擅长的场景：**

| 场景 | 为什么必须用它 |
|---|---|
| **业务异常 → 统一响应格式** | 只有它知道"是哪个 Action 抛的"，能带上 `ActionDescriptor` |
| **异常分类映射状态码** | `NotFoundException` → 404、`DomainException` → 422 |
| **补日志（带 Action 名、参数）** | 中间件拿不到 Action 参数，Filter 拿得到 |

```csharp
public class ApiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ApiExceptionFilter> _log;
    public ApiExceptionFilter(ILogger<ApiExceptionFilter> log) => _log = log;

    public void OnException(ExceptionContext context)
    {
        var action = context.ActionDescriptor.DisplayName;

        // 响应已经开始写了 → 只能记日志，不能再改响应
        if (context.HttpContext.Response.HasStarted)
        {
            _log.LogError(context.Exception, "响应已开始，无法处理异常 action={Action}", action);
            return;
        }

        var (status, code, message) = context.Exception switch
        {
            NotFoundException e  => (404, 40400, e.Message),
            DomainException e    => (422, 42200, e.Message),
            UnauthorizedAccessException => (403, 40300, "没有权限"),
            _                    => (500, 50000, "服务器内部错误")
        };

        _log.LogError(context.Exception, "接口异常 action={Action} status={Status}", action, status);

        context.Result = new ObjectResult(new { code, message }) { StatusCode = status };
        context.ExceptionHandled = true;        // ★ 不设这个，异常会继续往外抛
    }
}
```

| 那行代码 | 不写会怎样 |
|---|---|
| `context.ExceptionHandled = true` | 异常**继续往外抛**，最后被中间件兜住（你的格式化就白做了） |
| `Response.HasStarted` 判断 | 试图改已发送的响应 → 抛 `InvalidOperationException`，变成"异常里再抛异常" |
| `switch` 映射 | 所有异常都 500，前端没法区分"没找到"和"服务器炸了" |

**⚠️ 但真实的项目里，推荐"两道防线"：**

```
① 中间件 UseExceptionHandler / IExceptionHandler  ← 兜底（模型绑定、序列化、Filter 自己抛的）
② ExceptionFilter                                  ← 业务异常精细化（带 Action 信息）
```

**只写 ② 会漏（实测的第 3–5 种情况）；只写 ① 会丢 Action 上下文。**

## P134 · 4. Filter 的三种挂载方式（实测报错）

| 方式 | 写法 | 能否注入服务 | 实例生命周期 |
|---|---|---|---|
| **① 特性直挂** | `[MyFilter]` | ❌ **不能有构造参数** | **全应用复用同一个实例**（实测） |
| **② `[ServiceFilter(typeof(X))]`** | 需要先 `AddScoped<X>()` | ✅ 从容器取 | 跟注册的生命周期走 |
| **③ `[TypeFilter(typeof(X))]`** | 不需要注册 | ✅ 从容器取（临时） | 每次请求新建 |

**为什么"特性直挂"不能有构造参数？**

```csharp
public class MyFilter : Attribute, IActionFilter   // ← 必须继承 Attribute 才能当特性用
{
    public MyFilter(IMemoryCache cache) { }        // ← 编译不过
}
```

> **因为特性（Attribute）的构造参数必须是"编译期常量"**（数字、字符串、Type、枚举）。**DI 容器是运行时的东西，特性是编译期写进元数据的——两者天生不兼容。**
>
> **我实测的编译错误（第一次写就踩了）：**
> ```
> error CS0616: "ThrowingResultFilter" 不是特性类
> ```
> 原因：**只实现了 `IActionFilter` 而没有继承 `Attribute`**。当特性用，必须 `class X : Attribute, IActionFilter`。

**同一个特性挂两次，还会报另一个错：**

```
error CS0579: "TraceActionFilter" 特性重复
```

**解法：加 `[AttributeUsage(..., AllowMultiple = true)]`。**

```csharp
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class TraceActionFilter : Attribute, IActionFilter, IOrderedFilter { ... }
```

**`[ServiceFilter]` 忘了注册服务 —— 实测报错：**

```
System.InvalidOperationException: No service for type 'FilterTest.UnregisteredFilter' has been registered.
   at Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetRequiredService(...)
   at Microsoft.AspNetCore.Mvc.ServiceFilterAttribute.CreateInstance(IServiceProvider serviceProvider)
   at Microsoft.AspNetCore.Mvc.Filters.DefaultFilterProvider.ProvideFilter(...)
```

**看到 `ServiceFilterAttribute.CreateInstance` 就知道是"ServiceFilter 用的类型没注册"。**

## P134 · 5. 实例复用：特性过滤器是"全局单例"（实测）

**这是限流 Filter 最容易踩的坑，我实测验证了：**

```csharp
public void OnActionExecuting(ActionExecutingContext context)
    => Trace.Add($"ActionFilter.Executing id={GetHashCode()} (Order={Order})");
```

**✅ 连续三次请求 `/api/t/ok`，实测输出：**

```
ActionFilter.Executing id=1 (Order=1)
ActionFilter.Executing id=2 (Order=2)
★ Action 执行
...
ActionFilter.Executing id=1 (Order=1)     ← 第二次请求，还是 id=1
ActionFilter.Executing id=2 (Order=2)
...
ActionFilter.Executing id=1 (Order=1)     ← 第三次请求，还是 id=1
```

**结论：特性方式挂的过滤器，实例在请求之间被复用（同一个对象）。**

| 后果 | 说明 |
|---|---|
| **在字段里存状态 = 全局共享** | 比如 `private int _count;` 就成了全站计数器（可能正是你要的，也可能不是） |
| **并发不安全** | 20 个请求同时改 `_count++` → 丢计数。必须 `Interlocked` 或用并发容器 |
| **依赖注入拿不到** | 构造函数不能有参数（见上一节） |

**而 `[ServiceFilter]` 注册成 Scoped 时，每个请求一个新实例——所以"每请求状态"要放 ServiceFilter 里。**

## P135 · 1. ActionFilter 能做的四件事

| 能力 | 怎么写 | 用在 |
|---|---|---|
| **读参数** | `context.ActionArguments["id"]` | 日志、审计、校验 |
| **改参数** | `context.ActionArguments["id"] = 123;` | 补默认值、脱敏 |
| **短路（不执行 Action）** | `context.Result = new BadRequestObjectResult(...)` | 限流、防重、权限 |
| **看结果** | `context.Result`（在 `OnActionExecuted` 里） | 统一包装响应、事务提交判断 |

```csharp
public class TimingFilter : IActionFilter
{
    private readonly ILogger<TimingFilter> _log;
    public TimingFilter(ILogger<TimingFilter> log) => _log = log;   // 只能靠 ServiceFilter

    public void OnActionExecuting(ActionExecutingContext context)
        => context.HttpContext.Items["__sw"] = System.Diagnostics.Stopwatch.StartNew();

    public void OnActionExecuted(ActionExecutedContext context)
    {
        if (context.HttpContext.Items["__sw"] is System.Diagnostics.Stopwatch sw)
            _log.LogInformation("{Action} 耗时 {Ms}ms",
                context.ActionDescriptor.DisplayName, sw.ElapsedMilliseconds);
    }
}
```

> **`HttpContext.Items` 是什么？** 一个 `IDictionary<object, object?>`，**生命周期 = 一次请求**。它是 Filter 之间、Filter 和中间件之间**传递临时数据**的标准方式（因为 Filter 实例可能被复用，不能放字段）。

## P135 · 2. 短路：设置了 `Result` 就不会执行 Action（但 ResultFilter 还会跑）

```csharp
public void OnActionExecuting(ActionExecutingContext context)
{
    if (!context.HttpContext.Request.Headers.ContainsKey("X-Api-Key"))
    {
        context.Result = new UnauthorizedResult();     // ★ 短路
        return;                                         // 建议显式 return
    }
}
```

| 短路后谁还跑 | 说明 |
|---|---|
| 后续的 **ActionFilter.OnActionExecuting** | ❌ 不跑（除了 Order 更小的外层 `Executed`） |
| Action 方法 | ❌ 不跑 |
| **ActionFilter.OnActionExecuted** | ✅ **跑**（Order 比当前大的那些也会跑 Executed） |
| **ResultFilter** | ✅ **跑**（因为要写响应） |

## P135 · 3. 同步 vs 异步：优先 `IAsyncActionFilter`

```csharp
public class MyAsyncFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // 前
        var executed = await next();              // ★ 调用它 = 执行后续 Filter + Action
        // 后
        if (executed.Exception is not null && !executed.ExceptionHandled)
        {
            // 这里可以"吞掉"异常
            executed.Result = new ObjectResult(new { message = "已处理" }) { StatusCode = 500 };
            executed.ExceptionHandled = true;
        }
    }
}
```

| | `IActionFilter`（同步） | `IAsyncActionFilter`（异步） |
|---|---|---|
| 前后逻辑写在一起 | ❌ 分成两个方法 | ✅ **一个方法，`await next()` 前后** |
| 里面能 `await` | ❌ 不能 | ✅ 能 |
| 能改异常处理结果 | ❌ 不能（异常还没发生） | ✅ **能**（`executed.ExceptionHandled`） |
| 推荐度 | 简单场景 | **优先用这个** |

> **`ActionExecutionDelegate next` 是什么？** 一个委托，签名是 `Task<ActionExecutedContext> ()`。**调用它就等于"执行管线里的下一步"**（下一个 Filter → Action）。不调用它就是短路。

## P136 · 1. 自动事务 Filter：目标和标准写法

**目标：Action 正常结束就提交，抛异常就回滚，业务代码里不出现 `BeginTransaction`。**

```csharp
public class TransactionFilter : IAsyncActionFilter
{
    private readonly BookContext _db;           // Scoped，靠 ServiceFilter 注入
    public TransactionFilter(BookContext db) => _db = db;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // 只读请求不必要开事务（可选优化：按 HTTP 方法判断）
        if (HttpMethods.IsGet(context.HttpContext.Request.Method) ||
            HttpMethods.IsHead(context.HttpContext.Request.Method))
        {
            await next();
            return;
        }

        await using var tx = await _db.Database.BeginTransactionAsync(context.HttpContext.RequestAborted);

        var executed = await next();

        if (executed.Exception is null || executed.ExceptionHandled)
            await tx.CommitAsync(context.HttpContext.RequestAborted);
        else
            await tx.RollbackAsync(context.HttpContext.RequestAborted);   // 其实 Dispose 也会回滚
    }
}
```

> **`await using var tx = await ...BeginTransactionAsync()` 是什么？** `IDbContextTransaction` 实现了 `IAsyncDisposable`，`await using` 保证**离开作用域时自动 Dispose**——没提交的事务在 Dispose 时**自动回滚**。所以即使你忘了写 Rollback，数据也不会脏写。

## P136 · 2. 实测：返回 400 但没抛异常 → **事务被提交了**

**这是这一节最重要的一条，因为它是一个"看起来很对、实际有坑"的写法。**

**经典写法是 `if (context.Exception == null) Commit(); else Rollback();`。**

**我用一个假事务（只记录 commit/rollback 次数）测了三种情况：**

| 场景 | HTTP | commit | rollback |
|---|---|---|---|
| Action 正常返回 `Ok()` | 200 | **1** | 0 |
| **Action 返回 `BadRequest()`（没抛异常）** | **400** | **2** ← ★ | 0 |
| Action 抛异常 | 500 | 2 | **1** |

**✅ 实测 trace（原文）：**

```
Tx.Begin
★ 返回 BadRequest（没抛异常）
Tx.Commit（Exception=null）      ← ★ 业务失败，但事务提交了 ★
Tx.Begin
Tx.Rollback
ExceptionFilter.OnException ← InvalidOperationException
```

**为什么这是坑？**

```csharp
[HttpPost("books/borrow")]
public async Task<IActionResult> Borrow(long id)
{
    var book = await _db.Books.FindAsync(id);
    if (book is null) return NotFound();        // ← 你以为是"失败"，但没异常
    if (book.Stock <= 0) return BadRequest();   // ← 同上
    // ...
}
```

**只要你的 Action 用"返回错误码"表达失败（这是 REST 的正确做法），`Exception == null` 判断就会把失败当成功提交。**

**但它真的错了吗？——要分情况看，这才是关键：**

| 情况 | 该提交还是回滚 | 为什么 |
|---|---|---|
| Action 里**什么都没改**就返回 400 | **提交/回滚都对** | 没有数据变化，事务是空的 |
| Action 里**改了一半**才发现业务规则不满足，然后 `return BadRequest()` | **必须回滚** | 半截数据被提交 = 数据损坏 |
| Action 改完数据 → 调用外部 API 失败 → `return StatusCode(502)` | **必须回滚** | 同上 |

**所以正确的判断是"看有没有异常 + 看状态码"，而不是只看异常：**

```csharp
var executed = await next();

var failed = executed.Exception is not null && !executed.ExceptionHandled;
var badStatus = executed.Result is ObjectResult { StatusCode: >= 400 }
             || executed.Result is StatusCodeResult { StatusCode: >= 400 };

if (failed || badStatus)
    await tx.RollbackAsync();
else
    await tx.CommitAsync();
```

> **⚠️ 但更稳的做法是：不要用 Filter 管事务。**
> **理由：事务的边界应该和"业务用例"一致，而 Filter 是"按 Action 切"的。** 一个 Action 里如果调了两个独立的业务用例（一个成功一个失败），Filter 只会整体提交或整体回滚——**你失去了"部分成功"的能力**。
>
> **适合用 Filter 的场景：** 团队成员水平不齐、需要"兜底防止漏写事务"，且每个 Action 就是"一个原子业务"。
> **不适合：** 复杂业务编排。

## P136 · 3. 事务 Filter 的四个坑

| # | 坑 | 现象 | 解法 |
|---|---|---|---|
| 1 | **嵌套事务** | Action 里又 `BeginTransaction` → `InvalidOperationException`：不支持嵌套 | 用 `Savepoint` 或 `tx.SupportsSavepoints`；或者禁止在 Action 里手写事务 |
| 2 | **`ExecuteUpdate/ExecuteDelete` 不受跟踪影响** | 它们走独立命令，但仍在同一个事务里（✅ 没问题）；**但 `SaveChanges` 之外的数据修改不会被 `ChangeTracker` 感知** | 理解"事务包住的是连接上的命令，不是内存里的实体" |
| 3 | **GET 也开事务** | 每个查询多一次 `BEGIN/COMMIT` 往返，**吞吐降 10–30%** | 按 HTTP 方法过滤（见上面代码） |
| 4 | **长事务** | Action 里调外部 HTTP 接口耗时 3 秒 → 事务持锁 3 秒 → 其他请求阻塞 | **事务里绝不调外部接口**（先查外部、再开事务） |

## P137 · 1. 限流 Filter：三种维度和一个必踩的坑

**限流的三个维度（先想清楚限"谁"）：**

| 维度 | 键 | 适合 |
|---|---|---|
| **按 IP** | `ip:1.2.3.4` | 防爬虫、防匿名刷 |
| **按用户** | `user:123` | 登录后的接口（抽卡、领奖） |
| **按接口** | `api:/books` | 保护重接口（报表、导出） |
| 组合 | `user:123:api:/draw` | 最精确，也最贵 |

```csharp
public class RateLimitAttribute : Attribute, IAsyncActionFilter
{
    private readonly int _limit;          // 特性参数必须是常量 → 只能这么传
    private readonly int _seconds;
    private static readonly ConcurrentDictionary<string, Queue<DateTime>> _hits = new();

    public RateLimitAttribute(int limit, int seconds) { _limit = limit; _seconds = seconds; }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var key = $"{ip}:{context.ActionDescriptor.DisplayName}";
        var now = DateTime.UtcNow;

        var q = _hits.GetOrAdd(key, _ => new Queue<DateTime>());
        lock (q)
        {
            while (q.Count > 0 && (now - q.Peek()).TotalSeconds > _seconds) q.Dequeue();
            if (q.Count >= _limit)
            {
                context.HttpContext.Response.Headers.RetryAfter = _seconds.ToString();
                context.Result = new ObjectResult(new { message = "请求太频繁，请稍后再试" })
                { StatusCode = StatusCodes.Status429TooManyRequests };
                return;                                        // 短路
            }
            q.Enqueue(now);
        }

        await next();
    }
}
```

**⚠️ 三个必须知道的缺陷（这就是为什么生产别用 Filter 限流）：**

| # | 缺陷 | 为什么 |
|---|---|---|
| 1 | **状态在静态字典里 = 进程内** | 多实例部署时，每台各限各的 → 实际限额是 `N × limit` |
| 2 | **字典永不清理** | 每个 IP 一个 key → 内存只涨不降（上面代码里没有淘汰） |
| 3 | **`lock` 在热点接口上** | 高并发时锁竞争会拖慢响应 |

## P137 · 2. 生产该用什么：.NET 7+ 的限流中间件

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // 固定窗口：每个 IP 每分钟 60 次
    options.AddFixedWindowLimiter("per-ip", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 60;
        opt.QueueLimit = 0;
    });
});

app.UseRateLimiter();

// 用
[EnableRateLimiting("per-ip")]
public class BooksController : ControllerBase { }
```

| | 自写 Filter | 内置 `RateLimiter` 中间件 |
|---|---|---|
| 代码量 | 30 行 + 自己维护 | 10 行配置 |
| 算法 | 固定窗口（手写） | 固定窗口 / 滑动窗口 / 令牌桶 / 并发限制 |
| 分布式 | ❌ 要自己接 Redis | 部分内置，其余可扩展 |
| 性能 | `lock` 争用 | 优化过 |
| 拒绝响应 | 自己写 | 可自定义 `OnRejected` |

**结论：Filter 版限流"知道怎么写就行"，生产直接用 `AddRateLimiter`。**

---

==二：格式==

## P134 · 特性式 Filter 骨架（能当特性用）

```csharp
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public class MyFilterAttribute : Attribute, IActionFilter, IOrderedFilter
{
    public int Order { get; set; }
    public void OnActionExecuting(ActionExecutingContext context) { }
    public void OnActionExecuted(ActionExecutedContext context) { }
}
```

## P134 · ServiceFilter / TypeFilter 骨架

```csharp
// 需要依赖的过滤器：不继承 Attribute
public class DepFilter : IActionFilter
{
    private readonly IMemoryCache _cache;
    public DepFilter(IMemoryCache cache) => _cache = cache;
    public void OnActionExecuting(ActionExecutingContext context) { }
    public void OnActionExecuted(ActionExecutedContext context) { }
}

// ① 注册（必须，否则运行时抛 No service for type ...）
builder.Services.AddScoped<DepFilter>();

// ② 用
[ServiceFilter(typeof(DepFilter))]                    // 生命周期跟注册一致
[TypeFilter(typeof(DepFilter), Arguments = new object[] { "x" })]   // 不注册也能用，每请求新建
```

## P134 · 全局注册（对所有 Controller 生效）

```csharp
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiExceptionFilter>();            // 全局异常
    options.Filters.Add(new TimingFilter( /* 需要手工构造 */ ));  // 只能注无参/手建
    options.Filters.AddService<TransactionFilter>();       // ★ 从容器取，可注入 Scoped
});
```

## P134 · 异常 → 状态码映射表（抄进项目）

```csharp
var (status, code) = context.Exception switch
{
    NotFoundException          => (404, 40400),
    DomainException            => (422, 42200),
    UnauthorizedAccessException => (403, 40300),
    OperationCanceledException => (499, 49900),   // 客户端断开
    _                          => (500, 50000)
};
```

## P135 · ActionFilter 短路骨架

```csharp
public void OnActionExecuting(ActionExecutingContext context)
{
    if (!context.HttpContext.Request.Headers.TryGetValue("X-Api-Key", out var key))
    {
        context.Result = new UnauthorizedObjectResult(new { message = "缺少 ApiKey" });
        return;          // 短路，Action 不会执行
    }
}
```

## P135 · IAsyncActionFilter 骨架（推荐）

```csharp
public class MyAsyncFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // 前
        var executed = await next();
        // 后
        if (executed.Exception is not null && !executed.ExceptionHandled)
        {
            executed.Result = new ObjectResult(new { message = "已兜住" }) { StatusCode = 500 };
            executed.ExceptionHandled = true;
        }
    }
}
```

## P136 · 事务 Filter 骨架（带状态码判断）

```csharp
await using var tx = await _db.Database.BeginTransactionAsync(ct);
var executed = await next();

var failed = executed.Exception is not null && !executed.ExceptionHandled;
var badStatus = executed.Result is ObjectResult { StatusCode: >= 400 }
             || executed.Result is StatusCodeResult { StatusCode: >= 400 };

if (failed || badStatus) await tx.RollbackAsync(ct);
else                     await tx.CommitAsync(ct);
```

## P137 · 限流 Filter 骨架

```csharp
[RateLimit(limit: 10, seconds: 60)]     // 特性参数必须是常量
public IActionResult Draw() { ... }
```

## P137 · 内置限流骨架（生产用这个）

```csharp
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddFixedWindowLimiter("per-ip", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 60;
        opt.QueueLimit = 0;
    });
});
app.UseRateLimiter();

[EnableRateLimiting("per-ip")]
public class LoginController : ControllerBase { }
```

---

==三：代码==

## 3.1 完整实验项目：复现"ExceptionFilter 能捕获什么"

**把这个项目跑起来，六种情况一次看完。**

```csharp
// ── Trace.cs ──
using System.Collections.Concurrent;
namespace FilterTest;

public static class Trace
{
    private static readonly ConcurrentQueue<string> _log = new();
    public static void Add(string s) => _log.Enqueue($"{DateTime.Now:mm:ss.fff} {s}");
    public static List<string> Snapshot() => _log.ToList();
    public static void Clear() { while (_log.TryDequeue(out _)) { } }
}
```

```csharp
// ── Filters.cs ──
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace FilterTest;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class TraceActionFilter : Attribute, IActionFilter, IOrderedFilter
{
    public int Order { get; set; }
    public void OnActionExecuting(ActionExecutingContext c) => Trace.Add($"ActionFilter.Executing id={GetHashCode()} (Order={Order})");
    public void OnActionExecuted(ActionExecutedContext c)   => Trace.Add($"ActionFilter.Executed  (Order={Order})");
}

public class TraceExceptionFilter : Attribute, IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        Trace.Add($"ExceptionFilter.OnException ← {context.Exception.GetType().Name}");
        context.Result = new ObjectResult(new { caught = context.Exception.Message }) { StatusCode = 500 };
        context.ExceptionHandled = true;
    }
}

public class ThrowingActionFilter : Attribute, IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext c) { Trace.Add("ThrowingActionFilter.Executing → 抛异常"); throw new InvalidOperationException("来自 ActionFilter"); }
    public void OnActionExecuted(ActionExecutedContext c) => Trace.Add("ThrowingActionFilter.Executed");
}

public class ThrowingResultFilter : Attribute, IResultFilter
{
    public void OnResultExecuting(ResultExecutingContext c) { Trace.Add("ThrowingResultFilter.Executing → 抛异常"); throw new InvalidOperationException("来自 ResultFilter"); }
    public void OnResultExecuted(ResultExecutedContext c) => Trace.Add("ThrowingResultFilter.Executed");
}
```

```csharp
// ── TestController.cs（节选）──
[ApiController]
[Route("api/t")]
[TraceExceptionFilter]
public class TestController : ControllerBase
{
    [HttpGet("trace")] public List<string> TraceLog() => Trace.Snapshot();
    [HttpPost("clear")] public string Clear() { Trace.Clear(); return "ok"; }

    [HttpGet("ok")]      [TraceActionFilter(Order = 1)] [TraceActionFilter(Order = 2)] public string Ok2() => "ok";
    [HttpGet("throw")]   [TraceActionFilter] public string Throw() => throw new InvalidOperationException("来自 Action");
    [HttpGet("afthrow")] [ThrowingActionFilter] public string AfThrow() => "afthrow";
    [HttpGet("rfthrow")] [ThrowingResultFilter] public string RfThrow() => "rfthrow";

    [HttpPost("model")]
    public string Model([FromBody] CreateDto dto) => "model-ok";

    [HttpGet("started")]
    public async Task Started()
    {
        await Response.WriteAsync("已经写给客户端的内容...");
        await Response.Body.FlushAsync();          // ★ 关键：响应头已发出
        throw new InvalidOperationException("响应开始后的异常");
    }
}
```

**跑起来之后的六组结论（我实测的）：**

| 请求 | trace 里看到什么 | HTTP |
|---|---|---|
| `/ok` | AF(1) → AF(2) → Action → AF(2) → AF(1) → RF.Executing → RF.Executed | 200 |
| `/throw` | AF.Executing → Action 抛 → **AF.Executed 仍然执行** → EF.OnException（**无 RF**） | 500 |
| `/afthrow` | ThrowingAF.Executing → **EF.OnException**（无 ThrowingAF.Executed） | 500 |
| `/rfthrow` | Action → ThrowingRF.Executing → **结束（无 EF）** | 500 |
| `/model`（空 Name） | **trace 完全为空** | 400 |
| `/started` | Action 写 body → **EF.OnException** | **200**（半截 body） |

## 3.2 生产可用的全局异常 Filter（完整版）

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BookStore.Web.Filters;

public class NotFoundException : Exception
{
    public NotFoundException(string msg) : base(msg) { }
}

public class DomainException : Exception
{
    public DomainException(string msg) : base(msg) { }
}

public class ApiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ApiExceptionFilter> _log;
    private readonly IHostEnvironment _env;

    public ApiExceptionFilter(ILogger<ApiExceptionFilter> log, IHostEnvironment env)
    { _log = log; _env = env; }

    public void OnException(ExceptionContext context)
    {
        // ① 响应已经开始写了：只能记日志，改不了状态码
        if (context.HttpContext.Response.HasStarted)
        {
            _log.LogError(context.Exception, "响应已开始，异常无法转换为响应 action={Action}",
                context.ActionDescriptor.DisplayName);
            return;
        }

        // ② 客户端主动断开：不算错误
        if (context.Exception is OperationCanceledException)
        {
            _log.LogInformation("请求被取消 action={Action}", context.ActionDescriptor.DisplayName);
            context.Result = new StatusCodeResult(499);
            context.ExceptionHandled = true;
            return;
        }

        // ③ 分类映射
        var (status, code) = context.Exception switch
        {
            NotFoundException           => (404, 40400),
            DomainException             => (422, 42200),
            UnauthorizedAccessException => (403, 40300),
            _                           => (500, 50000)
        };

        _log.LogError(context.Exception, "接口异常 action={Action} status={Status}",
            context.ActionDescriptor.DisplayName, status);

        // ④ 生产不暴露堆栈
        object body = _env.IsDevelopment()
            ? new { code, message = context.Exception.Message, detail = context.Exception.ToString() }
            : new { code, message = status == 500 ? "服务器内部错误" : context.Exception.Message };

        context.Result = new ObjectResult(body) { StatusCode = status };
        context.ExceptionHandled = true;        // ★ 必须
    }
}
```

**注册（同时配上中间件兜底）：**

```csharp
builder.Services.AddControllers(o => o.Filters.Add<ApiExceptionFilter>());

// 兜底：模型绑定、序列化、Filter 自己抛的异常
builder.Services.AddProblemDetails();
app.UseExceptionHandler();       // 生产环境用它，会输出 ProblemDetails
```

> **为什么两套都要？** 我实测的第 3–5 种情况（ResultFilter 抛、模型验证、中间件抛）只有中间件能兜。**Filter 管"业务异常美化"，中间件管"无论如何别让进程崩"。**

## 3.3 事务 Filter（只加在需要的接口上）

```csharp
public class TransactionFilter : IAsyncActionFilter
{
    private readonly BookContext _db;
    private readonly ILogger<TransactionFilter> _log;

    public TransactionFilter(BookContext db, ILogger<TransactionFilter> log)
    { _db = db; _log = log; }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var ct = context.HttpContext.RequestAborted;

        // 只读请求不开事务（省一次往返）
        if (HttpMethods.IsGet(context.HttpContext.Request.Method) ||
            HttpMethods.IsHead(context.HttpContext.Request.Method))
        {
            await next();
            return;
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var executed = await next();

        var hasException = executed.Exception is not null && !executed.ExceptionHandled;
        var badStatus = executed.Result is ObjectResult { StatusCode: >= 400 }
                     || executed.Result is StatusCodeResult { StatusCode: >= 400 };

        if (hasException || badStatus)
        {
            _log.LogWarning("事务回滚 action={Action} 状态码={Status}",
                context.ActionDescriptor.DisplayName,
                (executed.Result as ObjectResult)?.StatusCode ?? (executed.Result as StatusCodeResult)?.StatusCode);
            await tx.RollbackAsync(ct);
        }
        else
        {
            await tx.CommitAsync(ct);
        }
    }
}
```

**注册 + 使用：**

```csharp
builder.Services.AddScoped<TransactionFilter>();
```

```csharp
[HttpPost("books/borrow")]
[ServiceFilter(typeof(TransactionFilter))]     // ★ 只加在写操作上
public async Task<IActionResult> Borrow(long id) { ... }
```

**⚠️ 别全局注册。** 全局注册会让所有 GET 也开事务（我上面虽然过滤了 GET，但"每个写接口都必须有事务"这个假设往往不成立——比如纯日志写入、纯缓存刷新）。

## 3.4 限度 Filter：自写版 + 内置版对照

**自写版（理解原理用）：**

```csharp
[AttributeUsage(AttributeTargets.Method)]
public class RateLimitAttribute : Attribute, IAsyncActionFilter
{
    private readonly int _limit, _seconds;
    private static readonly ConcurrentDictionary<string, Queue<long>> _hits = new();

    public RateLimitAttribute(int limit, int seconds) { _limit = limit; _seconds = seconds; }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var key = $"{ip}:{context.ActionDescriptor.DisplayName}";
        var now = Environment.TickCount64;

        var q = _hits.GetOrAdd(key, _ => new Queue<long>());
        lock (q)
        {
            while (q.Count > 0 && now - q.Peek() > _seconds * 1000L) q.Dequeue();
            if (q.Count >= _limit)
            {
                context.HttpContext.Response.Headers.RetryAfter = _seconds.ToString();
                context.Result = new ObjectResult(new { code = 42900, message = "请求过于频繁" })
                { StatusCode = StatusCodes.Status429TooManyRequests };
                return;
            }
            q.Enqueue(now);
        }

        await next();
    }
}
```

**内置版（生产用）：**

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.Headers.RetryAfter = "60";
        await ctx.HttpContext.Response.WriteAsJsonAsync(new { code = 42900, message = "请求过于频繁" }, ct);
    };
});

app.UseRateLimiter();
```

```csharp
[HttpPost("login")]
[EnableRateLimiting("login")]
public IActionResult Login(...) { ... }
```

## 3.5 落到你的图书系统：三个 Filter 的最小改法

| # | 加什么 | 加在哪 | 代码量 |
|---|---|---|---|
| 1 | `ApiExceptionFilter` | **全局**（`Filters.Add`） | 60 行，删掉所有 try/catch |
| 2 | `TransactionFilter` | **只在 `price-up`、`seed-relations` 这类写接口**上 | 40 行 |
| 3 | 限流 | 先不用（单机、无恶意流量） | — |

**改完之后 `QueryController` 的样子（对比现在的 8 个方法）：**

```csharp
[HttpPost("books/price-up")]
[ServiceFilter(typeof(TransactionFilter))]       // ← 只多这一行
public async Task<ActionResult<object>> PriceUp(long? authorId = null, double percent = 10)
{
    // 没有 try/catch、没有 BeginTransaction、没有日志模板
    // 只有业务
}
```

**⚠️ 一个必做的验证：故意在 `price-up` 里抛异常，看数据有没有被改。**

## 3.6 验收清单

| # | 验证项 | 怎么做 | 通过标准 |
|---|---|---|---|
| 1 | 异常格式统一 | 各接口故意抛不同类型的异常 | 前端拿到的都是 `{code, message}` |
| 2 | 异常不漏 | 让 Action 返回一个"序列化失败"的对象（如循环引用） | 仍返回 500 JSON，不是 HTML 错误页 |
| 3 | 参数校验格式统一 | 传空必填项 | 返回你配置的 `InvalidModelStateResponseFactory` 格式 |
| 4 | 事务生效 | 写接口里改数据后抛异常 | **数据库没有变化** |
| 5 | 事务不误提交 | 写接口改数据后 `return BadRequest()` | **数据库没有变化**（这条最容易被跳过） |
| 6 | 事务不影响 GET | GET 接口打日志看有没有 `BEGIN TRAN` | 没有 |
| 7 | 限流返回 429 | 快速连打 20 次 | 第 N 次开始 429，且带 `Retry-After` |

---

==四：总结==

## 4.1 四节核心结论

| 节 | 一句话结论 |
|---|---|
| **P134 ExceptionFilter** | 它只兜"Action 和 ActionFilter 抛的"；**ResultFilter 抛的、模型验证 400、中间件抛的都兜不住**；响应已开始时它改不了状态码 |
| **P135 ActionFilter** | 能改参数、能短路（设 `Result`）、能看结果；**特性挂载的实例是全应用复用**，状态别放字段 |
| **P136 事务 Filter** | 标准写法 `Exception == null → Commit` **会在返回 400 时误提交**（实测 commit 计数 +1）；要同时看状态码 |
| **P137 限流 Filter** | 能写，但**进程内、字典不清理、锁争用**；生产用 `AddRateLimiter` 中间件 |

## 4.2 异常捕获边界（这张表最值钱）

| 异常来源 | ExceptionFilter | 中间件 | 客户端看到 |
|---|---|---|---|
| Action 方法 | ✅ | ✅ | 过滤器设定 |
| ActionFilter.OnActionExecuting | ✅ | ✅ | 过滤器设定 |
| **ResultFilter.OnResultExecuting** | ❌ | ✅ | 500 |
| **模型验证失败（自动 400）** | ❌ | ✅（但不抛异常） | 400 |
| **中间件自己** | ❌ | ✅（外层） | 500 |
| **响应已开始后** | ⚠️ 调用了但无效 | ⚠️ 同样无效 | **200 + 半截 body** |

## 4.3 执行顺序（背这六行）

```
AuthorizationFilter
  → ResourceFilter
    → 模型绑定 / 验证（失败直接 400，后面全不执行）
      → ActionFilter.OnActionExecuting（Order 小 → 大）
        → Action
      → ActionFilter.OnActionExecuted（Order 大 → 小）
    → ExceptionFilter（仅在异常时）
  → ResultFilter.OnResultExecuting / OnResultExecuted
```

## 4.4 三种挂载方式对比

| | `[MyFilter]` | `[ServiceFilter]` | `[TypeFilter]` |
|---|---|---|---|
| 必须继承 `Attribute` | ✅ | ❌ | ❌ |
| 能注入服务 | ❌ | ✅ | ✅ |
| 必须先注册 | — | ✅ **必须** | ❌ |
| 实例 | **全局复用**（实测） | 跟生命周期 | 每请求新建 |
| 适合 | 无状态小逻辑 | **有依赖的 Filter** | 一次性/带参数 |

## 4.5 记忆口诀

```
五种 Filter 一条线：
  授权 → 资源 → 动作 → 异常 → 结果

顺序像洋葱：
  Order 小的先进后出；不写 Order 就是 0

ExceptionFilter 只兜两处：
  Action 抛的、ActionFilter 抛的
  模型验证、ResultFilter、中间件 —— 它都兜不住

特性的构造函数：
  只能放常量，所以有依赖就用 ServiceFilter

特性 Filter 是复用的：
  字段里存状态 = 全站共享，必须线程安全

事务别只看异常：
  返回 400 也是失败，要看状态码
```

## 4.6 八个易错点（前四个是我实测踩的）

| # | 易错点 | 后果 | 正确做法 |
|---|---|---|---|
| 1 | **过滤器没继承 `Attribute` 却当特性用** | 编译错误 `CS0616: 不是特性类` | `class X : Attribute, IActionFilter` |
| 2 | **同一特性挂两次** | 编译错误 `CS0579: 特性重复` | 加 `[AttributeUsage(..., AllowMultiple = true)]` |
| 3 | **`[ServiceFilter]` 忘了注册** | 运行时 500：`No service for type 'X' has been registered` | `AddScoped<X>()` |
| 4 | **事务 Filter 用 `Exception == null` 判断** | 返回 400 也提交（实测 commit +1） | 同时判断状态码 ≥ 400 |
| 5 | 忘了 `ExceptionHandled = true` | 异常继续往外抛，格式化白做 | 一定要设 |
| 6 | 在 ExceptionFilter 里改已发送的响应 | 抛 `InvalidOperationException` | 先判 `Response.HasStarted` |
| 7 | 想用 ExceptionFilter 处理参数校验错误 | **它压根不触发**（实测 trace 为空） | 用 `InvalidModelStateResponseFactory` |
| 8 | 特性 Filter 的字段当"每请求状态" | 全局共享 + 并发不安全 | 状态放 `HttpContext.Items` |

## 4.7 你下一步可以做的三件事

| # | 做什么 | 预期收获 |
|---|---|---|
| 1 | 跑 3.1 的实验，重点看 `/model` 的 **trace 为空** | 以后不会再想"用 ExceptionFilter 统一处理参数错误" |
| 2 | 给 `price-up` 加事务 Filter，然后**故意 `return BadRequest()`** | 亲眼看到"没抛异常但事务提交了" |
| 3 | 把 `QueryController` 里所有 try/catch 删掉 | 体会"横切逻辑抽出去"之后 Controller 有多干净 |

## 4.8 留给下一批的问题（P138–P143：中间件）

1. 中间件里的 `next()` 和 Filter 里的 `next()` 有什么区别？
2. 为什么 `app.UseXxx()` 的顺序决定一切？写错顺序会怎样（比如 `UseAuthentication` 放在 `UseAuthorization` 后面）？
3. 中间件能不能"不调用 next"来短路？短路之后静态文件还能访问吗？
4. 为什么"中间件 + Filter"要分成两层？只用一种不行吗？（P143 是面试题）
5. 自定义中间件类为什么要 `InvokeAsync(HttpContext, ...)` 这个签名？
6. 怎么给中间件传配置（比如超时时间）而不破坏单例约束？

**下一批是中间件。这一批学的 Filter 是"管线内层"，下一批学"管线外层"——学完 P143 你就能正面回答"中间件和 Filter 的区别"这个面试题了。**

