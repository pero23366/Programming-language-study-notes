==一：概念==
**1. 为什么要用“选项模式”？**

上一节我们用 `_configuration["MyKey"]` 这种字符串索引器来读配置，虽然能跑，但有三个缺点：

- **字符串硬编码**：写错一个字母，编译时发现不了，只有运行时才报错。
    
- **类型不安全**：读出来的永远是 `string`，想变成 `int` 还得自己 `int.Parse`。
    
- **分散难管理**：如果配置有 10 个字段，每个地方都写一遍 `["A:B:C"]`，代码会很乱。
    

**选项模式（Options Pattern）** 就是把一组相关的配置绑定到一个**强类型的类**上。之后你通过 DI 注入这个类，像用普通服务一样使用配置，完全不用再写字符串。

**2. 三种读取方式**

选项模式提供了三种注入方式，它们的区别在于**是否感知配置变化**：

|方式|生命周期|能否读取到配置修改后的新值|适用场景|
|---|---|---|---|
|**`IOptions<T>`**|Singleton|❌ 不会|启动后不再变化的配置|
|**`IOptionsSnapshot<T>`**|Scoped|✅ 会（每次请求重新读取）|需要热更新的配置（推荐）|
|**`IOptionsMonitor<T>`**|Singleton|✅ 会（实时监控）|单例服务中需要热更新|

`IOptionsSnapshot` 会在**每次 HTTP 请求**时重新读取配置，所以一个请求内多次读取得到的是同一份快照，但不同请求之间会拿到最新值[](https://blog.csdn.net/weixin_43847546/article/details/136053080#1)。`IOptionsMonitor` 是单例的，可以随时获取最新值，适合在单例服务中使用。
==二：格式==
**1. 定义强类型配置类**

```csharp

public class MySettings
{
    public string ApiKey { get; set; }
    public int Timeout { get; set; }
}
```

属性名要和 `appsettings.json` 里的键名**完全一致**（不区分大小写）。

**2. 在 `Program.cs` 中绑定**

```csharp

builder.Services.Configure<MySettings>(
    builder.Configuration.GetSection("MySettings"));

```
这行代码的意思是：把 JSON 里 `MySettings` 这个节点下的所有键值对，**自动填充**到 `MySettings` 类的属性上。
### `.Configure<MySettings>(...)`

这是 `IServiceCollection` 的一个**扩展方法**。  
它的作用是告诉 DI 容器：“请帮我做一份 `MySettings` 的配置，并且把它注册到你的花名册里。以后如果有人要 `IOptions<MySettings>`，你就把这份配置给他。”

- `<MySettings>`：泛型参数，表示你要绑定的目标类是 `MySettings`。
    
- `(...)`：括号里的内容是参数，也就是“配置从哪里来”。
    

### `builder.Configuration`

这是应用的**配置系统总入口**，类型是 `IConfiguration`。  
它里面装着所有配置源（`appsettings.json`、环境变量、命令行参数等）合并后的**所有数据**。

### `.GetSection("MySettings")`

这是 `IConfiguration` 的一个方法，用来**从配置树中“切出”某一个节点**。  
你的 `appsettings.json` 是一棵嵌套的树，`GetSection("MySettings")` 就是把 `MySettings` 这个子树切出来，交给 `.Configure()`。

---

**连起来读就是：**

> “往 DI 花名册里注册一个配置服务，把 `appsettings.json` 里 `MySettings` 这个节点的数据，自动绑定到 `MySettings` 这个 C# 类上。”

**3. 在控制器中注入**

```csharp

public class MyController : ControllerBase
{
    private readonly MySettings _settings;
    public MyController(IOptions<MySettings> options)
    {
        _settings = options.Value;  // 取出绑定好的对象
    }
}

```
注入的是 `IOptions<MySettings>`，通过 `.Value` 拿到 `MySettings` 实例。
==三：代码==
```json

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
**2. 定义配置类**

```csharp

public class MySettings
{
    public string ApiKey { get; set; } = string.Empty;
    public int Timeout { get; set; }
}
```

**3. 在 `Program.cs` 中注册**

```csharp

builder.Services.Configure<MySettings>(
    builder.Configuration.GetSection("MySettings"));
```

**4. 在控制器中使用**

```csharp

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly MySettings _settings;
    public SettingsController(IOptionsSnapshot<MySettings> options)
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

**5. 验证热更新（`IOptionsSnapshot` 的核心优势）**

1. 运行项目，访问 `/api/settings`，看到 `ApiKey: abc-123, Timeout: 30`。
    
2. **不要停止项目**，直接把 `appsettings.json` 里的 `"ApiKey"` 改成 `"xyz-789"`，保存文件。
    
3. 刷新浏览器，你会看到 `ApiKey: xyz-789`，**无需重启项目**。
    

这就是 `IOptionsSnapshot` 的“快照”机制：每次请求重新读取配置，但同一个请求内保持一致。
==四：总结==

1. **选项模式的核心**：把配置绑定到强类型类，通过 DI 注入使用，告别字符串索引器。
    
2. **三步走**：定义配置类 → `Configure<T>()` 绑定 → 注入 `IOptions<T>` 并取 `.Value`。
    
3. **三种方式的选择**：
    
    - 不需要热更新 → `IOptions<T>`（最简单）
        
    - 需要热更新且是 Web 请求 → `IOptionsSnapshot<T>`（推荐）
        
    - 需要热更新且在单例服务中 → `IOptionsMonitor<T>`
        
4. **热更新的前提**：`appsettings.json` 必须支持重新加载（默认已开启 `reloadOnChange`）。