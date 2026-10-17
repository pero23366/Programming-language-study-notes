==一：概念==
这一节深入讲解 **`async/await` 的底层原理**。

核心结论：`async/await` 是**语法糖**，编译器会把 `async` 方法编译成一个**状态机类**，根据 `await` 调用切分为多个状态，对异步方法的调用会被拆分为对 `MoveNext` 的调用[](https://www.e-com-net.com/article/1744650216327364608.htm#1)。
==二：格式==
反编译后的代码大致结构（伪代码）：

```csharp

// 你写的代码
async Task<int> FooAsync()
{
    await Task.Delay(1000);
    return 1;
}
```

编译器实际生成的（简化版）：

```csharp

class FooAsyncStateMachine
{
    int state;
    TaskAwaiter awaiter;
    
    void MoveNext()
    {
        if (state == 0)
        {
            state = 1;
            awaiter = Task.Delay(1000).GetAwaiter();
            // 注册回调，完成后再次调用 MoveNext
            return;
        }
        // 状态1：继续执行后面的代码
    }
}
```
==三：代码==
验证线程切换的示例：

```csharp

Console.WriteLine($"开始线程：{Thread.CurrentThread.ManagedThreadId}");
await Task.Delay(1000);
Console.WriteLine($"结束线程：{Thread.CurrentThread.ManagedThreadId}");
```

运行后会发现，`await` 前后的线程 ID **可能不同**，因为 `await` 等待期间，.NET 会把当前线程返回给线程池，等异步操作完成后，再从线程池取一个线程执行后续代码[](https://www.e-com-net.com/article/1744650216327364608.htm#1)。
==四：总结==
- `async/await` 是语法糖，底层是状态机
    
- `await` 等待期间，线程会返回线程池
    
- 异步操作完成后，从线程池取新线程继续执行
    
- 前后线程 ID 可能不同，也可能相同（如果操作很快完成）