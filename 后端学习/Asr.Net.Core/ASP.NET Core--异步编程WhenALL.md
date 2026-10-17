==一：概念==
**核心概念**：`Task.WhenAll` 用于**等待多个任务全部完成**。它不关心任务的执行顺序，只关心它们是否都结束了[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。

**为什么需要它**：当你有多个**相互独立**的异步操作（比如同时调用三个不同的第三方API）时，顺序等待（`await A(); await B(); await C();`）总耗时是三者之和。而使用 `WhenAll` 并行等待，总耗时约等于最慢的那个任务，效率大幅提升。
==二：格式==
==三：代码==

```csharp

[HttpGet("parallel")]
public async Task<string> ParallelTasks()
{
    // 启动三个耗时的任务（它们会立即开始执行）
    Task<string> task1 = GetDataFromApi1Async();
    Task<string> task2 = GetDataFromApi2Async();
    Task<string> task3 = GetDataFromApi3Async();
    // 使用 WhenAll 等待所有任务完成
    string[] results = await Task.WhenAll(task1, task2, task3);
    // results[0] 是 task1 的结果，results[1] 是 task2 的结果，以此类推
    return $"三个任务全部完成，结果长度分别为：{results[0].Length}, {results[1].Length}, {results[2].Length}";
}
```

**⚠️ 关键警告**：

- **异常处理**：如果任一任务抛出异常，`WhenAll` 返回的Task会变成“故障”状态。你需要用 `try-catch` 包裹 `await Task.WhenAll(...)`，并可以通过 `task.Exception` 查看所有异常。
    
- **不要滥用**：`WhenAll` 适用于**I/O密集型**任务（如网络请求）。对于**CPU密集型**任务，应该使用 `Task.Run` 配合 `Task.WhenAll`，否则不会真正并行。
    

==四：总结==
`WhenAll` 是提升系统吞吐量的利器，适合处理多个独立的耗时操作。记住它的核心是“**等待全部完成，但不关心顺序**”[](https://blog.csdn.net/weixin_45756851/article/details/126231689#1)。

