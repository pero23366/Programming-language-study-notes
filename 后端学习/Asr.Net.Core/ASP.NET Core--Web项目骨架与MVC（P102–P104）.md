==零：补充==

> **这一节回答三个问题：这节"入门课"为什么还要学？没有它会怎样？你什么时候其实用不上它？**

## 它解决什么问题

你现在的状态很典型：**项目能跑，接口能返回 JSON，但你不知道它是怎么跑起来的。**

你知道 `Program.cs` 里写了 `AddControllers()` 和 `MapControllers()`，你知道 `BooksController` 里的 `[HttpGet]` 能变成一个 URL。但如果我问你：

- 一个请求从浏览器出发，到你 `GetBooks()` 方法的第一行代码执行，中间经过了谁？
- 为什么 `app.UseHttpsRedirection()` 写在 `app.MapControllers()` 前面？反过来会怎样？
- 你新加一个 Controller，为什么**不需要注册**就能被访问到？而你的 `BookDbContext` 就必须 `AddDbContext`？
- 接口返回 404，是路由没匹配上，还是 Controller 没找到，还是 Action 返回了 NotFound？

**这四个问题答不上来，你就永远停在"照抄模板"的阶段。** 而 P102 这一节，就是把这张黑盒图变成白盒。

## 没有它会怎样

**第一种后果：报错时只能搜，不能定位。**

举个例子，你写了 `[HttpGet("books/{id}")]`，前端请求 `/api/books/5` 返回 404。你会怎么办？

- 不懂路由的人：去搜"ASP.NET Core 404"，试十种改法，改对了不知道为什么对。
- 懂路由的人：一眼看出 `Route` 前缀是 `api/[controller]`，拼出来的模板是 `api/Books/books/{id}`，而前端请求的是 `api/books/5`——**大小写不匹配（Linux 上）或模板拼错了**。

差别的本质不是聪明，是**脑子里有没有那张 URL 生成表**。

**第二种后果：安全相关的顺序问题，你会写错而且看不出来。**

中间件的执行顺序不是"随便排"，它是**洋葱**：先注册的在最外层，请求先进、响应后出。所以：

- `UseAuthentication()` 必须排在 `UseAuthorization()` **前面**——没认证哪来授权依据。
- 你的异常处理中间件必须排在**最外层**——否则里面抛的异常它捕获不到。
- `UseStaticFiles()` 排在 `UseRouting()` 前面，静态文件命中就直接返回，**根本不进路由**（这是性能设计，也是 bug 来源：你改了 CSS 不生效，可能是被静态文件缓存了）。

这些顺序错了，程序**不会报错**，只会在某个特定场景下行为诡异。这是最消耗人的 bug 类型。

**第三种后果：你会误解"框架帮你做了什么"。**

你以为 `[ApiController]` 只是个标记，其实它悄悄改了三件事（参数从 body 读、自动返回 400、强制特性路由）。你以为 Controller 要注册，其实不需要。**这些"以为"会在你排查问题时全部变成错误假设。**

## 它在整个生态里的位置

P102–P104 是 **Part4 的地图**。后面 40 节（REST、状态码、Filter、中间件、JWT、SignalR）全部是在这张图上**加点**：

| 后面要学的东西 | 挂在哪一层 | 对应的 P |
|---|---|---|
| Filter（异常、Action、限速、事务） | Controller **内部**，Action 执行前后 | P134–137 |
| 中间件（自定义、限流、Markdown 渲染） | Controller **外面**，管线里 | P138–143 |
| JWT 认证授权 | 管线里的 `UseAuthentication/UseAuthorization` | P144–151 |
| 缓存 | 可以是中间件（响应缓存），也可以是 Action 里的代码（内存缓存） | P119–128 |
| REST 语义、状态码 | Action 的**返回值**这一层 | P107–113 |
| DI 在 Web 里的用法 | `builder.Services` 那个容器 | P117–118 |

**看懂这张表你就明白了：如果不先建立"管线 → 路由 → Controller → Action → 返回"这条主链路，后面每一节都会变成孤立的知识点。** 而孤立的知识点，两周就忘。

## 对你个人的实际意义

**第一，你的项目里已经有一半的答案，只是没有名字。**

你的 `Program.cs` 现在大概是这个形状（对照你自己的文件看）：

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddDbContext<BookDbContext>(opt =>
    opt.UseSqlServer(...).LogTo(Console.WriteLine).EnableSensitiveDataLogging());
var app = builder.Build();
app.UseHttpsRedirection();   // 你已经注释掉了
app.UseAuthorization();
app.MapControllers();
app.Run();
```

这 10 行里，**每一行都在决定请求的命运**，而你之前只是"模板这么写我就这么写"。学完这节，你会知道：

- `AddDbContext` 注册的 `BookDbContext` 是 **Scoped** 的——所以每个 HTTP 请求拿到一个独立的上下文，这就是为什么你不用管线程安全。
- `UseHttpsRedirection` 会把 http 请求 307 到 https，你的 `.http` 文件拿到空响应就是这个原因（你已经踩过这个坑并注释掉了）。
- `UseAuthorization` 现在没有 `UseAuthentication` 配着，是因为你还没做认证——**等你学 JWT 那节，就必须在它前面加一行**，否则永远 401。

**第二，你现在写的 Controller 属于"半 MVC 半 API"的混合体。**

你的 `BooksController` 大概率是这样：

```csharp
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase   // 或者 Controller
```

`ControllerBase` 和 `Controller` 的区别（P103 会细讲）不是名字长短：`Controller` 多了 `View()`、`PartialView()` 这些**返回 HTML 的能力**，而你一个都用不上。用 `ControllerBase` 是"我明确知道我不返回页面"。**这个选择本身就是 MVC 与 WebAPI 分野的证据。**

**第三，HotReload（P104）会立刻改变你的开发节奏。**

你现在改一行代码 → 停 → F5 → 等 3 秒 → 再点接口。学完 P104 你改成：改一行 → 保存 → 浏览器刷新，**一秒看到结果**。这不是"效率提升 30%"，是**改变了你试错的频率**。试错频率高的学习，速度是另一个量级。

## 诚实的话：什么时候其实用不上

**这节的三块内容，价值差别很大，不要平均用力。**

| 内容 | 价值 | 说明 |
|---|---|---|
| **P102 请求生命周期 + 中间件顺序** | ★★★ 必须吃透 | 这是后面 40 节的地基，错了处处踩坑 |
| **P102 配置源与 launchSettings** | ★★ 会查就行 | 知道优先级顺序、知道端口在哪改，够了 |
| **P103 路由（约定 vs 特性）** | ★★★ 必须吃透 | 你 90% 的 404 都出在这 |
| **P103 参数绑定 / `[ApiController]` 的三条隐式规则** | ★★★ 必须吃透 | 直接决定你接口能不能收到参数 |
| **P103 Razor View / TagHelper / _Layout** | ★ 认识就行 | **你做前后端分离，这一整套你用不上**。知道它存在、看到 `.cshtml` 不慌，就足够了 |
| **P104 HotReload** | ★★ 会用 + 知道边界 | 20 分钟能上手，但要清楚"哪些改动必须重启" |

**特别说明：Razor 那一大块（Views 目录、`.cshtml`、TagHelper、`_Layout.cshtml`）我是"快速带过"的。** 理由很实在：

- 你做的是**前后端分离**（Vue/原生 JS + WebAPI），HTML 由前端渲染，后端只出 JSON。
- Razor 的完整知识（TagHelper 全表、ViewComponent、局部视图、布局嵌套）**只服务于"服务端渲染"这一条路线**。
- 而服务端渲染在你当前的目标（独立游戏、或者 Web 后端）里，是一条**你已经主动放弃的路**。

所以 P103 我会花 70% 的篇幅讲路由和参数绑定，Razor 只花 10 分钟讲清"它是干什么的、长什么样"，让你以后看别人的 MVC 项目不瞎。

**一句话总结这一批的定位：P102 给你地图，P103 给你路由和参数这两把钥匙，P104 给你更快的试错工具。Razor 是地图上的一块你不去的区域，知道它在哪就行。**

---

==一：概念==

> 本篇覆盖 **P102–P104**：ASP.NET Core 入门、MVC、HotReload。
> 环境：**.NET 10 / C# 14**，项目模板为 **ASP.NET Core Web API**（空项目，不带 Swagger UI）。
> 承接：Part3 全部（EF Core）已完成，Part2 的异步 / LINQ / DI / 配置 / 日志是你读这一篇的前置。
> 本篇的代码全部可以对着自己的图书管理系统项目验证，不需要另建项目（想练手可以另建一个 `WebDemo`）。

---

# P102　ASP.NET Core 入门

**一句话：ASP.NET Core 本体只有一个东西——一条由若干"中间件"串起来的处理管线；你的 Controller 只是这条管线的**终点**（Endpoint）之一。**

## 1. 一个请求的完整旅程（全文最重要的一张图）

先看全景。这是你每次 F5 之后，浏览器发一个请求时发生的事：

```
浏览器 GET http://localhost:5003/api/books?page=1
   │
   ▼
