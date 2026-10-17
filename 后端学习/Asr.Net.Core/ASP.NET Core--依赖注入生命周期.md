==一：概念==
### . 什么是服务生命周期？

当DI容器需要创建一个服务实例时，它需要知道一个规则：**“这个对象，我该创建几次？什么时候创建？什么时候销毁？”** 这就是生命周期。

### 2. 三种生命周期

- **Transient（瞬态）**：每次从容器中获取服务时，都创建一个**全新的对象**[](https://blog.csdn.net/weixin_42067536/article/details/144304041)。适合**轻量级、无状态**的服务。
    
- **Scoped（作用域）**：在**同一个作用域内**（例如一次HTTP请求），获取到的是**同一个对象**；超出这个作用域，就会创建新对象[](https://blog.csdn.net/weixin_42067536/article/details/144304041)。适合**有状态且需要请求级共享**的服务。
    
- **Singleton（单例）**：**整个应用从头到尾只创建一个对象**，所有地方都共享这一个[](https://blog.csdn.net/weixin_42067536/article/details/144304041)。适合**全局唯一、无状态**的服务。
    

### 3. 如何选择生命周期？

- **无状态的类** → 建议用 **Singleton**（全局共享，性能最好）
    
- **有状态且需要作用域控制** → 用 **Scoped**（同一次请求内共享，不同请求隔离）
    
- **使用 Transient 要谨慎** → 频繁创建可能消耗内存
==二：格式==
### 1. 注册格式（在 `Program.cs` 中）

```csharp

builder.Services.AddTransient<ITestService, TestServiceImpl>();
builder.Services.AddScoped<IOperationScoped, Operation>();
builder.Services.AddSingleton<IPersonService, PersonService>();
```

### 2. 控制台手动验证格式

```csharp

using Microsoft.Extensions.DependencyInjection;
var services = new ServiceCollection();
services.AddTransient<ITestService, TestServiceImpl>();
using (ServiceProvider sp = services.BuildServiceProvider())
{
    var ts1 = sp.GetRequiredService<ITestService>();
    var ts2 = sp.GetRequiredService<ITestService>();
    Console.WriteLine(object.ReferenceEquals(ts1, ts2)); // False
}

[](https://blog.csdn.net/weixin_42067536/article/details/144304041)
```

### 3. 在 Controller 中注入使用

```csharp

public class DemoController : ControllerBase
{
    private readonly ITestService _testService;
    public DemoController(ITestService testService)
    {
        _testService = testService;
    }
}
```
==三：代码==
### 1. 定义带“身份证”的服务（方便验证）

```csharp

public interface ILifeCycleService
{
    string GetId();
}
public class LifeCycleService : ILifeCycleService
{
    // 每个对象出生时生成一个独一无二的8位身份证号
    private readonly string _id = Guid.NewGuid().ToString().Substring(0, 8);
    public string GetId() => _id;
}
```

### 2. 在 `Program.cs` 中注册

```csharp

// 先测试 Transient
builder.Services.AddTransient<ILifeCycleService, LifeCycleService>();
```

### 3. 控制器：一次请求要两个服务

```csharp

[ApiController]
[Route("api/[controller]")]
public class LifeCycleController : ControllerBase
{
    private readonly ILifeCycleService _service1;
    private readonly ILifeCycleService _service2;
    public LifeCycleController(ILifeCycleService service1, ILifeCycleService service2)
    {
        _service1 = service1;
        _service2 = service2;
    }
    [HttpGet]
    public string Get()
    {
        return $"服务1：{_service1.GetId()}\n服务2：{_service2.GetId()}";
    }
}
```

### 4. 验证三种生命周期

**测试1：Transient**

- 注册：`AddTransient<ILifeCycleService, LifeCycleService>()`
    
- 访问 `/api/lifecycle`，**服务1和服务2的ID不同**（每次获取都创建新对象）。
    
- 刷新页面，ID全部改变。
    

**测试2：Scoped**

- 注册：`AddScoped<ILifeCycleService, LifeCycleService>()`
    
- 访问 `/api/lifecycle`，**服务1和服务2的ID相同**（同一次请求内共享）。
    
- 刷新页面（新的请求），ID改变。
    

**测试3：Singleton**

- 注册：`AddSingleton<ILifeCycleService, LifeCycleService>()`
    
- 访问 `/api/lifecycle`，**服务1和服务2的ID相同**。
    
- 疯狂刷新页面，**ID永远不变**（全局唯一）。
    

### 5. 控制台验证 Scoped 的“作用域”

```csharp

var services = new ServiceCollection();
services.AddScoped<ITestService, TestServiceImpl>();
var sp = services.BuildServiceProvider();
// 作用域1
using (var scope1 = sp.CreateScope())
{
    var a = scope1.ServiceProvider.GetRequiredService<ITestService>();
    var b = scope1.ServiceProvider.GetRequiredService<ITestService>();
    Console.WriteLine($"作用域1内是否相同：{object.ReferenceEquals(a, b)}"); // True
}
// 作用域2
using (var scope2 = sp.CreateScope())
{
    var c = scope2.ServiceProvider.GetRequiredService<ITestService>();
    Console.WriteLine($"作用域1和2是否相同：{object.ReferenceEquals(a, c)}"); // False
}
```

[](https://blog.csdn.net/qq_32979811/article/details/145807056#1)
==四：总结==

|生命周期|注册方法|一次请求内|多次请求间|适用场景|
|---|---|---|---|---|
|**Transient**|`AddTransient`|每次不同|每次不同|轻量级、无状态|
|**Scoped**|`AddScoped`|相同|不同|数据库上下文等请求级服务|
|**Singleton**|`AddSingleton`|相同|相同（永远）|配置、日志等全局服务|

**核心要点**：

1. **Transient**：每次获取都是新对象，适合轻量级服务。
    
2. **Scoped**：一次HTTP请求内共享同一个对象，适合有状态的服务。
    
3. **Singleton**：全局只有一个对象，适合无状态、全局共享的服务。
    
4. **选择原则**：无状态用 Singleton，有状态用 Scoped，Transient 谨慎使用。
    
5. **验证方法**：用 `Guid` 生成身份证号，对比多次请求中ID是否变化，就能直观看出区别。