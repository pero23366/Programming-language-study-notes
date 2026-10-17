==一：概念==
这一节的核心是：**如何自己动手编写一个异步方法**。

杨中科老师强调，异步方法有“传染性”——如果一个方法内部用了 `await`，那么这个方法本身也必须被 `async` 修饰[](https://blog.csdn.net/qq_46103137/article/details/132528373)。同时，异步方法本质上是对 `Task` 的封装，编译器会把 `async` 方法编译成一个状态机类[](https://www.e-com-net.com/article/1744650216327364608.htm#1)。
==二：格式==
编写异步方法的标准格式：

```csharp

public async Task<int> GetDataAsync()
{
    // 耗时操作
    await Task.Delay(1000);
    return 42;
}
```

**关键规则**：

- 用 `async` 修饰方法
    
- 返回值用 `Task` 或 `Task<T>`
    
- 方法名以 `Async` 结尾
    
- 即使无返回值，也写 `Task` 而不是 `void`
==三：代码==
```csharp

public async Task<string> DownloadPageAsync(string url)
{
    using var client = new HttpClient();
    string content = await client.GetStringAsync(url);
    return content;
}
```
==四：总结==
- 异步方法必须用 `async` 修饰，返回 `Task`/`Task<T>`
    
- 有 `await` 的方法必须被 `async` 修饰（传染性）
    
- 无返回值也写 `Task`，不要写 `void`