① Kestrel（Web 服务器）
   监听 socket → 解析 HTTP 报文 → 组装成 HttpContext（Request/Response/User/Items）
   │
   ▼
② 中间件管线（洋葱，一层套一层）
   UseExceptionHandler   ── 最外层，兜住所有异常
   UseHsts / UseHttpsRedirection
   UseStaticFiles        ── 命中 wwwroot 里的文件？命中就直接返回，不再往下
   UseRouting            ── 拿 URL 去路由表里匹配，算出"这是哪个 Endpoint"
   UseCors
   UseAuthentication     ── 我是谁
   UseAuthorization      ── 我能不能进
   │
   ▼
③ Endpoint 执行（终点）
   模型绑定（Model Binding）── 把 URL/Query/Body 里的值填到方法参数上
   ↓
   Controller 实例化（由 DI 容器 new，构造函数参数自动注入）
   ↓
   Action 方法执行（你的业务代码）
   ↓
   返回值处理（IActionResult 被执行：序列化成 JSON / 写状态码）
   │
   ▼
④ 响应原路返回（洋葱从里往外剥）
   各中间件在 await next() 之后的代码依次执行
   │
   ▼
⑤ Kestrel 把 HttpContext.Response 写成 HTTP 报文 → 浏览器
```

**这张图里，有三个位置是新手最容易搞混的**，我提前标出来：

| 位置 | 谁负责 | 常见误解 |
|---|---|---|
| ② 中间件管线 | 你在 `Program.cs` 里用 `app.UseXxx()` 手写 | 以为顺序随便排。**顺序 = 执行顺序，错了不报错但行为错** |
| ③ 模型绑定 | 框架自动做，你只写参数名 | 以为复杂对象一定从 body 读。**不加 `[FromBody]` / `[ApiController]` 时是从 Query/Form 按名字凑的** |
| ③ Controller 实例化 | DI 容器 | **以为 Controller 要注册**。不需要——框架用 `IControllerActivator` 反射创建，只有它的构造函数依赖才需要注册 |

## 2. `Program.cs` 五段式解剖

不管模板怎么变，`Program.cs` 永远是这五段。**记住这五段的顺序和每一段的"时机"，你就掌握了启动过程。**

```csharp
// ── 第 1 段：创建 Builder（读配置、建容器、配日志）
var builder = WebApplication.CreateBuilder(args);

// ── 第 2 段：往容器里注册服务（此时还没有容器实例，只是在"填表"）
builder.Services.AddControllers();
builder.Services.AddDbContext<BookDbContext>(...);

// ── 第 3 段：Build —— 容器真正建立、服务提供者就绪
var app = builder.Build();

// ── 第 4 段：组装中间件管线（顺序 = 执行顺序）
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();      // 这是一个"特殊"的中间件：端点路由

// ── 第 5 段：启动 Kestrel，开始监听，阻塞在这里
app.Run();
```

### 逐段拆解

| 段 | 代码 | 谁在调用 | 这一行到底做了什么 | 不写会怎样 |
|---|---|---|---|---|
| 1 | `WebApplication.CreateBuilder(args)` | 你的 `Program.cs`（顶级语句，编译器塞进 `Main`） | ① 加载配置（appsettings → 环境变量 → 命令行）② 初始化日志 ③ 创建空的 `IServiceCollection` ④ 记录 `ContentRoot`、`Environment` | 编译不过。这是整个应用的**入口状态机** |
| 2 | `builder.Services.AddControllers()` | 你，调用扩展方法 | 往 `IServiceCollection` 里塞一批描述（Controller 发现器、模型绑定器、JSON 序列化器、验证器……） | **接口全部 404**。因为 `MapControllers()` 找不到任何"已知的 Controller 类型" |
| 2 | `builder.Services.AddDbContext<T>(...)` | 你 | 注册 `T` 为 **Scoped**，并告诉容器"造它的时候用这个 lambda" | 构造 Controller 时抛 `Unable to resolve service for type 'BookDbContext'` |
| 3 | `builder.Build()` | 你 | 用第 2 段填的表**真正创建** `ServiceProvider`；把 `IWebHostEnvironment`、配置、日志全部固化 | 编译不过（`app` 变量拿不到） |
| 4 | `app.UseXxx()` | 你 | 往**中间件集合**里 `Add`，此时**一条代码都没执行**（注意：`UseXxx` 是"排队"，不是"执行"） | 少写某个 `Use`，对应功能整体消失（如不写 `UseAuthentication` → 永远匿名） |
| 4 | `app.MapControllers()` | 你 | 扫描程序集里所有 Controller，把它们的路由模板 + Action 注册到 `EndpointDataSource` | 接口全部 404（和上面不同：这里是**路由表空**） |
| 5 | `app.Run()` | 你 | 构建管线 → 启动 Kestrel → 监听端口 → **阻塞当前线程** | 程序一闪而过（控制台项目直接退出） |

### 三个必须记住的点

**① 第 2 段和第 4 段是两个不同的"表"。**

```
builder.Services.AddXxx()   →  往「服务表」里写（这个表决定"谁能被 new 出来"）
app.UseXxx()                →  往「管线表」里写（这个表决定"请求怎么被处理"）
```

初学者的经典错误：写了 `builder.Services.AddAuthentication()` 就以为认证生效了。**错。你还得在管线里 `app.UseAuthentication()`。** 注册是"提供能力"，`Use` 才是"启用行为"。

**② 第 4 段的顺序 = 执行顺序，而且是"双程"的。**

```csharp
app.Use(async (ctx, next) => {
    Console.WriteLine("A 进");
    await next();
    Console.WriteLine("A 出");
});
app.Use(async (ctx, next) => {
    Console.WriteLine("B 进");
    await next();
    Console.WriteLine("B 出");
});
```

输出：

```
A 进
B 进
B 出
A 出
```

**A 是最外层。** 这就是"洋葱"。所以异常处理必须写在最前面（最外层才能捕到里面所有的异常），而 `UseHttpsRedirection` 写在 `MapControllers` 之后就等于**永远不执行**（因为端点已经处理完请求了）。

**③ `MapControllers()` 不是普通中间件，它是"终点标记"。**

`app.Map...()` 系列（`MapControllers`、`MapGet`、`MapHub`、`MapFallback`）往 `EndpointDataSource` 里加终点。框架在构建管线时会：

- 在你的管线里找合适位置插入 **Routing 中间件**（负责匹配 URL → Endpoint）
- 在管线**末尾**插入 **Endpoint 中间件**（负责执行匹配到的 Endpoint）

所以你不写 `app.UseRouting()` 和 `app.UseEndpoints()` 也能跑——**它们被自动补上了**。但如果你想精确控制"授权在路由之后、在端点之前"，就要显式写 `UseRouting()`，让位置由你决定。

> **验证方法**：在 `Program.cs` 最后打印 `app.Services.GetRequiredService<EndpointDataSource>().Endpoints.Count`，你能看到所有已注册的路由。这是排查 404 的终极手段，比瞎猜快十倍。

## 3. `builder` 里到底装了什么

`WebApplicationBuilder` 是个"三合一"的容器，它同时装着：

| 成员 | 类型 | 装的是什么 |
|---|---|---|
| `builder.Configuration` | `IConfigurationManager` | 所有配置（JSON、环境变量、命令行、UserSecrets） |
| `builder.Services` | `IServiceCollection` | 所有服务注册（DI 的"建表阶段"） |
| `builder.Logging` | `ILoggingBuilder` | 日志提供程序（默认 Console + Debug） |
| `builder.Environment` | `IWebHostEnvironment` | `EnvironmentName`（Development/Staging/Production）、`ContentRootPath`、`WebRootPath` |
| `builder.WebHost` | `ConfigureWebHostBuilder` | Kestrel 的设置（端口、URL、限制） |
| `builder.Host` | `ConfigureHostBuilder` | 通用主机（生命周期、优雅关闭） |

### 配置的优先级（后加载的覆盖前面的）

`CreateBuilder(args)` 会自动按这个顺序加载，**越靠后优先级越高**：

```
① appsettings.json
② appsettings.{Environment}.json          ← 例如 appsettings.Development.json
③ User Secrets（仅 Development，且需手动 AddUserSecrets）
④ 环境变量                                  ← ASPNETCORE_ 前缀的会被自动识别
⑤ 命令行参数                                 ← dotnet run -- --urls http://localhost:8080
```

> **为什么这个顺序重要**：你的数据库连接串放在 `appsettings.json` 里，本地开发想覆盖它，**不要去改文件**——在 `appsettings.Development.json` 里写一份即可，或者设环境变量。这是"同一份代码在不同环境跑"的基础。P129–P130 会专门讲这个。

### 环境的三个值

| 值 | 什么时候是它 | 影响什么 |
|---|---|---|
| `Development` | `ASPNETCORE_ENVIRONMENT=Development`（`launchSettings.json` 默认设） | 详细异常页、Swagger/OpenAPI 开放、DI 容器验证严格模式 |
| `Staging` | 手动设置 | 一般用于预发布 |
| `Production` | **不设就是它**（默认值） | 异常页关闭（只返回 500）、敏感日志关闭 |

代码里判断：

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();   // 那个"黄底黑字"的详细异常页，只在开发时开
}
```

