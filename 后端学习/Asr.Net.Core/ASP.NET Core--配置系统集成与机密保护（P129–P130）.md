==零：补充==

> **这一篇（P129–P130）回答两个问题：配置从哪来、谁赢？以及——为什么"把密钥提交到 GitHub 再删掉"根本不安全？**

## 它解决什么问题

**你从第一批就在写 `appsettings.json`，但可能从来没问过：这五行代码背后，框架到底加了几层配置。**

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<BookContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```

**「配置系统集成」解决的是三件具体的事：**

| # | 问题 | 不做会怎样 |
|---|---|---|
| 1 | **同一份代码要在开发/测试/生产跑，连的库不一样** | 上线前手动改连接串 → 忘改 → 连到开发库；或者改完提交 → 密钥进仓库 |
| 2 | **改一个开关（比如缓存 TTL）要重启应用** | 半夜为了把 TTL 从 5 分钟改到 1 分钟，发一次版 |
| 3 | **配置项写错、缺了，运行时才炸** | 线上 500 了才发现"哦，生产配置少了 Redis 连接串" |

**「防止机密外泄」解决的是一件事，但它比前三条都狠：**

> **一个密钥进了 Git 历史，就等于永久公开了。**

**不是"别人不一定看得到"，是"一定看得到"。**

## 没有它会怎样（真实形态）

**场景一：连接串写死在代码里。**

```csharp
// 你第一批可能这么写过
opt.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=BookDemo;Trusted_Connection=True");
```

- 换台电脑 → 编译能过，运行报"找不到实例"
- 换成正式库 → 要改代码、重新编译、重新发版
- 密码在源码里 → **任何有仓库读权限的人都能连你的库**

**场景二：密钥进了 Git。**

```
2026-10-29 14:03  你提交了 appsettings.json，里面有 "ApiKey": "sk-live-xxxxx"
2026-10-29 14:08  ★ 扫描机器人抓到 ★（公开仓库平均 5 分钟内）
2026-10-30 09:00  你收到账单：API 被刷了 4000 美元
```

**真实世界里，GitHub 上每分钟都有新的密钥被提交，也每分钟都有机器人在扫。** 这不是"运气不好"，这是**流水线作业**。

**场景三：改配置要发版。**

```
运营："首页的缓存时间能不能从 5 分钟改成 1 分钟？"
你：改 appsettings.json → 提交 → 等 CI 跑 8 分钟 → 部署 → 重启（缓存全空）
```

**配置系统集成之后，这件事变成：改一个环境变量 + 重启进程（或者干脆热更新，连重启都不用）。**

## 它在整个生态里的位置

**配置是你和"运行环境"之间的唯一接口。**

```
┌──────────────────────────────────────────────┐
│ 你的代码（编译一次，到处运行）                  │
│   builder.Configuration["xxx"]                │
│   IOptions<CacheOptions>                      │
└───────────────────┬──────────────────────────┘
                    │ 运行时注入
    ┌───────────────┼───────────────┬──────────────┐
    ▼               ▼               ▼              ▼
appsettings.json  环境变量      命令行参数     user-secrets
（默认值）      （生产/容器）   （临时调试）   （本机机密）
```

**这张图解释了一件事：为什么"配置"和"依赖注入"是同一个人讲的（都在 P117–P130）。**

因为 `builder.Configuration` 本身就是注册在容器里的一个 Singleton，`IOptions<T>` 也是。**配置不是"读文件"，是"往容器里注册一个对象，然后注给别人"。**

**放到十二要素应用（12-Factor App）里看，这是第 III 条：**

> **配置 = 环境变量里的一切，不随代码走。**

**P129 讲的是"怎么读"，P130 讲的是"机密那部分怎么不跟着代码走"。**

## 对你个人的实际意义

**（1）你已经有一个真实的、会漏密钥的项目了。**

你的图书管理系统里，`appsettings.json` 有一行连接串，`appsettings.Development.json` 也有。现在它连的是 LocalDB（无密码），所以"泄漏"看起来无所谓——**但这种"随手写进去"的习惯，会在你第一次接第三方 API（翻译、支付、AI 接口）时变成账单事故。**

**这一篇不是"企业规范"，是"你今晚就能用上"的东西。**

**（2）独立开发者最怕的不是技术债，是账单。**

一个人做游戏/工具站，SaaS 密钥（地图、AI、短信、对象存储）全都在你的仓库里。**被盗刷的时候没人帮你分摊，也没人替你解释。**

**（3）位置感：学完这片，你的项目就"可上线"了。**

| 上线前的清单 | 对应哪一批 |
|---|---|
| 接口能跑、状态码对、参数能绑 | 批次 10–11 |
| 前后端能连 | 批次 12 |
| 有 DI、有缓存、扛得住重复请求 | 批次 13–14 |
| **配置分层、密钥不进仓库** | **本批 P129–P130** |
| 异常有统一处理、有日志 | 批次 15（Filter） |
| 部署能从"两个端口"变成"一个域名" | 批次 12 结尾 + 批次 19 |

**这六行就是"一个人能上线的东西"的全部骨架。** 本批填的是最关键也最容易被跳过的一格。

## 诚实的话：什么时候可以偷懒

**这条很重要，免得你把简单项目做成运维噩梦。**

| 情况 | 可以怎么做 |
|---|---|
| 纯本地学习项目，永远不部署 | 连接串直接写 `appsettings.json`，**不用 user-secrets**（但要进 `.gitignore`） |
| 代码**不会**推到任何远程仓库 | 同上，只要不发出去就不存在"外泄" |
| 单人 + 只连 LocalDB（无密码） | 不需要配置中心，更不需要 Key Vault |
| 还没接任何第三方付费 API | 你现在没有"值得被偷"的东西 |

**但只有一条不能省：**

> **只要你的仓库是公开的（哪怕只是"想放到简历里"），就必须先做 P130 这一步再 push。**
> **公开仓库不是"别人懒得看"，是"机器人一定看"。**

---

==一：概念==

## P129 · 1. 那五行代码，其实加载了 5 个配置源

**`WebApplication.CreateBuilder(args)` 这一句，替你做了很多事。它的配置部分是这样的（按"后加的赢"排）：**

| 顺序 | 配置源 | 内容 | 什么时候用 |
|---|---|---|---|
| 1 | `appsettings.json` | 全环境共享的默认值 | 永远 |
| 2 | `appsettings.{Environment}.json` | 环境特有的覆盖 | Development / Staging / Production |
| 3 | **User Secrets** | 本机机密（只在 Development） | **开发时放密钥** |
| 4 | **环境变量** | 容器/服务器注入 | **生产放密钥** |
| 5 | **命令行参数** | `--Key=Value` | 临时调试、覆盖一切 |

**注意第四列：这五个源不是"五选一"，是"五层叠加，后面的覆盖前面的"。**

**我实测过实际的加载顺序（用 `GetDebugView()` 打的）：**

```csharp
app.MapGet("/who", () => new
{
    环境 = app.Environment.EnvironmentName,
    配置来源 = ((IConfigurationRoot)app.Configuration).GetDebugView()
});
```

**输出里每个 key 都标了"它来自哪个 provider"，例如：**

```
AllowedHosts=* (JsonConfigurationProvider for 'appsettings.json' (Optional))
Secret__ApiKey=from-env-var (EnvironmentVariablesConfigurationProvider)
```

> **`GetDebugView()` 是什么？** `IConfigurationRoot` 的扩展方法（`Microsoft.Extensions.Configuration` 命名空间），返回一份"每个 key 的最终值 + 它来自哪个 provider"的文本报告。
>
> **⚠️ 我实测踩的编译错误：** `app.Configuration` 的静态类型是 `IConfiguration`，**不是 `IConfigurationRoot`**，直接调会报：
>
> ```
> error CS1929: "IConfiguration"不包含"GetDebugView"的定义，
> 最佳扩展方法重载需要类型为 "IConfigurationRoot" 的接收器
> ```
>
> **解法：`((IConfigurationRoot)app.Configuration).GetDebugView()`**。这行还能顺便告诉你一个事实——**配置系统内部确实是"根 + 多个 provider"的结构**，只是平时被 `IConfiguration` 这个精简接口挡住了。

## P129 · 2. 优先级怎么算（记住一句话：后加的赢）

**规则只有一条，但细节很多：**

```csharp
var builder = WebApplication.CreateBuilder(args);

