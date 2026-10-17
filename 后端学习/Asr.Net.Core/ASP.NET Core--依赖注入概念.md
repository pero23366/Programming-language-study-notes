==一：概念==

依赖注入（DI）是实现**控制反转（IoC）** 的一种方式[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。核心思想是：**不要在类内部自己 `new` 依赖对象，而是让外部把依赖“送进来”**。

在[ASP.NET](https://asp.net/) Core中，DI是内置的，通过 `builder.Services` 注册服务。


**什么是依赖注入？**

**依赖注入（Dependency Injection，简称DI）** 是一种设计模式，用于实现对象与其依赖关系之间的**松耦合**。它的核心思路很简单：**不要在类内部自己创建依赖，而是让外部把依赖“送进来”**[](https://developer.aliyun.com/article/1767975)。

==二：格式==
**注册**（在 `Program.cs`）：

```csharp

builder.Services.AddTransient<接口, 实现类>();
builder.Services.AddScoped<接口, 实现类>();
builder.Services.AddSingleton<接口, 实现类>();
```
逐行拆解：

- **`var builder = WebApplication.CreateBuilder(args);`**  
    创建Web应用构建器，`builder.Services` 就是**DI容器**，用来存放所有服务。
    
- **`builder.Services.AddTransient<ITestService, TestServiceImpl>();`**  
    注册**瞬态（Transient）** 服务。`ITestService`是接口，`TestServiceImpl`是实现类。  
    **特点**：每次请求这个服务，都创建一个**新对象**。
    
- **`builder.Services.AddScoped<IOperationScoped, Operation>();`**  
    注册**作用域（Scoped）** 服务。  
    **特点**：在**一个HTTP请求**内，多次获取拿到的是**同一个对象**；不同请求则是不同对象。
    
- **`builder.Services.AddSingleton<IPersonService, PersonService>();`**  
    注册**单例（Singleton）** 服务。  
    **特点**：整个应用**只创建一个对象**，所有地方共用。
    
- **`var app = builder.Build();`**  
    根据注册信息构建应用。之后控制器里写 `public UserController(IEmailSender sender)`，容器就会自动创建并注入对应实例。

### 如何选择生命周期？

- **Transient（瞬态）**：用于**轻量、无状态**的服务，用完即走。
    
- **Scoped（作用域）**：用于**一次请求内需要共享状态**的服务，比如数据库上下文。
    
- **Singleton（单例）**：用于**全局唯一、无状态**的服务，比如配置读取、日志记录。
    

选择时注意：**不要在长生命周期的对象中引用短生命周期的对象**，否则会引发错误[](https://www.e-com-net.com/article/1759944598702092288.htm#1)。
**使用**（通过构造函数注入）：

```csharp

public class SomeController : ControllerBase
{
    private readonly IEmailSender _sender;
    public SomeController(IEmailSender sender) // 容器自动注入
    {
        _sender = sender;
    }
}
```
==三：代码==
**定义接口和实现**：

```csharp

public interface IEmailSender { void Send(string to, string msg); }
public class EmailSender : IEmailSender
{
    public void Send(string to, string msg) 
        => Console.WriteLine($"邮件发往 {to}: {msg}");
}
```

**注册与使用**：

```csharp

// Program.cs
builder.Services.AddTransient<IEmailSender, EmailSender>();
```

```csharp

// 控制器
[ApiController]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    private readonly IEmailSender _sender;
    public OrderController(IEmailSender sender) => _sender = sender;
    [HttpPost]
    public string PlaceOrder()
    {
        _sender.Send("test@example.com", "订单已确认");
        return "订单已处理";
    }
}
```
==四：总结==