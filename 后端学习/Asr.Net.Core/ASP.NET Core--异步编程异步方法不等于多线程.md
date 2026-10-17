==一：概念==
这一节澄清了一个**极其重要的认知误区**：**异步方法不等于多线程**。

异步方法的代码**并不会自动在新线程中执行**，除非你手动把代码放到新线程中[](https://www.e-com-net.com/article/1742255097800310784.htm)。异步的本质是“不阻塞当前线程”，而不是“新开一个线程去干活”。
==二：格式==
如果想真正切换到新线程，需要使用 `Task.Run()`：

```csharp

// 异步方法（不切换线程）
await Task.Delay(1000);
// 显式切换到新线程
await Task.Run(() =>
{
    // 这段代码在新线程上执行
    Thread.Sleep(1000);
});
```
==三：代码==
```csharp

// 验证：异步方法内部代码是否在新线程上执行
public async Task TestAsync()
{
    Console.WriteLine($"方法内线程：{Thread.CurrentThread.ManagedThreadId}");
    await Task.Delay(100);
}
// 调用
Console.WriteLine($"调用前线程：{Thread.CurrentThread.ManagedThreadId}");
await TestAsync();
```

运行结果：**调用前和方法内的线程 ID 是一样的**，说明异步方法并没有自动切换线程。
==四：总结==
- 异步方法不等于多线程
    
- `async/await` 不会自动创建新线程
    
- 需要真正切换线程时，用 `Task.Run()`
    
- 异步的价值在于**不阻塞线程**，而不是“开新线程”