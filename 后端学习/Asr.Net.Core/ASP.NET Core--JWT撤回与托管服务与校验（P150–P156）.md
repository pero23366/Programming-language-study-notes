==零：补充==

> **这一篇（P150–P156）解决上一批留下的三个"后遗症"：JWT 收不回来、后台任务没地方放、模型校验写得丑。**

## 它解决什么问题

**上一批结束时，留下了三个明确的缺口。这一篇就是补它们：**

| 上一批留下的坑 | 这一篇的答案 | 节 |
|---|---|---|
| 调试受保护接口时，每次都要手动复制粘贴 token 到 Postman | Swagger UI 上直接填一次，全局生效 | P150 |
| 封号、改密码、点"退出所有设备"，旧 token 还能用 2 小时 | 每次请求核对 `SecurityStamp`，一致才放行 | P151 |
| 定时清理过期数据、每天导出报表——写在哪？`Timer` 在 `Program.cs` 里没人管生命周期 | 托管服务（`BackgroundService`） | P152–P153 |
| 校验规则写在 DTO 的特性上，跨字段写不了、查库写不了、错误信息散落各处 | FluentValidation | P154–P156 |

**这四件事看似无关，其实有一个共同点：它们都是"你的业务代码之外，但必须可靠运行"的东西。**

## 没有它会怎样

**逐个看你现在的状态：**

**① 没有 Swagger 的 JWT 支持** —— 你的 `.http` 文件和 Postman 里，token 是手写的。token 2 小时过期，你每天要重新复制 4 次。更糟的是新同事接手，他不知道哪些接口要 token、怎么带。

**② 没有撤回机制** —— 这是安全漏洞，不是体验问题：

```
用户发现账号被盗 → 改密码 → 系统提示"修改成功"
                                ↓
              但盗号者的 token 在接下来 2 小时内**依然有效**
                                ↓
                      改密码这个动作毫无意义
```

**③ 没有托管服务** —— 你可能这样写定时任务：

```csharp
// ❌ 在 Program.cs 里裸起一个线程
new Thread(() =>
{
    while (true)
    {
        Thread.Sleep(60_000);
        CleanExpiredData();      // 这里出异常 → 线程静默死掉，没人知道
    }
}).Start();
```

**这个线程有三个致命问题：**

| 问题 | 后果 |
|---|---|
| 没有任何异常处理 | 抛一次异常，线程就死了，而且**永远不重启**，你也收不到告警 |
| 不受宿主生命周期管理 | 应用正常关闭时它不会停，可能写坏正在处理的数据 |
| 无法注入依赖 | `CleanExpiredData()` 需要 `DbContext`，你只能 `new` 一个，绕过 DI 和连接池 |

**④ 没有 FluentValidation** —— 你的校验会退化成这样：

```csharp
// ❌ 校验逻辑散落在 Action 里
[HttpPost]
public async Task<IActionResult> Create(CreateBookDto dto)
{
    if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("标题必填");
    if (dto.Title.Length > 50) return BadRequest("标题太长");
    if (dto.Price <= 0) return BadRequest("价格必须大于 0");
    if (await _db.Books.AnyAsync(b => b.Title == dto.Title)) return BadRequest("书名重复");
    // ... 20 行校验之后才是业务
}
```

**21 个接口 × 平均 5 条规则 = 100 多行校验代码，混在业务里，改规则时**找不到全在哪些地方**。**

## 它在生态里的位置

**这一篇的七节，分布在请求生命周期的三个不同位置——搞清楚位置，才知道该往哪写：**

```
                        HTTP 请求进来
                              │
                    ┌─────────┴─────────┐
                    │  UseAuthentication │
                    │  ┌──────────────┐  │
                    │  │ JwtBearer    │  │
                    │  │ OnTokenValidated │ ← P151 挂在这（每次请求查一次 stamp）
                    │  └──────────────┘  │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │   模型绑定 + 校验   │ ← P154–P156 挂在这（FluentValidation）
                    └─────────┬─────────┘
                              │
                         你的 Action
                              │
──────────────────────────────────────────────  以上是"每个请求"
──────────────────────────────────────────────  以下是"跟请求无关"

                    ┌───────────────────┐
                    │  托管服务          │ ← P152–P153（跟应用同生命周期）
                    │  BackgroundService │
                    └───────────────────┘

                    ┌───────────────────┐
                    │  Swagger UI        │ ← P150（只是开发期工具，不参与运行时）
                    └───────────────────┘
```

**一句话记住位置关系：**

> **Swagger 是给人看的，托管服务是给时钟看的，认证和校验是给每个请求看的。**

## 对你的实际意义

**如果你要做游戏服务端，这一篇的"托管服务"比 JWT 那节更重要。**

**1. 游戏服务器的大部分逻辑都在后台跑，不在请求里。**
排行榜每小时重算、邮件过期清理、赛季结算、离线玩家的体力恢复、房间超时回收——这些**没有 HTTP 请求触发**，只能靠托管服务。你如果只会写 Controller，这些需求就无处安放。

**2. `BackgroundService` 的"异常即停服"特性，是双刃剑。**
好的一面：出问题立刻暴露，不会静默失败。坏的一面：**一个定时任务的小 bug 能让整个游戏服下线**。我这一篇实测给你看了——一个后台服务抛异常，整个进程退出。所以你要学会在循环里自己兜异常。

**3. 校验这块，FluentValidation 的真正价值是"规则可测"。**
`BookValidator` 是一个纯类，你可以直接 `new BookValidator(repo).Validate(dto)` 写单元测试**不用起 Web 服务器**。而 DataAnnotations 的特性只能靠集成测试。当你的规则长到 30 条时，这个差别会决定你还敢不敢改规则。

## 什么时候其实用不上

| 内容 | 什么时候可以跳过 |
|---|---|
| Swagger 带 JWT | **别跳。** 5 行代码，省下的是你后面几百次复制粘贴 |
| JWT 撤回 | 如果你的 token 有效期只有 5 分钟 + 有刷新令牌，可以不做（代价是每次都要刷新） |
| 托管服务 | 没有定时需求就别加。**别为了"架构完整"起一堆空转的 BackgroundService** |
| FluentValidation | 校验规则 < 10 条、没有跨字段、不用查库 → **DataAnnotations 完全够用**，多引一个包是负担 |

**最后一条再强调一次：FluentValidation 不是"更高级的 DataAnnotations"，它是"更复杂的规则引擎"。** 简单场景用它，你会花更多时间在配置上。判断标准：

- 规则里有 `if`、有跨字段比较、要查库 → FluentValidation
- 只是"必填 / 长度 / 范围" → DataAnnotations

---

==一：概念==

## P150 · 1. 让 Swagger 能带 JWT：三个概念 + 四个编译错误

**先明确 Swagger 在这里扮演什么角色：它不参与鉴权，它只是"把你的 token 自动塞进请求头"的便利工具。**

**没有它的时候，你在 Swagger UI 点 "Try it out"，请求长这样：**

```http
GET /api/books HTTP/1.1
Host: localhost:5003
```

**服务器返回 401。** 你得去 Postman 手动加头，或者回来改代码。

**有了它之后：**

```http
GET /api/books HTTP/1.1
Host: localhost:5003
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**三个概念（OpenAPI 规范里的），必须分清：**

| 概念 | 是什么 | 在 swagger.json 里的位置 |
|---|---|---|
| **Security Scheme**（安全方案） | "怎么带凭证"的定义：放在哪个 header、什么格式 | `components.securitySchemes.Bearer` |
| **Security Requirement**（安全要求） | "哪些接口需要这个方案" | 接口级 `security: [{Bearer: []}]`，或全局 `security` |
| **Swagger UI 的 Authorize 按钮** | 读上面两个，渲染出一个输入框 | 不在 json 里，是 UI 行为 |

**代码只有两段，但第二段在 .NET 10 上会连续报四个错。**

**第一段（定义方案）——所有版本都一样：**

```csharp
builder.Services.AddSwaggerGen(o =>
{
    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",              // header 名
        Type = SecuritySchemeType.Http,      // 关键：用 Http 而不是 ApiKey
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "直接粘贴 JWT，不用写 Bearer 前缀"
    });
});
```

**`Type` 为什么必须是 `Http` 而不是 `ApiKey`？**

| 选 `ApiKey` | 选 `Http` |
|---|---|
| Swagger UI 让你填 `Bearer eyJ...`（**要自己写 Bearer**） | Swagger UI 自动加 `Bearer ` 前缀（**只填 token**） |
| 生成的 json 是 `{"type":"apiKey","name":"Authorization","in":"header"}` | `{"type":"http","scheme":"bearer","bearerFormat":"JWT"}` |
| 前者是"自定义头"的常见错法，填错了会 401 且看不出原因 | 规范写法 |

**第二段（声明哪些接口需要）——这里是坑区。**

**教材/视频里的写法（Swashbuckle 6.x，Microsoft.OpenApi 1.x）：**

```csharp
o.AddSecurityRequirement(new OpenApiSecurityRequirement
{
    {
        new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference
            {
                Type = ReferenceType.SecurityScheme,
                Id = "Bearer"
            }
        },
        Array.Empty<string>()
    }
});
```

**在 .NET 10 + Swashbuckle 10.3.1 上，这段代码会依次炸四次。我一次一次记录下来：**

| # | 错误 | 原因 |
|---|---|---|
| 1 | `CS0234: 命名空间"Microsoft.OpenApi"中不存在类型或命名空间名"Models"` | OpenApi 2.x 把类型从 `Microsoft.OpenApi.Models` 挪到了根命名空间 `Microsoft.OpenApi` |
| 2 | `CS0117: "OpenApiSecurityScheme"未包含"Reference"的定义`<br>`CS0246: 未能找到类型"OpenApiReference"` | 2.x 删掉了 `Reference` 属性和 `OpenApiReference` 类型，改用独立类型 `OpenApiSecuritySchemeReference` |
| 3 | `CS1503: 参数 2 无法从"string[]"转换为"List<string>"` | `OpenApiSecurityRequirement` 现在是 `Dictionary<OpenApiSecuritySchemeReference, List<string>>`，值必须是 `List<string>` |
| 4 | `CS1503: 无法从"OpenApiSecurityRequirement"转换为"Func<OpenApiDocument, OpenApiSecurityRequirement>"` | `AddSecurityRequirement` 的签名改成了接受工厂函数（因为 scheme 引用需要 document 才能解析） |

**最终能编译的写法：**

```csharp
using Microsoft.OpenApi;      // ← 注意不是 Microsoft.OpenApi.Models

