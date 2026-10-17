==零：补充==
1. IDE 报错是编译时，日志报错是运行时。
    
2. DEBUG/RELEASE 是编译模式，Debug 日志级别是记录详略程度。
    
3. `Console` 是最原始的打印，日志系统的 `Console` 是带管理功能的打印。
    
4. 日志是你自己手动埋点，程序运行时根据配置自动记录的“行车记录仪”
==一：概念==
**1. 什么是日志（Logging）？**

日志就像程序的 **“黑匣子”** 。它记录了程序在运行过程中发生的关键事件、错误信息、用户操作等。当程序出现问题时，你可以通过查看日志来定位问题、分析原因。没有日志的程序，就像一架没有黑匣子的飞机，一旦出事，根本不知道发生了什么。

**2. 为什么需要日志系统？**

在开发和生产环境中，你无法总是通过调试器去跟踪程序的运行。日志系统提供了一种**持久化记录**的手段，让你能够在程序运行后回顾和分析其行为。这对于排查错误、监控系统健康状态、审计用户操作都至关重要。

**3. 日志级别（Log Level）**

日志级别决定了哪些日志需要被记录。.NET 的日志级别从低到高依次为：

|级别|说明|
|---|---|
|**Trace**|最详细的日志，包含最细微的调试信息，通常只在开发调试时使用。|
|**Debug**|用于调试的日志，比 Trace 级别稍高。|
|**Information**|记录程序的正常操作，如用户登录、请求处理完成等。|
|**Warning**|表示可能有问题，但程序仍能继续运行的情况。|
|**Error**|表示程序发生了错误，但可能还能继续运行。|
|**Critical**|最严重的错误，通常会导致程序崩溃或无法继续运行。|

日志级别越高，记录的信息越少。例如，如果你将日志级别设置为 `Warning`，那么 `Trace`、`Debug` 和 `Information` 级别的日志将不会被记录，只有 `Warning`、`Error` 和 `Critical` 级别的日志会被记录。

**4. 日志提供者（Logging Provider）**

日志提供者决定了日志**输出到哪里**。.NET 内置了多种提供者，例如：

- **Console**：输出到控制台。
    
- **Debug**：输出到调试窗口。
    
- **`EventSource`**：输出到事件跟踪。
    
- `**EventLog**`：输出到 Windows 事件日志。
    

你还可以使用第三方提供者（如 NLog、Serilog）将日志写入文件、数据库、或发送到远程日志服务器。

**5. 结构化日志（Structured Logging）**

传统的日志只是一段纯文本字符串。结构化日志则要求日志以**结构化的格式**（如 JSON）记录，包含**键值对**信息。这使得日志更容易被程序解析、查询和分析。例如，你可以方便地筛选出“所有来自 IP 地址为 192.168.1.1 的错误日志”。

**6. 依赖注入与日志**

.NET 的日志系统与依赖注入（DI）无缝集成。你只需要在类的构造函数中注入 `ILogger<T>`，框架就会自动为你提供一个日志对象。`T` 通常是当前类的类型，这样日志中就会自动包含类的名称，方便定位来源。
==二：格式==
**1. 注入 `ILogger<T>`**

```csharp

public class MyController : ControllerBase
{
    private readonly ILogger<MyController> _logger;
    public MyController(ILogger<MyController> logger)
    {
        _logger = logger;
    }
}
```

**2. 记录日志**

```csharp

_logger.LogInformation("用户 {UserId} 登录成功", userId);
_logger.LogWarning("请求处理时间超过 {Timeout} 毫秒", elapsedMs);
_logger.LogError(ex, "处理订单 {OrderId} 时发生错误", orderId);
```

**3. 在 `appsettings.json` 中配置日志级别**

```json

{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

上述配置表示：默认日志级别为 `Information`，但 `Microsoft.AspNetCore` 命名空间下的日志只记录 `Warning` 及以上级别。

**4. 添加日志提供者（在 `Program.cs` 中）**

```csharp

var builder = WebApplication.CreateBuilder(args);
// 默认已添加 Console、Debug、EventSource 等提供者
// 你可以显式添加其他提供者，例如：
builder.Logging.AddConsole();
builder.Logging.AddDebug();
```
==三：代码==
**1. 在控制器中记录日志**

```csharp

