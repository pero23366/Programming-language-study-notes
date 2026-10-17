==一：概念==
### 1. 从“服务定位器”到“依赖注入”

上节课我们知道，控制反转（IoC）有两种实现方式：

- **服务定位器（Service Locator）**：主动向容器“要”对象。比如 `IDbConnection conn = ServiceLocator.GetService<IDbConnection>();`[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。缺点是代码里到处都是“要”的逻辑，和容器耦合依然紧密。
    
- **依赖注入（Dependency Injection）**：被动接收对象。类只需在构造函数声明需要什么，容器会自动“送”进来。代码更干净，耦合度更低[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。
    

**DI是更优雅的方式**，也是[ASP.NET](https://asp.net/) Core默认使用的方式。

### 2. 服务注册的本质：告诉容器“接口对应哪个实现”

`builder.Services.AddTransient<ITestService, TestServiceImpl>();` 这行代码的意思就是：**“如果以后有人需要 `ITestService`，就给他一个 `TestServiceImpl` 的实例。”**

- **服务类型（ServiceType）**：泛型第一个参数，通常是**接口**（如 `ITestService`），也可以是类[](https://blog.csdn.net/weixin_43847546/article/details/136069971)。
    
- **实现类型（ImplementationType）**：泛型第二个参数，是具体实现类（如 `TestServiceImpl`）。
    
- 如果两者相同（直接注册类），就是“自己注册自己”。
    

**建议**：**优先面向接口编程**，把服务类型写成接口，这样更灵活，方便以后替换实现。

### 3. 服务生命周期：创建和销毁的规则

上一节提到了三种生命周期，这一节会通过代码验证它们：

- **Transient（瞬态）**：每次获取都创建一个**新对象**。
    
- **Scoped（作用域）**：在**同一个作用域内**（比如一次HTTP请求），获取到的是**同一个对象**；不同作用域则是不同对象[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。
    
- **Singleton（单例）**：**整个应用**从头到尾**只有一个对象**。
    

**选择原则**：

- 无状态的类（不保存数据）→ 建议用 **Singleton**。
    
- 有状态且需要作用域控制 → 用 **Scoped**。
    
- 使用 **Transient** 要谨慎，频繁创建可能消耗内存[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。
    

### 4. 构造函数注入 vs. `[FromServices]` 注入

- **构造函数注入**：默认方式，在类的构造函数里声明依赖，容器自动注入。**绝大部分场景都用这种方式**[](https://blog.csdn.net/weixin_43847546/article/details/135472379)。
    
- **`[FromServices]`**：**只在Controller的Action方法参数上使用**。当某个服务**调用频率极低且创建非常消耗资源**（比如扫描全盘文件）时，用构造函数注入会导致每次创建Controller都很慢。此时可以把它放到具体用到的方法参数上，**“用的时候才创建”**，避免拖慢其他不相关的接口[](https://blog.csdn.net/weixin_43847546/article/details/135472379)。
==二：格式==
### 1. 服务注册格式（在 `Program.cs` 中）

```csharp

// 注册接口与实现（推荐）
builder.Services.AddTransient<ITestService, TestServiceImpl>();
builder.Services.AddScoped<IOperationScoped, Operation>();
builder.Services.AddSingleton<IPersonService, PersonService>();
// 只注册类本身（服务类型=实现类型）
builder.Services.AddTransient<TestServiceImpl>();
```

### 2. 构造函数注入格式

```csharp

public class DemoController : ControllerBase
{
    private readonly ITestService _testService;
    public DemoController(ITestService testService) // 容器自动注入
    {
        _testService = testService;
    }
}
```

### 3. `[FromServices]` 格式（仅限Controller的Action）

```csharp

[HttpGet]
public string Get([FromServices] ITestService testService)
{
    return testService.SayHi();
}
```

### 4. 手动构建容器（控制台应用）

```csharp

using Microsoft.Extensions.DependencyInjection;
var services = new ServiceCollection();
services.AddTransient<ITestService, TestServiceImpl>();
using (ServiceProvider sp = services.BuildServiceProvider())
{
    ITestService ts = sp.GetRequiredService<ITestService>();
    ts.SayHi();
}
```

[](https://blog.csdn.net/weixin_42067536/article/details/144304041)
==三：代码==
### 1. 定义服务接口和实现

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

### 2. 在 `Program.cs` 中注册

```csharp

using 你的项目名.Services;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddTransient<ITestService, TestServiceImpl>();
var app = builder.Build();
// ... 中间件配置 ...
```

### 3. 在Controller中注入并使用

```csharp

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    private readonly ITestService _testService;
    public TestController(ITestService testService)
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
services.AddTransient<ITestService, TestServiceImpl>();
using (ServiceProvider sp = services.BuildServiceProvider())
{
    var ts1 = sp.GetRequiredService<ITestService>();
    var ts2 = sp.GetRequiredService<ITestService>();
    Console.WriteLine(object.ReferenceEquals(ts1, ts2)); // False（Transient每次都是新对象）
}

```
[](https://blog.csdn.net/weixin_42067536/article/details/144304041)

### 5. `[FromServices]` 用法示例

```csharp

[HttpGet("slow")]
public string SlowAction([FromServices] ISlowService slowService)
{
    return slowService.DoHeavyWork(); // 只有这个Action才创建slowService
}
```
==四：总结==

1. **服务注册的核心**：在 `Program.cs` 中通过 `builder.Services.AddXxx<接口, 实现>()` 告诉容器“谁来实现谁”。
    
2. **优先面向接口**：服务类型写接口（`ITestService`），实现类型写具体类（`TestServiceImpl`），这样最灵活。
    
3. **三种生命周期**：
    
    - **Transient**：每次新建，适合轻量无状态。
        
    - **Scoped**：一次请求内共享，适合有状态服务。
        
    - **Singleton**：全局唯一，适合无状态、全局服务。
        
4. **构造函数注入是首选**：绝大多数场景都用它。
    
5. **`[FromServices]` 是特例**：只用于Controller的Action，针对**低频且创建成本高**的服务，做到“按需创建”，避免拖慢其他接口。
    
6. **控制台也能用DI**：通过 `ServiceCollection` + `BuildServiceProvider()` 手动构建容器[](https://blog.csdn.net/weixin_42067536/article/details/144304041)。