> **安全提醒**：`UseDeveloperExceptionPage` 会把**堆栈、源码片段、配置值**全展示给访问者。**生产环境开着它等于把源码贴在公网上。** 上生产前务必用 `app.Environment.IsDevelopment()` 包住（或干脆用 `.NET 8+` 模板自带的 `UseExceptionHandler`）。

## 4. `launchSettings.json` 与端口

这个文件在 `Properties/launchSettings.json`，**只影响本机开发时的启动方式，不进发布包**。

```json
{
  "profiles": {
    "http": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchUrl": "weatherforecast",
      "applicationUrl": "http://localhost:5003",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    },
    "https": {
      "commandName": "Project",
      "applicationUrl": "https://localhost:7003;http://localhost:5003",
      "environmentVariables": { "ASPNETCORE_ENVIRONMENT": "Development" }
    }
  }
}
```

| 字段 | 作用 | 你什么时候会改它 |
|---|---|---|
| `applicationUrl` | 监听地址（可多个，用 `;` 分隔） | **改端口**（你现在的 5003 就在这里） |
| `environmentVariables` | 环境变量 | 想切到 `Production` 测生产行为 |
| `launchBrowser` / `launchUrl` | 启动后自动开浏览器 | 做前后端分离时**应该关掉**（`false`），否则每次 F5 都弹一个空白页 |
| `commandName` | `Project`（直接跑）、`IIS Express`、`Executable` | 用 IIS Express 调试时 |

**优先级**：`launchSettings.json` 的 `applicationUrl` > `appsettings.json` 的 `Urls` > 默认 `http://localhost:5000`。

> **一句话记法**：VS 里 F5 走 `launchSettings.json`；`dotnet run` 也读它（profile 名默认取第一个）；`dotnet MyApp.dll` 直接跑**不读**它，只听 `ASPNETCORE_URLS`。

## 5. 静态文件与 `wwwroot`

默认只有一个目录对外暴露：**`wwwroot`**。放进去的文件能通过 URL 直接访问（`wwwroot/css/site.css` → `/css/site.css`）。

```csharp
app.UseStaticFiles();      // .NET 8 及之前的标准写法
app.MapStaticAssets();     // .NET 9+ 模板的新写法
```

| 写法 | 引入版本 | 差别 |
|---|---|---|
| `UseStaticFiles()` | 一直都有 | 中间件方式。命中文件就返回，不进路由。**没有指纹、没有预压缩** |
| `MapStaticAssets()` | **.NET 9** | 端点方式。构建时生成**内容指纹**（文件名带 hash）+ **预压缩**（gzip/brotli）。配合 `@Assets["app.css"]` 使用，缓存命中率更高 |

> **你要知道的两件事**：
> 1. 你做 Web API，**`wwwroot` 基本用不上**——除非要让后端直接托管前端打包产物（那时候用得上）。
> 2. 两个都写不会报错，但会重复处理。**新项目用 `MapStaticAssets()`，老代码看到 `UseStaticFiles()` 认识就行。**

**默认不开目录浏览**。想开（仅供调试）：

```csharp
app.UseDirectoryBrowser();   // 访问 / 能看到文件列表 —— 千万别在生产环境开
```

## 6. 中间件的标准顺序（背不下来的话，记住"由外到内"）

这是一个**推荐顺序**，不是强制。但它背后的逻辑是强制的：**外层负责兜底，内层负责具体加工。**

```csharp
// ① 最外层：异常兜底（要捕到后面所有的异常）
if (app.Environment.IsDevelopment())
    app.UseDeveloperExceptionPage();
else
    app.UseExceptionHandler("/error");

// ② 安全与协议
app.UseHsts();                  // 只在生产开：告诉浏览器"以后只用 https 访问我"
app.UseHttpsRedirection();      // http → https（307）

// ③ 静态文件（能直接给的东西，别浪费一次路由匹配）
app.UseStaticFiles();           // 或 app.MapStaticAssets();

// ④ 路由匹配（把 URL 变成 Endpoint）
app.UseRouting();

// ⑤ 跨域（必须在认证之前：预检请求 OPTIONS 不带 Cookie，不能要求认证）
app.UseCors();

// ⑥ 认证（我是谁） → 授权（我能不能进）
app.UseAuthentication();
app.UseAuthorization();

// ⑦ 端点执行（Controller / Minimal API / SignalR Hub）
app.MapControllers();
```

**三条铁律**：

1. **异常处理在最外层**，否则内部的异常它接不到。
2. **`UseAuthentication` 必须在 `UseAuthorization` 之前**，否则授权时没有"当前用户"可判断。
3. **`UseCors` 必须在 `UseAuthentication` 之前**（预检请求不带凭据，先认证会直接 401 把预检拦下）。

## 7. .NET 10 模板的变化：Swagger 不在默认里了

如果你看过网上 2021 年的教程，`Program.cs` 里会有：

```csharp
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// ...
app.UseSwagger();
app.UseSwaggerUI();
```

**.NET 9 起，模板把这套（Swashbuckle）移除了**，换成内置的 OpenAPI 文档生成：

```csharp
builder.Services.AddOpenApi();   // .NET 9+ 内置，不需要第三方包
// ...
app.MapOpenApi();                // 暴露 /openapi/v1.json
```

差别：

| 项 | Swashbuckle（老） | 内置 OpenAPI（.NET 9+） |
|---|---|---|
| 需要包 | `Swashbuckle.AspNetCore` | `Microsoft.AspNetCore.OpenApi`（模板自带） |
| 产出 | `/swagger/v1/swagger.json` + **UI 页面** | 只有 `/openapi/v1.json`（**没有 UI**） |
| 想要 UI 怎么办 | 自带 | 装 `Scalar.AspNetCore` 或 `Swashbuckle.AspNetCore.SwaggerUI` |

> **对你的建议**：你已经有 `.http` 文件测试接口，**UI 页面不是必需的**。但 `.http` 文件不能生成文档给前端看。等你做到前后端分离，可以加 **Scalar**（比 Swagger UI 好看，三行代码）。这件事不急，放到 P114–P116 再说。

---
# P103　ASP.NET Core MVC

**一句话：MVC 是"一个 URL 怎么变成一个方法调用"的约定；而 Web API 是这个约定**只要前半段**（Model + Controller）、把后半段（View）换成 JSON 序列化的特例。**

## 1. MVC 三个字母各自的职责

| 字母 | 是什么 | 在 Web API 里还活着吗 |
|---|---|---|
| **M**odel | 数据 + 业务规则（实体、DTO、验证特性） | **活着**，而且更重要（因为返回的就是数据） |
| **V**iew | 呈现层（`.cshtml` 模板，服务端拼 HTML） | **死了**。换成前端框架渲染 |
| **C**ontroller | 接收请求、调业务、决定返回什么 | **活着**，是你的主战场 |

```csharp
public class BooksController : Controller      // MVC：能返回页面
{
    public IActionResult Index() => View();    // → 找 Views/Books/Index.cshtml 渲染 HTML
}

[ApiController]
public class BooksController : ControllerBase  // Web API：只返回数据
{
    [HttpGet]
    public IEnumerable<Book> Get() => ...;     // → 序列化成 JSON
}
```

**关键认知：它们不是两个框架，是同一个框架的两种用法。** `Controller` 继承自 `ControllerBase`，多出来的就是 `View()`、`ViewBag`、`ViewData`、`TempData` 这些服务端渲染的东西。

## 2. Controller 是怎么被找到的（不用注册的秘密）

你一定想过：我 `AddDbContext` 要注册，为什么 `BooksController` 不用？

**因为 Controller 不是从 DI 容器里"解析"的，是由 `IControllerActivator` 反射创建（`new`）出来的**，它的构造函数参数才来自 DI。

### 被识别为 Controller 的条件（满足任一）

1. 类名以 `Controller` 结尾（`BooksController`）
2. 类上标了 `[Controller]` 特性
3. 类上标了 `[ApiController]`（它内部继承了 `[Controller]`）

**同时必须**：`public`、非 `abstract`、非泛型、**不能是嵌套类**。

### 三种"当 Controller 用"的父类