// 手动再加一层（会成为最高优先级，因为它在最后）
builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["Cache:TtlSeconds"] = "5"
});
```

**"后加的赢"的具体表现（实测验证过的两条）：**

**① 环境变量覆盖 appsettings.json。**

```bash
# Windows（Git Bash / PowerShell 都行）
Secret__ApiKey="from-env-var" dotnet run
```

```csharp
builder.Configuration["Secret:ApiKey"]   // → "from-env-var"
```

**② 命令行参数覆盖环境变量。**

```bash
dotnet run --Cache:TtlSeconds=120
```

| 优先级 | 源 | 谁在改它 |
|---|---|---|
| 最低 | `appsettings.json` | 你（提交进仓库） |
| ↑ | `appsettings.Development.json` | 你（一般也进仓库） |
| ↑ | user-secrets | `dotnet user-secrets set` |
| ↑ | 环境变量 | 服务器/容器环境 |
| **最高** | **命令行参数** | 启动命令 |

**环境变量的命名规则（最容易记错的地方）：**

```
配置键 Cache:TtlSeconds      ←→   环境变量 Cache__TtlSeconds
          ↑ 冒号                        ↑ 双下划线（两个 _）

配置键 ConnectionStrings:Default  ←→  ConnectionStrings__Default
```

| 现象 | 原因 |
|---|---|
| 写成 `Cache:TtlSeconds` 当环境变量 | Windows 不允许环境变量名带冒号，Linux 允许但框架只认 `__` |
| 写成 `Cache_TtlSeconds`（单个下划线） | **不认**，`__` 是"层级分隔符"的约定，单个下划线是普通字符 |
| Windows 上 `cache__ttlseconds` | **能读到**（Windows 环境变量名大小写不敏感）；**Linux 上读不到**（大小写敏感） |

> **这就是"本地好好的，Linux 容器里读不到配置"最常见的第一个原因。**

## P129 · 3. 环境名从哪来（决定了加载哪个文件）

**三个名字，只是"同一个开关的三种来源"，优先级从低到高：**

| 来源 | 写法 | 优先级 |
|---|---|---|
| 代码默认 | `WebApplicationOptions.EnvironmentName` | 最低 |
| `DOTNET_ENVIRONMENT` | 环境变量 | 中 |
| **`ASPNETCORE_ENVIRONMENT`** | 环境变量 | **最高（ASP.NET Core 专用）** |
| 命令行 | `--environment Production` | 覆盖上面全部 |

**`launchSettings.json` 是开发时的"环境变量注入器"：**

```json
{
  "profiles": {
    "http": {
      "commandName": "Project",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

> **⚠️ 这个文件只在 `dotnet run`（本地）生效。** 发布之后 `dotnet MyApp.dll` 完全不读它——**这是"本地是 Development、上线发现还是 Development"的经典坑**（详细异常页把堆栈暴露给用户）。

**环境名决定了三件事：**

| 影响 | Development | Production |
|---|---|---|
| 加载 `appsettings.{Env}.json` | `appsettings.Development.json` | `appsettings.Production.json` |
| **加载 user-secrets** | ✅ **会** | ❌ **不会** |
| 详细异常页 / Swagger / `ValidateScopes` | 开 | 关 |

**第三条的"加载 user-secrets"我实测过，这是本篇最重要的实验之一：**

| 环境 | 读 `Secret:ApiKey`（值存在 user-secrets 里） |
|---|---|
| `ASPNETCORE_ENVIRONMENT=Development` | **`sk-live-abc123`** ✅ |
| `ASPNETCORE_ENVIRONMENT=Production` | **`(读不到)`** ❌ |

**也就是说：user-secrets 是"开发专用"的，它永远不会被生产环境读到——这既是安全设计，也是"上线忘配环境变量 → 读到空值"的根源。**

## P129 · 4. 三种读法：什么时候用哪个

| 读法 | 写法 | 适合 | 不适合 |
|---|---|---|---|
| **① 直接读 `IConfiguration`** | `_config["Cache:TtlSeconds"]` | 启动时用一次（比如连接串） | **业务代码里到处 `["xxx"]`** → 字符串键、无类型、拼错不报错 |
| **② Options（推荐）** | `IOptions<CacheOptions>` | **绝大多数场景** | 需要"每次读到最新值"且不重启时要选对接口（见第 5 节） |
| **③ `Bind` 到普通对象** | `config.GetSection("X").Get<X>()` | 一次性读取、不参与 DI | 无法校验、无法热更新 |

**为什么推荐 Options？看对比：**

```csharp
// ① 直接读：字符串魔法
var ttl = int.Parse(_config["Cache:TtlSeconds"]);   // 键拼错 → null → FormatException
                                                     // 类型改了 → 运行时炸

// ② Options：强类型 + 可校验 + 可注入
public class BookService
{
    private readonly CacheOptions _opt;
    public BookService(IOptions<CacheOptions> opt) => _opt = opt.Value;   // 有 IntelliSense
}
```

| 差异 | `IConfiguration` | `IOptions<T>` |
|---|---|---|
| 类型安全 | ❌ 全是 string | ✅ 强类型 |
| 键拼错 | 静默返回 null | **运行时报"缺配置"** |
| 能否校验 | 不能 | ✅ `Validate` / `ValidateOnStart` |
| 单元测试 | 要造一个字典 | 传一个 `Options.Create(new CacheOptions{...})` |
| 热更新 | ✅ 天然支持 | 取决于用哪个接口 |

## P129 · 5. 三种 Options 的生命周期（我实测的一张表，比任何文档都直观）

**这是 P129 最该记下来的一节。**

**实验代码：**

```csharp
builder.Services.Configure<CacheOpt>(builder.Configuration.GetSection("Cache"));

app.MapGet("/cfg", (IConfiguration c,
                     IOptions<CacheOpt> o,
                     IOptionsSnapshot<CacheOpt> snap,
                     IOptionsMonitor<CacheOpt> mon) => new
{
    IConfiguration = c["Cache:TtlSeconds"],
    IOptions = o.Value.TtlSeconds,
    IOptionsSnapshot = snap.Value.TtlSeconds,
    IOptionsMonitor = mon.CurrentValue.TtlSeconds
});
```

**过程：启动服务 → 请求一次 → 把 `appsettings.json` 里的 `TtlSeconds` 从 60 改成 99 → 再请求一次（服务不重启）。**

**✅ 实测结果：**

| 读取方式 | 改文件前 | 改文件后 | 结论 |
|---|---|---|---|
| `IConfiguration["..."]` | `"60"` | **`"99"`** | ✅ **实时**（文件监视 + 自动重载） |
| `IOptions<T>.Value` | `60` | **`60`** | ❌ **永不刷新**（单例，第一次访问就算好） |
| `IOptionsSnapshot<T>.Value` | `60` | **`99`** | ✅ **每请求刷新**（Scoped，每个请求重新算） |
| `IOptionsMonitor<T>.CurrentValue` | `60` | **`99`** | ✅ **实时**（单例，但会跟着变更通知更新） |

**这张表怎么记：**

| 接口 | 生命周期 | 什么时候算值 | 一句话 |
|---|---|---|---|
| `IOptions<T>` | **Singleton** | **第一次访问时，只算一次** | **"启动时读一次"——改了必须重启** |
| `IOptionsSnapshot<T>` | **Scoped** | **每次请求（每个 Scope）算一次** | **"每请求读一次"——同一请求内一致** |
| `IOptionsMonitor<T>` | **Singleton** | 首次访问 + **变更时重建**，还有 `OnChange` 回调 | **"跟着文件变"——适合后台服务/单例** |

**为什么 `IOptions` 不刷新？**

因为它被注册成 **Singleton**，`Value` 是第一次访问时构造好的对象，缓存在单例里。**配置文件重载了，但没人去重建那个对象。**

**为什么 `IOptionsSnapshot` 能刷新？**

因为它是 **Scoped**——每个请求开一个新 Scope，`Value` 在这个 Scope 里重新构造。**所以你上一批学的"Scope = 一次请求"，在这里变成了一个真实功能。**

**⚠️ 三个坑，全都来自生命周期：**

| 坑 | 现象 | 原因 |
|---|---|---|
| 在 **Singleton** 里注 `IOptionsSnapshot` | 启动时报 `Cannot consume scoped service 'IOptionsSnapshot<T>' from singleton` | 单例不能注 Scoped（上一批的捕获依赖） |
| 在 Controller 里注 `IOptionsMonitor` 然后**只读 `.CurrentValue`** | 能读到新值，但**同一个请求内可能变**（不一致） | Monitor 是实时的，同一请求两次读可能不同 |
| 用 `IOptions` 却期待热更新 | 改了配置不生效，以为"热更新坏了" | 它本来就不刷新 |

> **选择口诀：**
> **Controller / 短生命周期 → `IOptionsSnapshot`（每请求一致 + 能热更新）。**
> **Singleton / 后台服务 → `IOptionsMonitor`（+ `OnChange`）。**
> **配置永不变（比如应用名）→ `IOptions`（最省）。**

## P129 · 6. 热更新到底谁在监听

**`appsettings.json` 改了能立刻生效，靠的是 `reloadOnChange: true`（默认值）。**

```csharp
// 默认就是这样（你不用写）
builder.Configuration.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
```

**机制：**

```
文件被写入
   ↓  FileSystemWatcher 发现变化（约 250ms 防抖）
   ↓  重新解析整个 JSON
   ↓  逐 key 比较，变化的 key 触发 IChangeToken
   ↓  IOptionsMonitor 收到通知 → 重建 Options 对象 → 触发 OnChange 回调
```

| 参数 | 默认 | 说明 |
|---|---|---|
| `optional` | `true` | 文件不存在也不报错（**生产环境删掉 appsettings.json 不会崩**） |
| `reloadOnChange` | `true` | 文件变了自动重载（**线上改配置不用重启**） |

**⚠️ 但热更新有三个"不生效"的场景：**

| 场景 | 为什么 |
|---|---|
| 用 `IConfiguration["x"]` 在**构造函数里读一次存字段** | 你存的是快照，不是引用 |
| 在 `Program.cs` 里 `builder.Configuration.GetConnectionString(...)` 建 DbContext | **连接串只在启动时用一次**，改了要重启（这是对的，换库不该热切） |
| 用 `IOptions` | 见上一节 |

> **所以"热更新"只对"运行时反复读的配置"有意义**：TTL、开关、限流阈值。**连接串、端口、日志路径这类，改了就该重启。**

## P129 · 7. 配置校验：让"缺配置"在启动时炸，而不是半夜炸

**问题：配置少了，代码可能跑很久才用到它。**

```csharp
public class PayService
{
    public void Pay() => _http.Post(_opt.Value.ApiKey, ...);   // 上线第 3 天才有人调支付
}
```

**解法：`ValidateOnStart()` + `ValidateDataAnnotations()`。**（我实测过：这两句在 `dotnet new web` 项目里**直接能编译**，不需要额外装包）

```csharp
using System.ComponentModel.DataAnnotations;

public class PayOptions
{
    [Required(ErrorMessage = "必须配置 Pay:ApiKey")]
    public string ApiKey { get; set; } = "";

    [Range(1, 65535)]
    public int Port { get; set; } = 443;
}

// Program.cs
builder.Services.AddOptions<PayOptions>()
    .Bind(builder.Configuration.GetSection("Pay"))
    .ValidateDataAnnotations()                                  // 跑 [Required] / [Range]
    .Validate(o => o.Port > 0, "Port 必须大于 0")                // 自定义规则
    .ValidateOnStart();                                        // ★ 启动时就校验
```

| 方法 | 作用 | 不加会怎样 |
|---|---|---|
| `Bind(section)` | 把配置节绑到类型 | 得手写 `config.GetSection().Get<T>()` |
| `ValidateDataAnnotations()` | 执行 `[Required]`/`[Range]` 等特性 | 特性白写 |
| `Validate(lambda, message)` | 自定义规则 | 业务校验无处可放 |
| **`ValidateOnStart()`** | **启动时立即执行一次校验，失败直接崩** | **第一次用到才报错**（可能几天后） |

**效果对比：**

```
不加 ValidateOnStart：
  启动成功 → 运行 3 天 → 有人点支付 → NullReferenceException → 500
  日志里只有一个堆栈，你还要猜"是不是配置问题"

加了 ValidateOnStart：
  启动直接失败：
  OptionsValidationException: PayOptions.ApiKey: 必须配置 Pay:ApiKey
  ★ 上不了线，但也绝不会带着坏配置上线 ★
```

> **`ValidateOnStart()` 的实现细节**：它在容器里注册一个 `IStartupValidator`，`app.Run()` 之前会遍历所有带这个标记的 Options 并调用一次 `IOptions<T>.Value`。**所以它是"启动时的一次性校验"，不是每次读都校验。**（每次读都校验的版本是 `Validate`，配 `IOptionsMonitor` 时每次重建都会跑。）

## P129 · 8. 配置和 DI 的关系（把这一批和上一批接起来）

**四个 API 看起来很像，作用完全不同：**

| API | 干什么 | 注册了什么 |
|---|---|---|
| `builder.Configuration` | **读配置** | 一个 `IConfiguration` 单例 |
| `services.Configure<T>(section)` | 把某个节绑到 T，注册 `IOptions<T>` 等三个接口 | `IOptions<T>` / `IOptionsSnapshot<T>` / `IOptionsMonitor<T>` |
| `services.AddOptions<T>().Bind(...)` | 同上，但能链式加校验 | 同上 |
| `services.AddDbContext<T>(opt => opt.UseSqlServer(conn))` | **消费**配置（在注册时读一次） | DbContext（Scoped） |

**一句话：`Configure` 是"把配置变成可注入的对象"，`AddDbContext` 是"把配置用在某个注册里"。**

**⚠️ 一个必须知道的边界：`AddDbContext` 里的连接串是"启动时读一次"。**

```csharp
builder.Services.AddDbContext<BookContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```

**这个 lambda 在"第一次解析 DbContext 时"执行一次，之后连接串就固定了。** 改 `appsettings.json` 里的连接串**不会热切换**——**这是正确的设计**（想象一下运行到一半突然连到另一个库）。

## P130 · 1. 一次 push 之后，到底会发生什么

**先纠正一个普遍误解：不是"有人无聊翻你的仓库"，是"有几千个机器人在实时盯着 GitHub 的公开事件流"。**

**时间线（这是行业里的常态，不是危言耸听）：**

| 时间 | 发生什么 |
|---|---|
| T+0s | 你 `git push` |
| T+1s | GitHub 收到 push，公开仓库触发 public event |
| **T+5s** | **多个扫描服务（GitHub 自家的 secret scanning + 一堆第三方）收到事件** |
| T+30s | 扫描 diff，正则匹配 `sk-`、`AKIA`、`ghp_`、`-----BEGIN PRIVATE KEY-----` 等模式 |
| **T+60s** | **命中 → 自动验证密钥有效性（发一个最小请求）→ 有效则入库/告警/直接使用** |
| T+1h | 你的 OpenAI/AWS/短信账户开始产生异常调用 |

**关键点：扫描的是"push 事件"，不是你仓库的当前快照。** 也就是说：

> **你"提交 → 发现错了 → 删掉 → 再提交一次"，前一次的内容已经在人家手里了。**

## P130 · 2. 为什么"删掉那个 commit"没用

**这是本篇最反直觉、也最重要的一条。**

**你的做法通常是这样：**

```bash
git rm --cached appsettings.json
echo "appsettings.json" >> .gitignore
git commit -m "移除敏感配置"
git push
```

**结果：GitHub 上的"当前文件列表"里确实没有了。但——**

**`git` 的删除只是"在新 commit 里不再引用那个文件"。旧的 commit 对象还在，永远可以通过 SHA 访问：**

```
https://github.com/你/仓库/blob/旧commit的SHA/appsettings.json
```

**这条链接**不需要登录**（公开仓库），也不需要这个 commit 在分支上。GitHub 会把不可达对象保留很久（甚至在你 force push 之后仍可访问一段时间）。**

| 你以为的 | 真实的 |
|---|---|
| 删掉文件 = 没了 | **文件还在历史里，可按 SHA 访问** |
| `git reset` / `rebase` = 没了 | 本地没了，**远端对象还在** |
| `force push` 覆盖 = 没了 | 分支指向变了，**对象仍可被 API/缓存/fork 拿到** |
| 私有仓库 = 安全 | **私有仓库也会被协作者、CI 日志、克隆副本带走** |
| 删掉整个仓库重建 = 没了 | **GitHub 的 fork 网络里还有（fork 不随删除消失）** |

**结论只有一句：**

> **密钥一旦被 push，就当作"已公开"。唯一的正确动作是"立刻作废它"。**

## P130 · 3. 四层防线（按"什么时候拦"排）

```
① 写代码时：根本不写进文件（user-secrets / 环境变量）
        ↓ 拦不住
② 提交前：.gitignore + 本地预提交检查
        ↓ 拦不住
③ 推送后：GitHub secret scanning / push protection
        ↓ 拦不住
④ 泄漏后：立刻轮换密钥（不是清理历史）
```

| 层 | 手段 | 成本 | 有效性 |
|---|---|---|---|
| ① | **user-secrets / 环境变量** | 低 | **最高（东西从一开始就不在仓库里）** |
| ② | `.gitignore` + `git diff --cached` 自查 | 低 | 中（人总会忘） |
| ③ | GitHub 的 Secret scanning / Push protection | 免费（公开仓库默认开） | 高（推送时直接挡） |
| ④ | **轮换密钥** + 清历史 + 通知 | 高 | 补救，不是预防 |

**记住顺序：越靠前越省事。第 ① 层做对了，后面三层都不需要。**

## P130 · 4. user-secrets：开发期的正确姿势（我实测了一遍全流程）

**它解决的问题：本机要读密钥，但仓库里不能有。**

**① 初始化（一次性）**

```bash
dotnet user-secrets init
```

**✅ 实测输出：**

```
Set UserSecretsId to '7ae8aa22-1b57-4842-b714-5d283030a935' for MSBuild project 'ConfigTest.csproj'.
```

**它做的事：往 `.csproj` 里加一行**

```xml
<PropertyGroup>
  <TargetFramework>net10.0</TargetFramework>
  <UserSecretsId>7ae8aa22-1b57-4842-b714-5d283030a935</UserSecretsId>
</PropertyGroup>
```

> **`UserSecretsId` 是什么？** 一个 GUID，**只是"文件名"，不是密钥本身**。它决定 secrets 存到哪个文件。**这一行可以放心提交**（别人拿到它也没用，因为文件在你自己电脑上）。

**② 写入**

```bash
dotnet user-secrets set "Secret:ApiKey" "sk-live-abc123"
dotnet user-secrets list
```

**✅ 实测输出：**

```
Successfully saved Secret:ApiKey to the secret store.
Secret:ApiKey = sk-live-abc123
```

**③ 它存到哪了（这是很多人不知道的）**

```
%APPDATA%\Microsoft\UserSecrets\<UserSecretsId>\secrets.json
```

**✅ 实测文件内容（明文，注意是 `:` 分隔的扁平 key）：**

```json
{
  "Secret:ApiKey": "sk-live-abc123"
}
```

| 事实 | 说明 |
|---|---|
| **在仓库目录之外** | 所以 `git status` 永远看不到它 |
| **明文存储** | **没有加密**，本机任何进程都能读（这就是它只用于开发的原因） |
| **只在本机** | 换电脑/换人就没有了（这是特性，不是缺陷） |
| **只在 Development 加载** | 实测：Production 下读不到 |

**④ 代码里怎么读（不需要写任何"特殊代码"）**

```csharp
// 只要 csproj 有 UserSecretsId 且环境是 Development，框架自动加上这一层
var apiKey = builder.Configuration["Secret:ApiKey"];
```

**要手动加（比如控制台程序）：**

```csharp
builder.Configuration.AddUserSecrets<Program>();      // 按类型找它所在程序集的 UserSecretsId
```

> **`AddUserSecrets<T>()` 是什么？** `IConfigurationBuilder` 的扩展方法（包 `Microsoft.Extensions.Configuration.UserSecrets`），参数 `T` 只是用来"找到哪个程序集"，然后读它的 `UserSecretsId`。**`AddUserSecrets<Program>()` 是最常用的写法。**

**⑤ 验证：切环境（我实测的结果）**

| `ASPNETCORE_ENVIRONMENT` | `Secret:ApiKey` |
|---|---|
| `Development` | `sk-live-abc123` ✅ |
| `Production` | `(读不到)` ❌ |

**这条差异会让很多人第一次部署时踩坑：本地好好的，上线读到空值。** 因为生产环境要你**用环境变量**给值（下一节）。

## P130 · 5. 环境变量：生产环境的正确姿势（实测覆盖成功）

**生产环境不能用 user-secrets（它在本机上），标准做法是环境变量。**

**① 命名：冒号换双下划线**

| 配置键 | 环境变量 |
|---|---|
| `Secret:ApiKey` | **`Secret__ApiKey`** |
| `ConnectionStrings:Default` | **`ConnectionStrings__Default`** |

**② 我实测的过程：**

```bash
# Production 环境，没有环境变量时：  机密 = "(读不到)"
# 加上环境变量再启动：
Secret__ApiKey="from-env-var" ASPNETCORE_ENVIRONMENT=Production dotnet run
```

**✅ 实测结果：`"机密":"from-env-var"`**

**注意：同一台机器、同一个 secrets.json（里面有 `sk-live-abc123`），Production 下读到的是环境变量的值——因为 user-secrets 在 Production 根本没加载。**

**③ 各平台怎么设：**

| 平台 | 临时（当前进程） | 永久 |
|---|---|---|
| **Windows（PowerShell）** | `$env:Secret__ApiKey="xxx"` | `[Environment]::SetEnvironmentVariable("Secret__ApiKey","xxx","User")` |
| **Windows（CMD）** | `set Secret__ApiKey=xxx` | `setx Secret__ApiKey xxx`（**新开的窗口才生效**） |
| **Linux / macOS** | `export Secret__ApiKey=xxx` | 写进 `/etc/environment` 或 systemd 的 `Environment=` |
| **Docker** | `docker run -e Secret__ApiKey=xxx` | `docker-compose.yml` 的 `environment:` |
| **IIS** | 应用池的"环境变量"配置 | `web.config` 的 `<environmentVariables>`（**注意：web.config 会进仓库**） |
| **systemd** | — | `Environment=Secret__ApiKey=xxx`（或 `EnvironmentFile=`） |

> **⚠️ `setx` 的坑：** 它改的是"用户环境变量"，**已经打开的终端读不到**，必须新开窗口。**第一次用 `setx` 的人 90% 会以为没生效。**

**④ 环境变量最大的问题：会泄露到子进程和日志里。**

```bash
# 危险：会进 shell 历史，也会被同用户的其他进程看到
export OPENAI_API_KEY=sk-xxx

# 相对安全：只对这一个命令生效
OPENAI_API_KEY=sk-xxx dotnet run
```

**另外：`appsettings.json` 里不要引用环境变量做拼接，框架不支持"变量替换"。**

## P130 · 6. 生产到底该用什么（四种方案对比）

| 方案 | 安全性 | 运维成本 | 适合 |
|---|---|---|---|
| **环境变量** | 中（进程可见、日志可能打印） | **低** | **90% 的项目，包括你的** |
| **云厂商密钥服务**（Azure Key Vault / AWS Secrets Manager / 阿里云 KMS） | **高**（加密、审计、轮换） | 高（要配身份、权限） | 多服务、有合规要求 |
| **配置中心**（Nacos / Apollo / Consul） | 高（集中管理、热更新） | 高（自己运维一套） | 微服务、配置项几百个 |
| **容器 secret**（K8s Secret / Docker secret） | 中高（挂载成文件） | 中 | 容器化部署 |

**对你的项目（单机/一台云服务器 + 一个 .NET 进程）：**

> **环境变量就够了。** 再往上都是"团队规模到了才需要"的东西。

**但有一条要提前做：连接串也别写进 `appsettings.json`（如果它带密码）。**

```json
// ❌ 不要提交这个
{
  "ConnectionStrings": {
    "Default": "Server=1.2.3.4;Database=Book;User Id=sa;Password=RealPassword123;"
  }
}
```

```bash
# ✅ 生产用环境变量给
ConnectionStrings__Default="Server=...;Password=..."
```

## P130 · 7. 已经泄漏了怎么办（标准流程，顺序不能错）

**⚠️ 最重要的一条：先作废密钥，再清理仓库。顺序反了就是给人留时间。**

| 步骤 | 动作 | 时间要求 |
|---|---|---|
| **1** | **登录服务商后台，立刻吊销/轮换这个密钥** | **分钟级** |
| 2 | 生成新密钥，用环境变量配到生产 | 立刻 |
| 3 | 查用量/账单，看有没有异常调用 | 当天 |
| 4 | 从 Git 历史里彻底清除（`git filter-repo` 或 BFG） | **不急，可以慢慢做** |
| 5 | `force push` 覆盖远端 | 清理后 |
| 6 | 通知所有协作者重新克隆（他们的本地历史还有） | 当天 |
| 7 | 检查 fork（**fork 不会因为你的清理而消失**） | 当天 |

**第 4 步的命令（了解即可，别在没备份的仓库上用）：**

```bash
# 推荐：git-filter-repo（比 filter-branch 快几十倍，也更安全）
pip install git-filter-repo
git filter-repo --path appsettings.json --invert-paths      # 从所有历史里删掉这个文件

# 或者只替换文件里的字符串
git filter-repo --replace-text <(echo "sk-live-abc123==>***REMOVED***")

# 传统做法（不推荐，慢且容易出错）
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch appsettings.json' --prune-empty HEAD
```

> **`git filter-repo` 是什么？** Git 官方现在推荐的历史重写工具（`git filter-branch` 已被官方标注为"不推荐使用"）。它会把**每一个 commit** 重写一遍，把指定文件从所有历史中删掉。**代价是所有 commit SHA 全变，所有人都要重新克隆。**

**第 7 步为什么重要：**

> **别人 fork 了你的仓库，那个 fork 是"独立的仓库"，你清理自己不会影响它。** 而且 fork 网络里的对象是共享存储的——**即使原仓库删了，fork 里的 commit 还在。**

## P130 · 8. `.gitignore` 该怎么写（针对 .NET 项目）

**核心原则：把"因环境和因人而异"的东西全排掉。**

```gitignore
# ── 机密 / 本机配置 ──────────────────────────
appsettings.*.local.json
*.user
secrets.json
.env
.env.*

# ── 允许提交但要注意：appsettings.Development.json 里绝不能有真实密码 ──

# ── 编译产物 ─────────────────────────────────
bin/
obj/
*.user
.vs/
```

| 文件 | 要不要提交 | 理由 |
|---|---|---|
| `appsettings.json` | ✅ 提交 | 放默认值/非敏感项 |
| `appsettings.Development.json` | ⚠️ **可以提交，但不能有真实密钥** | 团队共享开发配置；**密码放 user-secrets** |
| `appsettings.Production.json` | ❌ **不提交** | 生产配置走环境变量 |
| `secrets.json` | ❌ 不提交 | 它本来就不在仓库目录里，写进 `.gitignore` 是双保险 |
| `*.user`（`.csproj.user`） | ❌ 不提交 | 本机的启动配置/端口 |

**⚠️ `.gitignore` 的三个"没用"时刻（新手必踩）：**

| 情况 | 为什么没用 |
|---|---|
| 文件**已经被跟踪**了才加进 `.gitignore` | `.gitignore` 只对"未跟踪文件"生效，已跟踪的必须 `git rm --cached` |
| 你在子目录写了 `.gitignore`，但父目录有 `!` 规则 | 规则优先级：**越靠近文件的越优先**，但 `!` 取反会让某些文件重新被包含 |
| 文件名大小写不一致 | Windows 不敏感、Linux 敏感，`AppSettings.json` 与规则不匹配 |

```bash
# 已经被跟踪的文件，要让 .gitignore 生效：
git rm --cached appsettings.Production.json
git commit -m "停止跟踪生产配置文件"
```

---

==二：格式==

## P129 · 读配置的三种骨架

```csharp
// ① 启动时一次性用（连接串、端口）——最直接
var conn = builder.Configuration.GetConnectionString("Default");

// ② Options（推荐）：注册 + 注入
builder.Services.Configure<CacheOptions>(builder.Configuration.GetSection("Cache"));

public class BookService
{
    private readonly CacheOptions _opt;
    public BookService(IOptionsSnapshot<CacheOptions> opt) => _opt = opt.Value;
}

// ③ 一次性 Bind（不参与 DI，适合工具类）
var opt = builder.Configuration.GetSection("Cache").Get<CacheOptions>() ?? new CacheOptions();
```

## P129 · Options 三种注册方式

```csharp
// 最简（无校验）
builder.Services.Configure<CacheOptions>(builder.Configuration.GetSection("Cache"));

// 推荐（可链式加校验）
builder.Services.AddOptions<CacheOptions>()
    .Bind(builder.Configuration.GetSection("Cache"))
    .ValidateDataAnnotations()
    .Validate(o => o.TtlSeconds > 0, "TtlSeconds 必须大于 0")
    .ValidateOnStart();

// 带后置处理（比如把相对路径转绝对路径）
builder.Services.AddOptions<FileOptions>()
    .Bind(builder.Configuration.GetSection("File"))
    .PostConfigure(o => o.Root = Path.GetFullPath(o.Root));
```

## P129 · 三种 Options 注入（按生命周期选）

```csharp
// Controller / Scoped 服务：每请求一致 + 能热更新
public class A(IOptionsSnapshot<CacheOptions> o) { }

// Singleton / 后台服务：实时 + 可订阅变化
public class B
{
    public B(IOptionsMonitor<CacheOptions> mon)
    {
        var now = mon.CurrentValue.TtlSeconds;
        mon.OnChange(o => Console.WriteLine($"配置变了：{o.TtlSeconds}"));   // 变更回调
    }
}

// 永不变的配置（应用名、版本号）
public class C(IOptions<AppInfo> o) { }
```

## P129 · 环境变量的两种写法

```bash
# 配置键 Cache:TtlSeconds  →  环境变量 Cache__TtlSeconds
Cache__TtlSeconds=30 dotnet run

# 连接串
ConnectionStrings__Default="Server=...;Database=Book;User Id=sa;Password=xxx" dotnet run
```

```json
// launchSettings.json（只影响本地 dotnet run）
{
  "profiles": {
    "http": {
      "commandLineArgs": "--Cache:TtlSeconds=5",
      "environmentVariables": { "ASPNETCORE_ENVIRONMENT": "Development" }
    }
  }
}
```

## P130 · user-secrets 命令表（背下来）

```bash
dotnet user-secrets init                          # 一次性：往 csproj 写 UserSecretsId
dotnet user-secrets set "Secret:ApiKey" "xxx"     # 写
dotnet user-secrets list                          # 看全部
dotnet user-secrets remove "Secret:ApiKey"        # 删一个
dotnet user-secrets clear                          # 全清
```

**文件位置（Windows）：**

```
%APPDATA%\Microsoft\UserSecrets\<UserSecretsId>\secrets.json
```

**读（代码里什么都不用改）：**

```csharp
var key = builder.Configuration["Secret:ApiKey"];    // Development 自动加载
```

## P130 · `.gitignore` 片段（.NET 项目直接用）

```gitignore
# 机密与本机配置
appsettings.Production.json
appsettings.*.local.json
*.user
secrets.json
.env
.env.*

# 编译产物
bin/
obj/
.vs/
```

## P130 · 泄漏应急（顺序不能反）

```bash
# 第 1 步（最重要）：去服务商后台吊销/轮换密钥 —— 不要先清历史

# 第 4 步：从历史中彻底删除
pip install git-filter-repo
git filter-repo --path appsettings.json --invert-paths

# 第 5 步：强推（所有协作者必须重新克隆）
git push origin --force --all
git push origin --force --tags
```

---

==三：代码==

## 3.1 一份"可上线"的 `Program.cs`（分层 + 校验 + 脱敏）

```csharp
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ───────────────────────────────────────────────
// ① 配置校验：缺东西就在启动时炸
// ───────────────────────────────────────────────
builder.Services.AddOptions<DbOptions>()
    .Bind(builder.Configuration.GetSection("Db"))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddOptions<CacheOptions>()
    .Bind(builder.Configuration.GetSection("Cache"))
    .Validate(o => o.StatsTtlSeconds is > 0 and <= 3600, "StatsTtlSeconds 必须在 1–3600 秒之间")
    .ValidateOnStart();

// ───────────────────────────────────────────────
// ② 数据库：连接串优先取环境变量，其次 appsettings
// ───────────────────────────────────────────────
builder.Services.AddDbContext<BookContext>((sp, opt) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var conn = cfg.GetConnectionString("Default")
               ?? throw new InvalidOperationException("缺少 ConnectionStrings:Default");

    opt.UseSqlServer(conn);
    if (builder.Environment.IsDevelopment())
        opt.LogTo(Console.WriteLine, LogLevel.Information).EnableSensitiveDataLogging();
});

// ───────────────────────────────────────────────
// ③ 缓存
// ───────────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ICacheService, MemoryCacheService>();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// ───────────────────────────────────────────────
// ④ 启动时把"关键配置是否就位"打一行日志（不要打值！）
// ───────────────────────────────────────────────
app.Logger.LogInformation("环境={Env}，连接串已配置={HasConn}，Redis已配置={HasRedis}",
    app.Environment.EnvironmentName,
    !string.IsNullOrEmpty(app.Configuration.GetConnectionString("Default")),
    !string.IsNullOrEmpty(app.Configuration.GetConnectionString("Redis")));

if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.UseAuthorization();
app.MapControllers();
app.Run();

// ───────────────────────────────────────────────
// 配置类型
// ───────────────────────────────────────────────
public class DbOptions
{
    [Required(ErrorMessage = "必须配置 Db:Name")]
    public string Name { get; set; } = "";

    [Range(1, 65535)]
    public int Port { get; set; } = 1433;
}

public class CacheOptions
{
    public int StatsTtlSeconds { get; set; } = 300;
    public int ListTtlSeconds { get; set; } = 60;
}
```

**这段代码里，有三个决定"能不能上线"的细节：**

| 细节 | 为什么 |
|---|---|
| `sp.GetRequiredService<IConfiguration>()` 在 lambda 里取 | 不用捕获外层的 `builder.Configuration`，测试时更好替换 |
| `throw new InvalidOperationException(...)` | 配置缺失就**启动失败**，而不是运行到第一个请求才 500 |
| **日志只打"是否配置"，不打值** | **密钥一旦进日志，就等于进了 ELK/文件/第三方日志服务** |

## 3.2 三种 Options 生命周期实验（可直接跑，10 分钟出结论）

**这是 P129 最值得亲手做的一次实验。**

```csharp
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<CacheOpt>(builder.Configuration.GetSection("Cache"));

var app = builder.Build();

app.MapGet("/cfg", (IConfiguration c,
                     IOptions<CacheOpt> o,
                     IOptionsSnapshot<CacheOpt> snap,
                     IOptionsMonitor<CacheOpt> mon) => new
{
    环境 = app.Environment.EnvironmentName,
    IConfiguration = c["Cache:TtlSeconds"],
    IOptions = o.Value.TtlSeconds,
    IOptionsSnapshot = snap.Value.TtlSeconds,
    IOptionsMonitor = mon.CurrentValue.TtlSeconds,
    机密 = c["Secret:ApiKey"] ?? "(读不到)"
});

app.Run();

public class CacheOpt { public int TtlSeconds { get; set; } }
```

```json
// appsettings.json
{ "Cache": { "TtlSeconds": 60 } }
```

**实验步骤：**

```bash
# ① 启动
ASPNETCORE_ENVIRONMENT=Development dotnet run

# ② 第一次请求
curl --noproxy '*' http://127.0.0.1:5098/cfg

# ③ 不重启，直接改 appsettings.json：60 → 99

# ④ 再请求一次，对比四个字段
```

**✅ 实测结果（我跑出来的原文）：**

**改之前：**

```json
{"环境":"Development","iConfiguration":"60","iOptions":60,"iOptionsSnapshot":60,"iOptionsMonitor":60}
```

**改 `TtlSeconds` 为 99 之后（服务没重启）：**

```json
{"环境":"Development","iConfiguration":"99","iOptions":60,"iOptionsSnapshot":99,"iOptionsMonitor":99}
```

**请把这一行盯 10 秒：`iOptions` 还是 60，其他三个都变成了 99。**

> **这一个数字，解释了"为什么改了配置没生效"的全部疑问。**
> 你项目里如果注的是 `IOptions<T>`，**改配置文件它永远不会变**——不是热更新坏了，是你选错了接口。

## 3.3 配置校验实验：让"缺配置"在启动时炸

```csharp
builder.Services.AddOptions<PayOptions>()
    .Bind(builder.Configuration.GetSection("Pay"))
    .ValidateDataAnnotations()
    .ValidateOnStart();
```

```csharp
public class PayOptions
{
    [Required(ErrorMessage = "必须配置 Pay:ApiKey")]
    public string ApiKey { get; set; } = "";
}
```

**配置文件里故意不写 `Pay:ApiKey`，然后启动：**

```
Unhandled exception. Microsoft.Extensions.Options.OptionsValidationException:
  PayOptions.ApiKey: 必须配置 Pay:ApiKey
   at Microsoft.Extensions.Options.OptionsFactory`1.Create(String name)
   ...
   at Microsoft.AspNetCore.Builder.WebApplication.Run()
```

| 现象 | 说明 |
|---|---|
| **异常发生在 `app.Run()` 之前** | 应用根本没起来（进程退出码非 0，容器编排会认为部署失败） |
| 异常类型 `OptionsValidationException` | 里面带着你写的 `ErrorMessage` |
| **这是好事** | "部署失败"比"上线后 500"便宜一百倍 |

**验证一下 `ValidateOnStart` 真的必要（去掉它对比）：**

| 有没有 `ValidateOnStart()` | 缺配置时的表现 |
|---|---|
| 有 | **启动失败**，日志明确写出缺哪个键 |
| 无 | 启动成功；直到第一次用到 `PayOptions` 才抛 `OptionsValidationException` |

## 3.4 user-secrets 全流程（实测命令与输出）

```bash
# ① 初始化（往 csproj 写一个 GUID）
cd "D:\code\...\ASP.NET Core--图书管理系统"
dotnet user-secrets init

# ② 写入密钥
dotnet user-secrets set "Secret:ApiKey" "sk-live-abc123"

# ③ 确认
dotnet user-secrets list
# → Secret:ApiKey = sk-live-abc123
```

**csproj 里会多出：**

```xml
<UserSecretsId>7ae8aa22-1b57-4842-b714-5d283030a935</UserSecretsId>
```

**文件落在这里（Windows）：**

```
C:\Users\<你>\AppData\Roaming\Microsoft\UserSecrets\7ae8aa22-...\secrets.json
```

```json
{ "Secret:ApiKey": "sk-live-abc123" }
```

**验证"只在 Development 生效"：**

```bash
ASPNETCORE_ENVIRONMENT=Development dotnet run   # 读到 sk-live-abc123
ASPNETCORE_ENVIRONMENT=Production  dotnet run   # 读到 (读不到)
```

**验证"环境变量能覆盖"：**

```bash
Secret__ApiKey="from-env-var" ASPNETCORE_ENVIRONMENT=Production dotnet run
# 读到 from-env-var
```

## 3.5 落到你的图书系统：连接串到底怎么放

**你现在的状态：**

```json
// appsettings.json
{
  "ConnectionStrings": {
    "Default": "Server=(localdb)\\MSSQLLocalDB;Database=BookDemo;Trusted_Connection=True"
  }
}
```

**这个连接串"没有密码"，所以现在提交没问题。但你要提前想好"以后换成云数据库"那天怎么办。**

| 阶段 | 连接串放哪 | 提交吗 |
|---|---|---|
| **现在（LocalDB，无密码）** | `appsettings.json` | ✅ 可以 |
| **本机连测试服务器（有密码）** | **user-secrets** | ❌ |
| **生产（云数据库）** | **环境变量** `ConnectionStrings__Default` | ❌ |

**本机换 user-secrets 的三步：**

```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Default" "Server=1.2.3.4;Database=Book;User Id=app;Password=xxx;TrustServerCertificate=True"
# 然后把 appsettings.json 里的这一行删掉（或留 LocalDB 作为默认值）
```

**⚠️ 但有一个坑要注意：`appsettings.json` 里如果留着 LocalDB 的连接串，它优先级更低，user-secrets 会覆盖它——这正好是你想要的。** 反过来，**如果你忘了 set，就会静默连到 LocalDB**，你会以为连的是服务器。**用 3.1 里那行"启动日志"能提前发现。**

## 3.6 日志脱敏：密钥最容易被"顺手打印"出去

**真正的泄漏现场往往不是 Git，是日志。**

```csharp
// ❌ 这三行都危险
_log.LogInformation("连接串：{Conn}", conn);                       // 密码进日志
_log.LogInformation("配置：{Cfg}", JsonSerializer.Serialize(opt));  // 整个对象进日志
app.Logger.LogInformation("启动参数：{Args}", args);                // 命令行里的 --Password=xxx
```

**正确做法：只打"是否有、长度多少、前后几位"。**

```csharp
public static class MaskHelper
{
    public static string Mask(string? s)
        => string.IsNullOrEmpty(s) ? "(未配置)"
           : s.Length <= 8 ? "***"
           : $"{s[..4]}***{s[^4..]}";        // 例：sk-l***c123
}

_log.LogInformation("ApiKey = {Key}", MaskHelper.Mask(apiKey));
```

**另外：EF Core 的 `EnableSensitiveDataLogging()` 会把 SQL 参数的真实值打进日志。**

```csharp
if (builder.Environment.IsDevelopment())     // ★ 必须套环境判断
    opt.EnableSensitiveDataLogging();
```

> **你项目里现在是无条件开的**（上一批看到的 `Program.cs`）。**上线前记得套上 `IsDevelopment()`**，否则用户的手机号、密码哈希会明文出现在生产日志里。

## 3.7 上线前配置检查清单（照这个过一遍）

| # | 检查项 | 怎么查 | 通过标准 |
|---|---|---|---|
| 1 | 生产连接串不在仓库里 | `git log -p -- appsettings*.json \| grep -i "password="` | 无输出 |
| 2 | `.gitignore` 覆盖了生产配置 | `cat .gitignore` | 有 `appsettings.Production.json` |
| 3 | 生产靠环境变量起得来 | 清空本机 secrets.json 后用 Production 跑一次 | 启动成功、能连库 |
| 4 | 缺配置会启动失败 | 故意删掉一个必填项 | 启动报 `OptionsValidationException` |
| 5 | 环境名不是 Development | 看启动日志那行 `环境=` | `Production` |
| 6 | `EnableSensitiveDataLogging` 只在开发开 | 搜代码 | 外面套了 `IsDevelopment()` |
| 7 | 日志里没有密钥 | 搜日志文件 `grep -i "sk-\|password"` | 无命中 |
| 8 | 环境变量没被打印 | 搜 `LogInformation.*Args` | 无 |

---

==四：总结==

## 4.1 两节核心结论

| 节 | 一句话结论 |
|---|---|
| **P129** | `CreateBuilder` 自动叠加 **5 层配置源**，后加的赢；读配置优先用 `IOptionsSnapshot`/`IOptionsMonitor`，`IOptions` **永不刷新** |
| **P130** | 密钥一旦 push 就等于公开；**删 commit 没用**，唯一正确动作是**立刻轮换**；开发用 user-secrets，生产用环境变量 |

## 4.2 配置源优先级（从低到高）

| 优先级 | 源 | 典型用途 |
|---|---|---|
| 1 | `appsettings.json` | 默认值（提交） |
| 2 | `appsettings.{Env}.json` | 环境覆盖（开发可提交） |
| 3 | **user-secrets**（仅 Development） | **本机密钥** |
| 4 | **环境变量**（`__` 分隔） | **生产密钥** |
| 5 | 命令行参数 | 临时调试 |

## 4.3 三种 Options 对照（打印贴屏幕）

| | `IOptions<T>` | `IOptionsSnapshot<T>` | `IOptionsMonitor<T>` |
|---|---|---|---|
| 生命周期 | **Singleton** | **Scoped** | Singleton |
| 何时读值 | **第一次访问，只一次** | **每请求一次** | 首次 + 变更时 |
| 热更新 | ❌ **不刷新** | ✅ 下一请求生效 | ✅ 立即 |
| 同请求内一致 | — | ✅ | ❌（可能中途变） |
| 能不能注进 Singleton | ✅ | ❌（捕获依赖） | ✅ |
| 用在哪 | 永不变的配置 | **Controller / Scoped 服务** | **后台服务 / 单例** |

## 4.4 密钥放哪：一张决策表

| 场景 | 放哪里 | 命令/写法 |
|---|---|---|
| 本地开发，要连有密码的库 | **user-secrets** | `dotnet user-secrets set "Conn:x" "..."` |
| 生产（单机/VM） | **环境变量** | `ConnectionStrings__Default=...` |
| 生产（Docker） | 环境变量 / compose `environment` | `-e ConnectionStrings__Default=...` |
| 生产（K8s） | Secret 挂成环境变量或文件 | `envFrom: secretRef` |
| 多服务、要审计轮换 | Key Vault / Secrets Manager | SDK 接入 |
| **永远不要** | **appsettings.json / 代码 / web.config / 前端 JS** | — |

## 4.5 记忆口诀

```
配置五层，后加的赢：
  appsettings → appsettings.环境 → user-secrets → 环境变量 → 命令行

环境变量：冒号换双下划线
  Cache:TtlSeconds  →  Cache__TtlSeconds

三个 Options：
  IOptions 只读一次（改了要重启）
  Snapshot 每请求读（Controller 用它）
  Monitor 跟着变（后台服务用它）

密钥三句话：
  开发用 user-secrets（在仓库外面）
  生产用环境变量（在进程外面）
  泄漏了先轮换（不是先清历史）
```

## 4.6 八个易错点（含两个我实测踩到的）

| # | 易错点 | 后果 | 正确做法 |
|---|---|---|---|
| 1 | **`app.Configuration.GetDebugView()` 直接调** | 编译错误 CS1929，要求 `IConfigurationRoot` | `((IConfigurationRoot)app.Configuration).GetDebugView()` |
| 2 | 用 `IOptions<T>` 却期待热更新 | 改了配置永远不生效（我实测：60 一直是 60） | Controller 里改用 `IOptionsSnapshot<T>` |
| 3 | 在 Singleton 里注 `IOptionsSnapshot` | 启动抛捕获依赖异常 | 改用 `IOptionsMonitor<T>` |
| 4 | 环境变量写成 `Cache_TtlSeconds`（单下划线） | 读不到，静默用默认值 | **双下划线 `__`** |
| 5 | 依赖 `launchSettings.json` 里的环境变量 | 部署后不是 Development（详细异常页对外暴露） | 生产显式设 `ASPNETCORE_ENVIRONMENT` |
| 6 | **`.gitignore` 加在已被跟踪的文件上** | 完全不生效，文件还在被提交 | 先 `git rm --cached <file>` |
| 7 | 用 `setx` 设了环境变量，在同一个窗口验证 | 读不到（`setx` 只影响新进程） | 新开终端，或用 `$env:X="..."` 临时设 |
| 8 | **忘了 `EnableSensitiveDataLogging()` 只在开发开** | 生产日志里出现用户数据、SQL 参数 | 套 `if (builder.Environment.IsDevelopment())` |

## 4.7 你下一步可以做的三件事

| # | 做什么 | 预期收获 |
|---|---|---|
| 1 | 跑 3.2 的实验，盯住 `IOptions` 那个不变的数字 | 以后看到"配置改了没生效"，第一反应是"是不是注的 IOptions" |
| 2 | 给自己项目 `dotnet user-secrets init` + 把连接串搬进去 | 养成"密钥不落仓库"的肌肉记忆 |
| 3 | **故意把 `Secret:ApiKey` 提交一次到私有仓库，然后跑 `git log -p` 搜密码** | 亲眼看到"删了文件，历史里还有" |

**第 3 步要在**私有仓库**做，或者干脆在本地 `git init` 一个临时仓库做。**别在公开仓库上练手。

## 4.8 留给下一批的问题（P131–P137：多层项目 + Filter）

1. 把项目拆成 `Web / Core / Infra` 三层后，`DbContext` 该注册在哪一层？为什么 Web 层不该 `using` EF Core？
2. 三层之间怎么传递数据？DTO 该放在哪一层？
3. "批量注册上下文"是什么意思——有 10 个 DbContext 时怎么一行注册完？
4. `IExceptionFilter` 能捕获哪些异常、捕获不到哪些？
5. `ActionFilter` 能在 Action **执行前**改参数吗？能在**执行后**改返回值吗？
6. "自动启用事务的 Filter" 是怎么做到"Action 抛异常就回滚"的？
7. 限流 Filter 和中间件限流，哪个更合适？

**下一批是"项目从"一个文件夹"变成"一个解决方案"的分水岭"，也是 Filter 的完整用法（面试常问 Filter 与中间件的区别，在 P143 才正式回答，但 P134–P137 是它的铺垫）。**