o.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
{
    {
        new OpenApiSecuritySchemeReference("Bearer", doc),
        new List<string>()                          // ← 必须 List<string>
    }
});
```

**怎么知道你该用哪套？看 Swashbuckle 的版本：**

```bash
dotnet list package | grep Swashbuckle
```

| Swashbuckle 版本 | Microsoft.OpenApi | 写法 |
|---|---|---|
| 6.x（绝大多数教程） | 1.x | 老的 `Reference = new OpenApiReference{...}` |
| 7.x ~ 9.x | 1.x | 同上，但 `using` 要 `Microsoft.OpenApi.Models` |
| **10.x（.NET 10 新建项目默认）** | **2.x** | **本文的新写法** |

**还有一个行为要注意：`AddSecurityRequirement` 加的是"全局要求"，所有接口都会显示小锁，包括 `/login`。**

**实测生成的 `swagger.json`：**

```json
"components": {
  "securitySchemes": {
    "Bearer": {
      "type": "http",
      "description": "直接粘贴 JWT，不用写 Bearer 前缀",
      "scheme": "bearer",
      "bearerFormat": "JWT"
    }
  }
},
"security": [ { "Bearer": [] } ]
```

**那个 `"security": [{ "Bearer": [] }]` 就是全局生效的证据。** 如果想让登录接口不显示锁，要么忍（反正多填一次不影响），要么写一个 `IOperationFilter` 按 `AllowAnonymous` 过滤——后者不值得，除非你的 API 文档要给外部看。

---

## P151 · 2. 让 JWT 能提前撤回：把"无状态"买回来

**上一批说过：JWT 一旦发出，服务端就失去了控制权。这一节是把这个控制权买回来——代价要说清楚。**

**先说清楚"撤回"到底要撤回什么。三个真实场景：**

| 场景 | 期望行为 |
|---|---|
| 用户改密码 | 该用户**所有**已发出的 token 立即失效（防止盗号者继续用） |
| 管理员封号 | 该用户所有 token 立即失效 |
| 用户点"退出所有设备" | 同上 |

**它们的共同点是：按"用户"撤回，不是按"某个 token"撤回。** 这个观察决定了方案的选择——不需要维护一个 token 黑名单，只需要给用户加一个"版本号"。

**`SecurityStamp` 就是这个版本号。**

**它的工作方式（三步）：**

```
① 签发时，把当前的 SecurityStamp 写进 token
   payload: { "sub": "<userId>", "stamp": "4W5NUKNJ4ZITESLONECO2YKZBN6GVGKU", ... }
                    ↓
② 每次请求进来，在 OnTokenValidated 里查库，比对
   库里 SecurityStamp == token 里的 stamp ?
                    ↓
③ 不一致 → ctx.Fail() → 这个请求直接 401
```

**任何"让旧凭证失效"的操作，本质都是"改 SecurityStamp"：**

| 操作 | 是否自动改 stamp |
|---|---|
| `ChangePasswordAsync` | ✅ 自动 |
| `ResetPasswordAsync` | ✅ 自动 |
| `UpdateSecurityStampAsync` | ✅ 就是干这个的 |
| 修改角色（`AddToRoleAsync`） | ✅ 会自动改（因为权限变了） |
| 修改用户资料（改昵称） | ❌ 不会（正常，昵称不影响安全） |

**所以"踢人下线"只需要一行：**

```csharp
await userManager.UpdateSecurityStampAsync(user);
```

**代码挂在 `JwtBearerEvents.OnTokenValidated`：**

```csharp
.AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters { /* 同上一批 */ };

    o.Events = new JwtBearerEvents
    {
        OnTokenValidated = async ctx =>
        {
            var um = ctx.HttpContext.RequestServices.GetRequiredService<UserManager<IdentityUser>>();
            var uid = ctx.Principal?.FindFirst("sub")?.Value;
            var stamp = ctx.Principal?.FindFirst("stamp")?.Value;

            var user = string.IsNullOrEmpty(uid) ? null : await um.FindByIdAsync(uid);
            if (user == null)
            {
                ctx.Fail("用户不存在");
                return;
            }
            if (user.SecurityStamp != stamp)
                ctx.Fail("凭证已失效，请重新登录");
        }
    };
});
```

**逐符号解释（`JwtBearerEvents` 是第一次出现）：**

| 符号 | 是什么 | 触发时机 |
|---|---|---|
| `JwtBearerEvents` | 一组回调钩子，让你介入 JWT 认证的每个阶段 | — |
| `OnTokenValidated` | **验签和过期校验都通过了**之后调用 | 每个带合法 token 的请求 |
| `TokenValidatedContext` | 回调参数，含 `Principal`（解析出的用户）、`HttpContext`、`Fail()` | — |
| `ctx.Fail(msg)` | 标记"认证失败"，等效于验签失败，最终返回 401 | — |
| `ctx.HttpContext.RequestServices` | 当前请求的作用域容器（能拿到 Scoped 服务） | — |

**为什么用 `RequestServices` 而不是构造函数注入？** 因为这段配置代码在 `builder.Services` 阶段执行，那时候容器还没建好。`RequestServices` 是每个请求的作用域，`UserManager` 是 Scoped 的，必须从这里取。

**实测结果（三组，全部符合预期）：**

```
① 登录 → stamp = 4W5NUKNJ4ZITESLONECO2YKZBN6GVGKU，token 300 字符
   带 token 访问 /me → 200

② 改密码（stamp 变成 L6SZCHSUXLWJXIVDGTQO54HO674UFHTY）
   用同一个旧 token 再访问 /me → 401          ← 立刻失效

③ 用新密码重新登录 → 新 token → /me → 200
   主动 /kick（只换 stamp，不改密码）→ 旧 token 再访问 /me → 401
```

**注意 401 的响应体是空的** —— 这是默认行为。如果你想让前端知道"是过期了该刷新"还是"被踢了该重新登录"，得在 `OnChallenge` 里自定义响应体（上一批 P149 讲过）。

**现在说代价，这是必须清楚的：**

| 维度 | 没有撤回校验 | 有撤回校验 |
|---|---|---|
| 每个请求的数据库查询 | 0 次 | **1 次**（`FindByIdAsync`） |
| 还能叫"无状态"吗 | ✅ 是 | ❌ **不是了**（服务端状态参与了判断） |
| 多实例部署 | 各自独立验签 | 必须共享同一个数据库（或分布式缓存） |
| 数据库压力 | 无 | QPS 高时是瓶颈 |

**这就是那个残酷的权衡：你不可能同时拥有"完全无状态"和"随时能撤回"。** 想要后者，就得付出前者的代价。

**三种方案的实际对比（这是生产环境真正的选择题）：**

| 方案 | 延迟成本 | 撤回延迟 | 适用 |
|---|---|---|---|
| **不查库 + 短 token（5~15 分钟）+ 刷新令牌** | 0 | 最长 15 分钟 | 大多数业务系统 |
| **每次查库比对 stamp**（本节） | 1 次查询/请求 | **立即** | 安全要求高（支付、后台管理） |
| 黑名单（`IMemoryCache` / Redis） | 1 次缓存读 | 立即 | 需要按单个 token 撤回（比如"退出这台设备"） |

**如果非要查库，至少加一层缓存：**

```csharp
// 把 stamp 缓存 30 秒，把"每请求一次查询"降到"每 30 秒一次"
OnTokenValidated = async ctx =>
{
    var cache = ctx.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
    var um = ctx.HttpContext.RequestServices.GetRequiredService<UserManager<IdentityUser>>();
    var uid = ctx.Principal!.FindFirst("sub")!.Value;
    var tokenStamp = ctx.Principal!.FindFirst("stamp")!.Value;

    var currentStamp = await cache.GetOrCreateAsync($"stamp:{uid}", async entry =>
    {
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
        var u = await um.FindByIdAsync(uid);
        return u?.SecurityStamp;
    });

    if (currentStamp != tokenStamp) ctx.Fail("凭证已失效");
}
```

**代价变成"撤回最长延迟 30 秒"。** 对封号来说 30 秒可以接受，对"用户自己点退出"来说也可以（客户端本来就删了 token）。

> **⚠️ 一个容易忽略的细节：`ctx.Fail()` 之后，`AuthorizationMiddleware` 仍然返回 401，但**日志里不会有"token 无效"的明确原因**。排查时要在 `OnAuthenticationFailed` 里记日志，否则你会看到一堆莫名的 401。

---

## P152 · 3. 托管服务：跟应用同生共死的后台任务

**先搞清一个概念：托管服务（Hosted Service）不是"后台线程"的包装，它是"由宿主（Host）管理生命周期的组件"。**

```
应用启动
   ↓
① 构建容器、校验依赖
   ↓
② 依次启动所有 IHostedService.StartAsync()      ← 你的 StartAsync 在这
   ↓
③ Kestrel 开始监听端口                          ← 注意：在 ② 之后
   ↓
④ 应用运行中（BackgroundService 在后台跑）
   ↓
⑤ 收到 Ctrl+C → 依次 StopAsync()（逆序）        ← 优雅关闭
   ↓
应用退出
```

**这个顺序是我实测出来的，它解释了一个很常见的现象。看日志（按时间顺序）：**

```
TickService 构造函数执行（启动时一次）
TickService 开始，线程 11
SlowStart 开始，此刻 Kestrel 还没开始监听
SlowStart 结束                       ← 这里等了 3 秒
Now listening on: http://localhost:5203
Application started. Press Ctrl+C to shut down.
```

**三个从这段日志能读出来的硬结论：**

**① `StartAsync` 里做耗时操作，会拖住整个网站的启动。**

我在 `SlowStartService.StartAsync` 里加了 `await Task.Delay(3000)`，结果 `Now listening on` 出现在 3 秒之后。**在这 3 秒里，端口根本没打开**，容器编排的健康检查会判定"服务未就绪"，甚至直接杀掉重启。

**② `BackgroundService` 的 `ExecuteAsync` 的"同步段"，是在 `StartAsync` 阶段跑的。**

注意 `TickService 开始` 出现在 `SlowStart 开始` **之前**。因为 `BackgroundService.StartAsync` 的实现是这样的（简化）：

```csharp
public virtual Task StartAsync(CancellationToken ct)
{
    _executeTask = ExecuteAsync(_stoppingCts.Token);   // 注意：没 await
    return _executeTask.IsCompleted ? _executeTask : Task.CompletedTask;
}
```

**它调用 `ExecuteAsync` 但不等它完成**，只等到它遇到第一个 `await` 就返回。所以：

```csharp
protected override async Task ExecuteAsync(CancellationToken ct)
{
    Thread.Sleep(5000);          // ❌ 同步阻塞：这 5 秒会拖住网站启动
    await Task.Delay(5000, ct);  // ✅ 异步：立刻返回，不拖启动
}
```

**③ 所有托管服务按注册顺序启动，逆序关闭。**

`AddHostedService<T1>()` 先注册就先启动，关闭时 `T2` 先停、`T1` 后停。

---

**然后是这一节最要命的一条：后台服务抛异常，整个应用会停。**

**实测：我写了一个 2 秒后抛 `InvalidOperationException` 的 `BackgroundService`。**

```
fail: Microsoft.Extensions.Hosting.Internal.Host[9]
      BackgroundService failed
      System.InvalidOperationException: 后台服务炸了
         at Microsoft.Extensions.Hosting.Internal.Host.TryExecuteBackgroundServiceAsync(...)