| 父类 | 提供什么 | 用在哪 |
|---|---|---|
| `object`（POCO，不继承） | 什么都没有，只有你手写的 | 极少用。**注意：不继承也能当 Controller**，只是 `return NotFound()` 这些方法不存在了 |
| `ControllerBase` | `Ok()` / `NotFound()` / `BadRequest()` / `CreatedAtAction()` / `Problem()` / `HttpContext` / `User` / `ModelState` | **Web API 标准选择**（你现在的 `BooksController` 应该用它） |
| `Controller` | `ControllerBase` 全部 + `View()` / `PartialView()` / `ViewBag` / `TempData` / `Json()` | 需要返回 HTML 时 |

> **给你的建议**：如果你的 `BooksController` 现在继承的是 `Controller`，改成 `ControllerBase`。理由：① 少加载 View 相关依赖 ② 让"我不返回页面"这件事写在代码里 ③ 万一你哪天误写 `return View()`，编译期就报错，而不是运行期抛 `ViewNotFoundException`。

### Controller 的生命周期

**每次 HTTP 请求创建一个新实例**，请求结束就丢。所以：

```csharp
public class BooksController : ControllerBase
{
    private int _counter = 0;    // 危险：每个请求都重置，不是"全局计数器"

    [HttpGet("count")]
    public int Count() => ++_counter;   // 永远返回 1
}
```

> **这就是为什么"状态"必须放 DI（Scoped/Singleton）或数据库，不能放 Controller 字段。** 你在 Part2 学的生命周期，在这里第一次真正用上。

## 3. 两条路由线：约定路由 vs 特性路由

这是 P103 最该吃透的部分，**你 90% 的 404 都出在这里**。

### 线 A：约定路由（Conventional Routing）

```csharp
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
```

规则：

| URL | 解析结果 |
|---|---|
| `/` | `HomeController.Index()`（两个都有默认值） |
| `/Books` | `BooksController.Index()` |
| `/Books/Detail` | `BooksController.Detail()` |
| `/Books/Detail/5` | `BooksController.Detail(5)`（`{id?}` 匹配到 5） |

**特点**：**一个模板管所有 Controller**。改 URL 结构要改全局约定。默认值 `=Home` / `=Index` / `?`（可空）写在模板里。

**致命弱点**：它把"方法名"暴露成 URL。`/Books/DeleteById/5`——**动词在 URL 里，这是反 REST 的**。

### 线 B：特性路由（Attribute Routing）

```csharp
[ApiController]
[Route("api/[controller]")]                 // → api/Books
public class BooksController : ControllerBase
{
    [HttpGet]                                // GET  api/Books
    public IActionResult GetAll() => ...;

    [HttpGet("{id:long}")]                   // GET  api/Books/5
    public IActionResult GetById(long id) => ...;

    [HttpGet("{id:long}/detail")]            // GET  api/Books/5/detail
    public IActionResult GetDetail(long id) => ...;

    [HttpPost]                               // POST api/Books
    public IActionResult Create([FromBody] Book book) => ...;

    [HttpPut("{id:long}")]                   // PUT  api/Books/5
    public IActionResult Update(long id, [FromBody] Book book) => ...;

    [HttpDelete("{id:long}")]                // DELETE api/Books/5
    public IActionResult Delete(long id) => ...;
}
```

**`[controller]` 和 `[action]` 是"模板令牌"**，会被替换成类名/方法名（去掉 `Controller` 后缀）：

| 令牌 | 替换成 | 你的 `BooksController` |
|---|---|---|
| `[controller]` | 类名去掉 `Controller` | `Books` |
| `[action]` | 方法名 | `GetById` |

```csharp
[Route("api/[controller]/[action]")]     // → api/Books/GetById/5
```

> **警告**：`[action]` 会让 URL 又变成"方法名驱动"，等于把约定路由的毛病搬进特性路由。**除非有历史包袱，不要用 `[action]`。**

### 三条路由线的组合规则

| 层级 | 写法 | 结果（以 `GetById` 为例） |
|---|---|---|
| Controller 上 | `[Route("api/[controller]")]` | 前缀 `api/Books` |
| Action 上 | `[HttpGet("{id}")]` | 拼成 `api/Books/{id}` → `GET api/Books/5` |
| Controller + Action 都有 `[Route]` | `[Route("api/books")]` + `[Route("v2")]` | 前缀会**拼接**：`api/books/v2` |

### 路由约束：`{id:long}` 里的冒号

| 约束 | 含义 | 例子 |
|---|---|---|
| `int` / `long` | 必须是整数 | `{id:int}` 只匹配 `5`，不匹配 `abc` |
| `guid` | 必须是 GUID | `{id:guid}` |
| `alpha` / `minlength(3)` | 字母 / 最小长度 | `{name:alpha}` |
| `range(1,100)` | 数值范围 | `{page:range(1,100)}` |
| `required` | 不能为空 | `{id:required}` |

**约束的价值**：`GET api/books/abc` 会因为不匹配 `{id:long}` 而**直接 404**，根本进不了你的 Action。省掉一次手动校验。

### 同名路由的冲突（你会踩的坑）

```csharp
[HttpGet("{id}")]                 // GET api/books/5
[HttpGet("latest")]               // GET api/books/latest  ← 会 500！
```

**原因**：`latest` 也能被 `{id}` 匹配（`{id}` 没加约束时匹配任何字符串），**路由表有歧义，框架在启动时就抛 `AmbiguousMatchException`**。

**正确做法**：给 `{id}` 加约束。

```csharp
[HttpGet("{id:long}")]            // 只匹配数字
[HttpGet("latest")]               // 精确匹配字符串，不冲突
```

> **这是排查 500 时的第一检查项**：`AmbiguousMatchException: The request matched multiple endpoints`。看到这句话，就是两个路由模板都能匹配同一个 URL。

## 4. Action 的返回值家族

| 返回类型 | 能不能返回不同状态码 | 序列化成 JSON | 什么时候用 |
|---|---|---|---|
| `void` | 固定 204 | 否 | 几乎不用 |
| `string` | 固定 200 | **否**（直接当纯文本） | 返回纯文本时 |
| `Book`（实体/TDO） | 只能 200 | 是 | 简单读取，**出错就要抛异常** |
| `IActionResult` | **能** | 是（内部包装） | 需要不同状态码，但**丢失编译期类型检查** |
| `ActionResult<T>` | **能** | 是 | **推荐**：既能 `return book`，也能 `return NotFound()` |

```csharp
// 只能 200，出错必须 throw
public Book Get(long id) => _ctx.Books.Find(id)!;

// 能不同状态码，但返回类型信息丢了
public IActionResult Get(long id)
{
    var book = _ctx.Books.Find(id);
    return book is null ? NotFound() : Ok(book);
}

// 推荐：两种写法都支持，且 Swagger/OpenAPI 能推断出 T
public ActionResult<Book> Get(long id)
{
    var book = _ctx.Books.Find(id);
    if (book is null) return NotFound();   // 编译器知道这是 IActionResult
    return book;                            // 编译器知道这会包装成 200 + JSON
}
```

**常见返回方法速查**：

| 方法 | 状态码 | 用途 |
|---|---|---|
| `Ok(obj)` | 200 | 查询成功 |
| `CreatedAtAction(nameof(Get), new { id }, obj)` | 201 | 新建成功，**带 `Location` 头指向新资源** |
| `NoContent()` | 204 | 更新/删除成功，无返回体 |
| `BadRequest(obj)` | 400 | 客户端参数错 |
| `NotFound()` | 404 | 资源不存在 |
| `Unauthorized()` | 401 | 未登录 |
| `Forbid()` | 403 | 已登录但无权限 |
| `Conflict(obj)` | 409 | 并发冲突（你学并发令牌时会用到） |
| `Problem(details)` | 由 details 决定 | **RFC 7807 标准错误格式**，.NET 7+ 推荐 |

## 5. 参数绑定：值到底从哪来

**这是你最容易"接口收不到参数"的地方。** 框架有个默认推断规则：

### 默认规则（没有 `[ApiController]` 时）

| 参数类型 | 默认来源 | 说明 |
|---|---|---|
| 简单类型（`int`、`string`、`DateTime`、`long?`、枚举） | **Route + Query + Form**（按名字匹配） | 依次尝试，先 Route 后 Query |
| 复杂类型（类、record） | **依次尝试每个属性从 Route/Query/Form 凑** | **注意：不是 body！** 这是最反直觉的一点 |
| 带 `[FromBody]` 的复杂类型 | Body | 需要显式标注 |

### 加了 `[ApiController]` 之后的三个变化（重要）

