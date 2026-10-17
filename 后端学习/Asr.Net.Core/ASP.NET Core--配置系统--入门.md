

**配置是程序的“==🟡运行规则==”，数据是程序的“业务内容”。配置决定程序怎么跑，数据是程序跑出来的结果。** 两者不能混，也不该混。
==一：概念==
**1. 为什么需要配置系统？**

一个应用程序在不同环境（开发、测试、生产）下，往往需要不同的设置。配置系统就是用来**统一管理这些设置**的。它允许你从多种来源（如 `appsettings.json` 文件、环境变量、命令行参数等）读取配置，并以一种统一的方式提供给应用程序使用。

**2. `IConfiguration`：配置的统一视图**

`IConfiguration` 是 .NET 配置系统的核心接口。它的作用是将来自**一个或多个配置源**的数据，整合成一个**单一的、统一的视图**提供给开发者。你只需要与 `IConfiguration` 交互，而不需要关心数据具体来自哪个文件或环境。

**3. 配置提供程序：数据的来源**

配置提供程序是实际从各种**配置源**（如 JSON 文件、环境变量、命令行参数等）读取数据的组件。.NET 内置了多种提供程序，你也可以编写自己的提供程序来从数据库或配置中心读取数据。

**4. 配置的优先级**

当同一个配置键在多个配置源中都存在时，**最后添加的配置提供程序会拥有更高的优先级**，它的值会覆盖之前的。这使得你可以用环境变量来覆盖 `appsettings.json` 中的默认值，非常适合多环境部署。

**5. 配置的只读性**

`IConfiguration` 被设计为**只读**的。它用于读取配置，而不是在运行时动态写入配置。如果需要更新配置，通常需要重新启动应用或使用支持热更新的配置源。
==二：格式==
**1. 注入 `IConfiguration`**

在 [ASP.NET](https://asp.net/) Core 中，`IConfiguration` 已经默认注册到 DI 容器中，你可以直接在控制器或服务的构造函数中注入它。

```csharp

public class HomeController : ControllerBase
{
    private readonly IConfiguration _configuration;
    public HomeController(IConfiguration configuration)
    {
        _configuration = configuration;
    }
}
```

**2. 读取配置值**

使用索引器 `["Key"]` 或 `GetValue<T>("Key")` 方法来读取配置。

```csharp

// 读取字符串
string apiKey = _configuration["MySettings:ApiKey"];
// 读取并转换为 int，如果找不到则返回默认值 30
int timeout = _configuration.GetValue<int>("MySettings:Timeout", 30);

**3. `appsettings.json` 的典型结构**
```


```csharp

{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "MySettings": {
    "ApiKey": "abc-123",
    "Timeout": 30
  },
  "AllowedHosts": "*"
}
```

**① `Logging`**：这是 .NET 的日志配置。告诉程序：日志的默认级别是 `Information`。

**② `MySettings`**：这是**开发者自定义的配置**。它包含两个子项：

- `ApiKey`：值是 `"abc-123"`（模拟一个 API 密钥）。
    
- `Timeout`：值是 `30`（模拟超时时间，单位秒）。
    

**③ `AllowedHosts`**：允许哪些主机访问这个应用。`"*"` 表示允许所有主机。

使用冒号 `:` 来访问嵌套的配置项，如 `"MySettings:ApiKey"`。

**嵌套的目的是分组**：
这样你可以通过 `"MySettings:ApiKey"` 和 `"MySettings:Timeout"` 来读取，**不会冲突**。

==三：代码==
**1. 在 `Program.cs` 中查看默认的配置源**

在 .NET 6+ 的 `WebApplicationBuilder` 中，默认已经添加了多个配置源，其优先级从低到高大致为：

```csharp

var builder = WebApplication.CreateBuilder(args);
// builder.Configuration 中已经包含了以下提供程序（按优先级从低到高）：
// 1. appsettings.json
// 2. appsettings.{Environment}.json (如 appsettings.Development.json)
// 3. User Secrets (开发环境)
// 4. 环境变量
// 5. 命令行参数 (通过 args 传入)
```

**2. 在控制器中读取配置**

```csharp

[ApiController]
[Route("api/[controller]")]
public class ConfigController : ControllerBase
{
    private readonly IConfiguration _config;
    public ConfigController(IConfiguration config)
    {
        _config = config;
    }
    [HttpGet("apikey")]
    public string GetApiKey()
    {
        // 读取 MySettings:ApiKey 的值
        return _config["MySettings:ApiKey"] ?? "未配置";
    }
    [HttpGet("timeout")]
    public int GetTimeout()
    {
        // 读取 MySettings:Timeout 的值，如果没配置则返回 30
        return _config.GetValue<int>("MySettings:Timeout", 30);
    }
}
```

**3. 使用选项模式（下一节 P41 的重点）**

虽然可以直接注入 `IConfiguration` 来读取值，但更推荐的方式是**选项模式**。它可以将配置绑定到一个强类型的类上，提供更好的封装和类型安全。

```csharp

// 1. 定义强类型配置类
public class MySettings
{
    public string ApiKey { get; set; }
    public int Timeout { get; set; }
}
// 2. 在 Program.cs 中绑定
builder.Services.Configure<MySettings>(builder.Configuration.GetSection("MySettings"));
// 3. 在控制器中注入 IOptions<MySettings>
public class HomeController : ControllerBase
{
    private readonly MySettings _settings;
    public HomeController(IOptions<MySettings> options)
    {
        _settings = options.Value;
    }
    [HttpGet]
    public string Get()
    {
        return $"ApiKey: {_settings.ApiKey}, Timeout: {_settings.Timeout}";
    }
}
```
==四：总结==

1. **核心接口**：`IConfiguration` 是配置系统的统一入口，它将所有配置源的数据整合成一个只读的视图。
    
2. **配置提供程序**：负责从不同来源（JSON、环境变量等）读取数据，是配置系统的数据来源。
    
3. **优先级规则**：最后添加的配置提供程序优先级最高，其值会覆盖之前的值。这让你可以用环境变量覆盖默认的 JSON 配置。
    
4. **默认配置源**：在 [ASP.NET](https://asp.net/) Core 中，`appsettings.json`、`appsettings.{Environment}.json`、环境变量和命令行参数已经默认配置好。
    
5. **最佳实践**：读取配置时，优先使用**选项模式**（`IOptions<T>`），将配置绑定到强类型对象，而不是直接通过字符串键访问 `IConfiguration`。



- **旧时代（扫雷）**：用 XML（`扫雷.exe.config`）。
    
- **新时代（桌宠）**：用 JSON（`appsettings.json`）。
    
- 而且新时代的 .NET **原生支持读取 JSON**（`System.Text.Json`），并把它和依赖注入（DI）容器完美结合。你在 `Program.cs` 里写的那句 `builder.Configuration`，背后就是这套自动生成 JSON 文件的机制在支撑。