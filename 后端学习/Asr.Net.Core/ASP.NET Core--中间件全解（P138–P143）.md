==零：补充==

> **这一篇（P138–P143）回答一个问题：请求从跨进 Kestrel 到落到你的 Action 之间，那一段路是谁在管？**

## 它解决什么问题

**先看一个你可能没意识到的事实——你的 `Program.cs` 里早就在用中间件了：**

```csharp
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();     // ← 中间件
}

app.UseHttpsRedirection();               // ← 中间件
app.UseStaticFiles();                    // ← 中间件
app.UseRouting();                        // ← 中间件
app.UseAuthorization();                  // ← 中间件
app.MapControllers();                    // ← 端点（不是中间件，是管道的终点）
```

**这七个东西不是"配置项"，是七个节点，请求会依次穿过它们。** 你之前只是照着模板抄，没问过"为什么是这个顺序"。

**有了这一节的知识，下面这些"玄学问题"才有答案：**

| 你遇到过的问题 | 真正的原因 |
|---|---|
| 为什么改了 `UseHttpsRedirection` 的位置，HTTP 请求就 307 到了奇怪的地方？ | 顺序决定它看到的是"原始请求"还是"已经被改过的请求" |
| 为什么 `UseAuthorization()` 必须写在 `UseRouting()` 后面？ | 授权要知道"这个请求要去哪个 Action"，那个信息是路由给的 |
| 为什么静态文件不走 Filter？ | Filter 在 MVC 内部，静态文件中间件在 MVC 外面，根本没进去 |
| 为什么 404 的请求，日志中间件能记到，异常 Filter 记不到？ | 同上，404 从来没进过 MVC |

## 没有它会怎样

**没有中间件这套机制，你要在每一个 Action 里手写这些东西：**

```csharp
[HttpGet("books")]
public IActionResult List()
{
    // 1. 每个请求记一条日志
    _logger.LogInformation("{Method} {Path}", Request.Method, Request.Path);
    // 2. 每个请求检查 HTTPS
    if (!Request.IsHttps) return Redirect($"https://{Request.Host}{Request.Path}");
    // 3. 每个请求加 CORS 头
    Response.Headers["Access-Control-Allow-Origin"] = "*";
    // 4. 每个请求压缩响应
    // 5. 每个请求兜异常
    try { ... } catch { ... }

    // 真正的业务 3 行
}
```

**21 个接口 × 5 件事 = 105 处重复**，而且**第 22 个接口你一定会漏掉其中一件**。

中间件的价值不是"优雅"，是**"把 N 个接口的横切关注点收成 1 处，且不可能漏"**。

## 它在生态里的位置

**ASP.NET Core 的请求处理模型只有两层：**

```
Kestrel（TCP/HTTP 解析）
   ↓
[ 中间件管道 ]  ← 你写的所有东西都在这里
   ↓
[ 路由 → 端点 ]  ← MVC / Minimal API / 静态文件 都只是"端点"
   ↓
[ Filter 管道 ]  ← 只有 MVC 端点内部才有
   ↓
Action 方法
```

**一句话记住位置关系：**

> **中间件包着路由，路由包着端点，端点里才有 Filter。**
> 所以**中间件能看到一切请求（包括 404），Filter 只能看到"成功匹配到 Action 的请求"**。

**这也是为什么：**

- 认证（`UseAuthentication`）必须放中间件 → 因为它要对**所有**请求生效，包括 404 和静态文件
- 模型验证必须放 Filter → 因为它需要"已经绑定好的参数"
- 压缩、CORS、限流、请求日志 → 中间件（不需要业务上下文）
- 事务、缓存、业务级限流 → Filter（需要知道是哪个 Action）

## 对你的实际意义

**做游戏服务端时，中间件是你唯一能"看住所有流量"的地方。** 想象你的 DesktopPet 后端上线了：

- 有人写脚本每秒 1000 次请求 → 你要在**中间件**层拦（Filter 拦不住 404 的狂扫）
- 你要统计"哪个接口最慢" → **中间件**层记开始/结束时间
- 客户端版本太老，要统一返回 426 → **中间件**层看请求头，不用改 21 个 Action

**另一个更实际的意义：理解 MVC 是什么。**

P141 那节我会带你**手写一个 60 行的 WebAPI 框架**。写完之后你会突然明白：MVC 没有那么神秘，它就是"路由中间件 + 反射调用 + JSON 序列化"三件事的组合，只是微软做得更全。**这个认知比会背 API 重要得多**——以后遇到任何框架（Express、Gin、Spring），你都能一眼看穿它在做什么。

## 什么时候其实用不上

**说实话：自定义中间件的使用频率，比你想的低得多。**

| 场景 | 该不该自己写中间件 |
|---|---|
| 日志、CORS、压缩、HTTPS 跳转、认证 | ❌ **别写，框架全有现成的** |
| 统一响应包装（`{code,data,msg}`） | ⚠️ 可以，但更推荐在 Filter 或 `IResult` 里做（能拿到 Action 上下文） |
| 灰度/AB 测试、多租户路由 | ✅ 这是中间件的正经用途 |
| 需要"看住所有请求包括 404"的统计 | ✅ 只能中间件 |
| 业务逻辑 | ❌ 千万别塞中间件，那会让调试变成噩梦 |

**判断标准只有一条：这件事需不需要知道"用户要访问哪个 Action"？**

- 不需要 → 中间件
- 需要 → Filter

---

==一：概念==

## P138 · 1. 管道不是比喻，它真的是一条委托链

**先看 `RequestDelegate` 的定义（整个中间件体系只有这一个核心类型）：**

```csharp
public delegate Task RequestDelegate(HttpContext context);
```

**就是一个"吃 `HttpContext`、吐 `Task`"的函数指针。** 没有基类、没有接口、没有魔法。

**一个中间件的本质是这样的一个函数：**

```csharp
// 伪代码：一个中间件 = 吃「下一个中间件」，吐出「自己这个中间件」
Func<RequestDelegate, RequestDelegate> middleware = next => async ctx =>
{
    // 进入时干活
    await next(ctx);        // 交给下一个
    // 退出时干活
};
```

**`app.Use(...)` 做的事就是把这个函数塞进一个列表。** 到最后 `app.Run()` 时，框架从后往前把它们串起来：

```csharp
// 假设注册了 A、B、C 三个，框架最终拼出来的是：
RequestDelegate pipeline = ctx => A(ctx, () => B(ctx, () => C(ctx, terminal)));
```

**注意这个拼接是从后往前的**——所以**最后注册的最先"返回"**，这就是洋葱模型的来源。

| 术语 | 含义 | 在你的代码里 |
|---|---|---|
| 管道（pipeline） | 串起来的委托链 | `app.Use/A/Run` 累积出来的东西 |
| 中间件（middleware） | 链上的一个节点 | 一个 `async (ctx, next) => {}` |
| `next` | "我后面的那一整条链" | 不是"下一个"，是"剩下的全部" |
| 终端（terminal） | 不再调 next 的中间件 | `app.Run(...)` |
| 端点（endpoint） | 最终处理请求的东西 | `MapGet` / `MapControllers` |

> **`next` 不是"下一个中间件"，是"剩下的所有中间件 + 端点"。** 这个理解偏差会导致你误判很多行为，比如以为"不调 next 只是跳过下一个"，其实是**跳过全部**。

## P138 · 2. 洋葱模型：进入是正序，退出是逆序（实测）

**实验代码（写在 `Program.cs`）：**

```csharp
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/pipe"),
    branch =>
    {
        branch.Use(async (HttpContext ctx, RequestDelegate next) =>
        {
            Trace.Add("A.进入");
            await next(ctx);
            Trace.Add("A.退出");
        });

        branch.Use(async (HttpContext ctx, RequestDelegate next) =>
        {
            Trace.Add("B.进入");
            await next(ctx);
            Trace.Add("B.退出");
        });
    });

app.MapGet("/pipe/ok", () =>
{
    Trace.Add("Endpoint");
    return "ok";
});
```

**实测结果（`GET /pipe/ok`）：**

```
A.进入
B.进入
Endpoint
B.退出
A.退出
```

