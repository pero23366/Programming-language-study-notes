==一：概念==
**1. 什么是“多配置源的优先级”？**  
当同一个配置键（如 `MyKey`）在多个配置源（如 `appsettings.json`、环境变量、命令行参数）中都存在时，.NET 配置系统会按照**配置提供者的注册顺序**来决定最终生效的值：**最后添加的提供者优先级最高，其值会覆盖之前所有提供者的值**。

**2. 默认的配置源顺序**  
在 [ASP.NET](https://asp.net/) Core 的 `WebApplication.CreateBuilder` 中，默认已经添加了多个配置源，它们的优先级从低到高（即注册顺序）通常是：

1. `appsettings.json`
    
2. `appsettings.{Environment}.json`（如 `appsettings.Development.json`）
    
3. 用户机密（User Secrets，仅开发环境）
    
4. 环境变量
    
5. 命令行参数（通过 `args` 传入）
    

这意味着：**命令行参数可以覆盖环境变量，环境变量可以覆盖 JSON 文件中的设置**。

**3. 为什么要这样设计？**  
这种设计实现了**配置的层级覆盖**，非常灵活：

- **基础默认值**放在 `appsettings.json` 中。
    
- **环境差异值**放在 `appsettings.{Environment}.json` 中。
    
- **敏感信息**（如数据库密码）通过**环境变量**注入，不写入代码仓库。
    
- **临时调试**可以通过**命令行参数**覆盖任何配置，无需修改文件。
    

**4. 自定义提供者的优先级**  
当你像 P43 和 P44 那样开发自定义配置提供者（如 `DbConfigProvider`）并使用 `AddDbConfiguration` 添加时，**它的优先级取决于你调用 `Add` 方法的位置**。如果你在 `builder.Configuration` 上调用，它会被添加到默认提供者**之后**，因此**优先级高于**所有默认的配置源。
==二：格式==
**1. 查看默认配置源顺序**  
在 `Program.cs` 中，`builder.Configuration.Sources` 属性可以查看当前所有的配置源及其顺序。

```csharp

var builder = WebApplication.CreateBuilder(args);
// 遍历所有配置源，查看它们的类型和顺序
foreach (var source in builder.Configuration.Sources)
{
    Console.WriteLine(source.GetType().Name);
}
```

**2. 手动调整配置源顺序**  
如果默认顺序不满足需求，可以**清空后重新添加**，以完全自定义优先级。

```csharp

var builder = WebApplication.CreateBuilder(args);
// 1. 清空所有默认配置源
((IConfigurationBuilder)builder.Configuration).Sources.Clear();
// 2. 按你想要的优先级顺序重新添加
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables()
    .AddCommandLine(args);
```

**3. 在自定义提供者中控制优先级**  
在 `AddDbConfiguration` 扩展方法中，你可以选择在 `builder.Configuration` 上调用 `Add`，这样自定义提供者的优先级会**高于**所有默认提供者。

```csharp

// 自定义提供者的优先级高于所有默认源（包括命令行参数）
builder.Configuration.AddDbConfiguration(options => options.UseMySql(connStr));
```
==三：代码==
**. 验证优先级：JSON 被环境变量覆盖**

**第一步：在 `appsettings.json` 中设置默认值**

```json

{
  "MyKey": "from-json"
}
```

**第二步：在 `Program.cs` 中读取并打印**

```csharp

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
Console.WriteLine($"MyKey = {app.Configuration["MyKey"]}");
app.Run();
```

**第三步：测试不同场景**

|场景|操作|控制台输出|
|---|---|---|
|仅 JSON|直接运行|`MyKey = from-json`|
|环境变量覆盖|设置 `MyKey=from-env` 后运行|`MyKey = from-env`|
|命令行覆盖|运行 `dotnet run --MyKey=from-cmd`|`MyKey = from-cmd`|

**2. 验证自定义提供者的优先级**

假设你有一个 `DbConfigProvider`，数据库里 `MyKey` 的值是 `from-db`。

```csharp

var builder = WebApplication.CreateBuilder(args);
// 添加自定义数据库配置源（优先级高于默认源）
builder.Configuration.AddDbConfiguration(options => options.UseMySql(connStr));
var app = builder.Build();
// 数据库中的值会覆盖 JSON 和环境变量中的值
Console.WriteLine($"MyKey = {app.Configuration["MyKey"]}");
// 输出：MyKey = from-db（即使环境变量和 JSON 中都有 MyKey）

```
**3. 查看所有配置源的顺序**

```csharp

var builder = WebApplication.CreateBuilder(args);
// 在添加任何自定义源之前，查看默认顺序
Console.WriteLine("=== 默认配置源顺序（从低到高优先级）===");
foreach (var source in builder.Configuration.Sources)
{
    Console.WriteLine(source.GetType().Name);
}
```

典型输出：

```text

JsonConfigurationSource        // appsettings.json
JsonConfigurationSource        // appsettings.Development.json
EnvironmentVariablesConfigurationSource
CommandLineConfigurationSource
```
==四：总结==

1. **核心规则**：**后注册的覆盖先注册的**。最后添加的配置提供者拥有最高优先级，其值会覆盖之前所有提供者中的同名配置。
    
2. **默认顺序（从低到高）** ：`appsettings.json` → `appsettings.{Environment}.json` → 环境变量 → 命令行参数。
    
3. **自定义提供者的位置**：通过 `Add` 方法添加的自定义提供者，默认排在所有默认源**之后**，因此**优先级最高**。
    
4. **手动控制**：如果默认顺序不满足需求，可以清空 `Sources` 后按自定义顺序重新添加。
    
5. **实战意义**：理解优先级是**排查配置问题**的关键。当你发现某个配置值不符合预期时，首先应该检查是否有更高优先级的配置源覆盖了它。