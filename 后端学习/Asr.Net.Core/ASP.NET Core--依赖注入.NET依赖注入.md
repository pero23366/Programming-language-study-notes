==一：概念==
### 1. 依赖注入（DI）的本质

依赖注入（DI）是**控制反转（IoC）思想**的实现方式之一。它的核心是：**一个类不应自己创建它所需要的对象，而应由外部容器将对象“注入”进来**。

在 .NET 中，DI 容器是内置的，它负责：

- **服务注册**：告诉容器“接口”和“实现类”的对应关系。
    
- **服务解析**：在需要时，自动创建对象并注入到类的构造函数中。
    
- **生命周期管理**：决定对象是每次新建、每次请求共用一个，还是全局只创建一个。
    

### 2. .NET 中 DI 的标准使用流程

在 .NET 控制台或 Web 应用中，使用 DI 的标准流程如下[](https://blog.csdn.net/weixin_42067536/article/details/144304041)：

1. **创建容器**：`ServiceCollection` 是 .NET 中 DI 容器的默认实现。
    
2. **注册服务**：使用 `AddTransient`、`AddScoped`、`AddSingleton` 等方法，向容器注册接口和实现类。
    
3. **构建容器**：调用 `BuildServiceProvider()` 创建一个 `ServiceProvider`，它就是实际的 DI 容器。
    
4. **获取服务**：通过 `GetRequiredService<T>()` 从容器中获取服务实例。

3.

|生命周期|注册方法|行为|适用场景|
|---|---|---|---|
|**Transient**|`AddTransient`|每次获取都创建**新实例**|轻量级、无状态的服务|
|**Scoped**|`AddScoped`|每个作用域（如一次HTTP请求）内**共用一个实例**|有状态、需要请求级共享的服务|
|**Singleton**|`AddSingleton`|整个应用**只创建一个实例**|全局唯一、无状态的服务|
==二：格式==
### 1. 控制台应用中手动使用 DI 的格式

```csharp

using Microsoft.Extensions.DependencyInjection;
// 1. 创建容器
var services = new ServiceCollection();
// 2. 注册服务
services.AddTransient<ITestService, TestServiceImpl>();
// 3. 构建容器
using (ServiceProvider sp = services.BuildServiceProvider())
{
    // 4. 获取服务
    ITestService ts = sp.GetRequiredService<ITestService>();
    ts.SayHi();
}
```

### 2. [ASP.NET](https://asp.net/) Core 中 DI 的格式

```csharp

var builder = WebApplication.CreateBuilder(args);
// 注册服务（在 Program.cs 中）
builder.Services.AddTransient<ITestService, TestServiceImpl>();
builder.Services.AddScoped<IOperationScoped, Operation>();
builder.Services.AddSingleton<IPersonService, PersonService>();
var app = builder.Build();
```

### 3. 构造函数注入的格式

```csharp

public class DemoController : ControllerBase
{
    private readonly ITestService _testService;
    // 容器会自动把 ITestService 的实例注入进来
    public DemoController(ITestService testService)
    {
        _testService = testService;
    }
}
```

==三：代码==
### 1. 定义服务接口和实现类

```csharp

public interface ITestService
{
    string Name { get; set; }
    void SayHi();
}
public class TestServiceImpl : ITestService
{
    public string Name { get; set; }
    public void SayHi() => Console.WriteLine($"Hi, I'm {Name}");
}

```
### 2. 控制台应用中使用 DI（手动构建容器）

```csharp

using Microsoft.Extensions.DependencyInjection;
var services = new ServiceCollection();
services.AddTransient<ITestService, TestServiceImpl>();
using (ServiceProvider sp = services.BuildServiceProvider())
{
    var ts1 = sp.GetRequiredService<ITestService>();
    ts1.Name = "Tom";
    ts1.SayHi();
    var ts2 = sp.GetRequiredService<ITestService>();
    ts2.Name = "Jack";
    ts2.SayHi();
    // 验证 Transient：两个对象不是同一个实例
    Console.WriteLine(object.ReferenceEquals(ts1, ts2)); // False
}
```

### 3. [ASP.NET](https://asp.net/) Core 中完整使用 DI

```csharp

// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddTransient<ITestService, TestServiceImpl>();
var app = builder.Build();
app.MapControllers();
app.Run();

```
```csharp

// DemoController.cs
[ApiController]
[Route("api/[controller]")]
public class DemoController : ControllerBase
{
    private readonly ITestService _testService;
    public DemoController(ITestService testService)
    {
        _testService = testService;
    }
    [HttpGet]
    public string Get()
    {
        _testService.Name = "Tom";
        _testService.SayHi();
        return "Done";
    }
}
```

### 4. 验证生命周期（控制台示例）

```csharp

var services = new ServiceCollection();
// 测试 Transient
services.AddTransient<ITestService, TestServiceImpl>();
var sp = services.BuildServiceProvider();
var t1 = sp.GetRequiredService<ITestService>();
var t2 = sp.GetRequiredService<ITestService>();
Console.WriteLine($"Transient 是否相同：{object.ReferenceEquals(t1, t2)}"); // False
```

==四：总结==

1. **DI 的本质**：依赖注入是控制反转的实现方式，让类从“自己 new”变为“接收外部注入”，降低耦合度。
    
2. **.NET 中的标准流程**：创建 `ServiceCollection` → 注册服务 → `BuildServiceProvider()` → `GetRequiredService<T>()` 获取服务[](https://blog.csdn.net/weixin_42067536/article/details/144304041)。
    
3. **三种生命周期**：`Transient` 每次新建，`Scoped` 一次请求共享，`Singleton` 全局唯一。
    
4. **构造函数注入是首选**：在 [ASP.NET](https://asp.net/) Core 中，框架会自动把注册的服务注入到控制器的构造函数中。
    
5. **手动构建容器的场景**：在控制台应用或类库中，可以通过 `ServiceCollection` 手动构建 DI 容器，验证服务注册和生命周期。