**画出来就是：**

```
A.进入 ──┐
         B.进入 ──┐
                  Endpoint
         B.退出 ──┘
A.退出 ──┘
```

**这个形状决定了三件事：**

1. **`next` 之前**的代码：请求进来时执行（正序 A→B）
2. **`next` 之后**的代码：响应回去时执行（逆序 B→A）
3. **`next` 之后的代码在异常时会跳过**——除非你 `try/finally`

**第 3 条是最容易踩的：**

```csharp
app.Use(async (HttpContext ctx, RequestDelegate next) =>
{
    var sw = Stopwatch.StartNew();
    await next(ctx);                                  // 如果这里抛异常
    _logger.LogInformation("耗时 {Ms}ms", sw.ElapsedMilliseconds);   // ← 永远不执行
});
```

**正确写法：**

```csharp
app.Use(async (HttpContext ctx, RequestDelegate next) =>
{
    var sw = Stopwatch.StartNew();
    try
    {
        await next(ctx);
    }
    finally
    {
        _logger.LogInformation("耗时 {Ms}ms", sw.ElapsedMilliseconds);  // 异常时也记
    }
});
```

> **一句话：`next` 之后写代码 = 写在 `try` 里，要保证执行就得自己加 `try/finally`。**

## P138 · 3. 短路：不调 next 就等于"到此为止"

**实验代码：**

```csharp
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/short"),
    branch => branch.Use(async (HttpContext ctx, RequestDelegate next) =>
    {
        Trace.Add("S.进入（不调 next）");
        ctx.Response.StatusCode = 418;
        await ctx.Response.WriteAsync("short-circuit");
        // 注意：没有 await next(ctx);
    }));

app.MapGet("/short/x", () => { Trace.Add("Endpoint（不该出现）"); return "endpoint"; });
```

**实测（外层还有一个全局的 G 中间件）：**

```
HTTP 418
响应体：short-circuit
trace：
  G.进入
  S.进入（不调 next）
  G.退出
```

**三个结论，每一个都很重要：**

| 现象 | 说明 |
|---|---|
| `Endpoint（不该出现）` 没出现 | ✅ 短路生效，下游（含端点）全跳过 |
| **`G.退出` 仍然执行了** | ⚠️ **短路只阻断下游，不阻断上游的退出代码** |
| HTTP 418 | 你可以任意设状态码，框架不干预 |

**第二条为什么重要？** 因为它意味着：

> **一个中间件短路了，它上游所有中间件的"`next` 之后"代码照样跑。**
> 所以你在上游做"计时/清理/还原状态"，不用担心被短路跳过——但你在**下游**做的清理会被跳过。

**典型应用：**

```csharp
// 认证中间件：没登录就直接返回 401，后面的接口一个都不执行
app.Use(async (HttpContext ctx, RequestDelegate next) =>
{
    if (!ctx.Request.Headers.ContainsKey("Authorization"))
    {
        ctx.Response.StatusCode = 401;
        await ctx.Response.WriteAsync("未登录");
        return;                    // ← 这就是短路，return 而不是 await next
    }
    await next(ctx);
});
```

**⚠️ 一个必须知道的坑：短路时如果忘了 `return`，会写两次响应：**

```csharp
// 错误写法
if (!authorized)
{
    ctx.Response.StatusCode = 401;
    await ctx.Response.WriteAsync("未登录");
    // 忘了 return！
}
await next(ctx);   // ← 下游继续执行，再写一次响应 → InvalidOperationException
```

## P139 · 4. Use / Run / Map / MapWhen / UseWhen 五个动词

**先看一张总表：**

| API | 能不能调 next | 有没有条件 | 结束分支后回主管道吗 | 典型用途 |
|---|---|---|---|---|
| `app.Use(...)` | ✅ | ❌ 只对当前路径生效 | — | 通用中间件 |
| `app.Run(...)` | ❌ **永远不调** | ❌ | — | 终端处理（管道结束） |
| `app.Map("/x", ...)` | 分支里可以 | ✅ **按路径前缀** | ❌ **不回** | 完全不同的一套 API（如 `/api` vs `/admin`） |
| `app.MapWhen(pred, ...)` | 分支里可以 | ✅ **任意条件** | ❌ **不回** | 按请求头/环境分流 |
| `app.UseWhen(pred, ...)` | 分支里可以 | ✅ **任意条件** | ✅ **会回** | 给某类请求加处理，然后继续走正常流程 |

**`Use` 和 `Run` 的区别只有一个：`Run` 没有 `next` 参数。**

```csharp
app.Use(async (HttpContext ctx, RequestDelegate next) => await next(ctx));  // 有 next
app.Run(async ctx => await ctx.Response.WriteAsync("终点"));                // 没有 next
```

**`app.Run()` 还有一个重载是"启动应用"（无参数），别搞混：**

```csharp
app.Run(async ctx => { ... });   // 终端中间件
app.Run();                       // 启动！阻塞在这里
```

> **这两个同名方法差一个参数，语义完全不同。** 看到 `app.Run();` 就知道程序要开始监听端口了。

**`Map` / `MapWhen` / `UseWhen` 三者的选择：**

```
需要按「路径前缀」分流？
├─ 是 → app.Map("/api", branch => { ... })      分支独立，不回来
└─ 否 → 需要按「任意条件」分流？
        ├─ 是 → 分流后还要继续走正常流程？
        │       ├─ 要   → app.UseWhen(pred, branch => { ... })   会 rejoin
        │       └─ 不要 → app.MapWhen(pred, branch => { ... })   不 rejoin
        └─ 否 → app.Use(...)
```

## P139 · 5. 两个 Use 重载：无参 next() 和 next(ctx)

**这是我自己写实验代码时撞的第一个编译错误，很值得记住。**

**`app.Use` 有两个重载：**

```csharp
// 重载 1（老式，.NET Core 1.x 时代）
IApplicationBuilder Use(this IApplicationBuilder app,
    Func<HttpContext, Func<Task>, Task> middleware);
//                   ↑        ↑
//                 context   无参的 next，调用方式是 next()

// 重载 2（新式，现在推荐）
IApplicationBuilder Use(this IApplicationBuilder app,
    Func<HttpContext, RequestDelegate, Task> middleware);
//                   ↑        ↑
//                 context   RequestDelegate，调用方式是 next(ctx)
```

**如果你 lambda 里不写参数类型，编译器就懵了：**

```csharp
app.Use(async (ctx, next) =>
{
    await next();      // ← 到底该不该传 ctx？编译器不知道选哪个重载
});
```

**实测报错原文：**

```
error CS0121: 以下方法或属性之间的调用具有二义性:
  "UseExtensions.Use(IApplicationBuilder, Func<HttpContext, Func<Task>, Task>)" 和
  "UseExtensions.Use(IApplicationBuilder, Func<HttpContext, RequestDelegate, Task>)"
```

**如果你强行标注 `RequestDelegate` 但写成无参调用，报另一个错：**

```csharp
app.Use(async (HttpContext ctx, RequestDelegate next) =>
{
    await next();          // ← 错
});
```

```
error CS7036: 未提供与"RequestDelegate"的所需参数"context"对应的参数
```

**为什么？** 因为 `RequestDelegate` 的定义是 `Task (HttpContext)`——**它自己就要一个 `HttpContext` 参数**，所以必须 `next(ctx)`。

| 写法 | 是否合法 | 说明 |
|---|---|---|
| `app.Use(async (ctx, next) => { await next(); })` | ❌ CS0121 | 二义性 |
| `app.Use(async (HttpContext ctx, RequestDelegate next) => { await next(); })` | ❌ CS7036 | RequestDelegate 要参数 |
| `app.Use(async (HttpContext ctx, RequestDelegate next) => { await next(ctx); })` | ✅ | **推荐，现代写法** |
| `app.Use(async (HttpContext ctx, Func<Task> next) => { await next(); })` | ✅ | 老写法，能用 |

> **实用建议：永远写 `(HttpContext ctx, RequestDelegate next)` 然后 `await next(ctx)`。** 显式类型 + 新式重载，两个坑一起避开。