| 变化 | 效果 | 为什么 |
|---|---|---|
| **① 复杂类型默认从 Body 读** | `public IActionResult Create(Book book)` 自动等价于 `[FromBody] Book book` | Web API 场景下复杂对象几乎都来自 JSON |
| **② 模型验证自动 400** | `ModelState.IsValid` 为 false 时**自动**返回 400 + `ValidationProblemDetails`，你不用写 `if (!ModelState.IsValid)` | 省掉每个 Action 的样板代码 |
| **③ 强制特性路由** | Controller 上必须有 `[Route]` 或 Action 上有 `[HttpGet]` 等，否则启动报错 | 防止误用约定路由 |

### 六个绑定源特性

| 特性 | 从哪里读 | 典型场景 |
|---|---|---|
| `[FromRoute]` | URL 路径段 | `{id}` |
| `[FromQuery]` | `?page=1&size=10` | 分页、筛选 |
| `[FromBody]` | 请求体（JSON/XML） | POST/PUT 的实体 |
| `[FromForm]` | `multipart/form-data` | 文件上传、表单提交 |
| `[FromHeader]` | 请求头 | 自定义头、`Authorization` |
| `[FromServices]` | **DI 容器** | 注入只在某个 Action 用的服务 |

```csharp
[HttpGet("search")]
public IActionResult Search(
    [FromQuery] string? keyword,
    [FromQuery] int page = 1,
    [FromQuery] int size = 10,
    [FromHeader(Name = "X-Trace-Id")] string? traceId,
    [FromServices] ILogger<BooksController> logger)
{
    logger.LogInformation("trace={TraceId} kw={Keyword}", traceId, keyword);
    ...
}
```

### 一个请求体只能读一次

```csharp
public IActionResult Bad([FromBody] Book a, [FromBody] Book b)   // 运行时报错
```

> **报错信息**：`A non-empty request body is required` 或流已被消费。**一个 Action 最多一个 `[FromBody]` 参数。** 要收多个对象，包一层 DTO：

```csharp
public record CreateBookRequest(Book Book, string? Remark);
```

### 参数名的大小写

**JSON 字段名默认不区分大小写**（`System.Text.Json` 的 `PropertyNameCaseInsensitive` 在 ASP.NET Core 里默认 `true`），所以前端传 `{"title":"xx"}` 能绑定到 `Title`。**但 Query 参数名在 Linux 上区分大小写**，`?Page=1` 绑不到 `int page`。**统一用小写**。

## 6. View 与 Razor（10 分钟速览，你用不上但要认识）

这一节只求"看到别人的 MVC 项目不瞎"。

### 目录约定

```
项目根/
├─ Controllers/
│   └─ BooksController.cs
├─ Models/
│   └─ Book.cs
├─ Views/
│   ├─ _ViewStart.cshtml        ← 所有视图启动时执行（通常设置 Layout）
│   ├─ _ViewImports.cshtml      ← 所有视图共享的 using 和 TagHelper 引入
│   ├─ Shared/
│   │   ├─ _Layout.cshtml       ← 母版页（导航栏、页脚）
│   │   └─ Error.cshtml
│   └─ Books/
│       ├─ Index.cshtml         ← BooksController.Index() 的视图
│       └─ Detail.cshtml        ← BooksController.Detail() 的视图
└─ wwwroot/                     ← css / js / 图片
```

### 查找顺序

`return View()` 会依次找：

```
① Views/{ControllerName}/{ActionName}.cshtml
② Views/Shared/{ActionName}.cshtml
③ 都找不到 → InvalidOperationException: The view 'Index' was not found
```

### 一段完整的 Razor

```cshtml
@* Views/Books/Index.cshtml *@
@model IEnumerable<Book>          @* 声明强类型模型 *@

<h2>图书列表</h2>
<table>
    @foreach (var book in Model)
    {
        <tr>
            <td>@book.Title</td>
            <td>@book.Price.ToString("C")</td>
            <td><a asp-action="Detail" asp-route-id="@book.Id">详情</a></td>
        </tr>
    }
</table>
```

| 语法 | 含义 |
|---|---|
| `@model T` | 声明视图的模型类型（强类型，有智能提示） |
| `@book.Title` | 输出值（**自动 HTML 编码**，防 XSS） |
| `@foreach { }` | C# 代码块 |
| `@* *@` | Razor 注释 |
| `asp-action` / `asp-route-id` | **TagHelper**，自动生成 `<a href="/Books/Detail/5">` |

### `_ViewStart.cshtml` 与 `_Layout.cshtml`

```cshtml
@* _ViewStart.cshtml *@
@{
    Layout = "_Layout";
}
```

```cshtml
@* _Layout.cshtml *@
<!DOCTYPE html>
<html>
<head><title>@ViewBag.Title</title></head>
<body>
    <nav>...</nav>
    <main>@RenderBody()</main>     @* 子视图的内容填这里 *@
</body>
</html>
```

**机制**：每个视图渲染前跑 `_ViewStart` 设 `Layout`，`RenderBody()` 是"子视图内容插槽"。

> **为什么不建议你现在深入**：Razor 的完整知识（`_ViewImports`、`@section`、`RenderSection`、ViewComponent、局部视图、TagHelper 全表）只服务"服务端拼 HTML"。你做前后端分离，**HTML 由前端出，后端只出 JSON**。学到 `_Layout` 这一层，够你以后看懂别人的项目了。

## 7. `AddControllers` 家族：三个容易混的注册方法

| 方法 | 支持什么 | 用在哪 |
|---|---|---|
| `AddControllers()` | 只有 Controller + API 行为 | **纯 Web API（你现在）** |
| `AddControllersWithViews()` | Controller + **Razor View** | 传统 MVC 网站 |
| `AddRazorPages()` | Razor Pages（页面即端点） | 页面型应用 |

> **写错了会怎样**：用 `AddControllers()` 却 `return View()`，运行时抛 `ViewNotFoundException`（因为视图引擎没注册）。**这是"选了 API 模式"的代价，也是提醒。**

---

# P104　HotReload（热重载）

**一句话：不重启进程，直接把新编译的方法体"贴"进正在运行的进程里——所以只有"方法体"能改，"结构"改不了。**

## 1. 它到底做了什么

传统改代码的流程：

```
改代码 → 停止进程 → 重新编译 → 重启 → 重新触发请求 → 看结果     （3～10 秒）
```

Hot Reload 的流程：

```
改代码 → 保存 → 框架把新方法体编译成 IL → 通过 MetadataUpdate 通知运行时替换   （0.3～1 秒）
```

**原理**：.NET 6 引入的 **Metadata Update** 机制（`MetadataUpdater.ApplyUpdate`）。运行时允许替换**已有方法的 IL 实现**，但**不允许改变类型布局**（字段增减会让已有对象的内存布局失效）。所以"能不能热重载"的本质是：**你的改动有没有改变内存布局 / 元数据结构。**

## 2. 两种用法

### 命令行：`dotnet watch`

```bash
cd "D:/code/编程语言学习/后端/练习/ASP.NET Core--图书管理系统/ASP.NET Core--图书管理系统"
dotnet watch run          # 启动 + 自动热重载
```

| 命令 | 作用 |
|---|---|
| `dotnet watch run` | 启动并监听文件变化，能热重载就热重载，不能就重启 |
| `dotnet watch --no-hot-reload` | 只监听重启，不做热重载 |
| `dotnet watch` | 等同于 `dotnet watch run` |
| `dotnet watch test` | 监听测试项目 |
| 运行中按 `Ctrl+R` | 强制重启（不确定状态时用） |

**监听哪些文件**：`.cs`、`.cshtml`、`.razor`、`.css`、`.js`（项目内的）、`.json`（配置文件）。

> **注意**：`dotnet watch` 会**自己决定**是"热重载"还是"重启"。你不需要手动选。

### Visual Studio：热重载按钮

VS 2022 顶部工具栏有一个 **🔥 图标 + 一个小箭头**（"热重载" / Hot Reload）。F5 启动后：

- 改代码 → 点 🔥（或按 `Alt+F10`）→ 变更应用到运行中的进程
- 或者开启 **Tools → Options → Debugging → .NET/C++ Hot Reload → Hot Reload on File Save**，保存即生效

**两个开关值得开**：

| 选项 | 建议 |
|---|---|
| `Hot Reload on File Save` | **开**。保存即生效，最省事 |
| `Enable Hot Reload when debugging` | 默认开，别关 |

## 3. 支持清单 vs 必须重启的清单（rude edit）

这是本节最实用的部分。**记住"改内容能热更，改形状要重启"。**

### 能热重载（不重启）

| 改动 | 说明 |
|---|---|
| **方法体内部逻辑** | 最常用，改业务代码全靠它 |
| 添加新的方法 / 属性 / 字段 / 类 | 新增成员不影响已有对象布局 |
| 修改方法内的局部变量、常量值 | |
| 添加/修改**特性**（attribute） | 部分场景支持 |
| Razor 视图（`.cshtml`）内容 | 改页面立即生效 |
| CSS / JS / 静态文件 | 改完浏览器刷新即可（可能要 `Ctrl+F5` 清缓存） |
| 添加 `using` 指令 | |
| 修改 `#if` 条件编译符号内的代码 | |
| **Top-level 语句里的"方法体部分"** | 有条件下支持 |

