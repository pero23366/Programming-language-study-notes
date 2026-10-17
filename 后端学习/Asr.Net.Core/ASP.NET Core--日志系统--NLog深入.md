==一：概念==
### 1. 为什么需要“深入”配置？

上一节我们配置的NLog已经能把日志写入文件了，但那只是一个**最基础的版本**。在生产环境中，日志会面临两个致命问题：

- **单个文件无限增大**：如果程序运行几个月，日志文件可能会膨胀到几个GB，不仅打开慢，还会把服务器磁盘撑爆。
    
- **历史日志无法管理**：旧日志文件堆满硬盘，无法自动清理，也无法按时间快速定位问题。
    

### 2. 核心概念：滚动日志（Rolling Logs）

“滚动日志”是NLog解决上述问题的核心机制。它的思想是：**当单个日志文件达到一定大小（或到了特定时间点）时，自动把当前文件归档，并创建一个新文件继续写入。**

NLog提供了三个关键参数来控制这个策略：

|参数|作用|示例|
|---|---|---|
|**`archiveAboveSize`**|单个日志文件超过指定**字节数**时，触发归档|`archiveAboveSize="10240000"`（约10MB）|
|**`maxArchiveFiles`**|最多保留多少个**归档文件**，超出的旧文件会被删除|`maxArchiveFiles="30"`|
|**`archiveEvery`**|按**时间周期**归档（如每天、每小时）|`archiveEvery="Day"`|

### 3. 规则（Rules）的匹配机制

`nlog.config`中的`<rules>`节点定义了“哪些日志、输出到哪里”。每条`<logger>`规则都通过以下属性来匹配日志：

- **`name`**：匹配日志的来源（通常是类的命名空间或类名），支持通配符（如`*`表示所有）。
    
- **`minlevel`**：日志级别**最低**从这里开始记录。
    
- **`maxlevel`**：日志级别**最高**记录到这里。
    
- **`final`**：如果设置为`true`，匹配到这条规则后，就**不再继续向下匹配**其他规则了。
    

**匹配顺序**：NLog会**从上往下**依次匹配`<rules>`中的每条规则。如果一条日志匹配了多条规则，它会被输出到**多个**目标。

### 4. NLog与.NET日志的冲突

NLog有自己的一套日志分级、分类、Provider体系，这和.NET内置的日志系统功能有重叠。为了避免冲突，杨中科老师建议：**如果用了NLog，就不要再配置.NET的分级等选项，统一交给NLog来管理。**
==二：格式==
### 1. 带归档策略的`nlog.config`完整格式

```xml

<?xml version="1.0" encoding="utf-8" ?>

<nlog xmlns="http://www.nlog-project.org/schemas/NLog.xsd"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      autoReload="true">
  <targets>
    <!-- 控制台目标 -->
    <target name="console" xsi:type="ColoredConsole"
            layout="${longdate}|${level:uppercase=true}|${logger}|${message}" />
    <!-- 文件目标：带归档策略 -->
    <target name="file" xsi:type="File"
            fileName="logs/${shortdate}.log"
            layout="${longdate}|${level:uppercase=true}|${logger}|${message}"
            archiveAboveSize="10240000"
            maxArchiveFiles="30"
            archiveEvery="Day" />
  </targets>
  <rules>
    <!-- 所有日志级别 >= Debug，输出到控制台 -->
    <logger name="*" minlevel="Debug" writeTo="console" />
    <!-- 所有日志级别 >= Info，输出到文件 -->
    <logger name="*" minlevel="Info" writeTo="file" />
    <!-- 只记录 OrderController 的 Warning 及以上日志，且不再向下匹配 -->
    <logger name="*.OrderController" minlevel="Warning" writeTo="file" final="true" />
  </rules>
</nlog>
```


### 2. 关键参数解释

|参数|含义|
|---|---|
|`archiveAboveSize="10240000"`|单个文件超过约10MB时，自动归档|
|`maxArchiveFiles="30"`|最多保留30个归档文件，超出删除最旧的|
|`archiveEvery="Day"`|每天也触发一次归档（即使文件没超过10MB）|
|`final="true"`|匹配到这条规则后，不再继续匹配后面的规则|
==三：代码==
### 1. 验证归档效果

**第一步**：在`Program.cs`中启用NLog（和上一节一样）：

```csharp

builder.Logging.ClearProviders();
builder.Logging.AddNLog();
```

**第二步**：在控制器中循环写入大量日志，快速触发归档：

```csharp

[ApiController]
[Route("api/[controller]")]
public class LogTestController : ControllerBase
{
    private readonly ILogger<LogTestController> _logger;
    public LogTestController(ILogger<LogTestController> logger)
    {
        _logger = logger;
    }
    [HttpGet]
    public string WriteManyLogs()
    {
        for (int i = 0; i < 10000; i++)
        {
            _logger.LogInformation("这是第 {Count} 条测试日志，用于触发文件归档", i);
        }
        return "日志写入完成，请查看 logs 目录";
    }
}

**第三步**：运行项目，访问 `/api/logtest`。

**第四步**：打开项目输出目录下的`logs`文件夹，你会看到：

- 如果日志还没超过10MB，只有一个`2026-10-08.log`文件。
    
- 如果超过了10MB，NLog会自动把旧内容归档到`archive`文件夹（或按配置的命名规则），主文件重新开始写。
    

### 2. 验证规则匹配

在`nlog.config`中，我们加了这样一条规则：

xml

<logger name="*.OrderController" minlevel="Warning" writeTo="file" final="true" />
```

这意味着：

- **只有`OrderController`这个类的日志**才会被这条规则匹配。
    
- 只有`Warning`级别及以上的日志才会被记录到文件。
    
- 因为`final="true"`，匹配到这条规则后，**不会再去匹配后面的规则**（但这条规则在文件末尾，所以影响不大）。
    

如果你在`OrderController`中记录一条`Information`级别的日志，它**不会**被写入文件，因为不满足`minlevel="Warning"`。
==四：总结==

1. **滚动日志是生产环境必备**：通过`archiveAboveSize`、`maxArchiveFiles`、`archiveEvery`三个参数，实现日志文件的自动归档和清理，防止磁盘被撑爆。
    
2. **`archiveAboveSize`控制单文件大小**：超过指定字节数就归档。
    
3. **`maxArchiveFiles`控制归档数量**：超出数量的旧归档会被自动删除。
    
4. **`archiveEvery`按时间归档**：即使文件没超过大小限制，到了指定时间也会归档。
    
5. **`rules`节点支持精确匹配**：通过`name`（通配符）、`minlevel`、`maxlevel`、`final`属性，可以实现非常灵活的日志路由。
    
6. **避免与.NET日志冲突**：用了NLog之后，建议不要再配置.NET的分级选项。