crit: Microsoft.Extensions.Hosting.Internal.Host[10]
      The HostOptions.BackgroundServiceExceptionBehavior is configured to StopHost.
      A BackgroundService has thrown an unhandled exception, and the IHost instance is stopping.
      To avoid this behavior, configure this to Ignore; however the BackgroundService
      will not be restarted.
```

**`crit` 级别，`IHost` 正在停止 —— 整个网站下线。** 一个定时任务的小 bug，能让所有在线用户掉线。

**三种应对方式，各有代价：**

```csharp
// 方式 A：在循环内部自己兜（推荐，标准的做法）
protected override async Task ExecuteAsync(CancellationToken ct)
{
    using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
    while (await timer.WaitForNextTickAsync(ct))
    {
        try
        {
            await DoWorkAsync(ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;                       // 正常关闭，别吞
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "本次执行失败，下次继续");   // 单次失败不影响后续
        }
    }
}
```

```csharp
// 方式 B：改全局行为为 Ignore（不推荐）
builder.Services.Configure<HostOptions>(o =>
{
    // 默认是 StopHost：抛异常 → 停整个应用
    // 改成 Ignore：抛异常 → 只记日志，宿主继续跑，但这个服务**不会重启**
    o.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});
```

| 方式 | 出问题时 | 谁该选 |
|---|---|---|
| 循环内 try/catch | 单次失败被记录，下次照常跑 | **绝大多数场景** |
| `Ignore` | 宿主活着，但这个后台服务永久停了（静默失效） | 几乎不该用 |
| 默认 `StopHost` | 整个应用下线，重启后恢复 | 关键任务（宁可全停也不能带病运行） |

> **默认值 `StopHost` 其实是个好设计：** 它让"后台服务坏了"这件事无法被忽略。坏处是影响面太大。所以标准做法是 **A**：自己兜住异常，同时用日志/告警让问题被看见。

**第三个坑：单例里注 Scoped，启动就崩。**

`BackgroundService` 的生命周期是**单例**（整个应用一个实例）。而 `DbContext` 是 **Scoped**（每请求一个）。所以：

```csharp
public class BadService : BackgroundService
{
    public BadService(AppDbContext db) { }   // ❌ 单例注 Scoped
}
```

**实测报错（注意：在 `builder.Build()` 阶段就炸，不是等到请求）：**

```
Unhandled exception. System.AggregateException: Some services are not able to be constructed
 ---> System.InvalidOperationException: Cannot consume scoped service 'AdvTest.AppDbContext'
      from singleton 'Microsoft.Extensions.Hosting.IHostedService'.
```

**正确做法：注入 `IServiceScopeFactory`，每次执行时手动开一个作用域。**

```csharp
public class CleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CleanupService> _logger;

    public CleanupService(IServiceScopeFactory scopeFactory, ILogger<CleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(ct))
        {
            try
            {
                // 每次执行开一个新作用域 → 一个新的 DbContext → 用完即弃
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var deleted = await db.Books.Where(b => b.PubTime < DateTime.Now.AddYears(-10))
                                            .ExecuteDeleteAsync(ct);
                _logger.LogInformation("清理了 {Count} 条 10 年前的书", deleted);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "清理任务失败");
            }
        }
    }
}
```

**`IServiceScopeFactory` 是什么（第一次出现）：**

| 符号 | 是什么 | 为什么必须是它 |
|---|---|---|
| `IServiceScopeFactory` | 一个**单例**服务，能创建 `IServiceScope` | 单例可以安全地被单例注入（生命周期匹配） |
| `IServiceScope` | 一个独立的作用域，`Dispose` 时释放其中所有 Scoped 服务 | 保证 `DbContext` 用完被释放，不泄漏连接 |
| `scope.ServiceProvider` | 这个作用域内的容器 | 从这里解析的 Scoped 服务互相共享同一个 `DbContext` |

**为什么不能直接 `new AppDbContext(...)`？** 你会绕过 DI：连接池、拦截器、日志、`IOptions` 全都用不上，而且连接字符串写死。

---

## P153 · 4. 定时任务：`PeriodicTimer` 是唯一正确答案

**在 .NET 6 之前，写定时任务要用 `System.Threading.Timer` 或 `Task.Delay` 循环，各有各的坑。现在用 `PeriodicTimer`。**

**三种写法对比（这是本节的核心）：**

```csharp
// ❌ 写法 1：Task.Delay 循环 —— 会漂移
while (!ct.IsCancellationRequested)
{
    await DoWorkAsync();
    await Task.Delay(TimeSpan.FromSeconds(10), ct);
}
// 实际间隔 = 10 秒 + 每次执行的耗时
// 执行 3 秒 → 实际每 13 秒一次，跑一天就偏了几千秒
```

```csharp
// ❌ 写法 2：Timer 回调 —— 异步回调 + 重入问题
var timer = new Timer(async _ => await DoWorkAsync(), null, 0, 10_000);
// 回调是 async void：异常直接崩进程
// 上一次没跑完，下一次又进来 → 重入
```

```csharp
// ✅ 写法 3：PeriodicTimer —— 固定节奏，不重入，可取消
using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
while (await timer.WaitForNextTickAsync(ct))
{
    await DoWorkAsync(ct);
}
```

**`PeriodicTimer` 的关键性质（`WaitForNextTickAsync` 逐个说）：**

| 性质 | 说明 |
|---|---|
| **固定节奏** | 每 10 秒一个 tick，`DoWorkAsync` 跑 3 秒也还是 10 秒一次（不是 13 秒） |
| **不重入** | 上一次没 `await` 完，不会给你下一个 tick |
| **可取消** | 传 `ct`，取消时抛 `OperationCanceledException` 并退出循环 |
| **错过就跳过** | 如果某次执行超过 10 秒，错过的 tick 不会补 |
| **必须 Dispose** | 所以用 `using var` |

**实测（`PeriodicTimer(2 秒)` + 计数器端点）：**

```
运行 4 秒  → hits = 3
运行 9 秒  → hits = 5
运行 14 秒 → hits = 8
```

**大约每 2 秒 +1，符合预期。**（第一次是 3 而不是 2，因为启动耗时约 1 秒 + tick 从启动时刻算起。）

**"案例：定时导出数据"的完整骨架（P153 的正题）：**

```csharp
public class DailyExportService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DailyExportService> _logger;
    private readonly IConfiguration _config;

    public DailyExportService(IServiceScopeFactory scopeFactory,
                              ILogger<DailyExportService> logger,
                              IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // ① 先算出"距离下一个凌晨 2 点还有多久"
        var delay = TimeUntilNextRun(TimeSpan.FromHours(2));
        _logger.LogInformation("导出任务将在 {Delay} 后首次执行", delay);
        await Task.Delay(delay, ct);

        // ② 之后每 24 小时跑一次
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
        do
        {
            try
            {
                await ExportAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "导出失败，明天重试");
            }
        }
        while (await timer.WaitForNextTickAsync(ct));
    }

    private static TimeSpan TimeUntilNextRun(TimeSpan at)
    {
        var now = DateTime.Now;
        var next = now.Date.Add(at);
        if (next <= now) next = next.AddDays(1);
        return next - now;
    }

    private async Task ExportAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var data = await db.Books.AsNoTracking()
                                 .Select(b => new { b.Id, b.Title, b.Price, b.PubTime })
                                 .ToListAsync(ct);

        var dir = _config["Export:Directory"] ?? "exports";
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"books-{DateTime.Now:yyyyMMdd}.csv");

        await File.WriteAllLinesAsync(path, data.Select(d => $"{d.Id},{d.Title},{d.Price}"), ct);
        _logger.LogInformation("已导出 {Count} 条到 {Path}", data.Count, path);
    }
}
```

**几个容易踩的点：**

| 坑 | 后果 | 解法 |
|---|---|---|
| 用 `DateTime.UtcNow` 算"凌晨 2 点" | 时区差 8 小时，实际在北京时间上午 10 点跑 | 用 `DateTimeOffset.Now` 或显式指定时区 |
| 导出文件不清理 | 一年后磁盘满 | 每次导出前删 7 天前的 |
| `AsNoTracking()` 忘了加 | 10 万条数据全被跟踪，内存暴涨 | 只读查询一律加 |
| 多实例部署 | **每个实例都跑一遍，导出 3 份** | 需要分布式锁（Redis `SETNX`）或只在主实例上跑 |

**最后一条是生产环境的真问题，必须提前知道：**

```
服务器 A ─┐
服务器 B ─┼─ 三个实例，各自跑 DailyExportService
服务器 C ─┘
           ↓
     每天导出 3 份文件，发 3 封邮件
```

**最简单的解法**（不想引 Redis 的话）：

```csharp
// 用数据库做锁：抢到的那一个实例执行
var lockId = $"{DateTime.Today:yyyyMMdd}-export";
var acquired = await db.Database
    .ExecuteSqlRawAsync(@"INSERT INTO JobLocks(Id, AcquiredAt) VALUES({0},{1})", lockId, DateTime.Now) > 0;
// 主键冲突会抛异常 → catch 掉表示"别人已经在做了"
```

---

## P154 · 5. .NET 内置校验的四条硬边界

**DataAnnotations 干得好的事：必填、长度、范围、正则、邮箱格式。干不了的事有四种，每一种都逼你写丑代码。**

**先看它能干什么（实测的返回）：**

```csharp
public class BookDtoAnno
{
    [Required(ErrorMessage = "标题必填")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "标题 2~50 字")]
    public string Title { get; set; } = "";

    [Range(0.01, 10000, ErrorMessage = "价格 0.01~10000")]
    public double Price { get; set; }
}

[ApiController]
[Route("val")]
public class ValidationController : ControllerBase
{
    [HttpPost("anno")]
    public IActionResult Anno([FromBody] BookDtoAnno dto) => Ok(new { ok = true });
}
```

**`[ApiController]` 会自动校验，校验失败时**在进入 Action 之前**就返回 400：**

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Price": ["价格 0.01~10000"],
    "Title": ["标题必填", "标题 2~50 字"]
  },
  "traceId": "00-0254b8f39a87a292feea668c6985b5b3-a84d5c0f5fe628c0-00"
}
```

