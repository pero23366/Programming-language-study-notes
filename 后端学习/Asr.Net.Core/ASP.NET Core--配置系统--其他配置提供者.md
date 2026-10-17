==一：概念==
**1. 配置提供者（Configuration Provider）是什么？**

上一节我们用的 `appsettings.json`，其实只是众多配置来源中的一种。.NET 的配置系统被设计成**插件式**的：每一种配置来源，都由一个“配置提供者”负责读取。`appsettings.json` 有对应的 `JsonConfigurationProvider`，环境变量有 `EnvironmentVariablesConfigurationProvider`，命令行参数有 `CommandLineConfigurationProvider`。

**2. 为什么要用“其他”提供者？**

`appsettings.json` 适合存放**默认配置**，但它有三个弱点：

- **不适合存放敏感信息**（密钥、密码），因为文件会被提交到代码仓库。
    
- **不适合按环境动态调整**，比如同一份代码在开发机和服务器上需要连不同的数据库。
    
- **部署后修改不方便**，改了 JSON 还要重新部署。
    

环境变量和命令行参数正好弥补这些弱点：**部署时注入，不写进代码，可以按机器/容器实例灵活覆盖。**

**3. 多配置源的优先级**

当同一个配置键在多个提供者中都存在时，**后注册的提供者会覆盖先注册的**。在 [ASP.NET](https://asp.net/) Core 的默认配置中，优先级从低到高大致是：

```text

appsettings.json → appsettings.{环境}.json → 环境变量 → 命令行参数
```

这意味着：**你可以用环境变量覆盖 JSON 里的默认值，用命令行参数临时覆盖环境变量。**
==二：格式==
**1. 环境变量提供者**

环境变量在注册时不需要额外代码（`WebApplication.CreateBuilder` 已默认包含），但**读取时的命名规则**需要注意：JSON 里的 `"MySettings:ApiKey"` 对应环境变量 `MySettings__ApiKey`（双下划线代替冒号）。

```bash

# Windows CMD
set MySettings__ApiKey=env-abc
# PowerShell
$env:MySettings__ApiKey="env-abc"
# Linux/macOS
export MySettings__ApiKey="env-abc"
```

**2. 命令行参数提供者**

同样默认包含。启动时通过 `args` 传入：

```bash

dotnet run --MySettings:ApiKey=cmd-abc --MySettings:Timeout=60
```

支持多种格式：`--key=value`、`--key value`、`/key=value`、`/key value`，但不能混用。

**3. 手动添加其他提供者（如 INI、XML）**

如果需要在控制台应用中手动构建配置，可以这样添加：

```csharp

var configBuilder = new ConfigurationBuilder();
configBuilder.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
configBuilder.AddIniFile("config.ini", optional: true, reloadOnChange: true);
configBuilder.AddXmlFile("config.xml", optional: true, reloadOnChange: true);
configBuilder.AddEnvironmentVariables();
configBuilder.AddCommandLine(args);
IConfigurationRoot config = configBuilder.Build();
```
==三：代码==
**1. 验证优先级：JSON 被环境变量覆盖**

假设 `appsettings.json` 里：

```json

{
  "MySettings": {
    "ApiKey": "json-abc"
  }
}

```
在 `Program.cs` 中读取并打印：

```csharp

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
// 启动时读取一次，观察优先级
var apiKey = app.Configuration["MySettings:ApiKey"];
Console.WriteLine($"ApiKey = {apiKey}");
app.MapControllers();
app.Run();
```

**测试步骤：**

1. **不设置任何环境变量**，运行项目 → 输出 `ApiKey = json-abc`。
    
2. **设置环境变量** `MySettings__ApiKey=env-abc`，重新运行 → 输出 `ApiKey = env-abc`。**JSON 被覆盖了。**
    
3. **同时传命令行参数** `dotnet run --MySettings:ApiKey=cmd-abc`，再运行 → 输出 `ApiKey = cmd-abc`。**命令行覆盖了环境变量。**
    

**2. 在控制器中读取环境变量配置**

```csharp

[ApiController]
[Route("api/[controller]")]
public class EnvConfigController : ControllerBase
{
    private readonly IConfiguration _config;
    public EnvConfigController(IConfiguration config)
    {
        _config = config;
    }
    [HttpGet]
    public string Get()
    {
        // 环境变量 MySettings__ApiKey 会被自动映射到 MySettings:ApiKey
        return _config["MySettings:ApiKey"] ?? "未配置";
    }
}
```

**3. 手动添加 INI 文件提供者（控制台示例）**

```csharp

using Microsoft.Extensions.Configuration;
var configBuilder = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: true)
    .AddIniFile("config.ini", optional: true);
var config = configBuilder.Build();
Console.WriteLine(config["Database:ConnectionString"]);

```
`config.ini` 内容：

```ini

[Database]
ConnectionString=Server=localhost;Database=Test;
```
==四：总结==

1. **配置提供者是插件**：`appsettings.json` 只是其中一种。环境变量、命令行、INI、XML、注册表、Azure Key Vault 等都可以作为配置来源。
    
2. **优先级规则**：**后注册的覆盖先注册的**。在默认配置中，命令行参数优先级最高，其次是环境变量，最后才是 JSON 文件。
    
3. **环境变量的命名**：JSON 里的 `A:B:C` 对应环境变量 `A__B__C`（双下划线代替冒号）。
    
4. **实际用途**：部署时用环境变量注入数据库连接字符串和密钥，不写入代码仓库；临时调试用命令行参数覆盖。
    
5. **下一步**：P43（Part2-35）会讲**如何开发自己的配置提供者**，从“使用者”变成“创造者”，比如从数据库或配置中心读取配置。