## P139 · 6. Map 和 UseWhen 的本质区别：rejoin（实测 500）

**这一条是全网文章很少讲清、但一出事就要查半天的东西。**

**看微软源码里两个方法的实现差别（`Map` 少了最后一行）：**

```csharp
// UseWhen 的实现（简化）
public static IApplicationBuilder UseWhen(this IApplicationBuilder app, Func<HttpContext,bool> predicate, Action<IApplicationBuilder> configuration)
{
    var branchBuilder = app.New();
    configuration(branchBuilder);
    branchBuilder.Run(next);            // ★ 分支末尾「接回主管道」
    var branch = branchBuilder.Build();
    ...
}

// Map 的实现（简化）
public static IApplicationBuilder Map(this IApplicationBuilder app, PathString pathMatch, Action<IApplicationBuilder> configuration)
{
    var branchBuilder = app.New();
    configuration(branchBuilder);
    var branch = branchBuilder.Build();   // ★ 没有 branchBuilder.Run(next)
    ...
}
```

**差别就一行：`UseWhen` 的分支末尾自动接了 `next`，`Map` 没接。**

**实测对比（同一份代码，只改 API）：**

```csharp
// ① Map 分支：只写一个 Use，末尾没终端
app.Map("/cmp/map", b => b.Use(async (HttpContext c, RequestDelegate n) =>
{
    Trace.Add("Map 分支内 Use（调 next）");
    await n(c);
}));
app.MapGet("/cmp/map", () => { Trace.Add("端点（Map 不 rejoin）"); return "endpoint"; });

// ② UseWhen 分支：同样的写法
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/cmp/when"),
    b => b.Use(async (HttpContext c, RequestDelegate n) =>
    {
        Trace.Add("UseWhen 分支内 Use（调 next）");
        await n(c);
    }));
app.MapGet("/cmp/when", () => { Trace.Add("端点（UseWhen 会 rejoin）"); return "endpoint"; });
```

**实测结果：**

| 请求 | HTTP | 响应体 | trace |
|---|---|---|---|
| `GET /cmp/map` | **500** | 异常页 | `G.进入` → `Map 分支内 Use（调 next）` |
| `GET /cmp/when` | **200** | `endpoint` | `G.进入` → `UseWhen 分支内 Use` → `端点（UseWhen 会 rejoin）` → `G.退出` |

**`/cmp/map` 的异常原文（这个错误信息信息量极大）：**

```
System.InvalidOperationException: The request reached the end of the pipeline
without executing the endpoint: 'HTTP: GET /cmp/map'.
Please register the EndpointMiddleware using 'IApplicationBuilder.UseEndpoints(...)' if using routing.
   at Microsoft.AspNetCore.Builder.ApplicationBuilder.<>c.<Build>b__25_0(HttpContext context)
   at Microsoft.AspNetCore.Builder.Extensions.MapMiddleware.InvokeCore(...)
```

**翻译一下这三句话：**

1. `Map` 分支里调 `next` → 走到了分支管道的末尾
2. 分支末尾**不是**主管道的下一个中间件，而是**框架放的"端点占位符"**
3. 占位符发现"路由说要执行 `GET /cmp/map` 这个端点，但没人执行它" → 抛异常

**为什么会这么设计？** 因为在 .NET Core 3.0 之后，路由被拆成了"匹配"和"执行"两步：

```
UseRouting()      ← 匹配：算出"这个请求该去哪个 Endpoint"，存进 ctx
   ...
UseEndpoints()    ← 执行：真正调用那个 Endpoint，并把剩下的中间件接在后面
```

`Map` 分支切断了主管道，所以**永远到不了 `UseEndpoints`**，端点自然没执行。

> **实用结论：**
> - **`Map` 分支里必须是自给自足的完整管道**（有 `Run` 或完整的 `MapXxx`），否则会 500
> - **`UseWhen` 可以放心只写"加一段处理"**，它会自动回主管道
> - 你只是想"给某些请求加点东西" → **用 `UseWhen`**
> - 你想"完全另一套 API" → **用 `Map`，但分支里记得收尾**

## P140 · 7. 中间件类：约定式

**内联 lambda 的缺点：**

- 没法注入依赖（`app.Use` 里只能拿到 `ctx`）
- 代码长了塞在 `Program.cs` 里很难看
- 没法单元测试

**所以有了"中间件类"。约定式的约定只有三条：**

| 约定 | 要求 |
|---|---|
| 类名 | **随便叫**（不像 Controller 那样有后缀要求） |
| 构造函数 | **必须有** `RequestDelegate` 参数（框架把 `next` 传进来） |
| 处理方法 | 名字必须是 **`InvokeAsync`** 或 **`Invoke`**，返回 `Task`，第一个参数 `HttpContext` |

**完整代码：**

```csharp
public class ConventionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly SingletonSvc _singleton;

    // 构造函数注入：从「根容器」解析 → 只能注 Singleton
    public ConventionMiddleware(RequestDelegate next, SingletonSvc singleton)
    {
        _next = next;
        _singleton = singleton;
        singleton.ConventionCtors++;
    }

    // 方法注入：每个请求从「请求作用域」解析 → Scoped 放这里
    public async Task InvokeAsync(HttpContext ctx, ScopedSvc scoped)
    {
        Trace.Add($"InvokeAsync（每请求一次，Scoped.Id={scoped.Id.ToString()[..8]}）");
        await _next(ctx);
    }
}
```

**注册：**

```csharp
app.UseMiddleware<ConventionMiddleware>();
// 或者用扩展方法封装一下（推荐，见"格式"段）
```

**实测结果（连请求两次）：**

```
第 1 次：G.进入 → InvokeAsync（Scoped.Id=f4f0dec6）→ G.退出
第 2 次：G.进入 → InvokeAsync（Scoped.Id=87489ff5）→ G.退出
```

**`Scoped.Id` 两次不同** → 方法参数注入的 `ScopedSvc` 确实是每请求一个新的。

**构造函数执行次数（用计数器验证）：**

```csharp
app.MapGet("/cls/hits", (SingletonSvc s) => new { conventionCtors = s.ConventionCtors });
```

```
多次请求 /cls/x 之后：{"conventionCtors":1}
```

> **约定式中间件的构造函数在「应用启动时」执行一次，之后所有请求复用同一个实例。**

**这条结论的直接后果：**

| 你在构造函数里做的事 | 后果 |
|---|---|
| 注入 Singleton 服务 | ✅ 正常 |
| 注入 Scoped 服务 | ❌ **启动直接崩溃**（下面第 8 点） |
| 保存"每请求"的状态（如计数器、当前用户） | ❌ **会被所有请求共享**，且并发不安全 |
| 读配置、构造字典缓存 | ✅ 正常，而且就该这么用 |

## P140 · 8. 构造函数 vs InvokeAsync：Scoped 到底注哪里（实测启动崩溃）

**这是本节最有价值的一条实测。**

**实验代码（故意写错）：**

```csharp
public class BadMiddleware
{
    private readonly RequestDelegate _next;

    public BadMiddleware(RequestDelegate next, ScopedSvc scoped)   // ← 构造函数注 Scoped
    {
        _next = next;
    }

    public Task InvokeAsync(HttpContext ctx) => _next(ctx);
}

// 注册
app.UseMiddleware<BadMiddleware>();
```

**编译通过。然后——应用根本启动不了。**

**实测异常（`dotnet run` 直接退出，进程都没起来）：**

```
Unhandled exception. System.InvalidOperationException:
Cannot resolve scoped service 'MidTest.ScopedSvc' from root provider.
   at Microsoft.Extensions.DependencyInjection.ServiceLookup.CallSiteValidator.ValidateResolution(...)
   at Microsoft.Extensions.DependencyInjection.ServiceProvider.GetService(Type serviceType)
   at Microsoft.Extensions.DependencyInjection.ActivatorUtilities.ConstructorMatcher.CreateInstance(IServiceProvider provider)
   at Microsoft.AspNetCore.Builder.UseMiddlewareExtensions.ReflectionMiddlewareBinder.CreateMiddleware(RequestDelegate next)
   at Microsoft.AspNetCore.Builder.ApplicationBuilder.Build()
   ...
   at Microsoft.AspNetCore.Hosting.GenericWebHostService.StartAsync(CancellationToken cancellationToken)
```