**注意两点：一个字段可以有多条错误（`Title` 有 2 条）；这个格式叫 `ValidationProblemDetails`，是 RFC 7807 的约定，前端可以统一解析。**

**然后是它干不了的四件事：**

### 边界 ①：跨字段规则，只能实现 `IValidatableObject`

"结束时间必须晚于开始时间"——这个规则同时依赖两个字段，任何单个特性都写不出来。

```csharp
public class BookDtoCross : BookDtoAnno, IValidatableObject
{
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (EndTime <= StartTime)
            yield return new ValidationResult(
                "结束时间必须晚于开始时间",
                new[] { nameof(EndTime) });      // 第二个参数：错误挂到哪个字段上
    }
}
```

**实测（属性级全部合法，只有跨字段违规）：**

```json
{ "errors": { "EndTime": ["结束时间必须晚于开始时间"] } }
```

**能跑。但丑在哪？**

| 问题 | 说明 |
|---|---|
| 校验逻辑跑进 DTO 类里 | DTO 变成了"数据 + 业务规则"的混合体 |
| 一个 DTO 只能有一个 `Validate` | 20 条跨字段规则全挤在一个 `yield return` 里 |
| 无法注入服务 | `Validate` 的 `validationContext` 理论上能取 `IServiceProvider`，但写法极其别扭 |

### 边界 ②：查库校验，根本做不到

"书名不能重复"——需要在数据库里查。DataAnnotations 的特性是**纯同步、无依赖**的：

```csharp
// 自定义特性的唯一出路：用服务定位器，很脏
public class UniqueTitleAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext ctx)
    {
        var sp = ctx.GetService(typeof(IServiceProvider)) as IServiceProvider;
        var db = sp!.GetService(typeof(AppDbContext)) as AppDbContext;
        var exists = db!.Books.Any(b => b.Title == (string)value!);   // ❌ 同步阻塞
        return exists ? new ValidationResult("书名已存在") : ValidationResult.Success;
    }
}
```

**三个致命问题：**

1. `IsValid` 是同步的，`.Any()` 只能同步阻塞线程（异步 I/O 全部退化成阻塞）
2. 依赖服务定位器，单元测试时要搭一个假容器
3. 校验发生在模型绑定阶段，此时 `DbContext` 的作用域状态不确定

### 边界 ③：规则无法复用

同一个规则，在 `CreateDto` 和 `UpdateDto` 上是重复的两行特性：

```csharp
public class CreateBookDto
{
    [Required, StringLength(50, MinimumLength = 2)] public string Title { get; set; } = "";
}

public class UpdateBookDto
{
    [Required, StringLength(50, MinimumLength = 2)] public string Title { get; set; } = "";
}
```

**想改"标题 2~50"为"1~80"？全项目搜 `StringLength(50`。** 而这个规则在业务上只有一处定义。

### 边界 ④：错误信息的组织方式僵化

DataAnnotations 的错误信息**写死在特性里**：

```csharp
[Required(ErrorMessage = "标题必填")]
```

**想支持多语言？** 得用 `ErrorMessageResourceType` + 资源文件，每个特性配一遍。
**想让同一规则在不同接口返回不同文案？** 做不到。
**想加错误码（前端要判断 `code` 而不是匹配文案）？** DataAnnotations 没有"错误码"这个概念。

**四条边界总结成一张表：**

| 需求 | DataAnnotations | 结论 |
|---|---|---|
| 必填 / 长度 / 范围 / 正则 | ✅ 一行搞定 | 用它 |
| 跨字段比较 | ⚠️ 要 `IValidatableObject` | 勉强能用 |
| 查库 / 查缓存 | ❌ 同步 + 服务定位 | 别用 |
| 规则跨 DTO 复用 | ❌ 复制特性 | 别用 |
| 异步规则 | ❌ 架构上不支持 | 别用 |
| 错误码 / 多语言 / 分组 | ❌ | 别用 |

---

## P155 · 6. FluentValidation：先搞清该装哪个包（这一步就会踩坑）

**FluentValidation 本身只是一个"规则引擎"，它不管怎么接入 ASP.NET Core。接入方式有三个包，选错了会浪费一晚上。**

**2026 年的现状（我这一轮实测的版本）：**

| 包 | 最新版本 | 作用 | 状态 |
|---|---|---|---|
| `FluentValidation` | 12.2.0 | 核心：`AbstractValidator`、`RuleFor` | ✅ 活跃 |
| `FluentValidation.DependencyInjectionExtensions` | 12.2.0 | 提供 `AddValidatorsFromAssemblyContaining<T>()` | ✅ 活跃 |
| `FluentValidation.AspNetCore` | **11.3.1** | 自动校验（接管 `[ApiController]`） | ⚠️ **已停止更新** |
| `SharpGrip.FluentValidation.AutoValidation.Mvc` | 2.0.0 | 自动校验的**替代品** | ✅ 推荐 |

**`FluentValidation.AspNetCore` 停止更新的原因很简单：它接管 MVC 校验的方式依赖 `IObjectModelValidator`，而 MVC 的校验管线是同步的——这就引出本节最硬的坑。**

### 基础用法（这部分没问题）

```csharp
using FluentValidation;

public class BookDto
{
    public string Title { get; set; } = "";
    public double Price { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}

public class BookValidator : AbstractValidator<BookDto>
{
    public BookValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("标题必填")
            .Length(2, 50).WithMessage("标题 2~50 字");

        RuleFor(x => x.Price)
            .InclusiveBetween(0.01, 10000).WithMessage("价格 0.01~10000");

        // 跨字段：直接引用另一个属性，DataAnnotations 写不出来
        RuleFor(x => x.EndTime)
            .GreaterThan(x => x.StartTime).WithMessage("结束必须晚于开始");
    }
}
```

**注册：**

```csharp
builder.Services.AddValidatorsFromAssemblyContaining<BookValidator>();  // 扫描并注册所有 validator
builder.Services.AddFluentValidationAutoValidation();                   // 接管自动校验
```

**实测：返回格式和 DataAnnotations 完全一样。**

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Price": ["价格 0.01~10000"],
    "Title": ["标题必填", "标题 2~50 字"],
    "EndTime": ["结束必须晚于开始"]
  }
}
```

**为什么格式一样？** 因为 FluentValidation 只是把错误塞进 MVC 的 `ModelState`，最后还是由 MVC 生成 `ValidationProblemDetails`。**这是个好消息：换校验库，前端不用改。**

**规则方法速查（够你覆盖 90% 场景）：**

| 方法 | 含义 |
|---|---|
| `NotEmpty()` / `NotNull()` | 非空（`NotEmpty` 对字符串还会拒空白） |
| `Length(2, 50)` | 长度区间 |
| `MinimumLength(n)` / `MaximumLength(n)` | 单边长度 |
| `InclusiveBetween(a, b)` | 闭区间 |
| `GreaterThan(x => x.StartTime)` | 大于另一个属性（跨字段） |
| `Matches(@"^\d{11}$")` | 正则 |
| `EmailAddress()` | 邮箱 |
| `Must(predicate)` | 自定义同步规则 |
| `MustAsync(async (v, ct) => ...)` | 自定义异步规则 |
| `When(condition, () => { ... })` | 条件规则（只在某种情况下生效） |
| `WithMessage("...")` | 自定义文案 |
| `WithName("书名")` | 改错误里的字段显示名 |
| `Cascade(CascadeMode.Stop)` | 第一条失败就不再往下验 |

---

### 这里开始踩坑：异步规则会让自动校验直接 500

**我给 validator 加了一条查库规则：**

```csharp
public class BookAsyncValidator : AbstractValidator<BookDtoAsync>
{
    public BookAsyncValidator(IBookRepo repo)
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("标题必填")
            .MustAsync(async (title, ct) => !await repo.ExistsAsync(title))
            .WithMessage("书名已存在（这条规则查了数据库）");
    }
}
```

**然后请求那个接口，实测返回：**

```
HTTP/1.1 500 Internal Server Error

FluentValidation.AsyncValidatorInvokedSynchronouslyException:
Validator "BookAsyncValidator" can't be used with ASP.NET automatic validation as it contains
asynchronous rules. ASP.NET's validation pipeline is not asynchronous and can't invoke
asynchronous rules. Remove the asynchronous rules in order for this validator to run.
   at FluentValidation.AbstractValidator`1.Validate(ValidationContext`1 context)
   at FluentValidation.AspNetCore.FluentValidationModelValidator.Validate(...)
```

**不是 400，是 500。** 因为"模型校验"这个阶段本身是同步的（`IObjectModelValidator.Validate` 返回 `void`，没有 async 版本），框架无法 `await` 你的 `MustAsync`。

**这就是"内置校验不足"的镜像问题：第三方库也没绕过 MVC 的架构限制。**

### 三条出路，各有代价

**出路 A：关掉那个参数的自动校验，手动 `ValidateAsync`（最稳）。**

```csharp
[HttpPost("fluent-async")]
public async Task<IActionResult> FluentAsync(
    [FromBody][CustomizeValidator(Skip = true)] BookDtoAsync dto)
{
    var result = await _validator.ValidateAsync(dto);
    if (!result.IsValid)
    {
        foreach (var e in result.Errors)
            ModelState.AddModelError(e.PropertyName, e.ErrorMessage);

        return ValidationProblem(ModelState);      // ← 复用 MVC 的统一格式
    }
    return Ok(new { ok = true });
}
```

**实测返回（正是我想要的格式）：**

```json
{ "errors": { "Title": ["书名已存在（这条规则查了数据库）"] } }
```

**这里有一个只有写了才知道的细节：`[CustomizeValidator(Skip = true)]` 只能挂在参数上，不能挂在方法上。**

我先按直觉写在方法上：

```csharp
[HttpPost("fluent-async")]
[CustomizeValidator(Skip = true)]        // ❌
public async Task<IActionResult> FluentAsync([FromBody] BookDtoAsync dto)
```

```
error CS0592: 特性"CustomizeValidator"对此声明类型无效。它仅对"属性、索引器, 参数"声明有效。
```

**必须写成：**

```csharp
public async Task<IActionResult> FluentAsync(
    [FromBody][CustomizeValidator(Skip = true)] BookDtoAsync dto)   // ✅ 挂在参数上