### 必须重启（rude edit）

| 改动 | 原因 |
|---|---|
| **改方法签名**（加/删参数、改返回类型） | 调用方已经按旧签名编译成 IL 了 |
| **删除方法 / 属性 / 字段 / 类** | 已有引用指向它 |
| **改类名 / 命名空间 / 方法名** | 元数据里的名字变了，所有引用失效 |
| **改字段类型** | 内存布局变了 |
| **改基类 / 新增接口实现** | 类型层次变了 |
| **改泛型约束** | 元数据约束变了 |
| **改 `record` 的构造参数** | record 的构造参数会生成属性，等于改结构 |
| **给类加/删构造函数** | |
| **改 `struct` 的字段顺序** | 布局变了 |
| **改 `Program.cs` 的"结构"**（加一行 `app.UseXxx()`） | 顶层语句的管线组装在启动时执行一次 |
| **改依赖注入注册**（`builder.Services.AddXxx()`） | 容器在 `Build()` 时已固化 |
| **改 `appsettings.json`** | 配置在 `CreateBuilder` 时读取；`dotnet watch` 会**重启**应用（不是热重载） |

### 遇到 rude edit 会怎样

- **`dotnet watch`**：控制台输出 `Unable to apply hot reload because of a rude edit` → 然后**自动重启**（也可能需要你按 `Ctrl+R`）
- **VS**：弹窗提示 "Rude edit detected"，底部有 `Restart` 按钮，点一下重启

**这不是 bug，是机制的限制。** 见到这个提示不用慌，重启就好。

## 4. 三个实战坑

### 坑一：改了 `Program.cs` 里的中间件，看上去"生效了"其实是重启了

```csharp
// 你加了一行
app.UseCors();   // 想在管线里插一层
```

`dotnet watch` 会检测到"这是顶级语句的结构变化" → **重启整个应用**。你以为热重载成功了，其实是重启了。**判断方法**：看控制台有没有 `Application started` 字样重新打印。

### 坑二：改了 `appsettings.json` 不生效

**因为配置在 `CreateBuilder(args)` 时就读完了。** `dotnet watch` 对 JSON 文件的处理是**重启**（.NET 6+）。

如果你想**不重启**就能改配置，需要用 `IOptionsMonitor<T>`（而不是 `IOptions<T>`），并用 `reloadOnChange: true` 的配置源——这部分 P129 会讲。

### 坑三：断点会"漂"

热重载后，VS 里的断点位置可能偏移（因为 IL 的序号变了），表现为"断点变空心圆"或"停在了错误的行"。

**处理**：`Ctrl+Shift+F5`（重启调试）或删掉断点重打。

> **最后一个提醒**：**热重载不是"随便改都不用重启"**。它真正的价值是"调 UI / 调一行逻辑 / 试一个值"这种高频小改动。**改架构、改 DI、改路由表，就该老老实实重启。**

---
==二：格式==

## P102 · 启动骨架（背下来这五段）

```csharp
var builder = WebApplication.CreateBuilder(args);   // 1 建 Builder：配置 + 日志 + 空容器

builder.Services.AddControllers();                   // 2 注册服务（填表，不执行）
builder.Services.AddDbContext<T>(opt => opt.UseSqlServer(cs));

var app = builder.Build();                           // 3 容器固化

app.UseExceptionHandler("/error");                   // 4 组装管线（排队，不执行）
app.UseHttpsRedirection();
app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();                                //   注册端点（终点）

app.Run();                                           // 5 启动 Kestrel，阻塞
```

## P102 · 中间件顺序骨架（由外到内）

```csharp
app.UseExceptionHandler(...)     // ① 异常兜底（最外层）
app.UseHsts()                    // ② 安全
app.UseHttpsRedirection()        //    http → https
app.UseStaticFiles()             // ③ 静态文件（命中就短路）
app.UseRouting()                 // ④ 路由匹配
app.UseCors()                    // ⑤ 跨域（必须在认证前）
app.UseAuthentication()          // ⑥ 我是谁
app.UseAuthorization()           //    我能不能进
app.MapControllers()             // ⑦ 端点执行
```

## P102 · 配置与环境

```csharp
// 读配置对象
var cs = builder.Configuration.GetConnectionString("Default");

// 读单个值（: 表示层级）
var name = builder.Configuration["App:Name"];

// 判断环境
app.Environment.IsDevelopment();    // app.Environment 是 IWebHostEnvironment
app.Environment.EnvironmentName;    // "Development" / "Staging" / "Production"
app.Environment.WebRootPath;        // .../wwwroot 的绝对路径

// 覆盖端口（不读 launchSettings 时）
// ASPNETCORE_URLS=http://localhost:5003 dotnet run
```

## P102 · 静态文件

```csharp
app.UseStaticFiles();      // .NET 8 及以前
app.MapStaticAssets();     // .NET 9+（带指纹 + 预压缩）
```

## P103 · Controller 骨架

```csharp
[ApiController]                                  // ① 参数推断 / 自动 400 / 强制特性路由
[Route("api/[controller]")]                      // ② 前缀：api/Books
public class BooksController : ControllerBase    // ③ 不返回页面
{
    private readonly BookDbContext _ctx;
    public BooksController(BookDbContext ctx) => _ctx = ctx;   // ④ 构造注入

    [HttpGet]                                     // GET api/books
    public ActionResult<IEnumerable<Book>> GetAll() => ...;

    [HttpGet("{id:long}")]                        // GET api/books/5
    public ActionResult<Book> GetById(long id) => ...;

    [HttpPost]                                    // POST api/books
    public ActionResult<Book> Create([FromBody] Book book) => ...;
}
```

## P103 · 路由三种写法

```csharp
// ① 约定路由（Controller 上不写 [Route]）
app.MapControllerRoute("default", "{controller=Home}/{action=Index}/{id?}");
//   /Books/Detail/5  → BooksController.Detail(5)

// ② 特性路由（推荐）
[Route("api/[controller]")]  +  [HttpGet("{id:long}")]
//   GET api/books/5

// ③ 绝对/相对覆盖
[HttpGet("~/v2/books")]      // ~ 开头 = 忽略 Controller 上的前缀
```

## P103 · 参数绑定六源

```csharp
public IActionResult Xxx(
    [FromRoute]  long id,           // 路径段 {id}
    [FromQuery]  int page = 1,      // ?page=1
    [FromBody]   Book book,         // JSON body（一个 Action 只能一个）
    [FromForm]   IFormFile file,    // multipart/form-data
    [FromHeader(Name="X-Token")] string token,
    [FromServices] ILogger<XxxController> logger)
```

## P103 · 返回值骨架

```csharp
public ActionResult<T> Get(long id)
{
    var e = ...;
    if (e is null) return NotFound();       // 404
    return e;                                // 200 + JSON
}

return Ok(obj);                              // 200
return CreatedAtAction(nameof(Get), new { id = e.Id }, e);   // 201 + Location
return NoContent();                          // 204
return BadRequest(new { msg = "参数错" });    // 400
return Conflict(new { msg = "已被他人修改" }); // 409
return Problem(title: "...", statusCode: 500); // RFC 7807
```

## P104 · 命令

```bash
dotnet watch run                # 启动 + 自动热重载
dotnet watch --no-hot-reload    # 只重启，不热重载
# 运行中：Ctrl+R 强制重启
# VS：Alt+F10 应用热重载；Ctrl+Shift+F5 重启调试
```

---

==三：代码==

下面是一个**能同时验证 P102 / P103 / P104** 的完整 Demo。建议另建一个空项目（不要动你的图书管理系统），跑通后再回头对照。

## 3.0 建项目

```bash
mkdir D:/code/WebDemo && cd D:/code/WebDemo
dotnet new webapi -n WebDemo
cd WebDemo
dotnet run
```

> `dotnet new webapi` 在 .NET 9+ 生成的是 **Minimal API** 项目（`app.MapGet("/weatherforecast", ...)`），**没有 Controller**。
> 想直接要 Controller 版：`dotnet new webapi -controllers -n WebDemo`。
> **两种都用用看**——这会让你直观看到"Controller 只是端点的一种写法"。

## 3.1 完整 `Program.cs`（带注释，每一行对应 P102 的哪一段）