**从堆栈读出三件事：**

| 堆栈里的帧 | 说明 |
|---|---|
| `ActivatorUtilities.ConstructorMatcher.CreateInstance` | 中间件实例是**反射创建的**，构造函数的参数从 `IServiceProvider` 解析 |
| `CallSiteValidator.ValidateResolution` | **验证器**发现"从根容器解析 Scoped"→ 主动抛异常（这是 .NET Core 3.0+ 的检查） |
| `ApplicationBuilder.Build()` → `Host.StartAsync` | 发生在**启动阶段**，不是请求阶段 |

**所以：**

> **构造函数注入 Scoped，不是"请求时报 500"，而是"应用起不来"。**
> 这个报错很响亮，所以其实不难查——真正危险的是**注了 Singleton 却以为是 Scoped**（比如注入了 `DbContext` 的 Singleton 包装类），那个不报错，只是数据串了。

**正确写法（对比表）：**

| 依赖的生命周期 | 注在哪 | 原因 |
|---|---|---|
| Singleton | 构造函数 ✅ | 中间件本身就是单例，天生匹配 |
| Scoped | **`InvokeAsync` 的参数** ✅ | 每个请求都从请求作用域解析 |
| Transient | 两处都行 | 但注构造函数等于"只创建一次"，失去了 Transient 的意义 |
| `IOptionsSnapshot` / `IOptionsMonitor` | `InvokeAsync`（Snapshot）/ 构造函数（Monitor） | Snapshot 是 Scoped，Monitor 是 Singleton |

**为什么方法参数能注入？** 因为 `UseMiddleware` 在调用 `InvokeAsync` 时，会做这样的事（源码逻辑简化）：

```csharp
// 框架内部：反射调用 InvokeAsync，参数从 ctx.RequestServices 解析
object[] args = method.GetParameters()
    .Select(p => p.ParameterType == typeof(HttpContext)
        ? ctx
        : ctx.RequestServices.GetRequiredService(p.ParameterType))   // ← 请求作用域！
    .ToArray();

await (Task)method.Invoke(_instance, args);
```

**注意 `ctx.RequestServices`**——它是**当前请求的作用域**，不是根容器。这就是为什么方法参数能注 Scoped。

## P140 · 9. 工厂式 IMiddleware

**约定式有个限制：中间件实例是单例，所以状态没法按请求隔离。**

**实现 `IMiddleware` 接口就变成"每请求新建"：**

```csharp
public class FactoryMiddleware : IMiddleware
{
    private readonly ScopedSvc _scoped;

    public FactoryMiddleware(ScopedSvc scoped)      // ← 构造函数直接注 Scoped，合法！
    {
        _scoped = scoped;
        Trace.Add($"ctor（每请求新建，Scoped.Id={scoped.Id.ToString()[..8]}）");
    }

    public Task InvokeAsync(HttpContext ctx, RequestDelegate next)
    {
        Trace.Add("FactoryMiddleware.InvokeAsync");
        return next(ctx);
    }
}
```

**注册要多一步（必须注册到 DI 容器）：**

```csharp
builder.Services.AddTransient<FactoryMiddleware>();   // ← 不加这行会报错
app.UseMiddleware<FactoryMiddleware>();
```

**实测（连请求两次）：**

```
G.进入
FactoryMiddleware.ctor（每请求新建，Scoped.Id=05e70e89）
FactoryMiddleware.InvokeAsync
G.退出
G.进入
FactoryMiddleware.ctor（每请求新建，Scoped.Id=8e9e3285）
FactoryMiddleware.InvokeAsync
G.退出
```

**`ctor` 每次都跑，`Scoped.Id` 每次都变** → 确实是每请求一个新的。

**为什么能注 Scoped？** 因为 `IMiddleware` 是通过 `IMiddlewareFactory` 创建的，而它的实现是：

```csharp
public IMiddleware Create(Type middlewareType)
{
    return _serviceProvider.GetRequiredService(middlewareType) as IMiddleware;
    //     ↑ 这里的 _serviceProvider 是「请求作用域」，不是根容器
}
```

**两种写法怎么选：**

| | 约定式（`InvokeAsync`） | 工厂式（`IMiddleware`） |
|---|---|---|
| 实例生命周期 | **应用级单例** | **每请求新建** |
| 构造函数注 Scoped | ❌ 启动崩 | ✅ 可以 |
| 要不要注册 DI | ❌ 不用 | ✅ `AddTransient` |
| 性能 | 略好（一次创建） | 略差（每请求反射创建） |
| 官方推荐 | ✅ **默认用它** | 只在"必须每请求持有 Scoped 状态"时用 |

> **默认选约定式，把 Scoped 放 `InvokeAsync` 参数里。** 工厂式存在的意义是"我需要在构造函数里就拿到 Scoped 并保存到字段"，这种需求不常见。

## P141 · 10. 徒手撸一个 WebAPI 框架

**这一节的目的是让你"看穿" MVC。**

**先问：一个 WebAPI 框架最少需要什么？**

1. **路由**：从 URL 找到"该执行哪个方法"
2. **创建对象**：new 一个控制器实例
3. **绑定参数**：把 `?a=3&b=4` 变成方法的实参
4. **反射调用**：真的把方法跑起来
5. **序列化**：把返回值变成 JSON 写回响应

**就这么五件事。MVC 在这五件事上加了模型验证、过滤器、内容协商、API 版本……但骨架就是这个。**

**完整实现（60 行，可直接跑）：**

```csharp
using System.Reflection;
using System.Text.Json;

// ① 控制器基类（只为标记和筛选，没有实际成员）
public abstract class MiniControllerBase { }

// ② 一个控制器（路由名 = 类名去掉 "Controller" → minibooks）
public class MiniBooksController : MiniControllerBase
{
    public object List() => new[]
    {
        new { id = 1, title = "CLR via C#", price = 128 },
        new { id = 2, title = "EF Core 深入", price = 99 },
    };

    public object Get(int id) => id switch
    {
        1 => new { id = 1, title = "CLR via C#" },
        2 => new { id = 2, title = "EF Core 深入" },
        _ => new { error = $"没有 id={id} 的书" }
    };

    public object Sum(int a, int b) => new { a, b, sum = a + b };
}

// ③ 框架本体：一个中间件
public class MiniApiMiddleware
{
    private readonly RequestDelegate _next;
    private readonly Dictionary<string, Type> _controllers;

    public MiniApiMiddleware(RequestDelegate next)
    {
        _next = next;
        // 启动时扫一遍程序集，把 XxxController 都收集起来（这就是 MVC 的"应用模型"的雏形）
        _controllers = typeof(MiniApiMiddleware).Assembly.GetTypes()
            .Where(t => t is { IsAbstract: false, IsClass: true }
                        && t.Name.EndsWith("Controller")
                        && typeof(MiniControllerBase).IsAssignableFrom(t))
            .ToDictionary(t => t.Name[..^"Controller".Length], StringComparer.OrdinalIgnoreCase);
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        // ---- 路由：/mini/{controller}/{action} ----
        var segs = ctx.Request.Path.Value?.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segs is not { Length: >= 3 } || !segs[0].Equals("mini", StringComparison.OrdinalIgnoreCase))
        {
            await _next(ctx);       // 不是我的地盘，交给下游
            return;
        }

        var (ctrlName, actionName) = (segs[1], segs[2]);

        if (!_controllers.TryGetValue(ctrlName, out var ctrlType))
        {
            await Write(ctx, 404, new { error = $"找不到控制器 {ctrlName}" });
            return;
        }

        var action = ctrlType.GetMethod(actionName,
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (action is null)
        {
            await Write(ctx, 404, new { error = $"{ctrlName} 里没有方法 {actionName}" });
            return;
        }

        // ---- 创建对象 ----
        var instance = Activator.CreateInstance(ctrlType)!;

        // ---- 参数绑定：从查询串按名字取，再按目标类型转换 ----
        var args = action.GetParameters().Select(p =>
        {
            var raw = ctx.Request.Query[p.Name!].FirstOrDefault();
            if (raw is null) return p.HasDefaultValue ? p.DefaultValue : null;
            return Convert.ChangeType(raw, p.ParameterType);
        }).ToArray();

        // ---- 反射调用 + 序列化 ----
        try
        {
            var result = action.Invoke(instance, args);
            await Write(ctx, 200, result);
        }
        catch (TargetInvocationException ex)
        {
            await Write(ctx, 500, new { error = ex.InnerException?.Message });
        }
    }

    // 默认序列化会把中文转成 \uXXXX，加这个选项让它可读
    private static readonly JsonSerializerOptions JsonOpt = new()
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private static async Task Write(HttpContext ctx, int status, object? body)
    {
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json; charset=utf-8";
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOpt));
    }
}
```

