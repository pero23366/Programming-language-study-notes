==一：概念==
#### 1. 什么是“结构化日志”？

- **传统日志（非结构化）**：就是一段纯文本，如 `用户 张三 登录成功`。机器很难从中自动提取“用户是谁”、“做了什么”。
    
- **结构化日志**：日志本质上是**键值对**（像 JSON）。比如 `{ "User": "张三", "Action": "Login", "Level": "Info" }`。它**为机器设计**，方便程序自动解析、筛选和统计。
    

#### 2. 为什么需要“集中日志服务”？

当你的应用部署在多台服务器（集群）上时，如果日志还分散在各台机器的本地文件里，排查问题会非常痛苦。

**集中日志服务**就是设立一个**中央日志仓库**。所有服务器上的应用，都把日志统一发送到这个中心。你可以在一个地方搜索、分析所有服务器的日志。常见的方案有 **ELK**（Elasticsearch + Logstash + Kibana）或 **Seq** 等。

#### 3. 核心技术：Serilog

在 .NET 生态中，实现结构化日志和集中日志的事实标准是 **Serilog**。它天生就是为了处理结构化数据而设计的。
==二：格式==
#### 1. 安装 NuGet 包

- **核心包**：`Serilog.AspNetCore`
    
- **输出目标（Sink）包**：比如输出到控制台用 `Serilog.Sinks.Console`，输出到文件用 `Serilog.Sinks.File`。
    

#### 2. 在 `Program.cs` 中配置

```csharp

using Serilog;
var builder = WebApplication.CreateBuilder(args);
// 1. 配置 Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information() // 设置最低日志级别
    .Enrich.FromLogContext() // 从上下文丰富日志信息
    .WriteTo.Console() // 输出到控制台
    .WriteTo.File("logs/myapp-.txt", // 输出到文件，按天滚动
                  rollingInterval: RollingInterval.Day) 
    .CreateLogger();
// 2. 将 Serilog 注册到 .NET 的日志管道
builder.Host.UseSerilog(); 
// ... 后续代码
```
==三：代码==
#### 1. 记录结构化日志

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
        // 关键：使用 {占位符} 来记录结构化数据
        _logger.LogInformation("用户 {UserId} 创建了订单 {OrderId}，金额为 {Amount}", 
            order.UserId, order.Id, order.Amount);
        
        // ...
        return Ok();
    }
}

```
#### 2. 日志的输出格式

**控制台/文件里**，你看到的会是类似这样的文本：  
`[20:45:00 INF] 用户 123 创建了订单 1001，金额为 99.9`

但在**集中日志服务**（如 Seq）中，这条日志会被解析成可查询的结构化数据：

|UserId|OrderId|Amount|
|---|---|---|
|123|1001|99.9|

这样，你就可以在 Seq 里轻松查询“所有 UserId 为 123 的订单”或“Amount 大于 500 的订单”。

==四：总结==

1. **结构化日志**：将日志从“文本”升级为“数据”，让机器能读懂、能查询。
    
2. **集中日志服务**：将所有服务器日志汇聚到一处（如 ELK、Seq），方便统一分析和告警。
    
3. **Serilog**：.NET 中实现上述两者的首选框架，通过 `Sink` 将日志发送到不同目标。
    
4. **代码写法**：依然使用标准的 `ILogger<T>` 接口，但**务必使用 `{占位符}` 的写法**来记录结构化数据。