```

**出路 B：换成 SharpGrip 的自动校验（推荐，如果你要自动）。**

```bash
dotnet add package SharpGrip.FluentValidation.AutoValidation.Mvc
```

```csharp
// using FluentValidation.AspNetCore;   ← 去掉
using SharpGrip.FluentValidation.AutoValidation.Mvc.Extensions;

builder.Services.AddValidatorsFromAssemblyContaining<BookSyncValidator>();
builder.Services.AddFluentValidationAutoValidation();      // 同名方法，但这个实现支持异步
```

**实测：同一个异步 validator，走 SharpGrip 的自动校验：**

```
POST /val/fluent-async-auto  {"title":"操作系统","price":10}
→ 400
{ "errors": { "Title": ["书名已存在（这条规则查了数据库）"] } }     ← 不再是 500
```

**而且它用的还是同一套 `ValidationProblemDetails` 格式，控制器里一行都不用改。**

**出路 C：把查库规则挪出 validator（改成业务层判断）。**

```csharp
[HttpPost]
public async Task<IActionResult> Create(CreateBookDto dto)
{
    if (await _db.Books.AnyAsync(b => b.Title == dto.Title))
        return Conflict(new { msg = "书名已存在" });       // 409，不是 400
    ...
}
```

**这个方案其实有个额外好处：语义更准。** "书名重复"是**资源冲突（409）**，不是**请求格式错误（400）**。校验层管"数据格式对不对"，业务层管"业务规则允不允许"。

### 一个实测到的副作用（用 SharpGrip 时要注意）

**混用 DataAnnotations 和 SharpGrip 时，我观察到这个现象：**

| 请求 | FluentValidation.AspNetCore | SharpGrip |
|---|---|---|
| `{"title":"","price":0}`（属性级有错，且跨字段也违规） | 400，**3 个字段都报**（含 `EndTime`） | 400，**只报 2 个字段**（`EndTime` 没了） |
| `{"title":"好书","price":10,"startTime":"2026-02-01","endTime":"2026-01-01"}`（只有跨字段违规） | 400，报 `EndTime` | 400，报 `EndTime` ✅ |

**结论：SharpGrip 接管后，当属性级已经有错误时，`IValidatableObject.Validate` 可能不执行。** 单独测跨字段时它是正常的。

**实际影响：** 用户第一次提交只能看到字段级错误，改完再提交才看到跨字段错误——**多一轮往返**。不致命，但如果你打算两套混用，得知道这件事。

**我的建议：既然上了 FluentValidation，就把跨字段规则也写进 validator，别再用 `IValidatableObject`。** 一个 DTO 只用一套校验机制，最省心。

---

## P156 · 7. 在 Validator 里注入服务：这件事为什么能成立

**先回答一个基础问题：`BookValidator` 你从来没 `new` 过，它是谁创建的？**

**是 DI 容器创建的。** `AddValidatorsFromAssemblyContaining<T>()` 会扫描程序集，把所有 `AbstractValidator<T>` 子类注册进容器（默认 **Scoped** 生命周期）。MVC 自动校验时从容器里解析出 `IValidator<T>`，所以要构造它，就得先满足它的构造函数参数——这跟 Controller 注入服务是**完全一样的机制**。

```
你的 Controller 注入 IValidator<BookDto>
        ↓
容器发现 BookValidator 需要一个 IBookRepo
        ↓
容器解析 IBookRepo（你注册的 BookRepo）
        ↓
构造 BookValidator(repo)
```

**所以「validator 能注入服务」不是 FluentValidation 的特权，是 DI 的必然结果。**

**三个典型场景（按实用度排）：**

### 场景 ①：查重（异步，必须 `MustAsync`）

```csharp
public class BookValidator : AbstractValidator<BookDto>
{
    public BookValidator(IBookRepo repo)
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("标题必填")
            .MustAsync(async (title, ct) => !await repo.ExistsAsync(title))
            .WithMessage("书名已存在");
    }
}
```

**`MustAsync` 的两个参数要分清：**

| 参数 | 是什么 |
|---|---|
| `title` | **当前正在校验的那个属性值**（`x => x.Title` 的值） |
| `ct` | `CancellationToken`，**必须往下传**，否则用户取消请求时你的查询还在跑 |

**想同时用到"属性值"和"整个对象"？用三参数重载：**

```csharp
RuleFor(x => x.Title)
    .MustAsync(async (dto, title, ct) => !await repo.ExistsExceptAsync(title, dto.Id, ct))
    .WithMessage("书名已存在");
// 注意：第一参数是"父对象"，第二参数才是属性值
```

**这个重载是"编辑时排除自己"的标准写法** —— 修改图书时不希望自己的书名判为重复。

### 场景 ②：依赖当前登录用户（越权校验）

```csharp
public class UpdateBookValidator : AbstractValidator<UpdateBookDto>
{
    public UpdateBookValidator(AppDbContext db, IHttpContextAccessor http)
    {
        RuleFor(x => x.Id)
            .MustAsync(async (id, ct) =>
            {
                var uid = http.HttpContext?.User.FindFirst("sub")?.Value;
                var book = await db.Books.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);
                return book != null && book.CreatorId == uid;      // 只能改自己的
            })
            .WithMessage("无权修改这本书");
    }
}
```

> **⚠️ `IHttpContextAccessor` 需要在 `Program.cs` 里注册：**
> ```csharp
> builder.Services.AddHttpContextAccessor();
> ```
> **不注册就注入 → 运行时 `Unable to resolve service for type 'IHttpContextAccessor'`。** 这是个只在请求时炸的坑。

**但要提醒一句：把"权限判断"放 validator 里，语义上有点越界。** 校验管"数据合不合法"，授权管"你能不能做"。更干净的做法是用 Policy（上一批 P149）或资源级授权。我列在这里是因为**它确实能工作**，而且很多项目就这么写。

### 场景 ③：规则本身可配置（阈值从配置读）

```csharp
public class BookValidator : AbstractValidator<BookDto>
{
    public BookValidator(IOptions<BookRuleOptions> opt)
    {
        var rule = opt.Value;
        RuleFor(x => x.Price)
            .InclusiveBetween(rule.MinPrice, rule.MaxPrice)
            .WithMessage($"价格必须在 {rule.MinPrice}~{rule.MaxPrice} 之间");
    }
}
```

**这个场景比前两个更"正当"**：校验阈值本来就该可配置（不同客户不同限制），写死在特性里反而错。

### 注入的边界：什么该注入，什么不该

| 该注入 | 不该注入 |
|---|---|
| 只读查询服务（查重、查存在性） | `DbContext` 的写操作（校验阶段不该改数据） |
| 配置（`IOptions<T>`） | `HttpContext` 的业务逻辑（除了取当前用户 ID） |
| 当前用户上下文 | 会发邮件/发消息的服务（校验不该有副作用） |

**一条原则：validator 里只做"读"，不做"写"。** 校验失败时，你的系统状态应该一个字节都没变。

**最后一个必须知道的性能事实：**

**每条 `MustAsync` 都是一次独立的 I/O。** 一个 DTO 有 5 条查库规则，就是 5 次数据库往返：

```csharp
RuleFor(x => x.Title).MustAsync(...);        // 1 次查询
RuleFor(x => x.Isbn).MustAsync(...);         // 1 次查询
RuleFor(x => x.AuthorName).MustAsync(...);   // 1 次查询
```

**能合并就合并**（一次查出三条规则的依据），或者接受它——校验是低频操作，5 次查询在 10ms 量级，通常不值得优化。

---

==二：格式==

## 1. Swagger 带 JWT：两套写法，按版本选

**先确认版本：**

```bash
dotnet list package | grep -i swashbuckle
```

**① Swashbuckle 6.x ~ 9.x（Microsoft.OpenApi 1.x，绝大多数教程）**

```csharp
using Microsoft.OpenApi.Models;      // ← 注意有 .Models

builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo { Title = "BookDemo", Version = "v1" });

    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "直接粘贴 JWT，不用写 Bearer 前缀"
    });

    o.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

app.UseSwagger();
app.UseSwaggerUI();
```

**② Swashbuckle 10.x（Microsoft.OpenApi 2.x，.NET 10 新建项目默认）**

```csharp
using Microsoft.OpenApi;             // ← 没有 .Models

builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo { Title = "BookDemo", Version = "v1" });

    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme   // 这一段没变
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "直接粘贴 JWT，不用写 Bearer 前缀"
    });

    o.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", doc), new List<string>() }
    });
});