**注册：**

```csharp
app.UseMiddleware<MiniApiMiddleware>();
```

**实测结果（全部真实输出）：**

```
GET /mini/minibooks/list
→ 200  [{"id":1,"title":"CLR via C#","price":128},{"id":2,"title":"EF Core 深入","price":99}]

GET /mini/minibooks/get?id=2
→ 200  {"id":2,"title":"EF Core 深入"}

GET /mini/minibooks/sum?a=3&b=4
→ 200  {"a":3,"b":4,"sum":7}

GET /mini/minibooks/nope
→ 404  {"error":"minibooks 里没有方法 nope"}

GET /mini/x/y
→ 404  {"error":"找不到控制器 x"}

GET /pipe/ok（非 /mini 路径）
→ 200  ok          ← 正确交给下游
```

**写完之后你应该看出的东西：**

| 你写的 | MVC 里叫什么 |
|---|---|
| 扫程序集找 `XxxController` | `ApplicationPartManager` / 应用模型 |
| 类名去掉 `Controller` 就是路由名 | 控制器命名约定 |
| `GetMethod` 找方法 | `ActionDescriptor` 选择 |
| `Convert.ChangeType` 转参数 | **模型绑定**（MVC 版复杂 100 倍：支持 JSON body、路由约束、自定义 binder） |
| `JsonSerializer.Serialize` | **内容协商**（MVC 版支持 XML、自定义 formatter） |
| `try/catch TargetInvocationException` | **ExceptionFilter** |

> **这就是为什么我说"MVC 不神秘"。** 你刚写的 60 行是它的骨架，微软加的是"工业级的细节"：并发缓存、AOT 兼容、各种边界、性能优化、可扩展点。
>
> **但这个实验有个真实用途**：如果你以后要写一个"只支持 3 个接口的极简服务"，或者要给某个特殊场景做"非 HTTP 协议适配"，你会知道**不需要引入 MVC**，一个中间件就够。

## P142 · 11. Markdown 渲染中间件

**这个案例的价值不在 Markdown，在"如何读取并改写响应体"。**

**难点：端点在中间件下游执行，它已经把内容直接写进了 `Response.Body`。等 `next` 返回时，内容已经发出去了——你没法再改。**

**解法：把 `Response.Body` 换成一个内存流，等下游写完，读出来，处理后写回真正的流。**

```csharp
using System.Text;
using Markdig;

public class MarkdownMiddleware
{
    private readonly RequestDelegate _next;

    public MarkdownMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext ctx)
    {
        if (!ctx.Request.Path.StartsWithSegments("/md"))
        {
            await _next(ctx);      // 不是我的地盘，直通
            return;
        }

        // ① 保存真正的流，把 Body 换成内存流
        var originalBody = ctx.Response.Body;
        await using var buffer = new MemoryStream();
        ctx.Response.Body = buffer;

        try
        {
            await _next(ctx);      // ② 下游把 markdown 写进 buffer

            // ③ 读出来
            buffer.Position = 0;
            var md = await new StreamReader(buffer, Encoding.UTF8).ReadToEndAsync();

            // ④ 转换
            var html = Markdown.ToHtml(md);

            // ⑤ 写回真正的流
            ctx.Response.Body = originalBody;
            ctx.Response.ContentType = "text/html; charset=utf-8";
            ctx.Response.ContentLength = null;              // ★ 长度变了，必须清掉
            await ctx.Response.WriteAsync(html);
        }
        finally
        {
            ctx.Response.Body = originalBody;               // ⑥ 无论如何都还原
        }
    }
}
```

**端点（故意用原始字符串字面量写 markdown）：**

```csharp
app.MapGet("/md/demo", () => """
# 中间件案例

这是**加粗**，这是*斜体*。

- 读文件
- 转 HTML
- 写回去
""");
```

**注册（需要先装包）：**

```bash
dotnet add package Markdig --version 0.38.0
```

```csharp
app.UseMiddleware<MarkdownMiddleware>();
```

**实测结果：**

```
请求：GET /md/demo
响应头：Content-Type: text/html; charset=utf-8

响应体：
<h1>中间件案例</h1>
<p>这是<strong>加粗</strong>，这是<em>斜体</em>。</p>
<ul>
<li>读文件</li>
<li>转 HTML</li>
<li>写回去</li>
</ul>
```

**四个必须注意的点：**

| 点 | 说明 |
|---|---|
| **`ctx.Response.ContentLength = null`** | 端点写 string 时设了 `Content-Length`（markdown 长度），转成 HTML 后长度变了。不清掉 → 客户端只收到前 N 字节，**响应被截断** |
| **`finally` 里还原 `Body`** | 不还原的话，这个 `MemoryStream` 会被 `Dispose`，后续中间件（或框架）再写就抛 `ObjectDisposedException` |
| **`Content-Type` 要改** | 端点设的是 `text/plain`，不改成 `text/html`，浏览器会显示源码 |
| **只处理自己的路径** | 不加 `StartsWithSegments` 判断，所有响应都要过一遍内存流 → 大文件（图片、视频）会把内存打爆 |

**为什么这个案例值得学？** 因为它是"响应后处理"的标准套路，同样的结构可以用来做：

- **响应压缩**（读完 → GZip → 写回）
- **统一响应包装**（读完 JSON → 包成 `{code,data,msg}` → 写回）
- **响应脱敏**（读完 → 正则替换手机号 → 写回）
- **HTML 后处理**（读完 → 注入一段 script → 写回）

> **⚠️ 但生产环境要注意：** 这个方案会把整个响应**缓存在内存**里。响应 10MB 就是 10MB 内存/请求。真正的压缩中间件用的是**流式处理**（边读边压边写），不是"先读完再处理"。教学用可以，上线前换成 `app.UseResponseCompression()`。

## P143 · 12. 中间件 vs Filter：边界在哪（面试题）

**这题之所以高频，是因为它考的不是记忆，是"你知不知道请求在你手里经过了哪几层"。**

**先看一张"谁在什么位置"的图：**

```
请求 → Kestrel
  │
  ├─ 中间件 A（能看到：所有请求，包括 404、静态文件、健康检查）
  │    ├─ 中间件 B
  │    │    ├─ 中间件 C
  │    │    │    ├─ 路由匹配（决定去哪个 Endpoint）
  │    │    │    │    ├─ 端点：如果有 Filter，这里是 Filter 入口
  │    │    │    │    │    ├─ ResourceFilter
  │    │    │    │    │    ├─ 模型绑定 + 验证（失败 → 400，直接返回）
  │    │    │    │    │    ├─ ActionFilter
  │    │    │    │    │    ├─ ★ Action 方法
  │    │    │    │    │    ├─ ActionFilter（后）
  │    │    │    │    │    ├─ ResultFilter
  │    │    │    │    │    └─ ExceptionFilter
  │    │    │    │    └─ 端点结束
  │    │    │    └─ 返回
  │    │    └─ 返回
  │    └─ 返回
  └─ 响应
```

**核心差别只有一句：**

> **中间件在"路由之外"，Filter 在"端点之内"。**

**实测证据（这一篇里跑出来的，不是背的）：**

