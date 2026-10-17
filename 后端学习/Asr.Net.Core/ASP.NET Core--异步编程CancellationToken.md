==一：概念==
`CancellationToken` 是一种**协作式取消机制**。它允许一个任务在收到取消信号后，**主动**、安全地停止执行，而不是被强行终止[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。

**为什么需要它**：在Web开发中，用户可能关闭浏览器或刷新页面，此时后端如果还在执行耗时操作（比如查询数据库），会浪费服务器资源。`CancellationToken` 就是用来告诉后端：“用户已经走了，别忙活了”[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。
==二：格式==
==三：代码==

- **`CancellationToken`**：一个结构体，作为参数传给异步方法，包含是否取消的状态[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。
    
- **`CancellationTokenSource`**：创建和发出取消信号的“控制器”[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。
    
- **`ThrowIfCancellationRequested()`**：在任务中检查是否被取消，如果是，则抛出异常，终止执行[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。
    

```csharp

[HttpGet("longtask")]
public async Task<string> LongRunningTask(CancellationToken cancellationToken)
{
    try
    {
        // 模拟一个耗时操作，每500ms检查一次取消信号
        for (int i = 0; i < 10; i++)
        {
            // 关键：检查是否被取消，如果是则抛出 OperationCanceledException
            cancellationToken.ThrowIfCancellationRequested(); 
            await Task.Delay(500, cancellationToken); // 将令牌传给Delay，Delay内部也会响应取消
            Console.WriteLine($"任务进行中... {i * 500}ms");
        }
        return "任务完成";
    }
    catch (OperationCanceledException)
    {
        // 捕获取消异常，返回友好提示
        return "任务已被取消";
    }
}
```
==四：总结==
**在[ASP.NET](https://asp.net/) Core中的实践**：你**通常不需要**手动创建 `CancellationTokenSource`。[ASP.NET](https://asp.net/) Core框架会自动将用户的断开连接转换为一个 `CancellationToken`，并注入到你的控制器方法中[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。你只需要做到“**能转发就转发**”，把它传给后续的异步方法即可[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。

**总结**：`CancellationToken` 是异步编程中实现**优雅退出**和**资源节约**的关键工具。在Web API中，通过它可以轻松感知用户是否已断开连接，从而避免无效计算