app.UseSwagger();
app.UseSwaggerUI();
```

**差异对照（这也是我踩出来的四个错误）：**

| 项 | 1.x（6~9） | 2.x（10+） |
|---|---|---|
| 命名空间 | `Microsoft.OpenApi.Models` | `Microsoft.OpenApi` |
| 引用已有 scheme | `new OpenApiSecurityScheme { Reference = new OpenApiReference{...} }` | `new OpenApiSecuritySchemeReference("Bearer", doc)` |
| Requirement 的值类型 | `IList<string>`（数组也行） | `List<string>`（**数组不行**） |
| `AddSecurityRequirement` 参数 | 直接传对象 | **传 `Func<OpenApiDocument, ...>`** |

**验证是否成功（不用打开浏览器）：**

```bash
curl -s http://localhost:5003/swagger/v1/swagger.json | grep -A5 securitySchemes
```

**看到 `"Bearer": {"type":"http","scheme":"bearer"}` 就对了。**

---

## 2. JWT 撤回：`OnTokenValidated` 配置模板

**基础版（每请求查一次库）：**

```csharp
.AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = jwt["Issuer"],
        ValidateAudience = true, ValidAudience = jwt["Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        NameClaimType = "sub",
        RoleClaimType = "role"
    };

    o.Events = new JwtBearerEvents
    {
        OnTokenValidated = async ctx =>
        {
            var um = ctx.HttpContext.RequestServices.GetRequiredService<UserManager<IdentityUser>>();
            var uid = ctx.Principal?.FindFirst("sub")?.Value;
            var stamp = ctx.Principal?.FindFirst("stamp")?.Value;

            var user = string.IsNullOrEmpty(uid) ? null : await um.FindByIdAsync(uid);
            if (user == null) { ctx.Fail("用户不存在"); return; }
            if (user.SecurityStamp != stamp) ctx.Fail("凭证已失效");
        },

        // 排查必备：把失败原因记下来
        OnAuthenticationFailed = ctx =>
        {
            ctx.HttpContext.RequestServices
               .GetRequiredService<ILoggerFactory>()
               .CreateLogger("Jwt")
               .LogWarning(ctx.Exception, "JWT 认证失败：{Path}", ctx.HttpContext.Request.Path);
            return Task.CompletedTask;
        }
    };
});
```

**签发端必须带上 `stamp`，否则这套机制不成立：**

```csharp
var claims = new List<Claim>
{
    new("sub", user.Id),
    new("name", user.UserName ?? ""),
    new("stamp", user.SecurityStamp ?? "")        // ← 少了这行，撤回永远不生效
};
```

**缓存版（把每请求查库降到每 30 秒一次）：**

```csharp
OnTokenValidated = async ctx =>
{
    var sp = ctx.HttpContext.RequestServices;
    var cache = sp.GetRequiredService<IMemoryCache>();
    var um = sp.GetRequiredService<UserManager<IdentityUser>>();

    var uid = ctx.Principal!.FindFirst("sub")!.Value;
    var tokenStamp = ctx.Principal!.FindFirst("stamp")!.Value;

    var current = await cache.GetOrCreateAsync($"stamp:{uid}", async e =>
    {
        e.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
        return (await um.FindByIdAsync(uid))?.SecurityStamp;
    });

    if (current != tokenStamp) ctx.Fail("凭证已失效");
}
```

**踢人 / 让旧凭证全失效：**

```csharp
await _userManager.UpdateSecurityStampAsync(user);      // 一行，所有旧 token 作废
```

**注意：如果用了缓存，踢人后要主动清缓存，否则最长延迟 30 秒：**

```csharp
_cache.Remove($"stamp:{user.Id}");
await _userManager.UpdateSecurityStampAsync(user);
```

---

## 3. 托管服务：三个可直接套用的模板

**模板 A：固定间隔循环（最常用）**

```csharp
public class MyLoopService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MyLoopService> _logger;

    public MyLoopService(IServiceScopeFactory scopeFactory, ILogger<MyLoopService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (await timer.WaitForNextTickAsync(ct))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                // ... 干活
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;                                   // 正常关闭
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "本轮失败，下一轮继续");
            }
        }
    }
}
```

**模板 B：每天固定时刻（先睡到点，再循环）**

```csharp
protected override async Task ExecuteAsync(CancellationToken ct)
{
    while (!ct.IsCancellationRequested)
    {
        var now = DateTime.Now;
        var next = now.Date.AddHours(2);
        if (next <= now) next = next.AddDays(1);

        try { await Task.Delay(next - now, ct); }
        catch (OperationCanceledException) { break; }

        try { await DoWorkAsync(ct); }
        catch (Exception ex) { _logger.LogError(ex, "定时任务失败"); }
    }
}
```

**模板 C：一次性启动任务（应用启动时跑一次）**

```csharp
public class StartupInitService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    public StartupInitService(IServiceScopeFactory f) => _scopeFactory = f;

    public async Task StartAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync(ct);          // 启动时自动迁移
        // ⚠️ 这里耗时越长，端口越晚打开
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
```

**注册（`Program.cs`）：**

```csharp
builder.Services.AddHostedService<MyLoopService>();
builder.Services.AddHostedService<StartupInitService>();