| 请求 | 中间件执行了吗 | Filter 执行了吗 |
|---|---|---|
| `GET /nope`（路径不存在，404） | ✅ **G.进入 / G.退出 都记录到了** | ❌ **一个都没跑**（P134 实测过：模型验证 400 时 trace 为空） |
| `GET /cmp/map`（500） | ✅ 记录到了 | ❌ 没进 MVC |
| `GET /md/demo`（静态内容） | ✅ 被 Markdown 中间件改写 | ❌ 静态文件不走 MVC |

**完整对照表（背这张就够）：**

| 维度 | 中间件 | Filter |
|---|---|---|
| **执行位置** | 路由之前/之外 | 路由之后、Action 前后 |
| **能看到 404 吗** | ✅ 能 | ❌ 不能（404 没进 MVC） |
| **能拿到 Action 参数吗** | ❌ 不能（还不知道去哪个 Action） | ✅ 能（`ActionExecutingContext.ActionArguments`） |
| **能拿到模型验证结果吗** | ❌ 不能 | ✅ 能（`ModelState`） |
| **能改响应体吗** | ✅ 能（换 `Response.Body`） | ⚠️ ResultFilter 能，且要小心"响应已开始" |
| **依赖注入** | 构造函数=Singleton，Scoped 走 `InvokeAsync` 参数 | 走 DI（`ServiceFilter`/`TypeFilter`），或特性直接 new |
| **粒度** | 全局（整个应用一套） | 可以精确到 **单个 Action** |
| **能不能短路** | ✅ `return` 不调 next | ✅ `context.Result = ...` |
| **典型用途** | 认证、CORS、压缩、HTTPS 跳转、静态文件、请求日志、全局限流 | 模型验证、事务、业务级限流、审计、Action 级缓存 |

**五个"该用谁"的判断（按顺序问自己）：**

```
1. 这件事需要知道「用户要访问哪个 Action」吗？
   ├─ 不需要 → 中间件
   └─ 需要   → Filter

2. 这件事要对「404 / 静态文件 / 所有请求」生效吗？
   ├─ 要   → 中间件（Filter 根本看不到）
   └─ 不要 → 往下

3. 这件事要精确到「某个 Action」吗？
   ├─ 要   → Filter（中间件做不到，除非在中间件里判断路径，很丑）
   └─ 不要 → 都可以，看 4、5

4. 需要读请求体/响应体并改写吗？
   ├─ 要改响应体 → 中间件（换 Body 最干净）
   └─ 只读请求体 → Filter 更方便（ModelState 已经帮你读好了）

5. 要和业务数据打交道（DbContext、当前用户）？
   ├─ 要   → Filter（Scoped 注入天然支持，事务管理就在这层）
   └─ 不要 → 中间件
```

**面试时的完整回答模板（我建议你背这个结构，不是背结论）：**

> **"它们处在请求管道的不同层。** 中间件是 ASP.NET Core 最外层的一条委托链，包着路由在内的一切，所以能看到所有请求——包括 404 和静态文件。Filter 是 MVC 内部的机制，只有请求被路由到某个 Action 之后才会执行。
>
> **这个位置差异决定了能力差异：** 中间件拿不到"用户要访问哪个 Action"、也拿不到绑定好的参数，所以它适合做认证、CORS、压缩这类与业务无关的事。Filter 能拿到 `ActionArguments`、`ModelState`、`Result`，所以适合做模型验证、事务、Action 级限流。
>
> **一个具体的边界例子：** 模型验证失败时框架直接返回 400，这时候**一个 Filter 都不会执行**，包括 ExceptionFilter——所以"用 ExceptionFilter 统一处理参数错误"是行不通的，正确做法是 `InvalidModelStateResponseFactory`。但中间件在这种情况下仍然执行。
>
> **选择标准一句话：** 需要知道去哪个 Action 就用 Filter，需要对所有请求生效就用中间件。"

---

==二：格式==

## 1. 五个注册 API 的签名与要点

```csharp
// ① Use：加一个中间件，必须调 next 才会往下走
app.Use(async (HttpContext ctx, RequestDelegate next) => { await next(ctx); });

// ② Run：终端中间件，不调 next，管道到此结束
app.Run(async ctx => { await ctx.Response.WriteAsync("end"); });

// ③ Run()：无参 = 启动应用（阻塞）
app.Run();

// ④ Map：按路径前缀分支，分支不接回主管道
app.Map("/api", branch =>
{
    branch.Run(async ctx => { await ctx.Response.WriteAsync("api"); });   // ← 必须自给自足
});

// ⑤ MapWhen：按任意条件分支，分支不接回主管道
app.MapWhen(ctx => ctx.Request.Headers.ContainsKey("X-Debug"), branch =>
{
    branch.Run(async ctx => { await ctx.Response.WriteAsync("debug"); });
});

// ⑥ UseWhen：按任意条件分支，分支自动接回主管道
app.UseWhen(ctx => ctx.Request.Path.StartsWithSegments("/admin"), branch =>
{
    branch.Use(async (HttpContext ctx, RequestDelegate next) =>
    {
        // 加一段处理，然后继续走正常流程
        await next(ctx);
    });
});
```

## 2. 中间件类模板（约定式）

```csharp
public class MyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ISingletonService _single;        // ✅ Singleton 注这里

    public MyMiddleware(RequestDelegate next, ISingletonService single)
    {
        _next = next;
        _single = single;
    }

    // 方法名必须是 InvokeAsync 或 Invoke，返回 Task
    public async Task InvokeAsync(HttpContext ctx, IScopedService scoped)   // ✅ Scoped 注这里
    {
        // next 之前
        await _next(ctx);
        // next 之后
    }
}

// 注册
app.UseMiddleware<MyMiddleware>();
```

## 3. 中间件类模板（工厂式）

```csharp
public class MyFactoryMiddleware : IMiddleware
{
    private readonly IScopedService _scoped;

    public MyFactoryMiddleware(IScopedService scoped) { _scoped = scoped; }   // ✅ 可以注 Scoped

    public Task InvokeAsync(HttpContext ctx, RequestDelegate next) => next(ctx);
}

// 注册：必须先注册到 DI
builder.Services.AddTransient<MyFactoryMiddleware>();
app.UseMiddleware<MyFactoryMiddleware>();
```

## 4. 执行顺序速查

| 你写的代码 | 执行时机（相对于 Action） |
|---|---|
| 中间件里 `next` **之前** | 最早 |
| Filter 的 `OnActionExecuting` | 中 |
| **Action 方法** | — |
| Filter 的 `OnActionExecuted` | 中 |
| 中间件里 `next` **之后** | 最后（逆序） |

**多个中间件的顺序 = 注册顺序**（`next` 之前正序，`next` 之后逆序）。

## 5. 标准顺序（`Program.cs` 里必须这样排）

```csharp
app.UseExceptionHandler("/error");   // ① 最外层，兜所有异常
app.UseHsts();                        // ②
app.UseHttpsRedirection();            // ③
app.UseStaticFiles();                 // ④ 静态文件在前面，不需要走路由
app.UseRouting();                     // ⑤ 路由匹配
app.UseCors();                        // ⑥ 必须在 Routing 之后、Auth 之前
app.UseAuthentication();              // ⑦ 认证：你是谁
app.UseAuthorization();               // ⑧ 授权：你能干什么（必须在 Routing 之后）
app.MapControllers();                 // ⑨ 端点
```

**为什么是这个顺序（三条硬约束）：**

| 约束 | 原因 |
|---|---|
| `UseExceptionHandler` 在最前 | 异常向上冒泡，只有在上游才能兜住下游的异常 |
| `UseCors` 在 `UseRouting` 之后、`UseAuthorization` 之前 | 预检请求（OPTIONS）要在授权前返回，否则会被 401 拦掉 |
| `UseAuthorization` 在 `UseRouting` 之后 | 授权需要知道"要访问哪个 Endpoint 的什么策略" |

---

==三：代码==

## 1. 最小完整项目（本篇所有实验的合集）

**`MidTest.csproj`：**

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Markdig" Version="0.38.0" />
  </ItemGroup>
</Project>
```

**`Trace.cs`（记录执行轨迹，便于观察顺序）：**

```csharp
namespace MidTest;

