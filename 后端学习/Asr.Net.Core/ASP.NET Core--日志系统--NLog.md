### 为什么需要 NLog？

上一节学的 .NET 内置日志，虽然能输出到“控制台”和“调试窗口”，但它的“日志提供者”非常有限，**尤其缺少一个能把日志写入“文本文件”的内置功能**[](https://www.e-com-net.com/article/1709854736762613760.htm#1)。在真实的生产环境里，程序部署到服务器后，你不可能一直盯着控制台，**把日志写入文件**是排查问题的基本需求。NLog 就是解决这个问题的**老牌第三方日志框架**，它能灵活地把日志输出到文件、数据库、邮件、甚至远程日志服务器[](https://www.e-com-net.com/article/1709854736762613760.htm#1)。

### ⚙️ 如何使用 NLog？

NLog 的使用遵循“安装 → 配置 → 启用”的流程。

**1. 安装 NuGet 包**  
在 NuGet 包管理器中搜索并安装 **`NLog.Extensions.Logging`**（或 `NLog.Web.AspNetCore`）[](https://www.e-com-net.com/article/1709854736762613760.htm#1)[](https://cloud.tencent.com.cn/developer/article/2558407?from=15425&frompage=seopage#1)。

**2. 创建 `nlog.config` 配置文件**  
在项目根目录下新建一个名为 `nlog.config` 的 XML 文件（注意文件名全小写，以兼容 Linux 系统）[](https://www.e-com-net.com/article/1709854736762613760.htm#1)。这是一个基础配置模板：

```xml

<?xml version="1.0" encoding="utf-8" ?>
```
<nlog xmlns="http://www.nlog-project.org/schemas/NLog.xsd"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      autoReload="true">
  <!-- 定义日志输出目标 (targets) -->
  <targets>
    <!-- 输出到控制台 -->
    <target name="console" xsi:type="ColoredConsole"
            layout="${longdate}|${level:uppercase=true}|${logger}|${message}" />
    <!-- 输出到文件，按日期命名 -->
    <target name="file" xsi:type="File"
            fileName="logs/${shortdate}.log"
            layout="${longdate}|${level:uppercase=true}|${logger}|${message}" />
  </targets>
  <!-- 定义日志路由规则 (rules) -->
  <rules>
    <!-- 所有日志，级别在 Debug 及以上，都输出到控制台 -->
    <logger name="*" minlevel="Debug" writeTo="console" />
    <!-- 所有日志，级别在 Warning 及以上，都输出到文件 -->
    <logger name="*" minlevel="Warning" writeTo="file" />
  </rules>
</nlog>

- **`<targets>`**：定义日志要输出到**哪里**（控制台、文件等），以及输出的**格式**（`layout`）[](https://cloud.tencent.com.cn/developer/article/2558407?from=15425&frompage=seopage#1)。
    
- **`<rules>`**：定义**哪些日志**（根据 `name` 和 `minlevel`）应该被路由到**哪个** `target`[](https://cloud.tencent.com.cn/developer/article/2558407?from=15425&frompage=seopage#1)。
    
- **`${shortdate}`** 是 NLog 的布局渲染器，会自动替换为当前日期（如 `2026-10-08`），方便按天分割日志文件[](https://www.guance.com/learn/articles/nlog)。
    

**3. 在 `Program.cs` 中启用 NLog**  
在 `builder.Build()` 之前，添加以下代码：

```csharp

using NLog.Extensions.Logging; // 引入命名空间
// ... 其他注册代码 ...
// 1. 清除 .NET 默认的日志提供者（可选，但推荐）
builder.Logging.ClearProviders();
// 2. 添加 NLog 作为日志提供者
builder.Logging.AddNLog();
```

### 💻 代码示例：在控制器中记录日志

配置好后，业务代码的写法和上一节完全一样，NLog 会在背后自动接管日志的输出[](https://www.e-com-net.com/article/1709854736762613760.htm#1)。

```csharp

[ApiController]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    private readonly ILogger<OrderController> _logger;
    // 依赖注入的 ILogger 依然是 .NET 的接口，不是 NLog 独有的
    public OrderController(ILogger<OrderController> logger)
    {
        _logger = logger;
    }
    [HttpPost]
    public IActionResult CreateOrder([FromBody] Order order)
    {
        _logger.LogInformation("开始处理订单：{OrderId}", order.Id);
        try
        {
            // ... 业务逻辑 ...
            _logger.LogWarning("订单 {OrderId} 的库存不足，已进入等待队列", order.Id);
            return Ok();
        }
        catch (Exception ex)
        {
            // NLog 会自动捕获异常对象，并在日志中附上完整的堆栈信息
            _logger.LogError(ex, "处理订单 {OrderId} 时发生致命错误", order.Id);
            return StatusCode(500, "服务器内部错误");
        }
    }
}
```

**关键点**：你的业务代码**只依赖 `ILogger<T>` 接口**，完全不知道背后是 NLog 还是其他框架在工作。这就是依赖注入带来的解耦[](https://www.e-com-net.com/article/1709854736762613760.htm#1)。

### 💎 总结

1. **核心需求**：.NET 内置日志缺少“写入文件”等生产环境必需的功能，**NLog 是解决此问题的成熟第三方方案**。
    
2. **使用三步曲**：**安装 NuGet 包** → **创建 `nlog.config` 文件** → **在 `Program.cs` 中 `AddNLog()`**。
    
3. **配置核心**：`nlog.config` 通过 **`<targets>`** 定义输出目标（控制台、文件等），通过 **`<rules>`** 定义路由规则（哪些日志去哪个目标）。
    
4. **代码无感**：业务代码依然使用标准的 `ILogger<T>` 接口记录日志，NLog 的接入对业务代码是透明的。
    
5. **日志滚动**：通过 `${shortdate}` 等布局渲染器，可以轻松实现“按天生成日志文件”，避免单个文件无限增大[](https://www.e-com-net.com/article/1709854736762613760.htm#1)。