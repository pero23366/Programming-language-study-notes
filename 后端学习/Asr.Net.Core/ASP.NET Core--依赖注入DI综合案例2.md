==一：概念==
### 1. 从“单服务”到“服务链”

上一节的案例（Part2-29）可能只包含一个孤立的服务。而这节课的核心是**构建一条“服务链”**：一个服务（比如订单服务）本身并不复杂，但它需要依赖其他服务（比如日志服务、配置服务）才能工作。DI 容器的价值，就是**自动解析整条依赖链**，你只需注册好每一个环节。

### 2. 生命周期是本节课的重中之重

当多个服务相互依赖时，**为每个服务选择正确的生命周期**就变得至关重要。如果选错，轻则性能低下，重则引发内存泄漏或数据错乱。本节课会通过案例，让你直观感受 `Transient`、`Scoped`、`Singleton` 在服务链中的实际表现。

### 3. 避免“生命周期陷阱”

有一条铁律：**长生命周期的对象，不能引用短生命周期的对象**。例如，一个 `Singleton` 服务不能依赖一个 `Scoped` 服务。[ASP.NET](https://asp.net/) Core 会在运行时抛出异常来阻止这种危险行为，这是保护机制，而非麻烦。
==二：格式==
### 1. 服务链的注册格式

在 `Program.cs` 中，需要把链上的**每一个服务**都注册好：

```csharp

// 被依赖的服务：无状态，用单例
builder.Services.AddSingleton<ILogService, LogService>();
builder.Services.AddSingleton<IConfigService, ConfigService>();
// 依赖方：有状态，用作用域
builder.Services.AddScoped<IOrderService, OrderService>();

```
### 2. 构造函数注入链式依赖的格式

`OrderService` 的构造函数声明它需要的依赖，容器会自动解析：

```csharp

public class OrderService : IOrderService
{
    private readonly ILogService _log;
    private readonly IConfigService _config;
    // 容器会自动把 ILogService 和 IConfigService 的实例注入进来
    public OrderService(ILogService log, IConfigService config)
    {
        _log = log;
        _config = config;
    }
}
```

### 3. 验证生命周期的格式

在服务的构造函数中打印 `Guid`，观察创建次数：

```csharp

public OrderService(ILogService log, IConfigService config)
{
    _log = log;
    _config = config;
    Console.WriteLine($"OrderService 创建，ID：{Guid.NewGuid().ToString().Substring(0, 8)}");
}
```
==三：代码==
### 1. 定义服务接口和实现类

```csharp

// 日志服务（无状态，单例）
public interface ILogService { void Log(string msg); }
public class LogService : ILogService
{
    public void Log(string msg) => Console.WriteLine($"[LOG] {msg}");
}
// 配置服务（无状态，单例）
public interface IConfigService { string GetConnectionString(); }
public class ConfigService : IConfigService
{
    public string GetConnectionString() => "Server=.;Database=Test;";
}
// 订单服务（有状态，作用域），依赖上面两个服务
public interface IOrderService { void CreateOrder(string productName); }
public class OrderService : IOrderService
{
    private readonly ILogService _log;
    private readonly IConfigService _config;
    public OrderService(ILogService log, IConfigService config)
    {
        _log = log;
        _config = config;
        Console.WriteLine($"OrderService 创建，ID：{Guid.NewGuid().ToString().Substring(0, 8)}");
    }
    public void CreateOrder(string productName)
    {
        _log.Log($"准备连接数据库：{_config.GetConnectionString()}");
        _log.Log($"订单已创建：{productName}");
    }
}
```

### 2. 在 `Program.cs` 中注册服务链

```csharp

// 先注册被依赖的服务（单例）
builder.Services.AddSingleton<ILogService, LogService>();
builder.Services.AddSingleton<IConfigService, ConfigService>();
// 再注册依赖方（作用域）
builder.Services.AddScoped<IOrderService, OrderService>();
```

### 3. 在控制器中使用

```csharp

[ApiController]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;
    public OrderController(IOrderService orderService)
    {
        _orderService = orderService;
    }
    [HttpPost]
    public string Create([FromQuery] string productName)
    {
        _orderService.CreateOrder(productName);
        return "订单已创建";
    }
}

```
### 4. 验证生命周期行为

- **`IOrderService` 注册为 `Scoped`**：每次 HTTP 请求（即每次刷新页面），`OrderService` 的构造函数都会打印一个新的 `Guid`，说明每次请求都创建了新实例。
    
- **`ILogService` 和 `IConfigService` 注册为 `Singleton`**：无论请求多少次，它们的构造函数都只在**程序启动时打印一次**，说明全局只有一个实例。
    

### 5. 故意“踩坑”：长生命周期引用短生命周期

```csharp

// 错误示范：单例依赖了作用域
builder.Services.AddSingleton<IOrderService, OrderService>();
builder.Services.AddScoped<ILogService, LogService>();
// 运行时会抛出异常：
// Cannot consume scoped service 'ILogService' from singleton 'IOrderService'.

```
这个异常是 [ASP.NET](https://asp.net/) Core 的保护机制，防止内存泄漏和数据错乱。
==四：总结==
1. **服务链的构建**：真实的业务服务往往依赖其他服务，你需要把链上的**每一个环节都注册到 DI 容器**中，容器会自动解析整条依赖链。
    
2. **生命周期策略是关键**：**无状态的服务用 `Singleton`**（如日志、配置），**有状态且需要请求级隔离的用 `Scoped`**（如订单服务）。
    
3. **黄金法则**：**“长不能吃短”**——`Singleton` 不能依赖 `Scoped`，否则 [ASP.NET](https://asp.net/) Core 会直接抛异常，防止内存泄漏和数据错乱。
    
4. **验证方法**：在构造函数里打印 `Guid`，通过观察日志中对象的创建次数，就能直观验证三种生命周期的区别。