public static class Trace
{
    private static readonly List<string> Items = new();

    public static void Add(string s) { lock (Items) Items.Add(s); }

    public static string[] Take()
    {
        lock (Items) { var r = Items.ToArray(); Items.Clear(); return r; }
    }

    public static void Clear() { lock (Items) Items.Clear(); }
}
```

**`Middlewares.cs`（三种中间件写法）：**

```csharp
namespace MidTest;

public class SingletonSvc
{
    public Guid Id { get; } = Guid.NewGuid();
    public int ConventionCtors;
}

public class ScopedSvc
{
    public Guid Id { get; } = Guid.NewGuid();
}

public class ConventionMiddleware
{
    private readonly RequestDelegate _next;

    public ConventionMiddleware(RequestDelegate next, SingletonSvc singleton)
    {
        _next = next;
        singleton.ConventionCtors++;          // 用来证明「构造函数只跑一次」
    }

    public async Task InvokeAsync(HttpContext ctx, ScopedSvc scoped)
    {
        Trace.Add($"InvokeAsync（Scoped.Id={scoped.Id.ToString()[..8]}）");
        await _next(ctx);
    }
}

public class FactoryMiddleware : IMiddleware
{
    public FactoryMiddleware(ScopedSvc scoped)
    {
        Trace.Add($"ctor（每请求新建，Scoped.Id={scoped.Id.ToString()[..8]}）");
    }

    public Task InvokeAsync(HttpContext ctx, RequestDelegate next)
    {
        Trace.Add("FactoryMiddleware.InvokeAsync");
        return next(ctx);
    }
}
```

**`Program.cs`（实验主文件）：**

```csharp
using MidTest;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<SingletonSvc>();
builder.Services.AddScoped<ScopedSvc>();
builder.Services.AddTransient<FactoryMiddleware>();

var app = builder.Build();

// ---- G：全局中间件（排除取样路径，否则 /trace 自己也会写进 trace） ----
app.UseWhen(
    ctx => !ctx.Request.Path.StartsWithSegments("/trace")
           && !ctx.Request.Path.StartsWithSegments("/clear"),
    b => b.Use(async (HttpContext ctx, RequestDelegate next) =>
    {
        Trace.Add("G.进入");
        await next(ctx);
        Trace.Add("G.退出");
    }));

// ---- 案例：徒手撸 WebAPI + Markdown 渲染 ----
app.UseMiddleware<MiniApiMiddleware>();
app.UseMiddleware<MarkdownMiddleware>();

app.MapGet("/md/demo", () => """
# 中间件案例

这是**加粗**，这是*斜体*。

- 读文件
- 转 HTML
- 写回去
""");

// ---- 实验 1：洋葱模型 ----
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/pipe"),
    branch =>
    {
        branch.Use(async (HttpContext ctx, RequestDelegate next) =>
        {
            Trace.Add("A.进入");
            await next(ctx);
            Trace.Add("A.退出");
        });

        branch.Use(async (HttpContext ctx, RequestDelegate next) =>
        {
            Trace.Add("B.进入");
            await next(ctx);
            Trace.Add("B.退出");
        });
    });

app.MapGet("/pipe/ok", () => { Trace.Add("Endpoint"); return "ok"; });

// ---- 实验 2：短路 ----
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/short"),
    branch => branch.Use(async (HttpContext ctx, RequestDelegate next) =>
    {
        Trace.Add("S.进入（不调 next）");
        ctx.Response.StatusCode = 418;
        await ctx.Response.WriteAsync("short-circuit");
    }));

app.MapGet("/short/x", () => { Trace.Add("Endpoint（不该出现）"); return "endpoint"; });

// ---- 实验 3：next 调两次 ----
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/twice"),
    branch => branch.Use(async (HttpContext ctx, RequestDelegate next) =>
    {
        Trace.Add("D.第 1 次 next 前");
        await next(ctx);
        Trace.Add("D.第 1 次 next 后");
        try
        {
            await next(ctx);
            Trace.Add("D.第 2 次 next 成功");
        }
        catch (Exception ex)
        {
            Trace.Add($"D.第 2 次 next 抛 {ex.GetType().Name}: {ex.Message}");
        }
    }));

app.MapGet("/twice/x",    () => { Trace.Add("Endpoint（纯文本）"); return "twice"; });
app.MapGet("/twice/json", () => { Trace.Add("Endpoint（JSON）");   return Results.Json(new { n = 1 }); });

// ---- 实验 4：Run 之后注册的 Use ----
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/after-run"),
    branch =>
    {
        branch.Run(async ctx => { Trace.Add("Run（终端）"); await ctx.Response.WriteAsync("run"); });
        branch.Use(async (HttpContext ctx, RequestDelegate next) =>
        {
            Trace.Add("Run 之后的 Use（不该出现）");
            await next(ctx);
        });
    });

app.MapGet("/after-run/x", () => "endpoint");

// ---- 实验 5/6：类中间件 ----
app.UseWhen(ctx => ctx.Request.Path.StartsWithSegments("/cls"), b => b.UseMiddleware<ConventionMiddleware>());
app.UseWhen(ctx => ctx.Request.Path.StartsWithSegments("/fac"), b => b.UseMiddleware<FactoryMiddleware>());

app.MapGet("/cls/x",     () => "cls");
app.MapGet("/cls/hits",  (SingletonSvc s) => new { conventionCtors = s.ConventionCtors });
app.MapGet("/fac/x",     () => "fac");

// ---- 实验 7：异常边界 ----
// A：UseExceptionHandler 在抛异常之前 → 能捕获
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/err/a"),
    b =>
    {
        b.UseExceptionHandler(h => h.Run(async c =>
        {
            c.Response.StatusCode = 599;
            await c.Response.WriteAsync("CAUGHT-A");
        }));
        b.Use(async (HttpContext c, RequestDelegate n) =>
        {
            await Task.Yield();
            throw new Exception("boom-after-handler");
        });
    });

// B：UseExceptionHandler 在抛异常之后 → 捕获不到
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/err/b"),
    b =>
    {
        b.Use(async (HttpContext c, RequestDelegate n) =>
        {
            await Task.Yield();
            throw new Exception("boom-before-handler");
        });
        b.UseExceptionHandler(h => h.Run(async c =>
        {
            c.Response.StatusCode = 599;
            await c.Response.WriteAsync("CAUGHT-B");
        }));
    });

// C：端点抛异常
app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/err/endpoint"),
    b => b.UseExceptionHandler(h => h.Run(async c =>
    {
        c.Response.StatusCode = 598;
        await c.Response.WriteAsync("CAUGHT-ENDPOINT");
    })));

app.MapGet("/err/a", () => "a");
app.MapGet("/err/b", () => "b");
app.MapGet("/err/endpoint", () => { throw new Exception("boom-in-endpoint"); });

// ---- 实验 8：Map vs UseWhen 的 rejoin ----
app.Map("/cmp/map", b => b.Use(async (HttpContext c, RequestDelegate n) =>
{
    Trace.Add("Map 分支内 Use（调 next）");
    await n(c);
}));
app.MapGet("/cmp/map", () => { Trace.Add("端点（Map 不 rejoin）"); return "endpoint"; });

app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/cmp/when"),
    b => b.Use(async (HttpContext c, RequestDelegate n) =>
    {
        Trace.Add("UseWhen 分支内 Use（调 next）");
        await n(c);
    }));
app.MapGet("/cmp/when", () => { Trace.Add("端点（UseWhen 会 rejoin）"); return "endpoint"; });

// ---- 取样端点 ----
app.MapGet("/trace", () => Results.Json(Trace.Take()));
app.MapPost("/clear", () => { Trace.Clear(); return "ok"; });