// 想改默认行为（不推荐，除非你很清楚后果）
builder.Services.Configure<HostOptions>(o =>
{
    o.ShutdownTimeout = TimeSpan.FromSeconds(30);   // 关闭时等多久让 StopAsync 收尾
    // o.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});
```

---

## 4. FluentValidation：三个包，装哪两个

```bash
# 必装
dotnet add package FluentValidation
dotnet add package FluentValidation.DependencyInjectionExtensions

# 二选一：自动校验（推荐 SharpGrip，支持异步）
dotnet add package SharpGrip.FluentValidation.AutoValidation.Mvc
# 或者（老项目 / 只用同步规则）
# dotnet add package FluentValidation.AspNetCore
```

**注册（SharpGrip 方案）：**

```csharp
using FluentValidation;
using SharpGrip.FluentValidation.AutoValidation.Mvc.Extensions;

builder.Services.AddValidatorsFromAssemblyContaining<Program>();   // 扫描当前程序集
builder.Services.AddFluentValidationAutoValidation();              // 接管自动校验
```

**注册（老方案）：**

```csharp
using FluentValidation;
using FluentValidation.AspNetCore;

builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddFluentValidationAutoValidation();
```

**两种方案的区别：**

| | `FluentValidation.AspNetCore` 11.3.1 | `SharpGrip...AutoValidation.Mvc` 2.0.0 |
|---|---|---|
| 异步规则 | ❌ 500 `AsyncValidatorInvokedSynchronouslyException` | ✅ 支持 |
| 维护状态 | 停止更新 | 活跃 |
| 返回格式 | `ValidationProblemDetails` | 同 |
| 跳过某个参数 | `[CustomizeValidator(Skip = true)]`（挂参数上） | 有自己的跳过机制 |
| 与 `IValidatableObject` 混用 | 都执行 | 属性级有错时跨字段可能不执行（实测） |

---

## 5. Validator 模板（含服务注入）

```csharp
using FluentValidation;

public class CreateBookValidator : AbstractValidator<CreateBookDto>
{
    public CreateBookValidator(AppDbContext db, IHttpContextAccessor http)
    {
        // ① 基础规则
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("标题必填")
            .MaximumLength(50).WithMessage("标题最多 50 字");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("价格必须大于 0");

        // ② 跨字段
        RuleFor(x => x.EndTime)
            .GreaterThan(x => x.StartTime).WithMessage("结束必须晚于开始");

        // ③ 查库（异步）
        RuleFor(x => x.Title)
            .MustAsync(async (title, ct) =>
                !await db.Books.AnyAsync(b => b.Title == title, ct))
            .WithMessage("书名已存在");

        // ④ 编辑时排除自己
        RuleFor(x => x.Title)
            .MustAsync(async (dto, title, ct) =>
                !await db.Books.AnyAsync(b => b.Title == title && b.Id != dto.Id, ct))
            .WithMessage("书名已存在")
            .When(x => x.Id > 0);          // 只在编辑时生效

        // ⑤ 条件必填
        RuleFor(x => x.Isbn)
            .NotEmpty().WithMessage("纸质书必须填 ISBN")
            .When(x => x.Type == BookType.Paper);

        // ⑥ 改字段显示名（错误信息里不说 Price，说"价格"）
        RuleFor(x => x.Price).WithName("价格");
    }
}
```

**常用规则方法全表：**

| 类别 | 方法 | 说明 |
|---|---|---|
| 空值 | `NotEmpty()` | 字符串拒空白、集合拒空 |
| | `NotNull()` | 只拒 null |
| 长度 | `Length(min, max)` | 闭区间 |
| | `MinimumLength(n)` / `MaximumLength(n)` | 单边 |
| 数值 | `InclusiveBetween(a,b)` | 含端点 |
| | `ExclusiveBetween(a,b)` | 不含端点 |
| | `GreaterThan` / `LessThan` / `GreaterThanOrEqualTo` | 可传常量或 `x => x.Other` |
| 字符串 | `Matches(regex)` | 正则 |
| | `EmailAddress()` / `CreditCard()` / `Url()` | 内置格式 |
| 集合 | `NotEmpty()` / `UniqueItems()` | 去重 |
| 自定义 | `Must(predicate)` | 同步 |
| | `MustAsync(async (v, ct) => ...)` | 异步（自动校验需 SharpGrip） |
| 修饰 | `WithMessage("...")` | 文案 |
| | `WithName("...")` | 字段显示名 |
| | `When(cond)` / `Unless(cond)` | 条件生效 |
| | `Cascade(CascadeMode.Stop)` | 首错即停 |
| | `WithErrorCode("E001")` | 错误码（前端用） |
| 嵌套 | `SetValidator(new InnerValidator())` | 子对象校验 |
| | `RuleForEach(x => x.Items)` | 集合逐项 |

---

## 6. 错误与现象对照表

| 现象 | 原因 | 解法 |
|---|---|---|
| `CS0234: 命名空间 Microsoft.OpenApi 不存在 Models` | Swashbuckle 10.x 用 OpenApi 2.x | `using Microsoft.OpenApi;` |
| `CS0117: OpenApiSecurityScheme 没有 Reference` | 2.x 删了它 | `new OpenApiSecuritySchemeReference("Bearer", doc)` |
| `CS1503: string[] → List<string>` | Requirement 值类型变了 | 用 `new List<string>()` |
| `CS1503: 需要 Func<OpenApiDocument, ...>` | `AddSecurityRequirement` 签名变了 | 传 lambda |
| Swagger 上有锁但填了还 401 | `Type` 用了 `ApiKey` 而不是 `Http` | 改 `SecuritySchemeType.Http` |
| 改密码后旧 token 还能用 | 没在 token 里放 `stamp`，或没配 `OnTokenValidated` | 补 claim + 补事件 |
| `ctx.Fail()` 后一堆莫名 401 | 没有日志 | 加 `OnAuthenticationFailed` 记日志 |
| 启动时 `Cannot consume scoped service ... from singleton 'IHostedService'` | 单例直接注了 Scoped | 注入 `IServiceScopeFactory` |
| 后台服务抛异常整个站挂了 | 默认 `StopHost` | 循环内 try/catch |
| 网站启动慢了好几秒 | 某个 `StartAsync` 里有耗时操作 | 把耗时逻辑挪进 `ExecuteAsync` |
| `AsyncValidatorInvokedSynchronouslyException`（500） | 自动校验不支持异步规则 | 换 SharpGrip 或手动 `ValidateAsync` |
| `CS0592: CustomizeValidator 对此声明类型无效` | 特性挂在了方法上 | 挂到参数上 |
| `Unable to resolve service for type 'IHttpContextAccessor'` | 没注册 | `AddHttpContextAccessor()` |

---

==三：代码==

## 1. 完整可运行项目

**包清单：**

```bash
dotnet new web -o AdvDemo
cd AdvDemo

dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Swashbuckle.AspNetCore
dotnet add package FluentValidation
dotnet add package FluentValidation.DependencyInjectionExtensions
dotnet add package SharpGrip.FluentValidation.AutoValidation.Mvc
```

**`Program.cs` 全文：**

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AdvDemo;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SharpGrip.FluentValidation.AutoValidation.Mvc.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite("Data Source=adv.db"));

builder.Services.AddIdentityCore<IdentityUser>(o =>
{
    o.Password.RequiredLength = 6;
    o.Password.RequireDigit = true;
    o.Password.RequireUppercase = false;
    o.Password.RequireLowercase = false;
    o.Password.RequireNonAlphanumeric = false;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders()
.AddSignInManager();

builder.Services.AddHttpContextAccessor();

const string Key = "AdvDemo_Secret_Key_2026_0123456789_ABCDEF";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = "auth",
            ValidateAudience = true, ValidAudience = "client",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };

        // ===== P151：撤回机制 + 失败日志 =====
        o.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var sp = ctx.HttpContext.RequestServices;
                var cache = sp.GetRequiredService<IMemoryCache>();
                var um = sp.GetRequiredService<UserManager<IdentityUser>>();

                var uid = ctx.Principal?.FindFirst("sub")?.Value;
                var tokenStamp = ctx.Principal?.FindFirst("stamp")?.Value;
                if (string.IsNullOrEmpty(uid) || string.IsNullOrEmpty(tokenStamp))
                {
                    ctx.Fail("缺少必要 claim");
                    return;
                }

                var current = await cache.GetOrCreateAsync($"stamp:{uid}", async e =>
                {
                    e.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
                    return (await um.FindByIdAsync(uid))?.SecurityStamp;
                });

                if (current != tokenStamp) ctx.Fail("凭证已失效");
            },
            OnAuthenticationFailed = ctx =>
            {
                ctx.HttpContext.RequestServices
                   .GetRequiredService<ILoggerFactory>()
                   .CreateLogger("Jwt")
                   .LogWarning(ctx.Exception, "JWT 失败：{Path}", ctx.HttpContext.Request.Path);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ===== P155/P156：校验 =====
builder.Services.AddScoped<IBookRepo, BookRepo>();
builder.Services.AddControllers();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddFluentValidationAutoValidation();

// ===== P152/P153：托管服务 =====
builder.Services.AddHostedService<TickService>();

// ===== P150：Swagger =====
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo { Title = "AdvDemo", Version = "v1" });

    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "直接粘贴 JWT"
    });

    o.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", doc), new List<string>() }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ---------- 认证相关端点 ----------
string MakeToken(IdentityUser user, IList<string> roles)
{
    var claims = new List<Claim>
    {
        new("sub", user.Id),
        new("name", user.UserName ?? ""),
        new("stamp", user.SecurityStamp ?? "")       // ← 撤回机制的前提
    };
    foreach (var r in roles) claims.Add(new Claim("role", r));

    var creds = new SigningCredentials(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
        SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: "auth", audience: "client", claims: claims,
        notBefore: DateTime.UtcNow.AddMinutes(-1),
        expires: DateTime.UtcNow.AddHours(2),
        signingCredentials: creds);

    return new JwtSecurityTokenHandler().WriteToken(token);
}

app.MapGet("/register", async (string name, string pwd, UserManager<IdentityUser> um) =>
{
    var r = await um.CreateAsync(new IdentityUser(name), pwd);
    return r.Succeeded ? Results.Ok(new { ok = true })
        : Results.BadRequest(r.Errors.Select(e => e.Code));
});

app.MapGet("/login", async (string name, string pwd,
    UserManager<IdentityUser> um, SignInManager<IdentityUser> sm) =>
{
    var u = await um.FindByNameAsync(name);
    if (u == null) return Results.Unauthorized();
    var c = await sm.CheckPasswordSignInAsync(u, pwd, lockoutOnFailure: true);
    if (!c.Succeeded) return Results.Unauthorized();
    var roles = await um.GetRolesAsync(u);
    return Results.Ok(new { token = MakeToken(u, roles), stamp = u.SecurityStamp });
});

app.MapGet("/me", (HttpContext ctx) => Results.Ok(new
{
    name = ctx.User.Identity?.Name,
    stamp = ctx.User.FindFirst("stamp")?.Value
})).RequireAuthorization();

// 改密码：stamp 自动变 → 所有旧 token 立刻失效
app.MapGet("/change-pwd", async (string name, string oldPwd, string newPwd,
    UserManager<IdentityUser> um, IMemoryCache cache) =>
{
    var u = await um.FindByNameAsync(name);
    if (u == null) return Results.NotFound();
    var r = await um.ChangePasswordAsync(u, oldPwd, newPwd);
    cache.Remove($"stamp:{u.Id}");                    // 有缓存时别忘了清
    return r.Succeeded ? Results.Ok(new { ok = true })
        : Results.BadRequest(r.Errors.Select(e => e.Code));
}).RequireAuthorization();

// 踢人：只换 stamp
app.MapGet("/kick", async (string name, UserManager<IdentityUser> um, IMemoryCache cache) =>
{
    var u = await um.FindByNameAsync(name);
    if (u == null) return Results.NotFound();
    await um.UpdateSecurityStampAsync(u);
    cache.Remove($"stamp:{u.Id}");
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// 看后台服务跑了多少次
app.MapGet("/bg/hits", () => new { hits = Counter.Hits }).AllowAnonymous();

app.Run();
```

**`Services.cs`（托管服务）：**

```csharp
namespace AdvDemo;

public static class Counter
{
    public static int Hits;
}

public class TickService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TickService> _logger;

    public TickService(IServiceScopeFactory scopeFactory, ILogger<TickService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(2));
        while (await timer.WaitForNextTickAsync(ct))
        {
            try
            {
                Interlocked.Increment(ref Counter.Hits);

                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                // 真实场景在这里干活：清理、导出、统计……
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "本轮失败，下一轮继续");
            }
        }
    }
}

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> o) : base(o) { }
}
```

**`Validation.cs`（DTO + Validator + Controller）：**

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace AdvDemo;

public class CreateBookDto
{
    public long Id { get; set; }
    public string Title { get; set; } = "";
    public double Price { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}

public interface IBookRepo
{
    Task<bool> ExistsAsync(string title);
}

public class BookRepo : IBookRepo
{
    private static readonly HashSet<string> Seed = new() { "操作系统", "算法导论" };
    public Task<bool> ExistsAsync(string title) => Task.FromResult(Seed.Contains(title));
}

public class CreateBookValidator : AbstractValidator<CreateBookDto>
{
    public CreateBookValidator(IBookRepo repo)
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("标题必填")
            .Length(2, 50).WithMessage("标题 2~50 字")
            .MustAsync(async (title, ct) => !await repo.ExistsAsync(title))
            .WithMessage("书名已存在");

        RuleFor(x => x.Price).WithName("价格")
            .InclusiveBetween(0.01, 10000).WithMessage("价格 0.01~10000");

        RuleFor(x => x.EndTime)
            .GreaterThan(x => x.StartTime).WithMessage("结束必须晚于开始");
    }
}

[ApiController]
[Route("api/books")]
public class BooksController : ControllerBase
{
    [HttpPost]
    public IActionResult Create([FromBody] CreateBookDto dto) => Ok(new { ok = true });
}
```

---

## 2. 本篇实测汇总（全部真跑出来的）

**P150 Swagger：**

| 实验 | 结果 |
|---|---|
| 套用老写法（`OpenApiReference`） | 依次 4 个编译错误：`CS0234` → `CS0117`+`CS0246` → `CS1503`(string[]→List) → `CS1503`(需要 Func) |
| 新写法编译 | 0 错误 0 警告 |
| `swagger.json` 的 `securitySchemes` | `{"Bearer":{"type":"http","scheme":"bearer","bearerFormat":"JWT"}}` |
| 全局 `security` | `[{"Bearer":[]}]`（对**所有**接口生效，含 `/login`） |

**P151 撤回：**

| 实验 | 结果 |
|---|---|
| 登录 → `stamp` | `4W5NUKNJ4ZITESLONECO2YKZBN6GVGKU`，token 300 字符 |
| 带 token 访问 `/me` | 200 |
| 改密码 → 新 stamp | `L6SZCHSUXLWJXIVDGTQO54HO674UFHTY` |
| **用旧 token 再访问** | **401**（立即失效） |
| 用新密码登录 → 新 token | 200 |
| 主动 `/kick`（只换 stamp） | 旧 token 立刻 401 |

**P152 托管服务：**

| 实验 | 结果 |
|---|---|
| `StartAsync` 里 `Task.Delay(3000)` | `Now listening on` **推迟到 3 秒后**（Kestrel 在所有 StartAsync 之后才监听） |
| 启动日志顺序 | `TickService ctor` → `TickService 开始` → `SlowStart 开始` → `SlowStart 结束` → `Now listening` → `Application started` |
| `ExecuteAsync` 的同步段 | 在 `StartAsync` 阶段就跑（`TickService 开始` 出现在 `SlowStart` 之前） |
| 后台服务抛未捕获异常 | `fail: Host[9] BackgroundService failed` + `crit: Host[10] ... configured to StopHost ... the IHost instance is stopping` → **整个应用停止** |
| 单例直接注 Scoped | `Build()` 阶段抛 `Cannot consume scoped service 'AdvTest.AppDbContext' from singleton 'Microsoft.Extensions.Hosting.IHostedService'` |

**P153 定时：**

| 时间点 | hits |
|---|---|
| 4 秒 | 3 |
| 9 秒 | 5 |
| 14 秒 | 8 |

（`PeriodicTimer(2 秒)`，符合"每 2 秒一次、不重入"。）

**P154–P156 校验（六组对照）：**

| 请求 | 结果 |
|---|---|
| DataAnnotations 空对象 | 400，`errors` 按字段分组，`Title` 有 2 条，跨字段 `EndTime` 也有 |
| 属性级全对、只有跨字段违规 | 400，只有 `EndTime`（`IValidatableObject` 生效） |
| FV 同步 validator + 自动校验 | 400，**格式与 DataAnnotations 完全相同** |
| FV 同步 + 合法数据 | 200 |
| **FV 异步 validator + 自动校验** | **500 `AsyncValidatorInvokedSynchronouslyException`**（"ASP.NET's validation pipeline is not asynchronous"） |
| FV 异步 + `[CustomizeValidator(Skip=true)]` + 手动 `ValidateAsync` | 400，`{"Title":["书名已存在（这条规则查了数据库）"]}` |
| SharpGrip + 异步 validator（自动） | **400**（不再是 500），格式同上 |
| SharpGrip 下属性级有错 + 跨字段也违规 | 400，**只报属性级错误，跨字段不报** |

**编译错误：**

| 写法 | 错误 |
|---|---|
| `[CustomizeValidator(Skip=true)]` 挂在方法上 | `CS0592: 仅对"属性、索引器, 参数"声明有效` |

---

## 3. 练习：给图书系统加三件事

**目标：** ① Swagger 里能填 token；② 被封号的人立刻掉线；③ 每天凌晨 2 点导出图书 CSV。

---

### Step 1 · Swagger 带 token（10 分钟）

先查版本：

```bash
cd "D:\code\编程语言学习\后端\练习\ASP.NET Core--图书管理系统\ASP.NET Core--图书管理系统\ASP.NET Core--图书管理系统"
dotnet list package | grep -i "Swashbuckle\|OpenApi"
```

- 显示 `6.x` → 用 ==二：格式== 第 1 节的写法 ①
- 显示 `10.x` 或没有 Swashbuckle → 先装 `dotnet add package Swashbuckle.AspNetCore`，再用写法 ②

**验证：** 打开 `https://localhost:xxxx/swagger`，右上角有 **Authorize** 按钮，填入登录拿到的 token，然后调 `/api/books` 的 POST，看是否 200。

---

### Step 2 · 让 JWT 能撤回（20 分钟）

**① 签发时加 `stamp`**（改你的 `AuthController.CreateToken`）：

```csharp
var claims = new List<Claim>
{
    new("sub", user.Id),
    new("name", user.UserName ?? ""),
    new("stamp", user.SecurityStamp ?? "")      // ← 新增这一行
};
```

**② 加 `OnTokenValidated`**（改 `Program.cs` 的 `AddJwtBearer`）：

```csharp
o.Events = new JwtBearerEvents
{
    OnTokenValidated = async ctx =>
    {
        var um = ctx.HttpContext.RequestServices.GetRequiredService<UserManager<IdentityUser>>();
        var uid = ctx.Principal?.FindFirst("sub")?.Value;
        var stamp = ctx.Principal?.FindFirst("stamp")?.Value;
        var user = string.IsNullOrEmpty(uid) ? null : await um.FindByIdAsync(uid);
        if (user == null || user.SecurityStamp != stamp) ctx.Fail("凭证已失效");
    }
};
```

**③ 加一个"踢人"接口**（`AuthController`）：

```csharp
[HttpPost("kick/{userName}")]
[Authorize(Policy = "adminOnly")]
public async Task<IActionResult> Kick(string userName)
{
    var user = await _userManager.FindByNameAsync(userName);
    if (user == null) return NotFound();
    await _userManager.UpdateSecurityStampAsync(user);   // 一行搞定
    return Ok(new { msg = "该用户所有设备已下线" });
}
```

**✅ 验证清单：**

| 步骤 | 期望 |
|---|---|
| 登录拿 token A，访问 `/api/auth/me` | 200 |
| 调 `/api/auth/change-pwd` 改密码 | 200 |
| **用 token A 再访问 `/api/auth/me`** | **401** ← 核心验证点 |
| 用新密码登录拿 token B | 200 |
| 管理员调 `kick/{用户名}`，再用 token B | **401** |

---

### Step 3 · 每日导出（30 分钟）

**新建 `Services/DailyExportService.cs`：**

```csharp
using Microsoft.EntityFrameworkCore;

namespace BookDemo.Services;

public class DailyExportService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DailyExportService> _logger;

    public DailyExportService(IServiceScopeFactory scopeFactory, ILogger<DailyExportService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var now = DateTime.Now;
            var next = now.Date.AddHours(2);          // 凌晨 2 点
            if (next <= now) next = next.AddDays(1);

            try { await Task.Delay(next - now, ct); }
            catch (OperationCanceledException) { break; }

            try
            {
                await ExportAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "导出失败，明天再试");
            }
        }
    }

    private async Task ExportAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BookDbContext>();

        var rows = await db.Books.AsNoTracking()
            .Select(b => new { b.Id, b.Title, b.Price, b.PubTime })
            .ToListAsync(ct);

        var dir = Path.Combine(AppContext.BaseDirectory, "exports");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"books-{DateTime.Now:yyyyMMdd}.csv");

        await File.WriteAllLinesAsync(path,
            rows.Select(r => $"{r.Id},{r.Title},{r.Price},{r.PubTime:yyyy-MM-dd}"), ct);

        _logger.LogInformation("导出 {Count} 条到 {Path}", rows.Count, path);
    }
}
```

**注册：**

```csharp
builder.Services.AddHostedService<DailyExportService>();
```

**✅ 验证技巧（别真等到凌晨 2 点）：**

把 `AddHours(2)` 临时改成 `AddMinutes(2)`，跑起来看 `bin/Debug/net10.0/exports/` 下有没有生成文件。

**生成后记得改回去。** 这个"临时改阈值验证"的手法，比写单元测试快得多。

---

### Step 4 · 把校验换成 FluentValidation（可选，30 分钟）

**只做一件事就够体验：把 `CreateBookDto` 的 `[Required]`/`[Range]` 换成一个 validator，并加一条"书名不能重复"。**

```csharp
public class CreateBookValidator : AbstractValidator<CreateBookDto>
{
    public CreateBookValidator(BookDbContext db)
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("标题必填")
            .MustAsync(async (t, ct) => !await db.Books.AnyAsync(b => b.Title == t, ct))
            .WithMessage("书名已存在");
    }
}
```

**注册用 SharpGrip（支持异步）：**

```csharp
dotnet add package SharpGrip.FluentValidation.AutoValidation.Mvc

builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddFluentValidationAutoValidation();
```

**✅ 验证：** 提交一个已存在的书名，期望 400 + `{"errors":{"Title":["书名已存在"]}}`。**如果拿到 500，说明你用的是 `FluentValidation.AspNetCore`。**

---

==四：总结==

## 1. 七节知识一张表

| 节 | 一句话 | 最关键的那个坑 |
|---|---|---|
| P150 | Swagger 上加个 Authorize 按钮，token 填一次全局生效 | Swashbuckle 10.x 换了 OpenApi 2.x，老代码**连炸四个编译错** |
| P151 | 把 `SecurityStamp` 写进 token，每请求核对，实现"随时撤回" | 签发放了 `stamp` 但验证没配 `OnTokenValidated`，等于没做 |
| P152 | 托管服务由宿主管生命周期，跟应用同生共死 | **后台服务抛异常 → 整个应用停止**（默认 `StopHost`）；单例注 Scoped → 启动崩 |
| P153 | `PeriodicTimer` 是定时任务的唯一正确答案 | `Task.Delay` 循环会漂移；`Timer` 回调是 `async void` 会崩进程 |
| P154 | DataAnnotations 能管"必填/长度/范围"，管不了跨字段和查库 | 跨字段只能 `IValidatableObject`，查库根本做不到 |
| P155 | FluentValidation 规则集中、可复用、可测 | **`FluentValidation.AspNetCore` 不支持异步规则，直接 500** |
| P156 | validator 能注入任何服务（DI 的必然结果） | 要异步就换 SharpGrip，或手动 `ValidateAsync` |

## 2. 六条硬结论（全部实测）

1. **Swashbuckle 10.x 的 `AddSecurityRequirement` 要一个 `Func<OpenApiDocument, ...>`**，不是对象。`OpenApiSecurityScheme.Reference` 这个属性在 OpenApi 2.x 里**已经不存在**。
2. **在 `StartAsync` 里 await 长的操作，Kestrel 就不开始监听。** 实测：`Task.Delay(3000)` 让 `Now listening` 推迟 3 秒——这段时间健康检查会判你"未就绪"。
3. **`BackgroundService.ExecuteAsync` 的同步段在 `StartAsync` 阶段执行。** 所以第一个 `await` 之前别写 `Thread.Sleep` 或同步 IO。
4. **后台服务里一个未捕获异常 = 整个网站下线。** 日志是 `crit: Host[10] ... IHost instance is stopping`，默认 `BackgroundServiceExceptionBehavior.StopHost`。
5. **`FluentValidation.AspNetCore` 11.3.1 遇到 `MustAsync` 直接 500**，报 `AsyncValidatorInvokedSynchronouslyException`（原文："ASP.NET's validation pipeline is not asynchronous"）。换 `SharpGrip` 就正常 400。
6. **`[CustomizeValidator(Skip = true)]` 只能挂在参数上**，挂方法上编译报 `CS0592`。

## 3. 决策流程图

```
要加"定时任务"了？
      │
      ├─ 只是启动时跑一次 → IHostedService.StartAsync（注意会拖慢启动）
      │
      └─ 要周期执行
            │
            ├─ 固定间隔  → PeriodicTimer（模板 A）
            └─ 每天定点  → 先 Delay 到点，再 PeriodicTimer(24h)（模板 B）
                          │
                     多实例部署？
                          ├─ 否 → 完事
                          └─ 是 → 加分布式锁（Redis SETNX / 数据库唯一键）

要"立刻踢人下线"？
      │
      ├─ token 有效期 ≤ 15 分钟 → 可以不做，等它自己过期
      └─ 必须立刻
            ├─ 按用户撤 → SecurityStamp 比对（本节，1 次查库/请求，可加缓存）
            └─ 按设备撤 → 黑名单（Redis，按 jti）

校验规则往哪写？
      │
      ├─ 只是必填/长度/范围，且 < 10 条 → DataAnnotations，别折腾
      ├─ 有跨字段比较 → IValidatableObject（或直接上 FluentValidation）
      ├─ 要查库 / 要异步 / 要复用 / 要错误码
      │        │
      │        └─ FluentValidation
      │              ├─ 只有同步规则 → FluentValidation.AspNetCore 也行
      │              └─ 有异步规则 → 必须 SharpGrip 或手动 ValidateAsync
      │
      └─ 规则是业务规则（重名、库存不足）→ 放业务层，返回 409，别塞校验层
```

## 4. 记忆口诀

```
Swagger 配 Type 用 Http，Bearer 前缀它自己加；
OpenApi 升到二，Reference 没了用 SchemeReference；
撤回靠 stamp 进 token，每次请求对一遍；
改密换章全失效，一行 UpdateSecurityStamp；
托管服务跟宿主，StartAsync 阻塞不监听；
ExecuteAsync 炸一次，整个网站跟着停；
定时只用 PeriodicTimer，Delay 循环会漂移；
DataAnnotation 管格式，跨字段查库它不行；
Fluent 规则能注入，异步必须 SharpGrip。
```

## 5. 三句话带走

1. **JWT 的"无状态"是可以买回来的，价格是每个请求一次查询。** 值不值取决于你的场景：支付系统值，内容浏览不值。想清楚再买，别默认就上。

2. **托管服务是"应用级"的东西，它的失败模式是"全站"级别的。** 所以它必须比 Controller 更小心：循环内兜异常、注入 `IServiceScopeFactory` 而不是 `DbContext`、多实例时加锁。

3. **校验库的选择，本质是"你要不要异步规则"这一个问题。** 不要 → 随便哪个都行；要 → 只能 SharpGrip 或手动 `ValidateAsync`。`FluentValidation.AspNetCore` 那条路在 .NET 10 上已经走不通了，别再照 2022 年的教程抄。

---

> **下一批（P157–P165）预告：** SignalR——WebSocket 是什么、Hub 的基本用法、协议协商、分布式部署、身份认证、给部分客户端发消息、外部推送，最后是程序发布上线。**这是"实时"这一整块，做完你的服务端就能主动推消息了**（游戏里的房间同步、聊天、通知都靠它）。