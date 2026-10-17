==零：补充==
- **DI 管理的是“对象”**：它管的是“我要用哪个类，这个类活多久”。
    
- **配置系统管理的是“键值对”**：它管的是“字符串 "MyKey" 对应的值是什么”。
    
- 两者在 `Program.cs` 里是**平级**的，井水不犯河水，各自管各自的一摊事。


==一：概念==
**1. 为什么要开发自定义配置提供者？**

(规则管理器)

.NET 内置的配置提供者（JSON、XML、INI、环境变量等）已经覆盖了大部分场景。但当你需要从 **数据库、Redis、配置中心（如 Apollo、Nacos）或公司内部 API** 读取配置时，就需要自己实现一个配置提供者[](https://www.e-com-net.com/article/1756187938854551552.htm#1)。

**2. 配置系统的扩展点：两个核心接口**

.NET 配置系统通过两个接口来扩展配置源：

- **`IConfigurationSource`**：配置源。负责“**告诉系统如何创建一个配置提供者**”。它只有一个 `Build` 方法，返回一个 `IConfigurationProvider`。
    
- **`IConfigurationProvider`**：配置提供者。负责“**真正去读取数据，并加载到配置系统中**”。它包含 `Load`、`TryGet`、`Set` 等方法。
    

**3. 实现自定义提供者的两种方式**

- **方式一**：同时实现 `IConfigurationSource` 和 `IConfigurationProvider` 两个接口。
    
- **方式二（推荐）** ：实现 `IConfigurationSource`，然后**继承 `ConfigurationProvider` 基类**来实现提供者。`ConfigurationProvider` 已经帮你实现了大部分繁琐的字典操作，你只需要专注于 `Load` 方法。
    

**4. 自定义提供者的典型结构**

一个完整的自定义配置提供者通常包含三个部分：

|组件|职责|示例|
|---|---|---|
|**`XxxConfigurationSource`**|配置源，实现 `IConfigurationSource`|`MyConfigSource`|
|**`XxxConfigurationProvider`**|配置提供者，继承 `ConfigurationProvider`|`MyConfigProvider`|
|**`AddXxx` 扩展方法**|便捷注册方法，封装 `Add` 调用|`AddMyConfig()`|
==二：格式==
**1. 实现 `IConfigurationSource`**

```csharp

using Microsoft.Extensions.Configuration;
public class MyConfigSource : IConfigurationSource
{
    public IConfigurationProvider Build(IConfigurationBuilder builder)
    {
        return new MyConfigProvider();
    }
}
```

**2. 继承 `ConfigurationProvider`**

```csharp

using Microsoft.Extensions.Configuration;
public class MyConfigProvider : ConfigurationProvider
{
    public override void Load()
    {
        // 从你的数据源读取数据，填充到 Data 字典中
        Data["MyKey"] = "Hello from custom provider!";
    }
}
```

**3. 编写扩展方法**

```csharp

public static class MyConfigExtensions
{
    public static IConfigurationBuilder AddMyConfig(this IConfigurationBuilder builder)
    {
        return builder.Add(new MyConfigSource());
    }
}
```

**4. 注册到配置系统**

```csharp

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddMyConfig();
```
==三：代码==
**1. 完整示例：从内存字典读取配置**

```csharp

using Microsoft.Extensions.Configuration;
// 配置源
public class MemoryConfigSource : IConfigurationSource
{
    public IConfigurationProvider Build(IConfigurationBuilder builder)
    {
        return new MemoryConfigProvider();
    }
}
// 配置提供者
public class MemoryConfigProvider : ConfigurationProvider
{
    public override void Load()
    {
        // 模拟从外部读取数据
        Data["AppName"] = "MyApp";
        Data["Version"] = "1.0.0";
        Data["Author"] = "YangZhongKe";
    }
}
// 扩展方法
public static class MemoryConfigExtensions
{
    public static IConfigurationBuilder AddMemoryConfig(
        this IConfigurationBuilder builder)
    {
        return builder.Add(new MemoryConfigSource());
    }
}
```

**2. 在 `Program.cs` 中使用**

```csharp

var builder = WebApplication.CreateBuilder(args);
// 添加自定义配置源
builder.Configuration.AddMemoryConfig();
var app = builder.Build();
// 测试读取
var appName = app.Configuration["AppName"];
var version = app.Configuration["Version"];
Console.WriteLine($"AppName = {appName}, Version = {version}");
app.MapControllers();
app.Run();
```

**运行结果**：`AppName = MyApp, Version = 1.0.0`

**3. 进阶：从数据库读取配置（EF Core 示例）**

微软官方文档提供了一个从数据库读取配置的完整示例。核心思路是：

- **定义实体类**：`Settings` 记录类型，包含 `Id` 和 `Value` 两列。
    
- **定义 `DbContext`**：`EntityConfigurationContext`，通过 `DbSet<Settings>` 访问数据库表。
    
- **实现 `IConfigurationSource`**：`EntityConfigurationSource`，返回 `EntityConfigurationProvider`。
    
- **继承 `ConfigurationProvider`**：`EntityConfigurationProvider`，在 `Load()` 方法中从数据库读取所有配置项，填充到 `Data` 字典。
    

```csharp

// 实体类
public record Settings(string Id, string? Value);
// DbContext
public class EntityConfigurationContext : DbContext
{
    public DbSet<Settings> Settings => Set<Settings>();
    // ...
}
// 配置源
public class EntityConfigurationSource : IConfigurationSource
{
    public IConfigurationProvider Build(IConfigurationBuilder builder)
        => new EntityConfigurationProvider();
}
// 配置提供者
public class EntityConfigurationProvider : ConfigurationProvider
{
    public override void Load()
    {
        using var dbContext = new EntityConfigurationContext();
        var settings = dbContext.Settings.ToList();
        foreach (var setting in settings)
        {
            Data[setting.Id] = setting.Value;
        }
    }
}
```
==四：总结==

1. **核心目标**：当内置配置源不够用时，自己实现一个配置提供者，从任意地方（数据库、API、Redis 等）读取配置。
    
2. **两个核心接口**：`IConfigurationSource`（配置源，负责创建提供者）和 `IConfigurationProvider`（配置提供者，负责实际读取数据）。
    
3. **推荐做法**：实现 `IConfigurationSource`，然后**继承 `ConfigurationProvider`** 来写提供者，只需重写 `Load()` 方法。
    
4. **注册方式**：编写 `AddXxx` 扩展方法，让调用方只需写 `builder.Configuration.AddXxx()` 就能添加配置源。
    
5. **实际用途**：P44（Part2-36）会进一步讲解**开发数据库配置提供者**，把配置存到数据库中，实现多个服务器共享配置、统一管理[](https://www.e-com-net.com/article/1756187938854551552.htm#1)。