```csharp
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ───────── 第 2 段：注册服务 ─────────
builder.Services.AddControllers();          // 只注册 API（不注册 View 引擎）
builder.Services.AddEndpointsApiExplorer(); // 让 OpenAPI 能看见端点
builder.Services.AddOpenApi();              // .NET 9+ 内置 OpenAPI 文档

// 一个演示用的内存服务：证明 Controller 的构造函数参数来自 DI
builder.Services.AddSingleton<IClock, SystemClock>();

var app = builder.Build();

// ───────── 第 4 段：组装管线 ─────────

// ① 最外层：一个自己写的"日志 + 计时"中间件
//    作用是让你亲眼看到"请求进来 / 响应出去"的时机
app.Use(async (ctx, next) =>
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    Console.WriteLine($"[进] {ctx.Request.Method} {ctx.Request.Path}");
    await next();                                  // ← 调用下一层
    sw.Stop();
    Console.WriteLine($"[出] {ctx.Response.StatusCode} 耗时 {sw.ElapsedMilliseconds}ms");
});

// ② 开发环境才开的详细异常页
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.MapOpenApi();                              // /openapi/v1.json
}

// ③ https 重定向（做本地 API 调试时经常注释掉，否则 .http 拿到 307 空响应）
// app.UseHttpsRedirection();

// ④ 静态文件（wwwroot 存在才有效）
app.UseStaticFiles();

// ⑤ 路由 / 跨域 / 认证 / 授权（本 Demo 用不上认证，先留着位置）
app.UseRouting();
// app.UseCors();
// app.UseAuthentication();
app.UseAuthorization();

// ⑥ 端点
app.MapControllers();

// ⑦ 打印所有已注册的路由 —— 排查 404 的终极杀器
using (var scope = app.Services.CreateScope())
{
    var endpoints = app.Services.GetRequiredService<EndpointDataSource>().Endpoints;
    Console.WriteLine($"===== 共注册 {endpoints.Count()} 个端点 =====");
    foreach (var ep in endpoints.OfType<RouteEndpoint>())
        Console.WriteLine($"  {ep.RoutePattern.RawText}");
}

app.Run();


// ───────── 演示用的小服务 ─────────
public interface IClock { DateTime Now { get; } }
public class SystemClock : IClock { public DateTime Now => DateTime.Now; }
```

**运行后你应该看到**（每次启动都会打印，这是验证"路由表"的最快方式）：

```
===== 共注册 3 个端点 =====
  api/books
  api/books/{id:long}
  api/books/{id:long}/detail
```

> **如果这里是 0 个端点**，说明 `AddControllers()` 或 `MapControllers()` 漏了，**不用去猜 404 的原因了**，问题就在这两行之一。

## 3.2 三个 Controller：验证路由与参数

```csharp
// Controllers/BooksController.cs
using Microsoft.AspNetCore.Mvc;

namespace WebDemo.Controllers;

public record BookDto(long Id, string Title, double Price, DateTime PubTime);

[ApiController]
[Route("api/[controller]")]                 // 前缀 = api/Books（注意大小写！）
public class BooksController : ControllerBase
{
    private readonly IClock _clock;
    private static readonly List<BookDto> _books =
    [
        new(1, "C# 入门", 59.9, new DateTime(2024, 1, 1)),
        new(2, "EF Core 深入", 89.0, new DateTime(2025, 3, 15)),
        new(3, "ASP.NET Core 实战", 99.0, new DateTime(2026, 6, 1)),
    ];

    // 构造注入：证明 Controller 不用注册，但它的依赖要注册
    public BooksController(IClock clock) => _clock = clock;

    // GET api/books
    [HttpGet]
    public ActionResult<IEnumerable<BookDto>> GetAll() => _books;

    // GET api/books/2
    // {id:long} 是约束：/api/books/abc 直接 404，进不到方法里
    [HttpGet("{id:long}")]
    public ActionResult<BookDto> GetById(long id)
    {
        var book = _books.FirstOrDefault(b => b.Id == id);
        return book is null ? NotFound(new { msg = $"id={id} 不存在" }) : book;
    }

    // GET api/books/2/detail
    [HttpGet("{id:long}/detail")]
    public ActionResult GetDetail(long id) => Ok(new
    {
        id,
        serverTime = _clock.Now,
        fields = new[] { "Title", "Price", "PubTime" }
    });

    // GET api/books/search?keyword=core&page=1&size=10
    // 这个 Action 一次性演示 5 个绑定源
    [HttpGet("search")]
    public ActionResult Search(
        [FromQuery] string? keyword,
        [FromQuery] int page = 1,
        [FromQuery] int size = 10,
        [FromHeader(Name = "X-Trace-Id")] string? traceId,
        [FromServices] ILogger<BooksController> logger)
    {
        logger.LogInformation("trace={TraceId} kw={Keyword}", traceId, keyword);
        var q = _books.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(b => b.Title.Contains(keyword, StringComparison.OrdinalIgnoreCase));

        var total = q.Count();
        var items = q.Skip((page - 1) * size).Take(size).ToList();

        return Ok(new { total, page, size, items, traceId });
    }

    // POST api/books   body: {"id":4,"title":"新书","price":30,"pubTime":"2026-01-01"}
    [HttpPost]
    public ActionResult<BookDto> Create([FromBody] BookDto dto)
    {
        _books.Add(dto);
        // 201 + Location: /api/books/4
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }
}
```

**测试（`.http` 文件，VS/VSCode 都能直接点发送）**

```http
@host = http://localhost:5003

### 全部
GET {{host}}/api/books

### 单个（能拿到 200 + JSON）
GET {{host}}/api/books/2

### 不存在（404 + 自定义 msg）
GET {{host}}/api/books/999

### 类型不匹配（404，因为 {id:long} 约束不过）
GET {{host}}/api/books/abc

### 大小写测试（Linux 上会 404，Windows 上不区分）
GET {{host}}/api/books/2

### 多条件 + 自定义头
GET {{host}}/api/books/search?keyword=core&page=1&size=2
X-Trace-Id: test-001

### 新建（201 + Location 头）
POST {{host}}/api/books
Content-Type: application/json

{"id":4,"title":"新书","price":30,"pubTime":"2026-01-01T00:00:00"}
```

## 3.3 一个 MVC Controller + View（只为"认识"，跑通一次就够）

在同一个项目里加 MVC，看同一个 URL 如何返回 HTML 而不是 JSON。

**第一步**：`Program.cs` 第 2 段改成 `AddControllersWithViews()`，第 4 段加 `app.MapControllerRoute(...)`。

```csharp
builder.Services.AddControllersWithViews();   // 同时支持 API 和 View

// ...第 4 段：
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
app.MapControllers();     // 两者可以共存
```

**第二步**：`Controllers/HomeController.cs`

```csharp
using Microsoft.AspNetCore.Mvc;

namespace WebDemo.Controllers;

public class HomeController : Controller      // 注意：是 Controller，不是 ControllerBase
{
    private static readonly List<BookDto> _books =
    [
        new(1, "C# 入门", 59.9, new DateTime(2024, 1, 1)),
        new(2, "EF Core 深入", 89.0, new DateTime(2025, 3, 15)),
    ];

    // GET /
    public IActionResult Index() => View(_books);       // → Views/Home/Index.cshtml

    // GET /Home/Detail/2
    public IActionResult Detail(long id)
    {
        var book = _books.FirstOrDefault(b => b.Id == id);
        if (book is null) return NotFound();            // 404 页面
        return View(book);                              // → Views/Home/Detail.cshtml
    }
}
```

**第三步**：三个视图文件

```cshtml
@* Views/_ViewStart.cshtml —— 所有视图启动时执行 *@
@{
    Layout = "_Layout";
}
```

```cshtml
@* Views/_ViewImports.cshtml —— 所有视图共享的 using *@
@using WebDemo
@using WebDemo.Controllers
@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers
```

```cshtml
@* Views/Shared/_Layout.cshtml —— 母版页 *@
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8" />
    <title>@ViewBag.Title - WebDemo</title>
</head>
<body>
    <nav><a asp-controller="Home" asp-action="Index">图书列表</a></nav>
    <hr />
    <main>
        @RenderBody()
    </main>
    <hr />
    <footer>WebDemo © @DateTime.Now.Year</footer>
</body>
</html>
```

```cshtml
@* Views/Home/Index.cshtml *@
@model IEnumerable<BookDto>

<h2>图书列表</h2>
<table border="1" cellpadding="6">
    <tr><th>Id</th><th>标题</th><th>价格</th><th>操作</th></tr>
    @foreach (var b in Model)
    {
        <tr>
            <td>@b.Id</td>
            <td>@b.Title</td>
            <td>@b.Price.ToString("C")</td>
            @* asp-route-id 是 TagHelper，生成 /Home/Detail/1 *@
            <td><a asp-action="Detail" asp-route-id="@b.Id">详情</a></td>
        </tr>
    }
</table>
```

```cshtml
@* Views/Home/Detail.cshtml *@
@model BookDto

<h2>@Model.Title</h2>
<p>价格：@Model.Price</p>
<p>出版：@Model.PubTime.ToString("yyyy-MM-dd")</p>
<a asp-action="Index">返回列表</a>
```

**跑起来对比**：

