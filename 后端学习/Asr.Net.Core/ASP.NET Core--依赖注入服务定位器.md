==一：概念==
### 1. 什么是服务定位器？

服务定位器（Service Locator）是**控制反转（IoC）的另一种实现方式**。它与依赖注入的区别在于“获取依赖的方式”：

- **依赖注入（DI）**：被动接收。类在构造函数中声明需要什么，容器自动“送”进来。
    
- **服务定位器**：主动索取。类通过一个“定位器”对象，主动向容器“要”服务。
    

在 .NET 中，`IServiceProvider` 就是内置的服务定位器接口[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。

### 2. 两种方式的代码对比

```csharp

// 服务定位器：主动向容器“要”
IDbConnection conn = ServiceLocator.GetService<IDbConnection>();
// 依赖注入：容器自动“送”
public class Demo
{
    public IDbConnection Conn { get; set; } // 框架自动赋值
}
```

### 3. 为什么需要服务定位器？

虽然构造函数注入是首选，但有些场景无法使用它：

- **静态类**：静态方法中无法通过构造函数注入。
    
- **遗留代码**：旧代码需要改造，但不想大动结构。
    
- **动态获取**：需要在运行时根据条件决定获取哪个服务。
    

### 4. 服务定位器的“坏味道”

服务定位器虽然能用，但通常被认为是**反模式（Anti-Pattern）**。因为它把“依赖关系”隐藏在方法内部，从类的构造函数上看不出它依赖了什么，增加了代码的隐晦性[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。
==二：格式==
### 1. 获取 `IServiceProvider` 的方式

在 [ASP.NET](https://asp.net/) Core 中，可以通过以下方式获取服务定位器：

- **通过构造函数注入**：`IServiceProvider` 本身也可以被注入。
    
- **通过 `HttpContext.RequestServices`**：在 Controller 中直接访问。
    

### 2. 服务定位器的核心方法

`IServiceProvider` 提供了两个核心方法：

```csharp

// GetService：获取不到时返回 null
T GetService<T>();
// GetRequiredService：获取不到时抛出异常（推荐）
T GetRequiredService<T>();

`GetRequiredService` 是扩展方法，位于 `Microsoft.Extensions.DependencyInjection` 命名空间[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。

```
### 3. 在 Controller 中使用

```csharp

[ApiController]
[Route("api/[controller]")]
public class DemoController : ControllerBase
{
    private readonly IServiceProvider _serviceProvider;
    public DemoController(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }
    [HttpGet]
    public string Get()
    {
        // 主动向容器“要”服务
        var service = _serviceProvider.GetRequiredService<ITestService>();
        return service.SayHi();
    }
}
```
==三：代码==
### 1. 定义服务接口和实现

```csharp

public interface ITestService
{
    string SayHi();
}
public class TestServiceImpl : ITestService
{
    public string SayHi() => "Hello from Service Locator!";
}
```

### 2. 在 `Program.cs` 中注册

```csharp

builder.Services.AddTransient<ITestService, TestServiceImpl>();
```

### 3. 在 Controller 中使用服务定位器

```csharp

using Microsoft.Extensions.DependencyInjection;
[ApiController]
[Route("api/[controller]")]
public class DemoController : ControllerBase
{
    private readonly IServiceProvider _serviceProvider;
    public DemoController(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }
    [HttpGet]
    public string Get()
    {
        var service = _serviceProvider.GetRequiredService<ITestService>();
        return service.SayHi();
    }
}

```
### 4. 在静态类中使用服务定位器

```csharp

public static class MyStaticHelper
{
    public static string DoWork(IServiceProvider serviceProvider)
    {
        var service = serviceProvider.GetRequiredService<ITestService>();
        return service.SayHi();
    }
}
```
==四：总结==

1. **服务定位器的本质**：通过 `IServiceProvider` 主动向容器“要”服务，是控制反转的另一种实现方式[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。
    
2. **核心方法**：`GetService<T>()` 获取不到返回 null；`GetRequiredService<T>()` 获取不到抛异常（推荐使用）。
    
3. **与依赖注入的区别**：依赖注入是“被动接收”，服务定位器是“主动索取”。
    
4. **优先使用依赖注入**：构造函数注入更清晰、更安全，能一眼看出类的依赖关系。服务定位器通常被视为反模式，只应在无法使用构造函数注入的场景下使用[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。
    
5. **使用场景**：静态类、遗留代码改造、动态获取服务等。