app.Run();
```

## 2. 实测输出汇总（对照着看，验证你理解对没有）

**① 洋葱模型 `GET /pipe/ok`**

```
A.进入 / B.进入 / Endpoint / B.退出 / A.退出
```

**② 短路 `GET /short/x`**

```
HTTP 418，响应体 "short-circuit"
trace：G.进入 / S.进入（不调 next） / G.退出
```

**③ next 调两次**

| 端点 | HTTP | 响应体 | trace |
|---|---|---|---|
| `/twice/x`（纯文本） | 200 | **`twicetwice`** | 两次 `Endpoint（纯文本）`，第二次 next **成功** |
| `/twice/json` | 200 | `{"n":1}` | 第二次 next **抛异常** |

`/twice/json` 的异常原文：

```
InvalidOperationException: Headers are read-only, response has already started.
```

**为什么纯文本成功、JSON 失败？** 纯文本调用 `WriteAsync` 只是往 body 里追加字节，头不变；JSON 要设 `Content-Type: application/json`，而头已经发出去了 → 抛异常。

**④ Run 之后注册的 Use `GET /after-run/x`**

```
HTTP 200，响应体 "run"（不是 "endpoint"）
trace：Run（终端）     ← "Run 之后的 Use" 完全没出现
```

**⑤ 约定式中间件的构造函数**

```
请求 /cls/x 多次后：{"conventionCtors":1}     ← 只创建一次
```

**⑥ 构造函数注 Scoped（应用启动就崩）**

```
Unhandled exception. System.InvalidOperationException:
Cannot resolve scoped service 'MidTest.ScopedSvc' from root provider.
   at ...ActivatorUtilities.ConstructorMatcher.CreateInstance(IServiceProvider provider)
   at ...UseMiddlewareExtensions.ReflectionMiddlewareBinder.CreateMiddleware(RequestDelegate next)
   at Microsoft.AspNetCore.Builder.ApplicationBuilder.Build()
```

**⑦ 异常边界**

| 场景 | HTTP | 响应体 |
|---|---|---|
| handler 在抛异常**之前**（`/err/a`） | **599** | `CAUGHT-A` |
| handler 在抛异常**之后**（`/err/b`） | **500** | 开发者异常页（Development）/ 空白（Production） |
| 端点抛异常（`/err/endpoint`） | **598** | `CAUGHT-ENDPOINT` |

**⑧ Map vs UseWhen**

| 请求 | HTTP | 说明 |
|---|---|---|
| `/cmp/map` | **500** | `The request reached the end of the pipeline without executing the endpoint` |
| `/cmp/when` | **200** | 端点正常执行 |

**⑨ 404 时中间件仍然执行 `GET /nope`**

```
HTTP 404
trace：G.进入 / G.退出     ← 中间件看得到 404
```

**⑩ Markdown 渲染**

```
GET /md/demo → Content-Type: text/html; charset=utf-8
<h1>中间件案例</h1><p>这是<strong>加粗</strong>...</p>
```

## 3. 练习：在你的图书系统里加一个「请求耗时」中间件

**目标：** 每个请求结束时，日志里输出 `方法 路径 状态码 耗时ms`，并且**异常请求也要记**。

**要求：**

1. 写成独立的中间件类（放 `Common/` 目录）
2. 用 `Stopwatch` 计时
3. **必须用 `try/finally`**，保证异常时也输出日志
4. 只记 `api/` 开头的请求，静态文件不记
5. 状态码要取**最终的**（可能在 `next` 之后被改）

**✅ 标准答案：**

```csharp
// Common/RequestTimingMiddleware.cs
namespace BookDemo.Common;

public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        // 不是 API 请求就直接过（静态文件、/swagger 等）
        if (!ctx.Request.Path.StartsWithSegments("/api"))
        {
            await _next(ctx);
            return;
        }

        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            await _next(ctx);
        }
        finally
        {
            sw.Stop();
            _logger.LogInformation(
                "{Method} {Path} -> {Status} ({Elapsed}ms)",
                ctx.Request.Method,
                ctx.Request.Path.Value,
                ctx.Response.StatusCode,      // ← next 之后取，才是最终状态码
                sw.ElapsedMilliseconds);
        }
    }
}
```

```csharp
// Program.cs
app.UseMiddleware<BookDemo.Common.RequestTimingMiddleware>();
```

**⚠️ 放的位置很关键：**

```csharp
// 错误的放法：放在 UseExceptionHandler 里面
app.UseExceptionHandler("/error");
app.UseMiddleware<RequestTimingMiddleware>();   // ← 这里异常会冒泡到它上面

// 正确的放法之一：放最外层（能记到异常请求的 500）
app.UseMiddleware<RequestTimingMiddleware>();
app.UseExceptionHandler("/error");
```

**两个必须自己验证的点：**

1. 访问 `GET /api/books` → 应该看到 `200 (xx ms)`
2. 访问一个会抛异常的接口 → **应该仍然有一条日志**（因为 `finally`），而且状态码是 `500`

**如果你把 `try/finally` 去掉，第 2 步就什么都看不到**——这就是本节 P138 第 2 点讲的东西。

---

==四：总结==

## 1. 六节知识一张表

| 节 | 核心内容 | 一句话记住 |
|---|---|---|
| **P138** 概念 | 管道 = 委托链；洋葱模型；短路 | **`next` 是"剩下的全部"，不是"下一个"** |
| **P139** 基本使用 | Use / Run / Map / MapWhen / UseWhen；两个重载 | **`RequestDelegate` 要传 `ctx`，`Func<Task>` 不用** |
| **P140** 中间件类 | 约定式 vs 工厂式；Scoped 注哪里 | **构造函数=单例，Scoped 放 `InvokeAsync` 参数** |
| **P141** 徒手撸 | 路由+反射+序列化 = WebAPI | **MVC 就是这 60 行加了工业级细节** |
| **P142** Markdown | 换 `Response.Body` 改写响应 | **换 Body 要还原，改长度要清 `ContentLength`** |
| **P143** 对比 Filter | 位置差决定能力差 | **中间件在路由外，Filter 在端点内** |

## 2. 五条硬结论（全部实测，可以拿去争论）

| 结论 | 实测证据 |
|---|---|
| **短路只阻断下游，上游的退出代码照常执行** | `/short/x` 的 trace 里 `G.退出` 出现了 |
| **`next` 调两次不一定会报错，纯文本会追加成两份** | `/twice/x` 返回 `twicetwice`，HTTP 200 |
| **构造函数注 Scoped → 应用启动就崩**，不是请求时 500 | `Cannot resolve scoped service ... from root provider`，堆栈在 `Build()` |
| **`Map` 分支调 `next` 会 500**，因为它不 rejoin | `The request reached the end of the pipeline without executing the endpoint` |
| **中间件能看到 404，Filter 看不到** | `GET /nope` 时 `G.进入/退出` 都在；模型验证 400 时 Filter trace 为空 |

## 3. 选择流程图（贴在手边）

```
要加一段全局处理？
├─ 框架已有现成的？（认证/CORS/压缩/HTTPS）
│    └─ 是 → 直接用，别自己写
└─ 否 → 需要知道「去哪个 Action」吗？
     ├─ 不需要 → 中间件
     │    ├─ 只对某些请求 → UseWhen
     │    ├─ 完全另一套 API → Map / MapWhen（分支里记得收尾）
     │    └─ 全部请求 → Use
     └─ 需要 → Filter
          ├─ 单个 Action → 特性挂
          ├─ 多个 Action → TypeFilter/ServiceFilter + 全局注册
          └─ 所有 Action → AddControllers(o => o.Filters.Add<T>())
```

## 4. 记忆口诀

> **管道一条链，next 是后半段。**
> **进入正着走，退出倒着还。**
> **不调 next 就短路，上游退出照样跑。**
> **Use 有条件，Run 没 next；Map 不回头，UseWhen 会回家。**
> **类的构造是单例，Scoped 只能进方法。**
> **中间件管"所有请求"，Filter 管"那个方法"。**

## 5. 三句话带走

1. **中间件是"请求进应用的第一道门"，它的位置（路由之前）决定了它的能力边界：看得全，但看不懂业务。**
2. **`next` 之后写代码必须 `try/finally`**，这是唯一能保证"异常时也执行"的写法，别指望框架帮你。
3. **面试被问"中间件和 Filter 的区别"，答案是"位置不同所以能力不同"，然后举一个具体边界（模型验证 400 时 Filter 不执行）——这比背表格有说服力得多。**