| URL | 结果 | 走的哪条路 |
|---|---|---|
| `/` | HTML 页面 | 约定路由 → `HomeController.Index` → `View()` |
| `/Home/Detail/2` | HTML 页面 | 约定路由 → `View(book)` |
| `/api/books` | **JSON** | 特性路由 → `BooksController.GetAll` → `return _books` |

**同一个进程、同一个框架，出了两种完全不同的响应——差别只在"继承谁、返回什么"。这就是 MVC 与 WebAPI 的关系。**

## 3.4 复现三个经典错误（知道长什么样，以后一眼认出）

### 错误 1：路由歧义（启动就崩）

```csharp
[HttpGet("{id}")]        // 没加 :long 约束
[HttpGet("latest")]
```

启动即抛：

```
System.Reflection.AmbiguousMatchException:
  The request matched multiple endpoints. Matches:
  WebDemo.Controllers.BooksController.Latest
  WebDemo.Controllers.BooksController.GetById
```

**修**：`{id:long}`。

### 错误 2：`AddControllers()` 却 `return View()`

```
InvalidOperationException: The view 'Index' was not found.
The following locations were searched:
/Views/Home/Index.cshtml
/Views/Shared/Index.cshtml
```

**原因**：`AddControllers()` 没注册视图引擎。**修**：改 `AddControllersWithViews()`。

### 错误 3：复杂类型默认不从 body 读（没有 `[ApiController]` 时）

```csharp
public class LegacyController : ControllerBase     // 没有 [ApiController]
{
    [HttpPost("create")]
    public IActionResult Create(BookDto dto) => Ok(dto);   // 收到的 dto 全是 null！
}
```

**原因**：没有 `[ApiController]` 时，复杂类型按属性名从 **Query/Form** 凑，**不读 body**。
**修**：加 `[ApiController]`，或显式写 `[FromBody]`。

## 3.5 HotReload 实验（10 分钟，亲手确认边界）

用 `dotnet watch run` 启动 Demo（**不要用 F5**，命令行更能看清提示），依次做：

| 步骤 | 改什么 | 预期 | 观察点 |
|---|---|---|---|
| 1 | 在 `GetById` 里加一行 `Console.WriteLine("hot!");` | **热重载**，不重启 | 控制台没有新的 `Now listening on` |
| 2 | 把 `Ok(new { msg = ... })` 的文案改掉 | **热重载** | 接口返回立刻变化 |
| 3 | 新建一个方法 `GetHot()` + `[HttpGet("hot")]` | **热重载**（有条件下） | 看能不能直接访问 `/api/books/hot` |
| 4 | 把 `GetById(long id)` 改成 `GetById(int id)` | **rude edit → 重启** | 控制台出现 `Unable to apply hot reload` 或 `Restarting` |
| 5 | 在 `Program.cs` 里加 `app.UseHttpsRedirection();` | **重启** | 重新打印 `Now listening on` + 端点列表 |
| 6 | 把 `BookDto` 的 `double Price` 改成 `decimal Price` | **rude edit → 重启** | 改字段类型 = 改布局 |
| 7 | 改 `appsettings.json` | **重启** | 配置文件在 `CreateBuilder` 时就读了 |

**做完这 7 步，你会形成一个准确的手感：改"内容"能热更，改"形状"要重启。**

---

==四：总结==

## 4.1 三节核心结论（合上笔记，能口述这三条就算过）

| # | 结论 | 一句话 |
|---|---|---|
| 1 | **一切都是中间件管线** | 请求 = 穿过一条由 `app.UseXxx()` 排成的洋葱；顺序错不报错但行为错。异常在最外层、认证在授权前、CORS 在认证前 |
| 2 | **Controller 不是注册来的，是反射 new 出来的** | 只有它的**构造函数依赖**需要注册。所以 `AddControllers()` 是"注册 Controller 的发现机制"，`MapControllers()` 是"注册路由表" |
| 3 | **路由 = 模板拼接 + 约束匹配** | `[Route("api/[controller]")]` + `[HttpGet("{id:long}")]` = `GET api/books/5`。404 先查端点表数量，再查模板拼接，再查大小写 |

## 4.2 P102 知识点总表

| 概念 | 一句话 | 易错点 |
|---|---|---|
| Kestrel | 内嵌的跨平台 Web 服务器，默认唯一 | 不是 IIS。IIS 只是它前面的反向代理 |
| `WebApplicationBuilder` | 配置 + 日志 + 空容器的三合一 | `builder.Services.AddXxx` 只是**填表**，不执行 |
| `builder.Build()` | 容器固化，之后不能加服务 | 想动态加服务只能靠 `IServiceProvider` 工厂 |
| 中间件顺序 | 注册顺序 = 执行顺序（双程） | 写了 `MapControllers` 之后再 `UseXxx`，那个 `UseXxx` 基本无效 |
| 配置优先级 | appsettings → appsettings.{Env} → 环境变量 → 命令行 | 后者覆盖前者 |
| `launchSettings.json` | 只影响本机 F5 / `dotnet run` | 不进发布包；`dotnet xxx.dll` 不读它 |
| `wwwroot` | 唯一默认对外暴露的目录 | 默认不开目录浏览 |
| .NET 9+ OpenAPI | `AddOpenApi()` + `MapOpenApi()`，**没有 UI** | 网上老教程的 Swashbuckle 已不在模板里 |

## 4.3 P103 路由速查（打印出来贴屏幕边）

| 你想要的 URL | Controller 上写 | Action 上写 |
|---|---|---|
| `GET api/books` | `[Route("api/[controller]")]` | `[HttpGet]` |
| `GET api/books/5` | 同上 | `[HttpGet("{id:long}")]` |
| `GET api/books/5/chapters` | 同上 | `[HttpGet("{id:long}/chapters")]` |
| `GET api/books/search` | 同上 | `[HttpGet("search")]` + **`{id}` 必须有 `:long`** |
| `POST api/books` | 同上 | `[HttpPost]` |
| `PUT api/books/5` | 同上 | `[HttpPut("{id:long}")]` |
| `DELETE api/books/5` | 同上 | `[HttpDelete("{id:long}")]` |
| `GET v2/books`（不要前缀） | 同上 | `[HttpGet("~/v2/books")]` |
| `GET api/Books/GetById/5` | `[Route("api/[controller]/[action]")]` | `[HttpGet("{id:long}")]` **（不推荐）** |

## 4.4 P103 参数绑定速查

| 你的参数 | 默认从哪读 | 想改就写 |
|---|---|---|
| `long id`（简单类型） | Route → Query → Form | `[FromRoute] long id` |
| `int page = 1` | Query | `[FromQuery] int page` |
| `BookDto dto`（**有 `[ApiController]`**） | **Body** | `[FromBody]` |
| `BookDto dto`（**无 `[ApiController]`**） | **Query/Form 按属性名凑** | 必须写 `[FromBody]` |
| `IFormFile file` | Form | `[FromForm] IFormFile file` |
| `string token` | Header 需显式 | `[FromHeader(Name="X-Token")]` |
| 服务 | DI 容器 | `[FromServices]` 或直接构造注入 |

## 4.5 P104 热重载边界一句话

> **改「内容」热更，改「形状」重启。**
> 内容 = 方法体、新增成员、视图标记、CSS。
> 形状 = 签名、名字、字段类型、基类、泛型约束、DI 注册、`Program.cs` 结构、`appsettings.json`。

## 4.6 记忆口诀

```
五段启动：建、注册、Build、组管线、Run
管线三条：异常最外，认证在前，CORS 抢先
路由三步：前缀拼、约束筛、大小写别怪
绑定一句：简单走 Route/Query，复杂看 ApiController
热更一句：内容能热，形状要重启
```

## 4.7 你现在的项目该改的三件事

| 检查项 | 如果你的项目是… | 建议 |
|---|---|---|
| Controller 父类 | `: Controller` | 改成 `: ControllerBase`（明确不返回页面） |
| `{id}` 约束 | `[HttpGet("{id}")]` | 改成 `[HttpGet("{id:long}")]`（你的 `Id` 是 `long`） |
| 端点自检 | 从来没看过路由表 | 在 `app.Run()` 前加那段打印 `EndpointDataSource` 的代码，跑一次，把路由表抄进笔记 |

## 4.8 留给下一批的问题（P105–P109 会回答）

1. REST 到底规定了什么？为什么 `GET /api/books/delete/5` 是错的？
2. `POST` 和 `PUT` 的区别是什么？`PATCH` 又是什么？
3. 一个查询接口返回"成功/失败/查无数据"，状态码应该分别是什么？（P110 专门讲）
4. 为什么 REST 说"URL 里不该有动词"，那"搜索""统计"这种操作怎么表达？

**这四个问题答不上来，说明你现在的接口只是"能跑"，还不是"对"。下一批就解决这件事。**