[ApiController]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    private readonly ILogger<OrderController> _logger;
    public OrderController(ILogger<OrderController> logger)
    {
        _logger = logger;
    }
    [HttpPost]
    public IActionResult CreateOrder([FromBody] Order order)
    
    {
        _logger.LogInformation("开始创建订单，订单号：{OrderId}", order.Id);
        try
        {
            // 业务逻辑...
            _logger.LogInformation("订单 {OrderId} 创建成功", order.Id);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建订单 {OrderId} 失败", order.Id);
            return StatusCode(500, "服务器内部错误");
        }
    }
}
```

`==🟡public IActionResult CreateOrder([FromBody] Order order)==`

### 2. `IActionResult`

这是方法的**返回类型**。它是一个**接口**，代表“HTTP 响应的结果”。

为什么用它而不是直接返回 `string` 或 `Order`？  
因为它可以表示**多种响应状态**：

|返回内容|含义|对应的 HTTP 状态码|
|---|---|---|
|`Ok(data)`|成功，返回数据|200|
|`NotFound()`|找不到资源|404|
|`BadRequest("参数错误")`|请求参数有问题|400|
|`StatusCode(500)`|服务器内部错误|500|

**如果你返回 `string`，就只能返回一段文本，没法表达“404”或“500”这些状态。** 用 `IActionResult`，就能根据业务情况灵活返回不同状态。

---

### 3. `CreateOrder`

方法名。名字随便起，但建议用**动词+名词**，见名知意。这个方法叫“创建订单”。

---

### 4. `([FromBody] Order order)`

这是方法的**参数**，包含两个部分：

**`[FromBody]`**：这是一个**特性（Attribute）**，告诉 [ASP.NET](https://asp.net/) Core：

> “这个参数的值，从 HTTP 请求的**请求体（Body）** 里拿，不要从 URL 或 Query 里拿。”

**请求体是什么？**  
当你用 POST 方式发送请求时，数据通常放在请求体里，格式一般是 JSON。比如前端发来：


```json
{
  "id": 1001,
  "productName": "苹果",
  "quantity": 3
}
```

`[FromBody]` 就是告诉框架：“把这段 JSON 解析成 `Order` 对象。”

**`Order order`**：参数类型是 `Order`（你定义的一个类），参数名叫 `order`。  
框架会自动把 JSON 反序列化成 `Order` 对象，赋值给 `order` 参数。你在方法里就可以直接用 `order.Id`、`order.ProductName`。

---

### 合起来读

> “这是一个公开的方法，名字叫 `CreateOrder`，返回一个 HTTP 响应结果。它接收一个参数，这个参数的值从请求体里的 JSON 解析而来，类型是 `Order`，名字叫 `order`。”
**2. 验证日志输出**

1. 运行项目。
    
2. 调用 `CreateOrder` 接口。
    
3. 在 **Visual Studio 的“输出”窗口**或**控制台**中，你会看到类似以下的日志：
    

```text

info: MyApp.Controllers.OrderController[0]
      开始创建订单，订单号：1001
info: MyApp.Controllers.OrderController[0]
      订单 1001 创建成功
```


### 对比：不加 `[FromBody]` 会怎样？

如果写成：
```
csharp

public IActionResult CreateOrder(Order order)
```

框架会尝试从 **URL 的 Query 参数**里解析，比如 `/api/order?id=1&productName=苹果`。但对于复杂的嵌套对象，Query 参数很难表达，所以 POST 请求通常必须加 `[FromBody]`。

---

### 一个常见的坑

`[FromBody]` 在**一个方法里只能出现一次**。因为 HTTP 请求体只能被读一次。如果你想传多个对象，要么把它们合并成一个类，要么用 Query 参数传其他的。
**3. 自定义日志级别**

你可以在 `appsettings.json` 中调整日志级别，观察哪些日志会被输出：

```json

{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "MyApp.Controllers": "Debug"
    }
  }
}

```
上述配置表示：默认只记录 `Warning` 及以上级别，但 `MyApp.Controllers` 命名空间下的日志记录 `Debug` 及以上级别。
==四：总结==

1. **日志是程序的黑匣子**：用于记录运行事件、排查问题、监控系统。
    
2. **日志级别**：从低到高为 `Trace` < `Debug` < `Information` < `Warning` < `Error` < `Critical`。级别越高，记录的信息越少。
    
3. **日志提供者**：决定日志输出到哪里，如控制台、文件、数据库等。.NET 内置了 Console、Debug 等提供者。
    
4. **结构化日志**：以键值对形式记录日志，便于程序解析和查询。
    
5. **依赖注入**：通过构造函数注入 `ILogger<T>` 即可记录日志，无需手动创建。
    
6. **配置**：可以在 `appsettings.json` 中灵活配置日志级别和提供者。